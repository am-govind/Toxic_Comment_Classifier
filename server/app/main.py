"""
FastAPI Server for Toxic Comment Classification
Serves the Keras model via REST endpoints for the Chrome extension.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from .config import get_settings
from .classifier import classifier
from .middleware import limiter, verify_api_key


settings = get_settings()


# ── Lifespan ──────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    classifier.load()
    yield
    print("👋 Shutting down server.")


# ── App ───────────────────────────────────────────────────────────────
app = FastAPI(
    title=settings.APP_NAME,
    description="Classify comments for toxicity using a Keras LSTM model.",
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

# Rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request / Response Models ─────────────────────────────────────────
class PredictRequest(BaseModel):
    comments: list[str] = Field(
        ...,
        min_length=1,
        max_length=settings.MAX_COMMENTS_PER_REQUEST,
    )
    threshold: float = Field(default=0.5, ge=0.0, le=1.0)


class CommentResult(BaseModel):
    text: str
    scores: dict[str, float]
    is_toxic: bool
    severity: str
    flagged_categories: int


class PredictResponse(BaseModel):
    results: list[CommentResult]


# ── Endpoints ─────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    """Health check endpoint (no auth required)."""
    return {"status": "ok", "model_loaded": classifier.is_loaded}


@app.post("/predict", response_model=PredictResponse)
@limiter.limit(settings.RATE_LIMIT)
async def predict(
    request: Request,
    req: PredictRequest,
    api_key: str = Depends(verify_api_key),
):
    """Classify a batch of comments for toxicity."""
    results = classifier.predict(req.comments, req.threshold)
    return PredictResponse(results=results)


# ── Run ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    print(f"🚀 Starting {settings.APP_NAME} on http://{settings.HOST}:{settings.PORT}")
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )
