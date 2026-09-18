# 04-ai-prompt-templates.md

> **ফাইল ক্রম:** ৫৮/৫৯  
> **ডিরেক্টরি:** `08-standards/`  
> **সার্ভিস স্কোপ:** Autonomous AI Coding Agent Prompt Templates, Guardrails & Execution Workflows  
> **পূর্ববর্তী ফাইল:** [08-standards/03-documentation-standards.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/08-standards/03-documentation-standards.md) (Documentation & Markdown Standards)  
> **পরবর্তী ফাইল:** [09-execution-tracker/00-implementation-checklist.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/09-execution-tracker/00-implementation-checklist.md) (Master Execution Tracker & Implementation Checklist)  
> **সংযোগ ও উদ্দেশ্য:** এই ফাইলে এআই কোডিং অ্যাসিস্ট্যান্ট বা এজেন্টের মাধ্যমে প্ল্যাটফর্মের মাইক্রোসার্ভিস বাস্তবায়ন, ১২২টি মাস্টার ফিচার কোডিং, PostGIS স্প্যাশিয়াল কোয়েরি, সেফটি স্যুইট টেস্ট জেনারেশন এবং প্রোডাকশন বাগ ফিক্সিংয়ের জন্য প্রমিত প্রম্পট টেমপ্লেট ও গার্ডরেইল লিপিবদ্ধ করা হয়েছে।

---

# Canonical AI Agent Prompt Templates (এআই এজেন্ট প্রম্পট টেমপ্লেট ও গার্ডরেইল)

## 1. Architectural Guardrails for AI Agents (এআই এজেন্টের জন্য বাধ্যতামূলক নিয়ম)

যেকোনো এআই কোডিং এজেন্টকে ভারতীয় রেলওয়ে প্রজেক্টে কোড লেখার পূর্বে নিচের শর্তগুলো মেনে চলতে হবে:
1. **একচ্ছত্র ডেটাবেস নিয়ম:** শুধুমাত্র **PostgreSQL 15.6 + PostGIS 3.3** ব্যবহৃত হবে। কোনো মডেলে বা কোয়েরিতে যেন MySQL বা SQLite সিনট্যাক্স প্রবেশ না করে।
2. **জিরো প্লেসহোল্ডার:** কোনো `TODO`, `pass`, বা অসম্পূর্ণ ফাংশন বডি (`...`) লেখা যাবে না। প্রতিটি ফাংশন পূর্ণাঙ্গ ও এক্সিকিউটেবল হতে হবে।
3. **কঠোর ডোমেন পরিভাষা:** সর্বদা ভারতীয় রেলওয়ের প্রাতিষ্ঠানিক পরিভাষা (TMS, SMMS, TDMS, COA, NTES, OHE, TSR, LOTO, TBT, PTW, Token) ব্যবহার করতে হবে।
4. **ট্রানজাকশন ও সেফটি গার্ড:** মিউটেটিং অপারেশনে `@transaction.atomic` এবং অপ্টিমিস্টিক লকিং (`version` ফিল্ড) প্রয়োগ বাধ্যতামূলক।

---

## 2. Template 1: "Implement Microservice X" (সার্ভিস বাস্তবায়ন টেমপ্লেট)

```markdown
### Context Files to Read Before Starting:
1. `docs/00-master-high-level/00-architecture.md`
2. `docs/01-tech-infra/02-data-layer.md`
3. `docs/03-service-blueprints/[01-08-service-name].md`
4. `docs/04-function-maps/[01-08-service-name]-function-map.md`
5. `docs/05-deep-dive-logs/adrs/adr-0002-postgresql-postgis.md`

### Task Instruction:
You are an expert Django 5.0 systems architect. Implement the complete bounded context application `apps.[service_name]` according to its blueprint.
1. Create `apps/[service_name]/models.py` with exact PostgreSQL 15.6 + PostGIS 3.3 types:
   - Native UUID primary keys (`models.UUIDField(default=uuid.uuid4)`).
   - PostGIS LineString/Point fields (`srid=4326`) with GiST indexes (`GistIndex(fields=['track_geometry'])`).
   - Integer `version` column initialized to 1 for optimistic locking.
2. Implement DRF Serializers in `serializers.py` with standard JSON envelopes (`ApiResponse<T>`) and strict parameter validation.
3. Implement API controllers in `views.py` enforcing RBAC permissions (`IsChiefController`, `IsSectionController`, etc.).
4. Implement pure mathematical and domain logic in `services/domain_engine.py` (No HTTP logic).
5. Implement background Celery tasks in `tasks.py` with appropriate Redis queue routing (`high`, `ontology`, `default`).
6. Register routes in `urls.py` mounted under `/api/v1/[domain]/`.

### Validation Checklist:
- [ ] Zero placeholders or `TODO` comments.
- [ ] Exclusively uses PostgreSQL 15.6 + PostGIS 3.3 types (No MySQL).
- [ ] Errors map to `docs/05-deep-dive-logs/02-error-code-registry.md`.
- [ ] Run `python manage.py makemigrations [service_name]` and verify 0 syntax errors.
```

