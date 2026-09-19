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

# Frontend route rules definition matching App.tsx and ProtectedRoute.tsx
ROUTE_POLICIES = {
    "/coa": {
        "allowed_roles": ["CHIEF_CONTROLLER", "SECTION_CONTROLLER", "ADMIN"],
        "allowed_departments": ["OPERATIONS"]
    },
    "/bigscreen": {
        "allowed_roles": ["CHIEF_CONTROLLER", "SECTION_CONTROLLER", "ADMIN"],
        "allowed_departments": ["OPERATIONS"]
    },
    "/eng": {
        "allowed_roles": ["DEPT_ENGINEER", "SITE_SUPERVISOR", "CHIEF_CONTROLLER", "ADMIN"],
        "allowed_departments": ["ENG", "OPERATIONS"]
    },
    "/trd": {
        "allowed_roles": ["DEPT_ENGINEER", "SITE_SUPERVISOR", "CHIEF_CONTROLLER", "ADMIN"],
        "allowed_departments": ["TRD", "OPERATIONS"]
    },
    "/snt": {
        "allowed_roles": ["DEPT_ENGINEER", "SITE_SUPERVISOR", "CHIEF_CONTROLLER", "ADMIN"],
        "allowed_departments": ["SNT", "OPERATIONS"]
    },
}

def evaluate_route_access(user, route):
    """
    Simulates ProtectedRoute logic in frontend/src/components/auth/ProtectedRoute.tsx
    """
    policy = ROUTE_POLICIES.get(route)
    if not policy:
        return True, "No policy on route"
    
    # 1. Role Check
    allowed_roles = policy["allowed_roles"]
    if allowed_roles and user["role"] not in allowed_roles:
        return False, f"Role {user['role']} unauthorized"
    
    # 2. Department Check (Chief Controller and Admin have corridor-wide clearance)
    is_super_user = user["role"] in ["ADMIN", "CHIEF_CONTROLLER"]
    allowed_depts = policy["allowed_departments"]
    if not is_super_user and allowed_depts and user["department_code"] not in allowed_depts:
        return False, f"Department {user['department_code']} isolated from {allowed_depts}"
    
    return True, "Access Granted"

def evaluate_smart_redirect(user):
    """
    Simulates RoleBasedRedirect logic in frontend/src/App.tsx
    """
    if not user:
        return "/login"
    if user["role"] in ["CHIEF_CONTROLLER", "SECTION_CONTROLLER", "ADMIN"]:
        return "/coa"
    if user["department_code"] == "ENG":
        return "/eng"
    if user["department_code"] == "TRD":
        return "/trd"
    if user["department_code"] == "SNT":
        return "/snt"
    return "/coa"

print("=" * 80)
print("TESTING TSK-P1-02-TEST: DEPARTMENTAL ROUTING & ACCESS AUDIT (COA, ENG, TRD, SNT)")
print("=" * 80)

test_personas = [
    {
        "username": "coa_delhi_chief",
        "expected_dept": "OPERATIONS",
        "expected_role": "CHIEF_CONTROLLER",
        "expected_primary_route": "/coa",
        "expected_access": {
            "/coa": True,
            "/bigscreen": True,
            "/eng": True,
            "/trd": True,
            "/snt": True
        }
    },
    {
        "username": "eng_track_pway",
        "expected_dept": "ENG",
        "expected_role": "DEPT_ENGINEER",
        "expected_primary_route": "/eng",
        "expected_access": {
            "/coa": False,
            "/bigscreen": False,
            "/eng": True,
            "/trd": False,
            "/snt": False
        }
    },
    {
        "username": "trd_ohe_power",
        "expected_dept": "TRD",
        "expected_role": "DEPT_ENGINEER",
        "expected_primary_route": "/trd",
        "expected_access": {
            "/coa": False,
            "/bigscreen": False,
            "/eng": False,
            "/trd": True,
            "/snt": False
        }
    },
    {
        "username": "snt_signal_telecom",
        "expected_dept": "SNT",
        "expected_role": "DEPT_ENGINEER",
        "expected_primary_route": "/snt",
        "expected_access": {
            "/coa": False,
            "/bigscreen": False,
            "/eng": False,
            "/trd": False,
            "/snt": True
        }
    },
    {
        "username": "site_supervisor_gang01",
        "expected_dept": "ENG",
        "expected_role": "SITE_SUPERVISOR",
        "expected_primary_route": "/eng",
        "expected_access": {
            "/coa": False,
            "/bigscreen": False,
            "/eng": True,
            "/trd": False,
            "/snt": False
        }
    }
]

for p in test_personas:
    print(f"\n[*] Evaluating Persona: {p['username']}")
    
    # 1. Login and fetch live /auth/me/ context
    status, login_res = post_json(f"{BASE_URL}/api/v1/auth/login/", {
        "username": p["username"],
        "password": "railway@123"
    })
    assert status == 200, f"Login failed for {p['username']}"
    token = login_res["data"]["access_token"]
    
    me_status, me_res = get_json(f"{BASE_URL}/api/v1/auth/me/", token=token)
    assert me_status == 200, f"Failed /auth/me/ for {p['username']}"
    user = me_res["data"]
    
    print(f"    - DB Profile: {user['username']} | Role: {user['role']} | Dept: {user['department_code']}")
    assert user["role"] == p["expected_role"]
    assert user["department_code"] == p["expected_dept"]
    
    # 2. Test Smart Redirect from '/'
    smart_route = evaluate_smart_redirect(user)
    print(f"    - Smart Redirect from '/': {smart_route} (Expected: {p['expected_primary_route']})")
    assert smart_route == p["expected_primary_route"], f"Smart route mismatch for {p['username']}"
    
    # 3. Test Route Matrix Access
    print("    - Departmental Route Clearance Matrix:")
    for route, expected_allowed in p["expected_access"].items():
        allowed, reason = evaluate_route_access(user, route)
        status_text = "ALLOWED" if allowed else "BLOCKED"
        print(f"      • {route:12} -> {status_text:7} [{reason}]")
        assert allowed == expected_allowed, (
            f"Routing mismatch on {route} for {p['username']}: expected {expected_allowed}, got {allowed} ({reason})"
        )

# Test Unauthenticated Redirect
unauth_route = evaluate_smart_redirect(None)
print(f"\n[*] Unauthenticated Smart Redirect from '/': {unauth_route} (Expected: /login)")
assert unauth_route == "/login"

print("\n" + "=" * 80)
print("ALL TSK-P1-02-TEST DEPARTMENTAL ROUTING CHECKS PASSED (100%)")
print("=" * 80)
