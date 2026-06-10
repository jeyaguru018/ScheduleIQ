import pandas as pd
from prophet import Prophet
import numpy as np

class DemandForecaster:
    @staticmethod
    def forecast_next_week(history_data: list) -> list:
        """
        Expects a list of dictionaries: [{"timestamp": "2025-06-01T12:00:00", "footfall": 45, "rain_probability": 0.1, "is_holiday": False}]
        Fits a Prophet time-series model and predicts hourly demand for the next 168 hours (7 days).
        """
        # Convert incoming signal records to a Pandas DataFrame
        df = pd.DataFrame(history_data)
        
        # Prophet requires columns 'ds' (datestamps) and 'y' (target variable)
        df['ds'] = pd.to_datetime(df['timestamp'])
        df['y'] = df['footfall']

        # Initialize and fit the time-series model
        # Enable weekly and daily seasonality to capture retail patterns
        model = Prophet(
            yearly_seasonality=False,
            weekly_seasonality=True,
            daily_seasonality=True,
            interval_width=0.80
        )
        
        # Fit model on historical data
        model.fit(df[['ds', 'y']])

        # Generate hourly timestamps for the upcoming 7 days (168 hours)
        future = model.make_future_dataframe(periods=168, freq='H', include_history=False)
        
        # Run forecasting
        forecast = model.predict(future)

        predictions = []
        for idx, row in forecast.iterrows():
            target_time = row['ds']
            predicted_y = max(5, int(row['yhat']))  # Guarantee at least a skeleton crew of 5 footfall units
            
            # Formulate required staffing crew requirements:
            # Rule: 1 staff member required per 15 footfalls. Minimum 1 crew, max 8 crew.
            required_staff = max(1, min(8, int(np.ceil(predicted_y / 15.0))))

            predictions.append({
                "timestamp": target_time.isoformat(),
                "predicted_footfall": predicted_y,
                "required_staff": required_staff
            })

        return predictions
