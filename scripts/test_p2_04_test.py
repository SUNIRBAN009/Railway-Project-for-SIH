import json
import urllib.request
import urllib.error
import subprocess
import sys

FRONTEND_URL = "http://localhost:3000"
BACKEND_URL = "http://127.0.0.1:8000"

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
            import re
            m = re.search(r'<title>(.*?)</title>', resp_body, re.DOTALL)
            title = m.group(1).strip() if m else resp_body[:200]
            return e.code, f"HTML_ERROR: {title}"

def verify_db_block(block_id, expected_status, expected_version):
    cmd = [
        "docker", "exec", "railway_backend", "python", "manage.py", "shell", "-c",
        f"""
from apps.blocks.models import Block
b = Block.objects.get(id='{block_id}')
print(f'DB_CHECK: status={{b.status}} version={{b.version}}')
"""
    ]
    res = subprocess.run(cmd, capture_output=True, text=True, check=True)
    for line in res.stdout.splitlines():
        if line.startswith("DB_CHECK:"):
            parts = line.replace("DB_CHECK:", "").strip().split()
            status = parts[0].split("=")[1]
            version = int(parts[1].split("=")[1])
            assert status == expected_status, f"DB status mismatch: expected {expected_status}, got {status}"
            assert version == expected_version, f"DB version mismatch: expected {expected_version}, got {version}"
            print(f"[OK] Database direct check verified: status={status}, version={version}")
            return True
    raise AssertionError(f"Could not verify DB block: {res.stdout}")


print("=" * 80)
print("RUNNING E2E TEST SUITE: TSK-P2-04-TEST")
print("COA COMMAND CONSOLE SANCTIONING, OPTIMISTIC LOCKING (VERSION) & HTTP 409 CONFLICT")
print("=" * 80)

# ----------------------------------------------------------------------
# 1. Authenticate Personas via Frontend Proxy (Port 3000)
# ----------------------------------------------------------------------
log_step("1. Authenticating Chief Controller (COA) & Track Engineer (ENG) via Frontend Proxy")
status_coa, login_coa = http_request(
    f"{FRONTEND_URL}/api/v1/auth/login/",
    method="POST",
    data={"username": "chief_controller", "password": "Password123!"}
)
assert status_coa == 200, f"COA Login failed: {login_coa}"
coa_token = login_coa["data"]["access_token"]
coa_role = login_coa["data"]["user"]["role"]
print(f"[OK] Chief Controller authenticated via Frontend (Role: {coa_role})")
assert coa_role == "CHIEF_CONTROLLER", f"Expected role CHIEF_CONTROLLER, got {coa_role}"

status_eng, login_eng = http_request(
    f"{FRONTEND_URL}/api/v1/auth/login/",
    method="POST",
    data={"username": "eng_track_pway", "password": "railway@123"}
)
assert status_eng == 200, f"ENG Login failed: {login_eng}"
eng_token = login_eng["data"]["access_token"]
print("[OK] Track Engineer authenticated via Frontend")

# ----------------------------------------------------------------------
# 2. Submit Fresh Block Proposal via Frontend Proxy
# ----------------------------------------------------------------------
log_step("2. Submitting Fresh Block Proposal via Frontend Proxy")
proposal_payload = {
    "corridor": "NDLS-CNB-MAIN",
    "department": "ENG",
    "line_type": "DOWN",
    "work_type": "TRACK_TAMPING",
    "start_km": 150.000,
    "end_km": 153.500,
    "scheduled_start_time": "2026-09-23T02:00:00+05:30",
    "scheduled_end_time": "2026-09-23T05:00:00+05:30",
    "gang_id": "GANG-ENG-01",
    "equipment_required": "CSM-09-32",
    "work_description": "Night Shift Track Tamping between KM 150 and 153.5"
}

status_prop, resp_prop = http_request(
    f"{FRONTEND_URL}/api/v1/blocks/proposals/",
    method="POST",
    headers={"Authorization": f"Bearer {eng_token}"},
    data=proposal_payload
)
assert status_prop == 201, f"Proposal creation failed: {resp_prop}"
block_1 = resp_prop["data"]
block_1_id = block_1["id"]
block_1_code = block_1["block_code"]
initial_version = block_1.get("version", 1)
print(f"[OK] Block Proposal Created: {block_1_code} (UUID: {block_1_id})")
print(f"[OK] Initial Concurrency Version: v{initial_version}")
assert initial_version == 1, f"Initial version must be 1, got {initial_version}"

