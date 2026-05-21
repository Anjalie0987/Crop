import requests

data=requests.get('http://localhost:8000/map/district').json()
states={}
for f in data.get('features',[]):
    state=f['properties'].get('STATE')
    if state:
        states[state.strip().upper()]=states.get(state.strip().upper(),0)+1
print('states count', len(states))
for s,c in list(states.items())[:20]:
    print(s,c)


