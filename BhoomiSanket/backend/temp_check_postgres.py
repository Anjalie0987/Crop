import sqlalchemy as sa
import pandas as pd
import sys

DATABASE_URL = "postgresql://postgres:post123@127.0.0.1:5432/bhoomisanket_db"
try:
    engine = sa.create_engine(DATABASE_URL)
    query = "SELECT nitrogen, phosphorus, potassium, ph, organic_carbon, moisture, temperature FROM soil_germination_data"
    df = pd.read_sql(query, engine)
    
    if df.empty:
        print("Table is empty.")
    else:
        print(df.describe().to_string())
except Exception as e:
    print(f"Error: {e}")
