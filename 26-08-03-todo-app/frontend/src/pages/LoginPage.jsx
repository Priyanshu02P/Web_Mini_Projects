import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './LoginPage.css';

export default function LoginPage() {
  const { user, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      const message = err.response?.data?.error?.message || 'Something went wrong. Try again.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login">
      <form className="login__card" onSubmit={handleSubmit}>
        <div className="login__seal">✒</div>
        <h1 className="login__title">Ledger</h1>
        <p className="login__subtitle">Sign the register to open today's page.</p>

        <label className="login__label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          className="login__input"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user1@todo.local"
          required
        />

        <label className="login__label" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          className="login__input"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
        />

        {error && <p className="login__error">{error}</p>}

        <button className="login__submit" type="submit" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="login__hint">
          5 demo accounts exist: user1@todo.local … user5@todo.local, password matches the
          number (e.g. password1).
        </p>
      </form>
    </div>
  );
}
