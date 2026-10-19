import axiosClient from './axiosClient';

// Not cached on purpose: analytics are refreshed whenever the server pushes
// an "analytics" event over the stream.
export async function getProductivity(days = 7) {
  const { data } = await axiosClient.get('/analytics/productivity', { params: { days } });
  return data.data;
}
