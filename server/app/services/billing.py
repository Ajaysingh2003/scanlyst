import base64
import hashlib
import hmac
import json
import time
from datetime import datetime, timezone
from typing import Any

import httpx
from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models import ApiKey, BillingAccount, BillingUsage, DodoWebhookEvent, Project, User

PLAN_LIMITS: dict[str, dict[str, int | None]] = {
    "free": {"projects": 1, "scans_per_month": 5, "api_keys": 1},
    "starter": {"projects": 2, "scans_per_month": 50, "api_keys": 2},
    "pro": {"projects": 5, "scans_per_month": 250, "api_keys": 5},
    "max": {"projects": 25, "scans_per_month": None, "api_keys": 25},
}
PLANS = tuple(PLAN_LIMITS)
PLAN_FEATURES: dict[str, tuple[str, ...]] = {
    "free": ("mcp_server", "preview_finding_details", "basic_security_tests"),
    "starter": ("mcp_server", "full_finding_details", "pdf_export", "remediation_guidance", "active_security_tests"),
    "pro": ("mcp_server", "full_finding_details", "pdf_export", "remediation_guidance", "active_security_tests", "daily_monitoring", "live_threat_detection"),
    "max": ("mcp_server", "full_finding_details", "pdf_export", "remediation_guidance", "active_security_tests", "daily_monitoring", "live_threat_detection", "custom_monitoring", "team_seats", "white_label_reports", "client_workspaces", "commercial_use", "dedicated_support"),
}


def _dodo_config() -> tuple[str, str]:
    settings = get_settings()
    key = settings.dodo_payments_api_key.strip()
    if not key:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Dodo Payments is not configured")
    base_url = settings.dodo_payments_api_url.strip()
    if not base_url:
        base_url = "https://test.dodopayments.com" if settings.dodo_payments_environment.strip() == "test_mode" else "https://live.dodopayments.com"
    return key, base_url.rstrip("/")


async def _dodo_request(method: str, path: str, **kwargs: Any) -> dict[str, Any]:
    key, base_url = _dodo_config()
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.request(method, f"{base_url}{path}", headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"}, **kwargs)
        response.raise_for_status()
        return response.json()
    except httpx.HTTPStatusError as error:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"Dodo Payments request failed: {error.response.text[:500]}") from error
    except (httpx.HTTPError, ValueError) as error:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Could not reach Dodo Payments") from error


def plan_limits(plan: str) -> dict[str, int | None]:
    return PLAN_LIMITS.get(plan, PLAN_LIMITS["free"])


def plan_features(plan: str) -> tuple[str, ...]:
    return PLAN_FEATURES.get(plan, PLAN_FEATURES["free"])


async def sync_billing_account(session: AsyncSession, account: BillingAccount | None) -> BillingAccount | None:
    if account is None:
        return None
    now = datetime.now(timezone.utc)
    if account.plan != "free":
        is_expired = account.current_period_end is not None and account.current_period_end < now
        if is_expired or account.status not in {"active", "trialing"}:
            account.plan = "free"
            if is_expired and account.status in {"active", "trialing"}:
                account.status = "canceled"
            session.add(account)
            await session.commit()
            await session.refresh(account)
    return account


async def billing_account(session: AsyncSession, user_id) -> BillingAccount | None:
    return await sync_billing_account(session, await session.scalar(select(BillingAccount).where(BillingAccount.user_id == user_id)))


async def current_plan(session: AsyncSession, user_id) -> str:
    account = await billing_account(session, user_id)
    now = datetime.now(timezone.utc)
    if account and account.status in {"active", "trialing"} and (account.current_period_end is None or account.current_period_end >= now) and account.plan in PLAN_LIMITS:
        return account.plan
    return "free"


