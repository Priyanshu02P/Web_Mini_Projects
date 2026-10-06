import React from 'react';
import './PageLoader.css';

export default function PageLoader({ label = 'Loading…' }) {
  return (
    <div className="pageloader" role="status" aria-live="polite">
      <span className="pageloader__spinner" aria-hidden="true" />
      <span className="pageloader__label">{label}</span>
    </div>
  );
}
