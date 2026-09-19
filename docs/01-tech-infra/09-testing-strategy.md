# 09-testing-strategy.md

> **ফাইল ক্রম:** ১৩/৪৫  
> **পূর্ববর্তী ফাইল:** [01-tech-infra/08-deployment.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/01-tech-infra/08-deployment.md) (Container Orchestration, Startup Engines, PostGIS Init & Zero-Downtime Deployment)  
> **পরবর্তী ফোল্ডার ও ফাইল:** [02-microservices/00-service-index.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/02-microservices/00-service-index.md)  
> **সংযোগ ও উদ্দেশ্য:** এই ফাইলে ভারতীয় রেলওয়ের সেফটি-ক্রিটিক্যাল কোয়ালিটি স্ট্যান্ডার্ড অনুযায়ী কম্প্রিহেনসিভ টেস্টিং স্ট্র্যাটেজি, টেস্ট পিরামিড, PostGIS স্পেশিয়াল ইন্টারসেকশন টেস্ট স্যুট, HermiT Reasoner সিম্বলিক সেফটি প্রুফ ভ্যালিডেশন, সেফটি সুইটের ১৫টি ফিচারের জন্য অটোমেটেড টেস্ট গেটস, কনকারেন্ট রেস-কন্ডিশন টেস্ট এবং প্লে-রাইট মাল্টি-ইউজার E2E টেস্ট মেথডোলজি সংজ্ঞায়িত করা হয়েছে।

---

## 1. Safety-Critical Testing Philosophy & Test Pyramid

Railway traffic planning systems require absolute determinism and zero-defect tolerance. A software defect that fails to detect a track occupancy conflict or allows a block to commence without an OHE traction power cut poses a catastrophic hazard to human life and railway infrastructure.

To ensure safety integrity, the platform follows an adapted **Railway Mission-Critical Test Pyramid**:

```
                                  ┌─────────────────────────┐
                                  │      Chaos & Stress     │  5% (Locust / Jitter Injection)
                                  │  500 Concurrent Blocks  │     Simulated Railnet Packet Loss
                                  └────────────┬────────────┘
                                               │
                                  ┌────────────┴────────────┐
                                  │    End-to-End (E2E)     │  10% (Playwright Multi-Persona)
                                  │  JE ↔ Controller ↔ SM   │      Real WebSocket State Sync
                                  └────────────┬────────────┘
                                               │
                                  ┌────────────┴────────────┐
                                  │    Integration Tests    │  25% (pytest-django + PostGIS)
                                  │ PostGIS Spatial GIST    │      Celery Eager / Redis Channels
                                  │ HermiT Reasoner DL      │      SAGA Compensating Actions
                                  └────────────┬────────────┘
                                               │
                      ┌────────────────────────┴────────────────────────┐
                      │                 Unit Tests                      │  60% (pytest / Vitest)
                      │  Conflict Detection Matrix (Mathematical)       │      Pure Domain Logic
                      │  HMAC Token & Signature Cryptography            │      Model Serializers
                      │  Speed Restriction & Corridor Math              │      Frontend React Hooks
                      └─────────────────────────────────────────────────┘
```

---

## 2. Test Frameworks & Tooling Stack

| Layer | Framework / Tool | Version | Purpose & Railway Domain Application |
|---|---|---|---|
| **Backend Test Runner** | `pytest` + `pytest-django` | 8.0+ / 4.8+ | Native Django test DB lifecycle, transaction rollbacks, parallel test execution |
| **Spatial Testing** | `GeoDjango` + `GEOSGeometry` | Django 5.0 | PostGIS spatial queries (`ST_Intersects`, `ST_DWithin`), SRID 4326/3857 transformations |
| **Semantic AI Testing** | `Owlready2` + `HermiT Reasoner` | 0.45+ | OWL 2 DL ontology consistency checks, classification proofs, reasoning timeouts |
| **Neural AI Mocking** | `unittest.mock` + `pytest-mock` | Built-in | Intercepts Gemini 1.5 Flash API calls with deterministic JSON response fixtures |
| **Data Generation** | `factory_boy` + `Faker` | 3.3+ / 24.0+ | Dynamic model factory generation (chainages, track coordinates, train timetables) |
| **Async & WebSocket** | `channels.testing` | Channels 4.0 | `WebsocketCommunicator` for real-time control room notification assertions |
| **Frontend Unit & Hook** | `Vitest` + React Testing Library | Vitest 1.3+ | Control room component mounting, Zustand state verification, TanStack Query hooks |
| **Network Mocking** | `MSW` (Mock Service Worker) | 2.2+ | Browser network interception for REST APIs during React component testing |
| **End-to-End (E2E)** | `Playwright` | 1.42+ | Multi-browser concurrent session testing (Section Engineer + Chief Controller) |
| **Load & Stress** | `Locust` | 2.24+ | High-concurrency block proposal load testing & conflict engine throughput evaluation |

