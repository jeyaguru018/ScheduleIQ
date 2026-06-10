from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.core.noshow_model import risk_classifier

router = APIRouter(prefix="/predict", tags=["Attendance"])

class AttendanceRequest(BaseModel):
    reliability: float
    is_weekend: bool
    is_night_shift: bool
    rain_probability: float

@router.post("/noshow")
def predict_noshow(payload: AttendanceRequest):
    try:
        prob = risk_classifier.predict_risk(
            payload.reliability,
            payload.is_weekend,
            payload.is_night_shift,
            payload.rain_probability
        )
        return {
            "no_show_probability": prob,
            "risk_label": "HIGH" if prob > 0.40 else "NORMAL"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
