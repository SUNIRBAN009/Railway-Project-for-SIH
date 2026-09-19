# 05-observability.md

> **ফাইল ক্রম:** ৯/৪৫  
> **ডিরেক্টরি:** `01-tech-infra/`  
> **পূর্ববর্তী ফাইল:** `01-tech-infra/04-internal-api-and-messaging.md` (সার্ভিস কমিউনিকেশন, সার্কিট ব্রেকার, সাগা প্যাটার্ন)  
> **পরবর্তী ফাইল:** `01-tech-infra/06-security.md` (নিরাপত্তা, অডিট লগ, আরবিএসি)  
> **কন্টেন্ট সোর্স:** `RailBlock_Feature_Master_Plan_PS26027(1).xlsx` (১২২টি ফিচার, ৪টি মূল সমস্যা স্তম্ভ), `ai-project-spec-generator (1).md`।  
> **অবজারভেবিলিটি স্ট্যাক:** **Prometheus (Port 9090)** + **Grafana (Port 3001)** + **Structlog 24.1 (JSON)** + **W3C Distributed Tracing**।

---

## 1. Structured JSON Logging Architecture (Structlog 24.1)

সিস্টেমের সমস্ত লগ (Gunicorn, Daphne, Celery, এবং PostgreSQL কুয়েরি) একক-লাইনের অপ্টিমাইজড JSON অবজেক্ট হিসেবে স্ট্যান্ডার্ড আউটপুটে (stdout) স্ট্রিম হয়।

### 1.1 Mandatory JSON Schema Fields