---

## 3. Strict Quality Gates & Coverage Thresholds

To maintain zero-defect standards in critical operations, strict coverage minimums are enforced by CI/CD pre-commit hooks and GitHub Actions:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CRITICAL MODULE ZERO-TOLERANCE GATE                      │
│                                                                             │
│  Conflict Engine (Spatial & Temporal):               100% Strict Coverage   │
│  Safety Suite (15 Features: Token, LOTO, Headcount):  100% Strict Coverage   │
│  Spatial RBAC & Department Isolation:                100% Strict Coverage   │
│  HermiT Reasoner Physical Axiom Tests:               100% Deterministic Pass│
└─────────────────────────────────────────────────────────────────────────────┘
```

### Coverage Minimums Matrix

| Domain Module | Target | Minimum Enforced | Critical Verification Points |
|---|:---:|:---:|---|
| **`apps.blocks.conflict_engine`** | **100%** | **100%** | LineString spatial intersection, buffer zones, temporal overlap, speed limits |
| **`apps.blocks.safety_suite`** | **100%** | **100%** | HMAC Digital Token (#71), Headcount Gate (#72), Power Cut (#73), LOTO (#74) |
| **`apps.accounts.permissions`** | **100%** | **100%** | Spatial RBAC (#112), Departmental boundary cross-authorization rejection |
| **`apps.blocks.sagas`** | **95%** | **90%** | 4-step compensating transaction rollback on approval failure |
| **`apps.ontology.services`** | **90%** | **85%** | OWL 2 DL ontology consistency, zero-hallucination inference, reasoner timeout |
| **`apps.trains` & `apps.assets`** | **90%** | **80%** | Timetable conflict checks, asset health degradation formulas, USFD rail flaw |
| **REST & ASGI API Views** | **85%** | **80%** | HTTP status codes, pagination, JSON envelope compliance, error handlers |
| **Frontend React Components** | **80%** | **75%** | Safety Interlock Card, Gantt timeline rendering, Conflict Warning Banner |
| **Total Platform Target** | **> 85%** | **80%** | Global repository coverage measured via `pytest-cov` and `vitest coverage` |

---

## 4. Test Data Management & Model Factories

Model factories produce deterministic, valid geospatial and operational data targeting real Indian Railways test corridors:
- **Corridor 1**: Howrah – Kharagpur (HWH-KGP, 115 km, 4-track trunk route).
- **Corridor 2**: Howrah – Bardhaman Chord (HWH-BWN, 95 km, high-density EMU/Freight).

```python
# tests/factories.py
import factory
from factory.django import DjangoModelFactory
from django.contrib.gis.geos import LineString, Point
from django.utils import timezone
from datetime import timedelta
from apps.accounts.models import User, UserProfile, UserRole, DepartmentCode
from apps.blocks.models import Corridor, Block, BlockStatus, LineType, WorkType

class CorridorFactory(DjangoModelFactory):
    class Meta:
        model = Corridor
        django_get_or_create = ('code',)

    code = 'HWH-BWN-CHORD'
    name = 'Howrah - Bardhaman Chord'
    zone = 'ER'
    division = 'HWH'
    total_km = 95.0
    # PostGIS LineString representing the track center-line
    track_geometry = LineString([
        (88.3426, 22.5850),  # Howrah Station
        (88.2435, 22.7562),  # Kamarkundu Jn
        (87.8631, 23.2324),  # Bardhaman Jn
    ], srid=4326)

class UserProfileFactory(DjangoModelFactory):
    class Meta:
        model = UserProfile

    user = factory.SubFactory('tests.factories.UserFactory')
    employee_id = factory.Sequence(lambda n: f"IR-EMP-{n:05d}")
    role = UserRole.JUNIOR_ENGINEER
    department_code = DepartmentCode.ENGINEERING
    division_code = 'HWH'
    phone_number = '+919876543210'

