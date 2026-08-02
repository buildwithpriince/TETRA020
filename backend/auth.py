"""Firebase ID-token verification with a `demo-token` fallback."""
from __future__ import annotations

import os
from typing import Optional

import firebase_admin
from fastapi import Header
from firebase_admin import auth as fb_auth, credentials

_initialized = False


def _init_firebase() -> None:
    global _initialized
    if _initialized:
        return
    path = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON")
    if path and os.path.exists(path):
        try:
            cred = credentials.Certificate(path)
            firebase_admin.initialize_app(cred)
            _initialized = True
        except ValueError:
            # Already initialized elsewhere.
            _initialized = True
    else:
        # Firebase not configured — only demo-token will work.
        _initialized = True


_init_firebase()


class AuthUser:
    __slots__ = ("uid", "email", "display_name", "anonymous")

    def __init__(
        self,
        uid: str,
        email: Optional[str] = None,
        display_name: Optional[str] = None,
        anonymous: bool = False,
    ) -> None:
        self.uid = uid
        self.email = email
        self.display_name = display_name
        self.anonymous = anonymous


def _anonymous() -> AuthUser:
    return AuthUser(uid="anonymous", anonymous=True)


def _demo_user() -> AuthUser:
    return AuthUser(uid="demo-analyst", email="analyst@demo.local", display_name="Demo Analyst")


async def get_current_user(
    authorization: Optional[str] = Header(default=None),
) -> AuthUser:
    """Extract Bearer token; verify with Firebase or accept `demo-token`."""
    if not authorization:
        return _anonymous()
    parts = authorization.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return _anonymous()
    token = parts[1].strip()
    if not token:
        return _anonymous()
    if token == "demo-token":
        return _demo_user()
    # Real Firebase token
    try:
        decoded = fb_auth.verify_id_token(token)
        return AuthUser(
            uid=decoded.get("uid") or decoded.get("sub") or "unknown",
            email=decoded.get("email"),
            display_name=decoded.get("name") or decoded.get("email"),
        )
    except Exception:
        # Fail open to anonymous so anonymous sessions still work per spec.
        return _anonymous()
