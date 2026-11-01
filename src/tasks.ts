export type TaskStatus = 'todo' | 'in-progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';
export interface Task {
  id: number;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  tags: string[];
  createdAt: Date;
  dueDate?: Date;
}
export type NewTaskInput = Omit<Task, 'id' | 'status' | 'createdAt'>;
export const statuses: TaskStatus[] = ['todo', 'in-progress', 'done'];
export const priorities: TaskPriority[] = ['low', 'medium', 'high'];
export function createTask(input: NewTaskInput, id: number): Task {
  if (!Number.isSafeInteger(id) || id < 1) throw new Error('Invalid task ID.');
  if (typeof input.title !== 'string' || !input.title.trim()) throw new Error('Give your task a title.');
  if (input.title.trim().length > 160) throw new Error('Titles must be 160 characters or fewer.');
  if (input.description !== undefined && (typeof input.description !== 'string' || input.description.length > 3000)) throw new Error('Descriptions must be 3000 characters or fewer.');
  if (!priorities.includes(input.priority)) throw new Error('Invalid priority.');
  if (!Array.isArray(input.tags) || input.tags.length > 20 || input.tags.some(t => typeof t !== 'string' || t.length > 60)) throw new Error('Use at most 20 tags, each 60 characters or fewer.');
  if (input.dueDate && Number.isNaN(input.dueDate.getTime())) throw new Error('Invalid due date.');
  return { ...input, title: input.title.trim(), tags: [...new Set(input.tags.map(t => t.trim()).filter(Boolean))], id, status: 'todo', createdAt: new Date() };
}
export function isOverdue(task: Task, now = new Date()): boolean {
  // A deadline lasts through the end of its local calendar day.
  if (!task.dueDate || task.status === 'done') return false;
  const end = new Date(task.dueDate);
  end.setHours(23, 59, 59, 999);
  return end < now;
}
export function completionPercentage(tasks: Task[]): number {
  return tasks.length ? Math.round(tasks.filter(t => t.status === 'done').length / tasks.length * 100) : 0;
}
export function parseTasks(json: string): Task[] {
  if (json.length > 5_000_000) throw new Error('Task data exceeds the 5 MB limit.');
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
    const createdAt = new Date(t.createdAt);
    const dueDate = t.dueDate === undefined ? undefined : new Date(t.dueDate as string);
    if (Number.isNaN(createdAt.getTime()) || (dueDate && Number.isNaN(dueDate.getTime()))) throw new Error('Invalid task dates.');
    const task = createTask({ title: t.title, description: t.description as string | undefined, priority: t.priority as TaskPriority, tags: t.tags as string[], dueDate }, t.id);
    return { ...task, status: t.status as TaskStatus, createdAt };
  });
}

export function nextTaskId(tasks: Task[]): number {
  const max = tasks.reduce((value, task) => Math.max(value, task.id), 0);
  if (max >= Number.MAX_SAFE_INTEGER) throw new Error('Task IDs are exhausted. Export your tasks before starting a new list.');
  return max + 1;
}
export function mergeTasks(existing: Task[], incoming: Task[]): Task[] {
  if (existing.length + incoming.length > 5000) throw new Error('A maximum of 5000 tasks is supported.');
  if (!incoming.length) return [...existing];
  let id = nextTaskId(existing);
  if (!Number.isSafeInteger(id + incoming.length - 1)) throw new Error('Not enough task IDs available.');
  return [...existing, ...incoming.map(task => ({ ...task, id: id++ }))];
}
