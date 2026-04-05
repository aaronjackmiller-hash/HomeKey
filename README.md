# HomeKey — Israeli Real Estate MLS (Beta)

A full-stack MLS application for the Israeli real estate market built with React, Node/Express, and MongoDB.

---

## 🚀 Deploy the Beta Site (Free — ~5 minutes)

### Step 1 — Free database (MongoDB Atlas)

1. Go to **https://cloud.mongodb.com** and create a free account.
2. Click **Build a Database → Free (M0 Sandbox)** → choose any cloud region → Create.
3. Create a database user (remember the username and password).
4. Under **Network Access**, click **Add IP Address → Allow Access from Anywhere** (0.0.0.0/0).
5. Click **Connect → Connect your application** and copy the connection string. It looks like:
   ```
   mongodb+srv://YOUR_USER:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/homekey?retryWrites=true&w=majority
   ```

### Step 2 — Deploy to Render (free hosting)

1. Go to **https://render.com** and sign up / log in with your GitHub account.
2. Click **New → Blueprint**.
3. Connect this GitHub repository (`aaronjackmiller-hash/HomeKey`).
4. Render will detect the `render.yaml` file and create the **homekey** service automatically.
5. Before clicking **Apply**, set the `MONGODB_URI` environment variable to the connection string you copied in Step 1.
6. Click **Apply**. Render will build and deploy the site (takes about 3–5 minutes).
7. Your beta site will be live at a URL like `https://homekey.onrender.com`.

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