"""
Security middleware — API key authentication and rate limiting.
"""

from fastapi import Request, HTTPException, Security
from fastapi.security import APIKeyHeader
from slowapi import Limiter
from slowapi.util import get_remote_address

from .config import get_settings


# ── Rate Limiter ──────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)


# ── API Key Auth ──────────────────────────────────────────────────────
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def verify_api_key(api_key: str = Security(api_key_header)):
    """
    Validate the API key from the X-API-Key header.
    Allows unauthenticated access to health endpoint.
    """
    settings = get_settings()

    # If API key is the default dev key, skip validation (dev mode)
    if settings.API_KEY == "toxguard-dev-key-change-me":
        return api_key or "dev-mode"

    if not api_key or api_key != settings.API_KEY:
        raise HTTPException(
            status_code=401,
            detail="Invalid or missing API key. Include 'X-API-Key' header.",
        )
    return api_key
