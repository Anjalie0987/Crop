from pydantic import BaseModel
from typing import Optional, List

class FarmDataResponse(BaseModel):
    farmer_id: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    subdistrict: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    nitrogen: Optional[float] = None
    phosphorus: Optional[float] = None
    potassium: Optional[float] = None
    ph: Optional[float] = None
    organic_carbon: Optional[float] = None
    moisture: Optional[float] = None
    soil_type: Optional[str] = None
    recommended_fertilizer: Optional[str] = None

class LocationHierarchy(BaseModel):
    states: List[str]
    districts: dict  # state -> [districts]
    subdistricts: dict # district -> [subdistricts]

class AnalysisResponse(BaseModel):
    data: List[FarmDataResponse]
    message: str
