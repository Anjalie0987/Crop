import geopandas as gpd
import os

shp_path = r'D:\CROP2\CROP2\BhoomiSanket\backend\data\shapefiles\district\DISTRICT_BOUNDARY_WGS84.shp'
if os.path.exists(shp_path):
    gdf = gpd.read_file(shp_path)
    print("Columns:")
    for c in gdf.columns:
        print(c)
    
    # Filter for Maharashtra and print some values for specific columns
    mah = gdf[gdf['STATE'].str.contains('MAHARASHTRA', case=False, na=False)].copy()
    if not mah.empty:
        print("\nSample Data (Maharashtra):")
        # Check if nitrogen, phosphorus etc are here
        cols_to_check = ['District', 'nitrogen', 'phosphorus', 'potassium', 'ph', 'organic_carbon', 'moisture', 'temperature', 'N', 'P', 'K']
        present_cols = [c for c in cols_to_check if c in mah.columns]
        print(mah[present_cols].head(5).to_string())
else:
    print("Shapefile not found.")
