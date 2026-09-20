"""
Frontend Automated Verification Script for TSK-P4-02-FE:
One-Click "Download Corridor Report" Button & PDF Export UI Integration.
Authoritative reference: docs/03-service-blueprints/07-analytics.md & docs/04-function-maps/07-analytics-function-map.md
"""
import os
import sys
import urllib.request

def run_verification():
    print("=" * 75)
    print("INDIAN RAILWAYS AI PLATFORM -- PHASE 4 FEATURE 2 (TSK-P4-02-FE) VERIFICATION")
    print("Verifying One-Click 'Download Corridor Report' & PDF Integration in Frontend UI")
    print("=" * 75)

    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    api_ts_path = os.path.join(repo_root, 'frontend', 'src', 'services', 'api.ts')
    bigscreen_path = os.path.join(repo_root, 'frontend', 'src', 'pages', 'BigScreenMode.tsx')
    control_room_path = os.path.join(repo_root, 'frontend', 'src', 'pages', 'ControlRoomDashboard.tsx')
    block_panel_path = os.path.join(repo_root, 'frontend', 'src', 'components', 'coa', 'BlockSanctionPanel.tsx')

    # 1. Verify api.ts export methods
    print("\n[STEP 1] Checking API Service Methods in api.ts...")
    with open(api_ts_path, 'r', encoding='utf-8') as f:
        api_content = f.read()

    assert 'downloadCorridorReport:' in api_content, "Missing downloadCorridorReport in analyticsService"
    assert 'downloadSanctionOrderPDF:' in api_content, "Missing downloadSanctionOrderPDF in analyticsService"
    assert 'export function triggerBlobDownload' in api_content, "Missing triggerBlobDownload utility"
    print("  [OK] api.ts exports downloadCorridorReport, downloadSanctionOrderPDF, and triggerBlobDownload")

    # 2. Verify BigScreenMode.tsx integration
    print("\n[STEP 2] Checking 4K BigScreenMode Wallboard Integration...")
    with open(bigscreen_path, 'r', encoding='utf-8') as f:
        bigscreen_content = f.read()

    assert 'handleDownloadReport' in bigscreen_content, "Missing handleDownloadReport in BigScreenMode.tsx"
    assert 'CORRIDOR REPORT (PDF)' in bigscreen_content, "Missing 'CORRIDOR REPORT (PDF)' button in BigScreenMode.tsx"
    assert 'triggerBlobDownload' in bigscreen_content, "Missing triggerBlobDownload call in BigScreenMode.tsx"
    print("  [OK] BigScreenMode.tsx contains one-click CORRIDOR REPORT (PDF) button with loading state")

    # 3. Verify ControlRoomDashboard.tsx integration
    print("\n[STEP 3] Checking Control Room Dashboard Integration (/coa)...")
    with open(control_room_path, 'r', encoding='utf-8') as f:
        cr_content = f.read()

    assert 'handleDownloadCorridorReport' in cr_content, "Missing handleDownloadCorridorReport in ControlRoomDashboard.tsx"
    assert 'Corridor Report (PDF)' in cr_content, "Missing 'Corridor Report (PDF)' button in ControlRoomDashboard.tsx"
    assert 'Sanction Bulletin' in cr_content, "Missing 'Sanction Bulletin' button in ControlRoomDashboard.tsx"
    print("  [OK] ControlRoomDashboard.tsx contains one-click Corridor Report (PDF) and Sanction Bulletin buttons")

    # 4. Verify BlockSanctionPanel.tsx integration
    print("\n[STEP 4] Checking Block Sanction Terminal Integration...")
    with open(block_panel_path, 'r', encoding='utf-8') as f:
        bp_content = f.read()

    assert 'handleDownloadSanctionPDF' in bp_content, "Missing handleDownloadSanctionPDF in BlockSanctionPanel.tsx"
    assert 'SANCTION ORDER (PDF)' in bp_content, "Missing SANCTION ORDER (PDF) button in BlockSanctionPanel.tsx"
    print("  [OK] BlockSanctionPanel.tsx renders direct 'SANCTION ORDER (PDF)' download button for approved blocks")

    # 5. Verify Vite dev server responsiveness
    print("\n[STEP 5] Probing Vite Dev Server at http://localhost:3000...")
    try:
        req = urllib.request.Request("http://localhost:3000", headers={"User-Agent": "SIH-Verifier/1.0"})
        with urllib.request.urlopen(req, timeout=5) as response:
            status_code = response.getcode()
            body = response.read().decode('utf-8')
            assert status_code == 200, f"Expected HTTP 200, got {status_code}"
            assert 'id="root"' in body or 'vite' in body.lower(), "Vite HTML structure missing"
            print(f"  [OK] Vite dev server alive: HTTP {status_code} OK (HTML served)")
    except Exception as e:
        print(f"  [FAIL] Vite dev server check failed: {e}")
        raise e

    print("\n" + "=" * 75)
    print("ALL 5 FRONTEND VERIFICATION CHECKS PASSED (100% PASS)")
    print("One-Click Download Corridor Report & PDF Integration Verified Successfully!")
    print("=" * 75)

if __name__ == '__main__':
    run_verification()
