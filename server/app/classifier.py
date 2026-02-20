"""
Classifier module — encapsulates model loading and toxicity prediction.
Separates ML concerns from the web framework.
"""

import io
import pickle
from pathlib import Path

import numpy as np
from tf_keras.models import load_model
from tf_keras.preprocessing.sequence import pad_sequences

from .config import get_settings


class KerasCompatUnpickler(pickle.Unpickler):
    """Remap 'keras.src.*' references to 'tf_keras.src.*' for old pickles."""

    def find_class(self, module: str, name: str):
        if module.startswith("keras.src"):
            module = "tf_keras.src" + module[len("keras.src") :]
        return super().find_class(module, name)


class ToxicClassifier:
    """Encapsulates the toxic comment classification model."""

    def __init__(self):
        self.model = None
        self.tokenizer = None
        self.settings = get_settings()

    def load(self):
        """Load the model and tokenizer from disk."""
        print("🔄 Loading model and tokenizer...")
        self.model = load_model(self.settings.MODEL_PATH)
        with open(self.settings.TOKENIZER_PATH, "rb") as handle:
            self.tokenizer = KerasCompatUnpickler(handle).load()
        print("✅ Model and tokenizer loaded successfully!")

    @property
    def is_loaded(self) -> bool:
        return self.model is not None and self.tokenizer is not None

    def predict(self, comments: list[str], threshold: float = 0.5) -> list[dict]:
        """
        Classify a batch of comments for toxicity.
        Returns a list of result dicts with text, scores, is_toxic, and severity.
        """
        if not self.is_loaded:
            raise RuntimeError("Model not loaded. Call load() first.")

        settings = self.settings

        # Truncate individual comments to max length
        truncated = [c[: settings.MAX_COMMENT_LENGTH] for c in comments]

        # Tokenize and pad
        tokenized = self.tokenizer.texts_to_sequences(truncated)
        padded = pad_sequences(tokenized, maxlen=settings.MAX_SEQUENCE_LENGTH)

        # Predict
        predictions = self.model.predict(padded, verbose=0)

        # Build results with 3-tier classification
        results = []
        for text, pred in zip(comments, predictions):
            scores = {
                cat: round(float(score), 4)
                for cat, score in zip(settings.CATEGORIES, pred)
            }

            # Count how many categories exceed the threshold
            flagged_count = sum(1 for score in scores.values() if score >= threshold)

            # 3-tier classification based on category count
            if flagged_count == 0:
                severity = "safe"
                is_toxic = False
            elif flagged_count <= 2:
                severity = "medium"
                is_toxic = True
            else:
                severity = "toxic"
                is_toxic = True

            results.append(
                {
                    "text": text[:200],
                    "scores": scores,
                    "is_toxic": is_toxic,
                    "severity": severity,
                    "flagged_categories": flagged_count,
                }
            )

        return results


# Module-level singleton
classifier = ToxicClassifier()