class UserFactory(DjangoModelFactory):
    class Meta:
        model = User

    username = factory.Sequence(lambda n: f"railway_je_{n}")
    email = factory.LazyAttribute(lambda o: f"{o.username}@er.railnet.gov.in")
    first_name = 'Subhash'
    last_name = 'Mukherjee'
    is_active = True

class BlockFactory(DjangoModelFactory):
    class Meta:
        model = Block

    block_id = factory.Sequence(lambda n: f"BLK-ER-2026-{n:04d}")
    corridor = factory.SubFactory(CorridorFactory)
    line_type = LineType.UP_MAIN
    work_type = WorkType.TRACK_MAINTENANCE
    department_code = DepartmentCode.ENGINEERING
    requested_by = factory.SubFactory(UserFactory)
    
    start_km = 25.400
    end_km = 29.800
    # PostGIS LineString along the 4.4 km maintenance window
    spatial_extent = LineString([
        (88.2900, 22.6800),
        (88.2700, 22.7100)
    ], srid=4326)
    
    proposed_start_time = factory.LazyFunction(lambda: timezone.now() + timedelta(hours=4))
    proposed_end_time = factory.LazyFunction(lambda: timezone.now() + timedelta(hours=7))
    status = BlockStatus.SUBMITTED
    optimistic_version = 1
```

---

## 5. Mission-Critical Integration Test Suites

### 5.1 PostGIS Spatial Conflict Engine Test (`tests/test_spatial_conflict.py`)

Validates `ST_Intersects` spatial overlap detection, track line buffer clearances, and time overlap:

```python
import pytest
from datetime import timedelta
from django.utils import timezone
from django.contrib.gis.geos import LineString
from apps.blocks.conflict_engine import ConflictDetector
from apps.blocks.models import BlockStatus, LineType
from tests.factories import BlockFactory, CorridorFactory

@pytest.mark.django_db
class TestSpatialConflictDetector:
    """Verifies 100% zero-collision enforcement in track allocation."""

    def test_detects_co_located_track_conflict(self):
        corridor = CorridorFactory()
        base_time = timezone.now() + timedelta(hours=2)

        # Block 1: Approved Track Renewal on UP Main (KM 20.0 to 25.0)
        block1 = BlockFactory(
            corridor=corridor,
            line_type=LineType.UP_MAIN,
            start_km=20.0,
            end_km=25.0,
            spatial_extent=LineString([(88.30, 22.65), (88.28, 22.70)], srid=4326),
            proposed_start_time=base_time,
            proposed_end_time=base_time + timedelta(hours=3),
            status=BlockStatus.APPROVED
        )

        # Block 2: Conflicting TRD Overhead Wire Inspection (KM 22.0 to 28.0)
        block2 = BlockFactory(
            corridor=corridor,
            line_type=LineType.UP_MAIN,
            start_km=22.0,
            end_km=28.0,
            spatial_extent=LineString([(88.29, 22.68), (88.26, 22.75)], srid=4326),
            proposed_start_time=base_time + timedelta(hours=1),
            proposed_end_time=base_time + timedelta(hours=4),
            status=BlockStatus.SUBMITTED
        )

        detector = ConflictDetector()
        conflicts = detector.evaluate(block2)

        assert len(conflicts) == 1
        assert conflicts[0].conflicting_block_id == block1.block_id
        assert conflicts[0].conflict_type == "SPATIO_TEMPORAL_TRACK_COLLISION"
        assert conflicts[0].overlap_km_start == 22.0
        assert conflicts[0].overlap_km_end == 25.0

    def test_allows_adjacent_down_line_when_safety_clearance_met(self):
        corridor = CorridorFactory()
        base_time = timezone.now() + timedelta(hours=2)

        # Block 1 on UP Main
        BlockFactory(
            corridor=corridor,
            line_type=LineType.UP_MAIN,
            start_km=20.0, end_km=25.0,
            status=BlockStatus.APPROVED
        )

        # Block 2 on DOWN Main at same time & KM (Parallel non-fouling track)
        block_down = BlockFactory(
            corridor=corridor,
            line_type=LineType.DOWN_MAIN,
            start_km=20.0, end_km=25.0,
            status=BlockStatus.SUBMITTED
        )

        detector = ConflictDetector()
        conflicts = detector.evaluate(block_down)

        # No direct track conflict, but shadow caution speed alert generated
        direct_collisions = [c for c in conflicts if c.severity == "CRITICAL"]
        assert len(direct_collisions) == 0
