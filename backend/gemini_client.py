"""Thin wrapper around google-genai for structured JSON extraction with retry."""
from __future__ import annotations

import asyncio
import json
import logging
import os
from typing import Any, Optional

from google import genai
from google.genai import types as genai_types

log = logging.getLogger("prism.gemini")

_API_KEY = os.environ.get("GEMINI_API_KEY", "")
_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash-lite")

_client: Optional[genai.Client] = None


def get_client() -> genai.Client:
    global _client
    if _client is None:
        if not _API_KEY:
            raise RuntimeError("GEMINI_API_KEY not set in environment")
        _client = genai.Client(api_key=_API_KEY)
    return _client


async def _acall(prompt: str, response_schema: Optional[dict] = None) -> str:
    """Run the sync Gemini call in a worker thread so we don't block the loop."""
    client = get_client()

    def _sync_call() -> str:
        config_kwargs: dict[str, Any] = {
            "response_mime_type": "application/json",
            "temperature": 0.1,
        }
        if response_schema is not None:
            config_kwargs["response_schema"] = response_schema
        cfg = genai_types.GenerateContentConfig(**config_kwargs)
        resp = client.models.generate_content(
            model=_MODEL,
            contents=prompt,
            config=cfg,
        )
        text = getattr(resp, "text", None)
        if text is None:
            # Fallback: assemble from candidates
            cand = (resp.candidates or [None])[0]
            if cand and cand.content and cand.content.parts:
                text = "".join(getattr(p, "text", "") or "" for p in cand.content.parts)
        return text or ""

    return await asyncio.to_thread(_sync_call)


async def json_call(
    prompt: str,
    *,
    response_schema: Optional[dict] = None,
    attempts: int = 3,
    fallback: Any = None,
) -> Any:
    """Call Gemini expecting a JSON reply; retry with backoff on transient errors."""
    last_err: Optional[BaseException] = None
    for i in range(attempts):
        try:
            raw = await _acall(prompt, response_schema=response_schema)
            raw = (raw or "").strip()
            if raw.startswith("```"):
                # Strip fenced code blocks if the model ignored the JSON hint
                raw = raw.strip("`")
                if raw.lower().startswith("json"):
                    raw = raw[4:].strip()
            return json.loads(raw)
        except Exception as e:  # noqa: BLE001
            last_err = e
            log.warning("Gemini call failed (attempt %d/%d): %s", i + 1, attempts, e)
            await asyncio.sleep(0.8 * (2**i))
    log.error("Gemini call giving up; using fallback. Last error: %s", last_err)
    return fallback
