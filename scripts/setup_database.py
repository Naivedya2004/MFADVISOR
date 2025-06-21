import psycopg2
from psycopg2 import sql
import os
from dotenv import load_dotenv

load_dotenv()

# Database connection parameters
DB_PARAMS = {
    'host': 'localhost',
    'database': 'Mutualfundadvisor',
    'user': 'postgres',
    'password': 'Naivedya2004@',
    'port': 5432
}

def create_tables():
    """Create all necessary tables for the application"""
    conn = None
    try:
        conn = psycopg2.connect(**DB_PARAMS)
        cursor = conn.cursor()
        
        print("--- Ensuring a clean database state ---")
        cursor.execute("DROP TABLE IF EXISTS transactions CASCADE;")
        cursor.execute("DROP TABLE IF EXISTS user_profiles CASCADE;")
        cursor.execute("DROP TABLE IF EXISTS portfolio_items CASCADE;")
        cursor.execute("DROP TABLE IF EXISTS fund_nav_history CASCADE;")
        cursor.execute("DROP TABLE IF EXISTS amfi_funds CASCADE;")
        print("✅ Dropped existing tables successfully.")
        
        # Create AMFI funds table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS amfi_funds (
                scheme_code VARCHAR(20) PRIMARY KEY,
                scheme_name TEXT NOT NULL,
                category VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create fund NAV history table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS fund_nav_history (
                id SERIAL PRIMARY KEY,
                amfi_code VARCHAR(20) REFERENCES amfi_funds(scheme_code),
                nav_value DECIMAL(10,4) NOT NULL,
                nav_date DATE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(amfi_code, nav_date)
            )
        """)
        
        # Create portfolio items table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS portfolio_items (
                id SERIAL PRIMARY KEY,
                fund_id VARCHAR(20) REFERENCES amfi_funds(scheme_code),
                units DECIMAL(10,4) NOT NULL,
                invested_amount DECIMAL(12,2) NOT NULL,
                purchase_date DATE NOT NULL,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create transactions table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS transactions (
                id SERIAL PRIMARY KEY,
                fund_id VARCHAR(20) REFERENCES amfi_funds(scheme_code),
                transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('BUY', 'SELL', 'DIVIDEND', 'SWITCH')),
                units DECIMAL(10,4) NOT NULL,
                amount DECIMAL(12,2) NOT NULL,
                nav_value DECIMAL(10,4) NOT NULL,
                transaction_date DATE NOT NULL,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create user profiles table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_profiles (
                id VARCHAR(50) PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                phone VARCHAR(20),
                risk_profile VARCHAR(20) CHECK (risk_profile IN ('Conservative', 'Moderate', 'Aggressive')),
                investment_goal TEXT,
                preferred_categories TEXT[],
                notifications JSONB DEFAULT '{}',
                auto_rebalancing BOOLEAN DEFAULT FALSE,
                tax_loss_harvesting BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create indexes for better performance
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_fund_nav_history_amfi_code ON fund_nav_history(amfi_code)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_fund_nav_history_date ON fund_nav_history(nav_date)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_portfolio_items_fund_id ON portfolio_items(fund_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_transactions_fund_id ON transactions(fund_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type)")
        
        conn.commit()
        print("✅ All tables created successfully!")
        
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()

def insert_sample_data():
    """Insert sample data for testing"""
    conn = None
    try:
        conn = psycopg2.connect(**DB_PARAMS)
        cursor = conn.cursor()
        
        # Insert sample AMFI funds
        sample_funds = [
            ('100001', 'HDFC Top 100 Fund', 'Large Cap'),
            ('100002', 'ICICI Prudential Bluechip Fund', 'Large Cap'),
            ('100003', 'SBI Bluechip Fund', 'Large Cap'),
            ('100004', 'Axis Bluechip Fund', 'Large Cap'),
            ('100005', 'Kotak Emerging Equity Fund', 'Mid Cap'),
            ('100006', 'Nippon India Small Cap Fund', 'Small Cap'),
            ('100007', 'HDFC Balanced Advantage Fund', 'Hybrid'),
            ('100008', 'ICICI Prudential Balanced Advantage Fund', 'Hybrid'),
            ('100009', 'SBI Magnum Gilt Fund', 'Debt'),
            ('100010', 'Axis Liquid Fund', 'Liquid'),
        ]
        
        for fund in sample_funds:
            cursor.execute("""
                INSERT INTO amfi_funds (scheme_code, scheme_name, category)
                VALUES (%s, %s, %s)
                ON CONFLICT (scheme_code) DO NOTHING
            """, fund)
        
        # Insert sample NAV data
        import datetime
        today = datetime.date.today()
        
        for i, fund in enumerate(sample_funds):
            nav_value = 100 + (i * 10) + (hash(fund[0]) % 50)  # Generate some variation
            cursor.execute("""
                INSERT INTO fund_nav_history (amfi_code, nav_value, nav_date)
                VALUES (%s, %s, %s)
                ON CONFLICT (amfi_code, nav_date) DO NOTHING
            """, (fund[0], nav_value, today))
        
        # Insert sample portfolio items
        sample_portfolio = [
            ('100001', 100.0, 15000.0, today - datetime.timedelta(days=30)),
            ('100005', 50.0, 8000.0, today - datetime.timedelta(days=60)),
            ('100007', 200.0, 20000.0, today - datetime.timedelta(days=90)),
        ]
        
        for item in sample_portfolio:
            cursor.execute("""
                INSERT INTO portfolio_items (fund_id, units, invested_amount, purchase_date)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT DO NOTHING
            """, item)
        
        # Insert sample transactions
        sample_transactions = [
            ('100001', 'BUY', 100.0, 15000.0, 150.0, today - datetime.timedelta(days=30), 'Initial investment'),
            ('100005', 'BUY', 50.0, 8000.0, 160.0, today - datetime.timedelta(days=60), 'Mid cap addition'),
            ('100007', 'BUY', 200.0, 20000.0, 100.0, today - datetime.timedelta(days=90), 'Balanced fund'),
            ('100001', 'DIVIDEND', 5.0, 750.0, 150.0, today - datetime.timedelta(days=15), 'Dividend payout'),
        ]
        
        for tx in sample_transactions:
            cursor.execute("""
                INSERT INTO transactions (fund_id, transaction_type, units, amount, nav_value, transaction_date, notes)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT DO NOTHING
            """, tx)
        
        conn.commit()
        print("✅ Sample data inserted successfully!")
        
    except Exception as e:
        print(f"❌ Error inserting sample data: {e}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    print("Setting up database...")
    create_tables()
    insert_sample_data()
    print("Database setup complete!") 