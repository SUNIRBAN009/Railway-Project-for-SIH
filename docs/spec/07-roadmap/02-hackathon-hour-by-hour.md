# 02-hackathon-hour-by-hour.md

> **File Order:** 38/45  
> **Previous File:** `07-roadmap/01-sprint-backlog.md`  
> **Next File:** `07-roadmap/03-presentation-script.md`  

---

## 36-Hour Hackathon Execution Plan

This timeline assumes a team of 4 (2 Backend, 1 Frontend, 1 AI/Data).

### Day 1: The Foundation (Hours 0-12)

*Goal: Get the basic CRUD app working and deployed.*

- **Hour 0-2 (Setup):** 
  - Init Git repo, Vite frontend, Django backend.
  - Setup Railway CI/CD pipelines immediately. Ensure `main` deploys a blank page successfully.
- **Hour 2-6 (Database & Auth):** 
  - Backend creates `User`, `BlockRequest`, `Section` models. 
  - Implements SimpleJWT login. 
  - Creates `seed_core.py` script.
- **Hour 6-10 (UI Shell):** 
  - Frontend builds Login page, JE Dashboard (Form), COA Dashboard (Table).
  - Connects to backend APIs.
- **Hour 10-12 (Integration Checkpoint):** 
  - Whole team stops. Verify a block requested in UI saves to DB and appears on COA screen upon refresh.

### Day 1 Night: The "Wow" Features (Hours 12-24)

*Goal: Implement the complex logic that wins the hackathon.*

- **Hour 12-16 (Mapping & Conflicts):** 
  - Frontend integrates Mapbox GL JS. 
  - Backend writes `ConflictEngine` logic.
- **Hour 16-20 (AI & Ontology):** 
  - AI Lead sets up `Owlready2` and writes the prompt for Gemini API. 
  - Backend wires Celery queue to call Gemini.
- **Hour 20-24 (Real-time):** 
  - Backend configures Django Channels (WebSockets) and Redis. 
  - Frontend connects `useAlertStore` to WebSocket.

### Day 2: Polish & QA (Hours 24-36)

*Goal: Make it unbreakable and beautiful.*

- **Hour 24-28 (Emergency & SMS):** 
  - Implement Twilio SMS. 
  - Build the red flashing UI state for emergencies.
- **Hour 28-32 (UI/UX Polish):** 
  - Replace ugly buttons with Material UI. Add loading spinners to all API calls. Fix map coloring.
- **Hour 32-34 (QA & Seed):** 
  - Stop all feature development. 
  - Run the `seed_core.py` script on the Production Railway DB. 
  - Execute `01-e2e-scenarios.md` manually.
- **Hour 34-36 (Pitch Practice):** 
  - Rehearse the presentation script (`03-presentation-script.md`). Do not touch code.
