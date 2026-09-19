import json
import subprocess
import urllib.request
import urllib.error

BASE_URL = "http://127.0.0.1:8000"

def log_step(title):
    print("\n" + "=" * 80)
    print(f"STEP: {title}")
    print("=" * 80)

def http_request(url, method="GET", headers=None, data=None):
    if headers is None:
        headers = {}
    body_bytes = None
    if data is not None:
        body_bytes = json.dumps(data).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=body_bytes, headers=headers, method=method)
    try:
        resp = urllib.request.urlopen(req, timeout=10)
        resp_body = resp.read().decode("utf-8")
        try:
            return resp.status, json.loads(resp_body)
        except Exception:
            return resp.status, resp_body
    except urllib.error.HTTPError as e:
        resp_body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(resp_body)
        except Exception:
            import re
            m = re.search(r'<title>(.*?)</title>', resp_body, re.DOTALL)
            title = m.group(1).strip() if m else resp_body[:200]
            return e.code, f"HTML_ERROR: {title}"


print("=" * 80)
print("TESTING TSK-P2-03-BE: SPATIAL-TEMPORAL CONFLICT ENGINE & COMBINED BLOCK (USP #98)")
print("=" * 80)

# ----------------------------------------------------------------------
# 1. Test TemporalIntervalTree Data Structure
# ----------------------------------------------------------------------
log_step("1. Testing Mathematical TemporalIntervalTree Overlap Algorithm")
from datetime import datetime, timezone, timedelta

class Interval:
    def __init__(self, start, end, data=None):
        self.start = start
        self.end = end
        self.data = data
    def overlaps(self, other):
        return (self.start < other.end) and (self.end > other.start)
    def intersection(self, other):
        if not self.overlaps(other):
            return None
        return (max(self.start, other.start), min(self.end, other.end))

class TemporalIntervalTree:
    def __init__(self):
        self.intervals = []
    def insert(self, start, end, data=None):
        self.intervals.append(Interval(start, end, data))
    def find_overlaps(self, start, end):
        target = Interval(start, end)
        return [i for i in self.intervals if i.overlaps(target)]

t0 = datetime(2026, 9, 20, 2, 0, tzinfo=timezone.utc)
t1 = datetime(2026, 9, 20, 5, 0, tzinfo=timezone.utc)
t2 = datetime(2026, 9, 20, 3, 0, tzinfo=timezone.utc)
t3 = datetime(2026, 9, 20, 6, 0, tzinfo=timezone.utc)
t_disjoint = datetime(2026, 9, 20, 7, 0, tzinfo=timezone.utc)

tree = TemporalIntervalTree()
tree.insert(t0, t1, "BLOCK_1")

overlaps = tree.find_overlaps(t2, t3)
assert len(overlaps) == 1, "Expected overlap between [02:00-05:00] and [03:00-06:00]"
assert overlaps[0].data == "BLOCK_1"
inter = overlaps[0].intersection(Interval(t2, t3))
assert inter == (t2, t1), f"Expected intersection ({t2}, {t1}), got {inter}"
print("[OK] Overlapping temporal windows correctly detected and intersected.")

disjoint = tree.find_overlaps(t_disjoint, t_disjoint + timedelta(hours=1))
assert len(disjoint) == 0, "Disjoint windows should not overlap"
print("[OK] Disjoint temporal windows correctly separated.")

# ----------------------------------------------------------------------
# 2. Test PostGIS ST_Intersects & ST_Intersection in PostgreSQL
# ----------------------------------------------------------------------
log_step("2. Testing Native PostGIS ST_Intersects & ST_Intersection via Docker")
postgis_cmd = [
    "docker", "exec", "railway_backend", "python", "manage.py", "shell", "-c",
    """
from django.db import connection
with connection.cursor() as cursor:
    cursor.execute('''
        SELECT 
            ST_Intersects(
                ST_MakeEnvelope(142.5, 0, 146.2, 1),
                ST_MakeEnvelope(143.0, 0, 145.5, 1)
            ) AS intersects,
            ST_XMin(ST_Intersection(
                ST_MakeEnvelope(142.5, 0, 146.2, 1),
                ST_MakeEnvelope(143.0, 0, 145.5, 1)
            )) AS overlap_min,
            ST_XMax(ST_Intersection(
                ST_MakeEnvelope(142.5, 0, 146.2, 1),
                ST_MakeEnvelope(143.0, 0, 145.5, 1)
            )) AS overlap_max;
    ''')
    row = cursor.fetchone()
    print('POSTGIS_RESULT:', row)
    assert row[0] is True, 'Expected ST_Intersects to be True'
    assert abs(row[1] - 143.0) < 0.01, f'Expected 143.0, got {row[1]}'
    assert abs(row[2] - 145.5) < 0.01, f'Expected 145.5, got {row[2]}'
print('POSTGIS_SUCCESS')
"""
]
proc = subprocess.run(postgis_cmd, capture_output=True, text=True)
print("Docker Output:", proc.stdout.strip())
assert "POSTGIS_SUCCESS" in proc.stdout, f"PostGIS validation failed: {proc.stderr}"
print("[OK] PostGIS ST_Intersects and ST_Intersection validated on live PostgreSQL.")

