import urllib.request
import json
import os
from dotenv import load_dotenv

load_dotenv()

BASE_URL = os.getenv("BASE_URL", "http://127.0.0.1:8000")

def verify_map_data():
    print("--- Verifying Map Data Injection ---")
    
    # 1. Fetch District GeoJSON
    try:
        url = f"{BASE_URL}/map/district"
        print(f"Fetching: {url}")
        with urllib.request.urlopen(url) as response:
            status = response.getcode()
            if status == 200:
                data = json.loads(response.read().decode())
                features = data.get('features', [])
                print(f"Found {len(features)} districts in GeoJSON.")
                
                # Check for "AMRITSAR" (Punjab - should have mock or real if in germination table)
                # Check for "NAGPUR" (Maharashtra - should have REAL data from germination table)
                targets = ["NAGPUR", "AMRITSAR", "AMRAVATI"]
                
                for target in targets:
                    found = False
                    for f in features:
                        props = f['properties']
                        name = (props.get('DISTRICT') or props.get('DIST_NAME') or "").strip().upper()
                        if name == target:
                            print(f"\nDistricts {target} properties:")
                            print(json.dumps(props, indent=2))
                            found = True
                            break
                    if not found:
                        print(f"\n{target} not found in GeoJSON.")
            else:
                print(f"Error: {status}")
    except Exception as e:
        print(f"Verification failed: {e}")

if __name__ == "__main__":
    verify_map_data()
