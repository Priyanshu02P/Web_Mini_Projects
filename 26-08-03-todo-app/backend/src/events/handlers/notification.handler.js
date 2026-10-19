/** Pushes "analytics changed" hints to connected browsers over SSE. */
const sseHub = require('../sseHub');
const EVENTS = require('../eventTypes');

function register(bus) {
  bus.subscribe(EVENTS.ANALYTICS_UPDATED, 'sse.analytics', async ({ payload }) => {
    sseHub.sendTo(payload.userId, 'analytics', { at: new Date().toISOString() });
  });
}

module.exports = { register };