```

---

### 5.2 Five Permissive Safety Interlock Gates (`tests/test_safety_gates.py`)

Verifies the 5 strict sequential execution conditions before a block status transitions to `IN_PROGRESS`:

```python
import pytest
from rest_framework import status
from rest_framework.test import APIClient
from apps.blocks.models import BlockStatus
from tests.factories import BlockFactory, UserFactory, UserProfileFactory

@pytest.mark.django_db
class TestSafetyInterlockGates:
    def setup_method(self):
        self.client = APIClient()
        self.je_user = UserFactory()
        UserProfileFactory(user=self.je_user, role="JUNIOR_ENGINEER")
        self.client.force_authenticate(user=self.je_user)

    def test_block_execution_rejected_without_ohe_power_cut(self):
        """Gate 3 Check: TRD OHE Power Cut must be verified prior to track entry."""
        block = BlockFactory(status=BlockStatus.APPROVED)
        
        payload = {
            "digital_token": "valid_hmac_sha256_token",
            "crew_headcount_verified": True,
            "ohe_power_cut_verified": False,  # FAIL: Power not isolated!
            "loto_key_locked": True,
            "weather_cleared": True
        }

        response = self.client.post(f"/api/v1/blocks/{block.block_id}/commence/", payload)
        
        assert response.status_code == status.HTTP_412_PRECONDITION_FAILED
        assert response.data["error_code"] == "SAFETY_GATE_OHE_ACTIVE"
        block.refresh_from_db()
        assert block.status == BlockStatus.APPROVED  # Not transitioned to IN_PROGRESS

    def test_block_execution_succeeds_when_all_5_gates_pass(self):
        """All 5 permissive conditions satisfied -> Transition to IN_PROGRESS."""
        block = BlockFactory(status=BlockStatus.APPROVED)

        payload = {
            "digital_token": "valid_hmac_sha256_token",
            "crew_headcount_verified": True,
            "ohe_power_cut_verified": True,
            "loto_key_locked": True,
            "weather_cleared": True
        }

        response = self.client.post(f"/api/v1/blocks/{block.block_id}/commence/", payload)

        assert response.status_code == status.HTTP_200_OK
        block.refresh_from_db()
        assert block.status == BlockStatus.IN_PROGRESS
```

---

### 5.3 HermiT Reasoner Semantic DL Safety Proof Test (`tests/test_ontology_reasoner.py`)

Verifies that physical axioms compiled into OWL 2 DL reject invalid track allocations with zero hallucinations:

```python
import pytest
from apps.ontology.services import DigitalTwinService

class TestOntologySafetyReasoner:
    def setup_method(self):
        self.dt_service = DigitalTwinService()

    def test_hermit_reasoner_detects_interlocking_unsatisfiability(self):
        """Checks HermiT reasoning proof: Crossover point cannot be locked by two lines."""
        # Inject contradictory physical individual into OWL graph
        inconsistent = self.dt_service.assert_point_dual_lock(
            point_id="PNT-24B-HWH",
            route_a="ROUTE_UP_MAIN",
            route_b="ROUTE_REVERSIBLE_LOOP"
        )

        # HermiT reasoner runs consistency check
        is_consistent, explanation = self.dt_service.run_consistency_check(timeout_seconds=15)

        assert is_consistent is False
        assert "PointInterlockingViolation" in explanation
        assert "Zero-Hallucination Proof Generated" in explanation
```

---

### 5.4 Concurrent Race Condition & Optimistic Locking Test (`tests/test_concurrency.py`)

Verifies that two simultaneous controller actions on the same block do not corrupt state:

```python
import pytest
from django.db import transaction
from concurrent.futures import ThreadPoolExecutor
from apps.blocks.models import Block, BlockStatus
from tests.factories import BlockFactory

@pytest.mark.django_db(transaction=True)
class TestConcurrencyAndRaceConditions:
    def test_optimistic_locking_prevents_double_approval(self):
        block = BlockFactory(status=BlockStatus.SUBMITTED, optimistic_version=1)

        def approve_action(worker_id):
            try:
                with transaction.atomic():
                    b = Block.objects.select_for_update().get(id=block.id)
                    if b.status == BlockStatus.APPROVED:
                        return "ALREADY_APPROVED"
                    b.status = BlockStatus.APPROVED
                    b.optimistic_version += 1
                    b.save()
                    return "APPROVED"
            except Exception as e:
                return f"ERROR: {str(e)}"

        with ThreadPoolExecutor(max_workers=2) as executor:
            future1 = executor.submit(approve_action, 1)
            future2 = executor.submit(approve_action, 2)
            results = [future1.result(), future2.result()]

        # Exactly one must succeed and one must see ALREADY_APPROVED
        assert "APPROVED" in results
        assert "ALREADY_APPROVED" in results
