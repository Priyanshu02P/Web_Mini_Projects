import React, { useState } from 'react';
import { getDayPlan, aiErrorMessage } from '../api/aiApi';
import useAiEnabled from '../hooks/useAiEnabled';
import './PlannerPanel.css';

export default function PlannerPanel({ onStart }) {
  const enabled = useAiEnabled();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!enabled) return null;

  async function generate() {
    setLoading(true);
    setError('');
    try {
      setPlan(await getDayPlan());
    } catch (err) {
      setError(aiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function start(id) {
    await onStart(id);
    setPlan((p) => ({
      ...p,
      focus: p.focus.map((f) => (f.id === id ? { ...f, status: 'in-progress' } : f)),
    }));
  }


  return (
    <section className="planner" aria-label="AI day planner">
      <div className="planner__head">
        <h2 className="planner__title">✨ Plan my day</h2>
        <button type="button" className="planner__btn" onClick={generate} disabled={loading}>
          {loading ? 'Thinking…' : plan ? 'Re-plan' : 'Suggest a plan'}
        </button>
      </div>

      {!plan && !loading && !error && (
        <p className="planner__hint">
          Let the assistant look at your open entries and pick what to tackle first.
        </p>
      )}
      {error && <p className="planner__error">{error}</p>}

      {plan && (
        <>
          <p className="planner__headline">{plan.headline}</p>
          {plan.focus.length > 0 && (
            <ol className="planner__list">
              {plan.focus.map((f) => (
                <li key={f.id} className="planner__item">
                  <div className="planner__main">
                    <span className="planner__task">{f.title}</span>
                    <span className="planner__meta">
                      <span className={`planner__pill planner__pill--${f.priority}`}>{f.priority}</span>
                      {f.dueDate && <span>due {f.dueDate}</span>}
                      {f.status === 'in-progress' && <span>in progress</span>}
                    </span>
                    <span className="planner__reason">{f.reason}</span>
                  </div>
                  {f.status === 'pending' && (
                    <button type="button" className="planner__start" onClick={() => start(f.id)}>
                      Start
                    </button>
                  )}
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </section>
  );
}
