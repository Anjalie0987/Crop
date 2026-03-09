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
        mah_center = {"lat": 19.0, "lon": 76.0, "lat_range": 4.0, "lon_range": 6.0}

        # Clustering logic: Map categories to specific coordinate offsets (Keep consistent with germination.py)
        category_offsets = {
            "Good": (0.2, 0.2), 
            "Fair": (-0.3, 0.4), 
            "Poor": (0.5, -0.6),
            None: (0, 0)
        }

        for i, row in enumerate(result):
            # Apply category-biased synthetic scattering
            seed = str(row.pixel_id or i)
            hash_val = int(hashlib.md5(seed.encode()).hexdigest(), 16)
            
            # Base random offset
            base_lat_off = ((hash_val % 1000) / 1000.0 - 0.5) * mah_center["lat_range"]
            base_lon_off = (((hash_val // 1000) % 1000) / 1000.0 - 0.5) * mah_center["lon_range"]
            
            # 1. Categorical bias
            bias_lat, bias_lon = category_offsets.get(row.category_germination, (0, 0))
            
            # 2. Numerical bias for Organic Carbon
            oc_val = row.organic_carbon or 0.5
            oc_bias_lat = -0.1 if oc_val > 0.6 else 0.1 if oc_val < 0.4 else 0
            oc_bias_lon = -0.1 if oc_val > 0.6 else 0.1 if oc_val < 0.4 else 0

            # 3. Numerical bias for Phosphorus
            p_val = row.phosphorus or 20
            p_bias_lat = -0.15 if p_val > 22 else 0.15 if p_val < 15 else 0
            p_bias_lon = 0.15 if p_val > 22 else -0.15 if p_val < 15 else 0

            # 4. Numerical bias for Moisture
            m_val = row.moisture or 20
            m_bias_lat = 0.15 if m_val > 25 else -0.15 if m_val < 15 else 0
            m_bias_lon = -0.15 if m_val > 25 else 0.15 if m_val < 15 else 0

            # 5. Numerical bias for Temperature
            t_val = row.temperature or 21
            t_bias_lat = -0.2 if t_val > 22 else 0.2 if t_val < 19 else 0
            t_bias_lon = 0

            lat = mah_center["lat"] + (base_lat_off * 0.3) + (bias_lat * mah_center["lat_range"]) + (oc_bias_lat * mah_center["lat_range"]) + (p_bias_lat * mah_center["lat_range"]) + (m_bias_lat * mah_center["lat_range"]) + (t_bias_lat * mah_center["lat_range"])
            lon = mah_center["lon"] + (base_lon_off * 0.3) + (bias_lon * mah_center["lon_range"]) + (oc_bias_lon * mah_center["lon_range"]) + (p_bias_lon * mah_center["lon_range"]) + (m_bias_lon * mah_center["lon_range"]) + (t_bias_lon * mah_center["lon_range"])
            
            # Clip to ranges
            lat = max(16.0, min(22.0, lat))
            lon = max(73.0, min(80.0, lon))

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
                "category_germination": row.category_germination, # Add category
                "soil_type": "N/A",
                "recommended_fertilizer": "N/A"
            })
            
        return farm_data
        
    except Exception as e:
        print(f"Error fetching farm data: {e}")
        raise HTTPException(status_code=500, detail=str(e))
