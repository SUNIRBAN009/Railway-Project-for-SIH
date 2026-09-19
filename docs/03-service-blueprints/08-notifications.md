# 08-notifications.md

> **File Sequence:** 24/45  
> **Previous Document:** [03-service-blueprints/07-analytics.md](07-analytics.md)  
> **Next Document:** [04-function-maps/00-function-id-registry.md](../04-function-maps/00-function-id-registry.md)  
> **Context:** Authoritative specification for `SVC-NOTIF` (Multi-Channel Real-Time Dispatch, WebSockets & SMS Fallback Engine).

---

# SVC-NOTIF: Real-Time Event Fanout & Notification Service

> **Service ID:** `SVC-NOTIF`  
> **Django App:** `apps.notifications`  
> **Owning Team:** Real-Time Infrastructure & Communications Team  
> **Lead Architect:** Principal Distributed Messaging Architect  
> **Primary SLA:** 99.99% Availability, In-App Delivery < 100ms, SMS Delivery < 5000ms  
> **Classification:** High-Reliability Critical Alerting Engine

---

## 1. Domain & Bounded Context Boundary

### 1.1 Core Business Mission
Delivers multi-channel critical operational alerts, cautionary messages, block sanction notifications, and emergency stop broadcasts across the Indian Railways personnel network. Coordinates real-time in-app WebSocket broadcasts via Daphne ASGI and falls back to Indian Railways cellular SMS gateways for track gang supervisors and field crews operating in areas with limited mobile data connectivity.

### 1.2 Bounded Context Boundary
- **In-Scope Responsibilities:**
  - In-app real-time notification push via Django Channels / Daphne WebSocket connections.
  - SMS gateway integration for field supervisors (`NIC_SMS_GATEWAY` / `CDAC_TELCO`).
  - Notification template rendering with dynamic variable substitution.
  - Delivery receipt tracking, failed message retries, and dead-letter archiving.
- **Explicit Exclusions:**
  - Direct calculation of block conflict severity (calculated by `SVC-BLK`).
  - Train delay calculation (calculated by `SVC-TRN`).

---

## 2. Technical Stack & Runtime Topology

```
+-------------------------------------------------------------------------------+
|                       SVC-NOTIF RUNTIME ARCHITECTURE                          |
+-------------------------------------------------------------------------------+
|  WebSocket Layer: Daphne ASGI Server (Port 8001) /ws/v1/notifications/        |
|  Channel Layer: Redis Channel Layer 4.0 (Redis 7.2 DB 0)                      |
|  Dispatcher Worker: Celery Queue 'notify' (High-Priority Concurrent Workers)   |
|  Database Engine: MySQL 8.0 `notifications`, `delivery_logs`, `templates`     |
|  External Carrier: HTTPS Indian Railways SMS Gateway with exponential backoff  |
+-------------------------------------------------------------------------------+
```

---

## 3. Database Schema & Persistence (MySQL 8.0)

### 3.1 Table Definitions

```sql
-- Notification Records Ledger
CREATE TABLE `notifications` (
  `id` CHAR(36) NOT NULL,
  `recipient_user_id` CHAR(36) NOT NULL,
  `recipient_role` VARCHAR(30) NOT NULL,
  `priority` ENUM('CRITICAL_EMERGENCY', 'HIGH_OPERATIONAL', 'ROUTINE_INFO') NOT NULL DEFAULT 'ROUTINE_INFO',
  `category` ENUM('BLOCK_SANCTIONED', 'BLOCK_BURST_WARNING', 'SAFETY_CONFLICT_ALARM', 'WORK_ORDER_ASSIGNED', 'TRAIN_DELAY_ALERT') NOT NULL,
  `title` VARCHAR(150) NOT NULL,
  `message_body` TEXT NOT NULL,
  `target_entity_type` VARCHAR(50) NOT NULL,
  `target_entity_id` CHAR(36) NOT NULL,
  `is_read` TINYINT(1) NOT NULL DEFAULT 0,
  `read_at` DATETIME(6) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_notif_recipient_unread` (`recipient_user_id`, `is_read`),
  KEY `idx_notif_priority` (`priority`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Multi-Channel Delivery Logs & Audit
CREATE TABLE `notification_delivery_logs` (
  `id` CHAR(36) NOT NULL,
  `notification_id` CHAR(36) NOT NULL,
  `channel` ENUM('WEBSOCKET_INAPP', 'SMS_GATEWAY', 'EMAIL') NOT NULL,
  `delivery_status` ENUM('QUEUED', 'DISPATCHED', 'DELIVERED', 'FAILED', 'DEAD_LETTER') NOT NULL DEFAULT 'QUEUED',
  `external_reference_id` VARCHAR(100) NULL,
  `retry_attempts` INT UNSIGNED NOT NULL DEFAULT 0,
  `error_details` TEXT NULL,
  `dispatched_at` DATETIME(6) NULL,
  PRIMARY KEY (`id`),
  KEY `idx_delivery_notif` (`notification_id`),
  KEY `idx_delivery_status` (`delivery_status`, `retry_attempts`),
  CONSTRAINT `fk_delivery_notif` FOREIGN KEY (`notification_id`) REFERENCES `notifications` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 4. API & WebSocket Endpoints Specification

### 4.1 REST Endpoints
| Method | Endpoint | Permissions | Query / Payload | Response DTO | SLA (p95) |
|---|---|---|---|---|:---:|
| `GET` | `/api/v1/notifications/` | Authenticated | `?unread=true` | Paginated User Notifications | < 40ms |
| `PATCH` | `/api/v1/notifications/{id}/read/` | Authenticated | Empty | Updated Notification DTO (`is_read: true`) | < 30ms |
| `POST` | `/api/v1/notifications/mark-all-read/` | Authenticated | Empty | Batch Read Confirmation DTO | < 50ms |

### 4.2 WebSocket Connection Contract
- **Endpoint:** `wss://{domain}/ws/v1/notifications/`
- **Protocol:** Authenticated via JWT Ticket Query Parameter: `?token=<jwt_access_token>`.
- **Inbound Client Frames:**
  - `{"action": "ping"}` -> Server responds `{"action": "pong", "server_time": "..."}`.
- **Outbound Server Push Frames:**
  - `{"type": "NOTIFICATION_RECEIVE", "payload": { "id": "...", "title": "...", "priority": "CRITICAL_EMERGENCY" }}`
  - `{"type": "INVALIDATE_CACHE", "domain": "BLOCKS", "corridor": "NDLS-CNB-SEC04"}`

---

## 5. Event-Driven Subscriptions (Redis `events:*`)

`SVC-NOTIF` subscribes to domain events across the platform:
- **`blocks.possession.sanctioned`:** Generates notifications for Section Controller and Site Supervisors.
- **`blocks.possession.burst_warning`:** Dispatches `CRITICAL_EMERGENCY` alerts via both WebSocket and SMS to the Chief Controller.
- **`assets.critical_defect.detected`:** Instantly alerts the Assistant Divisional Engineer (ADEN).
