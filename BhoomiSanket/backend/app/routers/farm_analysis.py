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
        shp_path = r'D:\CROP2\CROP2\BhoomiSanket\backend\data\shapefiles\district\DISTRICT_BOUNDARY_WGS84.shp'
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
        # Since currently we only have Maharashtra data in latlon_suitability
        states = ["MAHARASHTRA"]
        districts = {"MAHARASHTRA": []}
        
        if MAH_DISTRICTS_GDF is not None:
            districts["MAHARASHTRA"] = sorted(MAH_DISTRICTS_GDF['District'].unique().tolist())
            
        return {
            "states": states,
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
    Fetch all farm data and link to districts via optimized spatial join.
    """
    try:
        query_str = "SELECT * FROM latlon_suitability"
        result = db.execute(text(query_str)).fetchall()
        
        if not result:
            return []

        # Convert to DataFrame for fast join
        import pandas as pd
        df = pd.DataFrame([dict(row._mapping) for row in result])
        
        # Create GeoDataFrame from points
        points_gdf = gpd.GeoDataFrame(
            df, 
            geometry=gpd.points_from_xy(df.lon, df.lat),
            crs="EPSG:4326"
        )
        
        # Spatial Join with Districts
        if MAH_DISTRICTS_GDF is not None:
            # Ensure CRS matches
            dist_gdf = MAH_DISTRICTS_GDF.to_crs("EPSG:4326")
            joined = gpd.sjoin(points_gdf, dist_gdf, how='left', predicate='within')
            # Extract District name (case insensitive match for 'District' column)
            dist_col = 'District' if 'District' in joined.columns else 'DISTRICT'
            joined['detected_district'] = joined[dist_col].fillna("MAHARASHTRA").str.upper()
        else:
            joined = points_gdf
            joined['detected_district'] = "MAHARASHTRA"

        farm_data = []
        for _, row in joined.iterrows():
            # Filtering by state if requested
            if state and state.upper() != "MAHARASHTRA" and row['detected_district'] == "MAHARASHTRA":
                continue

            farm_data.append({
                "farmer_id": f"LATLON_{row['id']}",
                "state": "MAHARASHTRA",
                "district": row['detected_district'],
                "subdistrict": "N/A",
                "latitude": row['lat'],
                "longitude": row['lon'],
                "lat": row['lat'],
                "lon": row['lon'],
                "nitrogen": row['n'],
                "phosphorus": row['p'],
                "potassium": row['k'],
                "ph": row['ph'],
                "organic_carbon": row['oc'],
                "moisture": row['moisture'],
                "temperature": row['temp'],
                "shs_germination": row['germ_shs'],
                "category_germination": row['germ_category'],
                "soil_type": "N/A",
                "crop_type": "Wheat",
                "recommended_fertilizer": "N/A"
            })
            
        return farm_data
        
    except Exception as e:
        print(f"Error fetching farm data: {e}")
        raise HTTPException(status_code=500, detail=str(e))
