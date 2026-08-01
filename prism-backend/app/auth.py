"""
Firebase Admin auth. Verifies the bearer token on every protected route via
`firebase_admin.auth.verify_id_token`. No persistent user profile is kept --
the verified UID is used only to scope the current request/session.
"""
from __future__ import annotations

import json
import threading

import firebase_admin
from fastapi import Header, HTTPException
from firebase_admin import auth as firebase_auth
from firebase_admin import credentials

from app.config import get_settings

_init_lock = threading.Lock()
_initialized = False


def _init_firebase() -> None:
    global _initialized
    if _initialized:
        return
    with _init_lock:
        if _initialized:
            return
        settings = get_settings()
        cred = None
        if settings.firebase_credentials_json:
            info = json.loads(settings.firebase_credentials_json)
            cred = credentials.Certificate(info)
        elif settings.firebase_credentials_path:
            cred = credentials.Certificate(settings.firebase_credentials_path)
        else:
            raise RuntimeError(
                "Firebase Admin credentials are not configured. Set "
                "FIREBASE_CREDENTIALS_JSON or FIREBASE_CREDENTIALS_PATH."
            )
        firebase_admin.initialize_app(cred)
        _initialized = True


async def verify_firebase_token(authorization: str | None = Header(default=None)) -> str:
    """
    FastAPI dependency. Extracts and verifies the Bearer token, returns the
    verified Firebase UID. Raises 401 on anything missing/invalid/expired.
    """
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing or malformed Authorization header.")

    id_token = authorization.split(" ", 1)[1].strip()
    if not id_token:
        raise HTTPException(status_code=401, detail="Missing bearer token.")

    try:
        _init_firebase()
        decoded = firebase_auth.verify_id_token(id_token)
    except RuntimeError:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired authentication token.")

    uid = decoded.get("uid")
    if not uid:
        raise HTTPException(status_code=401, detail="Token did not contain a valid UID.")
    return uid
