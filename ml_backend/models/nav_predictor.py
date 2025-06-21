import pandas as pd
from prophet import Prophet
import logging
from typing import List, Dict
import asyncio
import numpy as np
try:
    from xgboost import XGBRegressor
except ImportError:
    XGBRegressor = None

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class NAVPredictor:
    """Predicts future NAV values using Prophet or XGBoost"""
    def __init__(self, model_params: Dict = None, model_type: str = 'prophet'):
        self.model_type = model_type
        self.model_params = model_params or {}
        if self.model_type == 'prophet':
            default_params = {
                'daily_seasonality': False,
                'weekly_seasonality': True,
                'yearly_seasonality': True,
                'seasonality_mode': 'multiplicative',
                'growth': 'linear'
            }
            default_params.update(self.model_params)
            self.model = Prophet(**default_params)
            self.model_info = {
                "model": "Prophet",
                "version": "1.1.5",
                "params": default_params
            }
        elif self.model_type == 'xgboost':
            if XGBRegressor is None:
                raise ImportError("xgboost is not installed")
            self.model = XGBRegressor(**self.model_params)
            self.model_info = {
                "model": "XGBoost",
                "params": self.model_params
            }
        else:
            raise ValueError(f"Unknown model_type: {self.model_type}")

    def _add_rolling_features(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()
        df['rolling_mean_5'] = df['y'].rolling(window=5).mean()
        df['rolling_std_5'] = df['y'].rolling(window=5).std()
        df['returns'] = df['y'].pct_change()
        df = df.fillna(0)
        return df

    async def train(self, nav_data: List[Dict]):
        """Trains the Prophet model on historical NAV data"""
        if not nav_data:
            raise ValueError("NAV data cannot be empty for training.")
        
        df = pd.DataFrame(nav_data)
        df['ds'] = pd.to_datetime(df['nav_date'])
        df = df.rename(columns={'nav_value': 'y'})
        df = self._add_rolling_features(df)
        
        # Run model fitting in a separate thread to avoid blocking asyncio loop
        loop = asyncio.get_event_loop()
        if self.model_type == 'prophet':
            # Add extra regressors
            for col in ['rolling_mean_5', 'rolling_std_5', 'returns']:
                self.model.add_regressor(col)
            await loop.run_in_executor(None, self.model.fit, df)
        elif self.model_type == 'xgboost':
            # Use past N days to predict next day
            N = 5
            X, y = [], []
            for i in range(N, len(df)):
                features = df[['y', 'rolling_mean_5', 'rolling_std_5', 'returns']].iloc[i-N:i].values.flatten()
                X.append(features)
                y.append(df['y'].iloc[i])
            X, y = np.array(X), np.array(y)
            await loop.run_in_executor(None, self.model.fit, X, y)
        
        logger.info(f"NAV Predictor ({self.model_type}) model trained successfully.")

    async def predict(
        self, 
        nav_data: List[Dict], 
        days_ahead: int, 
        confidence_level: float = 0.95
    ) -> Dict:
        """Makes a future NAV prediction"""
        try:
            await self.train(nav_data)
            df = pd.DataFrame(nav_data)
            df['ds'] = pd.to_datetime(df['nav_date'])
            df = df.rename(columns={'nav_value': 'y'})
            df = self._add_rolling_features(df)
            
            loop = asyncio.get_event_loop()
            if self.model_type == 'prophet':
                future = self.model.make_future_dataframe(periods=days_ahead)
                # Add extra regressors for future
                last_row = df.iloc[-1]
                for col in ['rolling_mean_5', 'rolling_std_5', 'returns']:
                    future[col] = last_row[col]
                forecast = await loop.run_in_executor(None, self.model.predict, future)
                prediction_data = forecast[['ds', 'yhat', 'yhat_lower', 'yhat_upper']].tail(days_ahead)
                return {
                    "forecast": prediction_data.to_dict('records'),
                    "current_nav": nav_data[-1]['nav_value'],
                    "prediction_period_days": days_ahead
                }
            elif self.model_type == 'xgboost':
                # Predict next N days using rolling window
                N = 5
                preds = []
                window = df[['y', 'rolling_mean_5', 'rolling_std_5', 'returns']].values[-N:]
                for i in range(days_ahead):
                    features = window.flatten().reshape(1, -1)
                    pred = await loop.run_in_executor(None, self.model.predict, features)
                    preds.append(float(pred[0]))
                    # Update window for next prediction
                    new_row = np.array([
                        pred[0],
                        window[-1][1],  # keep last rolling mean
                        window[-1][2],  # keep last rolling std
                        window[-1][3],  # keep last return
                    ])
                    window = np.vstack([window[1:], new_row])
                return {
                    "forecast": [{"day": i+1, "yhat": p} for i, p in enumerate(preds)],
                    "current_nav": nav_data[-1]['nav_value'],
                    "prediction_period_days": days_ahead
                }
        except Exception as e:
            logger.error(f"Error during NAV prediction: {e}")
            raise

    def get_model_info(self) -> Dict:
        """Returns information about the model"""
        return self.model_info

# Example usage (for testing)
async def main():
    # Sample NAV data
    sample_data = [
        {'nav_date': f'2023-01-{i:02d}', 'nav_value': 100 + i + (i % 5)}
        for i in range(1, 31)
    ]
    
    predictor = NAVPredictor(model_type='prophet')
    prediction = await predictor.predict(nav_data=sample_data, days_ahead=7)
    
    print("Prophet Prediction Output:")
    print(prediction)
    if XGBRegressor is not None:
        predictor_xgb = NAVPredictor(model_type='xgboost')
        prediction_xgb = await predictor_xgb.predict(nav_data=sample_data, days_ahead=7)
        print("XGBoost Prediction Output:")
        print(prediction_xgb)

if __name__ == "__main__":
    asyncio.run(main()) 