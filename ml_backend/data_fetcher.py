import httpx
import asyncio
import logging
from datetime import date, timedelta
from typing import List, Dict, Optional
from database import DatabaseManager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Constants
# Using a free and public API for NAV data. Replace if you have a preferred one.
MFAPI_URL = "https://api.mfapi.in/mf/{fund_id}"
REQUEST_TIMEOUT = 15  # seconds
MAX_CONCURRENT_REQUESTS = 10

class NAVDataFetcher:
    """Fetches and stores daily NAV data from an external API"""
    def __init__(self):
        self.db_manager = DatabaseManager()

    async def fetch_nav_for_fund(self, fund_id: str, client: httpx.AsyncClient) -> Optional[Dict]:
        """Fetches latest NAV for a single fund"""
        try:
            url = MFAPI_URL.format(fund_id=fund_id)
            response = await client.get(url, timeout=REQUEST_TIMEOUT)
            response.raise_for_status()
            
            data = response.json()
            
            if data['status'] == "SUCCESS" and len(data['data']) > 0:
                latest_nav = data['data'][0]
                return {
                    "amfi_code": fund_id,
                    "nav_date": date.fromisoformat(latest_nav['date']),
                    "nav_value": float(latest_nav['nav'])
                }
        except httpx.HTTPStatusError as e:
            logger.warning(f"HTTP error for fund {fund_id}: {e.response.status_code}")
        except Exception as e:
            logger.error(f"Error fetching NAV for fund {fund_id}: {e}")
        
        return None

    async def fetch_and_store_navs(self):
        """
        Fetches latest NAVs for all funds in the database and stores them.
        Uses asyncio.Semaphore for rate limiting.
        """
        logger.info("Starting daily NAV data fetch...")
        
        try:
            await self.db_manager.initialize()
            fund_ids = await self.db_manager.get_all_fund_ids()
            
            if not fund_ids:
                logger.warning("No fund IDs found in the database. Aborting NAV fetch.")
                return

            logger.info(f"Found {len(fund_ids)} funds to fetch NAV data for.")

            nav_data_to_store = []
            semaphore = asyncio.Semaphore(MAX_CONCURRENT_REQUESTS)

            async with httpx.AsyncClient() as client:
                tasks = []
                for fund_id in fund_ids:
                    task = asyncio.create_task(self._fetch_with_semaphore(fund_id, client, semaphore))
                    tasks.append(task)
                
                results = await asyncio.gather(*tasks)
            
            for result in results:
                if result:
                    nav_data_to_store.append(result)
            
            if nav_data_to_store:
                await self.db_manager.store_nav_data(nav_data_to_store)
                logger.info(f"✅ Successfully fetched and stored NAV data for {len(nav_data_to_store)} funds.")
            else:
                logger.warning("No new NAV data was fetched.")

        except Exception as e:
            logger.error(f"❌ An error occurred during the NAV fetch process: {e}")
        finally:
            await self.db_manager.close()
            logger.info("NAV data fetch process finished.")

    async def _fetch_with_semaphore(self, fund_id, client, semaphore):
        async with semaphore:
            return await self.fetch_nav_for_fund(fund_id, client)

# Example usage (for testing)
async def main():
    fetcher = NAVDataFetcher()
    await fetcher.fetch_and_store_navs()

if __name__ == "__main__":
    asyncio.run(main()) 