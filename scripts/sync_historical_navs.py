import requests
import psycopg2
import json
import time
from datetime import datetime
import concurrent.futures
from tqdm import tqdm
import os
import pickle

# --- PostgreSQL Connection Details (MANUAL: Replace with your actual credentials) ---
DB_HOST = "localhost"
DB_NAME = "Mutualfundadvisor"
DB_USER = "postgres"
DB_PASSWORD = "Naivedya2004@" # Your actual password here

# --- MFAPI Base URL ---
MFAPI_BASE_URL = "https://api.mfapi.in/mf/"

# --- Progress tracking file ---
PROGRESS_FILE = "nav_sync_progress.pkl"

def get_db_connection():
    """Establishes a connection to the PostgreSQL database."""
    return psycopg2.connect(
        host=DB_HOST,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD
    )

def fetch_all_amfi_codes_from_db():
    """Fetches all AMFI scheme codes from the amfi_funds table."""
    conn = None
    cur = None
    amfi_codes = []
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT scheme_code FROM amfi_funds;")
        rows = cur.fetchall()
        amfi_codes = [row[0] for row in rows]
        print(f"Fetched {len(amfi_codes)} AMFI codes from the database.")
    except Exception as e:
        print(f"Error fetching AMFI codes from DB: {e}")
    finally:
        if cur: cur.close()
        if conn: conn.close()
    return amfi_codes

def fetch_historical_navs_from_mfapi(amfi_code: str, max_retries=3):
    """Fetches full historical NAV data for a given AMFI code from MFAPI."""
    url = f"{MFAPI_BASE_URL}{amfi_code}"
    for attempt in range(max_retries):
        try:
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            data = response.json()
            if data.get('status') == 'SUCCESS' and 'data' in data:
                return data['data']
            time.sleep(1)  # Wait before retry
        except Exception as e:
            if attempt == max_retries - 1:
                print(f"Failed to fetch NAVs for {amfi_code} after {max_retries} attempts: {e}")
                return []
            time.sleep(2 ** attempt)  # Exponential backoff
    return []

def insert_nav_history_into_db(amfi_code: str, nav_data: list):
    """Inserts historical NAV data into the fund_nav_history table."""
    if not nav_data:
        return 0
        
    conn = None
    cur = None
    inserted_count = 0
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Prepare all values for batch insert
        values = []
        for entry in nav_data:
            try:
                nav_date = datetime.strptime(entry['date'], '%d-%m-%Y').date()
                nav_value = float(entry['nav'])
                values.append((amfi_code, nav_date, nav_value))
            except (ValueError, KeyError) as e:
                print(f"Error processing NAV entry for {amfi_code}: {e}")
                continue
        
        if values:
            # Use executemany for batch insert
            cur.executemany(
                """
                INSERT INTO fund_nav_history (amfi_code, nav_date, nav_value)
                VALUES (%s, %s, %s)
                ON CONFLICT (amfi_code, nav_date) DO NOTHING;
                """,
                values
            )
            inserted_count = cur.rowcount
            conn.commit()
            
    except Exception as e:
        print(f"Error inserting NAV history for {amfi_code} into DB: {e}")
        if conn: conn.rollback()
    finally:
        if cur: cur.close()
        if conn: conn.close()
    return inserted_count

def process_fund(amfi_code: str):
    """Process a single fund's NAV data."""
    try:
        nav_data = fetch_historical_navs_from_mfapi(amfi_code)
        if nav_data:
            inserted_count = insert_nav_history_into_db(amfi_code, nav_data)
            return amfi_code, inserted_count
    except Exception as e:
        print(f"Error processing fund {amfi_code}: {e}")
    return amfi_code, 0

def load_progress():
    """Load the progress of previously processed funds."""
    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE, 'rb') as f:
            return pickle.load(f)
    return set()

def save_progress(processed_funds):
    """Save the progress of processed funds."""
    with open(PROGRESS_FILE, 'wb') as f:
        pickle.dump(processed_funds, f)

def main():
    print("Starting historical NAV sync process...")
    
    # Get all AMFI codes
    amfi_codes = fetch_all_amfi_codes_from_db()
    if not amfi_codes:
        print("No AMFI codes found in the database. Please ensure 'amfi_funds' table is populated.")
        return

    # Load progress
    processed_funds = load_progress()
    remaining_codes = [code for code in amfi_codes if code not in processed_funds]
    
    if not remaining_codes:
        print("All funds have been processed!")
        return

    print(f"Found {len(remaining_codes)} funds to process.")
    
    # Process funds in parallel
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        futures = {executor.submit(process_fund, code): code for code in remaining_codes}
        
        # Use tqdm for progress bar
        with tqdm(total=len(remaining_codes), desc="Processing funds") as pbar:
            for future in concurrent.futures.as_completed(futures):
                amfi_code, inserted_count = future.result()
                processed_funds.add(amfi_code)
                save_progress(processed_funds)
                pbar.update(1)
                if inserted_count > 0:
                    pbar.set_postfix({'Last fund': amfi_code, 'Inserted': inserted_count})

    print("Historical NAV sync process completed!")

if __name__ == "__main__":
    main()
