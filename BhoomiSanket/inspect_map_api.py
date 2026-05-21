import requests

print('inspect_map_api running')

try:
    resp = requests.get('http://localhost:8082/map/district?state=Maharashtra', timeout=10)
    print('status', resp.status_code)
    data = resp.json()
    print('features', len(data.get('features', [])))
    if data.get('features'):
        f = data['features'][0]
        props = f.get('properties', {})
        print('keys (first 20):', list(props.keys())[:20])
        print('sample name:', props.get('District') or props.get('DISTRICT') or props.get('DIST_NAME') or props.get('dtname'))
except Exception as e:
    print('error', e)
