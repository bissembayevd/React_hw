# TaskSpace · React Assignment 7

[Live demo](https://bissembayevd.github.io/React_hw/assign_7/) · [GitHub repository](https://github.com/bissembayevd/React_hw)

A React task manager with a dashboard, task CRUD, search, filters, sorting, and pagination. Firebase supports email/password and Google sign-in, persistent sessions, and a protected profile.

## Run locally

Requires Node.js 24. From the repository root:

```bash
cd assign_7
npm ci
```

Copy `.env.example` to `.env.local` and fill in your Firebase Web App configuration. Enable **Email/Password** and **Google** in Firebase Authentication and add `localhost` under **Authorized domains**.

```bash
npm run dev
```

## Caching

Tasks and Dashboard share a TanStack Query cache for tasks fetched from DummyJSON. The list stays fresh for 60 seconds. After a successful create, update, or delete, the app saves the change in the browser and invalidates the task list cache. An open list then refetches and applies the saved changes.

## PWA and offline use

Run `npm run build` and `npm run preview`, then open `/React_hw/assign_7/` on localhost. Use the browser's install command to open TaskSpace in a standalone window. The deployed app uses the same path on GitHub Pages, with hash routes such as `#/tasks/1` and `#/offline`.

The Vite build generates a versioned precache list from the production output. The Service Worker precaches the app shell, JS, CSS, icons, and fallback page. It uses cache-first for same-origin images and fonts, with up to 40 additional files. Activation removes superseded TaskSpace caches for Assignment 7. When an update is ready, choose **Обновить** to activate it and reload once.

Public DummyJSON GET requests for the list, task details, and their associated users use network-first with up to 80 cached responses. **Кешированные данные** indicates a saved response was actually used. Firebase requests, authenticated data, and task writes stay outside the Service Worker cache. Writes require a connection.

After the Service Worker takes control online, open Tasks and one task's details. Disable the network and reload each page to check the saved data. Visit `#/offline` for **Retry Connection**, or open `/React_hw/assign_7/unavailable` to test the navigation fallback. Restore the connection and check that fresh data loads. To check updates, serve a changed production build at the same address, run the Service Worker update check in DevTools, and choose **Обновить**.

Run `npm run lint`, `npm test`, `npm run build`, `npm run test:browser`, and `node tests/pwa.cjs`. Install Playwright Chromium with `npx playwright install chromium` or set `PLAYWRIGHT_CHANNEL=msedge` to use Edge. Set `PWA_NEXT_BUILD` to a second production output directory to test an update between builds.

GitHub Actions builds and publishes assignments 4–7 from `master`. The deploy includes a retirement Service Worker at the former Assignment 6 worker URL. Existing browsers update that worker, clear Assignment 6 PWA caches, and unregister it. Open Assignment 7 to install the PWA at its new URL. For Firebase on Pages, authorize `bissembayevd.github.io` in Firebase and configure the GitHub Actions repository variables listed in `.env.example`.
