import asyncio
import aiohttp
import pandas as pd
import logging
from typing import List, Dict, Optional

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

API_BASE_URL = "https://mf.captnemo.in/kuvera/"

async def fetch_metadata_for_isin(session: aiohttp.ClientSession, isin: str) -> Optional[Dict]:
    """Fetches metadata for a single ISIN from the API."""
    if not isin or pd.isna(isin) or isin == '-':
        return None
    
    url = f"{API_BASE_URL}{isin}"
    try:
        async with session.get(url) as response:
            if response.status == 200:
                data = await response.json()
                if data:
                    # The API returns a list, we take the first element
                    return data[0]
            else:
                logger.warning(f"Failed to fetch data for ISIN {isin}: Status {response.status}")
    except aiohttp.ClientError as e:
        logger.error(f"Aiohttp client error for ISIN {isin}: {e}")
    except Exception as e:
        logger.error(f"An unexpected error occurred for ISIN {isin}: {e}")
    return None

async def main():
    """Main function to fetch metadata for all funds."""
    logger.info("Starting fund metadata fetch process.")
    
    # 1. Load the Scheme Code to ISIN mapping
    try:
        # Corrected column names based on CSV header
        mapping_df = pd.read_csv('scripts/amfi_fund_list.csv', header=0, names=['scheme_code', 'isin'])
        # The first row is a header, so we skip it.
        mapping_df = mapping_df.iloc[1:]
        logger.info(f"Loaded {len(mapping_df)} scheme-to-ISIN mappings.")
    except FileNotFoundError:
        logger.error("amfi_fund_list.csv not found in the 'scripts' directory.")
        return

    # 2. Fetch metadata asynchronously
    all_metadata = []
    async with aiohttp.ClientSession() as session:
        tasks = []
        for _, row in mapping_df.iterrows():
            tasks.append(fetch_metadata_for_isin(session, row['isin']))
        
        results = await asyncio.gather(*tasks)
        
        for i, metadata in enumerate(results):
            if metadata:
                scheme_code = mapping_df.iloc[i]['scheme_code']
                metadata['scheme_code'] = scheme_code
                all_metadata.append(metadata)

    logger.info(f"Successfully fetched metadata for {len(all_metadata)} funds.")

    # 3. Save the enriched data to a new JSON file
    if all_metadata:
        output_path = 'scripts/amfi_fund_metadata.json'
        with open(output_path, 'w') as f:
            import json
            json.dump(all_metadata, f, indent=4)
        logger.info(f"Enriched metadata saved to {output_path}")

if __name__ == "__main__":
    # On Windows, you might need to set the event loop policy
    if asyncio.get_event_loop().is_running():
         asyncio.run(main())
    else:
        asyncio.run(main()) 