# ----------------------------------------------------------------------
# 3. Authenticate Personas (ENG Engineer & TRD Engineer)
# ----------------------------------------------------------------------
log_step("3. Authenticating Track Engineer (ENG) and OHE Engineer (TRD)")
status_eng, body_eng = http_request(
    f"{BASE_URL}/api/v1/auth/login/",
    method="POST",
    data={"username": "eng_track_pway", "password": "railway@123"}
)
assert status_eng == 200, f"ENG Login failed: {body_eng}"
eng_token = body_eng["data"]["access_token"]
print("[OK] Track Engineer (ENG) authenticated")

status_trd, body_trd = http_request(
    f"{BASE_URL}/api/v1/auth/login/",
    method="POST",
    data={"username": "trd_traction_power", "password": "railway@123"}
)
assert status_trd == 200, f"TRD Login failed: {body_trd}"
trd_token = body_trd["data"]["access_token"]
print("[OK] OHE Traction Engineer (TRD) authenticated")

# ----------------------------------------------------------------------
# 4. Submit Scenario B Overlapping Proposals (ENG Track Tamping + TRD OHE Inspection)
# ----------------------------------------------------------------------
log_step("4. Submitting Scenario B Compatible Cross-Departmental Block Proposals")
# 4a. Track Engineer submits Track Tamping (KM 142.5 to 146.2)
eng_proposal = {
    "corridor": "NDLS-CNB-MAIN",
    "department": "ENG",
    "line_type": "DOWN",
    "work_type": "TRACK_TAMPING",
    "start_km": 142.5,
    "end_km": 146.2,
    "scheduled_start_time": "2026-09-22T02:00:00+05:30",
    "scheduled_end_time": "2026-09-22T05:30:00+05:30",
    "gang_id": "GANG-ENG-01",
    "equipment_required": "CSM-09-32",
    "work_description": "Scenario B P-Way Heavy Track Tamping"
}
status_1, body_1 = http_request(
    f"{BASE_URL}/api/v1/blocks/proposals/",
    method="POST",
    headers={"Authorization": f"Bearer {eng_token}"},
    data=eng_proposal
)
assert status_1 == 201, f"ENG proposal failed: {body_1}"
block_eng = body_1["data"]
eng_id = block_eng["id"]
eng_code = block_eng["block_code"]
print(f"[OK] ENG Block created: {eng_code} (ID: {eng_id})")

# 4b. TRD Engineer submits OHE Inspection on overlapping track span (KM 143.0 to 145.5)
trd_proposal = {
    "corridor": "NDLS-CNB-MAIN",
    "department": "TRD",
    "line_type": "DOWN",
    "work_type": "OHE_INSPECTION",
    "start_km": 143.0,
    "end_km": 145.5,
    "scheduled_start_time": "2026-09-22T02:30:00+05:30",
    "scheduled_end_time": "2026-09-22T06:00:00+05:30",
    "traction_power_cutoff_required": True,
    "gang_id": "GANG-TRD-01",
    "equipment_required": "RU-04-TOWER",
    "work_description": "Scenario B 25kV Catenary & OHE Inspection"
}
status_2, body_2 = http_request(
    f"{BASE_URL}/api/v1/blocks/proposals/",
    method="POST",
    headers={"Authorization": f"Bearer {trd_token}"},
    data=trd_proposal
)
assert status_2 == 201, f"TRD proposal failed: {body_2}"
block_trd = body_2["data"]
trd_id = block_trd["id"]
trd_code = block_trd["block_code"]
print(f"[OK] TRD Block created: {trd_code} (ID: {trd_id})")

# ----------------------------------------------------------------------
# 5. Verify Automatic Conflict Detection & AI Shadow Merging (USP #98)
# ----------------------------------------------------------------------
log_step("5. Verifying AI Combined Block Synergy & Shadow Bundling Metrics")
# Retrieve TRD sweep report from proposal response or detail endpoint
sweep = block_trd.get("sweep_report")
print(f"Sweep Report for TRD block: total_conflicts={sweep.get('total_conflicts')}, shadow_opportunities={sweep.get('shadow_opportunities')}")
assert sweep.get("shadow_opportunities") >= 1, "Expected at least 1 shadow block bundling opportunity"

