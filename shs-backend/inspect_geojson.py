import requests

url = "http://localhost:8000/map/district"
try:
    r = requests.get(url, timeout=10)
    r.raise_for_status()
    data = r.json()
    print('type', type(data))
    if isinstance(data, dict) and 'features' in data:
        f = data['features'][0]
        print('feature keys', list(f.keys()))
        print('properties keys', list(f['properties'].keys())[:40])
        for k in ['District','DISTRICT','DIST_NAME','dtname','ST_NM','STATE','NAME','NAME_2','DISTRICT_N','DISTRICT_NA','DISTRICT_NA','DISTNAME']:
            if k in f['properties']:
                print(k, f['properties'][k])
    else:
        print('response keys', list(data.keys()) if isinstance(data, dict) else 'not dict')
except Exception as e:
    print('ERR', e)
