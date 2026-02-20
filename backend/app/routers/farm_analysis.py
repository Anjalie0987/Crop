from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from app.database import SessionLocal
from app.schemas.farm_analysis import FarmDataResponse, LocationHierarchy

router = APIRouter(
    prefix="/farm-analysis",
    tags=["farm-analysis"]
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/locations", response_model=LocationHierarchy)
def get_locations(db: Session = Depends(get_db)):
    """
    Fetch unique States, Districts, and Subdistricts for dropdowns.
    """
    try:
        # Fetch all unique locations
        query = text("SELECT DISTINCT state_name, district_name, subdistrict_name FROM soil_farm_data WHERE state_name IS NOT NULL")
        result = db.execute(query).fetchall()
        
        states = set()
        districts = {} # state -> [districts]
        subdistricts = {} # district -> [subdistricts]
        
        for row in result:
            state = row.state_name
            district = row.district_name
            subdistrict = row.subdistrict_name
            
            states.add(state)
            
            if state not in districts:
                districts[state] = set()
            districts[state].add(district)
            
            if district not in subdistricts:
                subdistricts[district] = set()
            subdistricts[district].add(subdistrict)
            
        # Convert sets to sorted lists
        return {
            "states": sorted(list(states)),
            "districts": {k: sorted(list(v)) for k, v in districts.items()},
            "subdistricts": {k: sorted(list(v)) for k, v in subdistricts.items()}
        }
    except Exception as e:
        print(f"Error fetching locations: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/data", response_model=List[FarmDataResponse])
def get_farm_data(
    state: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    subdistrict: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Fetch farm data filtered by location.
    """
    try:
        # Build query dynamically
        query_str = "SELECT * FROM soil_farm_data WHERE 1=1"
        params = {}
        
        if state:
            query_str += " AND state_name = :state"
            params['state'] = state
        if district:
            query_str += " AND district_name = :district"
            params['district'] = district
        if subdistrict:
            query_str += " AND subdistrict_name = :subdistrict"
            params['subdistrict'] = subdistrict
            
        # Execute
        result = db.execute(text(query_str), params).fetchall()
        
        # Map to response model
        farm_data = []
        for row in result:
            farm_data.append({
                "farmer_id": row.farmer_id,
                "state": row.state_name,
                "district": row.district_name,
                "subdistrict": row.subdistrict_name,
                "latitude": row.latitude,
                "longitude": row.longitude,
                "nitrogen": row.nitrogen,
                "phosphorus": row.phosphorus,
                "potassium": row.potassium,
                "ph": row.ph,
                "organic_carbon": row.organic_carbon,
                "moisture": row.moisture,
                "soil_type": row.soil_type,
                "recommended_fertilizer": row.recommended_fertilizer
            })
            
        return farm_data
        
    except Exception as e:
        print(f"Error fetching farm data: {e}")
        raise HTTPException(status_code=500, detail=str(e))
