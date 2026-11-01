# Taskfield

A calm, responsive personal task manager built with **strict TypeScript**, plain HTML/CSS, and Vite. No account or backend required.

## Run locally

Install Node.js 24, then run:

```sh
npm install
npm run dev
```

On Windows PowerShell, use `npm.cmd` if script execution is disabled.

```sh
npm test
npm run build
npm run preview
```

## Features

- Create, edit, complete, reopen, and delete tasks with confirmation.
- Three statuses, three priorities, descriptions, tags, and optional deadlines.
- Search titles, descriptions, and tags; filter by status, priority, or overdue.
- Sort by newest, deadline, priority, or title.
- Counts and completion percentage; deadlines include the full local calendar day.
- Browser-local persistence, validated JSON import, and JSON export.
- Imports append tasks with new IDs and preserve existing tasks.
- Responsive layout, labeled controls, keyboard focus styles, and native dialogs.
- Three sample tasks on first visit, plus an in-app learning guide.

## Publish on GitHub Pages

1. Create a GitHub repository and push these files to its `main` branch.
2. In **Settings ? Pages ? Build and deployment**, select **GitHub Actions**.
3. The included `.github/workflows/deploy.yml` tests, builds, and deploys on pushes to `main`. You can also run it manually from Actions.
4. Open the deployment URL shown by the workflow.

Vite uses relative asset URLs, so both repository Pages URLs and custom domains work. No secrets are required. If you use a different default branch, update the workflow branch name.

## Understand the code

- `src/tasks.ts`: data types, creation, deadlines, completion, and import validation.
- `src/main.ts`: application state, rendering, forms, events, and persistence.
- `src/style.css`: responsive visual design.
- `src/tasks.test.ts`: meaningful tests for validation, dates, and summaries.
- `PRACTICE.md`: guided beginner exercises and stretch goals.

Tasks stay in this browser on this origin; they do not sync between devices. Export a backup before clearing browser data or moving domains. Storage failures show a message. An invalid saved payload is left untouched during initial load; later task changes save the new in-memory state. Optional Google Fonts fall back to local sans-serif fonts when offline. User-provided task text is escaped before rendering.
