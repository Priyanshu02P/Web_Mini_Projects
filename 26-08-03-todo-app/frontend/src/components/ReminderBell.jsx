import React, { useState } from 'react';
import './ReminderBell.css';

function formatWhen(iso) {
  return new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

export default function ReminderBell({ reminders = [], unread = 0, onRead, onReadAll }) {
  const [open, setOpen] = useState(false);
  const canNotify = typeof Notification !== 'undefined';
  const [perm, setPerm] = useState(canNotify ? Notification.permission : 'denied');

  async function enableDesktop() {
    if (!canNotify) return;
    setPerm(await Notification.requestPermission());
  }

  return (
    <div className="bell">
      <button
        type="button"
        className="bell__btn"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Reminders, ${unread} unread`}
        aria-expanded={open}
      >
        🔔
        {unread > 0 && <span className="bell__badge">{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <div className="bell__panel" role="dialog" aria-label="Reminders">
          <div className="bell__head">
            <span>Reminders</span>
            {unread > 0 && (
              <button type="button" className="bell__link" onClick={onReadAll}>
                Mark all read
              </button>
            )}
          </div>

          {reminders.length === 0 ? (
            <p className="bell__empty">Nothing yet. Add a reminder when you create an entry.</p>
          ) : (
            <ul className="bell__list">
              {reminders.map((r) => (
                <li key={r.id} className={`bell__item ${r.read ? '' : 'bell__item--unread'}`}>
                  <div>
                    <p className="bell__msg">{r.message}</p>
                    <p className="bell__time">{formatWhen(r.remindAt)}</p>
                  </div>
                  {!r.read && (
                    <button type="button" className="bell__link" onClick={() => onRead(r.id)}>
                      Dismiss
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          {canNotify && perm === 'default' && (
            <button type="button" className="bell__enable" onClick={enableDesktop}>
              Enable desktop alerts
            </button>
          )}
        </div>
      )}
    </div>
  );
}
