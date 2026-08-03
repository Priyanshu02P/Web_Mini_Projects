import React from 'react';
import './FilterBar.css';

const STATUSES = ['all', 'pending', 'in-progress', 'completed'];

export default function FilterBar({ status, onStatusChange, query, onQueryChange }) {
  return (
    <div className="filterbar">
      <div className="filterbar__tabs">
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            className={`filterbar__tab ${status === s ? 'filterbar__tab--active' : ''}`}
            onClick={() => onStatusChange(s)}
          >
            {s === 'all' ? 'All' : s.replace('-', ' ')}
          </button>
        ))}
      </div>
      <input
        className="filterbar__search"
        type="search"
        placeholder="Search entries…"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
      />
    </div>
  );
}
