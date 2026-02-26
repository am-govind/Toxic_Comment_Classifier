"""
Unit tests for configuration module.
Run with: cd server && python -m pytest tests/ -v
"""

import pytest

from app.config import Settings, get_settings


class TestSettings:
    """Tests for the Settings class."""

    def test_default_port(self):
        s = Settings()
        assert s.PORT == 4000

    def test_default_host(self):
        s = Settings()
        assert s.HOST == "0.0.0.0"


    def test_default_rate_limit(self):
        s = Settings()
        assert s.RATE_LIMIT == "30/minute"

    def test_categories_has_six(self):
        s = Settings()
        assert len(s.CATEGORIES) == 6
        assert "toxic" in s.CATEGORIES
        assert "severe_toxic" in s.CATEGORIES
        assert "obscene" in s.CATEGORIES
        assert "threat" in s.CATEGORIES
        assert "insult" in s.CATEGORIES
        assert "identity_hate" in s.CATEGORIES

    def test_max_comment_length(self):
        s = Settings()
        assert s.MAX_COMMENT_LENGTH == 500

    def test_max_comments_per_request(self):
        s = Settings()
        assert s.MAX_COMMENTS_PER_REQUEST == 500

    def test_max_sequence_length(self):
        s = Settings()
        assert s.MAX_SEQUENCE_LENGTH == 100


class TestGetSettings:
    """Tests for the cached settings getter."""

    def test_returns_settings_instance(self):
        s = get_settings()
        assert isinstance(s, Settings)

    def test_is_cached(self):
        """Multiple calls should return the same instance."""
        s1 = get_settings()
        s2 = get_settings()
        assert s1 is s2
