from typing import List, Dict
import pandas as pd
import numpy as np
from sklearn.preprocessing import OneHotEncoder, MinMaxScaler
from sklearn.metrics.pairwise import cosine_similarity

from database import DatabaseManager

class RecommendationEngine:
    """
    A class to generate mutual fund recommendations.
    """

    def __init__(self, db_manager: DatabaseManager):
        """
        Initialize the recommendation engine.
        """
        self.db_manager = db_manager
        # In the future, we can load pre-trained models or user profiles here.
        pass

    def get_model_info(self) -> Dict:
        """
        Returns information about the model.
        """
        return {
            "model_name": "Recommendation Engine",
            "version": "0.1.0",
            "description": "Generates personalized fund recommendations."
        }

    async def generate_recommendations(
        self,
        user_profile: Dict,
        holdings: List[Dict],
        market_data: pd.DataFrame
    ) -> List[Dict]:
        """
        Generate personalized fund recommendations.

        This is the main method that will orchestrate the recommendation process.
        """
        recommendations = []

        # 1. User Profiling (Placeholder)
        # TODO: Analyze user_profile to understand risk tolerance, goals, etc.
        risk_tolerance = user_profile.get('risk_tolerance', 'moderate')

        # 2. Content-Based Filtering (Placeholder)
        # TODO: Recommend funds similar to what the user already holds or likes.
        # For now, let's add a dummy recommendation.
        content_based_recs = await self._get_content_based_recs(holdings)
        recommendations.extend(content_based_recs)

        # 3. Collaborative Filtering
        # Recommend funds that similar users have invested in.
        collaborative_recs = await self._get_collaborative_recs(user_profile, holdings)
        recommendations.extend(collaborative_recs)
        
        # 4. Factor-Based Analysis (e.g., Fama-French) (Placeholder)
        # TODO: Use factor models to find funds with desired exposures (e.g., value, growth).
        factor_based_recs = self._get_factor_based_recs(risk_tolerance, market_data)
        recommendations.extend(factor_based_recs)

        # 5. Post-processing: Rank and filter duplicates
        # TODO: Implement a more sophisticated ranking and diversification logic.
        final_recs = self._rank_and_filter(recommendations)
        
        return final_recs

    async def _get_content_based_recs(self, holdings: List[Dict]) -> List[Dict]:
        """Recommends funds similar to the user's existing holdings based on metadata similarity (cosine)."""
        if not holdings:
            return []
        user_fund_ids = {h['fund_id'] for h in holdings}
        recommendations = []
        # Gather metadata for held funds
        held_fund_details = []
        for holding in holdings:
            fund_details = await self.db_manager.get_fund_data(holding['fund_id'])
            if fund_details:
                held_fund_details.append(fund_details)
        if not held_fund_details:
            return []
        # Get all candidate funds (not held)
        all_fund_ids = await self.db_manager.get_all_fund_ids()
        candidate_fund_ids = [fid for fid in all_fund_ids if fid not in user_fund_ids]
        candidate_fund_details = []
        for fid in candidate_fund_ids:
            details = await self.db_manager.get_fund_data(fid)
            if details:
                candidate_fund_details.append(details)
        if not candidate_fund_details:
            return []
        # Build feature vectors (category one-hot, expense ratio scaled)
        all_funds = held_fund_details + candidate_fund_details
        categories = [f.get('fund_category', 'Unknown') for f in all_funds]
        expense_ratios = np.array([[float(f.get('expense_ratio', 0) or 0)] for f in all_funds])
        enc = OneHotEncoder(sparse=False, handle_unknown='ignore')
        cat_features = enc.fit_transform(np.array(categories).reshape(-1, 1))
        scaler = MinMaxScaler()
        exp_features = scaler.fit_transform(expense_ratios)
        X = np.hstack([cat_features, exp_features])
        # Compute mean vector for held funds
        held_X = X[:len(held_fund_details)]
        held_mean = held_X.mean(axis=0, keepdims=True)
        # Compute similarity for each candidate
        candidate_X = X[len(held_fund_details):]
        sims = cosine_similarity(candidate_X, held_mean).flatten()
        # Build recommendations
        for i, details in enumerate(candidate_fund_details):
            recommendations.append({
                "fund_id": details['scheme_code'],
                "reason": f"High similarity to your portfolio (category/expense ratio)",
                "score": float(sims[i])
            })
        return recommendations

    async def _get_collaborative_recs(self, user_profile: Dict, holdings: List[Dict]) -> List[Dict]:
        """Suggests funds popular among other users."""
        popular_funds = await self.db_manager.get_popular_funds(limit=20)
        
        user_fund_ids = {h['fund_id'] for h in holdings}
        
        recommendations = []
        for fund in popular_funds:
            if fund['fund_id'] not in user_fund_ids:
                recommendations.append({
                    "fund_id": fund['fund_id'],
                    "reason": f"Popular fund with {fund['holder_count']} investors.",
                    "score": 0.80  # Base score for popular funds
                })
        
        return recommendations

    def _get_factor_based_recs(self, risk_tolerance: str, market_data: pd.DataFrame) -> List[Dict]:
        # Example: Use volatility and Sharpe ratio as factors
        if market_data is None or market_data.empty:
            return []
        recs = []
        for _, row in market_data.iterrows():
            # Assume market_data has columns: fund_id, volatility, sharpe_ratio
            score = 0.5 * (1 - row['volatility']) + 0.5 * row['sharpe_ratio'] / 2  # normalize sharpe
            if (risk_tolerance == 'high' and row['sharpe_ratio'] > 1) or (risk_tolerance != 'high' and row['volatility'] < 0.2):
                recs.append({
                    "fund_id": row['fund_id'],
                    "reason": f"Factor-based: {'High Sharpe' if risk_tolerance == 'high' else 'Low Volatility'}",
                    "score": float(score)
                })
        return recs

    def _rank_and_filter(self, recommendations: List[Dict]) -> List[Dict]:
        # Remove duplicates based on fund_id and blend scores if duplicate
        if not recommendations:
            return []
        seen = {}
        for rec in recommendations:
            fund_id = rec['fund_id']
            if fund_id not in seen:
                seen[fund_id] = rec
            else:
                # Blend scores (average)
                seen[fund_id]['score'] = (seen[fund_id]['score'] + rec['score']) / 2
        ranked_recs = sorted(seen.values(), key=lambda x: x['score'], reverse=True)
        return ranked_recs 