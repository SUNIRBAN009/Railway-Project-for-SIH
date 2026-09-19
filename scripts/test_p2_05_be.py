import json
import urllib.request
import urllib.error
import subprocess
import sys

BASE_URL = "http://127.0.0.1:8000"

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
print("RUNNING AUTOMATED TEST SUITE: TSK-P2-05-BE")
print("TRAIN MASTER TIMETABLE, LIVE RUNNING STATUS & COA 12 MASTER TRAIN INGESTION")
print("=" * 80)

# ----------------------------------------------------------------------
# 1. Authenticate Personas (Chief Controller)
# ----------------------------------------------------------------------
log_step("1. Authenticating Chief Controller Persona")
status_login, login_res = http_request(
    f"{BASE_URL}/api/v1/auth/login/",
    method="POST",
    data={"username": "chief_controller", "password": "Password123!"}
)
assert status_login == 200, f"Login failed: {login_res}"
token = login_res["data"]["access_token"]
headers = {"Authorization": f"Bearer {token}"}
print(f"[OK] Chief Controller authenticated. JWT issued.")

# ----------------------------------------------------------------------
# 2. Query Master Train Catalog (12 Master Trains)
# ----------------------------------------------------------------------
log_step("2. Querying Master Train Timetable Catalog (GET /api/v1/trains/catalog/)")
status_cat, cat_res = http_request(f"{BASE_URL}/api/v1/trains/catalog/", headers=headers)
assert status_cat == 200, f"Catalog query failed: {cat_res}"

trains_data = cat_res["data"]["trains"]
total_trains = cat_res["data"]["count"]
print(f"[OK] Retrieved {total_trains} trains from Master Catalog.")

CANONICAL_12_TRAINS = [
    "12301", "12424", "12004", "22436", "12417", "20801",
    "12419", "12397", "BOXN-998", "CONT-402", "POL-551", "BCN-774"
]

catalog_train_numbers = [t["train_number"] for t in trains_data]
for t_num in CANONICAL_12_TRAINS:
    assert t_num in catalog_train_numbers, f"Canonical train {t_num} missing from catalog!"
print(f"[OK] All 12 Canonical Master Trains verified in catalog: {CANONICAL_12_TRAINS}")

# Verify specific attributes on key train
vb = next(t for t in trains_data if t["train_number"] == "22436")
assert vb["train_name"] == "New Delhi - Varanasi Vande Bharat Express", f"Vande Bharat name mismatch: {vb['train_name']}"
assert vb["max_speed_kmh"] == 160, f"Vande Bharat speed mismatch: {vb['max_speed_kmh']}"
assert vb["direction"] == "DOWN", f"Vande Bharat direction mismatch: {vb['direction']}"
assert vb["pax_capacity"] == 1128, f"Vande Bharat pax mismatch: {vb['pax_capacity']}"
print(f"[OK] Train 22436 Vande Bharat verified: 160 km/h, {vb['direction']}, Cap={vb['pax_capacity']}")

# ----------------------------------------------------------------------
# 3. Retrieve Station Schedule Sequence (Train 12424 Rajdhani)
# ----------------------------------------------------------------------
log_step("3. Querying Station Stoppages Schedule for Train 12424 (Rajdhani Express)")
status_sched, sched_res = http_request(f"{BASE_URL}/api/v1/trains/12424/schedule/", headers=headers)
assert status_sched == 200, f"Schedule query failed: {sched_res}"

schedules = sched_res["data"]["schedules"]
assert len(schedules) >= 5, f"Expected at least 5 stops for Rajdhani, got {len(schedules)}"
print(f"[OK] Train 12424 has {len(schedules)} station stoppages:")
for s in schedules:
    print(f"     Seq {s['station_sequence']}: Station {s['station_code']}, Pf {s['platform_number']}, KM {s['km_milestone']}, Arr: {s['scheduled_arrival_time']}, Dep: {s['scheduled_departure_time']}")

assert schedules[0]["station_code"] == "NDLS" and float(schedules[0]["km_milestone"]) == 0.0
assert schedules[-1]["station_code"] == "CNB" and float(schedules[-1]["km_milestone"]) == 440.2

# ----------------------------------------------------------------------
# 4. Query Live Train Running Positions & Geodetic Coordinates
# ----------------------------------------------------------------------
log_step("4. Querying Live Train Running Positions (GET /api/v1/trains/live/)")
status_live, live_res = http_request(f"{BASE_URL}/api/v1/trains/live/", headers=headers)
assert status_live == 200, f"Live status query failed: {live_res}"

active_trains = live_res["data"]["active_live_trains"]
assert len(active_trains) >= 12, f"Expected at least 12 live trains, got {len(active_trains)}"
print(f"[OK] Retrieved {len(active_trains)} live train telemetry records.")

