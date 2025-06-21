import joblib
import os
import logging
from typing import Dict, Any

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Constants
MODEL_DIR = "ml_backend/models/bin"
MODEL_VERSIONS = {
    "nav_predictor": "1.0",
    "portfolio_optimizer": "1.0",
    "risk_scorer": "1.0"
}

class ModelManager:
    """Manages loading, saving, and versioning of ML models"""
    def __init__(self):
        self.models: Dict[str, Any] = {}
        os.makedirs(MODEL_DIR, exist_ok=True)

    async def load_models(self):
        """Loads all ML models from disk"""
        logger.info("Loading ML models...")
        for model_name in MODEL_VERSIONS.keys():
            try:
                model_path = self._get_model_path(model_name)
                if os.path.exists(model_path):
                    self.models[model_name] = joblib.load(model_path)
                    logger.info(f"✅ Loaded model '{model_name}' version {MODEL_VERSIONS[model_name]}")
                else:
                    logger.warning(f"Model file not found for '{model_name}'. Will need training.")
                    self.models[model_name] = None
            except Exception as e:
                logger.error(f"❌ Failed to load model '{model_name}': {e}")
                self.models[model_name] = None

    def save_model(self, model_name: str, model: Any):
        """Saves a single ML model to disk"""
        if model_name not in MODEL_VERSIONS:
            raise ValueError(f"Unknown model name: {model_name}")
            
        try:
            model_path = self._get_model_path(model_name)
            joblib.dump(model, model_path)
            self.models[model_name] = model
            logger.info(f"✅ Saved model '{model_name}' version {MODEL_VERSIONS[model_name]} to {model_path}")
        except Exception as e:
            logger.error(f"❌ Failed to save model '{model_name}': {e}")
            raise

    def get_model(self, model_name: str) -> Any:
        """Retrieves a loaded model"""
        return self.models.get(model_name)

    def get_model_status(self) -> Dict[str, Dict[str, str]]:
        """Returns the status of all managed models"""
        status = {}
        for model_name, version in MODEL_VERSIONS.items():
            status[model_name] = {
                "version": version,
                "loaded": "Yes" if self.get_model(model_name) is not None else "No"
            }
        return status

    async def retrain_all_models(self):
        """
        Coordinates the retraining of all models.
        This would be a complex process involving fetching data and calling each model's
        training method. This is a placeholder for that logic.
        """
        logger.info("🚀 Starting periodic model retraining...")
        
        # In a real implementation, you would:
        # 1. Initialize DatabaseManager
        # 2. Fetch fresh data for each model
        # 3. Call the `train` method on each model object (e.g., nav_predictor.train())
        # 4. Save the newly trained models using `save_model`
        
        # Placeholder logic
        # from models.nav_predictor import NAVPredictor
        # nav_predictor = NAVPredictor()
        # await nav_predictor.train() # This would need the data
        # self.save_model("nav_predictor", nav_predictor.model)
        
        logger.info("✅ Finished periodic model retraining.")

    def _get_model_path(self, model_name: str) -> str:
        """Constructs the full path for a model file"""
        version = MODEL_VERSIONS[model_name]
        return os.path.join(MODEL_DIR, f"{model_name}_v{version}.pkl") 