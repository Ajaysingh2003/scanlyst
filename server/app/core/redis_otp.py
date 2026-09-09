import logging
import secrets
from typing import Any

from fastapi import Request
from redis.asyncio import Redis, from_url

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_direct_redis: Redis | None = None


async def get_redis(request: Request | None = None) -> Redis:
    """
    Returns the application Redis instance from FastAPI app state,
    or creates a direct connection pool using settings.redis_url.
    """
    global _direct_redis
    if request is not None:
        app_redis = getattr(request.app.state, "redis", None)
        if app_redis is not None:
            return app_redis

    if _direct_redis is None:
        _direct_redis = from_url(get_settings().redis_url)
    return _direct_redis


def generate_otp(digits: int = 6) -> str:
    """Generate a cryptographically secure numeric OTP."""
    low = 10 ** (digits - 1)
    high = 10 ** digits - 1
    return str(secrets.randbelow(high - low + 1) + low)


async def set_otp(
    email: str,
    otp: str,
    request: Request | None = None,
    ttl_seconds: int = 900,  # 15 minutes
) -> None:
    """Store OTP in Redis under key 'otp:{email}' with expiration."""
    clean_email = email.strip().lower()
    key = f"otp:{clean_email}"
    try:
        redis = await get_redis(request)
        await redis.set(key, otp, ex=ttl_seconds)
        print(f">>> [REDIS OTP STORED] Key: '{key}' | OTP: '{otp}' | TTL: {ttl_seconds}s <<<")
        logger.info("Stored OTP in Redis for %s (TTL: %ds)", clean_email, ttl_seconds)
    except Exception as exc:
        print(f">>> [REDIS OTP ERROR] Failed to store OTP in Redis: {exc} <<<")
        logger.exception("Failed to store OTP in Redis for %s: %s", clean_email, exc)


async def verify_otp(
    email: str,
    otp: str,
    request: Request | None = None,
) -> bool:
    """
    Verify OTP from Redis for the given email.
    If valid, removes the OTP from Redis and returns True.
    """
    clean_email = email.strip().lower()
    clean_otp = "".join(c for c in otp if c.isdigit())
    if len(clean_otp) != 6:
        return False

    key = f"otp:{clean_email}"
    try:
        redis = await get_redis(request)
        raw_val = await redis.get(key)
        if raw_val is None:
            print(f">>> [REDIS OTP MISS] Key '{key}' not found or expired in Redis <<<")
            return False

        stored_otp = raw_val.decode("utf-8") if isinstance(raw_val, bytes) else str(raw_val)
        stored_otp = stored_otp.strip()

        if stored_otp == clean_otp:
            await redis.delete(key)
            print(f">>> [REDIS OTP MATCH] Successfully verified and deleted key '{key}' <<<")
            logger.info("Redis OTP matched and deleted for %s", clean_email)
            return True

        print(f">>> [REDIS OTP MISMATCH] Key '{key}': expected '{stored_otp}', got '{clean_otp}' <<<")
        return False
    except Exception as exc:
        print(f">>> [REDIS OTP ERROR] Failed to verify OTP in Redis: {exc} <<<")
        logger.exception("Failed to verify OTP in Redis for %s: %s", clean_email, exc)
        return False
