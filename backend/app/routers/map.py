from fastapi import APIRouter, HTTPException, Query, Response
import geopandas as gpd
import os
import json
import time
from functools import lru_cache

router = APIRouter(
    prefix="/map",
    tags=["map"]
)

# Paths to shapefiles
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SHAPEFILE_DIR = os.path.join(BASE_DIR, "data", "shapefiles")

STATE_SHP = os.path.join(SHAPEFILE_DIR, "state", "STATE_BOUNDARY_wgs84.shp")
DISTRICT_SHP = os.path.join(SHAPEFILE_DIR, "district", "DISTRICT_BOUNDARY_WGS84.shp")
SUBDISTRICT_SHP = os.path.join(SHAPEFILE_DIR, "subdistrict", "SUBDISTRICT_BOUNDARY_WGS84.shp")

@lru_cache(maxsize=3) # Cache State, District, Subdistrict (3 files)
def load_and_simplify_shapefile(path):
    """
    Loads shapefile from disk ONCE and caches it in RAM.
    Also performs initial simplification to save CPU on subsequent calls.
    """
    if not os.path.exists(path):
        print(f"Error: Shapefile not found at {path}")
        return None
    
    print(f"CACHE MISS: Loading {os.path.basename(path)} from disk...")
    try:
        gdf = gpd.read_file(path)
        
        # Adaptive Simplification Logic - Done ONCE during load
        count = len(gdf)
        tolerance = 0.001 # Default High detail
        if count < 50: 
             tolerance = 0.01 # Low detail (States)
        elif count < 200:
             tolerance = 0.005 # Medium detail (Districts)
             
        # Simplify geometries permanently in the cached copy
        gdf['geometry'] = gdf.geometry.simplify(tolerance)
        return gdf
    except Exception as e:
        print(f"Error loading shapefile: {e}")
        return None

# Helper: Find first matching column from detailed list
def find_col(gdf, candidates):
    cols = gdf.columns
    for c in candidates:
        if c in cols: return c
    # Case insensitive check
    lower_cols = {x.lower(): x for x in cols}
    for c in candidates:
        if c.lower() in lower_cols: return lower_cols[c.lower()]
    return None