| Field Name | Type | Source & Extraction | Example Value |
|:---|:---:|:---|:---|
| `timestamp` | ISO 8601 | UTC High-Res Time | `2026-09-18T09:30:14.215+05:30` |
| `level` | String | Log Severity | `INFO`, `WARNING`, `ERROR`, `CRITICAL` |
| `logger` | String | Module Python Path | `apps.blocks.services.CombinedWindowOptimizer` |
| `event` | String | Machine-Parsable Event Key | `COMBINED_BLOCK_WINDOW_OPTIMIZED` |
| `message` | String | Human-Readable Text | `Merged ENGG & TRD into 180 min combined block` |
| `trace_id` | String | W3C Trace Context / UUID4 | `4bf92f3577b34da6a3ce929d0e0e4736` |
| `request_id` | String | `X-Request-ID` Header | `REQ-7b8f9e12-4c3a-4a21-9a7f-9b0d2a8b3c4d` |
| `user_id` | UUID/Int | `request.user.id` | `14` |
| `role` | String | Spatial RBAC Role (#112) | `CHIEF_CONTROLLER` |
| `division` | String | Railway Division | `HOWRAH` |
| `section_code` | String | PostGIS Section Code | `HWH-BWN-L1` |
| `duration_ms` | Float | Execution Duration | `142.60` |

### 1.2 Example Structured Log Output
```json
{
  "timestamp": "2026-09-18T09:30:14.215+05:30",
  "level": "INFO",
  "logger": "apps.blocks.services.CombinedWindowOptimizer",
  "event": "COMBINED_BLOCK_WINDOW_OPTIMIZED",
  "message": "Merged ENGG and TRD requests into single 180-min shadow window",
  "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
  "request_id": "REQ-7b8f9e12-4c3a-4a21-9a7f-9b0d2a8b3c4d",
  "user_id": 14,
  "role": "CHIEF_CONTROLLER",
  "division": "HOWRAH",
  "section_code": "HWH-BWN-L1",
  "duration_ms": 142.60,
  "context": {
    "combined_window_id": "COMB-HWH-20260918-01",
    "shadow_time_saved_minutes": 120,
    "participating_departments": ["ENGG", "TRD"],
    "trains_cleared": ["12301"]
  }
}
```

### 1.3 Log Retention Policy
- **Hot Tier (Docker Container Logs & Local Disk):** ৭ দিন (তাত্ক্ষণিক ট্রাবলশুটিংয়ের জন্য)।
- **Warm Tier (Elasticsearch / Grafana Loki):** ৩০ দিন (সার্চ ও ইনসিডেন্ট এনালাইসিসের জন্য)।
- **Cold Tier (Compressed Gzip S3/Local Storage Archive):** ১ বছর (রেলওয়ে নিরাপত্তা ও অডিট কমপ্লায়েন্সের জন্য)।

---

## 2. Metrics Architecture (RED Method & Core Railway Business KPIs)

Prometheus (`prometheus_client` পোর্ট `9090`) প্রতি ১৫ সেকেন্ডে ব্যাকএন্ড এবং ডেটাবেসের মেট্রিক্স স্ক্র্যাপ করে।

### 2.1 Technical RED Method Metrics (Rate, Errors, Duration)

| Metric Name | Type | Labels | Description |
|:---|:---:|:---|:---|
| `railway_http_requests_total` | Counter | `method`, `endpoint`, `status_code` | প্রতি সেকেন্ডে ইনকামিং HTTP রিকোয়েস্ট সংখ্যা। |
| `railway_http_request_duration_seconds`| Histogram | `endpoint`, `status_code` | এপিআই রেসপন্স ল্যাটেন্সি (p50, p95, p99 বাকেট)। |
| `railway_websocket_active_connections` | Gauge | `channel_group` | সক্রিয় কন্ট্রোল রুম ও ফিল্ড ক্লায়েন্ট সংযোগ। |
| `railway_celery_task_duration_seconds` | Histogram | `queue`, `task_name` | সেলিরি ৪টি কিউয়ের টাস্ক সম্পন্নের সময়। |
| `railway_celery_queue_depth` | Gauge | `queue` (`high`, `notify`, `symbolic_ai`..) | কিউতে অপেক্ষারত অমীমাংসিত টাস্ক সংখ্যা। |
| `railway_postgis_query_duration_seconds`| Histogram | `operation` (`intersects`, `buffer`..) | স্থানিক পোস্টজিআইএস ইন্টারসেকশন কোয়েরি ল্যাটেন্সি। |

### 2.2 Core Railway Business KPIs & Master Plan Metrics

| Business Metric Name | Type | Formula / Origin | Target SLA |
|:---|:---:|:---|:---:|
| `railway_asset_availability_score` | Gauge | **Feature #50 Core Success KPI:** $(1 - \frac{\text{Total Block Downtime}}{\text{Total Corridor Time}}) \times 100$ | **> ৯২.০%** |
| `railway_shadow_window_savings_minutes_total`| Counter | **Feature #98 Core USP:** কম্বাইন্ড ব্লকে বাঁচানো ট্রেনের মোট মিনিট। | ক্রমবর্ধমান |
| `railway_conflicts_detected_total` | Counter | **Feature #31:** মোট শনাক্তকৃত স্থানিক/সময়গত ক্ল্যাশ। | — |
| `railway_conflicts_auto_resolved_total`| Counter | **Feature #32:** এআই ইঞ্জিন কর্তৃক স্বয়ংক্রিয় সমাধানকৃত ক্ল্যাশ। | **> ৮৫%** |
| `railway_active_digital_tokens` | Gauge | **Feature #71:** মাঠে সক্রিয় লাইন-ক্লোজার ডিজিটাল টোকেন। | রিয়েল-টাইম কাউন্ট |
| `railway_delay_cascade_recalculations_total`| Counter | **Feature #115:** NTES ট্রেনের লেটের কারণে স্বয়ংক্রিয় রিক্যালকুলেশন। | — |
| `railway_plan_variance_percentage` | Gauge | **Feature #109:** প্ল্যান করা ব্লক সময় বনাম বাস্তব ব্যবহারের ভ্যারিয়েন্স। | **< ৫.০%** |

---

## 3. Distributed Tracing & W3C Trace Context

প্রতিটি রিকোয়েস্ট ক্লায়েন্ট থেকে ডেটাবেস এবং ব্যাকগ্রাউন্ড সেলিরি ওয়ার্কার পর্যন্ত W3C স্ট্যান্ডার্ড `traceparent` হেডার বহন করে:

```
[React Client] (Span 1: User Click Submit)
       │
       ▼ (traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01)
[Nginx Gateway] (Span 2: SSL Terminate & Route)
       │
       ▼
[Django ViewSet] (Span 3: REST Controller & Validation)
       │
       ├──► [PostgreSQL + PostGIS] (Span 4: ST_Intersects Spatial Query)
       │
       ▼ (Enqueues Celery Task with same trace_id)
[Celery Worker: symbolic_ai] (Span 5: HermiT Reasoner Verification)
       │
       ▼
[Daphne ASGI WebSockets] (Span 6: Redis Pub/Sub Broadcast to Control Room)
```

---

## 4. Alerting Rules & Escalation Matrix

প্রমেথিউস অ্যালার্টম্যানেজার (Alertmanager) নিয়মাবলী:

| Severity | Alert Rule Name | Condition & Threshold | Escalation Action |
|:---:|:---|:---|:---|
| **P1 (Critical)** | `EmergencySOSTriggered` | `emergency.override_triggered` ইভেন্ট জারি হলে। | তাৎক্ষণিক কন্ট্রোল রুম লাল স্ক্রিন ফ্ল্যাশ + শীর্ষ কর্মকর্তাদের SMS। |
| **P1 (Critical)** | `PostgreSQLDown` | `up{job="postgres"} == 0` টানা ৩০ সেকেন্ড। | অন-কল ডেভঅপ্স ইঞ্জিনিয়ারকে স্বয়ংক্রিয় টেলিফোন কল। |
| **P1 (Critical)** | `TrackBreachSafetyClash` | ট্রেনের অবস্থান ও সক্রিয় ব্লকে `ST_DWithin < 500m`। | তাৎক্ষণিক সংশ্লিষ্ট সেকশনের সমস্ত সিগন্যাল স্বয়ংক্রিয় লাল (RED)। |
| **P2 (Warning)** | `CeleryQueueBacklog` | `railway_celery_queue_depth{queue="high"} > 50`। | সেলিরি ওয়ার্কার কনকারেন্সি স্কেল আপ ও স্ল্যাক অ্যালার্ট। |
| **P2 (Warning)** | `GeminiCircuitBreakerOpen` | `circuit_breaker_state{name="gemini"} == 1`। | লোকাল ফলব্যাক রুল ইঞ্জিনে ট্রাফিক ডাইভার্ট ও ডেভেলপার অ্যালার্ট। |
| **P2 (Warning)** | `TrainScheduleDeviationHigh`| ট্রেনের লেট > ৪৫ মিনিট এবং ব্লকের সাথে ক্ল্যাশ। | কন্ট্রোল রুম স্ক্রিনে পুনর্বিন্যাস সুপারিশ কার্ড প্রদর্শন। |
| **P3 (Info)** | `PendingBlockSLABreach` | ব্লকের আবেদন পেন্ডিং > ২৪ ঘণ্টা অনুমোদনহীন। | সংশ্লিষ্ট এসএসই ও কন্ট্রোলারকে রিমাইন্ডার ইমেইল। |

---

## 5. Health Check Endpoints Specification

সিস্টেমের স্বাস্থ্য যাচাইয়ের জন্য ৩ স্তরের হেলথচেক এপিআই:

### 5.1 Liveness Probe (`GET /api/v1/health/liveness/`)
- **ব্যবহার:** ডকার কন্টেইনার বা কুবারনেটিস প্রসেস বেঁচে আছে কিনা যাচাই।
- **রেসপন্স:** `{"status": "UP", "uptime_seconds": 14205}` (HTTP 200 OK)।

### 5.2 Readiness Probe (`GET /api/v1/health/readiness/`)
- **ব্যবহার:** সিস্টেমটি ট্র্যাফিক গ্রহণ করার জন্য প্রস্তুত কিনা (PostgreSQL ও Redis সংযোগ যাচাই)।
- **কোড লজিক:**
  ```python
  # apps/core/views.py
  from django.db import connection
  from django.core.cache import cache
  from rest_framework.response import Response
  from rest_framework.views import APIView

  class ReadinessHealthCheckView(APIView):
      permission_classes = []
      def get(self, request):
          checks = {}
          # 1. PostgreSQL + PostGIS Check
          try:
              with connection.cursor() as cursor:
                  cursor.execute("SELECT PostGIS_Version();")
                  checks["postgres_postgis"] = cursor.fetchone()[0]
          except Exception as e:
              return Response({"status": "DOWN", "error": f"PostGIS: {str(e)}"}, status=503)

          # 2. Redis Check
          try:
              cache.set("health_ping", "pong", 5)
              checks["redis"] = "UP" if cache.get("health_ping") == "pong" else "DOWN"
          except Exception as e:
              return Response({"status": "DOWN", "error": f"Redis: {str(e)}"}, status=503)

          return Response({"status": "READY", "checks": checks}, status=200)
  ```

### 5.3 Deep Health Probe (`GET /api/v1/health/deep/`)
- **ব্যবহার:** মেমোরিতে ডিজিটাল টুইন OWL ফাইল লোড আছে কিনা এবং ডিস্ক স্পেস পর্যাপ্ত কিনা তা নিবিড়ভাবে যাচাই।
- **যাচাইকৃত ক্ষেত্র:** PostGIS GiST ইনডেক্স স্বাস্থ্য, সেলিরি ৪টি কিউয়ের হার্টবিট এবং রিপোর্ট ডিরেক্টরি পারমিশন।

---

## 6. Pre-Configured Grafana Dashboards & Panels

Grafana (Port 3001) সার্ভারের জন্য পূর্ব-কনফিগারকৃত ৩টি মাস্টার ড্যাশবোর্ড:

### Dashboard 1: Control Room Executive Overview
- **প্যানেল ১ (Single Stat):** `railway_asset_availability_score` (সবুজ গেজ: ৯৫.৪%)।
- **প্যানেল ২ (Counter Stat):** `sum(railway_shadow_window_savings_minutes_total)` (মোট ৩,৪২০ মিনিট বাঁচানো হয়েছে)।
- **প্যানেল ৩ (Time Series):** কনফ্লিক্ট শনাক্ত বনাম এআই কর্তৃক স্বয়ংক্রিয় সমাধানের তুলনা রেখা।
- **প্যানেল ৪ (Bar Chart):** বিভাগভিত্তিক সক্রিয় ব্লকের সংখ্যা (ENGG: ৮, TRD: ৫, SNT: ৩)।

### Dashboard 2: Spatial & Corridor Track Health
- **প্যানেল ১ (Map View):** হাওড়া ও শিয়ালদহ ডিভিশনের সেকশনগুলোর বাস্তব সময়ের স্ট্যাটাস (Green/Red/Amber)।
- **প্যানেল ২ (Table):** বর্তমানে সক্রিয় ডিজিটাল সেফটি টোকেনের তালিকা (#71) ও সংশ্লিষ্ট গ্যাং সুপারভাইজার।
- **প্যানেল ৩ (Line Graph):** PostGIS স্প্যাশিয়াল ইন্টারসেকশন কোয়েরির গড় রেসপন্স টাইম (< ১২ms)।

### Dashboard 3: Neuro-Symbolic AI & Background Processing
- **প্যানেল ১ (Queue Depth):** ৪টি Celery কিউয়ের গ্রাফ (`high`, `notify`, `symbolic_ai`, `default_low`)।
- **প্যানেল ২ (Circuit Breaker State):** Gemini API এবং SMS গেটওয়ের বর্তমান স্ট্যাটাস (Closed/Open)।
- **প্যানেল ৩ (Reasoner Latency):** HermiT সিম্বলিক রিজনার এক্সিকিউশন ডিউরেশন (গড় ৪৫০ms)।

---

## 7. Common Log Queries (Incident Troubleshooting)

যেকোনো অনাকাঙ্ক্ষিত বিভ্রাটে দ্রুত কারণ শনাক্ত করার প্রি-বিল্ট কোয়েরি:

### ৭.১ নির্দিষ্ট ব্লকের কম্বাইন্ড অপ্টিমাইজেশন ট্রেস দেখা
```bash
grep "COMBINED_BLOCK_WINDOW_OPTIMIZED" /var/log/railway/app.json.log | jq 'select(.context.section_code=="HWH-BWN-L1")'
```

### ৭.২ গত ১ ঘণ্টায় সংঘটিত সমস্ত P1 ও P2 অ্যালার্ট ফিল্টার করা
```bash
grep -E '"level":"(ERROR|CRITICAL)"' /var/log/railway/app.json.log | jq '{timestamp, logger, event, message, trace_id}'
```

### ৭.৩ ডিজিটাল টোকেন হ্যান্ডওভার ও লাইন ক্লোজার অডিট লগ
```bash
grep "safety.digital_token_issued" /var/log/railway/app.json.log | jq '.context | {token_code, supervisor_username, section_code}'
```

---

## 8. Traceability to Subsequent Infrastructure Documents

| Target Document | Direct Observability Dependency |
|:---|:---|
| **`01-tech-infra/06-security.md`** | অডিট লগিং, আইপি ট্র্যাকিং ও আরবিএসি ভায়োলেশন সিকিউরিটি অ্যালার্ট। |
| **`01-tech-infra/07-workers-consumers.md`** | সেলিরি ৪-কিউ মেট্রিক্স, প্রমিথিউস এক্সপোর্টার এবং ডিএলকিউ মনিটরিং। |
| **`03-service-blueprints/06-analytics-reporting-service.md`** | অ্যাসেট অ্যাভেইলেবিলিটি স্কোর (#50) ও ভ্যারিয়েন্স অ্যানালাইসিস রিপোর্ট ক্যালকুলেশন (#109)। |
