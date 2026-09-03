# 02-glossary.md

> **File Order:** 3/45  
> **Previous File:** `00-master-high-level/01-decision-log.md` (Definition of terms used in decisions)  
> **Next File:** `01-tech-infra/00-backend-core.md`  
> **Connection:** Terms defined in this file (`ASGI`, `WSGI`, `Middleware`, `JWT`, `RBAC`, `Idempotency`, `Circuit Breaker`, `Bounded Context`, etc.) will be directly used in `00-backend-core.md` without further explanation.

---

## 1. Glossary

| # | Term | Definition | Context | Type |
|---|------|-----------|---------|------|
| 1 | **ACID** | Atomicity, Consistency, Isolation, Durability — Four database transaction properties that ensure data integrity. | PostgreSQL transaction design | Database |
| 2 | **API** | Application Programming Interface — A contract of communication between two systems. The medium for Frontend ↔ Backend communication. | System integration | General |
| 3 | **ASGI** | Asynchronous Server Gateway Interface — The foundation of Django Channels; handles WebSocket and async HTTP. | Real-time communication | Backend |
| 4 | **Block** | Railway maintenance window — A scheduled time when a track section is closed for maintenance work. | Core domain | Railway |
| 5 | **Block Event** | `BlockEvent` class in Ontology — Represents a specific maintenance block in the semantic graph. | Digital Twin | Ontology |
| 6 | **Bounded Context** | Domain-Driven Design (DDD) pattern — Each module has its own domain model, database schema, and business logic. | Modular Monolith | Architecture |
| 7 | **Celery** | Distributed task queue — Handles sending SMS, generating PDF reports, and bulk notifications in the background. | Async processing | Backend |
| 8 | **Circuit Breaker** | Fault tolerance pattern — Fails fast and triggers fallback behavior when an external service is down. | External API calls | Architecture |
| 9 | **COA** | Control Office Administrator — The highest authority role; can approve/reject blocks from all departments and execute emergency overrides. | User roles | Railway |
| 10 | **Conflict Detection** | The engine that identifies conflicts between two block requests by checking for time and section overlaps. | Core feature | Business |
| 11 | **CORS** | Cross-Origin Resource Sharing — A browser security mechanism that controls API calls from different origins. | Frontend-Backend connection | Security |
| 12 | **Crew** | Maintenance gang — A team of engineers/trackmen deployed for specific work (ENG/TRD/SNT). | Resource planning | Railway |
| 13 | **CRUD** | Create, Read, Update, Delete — The four fundamental operations for data management. | API design | General |
| 14 | **CTE** | Common Table Expression — Allows writing complex recursive queries using the SQL `WITH` clause. | PostgreSQL queries | Database |
| 15 | **Digital Twin** | Virtual replica of the physical railway network — representing tracks, signals, stations, and trains in software. | 3D/2D visualization | AI/IoT |
| 16 | **Django** | High-level Python web framework — Provides a built-in admin panel, ORM, authentication, and security features. | Backend framework | Backend |
| 17 | **DRF** | Django REST Framework — A toolkit for building RESTful APIs on top of Django; provides serialization, authentication, and viewsets. | API layer | Backend |
| 18 | **E2E** | End-to-End Testing — Testing methodology that covers the entire user journey (login → create block → approve → notification). | QA strategy | Testing |
| 19 | **ENG** | Engineering Department — Maintains tracks, bridges, ballast, and sleepers; utilizes TMS (Track Management System). | User department | Railway |
| 20 | **Fast Track Clearance** | Mechanism to auto-shorten or reschedule blocks for high-priority trains (like Rajdhani/Shatabdi). | Traffic management | Business |
| 21 | **GIS** | Geographic Information System — Stores and visualizes the spatial mapping, station locations, and track geometry of the railway network. | Map visualization | Technical |
| 22 | **GPS** | Global Positioning System — Used to track the real-time location of trains (simulated in demo). | Train tracking | Technical |
| 23 | **HMR** | Hot Module Replacement — A Vite feature; provides instant updates on code changes without a full page reload. | Development experience | Frontend |
| 24 | **HermiT** | OWL 2 DL reasoner — Performs ontology consistency checks, class inferences, and property chain reasoning. | Ontology reasoning | AI |
| 25 | **Idempotency** | Property where making the same request multiple times produces the same result (e.g., clicking approve block twice only approves it once). | API reliability | Architecture |
| 26 | **Impact Score** | Numeric metric — Calculates how many passengers are affected, the duration of delays, and the financial loss caused by a block. | Analytics | Business |
| 27 | **IoT** | Internet of Things — Track vibration, temperature, and current sensor networks (for future predictive maintenance). | Predictive maintenance | Hardware |
| 28 | **JWT** | JSON Web Token — A compact, URL-safe token carrying user authentication claims (access + refresh token pair). | Authentication | Security |
| 29 | **KM** | Kilometer marker — Unit of measuring distance on a railway section (e.g., KM 15-20 on the HWH-KGP line). | Section marking | Railway |
| 30 | **Load Balancer** | Distributes incoming traffic across multiple server instances to increase scalability and availability. | Deployment | Infrastructure |
| 31 | **Mapbox** | Cloud-based mapping platform — Provides vector tiles, 3D buildings, dark themes, and custom layer support. | Frontend map | Frontend |
| 32 | **Microservices** | Architecture style where an application is built as a collection of loosely coupled, independently deployable services. | Future architecture | Architecture |
| 33 | **Modular Monolith** | Single deployable unit (monolith) containing internal modules (Django apps) that follow their own bounded context. | Current architecture | Architecture |
| 34 | **MVCC** | Multi-Version Concurrency Control — PostgreSQL mechanism that reduces conflict during concurrent read/write operations. | Database internals | Database |
| 35 | **Neo4j** | Graph database — Uses Cypher query language; a reserved option for scaling the ontology in the future. | Future scale | Database |
| 36 | **NTES** | National Train Enquiry System — Source of train status, schedule, and delay information for Indian Railways. | External data | Railway |
| 37 | **OHE** | Overhead Equipment — Traction power lines (25kV) maintained by the TRD department. | Traction asset | Railway |
| 38 | **Ontology** | Formal knowledge representation — A collection of concepts (classes), relationships (properties), and constraints. | Semantic layer | AI |
| 39 | **OWL** | Web Ontology Language — W3C standard for defining rich, machine-interpretable semantic schemas. | Digital Twin | Ontology |
| 40 | **Owlready2** | Python library — Loads, modifies, reasons, and executes SPARQL queries on OWL 2 ontologies. | Semantic engine | Backend |
| 41 | **Owlready2 Quadstore** | SQLite-based RDF storage — The default triple/quad persistence mechanism for Owlready2. | Ontology storage | Backend |
| 42 | **Passenger Impact** | The effect of block scheduling on passengers — calculations for late arrivals, missed connections, crowding, etc. | Impact analysis | Business |
| 43 | **PostgreSQL** | Open-source relational database — The primary DB, featuring advanced SQL, GIS (PostGIS), and JSONB support. | Primary database | Database |
| 44 | **PostGIS** | Spatial extension for PostgreSQL — Provides geometry/geography data types and spatial queries (e.g., nearest station). | GIS queries | Database |
| 45 | **Priority Queue** | Data structure (heap) — Serves the highest priority elements (Critical > High > Medium > Low) first. | Block scheduling | Algorithm |
| 46 | **Quadstore** | Database engine optimized for storing and querying RDF quads (subject-predicate-object-graph). | RDF storage | Database |
| 47 | **RabbitMQ** | Message broker — Implements AMQP protocol; considered but rejected as an alternative. | Message queue | Infrastructure |
| 48 | **RDF** | Resource Description Framework — Standard model for data interchange on the web; triple-based graph representation. | Semantic web | Ontology |
| 49 | **React** | JavaScript library — Builds interactive user interfaces using a component-based architecture. | Frontend framework | Frontend |
| 50 | **Redis** | In-memory data structure store — Used as a cache, session store, message broker, and Django Channels layer. | Cache/Queue | Infrastructure |
| 51 | **Reinforcement Learning** | ML paradigm — An agent learns the optimal action sequence by receiving rewards from its environment (future scope). | AI optimization | AI |
| 52 | **RBAC** | Role-Based Access Control — Security model for assigning permissions based on user roles (ENG/TRD/SNT/COA). | Authorization | Security |
| 53 | **Rolling Block** | Chain scheduling — Starting a block in the next section as soon as the block in the current section finishes. | Maintenance strategy | Railway |
| 54 | **RTX** | NVIDIA GPU series — Hardware acceleration for local LLM (e.g., Llama, Phi) inference (future scope). | Local AI | Hardware |
| 55 | **SAGA Pattern** | Distributed transaction pattern — A sequence of local transactions where compensating actions occur if one fails. | Data consistency | Architecture |
| 56 | **Section** | Railway corridor segment — The track portion between two stations (e.g., Howrah-Kharagpur, Bardhaman-Asansol). | Network topology | Railway |
| 57 | **Semantic Digital Twin** | Digital Twin + semantic meaning — Encoding logical relationships between assets for AI-reasoning. | Core innovation | AI |
| 58 | **SHACL** | Shapes Constraint Language — W3C standard for validating an RDF graph against a set of shapes/constraints. | Data validation | Ontology |
| 59 | **Signal & Telecom** | SNT Department — Maintains signals, point machines, track circuits, and telecom equipment; utilizes SMMS. | User department | Railway |
| 60 | **SIL-4** | Safety Integrity Level 4 — The highest safety certification for railway control systems; required for actual train control. | Safety standard | Railway |
| 61 | **SMMS** | Signal Maintenance Management System — Legacy data source for the SNT department (mock data in demo). | Legacy system | Railway |
| 62 | **SPARQL** | SPARQL Protocol and RDF Query Language — SQL-like language for querying RDF graphs. | Ontology query | Ontology |
| 63 | **SQL** | Structured Query Language — Standard language for managing relational databases. | Database queries | Database |
| 64 | **SQLite** | Embedded SQL database engine — Serverless, zero-config; used as the backend for Owlready2 quadstore. | Embedded storage | Database |
| 65 | **SSR** | Server-Side Rendering — Generating HTML on the server and sending it to the client; used for SEO and first load. | Rendering strategy | Frontend |
| 66 | **STRIDE** | Threat modeling framework — Spoofing, Tampering, Repudiation, Information Disclosure, DoS, Elevation of Privilege. | Security analysis | Security |
| 67 | **Traction Distribution** | TRD Department — Maintains overhead wires (OHE), substations, and power supplies; utilizes TDMS. | User department | Railway |
| 68 | **TMS** | Track Management System — Legacy data source for the Engineering department (mock data in demo). | Legacy system | Railway |
| 69 | **Train Entity** | `TrainEntity` class in Ontology — Represents a train's schedule, route, priority, and current position. | Digital Twin | Ontology |
| 70 | **Twilio** | Cloud communications platform — Provides SMS, voice, and WhatsApp APIs; used for crew notifications. | External service | Integration |
| 71 | **Vite** | Next-generation frontend build tool — Provides native ES modules and extremely fast HMR. | Build tool | Frontend |
| 72 | **WSGI** | Web Server Gateway Interface — Django's traditional synchronous interface; served via Gunicorn WSGI server. | HTTP serving | Backend |
| 73 | **Zustand** | Small, fast state management library — Used for handling global client state in React. | State management | Frontend |

