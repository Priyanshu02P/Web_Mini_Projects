import axiosClient from './axiosClient';

export async function login(email, password) {
  const { data } = await axiosClient.post('/auth/login', { email, password });
  return data; // { token, user }
}

export async function fetchMe() {
  const { data } = await axiosClient.get('/auth/me');
  return data.data;
}
