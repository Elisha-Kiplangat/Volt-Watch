# Power Surge Monitor

Real-time power supply monitoring application with a React/Vite frontend, NestJS REST/WebSocket backend, PostgreSQL, and Prisma ORM.

## Requirements

- Node.js 20 or newer and npm
- A PostgreSQL database
- Network access to install npm dependencies

No Docker, broker deployment, CI/CD, or device firmware is included.

## Configure

Copy `frontend/.env.example` to `frontend/.env.local` and `backend/.env.example` to `backend/.env`. Set a real PostgreSQL URL and unique JWT secrets in the backend environment. For Neon, use the direct connection URL for migrations; seeding uses `DIRECT_URL` when provided and otherwise falls back to `DATABASE_URL`. Do not commit environment files.

For example, generate independent secrets with:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Set `JWT_SECRET` and `JWT_REFRESH_SECRET` to separate generated values. To seed accounts, set `SEED_SUPER_ADMIN_EMAIL` / `SEED_SUPER_ADMIN_PASSWORD`, `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`, and `SEED_OPERATOR_EMAIL` / `SEED_OPERATOR_PASSWORD` in the backend environment; passwords must be 12-72 characters. Optional `*_NAME` variables customize account names. `SEED_ADMIN_INSTITUTION` and `SEED_OPERATOR_INSTITUTION` customize their institution; both default to `Example Institution`. The existing `INITIAL_ADMIN_EMAIL` / `INITIAL_ADMIN_PASSWORD` variables remain supported as a SUPER_ADMIN fallback. Public operator registration requires an institution and admin approval.

## Install and run

Install each app independently:

```powershell
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npm run prisma:seed
npm run start:dev
```

In another terminal:

```powershell
cd frontend
npm install
npm run dev
```

The frontend is served by Vite (normally `http://localhost:5173`). Swagger UI is available at `http://localhost:3000/api/docs`.

To create a migration during local schema development, use `npm run prisma:migrate` with PostgreSQL available. Demo device and telemetry seed data is created only when `DEMO_MODE=true`. It creates `ESP32-SIM-001`, stores source-labelled SIMULATED readings, and leaves connectivity OFFLINE and protection UNKNOWN. It does not represent live measurements or protection operation. Configured seed users are created independently of demo mode. Administrators may submit individual simulated readings through `POST /api/v1/telemetry/simulate`; the endpoint is disabled outside non-production demo mode.

## Structure

- `frontend/src/components`: shared layout, dashboard, charts, and table/status controls
- `frontend/src/pages`: auth, dashboard, monitoring, devices, events, alerts, analytics, reports, and settings views
- `frontend/src/services`, `hooks`, `context`, `routes`, `types`: API client, TanStack Query, session state, routing, and domain contracts
- `backend/src`: Nest modules for auth, users, devices, telemetry, events, alerts, protection, reports, dashboard, notifications, MQTT message processing, and WebSockets
- `backend/prisma`: PostgreSQL schema, migrations, and seed script
- `docs`: architecture, API, and database notes

## Implemented foundation

Authentication uses bcrypt, 15-minute JWT access tokens, hashed/rotating refresh tokens, guarded routes, and role checks. Device management and configuration, telemetry persistence, dashboard aggregates, event deduplication, alert creation/acknowledgement/resolution, notification reads, protection history, report summary persistence, and authenticated WebSocket broadcasting are implemented in the backend. The frontend consumes persisted API data, separates DEVICE and SIMULATED chart series, and shows explicit loading, empty, and API error states.

The MQTT module currently provides transport-independent message validation/processing only; no broker client or subscription is started. WebSocket updates are broadcast only after the corresponding database writes commit. Protection state remains device-reported; voltage samples do not automatically trip or reset protection.

## Institution-based access

- A SUPER_ADMIN creates administrators and provides an institution name. Reusing an institution name assigns another admin to that institution.
- Operators select an existing institution when registering. Their account remains pending until an administrator in that institution approves it; pending operators receive no login session and cannot access the dashboard.
- Admins and operators see devices and monitoring data for their institution. Admin-created devices inherit that institution. SUPER_ADMIN sees devices grouped by institution and can assign migrated, unassigned devices and users.
- Existing devices remain unassigned by the migration and are visible only to SUPER_ADMIN until assigned. Existing non-super-admin users without an institution must be assigned by a super admin or reseeded with an institution before they can sign in.
- Tenant scoping is enforced in API queries and WebSocket rooms as well as in the frontend.

## Checks

```powershell
cd backend
npm test
npm run build
npx prisma validate
```

```powershell
cd frontend
npm run build
npm run lint
```

Database migrations and database-backed integration require a configured PostgreSQL database and should be applied with `npx prisma migrate deploy` before starting the updated backend.
