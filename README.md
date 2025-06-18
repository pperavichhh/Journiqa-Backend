# Tourism Web App Backend

This repository contains the backend service for a full-service tourism web application.  
Built with **Node.js**, **Express**, and **MongoDB Atlas**, it provides a RESTful API for managing users and tourism-related data.

---

## Features

- User management: Create, read, update, delete (CRUD) users with secure password hashing
- MongoDB Atlas cloud database integration
- Environment variable support with `.env` and `dotenv`
- Express-based routing and middleware setup
- Basic error handling and 404 support
- JSON request parsing

---

## Technologies

- Node.js
- Express.js
- MongoDB Atlas (Cloud-hosted MongoDB)
- Mongoose (MongoDB ODM)
- dotenv (Environment variables)
- bcrypt (Password hashing)

---

## Getting Started

### Prerequisites

- Node.js (v14+ recommended)
- npm (comes with Node.js)
- MongoDB Atlas account (or local MongoDB instance)

### Installation

1. Clone the repository

   ```bash
   git clone https://github.com/yourusername/tourism-backend.git
   cd tourism-backend
2.Install dependencies

    ```bash
    npm install
3. Create a .env file in the project root with the following variables:
     ```bash
      MONGO_URI=your_mongodb_atlas_connection_string
    PORT=3000
4. Start the server
   ```bash
   npm start


## Security Notes
- Passwords are stored as hashed values using bcrypt

- Sensitive credentials are managed via environment variables

- Ensure .env is added to .gitignore to avoid leaking secrets

## Future Enhancements
- Add authentication and authorization (JWT)

- Integrate tourism data models (e.g., places, trips)

- Add input validation and error handling improvements

- Implement rate limiting and logging


