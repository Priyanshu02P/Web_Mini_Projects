import axiosClient from './axiosClient';

const timezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

let statusPromise = null;

/** Is the server configured with a Groq key? Cached for the page's lifetime. */
export function getAiStatus() {
  if (!statusPromise) {
    statusPromise = axiosClient
      .get('/ai/status')
      .then(({ data }) => Boolean(data.data.enabled))
      .catch(() => {
        statusPromise = null; // allow a retry later
        return false;
      });
  }
  return statusPromise;
}

/** "Call mum Sunday 6pm, remind me, important" -> structured task fields. */
export async function parseTask(text) {
  const { data } = await axiosClient.post('/ai/parse-task', { text, timezone: timezone() });
  return data.data; // { title, description, priority, dueDate, remindAt }
}

/** AI-picked, ordered focus list from the user's open tasks. */
export async function getDayPlan() {
  const { data } = await axiosClient.get('/ai/plan', { params: { timezone: timezone() } });
  return data.data; // { headline, focus: [...], generatedAt }
}

export function aiErrorMessage(err) {
  return err.response?.data?.error?.message || 'The AI assistant is unavailable right now.';
}