# ----------------------------------------------------------------------
# 3. Verify RBAC Guard: Separation of Duties via Frontend Proxy
# ----------------------------------------------------------------------
log_step("3. Verifying RBAC Separation of Duties (ENG Engineer cannot sanction)")
status_unauth, resp_unauth = http_request(
    f"{FRONTEND_URL}/api/v1/blocks/{block_1_id}/sanction/",
    method="POST",
    headers={"Authorization": f"Bearer {eng_token}"},
    data={"action": "SANCTION", "version": 1, "remarks": "Engineer self-sanction attempt"}
)
print(f"Engineer Sanction Response: HTTP {status_unauth}")
assert status_unauth == 403, f"Expected HTTP 403 Forbidden, got {status_unauth}: {resp_unauth}"
print(f"[OK] RBAC Security Guard: Departmental Engineer blocked with HTTP 403 Forbidden: {resp_unauth.get('error', {}).get('message', '')}")

# ----------------------------------------------------------------------
# 4. Chief Controller Full Sanction via Frontend Proxy
# ----------------------------------------------------------------------
log_step("4. Chief Controller Sanctions Block via Frontend Proxy (Version increments 1 -> 2)")
sanction_payload = {
    "action": "SANCTION",
    "version": 1,
    "remarks": "Sanctioned by Chief Operating Controller via COA Command Console."
}
status_sanc, resp_sanc = http_request(
    f"{FRONTEND_URL}/api/v1/blocks/{block_1_id}/sanction/",
    method="POST",
    headers={"Authorization": f"Bearer {coa_token}"},
    data=sanction_payload
)
assert status_sanc == 200, f"COA Sanction failed: {resp_sanc}"
sanctioned_data = resp_sanc["data"]
new_version = sanctioned_data.get("version")
new_status = sanctioned_data.get("status")

print(f"Sanction Response: HTTP {status_sanc}")
print(f"[OK] Status transition verified: {new_status}")
print(f"[OK] Concurrency Version incremented: v{initial_version} -> v{new_version}")
assert new_status == "SANCTIONED", f"Expected status SANCTIONED, got {new_status}"
assert new_version == 2, f"Expected version 2, got {new_version}"

# ----------------------------------------------------------------------
# 5. Direct Database Persistence Check (PostgreSQL)
# ----------------------------------------------------------------------
log_step("5. Direct PostgreSQL Persistence Audit of apps_blocks_block")
verify_db_block(block_1_id, expected_status="SANCTIONED", expected_version=2)

# ----------------------------------------------------------------------
# 6. Optimistic Concurrency Collision Test (HTTP 409 Conflict)
# ----------------------------------------------------------------------
log_step("6. Testing Optimistic Concurrency Conflict (Submitting Stale version: 1)")
# A concurrent tab or another controller submits stale version 1
stale_payload = {
    "action": "SANCTION",
    "version": 1,
    "remarks": "Concurrent tab attempt with stale version 1"
}
status_conflict, resp_conflict = http_request(
    f"{FRONTEND_URL}/api/v1/blocks/{block_1_id}/sanction/",
    method="POST",
    headers={"Authorization": f"Bearer {coa_token}"},
    data=stale_payload
)
print(f"Concurrent Collision Response: HTTP {status_conflict}")
assert status_conflict == 409, f"Expected HTTP 409 Conflict, got {status_conflict}: {resp_conflict}"

err_info = resp_conflict.get("error", {})
err_code = err_info.get("code")
err_msg = err_info.get("message", "")
err_details = err_info.get("details", {})

print(f"[OK] HTTP 409 Conflict confirmed!")
print(f"     Error Code: {err_code}")
print(f"     Message: {err_msg}")
print(f"     Details: {err_details}")

assert err_code == "BLK-409", f"Expected code BLK-409, got {err_code}"
assert "Concurrency Conflict" in err_msg, f"Expected 'Concurrency Conflict' in message, got {err_msg}"
assert err_details.get("current_version") == 2, f"Expected current_version 2, got {err_details.get('current_version')}"
assert err_details.get("submitted_version") == 1, f"Expected submitted_version 1, got {err_details.get('submitted_version')}"

# ----------------------------------------------------------------------
# 7. Conditional Sanction with Speed Cap via Frontend Proxy
# ----------------------------------------------------------------------
log_step("7. Testing Conditional Sanction with Caution Order Speed Cap via Frontend Proxy")
# Create block 2
prop2_payload = {
    "corridor": "NDLS-CNB-MAIN",
    "department": "ENG",
    "line_type": "DOWN",
    "work_type": "RAIL_RENEWAL",
    "start_km": 160.000,
    "end_km": 162.000,
    "scheduled_start_time": "2026-09-23T01:30:00+05:30",
    "scheduled_end_time": "2026-09-23T04:30:00+05:30",
    "work_description": "Through Rail Renewal KM 160-162"
}
status_p2, resp_p2 = http_request(
    f"{FRONTEND_URL}/api/v1/blocks/proposals/",
    method="POST",
    headers={"Authorization": f"Bearer {eng_token}"},
    data=prop2_payload
)
assert status_p2 == 201, f"Proposal 2 creation failed: {resp_p2}"
block_2_id = resp_p2["data"]["id"]

