# 03-presentation-script.md

> **File Order:** 39/45  
> **Previous File:** `07-roadmap/02-hackathon-hour-by-hour.md`  
> **Next File:** `08-standards/00-coding-guidelines.md`  

---

## The Demo Script (5 Minutes)

Judges evaluate based on UI smoothness, technical complexity, and adherence to the problem statement. This script perfectly aligns with the `01-e2e-scenarios.md` testing flows.

---

### Minute 0:00 - The Problem Statement
**Speaker:** "Indian Railways currently schedules maintenance blocks manually via phone calls, leading to conflicts, massive delays, and safety risks. Our solution for PS 26027 is a real-time, AI-driven Block Planning system powered by a Semantic Digital Twin."

### Minute 1:00 - The Basic Workflow
**Action:** Screen shows the Junior Engineer (JE) dashboard.
**Speaker:** "Here, the Track Engineer requests a maintenance block on the Howrah-Kharagpur section."
**Action:** JE submits the form. Switch screen to the Control Office (COA) dashboard.
**Speaker:** "Instantly, via WebSockets, the Control Office sees the request. They approve it, and our Mapbox integration immediately visualizes the blocked track in yellow."

### Minute 2:00 - The Wow Factor (Conflict & AI)
**Action:** Switch back to a different JE (Traction/OHE). They try to request the same section at the same time.
**Speaker:** "But what happens if the OHE department tries to work on the same track simultaneously? Our backend conflict engine detects this overlap in space and time and blocks the request."
**Action:** JE forces the submission as a "Conflict Override". Switch to COA dashboard.
**Speaker:** "The COA sees the conflict in red. Instead of making phone calls, they ask our AI."
**Action:** Click the "Resolve via AI" button.
**Speaker:** "We use the Google Gemini API to analyze the rules and priorities. It explains its decision in English, Hindi, and Bengali, ensuring all field staff understand the decision."

### Minute 3:30 - The Digital Twin (Technical Depth)
**Action:** Show the "Impact Score" on the block.
**Speaker:** "Behind the scenes, we aren't just using simple SQL. We built a Semantic Digital Twin using Owlready2. When a block is approved, an automated Reasoner infers exactly which trains will be disrupted, calculating this Impact Score you see here."

### Minute 4:15 - The Emergency Protocol
**Action:** Switch to Signal JE. Click "EMERGENCY".
**Speaker:** "If a rail fractures, it's an emergency."
**Action:** JE submits. The COA screen flashes red immediately.
**Speaker:** "WebSockets instantly lock the COA screen. Furthermore, our system just queried the database for the nearest available crew and dispatched an SMS via Twilio to their phones."
*(Hold up phone showing the SMS alert received during the demo).*

### Minute 4:45 - Conclusion
**Speaker:** "Scalable via a modular monolith, intelligent via Gemini and Semantic Web tech, and real-time via WebSockets. Thank you."
