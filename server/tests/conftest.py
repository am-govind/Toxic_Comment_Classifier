"""
Shared test fixtures for the ToxGuard test suite.
This conftest ensures the model is loaded once before any tests run.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.classifier import classifier
from app.config import get_settings


@pytest.fixture(scope="session", autouse=True)
def load_model():
    """Load the ML model once for the entire test session."""
    if not classifier.is_loaded:
        classifier.load()
    yield
    # No teardown needed


@pytest.fixture
def client():
    """Create a FastAPI test client."""
    return TestClient(app)


@pytest.fixture
def settings():
    """Get current settings."""
    return get_settings()
