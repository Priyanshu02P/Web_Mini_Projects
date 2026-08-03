const app = require('./app');
const { PORT } = require('./config/constants');

app.listen(PORT, () => {
  console.log(`Task management API listening on http://localhost:${PORT}`);
});