async def enforce_project_limit(session: AsyncSession, user_id) -> str:
    plan = await current_plan(session, user_id)
    limit = plan_limits(plan)["projects"]
    count = await session.scalar(select(func.count(Project.id)).where(Project.owner_user_id == user_id))
    if limit is not None and int(count or 0) >= limit:
        raise HTTPException(status.HTTP_402_PAYMENT_REQUIRED, f"Your {plan.title()} plan allows {limit} project(s). Upgrade to create another project.")
    return plan


async def enforce_api_key_limit(session: AsyncSession, user_id) -> str:
    plan = await current_plan(session, user_id)
    limit = plan_limits(plan)["api_keys"]
    count = await session.scalar(select(func.count(ApiKey.id)).where(ApiKey.user_id == user_id, ApiKey.revoked_at.is_(None)))
    if limit is not None and int(count or 0) >= limit:
        raise HTTPException(status.HTTP_402_PAYMENT_REQUIRED, f"Your {plan.title()} plan allows {limit} active API key(s). Upgrade to create another key.")
    return plan


async def reserve_scan_slot(session: AsyncSession, user_id) -> tuple[str, int | None]:
    plan = await current_plan(session, user_id)
    limit = plan_limits(plan)["scans_per_month"]
    period = datetime.now(timezone.utc).date().replace(day=1)
    usage = await session.scalar(select(BillingUsage).where(BillingUsage.user_id == user_id, BillingUsage.period_start == period).with_for_update())
    if usage is None:
        usage = BillingUsage(user_id=user_id, period_start=period, scans_count=0)
        session.add(usage)
        await session.flush()
    if limit is not None and usage.scans_count >= limit:
        raise HTTPException(status.HTTP_402_PAYMENT_REQUIRED, f"Your {plan.title()} plan has reached its {limit}-scan monthly limit.")
    usage.scans_count += 1
    return plan, limit


def _product_id(plan: str, interval: str) -> str:
    value = getattr(get_settings(), f"dodo_product_{plan}_{interval}").strip()
    if not value:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "The requested Dodo product is not configured")
    return value


async def create_checkout_session(session: AsyncSession, user: User, plan: str, interval: str) -> str:
    if plan not in {"starter", "pro", "max"} or interval not in {"monthly", "quarterly", "annual"}:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Invalid billing plan or interval")
    account = await billing_account(session, user.id)
    if account and account.dodo_subscription_id and account.status in {"active", "trialing", "past_due", "on_hold"}:
        raise HTTPException(status.HTTP_409_CONFLICT, "This account already has a Dodo subscription; use the billing portal to change it")
    if account is None:
        # Persist the local account before calling Dodo so a very fast webhook
        # can always resolve the user, even before Dodo customer metadata is
        # available on the subscription event.
        account = BillingAccount(user_id=user.id, plan="free", status="inactive")
        session.add(account)
        await session.commit()
    settings = get_settings()
    result = await _dodo_request("POST", "/checkouts", json={
        "product_cart": [{"product_id": _product_id(plan, interval), "quantity": 1}],
        "customer": {"email": user.email, "metadata": {"user_id": str(user.id)}},
        "return_url": settings.dodo_payments_success_url,
        "cancel_url": settings.dodo_payments_cancel_url,
        "metadata": {"user_id": str(user.id), "plan": plan, "interval": interval},
    })
    checkout_url = result.get("checkout_url")
    if not checkout_url:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Dodo Payments did not return a checkout URL")
    return checkout_url


async def create_portal_session(session: AsyncSession, user_id) -> str:
    account = await billing_account(session, user_id)
    if not account or not account.dodo_customer_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No Dodo Payments customer is connected to this account")
    settings = get_settings()
    result = await _dodo_request("POST", f"/customers/{account.dodo_customer_id}/customer-portal/session", params={"return_url": settings.dodo_payments_portal_return_url})
    if not result.get("link"):
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Dodo Payments did not return a portal URL")
    return result["link"]


