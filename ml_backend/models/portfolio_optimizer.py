import pandas as pd
import numpy as np
from pypfopt import EfficientFrontier, risk_models, expected_returns
import logging
from typing import List, Dict
import asyncio

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PortfolioOptimizer:
    """Optimizes portfolio allocation using Modern Portfolio Theory"""
    def __init__(self):
        self.model_info = {
            "model": "PyPortfolioOpt - Efficient Frontier",
            "version": "1.5.4", # pypfopt library version
        }

    async def optimize(
        self, 
        holdings: List[Dict], 
        historical_data: Dict[str, List[Dict]],
        optimization_type: str = "max_sharpe",
        risk_tolerance: float = 0.5
    ) -> Dict:
        """
        Optimizes portfolio allocation based on historical returns and risk.
        
        :param holdings: List of user's current holdings.
        :param historical_data: Dict of historical NAV data for each fund.
        :param optimization_type: 'max_sharpe', 'min_risk', or 'efficient_risk'.
        :param risk_tolerance: Target volatility for 'efficient_risk' optimization.
        """
        try:
            # Prepare price data DataFrame
            price_df = self._prepare_price_data(historical_data)
            
            if price_df.shape[0] < 2 or price_df.shape[1] < 1:
                raise ValueError("Insufficient data for optimization (need at least 2 days and 1 fund).")

            # Calculate expected returns and sample covariance
            mu = expected_returns.mean_historical_return(price_df)
            S = risk_models.sample_cov(price_df)

            # Initialize EfficientFrontier
            ef = EfficientFrontier(mu, S)

            # Perform optimization
            if optimization_type == "max_sharpe":
                weights = ef.max_sharpe()
            elif optimization_type == "min_risk":
                weights = ef.min_volatility()
            elif optimization_type == "efficient_risk":
                weights = ef.efficient_risk(target_volatility=risk_tolerance)
            else:
                raise ValueError(f"Unsupported optimization type: {optimization_type}")

            cleaned_weights = ef.clean_weights()
            performance = ef.portfolio_performance(verbose=False)
            
            return {
                "weights": cleaned_weights,
                "expected_annual_return": performance[0],
                "annual_volatility": performance[1],
                "sharpe_ratio": performance[2]
            }
            
        except Exception as e:
            logger.error(f"Error during portfolio optimization: {e}")
            raise

    def _prepare_price_data(self, historical_data: Dict[str, List[Dict]]) -> pd.DataFrame:
        """Converts historical NAV data into a pandas DataFrame suitable for PyPortfolioOpt"""
        all_dfs = []
        for fund_id, nav_records in historical_data.items():
            df = pd.DataFrame(nav_records)
            df['nav_date'] = pd.to_datetime(df['nav_date'])
            df = df.rename(columns={'nav_value': fund_id}).set_index('nav_date')
            all_dfs.append(df[[fund_id]])
        
        # Join all dataframes on date
        price_df = pd.concat(all_dfs, axis=1).ffill().bfill()
        return price_df

    def get_model_info(self) -> Dict:
        """Returns information about the model"""
        return self.model_info

# Example usage (for testing)
async def main():
    # Sample historical data for 2 funds
    historical_data = {
        "fund_A": [
            {'nav_date': f'2023-01-{i:02d}', 'nav_value': 100 + i * 0.5} 
            for i in range(1, 31)
        ],
        "fund_B": [
            {'nav_date': f'2023-01-{i:02d}', 'nav_value': 150 - i * 0.2} 
            for i in range(1, 31)
        ],
    }
    
    # Sample holdings (not used in this simplified example, but required by API)
    holdings = [
        {"fund_id": "fund_A", "units": 10},
        {"fund_id": "fund_B", "units": 20},
    ]

    optimizer = PortfolioOptimizer()
    
    # Run Max Sharpe Ratio optimization
    result = await optimizer.optimize(
        holdings=holdings, 
        historical_data=historical_data,
        optimization_type="max_sharpe"
    )
    
    print("Max Sharpe Ratio Optimization Result:")
    print(result)

if __name__ == "__main__":
    asyncio.run(main()) 