---

## 2. Abbreviation Quick Reference

| Short | Full Form | Used In |
|-------|-----------|---------|
| API | Application Programming Interface | General |
| ASGI | Asynchronous Server Gateway Interface | Backend |
| BDMS | Block Data Management System | Railway |
| COA | Control Office Administrator | Railway |
| CORS | Cross-Origin Resource Sharing | Security |
| CRUD | Create, Read, Update, Delete | API |
| CTE | Common Table Expression | Database |
| DRF | Django REST Framework | Backend |
| E2E | End-to-End | Testing |
| ENG | Engineering Department | Railway |
| GIS | Geographic Information System | Map |
| GPS | Global Positioning System | Tracking |
| HMR | Hot Module Replacement | Frontend |
| IoT | Internet of Things | Hardware |
| JWT | JSON Web Token | Security |
| KM | Kilometer | Railway |
| OHE | Overhead Equipment | Railway |
| OWL | Web Ontology Language | Ontology |
| RBAC | Role-Based Access Control | Security |
| RDF | Resource Description Framework | Ontology |
| RTX | Ray Tracing Texel eXtreme | Hardware |
| SAGA | Long-running transaction pattern | Architecture |
| SHACL | Shapes Constraint Language | Ontology |
| SIL | Safety Integrity Level | Railway |
| SMMS | Signal Maintenance Management System | Railway |
| SMS | Short Message Service | Notification |
| SPARQL | SPARQL Protocol and RDF Query Language | Ontology |
| SQL | Structured Query Language | Database |
| SNT | Signal & Telecom Department | Railway |
| SSR | Server-Side Rendering | Frontend |
| STRIDE | Spoofing, Tampering, Repudiation, Information Disclosure, DoS, Elevation | Security |
| TDMS | Traction Distribution Management System | Railway |
| TMS | Track Management System | Railway |
| TRD | Traction Distribution Department | Railway |
| UI | User Interface | Frontend |
| URL | Uniform Resource Locator | General |
| UX | User Experience | Frontend |
| WSGI | Web Server Gateway Interface | Backend |
| XML | eXtensible Markup Language | Data |
