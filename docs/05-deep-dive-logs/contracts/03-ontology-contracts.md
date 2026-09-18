# 03-ontology-contracts.md

> **ফাইল ক্রম:** ৪১/৪৫  
> **ডিরেক্টরি:** `05-deep-dive-logs/contracts/`  
> **কন্ট্রাক্ট ফরম্যাট:** OpenAPI 3.0.3 & SPARQL 1.1 Protocol Specification  
> **সার্ভিস আইডি:** `SVC-ONTO` (`apps.ontology`)  
> **পূর্ববর্তী ফাইল:** [05-deep-dive-logs/contracts/02-trains-contracts.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/05-deep-dive-logs/contracts/02-trains-contracts.md) (Train Operations & Timetable Contracts)  
> **পরবর্তী ফাইল:** [05-deep-dive-logs/adrs/adr-0001-modular-monolith.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/05-deep-dive-logs/adrs/adr-0001-modular-monolith.md) (ADR-1: Modular Monolith Architecture)  
> **সংযোগ ও উদ্দেশ্য:** এই ফাইলে রেলওয়ে ডিজিটাল টুইন OWL 2 DL সিমেন্টিক নলেজ গ্রাফ, অ্যাসিনক্রোনাস HermiT রিজনার জব ডিসপ্যাচ, SPARQL ১.১ কোয়েরি প্রোটোকল, এবং ইন্টারলকিং ও ওএইচই সেফটি ভায়োলেশন প্রুফ জেনারেশনের প্রমিত OpenAPI 3.0.3 এপিআই কন্ট্রাক্ট বিস্তারিতভাবে সংজ্ঞায়িত করা হয়েছে।

---

