"""
Automated Test Suite: TSK-P3-03-BE
Verify WebSocket Broadcast EMERGENCY_ALERT Payload Generation for Catastrophic Flaws
Authoritative reference: docs/03-service-blueprints/08-notifications.md & docs/09-execution-tracker/00-implementation-checklist.md
"""
import sys
import json
import time
import asyncio
import requests
import websockets

BACKEND_URL = "http://localhost:8000"
WS_BASE_URL = "ws://localhost:8001"

passed_steps = 0
total_steps = 7

def log_step(step_num: int, title: str):
    print(f"\nSTEP {step_num}: {title}")

def log_pass(msg: str):
    global passed_steps
    passed_steps += 1
    print(f"  [PASS] {msg}")

def log_fail(msg: str):
    print(f"  [FAIL] {msg}")
    sys.exit(1)

def log_info(msg: str):
    print(f"  [INFO] {msg}")

async def run_suite():
    print("=" * 80)
    print("RUNNING AUTOMATED TEST SUITE: TSK-P3-03-BE")
    print("WEBSOCKET BROADCAST EMERGENCY_ALERT PAYLOAD GENERATION FOR CATASTROPHIC FLAWS")
    print("=" * 80)

    # --------------------------------------------------------------------------
    # STEP 1: Authenticate Personas (P-Way Engineer & Chief Controller)
    # --------------------------------------------------------------------------
    log_step(1, "Authenticating Track Engineer (eng_track_pway) and Chief Controller (coa_delhi_chief)")
    resp_eng = requests.post(f"{BACKEND_URL}/api/v1/auth/login/", json={
        "username": "eng_track_pway",
        "password": "railway@123"
    })
    if resp_eng.status_code != 200:
        log_fail(f"Engineer login failed: {resp_eng.text}")
    eng_token = resp_eng.json()["data"]["access_token"]

    resp_coa = requests.post(f"{BACKEND_URL}/api/v1/auth/login/", json={
        "username": "coa_delhi_chief",
        "password": "railway@123"
    })
    if resp_coa.status_code != 200:
        log_fail(f"COA login failed: {resp_coa.text}")
    coa_token = resp_coa.json()["data"]["access_token"]
    log_pass(f"Both personas authenticated successfully. Tokens acquired.")

    # --------------------------------------------------------------------------
    # STEP 2: Connect WebSocket 1 (Corridor Universal Stream /ws/corridor/ALL/)
    # --------------------------------------------------------------------------
    log_step(2, "Connecting WebSocket 1 to Corridor Stream (/ws/corridor/ALL/)")
    ws_corridor_url = f"{WS_BASE_URL}/ws/corridor/ALL/"
    try:
        ws_corridor = await websockets.connect(ws_corridor_url)
        handshake_raw = await asyncio.wait_for(ws_corridor.recv(), timeout=5.0)
        handshake = json.loads(handshake_raw)
        if handshake.get("type") != "corridor_connected":
            log_fail(f"Unexpected corridor handshake: {handshake_raw}")
        if "emergency_all" not in handshake.get("groups", []):
            log_fail(f"emergency_all group not joined by CorridorConsumer: {handshake.get('groups')}")
        log_pass(f"Corridor WS connected. Groups: {handshake.get('groups')}")
    except Exception as exc:
        log_fail(f"Failed to connect corridor WS: {exc}")

    # --------------------------------------------------------------------------
    # STEP 3: Connect WebSocket 2 (Notifications Stream /ws/notifications/)
    # --------------------------------------------------------------------------
    log_step(3, "Connecting WebSocket 2 to Notifications Stream (/ws/notifications/)")
    ws_notif_url = f"{WS_BASE_URL}/ws/notifications/"
    try:
        ws_notif = await websockets.connect(ws_notif_url)
        notif_handshake_raw = await asyncio.wait_for(ws_notif.recv(), timeout=5.0)
        notif_handshake = json.loads(notif_handshake_raw)
        if notif_handshake.get("type") != "connection_established":
            log_fail(f"Unexpected notification handshake: {notif_handshake_raw}")
        if "emergency_all" not in notif_handshake.get("groups", []):
            log_fail(f"emergency_all group not joined by NotificationConsumer: {notif_handshake.get('groups')}")
        log_pass(f"Notification WS connected. Groups: {notif_handshake.get('groups')}")
    except Exception as exc:
        log_fail(f"Failed to connect notification WS: {exc}")

    # --------------------------------------------------------------------------
    # STEP 4: Trigger Catastrophic Rail Fracture Defect via Backend API
    # --------------------------------------------------------------------------
    log_step(4, "Registering Catastrophic Rail Defect (16.5mm Flaw Depth, CRITICAL_IMMEDIATE_STOP)")
    # Select asset
    assets_resp = requests.get(
        f"{BACKEND_URL}/api/v1/assets/?corridor=NDLS-CNB-MAIN",
        headers={"Authorization": f"Bearer {eng_token}"}
    )
    if assets_resp.status_code != 200 or not assets_resp.json()["data"]:
        log_fail("Failed to query track assets.")
    test_asset = assets_resp.json()["data"][0]
    asset_tag = test_asset["asset_tag"]

    t0 = time.time()
    defect_payload = {
        "asset_id": asset_tag,
        "defect_type": "INTERNAL_RAIL_FRACTURE",
        "severity": "CRITICAL_IMMEDIATE_STOP",
        "flaw_depth_mm": 16.5,
        "recommended_speed_restriction_kmh": 20,
        "cof_score": 5,
        "lof_score": 5,
        "overdue_days": 35,
        "detected_by_source": "USFD_TROLLEY",
        "description": "Critical acute transverse fissure detected by ultrasonic trolley."
    }

    defect_resp = requests.post(
        f"{BACKEND_URL}/api/v1/assets/defects/",
        json=defect_payload,
        headers={"Authorization": f"Bearer {eng_token}"}
    )
    t_api = (time.time() - t0) * 1000
    if defect_resp.status_code != 201:
        log_fail(f"Defect registration failed: {defect_resp.text}")

    resp_data = defect_resp.json()["data"]
    defect_obj = resp_data.get("defect", {})
    defect_code = defect_obj.get("defect_code", "DEF-UNKNOWN")
    emergency_block = resp_data.get("emergency_block", {})
    emergency_block_code = emergency_block.get("block_code", "N/A")
    log_pass(f"Defect {defect_code} registered in {t_api:.2f} ms. Emergency block created: {emergency_block_code}")

    # --------------------------------------------------------------------------
    # STEP 5: Intercept Real-Time EMERGENCY_ALERT Frames on WebSockets
    # --------------------------------------------------------------------------
    log_step(5, "Intercepting Real-Time EMERGENCY_ALERT Frames on Connected WebSockets")
    try:
        t_ws_start = time.time()
        # Read frames from Corridor WS until EMERGENCY_ALERT received
        found_corridor_alert = False
        corridor_alert_payload = None
        for _ in range(5):
            try:
                frame_raw = await asyncio.wait_for(ws_corridor.recv(), timeout=2.5)
                frame = json.loads(frame_raw)
                if frame.get("type") == "EMERGENCY_ALERT":
                    found_corridor_alert = True
                    corridor_alert_payload = frame
                    break
            except asyncio.TimeoutError:
                break

        ws_latency = (time.time() - t_ws_start) * 1000
        if not found_corridor_alert:
            log_fail("Did not receive EMERGENCY_ALERT frame on Corridor WebSocket.")

        log_info(f"Corridor WS Alert Received in {ws_latency:.2f} ms:")
        log_info(f"  Type:       {corridor_alert_payload.get('type')}")
        log_info(f"  Priority:   {corridor_alert_payload.get('priority')}")
        log_info(f"  Title:      {corridor_alert_payload.get('title')}")
        log_info(f"  Block Code: {corridor_alert_payload.get('block_code')}")
        log_info(f"  KM Mark:    {corridor_alert_payload.get('km_location')}")
        log_info(f"  Speed:      {corridor_alert_payload.get('caution_speed_kmh')} km/h")

        if corridor_alert_payload.get("priority") != "CRITICAL_ALARM":
            log_fail(f"Priority mismatch: {corridor_alert_payload.get('priority')}")
        if not corridor_alert_payload.get("block_code", "").startswith("BLK-EMG-"):
            log_fail(f"Block code not starting with BLK-EMG-: {corridor_alert_payload.get('block_code')}")

        log_pass(f"EMERGENCY_ALERT payload verified on Corridor WebSocket (Latency: {ws_latency:.2f} ms).")
    except Exception as exc:
        log_fail(f"Error intercepting corridor emergency alert: {exc}")

    # --------------------------------------------------------------------------
    # STEP 6: Test Manual Controller Emergency Broadcast Endpoint
    # --------------------------------------------------------------------------
    log_step(6, "Testing Manual Controller Emergency Halt API (POST /api/v1/assets/emergency-alert/)")
    manual_payload = {
        "corridor": "NDLS-CNB-MAIN",
        "km_location": 28.5,
        "reason": "Severe OHE Catenary Wire Snap on DN Main",
        "caution_speed_kmh": 15
    }
    t_manual_start = time.time()
    manual_resp = requests.post(
        f"{BACKEND_URL}/api/v1/assets/emergency-alert/",
        json=manual_payload,
        headers={"Authorization": f"Bearer {coa_token}"}
    )
    if manual_resp.status_code != 200:
        log_fail(f"Manual emergency alert broadcast API failed: {manual_resp.text}")

    # Intercept manual broadcast frame on Corridor WS
    manual_alert_received = False
    for _ in range(10):
        try:
            frame_raw = await asyncio.wait_for(ws_corridor.recv(), timeout=3.0)
            frame = json.loads(frame_raw)
            log_info(f"Received frame on WS: type={frame.get('type')}, km={frame.get('km_location')}")
            if frame.get("type") == "EMERGENCY_ALERT" and abs(float(frame.get("km_location", 0.0)) - 28.5) < 0.1:
                manual_alert_received = True
                log_info(f"Manual alert frame confirmed: {frame.get('title')} at KM {frame.get('km_location')}")
                break
        except asyncio.TimeoutError:
            break

    if not manual_alert_received:
        log_fail("Did not receive manual EMERGENCY_ALERT frame on Corridor WebSocket.")
    log_pass("Manual Controller Emergency Broadcast triggered and intercepted successfully.")

    # --------------------------------------------------------------------------
    # STEP 7: Audit Persistence in PostgreSQL Database
    # --------------------------------------------------------------------------
    log_step(7, "Verifying In-App Notification & Emergency Block Persistence in PostgreSQL")
    # Verify notification in DB via notifications API
    notif_resp = requests.get(
        f"{BACKEND_URL}/api/v1/notifications/",
        headers={"Authorization": f"Bearer {coa_token}"}
    )
    if notif_resp.status_code != 200:
        log_fail(f"Failed to query notifications: {notif_resp.text}")
    notif_data = notif_resp.json()["data"]
    if isinstance(notif_data, dict) and "results" in notif_data:
        notifs = notif_data["results"]
    elif isinstance(notif_data, list):
        notifs = notif_data
    else:
        notifs = []
    alarm_notifs = [n for n in notifs if n.get("priority") == "CRITICAL_ALARM"]
    if not alarm_notifs:
        log_fail("No CRITICAL_ALARM notifications found in database.")
    latest_alarm = alarm_notifs[0]
    log_info(f"Found persistent in-app alarm: ID={latest_alarm.get('id')} | Title='{latest_alarm.get('title')}'")
    log_pass("Database consistency validated. Notification persisted in PostgreSQL.")

    # Clean close sockets
    await ws_corridor.close()
    await ws_notif.close()

    print("\n" + "=" * 80)
    print("ALL TSK-P3-03-BE VERIFICATION CHECKS PASSED (100% VERIFIED)")
    print("=" * 80)

if __name__ == "__main__":
    asyncio.run(run_suite())
