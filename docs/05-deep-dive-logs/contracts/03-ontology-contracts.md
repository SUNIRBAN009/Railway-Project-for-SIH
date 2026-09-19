# 03-ontology-contracts.md

> **Contract Type:** Async API & REST OpenAPI Specification  
> **Service:** `SVC-ONTO` (Semantic Digital Twin & Ontology Reasoning Service)  
> **Context:** Contract for dispatching Owlready2 Description Logic reasoning jobs and retrieving semantic conflict proofs.

---

```yaml
openapi: 3.0.3
info:
  title: Indian Railways Digital Twin Ontology Reasoning API
  description: Formal contract for asynchronous OWL 2 DL reasoning sweeps using Owlready2 and HermiT.
  version: 1.0.0

paths:
  /ontology/reason/:
    post:
      summary: Enqueue asynchronous semantic reasoning sweep for a proposed block
      operationId: triggerReasoningJob
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
      responses:
        '202':
          description: Reasoning job successfully accepted and dispatched to JVM worker.
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  job_id:
                    type: string
                    format: uuid
                  status_check_url:
                    type: string
                    example: '/api/v1/ontology/jobs/7c9e6679-7425-40de-944b-e07fc1f90ae7/'

  /ontology/violations/:
    get:
      summary: Query verified semantic safety violations for a block
      operationId: getSemanticViolations
      parameters:
        - name: block_id
          in: query
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: Collection of inferred violations with formal logical explanations.
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/SemanticViolation'

components:
  schemas:
    SemanticViolation:
      type: object
      properties:
        id:
          type: string
          format: uuid
        rule_identifier:
          type: string
          example: 'RULE-OHE-ELECTRIC-ISOLATION-04'
        violation_type:
          type: string
          enum: [STRANDED_ELECTRIC_TRAIN, CROSSOVER_POINTS_DEADLOCK, SIGNAL_OVERLAP_INVASION, FEEDER_ISOLATION_CONCURRENCY]
        severity:
          type: string
          enum: [CRITICAL_SAFETY, OPERATIONAL_IMPEDIMENT, ADVISORY]
        explanation_narrative:
          type: string
          example: 'De-energizing OHE sub-sector 14 isolates crossover track 3B where Train 12424 is scheduled at 02:40.'
        involved_owl_individuals:
          type: array
          items:
            type: string
            example: 'http://railway.sih/digital_twin.owl#Train_12424'
```
