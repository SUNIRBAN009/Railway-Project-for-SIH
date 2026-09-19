import json
import urllib.request
import urllib.error
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

print("=" * 80)
print("RUNNING E2E TEST SUITE: TSK-P2-03-TEST")
print("SCENARIO B CROSS-DEPARTMENTAL OVERLAPPING PROPOSALS & AI COMBINED BLOCK (USP #98)")
print("=" * 80)

# ----------------------------------------------------------------------
# 1. Authenticate Personas via Frontend Proxy (Port 3000)
# ----------------------------------------------------------------------
log_step("1. Authenticating Track Engineer (ENG) and OHE Engineer (TRD) via Frontend Proxy")
status_eng, login_eng = http_request(
    f"{FRONTEND_URL}/api/v1/auth/login/",
    method="POST",
    data={"username": "eng_track_pway", "password": "railway@123"}
)
assert status_eng == 200, f"ENG Login failed: {login_eng}"
eng_token = login_eng["data"]["access_token"]
print("[OK] Track Engineer authenticated via Frontend (Token issued)")

status_trd, login_trd = http_request(
    f"{FRONTEND_URL}/api/v1/auth/login/",
    method="POST",
    data={"username": "trd_traction_power", "password": "railway@123"}
)
assert status_trd == 200, f"TRD Login failed: {login_trd}"
trd_token = login_trd["data"]["access_token"]
print("[OK] OHE Traction Engineer authenticated via Frontend (Token issued)")

# ----------------------------------------------------------------------
# 2. Submit Scenario B Overlapping Proposals through Frontend Proxy
# ----------------------------------------------------------------------
log_step("2. Submitting Scenario B Compatible Overlapping Blocks via Frontend Proxy")
# 2a. ENG Track Tamping Proposal
eng_payload = {
    "corridor": "NDLS-CNB-MAIN",
    "department": "ENG",
    "line_type": "DOWN",
    "work_type": "TRACK_TAMPING",
    "start_km": 142.500,
    "end_km": 146.200,
    "scheduled_start_time": "2026-09-22T02:00:00+05:30",
    "scheduled_end_time": "2026-09-22T05:30:00+05:30",
    "gang_id": "GANG-ENG-01",
    "equipment_required": "CSM-09-32",
    "work_description": "Scenario B P-Way Heavy Track Tamping"
}
status_p1, resp_p1 = http_request(
    f"{FRONTEND_URL}/api/v1/blocks/proposals/",
    method="POST",
    headers={"Authorization": f"Bearer {eng_token}"},
    data=eng_payload
)
print(f"ENG Proposal Response: HTTP {status_p1}")
assert status_p1 == 201, f"ENG proposal submission failed: {resp_p1}"
block_eng = resp_p1["data"]
eng_code = block_eng["block_code"]
eng_id = block_eng["id"]
print(f"[OK] ENG Block Created: {eng_code} (UUID: {eng_id})")

# 2b. TRD 25kV OHE Catenary Inspection Proposal (Overlapping KM 143.0 to 145.5)
trd_payload = {
    "corridor": "NDLS-CNB-MAIN",
    "department": "TRD",
    "line_type": "DOWN",
    "work_type": "OHE_INSPECTION",
    "start_km": 143.000,
    "end_km": 145.500,
    "scheduled_start_time": "2026-09-22T02:30:00+05:30",
    "scheduled_end_time": "2026-09-22T06:00:00+05:30",
    "traction_power_cutoff_required": True,
    "gang_id": "GANG-TRD-01",
    "equipment_required": "RU-04-TOWER",
    "work_description": "Scenario B 25kV OHE Inspection with Power Cutoff"
}
status_p2, resp_p2 = http_request(
    f"{FRONTEND_URL}/api/v1/blocks/proposals/",
    method="POST",
    headers={"Authorization": f"Bearer {trd_token}"},
    data=trd_payload
)
print(f"TRD Proposal Response: HTTP {status_p2}")
assert status_p2 == 201, f"TRD proposal submission failed: {resp_p2}"
block_trd = resp_p2["data"]
trd_code = block_trd["block_code"]
trd_id = block_trd["id"]
print(f"[OK] TRD Block Created: {trd_code} (UUID: {trd_id})")

# ----------------------------------------------------------------------
# 3. Verify Automatic PostGIS Conflict Classification & Shadow Merging
# ----------------------------------------------------------------------
log_step("3. Verifying Automatic PostGIS Conflict Classification & Shadow Merging")
sweep_report = block_trd.get("sweep_report", {})
print(f"Sweep Summary: {sweep_report.get('total_conflicts')} total conflicts, {sweep_report.get('shadow_opportunities')} shadow opportunities")
assert sweep_report.get("shadow_opportunities", 0) >= 1, "Expected at least 1 shadow block opportunity"

