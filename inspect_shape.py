import geopandas as gpd

print("Reading shapefile...")
# The path is in backend/app/routers/map.py
path = r"c:/Users/anjal/OneDrive/Desktop/CROP/BhoomiSanket/backend/data/shapefiles/subdistrict/SUBDISTRICT_BOUNDARY_WGS84.shp"

try:
    gdf = gpd.read_file(path)
    print("Columns:", gdf.columns.tolist())
    
    # Check for District Column
    dist_cols = ["DIST_NAME", "DISTRICT", "District"]
    for c in dist_cols:
        if c in gdf.columns:
            print(f"--- Unique Districts ({c}) ---")
            print(gdf[c].unique().tolist())
            
    # Check for Sub-District Column
    sub_cols = ["TEHSIL", "TEHSIL_NAM", "SUB_DIST", "sdtname", "Sub_District"]
    for c in sub_cols:
        if c in gdf.columns:
            print(f"--- Unique Sub-Districts ({c}) ---")
            print(gdf[c].unique().tolist())
            
except Exception as e:
    print(f"Error: {e}")
