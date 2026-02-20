"""
Unit tests for the ToxicClassifier class.
Run with: cd server && python -m pytest tests/ -v
"""

import pytest
from app.classifier import ToxicClassifier, classifier


class TestClassifierLoading:
    """Tests for model loading."""

    def test_singleton_is_loaded(self):
        """Module-level classifier should be loadable."""
        assert classifier is not None

    def test_is_loaded_property(self):
        """After load(), is_loaded should be True."""
        assert classifier.is_loaded is True


class TestClassifierPrediction:
    """Tests for the predict() method."""

    def test_predict_returns_list(self):
        results = classifier.predict(["Hello world"], threshold=0.5)
        assert isinstance(results, list)
        assert len(results) == 1

    def test_predict_result_structure(self):
        results = classifier.predict(["Test comment"], threshold=0.5)
        result = results[0]
        assert "text" in result
        assert "scores" in result
        assert "is_toxic" in result
        assert "severity" in result
        assert "flagged_categories" in result

    def test_predict_severity_values(self):
        """Severity must be one of safe, medium, toxic."""
        results = classifier.predict(["Some text here"], threshold=0.5)
        assert results[0]["severity"] in ("safe", "medium", "toxic")

    def test_predict_batch(self):
        comments = ["Hello", "World", "Foo", "Bar", "Baz"]
        results = classifier.predict(comments, threshold=0.5)
        assert len(results) == 5

    def test_severity_safe_when_zero_flagged(self):
        """If flagged_categories is 0, severity must be safe."""
        results = classifier.predict(
            ["The weather is lovely today!"],
            threshold=0.99  # Very high threshold → nothing flagged
        )
        assert results[0]["flagged_categories"] == 0
        assert results[0]["severity"] == "safe"
        assert results[0]["is_toxic"] is False

    def test_severity_consistency(self):
        """Verify severity matches flagged count rules."""
        results = classifier.predict(
            ["You are an absolute fool and idiot, go away!"],
            threshold=0.1
        )
        result = results[0]
        flagged = result["flagged_categories"]

        if flagged == 0:
            assert result["severity"] == "safe"
        elif flagged <= 2:
            assert result["severity"] == "medium"
        else:
            assert result["severity"] == "toxic"

    def test_scores_in_range(self):
        """All scores should be between 0 and 1."""
        results = classifier.predict(["Random test text"], threshold=0.5)
        for cat, score in results[0]["scores"].items():
            assert 0.0 <= score <= 1.0, f"{cat}: {score}"

    def test_text_truncation(self):
        """Output text should be truncated to 200 chars."""
        long = "A" * 500
        results = classifier.predict([long], threshold=0.5)
        assert len(results[0]["text"]) <= 200

    def test_input_truncation(self):
        """Long inputs shouldn't cause errors (truncated to MAX_COMMENT_LENGTH)."""
        very_long = "word " * 2000
        results = classifier.predict([very_long], threshold=0.5)
        assert len(results) == 1

    def test_empty_string(self):
        results = classifier.predict([""], threshold=0.5)
        assert len(results) == 1

    def test_threshold_boundary_zero(self):
        """At threshold 0, almost everything may be flagged."""
        results = classifier.predict(["Hello"], threshold=0.0)
        # Scores might be > 0 for some categories
        assert results[0]["flagged_categories"] >= 0

    def test_threshold_boundary_one(self):
        """At threshold 1.0, nothing should be flagged."""
        results = classifier.predict(["Hello"], threshold=1.0)
        assert results[0]["flagged_categories"] == 0
        assert results[0]["severity"] == "safe"


class TestClassifierUnloaded:
    """Tests for behavior when model is not loaded."""

    def test_predict_raises_when_not_loaded(self):
        """Calling predict on an unloaded classifier should raise."""
        fresh = ToxicClassifier()
        assert fresh.is_loaded is False
        with pytest.raises(RuntimeError, match="Model not loaded"):
            fresh.predict(["test"], threshold=0.5)
