from typing import List, Dict
import pandas as pd

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
        """Recommends funds similar to the user's existing holdings based on category."""
        if not holdings:
            return []

        user_fund_ids = {h['fund_id'] for h in holdings}
        recommendations = []
        
        # Find categories from user's current holdings
        held_categories = set()
        for holding in holdings:
            fund_details = await self.db_manager.get_fund_data(holding['fund_id'])
            if fund_details and fund_details.get('fund_category'):
                held_categories.add(fund_details['fund_category'])
        
        # Find similar funds in those categories
        for category in held_categories:
            similar_funds = await self.db_manager.get_funds_by_category(category, limit=5)
            for fund in similar_funds:
                if fund['scheme_code'] not in user_fund_ids:
                    recommendations.append({
                        "fund_id": fund['scheme_code'],
                        "reason": f"Similar to your investments in the {category} category.",
                        "score": 0.85 # Base score for content-based match
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
        # Placeholder: Suggest a fund based on risk tolerance and market data
        if risk_tolerance == 'high':
            return [{
                "fund_id": "HIGH_GROWTH_FUND_003",
                "reason": "High growth potential based on market factors.",
                "score": 0.90
            }]
        else:
            return [{
                "fund_id": "STABLE_RETURN_FUND_004",
                "reason": "Stable returns with lower risk.",
                "score": 0.75
            }]

    def _rank_and_filter(self, recommendations: List[Dict]) -> List[Dict]:
        # Remove duplicates based on fund_id and keep the one with the highest score
        if not recommendations:
            return []
            
        seen = {}
        for rec in recommendations:
            fund_id = rec['fund_id']
            if fund_id not in seen or rec['score'] > seen[fund_id]['score']:
                seen[fund_id] = rec
        
        # Sort by score in descending order
        ranked_recs = sorted(seen.values(), key=lambda x: x['score'], reverse=True)
        
        return ranked_recs 