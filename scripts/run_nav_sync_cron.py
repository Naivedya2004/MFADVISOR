import asyncio
import logging
import sys
import os

# Add ml_backend to path to import from it
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'ml_backend')))

from data_fetcher import NAVDataFetcher

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("nav_sync_cron.log"),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

async def run_nav_sync():
    """
    Main function to run the NAV data synchronization process.
    This is intended to be called by a cron job.
    """
    logger.info("🚀 Starting scheduled NAV synchronization job...")
    
    try:
        fetcher = NAVDataFetcher()
        await fetcher.fetch_and_store_navs()
        logger.info("✅ NAV synchronization job completed successfully.")
    except Exception as e:
        logger.critical(f"❌ A critical error occurred during the NAV sync job: {e}", exc_info=True)
        sys.exit(1) # Exit with an error code

if __name__ == "__main__":
    # To run this script: python scripts/run_nav_sync_cron.py
    asyncio.run(run_nav_sync()) 