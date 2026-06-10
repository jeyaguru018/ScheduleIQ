from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from app.api.endpoints.forecasting import router as forecasting_router
from app.api.endpoints.attendance import router as attendance_router

app = FastAPI(
    title="ScheduleIQ ML Service",
    description="Python Time-Series Demand Forecasting and Attendance No-Show Risk Classifier Services",
    version="1.0.0"
)

# Enable CORS for cross-service calls
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(forecasting_router)
app.include_router(attendance_router)

@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    return Response(status_code=204)

@app.get("/")
def read_root():
    return {
        "status": "ONLINE",
        "service": "ScheduleIQ-ML-Service",
        "engines": ["Facebook Prophet (Demand)", "scikit-learn (Attendance No-Show Classifier)"]
    }

@app.get("/health")
def health_check():
    return {"status": "UP"}

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
