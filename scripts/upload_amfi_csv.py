import psycopg2
import csv
import os

# Update these with your actual connection details
DB_HOST = "localhost"
DB_NAME = "Mutualfundadvisor"
DB_USER = "postgres"
DB_PASSWORD = "Naivedya2004@"  # <-- Replace with your actual password
CSV_PATH = "amfi_fund_list.csv"  # Updated path since we're already in the scripts directory

conn = psycopg2.connect(
    host=DB_HOST,
    database=DB_NAME,
    user=DB_USER,
    password=DB_PASSWORD
)
cur = conn.cursor()

with open(CSV_PATH, newline='', encoding='utf-8') as csvfile:
    reader = csv.DictReader(csvfile)
    for row in reader:
        cur.execute(
            "INSERT INTO amfi_funds (scheme_code, scheme_name) VALUES (%s, %s) ON CONFLICT (scheme_code) DO NOTHING;",
            (row['SchemeCode'], row['SchemeName'])
        )

conn.commit()
cur.close()
conn.close()
print("CSV import complete.") 