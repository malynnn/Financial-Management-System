# BDOEA Financial Management System

A web-based financial management system built with **Next.js** (frontend) and **NestJS Microservices** (backend), backed by **PostgreSQL** running in Docker.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router) |
| Backend | NestJS 11 (Microservices) |
| Database | PostgreSQL 17 (Docker) |
| ORM | Prisma |
| Auth | NextAuth.js + JWT + Passport |
| Styling | Tailwind CSS v4 |
| Language | TypeScript |

---

## Prerequisites

Install these tools **before** cloning the project.

### 1. Node.js v22+
Download from: https://nodejs.org/en/download

Verify after install:
```bash
node -v   # should show v22.x.x or higher
npm -v    # should show 10.x.x or higher
```

### 2. Git
Download from: https://git-scm.com/downloads

Verify:
```bash
git --version
```

### 3. Docker Desktop
Download from: https://www.docker.com/products/docker-desktop/

- Install and **start Docker Desktop** before running the project
- Make sure it is running in the system tray before proceeding

Verify:
```bash
docker -v
docker compose version
```

> **Important:** If you already have PostgreSQL installed locally on your machine,
> it is likely running on port **5432**. This project uses port **5433** for Docker
> PostgreSQL to avoid conflicts. No action needed — just be aware of this.

---

## Getting Started

### Step 1 — Clone the repository

```bash
git clone https://github.com/<your-username>/Financial-Management-System.git
cd Financial-Management-System
```

### Step 2 — Install frontend dependencies

Run this from the **project root** (`Financial-Management-System/`):

```bash
npm install
```

### Step 3 — Install backend dependencies

```bash
cd backend
npm install
cd ..
```

### Step 4 — Set up the backend environment file

```bash
cd backend
copy ..\\.env.example .env
```

> The `.env` file is already pre-configured with the correct default values.
> You do **not** need to change anything to run locally.

Your `backend/.env` should look like this:

```env
DATABASE_URL=postgresql://fms_user:fms_password@127.0.0.1:5433/fms_db

PORT=3001
MICROSERVICE_HOST=0.0.0.0
MICROSERVICE_PORT=3002

JWT_SECRET=change_this_to_a_long_random_secret
JWT_EXPIRES_IN=7d

FRONTEND_URL=http://localhost:3000
```

### Step 5 — Start the PostgreSQL database (Docker)

Make sure **Docker Desktop is open and running**, then from the **project root**:

```bash
docker compose up postgres -d
```

Wait about 10 seconds for it to fully initialize. Verify it is healthy:

```bash
docker compose ps
```

You should see `fms_postgres` with status `Up (healthy)`.

### Step 6 — Run the database migration

From the **`backend/`** folder:

```bash
cd backend
npx prisma migrate dev --name init
```

Expected output:
```
Your database is now in sync with your schema.
✔ Generated Prisma Client
```

> **Troubleshooting:** If you get `Authentication failed`, the password may not
> have been set during container init. Fix it with:
> ```bash
> docker exec fms_postgres psql -U fms_user -d fms_db -c "ALTER USER fms_user WITH PASSWORD 'fms_password';"
> ```
> Then re-run `npx prisma migrate dev --name init`.

### Step 7 — Run the backend

From the **`backend/`** folder:

```bash
npm run start:dev
```

The backend will be available at:
- **API:** http://localhost:3001
- **Swagger Docs:** http://localhost:3001/api/docs
- **Microservice (TCP):** port 3002

### Step 8 — Run the frontend

Open a **new terminal**, from the **project root**:

```bash
npm run dev
```

The frontend will be available at: **http://localhost:3000**

---

## Running Everything (Quick Summary)

Open **3 terminals**:

```bash
# Terminal 1 — Database (project root)
docker compose up postgres -d

# Terminal 2 — Backend (from backend/ folder)
cd backend
npm run start:dev

# Terminal 3 — Frontend (project root)
npm run dev
```

Then open http://localhost:3000 in your browser.

---

## Project Structure

```
Financial-Management-System/
├── app/                  # Next.js pages (App Router)
│   ├── login/
│   ├── member/
│   ├── treasurer/
│   └── auditor/
├── components/           # Shared React components
├── backend/              # NestJS microservices backend
│   ├── src/
│   │   ├── main.ts       # Entry point (HTTP + TCP microservice)
│   │   └── app.module.ts # Root module
│   ├── prisma/
│   │   └── schema.prisma # Database schema
│   ├── .env              # Backend environment variables (NOT committed)
│   └── package.json
├── docker-compose.yml    # PostgreSQL Docker setup
├── .env.example          # Environment variable template
└── package.json          # Frontend dependencies
```

---

## Ports Used

| Service | Port |
|---|---|
| Next.js Frontend | http://localhost:3000 |
| NestJS Backend (HTTP) | http://localhost:3001 |
| NestJS Microservice (TCP) | 3002 |
| PostgreSQL (Docker) | 5433 |

> Port **5433** is used instead of the default **5432** to avoid conflicts with
> locally installed PostgreSQL on Windows.

---

## Useful Commands

### Database

```bash
# Start the database
docker compose up postgres -d

# Stop the database
docker compose down

# Stop and delete all data (fresh start)
docker compose down -v

# Open Prisma Studio (visual DB browser)
cd backend
npx prisma studio
```

### Backend

```bash
cd backend

npm run start:dev     # Development (hot reload)
npm run build         # Build for production
npm run start:prod    # Run production build
npm run test          # Run tests
```

### Frontend

```bash
npm run dev     # Development
npm run build   # Build for production
npm run start   # Run production build
npm run lint    # Lint check
```