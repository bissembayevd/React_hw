# TaskSpace · React Assignment 6

[Live demo](https://bissembayevd.github.io/React_hw/assign_6/) · [GitHub repository](https://github.com/bissembayevd/React_hw)

A React task manager with a dashboard, task CRUD, search, filters, sorting, and pagination. Firebase supports email/password and Google sign-in, persistent sessions, and a protected profile.

## Run locally

Requires Node.js 24. From the repository root:

```bash
cd assign_6
npm ci
```

Copy `.env.example` to `.env.local` and fill in your Firebase Web App configuration. Enable **Email/Password** and **Google** in Firebase Authentication and add `localhost` under **Authorized domains**.

```bash
npm run dev
```

## Caching

Tasks and Dashboard share a TanStack Query cache for tasks fetched from DummyJSON. The list stays fresh for 60 seconds. After a successful create, update, or delete, the app saves the change in the browser and invalidates the task list cache. An open list then refetches and applies the saved changes.
