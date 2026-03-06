import requests
import json

url = "http://localhost:8000/query-builder/filter"
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
