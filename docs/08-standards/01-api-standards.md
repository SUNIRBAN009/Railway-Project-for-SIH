# 01-api-standards.md

> **File Sequence:** Track 08 / Standards  
> **Previous Document:** [08-standards/00-coding-standards.md](00-coding-standards.md)  
> **Next Document:** [08-standards/02-commit-standards.md](02-commit-standards.md)  
> **Context:** Authoritative RESTful API design standards, HTTP status code mappings, pagination protocols, and idempotency guarantees.

---

# RESTful API Standards & Interface Guidelines

---

## 1. URI Design & Resource Hierarchy

1. **Path Prefix:** All endpoints must be versioned under `/api/v1/`.
2. **Plural Nouns:** Always use plural nouns for collections:
   - ✅ `/api/v1/blocks/`
   - ❌ `/api/v1/block/` or `/api/v1/getBlocks/`
3. **Sub-Resources:** Use nested paths only when the child entity cannot exist independently of the parent:
   - ✅ `/api/v1/blocks/{id}/conflicts/`
   - ✅ `/api/v1/departments/gangs/{id}/members/`
4. **Action Endpoints:** For state transitions that do not map naturally to CRUD verbs, use descriptive POST action sub-paths:
   - ✅ `POST /api/v1/blocks/{id}/sanction/`
   - ✅ `POST /api/v1/blocks/{id}/activate/`
   - ✅ `POST /api/v1/blocks/{id}/complete/`

---

## 2. Standard HTTP Status Code Usage

| Status Code | Reason & Meaning | When to Use in Indian Railways Block Platform |
|---|---|---|
| **`200 OK`** | Request succeeded | Standard GET retrieval, successful PATCH/PUT update, successful action execution. |
| **`201 Created`** | Resource created | Successful block proposal submission, work order creation, gang registration. |
| **`204 No Content`** | Succeeded with no body | Resource deletion or cache eviction acknowledgment. |
| **`400 Bad Request`** | Input validation failure | Malformed JSON, negative duration, or end KM less than start KM. |
| **`401 Unauthorized`** | Missing or invalid auth | Expired JWT token, missing Authorization header, blacklisted token. |
| **`403 Forbidden`** | Role permission denied | A Departmental Engineer attempting to execute a Chief Controller sanction. |
| **`404 Not Found`** | Entity does not exist | Specified `block_id`, `train_number`, or `corridor_id` not found in MySQL. |
| **`409 Conflict`** | Business/Safety conflict | Spatial corridor collision, train path overlap, or optimistic lock failure (`BLK-006`). |
| **`412 Precondition Failed`**| Prerequisites unfulfilled | Attempting to activate a block before Caution Order is issued (`BLK-007`). |
| **`422 Unprocessable Entity`**| Semantic reasoning error | HermiT reasoner identifies an OHE electric stranding hazard (`ONTO-001`). |
| **`429 Too Many Requests`** | Rate limit throttled | Client exceeded quota (100 requests/minute). |
| **`500 Server Error`** | Unhandled internal exception| Database connection failure or unhandled exception. |

---

## 3. Keyset & Cursor Pagination Protocol

For large tabular feeds (e.g. `audit_logs` or `asset_telemetry_readings`), standard offset pagination (`LIMIT offset, count`) introduces unacceptable $O(N)$ scanning latency in MySQL InnoDB. Keyset (Cursor) pagination is required:

```
GET /api/v1/audit-logs/?cursor=eyJjcmVhdGVkX2F0IjoiMjAyNi0wOS0wNFQxMDowMDowMC4wMDAwMDBaIiwiaWQiOiJmMT..."&limit=50
```

SQL generated under the hood:
```sql
SELECT * FROM audit_logs
WHERE created_at < :cursor_timestamp
ORDER BY created_at DESC, id DESC
LIMIT 50;
```

---

## 4. Idempotency Key Specification

To prevent double-booking tracks or duplicate block submissions during temporary mobile network dropouts:
- Mutating POST endpoints accept an optional header: `Idempotency-Key: <UUIDv4>`.
- The API gateway or middleware stores the key in Redis with a 120-second TTL (`idemp:key:<UUIDv4>`).
- If a duplicate request arrives with the same key while the first is in progress or completed, the cached response is immediately returned without re-executing database operations.
