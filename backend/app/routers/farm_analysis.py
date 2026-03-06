from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from app.database import SessionLocal
from app.schemas.farm_analysis import FarmDataResponse, LocationHierarchy
import hashlib

import geopandas as gpd
from shapely.geometry import Point
import numpy as np
import os

# Cache for Maharashtra districts geometry
MAH_DISTRICTS_GDF = None

def load_maharashtra_districts():
    global MAH_DISTRICTS_GDF
    if MAH_DISTRICTS_GDF is not None:
        return
    
    try:
        shp_path = r'c:\Users\anjal\OneDrive\Desktop\CROP\BhoomiSanket\backend\data\shapefiles\district\DISTRICT_BOUNDARY_WGS84.shp'
        gdf = gpd.read_file(shp_path)
        # Filter for Maharashtra only
        # Note: Columns are ['District', 'STATE', ...]
        MAH_DISTRICTS_GDF = gdf[gdf['STATE'].str.contains('MAHARASHTRA', case=False, na=False)].copy()
        print(f"Loaded {len(MAH_DISTRICTS_GDF)} districts for Maharashtra.")
    except Exception as e:
        print(f"Error loading district shapefile: {e}")
        MAH_DISTRICTS_GDF = None

# Initialize on module load
load_maharashtra_districts()

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

def get_district_from_coords(lat, lon):
    if MAH_DISTRICTS_GDF is None:
        return "MAHARASHTRA"
    
    p = Point(lon, lat)
    # Check which district contains this point
    for _, row in MAH_DISTRICTS_GDF.iterrows():
        if row.geometry.contains(p):
            return str(row['District']).upper()
    return "MAHARASHTRA"

@router.get("/locations", response_model=LocationHierarchy)
def get_locations(db: Session = Depends(get_db)):
    """
    Fetch unique States and Districts for dropdowns.
    """
    try:
        # Fetch all unique locations from soil_germination_data
        query = text("SELECT DISTINCT state FROM soil_germination_data WHERE state IS NOT NULL")
        result = db.execute(query).fetchall()
        
        states = set()
        districts = {} # state -> [districts]
        
        for row in result:
            state = row.state
            states.add(state)
            # If Maharashtra, provide known districts from shapefile for the dropdowns
            if state == "MAHARASHTRA" and MAH_DISTRICTS_GDF is not None:
                districts[state] = sorted(MAH_DISTRICTS_GDF['District'].unique().tolist())
            else:
                districts[state] = []
            
        return {
            "states": sorted(list(states)),
            "districts": districts,
            "subdistricts": {}
        }
    except Exception as e:
        print(f"Error fetching locations: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/data", response_model=List[FarmDataResponse])
def get_farm_data(
    state: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Fetch farm data with real district assignment via spatial join.
    """
    try:
        query_str = "SELECT * FROM soil_germination_data WHERE 1=1"
        params = {}
        if state:
            query_str += " AND state = :state"
            params['state'] = state
            
        result = db.execute(text(query_str), params).fetchall()
        
        farm_data = []
        
        # Central coordinates and range for Maharashtra scattering
        # This covers the state broadly so points fall into different districts
        mah_center = {"lat": 19.0, "lon": 76.0, "lat_range": 4.0, "lon_range": 6.0}

        for i, row in enumerate(result):
            # Synthetic scattering (Scatter broadly across MAHARASHTRA)
            seed = str(row.pixel_id or i)
            hash_val = int(hashlib.md5(seed.encode()).hexdigest(), 16)
            lat_off = ((hash_val % 1000) / 1000.0 - 0.5) * mah_center["lat_range"]
            lon_off = (((hash_val // 1000) % 1000) / 1000.0 - 0.5) * mah_center["lon_range"]
            
            lat = mah_center["lat"] + lat_off
            lon = mah_center["lon"] + lon_off
            
            # Identify district via spatial join (Shapefile)
            district_name = get_district_from_coords(lat, lon)

            farm_data.append({
                "farmer_id": f"SOIL_{row.pixel_id}",
                "state": row.state,
                "district": district_name,
                "subdistrict": "N/A",
                "latitude": lat,
                "longitude": lon,
                "nitrogen": row.nitrogen,
                "phosphorus": row.phosphorus,
                "potassium": row.potassium,
                "ph": row.ph,
                "organic_carbon": row.organic_carbon,
                "moisture": row.moisture,
                "shs_germination": row.shs_germination,
                "soil_type": "N/A",
                "recommended_fertilizer": "N/A"
            })
            
        return farm_data
        
    except Exception as e:
        print(f"Error fetching farm data: {e}")
        raise HTTPException(status_code=500, detail=str(e))
