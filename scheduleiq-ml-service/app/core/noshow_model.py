import numpy as np
from sklearn.ensemble import RandomForestClassifier
import joblib
import os

class AttendanceRiskClassifier:
    def __init__(self):
        # We will build a simple pre-trained mock model structure.
        # Feature vector columns:
        # [worker_reliability (0-1), is_weekend (0/1), is_night_shift (0/1), rain_probability (0-1)]
        self.model_path = os.path.join(os.path.dirname(__file__), "../../models/noshow_rf.joblib")
        self.clf = None
        self._ensure_model_trained()

    def _ensure_model_trained(self):
        # If model is already compiled and serialized, load it
        if os.path.exists(self.model_path):
            self.clf = joblib.load(self.model_path)
            return

        # Otherwise, let's instantly train a highly realistic Random Forest model!
        print(">>> Training scikit-learn Attendance No-Show Risk Classifier model...")
        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
        
        # Synthesize realistic historical worker patterns:
        # 500 samples
        np.random.seed(42)
        X = []
        y = []
        for _ in range(500):
            reliability = np.random.uniform(0.75, 1.0)
            is_weekend = np.random.choice([0, 1])
            is_night = np.random.choice([0, 1])
            rain = np.random.uniform(0.0, 1.0)
            
            # Formulate mathematical no-show risk probability:
            risk = (1.0 - reliability) * 0.6 + is_weekend * 0.1 + is_night * 0.15 + rain * 0.25
            
            # Attendance class: 1 for Absent/No-Show, 0 for Present
            absent = 1 if np.random.rand() < risk else 0
            
            X.append([reliability, is_weekend, is_night, rain])
            y.append(absent)

        self.clf = RandomForestClassifier(n_estimators=50, random_state=42)
        self.clf.fit(X, y)
        joblib.dump(self.clf, self.model_path)
        print(">>> Model trained and serialized to: ", self.model_path)

    def predict_risk(self, reliability: float, is_weekend: bool, is_night_shift: bool, rain_prob: float) -> float:
        """
        Returns a float between 0.0 and 1.0 indicating probability of a NO-SHOW.
        """
        features = [[
            reliability,
            1.0 if is_weekend else 0.0,
            1.0 if is_night_shift else 0.0,
            rain_prob
        ]]
        
        # Predict class probabilities
        probs = self.clf.predict_proba(features)[0]
        # Probability of class 1 (Absent)
        no_show_prob = probs[1]
        
        return float(no_show_prob)

# Singleton Instance
risk_classifier = AttendanceRiskClassifier()
