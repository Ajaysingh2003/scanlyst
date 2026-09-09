import logging
import time

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint

from app.core.api_auth import api_key_fingerprint, presented_api_key
from app.core.config import get_settings

logger = logging.getLogger(__name__)

_INCREMENT_SCRIPT = """
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return {count, redis.call('TTL', KEYS[1])}
"""


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        settings = get_settings()
        if (not settings.rate_limit_enabled or not request.url.path.startswith("/api/")
                or request.url.path in {"/api/v1/billing/webhook", "/api/billing/webhook"}
                or request.url.path.startswith("/api/v1/public/status/")
                or request.url.path.startswith("/api/public/status/")
                or request.url.path.startswith("/api/v1/public/reports/")
                or request.url.path.startswith("/api/public/reports/")):
            return await call_next(request)

        redis = getattr(request.app.state, "redis", None)
        if redis is None:
            logger.warning("rate_limit_redis_unavailable", extra={"path": request.url.path})
            return await call_next(request)

        client_ip = self._rate_limit_identity(request, settings.trust_proxy_headers)
        bucket = int(time.time()) // settings.rate_limit_window_seconds
        key = f"{settings.rate_limit_key_prefix}:{client_ip}:{bucket}"
        try:
            count, ttl = await redis.eval(
                _INCREMENT_SCRIPT,
                1,
                key,
                settings.rate_limit_window_seconds,
            )
            count, ttl = int(count), max(1, int(ttl))
        except Exception:
            # Rate limiting must not turn a Redis outage into an API outage.
            logger.exception("rate_limit_check_failed", extra={"path": request.url.path})
            return await call_next(request)

        headers = {
            "X-RateLimit-Limit": str(settings.rate_limit_requests),
            "X-RateLimit-Remaining": str(max(0, settings.rate_limit_requests - count)),
            "X-RateLimit-Reset": str(ttl),
        }
        if count > settings.rate_limit_requests:
            headers["Retry-After"] = str(ttl)
            return Response(
                content='{"detail":"Rate limit exceeded"}',
                status_code=429,
                media_type="application/json",
                headers=headers,
            )

        response = await call_next(request)
        for name, value in headers.items():
            response.headers[name] = value
        return response

    @staticmethod
    def _client_ip(request: Request, trust_proxy_headers: bool) -> str:
        if trust_proxy_headers:
            cf_ip = request.headers.get("cf-connecting-ip")
            if cf_ip:
                return cf_ip.strip()
            real_ip = request.headers.get("x-real-ip")
            if real_ip:
                return real_ip.strip()
            forwarded = request.headers.get("x-forwarded-for")
            if forwarded:
                return forwarded.split(",", 1)[0].strip()
        return request.client.host if request.client else "unknown"

    @classmethod
    def _rate_limit_identity(cls, request: Request, trust_proxy_headers: bool) -> str:
        fingerprint = request.scope.get("api_key_fingerprint")
        if fingerprint:
            return f"key:{fingerprint}"
        presented = presented_api_key(request)
        if presented:
            return f"key:{api_key_fingerprint(presented)}"
        return f"ip:{cls._client_ip(request, trust_proxy_headers)}"
