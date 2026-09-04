# 02-trains-contracts.md

> **Contract Type:** OpenAPI 3.0.3 Specification  
> **Service:** `SVC-TRN` (Train Operations & Timetable Punctuality Service)  
> **Context:** Formal REST API contract for querying master schedules, fetching live train coordinates, and executing delay simulation algorithms.

---

```yaml
openapi: 3.0.3
info:
  title: Indian Railways Train Operations & Timetable API
  description: Authoritative contract for live train running status, station schedules, and delay impact simulation.
  version: 1.0.0

paths:
  /trains/live/:
    get:
      summary: Retrieve real-time positions and delay metrics for trains in corridor
      operationId: getLiveTrains
      parameters:
        - name: corridor
          in: query
          required: true
          schema:
            type: string
            example: 'NDLS-CNB'
        - name: delay_greater_than
          in: query
          required: false
          schema:
            type: integer
            example: 10
      responses:
        '200':
          description: Collection of active running trains with telemetry.
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
                      $ref: '#/components/schemas/LiveTrainStatus'

  /trains/simulate-delay/:
    post:
      summary: Simulate delay propagation cascade resulting from caution order or block
      operationId: simulateDelayCascade
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/DelaySimulationRequest'
      responses:
        '200':
          description: Calculated delay impact across passenger and freight paths.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/DelaySimulationResponse'

components:
  schemas:
    LiveTrainStatus:
      type: object
      properties:
        train_number:
          type: string
          example: '12424'
        train_name:
          type: string
          example: 'DBRG RAJDHANI'
        current_station:
          type: string
          example: 'ALJN'
        current_km:
          type: number
          example: 126.400
        delay_minutes:
          type: integer
          example: 12
        speed_kmh:
          type: number
          example: 110.5

    DelaySimulationRequest:
      type: object
      required:
        - block_id
        - affected_train_ids
        - imposed_speed_restriction_kmh
        - corridor_length_km
      properties:
        block_id:
          type: string
          format: uuid
        affected_train_ids:
          type: array
          items:
            type: string
        imposed_speed_restriction_kmh:
          type: integer
          example: 30
        corridor_length_km:
          type: number
          example: 3.700

    DelaySimulationResponse:
      type: object
      properties:
        success:
          type: boolean
        data:
          type: object
          properties:
            lead_train_delay_minutes:
              type: number
              example: 8.7
            total_passenger_delay_minutes:
              type: number
              example: 15.2
            total_freight_delay_minutes:
              type: number
              example: 32.0
            punctuality_index_drop_percent:
              type: number
              example: 1.2
```
