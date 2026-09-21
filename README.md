# HEALIX — Hospital Management System

## Mac / local setup

### 1. Backend
```bash
cd backend
npm install
npm start
```
The backend runs at `http://localhost:5000`. On startup it applies the non-destructive HEALIX business-rule migration to the configured PostgreSQL database.

### 2. Frontend
Open a second Terminal:
```bash
cd frontend
npm install
npm run dev
```
Open the Vite URL, normally `http://localhost:5173/`.


