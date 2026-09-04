# 09-testing-strategy.md

> **ফাইল ক্রম:** ১৩/৪৫  
> **পূর্ববর্তী ফাইল:** `01-tech-infra/08-deployment.md` (CI/CD GitHub Actions pipeline, Docker Compose test services)  
> **পরবর্তী ফাইল:** `02-microservices/00-service-index.md`  
> **সংযোগ:** এই ফাইলে সংজ্ঞায়িত টেস্ট স্যুট, মক স্ট্র্যাটেজি, এবং সার্ভিস-লেভেল কভারেজ মেট্রিক্স ফোল্ডার `02-microservices`-এর প্রতিটি বাউন্ডেড কনটেক্সট সার্ভিসের কোয়ালিটি গেট এবং সার্ভিস ডিপেনডেন্সি ম্যাট্রিক্স মূল্যায়নে ব্যবহৃত হবে।

---

## 1. Testing Philosophy & Pyramid

The project implements an enterprise test pyramid tailored for safety-critical railway software. Automated tests run locally on pre-commit and centrally in GitHub Actions CI prior to deployment.

```
                   ┌─────────────────┐
                   │    E2E Tests    │  10% (Playwright)
                   │  Full User Flow │
                   └────────┬────────┘
                            │
              ┌─────────────┴─────────────┐
              │     Integration Tests     │  30% (pytest-django, DRF APIClient)
              │  API + DB + Celery + OWL  │
              └─────────────┬─────────────┘
                            │
         ┌──────────────────┴──────────────────┐
         │              Unit Tests             │  60% (pytest, Vitest)
         │   Conflict Rules, RBAC, Serializers │
         └─────────────────────────────────────┘
```

---

## 2. Test Frameworks per Layer

| Layer | Framework / Tool | Purpose | Justification |
|-------|------------------|---------|---------------|
| **Backend Unit & API** | `pytest` + `pytest-django` | Test runner & fixtures | Fast execution, native Django test DB isolation, rich plugin ecosystem |
| **Data Generation** | `factory_boy` + `Faker` | Realistic model factories | Eliminates brittle hardcoded test fixtures, generates valid UUIDs & KM points |
| **Mocking & Stubs** | `pytest-mock` + `responses` | Third-party API isolation | Mocks Twilio SMS, Open-Meteo weather, and Google Gemini API calls |
| **Frontend Unit** | `Vitest` + React Testing Library | Component & hook tests | Native Vite integration, instant execution, jsdom browser emulation |
| **API Mocking (Frontend)**| `MSW` (Mock Service Worker) | Network-level request mocking | Intercepts REST requests during component testing without server dependency |
| **End-to-End (E2E)** | `Playwright` | Real browser multi-role testing | Tests concurrent JE & COA interactions across real browser windows |
| **Ontology Reasoning** | `Owlready2` + `rdflib` | Semantic consistency assertions | Validates HermiT reasoning inferences and DL consistency rules |

---

## 3. Coverage Targets

| Domain Area | Target Coverage | Critical Modules (100% Target) |
|-------------|-----------------|---------------------------------|
| **Conflict Engine** | **100%** | `blocks.services.ConflictEngine`, `blocks.utils.time_overlap` |
| **Auth & RBAC** | **100%** | `accounts.permissions.*`, `accounts.middleware.DepartmentIsolation` |
| **Block Lifecycle SAGA** | **95%** | `blocks.services.BlockApprovalSaga` |
| **Ontology Sync** | **90%** | `ontology.manager.DigitalTwinManager` |
| **REST API Views** | **85%** | All viewsets in `blocks`, `trains`, `departments` |
| **Frontend Components** | **80%** | `BlockRequestForm`, `ConflictAlert`, `RoleGuard` |
| **Overall Project Target**| **> 85%** | Measured by `pytest-cov` and Vitest coverage reporter |

---

## 4. Test Data Management & Model Factories

Factories generate deterministic, valid database records targeting the **Howrah – Kharagpur (HWH-KGP)** test corridor.

