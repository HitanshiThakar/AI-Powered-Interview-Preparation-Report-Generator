# Gen AI Interview Preparation

A MERN application that uses Google Gemini to create personalized interview preparation reports from a job description and a resume or candidate self-description.

## Features

- User registration and login
- Upload a PDF resume or enter a self-description
- Generate a match score, technical and behavioral questions, skill gaps, and a day-by-day preparation plan
- View recent interview reports
- Generate and download a job-tailored resume as a PDF

## Tech Stack

- **Frontend:** React, Vite, Sass
- **Backend:** Node.js, Express, MongoDB, Mongoose
- **AI:** Google Gemini API

## Project Structure

```text
.
├── Backend/
│   ├── server.js
│   └── src/
│       ├── config/
│       ├── controllers/
│       ├── middlewares/
│       ├── models/
│       ├── routes/
│       └── services/
└── Frontend/
    └── src/
        └── features/
            ├── auth/
            └── interview/
```

## Setup

Prerequisites: Node.js, npm, a MongoDB connection, and a Google Gemini API key.

1. Install backend dependencies:

   ```bash
   cd Backend
   npm install
   ```

2. Create `Backend/.env` with your own values:

   ```env
   MONGO_URI=your_mongodb_connection_string
   GOOGLE_API_KEY=your_google_gemini_api_key
   JWT_SECRET=your_long_random_secret
   ```

3. Install frontend dependencies in another terminal:

   ```bash
   cd Frontend
   npm install
   ```

## Run the App

Start the backend from the `Backend` directory:

```bash
npm run dev
```

Start the frontend from the `Frontend` directory in another terminal:

```bash
npm run dev
```

The backend runs at `http://localhost:3000` and the Vite frontend at `http://localhost:5173`.
