import React from 'react';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="navbar">
      <div className="navbar__brand">
        <span className="navbar__mark">✒</span>
        <span className="navbar__title">Ledger</span>
      </div>
      <div className="navbar__user">
        <span className="navbar__email">{user?.email}</span>
        <button className="navbar__logout" onClick={logout} type="button">
          Sign out
        </button>
      </div>
    </header>
  );
}
