import requests

try:
    r = requests.get('http://127.0.0.1:8000/farm-analysis/data')
    data = r.json()
    districts = set()
    states = set()
    for row in data:
        if row.get('district'): districts.add(row['district'].upper())
        if row.get('state'): states.add(row['state'].upper())
    
    print(f"Total points: {len(data)}")
    print(f"Districts found: {sorted(list(districts))}")
    print(f"States found: {sorted(list(states))}")
except Exception as e:
    print(f"Error: {e}")
