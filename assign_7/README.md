# TaskSpace · React Assignment 7

Task manager with Firebase Authentication, PWA installation, and offline support.

[GitHub repository](https://github.com/bissembayevd/React_hw) · [Live app](https://bissembayevd.github.io/React_hw/assign_7/)

## Run locally

```bash
cd assign_7
npm ci
npm run build
npm run preview
```

For Firebase sign-in, copy `.env.example` to `.env.local` and set your Firebase configuration before building.

## Offline support

The service worker precaches the app shell and offline page. Images and fonts use cache-first. Public task lists and details use network-first, with up to 80 responses kept for offline access. The app labels cached data when it serves a saved response. Firebase requests and write operations are excluded from the cache.
