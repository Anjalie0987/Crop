import os
import psycopg2
from dotenv import load_dotenv

# Load from backend/.env
env_path = r'd:\CROP2\CROP2\BhoomiSanket\backend\.env'
load_dotenv(env_path)

db_url = os.getenv('DATABASE_URL')
print(f"Testing connection to: {db_url.split('@')[-1]}") # Print only host part for security

try:
    conn = psycopg2.connect(db_url)
    print("SUCCESS: Connection established!")
    
    cur = conn.cursor()
    cur.execute("SELECT current_database();")
    db_name = cur.fetchone()[0]
    print(f"Database name: {db_name}")
    
    cur.close()
    conn.close()
except Exception as e:
    print(f"FAILED: {e}")
