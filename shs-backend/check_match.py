import requests

shs = requests.get('http://127.0.0.1:8001/api/districts').json()
geo = requests.get('http://127.0.0.1:8000/map/district').json()

keys = set(k.strip().lower() for k in shs.keys())

matches = 0
for f in geo.get('features', []):
    name = f['properties'].get('District') or f['properties'].get('DISTRICT')
    if name and name.strip().lower() in keys:
        matches += 1

print('matches', matches, 'out of', len(geo.get('features', [])))

# Print some sample non-matching names
missing = []
for f in geo.get('features', [])[:200]:
    name = f['properties'].get('District') or f['properties'].get('DISTRICT')
    if name and name.strip().lower() not in keys:
        missing.append(name)

print('sample missing', missing[:20])
