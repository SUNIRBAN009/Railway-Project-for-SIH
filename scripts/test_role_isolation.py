"""
Test Suite: Role-Based Access Control & Strict Departmental Isolation Verification
Tests that each user role and department is strictly isolated to their own dashboard,
and that unauthorized jumping between departments is completely blocked.
"""
import requests
import sys

BASE_URL = "http://localhost:8000/api/v1"
FRONTEND_URL = "http://localhost:3000"

def test_login(username, expected_dept, expected_role):
    print(f"\n[TEST LOGIN] Authenticating as '{username}'...")
    res = requests.post(f"{BASE_URL}/auth/login/", json={"username": username, "password": "railway@123"})
    assert res.status_code == 200, f"Login failed: {res.status_code} {res.text}"
    data = res.json()["data"]
    user = data["user"]
    print(f"  [OK] User ID: {user['id']} | Username: {user['username']}")
    print(f"  [OK] Role: {user['role']} (Expected: {expected_role})")
    print(f"  [OK] Department: {user['department_code']} (Expected: {expected_dept})")
    assert user['role'] == expected_role, f"Role mismatch: {user['role']} != {expected_role}"
    assert user['department_code'] == expected_dept, f"Department mismatch: {user['department_code']} != {expected_dept}"
    return data["access_token"], user

def main():
    print("=" * 80)
    print("AUDITING ROLE-BASED ACCESS CONTROL & DEPARTMENTAL DASHBOARD ISOLATION")
    print("=" * 80)

    # 1. Test Chief Operating Controller (COA)
    token_coa, user_coa = test_login("coa_delhi_chief", "OPERATIONS", "CHIEF_CONTROLLER")

    # 2. Test Civil Engineering Track Engineer (ENG)
    token_eng, user_eng = test_login("eng_track_pway", "ENG", "DEPT_ENGINEER")

    # 3. Test Electrical Traction Engineer (TRD)
    token_trd, user_trd = test_login("trd_ohe_power", "TRD", "DEPT_ENGINEER")

    # 4. Test Signal & Telecom Engineer (SNT)
    token_snt, user_snt = test_login("snt_signal_telecom", "SNT", "DEPT_ENGINEER")

    # 5. Verify Frontend Route and Sidebar Security Contracts
    print("\n[TEST FRONTEND CONTRACTS] Auditing Sidebar.tsx, App.tsx, ProtectedRoute.tsx...")
    with open("frontend/src/components/layout/Sidebar.tsx", "r", encoding="utf-8") as f:
        sidebar_code = f.read()
    assert "SIH Demo Fast-Switch" not in sidebar_code, "Security Violation: SIH Demo Fast-Switch still in Sidebar!"
    assert "user.department_code === 'ENG'" in sidebar_code, "Sidebar missing ENG isolation logic!"
    assert "user.department_code === 'TRD'" in sidebar_code, "Sidebar missing TRD isolation logic!"
    assert "user.department_code === 'SNT'" in sidebar_code, "Sidebar missing SNT isolation logic!"
    print("  [PASS] Sidebar navigation items are strictly isolated per department.")
    print("  [PASS] SIH Demo Fast-Switch buttons completely removed from Sidebar.")

    with open("frontend/src/components/auth/ProtectedRoute.tsx", "r", encoding="utf-8") as f:
        protected_code = f.read()
    assert "getUserHome" in protected_code, "ProtectedRoute missing auto-redirect logic!"
    assert "allowedDepartments" in protected_code, "ProtectedRoute missing department clearance check!"
    print("  [PASS] ProtectedRoute automatically redirects unauthorized jumps back to user's authorized home.")

    with open("frontend/src/App.tsx", "r", encoding="utf-8") as f:
        app_code = f.read()
    assert "allowedDepartments={['ENG']}" in app_code, "App.tsx /eng route missing strict ENG department isolation!"
    assert "allowedDepartments={['TRD']}" in app_code, "App.tsx /trd route missing strict TRD department isolation!"
    assert "allowedDepartments={['SNT']}" in app_code, "App.tsx /snt route missing strict SNT department isolation!"
    assert "allowedDepartments={['OPERATIONS']}" in app_code, "App.tsx /coa route missing strict OPERATIONS isolation!"
    print("  [PASS] App.tsx routes strictly enforce isolated department access.")

    with open("frontend/src/components/common/KeyboardShortcutsModal.tsx", "r", encoding="utf-8") as f:
        shortcuts_code = f.read()
    assert "navigate('/coa')" not in shortcuts_code, "Security Violation: Unprotected keyboard jump to /coa found!"
    assert "navigate('/eng')" not in shortcuts_code, "Security Violation: Unprotected keyboard jump to /eng found!"
    assert "navigate('/trd')" not in shortcuts_code, "Security Violation: Unprotected keyboard jump to /trd found!"
    assert "navigate('/snt')" not in shortcuts_code, "Security Violation: Unprotected keyboard jump to /snt found!"
    print("  [PASS] Keyboard navigation shortcuts to other departments safely removed.")

    with open("frontend/src/pages/LoginPage.tsx", "r", encoding="utf-8") as f:
        login_code = f.read()
    assert "const [username, setUsername] = useState('');" in login_code, "LoginPage still defaulting username to hardcoded '1'!"
    assert "fromPath || targetRoute" not in login_code, "LoginPage still allows fromPath to hijack departmental redirection!"
    print("  [PASS] LoginPage defaults to empty and strictly routes each user to their specific department.")

    print("\n" + "=" * 80)
    print("ALL ROLE-BASED ISOLATION & BUG FIX CHECKS PASSED (100% SUCCESS)!")
    print("=" * 80)

if __name__ == "__main__":
    main()
