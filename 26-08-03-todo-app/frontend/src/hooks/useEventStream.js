import { useEffect, useRef } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

/**
 * Subscribes to the server's Server-Sent-Events stream (event-driven push).
 * `handlers` is { reminder: fn, analytics: fn }. EventSource reconnects
 * automatically if the connection drops.
 */
export default function useEventStream(handlers) {
  const ref = useRef(handlers);
  ref.current = handlers;

  useEffect(() => {
    const token = localStorage.getItem('todo_token');
    if (!token) return undefined;

    const source = new EventSource(`${API_BASE_URL}/api/events/stream?token=${encodeURIComponent(token)}`);

    const wire = (name) =>
      source.addEventListener(name, (e) => {
        let data = null;
        try {
          data = JSON.parse(e.data);
        } catch {
          /* ignore malformed frame */
        }
        ref.current?.[name]?.(data);
      });

    wire('reminder');
    wire('analytics');

    return () => source.close();
  }, []);
}
