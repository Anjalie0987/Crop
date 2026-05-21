from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
import pandas as pd
import numpy as np
import logging
import os
import uuid
from app.database import get_db
from app.models import WheatGerminationSHS, WheatBootingSHS, LatLonSuitability

router = APIRouter()

# ==========================================================
# LOGGING CONFIGURATION
# ==========================================================

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("WheatSHSEngine")

# NEW: lat-long germination pipeline defaults (only used by the new local-file processor)
DEFAULT_BOOTING_NDVI = 0.7

# NEW: file-based processing folders (no UI upload needed)
APP_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(APP_DIR, "Data")
OUTPUTS_DIR = os.path.join(APP_DIR, "outputs")
os.makedirs(OUTPUTS_DIR, exist_ok=True)


def _safe_join_csv(base_dir: str, filename: str) -> str:
    """
    NEW: Restrict reads to CSV files inside a known base directory.
    """
    if not filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="filename must end with .csv")

    full = os.path.abspath(os.path.join(base_dir, filename))
    base = os.path.abspath(base_dir)
    if not full.startswith(base + os.sep):
        raise HTTPException(status_code=400, detail="Invalid filename/path")
    return full


def _write_standard_output_csv(processed_df: pd.DataFrame, original_columns: list, stage: str, output_path: str):
    """
    NEW: Shared output CSV writer (same rules as existing upload pipeline).
    Keeps input columns + SHS + avg_shs + category.
    """
    if "SHS" in processed_df.columns:
        processed_df["avg_shs"] = processed_df["SHS"]
    else:
        processed_df["avg_shs"] = None

    processed_df["category"] = processed_df.get("Category")

    final_columns = list(original_columns)
    if "SHS" in processed_df.columns and "SHS" not in final_columns:
        final_columns.append("SHS")
    for extra_col in ["avg_shs", "category"]:
        if extra_col not in final_columns:
            final_columns.append(extra_col)

    processed_df.to_csv(output_path, index=False, columns=final_columns)
    logger.info(f"Written SHS output CSV for stage '{stage}' to {output_path}")

# ==========================================================
# AHP MATRICES
# ==========================================================

GERMINATION_MATRIX = np.array([
[1,1/3,3,1/3,3,3,5],
[3,1,5,1,5,5,7],
[1/3,1/5,1,1/5,3,3,5],
[3,1,5,1,5,5,7],
[1/3,1/5,1/3,1/5,1,3,3],
[1/3,1/5,1/3,1/5,1/3,1,1],
[1/5,1/7,1/5,1/7,1/3,1,1]
])

BOOTING_MATRIX = np.array([
[1,3,3,1,5,5,5,1],
[1/3,1,1,1/3,3,3,3,1/3],
[1/3,1,1,1/3,3,3,3,1/3],
[1,3,3,1,5,5,5,1],
[1/5,1/3,1/3,1/5,1,3,3,1/5],
[1/5,1/3,1/3,1/5,1/3,1,1,1/5],
[1/5,1/3,1/3,1/5,1/3,1,1,1/5],
[1,3,3,1,5,5,5,1]
])

# ==========================================================
# MEMBERSHIP FUNCTIONS
# ==========================================================

def nitrogen_membership(n):
    if n < 150: return 0
    elif n < 280: return (n-150)/130
    return 1

def phosphorus_membership(p):
    if p < 10: return 0
    elif p < 20: return (p-10)/10
    return 1

def potassium_membership(k):
    if k < 110: return 0
    elif k < 150: return (k-110)/40
    return 1

def moisture_membership(m):
    if m < 10: return 0
    elif m < 20: return (m-10)/10
    return 1

def ph_membership(ph):
    if ph < 5.5: return 0
    elif ph < 6.0: return (ph-5.5)/0.5
    elif ph <= 7.5: return 1
    elif ph <= 8.0: return (8-ph)/0.5
    return 0

def oc_membership(oc):
    if oc < 0.3: return 0
    elif oc < 0.6: return (oc-0.3)/0.3
    return 1

def temp_membership(t):
    if t < 10: return 0
    elif t < 18: return (t-10)/8
    elif t <= 25: return 1
    return 0.5

def ndvi_membership(ndvi):
    if ndvi < 0.5: return 0
    elif ndvi < 0.7: return (ndvi-0.5)/0.2
    elif ndvi <= 0.9: return 1
    return 0.5

# ==========================================================
# CLASSIFICATION
# ==========================================================

