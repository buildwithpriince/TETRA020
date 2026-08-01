"""
Central configuration. Everything sensitive (API keys, service account
credentials) is read from environment variables only -- never hardcoded,
never echoed back in any API response or log line.
"""
from __future__ import annotations

import os
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # --- AI ---
    gemini_api_key: str = ""

    # --- Firebase Admin ---
    firebase_credentials_path: str = ""
    firebase_credentials_json: str = ""

    # --- Session store ---
    redis_url: str = ""
    session_ttl_seconds: int = 3600

    # --- CORS ---
    allowed_origins: str = "http://localhost:5173"

    # --- PDF report ---
    report_pdf_password: str = ""

    # --- Limits ---
    max_upload_size_mb: int = 25
    max_files_per_upload: int = 10

    # --- Rate limiting ---
    upload_rate_limit: str = "10/minute"
    analyze_rate_limit: str = "5/minute"

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    @property
    def max_upload_size_bytes(self) -> int:
        return self.max_upload_size_mb * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    return Settings()


def require_gemini_key() -> str:
    key = get_settings().gemini_api_key or os.environ.get("GEMINI_API_KEY", "")
    if not key:
        raise RuntimeError(
            "GEMINI_API_KEY is not set. Set it as an environment variable; "
            "Prism will not fabricate AI results without a real API key."
        )
    return key
