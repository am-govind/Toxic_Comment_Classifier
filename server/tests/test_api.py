"""
Comprehensive API endpoint tests for the ToxGuard server.
Run with: cd server && python -m pytest tests/ -v
"""

import pytest


# ═══════════════════════════════════════════════════════════════════════
# Health Endpoint
# ═══════════════════════════════════════════════════════════════════════
class TestHealthEndpoint:

    def test_health_returns_200(self, client):
        response = client.get("/health")
        assert response.status_code == 200

    def test_health_has_status_ok(self, client):
        data = client.get("/health").json()
        assert data["status"] == "ok"

    def test_health_reports_model_loaded(self, client):
        data = client.get("/health").json()
        assert "model_loaded" in data
        assert isinstance(data["model_loaded"], bool)

    def test_health_no_auth_required(self, client):
        """Health endpoint should work without API key."""
        response = client.get("/health")
        assert response.status_code == 200


# ═══════════════════════════════════════════════════════════════════════
# Predict Endpoint — Basic
# ═══════════════════════════════════════════════════════════════════════
class TestPredictBasic:

    def test_single_comment(self, client):
        response = client.post(
            "/predict",
            json={
                "comments": ["Hello, this is a friendly comment!"],
                "threshold": 0.5,
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["results"]) == 1

    def test_multiple_comments(self, client):
        comments = ["Nice day!", "Great weather!", "I love this"]
        response = client.post(
            "/predict",
            json={
                "comments": comments,
                "threshold": 0.5,
            },
        )
        assert response.status_code == 200
        assert len(response.json()["results"]) == 3

    def test_batch_size_matches_input(self, client):
        comments = [f"Comment number {i}" for i in range(10)]
        response = client.post(
            "/predict",
            json={
                "comments": comments,
                "threshold": 0.5,
            },
        )
        assert len(response.json()["results"]) == 10


# ═══════════════════════════════════════════════════════════════════════
# Predict Endpoint — Response Structure
# ═══════════════════════════════════════════════════════════════════════
class TestPredictResponseStructure:

    def test_result_has_required_fields(self, client):
        data = client.post(
            "/predict",
            json={
                "comments": ["Test comment"],
                "threshold": 0.5,
            },
        ).json()
        result = data["results"][0]

        required_fields = [
            "text",
            "scores",
            "is_toxic",
            "severity",
            "flagged_categories",
        ]
        for field in required_fields:
            assert field in result, f"Missing field: {field}"

    def test_scores_has_all_categories(self, client, settings):
        data = client.post(
            "/predict",
            json={
                "comments": ["Test comment"],
                "threshold": 0.5,
            },
        ).json()
        scores = data["results"][0]["scores"]

        for category in settings.CATEGORIES:
            assert category in scores, f"Missing category: {category}"

    def test_scores_are_numeric(self, client):
        data = client.post(
            "/predict",
            json={
                "comments": ["Test comment"],
                "threshold": 0.5,
            },
        ).json()
        scores = data["results"][0]["scores"]

        for cat, score in scores.items():
            assert isinstance(score, (int, float)), f"Score for {cat} is not numeric"
            assert 0.0 <= score <= 1.0, f"Score for {cat} out of range: {score}"

    def test_severity_is_valid_value(self, client):
        data = client.post(
            "/predict",
            json={
                "comments": ["Test comment"],
                "threshold": 0.5,
            },
        ).json()
        severity = data["results"][0]["severity"]
        assert severity in ("safe", "medium", "toxic")

    def test_flagged_categories_is_non_negative(self, client):
        data = client.post(
            "/predict",
            json={
                "comments": ["Test comment"],
                "threshold": 0.5,
            },
        ).json()
        flagged = data["results"][0]["flagged_categories"]
        assert isinstance(flagged, int)
        assert flagged >= 0

    def test_text_is_truncated(self, client):
        """Text in response should be truncated to 200 chars max."""
        long_text = "A" * 500
        data = client.post(
            "/predict",
            json={
                "comments": [long_text],
                "threshold": 0.5,
            },
        ).json()
        assert len(data["results"][0]["text"]) <= 200


# ═══════════════════════════════════════════════════════════════════════
# Predict Endpoint — Classification Logic
# ═══════════════════════════════════════════════════════════════════════
class TestClassificationLogic:

    def test_safe_comment_has_severity_safe(self, client):
        """A clearly friendly comment should be classified as safe."""
        data = client.post(
            "/predict",
            json={
                "comments": ["What a beautiful sunny day! I love this weather."],
                "threshold": 0.5,
            },
        ).json()
        result = data["results"][0]
        # With high threshold, a safe comment should not be flagged
        assert result["severity"] == "safe"
        assert result["is_toxic"] is False

    def test_toxic_comment_is_flagged(self, client):
        """A clearly toxic comment should be flagged."""
        data = client.post(
            "/predict",
            json={
                "comments": [
                    "You are the worst, most stupid, disgusting idiot I've ever seen"
                ],
                "threshold": 0.1,
            },
        ).json()
        result = data["results"][0]
        assert result["is_toxic"] is True
        assert result["severity"] in ("medium", "toxic")

    def test_threshold_affects_classification(self, client):
        """Lower threshold should flag more comments."""
        comment = ["You are annoying and dumb"]

        low_result = client.post(
            "/predict",
            json={
                "comments": comment,
                "threshold": 0.05,
            },
        ).json()["results"][0]

        high_result = client.post(
            "/predict",
            json={
                "comments": comment,
                "threshold": 0.95,
            },
        ).json()["results"][0]

        # Low threshold should flag at least as many categories
        assert low_result["flagged_categories"] >= high_result["flagged_categories"]

    def test_severity_tiers(self, client):
        """
        Verify the 3-tier category-count logic:
        - 0 flagged → safe
        - 1-2 flagged → medium
        - 3+ flagged → toxic
        """
        data = client.post(
            "/predict",
            json={
                "comments": ["Hello friend!"],
                "threshold": 0.5,
            },
        ).json()
        result = data["results"][0]

        flagged = result["flagged_categories"]
        if flagged == 0:
            assert result["severity"] == "safe"
        elif flagged <= 2:
            assert result["severity"] == "medium"
        else:
            assert result["severity"] == "toxic"


# ═══════════════════════════════════════════════════════════════════════
# Predict Endpoint — Input Validation
# ═══════════════════════════════════════════════════════════════════════
class TestInputValidation:

    def test_empty_comments_rejected(self, client):
        response = client.post(
            "/predict",
            json={
                "comments": [],
                "threshold": 0.5,
            },
        )
        assert response.status_code == 422

    def test_missing_comments_rejected(self, client):
        response = client.post(
            "/predict",
            json={
                "threshold": 0.5,
            },
        )
        assert response.status_code == 422

    def test_invalid_threshold_too_high(self, client):
        response = client.post(
            "/predict",
            json={
                "comments": ["Test"],
                "threshold": 1.5,
            },
        )
        assert response.status_code == 422

    def test_invalid_threshold_negative(self, client):
        response = client.post(
            "/predict",
            json={
                "comments": ["Test"],
                "threshold": -0.1,
            },
        )
        assert response.status_code == 422

    def test_default_threshold(self, client):
        """Should work without explicit threshold (uses default 0.5)."""
        response = client.post(
            "/predict",
            json={
                "comments": ["Test comment"],
            },
        )
        assert response.status_code == 200

    def test_comment_length_truncation(self, client):
        """Long comments should be handled without error."""
        long_comment = "word " * 1000  # 5000 chars
        response = client.post(
            "/predict",
            json={
                "comments": [long_comment],
                "threshold": 0.5,
            },
        )
        assert response.status_code == 200

    def test_invalid_json_body(self, client):
        response = client.post(
            "/predict", content="not json", headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 422

    def test_non_string_comments(self, client):
        response = client.post(
            "/predict",
            json={
                "comments": [123, True],
                "threshold": 0.5,
            },
        )
        # Should either reject or coerce
        assert response.status_code in (200, 422)


# ═══════════════════════════════════════════════════════════════════════
# Predict Endpoint — Edge Cases
# ═══════════════════════════════════════════════════════════════════════
class TestEdgeCases:

    def test_unicode_comments(self, client):
        response = client.post(
            "/predict",
            json={
                "comments": ["こんにちは世界 🌍", "Привет мир!", "مرحبا بالعالم"],
                "threshold": 0.5,
            },
        )
        assert response.status_code == 200
        assert len(response.json()["results"]) == 3

    def test_empty_string_comment(self, client):
        response = client.post(
            "/predict",
            json={
                "comments": [""],
                "threshold": 0.5,
            },
        )
        assert response.status_code == 200

    def test_whitespace_only_comment(self, client):
        response = client.post(
            "/predict",
            json={
                "comments": ["   \n\t   "],
                "threshold": 0.5,
            },
        )
        assert response.status_code == 200

    def test_special_characters(self, client):
        response = client.post(
            "/predict",
            json={
                "comments": ["<script>alert('xss')</script>", "'; DROP TABLE--"],
                "threshold": 0.5,
            },
        )
        assert response.status_code == 200

    def test_boundary_threshold_zero(self, client):
        response = client.post(
            "/predict",
            json={
                "comments": ["Test"],
                "threshold": 0.0,
            },
        )
        assert response.status_code == 200

    def test_boundary_threshold_one(self, client):
        response = client.post(
            "/predict",
            json={
                "comments": ["Test"],
                "threshold": 1.0,
            },
        )
        assert response.status_code == 200
        # At threshold 1.0, nothing should be flagged
        result = response.json()["results"][0]
        assert result["flagged_categories"] == 0
        assert result["severity"] == "safe"
