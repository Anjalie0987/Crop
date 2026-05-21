from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import uuid

router = APIRouter(
    prefix="/analyze",
    tags=["analysis"]
)

class AnalysisRequest(BaseModel):
    farmer_name: str
    field_id: str
    state: str
    district: str
    sub_district: str
    crop_type: str
    season: str
    field_area: float
    nitrogen: float
    phosphorus: float
    potassium: float
    ph: float
    coordinates: Optional[List[float]] = None

class AnalysisResponse(BaseModel):
    analysis_id: str
    message: str
    suitability_score: float
    sub_district: str

@router.post("/", response_model=AnalysisResponse)
async def analyze_soil(request: AnalysisRequest):
    try:
        # Mock Logic: Generate an ID and a dummy score
        # In a real app, this would save to DB and trigger ML model
        
        analysis_id = str(uuid.uuid4())
        
        # Simple mock score logic based on NPK
        # Just to give variation
        score = 0.5
        if request.nitrogen > 100 and request.phosphorus > 20:
             score = 0.85
        elif request.ph < 5 or request.ph > 8:
             score = 0.4
             
        return AnalysisResponse(
            analysis_id=analysis_id,
            message="Analysis started successfully",
            suitability_score=score,

            sub_district=request.sub_district
        )
    except Exception as e:
        print(f"Analysis Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
