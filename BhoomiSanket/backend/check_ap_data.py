from sqlalchemy import create_engine, func, Column, Integer, String, Float
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

#DATABASE_URL = 'postgresql://postgres:Postgis%40123@127.0.0.1:5433/bhoomisanket_db'
DATABASE_URL = 'postgresql://postgres:post123@127.0.0.1:5433/bhoomisanket_db'
engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)
db = Session()
Base = declarative_base()

class SoilGerminationData(Base):
    __tablename__ = 'soil_germination_data'
    pixel_id = Column(Integer, primary_key=True)
    state = Column(String)
    category_germination = Column(String)
    shs_germination = Column(Float)

print("--- Data Distribution by State ---")
stats = db.query(
    SoilGerminationData.state, 
    SoilGerminationData.category_germination, 
    func.count()
).group_by(
    SoilGerminationData.state, 
    SoilGerminationData.category_germination
).all()

for state, category, count in stats:
    print(f"State: {state}, Category: {category}, Count: {count}")

print("\n--- Average SHS by State ---")
avg_stats = db.query(
    SoilGerminationData.state,
    func.avg(SoilGerminationData.shs_germination)
).group_by(SoilGerminationData.state).all()

for state, avg in avg_stats:
    print(f"State: {state}, Average SHS: {avg}")

db.close()
