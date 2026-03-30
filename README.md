# HomeKey

A Beta MLS-style real estate web application built with Node.js/Express, MongoDB, and React.

## Features

- Browse property listings (rentals and for-sale)
- Filter by listing type
- View property detail pages
- Add your own listings via the UI
- Sample seed data included (8 properties with images)

## Tech Stack

- **Backend:** Node.js, Express, MongoDB (Mongoose)
- **Frontend:** React, React Router
- **Database:** MongoDB

## Quick Start

### Prerequisites

- Node.js >= 14
- MongoDB (local or Atlas)

### Backend Setup

```bash
cd backend
cp .env.example .env          # edit MONGO_URI if needed
npm install
npm run seed                  # populate sample data
npm start                     # runs on http://localhost:5000
```

### Frontend Setup

```bash
cd frontend
cp .env.example .env          # edit REACT_APP_API_URL if needed
npm install
npm start                     # runs on http://localhost:3000
```

### Docker (all-in-one)

```bash
docker-compose up --build
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/properties | List all properties |
| GET | /api/properties/:id | Get single property |
| POST | /api/properties | Create new property |
| GET | /api/agents | List all agents |

## Environment Variables

### Backend (`backend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `5000` | Server port |
| `MONGO_URI` | `mongodb://localhost:27017/homekey` | MongoDB connection string |

### Frontend (`frontend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `REACT_APP_API_URL` | `http://localhost:5000/api` | Backend API base URL |
