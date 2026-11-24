# Power Surge Monitor

Real-time power supply monitoring application with a React/Vite frontend, NestJS REST/WebSocket backend, PostgreSQL, and Prisma ORM.


No Docker, broker deployment, CI/CD, or device firmware is included.


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
