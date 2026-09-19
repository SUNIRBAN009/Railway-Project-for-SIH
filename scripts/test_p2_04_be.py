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
            import re
            m = re.search(r'<title>(.*?)</title>', resp_body, re.DOTALL)
            title = m.group(1).strip() if m else resp_body[:200]
            return e.code, f"HTML_ERROR: {title}"

print("=" * 80)
print("TESTING TSK-P2-04-BE: CHIEF CONTROLLER SANCTION API & OPTIMISTIC CONCURRENCY LOCKING")
print("=" * 80)

# ----------------------------------------------------------------------
# 1. Authenticate Personas (Engineer & Chief Controller)
# ----------------------------------------------------------------------
log_step("1. Authenticating Track Engineer (ENG) and Chief Controller (COA)")
status_eng, body_eng = http_request(
    f"{BASE_URL}/api/v1/auth/login/",
    method="POST",
    data={"username": "eng_track_pway", "password": "railway@123"}
)
assert status_eng == 200, f"ENG Login failed: {body_eng}"
eng_token = body_eng["data"]["access_token"]
print("[OK] Track Engineer (ENG) authenticated")

status_coa, body_coa = http_request(
    f"{BASE_URL}/api/v1/auth/login/",
    method="POST",
    data={"username": "coa_delhi_chief", "password": "railway@123"}
)
assert status_coa == 200, f"COA Login failed: {body_coa}"
coa_token = body_coa["data"]["access_token"]
print("[OK] Chief Controller (COA) authenticated")

# ----------------------------------------------------------------------
# 2. Engineer Formulates & Submits a Maintenance Block Proposal
# ----------------------------------------------------------------------
log_step("2. P-Way Engineer Formulates & Submits a New Block Proposal")
proposal_payload = {
    "corridor": "NDLS-CNB-MAIN",
    "department": "ENG",
    "line_type": "DOWN",
    "work_type": "TRACK_TAMPING",
    "start_km": 12.0,
    "end_km": 15.5,
    "scheduled_start_time": "2026-09-21T01:30:00+05:30",
    "scheduled_end_time": "2026-09-21T04:30:00+05:30",
    "gang_id": "GANG-ENG-01",
    "equipment_required": "CSM-09-32",
    "work_description": "Scheduled Track Tamping for COA Sanctioning Test"
}
status_p, resp_p = http_request(
    f"{BASE_URL}/api/v1/blocks/proposals/",
    method="POST",
    headers={"Authorization": f"Bearer {eng_token}"},
    data=proposal_payload
)
assert status_p == 201, f"Block proposal submission failed: {resp_p}"
block = resp_p["data"]
block_id = block["id"]
block_code = block["block_code"]
initial_version = block["version"]
print(f"[OK] Block Proposal Created: {block_code} (UUID: {block_id})")
print(f"  * Initial Version: {initial_version}")
print(f"  * Initial Status:  {block['status']}")
assert initial_version == 1, f"Expected initial version 1, got {initial_version}"

# ----------------------------------------------------------------------
# 3. Test RBAC Separation of Duties on Sanction Endpoint
# ----------------------------------------------------------------------
log_step("3. Testing RBAC Role Separation of Duties on POST /api/v1/blocks/<id>/sanction/")
# 3a. Unauthenticated -> 401 Unauthorized
status_anon, body_anon = http_request(
    f"{BASE_URL}/api/v1/blocks/{block_id}/sanction/",
    method="POST",
    data={"action": "SANCTION", "version": initial_version, "remarks": "Unauthorized test"}
)
print(f"Anonymous Sanction Request: HTTP {status_anon}")
assert status_anon == 401, f"Expected 401 Unauthorized, got {status_anon}"
print("[OK] Unauthenticated sanction request correctly rejected with HTTP 401")

