import React, { Suspense, useState } from 'react';
import './TaskItem.css';
import lazyWithMinDelay from '../utils/lazyWithMinDelay';

// Loaded on first use only; no artificial delay for a small modal.
const DeleteConfirmModal = lazyWithMinDelay(() => import('./DeleteConfirmModal'), 0);

// ISO -> value for <input type="datetime-local"> (local time, no seconds)
function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const PRIORITY_LABEL = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

export default function TaskItem({ task, onPatch, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [remindAt, setRemindAt] = useState(toLocalInput(task.remindAt));

  const completed = task.status === 'completed';

  function toggleComplete() {
    onPatch(task.id, {
      status: completed ? 'pending' : 'completed',
    });
  }

  function saveEdit() {
    if (!title.trim()) return;

    const changes = { title: title.trim(), description };
    // Only send remindAt when the user actually changed it, so saving an
    // unrelated edit can't reset (and re-fire) an existing reminder.
    if (remindAt !== toLocalInput(task.remindAt)) {
      changes.remindAt = remindAt ? new Date(remindAt).toISOString() : null;
    }
    onPatch(task.id, changes);

    setEditing(false);
  }

  function cancelEdit() {
    setEditing(false);
    setTitle(task.title);
    setDescription(task.description || '');
    setRemindAt(toLocalInput(task.remindAt));
  }

  function confirmDelete() {
    onDelete(task.id);
    setShowDeleteConfirm(false);
  }

  return (
    <>
      <li className={`taskitem ${completed ? 'taskitem--done' : ''}`}>
        <button
          type="button"
          className="taskitem__seal"
          onClick={toggleComplete}
          aria-pressed={completed}
          aria-label={
            completed ? 'Mark as pending' : 'Mark as completed'
          }
        >
          {completed && (
            <span className="taskitem__stamp">✓</span>
          )}
        </button>

        <div className="taskitem__body">
          {editing ? (
            <div className="taskitem__edit">
              <input
                className="taskitem__edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />

              <textarea
                className="taskitem__edit-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Details (optional)"
              />

              <label className="taskitem__remind-edit">
                Remind me
                <input
                  type="datetime-local"
                  value={remindAt}
                  onChange={(e) => setRemindAt(e.target.value)}
                />
              </label>

              <div className="taskitem__edit-actions">
                <button
                  type="button"
                  className="taskitem__link"
                  onClick={saveEdit}
                >
                  Save
                </button>

                <button
                  type="button"
                  className="taskitem__link taskitem__link--muted"
                  onClick={cancelEdit}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <p
                className="taskitem__title"
                onClick={() => setEditing(true)}
              >
                {task.title}
              </p>

              {task.description && (
                <p className="taskitem__description">
                  {task.description}
                </p>
              )}

              <div className="taskitem__meta">
                <span
                  className={`taskitem__priority taskitem__priority--${task.priority}`}
                >
                  {PRIORITY_LABEL[task.priority]}
                </span>

                {task.remindAt && (
                  <span className="taskitem__due" title={new Date(task.remindAt).toLocaleString()}>
                    {task.reminderFiredAt ? '🔔 Reminded' : `🔔 ${new Date(task.remindAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}`}
                  </span>
                )}

                {task.dueDate && (
                  <span className="taskitem__due">
                    Due {task.dueDate}
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          className="taskitem__delete"
          onClick={() => setShowDeleteConfirm(true)}
          aria-label="Delete task"
        >
          ✕
        </button>
      </li>

      {showDeleteConfirm && (
        <Suspense fallback={null}>
          <DeleteConfirmModal
            onCancel={() => setShowDeleteConfirm(false)}
            onConfirm={confirmDelete}
          />
        </Suspense>
      )}
    </>
  );
}
