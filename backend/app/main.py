import os
import psycopg2
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import json

# Load environment variables
load_dotenv()

# Check for existing router or keep if needed, but primarily focusing on the requested deliverables
try:
    from app.routers import soil
except ImportError:
    soil = None

app = FastAPI(title="BhoomiSanket API", version="0.1.0")

# CORS Configuration
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "*" 
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include existing router if available
# Include existing router if available
if soil:
    app.include_router(soil.router)

from app.routers import map
app.include_router(map.router)

from app.routers import analysis
app.include_router(analysis.router)

from app.routers import data_import
app.include_router(data_import.router)

from app.routers import farm_analysis
app.include_router(farm_analysis.router)

def get_db_connection():
    try:
        conn = psycopg2.connect(os.getenv("DATABASE_URL"))
        return conn
    except Exception as e:
        print(f"Database connection error: {e}")
        raise HTTPException(status_code=500, detail="Database connection failed")

@app.get("/")
def read_root():
    return {"message": "Welcome to BhoomiSanket API"}

@app.get("/choropleth")
def get_choropleth():
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT current_database();")
        print("FASTAPI DATABASE:", cur.fetchone())
    
        # Efficient SQL query using PostGIS ST_AsGeoJSON and JSON functions
        # This constructs the entire FeatureCollection in the database
        query = """
            SELECT json_build_object(
                'type', 'FeatureCollection',
                'features', COALESCE(json_agg(
                    json_build_object(
                        'type', 'Feature',
                        'geometry', ST_AsGeoJSON(geom)::json,
                        'properties', json_build_object(
                            'grid_id', grid_id,
                            'nitrogen', nitrogen,
                            'phosphorus', phosphorus,
                            'potassium', potassium,
                            'soil_moisture', soil_moisture
                        )
                    )
                ), '[]'::json)
            )
            FROM public.soil_choropleth;

        """
        
        cur.execute(query)
        result = cur.fetchone()[0]
        
        return result

    except Exception as e:
        print(f"Error fetching choropleth data: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()