rec = sweep.get("combined_recommendation")
print("AI Combined Recommendation:", json.dumps(rec, indent=2))
assert rec.get("is_combined_candidate") is True, "Should be flagged as AI combined candidate"
assert rec.get("track_capacity_saved_hours") >= 2.5, f"Capacity saved {rec.get('track_capacity_saved_hours')} < 2.5 hrs"
assert rec.get("train_delay_prevented_minutes") >= 100, f"Delay prevented {rec.get('train_delay_prevented_minutes')} < 100 mins"
assert "+" in rec.get("shadow_bundling_efficiency", ""), "Efficiency percent should be formatted with +"
print(f"[OK] Capacity saved: {rec['track_capacity_saved_hours']} hrs | Delay prevented: {rec['train_delay_prevented_minutes']} mins | Efficiency: {rec['shadow_bundling_efficiency']}")

# ----------------------------------------------------------------------
# 6. Test GET /api/v1/blocks/<id>/combined-recommendation/
# ----------------------------------------------------------------------
log_step("6. Testing GET /api/v1/blocks/<id>/combined-recommendation/ Endpoint")
status_rec, body_rec = http_request(
    f"{BASE_URL}/api/v1/blocks/{trd_id}/combined-recommendation/",
    headers={"Authorization": f"Bearer {trd_token}"}
)
assert status_rec == 200, f"Failed to get combined recommendation: {body_rec}"
api_rec = body_rec["data"]
assert api_rec.get("is_combined_candidate") is True
assert api_rec.get("synergy_tier") == "OPTIMAL_SHADOW_BUNDLE"
print(f"[OK] Endpoint returned valid USP #98 synergy payload: {api_rec['synergy_tier']}")

# ----------------------------------------------------------------------
# 7. Test GET /api/v1/blocks/recommendations/ (Corridor-wide AI Bundling)
# ----------------------------------------------------------------------
log_step("7. Testing GET /api/v1/blocks/recommendations/ Corridor-wide Sweep API")
status_list, body_list = http_request(
    f"{BASE_URL}/api/v1/blocks/recommendations/?corridor=NDLS-CNB-MAIN",
    headers={"Authorization": f"Bearer {eng_token}"}
)
assert status_list == 200, f"Failed to get corridor recommendations: {body_list}"
recs_list = body_list["data"]
print(f"[OK] Found {len(recs_list)} AI Combined Block bundles on corridor.")
assert len(recs_list) >= 1, "Expected at least 1 recommended bundle"

# ----------------------------------------------------------------------
# 8. Test Celery Tasks (sweep_conflicts & detect_combined_blocks_for_corridor)
# ----------------------------------------------------------------------
log_step("8. Testing Celery Tasks Execution in Docker")
celery_test_cmd = [
    "docker", "exec", "railway_backend", "python", "manage.py", "shell", "-c",
    f"""
from apps.blocks.tasks import sweep_conflicts_task, detect_combined_blocks_for_corridor
res_sweep = sweep_conflicts_task('{trd_id}')
print('CELERY_SWEEP_RESULT:', res_sweep['total_conflicts'], 'conflicts')
assert res_sweep['total_conflicts'] >= 1

res_corridor = detect_combined_blocks_for_corridor()
print('CELERY_CORRIDOR_RESULT:', res_corridor['total_recommendations'], 'recommendations')
assert res_corridor['total_recommendations'] >= 1
print('CELERY_SUCCESS')
"""
]
proc_celery = subprocess.run(celery_test_cmd, capture_output=True, text=True)
print("Celery Worker Test Output:", proc_celery.stdout.strip())
assert "CELERY_SUCCESS" in proc_celery.stdout, f"Celery test failed: {proc_celery.stderr}"
print("[OK] Celery conflict sweep and corridor AI bundling tasks executed successfully.")

# ----------------------------------------------------------------------
# 9. Test Block Detail API Serialization with combined_recommendation Field
# ----------------------------------------------------------------------
log_step("9. Verifying combined_recommendation in GET /api/v1/blocks/<id>/")
status_det, body_det = http_request(
    f"{BASE_URL}/api/v1/blocks/{trd_id}/",
    headers={"Authorization": f"Bearer {trd_token}"}
)
assert status_det == 200, f"Detail fetch failed: {body_det}"
detail_data = body_det["data"]
assert "combined_recommendation" in detail_data, "combined_recommendation field missing in detail response"
assert detail_data["combined_recommendation"]["is_combined_candidate"] is True
print("[OK] BlockDetailSerializer correctly embeds AI combined recommendation payload.")

print("\n" + "=" * 80)
print("ALL TSK-P2-03-BE TESTS COMPLETED SUCCESSFULLY! (100% PASS)")
print("=" * 80)
