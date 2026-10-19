const app = require('./app');
const connectDB = require('./config/db');
const { PORT } = require('./config/constants');
const { registerEventHandlers } = require('./events');
const reminderScheduler = require('./services/reminderScheduler');

async function start() {
  await connectDB();
  registerEventHandlers(); // wire subscribers before any event can be published
  await reminderScheduler.rehydrate(); // re-arm reminders that survived a restart
  app.listen(PORT, () => {
    console.log(`Task management API listening on http://localhost:${PORT}`);
  });
}

start();
