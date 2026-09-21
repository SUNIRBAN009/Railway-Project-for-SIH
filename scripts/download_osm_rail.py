import requests
import json
import os

overpass_url = "https://overpass-api.de/api/interpreter"
# Bounding box for West Bengal approx (South: 21.5, West: 85.5, North: 27.5, East: 90.0)
overpass_query = """
[out:json][timeout:90];
(
  way["railway"~"^(rail)$"]["usage"!="industrial"]["usage"!="military"]["service"!="siding"]["service"!="yard"](21.5,85.5,27.5,90.0);
);
out geom;
"""

print("Fetching data from Overpass API...")
try:
    headers = {'User-Agent': 'RailwaySIHApp/1.0'}
    response = requests.post(overpass_url, data={'data': overpass_query}, headers=headers)
    response.raise_for_status()
    data = response.json()
    
    features = []
    for element in data.get('elements', []):
        if element['type'] == 'way' and 'geometry' in element:
            coords = [[node['lon'], node['lat']] for node in element['geometry']]
            features.append({
                "type": "Feature",
                "properties": {
                    "name": element.get('tags', {}).get('name', 'Unknown'),
                    "railway": element.get('tags', {}).get('railway', '')
                },
                "geometry": {
                    "type": "LineString",
                    "coordinates": coords
                }
            })
            
    geojson = {
        "type": "FeatureCollection",
        "features": features
    }
    
    os.makedirs('frontend/public/data', exist_ok=True)
    out_path = 'frontend/public/data/wb_rail_network.geojson'
    with open(out_path, 'w') as f:
        json.dump(geojson, f)
        
    print(f"Successfully saved {len(features)} railway segments to {out_path}")
    print(f"File size: {os.path.getsize(out_path) / 1024:.2f} KB")
except Exception as e:
    print(f"Error: {e}")
