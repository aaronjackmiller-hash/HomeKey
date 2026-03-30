# HomeKey — Israeli Real Estate MLS (Beta)

A minimal full-stack MLS application for Israeli real estate listings built with React, Node.js/Express, and MongoDB.

## Features

- 📋 Browse property listings (rental & for-sale)
- 🏠 View detailed property information including Israeli real estate specifics
- ➕ Add new property listings through a comprehensive form
- 🌱 Sample data with realistic Israeli properties (Tel Aviv, Jerusalem, Haifa, Ra'anana, Beer Sheva)

## Tech Stack

- **Frontend:** React 17, React Router
- **Backend:** Node.js, Express
- **Database:** MongoDB (Mongoose)

---

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) v14+
- [MongoDB](https://www.mongodb.com/) running locally or a MongoDB Atlas URI

### 1. Clone the Repository

```bash
git clone https://github.com/aaronjackmiller-hash/HomeKey.git
cd HomeKey
```

### 2. Set Up the Backend

```bash
cd backend
cp .env.example .env    # Edit .env with your MongoDB URI if needed
npm install
npm start               # Starts on http://localhost:5000
```

The backend will automatically seed the database with sample properties on first run.

### 3. Set Up the Frontend

```bash
cd frontend
npm install
npm start               # Starts on http://localhost:3000
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Docker Compose (Recommended)

To run the entire stack with Docker:

```bash
docker-compose up --build
```

- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend API: [http://localhost:5000](http://localhost:5000)
- MongoDB: `mongodb://localhost:27017/homekey`

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/properties` | List all properties |
| GET | `/api/properties/:id` | Get single property |
| POST | `/api/properties` | Create new property listing |
| GET | `/api/agents` | List all agents |

---

## Property Fields

The listing form and database support all key Israeli real estate fields:

- Address, City, Price
- Property Type (rental / for-sale)
- Bedrooms, Bathrooms, Size (sq. meters)
- Floor Number, Elevator (yes/no)
- **Mamad** — Safe room (yes/no)
- Property Condition (new / excellent / good / fair / needs renovation)
- Pets Allowed (yes/no)
- Parking Details
- Total Monthly Payment
- **Vaad Bayit** — Building committee fee (per month)
- **Arnona** — City taxes (per month)
- Move-in Date
- Detailed Description
- Property Images

---

## Environment Variables

### Backend (`backend/.env`)

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/homekey
```

### Frontend

```env
REACT_APP_API_URL=http://localhost:5000/api
```

---

## Sample Data

The database is automatically seeded on first run with 8 sample properties across Israeli cities:
- Tel Aviv (Dizengoff, Rothschild, Allenby)
- Jerusalem (King George)
- Haifa (Ben Gurion, HaNassi)
- Ra'anana
- Beer Sheva

Properties include a mix of rentals and for-sale listings with realistic pricing, Mamad, Vaad, Arnona, and parking details.
