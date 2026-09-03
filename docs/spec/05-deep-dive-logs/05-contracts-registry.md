# 05-contracts-registry.md

> **File Order:** 31/45  
> **Previous File:** `05-deep-dive-logs/04-bug-log-template.md`  
> **Next File:** `05-deep-dive-logs/06-adrs-registry.md`  

---

## External API Contracts

The platform relies on three major external APIs. To prevent the core logic from breaking if an API changes, we wrap them in Service classes (as defined in Phase 3). This document defines the exact payloads we send and expect.

---

### 1. Google Gemini (Generative AI)

**Used By:** `blocks.services.AIResolverService`
**Purpose:** Resolves conflicting block requests.
**SDK:** `google-generativeai`

**System Prompt Contract:**
We must provide Gemini with strict JSON schema enforcement to ensure it doesn't return conversational text.

```json
// The expected output schema enforced via Gemini Structured Outputs
{
  "type": "object",
  "properties": {
    "recommended_action": { "type": "string", "enum": ["APPROVE_BLOCK_A", "APPROVE_BLOCK_B", "REJECT_BOTH"] },
    "explanation_en": { "type": "string" },
    "explanation_hi": { "type": "string" },
    "explanation_bn": { "type": "string" }
  },
  "required": ["recommended_action", "explanation_en"]
}
```

---

### 2. Twilio (SMS Provider)

**Used By:** `notifications.services.TwilioService`
**Purpose:** Outbound SMS for block approvals and emergency alerts.
**SDK:** `twilio` Python package.

**Rate Limits & Retry Contract:**
- Limit: 1 message per second.
- Error Code `HTTP 429` (Too Many Requests) -> Celery will intercept and retry with exponential backoff (see `07-workers-consumers.md`).

---

### 3. Mapbox GL JS (Frontend Mapping)

**Used By:** `frontend/src/components/map/RailwayMap.jsx`
**Purpose:** Renders the interactive railway topology and active blocks.

**GeoJSON Contract:**
The backend `assets` service serves tracks as GeoJSON `LineString` features. Mapbox consumes this directly.

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "sectionCode": "HWH-KGP",
        "status": "ACTIVE_BLOCK",
        "strokeColor": "#ff0000"
      },
      "geometry": {
        "type": "LineString",
        "coordinates": [
          [88.3426, 22.5855],
          [87.3197, 22.3302]
        ]
      }
    }
  ]
}
```
