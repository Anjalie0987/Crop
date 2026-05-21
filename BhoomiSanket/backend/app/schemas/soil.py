from pydantic import BaseModel
from typing import Optional, Dict, List, Any

class SoilAnalysisRequest(BaseModel):
    farmer_name: str
    field_id: str
    state: str
    district: str
    crop_type: Optional[str] = "Wheat"
    season: str
    field_area: float
    nitrogen: float
    phosphorus: float
    potassium: float
    ph: float
    coordinates: Optional[Any] = None # Expecting list or dict or null

class SoilAnalysisResponse(BaseModel):
    snsi_score: float
    soil_status: str
    nutrient_levels: Dict[str, Any]
    recommendations: List[str]
    map_classification: str
    health_status: str
