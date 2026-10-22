# University defense: Async React

## useEffect

An Effect synchronizes the UI with an external system. Here that system is a fake API. Dashboard.jsx has one Effect for the task list and another for the selected task details. Both begin a Promise request and display loading or error feedback. Event handlers perform mutations because they happen in response to user actions.

## Dependency arrays

The list Effect depends on `reload`. Increasing this number requests the list again. The details Effect depends on `selectedId` and `detailReload`. Changing the selection loads that task; changing the counter retries or refreshes it. The notification Effect depends on the current notice and removes its timer during cleanup. The dialog Effect depends on the original focus target and its form/details mode. It installs keyboard behavior, puts focus inside the active dialog, and restores focus during cleanup.

## Cleanup

Each reading Effect owns a local `current` boolean. Cleanup sets it to false. A finished request can update state only while its Effect is current. This also makes development StrictMode safe: React can set up, clean up, and set up the Effects again. We ignore obsolete requests rather than canceling the simulated network timer.

## Race conditions

A race occurs when results arrive in a different order from the requests. Selecting A, then B, cleans up the A Effect. Even if A finishes last, its local boolean is false. It cannot replace B. A revision check also prevents reads started before a successful mutation from replacing newer task data. Successful mutations trigger new list and detail Effects.

## Stale closures

A closure remembers values from the render that created it. A mutation captures its target ID before `await`. After the Promise resolves, functional setters update only that ID. A completion for A cannot modify B, even when B is selected meanwhile. UI buttons and the service both prevent simultaneous changes to the same task. Different tasks can change concurrently without overwriting each other because the service reads and writes the latest storage together after the delay.

## Professor demonstration

1. Run `npm run dev`. Explain that only useState and useEffect are imported.
2. Start on Dashboard: show the live counts, completion percentage, upcoming deadlines, and recent completions. Click View All Tasks to open the task table. Create a personal task using the five-field form. Only Title is required. Open it and show the eight detail fields (including the heading and description). There is no Assignee or status selector. The API has set its status to To Do. Edit its content, then click Start task and wait for In Progress. Click Mark completed and wait for Completed. Delete requires confirmation. Refresh the browser to show persistence.
3. For controlled demonstrations, open the browser developer console on the development server and run the setup below. Then click Reload or open a task to show loading.
4. To demonstrate race cleanup, use the console commands below to prepare a slow first task and a fast second task. Open the first, close it with Escape, and open the second within five seconds. The second remains visible after the first finishes.
5. To demonstrate stale closures, use the three-second configuration below and open task A. Wait for its details. If it is To Do, click Start task and wait for In Progress first. Click Mark completed. Close A, open B while the completion is pending. When A completes, B stays selected and A becomes completed in the table. A successful mutation refreshes the selected details, so B may briefly load again.
6. Close dialogs, run `api.planNextRequest({delay: 300, fail: true})` in the console, then click Reload. Show the error and retry button. The failure is consumed by the next API request; retry succeeds with random errors disabled.
7. Search for text that matches nothing to show filtered empty results. Delete all tasks to demonstrate a truly empty database; empty data remains empty after refresh. Creating a task restores the list.
8. Change the window to mobile width and use the menu button. Task rows become compact cards.
9. Refresh the page to restore normal random delays and occasional errors. There is no development testing panel in the visible interface.
10. Run `npm test` and `npm run build`. Service tests cover CRUD, forced To Do at creation, valid forward transitions, rejected skipped/backward transitions, legacy Assignee removal, invalid input, persistence, concurrent writes, duplicate mutations, errors, and empty data.

## Optional console setup

On the development server, run:

```js
const api = await import("/src/services/api.js");
api.configureApi({ minDelay: 3000, maxDelay: 3000, errorChance: 0 });
```

For the detail race, use View All Tasks so every task is available, close any dialog, then run:

```js
const tasks = await api.getTasks();
api.planTaskRequest(tasks[0].id, { delay: 5000, fail: false });
api.planTaskRequest(tasks[1].id, { delay: 200, fail: false });
console.log("Open first:", tasks[0].title, "then:", tasks[1].title);
```

Use a fresh development server session for the demonstration. The helpers are also used by the automated tests; they do not add controls to the UI.

## Honest limits

This is a local simulated API, not a real server. Data is private to this browser origin. The concurrency guarantee covers requests from this app instance; independent tabs do not have database transactions. Random failures are deliberate and are explained to the user through retry feedback.

## Additional practical checks

- Edit A, press Save, close its form and details, then open B while the save is pending. A changes, and B remains selected. Repeat with a confirmed deletion of A.
- Start creating a task with a delayed request, close the form, and open a new create form. When the first request finishes, the new form stays open.
- Failed mutations show an error and keep both the task and input data unchanged. Retry the same action. Only a successful API response changes React state.
- The service uses random 350–1000 ms delays and a 1% error chance in normal use. This keeps errors occasional. Tests and console helpers can force a specific failure.
- Each mutation captures its task ID before awaiting. The service locks that ID until the request finishes. Independent mutations read the latest saved array and write it synchronously after their delays, so one response cannot replace another task's changes.
- Run `npm run test:browser` and `npm run test:audit` with the development server running. The audit checks the exact five-second/two-hundred-millisecond race and three-task switching. Run `npm run test:production` after building to check real compiled assets at a domain root and project subfolder. These browser tests require Playwright and Edge; they use isolated browser storage.

## Demonstrating the dedicated Dashboard

Dashboard has no complete task table, search, or filters. All Tasks has those task-management controls. Click each sidebar item to show that In Progress and Completed filter the actual task data and the active item is highlighted.

From Dashboard, open a task in Upcoming Deadlines, start it, and complete it. Close the details. The progress percentage increases, the task leaves the deadline list, and it appears first in Recently Completed. Completion time is generated by the service only when completion succeeds, and remains unchanged when the task is edited afterwards. Older completed tasks without a known timestamp are still supported without guessing a completion date.

Clear all tasks only in an isolated testing browser if you want to show 0% and empty sections without changing your own saved tasks. The automated overview suite uses isolated storage and covers this scenario, as well as overdue tasks, tasks without dates, and more than five tasks per section. Run it with `npm run test:overview` while the development server is running.

## Focused task views

Only Dashboard shows the three large statistics cards. All Tasks contains the full database with search, status, priority, Add task, Reload, and a small count. The old All / Active / Completed tabs have been removed. In Progress and Completed show compact lists with only the appropriate status; they have no search controls, filters, tabs, or summary cards. Navigation clears search and filters so no old query hides another page's tasks. Each focused task still opens separately fetched details with the existing mutation actions.
