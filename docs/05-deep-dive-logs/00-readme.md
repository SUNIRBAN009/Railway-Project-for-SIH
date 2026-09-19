# 00-readme.md

> **File Sequence:** 34/45  
> **Directory:** `05-deep-dive-logs/`  
> **Previous Document:** [04-function-maps/08-notifications-function-map.md](../04-function-maps/08-notifications-function-map.md)  
> **Next Document:** [05-deep-dive-logs/01-common-payloads-and-algorithms.md](01-common-payloads-and-algorithms.md)  
> **Context:** Architectural index, engineering rationale, and index of technical deep-dive documents, formal API contracts, ADRs, and operational incident logs.

---

# Technical Deep-Dive Logs & Formal System Contracts

## 1. Directory Mission & Scope

This directory contains foundational technical specifications that govern cross-cutting concerns across all 8 microservices and bounded contexts of the Indian Railways AI Block Planning Platform (PS 26027).

Unlike high-level architecture overviews, the documents in this folder provide concrete mathematical definitions, exact algorithmic pseudocode, strict OpenAPI 3.0 request/response schemas, an authoritative 25+ global error registry, and production incident response runbooks.

---

## 2. Directory Layout & Document Index

```
📁 05-deep-dive-logs/
    ├── 00-readme.md                           # This navigational guide & architectural index
    ├── 01-common-payloads-and-algorithms.md   # Shared DTOs, Sweep-line algorithm, Spatial GIS math
    ├── 02-error-code-registry.md              # 25+ Railway-specific error codes, HTTP mappings & handling
    ├── 03-state-management.md                 # Frontend TanStack Query, Daphne WS invalidation & optimistic UI
    ├── 04-bug-log-template.md                 # Enterprise SEV-1 to SEV-4 incident report & RCA runbook
    ├── 📁 contracts/                          # Formal REST OpenAPI 3.0 & Data Contracts
    │   ├── 01-blocks-contracts.md             # Block planning, corridor allocation & conflict endpoints
    │   ├── 02-trains-contracts.md             # Timetable, delay simulation & running status contracts
    │   └── 03-ontology-contracts.md           # Digital twin OWL exchange & DL reasoning contracts
    └── 📁 adrs/                               # Architectural Decision Records (ADRs)
        ├── adr-0001-modular-monolith.md       # ADR-1: Modular Monolith vs Distributed Microservices
        ├── adr-0002-mysql-database.md         # ADR-2: MySQL 8.0 InnoDB with Spatial GIS Engine
        └── adr-0003-owlready2-digital-twin.md # ADR-3: Owlready2 & HermiT Reasoner in Async Workers
```

---

## 3. Guiding Architectural Principles

1. **Zero Ambiguity:** Every payload must have explicit types, constraints, and validation rules.
2. **Mathematical Rigor:** Algorithms (Sweep-line, Spatial buffering, Delay cascades) must include complexity analysis ($O$-notation).
3. **Fault Tolerance:** Every failure mode must map to a standardized error code with a well-defined recovery procedure.
