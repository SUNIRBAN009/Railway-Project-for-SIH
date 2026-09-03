# Deep Dive Logs & QA (Phase 4)

> **Phase 4 Overview**  
> This directory contains detailed technical specifications, error handling strategies, and quality assurance plans. While the previous phases defined *what* we are building and *how* it connects, this phase defines the *edge cases* and how we prove the system works.

## Directory Structure

### Deep Dive Logs (`/05-deep-dive-logs/`)
- `00-readme.md`: This file.
- `01-common-payloads-and-algorithms.md`: Standard JSON schemas used across the API and the core logic for conflict detection.
- `02-error-code-registry.md`: Standardized HTTP error codes and internal application error codes.
- `03-state-management.md`: Frontend Zustand store definitions and Backend state machine (Block Status lifecycle).
- `04-bug-log-template.md`: Template for reporting bugs during QA and the Hackathon.
- `05-contracts-registry.md`: Documentation of external API contracts (Twilio, Gemini, Mapbox).
- `06-adrs-registry.md`: Architecture Decision Records (ADRs) explaining *why* certain technologies were chosen.

### Testing & QA (`/06-testing-qa/`)
- `00-test-plan.md`: The overarching QA strategy.
- `01-e2e-scenarios.md`: Step-by-step UI flows for manual testing.
- `02-load-test-strategy.md`: Plans for ensuring the app survives the demo.
- `03-data-seeding.md`: Scripts and data used to populate the DB for testing.
