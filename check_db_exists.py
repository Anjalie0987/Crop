import os
import psycopg2
from dotenv import load_dotenv

env_path = r'd:\CROP2\CROP2\BhoomiSanket\backend\.env'
load_dotenv(env_path)

db_url = os.getenv('DATABASE_URL')
# Create a URL for the 'postgres' default database to check list of DBs
base_url = db_url.rsplit('/', 1)[0] + '/postgres'

try:
    conn = psycopg2.connect(base_url)
    cur = conn.cursor()
    cur.execute("SELECT datname FROM pg_database;")
    dbs = [row[0] for row in cur.fetchall()]
    print("Databases found:")
    for db in dbs:
        print(f" - {db}")
    
    if 'bhoomisanket_db' in dbs:
        print("\nSUCCESS: 'bhoomisanket_db' exists.")
    else:
        print("\nWARNING: 'bhoomisanket_db' DOES NOT EXIST.")
        
    cur.close()
    conn.close()
except Exception as e:
    print(f"FAILED to connect to 'postgres' DB: {e}")
