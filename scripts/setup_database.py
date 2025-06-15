import psycopg2
import os

# Database connection details
DB_HOST = "localhost"
DB_NAME = "Mutualfundadvisor"
DB_USER = "postgres"
DB_PASSWORD = "Naivedya2004@"  # Replace with your actual password

def setup_database():
    """Creates the necessary tables in the database."""
    conn = None
    cur = None
    try:
        # Connect to the database
        conn = psycopg2.connect(
            host=DB_HOST,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD
        )
        cur = conn.cursor()

        # Read and execute the SQL file
        sql_file_path = os.path.join(os.path.dirname(__file__), 'create_tables.sql')
        with open(sql_file_path, 'r') as sql_file:
            sql_commands = sql_file.read()
            cur.execute(sql_commands)
        
        # Commit the changes
        conn.commit()
        print("Database tables created successfully!")

    except Exception as e:
        print(f"Error setting up database: {e}")
        if conn:
            conn.rollback()
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

if __name__ == "__main__":
    setup_database() 