# PuckQ - Hockey Contract & Salary Tracker

## Overview
PuckQ is a full-stack web application for tracking NHL hockey teams, player contracts, and salary cap information. It provides a dashboard view, team overviews, and a comprehensive player database.

## Architecture
- **Frontend**: React + TypeScript with Vite, TailwindCSS v4, shadcn/ui components
- **Backend**: Express.js REST API
- **Database**: PostgreSQL with Drizzle ORM
- **Routing**: wouter (frontend), Express (backend API)

## Key Files
- `shared/schema.ts` — Drizzle schema for teams, players, transactions
- `server/db.ts` — Database connection (pg + drizzle)
- `server/storage.ts` — CRUD storage interface (DatabaseStorage)
- `server/routes.ts` — REST API routes (/api/teams, /api/players, /api/transactions, /api/seed)
- `client/src/lib/api.ts` — Frontend API client & helpers
- `client/src/components/layout/Shell.tsx` — Top navigation shell
- `client/src/pages/Dashboard.tsx` — League overview dashboard
- `client/src/pages/Teams.tsx` — Teams grid with cap info
- `client/src/pages/Players.tsx` — Player contract table

## Data Model
- **teams**: name, abbreviation, logo, capHit, capSpace, projectedCapSpace, ltir, contracts, color
- **players**: name, teamId, position, age, capHit, capPercentage, contractLength, expiryYear, draftYear/Round/Overall, status
- **transactions**: type, player, team, details, date

## Design
- Dark/Light mode toggle via custom ThemeProvider
- "Ice Blue" primary color (#0ea5e9)
- Outfit (display) + Inter (body) fonts
- Glassmorphism panels with backdrop blur

## API Endpoints
- `GET/POST /api/teams`, `GET/PATCH/DELETE /api/teams/:id`
- `GET/POST /api/players`, `GET/PATCH/DELETE /api/players/:id`
- `GET/POST /api/transactions`, `DELETE /api/transactions/:id`
- `POST /api/seed` — Seeds initial data if database is empty
