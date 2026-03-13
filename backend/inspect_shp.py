import geopandas as gpd
import os

shp_path = r'c:\Users\anjal\OneDrive\Desktop\CROP\BhoomiSanket\backend\data\shapefiles\district\DISTRICT_BOUNDARY_WGS84.shp'

if not os.path.exists(shp_path):
    print(f"Shapefile NOT found at {shp_path}")
    exit(1)

try:
    gdf = gpd.read_file(shp_path)
    print("Columns:", gdf.columns.tolist())
    print("\nUnique States (first 20):", gdf['STATE'].unique().tolist()[:20] if 'STATE' in gdf.columns else "STATE column missing")
    
    # Check for Maharashtra
    if 'STATE' in gdf.columns:
        mah_rows = gdf[gdf['STATE'].str.contains('MAHARASHTRA', case=False, na=False)]
        print(f"\nFound {len(mah_rows)} rows for MAHARASHTRA")
        if len(mah_rows) > 0:
            print("First 5 Districts:", mah_rows['District'].unique().tolist()[:5] if 'District' in mah_rows.columns else "District column missing")
    else:
        print("STATE column missing in shapefile")

except Exception as e:
    print(f"Error: {e}")
