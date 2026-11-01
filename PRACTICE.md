# Learn TypeScript with Taskfield

TypeScript is used for web interfaces, Node.js backend APIs, command-line tools, reusable libraries, and mobile/desktop applications. This project focuses on a browser interface and data modeling.

Work through one exercise at a time. Run `npm test` and `npm run build` after each change. Keep strict mode enabled; avoid `any`.

## 1. Understand the model

Read `src/tasks.ts`. Explain why status and priority use union types, why description has a `?`, and how `NewTaskInput` uses `Omit`. Intentionally assign an invalid status and read the compiler error. Undo it afterward.

## 2. Extract lookup helpers

Write `getTaskById(tasks: Task[], id: number): Task | undefined`. Replace one inline lookup in main.ts. Show a helpful message when an ID is missing. Learn narrowing by checking the result before reading its title.

## 3. Extract filtering

Move search/filter logic out of render into a typed pure function. Give its filter options an interface. Verify mixed-case searches, matching tags, empty queries, and combined status/priority filters.

## 4. Add a useful field

Add an optional estimatedMinutes number. Update the form, creation, import validator, and task card. Reject negative numbers. Existing exported tasks without this field must still import.

## 5. Add a summary

Show total estimated minutes for unfinished tasks. Use filter and reduce. Decide how missing estimates should behave. Check an empty task list.

## 6. Practice persistence

Export tasks and inspect the JSON. Explain why dates are strings. Import the file and check that deadlines still work. Try invalid JSON: existing tasks should remain intact.

## 7. Stretch: subtasks

Define a Subtask interface with an ID, title, and completed flag. Add an optional subtasks array. Display a completed/total counter. Decide whether completing every subtask should complete the parent; describe your rule before implementing it.

## 8. Stretch: recurring tasks

Introduce a recurrence union such as 'none' | 'daily' | 'weekly'. When completing a recurring task, create its next occurrence. Think through local dates, duplicate completions, and imported data.

## 9. Stretch: refactor

Separate browser storage and DOM rendering into their own modules. Preserve behavior. Add a focused test for an edge case you discovered rather than testing every line.

## Done checklist

You can explain the types; empty titles are rejected; missing IDs do not crash; invalid imports do not change tasks; completion for an empty list is 0%; completed tasks are never overdue; reload preserves your work; the production build succeeds.
