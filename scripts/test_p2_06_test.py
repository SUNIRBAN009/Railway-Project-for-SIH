import json
import urllib.request
import urllib.error
import datetime
import sys

FRONTEND_URL = "http://localhost:3000"
BACKEND_URL = "http://127.0.0.1:8000"

def log_step(title):
    print("\n" + "=" * 80)
    print(f"STEP: {title}")
    print("=" * 80)

def http_request(url, method="GET", headers=None, data=None, timeout=10):
    if headers is None:
        headers = {}
    body_bytes = None
    if data is not None:
        body_bytes = json.dumps(data).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=body_bytes, headers=headers, method=method)
    try:
        resp = urllib.request.urlopen(req, timeout=timeout)
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
    except Exception as e:
        return None, str(e)

print("=" * 80)
print("RUNNING E2E TEST SUITE: TSK-P2-06-TEST")
print("VERIFYING GANG & EQUIPMENT ROSTERS, FRONTEND CONTRACTS & RULE 3 SAFETY")
print("=" * 80)

# ----------------------------------------------------------------------
# 1. Frontend Development Server Health Check
# ----------------------------------------------------------------------
log_step("1. Checking Frontend Development Server Health")
status_fe, res_fe = http_request(f"{FRONTEND_URL}/")
assert status_fe == 200, f"Frontend server unresponsive at {FRONTEND_URL}"
print(f"  [PASS] Frontend Vite/React application active at {FRONTEND_URL}")

# ----------------------------------------------------------------------
# 2. Multi-Department Authentication (ENG, TRD, SNT)
# ----------------------------------------------------------------------
log_step("2. Authenticating Multi-Department Personas (ENG, TRD, SNT)")
personas = [
    ("eng_track_pway", "ENG", "Civil Engineering Track Gangs"),
    ("trd_ohe_power", "TRD", "Traction Distribution Tower Wagons"),
    ("snt_signal_telecom", "SNT", "Signal & Interlocking Crews"),
]

tokens = {}
for username, dept, desc in personas:
    status_p, res_p = http_request(
        f"{BACKEND_URL}/api/v1/auth/login/",
        method="POST",
        data={"username": username, "password": "railway@123"}
    )
    if status_p != 200:
        status_p, res_p = http_request(
            f"{BACKEND_URL}/api/v1/auth/login/",
            method="POST",
            data={"username": username, "password": "Password123!"}
        )
    assert status_p == 200, f"Login failed for {username}: {res_p}"
    tokens[dept] = res_p["data"]["access_token"]
    print(f"  [PASS] {username} ({dept}) authenticated successfully -> {desc}")

# ----------------------------------------------------------------------
# 3. Verify Departmental Gang Segregation & Roster Metadata
# ----------------------------------------------------------------------
log_step("3. Verifying Departmental Gang Segregation & Roster Metadata")
for dept in ["ENG", "TRD", "SNT"]:
    status_g, res_g = http_request(
        f"{BACKEND_URL}/api/v1/departments/gangs/?department={dept}",
        headers={"Authorization": f"Bearer {tokens[dept]}"}
    )
    assert status_g == 200
    gangs = res_g.get("data", {}).get("gangs", [])
    print(f"  [INFO] Department [{dept}] returned {len(gangs)} gangs:")
    for g in gangs:
        print(f"         • {g['gang_number']} @ {g['headquarters_station']} | Crew: {g['crew_strength']} | Supervisor: {g['supervisor_name']}")
        assert g['department_code'] == dept
        assert g['crew_strength'] > 0
        assert g['is_active'] is True

print("  [PASS] All departmental gang rosters verified with valid foreign keys.")

# ----------------------------------------------------------------------
# 4. Verify Heavy Machinery Fitness & Certification Data
# ----------------------------------------------------------------------
log_step("4. Verifying Heavy Machinery Fitness & Certification Data")
status_eq, res_eq = http_request(
    f"{BACKEND_URL}/api/v1/departments/equipment/",
    headers={"Authorization": f"Bearer {tokens['ENG']}"}
)
assert status_eq == 200
equipment = res_eq.get("data", {}).get("equipment", [])
assert len(equipment) >= 5

