import React from 'react';
import { useAuth } from '../context/AuthContext';
import ReminderBell from './ReminderBell';
import './Navbar.css';

export default function Navbar({ reminders, unread, onReadReminder, onReadAllReminders }) {
  const { user, logout } = useAuth();

  return (
    <header className="navbar">
      <div className="navbar__brand">
        <span className="navbar__mark">✒</span>
        <span className="navbar__title">Ledger</span>
      </div>
      <div className="navbar__user">
        <ReminderBell
          reminders={reminders}
          unread={unread}
          onRead={onReadReminder}
          onReadAll={onReadAllReminders}
        />
        <span className="navbar__email">{user?.email}</span>
        <button className="navbar__logout" onClick={logout} type="button">
          Sign out
        </button>
      </div>
    </header>
  );
}
