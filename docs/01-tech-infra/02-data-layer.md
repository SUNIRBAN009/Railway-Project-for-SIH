# 02-data-layer.md

> **ফাইল ক্রম:** ৬/৪৫  
> **পূর্ববর্তী ফাইল:** `01-tech-infra/01-frontend-core.md` (TanStack Query keys, Zustand auth store, WebSocket groups)  
> **পরবর্তী ফাইল:** `01-tech-infra/03-event-brokers.md`  
> **সংযোগ:** এই ফাইলে নির্ধারিত Redis cache key pattern (`cache:blocks:pending:*`, `session:{jwt}`, `ws:group:*`) এবং MySQL `audit_logs` table `03-event-brokers.md`-এর event topic naming convention (`block.created`, `block.approved`, `conflict.detected`) এবং event payload schema নির্ধারণে ব্যবহৃত হবে।

---

## 1. Database Selection Matrix

| Database | CAP Position | Used For | Justification |
|----------|-------------|----------|---------------|
| **MySQL 8.0 (InnoDB)** | CP (Consistency + Partition tolerance) | Primary relational data | ACID transactions, robust row-level locking, foreign key integrity, native JSON support, MySQL Spatial (GIS) extensions with spatial indexes for railway network geometry, utf8mb4 full unicode support |
| **Redis 7** | AP (Availability + Partition tolerance) | Cache, session, pub/sub, queue | Sub-millisecond in-memory operations, TTL expiration, native Django Channels Redis layer integration, Celery broker |
| **SQLite (Owlready2 Quadstore)** | CP | Semantic graph (RDF/OWL) | File-based, zero-configuration embedded quadstore, Git version-controlled, Python-native reasoning with HermiT |

**Rejected Alternatives:**
- **PostgreSQL 15:** Rejected per project stack standardization on MySQL 8.0 (team expertise, existing MySQL infrastructure, seamless RDS/Managed MySQL availability).
- **MongoDB 7:** Rejected — Weak ACID multi-table transaction ergonomics compared to relational SQL for critical railway block operations, lacks structured relational foreign keys.
- **Neo4j:** Future scale consideration, but requires separate Cypher query layer instead of OWL 2 / SPARQL semantic reasoning standard.

---

## 2. Entity Relationship Diagram (ASCII)

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│     users       │       │  departments    │       │     crews       │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK, CHAR36) │◄──────│ id (PK, CHAR36) │◄──────│ id (PK, CHAR36) │
│ username (UQ)   │       │ name            │       │ gang_code (UQ)  │
│ email (UQ)      │       │ code (UQ)       │       │ dept_id (FK)    │
│ password_hash   │       │ description     │       │ current_section │
│ role            │       │ created_at      │       │ status          │
│ department_id   │──────►│                 │       │ shift_start     │
│ phone           │       │                 │       │ shift_end       │
│ is_active       │       │                 │       │ created_at      │
│ last_login      │       │                 │       └─────────────────┘
│ created_at      │       └─────────────────┘                │
└─────────────────┘                │                         │
        │                          │                  ┌──────┘
        │                   ┌──────┘                  ▼
        │                   ▼                 ┌─────────────────┐
        │           ┌─────────────────┐       │   materials     │
        │           │     assets      │       ├─────────────────┤
        │           ├─────────────────┤       │ id (PK, CHAR36) │
        │           │ id (PK, CHAR36) │       │ name            │
        │           │ asset_code (UQ) │       │ dept_id (FK)    │
        │           │ asset_type      │       │ quantity        │
        │           │ section_id (FK) │       │ unit            │
        │           │ health_score    │       │ location        │
        │           │ status          │       └─────────────────┘
        │           └─────────────────┘
        ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│  block_requests │       │    sections     │       │     trains      │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK, CHAR36) │◄──────│ id (PK, CHAR36) │◄──────│ id (PK, CHAR36) │
