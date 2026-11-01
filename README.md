# Corporate Web Ops & CMS

A full-stack content management application with authenticated staff access, draft editing, role-based publishing, and public pages.

## Features

- Session-based login and logout.
- Session restoration after refreshing.
- Draft creation and content editing.
- Publishing confirmation.
- Public pages with individual URL slugs.
- Responsive green interface.
- Docker Compose setup for the complete application.

## Technology

React, Vite, React Router, Node.js, Express, MongoDB, Mongoose, Nginx, and Docker Compose.

## Roles

| Action | Admin | Editor | Reviewer |
| --- | --- | --- | --- |
| View drafts | Yes | Yes | Yes |
| Create drafts | Yes | Yes | No |
| Edit draft content | Yes | Yes | No |
| Publish drafts | Yes | No | Yes |

Permissions are enforced by the API.

## Architecture

- Nginx serves the compiled React application.
- Requests beginning with `/api` are forwarded to Express.
- MongoDB stores users, pages, and sessions.
- A named Docker volume preserves database data.
- Health checks control service startup order.

## Requirements

- Docker Desktop with Docker Compose.
- Node.js 24 and npm for development outside Docker.

## Run with Docker

For a fresh checkout, create the environment file:

```powershell
Copy-Item server/.env.example server/.env
```

Replace the `SESSION_SECRET` placeholder in `server/.env` with a unique random value. Keep this file private.

From the project root:

```powershell
docker compose up -d --build
docker compose ps
```

Open:

| Address | Purpose |
| --- | --- |
| http://localhost:8080 | Staff portal |
| http://localhost:8080/site | Published pages |
| http://localhost:8080/api/health | API health check |

This Compose configuration runs locally over HTTP. Production deployment requires HTTPS and production session settings.

## Create the First Admin

The application has no default password.

In PowerShell, set temporary credentials and run the seed script:

```powershell
$env:ADMIN_EMAIL = Read-Host "Admin email"
$adminSecure = Read-Host "Admin password (at least 12 characters)" -AsSecureString
$env:ADMIN_PASSWORD = [System.Net.NetworkCredential]::new("", $adminSecure).Password

docker compose run --rm -e ADMIN_EMAIL -e ADMIN_PASSWORD api node seedAdmin.js

Remove-Item Env:ADMIN_EMAIL, Env:ADMIN_PASSWORD
Remove-Variable adminSecure
```

The seed script creates the initial admin only if one does not already exist.

## Development

For frontend setup and commands, see [client/README.md](client/README.md).

## Quality Checks

From `client`:

```powershell
npm ci
npm run lint
npm run build
```

## Useful Docker Commands

View application logs:

```powershell
docker compose logs --tail 80 api web
```

Rebuild after changing application code:

```powershell
docker compose up -d --build
```

Stop the application while preserving database data:

```powershell
docker compose down
```

## Project Structure

```text
corporate-web-ops/
├── client/             React frontend and Nginx configuration
├── server/             Express API, models, and account scripts
├── compose.yaml        Container orchestration
└── README.md
```

## Current Status

The application runs locally with Docker. Frontend build and lint checks pass. Cloud deployment and automated CI checks are the next milestones.