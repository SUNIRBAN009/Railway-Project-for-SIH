# 03-documentation-standards.md

> **ফাইল ক্রম:** ৫৭/৫৯  
> **ডিরেক্টরি:** `08-standards/`  
> **সার্ভিস স্কোপ:** Technical Documentation Architecture, Google-Style Docstrings, TSDoc & OpenAPI 3.0.3 Schemas  
> **পূর্ববর্তী ফাইল:** [08-standards/02-commit-standards.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/08-standards/02-commit-standards.md) (Git Commit Standards & PR Checklists)  
> **পরবর্তী ফাইল:** [08-standards/04-ai-prompt-templates.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/08-standards/04-ai-prompt-templates.md) (Domain AI Prompt Templates & Guardrails)  
> **সংযোগ ও উদ্দেশ্য:** এই ফাইলে প্ল্যাটফর্মের কোড ডকস্ট্রিং কনভেনশন (Google Style / TSDoc), `drf-spectacular` দ্বারা স্বয়ংক্রিয় OpenAPI 3.0.3 স্কিমা জেনারেশন, এবং জিরো-প্লেসহোল্ডার টেকনিক্যাল ডকুমেন্টেশন মানদণ্ড লিপিবদ্ধ করা হয়েছে।

---

# Technical Documentation & API Schema Standards (প্রযুক্তিগত ডকুমেন্টেশন ও এপিআই স্কিমা মানদণ্ড)

## 1. Code Documentation & Docstring Conventions (কোড ডকস্ট্রিং কনভেনশন)

### ১.১ Python: Google Style Docstrings
প্ল্যাটফর্মের সমস্ত পাইথন ক্লাস, ডোমেন সার্ভিস মেথড এবং Celery ব্যাকগ্রাউন্ড টাস্কে বাধ্যতামূলকভাবে Google Style ডকস্ট্রিং থাকতে হবে, যেখানে আর্গুমেন্ট, টাইপস, রিটার্ন ভ্যালু এবং উত্থিত এক্সেপশন বিস্তারিতভাবে বর্ণিত থাকবে:

```python
def evaluate_corridor_conflict(
    corridor_id: str,
    start_km: float,
    end_km: float,
    start_time: datetime,
    end_time: datetime
) -> List[ConflictRecord]:
    """Evaluates spatial and temporal overlaps for a proposed block against active schedules.

    Queries the PostgreSQL 15.6 + PostGIS 3.3 spatial corridor index (GiST) and executes
    interval tree traversal to detect intersecting train paths, high-speed collisions,
    and parallel departmental maintenance possessions within a 50-meter safety envelope.

    Args:
        corridor_id: UUIDv4 identifier of the target track corridor in PostgreSQL.
        start_km: Starting linear kilometer marker (e.g. 14.250).
        end_km: Ending linear kilometer marker (e.g. 18.800).
        start_time: Proposed possession window start timestamp in UTC.
        end_time: Proposed possession window end timestamp in UTC.

    Returns:
        A list of ConflictRecord objects containing severity ratings (CRITICAL/HIGH/MEDIUM),
        temporal-spatial overlap details, and conflicting train or block identifiers.

    Raises:
        CorridorNotFoundError: If corridor_id does not exist in the database (HTTP 404).
        InvalidSpatialBoundariesError: If start_km >= end_km or boundaries exceed track limits (HTTP 400).
        DatabaseLockError: If a transaction deadlock occurs during concurrent lock evaluation (SYS-001).
    """
```

### ১.২ TypeScript / React: TSDoc & JSDoc Standards
রিঅ্যাক্ট কম্পোনেন্ট, কাস্টম হুক এবং Zustand স্টোরের ক্ষেত্রে প্রমিত TSDoc অনুসরণ করা বাধ্যতামূলক:

```typescript
/**
 * Custom React hook managing real-time WebSocket connection to the Daphne ASGI server.
 *
 * Establishes a persistent connection to the corridor event bus, handles push-to-invalidate
 * events for TanStack Query caches, and dispatches high-priority Emergency SOS sirens.
 *
 * @param corridorCode - Official corridor identifier (e.g. 'NDLS-CNB-MAIN').
 * @returns An object containing connection status, heartbeat telemetry, and active socket instance.
 *
 * @example
 * ```tsx
 * const { isConnected, socket } = useCorridorSocket('NDLS-CNB-MAIN');
 * ```
 */
export function useCorridorSocket(corridorCode: string): UseCorridorSocketReturn {
  // Implementation...
}
```

---

## 2. Automated OpenAPI 3.0.3 Schema Generation (`drf-spectacular`)

প্ল্যাটফর্মের সমস্ত REST এন্ডপয়েন্টে `drf-spectacular` অ্যানোটেশন ব্যবহার করে স্বয়ংক্রিয় টাইপ-সেফ OpenAPI 3.0.3 স্কিমা তৈরি নিশ্চিত করা হয়:

```python
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiExample
from apps.blocks.serializers import BlockSanctionRequestSerializer, BlockDetailSerializer

@extend_schema(
    summary="Sanction a proposed block possession (Chief/Section Controller)",
    description=(
        "Executes atomic optimistic concurrency checks via the PostgreSQL `version` column, "
        "verifies that no critical unresolved safety conflicts exist in `block_conflicts`, "
        "and transitions block possession status to APPROVED."
    ),
    request=BlockSanctionRequestSerializer,
    responses={
        200: BlockDetailSerializer,
        400: OpenApiExample("Bad Request", value={"success": False, "error": {"code": "BLK-001"}}),
        409: OpenApiExample("Conflict Error", value={"success": False, "error": {"code": "BLK-003", "message": "Train path clash."}}),
        412: OpenApiExample("Precondition Failed", value={"success": False, "error": {"code": "BLK-008", "message": "Safety checklist missing."}})
    },
    tags=["Block Sanction Execution"]
)
def post(self, request, *args, **kwargs):
    # Controller implementation...
```

- **Interactive Swagger UI:** `GET /api/docs/`
- **Interactive Redoc Portal:** `GET /api/redoc/`
- **Machine-Readable OpenAPI YAML:** `GET /api/schema/`

---

## 3. Markdown Quality & Documentation Integrity Rules (ডকুমেন্টেশন মানদণ্ড)

1. **জিরো প্লেসহোল্ডার অনুশাসন (Zero Placeholder Mandate):** কোনো ফাইলে `TODO`, `TBD`, `[Implement later]`, বা অসমাপ্ত কোড স্নিপেট (`...`) রাখা কঠোরভাবে নিষিদ্ধ। প্রতিটি ফাংশন, স্কিমা এবং সমীকরণ সম্পূর্ণ হতে হবে।
2. **প্রামাণ্য ভারতীয় রেলওয়ে পরিভাষা:** জেনেরিক টেকনিক্যাল জার্গনের বদলে ভারতীয় রেলওয়ের প্রাতিষ্ঠানিক পরিভাষা (যেমন: TMS, SMMS, TDMS, COA, NTES, OHE, TSR, LOTO, TBT, PTW, Section Token) যথাযথ কনটেক্সটে প্রয়োগ করতে হবে।
3. **একচ্ছত্র ডেটাবেস পরিচ্ছন্নতা:** সমস্ত আর্কিটেকচারাল নথি ও উদাহরণে এক্সক্লুসিভলি **PostgreSQL 15.6 + PostGIS 3.3** (`SRID 4326`, GiST ইনডেক্সিং) ব্যবহৃত হবে; কোনো লিগ্যাসি MySQL রেফারেন্স অনুমোদিত নয়।
4. **হাইপারলিংক অখণ্ডতা:** সমস্ত আন্তঃফাইল রেফারেন্স কার্যকর গিটহাব মার্কডাউন লিংক (`file:///...`) ফরম্যাটে সংরক্ষিত থাকবে।