# Conditional Sanction with speed restriction 45 km/h
cond_payload = {
    "action": "CONDITIONAL_SANCTION",
    "version": 1,
    "caution_speed": 45,
    "remarks": "Caution order 45 km/h enforced. S&T supervisor must remain on-site."
}
status_cond, resp_cond = http_request(
    f"{FRONTEND_URL}/api/v1/blocks/{block_2_id}/sanction/",
    method="POST",
    headers={"Authorization": f"Bearer {coa_token}"},
    data=cond_payload
)
print(f"Conditional Sanction Response: HTTP {status_cond}")
assert status_cond == 200, f"Conditional Sanction failed: {resp_cond}"
cond_data = resp_cond["data"]
assert cond_data["status"] == "SANCTIONED", f"Expected status SANCTIONED, got {cond_data['status']}"
assert cond_data["version"] == 2, f"Expected version 2, got {cond_data['version']}"
caution_id = cond_data.get("caution_order_id", "")
print(f"[OK] Conditional sanction granted with Caution Order ID: {caution_id}")
assert len(caution_id) > 0, "Caution order ID must be generated"
verify_db_block(block_2_id, expected_status="SANCTIONED", expected_version=2)

# ----------------------------------------------------------------------
# 8. Return for Revision / Rejection via Frontend Proxy
# ----------------------------------------------------------------------
log_step("8. Testing Chief Controller Proposal Rejection / Return for Revision")
# Create block 3
prop3_payload = {
    "corridor": "NDLS-CNB-MAIN",
    "department": "ENG",
    "line_type": "DOWN",
    "work_type": "BALLAST_CLEANING",
    "start_km": 170.000,
    "end_km": 172.500,
    "scheduled_start_time": "2026-09-23T20:00:00+05:30",
    "scheduled_end_time": "2026-09-23T23:30:00+05:30",
    "work_description": "Evening Ballast Cleaning"
}
status_p3, resp_p3 = http_request(
    f"{FRONTEND_URL}/api/v1/blocks/proposals/",
    method="POST",
    headers={"Authorization": f"Bearer {eng_token}"},
    data=prop3_payload
)
assert status_p3 == 201, f"Proposal 3 creation failed: {resp_p3}"
block_3_id = resp_p3["data"]["id"]

reject_reason = "Peak evening Rajdhani/Shatabdi corridor congestion. Reschedule to night window (01:00-05:00)."
reject_payload = {
    "action": "REJECT",
    "version": 1,
    "remarks": reject_reason
}
status_rej, resp_rej = http_request(
    f"{FRONTEND_URL}/api/v1/blocks/{block_3_id}/sanction/",
    method="POST",
    headers={"Authorization": f"Bearer {coa_token}"},
    data=reject_payload
)
print(f"Rejection Response: HTTP {status_rej}")
assert status_rej == 200, f"Proposal rejection failed: {resp_rej}"
rej_data = resp_rej["data"]
assert rej_data["status"] == "REJECTED", f"Expected status REJECTED, got {rej_data['status']}"
assert rej_data["version"] == 2, f"Expected version 2, got {rej_data['version']}"
assert rej_data.get("rejection_reason") == reject_reason, f"Rejection reason mismatch: {rej_data.get('rejection_reason')}"
print(f"[OK] Block successfully REJECTED. Reason recorded: {rej_data.get('rejection_reason')}")
verify_db_block(block_3_id, expected_status="REJECTED", expected_version=2)

# ----------------------------------------------------------------------
# 9. Verify Live List Endpoint via Frontend Proxy
# ----------------------------------------------------------------------
log_step("9. Verifying Live Blocks List via Frontend Proxy (Port 3000)")
status_list, resp_list = http_request(
    f"{FRONTEND_URL}/api/v1/blocks/",
    method="GET",
    headers={"Authorization": f"Bearer {coa_token}"}
)
assert status_list == 200, f"Blocks list failed: {resp_list}"
blocks_list = resp_list["data"]
print(f"[OK] Successfully queried live blocks list via Vite proxy: {len(blocks_list)} blocks retrieved")

# Locate block 1 and verify version is 2
retrieved_b1 = next((b for b in blocks_list if b["id"] == block_1_id), None)
assert retrieved_b1 is not None, f"Block {block_1_id} not found in live list"
assert retrieved_b1["version"] == 2, f"Expected version 2 in list, got {retrieved_b1['version']}"
assert retrieved_b1["status"] == "SANCTIONED", f"Expected status SANCTIONED in list, got {retrieved_b1['status']}"
print(f"[OK] Live list verifies block {block_1_code}: status={retrieved_b1['status']}, version=v{retrieved_b1['version']}")

print("\n" + "=" * 80)
print("ALL TSK-P2-04-TEST E2E TESTS COMPLETED SUCCESSFULLY! (100% PASS)")
print("=" * 80)
