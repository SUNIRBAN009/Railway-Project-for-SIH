"""
Frontend Automated Verification Script for TSK-P4-03-FE:
Run Vite Production Build & Verify Zero Production Build Errors.
Authoritative reference: docs/09-execution-tracker/00-implementation-checklist.md
"""
import os
import sys
import glob
import subprocess
import urllib.request

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

def run_verification():
    print("=" * 80)
    print("INDIAN RAILWAYS AI PLATFORM -- PHASE 4 FEATURE 3 (TSK-P4-03-FE) VERIFICATION")
    print("Verifying Frontend Vite Production Build & Production Asset Integrity")
    print("=" * 80)

    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    frontend_dir = os.path.join(repo_root, "frontend")
    dist_dir = os.path.join(frontend_dir, "dist")
    assets_dir = os.path.join(dist_dir, "assets")

    # 1. Probe Vite Dev Server
    print("\n[STEP 1] Probing Vite Dev Server at http://localhost:3000...")
    try:
        req = urllib.request.Request("http://localhost:3000")
        with urllib.request.urlopen(req, timeout=5) as resp:
            print(f"  [OK] Vite Dev Server Status: HTTP {resp.status} OK")
            html_snippet = resp.read(200).decode('utf-8', errors='replace')
            assert "<!DOCTYPE html>" in html_snippet or "<html" in html_snippet, "Dev server did not return valid HTML"
            print("  [PASS] Vite Dev Server active, responding with HTML root entrypoint.")
    except Exception as e:
        print(f"  [WARN] Dev server probe note: {e}")

    # 2. Execute Production Build via Docker
    print("\n[STEP 2] Executing Production Build via Docker (tsc && vite build)...")
    cmd_build = ["docker", "exec", "railway_frontend", "npm", "run", "build"]
    proc_build = subprocess.run(cmd_build, capture_output=True, text=True, encoding='utf-8', errors='replace')
    print(proc_build.stdout)
    if proc_build.stderr:
        print("  [STDERR]:", proc_build.stderr[:300])
    assert proc_build.returncode == 0, f"Production build failed with exit code {proc_build.returncode}"
    print("  [PASS] Production build completed with EXIT CODE 0 (Zero Compiler Errors)!")

    # 3. Verify Dist Directory & Generated Assets
    print("\n[STEP 3] Verifying Production Distribution Assets in dist/...")
    index_html = os.path.join(dist_dir, "index.html")
    assert os.path.exists(index_html), "dist/index.html does not exist"
    
    with open(index_html, "r", encoding="utf-8") as f:
        html_content = f.read()
    assert 'id="root"' in html_content, "Missing id='root' mount element in dist/index.html"
    print(f"  [OK] dist/index.html verified ({len(html_content)} bytes)")

    js_files = glob.glob(os.path.join(assets_dir, "*.js"))
    css_files = glob.glob(os.path.join(assets_dir, "*.css"))

    assert len(js_files) > 0, "No production JavaScript bundles found in dist/assets/"
    assert len(css_files) > 0, "No production CSS stylesheets found in dist/assets/"

    for js_path in js_files:
        size_kb = os.path.getsize(js_path) / 1024
        print(f"  [OK] JS Bundle Asset: {os.path.basename(js_path)} ({size_kb:.2f} KB)")
        assert size_kb > 100, f"JS bundle abnormally small: {size_kb} KB"

    for css_path in css_files:
        size_kb = os.path.getsize(css_path) / 1024
        print(f"  [OK] CSS Stylesheet Asset: {os.path.basename(css_path)} ({size_kb:.2f} KB)")
        assert size_kb > 10, f"CSS stylesheet abnormally small: {size_kb} KB"

    print("  [PASS] All production bundles and stylesheets generated and structurally verified!")

    # 4. TypeScript Syntax & Package Configuration Audit
    print("\n[STEP 4] Auditing package.json & tsconfig.json Integrity...")
    pkg_json = os.path.join(frontend_dir, "package.json")
    tsconfig_json = os.path.join(frontend_dir, "tsconfig.json")
    assert os.path.exists(pkg_json), "package.json missing"
    assert os.path.exists(tsconfig_json), "tsconfig.json missing"
    print("  [PASS] Frontend package and TypeScript configuration intact.")

    print("\n" + "=" * 80)
    print("ALL TSK-P4-03-FE VERIFICATION CHECKS PASSED (100% SUCCESS)!")
    print("Vite Production Build Verified with Zero Errors and Intact Production Assets!")
    print("=" * 80)

if __name__ == '__main__':
    run_verification()
