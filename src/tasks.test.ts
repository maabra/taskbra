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
