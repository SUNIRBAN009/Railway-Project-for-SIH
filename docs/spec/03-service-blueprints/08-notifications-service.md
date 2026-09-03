# 08-notifications-service.md

> **File Order:** 24/45  
> **Previous File:** `03-service-blueprints/07-analytics-service.md`  
> **Next File:** `04-function-maps/00-function-id-registry.md`  

---

### Notifications Service Blueprint

**Service ID:** `SVC-08`  
**App Name:** `notifications`  
**Primary Domain:** SMS, Email, and Real-time WebSocket Alerts  
**Owner:** Backend Team  

---

### 1. Domain Models (Database Schema)

This service maintains an audit log of all communications sent out by the system.

```python
from django.db import models

class NotificationChannel(models.TextChoices):
    SMS = 'SMS', 'Twilio SMS'
    WEBSOCKET = 'WS', 'WebSocket Broadcast'
    EMAIL = 'EMAIL', 'Email'

class AlertLog(models.Model):
    id = models.AutoField(primary_key=True)
    recipient_id = models.CharField(max_length=50) # Phone number, User ID, or Group Name
    channel = models.CharField(max_length=10, choices=NotificationChannel.choices)
    message = models.TextField()
    
    # Context
    related_block_id = models.CharField(max_length=20, null=True, blank=True)
    
    status = models.CharField(max_length=20, default='PENDING') # PENDING, SENT, FAILED
    error_message = models.TextField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
```

---

### 2. API Endpoints (DRF ViewSets)

| Method | Endpoint | Description | Auth/Role | Request Payload |
|--------|----------|-------------|-----------|-----------------|
| `GET`  | `/api/v1/notifications/` | Lists the user's notification history. | Auth (All) | None |
| `POST` | `/api/v1/notifications/mark-read/`| Marks in-app notifications as read. | Auth (All) | `{"notification_ids": [1, 2, 3]}` |

*(Note: Actual sending of SMS/WebSockets happens via internal signals, not REST API calls).*

---

### 3. Service Layer (Business Logic)

**File:** `notifications/services.py`

```python
import os
from twilio.rest import Client
from .models import AlertLog

class TwilioService:
    def __init__(self):
        self.client = Client(os.environ['TWILIO_ACCOUNT_SID'], os.environ['TWILIO_AUTH_TOKEN'])
        self.from_number = os.environ['TWILIO_PHONE_NUMBER']

    def send_sms(self, to_number, message, block_id=None):
        """Sends an SMS and logs it."""
        log_entry = AlertLog.objects.create(
            recipient_id=to_number,
            channel='SMS',
            message=message,
            related_block_id=block_id
        )
        
        try:
            self.client.messages.create(
                body=message,
                from_=self.from_number,
                to=to_number
            )
            log_entry.status = 'SENT'
            log_entry.save()
        except Exception as e:
            log_entry.status = 'FAILED'
            log_entry.error_message = str(e)
            log_entry.save()
            raise

class WebSocketService:
    def broadcast(self, group_name, payload):
        """Wrapper around Channels layer to broadcast JSON payloads."""
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            group_name,
            payload
        )
        
        # Log the broadcast
        AlertLog.objects.create(
            recipient_id=group_name,
            channel='WS',
            message=str(payload),
            status='SENT'
        )
```

---

### 4. Internal Events (Pub/Sub)

**4.1 Signals Emitted (Publisher)**
- None. This is a terminal consumer service.

**4.2 Signals Consumed (Subscriber)**
- `blocks.block_requested`: Triggers WebSocket notification to `coa_dashboard`.
- `blocks.block_approved`: Triggers SMS to the requesting JE and WebSocket to `coa_dashboard`.
- `blocks.emergency_block_activated`: Triggers global WebSocket RED ALERT and SMS to all affected department crews.

---

### 5. Background Tasks (Celery)

**File:** `notifications/tasks.py`

- `send_sms_task`: Wraps `TwilioService.send_sms` in the `urgent` queue to prevent external API latency from blocking the Django HTTP response.
- `broadcast_ws_task`: Wraps `WebSocketService.broadcast` to ensure Redis pub/sub operations happen in the background.

---

### 6. Dependencies

- **Upstream (Consumes from):** 
  - `blocks`: Consumes signals to know when to trigger alerts.
  - `departments`: Queries the `Crew` table to fetch `contact_number` for SMS routing.
- **Downstream (Provides to):** 
  - None.