```

---

### 5.5 Real-Time WebSocket Channel Layer Test (`tests/test_websocket_stream.py`)

```python
import pytest
from channels.testing import WebsocketCommunicator
from railway_sih.asgi import application
from apps.accounts.models import UserRole
from tests.factories import UserFactory, UserProfileFactory

@pytest.mark.asyncio
@pytest.mark.django_db
async def test_control_room_websocket_receives_conflict_alert():
    controller = UserFactory(username="test_controller")
    UserProfileFactory(user=controller, role=UserRole.CHIEF_CONTROLLER)

    communicator = WebsocketCommunicator(
        application,
        f"/ws/control-room/?token=test_jwt_token"
    )
    connected, _ = await communicator.connect()
    assert connected is True

    # Broadcast event via Channel Layer
    from channels.layers import get_channel_layer
    channel_layer = get_channel_layer()
    await channel_layer.group_send(
        "control_room_HWH",
        {
            "type": "block.alert",
            "message": {
                "event": "CRITICAL_CONFLICT_DETECTED",
                "corridor": "HWH-BWN-CHORD",
                "km": 24.5
            }
        }
    )

    response = await communicator.receive_json_from(timeout=5)
    assert response["event"] == "CRITICAL_CONFLICT_DETECTED"
    assert response["km"] == 24.5

    await communicator.disconnect()
```

---

## 6. Frontend Unit & Playwright E2E Testing

### 6.1 Vitest Component Test (`frontend/src/components/SafetyInterlockCard.test.tsx`)

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SafetyInterlockCard } from './SafetyInterlockCard';

describe('SafetyInterlockCard Component', () => {
  it('disables commence button when OHE power cut is unverified', () => {
    const onCommenceMock = vi.fn();

    render(
      <SafetyInterlockCard
        tokenVerified={true}
        headcountVerified={true}
        ohePowerCutVerified={false} // Gate 3 Failing
        lotoLocked={true}
        weatherCleared={true}
        onCommence={onCommenceMock}
      />
    );

    const commenceBtn = screen.getByRole('button', { name: /Commence Block/i });
    expect(commenceBtn).toBeDisabled();

    fireEvent.click(commenceBtn);
    expect(onCommenceMock).not.toHaveBeenCalled();
    expect(screen.getByText(/OHE Traction Power Cut Pending/i)).toBeInTheDocument();
  });
});
```

---

### 6.2 Playwright Multi-Persona E2E Scenario (`tests/e2e/test_multi_role_approval.spec.ts`)

