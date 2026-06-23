# AntiSocial

AntiSocial is a small social platform for sharing failures, reacting to posts, leaving comments, saving content, and exploring public user profiles.

It started as a university project and was then expanded into a cleaner portfolio-style FastAPI application with a multi-page frontend, authentication, demo seeding, and a more structured codebase.

## Stack

- `FastAPI`
- `SQLAlchemy`
- `Pydantic`
- `PostgreSQL`
- `Alembic`
- `HTML`
- `CSS`
- `Vanilla JavaScript`
- `Docker`

## Features

- JWT authentication
- Registration and login by username or email
- Create, edit, delete posts
- Image upload and image URL support
- Full post page and quick-view modal
- Reactions and comments
- Public user pages
- Hate-follow system
- Saved posts / bookmarks
- Activity page
- Profile page
- Settings page with password change
- Demo onboarding and one-click demo seeding

## Project Structure

```text
app/
  core/        config, database, security, dependencies
  models/      SQLAlchemy models
  routers/     FastAPI routes
  schemas/     Pydantic schemas
  services/    business logic helpers
  scripts/     utility scripts such as demo seeding
alembic/       database migrations
static/        CSS and split JavaScript frontend
templates/     HTML pages
scripts/       local PowerShell helper scripts
```

## Quick Start

### 1. Create virtual environment

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 2. Configure environment

Copy `.env.example` to `.env` and update the values if needed.

Example:

```env
DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5432/antisocial
SECRET_KEY=change_this_secret_key_for_production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
DEMO_SEED_ENABLED=true
```

### 3. Run PostgreSQL

You can use your own local PostgreSQL instance or Docker:

```powershell
docker compose up db -d
```

### 4. Apply migrations

```powershell
.\scripts\migrate.ps1
```

### 5. Start the app

```powershell
.\scripts\run-local.ps1
```

Then open:

```text
http://127.0.0.1:8000
```

API docs:

```text
http://127.0.0.1:8000/docs
```

## Demo Mode

If `DEMO_SEED_ENABLED=true`, the auth page shows a quick-start onboarding block.

You can:

- press `Fill demo data` in the UI
- or run the seed script manually:

```powershell
.\scripts\seed-demo.ps1
```

Demo accounts use the same password:

```text
demo123
```

Default demo users:

- `demo_owner`
- `demo_friend`
- `demo_hater`

## Docker Run

Full app + database:

```powershell
docker compose up --build
```

This starts:

- PostgreSQL on `localhost:5432`
- AntiSocial on `http://127.0.0.1:8000`

## Useful Routes

Frontend pages:

- `/`
- `/auth`
- `/create-post`
- `/saved`
- `/activity`
- `/profile`
- `/settings`
- `/user/{id}`
- `/post/{id}`
- `/post/{id}/edit`

Useful API groups:

- `/auth/*`
- `/posts/*`
- `/users/*`
- `/comments/*`
- `/demo/*`

## Notes

- The frontend uses split JavaScript files instead of one large script.
- Database schema changes are handled with Alembic migrations.
- Demo seed is meant for local showcasing and testing, not for production.
