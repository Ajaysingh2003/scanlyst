from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=256)
    display_name: str | None = Field(default=None, max_length=160)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class VerifyEmailRequest(BaseModel):
    email: EmailStr
    token: str = Field(default="", max_length=256)
    otp: str | None = Field(default=None, max_length=256)

    @property
    def verification_code(self) -> str:
        return (self.otp or self.token).strip()


class EmailRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    password: str = Field(min_length=12, max_length=256)


class AuthUserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    email: str
    display_name: str | None
    email_verified_at: datetime | None


class ProfileUpdateRequest(BaseModel):
    display_name: str | None = Field(default=None, min_length=2, max_length=160)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: AuthUserRead


class RegisterResponse(BaseModel):
    user: AuthUserRead
    verification_required: bool


class ApiKeyCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)


class ApiKeyRead(BaseModel):
    id: str
    key_id: str
    name: str
    created_at: datetime | None
    last_used_at: datetime | None
    revoked_at: datetime | None


class ApiKeyCreated(ApiKeyRead):
    secret: str


class OAuthCallbackResponse(BaseModel):
    provider: str
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: AuthUserRead
