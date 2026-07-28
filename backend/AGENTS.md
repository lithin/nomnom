# Backend (Express / Prisma / Neon Postgres)

The shared code-organization rules in the root `AGENTS.md` apply here too. This
file adds backend specifics.

- Each API endpoint lives in its own file under `src/endpoints/`.
- All data saved to the DB must have a corresponding Prisma schema. Prefer Prisma helper queries over raw queries where practical.
- When you change or add an endpoint, update the e2e mock server (`e2e/mock-server/server.mjs`) so its response shapes still mirror `backend/src/endpoints/*` — the two must move together (see `e2e/README.md`).