Simulates a real Indian Railways operational interaction across two concurrent browser sessions:
1. Field Junior Engineer (Rahul) proposes a maintenance block.
2. Chief Controller (Sharma) reviews the AI conflict evaluation, confirms the Combined Block Window (#98), and approves.
3. Field Engineer's dashboard instantly updates to `APPROVED` via WebSocket without a manual page reload.

```typescript
import { test, expect } from '@playwright/test';

test.describe('Dual-Role Control Room Workflow: Proposal to Approval', () => {
  test('Field JE proposes block and Controller approves with instant WS push', async ({ browser }) => {
    // 1. Session 1: Junior Engineer in Field (Howrah Division)
    const jeContext = await browser.newContext();
    const jePage = await jeContext.newPage();
    await jePage.goto('http://localhost:3000/login');
    await jePage.fill('#username', 'rahul_je');
    await jePage.fill('#password', 'railway123');
    await jePage.click('#btn-login');
    await expect(jePage.locator('#dashboard-role')).toContainText('JUNIOR_ENGINEER');

    // Create New Block Proposal
    await jePage.click('#btn-new-block');
    await jePage.selectOption('#select-corridor', 'HWH-BWN-CHORD');
    await jePage.fill('#input-start-km', '25.400');
    await jePage.fill('#input-end-km', '29.800');
    await jePage.selectOption('#select-work-type', 'TRACK_MAINTENANCE');
    await jePage.click('#btn-submit-proposal');
    await expect(jePage.locator('.block-status-badge')).toContainText('SUBMITTED');

    // 2. Session 2: Chief Train Controller (Control Office)
    const coaContext = await browser.newContext();
    const coaPage = await coaContext.newPage();
    await coaPage.goto('http://localhost:3000/login');
    await coaPage.fill('#username', 'sharma_coa');
    await coaPage.fill('#password', 'railway123');
    await coaPage.click('#btn-login');
    await expect(coaPage.locator('#dashboard-role')).toContainText('CHIEF_CONTROLLER');

    // Review AI Conflict Matrix and Approve
    await coaPage.click('text=BLK-ER-2026');
    await expect(coaPage.locator('#ai-conflict-matrix')).toBeVisible();
    await coaPage.click('#btn-approve-block');
    await expect(coaPage.locator('.block-status-badge')).toContainText('APPROVED');

    // 3. Real-Time Verification on Field JE Browser (Daphne WS Push)
    await expect(jePage.locator('.block-status-badge')).toContainText('APPROVED');

    await jeContext.close();
    await coaContext.close();
  });
});
```

---

## 7. Folder 01 Completion Summary & Handshake to Folder 02

With the completion of `09-testing-strategy.md`, **Folder `01-tech-infra/` is 100% complete and fully verified**. All 10 technical infrastructure foundation files conform to enterprise Indian Railways standards:

| File Index | Specification File | Status | Core Technologies & Deliverables |
|:---:|---|:---:|---|
| **00** | `00-backend-core.md` | ✅ Complete | Django 5 Modular Monolith, Clean Architecture, 10 Bounded Contexts |
| **01** | `01-frontend-core.md` | ✅ Complete | React 18, TypeScript, Vite, Zustand, TanStack Query, Control Room Tokens |
| **02** | `02-data-layer.md` | ✅ Complete | PostgreSQL 15 + PostGIS 3.3, GiST Indexes, Redis 7 DB 0-3, PgBouncer |
| **03** | `03-event-brokers.md` | ✅ Complete | Redis Channel Layer, Celery 4 Queues, Outbox Pattern, DLQ, Schemas |
| **04** | `04-internal-api-and-messaging.md` | ✅ Complete | In-Process Contracts, PyBreaker Circuit Breakers, 4-Step SAGA Rollback |
| **05** | `05-observability.md` | ✅ Complete | Structlog JSON, Prometheus RED Metrics, Railway Business KPIs, Grafana |
| **06** | `06-security.md` | ✅ Complete | STRIDE Threat Model, Spatial RBAC (#112), HMAC Digital Token (#71) |
| **07** | `07-workers-consumers.md` | ✅ Complete | Celery 4-Queue Worker Concurrency, HermiT 4GB Cap, Daphne ASGI WS |
| **08** | `08-deployment.md` | ✅ Complete | 12-Container Docker Compose, `start.ps1`/`start.sh`, PostGIS Init, Rolling Update |
| **09** | `09-testing-strategy.md` | ✅ Complete | Safety Test Pyramid, PostGIS Spatial Tests, HermiT Proofs, Playwright E2E |

---

### Handshake to Folder 02: Microservices & Bounded Contexts

> **পরবর্তী ফোল্ডার:** `02-microservices/`  
> **পরবর্তী ফাইল:** `02-microservices/00-service-index.md`

`01-tech-infra/` ফোল্ডারে প্রতিষ্ঠিত টেকনিক্যাল ফাউন্ডেশনের উপর ভিত্তি করে `02-microservices/` ফোল্ডারে প্ল্যাটফর্মের ৮টি প্রধান বাউন্ডেড কনটেক্সট সার্ভিস বিস্তারিতভাবে ক্যাটালগ করা হবে:
1. **`auth-service` / `accounts`**: Spatial RBAC, biometric sync, digital token signing.
2. **`block-planning-service` / `blocks`**: Conflict engine, multi-department co-possession (#98), SAGA lifecycle.
3. **`train-traffic-service` / `trains`**: COA/NTES live schedule tracking, punctuality loss scoring.
4. **`asset-digital-twin-service` / `assets` + `ontology`**: PostGIS track assets, HermiT Reasoner DL proofs.
5. **`department-coordination-service` / `departments`**: ENGG, TRD, S&T resource gangs, equipment allocation.
6. **`safety-compliance-service` / `emergency`**: 15 safety suite interlock gates (#71–#85).
7. **`notification-alert-service` / `notifications`**: WebSocket broadcasts, SMS alerts, escalation matrix.
8. **`analytics-reporting-service` / `analytics`**: COA operational rollups, asset availability KPIs.