# 3b. Departmental Engineer (Cannot sanction own proposal) -> 403 Forbidden
status_eng_sanc, body_eng_sanc = http_request(
    f"{BASE_URL}/api/v1/blocks/{block_id}/sanction/",
    method="POST",
    headers={"Authorization": f"Bearer {eng_token}"},
    data={"action": "SANCTION", "version": initial_version, "remarks": "Engineer self-sanction attempt"}
)
print(f"Engineer Sanction Request: HTTP {status_eng_sanc}")
assert status_eng_sanc == 403, f"Expected 403 Forbidden for Engineer, got {status_eng_sanc}"
print("[OK] Engineer sanction request correctly rejected with HTTP 403 (Separation of duties enforced)")

# ----------------------------------------------------------------------
# 4. Chief Controller Sanctions Block with Optimistic Locking Check
# ----------------------------------------------------------------------
log_step("4. Chief Controller Executes Full Sanction (Version 1 -> Version 2)")
sanction_payload = {
    "action": "SANCTION",
    "version": 1,
    "remarks": "Approved by Chief Controller. All interlocking cross-checks verified."
}
status_sanc, body_sanc = http_request(
    f"{BASE_URL}/api/v1/blocks/{block_id}/sanction/",
    method="POST",
    headers={"Authorization": f"Bearer {coa_token}"},
    data=sanction_payload
)
print(f"Chief Controller Sanction Response: HTTP {status_sanc}")
assert status_sanc == 200, f"Chief Controller sanction failed: {body_sanc}"
sanctioned_block = body_sanc["data"]
print(f"[OK] Block {block_code} successfully SANCTIONED:")
print(f"  * New Status:   {sanctioned_block['status']}")
print(f"  * New Version:  {sanctioned_block['version']}")
print(f"  * Sanctioned By: {sanctioned_block.get('sanctioned_by') or 'coa_delhi_chief'}")

assert sanctioned_block["status"] == "SANCTIONED", f"Expected SANCTIONED, got {sanctioned_block['status']}"
assert sanctioned_block["version"] == 2, f"Expected version 2, got {sanctioned_block['version']}"
print("[OK] Version incremented strictly from 1 to 2.")

# ----------------------------------------------------------------------
# 5. Test Optimistic Concurrency Conflict (HTTP 409 Conflict on Stale Version)
# ----------------------------------------------------------------------
log_step("5. Testing Optimistic Concurrency Rejection on Stale Version (HTTP 409 Conflict)")
stale_sanction_payload = {
    "action": "SANCTION",
    "version": 1,  # Submitting stale version 1 when DB is now version 2!
    "remarks": "Concurrent controller attempting conflicting approval"
}
status_conflict, body_conflict = http_request(
    f"{BASE_URL}/api/v1/blocks/{block_id}/sanction/",
    method="POST",
    headers={"Authorization": f"Bearer {coa_token}"},
    data=stale_sanction_payload
)
print(f"Stale Version Sanction Response: HTTP {status_conflict}")
assert status_conflict == 409, f"Expected 409 Conflict, got {status_conflict}: {body_conflict}"
error_obj = body_conflict.get("error", {})
err_msg = error_obj.get("message", "")
print("Error Message Received:", err_msg)
assert "Concurrency Conflict" in err_msg, f"Expected Concurrency Conflict in {err_msg}"
assert error_obj["details"]["current_version"] == 2
assert error_obj["details"]["submitted_version"] == 1
print("[OK] Concurrency conflict detected and rejected with HTTP 409 (Optimistic locking active).")


# ----------------------------------------------------------------------
# 6. Test Conditional Sanction with Speed Cap (action='CONDITIONAL_SANCTION')
# ----------------------------------------------------------------------
log_step("6. Testing Conditional Sanction with Caution Order Speed Cap")
# Create another proposal
proposal_payload_2 = {
    "corridor": "NDLS-CNB-MAIN",
    "department": "ENG",
    "line_type": "DOWN",
    "work_type": "BALLAST_CLEANING",
    "start_km": 25.0,
    "end_km": 28.0,
    "scheduled_start_time": "2026-09-21T02:00:00+05:30",
    "scheduled_end_time": "2026-09-21T05:00:00+05:30",
    "gang_id": "GANG-ENG-02",
    "equipment_required": "BCM-02",
    "work_description": "Deep Ballast Screening near Yamuna Bridge"
}
_, resp_p2 = http_request(
    f"{BASE_URL}/api/v1/blocks/proposals/",
    method="POST",
    headers={"Authorization": f"Bearer {eng_token}"},
    data=proposal_payload_2
)
block_2 = resp_p2["data"]
block_2_id = block_2["id"]

