# 06-adrs-registry.md

> **File Order:** 32/45  
> **Previous File:** `05-deep-dive-logs/05-contracts-registry.md`  
> **Next File:** `06-testing-qa/00-test-plan.md`  

---

## Architecture Decision Records (ADRs)

An ADR captures a single, important architecture decision along with its context and consequences. We log these to prevent circular debates in the future.

---

### ADR 001: Modular Monolith vs Microservices

**Date:** 2026-09-02  
**Status:** Accepted  

**Context:** The hackathon requires building a complex system with 8 distinct domains. We debated whether to start with 8 separate Docker containers (Microservices) or 1 large Django app (Monolith).  
**Decision:** We will build a **Modular Monolith** using Django. The 8 domains will be separate Django Apps in the same repository, sharing a single PostgreSQL database, but they MUST communicate via internal API boundaries or Django Signals.  
**Consequences:** 
- (+) Massively reduces DevOps overhead for a 36-hour hackathon.
- (+) Simplifies cross-domain database transactions.
- (-) Enforcing the boundaries requires strict developer discipline. We cannot use direct SQL joins across domains easily.

---

### ADR 002: SQLite Quadstore for Ontology

**Date:** 2026-09-02  
**Status:** Accepted  

**Context:** We need a semantic RDF graph to run HermiT reasoning. Enterprise tools like Neo4j or Apache Jena are heavy and require extensive configuration.  
**Decision:** We will use `Owlready2` powered by a local SQLite quadstore file (`ontology.sqlite3`).  
**Consequences:** 
- (+) Zero infrastructure setup. It runs locally within the Python process.
- (+) Extremely fast for small/medium graphs.
- (-) It is not horizontally scalable. Only one Celery worker can write to the SQLite file at a time due to file locks. (This is acceptable for the MVP as graph updates happen asynchronously via queues).

---

### ADR 003: Gemini API vs Local Phi-3

**Date:** 2026-09-02  
**Status:** Accepted  

**Context:** We need an LLM to resolve block conflicts and translate Bengali text. We want it to be reliable but also show off advanced tech.  
**Decision:** We will use the **Google Gemini API** as the primary resolution engine. We will write the architecture to theoretically support a local `Phi-3-mini` fallback, but we will not implement the local fallback for the MVP to save time.  
**Consequences:** 
- (+) Gemini handles multi-lingual translation (Bengali/Hindi) natively and highly accurately.
- (+) Offloads heavy computation from our Railway deployment servers.
- (-) We are subject to API rate limits, requiring us to wrap the calls in Celery tasks to prevent hanging HTTP requests.
