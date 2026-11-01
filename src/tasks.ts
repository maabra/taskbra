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
  if (!input.title.trim()) throw new Error('Give your task a title.');
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
  const value: unknown = JSON.parse(json);
  if (!Array.isArray(value)) throw new Error('Expected a JSON array of tasks.');
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
    return { id: t.id, title: t.title, description: t.description as string | undefined, status: t.status as TaskStatus, priority: t.priority as TaskPriority, tags: t.tags as string[], createdAt, dueDate };
  });
}
