from fastapi import APIRouter
from app.schemas.soil import SoilAnalysisRequest, SoilAnalysisResponse
import random

router = APIRouter(
    prefix="/api",
    tags=["soil"]
)

@router.post("/analyze-soil", response_model=SoilAnalysisResponse)
async def analyze_soil(request: SoilAnalysisRequest):
    # DUMMY ML LOGIC
    # In a real app, this would load a model and predict.
    
    # Simulate processing logic based on inputs to make it feel slightly dynamic
    # e.g., if N is low, recommend Urea.
    
    recommendations = []
    
    # Nitrogen logic (Mock)
    n_status = "Optimal"
    if request.nitrogen < 120:
        recommendations.append("Apply 50 kg Urea/acre to boost Nitrogen.")
        n_status = "Low"
    elif request.nitrogen > 280:
        recommendations.append("Reduce Nitrogen fertilizers to prevent leaching.")
        n_status = "High"
        
    # Phosphorus logic (Mock)
    p_status = "Optimal"
    if request.phosphorus < 15:
         recommendations.append("Add DAP (Di-ammonium Phosphate) for root growth.")
         p_status = "Low"
         
    # Potassium logic (Mock)
    k_status = "Optimal"
    if request.potassium < 100:
        recommendations.append("Apply MOP (Muriate of Potash).")
        k_status = "Low"

    # pH logic (Mock)
    ph_status = "Neutral"
    if request.ph < 6:
        recommendations.append("Soil is acidic. Add Lime.")
        ph_status = "Acidic"
    elif request.ph > 7.5:
        recommendations.append("Soil is alkaline. Add Gypsum.")
        ph_status = "Alkaline"
        
    # Calculate dummy SNSI score based on rudimentary "health"
    base_score = 85
    if n_status != "Optimal": base_score -= 10
    if p_status != "Optimal": base_score -= 5
    if k_status != "Optimal": base_score -= 5
    if ph_status != "Neutral": base_score -= 5
    
    # Add some randomness
    snsi_score = max(40, min(100, base_score + random.randint(-5, 5)))
    
    # Determine Status
    if snsi_score >= 80:
        soil_status = "Excellent"
        map_class = "High"
    elif snsi_score >= 60:
        soil_status = "Good"
        map_class = "Moderate"
    else:
        soil_status = "Needs Attention"
        map_class = "Low"
        
    if not recommendations:
        recommendations.append("Soil is in good condition. Follow standard NPK schedule.")

    return SoilAnalysisResponse(
        snsi_score=snsi_score,
        soil_status=soil_status,
        nutrient_levels={
            "Nitrogen": f"{request.nitrogen} ({n_status})",
            "Phosphorus": f"{request.phosphorus} ({p_status})",
            "Potassium": f"{request.potassium} ({k_status})",
            "pH": f"{request.ph} ({ph_status})",
            "Zinc": "Adequate (Assumed)" 
        },
        recommendations=recommendations,
        map_classification=map_class,
        health_status="Safe"
    )
