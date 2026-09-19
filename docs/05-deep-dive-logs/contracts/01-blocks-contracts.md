# 01-blocks-contracts.md

> **ফাইল ক্রম:** ৩৯/৪৫  
> **ডিরেক্টরি:** `05-deep-dive-logs/contracts/`  
> **কন্ট্রাক্ট ফরম্যাট:** OpenAPI 3.0.3 Specification  
> **সার্ভিস আইডি:** `SVC-BLK` (`apps.blocks`)  
> **পূর্ববর্তী ফাইল:** [05-deep-dive-logs/04-bug-log-template.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/05-deep-dive-logs/04-bug-log-template.md) (Incident Post-Mortem & Bug Log)  
> **পরবর্তী ফাইল:** [05-deep-dive-logs/contracts/02-trains-contracts.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/05-deep-dive-logs/contracts/02-trains-contracts.md) (Live Trains & Delay Simulation Contracts)  
> **সংযোগ ও উদ্দেশ্য:** এই ফাইলে মেগা-ব্লক প্ল্যানিং, PostGIS কনফ্লিক্ট সুইপ, স্যাংশন ওয়ার্কফ্লো এবং সেফটি স্যুইট অ্যাক্টিভেশনের আনুষ্ঠানিক OpenAPI 3.0.3 এপিআই কন্ট্রাক্ট সম্পূর্ণ টাইপ-সেফ ও এক্সিকিউটেবল আকারে লিপিবদ্ধ করা হয়েছে।

---

