// A small interface lets tests supply fake storage instead of a real browser.
export interface TaskStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
// Compare the saved snapshot before writing to detect changes from another tab.
// This check is not atomic: two simultaneous writes can still race.
// storage.setItem(key, next); return next;
// Writing without checking expected could replace another tab's newer work.
export function persistTasks(storage: TaskStorage, key: string, expected: string | null, next: string): string {
  if (storage.getItem(key) !== expected) throw new Error('Tasks changed in another tab. Reload this page before making changes.');
  // setItem can throw (for example, when storage is full). Let the caller handle
  // the failure before it updates in-memory tasks or displays a success message.
  storage.setItem(key, next);
  return next;
}
