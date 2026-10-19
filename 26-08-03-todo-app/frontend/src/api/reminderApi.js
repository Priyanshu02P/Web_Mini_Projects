import axiosClient from './axiosClient';

export async function listReminders(params = {}) {
  const { data } = await axiosClient.get('/reminders', { params });
  return data; // { data, meta: { unread } }
}

export async function markReminderRead(id) {
  const { data } = await axiosClient.patch(`/reminders/${id}`);
  return data.data;
}

export async function markAllRemindersRead() {
  const { data } = await axiosClient.post('/reminders/read-all');
  return data.data;
}
