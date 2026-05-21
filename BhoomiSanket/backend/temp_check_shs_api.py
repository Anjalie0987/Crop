import requests
from sqlalchemy import create_engine, text

# Check BOTH databases/services
DB_URL_MAIN = "postgresql://postgres:post123@127.0.0.1:5433/bhoomisanket_db"
# If shs-backend has its own DB, it might be the same one or different.
# Let's check latlon_suitability distinct districts in MAIN
engine = create_engine(DB_URL_MAIN)

try:
    with engine.connect() as conn:
        print("--- latlon_suitability (MAIN DB) Districts ---")
        # I need to see what's in there. I'll rely on my backend's spatial join if the table lacks names.
        # Wait, I already ran this in temp_check_farm_data.py and it showed 34 districts.
        pass

    print("\n--- SHS API Check ---")
    r = requests.get('http://127.0.0.1:8001/api/districts')
    data = r.json()
    print(f"SHS API Districts Count: {len(data.keys())}")
    print(f"SHS API Districts: {sorted(list(data.keys()))}")
    
except Exception as e:
    print(f"Error: {e}")
