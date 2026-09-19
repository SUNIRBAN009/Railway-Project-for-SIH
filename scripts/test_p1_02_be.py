import json
import urllib.request
import urllib.error

BASE_URL = "http://127.0.0.1:8000"

def post_json(url, data):
    headers = {'Content-Type': 'application/json'}
    req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers=headers)
    try:
        resp = urllib.request.urlopen(req)
        body = resp.read().decode('utf-8')
        return resp.status, json.loads(body)
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8')
        try:
            return e.code, json.loads(body)
        except Exception:
            return e.code, body

def get_json(url, token=None):
    headers = {}
    if token:
        headers['Authorization'] = f"Bearer {token}"
    req = urllib.request.Request(url, headers=headers)
    try:
        resp = urllib.request.urlopen(req)
        body = resp.read().decode('utf-8')
        return resp.status, json.loads(body)
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8')
        try:
            return e.code, json.loads(body)
        except Exception:
            return e.code, body

print("=" * 80)
print("TESTING TSK-P1-02-BE: /api/v1/auth/me/ ENDPOINT & OPERATIONAL CAPABILITIES")
print("=" * 80)

# 1. Unauthenticated request must return 401
status_unauth, body_unauth = get_json(f"{BASE_URL}/api/v1/auth/me/")
print(f"[1] Unauthenticated GET /api/v1/auth/me/: HTTP {status_unauth}")
assert status_unauth in (401, 403), f"Expected 401/403, got {status_unauth}"
print("    [OK] Rejected unauthenticated access.")

# 2. Invalid Token must return 401
status_invalid, body_invalid = get_json(f"{BASE_URL}/api/v1/auth/me/", token="invalid.dummy.token")
print(f"[2] Invalid Token GET /api/v1/auth/me/: HTTP {status_invalid}")
assert status_invalid in (401, 403), f"Expected 401/403, got {status_invalid}"
print("    [OK] Rejected forged JWT token.")

# 3. Test Personas and their operational capabilities
personas_to_test = [
    {
        "username": "coa_delhi_chief",
        "expected_dept": "OPERATIONS",
        "expected_role": "CHIEF_CONTROLLER",
        "capabilities": {
            "can_approve_blocks": True,
            "can_request_blocks": False,
            "is_chief_controller": True,
            "is_controller": True,
            "is_dept_engineer": False
        }
    },
    {
        "username": "eng_track_pway",
        "expected_dept": "ENG",
        "expected_role": "DEPT_ENGINEER",
        "capabilities": {
            "can_approve_blocks": False,
            "can_request_blocks": True,
            "is_chief_controller": False,
            "is_controller": False,
            "is_dept_engineer": True
        }
    },
    {
        "username": "trd_ohe_power",
        "expected_dept": "TRD",
        "expected_role": "DEPT_ENGINEER",
        "capabilities": {
            "can_approve_blocks": False,
            "can_request_blocks": True,
            "is_chief_controller": False,
            "is_controller": False,
            "is_dept_engineer": True
        }
    },
    {
        "username": "snt_signal_telecom",
        "expected_dept": "SNT",
        "expected_role": "DEPT_ENGINEER",
        "capabilities": {
            "can_approve_blocks": False,
            "can_request_blocks": True,
            "is_chief_controller": False,
            "is_controller": False,
            "is_dept_engineer": True
        }
    },
    {
        "username": "sec_controller_dli",
        "expected_dept": "OPERATIONS",
        "expected_role": "SECTION_CONTROLLER",
        "capabilities": {
            "can_approve_blocks": True,
            "can_request_blocks": False,
            "is_chief_controller": False,
            "is_controller": True,
            "is_dept_engineer": False
        }
    },
    {
        "username": "admin",
        "expected_dept": "OPERATIONS",
        "expected_role": "ADMIN",
        "capabilities": {
            "can_approve_blocks": True,
            "can_request_blocks": True,
            "is_chief_controller": True,
            "is_controller": True,
            "is_dept_engineer": True
        }
    },
]

print("\n[3] Testing /api/v1/auth/me/ capabilities across personas:")
for p in personas_to_test:
    # Login to get token
    login_status, login_res = post_json(f"{BASE_URL}/api/v1/auth/login/", {
        "username": p["username"],
        "password": "railway@123"
    })
    assert login_status == 200, f"Login failed for {p['username']}"
    token = login_res["data"]["access_token"]
    
    # Call /api/v1/auth/me/
    me_status, me_res = get_json(f"{BASE_URL}/api/v1/auth/me/", token=token)
    assert me_status == 200, f"Failed /auth/me/ for {p['username']}: {me_status} {me_res}"
    assert me_res.get("success") is True
    
    user_data = me_res["data"]
    caps = user_data.get("capabilities", {})
    
    # Assert fields
    assert user_data["username"] == p["username"], f"Username mismatch: {user_data['username']}"
    assert user_data["department_code"] == p["expected_dept"], f"Dept mismatch: {user_data['department_code']}"
    assert user_data["role"] == p["expected_role"], f"Role mismatch: {user_data['role']}"
    
    # Assert capabilities
    for cap_key, expected_val in p["capabilities"].items():
        actual_val = caps.get(cap_key)
        assert actual_val == expected_val, (
            f"Capability {cap_key} for {p['username']}: expected {expected_val}, got {actual_val}"
        )
    
    print(f"    [OK] {p['username']:22} | Role: {user_data['role']:18} | Dept: {user_data['department_code']:10} | Approve: {str(caps['can_approve_blocks']):5} | Request: {str(caps['can_request_blocks']):5}")

print("\n" + "=" * 80)
print("ALL TSK-P1-02-BE VERIFICATION CHECKS PASSED (100%)")
print("=" * 80)
