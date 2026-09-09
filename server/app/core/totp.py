import hashlib
import hmac
import struct
import time

def get_totp_secret_for_email(email: str) -> bytes:
    """
    Derives a user-specific HMAC secret key from the server master secret and the user's email.
    This avoids storing any secrets or OTPs in the database.
    """
    try:
        from app.core.config import get_settings
        master_key = (get_settings().auth_jwt_secret or "scanlyst-default-otp-secret-key").encode("utf-8")
    except Exception:
        import os
        master_key = os.environ.get("AUTH_JWT_SECRET", "scanlyst-default-otp-secret-key").encode("utf-8")

    normalized_email = email.strip().lower().encode("utf-8")
    message = b"totp-email-verification:" + normalized_email
    return hmac.new(master_key, message, hashlib.sha256).digest()


def _hotp(secret: bytes, counter: int, digits: int = 6) -> str:
    """
    Calculates HOTP code for a given counter value according to RFC 4226 / RFC 6238.
    """
    counter_bytes = struct.pack(">Q", counter)
    mac = hmac.new(secret, counter_bytes, hashlib.sha256).digest()
    offset = mac[-1] & 0x0F
    code = (struct.unpack(">I", mac[offset:offset + 4])[0] & 0x7FFFFFFF) % (10 ** digits)
    return str(code).zfill(digits)


def generate_totp(email: str, interval: int = 300, digits: int = 6) -> str:
    """
    Generates a 6-digit TOTP code for the given email address.
    Default interval is 300 seconds (5 minutes).
    """
    secret = get_totp_secret_for_email(email)
    counter = int(time.time() // interval)
    return _hotp(secret, counter, digits)


def verify_totp(
    email: str,
    otp: str,
    interval: int = 300,
    digits: int = 6,
    window_past: int = 4,
    window_future: int = 2,
) -> bool:
    """
    Verifies a 6-digit TOTP code for the given email address.
    Cleans non-digit characters and checks across a generous time window.
    """
    clean_otp = "".join(c for c in (otp or "") if c.isdigit())
    if len(clean_otp) != digits:
        return False

    secret = get_totp_secret_for_email(email)
    current_counter = int(time.time() // interval)

    for offset in range(-window_past, window_future + 1):
        expected_code = _hotp(secret, current_counter + offset, digits)
        if hmac.compare_digest(expected_code, clean_otp):
            return True

    return False
