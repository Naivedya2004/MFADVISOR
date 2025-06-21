import pandas as pd
import numpy as np
import logging
from typing import List, Dict

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class RiskScorer:
    """Assigns a risk score to funds and portfolios"""
    def __init__(self):
        self.model_info = {
            "model": "Rule-Based Risk Scorer",
            "version": "1.0",
            "description": "Scores risk based on volatility and fund category."
        }

    async def score_fund(self, fund_data: Dict, nav_data: List[Dict], benchmark_nav_data: List[Dict] = None) -> Dict:
        """
        Assigns a risk score to a single fund.
        
        :param fund_data: Metadata for the fund (e.g., category, expense_ratio).
        :param nav_data: Historical NAV data for the fund.
        :param benchmark_nav_data: Historical NAV data for a benchmark index (optional, for beta).
        """
        try:
            # Calculate volatility
            volatility = self._calculate_volatility(nav_data)
            # Calculate max drawdown
            max_drawdown = self._calculate_max_drawdown(nav_data)
            # Calculate Sharpe ratio
            sharpe = self._calculate_sharpe(nav_data)
            # Calculate beta (if benchmark provided)
            beta = self._calculate_beta(nav_data, benchmark_nav_data) if benchmark_nav_data else None
            # Use expense ratio if available
            expense_ratio = float(fund_data.get('expense_ratio', 0))
            # Get category risk
            category = fund_data.get('category', 'Unknown')
            category_risk = self._get_category_risk(category)
            # Combine scores (weighted sum)
            # You can tune these weights as needed
            risk_score = (
                0.4 * volatility +
                0.2 * max_drawdown +
                0.15 * (expense_ratio / 2) +  # normalize expense ratio (assume max 2%)
                0.15 * (abs(beta) if beta is not None else 0.5) +
                0.1 * category_risk
            )
            # Normalize to 1-10 scale
            risk_score = np.clip(risk_score, 0, 1) * 9 + 1
            risk_label = self._get_risk_label(risk_score)

            return {
                "score": round(risk_score, 2),
                "label": risk_label,
                "components": {
                    "annualized_volatility": round(volatility * 100, 2),
                    "max_drawdown": round(max_drawdown * 100, 2),
                    "sharpe_ratio": round(sharpe, 2),
                    "beta": round(beta, 2) if beta is not None else None,
                    "expense_ratio": expense_ratio,
                    "category": category,
                    "category_risk_score": category_risk
                }
            }

        except Exception as e:
            logger.error(f"Error scoring fund risk: {e}")
            raise

    async def score_portfolio(self, holdings: List[Dict]) -> Dict:
        """
        Calculates a weighted average risk score for an entire portfolio.
        This is a placeholder and would require fetching data for each holding.
        """
        # In a real implementation, you would:
        # 1. Loop through each holding
        # 2. Fetch its fund_data and nav_data
        # 3. Call score_fund for each
        # 4. Calculate a weighted average score based on holding value
        
        # Placeholder implementation
        if not holdings:
            return {"score": 0, "label": "No Holdings", "message": "Portfolio is empty."}
        
        # This is a mock score
        mock_portfolio_score = 6.5
        
        return {
            "score": mock_portfolio_score,
            "label": self._get_risk_label(mock_portfolio_score),
            "message": "Portfolio score is a mock value. Implementation needed."
        }

    def _calculate_volatility(self, nav_data: List[Dict]) -> float:
        """Calculates annualized volatility from NAV data"""
        if len(nav_data) < 2:
            return 0.0
            
        df = pd.DataFrame(nav_data)
        df['returns'] = df['nav_value'].pct_change()
        
        # Annualized volatility
        annualized_volatility = df['returns'].std() * np.sqrt(252) # 252 trading days
        return annualized_volatility

    def _calculate_max_drawdown(self, nav_data: List[Dict]) -> float:
        if len(nav_data) < 2:
            return 0.0
        df = pd.DataFrame(nav_data)
        navs = df['nav_value'].values
        running_max = np.maximum.accumulate(navs)
        drawdowns = (navs - running_max) / running_max
        max_drawdown = drawdowns.min() if len(drawdowns) > 0 else 0.0
        return abs(max_drawdown)

    def _calculate_sharpe(self, nav_data: List[Dict], risk_free_rate: float = 0.05) -> float:
        if len(nav_data) < 2:
            return 0.0
        df = pd.DataFrame(nav_data)
        df['returns'] = df['nav_value'].pct_change()
        excess_returns = df['returns'] - (risk_free_rate / 252)
        mean_excess = excess_returns.mean()
        std_excess = excess_returns.std()
        if std_excess == 0:
            return 0.0
        sharpe = (mean_excess / std_excess) * np.sqrt(252)
        return sharpe

    def _calculate_beta(self, nav_data: List[Dict], benchmark_nav_data: List[Dict]) -> float:
        if not benchmark_nav_data or len(nav_data) < 2 or len(benchmark_nav_data) < 2:
            return 0.0
        df = pd.DataFrame(nav_data)
        df_bench = pd.DataFrame(benchmark_nav_data)
        df['returns'] = df['nav_value'].pct_change()
        df_bench['returns'] = df_bench['nav_value'].pct_change()
        min_len = min(len(df['returns']), len(df_bench['returns']))
        if min_len < 2:
            return 0.0
        cov = np.cov(df['returns'][-min_len:], df_bench['returns'][-min_len:])[0][1]
        var = np.var(df_bench['returns'][-min_len:])
        if var == 0:
            return 0.0
        beta = cov / var
        return beta

    def _get_category_risk(self, category: str) -> float:
        """Assigns a risk score based on fund category (0=low, 1=high)"""
        category = category.lower()
        
        # Equity funds (high risk)
        if 'equity' in category or 'large' in category or 'mid' in category or 'small' in category or 'flexi' in category or 'multi cap' in category:
            return 0.9
        # Hybrid/Balanced funds (medium risk)
        if 'hybrid' in category or 'balanced' in category or 'aggressive' in category:
            return 0.6
        # Debt funds (low-medium risk)
        if 'debt' in category or 'gilt' in category or 'corporate' in category:
            return 0.3
        # Liquid/Money Market funds (low risk)
        if 'liquid' in category or 'overnight' in category or 'money market' in category:
            return 0.1
        
        return 0.5 # Default for unknown categories

    def _get_risk_label(self, score: float) -> str:
        """Converts a numeric score to a risk label"""
        if score <= 3.5:
            return "Low"
        elif score <= 6.5:
            return "Moderate"
        else:
            return "High"

    def get_model_info(self) -> Dict:
        """Returns information about the model"""
        return self.model_info

# Example usage (for testing)
async def main():
    scorer = RiskScorer()
    
    fund_data = {"category": "Equity - Large Cap"}
    nav_data = [
        {'nav_value': 100 + np.random.randn()}
        for _ in range(252)
    ]
    
    risk_score = await scorer.score_fund(fund_data, nav_data)
    print("Fund Risk Score:")
    print(risk_score)

if __name__ == "__main__":
    import asyncio
    asyncio.run(main()) 