```yaml
openapi: 3.0.3
info:
  title: Indian Railways Smart Block Planning & Deconfliction API
  description: Authoritative OpenAPI 3.0.3 specification for corridor possession proposals, PostGIS spatial-temporal conflict sweeps, digital safety token handshakes, and block lifecycle management.
  version: 1.0.0
servers:
  - url: https://railblock.ir.gov.in/api/v1
    description: Production Railway Secure Cloud Gateway
  - url: http://localhost:8000/api/v1
    description: Local Development & CI/CD Sandbox

paths:
  /blocks/proposals/:
    post:
      summary: Submit a new track possession block proposal
      operationId: submitBlockProposal
      tags:
        - Block Planning
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/BlockProposalRequest'
      responses:
        '201':
          description: Block proposal successfully created and registered for automated conflict analysis.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/BlockDetailEnvelope'
        '400':
          description: Invalid input parameters, chainage formatting error, or boundary mismatch.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '401':
          description: Missing or expired authentication token.
        '403':
          description: Insufficient departmental privileges.

  /blocks/evaluate-conflicts/:
    post:
      summary: Run sweep-line & PostGIS spatial conflict analysis on a proposed corridor window
      operationId: evaluateCorridorConflicts
      tags:
        - Conflict Detection
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ConflictEvaluationRequest'
      responses:
        '200':
          description: Comprehensive conflict analysis report including train path clashes and parallel possessions.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ConflictReportEnvelope'
        '400':
          description: Invalid spatial boundaries or time window.

  /blocks/{id}/sanction/:
    post:
      summary: Sanction or reject a coordinated block proposal (DOM / Chief Controller)
      operationId: sanctionBlock
      tags:
        - Block Approval
      security:
        - BearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/BlockSanctionRequest'
      responses:
        '200':
          description: Block successfully sanctioned; digital possession token issued.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/BlockDetailEnvelope'
        '409':
          description: Sanction blocked due to unresolved critical conflicts (BLK-003) or optimistic lock mismatch (BLK-006).
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /blocks/{id}/activate/:
    post:
      summary: Activate block possession with digital safety attestations (Site Supervisor & SM)
      operationId: activateBlockPossession
      tags:
        - Life-Safety Execution
      security:
        - BearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/BlockActivationRequest'
      responses:
        '200':
          description: Block activated; section officially closed to traffic; siren and signals held.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/BlockDetailEnvelope'
        '412':
          description: Pre-condition failed; missing LOTO, Tool Count, Weather Gate or Safety Attestation.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /blocks/{id}/complete/:
    post:
      summary: Hand back section, verify tool reconciliation, and close block possession
      operationId: completeBlockPossession
      tags:
        - Life-Safety Execution
      security:
        - BearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/BlockCompletionRequest'
      responses:
        '200':
          description: Section cleared, caution orders verified, and line reopened.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/BlockDetailEnvelope'
        '412':
          description: Missing clearance sign-off or unreconciled tools on track (BLK-008).

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    BlockProposalRequest:
      type: object
      required:
        - section_code
        - line_type
        - department_code
        - work_type
        - start_km
        - end_km
        - scheduled_start_time
        - scheduled_end_time
      properties:
        section_code:
          type: string
          example: "NDLS-GZB-UP"
        line_type:
          type: string
          enum: [UP, DOWN, BIDIRECTIONAL, LOOP_1, LOOP_2, YARD]
        department_code:
          type: string
          enum: [ENGG, TRD, SNT]
        work_type:
          type: string
          enum: [TRACK_TAMPING, BALLAST_CLEANING, RAIL_RENEWAL, OHE_INSPECTION, CATENARY_MAINTENANCE, SIGNAL_INTERLOCKING_TEST, TURNOUT_OVERHAUL]
        start_km:
          type: number
          format: float
          example: 14.250
        end_km:
          type: number
          format: float
          example: 18.800
        scheduled_start_time:
          type: string
          format: date-time
          example: "2026-09-20T02:00:00Z"
        scheduled_end_time:
          type: string
          format: date-time
          example: "2026-09-20T05:30:00Z"
        traction_power_cutoff_required:
          type: boolean
          default: false
        shadow_slot_eligible:
          type: boolean
          default: true
        crew_headcount_expected:
          type: integer
          example: 18

    ConflictEvaluationRequest:
      type: object
      required:
        - section_code
        - line_type
        - start_km
        - end_km
        - start_time
        - end_time
      properties:
        section_code:
          type: string
          example: "NDLS-GZB-UP"
        line_type:
          type: string
          enum: [UP, DOWN, BIDIRECTIONAL]
        start_km:
          type: number
          format: float
          example: 14.250
        end_km:
          type: number
          format: float
          example: 18.800
        start_time:
          type: string
          format: date-time
          example: "2026-09-20T02:00:00Z"
        end_time:
          type: string
          format: date-time
          example: "2026-09-20T05:30:00Z"

    ConflictReportEnvelope:
      type: object
      properties:
        success:
          type: boolean
          example: true
        data:
          type: object
          properties:
            has_conflicts:
              type: boolean
              example: true
            critical_count:
              type: integer
              example: 1
            major_count:
              type: integer
              example: 0
            conflicts:
              type: array
              items:
                type: object
                properties:
                  conflicting_id:
                    type: string
                    example: "TRN-12424"
                  conflict_type:
                    type: string
                    example: "PASSENGER_TRAIN_COLLISION"
                  severity:
                    type: string
                    enum: [CRITICAL, MAJOR, MINOR]
                  overlap_start_km:
                    type: number
                    example: 14.250
                  overlap_end_km:
                    type: number
                    example: 18.800
                  overlap_duration_minutes:
                    type: number
                    example: 45.0

    BlockSanctionRequest:
      type: object
      required:
        - action
      properties:
        action:
          type: string
          enum: [SANCTION, REJECT, REQUEST_RESCHEDULE]
        version:
          type: integer
          description: Optimistic locking version
          example: 1
        remarks:
          type: string
          example: "Sanctioned with 30 km/h caution order on adjacent UP line."
        imposed_speed_restriction_kmh:
          type: integer
          example: 30

    BlockActivationRequest:
      type: object
      required:
        - digital_token
        - tool_count_initial
        - safety_briefing_completed
      properties:
        digital_token:
          type: string
          example: "TOK-BL-20260920-7F8E-ACD9"
        tool_count_initial:
          type: integer
          example: 24
        safety_briefing_completed:
          type: boolean
          example: true
        loto_power_isolation_confirmed:
          type: boolean
          example: true
        weather_gate_passed:
          type: boolean
          example: true
        crew_present_count:
          type: integer
          example: 18

    BlockCompletionRequest:
      type: object
      required:
        - tool_count_final
        - track_cleared_confirmed
      properties:
        tool_count_final:
          type: integer
          example: 24
        track_cleared_confirmed:
          type: boolean
          example: true
        station_master_signoff:
          type: boolean
          example: true
        actual_cleared_at:
          type: string
          format: date-time
          example: "2026-09-20T05:20:00Z"

    BlockDetailEnvelope:
      type: object
      properties:
        success:
          type: boolean
          example: true
        data:
          $ref: '#/components/schemas/BlockDetail'
        metadata:
          $ref: '#/components/schemas/ResponseMetadata'

    BlockDetail:
      type: object
      properties:
        id:
          type: string
          format: uuid
        block_code:
          type: string
          example: "BLK-20260920-ENGG-001"
        status:
          type: string
          enum: [DRAFT, SUBMITTED, COORDINATED, SANCTIONED, ACTIVE, COMPLETED, CANCELLED, REJECTED]
        version:
          type: integer
          example: 2
        section_code:
          type: string
          example: "NDLS-GZB-UP"
        start_km:
          type: number
          example: 14.250
        end_km:
          type: number
          example: 18.800
        scheduled_start:
          type: string
          format: date-time
        scheduled_end:
          type: string
          format: date-time
        digital_token:
          type: string
          example: "TOK-BL-20260920-7F8E-ACD9"
        deconfliction_score:
          type: number
          example: 97.5

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
          example: 12.4

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
              example: "BLK-003"
            message:
              type: string
              example: "Critical train collision detected with Rajdhani Express."
            service:
              type: string
              example: "SVC-BLK"
            retryable:
              type: boolean
              example: false
```
