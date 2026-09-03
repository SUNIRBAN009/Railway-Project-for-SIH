# 04-internal-api-and-messaging.md

> **File Order:** 8/45  
> **Previous File:** `01-tech-infra/03-event-brokers.md` (Redis configurations)  
> **Next File:** `01-tech-infra/05-observability.md`  
> **Connection:** The internal messaging patterns defined here utilize the Django Signals and Celery tasks mentioned in the previous file. These messages generate logs that will be monitored via the tools defined in the next file (Observability).

---

## 1. Internal Communication Strategy

In our Modular Monolith architecture, we have 8 distinct Django apps (Bounded Contexts). To maintain loose coupling, they must communicate without creating circular dependencies. 

We use three primary methods for internal communication:
1. **Direct Function Calls (Service to Service):** Synchronous, used when an immediate response is required (e.g., retrieving user details).
2. **Django Signals (Pub/Sub):** Synchronous/Asynchronous decoupling, used when one app needs to react to an event in another app without the sender knowing about the receiver.
3. **Celery Tasks (Message Broker):** Asynchronous, used for heavy lifting or external API calls (e.g., sending SMS, AI resolution).

---

## 2. Direct Function Calls (Service to Service)

When the `blocks` app needs data from the `assets` app to validate a request, it calls a public method on the `AssetService`.

### 2.1 Rules of Engagement
- **Never import views or serializers** from another app.
- **Avoid importing models directly** if complex business logic is involved. Import the Service class instead.
- If importing models is necessary for simple foreign keys, use string references (e.g., `models.ForeignKey('assets.Section')`).

### 2.2 Example: Block Validation

```python
# blocks/services.py
from assets.services import AssetService

class BlockService:
    def __init__(self):
        self.asset_service = AssetService()

    def validate_block_location(self, section_code, from_km, to_km):
        # Synchronous direct call to another bounded context
        section = self.asset_service.get_section(section_code)
        if not section:
            raise ValidationError("Section not found.")
        if from_km < 0 or to_km > section.total_length_km:
            raise ValidationError("KM out of section bounds.")
```

---

## 3. Django Signals (Internal Pub/Sub)

We use Django Signals heavily to decouple the `ontology` and `notifications` apps from the core `blocks` app. The `blocks` app simply broadcasts "a block was approved", and the other apps listen and react.

### 3.1 Defined Signals

```python
# blocks/signals.py
import django.dispatch

# Sent when a block is requested but not yet approved
block_requested = django.dispatch.Signal()

# Sent when the COA approves a block
block_approved = django.dispatch.Signal()

# Sent when the COA rejects a block
block_rejected = django.dispatch.Signal()

# Sent when an emergency block is activated
emergency_block_activated = django.dispatch.Signal()
```

### 3.2 Signal Emitter (Publisher)

```python
# blocks/services.py
from .signals import block_approved

class BlockService:
    def approve_block(self, block_id, user):
        block = self.repo.get(block_id)
        block.status = 'APPROVED'
        block.approved_by = user
        block.save()
        
        # Fire the signal
        block_approved.send(sender=self.__class__, block=block)
        return block
```

### 3.3 Signal Receiver (Subscriber) - Ontology Sync

```python
# ontology/receivers.py
from django.dispatch import receiver
from blocks.signals import block_approved
from .manager import DigitalTwinManager

@receiver(block_approved)
def sync_approved_block_to_twin(sender, block, **kwargs):
    # This runs synchronously in the same transaction
    manager = DigitalTwinManager()
    manager.sync_block_event(
        block_id=block.id,
        section_code=block.section.code,
        status="APPROVED"
    )
```

---

## 4. Asynchronous Messaging (Celery)

When a signal triggers a slow operation (like network I/O to Twilio or Gemini), the receiver immediately delegates the work to a Celery task to avoid blocking the HTTP response.

### 4.1 Example: Delegating Notification to Celery

```python
# notifications/receivers.py
from django.dispatch import receiver
from blocks.signals import emergency_block_activated
from .tasks import send_emergency_sms_task

@receiver(emergency_block_activated)
def handle_emergency_block(sender, block, **kwargs):
    # Extract needed data (don't pass full Django models to Celery)
    payload = {
        "block_id": block.id,
        "section_name": block.section.name,
        "department": block.department
    }
    
    # Asynchronous delegation (non-blocking)
    send_emergency_sms_task.delay(payload)
```

### 4.2 Celery Task Implementation

```python
# notifications/tasks.py
from celery import shared_task
from .services import TwilioService

@shared_task(queue='urgent')
def send_emergency_sms_task(payload):
    twilio = TwilioService()
    message = f"EMERGENCY BLOCK on {payload['section_name']}. Please clear tracks immediately."
    
    # Needs to query DB for phone numbers of affected crews
    # (Since this is async, we query the DB again safely)
    from departments.models import Crew
    crews = Crew.objects.filter(section_id=payload['section_code'])
    
    for crew in crews:
        twilio.send_sms(to=crew.contact_number, text=message)
```

---

## 5. Webhook Endpoints (External Inbound)

If external systems (like NTES or Open-Meteo) push data to us via webhooks (future scope), we handle them via dedicated DRF API endpoints that instantly dump the payload into Celery for processing.

### 5.1 Webhook Flow

```text
External System ──(POST JSON)──► DRF Webhook View ──(Celery delay)──► Worker Process
                                        │
                                  (Returns 202 Accepted)
```

### 5.2 Example View

```python
# railway_ai/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from .tasks import process_ntes_update

class NTESWebhookView(APIView):
    # Note: Requires signature validation in production
    def post(self, request):
        payload = request.data
        # Fire and forget
        process_ntes_update.delay(payload)
        return Response({"status": "accepted"}, status=202)
```

---

## 6. Data Consistency & Transactions

Since we use a shared PostgreSQL database, we rely on Django's `transaction.atomic()` to ensure data consistency during cross-app function calls.

### 6.1 Transaction Boundaries

```python
from django.db import transaction

def complex_block_creation(block_data, user):
    with transaction.atomic():
        # 1. Create block (blocks app)
        block = create_block_record(block_data)
        
        # 2. Update crew status (departments app)
        assign_crew_to_block(block.id, block_data['crew_id'])
        
        # 3. Fire signal (synchronous listeners will execute inside this transaction)
        block_requested.send(sender=BlockService, block=block)
        
    # If any error occurs above, the entire database transaction rolls back,
    # including the crew assignment.
```

### 6.2 Preventing Race Conditions (Celery)
**Important:** Never trigger a Celery task that reads a database record from inside an open transaction. The task might start before the transaction commits, resulting in a `DoesNotExist` error.

**Solution:** Use `transaction.on_commit()`:

```python
from django.db import transaction

def handle_emergency(block):
    with transaction.atomic():
        block.status = 'ACTIVE'
        block.save()
        
        # Execute the celery task only AFTER the database commit is successful
        transaction.on_commit(lambda: send_emergency_sms_task.delay(block.id))
```
