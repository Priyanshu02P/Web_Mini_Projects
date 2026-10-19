import React, { useEffect, useState } from 'react';
import { getProductivity } from '../api/analyticsApi';
import './AnalyticsPanel.css';

const dayLabel = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString([], { weekday: 'short', timeZone: 'UTC' });

export default function AnalyticsPanel({ refreshKey }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // Small debounce: a burst of server events triggers a single refetch.
    const t = setTimeout(async () => {
      try {
        const result = await getProductivity(7);
        if (!cancelled) {
          setData(result);
          setError(false);
        }
      } catch {
        if (!cancelled) setError(true);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [refreshKey]);

  if (error && !data) return <p className="analytics__note">Analytics unavailable right now.</p>;
  if (!data) return <p className="analytics__note">Loading analytics…</p>;

  const max = Math.max(1, ...data.daily.map((d) => Math.max(d.completed, d.created)));

  return (
    <section className="analytics" aria-label="Productivity analytics">
      <div className="analytics__head">
        <h2 className="analytics__title">Productivity · last {data.windowDays} days</h2>
        <span className="analytics__live" title="Updates live as events are processed">● live</span>
      </div>

      <div className="analytics__cards">
        <Stat label="Completed" value={data.window.completed} />
        <Stat label="Completion rate" value={`${data.completionRate}%`} />
        <Stat label="Streak" value={`${data.streakDays}d`} />
        <Stat label="Overdue" value={data.totals.overdue} warn={data.totals.overdue > 0} />
        <Stat
          label="Avg. time to finish"
          value={data.window.avgCompletionHours == null ? '—' : `${data.window.avgCompletionHours}h`}
        />
        <Stat label="Reminders pending" value={data.reminders.upcoming} />
      </div>

      <div className="analytics__chart" role="img" aria-label="Tasks created and completed per day">
        {data.daily.map((d) => (
          <div className="analytics__col" key={d.date} title={`${d.date}: ${d.created} created, ${d.completed} completed`}>
            <div className="analytics__bars">
              <span className="analytics__bar analytics__bar--created" style={{ height: `${(d.created / max) * 100}%` }} />
              <span className="analytics__bar analytics__bar--done" style={{ height: `${(d.completed / max) * 100}%` }} />
            </div>
            <span className="analytics__day">{dayLabel(d.date)}</span>
          </div>
        ))}
      </div>
      <p className="analytics__legend">
        <span className="analytics__dot analytics__dot--created" /> created{' '}
        <span className="analytics__dot analytics__dot--done" /> completed · days are UTC
      </p>

      <p className="analytics__pipeline" title="In-process event bus">
        Event bus · {data.pipeline.processed} processed · {data.pipeline.queued} queued ·{' '}
        {data.pipeline.failed} failed · {data.pipeline.activeReminderTimers} timer
        {data.pipeline.activeReminderTimers === 1 ? '' : 's'}
      </p>
    </section>
  );
}

function Stat({ label, value, warn }) {
  return (
    <div className={`analytics__stat ${warn ? 'analytics__stat--warn' : ''}`}>
      <span className="analytics__value">{value}</span>
      <span className="analytics__label">{label}</span>
    </div>
  );
}
