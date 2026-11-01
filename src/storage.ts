export interface TaskStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
// Compare before writing so another tab's changes are never silently replaced.
export function persistTasks(storage: TaskStorage, key: string, expected: string | null, next: string): string {
  if (storage.getItem(key) !== expected) throw new Error('Tasks changed in another tab. Reload this page before making changes.');
  storage.setItem(key, next);
  return next;
}
