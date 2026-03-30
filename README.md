# HomeKey — MLS Real Estate Platform

HomeKey is a full-stack MLS-style real estate application built with Node.js/Express (backend) and React (frontend), backed by MongoDB.

## Features

- Browse property listings with search and filter (city, price, bedrooms, status)
- View detailed property pages with image galleries and agent info
- Agent directory with profiles and associated listings
- RESTful API with full CRUD support for properties and agents
- Pagination on property listings

## Tech Stack

| Layer    | Technology                        |
|----------|-----------------------------------|
| Backend  | Node.js, Express, Mongoose        |
| Database | MongoDB                           |
| Frontend | React 17                          |
| Infra    | Docker, Docker Compose, Nginx     |

## Project Structure

```
HomeKey/
├── backend/
│   ├── models/
│   │   ├── Property.js       # Property listing schema
│   │   └── Agent.js          # Agent/User profile schema
│   ├── routes/
│   │   ├── properties.js     # CRUD endpoints for properties
│   │   └── agents.js         # Agent endpoints
│   ├── server.js             # Express app entry point
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── PropertyCard.js   # Property card component
│   │   │   ├── PropertyList.js   # Property grid with search
│   │   │   ├── PropertyDetail.js # Single property page
│   │   │   ├── AgentCard.js      # Agent profile card
│   │   │   ├── AgentList.js      # Agent directory
│   │   │   └── SearchBar.js      # Search/filter component
│   │   ├── utils/
│   │   │   └── api.js        # API service utility
│   │   ├── App.js            # Main app component
│   │   └── App.css           # Global styles
│   ├── index.js
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

## Getting Started

### Prerequisites

- Node.js v14+
- MongoDB (local or Atlas)
- Docker & Docker Compose (optional)

### Environment Setup

Copy the example environment file and fill in your values:

```bash
cp .env.example backend/.env
```

### Backend

```bash
cd backend
npm install
npm run dev   # uses nodemon for hot-reload
```

The API will be available at `http://localhost:5000`.

### Frontend

```bash
cd frontend
npm install
npm start
```

The app will be available at `http://localhost:3000`.

### Docker (full stack)

```bash
docker-compose up --build
```

## API Endpoints

### Properties

| Method | Endpoint               | Description                        |
|--------|------------------------|------------------------------------|
| GET    | /api/properties        | List all properties (paginated)    |
| GET    | /api/properties/:id    | Get a single property              |
| POST   | /api/properties        | Create a new property listing      |
| PUT    | /api/properties/:id    | Update a property                  |
| DELETE | /api/properties/:id    | Delete a property                  |

**Query parameters for GET /api/properties:**
- `page` — page number (default: 1)
- `limit` — items per page (default: 12)
- `city` — filter by city (partial match)
- `minPrice` / `maxPrice` — price range
- `bedrooms` — minimum number of bedrooms
- `status` — `active`, `pending`, or `sold`

### Agents

| Method | Endpoint        | Description                         |
|--------|-----------------|-------------------------------------|
| GET    | /api/agents     | List all agents                     |
| GET    | /api/agents/:id | Get agent profile with listings     |
| POST   | /api/agents     | Create a new agent                  |
| PUT    | /api/agents/:id | Update an agent profile             |
