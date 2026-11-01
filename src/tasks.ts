// A union type allows only these exact strings, catching spelling mistakes early.
// const status: TaskStatus = 'finished';
// Use 'done' instead; it is one of the allowed values.
export type TaskStatus = 'todo' | 'in-progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';
// An interface describes the shape of an object. It does not validate imported JSON.
export interface Task {
  id: number;
  title: string;
  // The ? means this field can be absent. Check it before calling string methods.
  // task.description.toUpperCase();
  // Safer: task.description?.toUpperCase() ?? 'No description';
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  tags: string[];
  createdAt: Date;
  dueDate?: Date;
}
// Omit builds an input type without fields the app generates itself.
export type NewTaskInput = Omit<Task, 'id' | 'status' | 'createdAt'>;
export const statuses: TaskStatus[] = ['todo', 'in-progress', 'done'];
export const priorities: TaskPriority[] = ['low', 'medium', 'high'];
export function createTask(input: NewTaskInput, id: number): Task {
  if (!Number.isSafeInteger(id) || id < 1) throw new Error('Invalid task ID.');
  // TypeScript checks developers' code; runtime checks still protect external data.
  // if (!input.title) ...
  // That would accept a title containing only spaces. trim() catches that case.
  if (typeof input.title !== 'string' || !input.title.trim()) throw new Error('Give your task a title.');
  if (input.title.trim().length > 160) throw new Error('Titles must be 160 characters or fewer.');
  if (input.description !== undefined && (typeof input.description !== 'string' || input.description.length > 3000)) throw new Error('Descriptions must be 3000 characters or fewer.');
  if (!priorities.includes(input.priority)) throw new Error('Invalid priority.');
  if (!Array.isArray(input.tags) || input.tags.length > 20 || input.tags.some(t => typeof t !== 'string' || t.length > 60)) throw new Error('Use at most 20 tags, each 60 characters or fewer.');
  if (input.dueDate && Number.isNaN(input.dueDate.getTime())) throw new Error('Invalid due date.');
  // map trims each tag, filter removes blanks, and Set removes duplicates.
  // Put generated fields AFTER ...input so they take precedence over input fields.
  return { ...input, title: input.title.trim(), tags: [...new Set(input.tags.map(t => t.trim()).filter(Boolean))], id, status: 'todo', createdAt: new Date() };
}
export function isOverdue(task: Task, now = new Date()): boolean {
  // A deadline lasts through the end of its local calendar day.
  if (!task.dueDate || task.status === 'done') return false;
  // Copy the Date before changing it: Date objects are mutable.
  // const end = task.dueDate;
  // Calling end.setHours(...) would then also modify the original task's dueDate.
  const end = new Date(task.dueDate);
  end.setHours(23, 59, 59, 999);
  return end < now;
}
// return completed / tasks.length * 100;
// With no tasks, 0 / 0 produces NaN. The length check below returns 0 instead.
export function completionPercentage(tasks: Task[]): number {
  return tasks.length ? Math.round(tasks.filter(t => t.status === 'done').length / tasks.length * 100) : 0;
}
export function parseTasks(json: string): Task[] {
  if (json.length > 5_000_000) throw new Error('Task data exceeds the 5 MB limit.');
  // unknown makes us check the data before using it.
  // const tasks = JSON.parse(json) as Task[];
  // An assertion does not validate fields or turn date strings into Date objects.
  const value: unknown = JSON.parse(json);
  if (!Array.isArray(value)) throw new Error('Expected a JSON array of tasks.');
  if (value.length > 5000) throw new Error('A maximum of 5000 tasks is supported.');
  const ids = new Set<number>();
  return value.map((raw: unknown) => {
    if (!raw || typeof raw !== 'object') throw new Error('Invalid task.');
    const t = raw as Record<string, unknown>;
    if (typeof t.id !== 'number' || !Number.isSafeInteger(t.id) || t.id < 1 || ids.has(t.id) || typeof t.title !== 'string' || !t.title.trim() || !statuses.includes(t.status as TaskStatus) || !priorities.includes(t.priority as TaskPriority) || !Array.isArray(t.tags) || !t.tags.every(x => typeof x === 'string') || (t.description !== undefined && typeof t.description !== 'string')) throw new Error('A task has invalid fields or a duplicate ID.');
    ids.add(t.id);
    if (typeof t.createdAt !== 'string' || (t.dueDate !== undefined && typeof t.dueDate !== 'string')) throw new Error('Invalid task dates.');
    // JSON stores dates as strings. Restore Date instances before doing date math.
    const createdAt = new Date(t.createdAt);
    const dueDate = t.dueDate === undefined ? undefined : new Date(t.dueDate as string);
    if (Number.isNaN(createdAt.getTime()) || (dueDate && Number.isNaN(dueDate.getTime()))) throw new Error('Invalid task dates.');
    const task = createTask({ title: t.title, description: t.description as string | undefined, priority: t.priority as TaskPriority, tags: t.tags as string[], dueDate }, t.id);
    return { ...task, status: t.status as TaskStatus, createdAt };
  });
}

export function nextTaskId(tasks: Task[]): number {
  // return tasks.length + 1;
  // Deleting a task leaves gaps, so the array length can produce an existing ID.
  // reduce finds the largest ID without spreading a large array into arguments.
  const max = tasks.reduce((value, task) => Math.max(value, task.id), 0);
  if (max >= Number.MAX_SAFE_INTEGER) throw new Error('Task IDs are exhausted. Export your tasks before starting a new list.');
  return max + 1;
}
export function mergeTasks(existing: Task[], incoming: Task[]): Task[] {
  if (existing.length + incoming.length > 5000) throw new Error('A maximum of 5000 tasks is supported.');
  if (!incoming.length) return [...existing];
  let id = nextTaskId(existing);
  if (!Number.isSafeInteger(id + incoming.length - 1)) throw new Error('Not enough task IDs available.');
  // New arrays and objects leave the original lists unchanged if saving fails.
  // existing.push(...incoming);
  // That changes live state immediately and can introduce duplicate IDs.
  return [...existing, ...incoming.map(task => ({ ...task, id: id++ }))];
}
