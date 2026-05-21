import sqlalchemy as sa
import pandas as pd

DATABASE_URL = "postgresql://postgres:post123@127.0.0.1:5433/bhoomisanket_db"
try:
    engine = sa.create_engine(DATABASE_URL)
    query = "SELECT * FROM wheat_shs_germination LIMIT 1"
    df = pd.read_sql(query, engine)
    print(f"Columns: {df.columns.tolist()}")
    
    query_stats = "SELECT MIN(n), MAX(n), AVG(n), MIN(p), MAX(p), AVG(p), MIN(k), MAX(k), AVG(k), MIN(ph), MAX(ph), AVG(ph), MIN(oc), MAX(oc), AVG(oc), MIN(moisture), MAX(moisture), AVG(moisture), MIN(temp), MAX(temp), AVG(temp) FROM wheat_shs_germination"
    df_stats = pd.read_sql(query_stats, engine)
    print(df_stats.to_string())
except Exception as e:
    print(f"Error: {e}")