def get_geojson(shp_path, filter_candidates=None, filter_val=None):
    start_time = time.time()
    
    # USE CACHED LOADER
    # If the function is called with the same arguments, it returns the cached result.
    # We can trust lru_cache for this.
    gdf_cached = load_and_simplify_shapefile(shp_path)
    
    if gdf_cached is None:
        raise HTTPException(status_code=404, detail=f"Shapefile not found: {shp_path}")
    
    # Work on a copy if filtering? 
    # Actually, Pandas slices are efficient. We don't need a deep copy unless modifying values.
    # We are just filtering rows.
    gdf = gdf_cached 
    
    try:
        # Filter if requested
        if filter_candidates and filter_val:
            col = find_col(gdf, filter_candidates)
            if col:
                # Case insensitive value match?
                # Let's try direct first
                gdf = gdf[gdf[col] == filter_val]
                
                # If empty, try case insensitive value match
                if gdf.empty and isinstance(filter_val, str):
                     print(f"Target '{filter_val}' not found directly, trying case-insensitive search...")
                     # Can't reload here efficiently, use cached
                     gdf = gdf_cached # Reset
                     gdf = gdf[gdf[col].astype(str).str.lower() == filter_val.lower()]
            else:
                print(f"Warning: Could not find filter column from {filter_candidates} in {shp_path}")
                # We return ALL if we can't filter? Or Empty? 
                # Better to return Empty to avoid crashing frontend with wrong data level
                return Response(content='{"type": "FeatureCollection", "features": []}', media_type="application/json")

        if gdf.empty:
            return Response(content='{"type": "FeatureCollection", "features": []}', media_type="application/json")
        
        # Geometry is ALREADY simplified in the cache loader!
        # Just convert to JSON
        # OPTIMIZATION: Return Response directly to avoid double serialization (Dict -> JSON String)
        json_str = gdf.to_json()
        
        duration = time.time() - start_time
        print(f"Request Loop Time: {duration:.4f}s")
        
        return Response(content=json_str, media_type="application/json")
        
    except Exception as e:
        print(f"Error processing shapefile: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Helper: Inject Data into GeoJSON
def inject_soil_data(response_obj):
    try:
        data = json.loads(response_obj.body)
        
        # Helper for deterministic random values
        import hashlib
        def get_val(seed, offset, min_v, max_v):
            if not seed: seed = "unknown"
            hash_val = int(hashlib.md5(seed.encode()).hexdigest(), 16)
            sub_hash = (hash_val + offset) % 1000
            return min_v + (sub_hash / 1000.0) * (max_v - min_v)

        # --- DB DATA FETCH (Conceptual - simplified for now) ---
        # In a real app, we would aggregate by State/District here.
        # For now, we use the deterministic mock logic for visual consistency across levels.
        
        if 'features' in data:
            for feature in data['features']:
                props = feature['properties']
                # Try to find a name for the seed / matching
                # Supports State, District, Subdistrict keys
                name_raw = (props.get('TEHSIL') or props.get('SUB_DIST') or 
                           props.get('DISTRICT') or props.get('DIST_NAME') or 
                           props.get('STATE') or props.get('ST_NM') or 
                           str(props.get('id', 'unknown')))
                           
                # USE MOCK DATA (Fallback/Demo)
                # Normalized values (0.0 - 1.0) for Choropleth coloring
                # In real production, this would be: `db.query(func.avg(col)).group_by(region)`
                
                # 1. Macro Nutrients
                props["N"] = get_val(name_raw, 1, 0.2, 0.9)
                props["P"] = get_val(name_raw, 2, 0.1, 0.8)
                props["K"] = get_val(name_raw, 3, 0.3, 0.95)
                
                # 2. pH & Organic Carbon
                props["ph"] = get_val(name_raw, 4, 0.4, 0.8) 
                props["oc"] = get_val(name_raw, 5, 0.1, 0.9) 
                
                # 3. Micro Nutrients
                props["Zn"] = get_val(name_raw, 6, 0.2, 0.8)
                props["S"]  = get_val(name_raw, 7, 0.3, 0.9)
                props["B"]  = get_val(name_raw, 8, 0.1, 0.7)
                props["Fe"] = get_val(name_raw, 9, 0.2, 0.9)
                props["Mn"] = get_val(name_raw, 10, 0.2, 0.8)
                props["Cu"] = get_val(name_raw, 11, 0.1, 0.8)
                
                # 4. Physical / Climate
                props["moisture"] = get_val(name_raw, 12, 0.2, 0.9)
                props["rainfall"] = get_val(name_raw, 14, 0.2, 0.9)
                props["humidity"] = get_val(name_raw, 15, 30, 80)
                props["temperature"] = get_val(name_raw, 16, 20, 40)

        # Return new response
        return Response(content=json.dumps(data), media_type="application/json")
        
    except Exception as e:
        print(f"Error injecting mock data: {e}")
        return response_obj

@router.get("/state")
async def get_states():
    resp = get_geojson(STATE_SHP)
    return inject_soil_data(resp)

@router.get("/district")
async def get_districts(state: str = Query(None)):
    resp = None
    if state:
        candidates = ["STATE", "ST_NM", "State_Name", "StateName", "stname"]
        resp = get_geojson(DISTRICT_SHP, filter_candidates=candidates, filter_val=state)
    else:
        resp = get_geojson(DISTRICT_SHP)
    return inject_soil_data(resp)

@router.get("/subdistrict")
async def get_subdistricts(state: str = Query(None), district: str = Query(None)):
    resp = None
    if district:
        candidates = ["DISTRICT", "DIST_NAME", "District_Name", "DistName", "dtname"]
        resp = get_geojson(SUBDISTRICT_SHP, filter_candidates=candidates, filter_val=district)
    else:
        resp = get_geojson(SUBDISTRICT_SHP)
    return inject_soil_data(resp)

@router.get("/subdistrict_by_name/{name}")
async def get_single_subdistrict(name: str):
    """
    Fetch a single sub-district polygon by its name.
    Includes a mock suitability score for visualization.
    """
    try:
        if not os.path.exists(SUBDISTRICT_SHP):
             raise HTTPException(status_code=404, detail="Shapefile not found")

        gdf = gpd.read_file(SUBDISTRICT_SHP)
        
        # Filter by subdistrict name
        candidates = ["TEHSIL", "TEHSIL_NAM", "SUB_DIST", "SubDistrict", "Tehsil", "sdtname"]
        col = find_col(gdf, candidates)
        
        if not col:
            raise HTTPException(status_code=500, detail="Could not identify sub-district column")
            
        # Case insensitive match
        gdf = gdf[gdf[col].astype(str).str.lower() == name.lower()]
        
        if gdf.empty:
            raise HTTPException(status_code=404, detail="Sub-district not found")
            
        # Optimization: Simplify geometry
        gdf['geometry'] = gdf.geometry.simplify(0.001)

        # Mock Suitability Score (Deterministic based on name hash for consistency during demo)
        # Using hash to give a number between 0.3 and 0.95
        import hashlib
        hash_val = int(hashlib.md5(name.encode()).hexdigest(), 16)
        
        # Helper to get deterministic float between min and max
        def get_mock_val(seed_offset, min_val, max_val):
             sub_hash = (hash_val + seed_offset) % 1000
             return min_val + (sub_hash / 1000.0) * (max_val - min_val)

        # Generate specific attributes
        # Normalized scores (0-1) for visualization simplicity in frontend
        # In a real app, these would be actual values (e.g. N=140 mg/kg) but mapped to 0-1 for color
        
        # For this demo, let's return normalized scores (0=Poor, 1=Good) for simplicity
        # Or return raw values and normalize in frontend? 
        # Requirement says: "Color based on computed value". 
        # Let's return standardized 0-1 scores for each attribute for easier frontend averaging.
        
        props = {
            "suitability_score": get_mock_val(0, 0.3, 0.95),
            "nitrogen": get_mock_val(1, 0.2, 0.9),
            "phosphorus": get_mock_val(2, 0.1, 0.8),
            "potassium": get_mock_val(3, 0.3, 0.95),
            "ph": get_mock_val(4, 0.4, 0.8), # Normalized: 0=Typical Acidic/Alkaline extremes, 1=Neutral
            "moisture": get_mock_val(5, 0.2, 0.9)
        }
        
        # Add properties to the dataframe
        for key, val in props.items():
            gdf[key] = val
        
        return json.loads(gdf.to_json())
        
    except Exception as e:
        print(f"Error fetching sub-district: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/districts")
def get_available_districts():
    """
    Get list of districts available in the database.
    """
    from app.database import SessionLocal
    from app.models import SoilCropData
    from sqlalchemy import distinct
    
    db = SessionLocal()
    try:
        # Get distinct district names where subdistrict_name is not null (meaning valid data)
        # Or just distinct district_name
        results = db.query(distinct(SoilCropData.district_name)).all()
        # results is list of tuples [('AMRITSAR',), ('LUDHIANA',)]
        districts = [str(r[0]).upper() for r in results if r[0]]
        
        # Ensure default ones are included if DB is empty or partial
        defaults = ["AMRITSAR", "GURDASPUR", "JALANDHAR", "LUDHIANA"]
        combined = sorted(list(set(defaults + districts)))
        
        return {"districts": combined}
    except Exception as e:
        print(f"DB Error: {e}")
        return {"districts": ["AMRITSAR", "GURDASPUR", "JALANDHAR", "LUDHIANA"]} 
    finally:
        db.close()
