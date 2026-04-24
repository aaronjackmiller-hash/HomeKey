# Deployment Guide — Render + MongoDB Atlas

## Prerequisites

- A [Render](https://render.com) account (Starter plan or higher — free tier sleeps and drops DB connections)
- A [MongoDB Atlas](https://cloud.mongodb.com) account with a cluster

---

## 0. Render service settings (Build & Start commands)

**If you created the service via the render.yaml Blueprint**, these are already set for you. Skip to step 1.

**If you created the service manually** in the Render dashboard, set:

| Field | Value |
|---|---|
| **Build Command** | `npm run render-build` |
| **Start Command** | `node backend/server.js` |

> The `render-build` script (in the root `package.json`) installs dependencies, builds the React frontend with the correct memory flags, verifies the build output exists, and then installs backend dependencies. Using any other build command will leave the frontend unbuilt and cause a startup error.

---

## 1. Get the correct MongoDB connection string

Atlas's **Connect** dialog gives you a string that looks like this:

```
mongodb+srv://<username>:<password>@cluster0.XXXXX.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
```

**Two things must be fixed before you use it:**

| Problem | Fix |
|---|---|
| `<username>` / `<password>` are literal placeholders | Replace with your real Atlas database user credentials |
| No database name between `.net/` and `?` | Insert `/homekey` so Mongoose connects to the right database |

Correct result:

```
mongodb+srv://myuser:mypassword@cluster0.XXXXX.mongodb.net/homekey?retryWrites=true&w=majority&appName=Cluster0
```

If your Atlas user was created in the default admin auth DB, add `authSource=admin`:

```
mongodb+srv://myuser:mypassword@cluster0.XXXXX.mongodb.net/homekey?retryWrites=true&w=majority&authSource=admin&appName=Cluster0
```

> **Password contains `@`, `#`, `!`, `%`, or other special characters?**  
> URL-encode them before pasting: `p@ss` → `p%40ss`, `p#ss` → `p%23ss`

---

## 2. Allow connections from Render (Atlas IP whitelist)

Render's outbound IPs change dynamically, so you must allow all IPs:

1. In Atlas, go to **Network Access** → **IP Access List**
2. Click **Add IP Address** → **Allow Access from Anywhere** → `0.0.0.0/0`
3. Click **Confirm**

> This is the most common reason a service works locally but fails on Render.

---

## 3. Set environment variables in Render

In your Render service → **Environment** tab, add:

| Key | Value |
|---|---|
| `MONGODB_URI` | The corrected URI from step 1 |
| `JWT_SECRET` | A long random string (use a password manager to generate one) |
| `JWT_EXPIRES_IN` | `7d` |
| `NODE_ENV` | `production` |

After saving, Render will automatically redeploy your service.

---

## 4. Verify the connection

Once the deploy finishes, visit:

```
https://YOUR-RENDER-URL.onrender.com/api/health
```

| Response | Meaning |
|---|---|
| `{"status":"ok","db":"connected"}` | ✅ Everything is working |
| `{"status":"degraded","db":"connecting"}` | ⏳ Still connecting — wait 10–15 s and refresh |
| `{"status":"degraded","db":"disconnected"}` | ❌ URI wrong or IP not whitelisted — check steps 1–2 |

---

## 5. Common errors in Render logs

Open your Render service → **Logs** tab and look for:

| Log message | Cause | Fix |
|---|---|---|
| `ERROR: frontend/build/index.html not found` | Build Command was wrong or build was OOM-killed | Set Build Command to `npm run render-build` (see step 0) and redeploy |
| `ENOENT: no such file or directory, stat '.../frontend/build/index.html'` | Same as above — old server code without the startup check | Set Build Command to `npm run render-build` and redeploy from the latest commit |
| `WARNING: MONGODB_URI is not set` | Env var missing in Render | Add `MONGODB_URI` in the Environment tab |
| `MongoServerError: bad auth` | Wrong username or password | Re-check Atlas database user credentials |
| `MongoServerError: Authentication failed` | Atlas auth DB mismatch (`authSource`) or wrong credentials | Add `authSource=admin` to `MONGODB_URI`; if it still fails, reset Atlas DB user password and update Render |
| `MongooseServerSelectionError: connection timed out` | IP not whitelisted | Add `0.0.0.0/0` in Atlas Network Access |
| `MongoDB connected` | ✅ No action needed | — |

---

## 6. Manually trigger the seed (if properties are missing)

On first start the server auto-seeds the database when it is empty. If the database is still
empty after the service is running (e.g. seeding failed silently during a cold-start), you can
trigger it manually without redeploying:

1. In the Render dashboard, go to your service → **Environment** tab and copy the value of `ADMIN_SECRET`.
2. Run:

```bash
curl -X POST https://YOUR-RENDER-URL.onrender.com/api/admin/seed \
  -H "X-Admin-Secret: <ADMIN_SECRET value>"
```

Expected success response:

```json
{ "success": true, "message": "Seed completed (force=false)." }
```

To **drop existing seed data and re-seed** from scratch, add `{"force":true}` to the body:

```bash
curl -X POST https://YOUR-RENDER-URL.onrender.com/api/admin/seed \
  -H "X-Admin-Secret: <ADMIN_SECRET value>" \
  -H "Content-Type: application/json" \
  -d '{"force":true}'
```

> **Note:** `force=true` deletes all properties and the seed agent before re-inserting them.
> Do not use this if you have real listings you want to keep.
