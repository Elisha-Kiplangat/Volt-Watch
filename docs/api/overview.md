# API Overview

Base path: `/api/v1`. Except registration/login/refresh, routes require `Authorization: Bearer <access-token>`. Request DTOs are transformed and validated; unknown fields are rejected. Swagger is served at `/api/docs`.

| Area | Routes | Access |
|---|---|---|
| Auth | `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`; `GET /auth/me`, `/auth/institutions` | Registration requests OPERATOR access and returns pending status; institutions list is public; `/me` authenticated |
| Users | `GET /users`, `GET /users/:id`, `PATCH /users/:id`, `DELETE /users/:id`, `POST /users/admins` | SUPER_ADMIN |
| Operator approvals | `GET /users/pending-operators`, `PATCH /users/:id/approve` | ADMIN for own institution; SUPER_ADMIN across institutions |
| Devices | `GET /devices`, `POST /devices`, `GET /devices/:id`, `PATCH /devices/:id`, `DELETE /devices/:id`, `PATCH /devices/:id/institution` | Authenticated reads; ADMIN/SUPER_ADMIN writes; institution reassignment is SUPER_ADMIN-only |
| Device data | `GET /devices/:id/telemetry`, `GET /devices/:id/configuration`, `PATCH /devices/:id/configuration` | Authenticated reads; ADMIN/SUPER_ADMIN config writes |
| Telemetry | `POST /telemetry`, `POST /telemetry/simulate`, `GET /telemetry` | ADMIN/SUPER_ADMIN; simulation is non-production and DEMO_MODE-only |
| Events | `GET /events`, `GET /events/:id`, `POST /events` | Authenticated reads; ADMIN/SUPER_ADMIN writes |
| Alerts | `GET /alerts`, `GET /alerts/:id`, `PATCH /alerts/:id/acknowledge`, `/resolve`, `/assign` | Role restrictions enforced in controller/service |
| Protection | `GET /protection/:deviceId`, `GET /protection/:deviceId/history` | Authenticated, read-only |
| Dashboard | `GET /dashboard/summary`, `GET /dashboard/analytics` | Authenticated |
| Reports | `POST /reports/generate`, `GET /reports`, `GET /reports/:id` | Authenticated |
| Notifications | `GET /notifications`, `PATCH /notifications/:id/read` | Authenticated, scoped to current user |

Socket.IO namespace `/monitoring` requires an access token in the connection auth payload. Events include `telemetry:update`, `device:status`, `event:created`, `surge:detected`, `alert:created`, and `alert:updated`.

List endpoints accept pagination/filter query parameters where implemented. API response envelopes use `{ "data": ... }`; paginated resources use `{ "data": { "items": [], "total": 0, "page": 1, "pageSize": 25 } }`.

ADMIN and OPERATOR device data is restricted to their assigned institution, including dashboard aggregates, readings, events, alerts, reports, and protection history. SUPER_ADMIN access is cross-institution. Devices created by an admin inherit that admin's institution; legacy devices without an institution are visible only to SUPER_ADMIN until assigned. Newly registered operators cannot log in or obtain tokens until an administrator in their selected institution approves them.
