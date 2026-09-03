# 01-sprint-backlog.md

> **File Order:** 37/45  
> **Previous File:** `07-roadmap/00-readme.md`  
> **Next File:** `07-roadmap/02-hackathon-hour-by-hour.md`  

---

## 1. MVP Scope (MUST HAVE for Demo)

To survive a 36-hour hackathon, we must ruthlessly prioritize features that look good to judges and prove the core technical concept.

### Tier 1: Core Mechanics (Hours 1-12)
- [ ] Django API setup with JWT Authentication.
- [ ] React UI with Login screen.
- [ ] `BlockRequest` CRUD APIs.
- [ ] JE Dashboard (Request form).
- [ ] COA Dashboard (Pending table).
- [ ] Hardcoded mock data seeding for Sections and Trains.

### Tier 2: The "Wow" Factors (Hours 12-24)
- [ ] Mapbox integration on COA Dashboard showing active blocks.
- [ ] Conflict detection algorithm (preventing overlapping blocks).
- [ ] **AI Resolution (Gemini API) integration.**
- [ ] WebSocket integration for real-time table updates.

### Tier 3: The Edge Cases (Hours 24-30)
- [ ] Emergency Block button (red flashing UI).
- [ ] Twilio SMS integration for emergency alerts.
- [ ] Semantic Ontology (Owlready2) syncing.
- [ ] Impact Score calculation (Trains delayed).

---

## 2. Anti-Scope (WILL NOT BUILD for MVP)

If a team member tries to build these during the hackathon, tell them to stop. These are for future scaling only.

1. **User Registration:** No sign-up page. All users are pre-seeded in the database.
2. **Password Reset:** If you forget your password during the demo, use a different seeded account.
3. **Complex Map Routing:** Mapbox will draw straight lines between stations (or use pre-calculated GeoJSON). We will not build a full GIS routing engine.
4. **Real-time Train Tracking (NTES):** We will use static schedule data for impact calculations, not live GPS.
5. **Local Phi-3 LLM:** We will rely 100% on the Gemini Cloud API to save container setup time.
6. **Mobile App:** We will build a responsive React web app, not a native Android/iOS app.
