# Taskbra

A personal task manager built with **strict TypeScript**, plain HTML/CSS, and Vite

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

## Understand the code

- `src/tasks.ts`: data types, creation, deadlines, completion, and import validation.
- `src/main.ts`: application state, rendering, forms, events, and persistence.
- `src/style.css`: responsive visual design.
- `src/tasks.test.ts`: meaningful tests for validation, dates, and summaries.

Tasks stay in this browser on this origin; they do not sync between devices. Export a backup before clearing browser data or moving domains. Storage failures show a message. Unreadable saved data blocks writes to prevent data loss. Failed saves leave the current task list unchanged. Concurrent edits from other tabs are detected before saving; reload to resolve them. Optional Google Fonts fall back to local sans-serif fonts when offline. User-provided task text is escaped before rendering.

## Additional controls

Use **Complete visible tasks** to finish the current filtered list, **Clear completed** to remove finished tasks, and **Undo removal** to restore the last deletion or clear operation. Undo remains available for this session and restores tasks with new IDs. Press **N** to create a task or **/** to search when outside a form or dialog.

Task imports and creation enforce title, description, tag, and task-count limits. Task data is limited to 5000 tasks and imports to 5 MB. Deadline indicators refresh while the app is open. Writes detect changes from other tabs before saving; this is a conflict check, not a transactional multi-user database.
