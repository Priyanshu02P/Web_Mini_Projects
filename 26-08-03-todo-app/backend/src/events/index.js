const eventBus = require('./eventBus');

function registerEventHandlers() {
  require('./handlers/reminder.handler').register(eventBus);
  require('./handlers/analytics.handler').register(eventBus);
  require('./handlers/notification.handler').register(eventBus);
}

module.exports = { eventBus, registerEventHandlers };
