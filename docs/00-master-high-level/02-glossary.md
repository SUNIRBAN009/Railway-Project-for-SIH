# 02-glossary.md

> **ফাইল ক্রম:** ৩/৪৫  
> **পূর্ববর্তী ফাইল:** `00-master-high-level/01-decision-log.md` (সিদ্ধান্তে ব্যবহৃত টার্মসমূহের সংজ্ঞা)  
> **পরবর্তী ফাইল:** `01-tech-infra/00-backend-core.md`  
> **সংযোগ:** এই ফাইলে সংজ্ঞায়িত টার্মগুলো (`ASGI`, `WSGI`, `Middleware`, `JWT`, `RBAC`, `Idempotency`, `Circuit Breaker`, `Bounded Context`, ইত্যাদি) `00-backend-core.md`-এ আর পুনরায় ব্যাখ্যা না করে সরাসরি ব্যবহার করা হবে।

---

## 1. Glossary

| # | Term | Definition | Context | Type |
|---|------|-----------|---------|------|
| 1 | **ACID** | Atomicity, Consistency, Isolation, Durability — চারটি ডাটাবেজ ট্রানজ্যাকশন প্রপার্টি যা data integrity নিশ্চিত করে। | MySQL transaction design | Database |
| 2 | **API** | Application Programming Interface — দুইটা সিস্টেমের মধ্যে যোগাযোগের চুক্তি (contract)। Frontend ↔ Backend communication-এর মাধ্যম। | System integration | General |
| 3 | **ASGI** | Asynchronous Server Gateway Interface — Django Channels-এর ফাউন্ডেশন; WebSocket এবং async HTTP handle করে। | Real-time communication | Backend |
| 4 | **Block** | Railway maintenance window — নির্দিষ্ট সময়ে একটি track section বন্ধ (closed) রেখে মেরামতির সুযোগ। | Core domain | Railway |
| 5 | **Block Event** | Ontology-তে `BlockEvent` ক্লাস — একটি নির্দিষ্ট maintenance block-কে semantic graph-এ represent করে। | Digital Twin | Ontology |
| 6 | **Bounded Context** | Domain-Driven Design (DDD) প্যাটার্ন — প্রতিটি module-এর নিজস্ব domain model, database schema, এবং business logic থাকা। | Modular Monolith | Architecture |
| 7 | **Celery** | Distributed task queue — background-এ SMS পাঠানো, PDF report generate, bulk notification handle করে। | Async processing | Backend |
| 8 | **Circuit Breaker** | Fault tolerance pattern — external service down থাকলে fast fail করে fallback behavior trigger করে। | External API calls | Architecture |
| 9 | **COA** | Control Office Administrator — সর্বোচ্চ authority role; সব department-এর block approve/reject এবং emergency override করতে পারে। | User roles | Railway |
| 10 | **Conflict Detection** | Engine যা সময় ও সেকশন overlap চেক করে দুইটা block request-এর মধ্যে conflict সনাক্ত করে। | Core feature | Business |
| 11 | **CORS** | Cross-Origin Resource Sharing — browser security mechanism যা ভিন্ন origin-এর API call control করে। | Frontend-Backend connection | Security |
| 12 | **Crew** | Maintenance gang — নির্দিষ্ট কাজের জন্য নিয়োজিত ইঞ্জিনিয়ার/ট্র্যাকম্যানের দল (ENG/TRD/SNT)। | Resource planning | Railway |
| 13 | **CRUD** | Create, Read, Update, Delete — ডেটার চারটি মৌলিক অপারেশন। | API design | General |
| 14 | **CTE** | Common Table Expression — SQL-এর `WITH` ক্লজ ব্যবহার করে complex recursive query লেখার সুবিধা। | MySQL queries | Database |
| 15 | **Digital Twin** | Physical railway network-এর virtual replica — track, signal, station, train সব software-এ represent করা। | 3D/2D visualization | AI/IoT |
| 16 | **Django** | High-level Python web framework — built-in admin panel, ORM, authentication, এবং security features সহ। | Backend framework | Backend |
| 17 | **DRF** | Django REST Framework — Django-এর উপর RESTful API তৈরির toolkit; serialization, authentication, viewsets প্রদান করে। | API layer | Backend |
| 18 | **E2E** | End-to-End Testing — পুরো user journey (login → block create → approve → notification) test করার methodology। | QA strategy | Testing |
| 19 | **ENG** | Engineering Department — track, bridge, ballast, sleeper মেইনটেনেন্স করে; TMS (Track Management System) ব্যবহার করে। | User department | Railway |
| 20 | **Fast Track Clearance** | High-priority train (Rajdhani/Shatabdi)-এর জন্য block auto shorten বা reschedule করার mechanism। | Traffic management | Business |
| 21 | **GIS** | Geographic Information System — railway network-এর spatial mapping, station location, track geometry store এবং visualize করে। | Map visualization | Technical |
| 22 | **GPS** | Global Positioning System — train-এর real-time location track করতে ব্যবহৃত হয় (demo-তে simulated)। | Train tracking | Technical |
| 23 | **HMR** | Hot Module Replacement — Vite-এর feature; code change হলে পুরো page reload ছাড়াই instant update দেয়। | Development experience | Frontend |
| 24 | **HermiT** | OWL 2 DL reasoner — ontology consistency check, class inference, এবং property chain reasoning করে। | Ontology reasoning | AI |
| 25 | **Idempotency** | Property যেখানে একই request একাধিকবার করলেও একবার করার মতোই result হয় (e.g., approve block দুইবার চাপলে একবারই হয়)। | API reliability | Architecture |
| 26 | **Impact Score** | Numeric metric — একটি block-এর জন্য কতজন passenger affected হবে, কতটা delay হবে, কত টাকা loss হবে। | Analytics | Business |
| 27 | **IoT** | Internet of Things — track vibration, temperature, current sensor network (future scope-এ predictive maintenance-এর জন্য)। | Predictive maintenance | Hardware |
| 28 | **JWT** | JSON Web Token — compact, URL-safe token যা user authentication claims carry করে (access + refresh token pair)। | Authentication | Security |
| 29 | **KM** | Kilometer marker — railway section-এ দূরত্ব মাপার একক (e.g., HWH-KGP line-এ KM 15-20)। | Section marking | Railway |
| 30 | **Load Balancer** | Incoming traffic-কে একাধিক server instance-এর মধ্যে distribute করে scalability এবং availability বাড়ায়। | Deployment | Infrastructure |
| 31 | **Mapbox** | Cloud-based mapping platform — vector tiles, 3D buildings, dark theme, এবং custom layer support দেয়। | Frontend map | Frontend |
| 32 | **Microservices** | Architecture style যেখানে application loosely coupled, independently deployable service-এর সমষ্টি হিসেবে গড়া হয়। | Future architecture | Architecture |
| 33 | **Modular Monolith** | Single deployable unit (monolith) কিন্তু internal modules (Django apps) নিজেদের bounded context follow করে। | Current architecture | Architecture |
| 34 | **MVCC** | Multi-Version Concurrency Control — InnoDB-এর mechanism যা concurrent read/write operation-এর conflict কমায়। | Database internals | Database |
| 35 | **Neo4j** | Graph database — Cypher query language ব্যবহার করে; future-এ ontology scale করার জন্য reserve option। | Future scale | Database |
| 36 | **NTES** | National Train Enquiry System — Indian Railways-এর train status, schedule, delay information source। | External data | Railway |
| 37 | **OHE** | Overhead Equipment — Traction power lines (25kV) যা TRD department maintain করে। | Traction asset | Railway |
| 38 | **Ontology** | Formal knowledge representation — concept (class), relationship (property), এবং constraint-এর সমষ্টি। | Semantic layer | AI |
| 39 | **OWL** | Web Ontology Language — W3C standard যা rich, machine-interpretable semantic schema define করতে দেয়। | Digital Twin | Ontology |
| 40 | **Owlready2** | Python library — OWL 2 ontology load, modify, reason, এবং SPARQL query execution করে। | Semantic engine | Backend |
| 41 | **Owlready2 Quadstore** | SQLite-based RDF storage — Owlready2-এর default triple/quad persistence mechanism। | Ontology storage | Backend |
| 42 | **Passenger Impact** | Block scheduling-এর ফলে যাত্রীদের উপর পড়া প্রভাব — late arrival, connection miss, crowd ইত্যাদি calculation। | Impact analysis | Business |
| 43 | **MySQL** | Open-source relational database — robust, reliable, এবং Spatial Data support সহ primary DB। | Primary database | Database |
| 44 | **MySQL Spatial** | MySQL-এর spatial extension — geometry data type এবং spatial query (e.g., nearest station) করে। | GIS queries | Database |
| 45 | **Priority Queue** | Data structure (heap) — highest priority element (Critical > High > Medium > Low) আগে serve করে। | Block scheduling | Algorithm |
| 46 | **Quadstore** | RDF quad (subject-predicate-object-graph) store এবং query করার জন্য optimized database engine। | RDF storage | Database |
| 47 | **RabbitMQ** | Message broker — AMQP protocol implement করে; alternative হিসেবে considered কিন্তু rejected। | Message queue | Infrastructure |
| 48 | **RDF** | Resource Description Framework — web-এ data interchange-এর standard model; triple-based graph representation। | Semantic web | Ontology |
| 49 | **React** | JavaScript library — component-based architecture দিয়ে interactive user interface তৈরি করে। | Frontend framework | Frontend |
| 50 | **Redis** | In-memory data structure store — cache, session store, message broker, এবং Django Channels layer হিসেবে ব্যবহৃত হয়। | Cache/Queue | Infrastructure |
| 51 | **Reinforcement Learning** | ML paradigm — agent environment থেকে reward পেয়ে optimal action sequence শেখে (future scope)। | AI optimization | AI |
| 52 | **RBAC** | Role-Based Access Control — user role অনুযায়ী permission assign করার security model (ENG/TRD/SNT/COA)। | Authorization | Security |
| 53 | **Rolling Block** | Chain scheduling — একটি section-এর block শেষ হওয়ার সাথে সাথে পরের section-এ block শুরু। | Maintenance strategy | Railway |
| 54 | **RTX** | NVIDIA GPU series — local LLM (e.g., Llama, Phi) inference-এর জন্য hardware acceleration (future scope)। | Local AI | Hardware |
| 55 | **SAGA Pattern** | Distributed transaction pattern — sequence of local transactions যেখানে প্রতিটি fail হলে compensating action হয়। | Data consistency | Architecture |
| 56 | **Section** | Railway corridor segment — দুই স্টেশনের মধ্যের track অংশ (e.g., Howrah-Kharagpur, Bardhaman-Asansol)। | Network topology | Railway |
| 57 | **Semantic Digital Twin** | Digital Twin + semantic meaning — asset-এর মধ্যে logical relationship AI-reasoning-এর জন্য encode করা। | Core innovation | AI |
| 58 | **SHACL** | Shapes Constraint Language — RDF graph-কে নির্দিষ্ট shape/constraint অনুযায়ী validate করার W3C standard। | Data validation | Ontology |
| 59 | **Signal & Telecom** | SNT Department — signal, point machine, track circuit, telecom equipment maintain করে; SMMS ব্যবহার করে। | User department | Railway |
| 60 | **SIL-4** | Safety Integrity Level 4 — railway control system-এর highest safety certification; actual train control-এ লাগে। | Safety standard | Railway |
| 61 | **SMMS** | Signal Maintenance Management System — SNT department-এর legacy data source (demo-তে mock data)। | Legacy system | Railway |
| 62 | **SPARQL** | SPARQL Protocol and RDF Query Language — RDF graph query করার SQL-like language। | Ontology query | Ontology |
| 63 | **SQL** | Structured Query Language — relational database manage করার standard language। | Database queries | Database |
| 64 | **SQLite** | Embedded SQL database engine — serverless, zero-config; Owlready2 quadstore-এর backend হিসেবে ব্যবহৃত হয়। | Embedded storage | Database |
| 65 | **SSR** | Server-Side Rendering — server-এ HTML generate করে client-এ পাঠানো; SEO এবং first load-এর জন্য ব্যবহৃত হয়। | Rendering strategy | Frontend |
| 66 | **STRIDE** | Threat modeling framework — Spoofing, Tampering, Repudiation, Information Disclosure, DoS, Elevation of Privilege। | Security analysis | Security |
| 67 | **Traction Distribution** | TRD Department — overhead wire (OHE), substation, power supply maintain করে; TDMS ব্যবহার করে। | User department | Railway |
| 68 | **TMS** | Track Management System — Engineering department-এর legacy data source (demo-তে mock data)। | Legacy system | Railway |
| 69 | **Train Entity** | Ontology-তে `TrainEntity` ক্লাস — train-এর schedule, route, priority, এবং current position represent করে। | Digital Twin | Ontology |
| 70 | **Twilio** | Cloud communications platform — SMS, voice, WhatsApp API প্রদান করে; crew notification-এর জন্য ব্যবহৃত হয়। | External service | Integration |
| 71 | **Vite** | Next-generation frontend build tool — native ES modules এবং extremely fast HMR দেয়। | Build tool | Frontend |
| 72 | **WSGI** | Web Server Gateway Interface — Django-র traditional synchronous interface; Gunicorn WSGI server-এর মাধ্যমে serve হয়। | HTTP serving | Backend |
| 73 | **Zustand** | Small, fast state management library — React-এ global client state handle করার জন্য ব্যবহৃত হয়। | State management | Frontend |

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

