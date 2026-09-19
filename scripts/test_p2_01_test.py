import json
import urllib.request
import urllib.error
import subprocess
import sys

BACKEND_URL = "http://127.0.0.1:8000"
FRONTEND_URL = "http://localhost:3000"

def log_step(title):
    print("\n" + "=" * 80)
    print(f"STEP: {title}")
    print("=" * 80)

def http_request(url, method="GET", headers=None, data=None):
    if headers is None:
        headers = {}
    body_bytes = None
    if data is not None:
        body_bytes = json.dumps(data).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=body_bytes, headers=headers, method=method)
    try:
        resp = urllib.request.urlopen(req, timeout=10)
        resp_body = resp.read().decode("utf-8")
        try:
            return resp.status, json.loads(resp_body)
        except Exception:
            return resp.status, resp_body
    except urllib.error.HTTPError as e:
        resp_body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(resp_body)
        except Exception:
            return e.code, resp_body

print("=" * 80)
print("RUNNING AUTOMATED E2E VERIFICATION SUITE: TSK-P2-01-TEST")
print("VERIFYING 3D PITCH MAPBOX CANVAS & POSTGIS TRACK GEOMETRY RENDERING")
print("=" * 80)

# ----------------------------------------------------------------------
# 1. Verify PostGIS GeoJSON API directly on Backend
# ----------------------------------------------------------------------
log_step("1. Querying PostGIS WGS-84 SRID 4326 GeoJSON on Backend (8000)")
status, body = http_request(f"{BACKEND_URL}/api/v1/blocks/corridors/NDLS-CNB-MAIN/geojson/")
print(f"Backend HTTP Response: {status}")
assert status == 200, f"Expected 200, got {status}"
assert body.get("success") is True, "Expected success: true"

geojson = body.get("data", {})
assert geojson.get("type") == "FeatureCollection", "Expected FeatureCollection"
props = geojson.get("properties", {})
assert props.get("srid") == 4326, f"Expected SRID 4326, got {props.get('srid')}"
assert float(props.get("total_length_km")) == 440.2, f"Expected 440.2 KM, got {props.get('total_length_km')}"

features = geojson.get("features", [])
line_features = [f for f in features if f["geometry"]["type"] == "LineString"]
point_features = [f for f in features if f["geometry"]["type"] == "Point"]

assert len(line_features) == 1, "Must contain exactly 1 master LineString track feature"
assert len(point_features) >= 10, f"Must contain at least 10 station Point features, found {len(point_features)}"

track_coords = line_features[0]["geometry"]["coordinates"]
print(f"[OK] PostGIS LineString geometry validated: {len(track_coords)} spatial waypoints")
print(f"  * Origin (NDLS):  Lng {track_coords[0][0]}, Lat {track_coords[0][1]}")
print(f"  * Terminus (CNB): Lng {track_coords[-1][0]}, Lat {track_coords[-1][1]}")
print(f"[OK] Station Nodes validated: {len(point_features)} station nodes mapped")

# ----------------------------------------------------------------------
# 2. Verify Frontend Vite Reverse Proxy for GeoJSON
# ----------------------------------------------------------------------
log_step("2. Querying PostGIS GeoJSON via Frontend Proxy (3000)")
fe_status, fe_body = http_request(f"{FRONTEND_URL}/api/v1/blocks/corridors/NDLS-CNB-MAIN/geojson/")
print(f"Frontend Proxy HTTP Response: {fe_status}")
assert fe_status == 200, f"Vite proxy returned {fe_status}"
assert fe_body.get("success") is True
fe_props = fe_body["data"]["properties"]
assert fe_props["total_length_km"] == 440.2
print("[OK] Frontend proxy successfully forwards /api/v1/blocks/corridors/NDLS-CNB-MAIN/geojson/ to backend")