---

## 3. Template 2: "Add Enterprise Function Y" (ফাংশন সংযোজন টেমপ্লেট)

```markdown
### Context Files to Read Before Starting:
1. `docs/04-function-maps/00-function-id-registry.md`
2. `docs/04-function-maps/[service]-function-map.md` (Target function `FUNC-[SVC]-[NUM]`)
3. `docs/05-deep-dive-logs/01-common-payloads-and-algorithms.md`
4. `docs/05-deep-dive-logs/02-error-code-registry.md`

### Task Instruction:
Implement Function `FUNC-[SERVICE]-[NUMBER]`: [Function Name].
1. Follow the exact input and output DTO schemas specified in the function map.
2. Enforce transaction safety using `@transaction.atomic` and optimistic locking check.
3. If this function modifies state, emit the push-to-invalidate event to Redis channel `events:[domain]`.
4. If spatial boundaries are evaluated, use PostGIS `ST_DWithin` on geography with 50-meter buffer.
5. Return standardized `ApiErrorResponse` on failure matching the master error registry.

### Validation Checklist:
- [ ] Conforms to HTTP method and path in function registry.
- [ ] Validates all incoming parameters against edge cases.
- [ ] Dispatches cache invalidation WebSocket frame if state changed.
- [ ] Verified execution latency satisfies target SLA.
```

---

## 4. Template 3: "Implement Safety Suite Feature Z" (সেফটি ফিচার টেমপ্লেট)

```markdown
### Context Files to Read Before Starting:
1. `docs/03-service-blueprints/02-blocks.md` (Safety Suite Section #71–#85)
2. `docs/05-deep-dive-logs/01-common-payloads-and-algorithms.md` (Cryptographic Tokens)
3. `docs/06-testing-qa/01-e2e-scenarios.md` (Scenario 1 & 3)

### Task Instruction:
Implement Safety Feature [Feature Number]: [e.g. #71 Digital Section Token / #74 LOTO Power Isolation / #79 1-Tap SOS Siren].
1. Create necessary database fields and validation checks in `apps.blocks` or `apps.notifications`.
2. Implement cryptographic token verification (HMAC-SHA256) or LOTO state check.
3. If high-priority emergency alert (e.g. SOS Siren #79), dispatch immediately over Daphne ASGI WebSocket with sub-75ms latency.
4. Provide comprehensive unit tests verifying that unauthorized possession or unconfirmed power cutoff blocks section activation (`BLK-010`, `BLK-011`).

### Validation Checklist:
- [ ] Safety invariants cannot be bypassed by client manipulation.
- [ ] Real-time siren broadcast verified with Web Audio API chime.
- [ ] Zero false negatives in field validation checks.
```

---

## 5. Template 4: "Write Comprehensive Tests for Module W" (টেস্টিং টেমপ্লেট)

```markdown
### Context Files to Read Before Starting:
1. `docs/06-testing-qa/00-test-plan.md`
2. `docs/06-testing-qa/01-e2e-scenarios.md`
3. Target source file: `apps/[service]/[module].py`

### Task Instruction:
Write a comprehensive `pytest` test suite in `apps/[service]/tests/test_[module].py`.
1. Include parameterized unit tests covering normal execution, edge cases, and boundary conditions.
2. For spatial queries, use `@pytest.mark.spatial` and real PostgreSQL 15.6 + PostGIS 3.3 fixtures.
3. Include negative test cases asserting exact HTTP status codes and machine error codes (`BLK-003`, `BLK-006`, `ONTO-001`, `NOTIF-003`).
4. Mock external network gateways (CDAC SMS, COA API) using `responses` or `pytest-mock`.
5. Verify optimistic locking race conditions by simulating concurrent updates.

### Validation Checklist:
- [ ] Test coverage exceeds 85% for the target module.
- [ ] All tests execute and pass: `pytest apps/[service]/tests/`.
```

---

## 6. Template 5: "Diagnose & Patch Production Incident ABC" (বাগ ফিক্সিং টেমপ্লেট)

```markdown
### Context Files to Read Before Starting:
1. `docs/05-deep-dive-logs/04-bug-log-template.md`
2. `docs/05-deep-dive-logs/02-error-code-registry.md`
3. Affected stack trace and PostgreSQL / Celery logs.

### Task Instruction:
Diagnose and surgically patch production incident [INCIDENT_ID].
1. Reproduce the bug by writing a failing regression test in the appropriate test file.
2. Apply the minimal, surgical code modification to resolve the root cause.
3. Verify that the regression test now passes green and no regression is introduced in other services.
4. Complete the official incident post-mortem in `docs/05-deep-dive-logs/04-bug-log-template.md` following the 5-Whys root-cause analysis and CAPA tracking.

### Validation Checklist:
- [ ] Failing test written and reproduces exact error condition.
- [ ] Surgical fix applied without breaking unrelated code.
- [ ] All existing test suites pass cleanly.
- [ ] Post-mortem documentation completed.
```