def classify_score(score):
    if score >= 90:
        return "Excellent"
    elif score >= 80:
        return "Very Good"
    elif score >= 70:
        return "Good"
    elif score >= 60:
        return "Moderate"
    elif score >= 30:
        return "Poor"
    return "Very Poor"

# ==========================================================
# INPUT VALIDATION
# ==========================================================

def validate_input(sample, stage):
    required = ["N","P","K","Moisture","pH","OC","Temp"]
    if stage == "booting":
        required.append("NDVI")
    for field in required:
        if field not in sample:
            raise ValueError(f"Missing field: {field}")
        if pd.isna(sample[field]):
            raise ValueError(f"Missing value for {field}")

# ==========================================================
# MAIN ENGINE
# ==========================================================

class WheatSHSEngine:
    def __init__(self, stage):
        logger.info(f"Initializing SHS Engine for stage: {stage}")
        if stage not in ["germination","booting"]:
            raise ValueError("Stage must be 'germination' or 'booting'")
        self.stage = stage
        if stage == "germination":
            self.criteria = ["N","P","K","Moisture","pH","OC","Temp"]
            self.matrix = GERMINATION_MATRIX
        else:
            self.criteria = ["N","P","K","Moisture","pH","OC","Temp","NDVI"]
            self.matrix = BOOTING_MATRIX
        self.weights = self.compute_weights()

    def compute_weights(self):
        col_sum = self.matrix.sum(axis=0)
        norm_matrix = self.matrix / col_sum
        weights = norm_matrix.mean(axis=1)
        logger.info("AHP weights computed")
        return weights

    def compute_shs(self, fuzzy_scores):
        return float(np.dot(fuzzy_scores, self.weights) * 100)

    def predict(self, sample):
        validate_input(sample, self.stage)
        if self.stage == "germination":
            fuzzy_scores = np.array([
                nitrogen_membership(sample["N"]),
                phosphorus_membership(sample["P"]),
                potassium_membership(sample["K"]),
                moisture_membership(sample["Moisture"]),
                ph_membership(sample["pH"]),
                oc_membership(sample["OC"]),
                temp_membership(sample["Temp"])
            ])
        else:
            fuzzy_scores = np.array([
                nitrogen_membership(sample["N"]),
                phosphorus_membership(sample["P"]),
                potassium_membership(sample["K"]),
                moisture_membership(sample["Moisture"]),
                ph_membership(sample["pH"]),
                oc_membership(sample["OC"]),
                temp_membership(sample["Temp"]),
                ndvi_membership(sample["NDVI"])
            ])
        shs = self.compute_shs(fuzzy_scores)
        category = classify_score(shs)
        return {
            "stage": self.stage,
            "shs": round(shs,2),
            "category": category
        }

    def run_dataset(self, df):
        logger.info(f"Processing dataset with {len(df)} rows")
        results = []
        for _, row in df.iterrows():
            try:
                result = self.predict(row)
                results.append(result["shs"])
            except Exception as e:
                logger.warning(f"Row skipped: {e}")
                results.append(None)
        df["SHS"] = results
        df["Category"] = df["SHS"].apply(lambda x: classify_score(x) if pd.notna(x) else None)
        return df

# ==========================================================
# API ENDPOINTS
# ==========================================================

@router.post("/process-csv")
async def process_csv(file: UploadFile = File(...), stage: str = "germination", db: Session = Depends(get_db)):
    if stage not in ["germination", "booting"]:
        raise HTTPException(status_code=400, detail="Stage must be 'germination' or 'booting'")
    
    try:
        df = pd.read_csv(file.file)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading CSV: {str(e)}")
    
    # Preserve original column order for CSV output
    original_columns = list(df.columns)

    # Filter for Maharashtra
    if 'State' in df.columns:
        df = df[df['State'].str.lower() == 'maharashtra']
    
    if df.empty:
        raise HTTPException(status_code=400, detail="No data for Maharashtra found")
    
    engine = WheatSHSEngine(stage)
    processed_df = engine.run_dataset(df)
    
    # ------------------------------------------------------------------
    # CSV OUTPUT (non-invasive: DB write logic remains unchanged)
    # ------------------------------------------------------------------
    try:
        output_filename = "germination_output_with_shs_avg_category.csv" if stage == "germination" else "booting_output_with_shs_avg_category.csv"
        output_path = os.path.join(OUTPUTS_DIR, output_filename)
        _write_standard_output_csv(processed_df, original_columns, stage, output_path)
    except Exception as e:
        logger.warning(f"Failed to write SHS output CSV for stage '{stage}': {e}")

    # Store results in DB (separate tables per stage)
    Model = WheatGerminationSHS if stage == "germination" else WheatBootingSHS

    stored_count = 0
    for _, row in processed_df.iterrows():
        if pd.notna(row['SHS']):
            shs_record = Model(
                pixel_id=str(row.get('Pixel_ID', '')),
                district=str(row.get('District', '')),
                state='Maharashtra',
                shs=row['SHS'],
                category=row['Category'],
            )
            db.add(shs_record)
            stored_count += 1
    db.commit()
    
    return {"message": f"Processed {len(processed_df)} rows, stored {stored_count} results"}


