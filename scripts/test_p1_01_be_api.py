import json
import urllib.request
import urllib.error
import http.cookiejar
import sys

BASE_URL = "http://127.0.0.1:8000"

def post_json(url, data, cookie_jar=None, headers=None):
    if headers is None:
        headers = {}
    headers['Content-Type'] = 'application/json'
    req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers=headers)
    
    opener = urllib.request.build_opener()
    if cookie_jar is not None:
        opener.add_handler(urllib.request.HTTPCookieProcessor(cookie_jar))
        
    try:
        resp = opener.open(req)
        body = resp.read().decode('utf-8')
        return resp.status, json.loads(body), resp
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8')
        try:
            return e.code, json.loads(body), e
        except Exception:
            return e.code, body, e

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
print("TESTING TSK-P1-01-BE: REST API ENDPOINTS ON LIVE BACKEND (http://127.0.0.1:8000)")
print("=" * 80)

# 1. Test Login with coa_delhi_chief
cj = http.cookiejar.CookieJar()
status_code, body, _ = post_json(f"{BASE_URL}/api/v1/auth/login/", {
    "username": "coa_delhi_chief",
    "password": "railway@123"
}, cookie_jar=cj)

print(f"[1] Login with 'coa_delhi_chief': HTTP {status_code}")
assert status_code == 200, f"Expected 200, got {status_code}: {body}"
assert body.get('success') is True, "Expected success=True"
access_token = body['data']['access_token']
user_data = body['data']['user']
print(f"    - Access Token: {access_token[:25]}... (Length: {len(access_token)})")
print(f"    - User: {user_data['username']} | Role: {user_data['role']} | Dept: {user_data['department_code']}")
print(f"    - Employee ID: {user_data['employee_id']}")

# Check cookies set
cookies = {c.name: c.value for c in cj}
print(f"    - Cookies received: {list(cookies.keys())}")
assert 'refresh_token' in cookies, "Expected 'refresh_token' cookie to be set"
refresh_token_val = cookies['refresh_token']

# 2. Test Refresh Token Rotation
cj_refresh = http.cookiejar.CookieJar()
status_code, body_refresh, _ = post_json(f"{BASE_URL}/api/v1/auth/refresh/", {
    "refresh_token": refresh_token_val
}, cookie_jar=cj_refresh)
print(f"[2] Refresh Token Rotation (/api/v1/auth/refresh/): HTTP {status_code}")
assert status_code == 200, f"Expected 200, got {status_code}: {body_refresh}"
new_access_token = body_refresh['data']['access_token']
print(f"    - New Rotated Access Token: {new_access_token[:25]}...")

# 3. Test Anti-Replay: Old refresh token must be rejected
status_code_replay, body_replay, _ = post_json(f"{BASE_URL}/api/v1/auth/refresh/", {
    "refresh_token": refresh_token_val
})
print(f"[3] Anti-Replay test (re-using old refresh token): HTTP {status_code_replay}")
assert status_code_replay in (401, 400), f"Expected 401/400 for replayed token, got {status_code_replay}"
print(f"    - Anti-replay successfully blocked re-use: {body_replay.get('message')}")

# 4. Test Login with All 8 Personas
personas = [
    ('coa_delhi_chief', 'CHIEF_CONTROLLER', 'OPERATIONS'),
    ('sec_controller_dli', 'SECTION_CONTROLLER', 'OPERATIONS'),
    ('admin', 'ADMIN', 'OPERATIONS'),
    ('eng_track_pway', 'DEPT_ENGINEER', 'ENG'),
    ('trd_ohe_power', 'DEPT_ENGINEER', 'TRD'),
    ('snt_signal_telecom', 'DEPT_ENGINEER', 'SNT'),
    ('eng_sse', 'DEPT_ENGINEER', 'ENG'),
    ('site_supervisor_gang01', 'SITE_SUPERVISOR', 'ENG'),
]

print("[4] Testing Login for all 8 Demo Personas:")
for uname, expected_role, expected_dept in personas:
    code, res, _ = post_json(f"{BASE_URL}/api/v1/auth/login/", {
        "username": uname,
        "password": "railway@123"
    })
    assert code == 200, f"Login failed for {uname}: {code} {res}"
    u = res['data']['user']
    assert u['role'] == expected_role, f"Role mismatch for {uname}: expected {expected_role}, got {u['role']}"
    assert u['department_code'] == expected_dept, f"Dept mismatch for {uname}: expected {expected_dept}, got {u['department_code']}"
    print(f"    [OK] {uname:25} -> {u['role']:18} | {u['department_code']:10} | token issued")

print("=" * 80)
print("ALL TSK-P1-01-BE BACKEND VERIFICATION CHECKS PASSED (100%)")
print("=" * 80)
