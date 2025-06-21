from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import asyncio
import logging
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
from typing import List, Dict, Optional
import json

# Import our modules
from database import DatabaseManager
from models.nav_predictor import NAVPredictor
from models.portfolio_optimizer import PortfolioOptimizer
from models.risk_scorer import RiskScorer
from data_fetcher import NAVDataFetcher
from utils.model_manager import ModelManager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="MF Advisor ML Backend",
    description="ML-powered mutual fund advisor with NAV prediction, portfolio optimization, and risk scoring",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize components
db_manager = DatabaseManager()
nav_predictor = NAVPredictor()
portfolio_optimizer = PortfolioOptimizer()
risk_scorer = RiskScorer()
data_fetcher = NAVDataFetcher()
model_manager = ModelManager()

@app.on_event("startup")
async def startup_event():
    """Initialize models and database on startup"""
    try:
        await db_manager.initialize()
        await model_manager.load_models()
        logger.info("✅ ML Backend initialized successfully")
    except Exception as e:
        logger.error(f"❌ Failed to initialize ML Backend: {e}")
        raise

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "MF Advisor ML Backend",
        "status": "running",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/health")
async def health_check():
    """Detailed health check"""
    try:
        db_status = await db_manager.check_connection()
        model_status = model_manager.get_model_status()
        
        return {
            "status": "healthy",
            "database": db_status,
            "models": model_status,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")

# NAV Prediction Endpoints
@app.post("/predict-nav")
async def predict_nav(
    fund_id: str,
    days_ahead: int = 30,
    confidence_level: float = 0.95
):
    """Predict NAV for a specific fund"""
    try:
        # Get historical NAV data
        nav_data = await db_manager.get_nav_history(fund_id, days=365)
        
        if len(nav_data) < 30:
            raise HTTPException(
                status_code=400, 
                detail=f"Insufficient historical data for fund {fund_id}. Need at least 30 days."
            )
        
        # Make prediction
        prediction = await nav_predictor.predict(
            nav_data=nav_data,
            days_ahead=days_ahead,
            confidence_level=confidence_level
        )
        
        return {
            "fund_id": fund_id,
            "prediction": prediction,
            "model_info": nav_predictor.get_model_info(),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error predicting NAV for {fund_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict-multiple-funds")
async def predict_multiple_funds(
    fund_ids: List[str],
    days_ahead: int = 30
):
    """Predict NAV for multiple funds"""
    try:
        results = {}
        
        for fund_id in fund_ids:
            try:
                nav_data = await db_manager.get_nav_history(fund_id, days=365)
                if len(nav_data) >= 30:
                    prediction = await nav_predictor.predict(
                        nav_data=nav_data,
                        days_ahead=days_ahead
                    )
                    results[fund_id] = prediction
                else:
                    results[fund_id] = {"error": "Insufficient historical data"}
            except Exception as e:
                results[fund_id] = {"error": str(e)}
        
        return {
            "predictions": results,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error predicting multiple funds: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Portfolio Optimization Endpoints
@app.post("/optimize-portfolio")
async def optimize_portfolio(
    user_id: str,
    optimization_type: str = "max_sharpe",  # max_sharpe, min_risk, max_return
    risk_tolerance: float = 0.5  # 0-1 scale
):
    """Optimize portfolio allocation"""
    try:
        # Get user holdings
        holdings = await db_manager.get_user_holdings(user_id)
        
        if not holdings:
            raise HTTPException(
                status_code=400,
                detail="No portfolio holdings found for user"
            )
        
        # Get historical data for all funds
        fund_ids = [h['fund_id'] for h in holdings]
        historical_data = {}
        
        for fund_id in fund_ids:
            nav_data = await db_manager.get_nav_history(fund_id, days=365)
            if len(nav_data) >= 30:
                historical_data[fund_id] = nav_data
        
        if not historical_data:
            raise HTTPException(
                status_code=400,
                detail="Insufficient historical data for portfolio optimization"
            )
        
        # Optimize portfolio
        optimization_result = await portfolio_optimizer.optimize(
            holdings=holdings,
            historical_data=historical_data,
            optimization_type=optimization_type,
            risk_tolerance=risk_tolerance
        )
        
        return {
            "user_id": user_id,
            "optimization_type": optimization_type,
            "current_allocation": holdings,
            "optimized_allocation": optimization_result,
            "model_info": portfolio_optimizer.get_model_info(),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error optimizing portfolio for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Risk Scoring Endpoints
@app.post("/risk-score")
async def get_risk_score(fund_id: str):
    """Get risk score for a specific fund"""
    try:
        # Get fund data
        fund_data = await db_manager.get_fund_data(fund_id)
        nav_data = await db_manager.get_nav_history(fund_id, days=365)
        
        if not fund_data or len(nav_data) < 30:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient data for risk scoring fund {fund_id}"
            )
        
        # Calculate risk score
        risk_score = await risk_scorer.score_fund(
            fund_data=fund_data,
            nav_data=nav_data
        )
        
        return {
            "fund_id": fund_id,
            "risk_score": risk_score,
            "model_info": risk_scorer.get_model_info(),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error scoring risk for fund {fund_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/risk-score-portfolio")
async def get_portfolio_risk_score(user_id: str):
    """Get overall risk score for user's portfolio"""
    try:
        # Get user holdings
        holdings = await db_manager.get_user_holdings(user_id)
        
        if not holdings:
            raise HTTPException(
                status_code=400,
                detail="No portfolio holdings found for user"
            )
        
        # Calculate portfolio risk score
        portfolio_risk = await risk_scorer.score_portfolio(holdings)
        
        return {
            "user_id": user_id,
            "portfolio_risk_score": portfolio_risk,
            "holdings_count": len(holdings),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error scoring portfolio risk for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Dashboard Endpoint
@app.get("/dashboard/{user_id}")
async def get_dashboard(user_id: str):
    """Get comprehensive dashboard data for a user"""
    try:
        # Get user holdings
        holdings = await db_manager.get_user_holdings(user_id)
        
        # Get portfolio performance
        portfolio_performance = await db_manager.get_portfolio_performance(user_id)
        
        # Get market trends
        market_trends = await db_manager.get_market_trends()
        
        # Get recommendations
        recommendations = await get_recommendations(user_id, holdings)
        
        return {
            "user_id": user_id,
            "portfolio_summary": {
                "total_value": portfolio_performance.get("total_value", 0),
                "total_invested": portfolio_performance.get("total_invested", 0),
                "gain_loss": portfolio_performance.get("gain_loss", 0),
                "gain_loss_percentage": portfolio_performance.get("gain_loss_percentage", 0),
                "holdings_count": len(holdings)
            },
            "holdings": holdings,
            "market_trends": market_trends,
            "recommendations": recommendations,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting dashboard for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Data Management Endpoints
@app.post("/fetch-nav-data")
async def fetch_nav_data(background_tasks: BackgroundTasks):
    """Fetch latest NAV data from external sources"""
    try:
        background_tasks.add_task(data_fetcher.fetch_and_store_navs)
        return {
            "message": "NAV data fetch initiated in background",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error initiating NAV data fetch: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/retrain-models")
async def retrain_models(background_tasks: BackgroundTasks):
    """Retrain all ML models with latest data"""
    try:
        background_tasks.add_task(model_manager.retrain_all_models)
        return {
            "message": "Model retraining initiated in background",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error initiating model retraining: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Helper functions
async def get_recommendations(user_id: str, holdings: List[Dict]) -> Dict:
    """Generate personalized recommendations for user"""
    try:
        recommendations = {
            "rebalancing": [],
            "new_investments": [],
            "risk_adjustments": []
        }
        
        # Simple recommendation logic (can be enhanced)
        if len(holdings) < 3:
            recommendations["new_investments"].append({
                "type": "diversification",
                "message": "Consider adding more funds for better diversification",
                "priority": "high"
            })
        
        return recommendations
        
    except Exception as e:
        logger.error(f"Error generating recommendations: {e}")
        return {"error": "Failed to generate recommendations"}

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info"
    ) 