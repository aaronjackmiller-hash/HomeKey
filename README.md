# HomeKey

A minimal Beta MLS-style real estate application built with Node.js/Express, MongoDB, and React.

## Prerequisites

- [Node.js](https://nodejs.org/) v14+
- [MongoDB](https://www.mongodb.com/) (local or Atlas)
- [npm](https://www.npmjs.com/)

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/aaronjackmiller-hash/HomeKey.git
cd HomeKey
```

### 2. Backend

```bash
cd backend
cp ../.env.example .env   # edit .env with your values
npm install
npm start
```

The API runs on `http://localhost:5000` by default.

### 3. Frontend

```bash
cd frontend
npm install
npm start
```

The app runs on `http://localhost:3000` by default.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/properties` | List all properties |
| GET | `/api/properties/:id` | Get a single property |
| POST | `/api/properties` | Create a property |
| GET | `/api/agents` | List all agents |

## Docker (optional)

```bash
docker-compose up --build
```

## Environment Variables

See `.env.example` for all available configuration options.