conditional_payload = {
    "action": "CONDITIONAL_SANCTION",
    "version": 1,
    "caution_speed": 30,
    "remarks": "Caution: Speed restricted to 30 km/h on adjacent loop line"
}
status_cond, body_cond = http_request(
    f"{BASE_URL}/api/v1/blocks/{block_2_id}/sanction/",
    method="POST",
    headers={"Authorization": f"Bearer {coa_token}"},
    data=conditional_payload
)
print(f"Conditional Sanction Response: HTTP {status_cond}")
assert status_cond == 200, f"Conditional sanction failed: {body_cond}"
cond_block = body_cond["data"]
assert cond_block["status"] == "SANCTIONED"
assert cond_block["version"] == 2
assert "Speed cap 30 km/h" in cond_block["work_description"]
print(f"[OK] Conditional sanction accepted: {cond_block['work_description']}")

# ----------------------------------------------------------------------
# 7. Test Block Rejection (action='REJECT')
# ----------------------------------------------------------------------
log_step("7. Testing Chief Controller Proposal Rejection")
proposal_payload_3 = {
    "corridor": "NDLS-CNB-MAIN",
    "department": "ENG",
    "line_type": "DOWN",
    "work_type": "TRACK_TAMPING",
    "start_km": 5.0,
    "end_km": 8.0,
    "scheduled_start_time": "2026-09-21T18:00:00+05:30",
    "scheduled_end_time": "2026-09-21T21:00:00+05:30",
    "gang_id": "GANG-ENG-01",
    "equipment_required": "CSM-09-32",
    "work_description": "Evening Peak Hour Track Proposal"
}
_, resp_p3 = http_request(
    f"{BASE_URL}/api/v1/blocks/proposals/",
    method="POST",
    headers={"Authorization": f"Bearer {eng_token}"},
    data=proposal_payload_3
)
block_3 = resp_p3["data"]
block_3_id = block_3["id"]

reject_payload = {
    "action": "REJECT",
    "version": 1,
    "remarks": "Peak evening Rajdhani/Shatabdi corridor congestion. Resubmit for night window (00:00-06:00)."
}
status_rej, body_rej = http_request(
    f"{BASE_URL}/api/v1/blocks/{block_3_id}/sanction/",
    method="POST",
    headers={"Authorization": f"Bearer {coa_token}"},
    data=reject_payload
)
print(f"Rejection Response: HTTP {status_rej}")
assert status_rej == 200, f"Rejection failed: {body_rej}"
rej_block = body_rej["data"]
assert rej_block["status"] == "REJECTED"
assert rej_block["version"] == 2
assert "Peak evening" in rej_block["rejection_reason"]
print(f"[OK] Block successfully REJECTED with reason recorded: {rej_block['rejection_reason']}")

# ----------------------------------------------------------------------
# 8. Test Invalid Transition Rejection
# ----------------------------------------------------------------------
log_step("8. Testing Invalid State Machine Transition (Cannot sanction a REJECTED block)")
invalid_transition_payload = {
    "action": "SANCTION",
    "version": 2,
    "remarks": "Attempting to sanction an already rejected block"
}
status_inv, body_inv = http_request(
    f"{BASE_URL}/api/v1/blocks/{block_3_id}/sanction/",
    method="POST",
    headers={"Authorization": f"Bearer {coa_token}"},
    data=invalid_transition_payload
)
print(f"Invalid Transition Response: HTTP {status_inv}")
assert status_inv == 400, f"Expected 400 Bad Request, got {status_inv}"
print("[OK] Invalid state machine transition rejected with HTTP 400.")

print("\n" + "=" * 80)
print("ALL TSK-P2-04-BE TESTS COMPLETED SUCCESSFULLY! (100% PASS)")
print("=" * 80)
