FROM python:3.12-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app/ ./app/

# Copy model files (place models/ alongside Dockerfile at build time,
# or mount as a volume at runtime)
COPY models/ ./models/

# Expose port
EXPOSE 4000

# Set model paths via environment variables
ENV MODEL_PATH=/app/models/tox_model.h5
ENV TOKENIZER_PATH=/app/models/tokenizer.pickle

# Run the server
CMD ["python", "-m", "app.main"]
