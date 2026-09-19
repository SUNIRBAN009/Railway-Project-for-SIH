# 08-notifications-function-map.md

> **File Sequence:** 33/45  
> **Service:** `SVC-NOTIF` (`apps.notifications`)  
> **Previous Document:** [04-function-maps/07-analytics-function-map.md](07-analytics-function-map.md)  
> **Next Document:** [05-deep-dive-logs/00-readme.md](../05-deep-dive-logs/00-readme.md)  
> **Context:** Exhaustive function mapping, WebSocket dispatchers, and SMS gateway handlers for Real-Time Communications.

---

## 1. Function Catalog

| Function ID | Function Name | HTTP Method | Path / Event | Input Schema | Output Schema | Target SLA |
|---|---|:---:|---|---|---|:---:|
| `FUNC-NOTIF-001` | Retrieve Unread Notifications | `GET` | `/api/v1/notifications/` | `?unread=true` | `PaginatedNotificationsDTO` | < 40ms |
| `FUNC-NOTIF-002` | Broadcast Real-Time WebSocket Frame | Celery | `notifications.tasks.broadcast_ws` | `{"user_id", "frame"}` | `DispatchResultDTO` | < 15ms |
| `FUNC-NOTIF-003` | Send Urgent Cellular SMS Alert | Celery | `notifications.tasks.dispatch_sms` | `{"phone", "text"}` | `SMSProviderReceiptDTO` | < 3000ms |

---

## 2. Detailed Function Implementation Specifications

### `FUNC-NOTIF-002`: Broadcast Real-Time WebSocket Frame (Celery Worker)
- **Task Signature:** `apps.notifications.tasks.broadcast_ws(recipient_user_id: str, frame_data: dict) -> bool`
- **Queue:** `notify`
- **Processing Logic:**
  1. Retrieve Daphne channel group for user: `group_name = f"user_{recipient_user_id}"`.
  2. Invoke `channels.layers.get_channel_layer().group_send()` with payload:
     ```python
     async_to_sync(channel_layer.group_send)(
         group_name,
         {
             "type": "notification.message",
             "message": frame_data
         }
     )
     ```
  3. Record delivery status `'DELIVERED'` in `notification_delivery_logs`.
- **Target Latency:** < 15ms in-memory delivery over Redis Channel Layer.

---

### `FUNC-NOTIF-003`: Send Urgent Cellular SMS Alert (Celery Worker)
- **Task Signature:** `apps.notifications.tasks.dispatch_sms(phone_number: str, message_text: str, notification_id: str) -> dict`
- **Queue:** `notify`
- **Processing Logic:**
  1. Check rate limits to prevent SMS flooding (max 3 SMS per phone per 10 minutes).
  2. Construct HTTPS POST request to Indian Railways CDAC/NIC Telco Gateway:
     ```json
     {
       "sender_id": "RAILBK",
       "mobile": "+919876543210",
       "message": "URGENT RAILWAY ALERT: Emergency Block Sanctioned at KM 144.2. All track work halted immediately.",
       "priority": "P1_EMERGENCY"
     }
     ```
  3. Set HTTP timeout: 4.0 seconds.
  4. On 200 OK receipt, record provider `message_id` into `notification_delivery_logs`.
  5. On failure or timeout, retry with exponential backoff (retry count up to 3 times: 5s, 15s, 45s).
  6. If exhausted, move message record to `'DEAD_LETTER'` and alert system operations.
