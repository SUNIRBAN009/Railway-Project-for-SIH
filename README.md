# Railway AI Block Planning Platform (PS 26027)

## 1. How to Set Up the Project on a New System (Step-by-Step)
To set up this project on a brand new machine, you do not need to manually install Python, PostgreSQL, Redis, or Node.js. Everything is containerized using Docker, making the setup completely automated.

**Step 1:** Install [Docker Desktop](https://www.docker.com/products/docker-desktop) and ensure the Docker Engine is running.
**Step 2:** Install [Git](https://git-scm.com/downloads) (if not already installed).
**Step 3:** Open your terminal (or Command Prompt / PowerShell) and clone the repository:
```bash
git clone https://github.com/YOUR_USERNAME/railway-ai-block-platform.git
cd railway-ai-block-platform
```
**Step 4:** Run the single startup script to build and configure the entire environment automatically.
* **For Windows (PowerShell):**
  ```powershell
  .\scripts\start.ps1
  ```
  *(Alternatively, you can just double-click `scripts\start.bat` in File Explorer.)*
* **For Linux / Mac (Bash):**
  ```bash
  chmod +x scripts/start.sh scripts/init_postgres.sh
  ./scripts/start.sh
  ```

The script will automatically create the `.env` file, build the Docker images, start all containers, and create the default admin user.

---

## 2. How to Run the Project (Single Command)
Whenever you want to start the project for development or to use it, you only need to run a single command from the project root. This command will start all the required services (Frontend, Backend, Database, Cache, and Celery Workers).

* **Windows (PowerShell):**
  ```powershell
  .\scripts\start.ps1
  ```
  *(If PowerShell blocks script execution, run with bypass: `powershell -ExecutionPolicy Bypass -File .\scripts\start.ps1` or run `.\scripts\start.bat`)*
* **Linux / Mac (Bash):**
  ```bash
  ./scripts/start.sh
  ```

Once the command completes and the services are healthy, you can access the platform at the following URLs:

* **Frontend UI (React):** http://localhost:3000
* **Backend API (Django):** http://localhost:8000
* **Django Admin:** http://localhost:8000/admin/ (Credentials: Username `admin` / Password `admin123`)
* **API Documentation (Swagger):** http://localhost:8000/api/docs/
* **WebSocket Server:** ws://localhost:8001/ws/

To stop the project, simply run `docker-compose down` in your terminal.

---

## Project Architecture & Tech Stack
This is a unified platform integrating Engineering (TMS), Traction Distribution (TDMS), and Signal & Telecom (SMMS) departments for intelligent block scheduling.

- **Backend Core:** Python 3.11 + Django 5.0 + Django REST Framework (DRF)
- **Database:** PostgreSQL 15 + PostGIS 3.3 (SRID 4326 Spatial Track Engine)
- **Cache & Real-time:** Redis 7.2, Django Channels 4.0 + Daphne ASGI (WebSockets)
- **Background Tasks:** Celery 5.3 (Multi-tier Task Queues)
- **Frontend SPA (Phase 7):** React 18 + Vite 5.0, Tailwind CSS 3.4, Mapbox GL JS 2.15, Zustand, TanStack Query
- **Semantic Digital Twin:** Owlready2 + HermiT Reasoner
- **Security:** Argon2id Password Hashing + RS256/HMAC JWT Authentication

> **Note:** For a complete checklist of the implementation progress across all phases, please refer to the Master Engineering Execution Tracker at [`docs/09-execution-tracker/00-implementation-checklist.md`](./docs/09-execution-tracker/00-implementation-checklist.md).