def verify_webhook(payload: bytes, webhook_id: str, signature: str, timestamp: str, secret: str) -> dict[str, Any]:
    if not secret:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Dodo Payments webhook secret is not configured")
    try:
        timestamp_int = int(timestamp)
        if abs(time.time() - timestamp_int) > 300:
            raise ValueError
        secret_bytes = base64.b64decode(secret.removeprefix("whsec_") + "=" * (-len(secret.removeprefix("whsec_")) % 4))
        signed = f"{webhook_id}.{timestamp}.".encode() + payload
        expected = base64.b64encode(hmac.new(secret_bytes, signed, hashlib.sha256).digest()).decode()
        candidates = [item.split(",", 1)[1] for item in signature.split() if item.startswith("v1,")]
    except (ValueError, TypeError, base64.binascii.Error):
        candidates = []
    if not candidates or not any(hmac.compare_digest(expected, candidate) for candidate in candidates):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid Dodo Payments webhook signature")
    try:
        return json.loads(payload)
    except json.JSONDecodeError as error:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid Dodo Payments webhook payload") from error


def _datetime(value: Any) -> datetime | None:
    if not value:
        return None
    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(value, tz=timezone.utc)
    return datetime.fromisoformat(str(value).replace("Z", "+00:00"))


async def process_webhook(session: AsyncSession, event: dict[str, Any], webhook_id: str) -> bool:
    # Dodo uses the Standard Webhooks webhook-id header as the event's
    # idempotency key; it is not part of the JSON payload.
    event_id = webhook_id.strip()
    event_type = event.get("type") or event.get("event_type") or ""
    if not event_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Dodo Payments event ID is missing")
    existing = await session.get(DodoWebhookEvent, event_id)
    if existing and existing.status == "processed":
        return False
    if not existing:
        existing = DodoWebhookEvent(id=event_id, event_type=event_type, payload=event, status="received")
        session.add(existing)
        await session.flush()
    data = event.get("data") or {}
    customer = data.get("customer") or {}
    metadata = data.get("metadata") or {}
    customer_metadata = customer.get("metadata") or {} if isinstance(customer, dict) else {}
    customer_id = customer.get("customer_id") if isinstance(customer, dict) else customer
    customer_email = customer.get("email") if isinstance(customer, dict) else None
    subscription_id = data.get("subscription_id")
    user_id = metadata.get("user_id") or customer_metadata.get("user_id")
    account = await session.scalar(select(BillingAccount).where(BillingAccount.dodo_customer_id == customer_id)) if customer_id else None
    if account is None and user_id:
        account = await session.scalar(select(BillingAccount).where(BillingAccount.user_id == user_id))
    if account is None and customer_email:
        user = await session.scalar(select(User).where(User.email == customer_email))
        if user:
            account = await session.scalar(select(BillingAccount).where(BillingAccount.user_id == user.id))
    if account:
        if customer_id:
            account.dodo_customer_id = customer_id
        if subscription_id:
            account.dodo_subscription_id = subscription_id
        product_id = data.get("product_id") or ((data.get("product_cart") or [{}])[0].get("product_id"))
        settings = get_settings()
        product_map = {getattr(settings, f"dodo_product_{p}_{i}"): p for p in ("starter", "pro", "max") for i in ("monthly", "quarterly", "annual") if getattr(settings, f"dodo_product_{p}_{i}").strip()}
        active = event_type in {"subscription.active", "subscription.renewed", "subscription.updated", "subscription.plan_changed"} or data.get("status") in {"active", "trialing"}
        ended = event_type in {"subscription.cancelled", "subscription.expired", "subscription.failed"} or data.get("status") in {"cancelled", "expired", "failed", "on_hold"}
        if active and product_map.get(product_id):
            account.plan = product_map[product_id]
            account.status = data.get("status", "active")
            account.current_period_end = _datetime(data.get("next_billing_date"))
            account.cancel_at_period_end = bool(data.get("cancel_at_next_billing_date", False))
        elif ended:
            account.plan = "free"
            account.status = "canceled" if event_type != "subscription.failed" else "past_due"
    existing.status = "processed"
    existing.processed_at = datetime.now(timezone.utc)
    await session.commit()
    return True