---

## 3. Next File Dependency Note

> **পরবর্তী ফাইল:** `01-tech-infra/00-backend-core.md`

**এই ফাইল (`02-glossary.md`)-এ সংজ্ঞায়িত নিচের টার্মগুলো `00-backend-core.md`-এ সরাসরি ব্যবহার হবে (আর ব্যাখ্যা করা হবে না):**

| টার্ম | `00-backend-core.md`-এ ব্যবহার |
|--------|-------------------------------|
| **ASGI** | Django Channels ASGI application configuration, Daphne server setup |
| **WSGI** | Gunicorn WSGI server configuration, sync view handling |
| **Middleware** | Request lifecycle-এ middleware execution order (CORS → Security → Auth → Logger) |
| **JWT** | Authentication flow, token claims, refresh mechanism, blacklist |
| **RBAC** | Permission classes, role-based API access, department isolation |
| **DRF** | ViewSets, Serializers, Router, Permission classes, Throttling |
| **Celery** | Background task architecture, queue routing, worker concurrency |
| **Idempotency** | Block approval API-এ idempotency key handling |
| **Circuit Breaker** | Gemini API call-এ fallback mechanism (Ollama) |
| **Bounded Context** | Django apps-এর internal boundary, cross-app import restriction |
| **CRUD** | Repository layer pattern, generic viewset implementation |
| **ACID** | Database transaction boundary, block approval atomicity |
| **Priority Queue** | Block queue Redis sorted set implementation |

**`00-backend-core.md` পড়ার আগে উপরের টার্মগুলোর সংজ্ঞা এই glossary-তে জেনে নেওয়া উচিত।**
