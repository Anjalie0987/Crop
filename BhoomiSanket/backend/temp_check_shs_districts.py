import requests
from sqlalchemy import create_engine, text

DB_URL = "postgresql://postgres:post123@127.0.0.1:5433/bhoomisanket_db"
engine = create_engine(DB_URL)

try:
    with engine.connect() as conn:
        print("--- Germination Table Districts ---")
        res = conn.execute(text("SELECT DISTINCT district FROM germination")).fetchall()
        for r in res:
            print(r[0])
            
        print("\n--- SHS Models District API check ---")
        try:
            r = requests.get('http://127.0.0.1:8001/api/districts')
            data = r.json()
            print(f"SHS API Districts Count: {len(data.keys())}")
            print(f"SHS API Districts: {list(data.keys())}")
        except:
            print("SHS API is not reachable or errored.")
        
except Exception as e:
    print(f"Error: {e}")
