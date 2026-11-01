# Corporate Web Ops — React Client

The frontend for Corporate Web Ops & CMS: a content management platform with draft editing, role-based publishing, and public pages.

## Technologies

- React
- Vite
- React Router
- CSS
- ESLint

## Features

- Sign in and sign out using cookie-based sessions.
- Restore the current session after refreshing.
- Create and edit draft content.
- Confirm publication before making content public.
- Browse published pages without signing in.
- Open individual pages through their URL slugs.
- Responsive interface with loading, error, and empty states.

## Access by Role

| Action | Admin | Editor | Reviewer |
| --- | --- | --- | --- |
| View drafts | Yes | Yes | Yes |
| Create drafts | Yes | Yes | No |
| Edit draft content | Yes | Yes | No |
| Publish drafts | Yes | No | Yes |

The API enforces these permissions. The interface displays controls appropriate to the signed-in user's role.

## Requirements

- Node.js 24
- npm
- The Express API running at `http://localhost:5000`
- MongoDB running for the API

See the [project README](../README.md) for backend setup.

## Run Locally

From the project root:

```powershell
cd client
npm ci
npm run dev
```

Open the local URL printed by Vite, normally:

```text
http://localhost:5173
```

Use an account created through the backend's account seeding scripts. There are no default passwords.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Staff login and authenticated dashboard |
| `/site` | Public list of published pages |
| `/site/:slug` | Individual published page |

Public routes do not require a login.

## API Connection

During development, `vite.config.js` proxies requests beginning with `/api` to:

```text
http://localhost:5000
```

Components use relative API addresses such as:

```js
fetch("/api/auth/me", {
  credentials: "same-origin",
});
```

The browser manages the session cookie. Passwords and session tokens are not stored in local storage.

The Vite proxy is for development. Production hosting must also route `/api` requests to the backend and support direct navigation to frontend routes.

## Source Structure

```text
src/
├── components/
│   ├── CreateDraftForm.jsx
│   ├── DraftEditor.jsx
│   ├── DraftList.jsx
│   ├── PublicPage.jsx
│   └── PublicSite.jsx
├── App.jsx
├── App.css
├── index.css
└── main.jsx
```

- `App.jsx` manages authentication and the staff dashboard.
- `main.jsx` defines frontend routes.
- Components handle content creation, editing, publishing, and public viewing.

## Quality Checks

```powershell
npm run lint
npm run build
```

The production build is generated in `dist/`.

## Troubleshooting

- **API connection error:** Confirm the backend is running on port 5000.
- **Login required:** Sign in again if the session has expired.
- **Duplicate slug:** Choose a URL slug that is not already used.
- **Public page not found:** Confirm the slug is correct and the page is published.