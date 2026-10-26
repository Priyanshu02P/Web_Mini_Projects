import React, { useState } from 'react';
import { parseTask, aiErrorMessage } from '../api/aiApi';
import useAiEnabled from '../hooks/useAiEnabled';
import './TaskForm.css';

export default function TaskForm({ onCreate }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [remindAt, setRemindAt] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const aiEnabled = useAiEnabled();
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNote, setAiNote] = useState({ type: '', text: '' });

  // Turn a free-form sentence into structured fields. Nothing is saved here:
  // the form is filled in so the user can review/adjust before pressing Add.
  async function handleSmartFill() {
    if (!title.trim() || aiBusy) return;
    setAiBusy(true);
    setAiNote({ type: '', text: '' });
    try {
      const t = await parseTask(title.trim());
      setTitle(t.title);
      setDescription(t.description || '');
      setPriority(t.priority);
      setDueDate(t.dueDate || '');
      setRemindAt(t.remindAt || ''); // "YYYY-MM-DDTHH:mm" is what datetime-local expects
      setExpanded(true);
      setAiNote({ type: 'ok', text: 'Filled in from your note - review and press Add.' });
    } catch (err) {
      setAiNote({ type: 'error', text: aiErrorMessage(err) });
    } finally {
      setAiBusy(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      const saved = await onCreate({
        title: title.trim(),
        description: description.trim(),
        priority,
        dueDate: dueDate || null,
        remindAt: remindAt ? new Date(remindAt).toISOString() : null,
      });
      // Keep the user's input intact when the API rejects the create request.
      if (saved === false) return;
      setTitle('');
      setDescription('');
      setPriority('medium');
      setDueDate('');
      setRemindAt('');
      setExpanded(false);
      setAiNote({ type: '', text: '' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="taskform" onSubmit={handleSubmit}>
      <div className="taskform__row">
        <input
          className="taskform__title"
          type="text"
          placeholder="New entry — what needs doing?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onFocus={() => setExpanded(true)}
        />
        {aiEnabled && (
          <button
            className="taskform__ai"
            type="button"
            onClick={handleSmartFill}
            disabled={aiBusy || !title.trim()}
            title='Type a sentence like "pay rent Friday 5pm, remind me, urgent" and let AI fill the fields'
          >
            {aiBusy ? '…' : '✨ Smart fill'}
          </button>
        )}
        <button className="taskform__submit" type="submit" disabled={submitting || !title.trim()}>
          Add
        </button>
      </div>

      {aiNote.text && (
        <p className={`taskform__note taskform__note--${aiNote.type}`}>{aiNote.text}</p>
      )}

      {expanded && (
        <div className="taskform__details">
          <textarea
            className="taskform__description"
            placeholder="Details (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />
          <div className="taskform__meta">
            <label>
              Priority
              <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
            <label>
              Due
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </label>
            <label>
              Remind me
              <input
                type="datetime-local"
                value={remindAt}
                onChange={(e) => setRemindAt(e.target.value)}
              />
            </label>
          </div>
        </div>
      )}
    </form>
  );
}
