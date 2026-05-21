import sys
import os
sys.path.append(os.getcwd())
from app.routers.farm_analysis import CACHED_GRID_POINTS, initialize_grid

initialize_grid()
print(f"Total points: {len(CACHED_GRID_POINTS)}")
if CACHED_GRID_POINTS:
    print(f"Sample point: {CACHED_GRID_POINTS[0]}")
    # Check bounds
    lats = [p[0] for p in CACHED_GRID_POINTS]
    lons = [p[1] for p in CACHED_GRID_POINTS]
    print(f"Lat range: {min(lats)} to {max(lats)}")
    print(f"Lon range: {min(lons)} to {max(lons)}")
