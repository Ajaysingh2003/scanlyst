from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class BillingPlanRead(BaseModel):
    id: str
    name: str
    projects: int | None
    scans_per_month: int | None
    api_keys: int | None
    features: list[str]


class BillingAccountRead(BaseModel):
    plan: str
    status: str
    dodo_customer_configured: bool
    subscription_configured: bool
    current_period_end: datetime | None
    cancel_at_period_end: bool
    usage_scans: int
    usage_limit: int | None


class CheckoutRequest(BaseModel):
    plan: Literal["starter", "pro", "max"]
    interval: Literal["monthly", "quarterly", "annual"] = "monthly"


class CheckoutResponse(BaseModel):
    checkout_url: str


class PortalResponse(BaseModel):
    portal_url: str
