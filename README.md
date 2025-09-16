# Trajectorie — VIBE (Production)

A multi-tenant assessment platform for SJT (Situational Judgement Test) and JDT (Job Discussion Test) with role-based access, live statistics, competency dictionaries, progressive upload, and multilingual delivery.

This repository contains the production application used to administer, analyze, and manage assessments, and a legacy codebase preserved for reference. The production stack is FastAPI + SQLite/Postgres (backend) and Next.js App Router (frontend), with optional Firebase/Genkit integrations.

---

## Quick Start

- Requirements
  - Windows, macOS, or Linux
  - Node.js 18+ and npm
  - Python 3.10+

- Environment
  - Backend: copy `.env.example` to `.env` (see Configuration), or set env vars in your shell
  - Frontend: set `NEXT_PUBLIC_API_URL` to the backend base URL (e.g., `http://127.0.0.1:8000`)

- Run (Dev)
  1) Backend
  ```powershell
  cd .\trajectorie_production\backend
  python -m venv .venv
  .\.venv\Scripts\activate
  pip install -r requirements.txt
  python .\main.py
  ```
  - Server: http://127.0.0.1:8000
  - Docs: http://127.0.0.1:8000/docs

  2) Frontend
  ```powershell
  cd .\trajectorie_production\frontend
  npm install
  npm run dev
  ```
  - App: http://localhost:3000 (dev)

- Run (Production-like)
  ```powershell
  # Backend (no auto-reload)
  cd .\trajectorie_production\backend
  .\.venv\Scripts\activate
  uvicorn main:app --host 127.0.0.1 --port 8000 --log-level info

  # Frontend
  cd .\trajectorie_production\frontend
  npm run build
  npm run start -- -p 3001
  ```

---

## Repository Layout

```
trajectorie_production/
  backend/            # FastAPI service
  frontend/           # Next.js App Router app
  .gitignore
  README.md
legacy_app/
  Trajectorie---VIBE/ # Historical code & docs (kept for reference)
uploads/              # Generated media (gitignored)
```

Key production subfolders:
- `backend/app/`
  - `models.py` — SQLAlchemy ORM + Pydantic schemas (Users, Tenants, Submissions, Competencies, etc.)
  - `api/` — versioned routers under `/api/v1` (tenants, submissions, configurations, statistics, competencies)
  - `db_migrations.py` — lightweight SQLite migrations executed on startup
  - `database.py` — SQLAlchemy engine/session, bootstrap and seed logic
  - `auth.py` — JWT auth, hashing, role guards; session fingerprinting
- `frontend/src/`
  - `app/` — App Router pages (login, admin, superadmin, test flows)
  - `components/` — UI building blocks (upload indicators, recorders, admin tables)
  - `lib/api-service.ts` — central API client with token handling

---

## Production App Overview

The production app is a multi-tenant platform with three roles:
- Superadmin
- Admin
- Candidate

### Core Features

1. Authentication & Sessions
   - JWT access + refresh tokens
   - Session storage hardened with fingerprint hashes
   - `GET /auth/me` for current user context

2. Tenants (Companies)
   - Endpoints under `/api/v1/tenants`
   - Create/update/delete (superadmin only)
   - `allowed_test_types` is stored as JSON text for SQLite compatibility and emitted as a string list in responses
   - `domain` was removed from the API to simplify provisioning

3. Competency Dictionary
   - CRUD under `/api/v1/competencies`
   - Unique `competency_code` enforced per tenant (case-insensitive)
   - Fields: `competency_code`, `competency_name`, `competency_description`, `meta_competency`, `translations`, `category`, `industry`, `role_category`, `is_active`
   - Removed scoring fields (`max_score`, `weight`)
   - Hard delete supported with `DELETE /api/v1/competencies/{code}?hard=true`

4. Submissions & Media
   - Submissions track assessments, language settings, analysis status, and media
   - Media files stored locally in `uploads/` by default (or other providers)

