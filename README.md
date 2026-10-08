# CRM client

The React + Vite frontend. A self-contained project: its dependencies and configuration live in
this folder. The backend is the separate project in `../server`.

## First-time setup

```bash
cd client
npm install
```

## Commands (run inside `client/`)

| Command | What it does |
|---|---|
| `npm run dev` | Starts the dev server on http://localhost:5173. Calls to `/api` are passed to the backend on port 3000, so start the server too |
| `npm run build` | Builds the app into `dist/` |
| `npm run preview` | Serves the built app locally |
| `npm run lint` | ESLint (including the "no classes" rule) and a Prettier check |
| `npm run format` | Formats the code with Prettier |

## Rules

- Colours exist only in `src/styles/tokens.css` (light and dark values of the same tokens).
  Components use the token classes such as `bg-surface`, `text-brand`, `border-border`.
- All API calls go through `src/lib/apiClient.js`.
- Function components and hooks only; no classes.
- No secrets in this project. Anything the browser loads is public.

## If the page says "Cannot reach the server"

The backend is not running. In a second terminal: `cd ../server` and `npm run dev`.
