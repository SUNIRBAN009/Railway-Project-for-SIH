# 01-blocks-contracts.md

> **Contract Type:** OpenAPI 3.0.3 Specification  
> **Service:** `SVC-BLK` (Block Planning & Deconfliction Service)  
> **Context:** Formal REST API contract for submitting block requests, triggering conflict sweeps, and executing multi-tier sanction lifecycles.

---

```yaml
openapi: 3.0.3
info:
  title: Indian Railways Smart Block Planning API
  description: Authoritative contract for corridor possession proposals, conflict resolution, and execution.
  version: 1.0.0
servers:
  - url: https://railway.sih.gov.in/api/v1
    description: Production Railway Cloud Gateway
  - url: http://localhost:8000/api/v1
    description: Local Docker Development

paths:
  /blocks/proposals/:
    post:
      summary: Submit a new track possession block proposal
      operationId: submitBlockProposal
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
          description: Block proposal successfully submitted and registered for conflict analysis.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/BlockDetailEnvelope'
        '400':
          description: Invalid input parameters or temporal duration violations.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '401':
          description: Missing or expired authentication credentials.
        '403':
          description: User lacks Departmental Engineer permissions.

  /blocks/{id}/sanction/:
    post:
      summary: Sanction a block proposal by Chief/Section Controller
      operationId: sanctionBlock
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
              type: object
              required:
                - action
              properties:
                action:
                  type: string
                  enum: [SANCTION, REJECT]
                remarks:
                  type: string
                  example: Sanctioned with 30 km/h caution order on adjacent line.
      responses:
        '200':
          description: Block successfully transitioned to SANCTIONED state.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/BlockDetailEnvelope'
        '409':
          description: Cannot sanction block due to unresolved critical conflicts or concurrent edit.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

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
        - corridor_id
        - line_type
        - department_code
        - work_type
        - start_km
        - end_km
        - scheduled_start_time
        - scheduled_end_time
      properties:
        corridor_id:
          type: string
          format: uuid
        line_type:
          type: string
          enum: [UP, DOWN, BIDIRECTIONAL, LOOP_1, LOOP_2, YARD]
        department_code:
          type: string
          enum: [ENG, TRD, SNT]
        work_type:
          type: string
          enum: [TRACK_TAMPING, BALLAST_CLEANING, RAIL_RENEWAL, OHE_INSPECTION, CATENARY_MAINTENANCE, SIGNAL_INTERLOCKING_TEST, TURNOUT_OVERHAUL]
        start_km:
          type: number
          format: float
          example: 142.500
        end_km:
          type: number
          format: float
          example: 146.200
        scheduled_start_time:
          type: string
          format: date-time
          example: '2026-09-05T02:00:00Z'
        scheduled_end_time:
          type: string
          format: date-time
          example: '2026-09-05T06:00:00Z'
        traction_power_cutoff_required:
          type: boolean
          default: false

    BlockDetailEnvelope:
      type: object
      properties:
        success:
          type: boolean
          example: true
        data:
          $ref: '#/components/schemas/BlockDetail'

    BlockDetail:
      type: object
      properties:
        id:
          type: string
          format: uuid
        block_code:
          type: string
          example: 'BLK-20260905-ENG-001'
        status:
          type: string
          enum: [DRAFT, PENDING_APPROVAL, COORDINATED, SANCTIONED, ACTIVE, COMPLETED, CANCELLED, REJECTED]
        version:
          type: integer
          example: 1
        conflicts_count:
          type: integer
          example: 0

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
              example: 'BLK-003'
            message:
              type: string
            service:
              type: string
              example: 'SVC-BLK'
            retryable:
              type: boolean
              example: false
```
