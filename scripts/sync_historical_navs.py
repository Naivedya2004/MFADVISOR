import requests
import psycopg2
import json
import time
from datetime import datetime

# --- PostgreSQL Connection Details (MANUAL: Replace with your actual credentials) ---
DB_HOST = "localhost"
DB_NAME = "Mutualfundadvisor"
DB_USER = "Naivedya"
DB_PASSWORD = "Naivedya2004@" # Your actual password here

# --- MFAPI Base URL ---
MFAPI_BASE_URL = "https://api.mfapi.in/mf/"

def get_db_connection():
    """Establishes a connection to the PostgreSQL database."""
    return psycopg2.connect(
        host="localhost",
        database="Mutualfundadvisor",
        user="Naivedya",
        password="Naivedya2004@"
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

def fetch_historical_navs_from_mfapi(amfi_code: str):
    """Fetches full historical NAV data for a given AMFI code from MFAPI."""
    url = f"{MFAPI_BASE_URL}{amfi_code}"
    try:
        response = requests.get(url, timeout=10) # Add timeout
        response.raise_for_status() # Raise HTTPError for bad responses (4xx or 5xx)
        data = response.json()
        if data.get('status') == 'SUCCESS' and 'data' in data:
            print(f"Successfully fetched historical NAVs for {amfi_code}.")
            return data['data']
        else:
            print(f"No successful data in MFAPI response for {amfi_code}: {data.get('message', 'Unknown error')}")
            return []
    except requests.exceptions.RequestException as e:
        print(f"Error fetching NAVs for {amfi_code} from MFAPI: {e}")
        return []

def insert_nav_history_into_db(amfi_code: str, nav_data: list):
    """Inserts historical NAV data into the fund_nav_history table."""
    conn = None
    cur = None
    inserted_count = 0
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        for entry in nav_data:
            nav_date = datetime.strptime(entry['date'], '%d-%m-%Y').date()
            nav_value = float(entry['nav']) # Ensure NAV is a float
            
            cur.execute(
                """
                INSERT INTO fund_nav_history (amfi_code, nav_date, nav_value)
                VALUES (%s, %s, %s)
                ON CONFLICT (amfi_code, nav_date) DO NOTHING;
                """,
                (amfi_code, nav_date, nav_value)
            )
            if cur.rowcount > 0: # Check if a row was actually inserted (not skipped due to conflict)
                inserted_count += 1
        conn.commit()
        print(f"Inserted/Updated {inserted_count} new NAV entries for {amfi_code}.")
    except Exception as e:
        print(f"Error inserting NAV history for {amfi_code} into DB: {e}")
        if conn: conn.rollback() # Rollback on error
    finally:
        if cur: cur.close()
        if conn: conn.close()

if __name__ == "__main__":
    print("Starting historical NAV sync process...")
    amfi_codes = fetch_all_amfi_codes_from_db()
    if not amfi_codes:
        print("No AMFI codes found in the database. Please ensure 'amfi_funds' table is populated.")
        print("Stopping sync process.")
    else:
        for i, code in enumerate(amfi_codes):
            print(f"Processing {i+1}/{len(amfi_codes)}: AMFI Code {code}")
            nav_data = fetch_historical_navs_from_mfapi(code)
            if nav_data:
                insert_nav_history_into_db(code, nav_data)
            time.sleep(0.1) # Small delay to avoid hitting API rate limits too aggressively
        print("Historical NAV sync process completed.")
