# Database Notes

The PostgreSQL schema is defined in `backend/prisma/schema.prisma`; ordered SQL migrations live in `backend/prisma/migrations`. Measurements use `DECIMAL` columns, timestamps are stored as UTC `TIMESTAMP(3)`, and common device/time, alert-state, and audit queries are indexed.

## Institutions and approval

- Users and devices may belong to an institution. SUPER_ADMIN accounts are global; ADMIN and OPERATOR access is filtered to the institution in their signed-in identity.
- New operator registrations are created with `PENDING` approval and receive no session tokens. Institution admins approve them before login is enabled.
- The institution and device association fields are nullable for existing records. Devices without an institution remain visible only to SUPER_ADMIN until assigned.
- The migration marks existing users `APPROVED` to avoid changing their account state, but existing non-super-admin users without an institution cannot sign in until a super admin assigns one or they are assigned through seeding.

## Relationships and retention

- A device owns readings, events, protection logs, alerts, and one current versioned configuration. Deactivating a device is a soft delete; it preserves history.
- Sensor readings and device-owned event/protection history cascade only on an explicit hard delete of the device. Production retention/archival policy remains an operational decision and is not automated by this phase.
- Alerts retain event history; deleting a referenced event sets the alert event reference to null.
- User refresh tokens and notifications cascade on user deletion. Acknowledgement, assignment, and audit references are set null on user deletion; report ownership is restricted.
- Audit log records are append-only by application convention; no UI exposes destructive audit operations.

`SIMULATED` and `DEVICE` readings share the same numeric table but retain a required source discriminator. Do not query or chart them as one indistinguishable series.
