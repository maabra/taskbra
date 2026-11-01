import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTask, parseTasks, isOverdue, completionPercentage } from './tasks.ts';
test('creation trims titles, deduplicates tags, and rejects blank titles', () => {
  const task = createTask({ title: ' Learn ', priority: 'high', tags: [' TS ', 'TS', ''] }, 1);
  assert.equal(task.title, 'Learn'); assert.deepEqual(task.tags, ['TS']); assert.equal(task.status, 'todo');
  assert.throws(() => createTask({ title: ' ', priority: 'low', tags: [] }, 2));
});
test('JSON round trip restores dates; invalid imports fail atomically', () => {
  const task = createTask({ title: 'Read', priority: 'low', tags: [], dueDate: new Date(2026, 0, 2) }, 1);
  const restored = parseTasks(JSON.stringify([task]));
  assert.ok(restored[0].createdAt instanceof Date); assert.equal(restored[0].dueDate?.getTime(), task.dueDate?.getTime());
  assert.throws(() => parseTasks(JSON.stringify([task, task])));
  assert.throws(() => parseTasks('[{"id":1}]'));
  assert.throws(() => parseTasks(JSON.stringify([{ ...task, createdAt: 'invalid' }])));
});
test('deadlines include the whole local day and completed tasks are not overdue', () => {
  const task = createTask({ title: 'Read', priority: 'low', tags: [], dueDate: new Date(2026, 0, 2) }, 1);
  assert.equal(isOverdue(task, new Date(2026, 0, 2, 23)), false);
  assert.equal(isOverdue(task, new Date(2026, 0, 3)), true);
  assert.equal(isOverdue({ ...task, status: 'done' }, new Date(2026, 0, 3)), false);
});
test('completion handles empty lists and rounds percentages', () => {
  const task = createTask({ title: 'Read', priority: 'low', tags: [] }, 1);
  assert.equal(completionPercentage([]), 0);
  assert.equal(completionPercentage([task, { ...task, id: 2, status: 'done' }, { ...task, id: 3 }]), 33);
});

import { nextTaskId, mergeTasks } from './tasks.ts';
import { persistTasks } from './storage.ts';
test('creation and imports enforce text and tag limits', () => {
  const input = { title: 'Read', priority: 'low' as const, tags: [] };
  assert.throws(() => createTask({ ...input, title: 'a'.repeat(161) }, 1));
  assert.throws(() => createTask({ ...input, description: 'a'.repeat(3001) }, 1));
  assert.throws(() => createTask({ ...input, tags: Array(21).fill('tag') }, 1));
  assert.throws(() => createTask({ ...input, dueDate: new Date('invalid') }, 1));
  const task = createTask(input, 1);
  assert.throws(() => parseTasks(JSON.stringify([{ ...task, title: 'a'.repeat(161) }])));
});
test('merging reassigns IDs without mutating either list and detects exhaustion', () => {
  const task = createTask({ title: 'Read', priority: 'low', tags: [] }, 7);
  const original = [task];
  const merged = mergeTasks(original, [task, task]);
  assert.deepEqual(merged.map(t => t.id), [7, 8, 9]);
  assert.equal(original.length, 1); assert.equal(task.id, 7);
  assert.throws(() => nextTaskId([{ ...task, id: Number.MAX_SAFE_INTEGER }]));
  assert.throws(() => mergeTasks(Array(5000).fill(task), [task]));
});
test('storage detects conflicting writes and never overwrites them', () => {
  let stored: string | null = 'original';
  const storage = { getItem: () => stored, setItem: (_key: string, value: string) => { stored = value; } };
  assert.equal(persistTasks(storage, 'key', 'original', 'updated'), 'updated');
  assert.throws(() => persistTasks(storage, 'key', 'original', 'stale'), /another tab/);
  assert.equal(stored, 'updated');
});
test('storage errors propagate instead of reporting successful saves', () => {
  const storage = { getItem: () => null, setItem: () => { throw new Error('Quota exceeded'); } };
  assert.throws(() => persistTasks(storage, 'key', null, 'new'), /Quota/);
});
