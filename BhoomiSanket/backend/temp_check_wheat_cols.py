import sqlalchemy as sa
import pandas as pd

DATABASE_URL = "postgresql://postgres:post123@127.0.0.1:5433/bhoomisanket_db"
try:
    engine = sa.create_engine(DATABASE_URL)
    query = "SELECT * FROM wheat_shs_germination LIMIT 1"
    df = pd.read_sql(query, engine)
    print(f"Columns: {df.columns.tolist()}")
except Exception as e:
    print(f"Error: {e}")
