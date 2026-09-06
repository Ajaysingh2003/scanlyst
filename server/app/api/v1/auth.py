import asyncio
import logging
import secrets
import smtplib
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from app.core import send_otp
import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import (create_access_token, hash_password, oauth_authorization_url, oauth_state,
                           random_token, token_hash, verify_oauth_state, verify_password)
from app.core.config import get_settings
from app.core.database import get_session
from app.core.api_auth import require_user
from app.services.billing import enforce_api_key_limit
from app.models import ApiKey, AuthIdentity, EmailVerificationToken, PasswordResetToken, RefreshSession, User
from app.schemas.auth import (ApiKeyCreateRequest, ApiKeyCreated, ApiKeyRead, AuthUserRead,
                              LoginRequest, OAuthCallbackResponse, RefreshRequest, RegisterRequest,
                              RegisterResponse, TokenResponse, VerifyEmailRequest, EmailRequest, ResetPasswordRequest,
                              ProfileUpdateRequest)

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger(__name__)


def _user(user: User) -> AuthUserRead:
    return AuthUserRead(id=str(user.id), email=user.email, display_name=user.display_name,
                        email_verified_at=user.email_verified_at)


async def _tokens(user: User, session: AsyncSession) -> TokenResponse:
    refresh = random_token()
    settings = get_settings()
    session.add(RefreshSession(user_id=user.id, token_hash=token_hash(refresh),
                               expires_at=datetime.now(timezone.utc) + timedelta(days=settings.auth_refresh_token_days)))
    await session.flush()
    return TokenResponse(access_token=create_access_token(str(user.id)), refresh_token=refresh,
                         expires_in=settings.auth_access_token_minutes * 60, user=_user(user))


async def _send_verification(email: str, token: str) -> None:
    settings = get_settings()
    if not settings.smtp_host:
        return
    message = EmailMessage()
    message["Subject"] = "Verify your Scanlyst email"
    message["From"] = settings.smtp_from or settings.smtp_username
    message["To"] = email
    message.set_content(f"Verify your email: {settings.auth_frontend_url}/verify-email?token={token}")

    def send() -> None:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as smtp:
            smtp.starttls()
            if settings.smtp_username:
                smtp.login(settings.smtp_username, settings.smtp_password)
            smtp.send_message(message)
    await asyncio.to_thread(send)


async def _send_password_reset(email: str, token: str) -> None:
    settings = get_settings()
    if not settings.smtp_host:
        return
    message = EmailMessage()
    message["Subject"] = "Reset your Scanlyst password"
    message["From"] = settings.smtp_from or settings.smtp_username
    message["To"] = email
    message.set_content(f"Reset your password: {settings.auth_frontend_url}/reset-password?token={token}")

    def send() -> None:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as smtp:
            smtp.starttls()
            if settings.smtp_username:
                smtp.login(settings.smtp_username, settings.smtp_password)
            smtp.send_message(message)
    await asyncio.to_thread(send)


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, session: AsyncSession = Depends(get_session)):
    email = str(payload.email).lower()
    existing = await session.scalar(select(User).where(User.email == email))
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists")
    verification_required = get_settings().auth_email_verification_required
    user = User(email=email, display_name=payload.display_name, password_hash=hash_password(payload.password),
                email_verified_at=None if verification_required else datetime.now(timezone.utc))
    session.add(user)
    await session.flush()
    verification = None
    if verification_required:
        verification = random_token()
        session.add(EmailVerificationToken(user_id=user.id, token_hash=token_hash(verification),
                                           expires_at=datetime.now(timezone.utc) + timedelta(hours=get_settings().auth_email_verification_hours)))
    await session.commit()
    if verification:
        try:
            # await _send_verification(email, verification)
            send_otp(email, verification)
        except Exception:
            logger.exception("email_verification_delivery_failed")
    return RegisterResponse(user=_user(user), verification_required=verification_required)


@router.post("/verify-email", response_model=AuthUserRead)
async def verify_email(payload: VerifyEmailRequest, session: AsyncSession = Depends(get_session)):
    record = await session.scalar(select(EmailVerificationToken).where(
        EmailVerificationToken.token_hash == token_hash(payload.token), EmailVerificationToken.used_at.is_(None)))
    if not record or record.expires_at <= datetime.now(timezone.utc):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Verification token is invalid or expired")
    user = await session.get(User, record.user_id)
    if not user:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Verification token is invalid")
    user.email_verified_at = datetime.now(timezone.utc)
    record.used_at = datetime.now(timezone.utc)
    await session.commit()
    return _user(user)


@router.post("/resend-verification", status_code=status.HTTP_202_ACCEPTED)
async def resend_verification(payload: EmailRequest, session: AsyncSession = Depends(get_session)):
    if not get_settings().auth_email_verification_required:
        return {"detail": "Email verification is disabled in the current environment"}
    user = await session.scalar(select(User).where(User.email == str(payload.email).lower()))
    if user and not user.email_verified_at:
        verification = random_token()
        session.add(EmailVerificationToken(user_id=user.id, token_hash=token_hash(verification),
                                           expires_at=datetime.now(timezone.utc) + timedelta(hours=get_settings().auth_email_verification_hours)))
        await session.commit()
        try:
            await send_otp(user.email, verification)
        except Exception:
            logger.exception("email_verification_delivery_failed")
    return {"detail": "If the account exists and is unverified, a verification email has been sent"}


