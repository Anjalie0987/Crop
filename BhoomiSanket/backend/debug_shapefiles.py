import geopandas as gpd
import os

BASE_DIR = os.getcwd()
SHAPEFILE_DIR = os.path.join(BASE_DIR, "data", "shapefiles")

STATE_SHP = os.path.join(SHAPEFILE_DIR, "state", "STATE_BOUNDARY_wgs84.shp")
DISTRICT_SHP = os.path.join(SHAPEFILE_DIR, "district", "DISTRICT_BOUNDARY_WGS84.shp")
SUBDISTRICT_SHP = os.path.join(SHAPEFILE_DIR, "subdistrict", "SUBDISTRICT_BOUNDARY_WGS84.shp")

def inspect_shp(path, name):
    print(f"--- Inspecting {name} ---")
    try:
        if not os.path.exists(path):
            print(f"File not found: {path}")
            return
        gdf = gpd.read_file(path)
        print("Columns:", gdf.columns.tolist())
        print("First row:", gdf.iloc[0].to_dict())
    except Exception as e:
        print(f"Error: {e}")

inspect_shp(STATE_SHP, "State")
inspect_shp(DISTRICT_SHP, "District")
inspect_shp(SUBDISTRICT_SHP, "Sub-District")