```yaml
openapi: 3.0.3
info:
  title: Indian Railways Digital Twin Semantic Ontology & Reasoning API
  description: Formal OpenAPI 3.0.3 contract for OWL 2 DL knowledge graph synchronization, Celery-isolated HermiT Description Logic reasoning sweeps, SPARQL 1.1 endpoints, and safety violation proof extraction.
  version: 1.0.0
servers:
  - url: https://railblock.ir.gov.in/api/v1
    description: Production Railway Secure Cloud Gateway
  - url: http://localhost:8000/api/v1
    description: Local Development & CI Sandbox

paths:
  /ontology/reason/:
    post:
      summary: Enqueue asynchronous OWL 2 DL reasoning sweep for a proposed block possession
      operationId: triggerReasoningJob
      tags:
        - Semantic Reasoning
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - block_id
              properties:
                block_id:
                  type: string
                  format: uuid
                  example: "7f8e9a2b-3c4d-5e6f-7a8b-9c0d1e2f3a4b"
                include_ohe_feeder_rules:
                  type: boolean
                  default: true
                include_interlocking_rules:
                  type: boolean
                  default: true
      responses:
        '202':
          description: Reasoning job accepted and enqueued to Celery ontology worker.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/JobAcceptedEnvelope'
        '400':
          description: Invalid block ID format.
        '404':
          description: Block record not found.

  /ontology/jobs/{job_id}/:
    get:
      summary: Poll status, telemetry, and completion results of an ontology reasoning sweep
      operationId: getReasoningJobStatus
      tags:
        - Semantic Reasoning
      security:
        - BearerAuth: []
      parameters:
        - name: job_id
          in: path
          required: true
          schema:
            type: string
            format: uuid
            example: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"
      responses:
        '200':
          description: Job status, reasoning metrics (axioms evaluated, execution time), and violations found.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/JobStatusEnvelope'
        '404':
          description: Job ID not found.
        '504':
          description: HermiT reasoner timed out (ONTO-003).

  /ontology/violations/:
    get:
      summary: Query verified semantic safety and interlocking violations for a block or corridor
      operationId: getSemanticViolations
      tags:
        - Safety Inferences
      security:
        - BearerAuth: []
      parameters:
        - name: block_id
          in: query
          required: true
          schema:
            type: string
            format: uuid
        - name: severity
          in: query
          required: false
          schema:
            type: string
            enum: [CRITICAL_SAFETY, OPERATIONAL_IMPEDIMENT, ADVISORY]
      responses:
        '200':
          description: Inferred semantic violations with natural language explanations and OWL URI traces.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ViolationsListEnvelope'

  /ontology/sparql/:
    post:
      summary: Execute SPARQL 1.1 query directly against the railway digital twin RDF triplestore
      operationId: executeSparqlQuery
      tags:
        - SPARQL Protocol
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - query
              properties:
                query:
                  type: string
                  example: "SELECT ?track ?signal WHERE { ?track a :TrackSection ; :hasSignal ?signal . } LIMIT 25"
                format:
                  type: string
                  enum: [json, xml, csv]
                  default: json
      responses:
        '200':
          description: SPARQL 1.1 Query Results compliant with W3C recommendations.
          content:
            application/json:
              schema:
                type: object
                properties:
                  head:
                    type: object
                    properties:
                      vars:
                        type: array
                        items:
                          type: string
                  results:
                    type: object
                    properties:
                      bindings:
                        type: array
                        items:
                          type: object
        '400':
          description: SPARQL syntax error.

  /ontology/export/:
    get:
      summary: Export the canonical Indian Railways OWL 2 DL ontology model
      operationId: exportOntologyOwl
      tags:
        - Model Export
      security:
        - BearerAuth: []
      parameters:
        - name: syntax
          in: query
          required: false
          schema:
            type: string
            enum: [rdfxml, turtle, nt]
            default: turtle
      responses:
        '200':
          description: Serialized OWL 2 DL ontology file.
          content:
            text/turtle:
              schema:
                type: string
            application/rdf+xml:
              schema:
                type: string

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    JobAcceptedEnvelope:
      type: object
      properties:
        success:
          type: boolean
          example: true
        data:
          type: object
          properties:
            job_id:
              type: string
              format: uuid
              example: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"
            status:
              type: string
              example: "QUEUED"
            poll_interval_seconds:
              type: integer
              example: 2
            status_check_url:
              type: string
              example: "/api/v1/ontology/jobs/9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d/"
        metadata:
          $ref: '#/components/schemas/ResponseMetadata'

    JobStatusEnvelope:
      type: object
      properties:
        success:
          type: boolean
          example: true
        data:
          type: object
          properties:
            job_id:
              type: string
              format: uuid
            status:
              type: string
              enum: [QUEUED, RUNNING, COMPLETED, FAILED, TIMED_OUT]
              example: "COMPLETED"
            axioms_count:
              type: integer
              example: 18450
            individuals_count:
              type: integer
              example: 3210
            execution_duration_ms:
              type: number
              example: 1240.5
            is_consistent:
              type: boolean
              example: false
            violations_count:
              type: integer
              example: 1
        metadata:
          $ref: '#/components/schemas/ResponseMetadata'

    ViolationsListEnvelope:
      type: object
      properties:
        success:
          type: boolean
          example: true
        data:
          type: array
          items:
            $ref: '#/components/schemas/SemanticViolation'
        metadata:
          $ref: '#/components/schemas/ResponseMetadata'

    SemanticViolation:
      type: object
      properties:
        id:
          type: string
          format: uuid
          example: "v1a789ef-3b7d-4bad-9bdd-2b0d7b3dcb6d"
        rule_identifier:
          type: string
          example: "RULE-OHE-ELECTRIC-ISOLATION-04"
        violation_type:
          type: string
          enum: [STRANDED_ELECTRIC_TRAIN, CROSSOVER_POINTS_DEADLOCK, SIGNAL_OVERLAP_INVASION, FEEDER_ISOLATION_CONCURRENCY]
          example: "STRANDED_ELECTRIC_TRAIN"
        severity:
          type: string
          enum: [CRITICAL_SAFETY, OPERATIONAL_IMPEDIMENT, ADVISORY]
          example: "CRITICAL_SAFETY"
        explanation_narrative:
          type: string
          example: "OHE Sub-sector 14 de-energization isolates Section 3B where Train 12424 (Electric WAP-7) is traversing. No diesel banker loco assigned."
        involved_owl_individuals:
          type: array
          items:
            type: string
          example:
            - "http://railway.sih/digital_twin.owl#Train_12424"
            - "http://railway.sih/digital_twin.owl#Track_NDLS_GZB_UP_3B"
            - "http://railway.sih/digital_twin.owl#OHE_Sector_14"

    ResponseMetadata:
      type: object
      properties:
        request_id:
          type: string
          example: "req-9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"
        timestamp:
          type: string
          format: date-time
        execution_duration_ms:
          type: number
          example: 18.2

    ErrorResponse:
      type: object
      properties:
        success:
          type: boolean
          example: false
        error:
          type: object
          properties:
            code:
              type: string
              example: "ONTO-001"
            message:
              type: string
              example: "HermiT reasoner inferred safety hazard: Stranded electric train."
            service:
              type: string
              example: "SVC-ONTO"
            retryable:
              type: boolean
              example: false
```