@router.post("/process-csv-from-data")
def process_csv_from_data(
    filename: str,
    stage: str = "germination",
    db: Session = Depends(get_db),
):
    """
    NEW: Simple, no-UI pipeline.
    Reads a CSV from `shs-backend/app/Data/`, runs the requested stage model,
    writes to the same stage DB table, and generates the same output CSV in `app/outputs/`.

    This does NOT modify existing upload behavior.
    """
    if stage not in ["germination", "booting"]:
        raise HTTPException(status_code=400, detail="stage must be 'germination' or 'booting'")

    csv_path = _safe_join_csv(DATA_DIR, filename)
    try:
        df = pd.read_csv(csv_path)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading CSV: {str(e)}")

    original_columns = list(df.columns)

    # Keep existing upload behavior: filter Maharashtra if State exists
    if "State" in df.columns:
        df = df[df["State"].astype(str).str.lower() == "maharashtra"]
    if df.empty:
        raise HTTPException(status_code=400, detail="No data for Maharashtra found")

    engine = WheatSHSEngine(stage)
    processed_df = engine.run_dataset(df)

    # Output CSV (same naming pattern as existing pipeline)
    try:
        output_filename = "germination_output_with_shs_avg_category.csv" if stage == "germination" else "booting_output_with_shs_avg_category.csv"
        output_path = os.path.join(OUTPUTS_DIR, output_filename)
        _write_standard_output_csv(processed_df, original_columns, stage, output_path)
    except Exception as e:
        logger.warning(f"Failed to write SHS output CSV for stage '{stage}': {e}")

    # DB insert (same as existing upload pipeline)
    Model = WheatGerminationSHS if stage == "germination" else WheatBootingSHS
    stored_count = 0
    for _, row in processed_df.iterrows():
        if pd.notna(row["SHS"]):
            rec = Model(
                pixel_id=str(row.get("Pixel_ID", "")),
                district=str(row.get("District", "")),
                state="Maharashtra",
                shs=row["SHS"],
                category=row["Category"],
            )
            db.add(rec)
            stored_count += 1
    db.commit()

    return {
        "message": "Processed CSV from app/Data and stored results",
        "filename": filename,
        "stage": stage,
        "rows": int(len(processed_df)),
        "stored": stored_count,
        "output_csv": os.path.join("app", "outputs", output_filename),
    }


# ==========================================================
# NEW: LAT/LON LOCAL-FILE PIPELINE (does not affect existing APIs)
# ==========================================================

