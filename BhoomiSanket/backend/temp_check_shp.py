import geopandas as gpd
import os

shp_path = r'D:\CROP2\CROP2\BhoomiSanket\backend\data\shapefiles\district\DISTRICT_BOUNDARY_WGS84.shp'
if os.path.exists(shp_path):
    gdf = gpd.read_file(shp_path)
    print(f"Columns: {gdf.columns.tolist()}")
    # Filter for Maharashtra and print some values
    mah = gdf[gdf['STATE'].str.contains('MAHARASHTRA', case=False, na=False)].copy()
    if not mah.empty:
        print(mah.head(5).to_string())
else:
    print("Shapefile not found.")
