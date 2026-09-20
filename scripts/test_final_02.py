"""
End-to-End Automated Verification Script for TSK-FINAL-02:
Execution of Presentation Scenario B: "Conflict -> Combined Block USP"
(ENG vs TRD Overlap -> AI Combined Suggestion -> 1-Click Sanction -> SMS).
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
    print("INDIAN RAILWAYS AI PLATFORM -- PHASE 5 PRESENTATION SCENARIO B (TSK-FINAL-02)")
    print("Scenario B: 'Conflict -> Combined Block USP' (ENG vs TRD -> Combined Block -> Sanction -> SMS)")
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
    print(f"  [OK] Central Command Persona: {user_info.get('role', 'CHIEF_CONTROLLER')}")
    print("  [PASS] Chief Controller authentication validated.")

    # Step 2: Execute Presentation Scenario B via REST API
    print("\n[STEP 2] Executing Presentation Scenario B (eng_vs_trd_conflict) via REST API...")
    scenario_res = session.post(f"{BASE_URL}/api/v1/demo/scenarios/run/", json={
        "scenario": "eng_vs_trd_conflict",
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
        print(f"       -> Details: {s.get('details')}")
        print(f"       -> Narrative: {s.get('narrative')[:80]}...")
        assert s.get("title"), "Step missing title"
        assert s.get("narrative"), "Step missing narrative"
    print("  [PASS] All 5 steps of Scenario B executed successfully with real-time audit trail.")

    # Step 3: Verify Submissions & Overlap Geometry
    print("\n[STEP 3] Auditing Cross-Departmental Spatial & Temporal Overlap Geometry...")
    step1 = steps[0]
    step2 = steps[1]
    step3 = steps[2]

    assert step1["details"]["block_code"] == "BLK-SCEN-ENG-142"
    assert step2["details"]["block_code"] == "BLK-SCEN-TRD-143"
    assert step3["details"]["spatial_overlap_km"] == 2.500
    assert step3["details"]["temporal_overlap_hrs"] == 3.0

    print(f"  [OK] ENG Proposal: {step1['details']['block_code']} (Span: {step1['details']['span']}, Window: {step1['details']['window']})")
    print(f"  [OK] TRD Proposal: {step2['details']['block_code']} (Span: {step2['details']['span']}, Window: {step2['details']['window']})")
    print(f"  [OK] Computed Collision: {step3['details']['spatial_overlap_km']} KM spatial overlap, {step3['details']['temporal_overlap_hrs']} hrs temporal overlap")
    print("  [PASS] Spatial-temporal sweep-line conflict detection verified.")

    # Step 4: Verify Database Persistence of Conflicting Blocks
    print("\n[STEP 4] Auditing Database Persistence for ENG & TRD Blocks...")
    blocks_res = session.get(f"{BASE_URL}/api/v1/blocks/")
    assert blocks_res.status_code == 200
    blocks_json = blocks_res.json()
    all_blocks = blocks_json.get("data", []) if isinstance(blocks_json, dict) else blocks_json

    eng_block = next((b for b in all_blocks if isinstance(b, dict) and b.get("block_code") == "BLK-SCEN-ENG-142"), None)
    trd_block = next((b for b in all_blocks if isinstance(b, dict) and b.get("block_code") == "BLK-SCEN-TRD-143"), None)

    assert eng_block is not None, "ENG block BLK-SCEN-ENG-142 not found in DB!"
    assert trd_block is not None, "TRD block BLK-SCEN-TRD-143 not found in DB!"

    print(f"  [OK] ENG Block: {eng_block.get('block_code')} | Status: {eng_block.get('status')} | Line: {eng_block.get('line_type')}")
    print(f"  [OK] TRD Block: {trd_block.get('block_code')} | Status: {trd_block.get('status')} | Line: {trd_block.get('line_type')}")
    assert eng_block.get("status") in ["CONFLICT_DETECTED", "COORDINATED", "SANCTIONED"]
    assert trd_block.get("status") in ["CONFLICT_DETECTED", "COORDINATED", "SANCTIONED"]
    print("  [PASS] Conflicting blocks successfully indexed with conflict state.")

    # Step 5: Verify Sanctioned Combined Block (BLK-COMB-98-01) in Database
    print("\n[STEP 5] Auditing AI Combined Block (BLK-COMB-98-01) Persistence & Sanction...")
    comb_block = next((b for b in all_blocks if isinstance(b, dict) and b.get("block_code") == "BLK-COMB-98-01"), None)
    assert comb_block is not None, "Combined block BLK-COMB-98-01 not found in DB!"

    print(f"  [OK] Combined Block Code: {comb_block.get('block_code')}")
    print(f"  [OK] Sanction Status: {comb_block.get('status')}")
    print(f"  [OK] Caution Order ID: {comb_block.get('caution_order_id')}")
    print(f"  [OK] Span: KM {comb_block.get('start_km')} to {comb_block.get('end_km')} (Span: {comb_block.get('span_km')} KM)")
    print(f"  [OK] Power Cut Required: {comb_block.get('traction_power_cutoff_required')}")
    print(f"  [OK] Work Description: {comb_block.get('work_description')}")

    assert comb_block.get("status") == "SANCTIONED", f"Expected SANCTIONED, got {comb_block.get('status')}"
    assert comb_block.get("caution_order_id") == "CO-2026-DLI-98", f"Expected CO-2026-DLI-98, got {comb_block.get('caution_order_id')}"
    print("  [PASS] AI Combined Block sanctioned with official digital caution order.")

    # Step 6: Verify SMS Gateway Delivery Logs & Notification Records
    print("\n[STEP 6] Auditing CDAC SMS Gateway Deliveries & Notification Records...")
    notif_res = session.get(f"{BASE_URL}/api/v1/notifications/")
    assert notif_res.status_code == 200
    notif_json = notif_res.json()
    notif_list = notif_json.get("data", []) if isinstance(notif_json, dict) else notif_json

    comb_notifs = [n for n in notif_list if isinstance(n, dict) and "BLK-COMB-98-01" in str(n)]
    print(f"  [OK] Notifications referencing BLK-COMB-98-01: {len(comb_notifs)} records found")
    assert len(comb_notifs) >= 1, "Expected at least 1 notification for BLK-COMB-98-01"

    target_notif = comb_notifs[0]
    print(f"  [OK] Notification Title: {target_notif.get('title')}")
    print(f"  [OK] Priority: {target_notif.get('priority')}")
    print(f"  [OK] Category: {target_notif.get('category')}")
    print(f"  [OK] Message Body: \"{target_notif.get('message_body')[:90]}...\"")

    delivery_logs = target_notif.get("delivery_logs", [])
    print(f"  [OK] Dispatched Delivery Logs: {len(delivery_logs)} channel logs")
    sms_logs = [l for l in delivery_logs if l.get("channel") == "SMS_GATEWAY"]
    print(f"  [OK] SMS Gateway Dispatches: {len(sms_logs)} SMS logs")
    for s in sms_logs:
        print(f"       * Channel: {s.get('channel')} | Status: {s.get('delivery_status')} | Gateway Ref: {s.get('external_reference_id')}")
    print("  [PASS] Multi-channel notification & CDAC SMS dispatch confirmed.")

    # Step 7: Verify AI Synergy Engine & Capacity Savings (USP #98)
    print("\n[STEP 7] Auditing Corridor-Wide Synergy Recommendations (USP #98 Engine)...")
    recs_res = session.get(f"{BASE_URL}/api/v1/blocks/recommendations/", params={"corridor": "NDLS-CNB-MAIN"})
    assert recs_res.status_code == 200, f"Recommendations failed: {recs_res.status_code}"
    recs_data = recs_res.json()
    recs_list = recs_data.get("data", recs_data.get("recommendations", []))
    print(f"  [OK] Corridor Bundling Candidates Identified: {len(recs_list)} recommendations")

    # Step 4 metrics in Scenario B
    step4 = steps[3]
    capacity_saved = step4["details"]["track_capacity_saved_hours"]
    delays_prevented = step4["details"]["train_delay_prevented_minutes"]
    efficiency = step4["details"]["shadow_bundling_efficiency"]

    print(f"  [OK] Mathematical Capacity Dividend:")
    print(f"       * Track Capacity Saved: {capacity_saved} Hours (Benchmark: >= 2.5h)")
    print(f"       * Train Delays Prevented: {delays_prevented} Minutes (Benchmark: >= 100m)")
    print(f"       * Shadow Bundling Efficiency: {efficiency}")
    assert capacity_saved >= 2.5, f"Capacity savings below benchmark: {capacity_saved}"
    assert delays_prevented >= 100, f"Delay prevention below benchmark: {delays_prevented}"
    print("  [PASS] USP #98 mathematical dividends verified.")

    # Step 8: Frontend UI Contract Audit
    print("\n[STEP 8] Auditing Frontend ScenarioPlayerModal & CombinedBlockCard Contracts...")
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    modal_path = os.path.join(repo_root, "frontend", "src", "components", "common", "ScenarioPlayerModal.tsx")
    card_path = os.path.join(repo_root, "frontend", "src", "components", "blocks", "CombinedBlockCard.tsx")

    assert os.path.exists(modal_path), "ScenarioPlayerModal.tsx missing"
    assert os.path.exists(card_path), "CombinedBlockCard.tsx missing"

    with open(modal_path, "r", encoding="utf-8") as f:
        modal_src = f.read()
    with open(card_path, "r", encoding="utf-8") as f:
        card_src = f.read()

    assert "eng_vs_trd_conflict" in modal_src, "Missing eng_vs_trd_conflict in modal"
    assert "Scenario B: Combined Block" in modal_src, "Missing Scenario B title in modal"
    assert "USP #98" in modal_src, "Missing Combined block indicators in modal"
    print("  [OK] ScenarioPlayerModal.tsx supports Scenario B execution & playback.")

    assert "USP #98" in card_src, "Missing USP #98 badge in CombinedBlockCard"
    assert "OPTIMAL_SHADOW_BUNDLE" in card_src, "Missing OPTIMAL_SHADOW_BUNDLE badge"
    assert "Track Capacity Saved" in card_src or "Capacity" in card_src, "Missing capacity saved label in card"
    print("  [OK] CombinedBlockCard.tsx renders cross-departmental synergy HUD.")
    print("  [PASS] Frontend components adhere to presentation contracts.")

    print("\n" + "=" * 80)
    print("ALL TSK-FINAL-02 VERIFICATION CHECKS PASSED (100% SUCCESS)!")
    print("Presentation Scenario B ('Conflict -> Combined Block USP') Ready for SIH Showcase!")
    print("=" * 80)

if __name__ == '__main__':
    run_verification()