@router.post("/forgot-password", status_code=status.HTTP_202_ACCEPTED)
async def forgot_password(payload: EmailRequest, session: AsyncSession = Depends(get_session)):
    user = await session.scalar(select(User).where(User.email == str(payload.email).lower()))
    if user and user.is_active and user.password_hash:
        reset = random_token()
        session.add(PasswordResetToken(user_id=user.id, token_hash=token_hash(reset),
                                       expires_at=datetime.now(timezone.utc) + timedelta(hours=1)))
        await session.commit()
        try:
            await _send_password_reset(user.email, reset)
        except Exception:
            logger.exception("password_reset_delivery_failed")
    return {"detail": "If the account exists, a password reset email has been sent"}


@router.post("/reset-password", status_code=status.HTTP_204_NO_CONTENT)
async def reset_password(payload: ResetPasswordRequest, session: AsyncSession = Depends(get_session)):
    record = await session.scalar(select(PasswordResetToken).where(
        PasswordResetToken.token_hash == token_hash(payload.token), PasswordResetToken.used_at.is_(None)))
    if not record or record.expires_at <= datetime.now(timezone.utc):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Reset token is invalid or expired")
    user = await session.get(User, record.user_id)
    if not user or not user.is_active:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Reset token is invalid")
    user.password_hash = hash_password(payload.password)
    record.used_at = datetime.now(timezone.utc)
    sessions = (await session.scalars(select(RefreshSession).where(
        RefreshSession.user_id == user.id, RefreshSession.revoked_at.is_(None)))).all()
    for refresh_session in sessions:
        refresh_session.revoked_at = datetime.now(timezone.utc)
    await session.commit()


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, session: AsyncSession = Depends(get_session)):
    user = await session.scalar(select(User).where(User.email == str(payload.email).lower()))
    if not user or not user.is_active or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")
    if get_settings().auth_email_verification_required and not user.email_verified_at:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Verify your email before signing in")
    result = await _tokens(user, session)
    await session.commit()
    return result


@router.post("/refresh", response_model=TokenResponse)
async def refresh(payload: RefreshRequest, session: AsyncSession = Depends(get_session)):
    record = await session.scalar(select(RefreshSession).where(
        RefreshSession.token_hash == token_hash(payload.refresh_token),
        RefreshSession.revoked_at.is_(None),
    ).with_for_update())
    if not record or record.expires_at <= datetime.now(timezone.utc):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Refresh token is invalid or expired")
    user = await session.get(User, record.user_id)
    if not user or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User is inactive")
    record.revoked_at = datetime.now(timezone.utc)
    result = await _tokens(user, session)
    await session.commit()
    return result


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(payload: RefreshRequest, session: AsyncSession = Depends(get_session)):
    record = await session.scalar(select(RefreshSession).where(RefreshSession.token_hash == token_hash(payload.refresh_token)))
    if record:
        record.revoked_at = datetime.now(timezone.utc)
        await session.commit()


@router.get("/me", response_model=AuthUserRead)
async def me(request: Request, session: AsyncSession = Depends(get_session)):
    user_id = require_user(request)
    user = await session.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User is inactive")
    return _user(user)


@router.patch("/me", response_model=AuthUserRead)
async def update_me(payload: ProfileUpdateRequest, request: Request,
                    session: AsyncSession = Depends(get_session)):
    user = await session.get(User, require_user(request))
    if not user or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User is inactive")
    user.display_name = payload.display_name.strip() if payload.display_name else None
    await session.commit()
    await session.refresh(user)
    return _user(user)


@router.post("/logout-all", status_code=status.HTTP_204_NO_CONTENT)
async def logout_all(request: Request, session: AsyncSession = Depends(get_session)):
    user_id = require_user(request)
    sessions = list((await session.scalars(select(RefreshSession).where(
        RefreshSession.user_id == user_id, RefreshSession.revoked_at.is_(None)
    ))).all())
    now = datetime.now(timezone.utc)
    for refresh_session in sessions:
        refresh_session.revoked_at = now
    await session.commit()


@router.post("/api-keys", response_model=ApiKeyCreated, status_code=status.HTTP_201_CREATED)
async def create_api_key(payload: ApiKeyCreateRequest, request: Request, session: AsyncSession = Depends(get_session)):
    user_id = require_user(request)
    await enforce_api_key_limit(session, user_id)
    key_id = secrets.token_urlsafe(12)[:18]
    secret = secrets.token_urlsafe(32)
    key = ApiKey(user_id=user_id, key_id=key_id, name=payload.name, secret_hash=token_hash(secret))
    session.add(key)
    await session.commit()
    return ApiKeyCreated(id=str(key.id), key_id=key.key_id, name=key.name, created_at=key.created_at,
                         last_used_at=key.last_used_at, revoked_at=key.revoked_at,
                         secret=f"ask_live_{key_id}_{secret}")


