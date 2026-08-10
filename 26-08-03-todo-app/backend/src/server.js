const app = require('./app');
const connectDB = require('./config/db');
const { PORT } = require('./config/constants');

async function start() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Task management API listening on http://localhost:${PORT}`);
  });
}

start();
