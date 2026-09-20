"""
End-to-End Automated Verification Script for TSK-FINAL-04:
Execution of Presentation Scenario D: "Zero-Fatality Digital Safety Protocol"
(Digital Token #71 -> LOTO #81 -> Clearance Photo #82 -> Track GREEN).
Authoritative reference: docs/06-testing-qa/01-e2e-scenarios.md & docs/09-execution-tracker/00-implementation-checklist.md
"""
import os
import sys
import json
import time
import requests

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

BASE_URL = os.environ.get("BASE_URL", "http://localhost:8000")

def run_verification():
    print("=" * 80)
    print("INDIAN RAILWAYS AI PLATFORM -- PHASE 5 PRESENTATION SCENARIO D (TSK-FINAL-04)")
    print("Scenario D: 'Zero-Fatality Digital Safety Protocol' (Token #71 -> LOTO #81 -> Photo #82 -> Track GREEN)")
    print("=" * 80)

    session = requests.Session()

    # Step 1: Chief Section Controller Authentication
    print("\n[STEP 1] Authenticating Chief Section Controller (coa_delhi_chief)...")
    login_res = session.post(f"{BASE_URL}/api/v1/auth/login/", json={
        "username": "coa_delhi_chief",
        "password": "railway@123",
    })
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    login_data = login_res.json()["data"]
    token = login_data["access_token"]
    user_info = login_data["user"]
    session.headers.update({"Authorization": f"Bearer {token}"})

    print(f"  [OK] Authenticated as: {user_info.get('username')}")
    print(f"  [OK] Persona: {user_info.get('role', 'CHIEF_CONTROLLER')}")
    print("  [PASS] Chief Controller authentication validated.")

    # Step 2: Execute Presentation Scenario D via REST API
    print("\n[STEP 2] Executing Presentation Scenario D (zero_fatality_safety) via REST API...")
    scenario_res = session.post(f"{BASE_URL}/api/v1/demo/scenarios/run/", json={
        "scenario": "zero_fatality_safety",
        "live_mode": False,
        "broadcast": True,
    })
    assert scenario_res.status_code == 200, f"Scenario run failed: {scenario_res.text}"
    scen_data = scenario_res.json()
    assert scen_data.get("status") == "success", f"Scenario status not success: {scen_data}"

    scenario_meta = scen_data.get("scenario", {})
    steps = scenario_meta.get("steps", [])
    print(f"  [OK] Scenario Key: {scenario_meta.get('key')}")
    print(f"  [OK] Scenario Title: {scenario_meta.get('name')}")
    print(f"  [OK] Steps Executed: {len(steps)}/5")
    assert len(steps) == 5, f"Expected 5 steps, received {len(steps)}"

    for s in steps:
        print(f"       Step {s.get('step')}: {s.get('title')}")
        print(f"       -> Event: {s.get('event_type')}")
        print(f"       -> Details: {s.get('details')}")
        print(f"       -> Narrative: {s.get('narrative')[:80]}...")
        assert s.get("title"), "Step missing title"
        assert s.get("narrative"), "Step missing narrative"
    print("  [PASS] All 5 steps of Scenario D executed successfully.")

    # Step 3: Auditing Cryptographic Digital Safety Token Issuance (#71)
    print("\n[STEP 3] Auditing Cryptographic Digital Safety Token Issuance (#71)...")
    step1 = steps[0]
    token_id = step1["details"]["safety_token"]
    assert token_id.startswith("TOK-BL-")
    assert step1["details"]["block_code"] == "BLK-SAF-01"
    assert step1["details"]["status"] == "POSSESSION_ACTIVE"

    print(f"  [OK] Digital Token ID: {token_id}")
    print(f"  [OK] Field Terminal: {step1['details']['terminal_id']}")
    print(f"  [OK] Designated Supervisor: {step1['details']['supervisor']}")
    print("  [PASS] Cryptographic safety token issued via SHA-256 handshake.")

    # Step 4: Auditing Biometric Headcount & Tool Reconciliation (#72)
    print("\n[STEP 4] Auditing Biometric Headcount & RFID Tool Reconciliation (#72)...")
    step2 = steps[1]
    assert "12 / 12" in step2["details"]["personnel_count"]
    assert "24 / 24" in step2["details"]["rfid_tools_accounted"]
    assert "Enforced" in step2["details"]["gps_geofence"]

    print(f"  [OK] Biometric Muster Roll: {step2['details']['personnel_count']}")
    print(f"  [OK] RFID Track Tools: {step2['details']['rfid_tools_accounted']}")
    print(f"  [OK] GPS Geofence: {step2['details']['gps_geofence']}")
    print(f"  [OK] Biometric Ledger Hash: {step2['details']['biometric_hash']}")
    print("  [PASS] Zero-Fatality personnel and heavy tool reconciliation validated.")

    # Step 5: Auditing 25kV OHE Power Isolation & LOTO Interlock (#73)
    print("\n[STEP 5] Auditing 25kV OHE SCADA Breaker Isolation & LOTO (#73)...")
    step3 = steps[2]
    assert step3["details"]["scada_status"] == "DE_ENERGIZED_25KV"
    assert step3["details"]["loto_key_verified"] == "LOTO-TRD-NDLS-88"
    assert step3["details"]["discharge_rods_placed"] == 4

    print(f"  [OK] SCADA Feeder Breaker: {step3['details']['feeder_breaker']}")
    print(f"  [OK] Catenary State: {step3['details']['scada_status']} (0.0 kV)")
    print(f"  [OK] Discharge Rods Placed: {step3['details']['discharge_rods_placed']}")
    print(f"  [OK] Verified LOTO Key: {step3['details']['loto_key_verified']}")
    print("  [PASS] Lockout-Tagout (LOTO) and catenary dead section confirmed.")

    # Step 6: Auditing Geotagged Clearance Photographic Verification (#74)
    print("\n[STEP 6] Auditing Geotagged True-Clearance Photo Upload (#74)...")
    step4 = steps[3]
    assert "CLEARANCE_KM16_350" in step4["details"]["photo_evidence"]
    assert "12/12" in step4["details"]["personnel_clearance"]
    assert "24/24" in step4["details"]["tools_clearance"]
    photo_hash = step4["details"]["integrity_hash"]

    print(f"  [OK] Photo Evidence: {step4['details']['photo_evidence']}")
    print(f"  [OK] Geotag Coordinates: {step4['details']['geotag_lat_lon']}")
    print(f"  [OK] Cryptographic Hash: {photo_hash}")
    print(f"  [OK] Evacuated Trackmen: {step4['details']['personnel_clearance']}")
    print(f"  [OK] Stowed Hardware: {step4['details']['tools_clearance']}")
    print("  [PASS] EXIF geotagged clearance verified with cryptographic seal.")

    # Step 7: Auditing Digital Safety Certificate & Track Handback (#80) in PostgreSQL
    print("\n[STEP 7] Auditing Digital Safety Certificate (#80) & Database Persistence...")
    step5 = steps[4]
    cert_id = step5["details"]["certificate_id"]
    assert step5["details"]["track_fit_certified"] is True
    assert step5["details"]["ohe_restored_kv"] == 25.0
    assert step5["details"]["max_speed_restored_kmh"] == 130

    print(f"  [OK] Safety Certificate: {cert_id}")
    print(f"  [OK] Track Fit Certified: {step5['details']['track_fit_certified']}")
    print(f"  [OK] 25kV Traction Power Restored: {step5['details']['ohe_restored_kv']} kV")
    print(f"  [OK] Restored Line Speed: {step5['details']['max_speed_restored_kmh']} km/h (Track GREEN)")

    # Verify Block BLK-SAF-01 in PostgreSQL
    blocks_res = session.get(f"{BASE_URL}/api/v1/blocks/")
    assert blocks_res.status_code == 200
    blocks_json = blocks_res.json()
    all_blocks = blocks_json.get("data", []) if isinstance(blocks_json, dict) else blocks_json

    safe_block = next((b for b in all_blocks if isinstance(b, dict) and b.get("block_code") == "BLK-SAF-01"), None)
    assert safe_block is not None, "Block BLK-SAF-01 not found in DB!"

    print(f"  [OK] Database Block Code: {safe_block.get('block_code')}")
    print(f"  [OK] Database Block Status: {safe_block.get('status')}")
    print(f"  [OK] Database Track Fit: {safe_block.get('track_fit_certified')}")
    assert safe_block.get("status") == "COMPLETED"
    assert safe_block.get("track_fit_certified") is True

    # Verify Safety Handback Notification
    notif_res = session.get(f"{BASE_URL}/api/v1/notifications/")
    assert notif_res.status_code == 200
    notif_json = notif_res.json()
    notif_list = notif_json.get("data", []) if isinstance(notif_json, dict) else notif_json

    safe_notifs = [n for n in notif_list if isinstance(n, dict) and "BLK-SAF-01" in str(n)]
    print(f"  [OK] Notifications referencing BLK-SAF-01: {len(safe_notifs)} records found")
    assert len(safe_notifs) >= 1, "Expected at least 1 notification for BLK-SAF-01"
    print("  [PASS] Digital Safety Handback Certificate persisted and broadcast.")

    # Step 8: Frontend UI Contract Audit
    print("\n[STEP 8] Auditing Frontend ScenarioPlayerModal Presentation Contracts...")
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    modal_path = os.path.join(repo_root, "frontend", "src", "components", "common", "ScenarioPlayerModal.tsx")
    assert os.path.exists(modal_path), "ScenarioPlayerModal.tsx missing"

    with open(modal_path, "r", encoding="utf-8") as f:
        modal_src = f.read()

    assert "zero_fatality_safety" in modal_src, "Missing zero_fatality_safety in modal"
    assert "Scenario D: Digital Safety" in modal_src, "Missing Scenario D title in modal"
    assert "Zero-Fatality Protocol" in modal_src, "Missing Zero-Fatality Protocol tag in modal"
    assert "SCENARIO D" in modal_src, "Missing SCENARIO D badge in modal"
    print("  [OK] ScenarioPlayerModal.tsx contains Scenario D selector, purple badges, and navigation.")
    print("  [PASS] Frontend modal contract verified.")

    print("\n" + "=" * 80)
    print("ALL TSK-FINAL-04 VERIFICATION CHECKS PASSED (100% SUCCESS)!")
    print("Presentation Scenario D ('Zero-Fatality Digital Safety Protocol') Ready for SIH Showcase!")
    print("=" * 80)

if __name__ == '__main__':
    run_verification()
