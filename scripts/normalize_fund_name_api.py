from fastapi import FastAPI, Query
from pydantic import BaseModel
from rapidfuzz import process, fuzz
from typing import List
import uvicorn
import psycopg2 # Import psycopg2

app = FastAPI()

# PostgreSQL Connection Details
# It's recommended to use environment variables for sensitive information
DB_HOST = "localhost"
DB_NAME = "Mutualfundadvisor"
DB_USER = "Naivedya"
DB_PASSWORD = "Naivedya2004@" # Your password here

# Global variables to store AMFI data
amfi_fund_list = []
amfi_fund_map = {}

def load_amfi_data_from_db():
    """
    Connects to PostgreSQL and loads AMFI fund data into global variables.
    """
    global amfi_fund_list, amfi_fund_map
    print("Connecting to PostgreSQL and loading AMFI data...")
    conn = None
    cur = None
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD
        )
        cur = conn.cursor()
        cur.execute("SELECT scheme_code, scheme_name FROM amfi_funds;")
        rows = cur.fetchall()
        
        new_amfi_fund_list = []
        new_amfi_fund_map = {}
        for scheme_code, scheme_name in rows:
            # Preprocess scheme name for fuzzy matching
            preprocessed_name = ''.join(e for e in scheme_name.lower() if e.isalnum() or e.isspace())
            new_amfi_fund_list.append(preprocessed_name)
            new_amfi_fund_map[preprocessed_name] = scheme_code
        
        amfi_fund_list = new_amfi_fund_list
        amfi_fund_map = new_amfi_fund_map
        print(f"Loaded {len(amfi_fund_list)} AMFI funds from DB.")

    except Exception as e:
        print(f"Error loading AMFI data from DB: {e}")
        # Fallback to empty lists if DB load fails
        amfi_fund_list = []
        amfi_fund_map = {}
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

# FastAPI startup event to load data
@app.on_event("startup")
async def startup_event():
    load_amfi_data_from_db()

def preprocess(text: str) -> str:
    """
    Preprocesses the input text for fuzzy matching.
    """
    return ''.join(e for e in text.lower() if e.isalnum() or e.isspace())

class NormalizeResponse(BaseModel):
    """
    Pydantic model for the normalization API response.
    """
    input: str
    matched_name: str
    score: float
    amfi_code: str | None = None
    close_matches: List[str] = []

@app.get("/normalize", response_model=NormalizeResponse)
def normalize_fund_name(input: str = Query(..., description="User input fund name")):
    """
    Normalizes a user-provided fund name using fuzzy matching against AMFI data.
    """
    if not amfi_fund_list:
        # Attempt to reload if list is empty (e.g., first request after startup or if startup failed)
        load_amfi_data_from_db()
        if not amfi_fund_list:
            # If still empty, return an error or a default response indicating data not loaded
            return NormalizeResponse(
                input=input,
                matched_name="Error: AMFI data not loaded",
                score=0,
                amfi_code=None,
                close_matches=[],
            )

    user_input_clean = preprocess(input)
    matches = process.extract(
        user_input_clean,
        amfi_fund_list,
        scorer=fuzz.token_sort_ratio,
        limit=5 # Get top 5 close matches
    )
    
    # Extract best match and its score, fallback if no matches found
    matched_name, score, _ = matches[0] if matches else ("", 0, -1)
    
    # Get AMFI code from the map
    amfi_code = amfi_fund_map.get(matched_name)
    
    # Get only the names of close matches
    close_matches = [m[0] for m in matches]

    return NormalizeResponse(
        input=input,
        matched_name=matched_name,
        score=score,
        amfi_code=amfi_code,
        close_matches=close_matches
    )

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)