```python
# tests/factories.py
import factory
from factory.django import DjangoModelFactory
from django.utils import timezone
from datetime import timedelta
from accounts.models import User, Department
from blocks.models import BlockRequest, Section

class DepartmentFactory(DjangoModelFactory):
    class Meta:
        model = Department
        django_get_or_create = ('code',)

    name = 'Engineering'
    code = 'ENG'

class UserFactory(DjangoModelFactory):
    class Meta:
        model = User

    username = factory.Sequence(lambda n: f"engineer_{n}")
    email = factory.LazyAttribute(lambda o: f"{o.username}@railnet.gov.in")
    role = 'ENG_JE'
    department = factory.SubFactory(DepartmentFactory)
    is_active = True

class SectionFactory(DjangoModelFactory):
    class Meta:
        model = Section
        django_get_or_create = ('name',)

    name = 'Howrah-Kharagpur'
    from_station = 'Howrah (HWH)'
    to_station = 'Kharagpur (KGP)'
    total_km = 115.00
    current_status = 'FREE'
    division = 'Howrah'
    district = 'Howrah'

class BlockRequestFactory(DjangoModelFactory):
    class Meta:
        model = BlockRequest

    block_code = factory.Sequence(lambda n: f"BLK-20260902-{n:03d}")
    department = factory.SubFactory(DepartmentFactory)
    section = factory.SubFactory(SectionFactory)
    requester = factory.SubFactory(UserFactory)
    from_km = 15.00
    to_km = 20.50
    start_time = factory.LazyFunction(lambda: timezone.now() + timedelta(hours=2))
    end_time = factory.LazyFunction(lambda: timezone.now() + timedelta(hours=4))
    priority = 'HIGH'
    work_type = 'Track Packing'
    status = 'PENDING'
```

---

## 5. Sample Critical Test Suites

### 5.1 Conflict Engine Unit Tests (`tests/test_conflict_engine.py`)

```python
import pytest
from datetime import timedelta
from django.utils import timezone
from tests.factories import BlockRequestFactory, SectionFactory, DepartmentFactory
from blocks.services import ConflictEngine

@pytest.mark.django_db
class TestConflictEngine:
    def test_detects_time_and_spatial_overlap(self):
        section = SectionFactory()
        eng_dept = DepartmentFactory(code='ENG')
        trd_dept = DepartmentFactory(code='TRD')

        base_time = timezone.now() + timedelta(hours=3)

        # Block 1: ENG on KM 10 to 20, 03:00 to 05:00
        block1 = BlockRequestFactory(
            section=section, department=eng_dept,
            from_km=10.0, to_km=20.0,
            start_time=base_time,
            end_time=base_time + timedelta(hours=2),
            status='APPROVED'
        )

        # Block 2: TRD on KM 15 to 25, 04:00 to 06:00 (Overlaps in time & space)
        block2 = BlockRequestFactory(
            section=section, department=trd_dept,
            from_km=15.0, to_km=25.0,
            start_time=base_time + timedelta(hours=1),
            end_time=base_time + timedelta(hours=3),
            status='PENDING'
        )

        engine = ConflictEngine()
        conflict = engine.evaluate(block2)

        assert conflict['has_conflict'] is True
        assert conflict['conflicting_block_id'] == block1.id
        assert conflict['conflict_type'] == 'TIME_AND_TRACK_OVERLAP'
```

### 5.2 RBAC Authorization Tests (`tests/test_rbac_permissions.py`)

```python
import pytest
from rest_framework.test import APIClient
from rest_framework import status
from tests.factories import UserFactory, BlockRequestFactory

@pytest.mark.django_db
class TestRBACPermissions:
    def setup_method(self):
        self.client = APIClient()

    def test_junior_engineer_cannot_approve_block(self):
        je_user = UserFactory(role='ENG_JE')
        block = BlockRequestFactory(status='PENDING')
        
        self.client.force_authenticate(user=je_user)
        response = self.client.post(f"/api/v1/blocks/{block.id}/approve/")
        
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_coa_can_approve_block(self):
        coa_user = UserFactory(role='COA')
        block = BlockRequestFactory(status='PENDING')
        
        self.client.force_authenticate(user=coa_user)
        response = self.client.post(f"/api/v1/blocks/{block.id}/approve/")
        
        assert response.status_code == status.HTTP_200_OK
        block.refresh_from_db()
        assert block.status == 'APPROVED'
```

### 5.3 Semantic Digital Twin Assertion Test (`tests/test_ontology_reasoning.py`)

