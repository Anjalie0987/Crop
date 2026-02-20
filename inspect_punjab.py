import geopandas as gpd
import pandas as pd

try:
    path = r"c:/Users/anjal/OneDrive/Desktop/CROP/BhoomiSanket/backend/data/shapefiles/subdistrict/SUBDISTRICT_BOUNDARY_WGS84.shp"
    gdf = gpd.read_file(path)

    # Convert columns to simpler strings
    cols = gdf.columns.tolist()
    
    # Try to find State, District, Subdistrict columns
    state_col = next((c for c in cols if "STATE" in c.upper() or "STNAME" in c.upper()), None)
    dist_col = next((c for c in cols if "DIST" in c.upper()), None)
    sub_col = next((c for c in cols if "TEHSIL" in c.upper() or "SUB" in c.upper() or "NAME" in c.upper()), None)

    print(f"Detected Columns: State={state_col}, District={dist_col}, Subdistrict={sub_col}")
    
    if state_col:
        # Filter for Punjab
        punjab_gdf = gdf[gdf[state_col].astype(str).str.upper() == "PUNJAB"]
        if punjab_gdf.empty:
            print("No 'PUNJAB' found in State column. Checking unique values:")
            print(gdf[state_col].unique()[:10])
        else:
            print(f"Found {len(punjab_gdf)} subdistricts in Punjab.")
            
            # Extract unique districts
            if dist_col:
                districts = sorted(punjab_gdf[dist_col].unique().tolist())
                print("\n--- DISTRICTS ---")
                print(", ".join(districts))
                
                # Print sample subdistricts for first district
                if sub_col:
                    first_dist = districts[0]
                    subs = punjab_gdf[punjab_gdf[dist_col] == first_dist][sub_col].unique().tolist()
                    print(f"\n--- Subdistricts in {first_dist} ---")
                    print(", ".join(subs))
                    
                    # Print ALL subdistricts (limit if too many)
                    all_subs = sorted(punjab_gdf[sub_col].unique().tolist())
                    print(f"\n--- ALL SUBDISTRICTS ({len(all_subs)}) ---")
                    print(", ".join(all_subs))

    else:
        print("Could not identify State column.")
        print("Columns:", cols)

except Exception as e:
    print(f"Error: {e}")
