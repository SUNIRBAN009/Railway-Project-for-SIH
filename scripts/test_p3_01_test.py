"""
End-to-End Automated Verification Suite for TSK-P3-01-TEST:
Two-Window Real-Time Concurrent State Synchronization via Daphne WebSocket Dispatch.
Simulates the SIH evaluation scenario:
  - Window 1: Chief Controller (COA) session.
  - Window 2: Civil P-Way Track Engineer (ENG) session.
  - Action: ENG proposes a block in Window 2 -> COA receives instant live push in Window 1.
  - Action: COA sanctions the block in Window 1 -> ENG receives instant live push in Window 2.
  - Assertion: Both sessions update state instantaneously without page reload (F5).
"""
import sys
import json
import time
import asyncio
import urllib.request
from datetime import datetime, timedelta, timezone

try:
    import websockets
except ImportError:
    print("[ERROR] 'websockets' library is required. Run: pip install websockets")
    sys.exit(1)

BASE_URL = "http://127.0.0.1:8000"
WS_URL = "ws://127.0.0.1:8001"


def http_post_json(url: str, data: dict, token: str = None) -> tuple:
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body_bytes = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(url, data=body_bytes, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(err_body)
        except Exception:
            return e.code, {"error": err_body}


def http_get_json(url: str, token: str = None) -> tuple:
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, headers=headers, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(err_body)
        except Exception:
            return e.code, {"error": err_body}


def authenticate_user(username: str, password: str = "railway@123") -> str:
    status_code, resp = http_post_json(
        f"{BASE_URL}/api/v1/auth/login/",
        {"username": username, "password": password}
    )
    if status_code != 200 or not resp.get("success"):
        raise RuntimeError(f"Authentication failed for {username}: {resp}")
    return resp["data"]["access_token"]


async def run_e2e_simulation():
    print("=" * 80)
    print("RUNNING E2E TEST SUITE: TSK-P3-01-TEST")
    print("TWO-WINDOW REAL-TIME CROSS-CONTROLLER DISPATCH SYNCHRONIZATION")
    print("=" * 80)

    # 1. Setup Personas for Window 1 (COA) and Window 2 (ENG)
    print("\nSTEP 1: Authenticating Concurrent User Sessions")
    coa_token = authenticate_user("coa_delhi_chief")
    eng_token = authenticate_user("eng_track_pway")
    print(f"  [PASS] Window 1 (Chief Controller): coa_delhi_chief token acquired.")
    print(f"  [PASS] Window 2 (P-Way Engineer): eng_track_pway token acquired.")

    # 2. Establish Concurrent Daphne WebSockets for Both Windows
    print("\nSTEP 2: Establishing Concurrent WebSocket Subscriptions (Window 1 & Window 2)")
    uri_coa = f"{WS_URL}/ws/corridor/ALL/?token={coa_token}"
    uri_eng = f"{WS_URL}/ws/corridor/NDLS-GZB-UP/?token={eng_token}"

    async with websockets.connect(uri_coa) as ws_window_1, \
               websockets.connect(uri_eng) as ws_window_2:

        # Drain initial connection handshakes
        hs_1 = json.loads(await ws_window_1.recv())
        hs_2 = json.loads(await ws_window_2.recv())
        print(f"  [PASS] Window 1 Connected: Corridor={hs_1.get('corridor')} | Type={hs_1.get('type')}")
        print(f"  [PASS] Window 2 Connected: Corridor={hs_2.get('corridor')} | Type={hs_2.get('type')}")

        # 3. Window 2 (ENG) submits a block proposal
        print("\nSTEP 3: Window 2 (ENG) Submits Block Proposal")
        now = datetime.now(timezone.utc)
        unique_offset = (int(time.time()) % 10000) + 200
        start_time = now + timedelta(hours=unique_offset)
        end_time = start_time + timedelta(hours=3)

        block_data = {
            "corridor_code": "NDLS-GZB-UP",
            "line_type": "UP",
            "work_type": "TRACK_TAMPING",
            "start_km": 10.0,
            "end_km": 14.5,
            "scheduled_start_time": start_time.isoformat(),
            "scheduled_end_time": end_time.isoformat(),
            "department_code": "ENG",
            "gang_id": "GANG-ENG-PWAY-04",
            "equipment_required": "CSM-NR-092",
            "work_description": "Cross-Window Concurrent Synchronization Verification",
        }

        t_submit = time.perf_counter()
        status_code, resp = http_post_json(
            f"{BASE_URL}/api/v1/blocks/proposals/",
            block_data,
            token=eng_token
        )
        assert status_code == 201, f"Block submission failed: {resp}"
        block_id = resp["data"]["id"]
        block_code = resp["data"]["block_code"]
        print(f"  [INFO] Proposed Block: {block_code} (ID: {block_id})")

        async def recv_matching_frame(ws, expected_type="INVALIDATE_CACHE", expected_action=None, timeout=5.0):
            t_end = time.perf_counter() + timeout
            while time.perf_counter() < t_end:
                rem = max(0.1, t_end - time.perf_counter())
                raw = await asyncio.wait_for(ws.recv(), timeout=rem)
                msg = json.loads(raw)
                if msg.get("type") == expected_type:
                    if expected_action is None or msg.get("action") == expected_action:
                        return msg
            raise TimeoutError(f"Did not receive {expected_type} frame with action={expected_action}")

        # 4. Window 1 (COA) receives the real-time push-to-invalidate event
        print("\nSTEP 4: Window 1 (COA) Receives Push-to-Invalidate Event")
        w1_event = await recv_matching_frame(ws_window_1, "INVALIDATE_CACHE", "PROPOSED")
        w1_elapsed_ms = (time.perf_counter() - t_submit) * 1000.0

        print(f"  [INFO] Window 1 Received Frame in {w1_elapsed_ms:.2f} ms:")
        print(f"         Type={w1_event.get('type')} | Action={w1_event.get('action')} | Block={w1_event.get('block_code')}")
        assert w1_event.get("type") == "INVALIDATE_CACHE"
        assert w1_event.get("domain") == "BLOCKS"
        assert w1_event.get("block_code") == block_code
        print(f"  [PASS] Window 1 successfully notified of new proposal without page refresh.")

        # 5. Window 1 (COA) approves the block
        print("\nSTEP 5: Window 1 (COA) Approves Block Proposal")
        t_sanction = time.perf_counter()
        status_code, s_resp = http_post_json(
            f"{BASE_URL}/api/v1/blocks/{block_id}/sanction/",
            {"action": "SANCTION", "version": 1, "remarks": "Approved in E2E 2-Window Simulation"},
            token=coa_token
        )
        assert status_code == 200, f"Sanctioning failed: {s_resp}"
        print(f"  [INFO] Block {block_code} Sanctioned by Chief Controller.")

        # 6. Window 2 (ENG) receives the real-time sanction event
        print("\nSTEP 6: Window 2 (ENG) Receives Real-Time Sanction Update")
        s_event_w2 = await recv_matching_frame(ws_window_2, "INVALIDATE_CACHE", "SANCTIONED")
        w2_elapsed_ms = (time.perf_counter() - t_sanction) * 1000.0

        print(f"  [INFO] Window 2 Received Frame in {w2_elapsed_ms:.2f} ms:")
        print(f"         Type={s_event_w2.get('type')} | Action={s_event_w2.get('action')} | Status={s_event_w2.get('status')} | Version={s_event_w2.get('version')}")
        assert s_event_w2.get("type") == "INVALIDATE_CACHE"
        assert s_event_w2.get("action") == "SANCTIONED"
        assert s_event_w2.get("status") == "SANCTIONED"
        assert s_event_w2.get("version") == 2
        print(f"  [PASS] Window 2 instantly updated to SANCTIONED (latency: {w2_elapsed_ms:.2f} ms).")

        # 7. Verification: Fetch blocks in Window 2 and assert state matches
        print("\nSTEP 7: Verifying Data Consistency in Window 2")
        status_code, live_blocks_resp = http_get_json(f"{BASE_URL}/api/v1/blocks/", token=eng_token)
        assert status_code == 200
        live_blocks = live_blocks_resp.get("data", [])
        matched = [b for b in live_blocks if b.get("block_code") == block_code]
        assert len(matched) == 1, f"Block {block_code} not found in database"
        assert matched[0].get("status") == "SANCTIONED"
        assert matched[0].get("version") == 2
        print(f"  [PASS] Database state verified: Block={block_code} | Status=SANCTIONED | Version=2")

    print("\n" + "=" * 80)
    print("ALL TSK-P3-01-TEST E2E VERIFICATION CHECKS PASSED (100% VERIFIED)")
    print("=" * 80)


if __name__ == "__main__":
    asyncio.run(run_e2e_simulation())
