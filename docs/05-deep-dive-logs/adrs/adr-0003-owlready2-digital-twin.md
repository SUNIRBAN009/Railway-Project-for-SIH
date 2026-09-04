# ADR-0003: Owlready2 & HermiT Semantic Reasoner for Infrastructure Digital Twin

> **Status:** Accepted  
> **Date:** 2026-09-02  
> **Deciders:** Lead AI Architect, Safety Systems Specialist, Lead Backend Engineer  
> **Scope:** Semantic Validation & Digital Twin Domain (`SVC-ONTO`)

---

## 1. Context & Problem Statement

Railway physical and electrical infrastructure exhibits complex interdependencies:
- OHE traction feeding zones span across multiple physical block sections.
- Signaling route locking and points detectors impose cross-corridor flank protection constraints.
- A routine civil engineering track block that requires de-energizing an overhead catenary section may unintentionally strand an electric passenger train (such as an incoming Rajdhani or Vande Bharat) idling in an adjacent block that draws power from the same traction substation feeder.

Traditional relational database queries or basic IF-THEN rules cannot practically model, infer, and explain these dynamic transitive relationships without exponential combinatorial rule explosion.

---

## 2. Decision

We will implement an **OWL 2 DL Semantic Digital Twin** using **Owlready2** and the **HermiT Reasoner** running within dedicated asynchronous Celery workers.

- **Ontology Representation:** The track network topology, traction substations, signals, and dynamic possession proposals are modeled in OWL 2 DL (`digital_twin/railway_ontology.owl`).
- **Python-OWL Integration:** `Owlready2` provides native Python object-oriented access to OWL classes, object properties, and SWRL rules.
- **Tableau Reasoning Engine:** The HermiT 1.4.3 reasoner executes formal Description Logic classification to infer latent conflicts and verify ontology consistency.
- **Worker Segregation:** Because HermiT relies on a Java 17 JVM runtime and exhibits variable execution times (200ms to 2000ms), all reasoning jobs run asynchronously in an isolated Celery worker (`worker-ontology`) consuming exclusively from the `ontology` task queue.

---

## 3. Consequences

### Positive Consequences
- **Explainable Safety Proofs:** Unlike black-box ML models, Description Logic reasoning produces verifiable, deterministic proof chains explaining *why* a block proposal is dangerous (e.g., "Block A cuts power to Feeder 3, which electrifies Track B, currently occupied by Train 12424").
- **Declarative Rule Authoring:** Railway safety engineers can define new axioms in Protégé / OWL without modifying core application source code.
- **Zero Web Server Block:** Running reasoners asynchronously prevents web server thread pool exhaustion.

### Negative Consequences & Mitigation
- **JVM Memory Footprint:** The HermiT Java process requires 2GB to 4GB of RAM during peak tableau expansion.  
  *Mitigation:* Dedicated Docker container limits (`mem_limit: 4g`), isolated task queue, and periodic worker recycling (`--max-tasks-per-child=50`).
- **Data Synchronization:** Maintaining synchronization between relational MySQL tables and the in-memory OWL graph requires careful state hydration.  
  *Mitigation:* The ontology worker constructs ephemeral sub-graphs for specific block corridors on-demand rather than reasoning over the entire Indian Railways network at once.

---

## 4. Alternatives Considered & Rejection Rationale

- **Neo4j Property Graph with Cypher Queries:** Excellent for pathfinding, but lacks native Description Logic reasoning, automatic classification, and formal mathematical consistency verification.
- **Hardcoded Procedural Rules in Python:** Prone to human error, impossible to formally prove safe, and maintenance becomes unmanageable as infrastructure complexity grows.
