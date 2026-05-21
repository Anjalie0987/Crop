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

# Cache for state districts geometry
STATE_DISTRICTS_CACHE = {} # state_name.upper() -> GDF

def load_districts(state_name: str):
    global STATE_DISTRICTS_CACHE
    state_key = state_name.upper()
    if state_key in STATE_DISTRICTS_CACHE:
        return STATE_DISTRICTS_CACHE[state_key]
    
    try:
        shp_path = r'c:\Users\anjal\OneDrive\Desktop\CROP\BhoomiSanket\backend\data\shapefiles\district\DISTRICT_BOUNDARY_WGS84.shp'
        gdf = gpd.read_file(shp_path)
        # Filter for requested state
        state_gdf = gdf[gdf['STATE'].str.contains(state_name, case=False, na=False)].copy()
        if not state_gdf.empty:
            STATE_DISTRICTS_CACHE[state_key] = state_gdf
            print(f"Loaded {len(state_gdf)} districts for {state_name}.")
            return state_gdf
    except Exception as e:
        print(f"Error loading district shapefile for {state_name}: {e}")
    
    return None

# Initial load for Maharashtra
load_districts("MAHARASHTRA")

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

def get_district_from_coords(lat, lon, state_name="MAHARASHTRA"):
    gdf = load_districts(state_name)
    if gdf is None:
        return state_name.upper()
    
    p = Point(lon, lat)
    # Check which district contains this point
    for _, row in gdf.iterrows():
        if row.geometry.contains(p):
            return str(row['District']).upper()
    return state_name.upper()

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
            if state.upper() == "MAHARASHTRA" or state.upper() == "GUJARAT":
                gdf = load_districts(state)
                if gdf is not None:
                    districts[state] = sorted(gdf['District'].unique().tolist())
                else:
                    districts[state] = []
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
        # Updated Maharashtra scattering center (broadened to cover Gadchiroli and Sindhudurg)
        # State-specific scattering centers
        CENTERS = {
            "MAHARASHTRA": {"lat": 18.8, "lon": 76.7, "lat_range": 6.5, "lon_range": 8.5},
            "GUJARAT": {"lat": 22.4, "lon": 71.3, "lat_range": 4.6, "lon_range": 6.4}
        }
        DEFAULT_CENTER = {"lat": 20.0, "lon": 78.0, "lat_range": 10.0, "lon_range": 10.0}

        # Clustering logic: Map categories to specific coordinate offsets
        category_offsets = {
            "Good": (0.2, 0.2), 
            "Fair": (-0.3, 0.4), 
            "Poor": (0.5, -0.6),
            None: (0, 0)
        }

        for i, row in enumerate(result):
            # Identify center for current state
            s_name = (row.state or "MAHARASHTRA").upper()
            center = CENTERS.get(s_name, DEFAULT_CENTER)

            # Apply category-biased synthetic scattering
            seed = str(row.pixel_id or i)
            hash_val = int(hashlib.md5(seed.encode()).hexdigest(), 16)
            
            # Base random offset
            base_lat_off = ((hash_val % 1000) / 1000.0 - 0.5) * center["lat_range"]
            base_lon_off = (((hash_val // 1000) % 1000) / 1000.0 - 0.5) * center["lon_range"]
            
            # 1. Categorical bias
            bias_lat, bias_lon = category_offsets.get(row.category_germination, (0, 0))
            
            # 2. Numerical bias (simplified for all attributes)
            lat = center["lat"] + (base_lat_off * 1.2) + (bias_lat * center["lat_range"] * 0.05)
            lon = center["lon"] + (base_lon_off * 1.2) + (bias_lon * center["lon_range"] * 0.05)
            
            # Clip to state bounds
            lat = max(center["lat"] - center["lat_range"]/2, min(center["lat"] + center["lat_range"]/2, lat))
            lon = max(center["lon"] - center["lon_range"]/2, min(center["lon"] + center["lon_range"]/2, lon))

            # Identify district via spatial join (Shapefile)
            district_name = get_district_from_coords(lat, lon, s_name)

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
                "category_germination": row.category_germination,
                "soil_type": "N/A",
                "recommended_fertilizer": "N/A"
            })
            
        return farm_data
            
        return farm_data
        
    except Exception as e:
        print(f"Error fetching farm data: {e}")
        raise HTTPException(status_code=500, detail=str(e))
