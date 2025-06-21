import asyncpg
import logging
from typing import List, Dict, Optional
from datetime import date
import os
from dotenv import load_dotenv
import json

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DatabaseManager:
    """Manages all interactions with the PostgreSQL database"""
    def __init__(self):
        self.pool: Optional[asyncpg.Pool] = None
        self.db_params = {
            'user': os.getenv('DB_USER', 'postgres'),
            'password': os.getenv('DB_PASSWORD', 'Naivedya2004@'),
            'database': os.getenv('DB_NAME', 'Mutualfundadvisor'),
            'host': os.getenv('DB_HOST', 'localhost'),
            'port': int(os.getenv('DB_PORT', 5432))
        }

    async def initialize(self):
        """Initializes the database connection pool"""
        try:
            self.pool = await asyncpg.create_pool(**self.db_params)
            logger.info("✅ Database connection pool initialized")
        except Exception as e:
            logger.error(f"❌ Failed to initialize database connection: {e}")
            raise

    async def close(self):
        """Closes the database connection pool"""
        if self.pool:
            await self.pool.close()
            logger.info("Database connection pool closed")

    async def check_connection(self) -> Dict:
        """Checks the status of the database connection"""
        try:
            async with self.pool.acquire() as connection:
                result = await connection.fetchval('SELECT 1')
                if result == 1:
                    return {"status": "connected"}
            return {"status": "disconnected"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    # --- Data Fetching Methods ---
    async def get_nav_history(self, fund_id: str, days: int = 365) -> List[Dict]:
        """Fetches historical NAV data for a specific fund"""
        query = """
            SELECT nav_date, nav_value
            FROM fund_nav_history
            WHERE amfi_code = $1 AND nav_date >= $2
            ORDER BY nav_date ASC
        """
        start_date = date.today() - timedelta(days=days)
        async with self.pool.acquire() as connection:
            return await connection.fetch(query, fund_id, start_date)

    async def get_user_holdings(self, user_id: str) -> List[Dict]:
        """Fetches user's portfolio holdings"""
        # Note: This assumes a user_holdings table. Adjust as per your schema.
        query = "SELECT fund_id, units, purchase_date FROM user_holdings WHERE user_id = $1"
        async with self.pool.acquire() as connection:
            return await connection.fetch(query, user_id)

    async def get_fund_data(self, fund_id: str) -> Optional[Dict]:
        """Fetches detailed data for a specific fund"""
        query = "SELECT * FROM amfi_funds WHERE scheme_code = $1"
        async with self.pool.acquire() as connection:
            return await connection.fetchrow(query, fund_id)

    async def get_user_profile(self, user_id: str) -> Optional[Dict]:
        """Fetches a user's profile from the profile JSONB column."""
        query = "SELECT profile FROM users WHERE user_id = $1"
        async with self.pool.acquire() as connection:
            row = await connection.fetchrow(query, user_id)
            return row['profile'] if row and row['profile'] else {}

    async def save_user_profile(self, user_id: str, email: str, profile_data: Dict):
        """Saves or updates a user's profile."""
        query = """
            INSERT INTO users (user_id, email, profile)
            VALUES ($1, $2, $3)
            ON CONFLICT (user_id) DO UPDATE
            SET profile = users.profile || $3,
                email = EXCLUDED.email;
        """
        async with self.pool.acquire() as connection:
            # The profile_data needs to be a JSON string
            await connection.execute(query, user_id, email, json.dumps(profile_data))

    async def get_market_trends(self, limit: int = 10) -> List[Dict]:
        """Fetches market trends data"""
        query = "SELECT date, sector, score FROM market_trends ORDER BY date DESC, score DESC LIMIT $1"
        async with self.pool.acquire() as connection:
            return await connection.fetch(query, limit)
            
    async def get_portfolio_performance(self, user_id: str) -> Dict:
        """Calculates and fetches user's portfolio performance"""
        # This is a complex calculation and may require joining multiple tables
        # and aggregating data. A simplified version is shown here.
        # You may want to create a dedicated function or view in your DB for this.
        
        holdings = await self.get_user_holdings(user_id)
        total_invested = 0
        total_value = 0

        for holding in holdings:
            # This is a placeholder for invested amount logic
            # Your schema might store this directly or require calculation
            total_invested += holding.get('invested_amount', 0) 

            latest_nav_row = await self.get_latest_nav(holding['fund_id'])
            if latest_nav_row:
                total_value += holding['units'] * latest_nav_row['nav_value']
        
        gain_loss = total_value - total_invested
        gain_loss_percentage = (gain_loss / total_invested) * 100 if total_invested > 0 else 0
        
        return {
            "total_value": total_value,
            "total_invested": total_invested,
            "gain_loss": gain_loss,
            "gain_loss_percentage": gain_loss_percentage
        }
        
    async def get_latest_nav(self, fund_id: str) -> Optional[Dict]:
        """Fetches the latest NAV for a fund"""
        query = """
            SELECT nav_value 
            FROM fund_nav_history
            WHERE amfi_code = $1
            ORDER BY nav_date DESC 
            LIMIT 1
        """
        async with self.pool.acquire() as connection:
            return await connection.fetchrow(query, fund_id)

    async def get_user_transactions(self, user_id: str) -> List[Dict]:
        """Fetches all transactions for a user."""
        query = "SELECT * FROM transactions WHERE user_id = $1 ORDER BY date DESC"
        async with self.pool.acquire() as connection:
            rows = await connection.fetch(query, user_id)
            return [dict(row) for row in rows]

    # --- Data Storing Methods ---
    async def store_nav_data(self, nav_data: List[Dict]):
        """Stores a batch of NAV data into the database"""
        query = """
            INSERT INTO fund_nav_history (amfi_code, nav_date, nav_value)
            VALUES ($1, $2, $3)
            ON CONFLICT (amfi_code, nav_date) DO UPDATE
            SET nav_value = EXCLUDED.nav_value
        """
        async with self.pool.acquire() as connection:
            await connection.executemany(query, [
                (d['amfi_code'], d['nav_date'], d['nav_value']) for d in nav_data
            ])
        logger.info(f"Stored {len(nav_data)} NAV records")

    async def store_market_trends(self, trends_data: List[Dict]):
        """Stores market trends data"""
        query = """
            INSERT INTO market_trends (date, sector, score)
            VALUES ($1, $2, $3)
            ON CONFLICT (date, sector) DO UPDATE
            SET score = EXCLUDED.score
        """
        async with self.pool.acquire() as connection:
            await connection.executemany(query, [
                (d['date'], d['sector'], d['score']) for d in trends_data
            ])
        logger.info(f"Stored {len(trends_data)} market trend records")

    async def get_all_fund_ids(self) -> List[str]:
        """Fetches all unique fund IDs from the amfi_funds table"""
        query = "SELECT DISTINCT scheme_code FROM amfi_funds"
        async with self.pool.acquire() as connection:
            rows = await connection.fetch(query)
            return [row['scheme_code'] for row in rows]

    async def get_popular_funds(self, limit: int = 10) -> List[Dict]:
        """Fetches the most popular funds based on the number of holders."""
        query = """
            SELECT fund_id, COUNT(user_id) as holder_count
            FROM user_holdings
            GROUP BY fund_id
            ORDER BY holder_count DESC
            LIMIT $1
        """
        async with self.pool.acquire() as connection:
            return await connection.fetch(query, limit)

    async def get_funds_by_category(self, category: str, limit: int = 10) -> List[Dict]:
        """Fetches funds belonging to a specific category."""
        query = """
            SELECT scheme_code, scheme_name, fund_house, expense_ratio
            FROM amfi_funds
            WHERE fund_category = $1
            ORDER BY expense_ratio ASC
            LIMIT $2
        """
        async with self.pool.acquire() as connection:
            return await connection.fetch(query, category, limit)

    async def get_user_portfolio(self, user_id: str) -> List[Dict]:
        """Fetches all portfolio items for a user."""
        query = "SELECT id, fund_id, invested_amount, units, purchase_date FROM user_holdings WHERE user_id = $1 ORDER BY purchase_date DESC"
        async with self.pool.acquire() as connection:
            rows = await connection.fetch(query, user_id)
            return [dict(row) for row in rows]

    async def add_portfolio_item(self, user_id: str, item: Dict) -> int:
        """Adds a new portfolio item and returns its id."""
        query = """
            INSERT INTO user_holdings (user_id, fund_id, invested_amount, units, purchase_date)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id
        """
        async with self.pool.acquire() as connection:
            row = await connection.fetchrow(query, user_id, item['fund_id'], item['invested_amount'], item['units'], item.get('purchase_date'))
            return row['id']

    async def update_portfolio_item(self, user_id: str, item_id: int, item: Dict):
        """Updates an existing portfolio item."""
        query = """
            UPDATE user_holdings
            SET fund_id = $1, invested_amount = $2, units = $3, purchase_date = $4
            WHERE id = $5 AND user_id = $6
        """
        async with self.pool.acquire() as connection:
            await connection.execute(query, item['fund_id'], item['invested_amount'], item['units'], item.get('purchase_date'), item_id, user_id)

    async def delete_portfolio_item(self, user_id: str, item_id: int):
        """Deletes a portfolio item."""
        query = "DELETE FROM user_holdings WHERE id = $1 AND user_id = $2"
        async with self.pool.acquire() as connection:
            await connection.execute(query, item_id, user_id)

    async def get_portfolio_analytics(self, user_id: str) -> Dict:
        """Computes analytics for a user's portfolio."""
        # Fetch all holdings
        holdings = await self.get_user_portfolio(user_id)
        if not holdings:
            return {
                "total_invested": 0,
                "current_value": 0,
                "gain_loss": 0,
                "allocation": [],
            }
        total_invested = 0
        current_value = 0
        allocation = []
        for holding in holdings:
            invested = float(holding['invested_amount'])
            total_invested += invested
            # Get latest NAV
            nav_row = await self.get_latest_nav(holding['fund_id'])
            nav = float(nav_row['nav_value']) if nav_row and nav_row['nav_value'] else 0
            value = float(holding['units']) * nav
            current_value += value
            allocation.append({
                "fund_id": holding['fund_id'],
                "invested": invested,
                "current_value": value,
            })
        gain_loss = current_value - total_invested
        return {
            "total_invested": total_invested,
            "current_value": current_value,
            "gain_loss": gain_loss,
            "allocation": allocation,
        }

    async def add_transaction(self, user_id: str, tx: Dict) -> int:
        """Adds a new transaction and returns its id."""
        query = """
            INSERT INTO transactions (user_id, fund_id, type, units, nav, amount, date)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id
        """
        async with self.pool.acquire() as connection:
            row = await connection.fetchrow(query, user_id, tx['fund_id'], tx['type'], tx['units'], tx['nav'], tx['amount'], tx.get('date'))
            return row['id'] 