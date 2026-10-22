# TaskSpace

A light, Notion-inspired personal university task manager built with React, Vite, JSX, and Lucide icons. No backend is needed.

## Install and run

Requires Node.js 20.19+ or 22.12+ and npm.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. Run `npm test` for service tests, `npm run build` for a production build, and `npm run preview` to preview it.

## Features

- Dedicated Dashboard overview with live summary cards, completion percentage, five nearest incomplete deadlines, and five recent completions.
- All Tasks contains the complete searchable/filterable task table. In Progress and Completed show their respective status lists. Desktop sidebar and mobile navigation highlight the active page.
- Search and status/priority filters appear only in All Tasks. No redundant tabs or statistics cards appear on task-management pages. Reload remains available in every view.
- Async task details with eight fields: ID, title, description, category, priority, status, created date, and due date. Create/edit forms, sequential status actions, and confirmed deletion.
- Required title, optional description and due date, category and priority; loading, empty, error, retry, and success feedback.
- Keyboard-accessible dialogs with Escape, focus trapping, and restored focus.
- Only useState and useEffect hooks. No custom hooks or fetching libraries.

## Dashboard and task pages

Dashboard is a productivity overview, not a second task database. Upcoming Deadlines sorts incomplete tasks by due date (overdue first), excludes missing/invalid dates, and displays at most five tasks. Missing due dates are counted separately. Recently Completed shows up to five tasks sorted by the API-owned completedAt timestamp. For older saved completions without that timestamp, it shows “Completion date unavailable” and lists them after dated completions. Existing tasks are not reset or assigned invented historical dates.

Clicking either list opens the same independently fetched task details, with loading, retry, edit, status, and delete actions. Successful mutations update the overview. View All Tasks opens the full table; navigation resets filters so each page starts with its intended complete list. In Progress and Completed use compact status-only task lists with their own descriptions and empty states. Their tasks still open async details with the same edit, status, and delete actions. Summary cards appear only on Dashboard; the full table and filters appear only on All Tasks. Reload and retry work in every view. An empty workspace shows 0% and helpful empty sections.

## Personal task workflow

The create form contains only Title, Description, Category, Priority, and Due Date. The service always sets new tasks to **To Do**, even if a caller supplies a different status. Use **Start task** in the details panel to move to **In Progress**, then **Mark completed** to finish. Both actions await the API. The service rejects skipped or backward transitions. Editing task content leaves its status unchanged; status is changed through the workflow buttons.

There is no Assignee field. The service removes it from previously saved tasks without resetting their content, IDs, or status. New installations get personal examples for studying, homework, exercise, reading, and personal projects. Existing saved tasks remain intact; sample changes do not replace user data.

## Simulated API

`src/services/api.js` exports getTasks(), getTaskById(id), createTask(data), updateTask(id, changes), deleteTask(id), and completeTask(id). Start uses updateTask(id, {status: "In Progress"}); completion uses completeTask(id). All return Promises. Requests normally take 350–1000 ms and have a 1% chance of failure. Retry a failed operation. Initial sample tasks are created on the first read. Changes are saved in the browser under `taskspace.tasks.v1`. Storage errors appear as request errors.

Only the service accesses localStorage. Each mutation reads the latest tasks after its delay, then writes synchronously. This prevents overlapping requests in this application from losing changes. The service locks each task during a mutation, while different tasks may change concurrently. This is a single-browser-tab demo; cross-tab transactional locking is outside its scope.

Effects clean up old reads. A service revision prevents pre-mutation reads from replacing newer state, and successful mutations trigger fresh reads. Mutation handlers capture the target ID before awaiting and update matching IDs with functional state setters. They also remember which form submitted a request, so an old response cannot close a newer form. Form fields are disabled while saving.

The implementation follows the Promise, delay, error, and storage pattern of the [assignment reference](https://github.com/leravanna/fake-api), adapted to task-specific fields and the requested concurrency rules.

## Development demonstration

There are no development controls in the application UI. Automated tests use service helpers to control delays and failures without changing normal API behavior. See DEFENSE.md for optional console demonstrations.

## Deployment

Run `npm run build` and upload the contents of `dist/` to a static host such as Netlify, Vercel, or GitHub Pages. There are no server routes or secrets. Vite uses `base: "./"`, so bundled assets and the favicon work at the domain root or under a project subfolder. Open subfolder sites with a trailing slash. Data stays in each browser and origin; it is not shared across devices. The font uses Google Fonts with a system-font fallback.

## Structure

- src/pages/Dashboard.jsx: dashboard, selection, list/detail effects, and mutation state.
- src/components/: reusable dialog and task form.
- src/services/api.js: simulated API and persistence.
- src/styles/index.css: responsive light interface.
- tests/api.test.js: service contract and concurrency checks.

## Verification

`npm test` runs eight service and assignment-boundary tests. Date validation checks real calendar dates; blank titles and invalid text types are rejected without changing saved data. The browser regression script in `tests/browser.cjs` checks actual forms, persistence, controlled detail races, captured mutation IDs, errors and retries, filters, empty data, and mobile navigation. It uses Playwright and an installed Microsoft Edge. To run it independently, install Playwright (`npm install --no-save playwright`), start `npm run dev` on port 5173, then run `npm run test:browser`, `npm run test:audit`, and `npm run test:overview`. The overview suite verifies distinct pages, every navigation item, dynamic counts/progress, ordering and five-item limits, missing/overdue dates, empty/error states, API-loaded details, and live completion updates. The expanded audit uses exact 5000 ms / 200 ms detail delays and covers three-task switching, status/edit/delete stale closures, failed mutations, modal keyboard behavior, and form-session cleanup. After `npm run build`, run `npm run test:production` to test a temporary local static host at the root and a project subfolder. It stops automatically. Screenshots are saved in `artifacts/desktop.png` and `artifacts/mobile.png`. Browser checks use an isolated context and do not change your normal browser data.

Playwright is a test prerequisite only, not an application dependency. This audit used the existing bundled Playwright and installed Edge without adding libraries to the project. Set TASKSPACE_URL to change the development test URL; set TASKSPACE_BROWSER to an installed Playwright browser channel (default: msedge).

## GitHub and static hosting preparation

See AUDIT.md for the verified checklist, fixes, and full commands. The Git repository root is the parent React_hw folder; do not initialize another repository inside assign_4. No remote is configured, so add your own GitHub URL only when you are ready to push. For static hosting from the parent repository, choose assign_4 as the project root, npm run build as the build command, and dist as the output directory. Do not publish node_modules or the source folder as the site output.
