## Learningapp Backend – Quick Start

Short guide to run the backend locally, including Drizzle (migrations) and Docker (Postgres).

### Prerequisites

- Node.js 18+ and npm
- Docker Desktop (for the Postgres container)
- A `.env` file (do not commit!) with at least:

## 1) Start the database with Docker

This project ships with a `docker-compose.yml` that runs Postgres on port 5433 (to avoid clashing with a local 5432).

```powershell
cd c:\Users\michi\Projects\learningapp-backend
docker compose up -d
```

Check that the database is running:

```powershell
docker ps --filter "name=learningapp-postgres"
```

Your `.env` `DATABASE_URL` should point to `localhost:5433` as in the example above.

---

## 2) Install dependencies

```powershell
cd c:\Users\michi\Projects\learningapp-backend
npm install
```

---

## 3) Drizzle config and migrations

- Config: `drizzle.config.ts` uses `DATABASE_URL` from your `.env`.
- Migrations folder: `./drizzle`

Option A – run existing migrations:

```powershell
npm run migrate
```

Option B – push schema (create/update migrations based on schema) and then run them:

```powershell
npm run db:push
npm run migrate
```

Open Drizzle Studio (GUI):

```powershell
npm run db:studio
```

---

## 4) Start the backend (dev)

```powershell
npm run dev
```

The server starts with Fastify on `http://0.0.0.0:3000` (locally: `http://localhost:3000`).

Endpoints (examples):

- POST `/explain`
- POST `/language`
- POST `/translate`
- POST `/tts`

---

## 5) Troubleshooting

- Database connection error: ensure the Docker container is running and `DATABASE_URL` is correct (host `localhost`, port `5433`).
- Migrations failing: clean up any odd `./drizzle` state and restart Docker; check permissions.
- OpenAI/Azure keys: ensure they are present in `.env` and not empty. Restart the server after changes.
- Port already in use: check which processes are using 3000/5433 and stop them, or change the ports.

---

## 6) Security

- Never commit `.env` or secrets. Use `.gitignore` (already present), run `git rm --cached .env` if it was accidentally committed, and rotate keys if exposed.