@router.get("/api-keys", response_model=list[ApiKeyRead])
async def list_api_keys(request: Request, session: AsyncSession = Depends(get_session)):
    user_id = require_user(request)
    keys = (await session.scalars(select(ApiKey).where(ApiKey.user_id == user_id).order_by(ApiKey.created_at.desc()))).all()
    return [ApiKeyRead(id=str(key.id), key_id=key.key_id, name=key.name, created_at=key.created_at,
                       last_used_at=key.last_used_at, revoked_at=key.revoked_at) for key in keys]


@router.delete("/api-keys/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_api_key(key_id: str, request: Request, session: AsyncSession = Depends(get_session)):
    user_id = require_user(request)
    key = await session.scalar(select(ApiKey).where(ApiKey.key_id == key_id, ApiKey.user_id == user_id))
    if key:
        key.revoked_at = datetime.now(timezone.utc)
        await session.commit()


@router.get("/{provider}")
async def oauth_start(provider: str):
    settings = get_settings()
    if provider not in {"google", "github"}:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Unsupported OAuth provider")
    configured = (settings.google_client_id and settings.google_client_secret) if provider == "google" else (settings.github_client_id and settings.github_client_secret)
    if not configured:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, f"{provider} OAuth is not configured")
    state = oauth_state(provider)
    return RedirectResponse(oauth_authorization_url(provider, state), status_code=status.HTTP_307_TEMPORARY_REDIRECT)


async def _oauth_user(provider: str, code: str) -> tuple[str, str, str]:
    settings = get_settings()
    async with httpx.AsyncClient(timeout=10) as client:
        if provider == "google":
            token = await client.post("https://oauth2.googleapis.com/token", data={"client_id": settings.google_client_id, "client_secret": settings.google_client_secret, "code": code, "grant_type": "authorization_code", "redirect_uri": settings.google_redirect_uri})
            token.raise_for_status()
            access = token.json()["access_token"]
            profile = await client.get("https://openidconnect.googleapis.com/v1/userinfo", headers={"Authorization": f"Bearer {access}"})
            profile.raise_for_status()
            data = profile.json()
            if not data.get("email_verified"):
                raise HTTPException(status.HTTP_400_BAD_REQUEST, "Google account email is not verified")
            return str(data["sub"]), str(data["email"]).lower(), data.get("name") or data.get("email")
        token = await client.post("https://github.com/login/oauth/access_token", data={"client_id": settings.github_client_id, "client_secret": settings.github_client_secret, "code": code}, headers={"Accept": "application/json"})
        token.raise_for_status()
        access = token.json()["access_token"]
        profile = await client.get("https://api.github.com/user", headers={"Authorization": f"Bearer {access}", "Accept": "application/vnd.github+json"})
        profile.raise_for_status()
        data = profile.json()
        email = data.get("email")
        if not email:
            emails = await client.get("https://api.github.com/user/emails", headers={"Authorization": f"Bearer {access}", "Accept": "application/vnd.github+json"})
            emails.raise_for_status()
            email = next((item["email"] for item in emails.json() if item.get("primary") and item.get("verified")), None)
        if not email:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "GitHub account has no verified email")
        return str(data["id"]), str(email).lower(), data.get("name") or data.get("login")


@router.get("/{provider}/callback")
async def oauth_callback(provider: str, request: Request, code: str = Query(...), state: str = Query(...), session: AsyncSession = Depends(get_session)):
    if provider not in {"google", "github"} or not verify_oauth_state(state, provider):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid OAuth state")
    subject, email, display_name = await _oauth_user(provider, code)
    identity = await session.scalar(select(AuthIdentity).where(AuthIdentity.provider == provider, AuthIdentity.subject == subject))
    user = await session.get(User, identity.user_id) if identity else await session.scalar(select(User).where(User.email == email))
    if not user:
        user = User(email=email, display_name=display_name, email_verified_at=datetime.now(timezone.utc))
        session.add(user)
        await session.flush()
    elif not user.email_verified_at:
        user.email_verified_at = datetime.now(timezone.utc)
    if not identity:
        session.add(AuthIdentity(user_id=user.id, provider=provider, subject=subject, provider_email=email))
    tokens = await _tokens(user, session)
    await session.commit()
    response = RedirectResponse(f"{get_settings().auth_frontend_url}/dashboard", status_code=status.HTTP_303_SEE_OTHER)
    cookie_options = {
        "httponly": True,
        "secure": get_settings().auth_frontend_url.startswith("https://"),
        "samesite": "lax",
        "path": "/",
    }
    response.set_cookie("access_token", tokens.access_token, max_age=tokens.expires_in, **cookie_options)
    response.set_cookie("refresh_token", tokens.refresh_token, max_age=get_settings().auth_refresh_token_days * 86400, **cookie_options)
    return response
