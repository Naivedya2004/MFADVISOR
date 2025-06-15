import psycopg2
from datetime import datetime
import pandas as pd

# Database connection details
DB_HOST = "localhost"
DB_NAME = "Mutualfundadvisor"
DB_USER = "postgres"
DB_PASSWORD = "Naivedya2004@"

def get_db_connection():
    """Establishes a connection to the PostgreSQL database."""
    return psycopg2.connect(
        host=DB_HOST,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD
    )

def verify_database():
    """Verifies the database contents and data quality."""
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        print("\n=== Database Verification Report ===\n")

        # 1. Check total number of funds
        cur.execute("SELECT COUNT(*) FROM amfi_funds;")
        total_funds = cur.fetchone()[0]
        print(f"1. Total number of funds in database: {total_funds:,}")

        # 2. Check total number of NAV entries
        cur.execute("SELECT COUNT(*) FROM fund_nav_history;")
        total_navs = cur.fetchone()[0]
        print(f"2. Total number of NAV entries: {total_navs:,}")

        # 3. Check date range of NAV data
        cur.execute("""
            SELECT 
                MIN(nav_date) as earliest_date,
                MAX(nav_date) as latest_date
            FROM fund_nav_history;
        """)
        date_range = cur.fetchone()
        print(f"3. NAV data date range: {date_range[0]} to {date_range[1]}")

        # 4. Check funds with most NAV entries
        print("\n4. Top 5 funds with most NAV entries:")
        cur.execute("""
            SELECT 
                f.scheme_code,
                f.scheme_name,
                COUNT(n.nav_date) as nav_count
            FROM amfi_funds f
            LEFT JOIN fund_nav_history n ON f.scheme_code = n.amfi_code
            GROUP BY f.scheme_code, f.scheme_name
            ORDER BY nav_count DESC
            LIMIT 5;
        """)
        top_funds = cur.fetchall()
        for fund in top_funds:
            print(f"   - {fund[0]}: {fund[1]} ({fund[2]:,} NAV entries)")

        # 5. Check funds with no NAV entries
        cur.execute("""
            SELECT COUNT(*)
            FROM amfi_funds f
            LEFT JOIN fund_nav_history n ON f.scheme_code = n.amfi_code
            WHERE n.nav_date IS NULL;
        """)
        funds_without_nav = cur.fetchone()[0]
        print(f"\n5. Number of funds with no NAV entries: {funds_without_nav:,}")

        # 6. Check average NAV entries per fund
        avg_navs = total_navs / total_funds if total_funds > 0 else 0
        print(f"6. Average NAV entries per fund: {avg_navs:,.2f}")

        # 7. Check for any duplicate NAV entries
        cur.execute("""
            SELECT amfi_code, nav_date, COUNT(*)
            FROM fund_nav_history
            GROUP BY amfi_code, nav_date
            HAVING COUNT(*) > 1;
        """)
        duplicates = cur.fetchall()
        print(f"\n7. Number of duplicate NAV entries: {len(duplicates):,}")

        # 8. Check for any NULL or invalid NAV values
        cur.execute("""
            SELECT COUNT(*)
            FROM fund_nav_history
            WHERE nav_value IS NULL OR nav_value <= 0;
        """)
        invalid_navs = cur.fetchone()[0]
        print(f"8. Number of invalid NAV values: {invalid_navs:,}")

    except Exception as e:
        print(f"Error during verification: {e}")
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

if __name__ == "__main__":
    verify_database() 
    