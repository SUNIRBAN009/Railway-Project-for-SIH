import json
import urllib.request
import urllib.error

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
print("TESTING TSK-P2-02-BE: BLOCK MODEL & POST /api/v1/blocks/ API WITH COHERENCE ENGINE")
print("=" * 80)

# ----------------------------------------------------------------------
# 1. Authenticate Personas (Engineer & Controller)
# ----------------------------------------------------------------------
log_step("1. Authenticating Track Engineer (eng_track_pway) and Controller (coa_delhi_chief)")
status_eng, body_eng = http_request(
    f"{BASE_URL}/api/v1/auth/login/",
    method="POST",
    data={"username": "eng_track_pway", "password": "railway@123"}
)
assert status_eng == 200, f"Engineer login failed: {body_eng}"
eng_token = body_eng["data"]["access_token"]
print("[OK] Track Engineer authenticated (Token issued)")

status_coa, body_coa = http_request(
    f"{BASE_URL}/api/v1/auth/login/",
    method="POST",
    data={"username": "coa_delhi_chief", "password": "railway@123"}
)
assert status_coa == 200, f"COA login failed: {body_coa}"
coa_token = body_coa["data"]["access_token"]
print("[OK] Chief Controller authenticated (Token issued)")

# ----------------------------------------------------------------------
# 2. Test RBAC Enforcement on Block Proposal Creation
# ----------------------------------------------------------------------
log_step("2. Testing RBAC Role Separation of Duties on POST /api/v1/blocks/")
proposal_payload = {
    "corridor": "NDLS-CNB-MAIN",
    "department": "ENG",
    "line_type": "DOWN",
    "work_type": "Track Tamping (CSM)",
    "start_km": 14.2,
    "end_km": 18.5,
    "scheduled_start_time": "2026-09-20T02:00:00+05:30",
    "scheduled_end_time": "2026-09-20T05:00:00+05:30",
    "gang_id": "GANG-ENG-01",
    "equipment_required": "CSM-09-32",
    "work_description": "Verification of block submission"
}

# 2a. Unauthenticated -> 401 Unauthorized
status_anon, body_anon = http_request(
    f"{BASE_URL}/api/v1/blocks/",
    method="POST",
    data=proposal_payload
)
print(f"Anonymous Request: HTTP {status_anon}")
assert status_anon == 401, f"Expected 401, got {status_anon}"
print("[OK] Unauthenticated submission correctly rejected with HTTP 401")

# 2b. Chief Controller (Can approve, cannot request) -> 403 Forbidden
status_coa_req, body_coa_req = http_request(
    f"{BASE_URL}/api/v1/blocks/",
    method="POST",
    headers={"Authorization": f"Bearer {coa_token}"},
    data=proposal_payload
)
print(f"Chief Controller Request: HTTP {status_coa_req}")
assert status_coa_req == 403, f"Expected 403 Forbidden for COA, got {status_coa_req}"
print("[OK] Chief Controller submission correctly rejected with HTTP 403 (Separation of duties)")

# ----------------------------------------------------------------------
# 3. Test Coherence Rule 1: Geography Violations
# ----------------------------------------------------------------------
log_step("3. Testing Coherence Rule 1 Rejection (Out-of-Bounds & Reversed Chainage)")
# 3a. Out-of-bounds KM (> 440.2)
r1_out_of_bounds = proposal_payload.copy()
r1_out_of_bounds["start_km"] = 445.0
r1_out_of_bounds["end_km"] = 460.0

status_r1_oob, body_r1_oob = http_request(
    f"{BASE_URL}/api/v1/blocks/",
    method="POST",
    headers={"Authorization": f"Bearer {eng_token}"},
    data=r1_out_of_bounds
)
print(f"Rule 1 Out-of-Bounds Request: HTTP {status_r1_oob}")
assert status_r1_oob == 400, f"Expected 400, got {status_r1_oob}"
print(f"  * Error details: {body_r1_oob.get('error', {}).get('details')}")
print("[OK] Out-of-bounds chainage rejected by Coherence validator")

# 3b. Reverse chainage (start_km >= end_km)
r1_reversed = proposal_payload.copy()
r1_reversed["start_km"] = 35.0
r1_reversed["end_km"] = 20.0

