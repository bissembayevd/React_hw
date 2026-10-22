# TaskSpace

Personal task manager built with React, Vite, and JavaScript.

## Features

- Dashboard with progress, upcoming deadlines, and recently completed tasks.
- Task creation, editing, deletion, search, and filters.
- Status workflow: To Do → In Progress → Completed.
- Responsive layout with separate task views.

The simulated API uses Promises, random delays, and occasional errors. Tasks are saved in localStorage. No backend is required.

## Run locally

Requires Node.js 20.19+ or 22.12+.

```sh
npm install
npm run dev
```

## Tests and build

```sh
npm test
npm run build
npm run preview
```

For deployment, publish the contents of `dist/`.
