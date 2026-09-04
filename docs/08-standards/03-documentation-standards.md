# 03-documentation-standards.md

> **File Sequence:** Track 08 / Standards  
> **Previous Document:** [08-standards/02-commit-standards.md](02-commit-standards.md)  
> **Next Document:** [08-standards/04-ai-prompt-templates.md](04-ai-prompt-templates.md)  
> **Context:** Architectural documentation guidelines, Google-style docstrings, OpenAPI/Swagger auto-generation, and repository README standards.

---

# Technical Documentation & API Schema Standards

---

## 1. Code Documentation & Docstring Conventions

### Python: Google Style Docstrings
All classes, methods, and Celery tasks must include comprehensive docstrings specifying arguments, types, return values, and exceptions raised:

```python
def evaluate_corridor_conflict(
    corridor_id: str,
    start_km: float,
    end_km: float,
    start_time: datetime,
    end_time: datetime
) -> List[ConflictRecord]:
    """Evaluates spatial and temporal overlaps for a proposed block against active schedules.

    Queries the MySQL 8.0 spatial corridor index and executes interval tree
    traversal to detect intersecting train paths and parallel maintenance possessions.

    Args:
        corridor_id: UUIDv4 identifier of the target track corridor.
        start_km: Starting linear kilometer marker (e.g. 142.500).
        end_km: Ending linear kilometer marker (e.g. 146.200).
        start_time: Proposed possession window start timestamp (UTC).
        end_time: Proposed possession window end timestamp (UTC).

    Returns:
        A list of ConflictRecord objects containing severity ratings and overlapping entities.

    Raises:
        CorridorNotFoundError: If corridor_id does not exist in MySQL.
        InvalidSpatialBoundariesError: If start_km >= end_km.
    """
```

### TypeScript / React: TSDoc / JSDoc
```typescript
/**
 * Custom React hook managing real-time WebSocket connection to Daphne ASGI server.
 *
 * Listens for cache invalidation frames and updates TanStack Query client state.
 *
 * @param corridorCode - Official corridor identifier (e.g. 'NDLS-CNB-MAIN').
 * @returns An object containing connection status and active socket state.
 */
```

---

## 2. Automated OpenAPI Schema Generation (`drf-spectacular`)

All REST endpoints must be fully annotated for automatic OpenAPI 3.0 specification generation using `drf-spectacular`:

```python
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiExample

@extend_schema(
    summary="Sanction a proposed block possession",
    description="Enforces optimistic concurrency checks and verifies that no critical conflicts remain.",
    request=BlockSanctionSerializer,
    responses={
        200: BlockDetailSerializer,
        409: OpenApiExample("Conflict Error", value={"success": False, "error": {"code": "BLK-003"}})
    }
)
def post(self, request, *args, **kwargs):
    ...
```

- **Interactive Swagger UI:** Accessible at `GET /api/docs/`
- **Machine-Readable OpenAPI YAML:** Exported at `GET /api/schema/`