# ----------------------------------------------------------------------
# 4. Verify AI Combined Block Recommendation API (USP #98) via Frontend
# ----------------------------------------------------------------------
log_step("4. Testing GET /api/v1/blocks/<id>/combined-recommendation/ via Frontend Proxy")
status_rec, resp_rec = http_request(
    f"{FRONTEND_URL}/api/v1/blocks/{trd_id}/combined-recommendation/",
    headers={"Authorization": f"Bearer {trd_token}"}
)
print(f"Combined Recommendation API Response: HTTP {status_rec}")
assert status_rec == 200, f"Failed to retrieve recommendation: {resp_rec}"
rec_data = resp_rec["data"]
print("AI Recommendation Payload:")
print(f"  * Candidate:    {rec_data.get('is_combined_candidate')}")
print(f"  * Primary:      {rec_data.get('primary_block_code')}")
print(f"  * Secondary:    {rec_data.get('secondary_block_code')}")
print(f"  * Overlap Span: {rec_data.get('overlap_span_km')} KM (KM {rec_data.get('overlap_start_km')} to {rec_data.get('overlap_end_km')})")
print(f"  * Capacity:     +{rec_data.get('track_capacity_saved_hours')} Hours Saved")
print(f"  * Delay:        ~{rec_data.get('train_delay_prevented_minutes')} Minutes Prevented")
print(f"  * Efficiency:   {rec_data.get('shadow_bundling_efficiency')}")
print(f"  * Synergy Tier: {rec_data.get('synergy_tier')}")

assert rec_data.get("is_combined_candidate") is True
assert rec_data.get("track_capacity_saved_hours", 0) >= 2.5
assert rec_data.get("train_delay_prevented_minutes", 0) >= 100
assert rec_data.get("synergy_tier") == "OPTIMAL_SHADOW_BUNDLE"
print("[OK] AI Combined Block Recommendation metrics strictly conform to USP #98 specifications.")

# ----------------------------------------------------------------------
# 5. Verify Corridor-Wide AI Combined Bundles API
# ----------------------------------------------------------------------
log_step("5. Testing GET /api/v1/blocks/recommendations/ Corridor Sweep API")
status_corr, resp_corr = http_request(
    f"{FRONTEND_URL}/api/v1/blocks/recommendations/?corridor=NDLS-CNB-MAIN",
    headers={"Authorization": f"Bearer {eng_token}"}
)
print(f"Corridor Sweep API Response: HTTP {status_corr}")
assert status_corr == 200, f"Failed corridor sweep: {resp_corr}"
corridor_recs = resp_corr["data"]
print(f"[OK] Total Corridor AI Bundles found: {len(corridor_recs)}")
assert len(corridor_recs) >= 1, "Expected at least 1 corridor bundle candidate"

# ----------------------------------------------------------------------
# 6. Verify Full Block Details with Embedded Conflicts & Recommendations
# ----------------------------------------------------------------------
log_step("6. Testing GET /api/v1/blocks/<id>/ with Embedded Conflicts & Recommendation")
status_det, resp_det = http_request(
    f"{FRONTEND_URL}/api/v1/blocks/{trd_id}/",
    headers={"Authorization": f"Bearer {trd_token}"}
)
assert status_det == 200, f"Block detail query failed: {resp_det}"
det_block = resp_det["data"]
assert "conflicts" in det_block
assert "combined_recommendation" in det_block
conflicts = det_block["conflicts"]
shadow_conflicts = [c for c in conflicts if c.get("resolution_status") == "SHADOW_MERGED"]
print(f"[OK] Block details contain {len(conflicts)} conflicts ({len(shadow_conflicts)} shadow merged).")
assert len(shadow_conflicts) >= 1, "Expected shadow merged conflict entry"

# ----------------------------------------------------------------------
# 7. Verify Frontend Server Availability (Port 3000)
# ----------------------------------------------------------------------
log_step("7. Verifying React Single-Page Application Health on Port 3000")
status_fe, html_body = http_request(f"{FRONTEND_URL}/")
print(f"Vite Server Root Response: HTTP {status_fe}")
assert status_fe == 200, f"Frontend server unresponsive on port 3000: {html_body}"
assert "<!doctype html>" in html_body.lower() or "<html" in html_body.lower()
print("[OK] Frontend SPA server is healthy, live, and responsive on http://localhost:3000.")

print("\n" + "=" * 80)
print("ALL TSK-P2-03-TEST VERIFICATION CHECKS PASSED (100%)")
print("=" * 80)
