# 00-coding-guidelines.md

> **File Order:** 40/45  
> **Previous File:** `07-roadmap/03-presentation-script.md`  
> **Next File:** `08-standards/01-git-workflow.md`  
> **Connection:** These guidelines ensure the code written during the timeline defined in Phase 5 remains readable.

---

## 1. Python / Django Guidelines (Backend)

During a hackathon, clean code prevents 3:00 AM debugging nightmares.

### 1.1 The "Fat Service, Thin View" Rule
**Never** put business logic inside `views.py`. 
- `views.py`: Only handles HTTP Request (JSON parsing, authentication checking) and returns HTTP Response.
- `services.py`: Handles all database writes, API calls, and complex logic.

**BAD (`views.py`):**
```python
def create_block(request):
    # BAD: Logic in view
    if request.data['from_km'] > request.data['to_km']:
        return Response({"error": "invalid"}, status=400)
    BlockRequest.objects.create(...)
```

**GOOD (`views.py`):**
```python
def create_block(request):
    # GOOD: View delegates to service
    serializer = BlockRequestSerializer(data=request.data)
    if serializer.is_valid():
        service = BlockService()
        service.create_block(serializer.validated_data)
        return Response(serializer.data, status=201)
```

### 1.2 Import Standards
Group imports logically. No wildcard imports (`from module import *`).

```python
# 1. Standard Library
import os
from datetime import datetime

# 2. Third Party
from rest_framework import serializers
from celery import shared_task

# 3. Local (Always use explicit relative or absolute imports)
from .models import BlockRequest
from accounts.services import UserService
```

---

## 2. JavaScript / React Guidelines (Frontend)

### 2.1 File Structure
Group components by Feature, not by technical type.

**BAD:**
```text
/components
  /buttons
  /modals
  /tables
```

**GOOD:**
```text
/features
  /auth
    LoginForm.jsx
  /blocks
    BlockRequestForm.jsx
    PendingBlocksTable.jsx
```

### 2.2 Global State vs Local State
- **Use `useState`:** For form inputs, UI toggles (is modal open?), and local loading spinners.
- **Use `Zustand`:** Only for data that multiple disjoint components need (e.g., User Auth Token, active WebSocket messages).

### 2.3 API Calls
Do not use `fetch` directly in components. Use the pre-configured Axios instance (`src/utils/api.js`) which automatically attaches the JWT token and handles 401 token refreshes.

**GOOD:**
```javascript
import api from '../../utils/api';

const fetchBlocks = async () => {
    const res = await api.get('/blocks/');
    setBlocks(res.data.results);
}
```
