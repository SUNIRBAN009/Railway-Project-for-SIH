# 08-notifications-function-map.md

> **ফাইল ক্রম:** ৩৩/৪৫  
> **সার্ভিস আইডি:** `SVC-NOTIF` (`apps.notifications`)  
> **পূর্ববর্তী ফাইল:** [04-function-maps/07-analytics-function-map.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/04-function-maps/07-analytics-function-map.md) (`SVC-ANL` Dedicated Function Map)  
> **পরবর্তী ফাইল:** [05-deep-dive-logs/00-readme.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/05-deep-dive-logs/00-readme.md) (Deep Dive Technical Logs & Specifications Index)  
> **সংযোগ ও উদ্দেশ্য:** এই ফাইলে প্ল্যাটফর্মের লাইফ-সেফটি ও রিয়েল-টাইম ফ্যানআউট সার্ভিস **`SVC-NOTIF` (Critical Safety Broadcast, SOS Emergency & Multi-Channel Alert Service)**-এর ৮টি ক্যানোনিকাল ফাংশনের ইনপুট/আউটপুট স্কিমা, ড্যাফনি এএসজিআই (Daphne ASGI) চ্যানেল, ১-ট্যাপ জিপিএস এসওএস সাইরেন (#79), ট্রেন অ্যাপ্রোচ ওয়ার্নিং (#76), লোন ওয়ার্কার ডেড-ম্যান চেকিং (#78), এবং ইন্টার-ডিপার্টমেন্ট চ্যাটরুমের (#43) বিশদ বাস্তবায়ন বিবরণ প্রদান করা হয়েছে।

---

## 1. Function Catalog (8 Core Functions)

| Function ID | Function Name | HTTP Method | Path / Trigger | Input DTO | Output DTO | Target SLA |
|---|---|:---:|---|---|---|:---:|
| `FUNC-NOTIF-001`| Retrieve Unread User Notifications | `GET` | `/api/v1/notifications/` | Query Parameters | `PaginatedNotificationsDTO`| p95 < 40ms |
| `FUNC-NOTIF-002`| Mark Notification Read & Clear Badge | `PATCH`| `/api/v1/notifications/{id}/read/` | None | `GenericSuccessDTO` | p95 < 30ms |
| `FUNC-NOTIF-003`| One-Tap GPS SOS Emergency Alarm Trigger| `POST` | `/api/v1/notifications/sos/trigger/`| `SOSTriggerPayloadDTO` | `SOSTriggerResultDTO` | p95 < 75ms |
| `FUNC-NOTIF-004`| Control Room Siren Ack & Signal Hold | `POST` | `/api/v1/notifications/sos/ack/` | `SirenAckRequestDTO` | `SOSTriggerResultDTO` | p95 < 45ms |
| `FUNC-NOTIF-005`| Train Approach Warning Siren Broadcast | `POST` | `/api/v1/notifications/train-approach/` | `TrainApproachAlertDTO` | `DispatchSummaryDTO` | p95 < 40ms |
| `FUNC-NOTIF-006`| Lone Worker Dead-Man Check-in Ping | `POST` | `/api/v1/notifications/lone-worker/ping/`| `LoneWorkerCheckinDTO` | `LoneWorkerStatusDTO` | p95 < 35ms |
| `FUNC-NOTIF-007`| Inter-Department Collaboration Chat History | `GET` | `/api/v1/notifications/chat/{block_id}/`| Query Parameters | `ChatHistoryCollectionDTO` | p95 < 45ms |
| `FUNC-NOTIF-008`| Send Department Message & Action Item | `POST` | `/api/v1/notifications/chat/{block_id}/`| `DepartmentMessageDTO` | `ChatMessageDetailDTO` | p95 < 50ms |

---

## 2. Detailed Function Implementation Specifications

### `FUNC-NOTIF-001`: Retrieve Unread User Notifications
- **Controller Class:** `apps.notifications.views.NotificationListView`
- **Permissions:** `IsAuthenticated`
- **Query Parameters:** `?unread=true&priority=CRITICAL_EMERGENCY&page=1`
- **Processing Logic:**
  1. রিকোয়েস্টের ইউজারের `recipient_user_id` দ্বারা ফিল্টার।
  2. অপঠিত নোটিফিকেশনের সংখ্যা এবং অগ্রাধিকার অনুযায়ী সাজানো তালিকা রিটার্ন।
- **Output (HTTP 200):** `PaginatedNotificationsDTO`।

---

### `FUNC-NOTIF-002`: Mark Notification Read & Clear Badge
- **Controller Class:** `apps.notifications.views.NotificationMarkReadView`
- **Permissions:** `IsAuthenticated`
- **URL Parameter:** `notification_id`
- **Processing Logic:**
  1. `notifications_notification.is_read = TRUE` এবং `read_at = CURRENT_TIMESTAMP` আপডেট।
  2. Redis ক্যাশ `railway:notif:unread_count:{user_id}` ডিক্রিমেন্ট।
  3. ফ্রন্টএন্ড নেভিগেশন বারের আনরিড ব্যাজ আপডেট করতে WebSocket ফ্রেম পুশ।
- **Output (HTTP 200):** `GenericSuccessDTO`।

---

### `FUNC-NOTIF-003`: One-Tap GPS SOS Emergency Alarm Trigger (Feature #79 - Life Safety)
- **Controller Class:** `apps.notifications.views.SOSTriggerView`
- **Permissions:** `IsAuthenticated` (যেকোনো ফিল্ড ক্রু বা গ্যাং মেম্বার)
- **Input Schema (`SOSTriggerPayloadDTO`):**
```json
{
  "corridor_code": "HWH-BWN",
  "coordinates": {
    "latitude": 23.2324,
    "longitude": 87.8615
  },
  "emergency_type": "ACCIDENT_MEDICAL",
  "audio_voice_note_url": null,
  "caller_remarks": "Track maintainer injured near Bardhaman outer point 143. Immediate first-aid ambulance required."
}
```
- **Processing Logic:**
  1. PostGIS পয়েন্ট তৈরি: `ST_SetSRID(ST_MakePoint(87.8615, 23.2324), 4326)`।
  2. PostGIS দ্বারা নিকটবর্তী স্টেশন এবং দূরত্ব গণনা (`ST_Distance`):
     ```sql
     SELECT station_code, ROUND(ST_Distance(station_coordinates::geography, :caller_point::geography)) AS distance_meters
     FROM infrastructure_station ORDER BY station_coordinates <-> :caller_point LIMIT 1;
     ```
  3. `notifications_sos_event` টেবিলে ইউনিক কোড `SOS-YYYYMMDD-[SEQ]` সহ সংরক্ষণ।
  4. **তাৎক্ষণিক ব্রডকাস্ট (WebSocket Daphne):**
     - কন্ট্রোল রুমের ডেডিকেটেড চ্যানেল গ্রুপ `control_room_emergency_broadcast`-এ হাই-প্রায়োরিটি লাল ফ্ল্যাশ এবং সাইরেন অডিও কিউ সহ মেসেজ পুশ:
       `{"type": "SOS_TRIGGERED", "sos_code": "...", "coordinates": [23.2324, 87.8615], "nearest_station": "BWN"}`
  5. Celery কিউ `notify`-এর মাধ্যমে নিকটবর্তী স্টেশন মাস্টার ও ডিভিশনাল সেফটি অফিসারের ফোনে জরুরি এসএমএস ডিসপ্যাচ।
- **Output (HTTP 201 Created):** `SOSTriggerResultDTO`।

---

### `FUNC-NOTIF-004`: Control Room Siren Ack & Signal Hold (Feature #79)
- **Controller Class:** `apps.notifications.views.SirenAcknowledgeView`
- **Permissions:** `IsChiefController`
- **Input Schema (`SirenAckRequestDTO`):**
```json
{
  "sos_id": "e8102938-7911-482a-9911-f01928374930",
  "action_taken": "SIGNALS_HELD_RED_AMBULANCE_DISPATCHED",
  "remarks": "Signals held at Bardhaman home. Local medical ambulance dispatched to KM 94.2."
}
```
- **Processing Logic:**
  1. `notifications_sos_event.siren_acknowledged_by_controller = TRUE`, `acknowledged_at = CURRENT_TIMESTAMP`।
  2. কন্ট্রোল রুমের স্ক্রিনে অডিও সাইরেন স্টপ কমান্ড ব্রডকাস্ট।
  3. ফিল্ড ক্রুর ফোনে নিশ্চিতকরণ পুশ: *"Controller has acknowledged SOS. Emergency services en-route."*
- **Output (HTTP 200):** আপডেটেড `SOSTriggerResultDTO`।

---

### `FUNC-NOTIF-005`: Train Approach Warning Siren Broadcast (Feature #76 - Life-Saving)
- **Controller Class:** `apps.notifications.views.TrainApproachBroadcastView`
- **Permissions:** `IsSystemOrAdmin` (স্বয়ংক্রিয় ডেভিয়েশন বা লাইভ ট্র্যাকিং ইঞ্জিন দ্বারা কলকৃত)
- **Input Schema (`TrainApproachAlertDTO`):**
```json
{
  "train_number": "12301",
  "train_name": "Howrah Rajdhani Express",
  "block_id": "a9102847-02bb-481a-9911-c01928374612",
  "distance_km": 12.700,
  "seconds_to_arrival": 360,
  "target_gang_code": "GANG-HWH-ENG-04"
}
```
- **Processing Logic:**
  1. গ্যাং লিডার ও সাইটের লুক-আউট ম্যানের পার্সোনাল ওয়েবসকেট চ্যানেলে অবিলম্বে সাইরেন অডিও কিউ (`audio_cue: SIREN_WARNING_ALARM`) প্রেরণ।
  2. সেলুলার এসএমএস ডিসপ্যাচ:
     *"TRAIN APPROACH WARNING: 12301 Rajdhani approaching Bandel (6 mins). CLEAR THE TRACK IMMEDIATELY!"*
  3. `notifications_delivery_log` টেবিলে মিলিমিটার নিখুঁত ডেলিভারি লেটেন্সি রেকর্ড।
- **Output (HTTP 200):** `DispatchSummaryDTO`।

---

### `FUNC-NOTIF-006`: Lone Worker Dead-Man Check-in Ping (Feature #78)
- **Controller Class:** `apps.notifications.views.LoneWorkerPingView`
- **Permissions:** `IsAuthenticated` (ট্র্যাক পেট্রোলম্যান / কি-ম্যান)
- **Input Schema (`LoneWorkerCheckinDTO`):**
```json
{
  "current_coordinates": {"latitude": 23.2324, "longitude": 87.8615},
  "battery_level_pct": 82,
  "status_ok": true
}
```
- **Processing Logic:**
  1. `notifications_lone_worker_tracker` টেবিলে `last_checkin_timestamp = CURRENT_TIMESTAMP` এবং `next_deadline_timestamp = NOW() + INTERVAL '30 minutes'` রিসেট।
  2. `missed_checkin_count = 0` ও `is_alarm_active = FALSE` নিশ্চিতকরণ।
- **Output (HTTP 200):** `LoneWorkerStatusDTO` পরবর্তী ডেডলাইন টাইমস্ট্যাম্পসহ।

---

### `FUNC-NOTIF-007` & `FUNC-NOTIF-008`: Inter-Department Chat Ledger (Feature #43)
- **Controller Class:** `apps.notifications.views.DepartmentChatView`
- **Permissions:** `IsAuthenticated`
- **Input Schema (`DepartmentMessageDTO`):**
```json
{
  "block_id": "a9102847-02bb-481a-9911-c01928374612",
  "message_text": "TRD: 25kV power cut confirmed for portal 452. Civil gang can move tamping machine now.",
  "has_action_item": true
}
```
- **Processing Logic:**
  1. বার্তা `notifications_department_message` টেবিলে সংরক্ষণ।
  2. Daphne চ্যানেল গ্রুপ `chat_block_{block_id}`-এ লাইভ ব্রডকাস্ট, যাতে সিভিল, এসঅ্যান্ডটি ও টিআরডি অফিসাররা একে অপরের স্ক্রিনে তাৎক্ষণিক আপডেট দেখতে পান।
- **Output (HTTP 201 Created):** `ChatMessageDetailDTO`।

---

## 3. Next File Dependency Note

> **পরবর্তী ফাইল:** [05-deep-dive-logs/00-readme.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/05-deep-dive-logs/00-readme.md)

`08-notifications-function-map.md` সফলভাবে সম্পূর্ণ হয়েছে। এর সাথে সাথে **`04-function-maps/` ফোল্ডারের সকল ৯টি ফাইল** সম্পূর্ণ ক্যানোনিকাল স্পেসিফিকেশনে উন্নীত হলো। পরবর্তী ফোল্ডার `05-deep-dive-logs/`-এর প্রথম ফাইল `00-readme.md`-এ অ্যালগরিদম, এরর কোড রেজিস্ট্রি, এবং এডিআর (ADR)-এর বিস্তারিত গাইডলাইন স্থাপন করা হবে।