status_r1_rev, body_r1_rev = http_request(
    f"{BASE_URL}/api/v1/blocks/",
    method="POST",
    headers={"Authorization": f"Bearer {eng_token}"},
    data=r1_reversed
)
print(f"Rule 1 Reversed Chainage Request: HTTP {status_r1_rev}")
assert status_r1_rev == 400, f"Expected 400, got {status_r1_rev}"
print(f"  * Error details: {body_r1_rev.get('error', {}).get('details')}")
print("[OK] Reverse chainage rejected by Coherence validator")

# ----------------------------------------------------------------------
# 4. Test Coherence Rule 2: Temporal Violations
# ----------------------------------------------------------------------
log_step("4. Testing Coherence Rule 2 Rejection (Excessive Duration > 8.0 hrs)")
r2_excessive = proposal_payload.copy()
r2_excessive["scheduled_start_time"] = "2026-09-20T02:00:00+05:30"
r2_excessive["scheduled_end_time"] = "2026-09-20T11:00:00+05:30"  # 9 hours

status_r2, body_r2 = http_request(
    f"{BASE_URL}/api/v1/blocks/",
    method="POST",
    headers={"Authorization": f"Bearer {eng_token}"},
    data=r2_excessive
)
print(f"Rule 2 Excessive Duration Request: HTTP {status_r2}")
assert status_r2 == 400, f"Expected 400, got {status_r2}"
print(f"  * Error details: {body_r2.get('error', {}).get('details')}")
print("[OK] Excessive block duration (>8h) rejected by Coherence validator")

# ----------------------------------------------------------------------
# 5. Test Valid Block Proposal Submission & Database Persistence
# ----------------------------------------------------------------------
log_step("5. Testing Valid Block Proposal Submission & Conflict Sweep Execution")
status_valid, body_valid = http_request(
    f"{BASE_URL}/api/v1/blocks/",
    method="POST",
    headers={"Authorization": f"Bearer {eng_token}"},
    data=proposal_payload
)
print(f"Valid Block Proposal Request: HTTP {status_valid}")
assert status_valid == 201, f"Expected 201 Created, got {status_valid}: {body_valid}"
assert body_valid.get("success") is True, "Expected success: true"

created_block = body_valid["data"]
print(f"[OK] Block successfully created in database:")
print(f"  * Block Code:    {created_block['block_code']}")
print(f"  * Corridor:      {created_block['corridor_code']} ({created_block['corridor_name']})")
print(f"  * Chainage:      KM {created_block['start_km']} to KM {created_block['end_km']} ({created_block['span_km']} km)")
print(f"  * Status:        {created_block['status']} ({created_block['status_display']})")
print(f"  * Department:    {created_block['department_code']}")
print(f"  * Duration:      {created_block['duration_hours']} hours")
print(f"  * Sweep Report:  {created_block['sweep_report']['total_conflicts']} conflicts evaluated")

# ----------------------------------------------------------------------
# 6. Verify Persistence by Retrieving from GET /api/v1/blocks/<id>/
# ----------------------------------------------------------------------
log_step("6. Verifying Database Persistence via GET /api/v1/blocks/<id>/")
block_id = created_block["id"]
status_get, body_get = http_request(
    f"{BASE_URL}/api/v1/blocks/{block_id}/",
    headers={"Authorization": f"Bearer {eng_token}"}
)
assert status_get == 200, f"Expected 200, got {status_get}"
retrieved = body_get["data"]
assert retrieved["block_code"] == created_block["block_code"]
assert retrieved["status"] in ["PENDING_APPROVAL", "COORDINATED", "CONFLICT_DETECTED"]
print(f"[OK] Block retrieved from database matching block_code: {retrieved['block_code']}")

# ----------------------------------------------------------------------
# 7. Clean up Test Block to Maintain Test Idempotency
# ----------------------------------------------------------------------
log_step("7. Cleaning up Test Block via POST /api/v1/blocks/<id>/cancel/")
status_cancel, _ = http_request(
    f"{BASE_URL}/api/v1/blocks/{block_id}/cancel/",
    method="POST",
    headers={"Authorization": f"Bearer {eng_token}"}
)
assert status_cancel == 200, f"Expected 200, got {status_cancel}"
print(f"[OK] Test block {retrieved['block_code']} cancelled to maintain clean test state.")

print("\n" + "=" * 80)
print("ALL TSK-P2-02-BE VERIFICATION CHECKS PASSED (100%)")
print("=" * 80)
