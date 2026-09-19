import json
import urllib.request
import urllib.error

BASE_URL = "http://127.0.0.1:8000"

def get_json(url):
    req = urllib.request.Request(url)
    try:
        resp = urllib.request.urlopen(req)
        body = resp.read().decode('utf-8')
        return resp.status, json.loads(body)
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8')
        try:
            return e.code, json.loads(body)
        except Exception:
            return e.code, body

print("=" * 80)
print("TESTING TSK-P2-01-BE: CORRIDOR, STATION, BLOCKSECTION & POSTGIS GEOJSON ENDPOINTS")
print("=" * 80)

# 1. Test Corridor List Endpoint
status, body = get_json(f"{BASE_URL}/api/v1/blocks/corridors/")
print(f"[1] GET /api/v1/blocks/corridors/: HTTP {status}")
assert status == 200, f"Expected 200, got {status}: {body}"
assert body.get('success') is True

corridors = body['data']
print(f"    - Found {len(corridors)} corridors in database.")
trunk_corridor = next((c for c in corridors if c['code'] == 'NDLS-CNB-MAIN'), None)
assert trunk_corridor is not None, "NDLS-CNB-MAIN corridor must exist"
print(f"    - Trunk Corridor: {trunk_corridor['name']} ({trunk_corridor['code']})")
print(f"    - Span: KM {trunk_corridor['start_km']} to KM {trunk_corridor['end_km']} ({trunk_corridor['total_length_km']} km)")
assert float(trunk_corridor['total_length_km']) == 440.2, f"Expected 440.2 km, got {trunk_corridor['total_length_km']}"

sections = trunk_corridor.get('sections', [])
print(f"    - Nested Block Sections: {len(sections)} sections")
assert len(sections) >= 9, f"Expected at least 9 block sections, got {len(sections)}"
first_sec = sections[0]
last_sec = sections[-1]
print(f"      • First Section: {first_sec['section_code']} (KM {first_sec['start_km']} to {first_sec['end_km']})")
print(f"      • Last Section:  {last_sec['section_code']} (KM {last_sec['start_km']} to {last_sec['end_km']})")

# 2. Test Corridor Detail Endpoint
status_detail, body_detail = get_json(f"{BASE_URL}/api/v1/blocks/corridors/NDLS-CNB-MAIN/")
print(f"\n[2] GET /api/v1/blocks/corridors/NDLS-CNB-MAIN/: HTTP {status_detail}")
assert status_detail == 200
assert body_detail.get('success') is True
assert 'geojson' in body_detail['data'], "Expected 'geojson' in detail payload"

# 3. Test Dedicated GeoJSON Endpoint (/geojson/)
status_geo, body_geo = get_json(f"{BASE_URL}/api/v1/blocks/corridors/NDLS-CNB-MAIN/geojson/")
print(f"\n[3] GET /api/v1/blocks/corridors/NDLS-CNB-MAIN/geojson/: HTTP {status_geo}")
assert status_geo == 200
assert body_geo.get('success') is True
geojson = body_geo['data']

assert geojson['type'] == 'FeatureCollection', "Expected FeatureCollection"
props = geojson['properties']
print(f"    - GeoJSON SRID: {props.get('srid')}")
print(f"    - Total Length: {props.get('total_length_km')} KM")
assert props.get('srid') == 4326, "Expected SRID 4326"

features = geojson['features']
print(f"    - Total Features: {len(features)}")
track_feature = next((f for f in features if f['geometry']['type'] == 'LineString'), None)
assert track_feature is not None, "LineString track geometry must exist"
line_coords = track_feature['geometry']['coordinates']
print(f"    - Track LineString Waypoints: {len(line_coords)} points (NDLS -> CNB)")
assert len(line_coords) >= 10, f"Expected at least 10 waypoints along track, got {len(line_coords)}"

station_points = [f for f in features if f['geometry']['type'] == 'Point']
print(f"    - Station Nodes: {len(station_points)} stations mapped")
assert len(station_points) >= 10, "Expected all 10 stations to be mapped as GeoJSON Points"
for sp in station_points[:3]:
    p = sp['properties']
    c = sp['geometry']['coordinates']
    print(f"      • Station [{p['code']}]: {p['name']:20} | KM {p['km_from_source']:7.3f} | Lat/Lng: {c[1]}, {c[0]}")

print("\n" + "=" * 80)
print("ALL TSK-P2-01-BE VERIFICATION CHECKS PASSED (100%)")
print("=" * 80)
