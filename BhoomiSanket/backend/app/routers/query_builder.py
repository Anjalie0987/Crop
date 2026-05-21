from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import List, Optional, Any
from app.database import SessionLocal

router = APIRouter(
    prefix="/query-builder",
    tags=["query-builder"]
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Column metadata ---
# These are the filterable columns from soil_farm_data
COLUMN_META = [
    {
        "name": "nitrogen", "label": "Nitrogen (N)", "type": "numeric", "unit": "kg/ha",
        "thresholds": [100, 150, 200, 225, 250, 300, 350]
    },
    {
        "name": "phosphorus", "label": "Phosphorus (P)", "type": "numeric", "unit": "kg/ha",
        "thresholds": [14, 18, 22, 30, 40, 50, 60]
    },
    {
        "name": "potassium", "label": "Potassium (K)", "type": "numeric", "unit": "kg/ha",
        "thresholds": [200, 250, 300, 325, 350, 400, 450]
    },
    {
        "name": "ph", "label": "Soil pH", "type": "numeric", "unit": "",
        "thresholds": [5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5]
    },
    {
        "name": "organic_carbon", "label": "Organic Carbon", "type": "numeric", "unit": "%",
        "thresholds": [0.4, 0.6, 0.8, 1.0, 1.2, 1.4, 1.6]
    },
    {
        "name": "moisture", "label": "Soil Moisture", "type": "numeric", "unit": "%",
        "thresholds": [5, 10, 15, 20, 25, 30, 35]
    },
    {
        "name": "temperature", "label": "Temperature", "type": "numeric", "unit": "°C",
        "thresholds": [17, 20, 23, 26, 29, 32, 35]
    },
    {
        "name": "shs_germination", "label": "Germination Suitability", "type": "numeric", "unit": "%",
        "thresholds": [40, 70]
    },
]

# Whitelist of allowed column names to prevent SQL injection
ALLOWED_COLUMNS = {col["name"] for col in COLUMN_META}

# Allowed operators
ALLOWED_OPERATORS = {"=", "!=", "<", ">", "<=", ">=", "LIKE", "ILIKE", "IN", "NOT IN"}


@router.get("/columns")
def get_columns():
    """Return list of filterable columns with their display labels and types."""
    return {"columns": COLUMN_META}


@router.get("/values")
def get_values(column: str = Query(...), db: Session = Depends(get_db)):
    """Return distinct values or categorical bins for a given column."""
    if column not in ALLOWED_COLUMNS:
        raise HTTPException(status_code=400, detail=f"Invalid column: {column}")

    try:
        # Get column metadata
        meta = next(c for c in COLUMN_META if c["name"] == column)
        col_type = meta["type"]
        thresholds = meta.get("thresholds", [])
        unit = meta.get("unit", "")

        if col_type == "string":
            result = db.execute(
                text(f"SELECT DISTINCT {column} FROM soil_germination_data WHERE {column} IS NOT NULL ORDER BY {column}")
            ).fetchall()
            values = [str(row[0]) for row in result]
            return {"column": column, "type": "string", "values": values}
        else:
            # Numeric: return pre-defined scientific bins/ranges
            stats = db.execute(
                text(f"SELECT MIN({column}), MAX({column}) FROM soil_germination_data WHERE {column} IS NOT NULL")
            ).fetchone()

            min_val, max_val = stats[0], stats[1]
            values = []

            if thresholds:
                # 1. Lower bound bin
                values.append({
                    "label": f"< {thresholds[0]} {unit}".strip(),
                    "min": -999999,
                    "max": float(thresholds[0])
                })

                # 2. Intermediate bins
                for i in range(len(thresholds) - 1):
                    t1, t2 = thresholds[i], thresholds[i+1]
                    values.append({
                        "label": f"{t1} - {t2} {unit}".strip(),
                        "min": float(t1),
                        "max": float(t2)
                    })

                # 3. Upper bound bin
                values.append({
                    "label": f"> {thresholds[-1]} {unit}".strip(),
                    "min": float(thresholds[-1]),
                    "max": 999999
                })
            else:
                # Fallback to simple unique values if few, or dynamic bins
                distinct_res = db.execute(
                    text(f"SELECT COUNT(DISTINCT {column}) FROM soil_germination_data WHERE {column} IS NOT NULL")
                ).fetchone()
                distinct_count = distinct_res[0] if distinct_res else 0

                if distinct_count <= 20:
                    result = db.execute(
                        text(f"SELECT DISTINCT {column} FROM soil_germination_data WHERE {column} IS NOT NULL ORDER BY {column}")
                    ).fetchall()
                    values = [{"label": f"{row[0]} {unit}".strip(), "min": float(row[0]), "max": float(row[0])} for row in result]

            return {
                "column": column,
                "type": "numeric",
                "min": float(min_val) if min_val is not None else None,
                "max": float(max_val) if max_val is not None else None,
                "values": values
            }

    except Exception as e:
        print(f"Error fetching values for {column}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# --- Filter models ---
class FilterCondition(BaseModel):
    field: str
    operator: str
    value: Any  # string, number, or list for IN

class FilterRequest(BaseModel):
    filters: List[FilterCondition]
    logic: str = "AND"  # "AND" or "OR"


@router.post("/filter")
def apply_filter(request: FilterRequest, db: Session = Depends(get_db)):
    """
    Apply filter conditions to soil_farm_data and return matching subdistrict/district names.
    This is used to highlight/filter regions on the choropleth map.
    """
    if not request.filters:
        return {"matching_subdistricts": [], "total_matches": 0, "message": "No filters provided"}

    # Validate logic operator
    logic = request.logic.upper()
    if logic not in ("AND", "OR"):
        raise HTTPException(status_code=400, detail="Logic must be 'AND' or 'OR'")

    try:
        where_clauses = []
        params = {}

        for i, f in enumerate(request.filters):
            # Validate column
            if f.field not in ALLOWED_COLUMNS:
                raise HTTPException(status_code=400, detail=f"Invalid column: {f.field}")

            # Validate operator
            op = f.operator.upper()
            if op not in ALLOWED_OPERATORS:
                raise HTTPException(status_code=400, detail=f"Invalid operator: {f.operator}")

            param_name = f"val_{i}"

            if op in ("IN", "NOT IN"):
                # Value should be a list
                vals = f.value if isinstance(f.value, list) else [f.value]
                placeholders = ", ".join([f":val_{i}_{j}" for j in range(len(vals))])
                where_clauses.append(f"{f.field} {op} ({placeholders})")
                for j, v in enumerate(vals):
                    params[f"val_{i}_{j}"] = v
            elif op in ("LIKE", "ILIKE"):
                where_clauses.append(f"CAST({f.field} AS TEXT) {op} :{param_name}")
                params[param_name] = f.value
            else:
                # Standard comparison: =, !=, <, >, <=, >=
                where_clauses.append(f"{f.field} {op} :{param_name}")
                params[param_name] = f.value

        # Combine with AND/OR
        combined = f" {logic} ".join(where_clauses)

        # Query: get pixel_id and state for matching rows
        query_str = f"""
            SELECT pixel_id, state 
            FROM soil_germination_data 
            WHERE {combined}
        """
        
        result = db.execute(text(query_str), params).fetchall()
        
        # Mapping logic: Find matching Districts/States
        # We use the same scattering logic as in farm_analysis.py and germination.py
        from app.routers.farm_analysis import get_district_from_coords
        import hashlib
        
        matching_names = set()
        mah_center = {"lat": 19.0, "lon": 76.0, "lat_range": 4.0, "lon_range": 6.0}

        for i, row in enumerate(result):
            pixel_id, state = row[0], row[1]
            if state:
                matching_names.add(state.upper())
            
            # Replicate synthetic scattering to find district
            seed = str(pixel_id or i)
            hash_val = int(hashlib.md5(seed.encode()).hexdigest(), 16)
            lat_off = ((hash_val % 1000) / 1000.0 - 0.5) * mah_center["lat_range"]
            lon_off = (((hash_val // 1000) % 1000) / 1000.0 - 0.5) * mah_center["lon_range"]
            
            lat = mah_center["lat"] + lat_off
            lon = mah_center["lon"] + lon_off
            
            d_name = get_district_from_coords(lat, lon)
            if d_name:
                matching_names.add(d_name.upper())

        # Also get total matching row count
        count_query = f"SELECT COUNT(*) FROM soil_germination_data WHERE {combined}"
        total = db.execute(text(count_query), params).fetchone()[0]

        return {
            "matching_subdistricts": sorted(list(matching_names)), # Using 'matching_subdistricts' key for frontend compatibility
            "total_matches": total,
            "filter_count": len(request.filters)
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Filter error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