│ block_code (UQ) │       │ name (UQ)       │       │ train_no (UQ)   │
│ dept_id (FK)    │──────►│ from_station    │       │ train_name      │
│ section_id (FK) │──────►│ to_station      │       │ route (JSON)    │
│ requester_id(FK)│◄──────│ total_km        │       │ current_section │
│ from_km         │       │ current_status  │       │ schedule (JSON) │
│ to_km           │       │ line_type       │       │ priority        │
│ start_time      │       │ district        │       │ delay_minutes   │
│ end_time        │       │ division        │       │ status          │
│ priority        │       │ geojson_path    │       │ created_at      │
│ work_type       │       │ geom (SPATIAL)  │       └─────────────────┘
│ status          │       │ created_at      │                │
│ conflict_with   │       └─────────────────┘                │
│ ai_resolution   │                                          │
│ approved_by(FK) │       ┌─────────────────┐                │
│ emergency_flag  │       │  notifications  │                │
│ photo_url       │       ├─────────────────┤                │
│ created_at      │       │ id (PK, CHAR36) │                │
│ updated_at      │       │ type            │                │
└─────────────────┘       │ recipient_id(FK)│◄───────────────┘
        │                 │ message         │
        ▼                 │ status          │
┌─────────────────┐       │ sent_at         │
│   audit_logs    │       │ created_at      │
├─────────────────┤       └─────────────────┘
│ id (PK, BIGINT) │                  │
│ table_name      │                  ▼
│ record_id       │       ┌─────────────────┐
│ action          │       │ ontology_sync   │
│ old_data (JSON) │       ├─────────────────┤
│ new_data (JSON) │       │ id (PK, CHAR36) │
│ user_id (FK)    │       │ entity_type     │
│ timestamp       │       │ entity_id       │
│ ip_address      │       │ rdf_subject     │
└─────────────────┘       │ rdf_predicate   │
                          │ rdf_object      │
                          │ sync_status     │
                          └─────────────────┘

