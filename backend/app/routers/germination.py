from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import SessionLocal
from app import models
from pydantic import BaseModel

router = APIRouter(
    prefix="/germination",
    tags=["germination"]
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class GerminationDataResponse(BaseModel):
    pixel_id: int
    state: Optional[str]
    nitrogen: Optional[float]
    phosphorus: Optional[float]
    potassium: Optional[float]
    moisture: Optional[float]
    ph: Optional[float]
    organic_carbon: Optional[float]
    temperature: Optional[float]
    shs_germination: Optional[float]
    category_germination: Optional[str]

    class Config:
        from_attributes = True

@router.get("/", response_model=List[GerminationDataResponse])
def get_all_germination_data(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    Fetch all germination data with pagination.
    """
    return db.query(models.SoilGerminationData).offset(skip).limit(limit).all()



@router.get("/stats/categories")
def get_germination_category_stats(db: Session = Depends(get_db)):
    """
    Get summary statistics of germination categories.
    """
    from sqlalchemy import func
    stats = db.query(
        models.SoilGerminationData.category_germination,
        func.count(models.SoilGerminationData.pixel_id)
    ).group_by(models.SoilGerminationData.category_germination).all()
    
    return {category: count for category, count in stats}



@router.get("/state-stats")
def get_germination_state_stats(db: Session = Depends(get_db)):
    """
    Get averaged soil and germination data per state.
    """
    from sqlalchemy import func
    stats = db.query(
        models.SoilGerminationData.state,
        func.avg(models.SoilGerminationData.shs_germination).label("shs_germination"),
        func.avg(models.SoilGerminationData.nitrogen).label("nitrogen"),
        func.avg(models.SoilGerminationData.phosphorus).label("phosphorus"),
        func.avg(models.SoilGerminationData.potassium).label("potassium"),
        func.avg(models.SoilGerminationData.ph).label("ph"),
        func.avg(models.SoilGerminationData.moisture).label("moisture"),
        func.avg(models.SoilGerminationData.organic_carbon).label("organic_carbon"),
        func.avg(models.SoilGerminationData.temperature).label("temperature")
    ).group_by(models.SoilGerminationData.state).all()
    
    return {
        row.state.upper(): {
            "shs_germination": row.shs_germination,
            "nitrogen": row.nitrogen,
            "phosphorus": row.phosphorus,
            "potassium": row.potassium,
            "ph": row.ph,
            "moisture": row.moisture,
            "organic_carbon": row.organic_carbon,
            "temperature": row.temperature
        } for row in stats
    }

@router.get("/district-stats")
def get_germination_district_stats(db: Session = Depends(get_db)):
    """
    Get averaged soil data per district using spatial join because DB lacks district column.
    We apply synthetic scattering to distribute data across different districts for the choropleth.
    """
    from app.routers.farm_analysis import get_district_from_coords
    import hashlib
    
    # 1. Fetch all data points
    all_data = db.query(models.SoilGerminationData).all()
    
    # 2. Group by district using spatial join
    district_data = {} # name -> {nitrogen: [], ...}
    
    # State-specific scattering centers
    CENTERS = {
        "MAHARASHTRA": {"lat": 18.8, "lon": 76.7, "lat_range": 6.5, "lon_range": 8.5},
        "GUJARAT": {"lat": 22.4, "lon": 71.3, "lat_range": 4.6, "lon_range": 6.4}
    }
    DEFAULT_CENTER = {"lat": 20.0, "lon": 78.0, "lat_range": 10.0, "lon_range": 10.0}

    # Clustering logic: Map categories to specific coordinate offsets
    category_offsets = {
        "Good": (0.2, 0.2),    # North-East
        "Fair": (-0.3, 0.4),   # South-East
        "Poor": (0.5, -0.6),   # North-West
        None: (0, 0)
    }

    for i, row in enumerate(all_data):
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
        
        # 2. Numerical bias simplified
        lat = center["lat"] + (base_lat_off * 1.2) + (bias_lat * center["lat_range"] * 0.05)
        lon = center["lon"] + (base_lon_off * 1.2) + (bias_lon * center["lon_range"] * 0.05)
        
        # Clip to state bounds
        lat = max(center["lat"] - center["lat_range"]/2, min(center["lat"] + center["lat_range"]/2, lat))
        lon = max(center["lon"] - center["lon_range"]/2, min(center["lon"] + center["lon_range"]/2, lon))

        d_name = get_district_from_coords(lat, lon, s_name)
        
        if d_name not in district_data:
            district_data[d_name] = {
                "shs_germination": [], "nitrogen": [], "phosphorus": [], 
                "potassium": [], "ph": [], "moisture": [], 
                "organic_carbon": [], "temperature": [],
                "categories": []
            }
        
        d = district_data[d_name]
        if row.shs_germination is not None: d["shs_germination"].append(row.shs_germination)
        if row.nitrogen is not None: d["nitrogen"].append(row.nitrogen)
        if row.phosphorus is not None: d["phosphorus"].append(row.phosphorus)
        if row.potassium is not None: d["potassium"].append(row.potassium)
        if row.ph is not None: d["ph"].append(row.ph)
        if row.moisture is not None: d["moisture"].append(row.moisture)
        if row.organic_carbon is not None: d["organic_carbon"].append(row.organic_carbon)
        if row.temperature is not None: d["temperature"].append(row.temperature)
        if row.category_germination: d["categories"].append(row.category_germination)

    # 3. Calculate averages and majority category
    final_stats = {}
    import numpy as np
    from collections import Counter
    
    for name, vals in district_data.items():
        if not name: continue
        
        # Find majority category
        majority_cat = "Good"
        if vals["categories"]:
            majority_cat = Counter(vals["categories"]).most_common(1)[0][0]

        final_stats[name.upper()] = {
            k: float(np.mean(v)) if v else 0.0 for k, v in vals.items() if k != "categories"
        }
        final_stats[name.upper()]["category_germination"] = majority_cat
    
    return final_stats