```python
import pytest
from ontology.manager import DigitalTwinManager

class TestDigitalTwinReasoning:
    def test_block_impact_infers_affected_trains(self):
        manager = DigitalTwinManager()
        
        # Inject simulated block event into ontology
        manager.add_block_individual("BLK_TEST_01", "Section_HWH_KGP", "CRITICAL")
        
        # Execute SPARQL reasoner
        results = manager.query_affected_trains("Section_HWH_KGP")
        
        # Verify inferred impact
        train_numbers = [r['train_no'] for r in results]
        assert "12301" in train_numbers  # Howrah Rajdhani uses HWH-KGP corridor
```

---

## 6. End-to-End (E2E) Test Scenario with Playwright

```javascript
// tests/e2e/block_approval_flow.spec.js
import { test, expect } from '@playwright/test';

test.describe('Critical E2E Journey: Block Request to COA Approval', () => {
  test('JE creates block, COA resolves conflict and approves', async ({ browser }) => {
    // 1. Context 1: Field Engineer Rahul (ENG_JE)
    const engContext = await browser.newContext();
    const engPage = await engContext.newPage();
    await engPage.goto('http://localhost/login');
    await engPage.fill('input[name="username"]', 'rahul_eng');
    await engPage.fill('input[name="password"]', 'railway_pass_123');
    await engPage.click('button[type="submit"]');
    await expect(engPage).toHaveURL('/eng');

    // Submit Block Request
    await engPage.click('text=New Block Request');
    await engPage.selectOption('select[name="section"]', 'Howrah-Kharagpur');
    await engPage.fill('input[name="from_km"]', '15.0');
    await engPage.fill('input[name="to_km"]', '20.5');
    await engPage.click('button:has-text("Submit Proposal")');
    await expect(engPage.locator('.status-badge')).toContainText('PENDING');

    // 2. Context 2: Control Room Officer (COA)
    const coaContext = await browser.newContext();
    const coaPage = await coaContext.newPage();
    await coaPage.goto('http://localhost/login');
    await coaPage.fill('input[name="username"]', 'control_officer');
    await coaPage.fill('input[name="password"]', 'coa_secure_pass');
    await coaPage.click('button[type="submit"]');
    await expect(coaPage).toHaveURL('/coa');

    // COA approves block
    await coaPage.click('button:has-text("Approve Block")');
    await expect(coaPage.locator('.status-badge')).toContainText('APPROVED');

    // 3. Real-time verification on JE Screen (via WebSocket broadcast)
    await expect(engPage.locator('.status-badge')).toContainText('APPROVED');

    await engContext.close();
    await coaContext.close();
  });
});
```

---

## 7. Next Folder Dependency Note

> পরবর্তী ফোল্ডার: `02-microservices/`  
> পরবর্তী ফাইল: `02-microservices/00-service-index.md`

`01-tech-infra/` ফোল্ডারের সকল ১০টি স্পেসিফিকেশন ফাইল সফলভাবে সম্পন্ন হয়েছে:
1. `00-backend-core.md` (Django Monolith, Middleware, Routing, JSON Logging)
2. `01-frontend-core.md` (React 18, Vite, Zustand, TanStack Query, Tailwind, Mapbox)
3. `02-data-layer.md` (MySQL 8.0 InnoDB, Spatial GIS, Redis 7 Caching, Owlready2)
4. `03-event-brokers.md` (Redis Pub/Sub, Celery Queues, DLQ, Idempotency)
5. `04-internal-api-and-messaging.md` (Sync/Async, Circuit Breakers, SAGA Pattern, Tracing)
6. `05-observability.md` (JSON Logs, RED Metrics, Health Probes, Alert Escalation)
7. `06-security.md` (STRIDE Model, RBAC, JWT Rotation, File Security, Encryption)
8. `07-workers-consumers.md` (Celery Concurrency, Channels ASGI, Beat Cron, Poison Pill)
9. `08-deployment.md` (Docker Compose, Nginx Reverse Proxy, CI/CD Actions, MySQL & Redis)
10. `09-testing-strategy.md` (Pytest, Vitest, Playwright E2E, Coverage & Factories)

`02-microservices/`-এ প্রতিটি বাউন্ডেড সার্ভিস (`accounts`, `blocks`, `departments`, `ontology`, `trains`, `assets`, `analytics`, `notifications`) এর ক্যাটালগ ও ডিপেনডেন্সি ম্যাট্রিক্স তৈরি হবে।
