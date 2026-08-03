/**
 * Run with `npm run seed` to (re)create the data-volume files from scratch,
 * restoring the 5 default users and clearing all tasks.
 */
const store = require('./store');

store.init();
store.saveUsers(store.DEFAULT_USERS);
store.saveTasks([]);

console.log(`Seeded ${store.DEFAULT_USERS.length} users:`);
store.DEFAULT_USERS.forEach((u) => console.log(`  - ${u.email} / ${u.password}`));
