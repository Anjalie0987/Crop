import sys
import os
from dotenv import load_dotenv

# Load environment variables from .env explicitly
load_dotenv(r"c:/Users/anjal/OneDrive/Desktop/CROP/BhoomiSanket/backend/.env")

from app.database import SessionLocal
from app.models import SoilSample
import pandas as pd

try:
    print(f"Connecting to DB: {os.getenv('DATABASE_URL')}")
    db = SessionLocal()
    print("--- Fetching first 10 rows from soil_samples ---")
    query = db.query(SoilSample).limit(10)
    df = pd.read_sql(query.statement, db.bind)
    
    if df.empty:
        print("Table is empty.")
    else:
        # Columns to show
        cols = ['district_name', 'subdistrict_name', 'nitrogen', 'phosphorus', 'potassium', 'ph']
        print(df[cols].to_string())
        
except Exception as e:
    print(f"Error: {e}")
finally:
    if 'db' in locals():
        db.close()
