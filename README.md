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