[FK] = Foreign Key, [UQ] = Unique Constraint, [PK] = Primary Key
Engine: InnoDB, Charset: utf8mb4, Collation: utf8mb4_unicode_ci
```

---

## 3. MySQL 8.0 Schema Details

All tables use **InnoDB Engine**, `DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`.

### 3.1 Table: `users` (accounts app)

```sql
CREATE TABLE `users` (
  `id` CHAR(36) NOT NULL,
  `username` VARCHAR(50) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `first_name` VARCHAR(50) NOT NULL,
  `last_name` VARCHAR(50) NOT NULL,
  `role` VARCHAR(20) NOT NULL,
  `department_id` CHAR(36) NULL,
  `phone` VARCHAR(15) NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `last_login` DATETIME(6) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_username` (`username`),
  UNIQUE KEY `uq_users_email` (`email`),
  KEY `idx_users_role_dept` (`role`, `department_id`),
  KEY `idx_users_phone` (`phone`),
  KEY `idx_users_active` (`is_active`),
  CONSTRAINT `fk_users_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

- **Roles:** `ENG_JE`, `TRD_JE`, `SNT_JE`, `SE`, `COA`
- **Estimated Rows:** 50 (MVP / Hackathon demo), 10,000 (Division deployment)

---

### 3.2 Table: `departments` (departments app)

```sql
CREATE TABLE `departments` (
  `id` CHAR(36) NOT NULL,
  `name` VARCHAR(50) NOT NULL,
  `code` VARCHAR(10) NOT NULL,
  `description` TEXT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_departments_name` (`name`),
  UNIQUE KEY `uq_departments_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

- **Codes:** `ENG` (Engineering), `TRD` (Traction Distribution), `SNT` (Signal & Telecom)
- **Estimated Rows:** 3 (Fixed core departments)

---

### 3.3 Table: `sections` (trains app — network topology)

```sql
CREATE TABLE `sections` (
  `id` CHAR(36) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `from_station` VARCHAR(50) NOT NULL,
  `to_station` VARCHAR(50) NOT NULL,
  `total_km` DECIMAL(6,2) NOT NULL,
  `current_status` VARCHAR(20) NOT NULL DEFAULT 'FREE',
  `line_type` VARCHAR(20) NOT NULL DEFAULT 'MAIN',
  `district` VARCHAR(50) NOT NULL,
  `division` VARCHAR(50) NOT NULL,
  `geojson_path` JSON NULL,
  `geom` LINESTRING SRID 4326 NULL,
  `active_block_id` CHAR(36) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_sections_name` (`name`),
  KEY `idx_sections_status` (`current_status`),
  KEY `idx_sections_district` (`district`),
  KEY `idx_sections_division` (`division`),
  SPATIAL KEY `spx_sections_geom` (`geom`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

- **Spatial Support:** MySQL 8.0 SRID 4326 (WGS 84) `LINESTRING` allows native spatial functions (`ST_Intersects`, `ST_Distance_Sphere`, `ST_AsGeoJSON`).
- **Estimated Rows:** 50 (West Bengal Divisions: Howrah, Sealdah, Asansol, Kharagpur).

---

### 3.4 Table: `block_requests` (blocks app — core table)

```sql
CREATE TABLE `block_requests` (
  `id` CHAR(36) NOT NULL,
  `block_code` VARCHAR(30) NOT NULL,
  `department_id` CHAR(36) NOT NULL,
  `section_id` CHAR(36) NOT NULL,
  `requester_id` CHAR(36) NOT NULL,
  `from_km` DECIMAL(6,2) NOT NULL,
  `to_km` DECIMAL(6,2) NOT NULL,
  `start_time` DATETIME(6) NOT NULL,
  `end_time` DATETIME(6) NOT NULL,
  `priority` VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
  `work_type` VARCHAR(100) NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  `conflict_with` CHAR(36) NULL,
  `ai_resolution` JSON NULL,
  `approved_by` CHAR(36) NULL,
  `emergency_flag` TINYINT(1) NOT NULL DEFAULT 0,
  `photo_url` VARCHAR(255) NULL,
  `crew_assigned` JSON NULL,
  `materials_used` JSON NULL,
  `completion_photo` VARCHAR(255) NULL,
  `completion_notes` TEXT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_block_requests_code` (`block_code`),
  KEY `idx_blocks_section_time` (`section_id`, `start_time`, `end_time`),
  KEY `idx_blocks_status_priority` (`status`, `priority`),
  KEY `idx_blocks_dept_status` (`department_id`, `status`),
  KEY `idx_blocks_emergency` (`emergency_flag`),
  KEY `idx_blocks_conflict` (`conflict_with`),
  CONSTRAINT `fk_blocks_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`),
  CONSTRAINT `fk_blocks_section` FOREIGN KEY (`section_id`) REFERENCES `sections` (`id`),
  CONSTRAINT `fk_blocks_requester` FOREIGN KEY (`requester_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_blocks_approver` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_blocks_conflict` FOREIGN KEY (`conflict_with`) REFERENCES `block_requests` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

- **Conflict Detection Index:** `idx_blocks_section_time` allows fast range checks (`WHERE section_id = ? AND start_time < ? AND end_time > ?`).
- **Estimated Rows:** 500 (demo), 50,000/year (production).

---

### 3.5 Table: `trains` (trains app)

```sql
CREATE TABLE `trains` (
  `id` CHAR(36) NOT NULL,
  `train_no` VARCHAR(10) NOT NULL,
  `train_name` VARCHAR(100) NOT NULL,
  `route` JSON NOT NULL,
  `current_section_id` CHAR(36) NULL,
  `schedule` JSON NOT NULL,
  `priority` VARCHAR(20) NOT NULL,
  `delay_minutes` INT NOT NULL DEFAULT 0,
  `status` VARCHAR(20) NOT NULL DEFAULT 'ON_TIME',
  `passenger_count` INT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_trains_no` (`train_no`),
  KEY `idx_trains_priority` (`priority`),
  KEY `idx_trains_section` (`current_section_id`),
  KEY `idx_trains_status` (`status`),
  CONSTRAINT `fk_trains_section` FOREIGN KEY (`current_section_id`) REFERENCES `sections` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

- **Estimated Rows:** 30 (demo), 500 (production).

---

### 3.6 Table: `crews` (departments app)

```sql
CREATE TABLE `crews` (
  `id` CHAR(36) NOT NULL,
  `gang_code` VARCHAR(20) NOT NULL,
  `department_id` CHAR(36) NOT NULL,
  `current_section_id` CHAR(36) NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',
  `shift_start` TIME NOT NULL,
  `shift_end` TIME NOT NULL,
  `skills` JSON NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_crews_gang` (`gang_code`),
  KEY `idx_crews_dept_status` (`department_id`, `status`),
  KEY `idx_crews_section` (`current_section_id`),
  CONSTRAINT `fk_crews_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`),
  CONSTRAINT `fk_crews_section` FOREIGN KEY (`current_section_id`) REFERENCES `sections` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 3.7 Table: `materials` (departments app)

```sql
CREATE TABLE `materials` (
  `id` CHAR(36) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `dept_id` CHAR(36) NOT NULL,
  `quantity` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `unit` VARCHAR(20) NOT NULL,
  `location` VARCHAR(100) NOT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_materials_dept` (`dept_id`),
  CONSTRAINT `fk_materials_department` FOREIGN KEY (`dept_id`) REFERENCES `departments` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 3.8 Table: `assets` (assets app)

```sql
CREATE TABLE `assets` (
  `id` CHAR(36) NOT NULL,
  `asset_code` VARCHAR(30) NOT NULL,
  `asset_type` VARCHAR(20) NOT NULL,
  `section_id` CHAR(36) NOT NULL,
  `km_from` DECIMAL(6,2) NULL,
  `km_to` DECIMAL(6,2) NULL,
  `health_score` INT NOT NULL DEFAULT 100,
  `last_inspection` DATETIME(6) NULL,
  `next_due` DATETIME(6) NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'OPERATIONAL',
  `metadata` JSON NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_assets_code` (`asset_code`),
  KEY `idx_assets_section` (`section_id`),
  KEY `idx_assets_health` (`health_score`),
  KEY `idx_assets_due` (`next_due`),
  CONSTRAINT `fk_assets_section` FOREIGN KEY (`section_id`) REFERENCES `sections` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 3.9 Table: `notifications` (notifications app)

```sql
CREATE TABLE `notifications` (
  `id` CHAR(36) NOT NULL,
  `type` VARCHAR(20) NOT NULL,
  `recipient_id` CHAR(36) NOT NULL,
  `block_id` CHAR(36) NULL,
  `message` TEXT NOT NULL,
  `message_bn` TEXT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  `sent_at` DATETIME(6) NULL,
  `error_log` TEXT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_notifications_recipient_status` (`recipient_id`, `status`),
  KEY `idx_notifications_created` (`created_at`),
  CONSTRAINT `fk_notifications_user` FOREIGN KEY (`recipient_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_notifications_block` FOREIGN KEY (`block_id`) REFERENCES `block_requests` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 3.10 Table: `audit_logs` (railway_ai app — cross-cutting)

```sql
CREATE TABLE `audit_logs` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `table_name` VARCHAR(50) NOT NULL,
  `record_id` CHAR(36) NOT NULL,
  `action` VARCHAR(20) NOT NULL,
  `old_data` JSON NULL,
  `new_data` JSON NULL,
  `user_id` CHAR(36) NULL,
  `ip_address` VARCHAR(45) NULL,
  `user_agent` VARCHAR(255) NULL,
  `timestamp` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`, `timestamp`),
  KEY `idx_audit_table_record` (`table_name`, `record_id`),
  KEY `idx_audit_user` (`user_id`),
  KEY `idx_audit_timestamp` (`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
PARTITION BY RANGE (YEAR(timestamp) * 100 + MONTH(timestamp)) (
  PARTITION p202609 VALUES LESS THAN (202610),
  PARTITION p202610 VALUES LESS THAN (202611),
  PARTITION p202611 VALUES LESS THAN (202612),
  PARTITION p_max VALUES LESS THAN MAXVALUE
);
```

---

### 3.11 Table: `ontology_sync` (ontology app)

```sql
CREATE TABLE `ontology_sync` (
  `id` CHAR(36) NOT NULL,
  `entity_type` VARCHAR(50) NOT NULL,
  `entity_id` CHAR(36) NOT NULL,
  `rdf_subject` VARCHAR(255) NOT NULL,
  `rdf_predicate` VARCHAR(255) NOT NULL,
  `rdf_object` TEXT NOT NULL,
  `graph_name` VARCHAR(50) NOT NULL DEFAULT 'default',
  `synced_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `sync_status` VARCHAR(20) NOT NULL DEFAULT 'SYNCED',
  PRIMARY KEY (`id`),
  KEY `idx_onto_entity` (`entity_type`, `entity_id`),
  KEY `idx_onto_subject` (`rdf_subject`),
  KEY `idx_onto_status` (`sync_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 4. Django Database Configuration (MySQL 8.0)

```python
# settings.py
import environ

env = environ.Env()

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': env('DB_NAME', default='railway_ai_db'),
        'USER': env('DB_USER', default='railway_user'),
        'PASSWORD': env('DB_PASSWORD', default='railway_secret_pass'),
        'HOST': env('DB_HOST', default='127.0.0.1'),
        'PORT': env.int('DB_PORT', default=3306),
        'CONN_MAX_AGE': 600,  # 10 minutes persistent connection pool
        'OPTIONS': {
            'charset': 'utf8mb4',
            'init_command': (
                "SET sql_mode='STRICT_TRANS_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO';"
                "SET default_storage_engine=INNODB;"
            ),
            'ssl': {'ca': env('MYSQL_SSL_CA', default=None)} if env('MYSQL_SSL_CA', default=None) else None,
        }
    }
}
```

---

## 5. Migration Strategy

**Tool:** Django built-in migrations (`python manage.py makemigrations`, `migrate`)  
**Naming Convention:** `0001_initial.py`, `0002_add_block_indexes.py`, `0003_add_emergency_flag.py`

**Rules:**
1. Zero raw SQL in schema migrations unless adding MySQL SPATIAL index or partitioning.
2. One app per migration file.
3. Every schema migration must have a backward-compatible reverse path.
4. Data migrations separate from schema migrations.

**Rollback:**
```bash
# Rollback specific app
python manage.py migrate blocks 0004

# Full rollback of app (emergency)
python manage.py migrate blocks zero
```

**CI/CD Pipeline Order:**
1. Perform automated `mysqldump` snapshot.
2. `python manage.py migrate --check` (dry run).
3. `python manage.py migrate --no-input`.
4. Verify via `/api/v1/health/ready/`.

---

## 6. Caching Strategy (Redis 7)

### 6.1 Cache Key Patterns

| Purpose | Key Pattern | TTL | Invalidation Trigger |
|---------|-------------|-----|----------------------|
| **User Session** | `session:{jwt_token_hash}` | 60 min | Logout, token refresh |
| **Block Pending List** | `cache:blocks:pending:{dept_code}` | 30s | Block created / approved / rejected |
| **Block Detail** | `cache:block:{block_id}` | 5 min | Block updated |
| **Section Status** | `cache:section:{section_id}:status` | 1 min | Block status change |
| **Section List** | `cache:sections:all` | 10 min | Section metadata updated |
| **Train Schedule** | `cache:train:{train_no}:schedule` | 10 min | Train delay / schedule update |
| **Crew Availability** | `cache:crews:available:{dept_id}` | 5 min | Crew shift / status change |
| **Notification Unread** | `cache:notifications:unread:{user_id}` | 2 min | Notification sent / read |
| **Rate Limit Counter** | `ratelimit:{endpoint}:{ip}:{user_id}` | 1 min | Automatic Redis TTL expiration |
| **JWT Blacklist** | `blacklist:{refresh_token_jti}` | 7 days | Explicit user logout |
| **WebSocket Group** | `ws:group:{dept_code}` | Session | Client disconnect |
| **Conflict Buffer** | `conflict:active:{block_id}` | Until resolved | Resolution accepted |
| **SPARQL Reasoning** | `cache:sparql:{query_hash}` | 10 min | Ontology sync event |

### 6.2 Invalidation Workflow

```
Block Approved by COA:
  │
  ├──► UPDATE block_requests SET status = 'APPROVED' (MySQL)
  ├──► UPDATE sections SET current_status = 'BLOCKED' (MySQL)
  ├──► Redis Invalidation:
  │      DEL cache:block:{id}
  │      DEL cache:blocks:pending:ENG
  │      DEL cache:blocks:pending:COA
  │      DEL cache:section:HWH-KGP:status
  └──► Celery Async Tasks:
         PUBLISH ws:group:COA {"type": "block_update", "id": "..."}
         PUBLISH ws:group:section:HWH-KGP {"type": "section_status_change", ...}
```

---

## 7. Semantic Quadstore (Owlready2)

- **File Path:** `ontology/railway_digital_twin.owl` + embedded SQLite quadstore cache.
- **Data Model:** OWL 2 DL ontology linking `Section`, `TrackAsset`, `TrainSchedule`, `Department`, and `BlockEvent`.
- **Synchronization:** MySQL mutations publish to Celery `ontology` queue → `DigitalTwinManager` updates triples and writes back to disk.

---

## 8. Backup & Disaster Recovery

| Aspect | Strategy | RPO | RTO |
|--------|----------|-----|-----|
| **MySQL 8.0** | Automated daily snapshot + continuous binary logging (binlog) for Point-In-Time Recovery | 5 minutes | 15 minutes |
| **Redis 7** | Cache only (Ephemeral). Sessions re-authenticated via refresh token | N/A | N/A |
| **Ontology File** | Git version control + hourly volume snapshot | 1 hour | 10 minutes |
| **Media (Photos)** | Mounted Docker persistent volume + scheduled tarball backup | 24 hours | 30 minutes |

---

## 9. Next File Dependency Note

> পরবর্তী ফাইল: `01-tech-infra/03-event-brokers.md`

`02-data-layer.md` থেকে `03-event-brokers.md`-এ নেওয়া হবে:

| Data Layer Element | Event Broker Impact |
|-------------------|---------------------|
| `audit_logs` table | `block.created`, `block.approved`, `block.completed` events → Celery async audit insertions |
| `block_requests` status changes | Event topic: `block.status_changed` with payload `{block_id, old_status, new_status, timestamp}` |
| `sections.current_status` | `section.status_changed` event → WebSocket broadcast to map clients |
| `notifications` table | `notification.sent` event → DLQ handling for failed SMS |
| `ontology_sync` table | `ontology.sync_requested` event → Celery `ontology` queue for SPARQL updates |
| Redis `ws:group:*` keys | Channels layer group routing: `dept:ENG`, `dept:COA`, `section:HWH-KGP` |
| Redis `conflict:active:*` | ConflictEngine publishes detected overlap events to `events:conflict` |
| MySQL `users.role` | Consumer group authorization and recipient routing |

`03-event-brokers.md`-এ নিচের বিষয়গুলো থাকবে:
- Redis Pub/Sub channel topology
- Django Channels channel layer configuration
- Event topic catalog with JSON message schemas
- Dead letter queue (DLQ) strategy for failed external notifications
- Celery task routing by queue (`high`, `notify`, `ontology`, `low`, `default`)
- Idempotency key generation and deduplication logic
