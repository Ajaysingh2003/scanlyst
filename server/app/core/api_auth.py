import hashlib
import hmac

from fastapi import HTTPException, Request, Response, status
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from sqlalchemy import select

from app.core.auth import decode_access_token, token_hash
from app.core.config import Settings, get_settings
from app.core.database import SessionFactory
from app.models import ApiKey, User
from app.core import send_otp

def configured_api_keys(settings: Settings) -> tuple[str, ...]:
    return tuple(key.strip() for key in settings.api_keys.split(",") if key.strip())


def presented_api_key(request: Request) -> str | None:
    api_key = request.headers.get("x-api-key")
    if api_key:
        return api_key.strip()
    authorization = request.headers.get("authorization", "")
    scheme, _, credentials = authorization.partition(" ")
    if scheme.lower() == "bearer" and credentials:
        return credentials.strip()
    return None


def api_key_fingerprint(api_key: str) -> str:
    return hashlib.sha256(api_key.encode()).hexdigest()[:24]


def is_valid_api_key(api_key: str | None, settings: Settings) -> bool:
    if not api_key:
        return False
    return any(hmac.compare_digest(api_key, configured) for configured in configured_api_keys(settings))


def require_api_key(request: Request) -> str | None:
    fingerprint = request.scope.get("api_key_fingerprint")
    if fingerprint:
        return str(fingerprint)
    settings = get_settings()
    if not settings.api_key_enabled:
        return None
    api_key = presented_api_key(request)
    if not is_valid_api_key(api_key, settings):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="A valid API key is required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    fingerprint = api_key_fingerprint(api_key or "")
    request.scope["api_key_fingerprint"] = fingerprint
    return fingerprint


def require_user(request: Request):
    user_id = request.scope.get("user_id")
    if not user_id:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "A valid user access token is required",
                            headers={"WWW-Authenticate": "Bearer"})
    return user_id


def require_account_user(request: Request):
    user_id = require_user(request)
    if request.scope.get("project_id"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This route requires a user access token")
    return user_id


def require_identity(request: Request) -> dict:
    identity = {
        "user_id": request.scope.get("user_id"),
        "api_key_id": request.scope.get("api_key_id"),
        "project_id": request.scope.get("project_id"),
        "api_key_fingerprint": request.scope.get("api_key_fingerprint"),
    }
    if any(identity.values()) or not get_settings().api_key_enabled:
        return identity
    raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Authentication is required",
                        headers={"WWW-Authenticate": "Bearer"})


async def authenticate_credential(value: str, scope: dict, settings: Settings | None = None) -> bool:
    settings = settings or get_settings()
    parts = value.split("_", 3)
    if len(parts) != 4 or parts[:2] != ["ask", "live"]:
        return False
    key_id, secret = parts[2], parts[3]
    async with SessionFactory() as session:
        key = await session.scalar(select(ApiKey).where(ApiKey.key_id == key_id, ApiKey.revoked_at.is_(None)))
        if not key or not hmac.compare_digest(key.secret_hash, token_hash(secret)):
            return False
        user = await session.get(User, key.user_id)
        if not user or not user.is_active:
            return False
    scope["user_id"] = str(key.user_id)
    scope["api_key_id"] = key.key_id
    scope["project_id"] = str(key.project_id) if key.project_id else None
    scope["api_key_fingerprint"] = api_key_fingerprint(value)
    return True


class ApiKeyMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        settings = get_settings()
        if not request.url.path.startswith("/api/"):
            return await call_next(request)

        auth_suffix = request.url.path.split("/auth/", 1)[1].strip("/") if "/auth/" in request.url.path else ""
        public_auth = auth_suffix in {"register", "verify-email", "resend-verification", "login", "refresh", "logout",
                                     "forgot-password", "reset-password", "google", "github", "google/callback", "github/callback"}
        public_billing_route = request.url.path in {
            "/api/v1/billing/plans", "/api/billing/plans",
            "/api/v1/billing/webhook", "/api/billing/webhook",
        }
        if (public_billing_route or request.url.path.startswith("/api/v1/public/status/")
                or request.url.path.startswith("/api/public/status/")
                or request.url.path.startswith("/api/v1/public/reports/")
                or request.url.path.startswith("/api/public/reports/")):
            return await call_next(request)
        if public_auth:
            return await call_next(request)

        api_key = presented_api_key(request)
        authenticated = False
        if api_key:
            authenticated = await authenticate_credential(api_key, request.scope, settings)
            if not authenticated:
                user_id = decode_access_token(api_key)
                if user_id:
                    request.scope["user_id"] = user_id
                    authenticated = True
            if not authenticated and is_valid_api_key(api_key, settings):
                request.scope["api_key_fingerprint"] = api_key_fingerprint(api_key)
                authenticated = True
        if authenticated or not settings.api_key_enabled:
            return await call_next(request)
        if not authenticated:
            return Response(
                content='{"detail":"A valid API key is required"}',
                status_code=401,
                media_type="application/json",
                headers={"WWW-Authenticate": "Bearer"},
            )
