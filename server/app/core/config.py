from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Scanlyst"
    database_url: str = "postgresql+asyncpg://Scanlyst:Scanlyst@localhost:5432/Scanlyst"
    redis_url: str = "redis://localhost:6379/0"
    user_agent: str = "Scanlyst/1.0 (+https://scanlyst.example)"
    scanner_timeout_seconds: float = 120.0
    scanner_concurrency: int = 8
    api_key_enabled: bool = True
    api_keys: str = ""
    rate_limit_enabled: bool = True
    rate_limit_requests: int = 60
    rate_limit_window_seconds: int = 60
    rate_limit_key_prefix: str = "scanlyst:rate-limit"
    trust_proxy_headers: bool = False
    auth_jwt_secret: str = ""
    auth_access_token_minutes: int = 15
    auth_refresh_token_days: int = 30
    auth_email_verification_required: bool = True
    auth_email_verification_hours: int = 24
    auth_frontend_url: str = "http://localhost:7000"
    supabase_encryption_key: str = ""
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8000/api/v1/auth/google/callback"
    github_client_id: str = ""
    github_client_secret: str = ""
    github_redirect_uri: str = "http://localhost:8000/api/v1/auth/github/callback"
    dodo_payments_api_key: str = ""
    dodo_payments_webhook_secret: str = ""
    dodo_payments_environment: str = "live_mode"
    dodo_payments_api_url: str = ""
    dodo_product_starter_monthly: str = ""
    dodo_product_starter_annual: str = ""
    dodo_product_starter_quarterly: str = ""
    dodo_product_pro_monthly: str = ""
    dodo_product_pro_annual: str = ""
    dodo_product_pro_quarterly: str = ""
    dodo_product_max_monthly: str = ""
    dodo_product_max_annual: str = ""
    dodo_product_max_quarterly: str = ""
    dodo_payments_success_url: str = "http://localhost:7000/billing/success"
    dodo_payments_cancel_url: str = "http://localhost:7000/billing/cancel"
    dodo_payments_portal_return_url: str = "http://localhost:7000/dashboard"
    retention_enabled: bool = True
    retention_scan_days: int = 365
    retention_auth_days: int = 30
    retention_payment_webhook_days: int = 180
    retention_monitoring_days: int = 90
    retention_disabled_integration_days: int = 30
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from: str = ""
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
