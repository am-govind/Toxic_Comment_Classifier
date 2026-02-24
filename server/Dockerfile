# ── Build stage ───────────────────────────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /build

# Upgrade pip for better network handling
RUN pip install --upgrade pip

# Install TensorFlow first (largest package, separate layer for caching)
RUN pip install --no-cache-dir --prefix=/install --timeout=300 --retries=10 \
    tensorflow==2.16.2

# Install remaining dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install --timeout=300 --retries=10 \
    -r requirements.txt

# ── Runtime stage ─────────────────────────────────────────────────────
FROM python:3.12-slim

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Create non-root user
RUN useradd -m -r appuser && chown -R appuser:appuser /app

# Copy application code
COPY --chown=appuser:appuser app/ ./app/

# Copy model files
COPY --chown=appuser:appuser models/ ./models/

# Switch to non-root user
USER appuser

# Set environment variables
ENV MODEL_PATH=/app/models/tox_model.h5
ENV TOKENIZER_PATH=/app/models/tokenizer.pickle
ENV HOST=0.0.0.0
ENV PORT=7860

# Expose port (HuggingFace Spaces expects 7860)
EXPOSE 7860

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:7860/health')" || exit 1

# Run the server
CMD ["python", "-m", "app.main"]
