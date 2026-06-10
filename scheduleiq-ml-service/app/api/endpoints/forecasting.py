from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
from app.core.demand_model import DemandForecaster

router = APIRouter(prefix="/predict", tags=["Forecasting"])

class SignalRecord(BaseModel):
    timestamp: str
    footfall: int
    rain_probability: float
    is_holiday: bool

class ForecastRequest(BaseModel):
    history: List[SignalRecord]

@router.post("/demand")
def predict_demand(payload: ForecastRequest):
    if not payload.history:
        raise HTTPException(status_code=400, detail="Historical signals cannot be empty.")
    
    try:
        # Convert Pydantic model objects to standard python dictionaries
        history_dicts = [record.model_dump() for record in payload.history]
        predictions = DemandForecaster.forecast_next_week(history_dicts)
        return {"predictions": predictions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prophet fitting error: {str(e)}")
