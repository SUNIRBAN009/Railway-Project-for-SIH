# 02-error-code-registry.md

> **File Order:** 28/45  
> **Previous File:** `05-deep-dive-logs/01-common-payloads-and-algorithms.md`  
> **Next File:** `05-deep-dive-logs/03-state-management.md`  

---

## Error Handling Strategy

To provide actionable feedback to the frontend, the backend must return structured JSON errors with a specific `error_code` alongside the standard HTTP status code.

### Standard Error Payload
```json
{
  "error_code": "ERR_BLK_004",
  "message": "The requested KM range exceeds the section length.",
  "details": {
    "section_length_km": 45.5,
    "requested_to_km": 50.0
  }
}
```

---

## Error Code Registry

| Error Code | HTTP Status | Context | Description & Resolution |
|------------|-------------|---------|--------------------------|
| **Authentication & Auth (ERR_AUTH_***)** |
| `ERR_AUTH_001` | `401 Unauthorized` | Login | Invalid username or password. |
| `ERR_AUTH_002` | `401 Unauthorized` | API Access | JWT Token expired or invalid. Client should use Refresh token. |
| `ERR_AUTH_003` | `403 Forbidden` | API Access | User role (e.g., JE) does not have permission to perform this action. |
| **Block Requests (ERR_BLK_***)** |
| `ERR_BLK_001` | `400 Bad Request` | Block Creation | Start time is in the past. |
| `ERR_BLK_002` | `400 Bad Request` | Block Creation | End time is before start time. |
| `ERR_BLK_003` | `404 Not Found` | Block Creation | Provided section code does not exist. |
| `ERR_BLK_004` | `400 Bad Request` | Block Creation | KM range is invalid for the section. |
| `ERR_BLK_005` | `400 Bad Request` | Emergency | Missing photo evidence. |
| **Resources & Crews (ERR_DEP_***)** |
| `ERR_DEP_001` | `409 Conflict` | Emergency | No available crew found in the section or adjacent sections. Fallback to manual assignment. |
| **AI & Ontology (ERR_AI_***)** |
| `ERR_AI_001` | `503 Service Unavail`| Resolution | Gemini API failed to respond or rate limit exceeded. |
| `ERR_ONT_001` | `500 Server Error` | Sync | Ontology quadstore is locked by another process. |
| `ERR_ONT_002` | `500 Server Error` | Reasoner | HermiT found the graph to be inconsistent. Requires manual DBA intervention. |