@router.post("/process-latlon-local")
def process_latlon_local(
    filename: str = "synthetic_soil_data.csv",
    db: Session = Depends(get_db)
):
    """
    NEW: Reads a CSV from the shs-backend project root (local folder),
    runs BOTH germination and booting models, and stores per-point results
    into a separate table `latlon_suitability`.

    This endpoint does NOT modify or depend on the existing district-based tables.
    """
    # NEW: read from app/Data by default (simple upload-by-copy workflow)
    csv_path = _safe_join_csv(DATA_DIR, filename)

    if not os.path.exists(csv_path):
        raise HTTPException(status_code=404, detail=f"CSV not found: {csv_path}")

    try:
        df = pd.read_csv(csv_path)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading CSV: {str(e)}")

    original_columns = list(df.columns)

    required_cols = {"lat", "lon", "N", "P", "K", "Moisture", "pH", "OC", "Temp"}
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        raise HTTPException(status_code=400, detail=f"Missing columns: {missing}. Found: {list(df.columns)}")

    # Booting requires NDVI. If absent, inject a demo default (only for this new pipeline).
    if "NDVI" not in df.columns:
        df["NDVI"] = DEFAULT_BOOTING_NDVI

    batch_id = str(uuid.uuid4())

    # Run germination
    germ_df = df.copy()
    germ_engine = WheatSHSEngine("germination")
    germ_df = germ_engine.run_dataset(germ_df)  # adds SHS + Category

    # Run booting
    boot_df = df.copy()
    boot_engine = WheatSHSEngine("booting")
    boot_df = boot_engine.run_dataset(boot_df)  # adds SHS + Category

    stored = 0
    for idx in range(len(df)):
        row_in = df.iloc[idx]
        row_g = germ_df.iloc[idx]
        row_b = boot_df.iloc[idx]

        rec = LatLonSuitability(
            batch_id=batch_id,
            source_file=filename,
            lat=float(row_in["lat"]),
            lon=float(row_in["lon"]),
            n=float(row_in["N"]) if pd.notna(row_in["N"]) else None,
            p=float(row_in["P"]) if pd.notna(row_in["P"]) else None,
            k=float(row_in["K"]) if pd.notna(row_in["K"]) else None,
            moisture=float(row_in["Moisture"]) if pd.notna(row_in["Moisture"]) else None,
            ph=float(row_in["pH"]) if pd.notna(row_in["pH"]) else None,
            oc=float(row_in["OC"]) if pd.notna(row_in["OC"]) else None,
            temp=float(row_in["Temp"]) if pd.notna(row_in["Temp"]) else None,
            ndvi=float(row_in["NDVI"]) if pd.notna(row_in["NDVI"]) else None,
            germ_shs=float(row_g["SHS"]) if pd.notna(row_g.get("SHS")) else None,
            germ_category=str(row_g["Category"]) if pd.notna(row_g.get("Category")) else None,
            boot_shs=float(row_b["SHS"]) if pd.notna(row_b.get("SHS")) else None,
            boot_category=str(row_b["Category"]) if pd.notna(row_b.get("Category")) else None,
        )
        db.add(rec)
        stored += 1

    db.commit()

    # NEW: output CSV for lat/lon pipeline (saved under app/outputs/)
    try:
        out_df = df.copy()
        out_df["germ_shs"] = germ_df["SHS"]
        out_df["germ_category"] = germ_df["Category"]
        out_df["boot_shs"] = boot_df["SHS"]
        out_df["boot_category"] = boot_df["Category"]

        out_path = os.path.join(OUTPUTS_DIR, "latlon_output_with_shs_avg_category.csv")
        # Keep input columns, plus new output columns
        final_cols = list(original_columns)
        for col in ["germ_shs", "germ_category", "boot_shs", "boot_category"]:
            if col not in final_cols:
                final_cols.append(col)
        out_df.to_csv(out_path, index=False, columns=final_cols)
        logger.info(f"Written lat/lon output CSV to {out_path}")
    except Exception as e:
        logger.warning(f"Failed to write lat/lon output CSV: {e}")

    return {
        "message": "Lat/Lon suitability processed and stored",
        "filename": filename,
        "batch_id": batch_id,
        "rows": int(len(df)),
        "stored": stored,
        "ndvi_default_used": DEFAULT_BOOTING_NDVI if "NDVI" not in original_columns else None,
        "output_csv": os.path.join("app", "outputs", "latlon_output_with_shs_avg_category.csv"),
    }

def _aggregate_districts(Model, db: Session):
    results = db.query(
        Model.district,
        func.avg(Model.shs).label('avg_shs')
    ).filter(Model.state == 'Maharashtra').group_by(Model.district).all()

    districts = {}
    for row in results:
        categories = db.query(Model.category).filter(
            Model.district == row.district,
            Model.state == 'Maharashtra'
        ).all()
        category_counts = {}
        for cat in categories:
            category_counts[cat[0]] = category_counts.get(cat[0], 0) + 1
        most_common = max(category_counts, key=category_counts.get) if category_counts else None
        districts[row.district] = {"avg_shs": round(row.avg_shs, 2), "category": most_common}
    return districts


@router.get("/districts")
def get_germination_districts(db: Session = Depends(get_db)):
    """
    Aggregated SHS per district for the germination stage.
    """
    return _aggregate_districts(WheatGerminationSHS, db)


@router.get("/districts/booting")
def get_booting_districts(db: Session = Depends(get_db)):
    """
    Aggregated SHS per district for the booting stage.
    """
    return _aggregate_districts(WheatBootingSHS, db)