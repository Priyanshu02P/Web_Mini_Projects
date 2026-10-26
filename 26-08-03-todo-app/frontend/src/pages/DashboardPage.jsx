import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import FilterBar from '../components/FilterBar';
import TaskForm from '../components/TaskForm';
import TaskList from '../components/TaskList';
import CacheStats from '../components/CacheStats';
import AnalyticsPanel from '../components/AnalyticsPanel';
import PlannerPanel from '../components/PlannerPanel';
import useEventStream from '../hooks/useEventStream';
import * as reminderApi from '../api/reminderApi';
import { invalidate } from '../api/cache';
import * as taskApi from '../api/taskApi';
import './DashboardPage.css';

export default function DashboardPage() {
  const [tasks, setTasks] = useState([]);
  const [status, setStatus] = useState('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 5, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [alert, setAlert] = useState({ visible: false, message: '', type: '' });

  // --- Event-driven push: reminders + analytics refresh hints (SSE) ---------
  const [reminders, setReminders] = useState([]);
  const [unread, setUnread] = useState(0);
  const [analyticsTick, setAnalyticsTick] = useState(0);

  useEffect(() => {
    reminderApi
      .listReminders({ limit: 20 })
      .then((res) => {
        setReminders(res.data);
        setUnread(res.meta.unread);
      })
      .catch(() => {});
  }, []);

  useEventStream({
    reminder: (reminder) => {
      if (!reminder) return;
      setReminders((prev) => [reminder, ...prev.filter((r) => r.id !== reminder.id)].slice(0, 20));
      setUnread((n) => n + 1);
      showAlert(`🔔 ${reminder.message}`, 'success');
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification('Ledger reminder', { body: reminder.message });
      }
      // The task's "Reminded" badge comes from the server; refresh the list.
      invalidateTasks();
    },
    analytics: () => setAnalyticsTick((n) => n + 1),
  });

  // Drop the 60s client cache and reload so the task shows its "Reminded" badge.
  function invalidateTasks() {
    invalidate('tasks:');
    invalidate('task:');
    load();
  }

  async function handleReadReminder(id) {
    setReminders((prev) => prev.map((r) => (r.id === id ? { ...r, read: true } : r)));
    setUnread((n) => Math.max(n - 1, 0));
    try {
      await reminderApi.markReminderRead(id);
    } catch {
      /* next fetch will reconcile */
    }
  }

  async function handleReadAllReminders() {
    setReminders((prev) => prev.map((r) => ({ ...r, read: true })));
    setUnread(0);
    try {
      await reminderApi.markAllRemindersRead();
    } catch {
      /* next fetch will reconcile */
    }
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { limit: 5, page };
      if (status !== 'all') params.status = status;
      if (query) params.q = query;
      const response = await taskApi.listTasks(params);
      setTasks(response.data);
      setMeta(response.meta);
    } catch (err) {
      setError('Could not load tasks. Is the API running?');
    } finally {
      setLoading(false);
    }
  }, [status, query, page]);

  useEffect(() => {
    const timeout = setTimeout(load, query ? 250 : 0); // light debounce for search
    return () => clearTimeout(timeout);
  }, [load, query]);

  const handleStatusChange = (newStatus) => {
    setStatus(newStatus);
    setPage(1);
  };

  const handleQueryChange = (newQuery) => {
    setQuery(newQuery);
    setPage(1);
  };

  const showAlert = (message, type) => {
    setAlert({ visible: true, message, type });
    // Automatically close the alert after 3 seconds
    setTimeout(() => {
      setAlert({ visible: false, message: '', type: '' });
    }, 3000);
  };

  async function handleCreate(payload) {
    try{
      await taskApi.createTask(payload);
      showAlert('Saved successfully!', 'success');
      invalidate('tasks:');
      if (page !== 1) {
        setPage(1);
      } else {
        await load();
      }
      setAnalyticsTick((n) => n + 1);
      return true;
    }
    catch (err){
      showAlert(err.response?.data?.error?.message || err.message || 'Could not save task.', 'error');
      return false;
    }
  }

  async function handlePatch(id, changes) {
    try{
      const updated = await taskApi.patchTask(id, changes);
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
      showAlert('Updated successfully!', 'success');
    }
    catch (err){
      showAlert(err.message, 'error');
    }
  }

  async function handleDelete(id) {
    try{
      await taskApi.deleteTask(id);
      showAlert('Deleted successfully!', 'success');
      if (page > 1 && tasks.length === 1) {
        setPage((prev) => prev - 1);
      } else {
        load();
      }
    }
    catch (err){
      showAlert(err.message, 'error');
    }
  }

  const counts = useMemo(
    () => ({
      total: tasks.length,
      done: tasks.filter((t) => t.status === 'completed').length,
    }),
    [tasks]
  );

  return (
    <div className="dashboard">
      <div style={{ padding: '20px', position: 'relative' }}>
      {/* Floating Alert Box */}
      {alert.visible && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          padding: '15px 25px',
          borderRadius: '5px',
          color: '#fff',
          backgroundColor: alert.type === 'error' ? '#ef4444' : '#22c55e',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          zIndex: 1000
        }}>
          {alert.message}
        </div>
      )}</div>
      <Navbar
        reminders={reminders}
        unread={unread}
        onReadReminder={handleReadReminder}
        onReadAllReminders={handleReadAllReminders}
      />
      <main className="dashboard__main">
        <div className="dashboard__header">
          <h1 className="dashboard__title">Today's Page</h1>
          <p className="dashboard__count">
            {Math.min(page * 5, meta.total)} of {meta.total} entries
          </p>
        </div>

        <AnalyticsPanel refreshKey={analyticsTick} />

        <PlannerPanel onStart={(id) => handlePatch(id, { status: 'in-progress' })} />

        <TaskForm onCreate={handleCreate} />
        <FilterBar status={status} onStatusChange={handleStatusChange} query={query} onQueryChange={handleQueryChange} />

        <CacheStats />

        {error && <p className="dashboard__error">{error}</p>}
        {loading ? (
          <p className="dashboard__loading">Loading entries…</p>
        ) : (
          <>
            <TaskList tasks={tasks} onPatch={handlePatch} onDelete={handleDelete} />
            
            {meta.totalPages > 1 && (
              <div className="dashboard__pagination">
                <button
                  type="button"
                  className="dashboard__pagination-btn"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  ← Previous
                </button>
                <span className="dashboard__pagination-info">
                  Page {meta.page} of {meta.totalPages}
                </span>
                <button
                  type="button"
                  className="dashboard__pagination-btn"
                  disabled={page === meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
