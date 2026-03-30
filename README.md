# HomeKey 🏠

**HomeKey** is a Beta MLS (Multiple Listing Service) application for Israeli real estate. Browse, search, and add property listings with full Israeli real estate details including Mamad, Vaad Bayit, Arnona (city taxes), and parking.

---

## Features

- 📋 Browse rental and for-sale property listings
- 🏘 Filter by rental / for sale
- 🔍 View detailed property information (size, floor, elevator, Mamad, condition, pets, parking)
- 💰 Financial breakdown (total monthly payment, Vaad Bayit, city taxes)
- ➕ Add your own property listings via a comprehensive form
- 🌱 Pre-loaded with 8 sample Israeli properties

---

## Tech Stack

| Layer    | Technology                    |
|----------|-------------------------------|
| Frontend | React 18, React Router, Axios |
| Backend  | Node.js, Express 4            |
| Database | MongoDB + Mongoose            |
| Deploy   | Docker Compose                |

---

## Quick Start

### Prerequisites
- Node.js 16+
- MongoDB (local or Docker)

### 1. Clone & configure

```bash
git clone https://github.com/aaronjackmiller-hash/HomeKey.git
cd HomeKey
```

Create `backend/.env` from the example:
```bash
cp backend/.env.example backend/.env
```

### 2. Install backend dependencies & seed database

```bash
cd backend
npm install
npm run seed        # Populates DB with 8 sample properties
npm run dev         # Starts backend on http://localhost:5000
```

### 3. Install frontend dependencies & start

```bash
cd ../frontend
npm install
npm start           # Starts React app on http://localhost:3000
```

---

## Docker Compose (Full Stack)

Runs MongoDB + backend + frontend together:

```bash
docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api

> **Note:** The seed script must be run manually after first start:
> ```bash
> docker-compose exec backend npm run seed
> ```

---

## API Endpoints

| Method | Endpoint              | Description              |
|--------|-----------------------|--------------------------|
| GET    | `/api/properties`     | List all properties      |
| GET    | `/api/properties/:id` | Get single property      |
| POST   | `/api/properties`     | Create new property      |
| GET    | `/api/agents`         | List all agents          |
| GET    | `/api/health`         | Health check             |

### Example: Create a property

```json
POST /api/properties
{
  "address": "Dizengoff Street 42",
  "city": "Tel Aviv",
  "price": 8500,
  "propertyType": "rental",
  "bedrooms": 3,
  "bathrooms": 2,
  "size": 95,
  "floorNumber": 4,
  "elevator": true,
  "mamad": true,
  "propertyCondition": "excellent",
  "petsAllowed": false,
  "parking": "1 underground spot included",
  "totalMonthlyPayment": 9650,
  "vaadAmount": 650,
  "cityTaxes": 500,
  "moveInDate": "2024-09-01",
  "entryDate": "2024-08-15",
  "description": "Stunning apartment in the heart of Tel Aviv!",
  "images": ["https://example.com/image.jpg"]
}
```

---

## Environment Variables

| Variable    | Default                              | Description          |
|-------------|--------------------------------------|----------------------|
| `MONGO_URI` | `mongodb://localhost:27017/homekey`  | MongoDB connection   |
| `PORT`      | `5000`                               | Backend server port  |

Frontend environment variables (prefix with `REACT_APP_`):

| Variable           | Default                  | Description     |
|--------------------|--------------------------|-----------------|
| `REACT_APP_API_URL`| `http://localhost:5000/api` | Backend URL  |

---

## Project Structure

```
HomeKey/
├── backend/
│   ├── models/
│   │   ├── Property.js     # Property schema
│   │   └── Agent.js        # Agent schema
│   ├── routes/
│   │   ├── properties.js   # Property API routes
│   │   └── agents.js       # Agent API routes
│   ├── seed.js             # Database seed script
│   ├── server.js           # Express app
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── PropertyList.js    # Browse listings
│   │   │   ├── PropertyDetail.js  # Single property view
│   │   │   └── AddListing.js      # Add new listing form
│   │   ├── services/
│   │   │   └── api.js             # Axios API calls
│   │   ├── App.js                 # Router & layout
│   │   └── App.css                # Styles
│   └── package.json
├── docker-compose.yml
└── README.md
```
