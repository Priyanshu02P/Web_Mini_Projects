/**
 * sseHub.js — keeps open Server-Sent-Events connections per user and pushes
 * events (reminders, analytics refresh hints) to the browser in real time.
 */
const connections = new Map(); // userId -> Set<res>

function addClient(userId, res) {
  if (!connections.has(userId)) connections.set(userId, new Set());
  connections.get(userId).add(res);
}

function removeClient(userId, res) {
  const set = connections.get(userId);
  if (!set) return;
  set.delete(res);
  if (set.size === 0) connections.delete(userId);
}

function sendTo(userId, eventName, data) {
  const set = connections.get(String(userId));
  if (!set) return 0;
  const frame = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of set) res.write(frame);
  return set.size;
}

// Heartbeat keeps proxies/browsers from closing idle streams.
setInterval(() => {
  for (const set of connections.values()) {
    for (const res of set) res.write(': ping\n\n');
  }
}, 25000).unref();

module.exports = { addClient, removeClient, sendTo };