# Verify geodetic WGS-84 coordinates
for trn in active_trains:
    t_num = trn["train_number"]
    lat = trn.get("latitude")
    lon = trn.get("longitude")
    heading = trn.get("heading")
    cur_sec = trn.get("current_section")
    km = float(trn["current_km"])
    speed = float(trn["speed_kmh"])
    status = trn["status"]
    
    if t_num in CANONICAL_12_TRAINS:
        assert lat is not None and 26.0 <= lat <= 29.0, f"Train {t_num} latitude {lat} outside corridor bounds"
        assert lon is not None and 77.0 <= lon <= 81.0, f"Train {t_num} longitude {lon} outside corridor bounds"
        assert heading is not None and 0.0 <= heading <= 360.0, f"Invalid heading {heading}"
        assert len(cur_sec) > 0, f"Train {t_num} missing current section"
        print(f"     Train {t_num:>9}: KM {km:>6.1f} | Lat={lat:.4f}, Lon={lon:.4f} | Heading={heading:>5.1f}° | Speed={speed:>5.1f} km/h | {status:<10} | {cur_sec}")

# ----------------------------------------------------------------------
# 5. Direction & Status Filtering
# ----------------------------------------------------------------------
log_step("5. Testing Telemetry Filters (direction=UP and status=ON_TIME)")
status_up, res_up = http_request(f"{BASE_URL}/api/v1/trains/live/?direction=UP", headers=headers)
assert status_up == 200
up_trains = res_up["data"]["active_live_trains"]
for t in up_trains:
    assert t["direction"] == "UP", f"Expected UP direction, got {t['direction']}"
print(f"[OK] UP Direction filter verified: {len(up_trains)} UP trains running.")

status_ontime, res_ontime = http_request(f"{BASE_URL}/api/v1/trains/live/?status=ON_TIME", headers=headers)
assert status_ontime == 200
ontime_trains = res_ontime["data"]["active_live_trains"]
for t in ontime_trains:
    assert t["status"] == "ON_TIME", f"Expected ON_TIME, got {t['status']}"
print(f"[OK] ON_TIME Status filter verified: {len(ontime_trains)} punctual trains.")

# ----------------------------------------------------------------------
# 6. Test Ingestion Worker API (POST /api/v1/trains/ingest/)
# ----------------------------------------------------------------------
log_step("6. Triggering Ingestion Worker via REST API (POST /api/v1/trains/ingest/)")
status_ingest, ingest_res = http_request(f"{BASE_URL}/api/v1/trains/ingest/", method="POST", headers=headers)
assert status_ingest == 200, f"Ingest trigger failed: {ingest_res}"
summary = ingest_res["data"]
print(f"[OK] Ingestion Worker executed successfully: {summary}")
assert summary["trains_processed"] >= 12
assert summary["schedules_created"] >= 60
assert summary["live_positions_updated"] >= 12

# ----------------------------------------------------------------------
# 7. Test Real-Time Telemetry Simulation Advance (POST /api/v1/trains/live/)
# ----------------------------------------------------------------------
log_step("7. Advancing Real-Time Train Telemetry Movement (Delta: 30 seconds)")
# Capture initial position of Vande Bharat (22436) right before simulation step
status_pre, res_pre = http_request(f"{BASE_URL}/api/v1/trains/live/", headers=headers)
assert status_pre == 200, f"Live status pre-simulation query failed: {res_pre}"
live_before = next(t for t in res_pre["data"]["active_live_trains"] if t["train_number"] == "22436")
km_before = float(live_before["current_km"])

status_step, step_res = http_request(
    f"{BASE_URL}/api/v1/trains/live/",
    method="POST",
    headers=headers,
    data={"delta_seconds": 60}
)
assert status_step == 200, f"Simulation step failed: {step_res}"
print(f"[OK] Simulation Step response: {step_res['data']}")

# Check updated position of Vande Bharat
status_after, after_res = http_request(f"{BASE_URL}/api/v1/trains/live/", headers=headers)
live_after = next(t for t in after_res["data"]["active_live_trains"] if t["train_number"] == "22436")
km_after = float(live_after["current_km"])

print(f"[OK] Train 22436 movement verified: KM {km_before:.3f} -> KM {km_after:.3f} (Advance: {km_after - km_before:.3f} km)")
assert km_after > km_before, f"Train 22436 should have moved forward, before={km_before}, after={km_after}"

# ----------------------------------------------------------------------
# 8. Direct PostgreSQL Database Audit
# ----------------------------------------------------------------------
log_step("8. Direct PostgreSQL Audit of trains_train, trains_trainschedule, trains_trainlivestatus")
cmd = [
    "docker", "exec", "railway_backend", "python", "manage.py", "shell", "-c",
    """
from apps.trains.models import Train, TrainSchedule, TrainLiveStatus
print(f'DB_AUDIT: trains={Train.objects.count()} schedules={TrainSchedule.objects.count()} live={TrainLiveStatus.objects.count()}')
"""
]
res = subprocess.run(cmd, capture_output=True, text=True, check=True)
for line in res.stdout.splitlines():
    if line.startswith("DB_AUDIT:"):
        print(f"[OK] PostgreSQL direct audit: {line}")
        break

print("\n" + "=" * 80)
print("ALL TSK-P2-05-BE TESTS COMPLETED SUCCESSFULLY! (100% PASS)")
print("=" * 80)
