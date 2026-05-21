import sqlalchemy as sa

DATABASE_URL = "postgresql://postgres:post123@127.0.0.1:5433/bhoomisanket_db"
try:
    engine = sa.create_engine(DATABASE_URL)
    with engine.connect() as conn:
        result = conn.execute(sa.text("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public';"))
        tables = [row[0] for row in result]
        print(f"Tables: {tables}")
        
        for table in tables:
            count = conn.execute(sa.text(f"SELECT count(*) FROM {table};")).scalar()
            print(f"Table {table}: {count} rows")
except Exception as e:
    print(f"Error: {e}")
