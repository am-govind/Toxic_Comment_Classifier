"""
Security-focused tests for the ToxGuard server.
Run with: cd server && python -m pytest tests/test_security.py -v
"""

import pytest


# ═══════════════════════════════════════════════════════════════════════
# Security Headers
# ═══════════════════════════════════════════════════════════════════════
class TestSecurityHeaders:

    def test_x_content_type_options(self, client):
        response = client.get("/health")
        assert response.headers.get("X-Content-Type-Options") == "nosniff"

    def test_x_frame_options(self, client):
        response = client.get("/health")
        assert response.headers.get("X-Frame-Options") == "DENY"

    def test_referrer_policy(self, client):
        response = client.get("/health")
        assert (
            response.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"
        )

    def test_x_request_id_present(self, client):
        response = client.get("/health")
        request_id = response.headers.get("X-Request-ID")
        assert request_id is not None
        assert len(request_id) > 0

    def test_x_request_id_unique_per_request(self, client):
        """Each request should get a unique X-Request-ID."""
        id1 = client.get("/health").headers.get("X-Request-ID")
        id2 = client.get("/health").headers.get("X-Request-ID")
        assert id1 != id2

    def test_security_headers_on_predict(self, client):
        """Security headers should also appear on POST /predict."""
        response = client.post(
            "/predict",
            json={
                "comments": ["Test comment"],
                "threshold": 0.5,
            },
        )
        assert response.headers.get("X-Content-Type-Options") == "nosniff"
        assert response.headers.get("X-Frame-Options") == "DENY"
        assert response.headers.get("X-Request-ID") is not None


# ═══════════════════════════════════════════════════════════════════════
# API Key Authentication
# ═══════════════════════════════════════════════════════════════════════
class TestApiKeyAuth:

    def test_dev_mode_allows_no_key(self, client, settings):
        """In dev mode (default key), requests without X-API-Key should pass."""
        if settings.API_KEY != "toxguard-dev-key-change-me":
            pytest.skip("Not in dev mode")
        response = client.post(
            "/predict",
            json={
                "comments": ["Hello"],
                "threshold": 0.5,
            },
        )
        assert response.status_code == 200

    def test_dev_mode_allows_any_key(self, client, settings):
        """In dev mode, any X-API-Key value should work."""
        if settings.API_KEY != "toxguard-dev-key-change-me":
            pytest.skip("Not in dev mode")
        response = client.post(
            "/predict",
            json={"comments": ["Hello"], "threshold": 0.5},
            headers={"X-API-Key": "random-key-123"},
        )
        assert response.status_code == 200

    def test_health_no_auth_required(self, client):
        """Health endpoint should never require auth."""
        response = client.get("/health")
        assert response.status_code == 200


# ═══════════════════════════════════════════════════════════════════════
# Input Sanitization
# ═══════════════════════════════════════════════════════════════════════
class TestInputSanitization:

    def test_long_comment_is_truncated(self, client, settings):
        """Comments exceeding MAX_COMMENT_LENGTH should be truncated."""
        long_comment = "A" * (settings.MAX_COMMENT_LENGTH + 500)
        response = client.post(
            "/predict",
            json={
                "comments": [long_comment],
                "threshold": 0.5,
            },
        )
        assert response.status_code == 200

    def test_xss_in_comment(self, client):
        """Script injection should be handled safely."""
        response = client.post(
            "/predict",
            json={
                "comments": ["<script>alert('xss')</script>"],
                "threshold": 0.5,
            },
        )
        assert response.status_code == 200

    def test_sql_injection_in_comment(self, client):
        """SQL injection attempts should be handled safely."""
        response = client.post(
            "/predict",
            json={
                "comments": ["'; DROP TABLE users; --"],
                "threshold": 0.5,
            },
        )
        assert response.status_code == 200

    def test_too_many_comments_rejected(self, client, settings):
        """More than MAX_COMMENTS_PER_REQUEST comments should be rejected."""
        comments = ["test"] * (settings.MAX_COMMENTS_PER_REQUEST + 1)
        response = client.post(
            "/predict",
            json={
                "comments": comments,
                "threshold": 0.5,
            },
        )
        assert response.status_code == 422
