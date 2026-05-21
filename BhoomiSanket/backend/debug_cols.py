import geopandas as gpd
import os

BASE_DIR = os.getcwd()
SHAPEFILE_DIR = os.path.join(BASE_DIR, "data", "shapefiles")

state_shp = os.path.join(SHAPEFILE_DIR, "state", "STATE_BOUNDARY_wgs84.shp")
dist_shp = os.path.join(SHAPEFILE_DIR, "district", "DISTRICT_BOUNDARY_WGS84.shp")
sub_shp = os.path.join(SHAPEFILE_DIR, "subdistrict", "SUBDISTRICT_BOUNDARY_WGS84.shp")

def p(path, name):
    try:
        gdf = gpd.read_file(path)
        print(f"XXX {name} XXX: {list(gdf.columns)}")
        # print first row values for safe keeping to check for joins
        row = gdf.iloc[0]
        print(f"XXX {name} ROW XXX: {row.to_dict()}")
    except Exception as e:
        print(e)

p(state_shp, "STATE")
p(dist_shp, "DISTRICT")
p(sub_shp, "SUBDISTRICT")
