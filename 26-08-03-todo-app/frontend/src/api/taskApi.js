import axiosClient from './axiosClient';
import { cached, setCache, invalidate, deleteKey } from './cache';

const LIST_PREFIX = 'tasks:';
const itemKey = (id) => `task:${id}`;

// Stable key regardless of param order / empty values
function listKey(params) {
  const sorted = Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== '')
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  return `${LIST_PREFIX}${sorted}`;
}

/** GET /tasks — cached 60s per unique params */
export async function listTasks(params = {}) {
  return cached(listKey(params), async () => {
    const { data } = await axiosClient.get('/tasks', { params });
    // Warm the /tasks/:id cache with the rows we just received
    (data.data || []).forEach((task) => setCache(itemKey(task.id), task));
    return data; // { data, meta }
  });
}

/** GET /tasks/:id — cached 60s */
export async function getTask(id) {
  return cached(itemKey(id), async () => {
    const { data } = await axiosClient.get(`/tasks/${id}`);
    return data.data;
  });
}

export async function createTask(payload) {
  const { data } = await axiosClient.post('/tasks', payload);
  invalidate(LIST_PREFIX); // lists/pagination changed
  setCache(itemKey(data.data.id), data.data);
  return data.data;
}

export async function updateTask(id, payload) {
  // full replace
  const { data } = await axiosClient.put(`/tasks/${id}`, payload);
  invalidate(LIST_PREFIX);
  setCache(itemKey(id), data.data);
  return data.data;
}

export async function patchTask(id, payload) {
  const { data } = await axiosClient.patch(`/tasks/${id}`, payload);
  invalidate(LIST_PREFIX);
  setCache(itemKey(id), data.data);
  return data.data;
}

export async function deleteTask(id) {
  await axiosClient.delete(`/tasks/${id}`);
  invalidate(LIST_PREFIX);
  deleteKey(itemKey(id));
}
