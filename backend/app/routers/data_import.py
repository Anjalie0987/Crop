from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import SessionLocal, engine, Base
from app import models
import pandas as pd
import io
import math

# Create tables if not exist (Simple migration)
# DROP table to force schema update since we are not using alembic in this dev env
try:
    with engine.connect() as connection:
        connection.execute(text("DROP TABLE IF EXISTS soil_samples CASCADE"))
        connection.commit()
except Exception as e:
    print(f"Error dropping table: {e}")

Base.metadata.create_all(bind=engine)

router = APIRouter(
    prefix="/import",
    tags=["import"]
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Sub-districts list for auto-assignment (Mock for now, ideally fetch from shapefile)
SUBDISTRICTS = [
    "Ajnala", "Amritsar- I", "Amritsar- II", "Baba Bakala", 
    "Batala", "Dera Baba Nanak", "Dhar Kalan", "Gurdaspur", 
    "Pathankot", "Jalandhar - I", "Jalandhar - II", "Nakodar", 
    "Phillaur", "Shahkot", "Jagraon", "Khanna", "Ludhiana (East)", 
    "Ludhiana (West)", "Payal", "Raikot", "Samrala"
]

@router.post("/soil-data")
async def import_soil_data(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Import CSV Data into Database.
    If CSV has no location, it assigns rows to subdistricts round-robin.
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a CSV.")

    try:
        content = await file.read()
        df = pd.read_csv(io.StringIO(content.decode('utf-8')))
        
        # Normalize headers
        df.columns = [c.strip().lower() for c in df.columns]
        
        # Map common aliases including Location
        # Map common aliases including Location
        rename_map = {
            'n': 'nitrogen', 'p': 'phosphorus', 'k': 'potassium',
            'ph': 'soil_ph', 'oc': 'soc', 'zinc': 'zn', 'sulphur': 's',
            'iron': 'fe', 'manganese': 'mn', 'copper': 'cu', 'boron': 'b',
            'd': 'district', 'dist': 'district', 'district_name': 'district',
            'sdt': 'subdistrict', 'tehsil': 'subdistrict', 'block': 'subdistrict',
            'sub_district': 'subdistrict',
            # New columns from Crop_recommendation.csv
            'temperature': 'temperature',
            'humidity': 'humidity',
            'soil_ph': 'ph', # CSV has soil_ph, model has ph
            'soc': 'oc', # CSV has soc, model has oc
            'soil_moisture': 'moisture',
            'water_holding': 'water_holding_capacity',
            'cec': 'cec',
            'sand': 'sand',
            'silt': 'silt',
            'clay': 'clay'
        }
        df.rename(columns=rename_map, inplace=True)

        required_cols = ['nitrogen', 'phosphorus', 'potassium']
        missing = [col for col in required_cols if col not in df.columns]
        if missing:
             # Try fallback to less strict requirements if possible, else fail
             raise HTTPException(status_code=400, detail=f"Missing columns: {missing}. Found: {list(df.columns)}")

        # Clear existing data to avoid duplicates confusing the map
        db.query(models.SoilSample).delete()
        
        count = 0
        total_subdistricts = len(SUBDISTRICTS)
        
        imported_count = 0
        for index, row in df.iterrows():
            # Handle NaN values safety
            row = row.where(pd.notnull(row), None)
            
            # Skip empty rows (if N, P, K are all missing)
            if row.get('nitrogen') is None and row.get('phosphorus') is None:
                continue

            # 1. District
            # Priority: CSV 'district' -> Default "AMRITSAR"
            raw_dist = row.get('district')
            district = str(raw_dist).strip().upper() if raw_dist else "AMRITSAR"

            # 2. Sub-District
            # Priority: CSV 'subdistrict' -> Local Round Robin
            raw_sub = row.get('subdistrict')
            if raw_sub:
                subdistrict = str(raw_sub).strip()
            else:
                # Fallback to round-robin assignment for demo
                subdistrict = SUBDISTRICTS[count % total_subdistricts]
                count += 1
            
            # Helper to safely parse float
            def safe_float(val):
                try:
                    return float(val) if val is not None else None
                except:
                    return None

            sample = models.SoilSample(
                district_name=district,
                subdistrict_name=subdistrict,
                nitrogen=safe_float(row.get('nitrogen')),
                phosphorus=safe_float(row.get('phosphorus')),
                potassium=safe_float(row.get('potassium')),
                ph=safe_float(row.get('ph')),
                oc=safe_float(row.get('oc')), 
                moisture=safe_float(row.get('moisture')),
                rainfall=safe_float(row.get('rainfall')),
                temperature=safe_float(row.get('temperature')),
                humidity=safe_float(row.get('humidity')),
                cec=safe_float(row.get('cec')),
                sand=safe_float(row.get('sand')),
                silt=safe_float(row.get('silt')),
                clay=safe_float(row.get('clay')),
                water_holding_capacity=safe_float(row.get('water_holding_capacity')),
                
                # Map other fields if present in CSV, else None
                zinc=safe_float(row.get('zn') or row.get('zinc')),
                sulphur=safe_float(row.get('s') or row.get('sulphur')),
                boron=safe_float(row.get('b') or row.get('boron')),
                iron=safe_float(row.get('fe') or row.get('iron')),
                manganese=safe_float(row.get('mn') or row.get('manganese')),
                copper=safe_float(row.get('cu') or row.get('copper'))
            )
            db.add(sample)
            imported_count += 1
            
        db.commit()
        
        unique_districts = sorted(df['district'].dropna().unique().tolist()) if 'district' in df.columns else ["AMRITSAR"]
        unique_districts = [str(d).strip().upper() for d in unique_districts]

        return {
            "message": f"Successfully imported {imported_count} records into {len(unique_districts)} districts.", 
            "districts": list(set(unique_districts))
        }

    except Exception as e:
        print(f"Import Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
