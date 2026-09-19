# ADR-0002: Standardization on MySQL 8.0 as Primary Relational Store

> **Status:** Accepted (Mandatory Constraint Override)  
> **Date:** 2026-09-02  
> **Deciders:** Principal Database Architect, Technical Lead  
> **Scope:** Data Layer & Spatial Infrastructure (All Domains)

---

## 1. Context & Problem Statement

The Indian Railways platform requires a rock-solid, enterprise-grade relational database capable of handling:
1. Strict ACID transactional semantics for financial, safety, and block possession approvals.
2. Native geospatial geometry indexing (`LINESTRING`) for track corridors spanning hundreds of kilometers.
3. Native JSON document support for flexible telemetry and OWL semantic reasoning graph metadata.
4. Compliance with Indian Railways institutional standards and existing production database topologies (CRIS / IR infrastructure).

While earlier architectural drafts mentioned PostgreSQL/PostGIS, client and institutional operational constraints mandate the use of **MySQL 8.0** across all staging and production environments.

---

## 2. Decision

Standardize on **MySQL 8.0 (InnoDB engine)** as the sole authoritative persistence store for the entire platform.

Key technical specifications enforced:
- **Default Engine:** `InnoDB` with row-level locking and multi-version concurrency control (MVCC).
- **Character Encoding:** `utf8mb4` with collation `utf8mb4_unicode_ci`.
- **Primary Keys:** Standardized `CHAR(36)` containing UUIDv4 identifiers.
- **Geospatial Processing:** Utilize MySQL 8.0 native Spatial Data Types (`LINESTRING /*!80003 SRID 4326 */`) and R-tree spatial indexing (`SPATIAL KEY`) with native spatial functions (`ST_Intersects`, `ST_Buffer`, `ST_LineSubstring`).
- **Partitioning:** Monthly range partitioning on `audit_logs` based on the `created_at` timestamp.

---

## 3. Consequences

### Positive Consequences
- **Institutional Alignment:** Direct alignment with Indian Railways IT procurement standards and CRIS relational database management profiles.
- **Robust Spatial Engine:** MySQL 8.0 provides full OGC-compliant spatial geometry with SRID enforcement and spatial indexing on InnoDB tables.
- **Simplified Operational Skillset:** Universal DBA familiarity, standard MySQL replication tooling, and mature backup management via Percona XtraBackup.

### Negative Consequences & Mitigation
- **Spatial Functional Breadth vs PostGIS:** PostGIS possesses certain advanced analytical functions (e.g. `ST_Split` or advanced 3D linear referencing) not present natively in MySQL 8.0.  
  *Mitigation:* Custom Python mathematical helpers in `apps.blocks.core` complement MySQL spatial queries for domain-specific corridor slicing.
- **UUID Primary Key Index Overhead:** Random UUIDv4 insertion into InnoDB clustered index B+ trees can cause page splits.  
  *Mitigation:* Use sequential time-ordered UUIDv7 generators for high-insert tables (`audit_logs`, `asset_telemetry_readings`).

---

## 4. Alternatives Considered & Rejection Rationale

- **PostgreSQL 16 + PostGIS:** Technically superior for advanced spatial topology, but explicitly rejected to adhere to user requirements and institutional deployment constraints requiring MySQL 8.0.
- **MongoDB / NoSQL:** Rejected because schemaless document stores fail to provide deterministic multi-table ACID transaction boundaries required for railway safety block allocations.
