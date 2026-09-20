import os
import sys
import uuid
import django
from decimal import Decimal
from datetime import timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'railway_sih.settings')
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
django.setup()

from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.accounts.models import UserRole, DepartmentCode, UserProfile
from apps.blocks.models import Block, BlockStatus, LineType, WorkType, Corridor
from apps.ontology.models import SemanticViolation
from apps.ontology.services import DigitalTwinService
from apps.ontology.tasks import run_hermit_reasoner
from apps.trains.models import Train, TrainLiveStatus, TrainLiveRunStatus, TractionType
from apps.trains.delay_engine import DelayCascadeEngine
from apps.trains.tasks import recalculate_delay_cascade_task, ingest_coa_feed
from apps.trains.views import DelayCascadeRecalculateAPIView
from apps.blocks.views import BlockSanctionAPIView

User = get_user_model()


def log(msg, symbol="ℹ️"):
    print(f"[{symbol}] {msg}")


def test_p3_04_be():
    print("=" * 80)
    print("TSK-P3-04-BE: DELAY CASCADE RECALCULATOR & HERMIT DL OHE REASONING TEST")
    print("=" * 80)

    # 0. Setup baseline user & corridor
    corridor = Corridor.objects.filter(code='NDLS-CNB-MAIN').first() or Corridor.objects.first()
    if not corridor:
        corridor = Corridor.objects.create(
            code='NDLS-CNB-MAIN',
            name='New Delhi - Kanpur Central Main Line',
            start_km=Decimal('0.000'),
            end_km=Decimal('440.200'),
        )
    log(f"Active Corridor: {corridor.code} (KM {corridor.start_km} to {corridor.end_km})", "✅")

    coa_user, _ = User.objects.get_or_create(
        username='coa_test_p3_04',
        defaults={'email': 'coa_p3_04@railblock.gov.in'}
    )
    coa_user.is_staff = True
    coa_user.is_superuser = True
    coa_user.save()
    profile, _ = UserProfile.objects.get_or_create(
        user=coa_user,
        defaults={
            'role': UserRole.CHIEF_CONTROLLER,
            'department_code': DepartmentCode.OPERATIONS,
            'employee_id': 'IR-COA-P3-04',
        }
    )
    profile.role = UserRole.CHIEF_CONTROLLER
    profile.save()
    coa_user.refresh_from_db()
    log(f"Authenticated COA Operator: {coa_user.username} ({profile.role})", "✅")

    # Ingest master trains if needed
    if Train.objects.count() < 12:
        log("Seeding canonical master 12 corridor trains...", "⏳")
        ingest_coa_feed()
    log(f"Active corridor trains seeded: {Train.objects.count()} trains", "✅")

    # ------------------------------------------------------------------------
    # Step 1: DelayCascadeEngine Direct Mathematical Simulation
    # ------------------------------------------------------------------------
    log("Step 1: Testing DelayCascadeEngine direct mathematical simulation...", "⚙️")
    engine = DelayCascadeEngine(
        corridor_length_km=3.7,
        imposed_speed_restriction_kmh=30.0,
        initial_delay_minutes=45.0,
        lead_train_number="12424",
    )
    sim_res = engine.simulate()

    assert sim_res['lead_train_delay_minutes'] >= 45.0, f"Lead delay {sim_res['lead_train_delay_minutes']} should be >= 45.0"
    assert len(sim_res['downstream_impacted_trains']) >= 1, "Should identify downstream impacted trains"
    assert sim_res['cumulative_corridor_delay_min'] >= 100.0, f"Cumulative corridor delay {sim_res['cumulative_corridor_delay_min']} should be >= 100m"
    assert sim_res['optimal_action'] == "POSTPONE_BLOCK_WINDOW", f"Optimal action should be POSTPONE_BLOCK_WINDOW, got {sim_res['optimal_action']}"
    assert sim_res['strategy'] == "DYNAMIC_BREATHING_WINDOW", f"Strategy should be DYNAMIC_BREATHING_WINDOW, got {sim_res['strategy']}"
    assert sim_res['breathing_shift_minutes'] >= 45, f"Breathing shift should be >= 45m, got {sim_res['breathing_shift_minutes']}"
    log(f"Lead Train: {sim_res['lead_train_number']} ({sim_res['lead_train_name']}) Delay: +{sim_res['lead_train_delay_minutes']} min", "📊")
    log(f"Downstream Impacted Trains: {len(sim_res['downstream_impacted_trains'])} trains", "📊")
    for t in sim_res['downstream_impacted_trains']:
        log(f"  • {t['train']} -> Ripple Delay: +{t['cascade_delay_min']} min", "  ↳")
    log(f"Cumulative Corridor Delay: {sim_res['cumulative_corridor_delay_min']} min (Saved: {sim_res['cumulative_delay_saved']} min)", "📊")
    log(f"Optimal Strategy: {sim_res['strategy']} (+{sim_res['breathing_shift_minutes']} min shift)", "📊")
    log("Step 1 PASSED: Delay cascade mathematical model verified.", "✅")

    # ------------------------------------------------------------------------
    # Step 2: Celery recalculate_delay_cascade_task
    # ------------------------------------------------------------------------
    log("Step 2: Testing Celery task recalculate_delay_cascade_task...", "⚙️")
    task_res = recalculate_delay_cascade_task(
        train_number="12424",
        delay_minutes=45.0,
        corridor_code="NDLS-CNB-MAIN",
    )
    assert task_res['lead_train_delay_minutes'] >= 45.0
    assert task_res['cumulative_corridor_delay_min'] > 0
    # Check live status updated
    trn_12424 = Train.objects.filter(train_number="12424").first()
    live_status = TrainLiveStatus.objects.filter(train=trn_12424).first()
    assert live_status is not None and live_status.delay_minutes == 45, f"Live status delay should be 45, got {live_status.delay_minutes if live_status else None}"
    log(f"Train 12424 Live Status delay updated in DB: {live_status.delay_minutes} min", "✅")
    log("Step 2 PASSED: Celery delay cascade recalculation task verified.", "✅")

    # ------------------------------------------------------------------------
    # Step 3: REST API DelayCascadeRecalculateAPIView
    # ------------------------------------------------------------------------
    log("Step 3: Testing REST API POST /api/v1/trains/delay-cascade-recalculate/ & GET /api/v1/trains/cascade-matrix/...", "⚙️")
    factory = APIRequestFactory()
    view = DelayCascadeRecalculateAPIView.as_view()

    # POST trigger
    req_post = factory.post(
        '/api/v1/trains/delay-cascade-recalculate/',
        {'train_number': '12424', 'delay_minutes': 45.0, 'corridor_code': 'NDLS-CNB-MAIN'},
        format='json'
    )
    force_authenticate(req_post, user=coa_user)
    resp_post = view(req_post)
    assert resp_post.status_code == 200, f"Expected 200, got {resp_post.status_code}"
    post_data = resp_post.data.get('data', {})
    assert post_data.get('optimal_action') == 'POSTPONE_BLOCK_WINDOW'
    log(f"POST API returned 200 OK with action: {post_data.get('optimal_action')}", "✅")

    # GET matrix
    req_get = factory.get('/api/v1/trains/cascade-matrix/?corridor_code=NDLS-CNB-MAIN')
    force_authenticate(req_get, user=coa_user)
    resp_get = view(req_get)
    assert resp_get.status_code == 200, f"Expected 200, got {resp_get.status_code}"
    get_data = resp_get.data.get('data', {})
    assert get_data.get('lead_train_number') == '12424'
    log(f"GET API returned 200 OK with cumulative delay: {get_data.get('cumulative_corridor_delay_min')} min", "✅")
    log("Step 3 PASSED: REST API endpoints verified.", "✅")

    # ------------------------------------------------------------------------
    # Step 4: 25kV OHE Isolation Hazard & HermiT Reasoner
    # ------------------------------------------------------------------------
    log("Step 4: Testing 25kV OHE Traction Power Cutoff block & HermiT DL reasoning...", "⚙️")
    test_block_code = f"BLK-TRD-TEST-{uuid.uuid4().hex[:6].upper()}"
    ohe_block = Block.objects.create(
        block_code=test_block_code,
        corridor=corridor,
        line_type=LineType.DOWN,
        department_code=DepartmentCode.TRD,
        work_type=WorkType.CATENARY_MAINTENANCE,
        start_km=Decimal('310.000'),
        end_km=Decimal('315.000'),
        scheduled_start_time=timezone.now() + timedelta(hours=1),
        scheduled_end_time=timezone.now() + timedelta(hours=4),
        traction_power_cutoff_required=True,
        work_description="25kV OHE Catenary wire replacement & section insulator overhaul",
        status=BlockStatus.PENDING_APPROVAL,
    )
    log(f"Created Test OHE Block: {ohe_block.block_code} (traction_power_cutoff_required=True)", "⚡")

    # Run HermiT / DL reasoning directly and verify Celery task handles it
    violations = DigitalTwinService.run_reasoning(ohe_block.id)
    log(f"HermiT DL Reasoner produced {len(violations)} semantic violation(s)", "🔍")
    assert len(violations) > 0, "HermiT reasoner must detect at least 1 violation for 25kV power cut with electric trains"

    stranded_violations = [v for v in violations if v.violation_type == SemanticViolation.ViolationType.STRANDED_ELECTRIC_TRAIN]
    assert len(stranded_violations) > 0, "Must detect STRANDED_ELECTRIC_TRAIN violation"
    v0 = stranded_violations[0]
    assert v0.severity == SemanticViolation.Severity.CRITICAL_SAFETY, f"Severity must be CRITICAL_SAFETY, got {v0.severity}"
    assert "RULE-OHE-ELECTRIC-ISOLATION-04" in v0.rule_identifier, f"Rule identifier mismatch: {v0.rule_identifier}"
    assert "বিপদ সংকেত" in v0.explanation_narrative or "Axiom Proof" in v0.explanation_narrative, "Narrative should include DL proof"
    log(f"Detected DL Safety Hazard: [{v0.rule_identifier}] {v0.violation_type} ({v0.severity})", "🛡️")
    log(f"Proof Narrative Preview:\n{v0.explanation_narrative[:220]}...", "📜")
    log("Step 4 PASSED: HermiT DL 25kV OHE isolation reasoning verified.", "✅")

    # ------------------------------------------------------------------------
    # Step 5: Unauthorized Sanctioning Blocked (HTTP 409 Conflict)
    # ------------------------------------------------------------------------
    log("Step 5: Testing that active OHE hazard prevents unauthorized sanctioning (HTTP 409)...", "🔒")
    sanction_view = BlockSanctionAPIView.as_view()

    req_unauth = factory.post(
        f'/api/v1/blocks/{ohe_block.id}/sanction/',
        {
            'action': 'SANCTION',
            'version': ohe_block.version,
            'remarks': 'Attempting unauthorized sanction without resolving OHE hazard',
            'override_semantic_hazards': False,
        },
        format='json'
    )
    force_authenticate(req_unauth, user=coa_user)
    resp_unauth = sanction_view(req_unauth, pk=ohe_block.id)

    assert resp_unauth.status_code == 409, f"Expected HTTP 409 Conflict, got {resp_unauth.status_code}"
    resp_body = resp_unauth.data
    err = resp_body.get('error', {})
    assert err.get('code') == 'SEM-409', f"Unexpected error body: {resp_body}"
    ohe_block.refresh_from_db()
    assert ohe_block.status == BlockStatus.PENDING_APPROVAL, f"Block status must remain PENDING_APPROVAL, got {ohe_block.status}"
    log(f"Sanction blocked successfully! HTTP 409 Conflict returned: {err.get('message')[:100]}...", "🚫")
    log("Step 5 PASSED: Unauthorized sanctioning prevented by DL safety guard.", "✅")

    # ------------------------------------------------------------------------
    # Step 6: Authorized Sanctioning with Explicit Override
    # ------------------------------------------------------------------------
    log("Step 6: Testing authorized sanctioning with explicit COA hazard override...", "🔓")
    req_auth = factory.post(
        f'/api/v1/blocks/{ohe_block.id}/sanction/',
        {
            'action': 'SANCTION',
            'version': ohe_block.version,
            'remarks': 'COA approved with diesel rescue loco on standby at ETW',
            'override_semantic_hazards': True,
        },
        format='json'
    )
    force_authenticate(req_auth, user=coa_user)
    resp_auth = sanction_view(req_auth, pk=ohe_block.id)

    assert resp_auth.status_code == 200, f"Expected HTTP 200 OK, got {resp_auth.status_code}"
    ohe_block.refresh_from_db()
    assert ohe_block.status == BlockStatus.SANCTIONED, f"Block should now be SANCTIONED, got {ohe_block.status}"
    assert "COA HAZARD OVERRIDE" in ohe_block.work_description, "Work description must record COA hazard override audit log"

    # Verify violations marked resolved
    unresolved_after = SemanticViolation.objects.filter(block_id=str(ohe_block.id), resolved=False).count()
    assert unresolved_after == 0, f"All violations for block should be resolved, got {unresolved_after} unresolved"
    log(f"Block successfully sanctioned with override: Version is now v{ohe_block.version}", "🎉")
    log("Step 6 PASSED: Authorized COA hazard override sanctioning verified.", "✅")

    # Clean up test block
    ohe_block.delete()
    print("=" * 80)
    print("ALL TSK-P3-04-BE TESTS PASSED (6/6 STEPS VERIFIED)")
    print("=" * 80)


if __name__ == '__main__':
    test_p3_04_be()
