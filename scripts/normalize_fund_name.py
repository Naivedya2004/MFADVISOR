import sys
from rapidfuzz import process, fuzz
import csv
import json

# Load AMFI fund list from CSV or JSON
# For demo, use a static list; replace with file loading as needed
amfi_fund_list = [
    "axis bluechip fund direct growth",
    "hdfc top 100 fund direct plan growth",
    "icici prudential equity & debt fund direct plan growth",
    # ... add more or load from file
]

# Optionally, load mapping of fund name to AMFI code
amfi_fund_map = {
    "axis bluechip fund direct growth": "120503",
    "hdfc top 100 fund direct plan growth": "118834",
    "icici prudential equity & debt fund direct plan growth": "100123",
    # ...
}

def preprocess(text):
    return ''.join(e for e in text.lower() if e.isalnum() or e.isspace())

def normalize_fund_name(user_input, fund_list):
    user_input_clean = preprocess(user_input)
    matched_name, score, idx = process.extractOne(
        user_input_clean,
        fund_list,
        scorer=fuzz.token_sort_ratio
    )
    return matched_name, score, idx

def get_amfi_code(fund_name):
    return amfi_fund_map.get(fund_name)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python normalize_fund_name.py 'Fund Name'")
        sys.exit(1)
    user_input = sys.argv[1]
    matched_name, score, idx = normalize_fund_name(user_input, amfi_fund_list)
    amfi_code = get_amfi_code(matched_name)
    print(json.dumps({
        "input": user_input,
        "matched_name": matched_name,
        "score": score,
        "amfi_code": amfi_code
    }, indent=2)) 