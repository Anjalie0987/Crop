import geopandas as gpd
import os

# Path to subdistrict shapefile
shp_path = r"D:\CROP2\CROP2\BhoomiSanket\backend\data\shapefiles\subdistrict\SUBDISTRICT_BOUNDARY_WGS84.shp"

if os.path.exists(shp_path):
    gdf = gpd.read_file(shp_path)
    print("Columns:", gdf.columns.tolist())
    print("Number of rows:", len(gdf))
    
    # Check for Maharashtra
    state_col = None
    for col in ['STATE', 'ST_NM', 'State_Name', 'StateName', 'stname', 'ST_NAME']:
        if col in gdf.columns:
            state_col = col
            break
    
    if state_col:
        maharashtra_rows = gdf[gdf[state_col].str.contains('Maharashtra', case=False, na=False)]
        print(f"Maharashtra rows: {len(maharashtra_rows)}")
        if len(maharashtra_rows) > 0:
            print("Maharashtra in subdistrict shapefile: YES")
            district_col = None
            for col in ['DISTRICT', 'DIST_NAME', 'District_Name', 'DistName', 'dtname']:
                if col in gdf.columns:
                    district_col = col
                    break
            if district_col:
                unique_districts = maharashtra_rows[district_col].unique()
                print("Maharashtra districts in subdistrict:", sorted(unique_districts))
        else:
            print("No Maharashtra found in subdistrict shapefile.")
    else:
        print("No state column found.")
        
    # List all unique states
    if state_col:
        unique_states = gdf[state_col].unique()
        print("All unique states in subdistrict:", sorted(unique_states))
else:
    print("Shapefile not found.")