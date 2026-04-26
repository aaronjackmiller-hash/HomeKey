# HomeKey — Israeli Real Estate MLS (Beta)

A full-stack MLS application for the Israeli real estate market built with React, Node/Express, and MongoDB.

---

## 🚀 Deploy the Beta Site (Free — ~5 minutes)

> **Seeing "Database is unavailable"?**  
> This means the `MONGODB_URI` environment variable is missing or incorrect in your Render service.  
> Follow the steps below to set it up. After saving the variable Render will redeploy automatically.

### Step 1 — Free database (MongoDB Atlas)

1. Go to **https://cloud.mongodb.com** and create a free account.
2. Click **Build a Database → Free (M0 Sandbox)** → choose any cloud region → Create.
3. Create a database user (remember the username and password).
4. Under **Network Access**, click **Add IP Address → Allow Access from Anywhere** (`0.0.0.0/0`).  
   ⚠️ This step is required — without it Render's IP addresses are blocked and the connection will fail.
5. Click **Connect → Connect your application** and copy the connection string. It looks like:
   ```
   mongodb+srv://YOUR_USER:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/homekey?retryWrites=true&w=majority
   ```
   Replace `YOUR_USER` and `YOUR_PASSWORD` with the credentials from step 3.

### Step 2 — Deploy to Render (free hosting)

1. Go to **https://render.com** and sign up / log in with your GitHub account.
2. Click **New → Blueprint**.
3. Connect this GitHub repository (`aaronjackmiller-hash/HomeKey`).
4. Render will detect the `render.yaml` file and create the **homekey** service automatically.
5. **Before clicking Apply**, set the `MONGODB_URI` environment variable to the connection string you copied in Step 1.  
   *(Render dashboard → your service → Environment → Add Environment Variable)*
6. Click **Apply**. Render will build and deploy the site (takes about 3–5 minutes).
7. Your beta site will be live at a URL like `https://homekey.onrender.com`.

> **Verify the connection:** visit `https://homekey.onrender.com/api/health` — it returns  
> `{"status":"ok","db":"connected"}` when everything is working, or  
> `{"status":"degraded","db":"disconnected"}` when `MONGODB_URI` is wrong.

> **Note:** On the free tier, the service spins down after 15 minutes of inactivity and takes ~30 seconds to wake back up on the next visit. Upgrading to the Starter plan ($7/month) keeps it always-on.
>
> **Auth configuration tip:** set `JWT_SECRET` in Render Environment for stable sign-in sessions across restarts.  
> If omitted, HomeKey now auto-generates a temporary in-memory JWT secret at startup so auth still works, but all sessions are invalidated on each restart/redeploy.

---

## 💻 Run Locally with Docker Compose

Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/).

```bash
git clone https://github.com/aaronjackmiller-hash/HomeKey.git
cd HomeKey
docker compose up --build
```

- Frontend: http://localhost
- Backend API: http://localhost:5000/api/health

---

## 💻 Run Locally without Docker

### Prerequisites
- Node.js 18+
- MongoDB running locally or a MongoDB Atlas connection string

### Backend
```bash
cd backend
cp .env.example .env       # then fill in MONGODB_URI and JWT_SECRET
npm install
npm start                  # runs on port 5000
```

### Frontend (development)
```bash
cd frontend
npm install
npm start                  # runs on port 3000
```

---

## 📁 Project Structure

```
HomeKey/
├── backend/               # Express API + MongoDB
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   └── server.js
├── frontend/              # React application
│   └── src/
│       ├── components/
│       ├── context/
│       └── services/
├── docker-compose.yml     # Local full-stack development
└── render.yaml            # One-click Render deployment
```

## 🔑 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/register | Register a new user |
| POST | /api/auth/login | Login |
| GET | /api/properties | List all properties |
| GET | /api/properties/:id | Get a single property |
| POST | /api/properties | Create a listing (auth required) |
| PUT | /api/properties/:id | Update a listing (auth required) |
| DELETE | /api/properties/:id | Delete a listing (auth required) |
| GET | /api/agents | List all agents |
| GET | /api/health | Health check |

---

## 📥 Import Yad2 listings (supports additional batches)

HomeKey supports an admin-protected Yad2 bulk import endpoint for both initial inventory and additional batches.

### 1) Configure import secret in Render

You can authorize Yad2 imports in either of these ways:

- **Preferred:** set `ADMIN_IMPORT_SECRET` and send it via `X-Admin-Import-Secret`
- **Fallback:** reuse your existing `ADMIN_SECRET` and send it via `X-Admin-Secret`

This fallback is useful when import-secret env updates are delayed but seed auth is already working.

### Batch behavior (important)

- Imports are **additive by default**: existing listings are not deleted.
- With `upsert: true` (default), rows with matching `externalId` + `sourceTag` are updated; non-matches are created.
- Use a stable `sourceTag` (for example `yad2`) when you want later files to update the same source set.
- Use a different `sourceTag` only if you intentionally want to track a separate feed namespace.

### 2) Prepare a Yad2 JSON file

Create a local file (for example `yad2-listings.json`) containing an array of listings.

Supported field aliases include:

- ID: `id`, `_id`, `ad_number`, `adNumber`, `listing_id`, `listingId`
- Title: `title`, `headline`
- Description: `description`, `details`
- Type: `type`, `dealType`, `deal_type` (`sale`/`sell`, `rent`/`rental`)
- Price: `price`, `priceNis`, `amount`
- Bedrooms: `rooms`, `bedrooms`
- Bathrooms: `bathrooms`, `bath`
- Size: `size`, `area`, `sqm`, `squareMeters`
- Floor: `floor`, `floorNumber`
- Address: `street`, `city`, `state`, `zip`, `country`
- Building details: `buildingName`, `buildingFloorCount`, `buildingApartmentCount`
- Financials: `totalMonthlyPayment`, `vaadAmount`, `cityTaxes`, `maintenanceFees`, `propertyTax`
- Dates: `availableFrom`, `listingDate`
- Images: `images` (array) or `image` / `listingImage`
- Listing URL: `url`, `listingUrl`
- Agent: `agentName`, `agentEmail`, `agentPhone`, `agency`

### 3) Import with PowerShell

```powershell
$headers = @{
  # Preferred header:
  # "X-Admin-Import-Secret" = "YOUR_ADMIN_IMPORT_SECRET"
  # Fallback header (if preferred one isn't active yet):
  "X-Admin-Secret" = "YOUR_ADMIN_SECRET"
  "Content-Type"   = "application/json"
}

$payload = @{
  sourceTag = "yad2"
  upsert = $true
  items = (Get-Content ".\yad2-listings.json" -Raw | ConvertFrom-Json)
} | ConvertTo-Json -Depth 20

Invoke-RestMethod -Method Post -Uri "https://YOUR-RENDER-URL.onrender.com/api/admin/import/yad2" -Headers $headers -Body $payload
```

### 4) Verify import

```powershell
(Invoke-RestMethod -Method Get -Uri "https://YOUR-RENDER-URL.onrender.com/api/properties").count
```

The import response includes `created`, `updated`, `skipped`, and row-level `errors` for troubleshooting.

### Optional: Import directly from the web app (no PowerShell)

After logging in as an `agent` or `admin`, open:

- `/admin/import-yad2`

From that screen you can:

- upload a JSON file (`items` array or raw array),
- set `sourceTag` and `upsert`,
- submit the import and see `created / updated / skipped` results.

This uses your logged-in bearer token, so you do not need to paste admin secrets into a terminal.

From the Import Yad2 screen, you can also click **Run Yad2 Sync Now** to trigger one immediate live-feed sync without using PowerShell.

### Curated Israeli Yad2 listings shown by default

On startup, HomeKey now upserts a curated Yad2-inspired Israeli listings set (both rentals and for-sale properties) into the listings collection. This keeps the listings page populated with realistic local inventory without manual import steps.

### Scheduled Yad2 sync (near real-time updates)

HomeKey now supports a built-in scheduled Yad2 sync worker that periodically fetches listing JSON and upserts it.

Configure these environment variables in Render:

- `YAD2_SYNC_ENABLED=true` (default true; set `false` to disable)
- `YAD2_SYNC_FEED_URL=https://...` (required for live feed sync)
- `YAD2_SYNC_INTERVAL_MINUTES=5` (minimum 5, max 180; lower = fresher data)
- `YAD2_SYNC_SOURCE_TAG=yad2-live-sync` (optional source namespace)
- `YAD2_SYNC_AUTH_HEADER_NAME` and `YAD2_SYNC_AUTH_HEADER_VALUE` (optional feed auth header pair)
- `YAD2_SYNC_PRUNE_MISSING=true` (optional; when true, removes listings that disappeared from current Yad2 feed for mirror behavior)

