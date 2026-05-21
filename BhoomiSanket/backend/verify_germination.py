import urllib.request
import json
import os
from dotenv import load_dotenv

load_dotenv()

BASE_URL = os.getenv("BASE_URL", "http://127.0.0.1:8000")

def test_germination_api():
    print("--- Testing Germination API ---")
    
    # 1. Test Root endpoint
    try:
        with urllib.request.urlopen(f"{BASE_URL}/germination/") as response:
            status = response.getcode()
            print(f"GET /germination/: Status {status}")
            if status == 200:
                data = json.loads(response.read().decode())
                print(f"Found {len(data)} records (limit 100). First record: {data[0] if data else 'None'}")
    except Exception as e:
        print(f"Failed to connect to /germination/: {e}")

    # 2. Test District endpoint
    district = "Amritsar"
    try:
        # URL encode the district name just in case
        encoded_dist = urllib.parse.quote(district)
        with urllib.request.urlopen(f"{BASE_URL}/germination/district/{encoded_dist}") as response:
            status = response.getcode()
            print(f"\nGET /germination/district/{district}: Status {status}")
            if status == 200:
                data = json.loads(response.read().decode())
                print(f"Found {len(data)} records for {district}.")
    except Exception as e:
        print(f"Failed to connect to district endpoint: {e}")

    # 3. Test Category Stats
    try:
        with urllib.request.urlopen(f"{BASE_URL}/germination/stats/categories") as response:
            status = response.getcode()
            print(f"\nGET /germination/stats/categories: Status {status}")
            if status == 200:
                data = json.loads(response.read().decode())
                print(f"Category Stats: {json.dumps(data, indent=2)}")
    except Exception as e:
        print(f"Failed to connect to stats endpoint: {e}")

if __name__ == "__main__":
    test_germination_api()
