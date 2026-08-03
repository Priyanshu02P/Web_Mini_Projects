import axiosClient from './axiosClient';

export async function listTasks(params = {}) {
  const { data } = await axiosClient.get('/tasks', { params });
  return data; // { data, meta }
}

export async function createTask(payload) {
  const { data } = await axiosClient.post('/tasks', payload);
  return data.data;
}

export async function updateTask(id, payload) {
  // full replace
  const { data } = await axiosClient.put(`/tasks/${id}`, payload);
  return data.data;
}

export async function patchTask(id, payload) {
  const { data } = await axiosClient.patch(`/tasks/${id}`, payload);
  return data.data;
}

export async function deleteTask(id) {
  await axiosClient.delete(`/tasks/${id}`);
}