required_types = {
    "TRACK_TAMPER_CSM",
    "BALLAST_CLEANER_BCM",
    "DYNAMIC_TRACK_STABILIZER",
    "OHE_TOWER_WAGON",
    "USFD_TROLLEY"
}
present_types = {e['equipment_type'] for e in equipment}
missing_types = required_types - present_types
assert not missing_types, f"Missing required equipment types: {missing_types}"

for eq in equipment:
    print(f"  [INFO] Machine: {eq['equipment_code']} ({eq['equipment_name']})")
    print(f"         Type: {eq['equipment_type_display']} | Depot: {eq['home_depot']} | Fitness: {eq['fitness_expiry_date']}")
    assert eq['is_fit'] is True, f"Equipment {eq['equipment_code']} should be fit"

print("  [PASS] All 5 heavy equipment types verified with active fitness status.")

# ----------------------------------------------------------------------
# 5. Verify Rule 3 Travel Physics (Relocation speed > 40 km/h)
# ----------------------------------------------------------------------
log_step("5. Verifying Rule 3 40km/h Relocation Physics Rejection")
import random
now = datetime.datetime.now(datetime.timezone.utc)
offset_days = random.randint(70, 120)
target_day = now + datetime.timedelta(days=offset_days)

# Site 1: KM 0.0 to 2.0 at 02:00 - 04:00 UTC
t1_start = target_day.replace(hour=2, minute=0, second=0, microsecond=0)
t1_end = target_day.replace(hour=4, minute=0, second=0, microsecond=0)

# Site 2: KM 25.0 to 28.0 at 04:10 - 05:00 UTC (23.0 km relocation gap in 10 mins = 138 km/h > 40 km/h!)
t2_start = target_day.replace(hour=4, minute=10, second=0, microsecond=0)
t2_end = target_day.replace(hour=5, minute=0, second=0, microsecond=0)

test_gang = "GANG-ENG-PWAY-07"

# First block submission
status_block1, res_block1 = http_request(
    f"{BACKEND_URL}/api/v1/blocks/proposals/",
    method="POST",
    headers={"Authorization": f"Bearer {tokens['ENG']}"},
    data={
        "corridor_code": "NDLS-GZB-UP",
        "line_type": "UP",
        "work_type": "TRACK_TAMPING",
        "start_km": 0.0,
        "end_km": 2.0,
        "scheduled_start_time": t1_start.isoformat(),
        "scheduled_end_time": t1_end.isoformat(),
        "department_code": "ENG",
        "gang_id": test_gang,
        "equipment_required": "CSM-NR-092",
        "work_description": "Initial block at Site 1 (KM 0-2).",
    }
)
assert status_block1 == 201, f"Initial block failed: {res_block1}"
print(f"  [PASS] Block 1 created at KM 0-2 (02:00 - 04:00 UTC) for {test_gang}")

# Second block submission with impossible travel physics (23km in 10 mins)
status_block2, res_block2 = http_request(
    f"{BACKEND_URL}/api/v1/blocks/proposals/",
    method="POST",
    headers={"Authorization": f"Bearer {tokens['ENG']}"},
    data={
        "corridor_code": "NDLS-GZB-UP",
        "line_type": "UP",
        "work_type": "TRACK_TAMPING",
        "start_km": 25.0,
        "end_km": 28.0,
        "scheduled_start_time": t2_start.isoformat(),
        "scheduled_end_time": t2_end.isoformat(),
        "department_code": "ENG",
        "gang_id": test_gang,
        "equipment_required": "DTS-NR-62N",
        "work_description": "Impossible relocation block (23km in 10 mins).",
    }
)
assert status_block2 == 400, f"Expected HTTP 400 for travel physics violation, got {status_block2}"
err_msg = res_block2.get("error", {}).get("message", "")
print(f"  [PASS] Travel Physics Violation enforced correctly!")
print(f"         Rejection Message: {err_msg}")
assert "Travel Physics Violation" in err_msg or "40.0 km/h" in err_msg or "relocate" in err_msg

print("\n" + "=" * 80)
print("[SUCCESS] ALL TSK-P2-06-TEST E2E VERIFICATION CHECKS PASSED (100% VERIFIED)")
print("=" * 80)
