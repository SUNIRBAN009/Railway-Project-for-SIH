import json
import urllib.request
import urllib.error
import datetime
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
    except Exception as e:
        return None, str(e)

print("=" * 80)
print("RUNNING AUTOMATED TEST SUITE: TSK-P2-06-BE")
print("DEPARTMENTAL GANG ROSTERS, HEAVY EQUIPMENT READINESS & RULE 3 EXCLUSIVITY")
print("=" * 80)

# ----------------------------------------------------------------------
# 1. Authenticate P-Way Track Engineer Persona
# ----------------------------------------------------------------------
log_step("1. Authenticating P-Way Track Engineer Persona (eng_track_pway)")
status_login, login_res = http_request(
    f"{BASE_URL}/api/v1/auth/login/",
    method="POST",
    data={"username": "eng_track_pway", "password": "railway@123"}
)
if status_login != 200:
    status_login, login_res = http_request(
        f"{BASE_URL}/api/v1/auth/login/",
        method="POST",
        data={"username": "eng_track_pway", "password": "Password123!"}
    )
assert status_login == 200, f"Login failed: {login_res}"
token = login_res["data"]["access_token"]
auth_headers = {"Authorization": f"Bearer {token}"}
print(f"  [PASS] Authenticated successfully as eng_track_pway. Token received.")

# ----------------------------------------------------------------------
# 2. Query Gang Rosters (6 Seeded Gangs)
# ----------------------------------------------------------------------
log_step("2. Querying Gang Rosters (Checking 6 Master Seeded Gangs)")
status_gangs, gangs_res = http_request(
    f"{BASE_URL}/api/v1/departments/gangs/",
    headers=auth_headers
)
assert status_gangs == 200, f"Failed to get gangs: {gangs_res}"
gangs_data = gangs_res.get("data", {}).get("gangs", [])
gang_count = gangs_res.get("data", {}).get("count", 0)
print(f"  [INFO] Total Gangs Returned: {gang_count}")
for g in gangs_data:
    print(f"    - Gang: {g['gang_number']} | Dept: {g['department_code']} | HQ: {g['headquarters_station']} | Crew: {g['crew_strength']}")

assert gang_count >= 6, f"Expected at least 6 gangs, got {gang_count}"

# Verify department filter
status_eng_gangs, eng_gangs_res = http_request(
    f"{BASE_URL}/api/v1/departments/gangs/?department=ENG",
    headers=auth_headers
)
assert status_eng_gangs == 200
eng_gangs = eng_gangs_res.get("data", {}).get("gangs", [])
assert all(g['department_code'] == 'ENG' for g in eng_gangs), "Department filter failed"
print(f"  [PASS] Department filter verified ({len(eng_gangs)} ENG gangs found).")

# Verify station filter
status_aljn_gangs, aljn_gangs_res = http_request(
    f"{BASE_URL}/api/v1/departments/gangs/?station=ALJN",
    headers=auth_headers
)
assert status_aljn_gangs == 200
aljn_gangs = aljn_gangs_res.get("data", {}).get("gangs", [])
assert len(aljn_gangs) >= 1, "Expected gang at ALJN station"
print(f"  [PASS] Station filter verified ({aljn_gangs[0]['gang_number']} located at ALJN).")

# ----------------------------------------------------------------------
# 3. Query Heavy Machinery Readiness (5 Seeded Machines)
# ----------------------------------------------------------------------
log_step("3. Querying Heavy Maintenance Equipment (Checking 5 Heavy Track Machines)")
status_eq, eq_res = http_request(
    f"{BASE_URL}/api/v1/departments/equipment/",
    headers=auth_headers
)
assert status_eq == 200, f"Failed to get equipment: {eq_res}"
equipment_data = eq_res.get("data", {}).get("equipment", [])
eq_count = eq_res.get("data", {}).get("count", 0)
print(f"  [INFO] Total Heavy Machinery Returned: {eq_count}")
for eq in equipment_data:
    print(f"    - Machine: {eq['equipment_code']} | Name: {eq['equipment_name']} | Type: {eq['equipment_type']} | Status: {eq['operational_status']} | Fit: {eq['is_fit']}")

assert eq_count >= 5, f"Expected at least 5 machines, got {eq_count}"

# Check fit_only filter
status_fit, fit_res = http_request(
    f"{BASE_URL}/api/v1/departments/equipment/?fit_only=true",
    headers=auth_headers
)
assert status_fit == 200
fit_machines = fit_res.get("data", {}).get("equipment", [])
assert all(m['operational_status'] == 'AVAILABLE' and m['is_fit'] for m in fit_machines), "Fit-only filter failed"
print(f"  [PASS] Equipment readiness filter verified ({len(fit_machines)} machines certified fit).")

