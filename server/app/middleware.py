"""
Security middleware — rate limiting and security headers.
"""

import uuid

from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

# ── Rate Limiter ──────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)


# ── Security Headers ─────────────────────────────────────────────────
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Inject security headers on every response."""

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["X-Request-ID"] = str(uuid.uuid4())
        return response