5. Configurations & Statistics
   - Configs under `/api/v1/configurations` with safe 404 handling for global config
   - Live statistics endpoint for superadmin overview

6. Multilingual & UI
   - Next.js with App Router
   - TailwindCSS for styling
   - i18next for localization

### Environment Variables

Backend (`trajectorie_production/backend/.env`):
- `ENVIRONMENT=production|development`
- `DATABASE_URL` (optional; defaults to SQLite) examples:
  - SQLite: `sqlite:///./trajectorie.db`
  - Postgres: `postgresql+psycopg2://user:pass@host:5432/dbname`
- `JWT_SECRET`, `JWT_ALGORITHM=HS256`, `ACCESS_TOKEN_EXPIRE_MINUTES=60`
- `REFRESH_TOKEN_EXPIRE_DAYS=7`
- `ALLOW_PUBLIC_REGISTRATION=false`
- `STORAGE_PROVIDER=local` (or `s3`, `firebase`)
- `STORAGE_PATH=./uploads`

Frontend (`trajectorie_production/frontend/.env.local`):
- `NEXT_PUBLIC_API_URL=http://127.0.0.1:8000`

### Database

- Default dev DB is SQLite. For production, use Postgres via `DATABASE_URL`.
- Startup runs lightweight migrations (`app/db_migrations.py`). Current migration ensures the competencies table has `competency_code` and a composite unique index with `tenant_id` for per-tenant uniqueness.
- For complex upgrades, consider Alembic migrations.

### Security & Roles

- Backend dependencies enforce roles: `require_superadmin`, `require_admin`, `get_current_active_user`.
- Frontend protects routes with guards and redirects.

### Build & Deploy

- Backend
  - Build container: multi-stage Dockerfile (TBD) or run with `uvicorn`
  - Health probe: `GET /health`
  - Observability: logs via standard output; integrable with any collector

- Frontend
  - Static build: `npm run build`
  - Start: `npm run start -p 3001`
  - Configure reverse proxy to route `/api` to backend

- Media
  - Ensure persistent volume for `uploads/` in production

---

## Local Development Tips

- Prefer running backend without reload during schema migration testing to avoid file watchers racing with SQLite locks
- Confirm `NEXT_PUBLIC_API_URL` matches your backend URL
- If you see `sqlite3.OperationalError` for missing columns, restart backend to re-run startup migration
- If tenant creation fails with `Error binding parameter ... type 'list' is not supported`, make sure you’re on the updated API that JSON-serializes `allowed_test_types`
- For 409 during competency creation, ensure `competency_code` is unique within your tenant; codes are compared case-insensitively

---

## Legacy App (Overview)

The `legacy_app/Trajectorie---VIBE/` folder contains the earlier Next.js-based prototype and extensive documentation:
- Docs under `docs/` and `src/ARCHITECTURE.md`
- Experimental flows under `src/ai/` (Genkit)
- Early admin and test pages under `src/app/`

We preserve this for:
- Architecture reference (blueprints, storage flows)
- Content and UI patterns
- Gradual migration of useful components

The production app absorbs these ideas with a hardened API, tenant scoping, and consistent types.

---

## Troubleshooting

- Login 422 / client exceptions
  - Ensure frontend sends JSON `{ email, password }`
  - Verify `AuthContext` is initialized and `apiService` refresh logic is in place

- 401 on `/auth/me`
  - Access token expired or not sent; check localStorage and Authorization header

- Tenants create 500 (list binding)
  - You’re likely on an older build; backend now serializes `allowed_test_types` to JSON

- Competency create 409
  - Duplicate `competency_code` within the same tenant; codes are normalized and compared case-insensitively

- Global config 404
  - Handled gracefully by frontend; not an error, indicates missing global overrides

---

## Roadmap

- Formal Alembic migrations
- Postgres-first deployment manifest and Dockerfiles
- Additional test types and templating
- Advanced analytics and dashboards
- S3/GCS media storage providers

---

## License

Proprietary — All rights reserved.
