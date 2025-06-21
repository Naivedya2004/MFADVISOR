import pandas as pd
from prophet import Prophet
import logging
from typing import List, Dict
import asyncio

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class NAVPredictor:
    """Predicts future NAV values using Prophet"""
    def __init__(self, model_params: Dict = None):
        if model_params is None:
            # Default Prophet parameters - can be tuned
            model_params = {
                'daily_seasonality': False,
                'weekly_seasonality': True,
                'yearly_seasonality': True,
                'seasonality_mode': 'multiplicative',
                'growth': 'linear'
            }
        
        self.model = Prophet(**model_params)
        self.model_params = model_params
        self.model_info = {
            "model": "Prophet",
            "version": "1.1.5", # fbprophet library version
            "params": self.model_params
        }

    async def train(self, nav_data: List[Dict]):
        """Trains the Prophet model on historical NAV data"""
        if not nav_data:
            raise ValueError("NAV data cannot be empty for training.")
        
        df = pd.DataFrame(nav_data)
        df['ds'] = pd.to_datetime(df['nav_date'])
        df = df.rename(columns={'nav_value': 'y'})
        
        # Run model fitting in a separate thread to avoid blocking asyncio loop
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, self.model.fit, df)
        
        logger.info("NAV Predictor model trained successfully.")

    async def predict(
        self, 
        nav_data: List[Dict], 
        days_ahead: int, 
        confidence_level: float = 0.95
    ) -> Dict:
        """Makes a future NAV prediction"""
        try:
            # Train model on the provided data
            await self.train(nav_data)
            
            # Create future dataframe
            future = self.model.make_future_dataframe(periods=days_ahead)
            
            # Make prediction
            loop = asyncio.get_event_loop()
            forecast = await loop.run_in_executor(None, self.model.predict, future)
            
            # Format output
            prediction_data = forecast[['ds', 'yhat', 'yhat_lower', 'yhat_upper']].tail(days_ahead)
            
            return {
                "forecast": prediction_data.to_dict('records'),
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
    
    predictor = NAVPredictor()
    prediction = await predictor.predict(nav_data=sample_data, days_ahead=7)
    
    print("Prediction Output:")
    print(prediction)

if __name__ == "__main__":
    asyncio.run(main()) 