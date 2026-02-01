# 1v1 Leaderboards

A competitive gaming platform for 1v1 matches with leaderboards, matchmaking, and Discord integration.

## Tech Stack

- **Frontend**: Angular with Angular Material
- **Backend**: NestJS with TypeORM
- **Database**: PostgreSQL 15
- **Bot**: Discord.js
- **Infrastructure**: Docker Compose

## Quick Start

```bash
# Start all services
npm run dev

# Start with rebuild
npm run dev:build
```

Services will be available at:
- Frontend: http://localhost:4200
- Backend API: http://localhost:3000
- PostgreSQL: localhost:5432

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start all services |
| `npm run dev:build` | Start with rebuild |
| `npm run db:seed` | Seed the database with test data |
| `npm run docker:down` | Stop all services |
| `npm run docker:down:volumes` | Stop and remove volumes |
| `npm run docker:logs` | View logs |
| `npm run docker:restart` | Restart services |
| `npm run deploy` | Deploy to production |

## Database

### Migrations

Migrations run automatically on startup. To run manually:

```bash
docker-compose exec server npm run migration:run
```

Generate a new migration:

```bash
docker-compose exec server npm run migration:generate src/migrations/MigrationName
```

### Seeding

Seed data is **not** applied automatically. Run manually after migrations:

```bash
npm run db:seed
```

This creates test users, games, platforms, leaderboards, and sample leaderboard entries.

## Project Structure

```
core/
├── services/
│   ├── server/        # NestJS backend
│   ├── website/       # Angular frontend
│   └── botzei/        # Discord bot
├── deploy/            # Deployment scripts
├── .github/
│   └── workflows/     # GitHub Actions
└── docker-compose.yml
```

## Environment Variables

Create a `.env` file in the root:

```env
DISCORD_TOKEN=your-discord-bot-token
BOT_API_KEY=your-bot-api-key
ANTHROPIC_API_KEY=your-anthropic-key
FRONTEND_URL=http://localhost:4200
```

## Deployment

Deployment is automatic on push to `main` via GitHub Actions.

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `SERVER_HOST` | Server IP or hostname |
| `SERVER_USER` | SSH username |
| `SSH_PRIVATE_KEY` | Private SSH key |

### Manual Deployment

```bash
npm run deploy
```

## API Overview

### Auth
- `POST /auth/register` - Register
- `POST /auth/login` - Login
- `GET /auth/profile` - Get profile (authenticated)
- `GET /auth/discord` - Discord OAuth

### Games & Platforms
- `GET /games` - List games
- `GET /platforms` - List platforms

### Leaderboards
- `GET /leaderboards` - List leaderboards
- `GET /leaderboards/:id/entries` - Get leaderboard entries

### Matches
- `POST /matches/challenge` - Create challenge
- `POST /matches/:id/accept` - Accept challenge
- `POST /matches/:id/report` - Report result
