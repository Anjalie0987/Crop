import requests
import json
import os
from dotenv import load_dotenv

load_dotenv()

url = os.getenv("BASE_URL", "http://127.0.0.1:8000") + "/query-builder/filter"
payload = {
    "filters": [
        {"field": "nitrogen", "operator": ">", "value": 225}
    ],
    "logic": "AND"
}

try:
    response = requests.post(url, json=payload)
    print(f"Status: {response.status_code}")
    print(json.dumps(response.json(), indent=2))
except Exception as e:
    print(f"Error: {e}")
