# Corporate Web Operations CMS

A backend prototype for maintaining website pages through a controlled publishing workflow.

## What it does

- Admins and editors create and edit draft pages.
- Reviewers and admins can publish drafts.
- Logged-in team members can view drafts.
- Visitors can view published pages without logging in.
- Login sessions are stored in MongoDB.

## Stack

Node.js, Express, MongoDB, Mongoose, Docker Compose, and PowerShell for API testing.

## Run locally

1. Start MongoDB from the project root: `docker compose up -d`
2. In `server`, install dependencies: `npm ci`
3. Set `PORT`, `MONGODB_URI`, and `SESSION_SECRET` in `server/.env`.
4. Start the API from `server`: `node --env-file=.env server.js`

Use `seedAdmin.js` to create the first admin account.

## API

| Method | Route | Access |
| --- | --- | --- |
| GET | `/api/health` | Public |
| GET | `/api/pages` | Public; published pages only |
| GET | `/api/pages/:slug` | Public; published pages only |
| POST | `/api/auth/login` | Public |
| GET | `/api/auth/me` | Logged-in users |
| POST | `/api/auth/logout` | Logged-in users |
| GET | `/api/admin/pages` | Logged-in users; draft list |
| POST | `/api/pages` | Admin or editor |
| PATCH | `/api/admin/pages/:id` | Admin or editor; draft content |
| PATCH | `/api/admin/pages/:id/publish` | Admin or reviewer |

## Current scope

The API and publishing workflow run locally. A browser interface and deployment are future work.