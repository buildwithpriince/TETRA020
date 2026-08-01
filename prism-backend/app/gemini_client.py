"""
Direct Gemini API calls only -- no LLM-orchestration/proxy layer. Every
call in this file goes straight from this backend to Google's API using
GEMINI_API_KEY from the environment. Stages 3, 5, and 7 each call this with
their own narrow system prompt; this module intentionally does not combine
prompts across stages.
"""
from __future__ import annotations

import json
import logging

from google import genai
from google.genai import types

from app.config import require_gemini_key

logger = logging.getLogger("prism.gemini")

_MODEL_TEXT = "gemini-2.5-pro"
_MODEL_VISION = "gemini-2.5-pro"  # same model handles multimodal input


def _client() -> genai.Client:
    return genai.Client(api_key=require_gemini_key())


def generate_json(system_prompt: str, user_content: str, *, temperature: float = 0.1) -> dict:
    """
    Single-purpose call: one narrow system prompt, one user turn, strict
    JSON response. Raises on anything that isn't valid JSON rather than
    silently guessing -- callers decide how to handle a failed stage.
    """
    client = _client()
    response = client.models.generate_content(
        model=_MODEL_TEXT,
        contents=user_content,
        config=types.GenerateContentConfig(
            system_instruction=system_prompt,
            temperature=temperature,
            response_mime_type="application/json",
        ),
    )
    raw = response.text or ""
    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        logger.error("Gemini returned non-JSON output: %s", raw[:500])
        raise ValueError(f"Gemini response was not valid JSON: {exc}") from exc


def generate_json_with_image(
    system_prompt: str, user_content: str, image_bytes: bytes, mime_type: str, *, temperature: float = 0.1
) -> dict:
    """
    Same contract as generate_json but attaches an image (e.g. a rendered
    chart from a pitch deck page) for the Chart-to-Data Reverse Engineering
    differentiator. Kept separate from generate_json so text-only stages
    never accidentally pay for/depend on vision input.
    """
    client = _client()
    response = client.models.generate_content(
        model=_MODEL_VISION,
        contents=[
            types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
            user_content,
        ],
        config=types.GenerateContentConfig(
            system_instruction=system_prompt,
            temperature=temperature,
            response_mime_type="application/json",
        ),
    )
    raw = response.text or ""
    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        logger.error("Gemini (vision) returned non-JSON output: %s", raw[:500])
        raise ValueError(f"Gemini response was not valid JSON: {exc}") from exc
