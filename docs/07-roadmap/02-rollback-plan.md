# 02-rollback-plan.md

> **File Sequence:** 45/45 (Roadmap Track)  
> **Previous Document:** [07-roadmap/01-milestones.md](01-milestones.md)  
> **Next Document:** [08-standards/00-coding-standards.md](../08-standards/00-coding-standards.md)  
> **Context:** Comprehensive Disaster Recovery, Rollback Triggers, Database Schema Reversal, and Emergency Failover Procedures.

---

# System Rollback, Disaster Recovery & Failover Plan

---

## 1. Automated & Manual Rollback Triggers

An immediate deployment rollback is mandated if any of the following telemetry thresholds are breached within 15 minutes of release:

| Trigger Condition | Metric / Source | Severity | Action |
|---|---|:---:|---|
| **API Error Rate Spike** | `http_requests_total{status=~"5.."}` > 1.0% | P1 | Immediate automated container rollback to prior image tag |
| **Latency Degradation** | `http_request_duration_seconds{p95}` > 500ms | P2 | Revert traffic routing to stable blue container deployment |
| **Conflict Sweep Failure** | Celery task exception rate on queue `high` > 2% | P1 | Rollback `apps.blocks` release and restart worker pool |
| **Database Lock Contention** | `Innodb_row_lock_current_waits` > 25 for > 60s | P1 | Abort pending migrations and kill blocking transactions |
| **Data Corruption Detection** | Any block sanctioned without passing conflict sweep | P0 (Critical) | Emergency traffic cutover; trigger offline audit |

---

## 2. Blue-Green Container Rollback Procedure

When deploying to production or staging using Docker / Cloud deployment:

```bash
# 1. Detect failure and initiate traffic reroute at Nginx / Traefik reverse proxy
docker exec -it railway-reverse-proxy nginx -s reload -c /etc/nginx/nginx.blue.conf

# 2. Terminate newly deployed Green containers
docker compose stop web-green worker-green daphne-green

# 3. Verify stable Blue cluster health
curl -f http://localhost:8000/api/v1/blocks/health/readiness/

# 4. Notify incident response team over Slack / Webhook
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"ALERT: Deployment rolled back to previous stable image tag."}' \
  $OPS_SLACK_WEBHOOK_URL
```

---

## 3. Database Schema Rollback Strategy (Expand-and-Contract Pattern)

To avoid destructive database rollbacks that destroy in-flight data, all database schema evolutions follow the **Expand-and-Contract Pattern**:
1. **Never drop columns or change types in a single migration.**
2. **Phase 1 (Expand):** Add new nullable column or table. Application writes to both old and new columns.
3. **Phase 2 (Migrate):** Backfill data asynchronously via Celery task.
4. **Phase 3 (Contract):** Update application to read exclusively from new column; drop old column in a subsequent release.

### Reversing a Faulty Django Migration
```bash
# Identify target migration number to revert to
python manage.py showmigrations blocks

# Rollback specific app migration safely
python manage.py migrate blocks 0003_previous_stable_state

# Verify table schema integrity in MySQL 8.0
mysql -u root -p railway_db -e "SHOW CREATE TABLE blocks\G"
```

---

## 4. Disaster Recovery (DR) & Backup Restoration

- **Recovery Point Objective (RPO):** < 5 minutes (via MySQL binary logs streaming to standby storage).
- **Recovery Time Objective (RTO):** < 15 minutes (automated script spins up replica container).
- **Restoration Runbook:**
  ```bash
  # Restore latest nightly physical backup
  xtrabackup --prepare --target-dir=/var/backups/mysql/latest/
  xtrabackup --copy-back --target-dir=/var/backups/mysql/latest/
  
  # Apply incremental binary logs to point-of-failure
  mysqlbinlog /var/log/mysql/binlog.000124 | mysql -u root -p railway_db
  ```
