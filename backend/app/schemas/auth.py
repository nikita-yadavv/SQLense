"""
Pydantic schemas for authentication.

Changes from Phase 1:
  - Added JoinRequest / JoinResponse for employee self-registration via join code.
  - Added PendingEmployeeOut for listing pending approval requests.
  - SignupRequest now only used for admin signup (role is always admin).
"""
from datetime import datetime
import uuid
from pydantic import BaseModel, EmailStr
from app.models.user import UserRole, UserStatus



# ── Admin Signup ────────────────────────────────────────────────────────────────
class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.admin
    organization_name: str | None = None


class SignupResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: UserRole


# ── Login ──────────────────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: UserRole


# ── Employee self-registration via join code ────────────────────────────────────
class JoinRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    join_code: str   # e.g. "ACMEX7Q2"


class JoinResponse(BaseModel):
    message: str
    email: str


# ── Admin: list pending employees ──────────────────────────────────────────────
class PendingEmployeeOut(BaseModel):
    id: uuid.UUID
    name: str
    email: str
    status: UserStatus
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Internal token payload ─────────────────────────────────────────────────────
class TokenData(BaseModel):
    user_id: str
    role: UserRole
    org_id: str | None = None
