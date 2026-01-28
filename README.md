# Full-Stack Authentication Application

A complete full-stack application with Angular Material frontend, NestJS backend with Passport authentication, PostgreSQL database, all dockerized with Docker Compose.

## Features

- **Frontend**: Angular 18+ with Material Design
  - Login and Register pages
  - Form validation
  - JWT authentication with HTTP interceptor
  - Protected routes with auth guard

- **Backend**: NestJS with TypeScript
  - Passport.js authentication (Local + JWT strategies)
  - PostgreSQL with TypeORM
  - Password hashing with bcrypt
  - RESTful API endpoints

- **Database**: PostgreSQL 15
  - User management
  - Automatic schema synchronization

- **Docker**: Complete containerization
  - Multi-stage builds
  - Health checks
  - Volume persistence

## Prerequisites

- Docker
- Docker Compose

## Quick Start

Run the entire application with a single command:

```bash
docker-compose up --build
```

This will start:
- PostgreSQL database on port 5432
- NestJS backend on port 3000
- Angular frontend on port 4200

## Access the Application

- **Frontend**: http://localhost:4200
- **Backend API**: http://localhost:3000
- **Database**: localhost:5432

## API Endpoints

### Authentication
- `POST /auth/register` - Register a new user
- `POST /auth/login` - Login with email and password
- `GET /auth/profile` - Get current user profile (requires JWT token)

### Request/Response Examples

**Register:**
```json
POST /auth/register
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Login:**
```json
POST /auth/login
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

## Development

### Run Backend Locally
```bash
cd backend
npm install
npm run start:dev
```

### Run Frontend Locally
```bash
cd frontend
npm install
npm start
```

### Run Database Only
```bash
docker-compose up postgres
```

## Environment Variables

Backend environment variables (`.env`):
- `DATABASE_HOST` - PostgreSQL host
- `DATABASE_PORT` - PostgreSQL port
- `DATABASE_USER` - Database user
- `DATABASE_PASSWORD` - Database password
- `DATABASE_NAME` - Database name
- `JWT_SECRET` - Secret for JWT signing
- `JWT_EXPIRATION` - JWT token expiration time

## Project Structure

```
.
├── backend/
│   ├── src/
│   │   ├── auth/          # Authentication module
│   │   ├── users/         # Users module
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── auth/      # Auth components & services
│   │   │   ├── dashboard/ # Dashboard component
│   │   │   └── ...
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
└── docker-compose.yml
```

## Stopping the Application

```bash
docker-compose down
```

To remove volumes as well:
```bash
docker-compose down -v
```

## Security Notes

- Change `JWT_SECRET` in production
- Use HTTPS in production
- Implement rate limiting
- Add input sanitization
- Use environment-specific configurations