To make the beta site show only current live Yad2 feed listings, also set:

- `LIVE_YAD2_ONLY=true`

Manual trigger endpoint:

- `POST /api/admin/sync/yad2`
  - auth: `X-Admin-Import-Secret`, `X-Admin-Secret`, or agent/admin bearer token
  - response includes `fetched`, `created`, `updated`, and `skipped`

Status endpoint:

- `GET /api/admin/sync/yad2/status`
  - same auth requirements as the manual trigger endpoint
  - returns scheduler configuration + runtime state:
    - `enabled`, `sourceTag`, `syncMinutes`
    - `feedConfigured`, `lastRunAt`, `lastSuccessAt`, `lastError`
    - `lastResult` (`fetched`, `created`, `updated`, `skipped`, etc.)

UI observability:

- In **Import Yad2**, a new **Live Feed Sync Status** panel now shows:
  - whether the feed URL is configured
  - last run / last successful sync timestamps
  - last sync error reason (if any)
  - latest sync counts

### Password recovery

HomeKey now includes a built-in password reset flow:

- On Sign In, click **Forgot password?**
- Submit your account email
- Use the reset link returned by the API response (dev/beta mode) to set a new password

Endpoints:

- `POST /api/auth/forgot-password` with `{ "email": "user@example.com" }`
- `POST /api/auth/reset-password` with `{ "token": "...", "newPassword": "NewPass123!" }`

---

## Listing lifecycle, contact preferences, and showings

HomeKey now supports an end-to-end manual listing lifecycle workflow for user/agent-created listings:

- preferred contact channel per user/listing owner (`email`, `whatsapp`, or `phone`)
- thank-you notification when a manual listing is created
- expiry date support with auto-expire + reminder sweeps
- buyer/renter inquiries to listing owners
- showing schedule slots with attendee registration
- owner/agent engagement dashboard with inquiry and attendee lists

### New registration/contact fields

`POST /api/auth/register` accepts:

- `whatsapp` (optional)
- `preferredContactMethod` (`email` | `whatsapp` | `phone`, optional)

### Manual listing lifecycle behavior

When a user/agent creates a listing:

- `sourceType` is set to `manual`
- owner/contact details are stored on the listing
- expiry defaults are applied by role:
  - users/sellers default: `MANUAL_LISTING_USER_EXPIRY_DAYS` (default 30)
  - agents default: `MANUAL_LISTING_AGENT_EXPIRY_DAYS` (default 60)
- a thank-you notification is dispatched to the preferred contact channel

### Lifecycle sweep runner

Background sweep runner:

- auto-expires manual listings when `lifecycle.expiresAt` is reached (status → `inactive`)
- sends reminder notifications before expiry (`MANUAL_LISTING_REMINDER_WINDOW_DAYS`, default 3)
- hard-deletes long-expired inactive manual listings after grace period (`MANUAL_LISTING_DELETE_GRACE_DAYS`, default 30)

Environment variables:

- `LISTING_LIFECYCLE_ENABLED=true` (default true)
- `LISTING_LIFECYCLE_SWEEP_MINUTES=60` (minimum 5)
- `MANUAL_LISTING_USER_EXPIRY_DAYS=30`
- `MANUAL_LISTING_AGENT_EXPIRY_DAYS=60`
- `MANUAL_LISTING_REMINDER_WINDOW_DAYS=3`
- `MANUAL_LISTING_DELETE_GRACE_DAYS=30`

### New property APIs

- `POST /api/properties/:id/inquiries` (public)
  - submit buyer/renter questions with preferred contact method
- `POST /api/properties/:id/showings/:showingId/attendees` (public)
  - register for a showing slot
- `GET /api/properties/:id/engagement` (private, owner/agent/admin)
  - returns inquiries + showing attendee list

### Lifecycle admin APIs

- `POST /api/admin/lifecycle/run`
  - trigger lifecycle sweep manually
- `GET /api/admin/lifecycle/status`
  - view lifecycle runner status
  - auth: same as other admin sync endpoints (`X-Admin-Import-Secret`, `X-Admin-Secret`, or agent/admin bearer token)