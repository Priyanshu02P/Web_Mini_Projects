import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import FilterBar from '../components/FilterBar';
import TaskForm from '../components/TaskForm';
import TaskList from '../components/TaskList';
import * as taskApi from '../api/taskApi';
import './DashboardPage.css';

export default function DashboardPage() {
  const [tasks, setTasks] = useState([]);
  const [status, setStatus] = useState('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [alert, setAlert] = useState({ visible: false, message: '', type: '' });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { limit: 100 };
      if (status !== 'all') params.status = status;
      if (query) params.q = query;
      const { data } = await taskApi.listTasks(params);
      setTasks(data);
    } catch (err) {
      setError('Could not load tasks. Is the API running?');
    } finally {
      setLoading(false);
    }
  }, [status, query]);

  useEffect(() => {
    const timeout = setTimeout(load, query ? 250 : 0); // light debounce for search
    return () => clearTimeout(timeout);
  }, [load, query]);

  const showAlert = (message, type) => {
    setAlert({ visible: true, message, type });
    // Automatically close the alert after 3 seconds
    setTimeout(() => {
      setAlert({ visible: false, message: '', type: '' });
    }, 3000);
  };

  async function handleCreate(payload) {
    try{
      const created = await taskApi.createTask(payload);
      setTasks((prev) => [created, ...prev]);
      showAlert('Saved successfully!', 'success');
    }
    catch (err){
      showAlert(err.message, 'error');
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
      setTasks((prev) => prev.filter((t) => t.id !== id));
      showAlert('Deleted successfully!', 'success');
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
      <Navbar />
      <main className="dashboard__main">
        <div className="dashboard__header">
          <h1 className="dashboard__title">Today's Page</h1>
          <p className="dashboard__count">
            {counts.done} of {counts.total} entries closed
          </p>
        </div>

        <TaskForm onCreate={handleCreate} />
        <FilterBar status={status} onStatusChange={setStatus} query={query} onQueryChange={setQuery} />

        {error && <p className="dashboard__error">{error}</p>}
        {loading ? (
          <p className="dashboard__loading">Loading entries…</p>
        ) : (
          <TaskList tasks={tasks} onPatch={handlePatch} onDelete={handleDelete} />
        )}
      </main>
    </div>
  );
}