# ----------------------------------------------------------------------
# 4. Submit Primary Block Reserving Gang & Track Tamper
# ----------------------------------------------------------------------
log_step("4. Submitting Primary Block Proposal with Gang & Track Tamper Reservation")
import random
now = datetime.datetime.now(datetime.timezone.utc)
# Use a random day offset in the future to isolate test executions
future_days = random.randint(15, 60)
tomorrow = now + datetime.timedelta(days=future_days)
# Window: 02:00 to 05:00 UTC
t_start = tomorrow.replace(hour=2, minute=0, second=0, microsecond=0)
t_end = tomorrow.replace(hour=5, minute=0, second=0, microsecond=0)

target_gang = "GANG-ENG-PWAY-04"
target_machine = "CSM-NR-092"

primary_block_payload = {
    "corridor_code": "NDLS-GZB-UP",
    "line_type": "UP",
    "work_type": "TRACK_TAMPING",
    "start_km": 10.0,
    "end_km": 14.5,
    "scheduled_start_time": t_start.isoformat(),
    "scheduled_end_time": t_end.isoformat(),
    "department_code": "ENG",
    "gang_id": target_gang,
    "equipment_required": target_machine,
    "work_description": "Scheduled P-Way track tamping using Continuous Action Tamper CSM-NR-092.",
}

status_b1, res_b1 = http_request(
    f"{BASE_URL}/api/v1/blocks/proposals/",
    method="POST",
    headers=auth_headers,
    data=primary_block_payload
)
assert status_b1 == 201, f"Primary block submission failed ({status_b1}): {res_b1}"
block_code_1 = res_b1["data"]["block_code"]
print(f"  [PASS] Primary Block Proposal submitted: {block_code_1}")
print(f"         Assigned Gang: {target_gang} | Machine: {target_machine}")
print(f"         Time Window: {t_start.strftime('%Y-%m-%d %H:%M')} to {t_end.strftime('%H:%M')} UTC")

# ----------------------------------------------------------------------
# 5. Verify Temporal Availability Query Excludes Booked Gang
# ----------------------------------------------------------------------
log_step("5. Verifying Temporal Availability Query Excludes Booked Gang")
import urllib.parse
start_enc = urllib.parse.quote(t_start.isoformat())
end_enc = urllib.parse.quote(t_end.isoformat())
status_avail, res_avail = http_request(
    f"{BASE_URL}/api/v1/departments/gangs/?start_time={start_enc}&end_time={end_enc}",
    headers=auth_headers
)
assert status_avail == 200
available_gangs = res_avail.get("data", {}).get("gangs", [])
available_numbers = [g['gang_number'] for g in available_gangs]
assert target_gang not in available_numbers, f"Booked gang {target_gang} should NOT appear in available list for window!"
print(f"  [PASS] Temporal query verified: Gang '{target_gang}' is correctly excluded from available list during booked window.")

# ----------------------------------------------------------------------
# 6. Attempt Overlapping Double-Booking (Rule 3 Enforcement)
# ----------------------------------------------------------------------
log_step("6. Attempting Conflicting Block Submission with Double-Booked Gang (Rule 3 Enforcement)")
# Overlapping window: 03:30 to 06:30 UTC (overlaps with 02:00 - 05:00)
overlap_start = tomorrow.replace(hour=3, minute=30, second=0, microsecond=0)
overlap_end = tomorrow.replace(hour=6, minute=30, second=0, microsecond=0)

conflicting_block_payload = {
    "corridor_code": "NDLS-GZB-UP",
    "line_type": "UP",
    "work_type": "TRACK_TAMPING",
    "start_km": 18.0,
    "end_km": 22.0,
    "scheduled_start_time": overlap_start.isoformat(),
    "scheduled_end_time": overlap_end.isoformat(),
    "department_code": "ENG",
    "gang_id": target_gang,  # Intentional double-booking of same gang!
    "equipment_required": "BCM-NR-104",
    "work_description": "Unauthorized concurrent block attempt violating Rule 3 exclusivity.",
}

status_b2, res_b2 = http_request(
    f"{BASE_URL}/api/v1/blocks/proposals/",
    method="POST",
    headers=auth_headers,
    data=conflicting_block_payload
)

print(f"  [INFO] Conflicting Block HTTP Response Status: {status_b2}")
print(f"  [INFO] Conflicting Block Response Payload: {res_b2}")

assert status_b2 == 400, f"Expected HTTP 400 for double-booking, got {status_b2}"
error_code = res_b2.get("error", {}).get("code", "")
error_msg = res_b2.get("error", {}).get("message", "")

assert "RULE-3" in error_code or "Resource Exclusivity" in error_msg or "double-booked" in error_msg.lower(), (
    f"Expected Rule 3 violation error, received: {res_b2}"
)
print(f"  [PASS] Rule 3 Resource Exclusivity successfully enforced!")
print(f"         Rejection Code: {error_code}")
print(f"         Rejection Message: {error_msg}")

print("\n" + "=" * 80)
print("[SUCCESS] ALL TSK-P2-06-BE AUTOMATED AUDIT CHECKS PASSED (100% VERIFIED)")
print("=" * 80)
