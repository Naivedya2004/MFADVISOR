import psycopg2
import sys

# --- PostgreSQL Connection Details (MANUAL: Replace with your actual credentials) ---
DB_HOST = "localhost"
DB_NAME = "Mutualfundadvisor"
DB_USER = "postgres"
DB_PASSWORD = "Naivedya2004@" # Your actual password here

def check_amfi_funds_table():
    """Connects to DB and checks if amfi_funds table contains data."""
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

        cur.execute("SELECT COUNT(*) FROM amfi_funds;")
        count = cur.fetchone()[0]
        print(f"Number of rows in 'amfi_funds' table: {count}")

        if count > 0:
            cur.execute("SELECT scheme_code, scheme_name FROM amfi_funds LIMIT 5;")
            print("First 5 rows from 'amfi_funds' table:")
            for row in cur.fetchall():
                print(f"  Code: {row[0]}, Name: {row[1]}")
        else:
            print("The 'amfi_funds' table is currently empty.")
            print("Please ensure you have run 'python scripts/upload_amfi_csv.py' successfully.")
            
        return count > 0

    except psycopg2.OperationalError as e:
        print(f"Database connection failed: {e}", file=sys.stderr)
        print("Please check your DB_HOST, DB_NAME, DB_USER, and DB_PASSWORD.", file=sys.stderr)
        return False
    except Exception as e:
        print(f"An unexpected error occurred: {e}", file=sys.stderr)
        return False
    finally:
        if cur: cur.close()
        if conn: conn.close()

if __name__ == "__main__":
    check_amfi_funds_table()