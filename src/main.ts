import './style.css';
import { persistTasks } from './storage';
import { createTask, nextTaskId, mergeTasks, parseTasks, isOverdue, completionPercentage, statuses, priorities, type Task, type TaskStatus, type TaskPriority } from './tasks';
const labels: Record<TaskStatus, string> = { todo: 'To do', 'in-progress': 'In progress', done: 'Completed' };
// Keep the original storage key so existing users retain their saved tasks.
const key = 'taskfield.v1';
const app = document.querySelector<HTMLDivElement>('#app')!;
let tasks: Task[] = [];
let view = 'all';
let search = '';
let priority = 'all';
let sort = 'newest';
let editing: number | undefined;
let storageWarning = '';
let snapshot: string | null = null;
let storageBlocked = false;
let toastTimer: number | undefined;
// Task text goes into HTML templates, so escape characters with HTML meaning.
// element.innerHTML = task.title;
// For plain text, prefer element.textContent = task.title instead.
const escape = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
try {
  const saved = localStorage.getItem(key);
  snapshot = saved;
  tasks = saved ? parseTasks(saved) : [
    { title: 'Get comfortable with TypeScript', description: 'Explore the types in src/tasks.ts. Try adding a new field to the Task interface.', priority: 'high' as const, tags: ['learning', 'typescript'] },
    { title: 'Build something you’re proud of', description: 'Break a big idea into a few small, achievable tasks.', priority: 'medium' as const, tags: ['personal'] },
    { title: 'Make a little room for focus', description: 'A clear desk. One task. Twenty minutes.', priority: 'low' as const, tags: ['habits'] }
  ].map((t, i) => ({ ...createTask(t, i + 1), status: i === 0 ? 'in-progress' : i === 2 ? 'done' : 'todo' }));
} catch { storageBlocked = true; storageWarning = 'Saved tasks could not be loaded. Changes are blocked to protect your data. Check browser storage permissions or back up the saved data before reloading.'; }
// Persist first, then replace live state. Callers pass a new array of tasks.
// tasks = next; localStorage.setItem(key, JSON.stringify(next));
// If saving throws, the screen and storage would disagree about what was saved.
function save(next: Task[]): boolean {
  try {
    if (storageBlocked) throw new Error('Saving is blocked to protect unreadable data. Back up your browser storage and reload.');
    snapshot = persistTasks(localStorage, key, snapshot, JSON.stringify(next));
    tasks = next;
    storageWarning = '';
    render();
    return true;
  } catch (error) {
    storageWarning = error instanceof Error ? error.message : 'Unable to save tasks.';
    if (!storageWarning.includes('tab') && !storageBlocked) storageWarning = 'Unable to save. Browser storage may be full or unavailable. Your previous tasks are unchanged; export a backup and try again.';
    render();
    toast(storageWarning);
    return false;
  }
}
function toast(message: string) {
  const el = document.querySelector<HTMLDivElement>('#toast')!;
  el.textContent = message; el.hidden = false;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { el.hidden = true; }, 5000);
}
app.innerHTML = `
<aside><a class="brand" href="./"><span class="brand-icon">✓</span> taskbra<span class="brand-dot">.</span></a>
<div class="workspace">YOUR WORKSPACE</div><nav aria-label="Task views">
${[['all', '▦', 'All tasks'], ['todo', '○', 'To do'], ['in-progress', '◐', 'In progress'], ['done', '✓', 'Completed'], ['overdue', '◷', 'Overdue']].map(([id, icon, label]) => `<button data-view="${id}"><span class="nav-icon">${icon}</span>${label}<span class="count" id="count-${id}"></span></button>`).join('')}</nav>
<div class="sidebar-bottom"><div class="little-plant">✳</div><strong>Small steps. Real progress.</strong><p>You don’t have to do it all.<br>Just the next right thing.</p><button class="text-button" id="guide">Explore the practice guide ↗</button></div><div class="local-note"><span></span> Saved on this device</div></aside>
<main><header><span class="breadcrumb">Workspace <span>/</span> <b id="breadcrumb">All tasks</b></span><div class="header-actions"><button class="quiet" id="import">↥ Import</button><button class="quiet" id="export">↧ Export</button></div></header>
<section class="content"><div class="intro"><div><div class="eyebrow">A LITTLE STRUCTURE, A LOT OF POSSIBILITY</div><h1>Make room for progress<span>.</span></h1><p>Your ideas, plans, and next steps. All in one calm place.</p></div><button class="primary" id="new-task">＋ New task</button></div>
<div id="storage-warning" role="alert"></div>
<div class="stats"><article><span>Total tasks</span><strong id="total">0</strong><small>A place for every next step</small></article><article><span>In progress <i class="dot amber"></i></span><strong id="active">0</strong><small>Good things are taking shape</small></article><article><span>Completed <i class="dot green"></i></span><strong id="completed">0</strong><small>Small wins worth celebrating</small></article><article class="progress-stat"><span>Your momentum <span id="percentage">0%</span></span><div class="progress-track"><div id="progress"></div></div><small>One task at a time. You’ve got this.</small></article></div>
<div class="section-heading"><h2 id="view-heading">All tasks <span id="visible-count"></span></h2><span class="subtle">A clear plan for what’s next</span></div>
<div class="toolbar"><label class="search"><span>⌕</span><input id="search" type="search" placeholder="Search titles, descriptions, or #tags…" aria-label="Search tasks"></label><select id="priority" aria-label="Filter by priority"><option value="all">All priorities</option>${priorities.map(p => `<option value="${p}">${p[0].toUpperCase() + p.slice(1)} priority</option>`).join('')}</select><select id="sort" aria-label="Sort tasks"><option value="newest">Newest first</option><option value="due">Due date</option><option value="priority">Highest priority</option><option value="title">Title A–Z</option></select></div>
<div class="bulk-bar"><button class="quiet" id="complete-all">? Complete visible tasks</button><button class="quiet" id="clear-done">Clear completed</button><button class="quiet" id="undo" disabled>? Undo removal</button><span class="subtle">N: new task ? /: search</span></div><div id="task-list" class="task-list"></div><footer><span>Less overwhelm. More moving forward.</span><span>Made for focus · Built with TypeScript</span></footer></section></main>
<dialog id="editor"><form id="task-form"><div class="dialog-top"><div><div class="eyebrow">ONE SMALL STEP</div><h2 id="editor-title">Create a task</h2></div><button type="button" class="icon-button" id="close-editor" aria-label="Close">×</button></div><label>Task title<input name="title" required maxlength="160" placeholder="What would you like to do?" autocomplete="off"></label><label>Description <span class="subtle">(optional)</span><textarea name="description" rows="3" placeholder="Add a little context…" maxlength="3000"></textarea></label><div class="form-grid"><label>Priority<select name="priority">${priorities.map(p => `<option value="${p}" ${p === 'medium' ? 'selected' : ''}>${p}</option>`).join('')}</select></label><label>Due date<input type="date" name="dueDate"></label></div><label>Tags <span class="subtle">(comma separated)</span><input name="tags" placeholder="learning, personal"></label><div class="dialog-actions"><button type="button" class="quiet" id="cancel">Cancel</button><button class="primary" type="submit">Save task</button></div></form></dialog>
<dialog id="guide-dialog"><div class="dialog-top"><div><div class="eyebrow">LEARN BY BUILDING</div><h2>Your TypeScript playground</h2></div><button id="close-guide" class="icon-button" aria-label="Close guide">×</button></div><p>This app is a working example you can take apart, understand, and make your own.</p><ol class="lessons"><li><strong>Meet the types</strong><p>Open src/tasks.ts. Explore interfaces, union types, and optional properties.</p></li><li><strong>Follow the data</strong><p>Trace a task from the form to createTask(), then into localStorage.</p></li><li><strong>Try a small change</strong><p>Add a tag counter or a button that shows only high-priority tasks.</p></li><li><strong>Level up</strong><p>Add subtasks, recurring deadlines, or a board view. Start with one small change and verify it before moving on.</p></li></ol><p class="guide-note">TypeScript powers web apps, backend APIs, developer tools, and mobile and desktop applications.</p></dialog>
<dialog id="delete-dialog"><h2>Delete this task?</h2><p id="delete-title"></p><p>This removes it from this device.</p><div class="dialog-actions"><button id="cancel-delete" class="quiet">Keep task</button><button id="confirm-delete" class="danger">Delete task</button></div></dialog>
<input type="file" id="file" accept="application/json,.json" hidden><div id="toast" role="status" hidden></div>`;
const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
function render() {
  const done = tasks.filter(t => t.status === 'done').length;
  $('#total').textContent = String(tasks.length); $('#active').textContent = String(tasks.filter(t => t.status === 'in-progress').length); $('#completed').textContent = String(done);
  const percent = completionPercentage(tasks); $('#percentage').textContent = `${percent}%`; $('#progress').style.width = `${percent}%`;
  for (const v of ['all', ...statuses, 'overdue']) $(`#count-${v}`).textContent = String(tasks.filter(t => v === 'all' || (v === 'overdue' ? isOverdue(t) : t.status === v)).length);
  document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b => { b.classList.toggle('selected', b.dataset.view === view); b.setAttribute('aria-current', b.dataset.view === view ? 'page' : 'false'); });
  const title = view === 'all' ? 'All tasks' : view === 'overdue' ? 'Overdue' : labels[view as TaskStatus]; $('#breadcrumb').textContent = title;
  // Normalize both the query and task text so search ignores letter case.
  // task.title.includes(search.toLowerCase());
  // Only normalizing one side would miss titles containing uppercase letters.
  const query = search.toLowerCase().replace(/^#/, '');
  const filtered = tasks.filter(t => (view === 'all' || (view === 'overdue' ? isOverdue(t) : t.status === view)) && (priority === 'all' || t.priority === priority) && `${t.title} ${t.description ?? ''} ${t.tags.join(' ')}`.toLowerCase().includes(query));
  filtered.sort((a, b) => sort === 'title' ? a.title.localeCompare(b.title) : sort === 'priority' ? priorities.indexOf(b.priority) - priorities.indexOf(a.priority) : sort === 'due' ? (a.dueDate?.getTime() ?? Infinity) - (b.dueDate?.getTime() ?? Infinity) : b.id - a.id);
  $('#view-heading').innerHTML = `${title} <span>${filtered.length}</span>`;
  $('#task-list').innerHTML = filtered.length ? filtered.map(t => `<article class="task ${t.status === 'done' ? 'finished' : ''}"><button class="check ${t.status === 'done' ? 'checked' : ''}" data-toggle="${t.id}" aria-label="${t.status === 'done' ? 'Reopen' : 'Complete'} ${escape(t.title)}">${t.status === 'done' ? '✓' : ''}</button><div class="task-body"><button class="task-title" data-edit="${t.id}">${escape(t.title)}</button>${t.description ? `<p>${escape(t.description)}</p>` : ''}<div class="task-meta"><span class="priority ${t.priority}"><i></i>${t.priority}</span>${t.tags.map(tag => `<span class="tag">#${escape(tag)}</span>`).join('')}${t.dueDate ? `<span class="deadline ${isOverdue(t) ? 'late' : ''}">◷ ${t.dueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}${isOverdue(t) ? ' · Overdue' : ''}</span>` : ''}</div></div><select class="status-select ${t.status}" data-status="${t.id}" aria-label="Status for ${escape(t.title)}">${statuses.map(s => `<option value="${s}" ${s === t.status ? 'selected' : ''}>${labels[s]}</option>`).join('')}</select><button class="icon-button delete" data-delete="${t.id}" aria-label="Delete ${escape(t.title)}">×</button></article>`).join('') : `<div class="empty"><div>✳</div><h3>${tasks.length ? 'A little breathing room.' : 'A fresh start.'}</h3><p>${tasks.length ? 'No tasks match this view. Try a different filter or add a new task.' : 'Add your first task and make space for what matters.'}</p><button class="primary" id="empty-add">＋ New task</button></div>`;
  $('#storage-warning').textContent = storageWarning;
}
function openEditor(id?: number) {
  editing = id;
  const form = $<HTMLFormElement>('#task-form'); form.reset();
  $('#editor-title').textContent = id ? 'Edit your task' : 'Create a task';
  const task = tasks.find(t => t.id === id);
  if (id !== undefined && !task) { toast('This task no longer exists.'); return; }
  const field = (name: string) => form.elements.namedItem(name) as HTMLInputElement;
  if (task) { field('title').value = task.title; field('description').value = task.description ?? ''; field('priority').value = task.priority; field('tags').value = task.tags.join(', '); if (task.dueDate) { const d = task.dueDate; field('dueDate').value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; } }
  $<HTMLDialogElement>('#editor').showModal(); field('title').focus();
}
$('#new-task').onclick = () => openEditor();
for (const selector of ['#close-editor', '#cancel']) $(selector).onclick = () => $<HTMLDialogElement>('#editor').close();
$('#guide').onclick = () => $<HTMLDialogElement>('#guide-dialog').showModal(); $('#close-guide').onclick = () => $<HTMLDialogElement>('#guide-dialog').close();
$<HTMLFormElement>('#task-form').onsubmit = e => {
  e.preventDefault(); const data = new FormData(e.currentTarget as HTMLFormElement); const title = String(data.get('title')).trim();
  if (!title) { toast('Please enter a task title.'); return; }
  const input = { title, description: String(data.get('description')).trim() || undefined, priority: data.get('priority') as TaskPriority, tags: String(data.get('tags')).split(','), dueDate: data.get('dueDate') ? new Date(`${data.get('dueDate')}T00:00:00`) : undefined };
  try {
  if (editing === undefined && tasks.length >= 5000) throw new Error('A maximum of 5000 tasks is supported.');
  const id = editing ?? nextTaskId(tasks); const task = createTask(input, id);
  if (editing !== undefined && !tasks.some(t => t.id === editing)) throw new Error('This task no longer exists.');
  const next = editing !== undefined ? tasks.map(t => t.id === editing ? { ...task, status: t.status, createdAt: t.createdAt } : t) : [...tasks, task];
  if (!save(next)) return; $<HTMLDialogElement>('#editor').close(); toast(editing === undefined ? 'Task added. One step closer.' : 'Task updated.');
  } catch (error) { toast(error instanceof Error ? error.message : 'Unable to save task.'); }
};
document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b => b.onclick = () => { view = b.dataset.view!; render(); });
$('#search').oninput = e => { search = (e.target as HTMLInputElement).value; render(); };
$('#priority').onchange = e => { priority = (e.target as HTMLSelectElement).value; render(); };
$('#sort').onchange = e => { sort = (e.target as HTMLSelectElement).value; render(); };
let deleting: number | undefined;
let undoTasks: Task[] | undefined;
$('#task-list').onclick = e => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button'); if (!b) return;
  if (b.id === 'empty-add') return openEditor();
  if (b.dataset.edit) return openEditor(Number(b.dataset.edit));
  if (b.dataset.toggle) { const t = tasks.find(t => t.id === Number(b.dataset.toggle)); if (t) { save(tasks.map(task => task.id === t.id ? { ...task, status: task.status === 'done' ? 'todo' : 'done' } : task)); } }
  if (b.dataset.delete) { deleting = Number(b.dataset.delete); $('#delete-title').textContent = tasks.find(t => t.id === deleting)?.title ?? ''; $<HTMLDialogElement>('#delete-dialog').showModal(); }
};
$('#task-list').onchange = e => { const el = e.target as HTMLSelectElement; const t = tasks.find(t => t.id === Number(el.dataset.status)); if (t && statuses.includes(el.value as TaskStatus)) { save(tasks.map(task => task.id === t.id ? { ...task, status: el.value as TaskStatus } : task)); } };
$('#cancel-delete').onclick = () => $<HTMLDialogElement>('#delete-dialog').close();
$('#confirm-delete').onclick = () => { const previous = tasks; if (!save(tasks.filter(t => t.id !== deleting))) return; undoTasks = previous.filter(task => task.id === deleting); $('#undo').removeAttribute('disabled'); $<HTMLDialogElement>('#delete-dialog').close(); toast('Task deleted.'); };
$('#export').onclick = () => { const url = URL.createObjectURL(new Blob([JSON.stringify(tasks, null, 2)], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = `taskbra-${new Date().toISOString().slice(0, 10)}.json`; document.body.append(a); a.click(); a.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); toast('Your backup is ready.'); };
$('#import').onclick = () => $<HTMLInputElement>('#file').click();
// File reading is asynchronous. Validate the entire import before saving it.
// const incoming = parseTasks(file.text());
// file.text() returns Promise<string>, so it must be awaited first.
$('#file').onchange = async e => {
  const input = e.target as HTMLInputElement; const file = input.files?.[0]; if (!file) return;
  try { if (file.size > 5_000_000) throw new Error('Please use a file smaller than 5 MB.'); const incoming = parseTasks(await file.text()); if (!save(mergeTasks(tasks, incoming))) return; toast(`Imported ${incoming.length} tasks. Existing tasks were kept.`); } catch (error) { toast(error instanceof Error ? error.message : 'Could not import this file.'); } finally { input.value = ''; }
};
render();

window.addEventListener('storage', event => {
  if (event.key === key || event.key === null) {
    storageWarning = 'Tasks changed in another tab. Reload to see the latest version. Saving is blocked until you reload.';
    render();
  }
});
// Refresh overdue state when returning to the page or crossing a deadline.
window.addEventListener('focus', () => render());
window.setInterval(() => { if (!document.hidden && !document.querySelector('dialog[open]')) render(); }, 60_000);

$('#complete-all').onclick = () => {
  const ids = new Set(Array.from(document.querySelectorAll<HTMLElement>('[data-toggle]')).map(el => Number(el.dataset.toggle)));
  if (!ids.size) return toast('No visible tasks to complete.');
  if (save(tasks.map(task => ids.has(task.id) ? { ...task, status: 'done' } : task))) toast('Visible tasks completed.');
};
$('#clear-done').onclick = () => {
  if (!tasks.some(task => task.status === 'done')) return toast('No completed tasks to clear.');
  const previous = tasks;
  if (save(tasks.filter(task => task.status !== 'done'))) {
    undoTasks = previous.filter(task => task.status === 'done');
    $('#undo').removeAttribute('disabled');
    toast('Completed tasks removed. Use Undo removal to restore them.');
  }
};
$('#undo').onclick = () => {
  if (!undoTasks) return;
  try {
  if (save(mergeTasks(tasks, undoTasks))) {
    undoTasks = undefined;
    $('#undo').setAttribute('disabled', '');
    toast('Removed tasks restored.');
  }
  } catch (error) { toast(error instanceof Error ? error.message : 'Unable to restore tasks.'); }
};
document.addEventListener('keydown', event => {
  if (event.ctrlKey || event.metaKey || event.altKey || event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement || document.querySelector('dialog[open]')) return;
  if (event.key.toLowerCase() === 'n') { event.preventDefault(); openEditor(); }
  if (event.key === '/') { event.preventDefault(); $('#search').focus(); }
});
