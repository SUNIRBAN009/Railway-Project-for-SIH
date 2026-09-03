# 09-testing-strategy.md

> **File Order:** 13/45  
> **Previous File:** `01-tech-infra/08-deployment.md` (CI/CD runs these tests)  
> **Next File:** `02-microservices/00-service-index.md`  
> **Connection:** The testing strategy ensures the reliability of all the infrastructure laid out in Phase 1 before moving on to defining the individual service (app) blueprints in Phase 2.

---

## 1. Testing Pyramid

Due to the short timeline of the hackathon, we prioritize Integration Tests over exhaustive Unit Tests, as they provide higher confidence that the complex workflows (e.g., Block Request → Conflict Detection → AI Resolution) actually work.

| Level | Tool | Coverage Goal | Focus |
|-------|------|---------------|-------|
| **Unit Tests** | `pytest` | 60% | Core business logic, serializers, validators. |
| **Integration** | `pytest-django` | 80% | API endpoints, DB queries, Celery task chains. |
| **End-to-End (E2E)**| Playwright / Cypress | Critical Paths | Full UI flow from Login to Block Approval. |

---

## 2. Backend Testing (Pytest)

We use `pytest` with `pytest-django` and `factory_boy` for generating test data.

### 2.1 Test Directory Structure
Tests are co-located within each app to maintain the Bounded Context.

```text
blocks/
├── tests/
│   ├── test_models.py
│   ├── test_services.py
│   ├── test_api.py
│   └── factories.py
```

### 2.2 Data Generation (Factory Boy)

We avoid hardcoded fixtures, opting for dynamic factories.

```python
# blocks/tests/factories.py
import factory
from blocks.models import BlockRequest, BlockStatus
from accounts.tests.factories import UserFactory
from assets.tests.factories import SectionFactory
from django.utils import timezone
from datetime import timedelta

class BlockRequestFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = BlockRequest

    id = factory.Sequence(lambda n: f"BLK-TEST-{n:03d}")
    requested_by = factory.SubFactory(UserFactory)
    department = 'ENG'
    section = factory.SubFactory(SectionFactory)
    from_km = 10.5
    to_km = 15.0
    start_time = factory.LazyFunction(timezone.now)
    end_time = factory.LazyAttribute(lambda o: o.start_time + timedelta(hours=2))
    work_description = "Routine maintenance"
    status = BlockStatus.PENDING
```

### 2.3 Mocking External APIs

We must NEVER hit the real Twilio or Gemini APIs during automated testing. We use `unittest.mock.patch`.

```python
# blocks/tests/test_services.py
from unittest.mock import patch
from blocks.services import AIResolverService

@patch('blocks.services.genai.GenerativeModel.generate_content')
def test_ai_resolution(mock_gemini):
    # Mock the response from Google Gemini
    mock_gemini.return_value.text = "Based on rules, ENG takes priority."
    
    service = AIResolverService()
    resolution = service.resolve_conflict(conflict_data)
    
    assert "ENG takes priority" in resolution.explanation
    mock_gemini.assert_called_once()
```

### 2.4 Testing Asynchronous Tasks (Celery)

We test Celery tasks synchronously by calling the underlying python function or using `task.apply()`.

```python
# notifications/tests/test_tasks.py
from unittest.mock import patch
from notifications.tasks import send_emergency_sms_task

@patch('notifications.services.TwilioService.send_sms')
def test_emergency_sms_dispatch(mock_send):
    payload = {"section_name": "HWH-KGP", "block_id": "123"}
    
    # Call synchronously
    send_emergency_sms_task(payload)
    
    # Verify the mock was called with correct message
    mock_send.assert_called()
    args, kwargs = mock_send.call_args
    assert "EMERGENCY BLOCK" in kwargs['text']
```

---

## 3. Frontend Testing

Frontend testing is lighter, focusing on critical utility functions and UI component rendering.

### 3.1 Unit Testing (Vitest)

We use `vitest` (which comes configured with Vite) to test helper functions and Zustand stores.

```javascript
// src/utils/formatters.test.js
import { expect, test } from 'vitest'
import { formatDistance } from './formatters'

test('formats distance correctly', () => {
  expect(formatDistance(15.5)).toBe('15.500 KM')
  expect(formatDistance(10)).toBe('10.000 KM')
})
```

### 3.2 End-to-End Testing (Playwright - Future Scope)

For the Hackathon MVP, manual UI testing is primarily used. If time permits, we will add Playwright for the core "Happy Path".

**Core Happy Path Scenario:**
1. Login as ENG JE.
2. Navigate to "Request Block".
3. Fill form (HWH-KGP, 02:00-04:00) and submit.
4. Verify success toast.
5. Logout.
6. Login as COA.
7. Go to "Pending Blocks".
8. Click "Approve".
9. Verify status changes to Approved and Map updates.

---

## 4. Test Data Seeding (Local Development)

To make manual testing and demonstrations easy, we maintain idempotent seed scripts.

```bash
# Run these commands to populate a fresh database
python manage.py runscript seed_users
python manage.py runscript seed_assets
python manage.py runscript seed_trains
python manage.py runscript seed_blocks_and_conflicts
```

The seed scripts guarantee:
- Passwords are all set to `password123`.
- Sections are realistically mapped to West Bengal (Howrah, Sealdah).
- At least one active conflict exists for the AI to resolve during the demo.