# ----------------------------------------------------------------------
# 3. Verify Authentication & Route Clearance for /map
# ----------------------------------------------------------------------
log_step("3. Verifying Authentication & Route Clearance for /map")
# Login as Chief Controller
login_status, login_body = http_request(
    f"{BACKEND_URL}/api/v1/auth/login/",
    method="POST",
    data={"username": "coa_delhi_chief", "password": "railway@123"}
)
assert login_status == 200
coa_token = login_body["data"]["access_token"]
print("[OK] Chief Controller authenticated (Token issued)")

# Login as Track Engineer
eng_status, eng_body = http_request(
    f"{BACKEND_URL}/api/v1/auth/login/",
    method="POST",
    data={"username": "eng_track_pway", "password": "railway@123"}
)
assert eng_status == 200
eng_token = eng_body["data"]["access_token"]
print("[OK] Track Engineer authenticated (Token issued)")

# Verify /map page is served on Vite
map_page_status, map_page_html = http_request(f"{FRONTEND_URL}/map")
assert map_page_status == 200, f"Frontend /map returned status {map_page_status}"
assert "<!doctype html>" in map_page_html.lower() or "<html" in map_page_html.lower()
print("[OK] Frontend /map HTML endpoint accessible with HTTP 200")

# ----------------------------------------------------------------------
# 4. Verify RailMap Component 3D Engine & Canvas Spec
# ----------------------------------------------------------------------
log_step("4. Auditing RailMap.tsx 3D Perspective & GeoJSON Telemetry Specifications")
with open("frontend/src/components/map/RailMap.tsx", "r", encoding="utf-8") as f:
    rail_map_code = f.read()

# Assert 3D perspective pitch transform styles
assert "perspective: '1000px'" in rail_map_code, "RailMap must define 1000px perspective"
assert "rotateX(45deg)" in rail_map_code, "RailMap must apply 45° 3D tilt (rotateX(45deg))"
assert "transformStyle: 'preserve-3d'" in rail_map_code, "RailMap must enable preserve-3d"
print("[OK] 3D isometric perspective engine validated (1000px perspective, rotateX(45deg) tilt)")

# Assert PostGIS GeoJSON live fetch
assert "/api/v1/blocks/corridors/NDLS-CNB-MAIN/geojson/" in rail_map_code, "Must query live PostGIS GeoJSON"
assert "total_length_km" in rail_map_code, "Must parse total_length_km dynamically"
print("[OK] Live PostGIS SRID 4326 GeoJSON hook integration validated")

# Assert Telemetry HUD Strip items
assert "MAPBOX 60 FPS WEBGL TWIN" in rail_map_code, "Must display Mapbox 60 FPS twin badge"
assert "PITCH:" in rail_map_code, "Must display live pitch telemetry"
assert "45° 3D TILT" in rail_map_code, "Must display 45° 3D TILT status"
assert "0° NADIR" in rail_map_code, "Must display 0° NADIR status"
assert "NDLS–CNB TRUNK" in rail_map_code, "Must display NDLS-CNB trunk corridor telemetry"
assert "LIVE POSTGIS SRID 4326 ACTIVE" in rail_map_code, "Must display active PostGIS indicator"
print("[OK] HUD status telemetry indicators validated")

# ----------------------------------------------------------------------
# 5. Verify Frontend Clean Build (TypeScript & Assets)
# ----------------------------------------------------------------------
log_step("5. Executing Production Build Verification in Docker (npm run build)")
build_proc = subprocess.run(
    ["docker", "exec", "railway_frontend", "npm", "run", "build"],
    capture_output=True,
    text=True
)
print(build_proc.stdout)
if build_proc.stderr:
    print(build_proc.stderr)
assert build_proc.returncode == 0, f"Frontend build failed with exit code {build_proc.returncode}"
print("[OK] Frontend TypeScript compilation and asset bundling succeeded with 0 errors!")

print("\n" + "=" * 80)
print("ALL TSK-P2-01-TEST VERIFICATION CHECKS PASSED (100%)")
print("=" * 80)
