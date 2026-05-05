# HomeKey — Development Guide

## Cursor Cloud specific instructions

### Architecture overview

HomeKey is a monorepo with two services:
- **Backend** (`/backend`): Express.js API on port 5000 with MongoDB (Mongoose 6)
- **Frontend** (`/frontend`): React 17 SPA (Create React App 4) on port 3000, proxies `/api` to backend

### Prerequisites (already installed in cloud VM)

- Node.js 18
- MongoDB 6.0

### Starting services

1. **MongoDB**: `mkdir -p /data/db && mongod --dbpath /data/db --fork --logpath /var/log/mongod.log`
2. **Backend**: `cd /workspace/backend && node server.js` (port 5000)
3. **Frontend**: `cd /workspace/frontend && PORT=3000 BROWSER=none NODE_OPTIONS=--openssl-legacy-provider npm start` (port 3000)

### Important gotchas

- **MongoDB URI must use `127.0.0.1`** instead of `localhost` in the `.env` file. Node.js 18 resolves `localhost` to IPv6 `::1` but MongoDB binds to IPv4 only. Using `localhost` causes `ECONNREFUSED ::1:27017`.
- **Frontend requires `NODE_OPTIONS=--openssl-legacy-provider`** because react-scripts 4 uses an OpenSSL hash algorithm removed in Node 17+. Both dev and build commands need this flag.
- The backend `.env` file is at `/workspace/backend/.env`. Copy from `.env.example` and set `MONGODB_URI=mongodb://127.0.0.1:27017/homekey`. See `backend/.env.example` for all available variables.
- Set `YAD2_SYNC_ENABLED=false` and `LISTING_LIFECYCLE_ENABLED=false` in `.env` to avoid background workers during local dev/testing.
- The backend auto-seeds demo data (8 properties + 1 agent account) on first startup if the DB is empty. Seed agent credentials are printed in server logs.
- The frontend `package.json` has `"proxy": "http://localhost:5000"` so API calls from the React dev server are proxied to the backend.

### Key commands

| Action | Command |
|--------|---------|
| Install all deps | `npm ci --prefix backend && npm ci --prefix frontend` |
| Backend dev | `cd backend && node server.js` |
| Frontend dev | `cd frontend && PORT=3000 BROWSER=none NODE_OPTIONS=--openssl-legacy-provider npm start` |
| Frontend build | `NODE_OPTIONS="--openssl-legacy-provider --max-old-space-size=384" CI=false npm run build --prefix frontend` |
| Health check | `curl http://localhost:5000/api/health` |
| Run seed manually | `cd backend && node seed.js` |

### Testing

There are no automated test files in this codebase. The frontend `package.json` includes `react-scripts test` but no test files exist. Manual API/browser testing is the primary verification method.

### API quick reference

See `README.md` for the full endpoint list. Key endpoints:
- `POST /api/auth/register` — register user
- `POST /api/auth/login` — login (returns JWT)
- `GET /api/properties` — list all properties
- `POST /api/properties` — create listing (auth required, type must be `"sale"` or `"rental"`)
- `GET /api/health` — health check (`{"status":"ok","db":"connected"}` when healthy)
