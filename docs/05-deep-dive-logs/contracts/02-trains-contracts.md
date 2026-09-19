# 02-trains-contracts.md

> **ফাইল ক্রম:** ৪০/৪৫  
> **ডিরেক্টরি:** `05-deep-dive-logs/contracts/`  
> **কন্ট্রাক্ট ফরম্যাট:** OpenAPI 3.0.3 Specification  
> **সার্ভিস আইডি:** `SVC-TRN` (`apps.trains`)  
> **পূর্ববর্তী ফাইল:** [05-deep-dive-logs/contracts/01-blocks-contracts.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/05-deep-dive-logs/contracts/01-blocks-contracts.md) (Block Planning & Deconfliction Contracts)  
> **পরবর্তী ফাইল:** [05-deep-dive-logs/contracts/03-ontology-contracts.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/05-deep-dive-logs/contracts/03-ontology-contracts.md) (Digital Twin & Semantic Reasoning Contracts)  
> **সংযোগ ও উদ্দেশ্য:** এই ফাইলে মাস্টার টাইমটেবিল রেজিস্ট্রি (#114), COA/NTES লাইভ ট্র্যাকিং ফিড (#118), মাল্টি-স্টেশন ডিলে ক্যাসকেড ইঞ্জিন (#115), প্যাসেঞ্জার ইমপ্যাক্ট কোয়ান্টিফিকেশন (#27) এবং ডাইভারশন রুট ইভালুয়েশনের (#119) প্রমিত OpenAPI 3.0.3 এপিআই কন্ট্রাক্ট সম্পূর্ণ টাইপ-সেফ আকারে সংজ্ঞায়িত করা হয়েছে।

---

```yaml
openapi: 3.0.3
info:
  title: Indian Railways Train Operations & Timetable Punctuality API
  description: Authoritative OpenAPI 3.0.3 contract for COA/NTES timetable master synchronization, live train corridor telemetry, multi-station delay propagation cascades, and passenger disruption quantification.
  version: 1.0.0
servers:
  - url: https://railblock.ir.gov.in/api/v1
    description: Production Railway Secure Cloud Gateway
  - url: http://localhost:8000/api/v1
    description: Local Sandbox

paths:
  /trains/live/:
    get:
      summary: Retrieve real-time positions, spatial chainage, and running delays for trains in corridor
      operationId: getLiveCorridorTrains
      tags:
        - Live Telemetry
      security:
        - BearerAuth: []
      parameters:
        - name: corridor_code
          in: query
          required: true
          schema:
            type: string
            example: "NDLS-CNB-MAIN"
        - name: min_delay_minutes
          in: query
          required: false
          schema:
            type: integer
            example: 10
        - name: line_type
          in: query
          required: false
          schema:
            type: string
            enum: [UP, DOWN, BOTH]
            default: BOTH
      responses:
        '200':
          description: List of active train movements with GPS/OHE spatial mileposts.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/LiveTrainListEnvelope'
        '400':
          description: Invalid corridor code or parameters.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /trains/master/{train_number}/:
    get:
      summary: Query authoritative timetable master and stop schedule for a specific train
      operationId: getTrainTimetableMaster
      tags:
        - Timetable Master
      security:
        - BearerAuth: []
      parameters:
        - name: train_number
          in: path
          required: true
          schema:
            type: string
            example: "12424"
      responses:
        '200':
          description: Full train profile, priority tier, composition, and scheduled halt timings.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TrainMasterEnvelope'
        '404':
          description: Train number not found in master registry (TRN-001).

  /trains/sync/coa/:
    post:
      summary: Trigger on-demand timetable and running status synchronization from COA/NTES
      operationId: syncCoaFeed
      tags:
        - External Sync
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - division_code
              properties:
                division_code:
                  type: string
                  example: "DLI"
                force_full_refresh:
                  type: boolean
                  default: false
      responses:
        '202':
          description: Asynchronous ETL sync task enqueued to Celery.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TaskEnqueuedEnvelope'
        '502':
          description: COA Gateway unreachable (TRN-002).

  /trains/simulate-delay/:
    post:
      summary: Simulate multi-station knock-on delay propagation caused by block or TSR
      operationId: simulateDelayCascade
      tags:
        - Delay Simulation
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/DelaySimulationRequest'
      responses:
        '200':
          description: Comprehensive delay cascade matrix across following express and freight trains.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/DelaySimulationEnvelope'
        '400':
          description: Invalid simulation parameters (TRN-003).

  /trains/passenger-impact/:
    post:
      summary: Compute passenger impact score, connecting train misconnection risk, and refund liabilities
      operationId: evaluatePassengerImpact
      tags:
        - Impact Assessment
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/PassengerImpactRequest'
      responses:
        '200':
          description: Calculated passenger disruption index and missed connection statistics.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PassengerImpactEnvelope'

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    LiveTrainListEnvelope:
      type: object
      properties:
        success:
          type: boolean
          example: true
        data:
          type: array
          items:
            $ref: '#/components/schemas/LiveTrainStatus'
        metadata:
          $ref: '#/components/schemas/ResponseMetadata'

    LiveTrainStatus:
      type: object
      properties:
        train_number:
          type: string
          example: "12424"
        train_name:
          type: string
          example: "DBRG RAJDHANI"
        train_category:
          type: string
          enum: [PREMIUM_RAJDHANI_VANDE, SUPERFAST_MAIL, PASSENGER_SUBURBAN, FREIGHT_LOADED, FREIGHT_EMPTY]
          example: "PREMIUM_RAJDHANI_VANDE"
        priority_rank:
          type: integer
          example: 1
        current_station:
          type: string
          example: "ALJN"
        current_chainage_km:
          type: number
          example: 126.400
        direction:
          type: string
          enum: [UP, DOWN]
          example: "DOWN"
        delay_minutes:
          type: integer
          example: 14
        speed_kmh:
          type: number
          example: 118.5
        next_station:
          type: string
          example: "TDL"
        eta_next_station:
          type: string
          format: date-time
          example: "2026-09-20T03:15:00Z"
        coordinates:
          type: object
          properties:
            latitude:
              type: number
              example: 27.8974
            longitude:
              type: number
              example: 78.0880

    TrainMasterEnvelope:
      type: object
      properties:
        success:
          type: boolean
          example: true
        data:
          type: object
          properties:
            train_number:
              type: string
              example: "12424"
            train_name:
              type: string
              example: "NEW DELHI - DIBRUGARH RAJDHANI EXPRESS"
            source_station:
              type: string
              example: "NDLS"
            destination_station:
              type: string
              example: "DBRG"
            total_distance_km:
              type: number
              example: 2432.0
            average_speed_kmh:
              type: number
              example: 78.2
            rake_type:
              type: string
              example: "LHB_22_COACHES"
            timetable:
              type: array
              items:
                type: object
                properties:
                  station_code:
                    type: string
                    example: "CNB"
                  scheduled_arrival:
                    type: string
                    example: "21:30"
                  scheduled_departure:
                    type: string
                    example: "21:35"
                  halt_minutes:
                    type: integer
                    example: 5

    DelaySimulationRequest:
      type: object
      required:
        - corridor_code
        - start_km
        - end_km
        - caution_speed_kmh
        - duration_minutes
      properties:
        corridor_code:
          type: string
          example: "NDLS-CNB-MAIN"
        start_km:
          type: number
          example: 14.250
        end_km:
          type: number
          example: 18.800
        caution_speed_kmh:
          type: integer
          example: 30
        duration_minutes:
          type: integer
          example: 210
        normal_mps_kmh:
          type: integer
          default: 130

    DelaySimulationEnvelope:
      type: object
      properties:
        success:
          type: boolean
          example: true
        data:
          type: object
          properties:
            primary_slowdown_per_train_minutes:
              type: number
              example: 7.4
            total_impacted_trains:
              type: integer
              example: 9
            cumulative_delay_minutes:
              type: number
              example: 58.6
            passenger_delay_minutes:
              type: number
              example: 28.2
            freight_delay_minutes:
              type: number
              example: 30.4
            punctuality_loss_percentage:
              type: number
              example: 1.8
            cascading_trains:
              type: array
              items:
                type: object
                properties:
                  train_number:
                    type: string
                    example: "12424"
                  induced_delay_minutes:
                    type: number
                    example: 7.4
                  downstream_junction_recovery:
                    type: number
                    example: 2.0

    PassengerImpactRequest:
      type: object
      required:
        - train_numbers
        - expected_delays_minutes
      properties:
        train_numbers:
          type: array
          items:
            type: string
          example: ["12424", "12560"]
        expected_delays_minutes:
          type: array
          items:
            type: integer
          example: [25, 40]

    PassengerImpactEnvelope:
      type: object
      properties:
        success:
          type: boolean
          example: true
        data:
          type: object
          properties:
            estimated_affected_passengers:
              type: integer
              example: 2840
            missed_connecting_passengers:
              type: integer
              example: 142
            pnr_churn_risk_score:
              type: number
              example: 22.5
            estimated_refund_liability_inr:
              type: number
              example: 125000.00

    TaskEnqueuedEnvelope:
      type: object
      properties:
        success:
          type: boolean
          example: true
        task_id:
          type: string
          example: "celery-task-9b1deb4d-3b7d-4bad"
        message:
          type: string
          example: "COA timetable sync job dispatched to worker."

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
          example: 14.8

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
              example: "TRN-002"
            message:
              type: string
              example: "COA timetable feed gateway unreachable."
            service:
              type: string
              example: "SVC-TRN"
            retryable:
              type: boolean
              example: true
```
