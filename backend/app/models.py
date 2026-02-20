from sqlalchemy import Column, Integer, String, Float, DateTime
from app.database import Base
from datetime import datetime

class SoilSample(Base):
    __tablename__ = "soil_samples"

    id = Column(Integer, primary_key=True, index=True)
    district_name = Column(String, index=True)
    subdistrict_name = Column(String, index=True) # Used for Map Linking
    
    # Physical / Climate
    moisture = Column(Float)
    rainfall = Column(Float)
    temperature = Column(Float)
    humidity = Column(Float)

    # Macro Nutrients
    nitrogen = Column(Float)
    phosphorus = Column(Float)
    potassium = Column(Float)

    # Micro Nutrients
    zinc = Column(Float)
    sulphur = Column(Float)
    boron = Column(Float)
    iron = Column(Float)
    manganese = Column(Float)
    copper = Column(Float)

    # Soil Texture & Properties
    ph = Column(Float)
    oc = Column(Float) # Organic Carbon
    cec = Column(Float) # Cation Exchange Capacity
    sand = Column(Float)
    silt = Column(Float)
    clay = Column(Float)
    water_holding_capacity = Column(Float)
    # NDVI and Elevation usually raster data, but we can store point values
    ndvi = Column(Float) 
    elevation = Column(Float)
    slope = Column(Float)
    
    created_at = Column(DateTime, default=datetime.utcnow)

class SoilCropData(Base):
    __tablename__ = "soil_crop_data"
    
    # Assuming no ID column was created if imported manually from CSV properly, 
    # but SQLAlchemy needs a primary key. Usually pandas.to_sql adds an index column.
    # Let's hope there is one, or we map to subdistrict_name as PK (risky but okay for read-only)
    # Or strict mapping to the screenshot provided.
    
    # Screenshots show just columns. Let's assume a composite PK or add a surrogate if we can't find one.
    # Safe bet: Map subdistrict_name as PK for now if unique, or assume an 'index' column exists.
    # Actually, let's look at the screenshot again: "row numbers" are shown but might be UI.
    # To be safe, I'll define subdistrict_name as primary_key=True for the model mapping, 
    # ensuring we can select individual rows.
    
    subdistrict_name = Column(String(150), primary_key=True, index=True)
    district_name = Column(String(100), index=True)
    state_name = Column(String(100), index=True)
    
    nitrogen = Column(Integer)
    phosphorus = Column(Integer)
    potassium = Column(Integer)
    
    temperature = Column(Float)
    humidity = Column(Float)
    ph = Column(Float)
    rainfall = Column(Float)
