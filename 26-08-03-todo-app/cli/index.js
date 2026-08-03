#!/usr/bin/env node
/**
 * Minimal CLI for the Task Management API.
 *
 * Auth flow (as required by the project brief - email/password, no hashing,
 * this is only a learning project):
 *   1. `todo login` prompts for email + password
 *   2. Sends them to POST /api/auth/login
 *   3. Stores the returned JWT in ~/.todo-cli/config.json
 *   4. Every other command reads that token and sends it as
 *      `Authorization: Bearer <token>`
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const readline = require('readline');
const { Command } = require('commander');
const axios = require('axios');

const CONFIG_DIR = path.join(os.homedir(), '.todo-cli');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const DEFAULT_API_URL = process.env.TODO_API_URL || 'http://localhost:4000';

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function saveConfig(config) {
  if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

function prompt(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    if (hidden) {
      // Mask keystrokes so the password isn't echoed to the terminal.
      rl._writeToOutput = function writeToOutput(str) {
        if (str.trim() === question.trim() || str.includes('\n')) {
          rl.output.write(str);
        } else {
          rl.output.write('*');
        }
      };
    }
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function client() {
  const { token, apiUrl } = loadConfig();
  return axios.create({
    baseURL: apiUrl || DEFAULT_API_URL,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    validateStatus: () => true,
  });
}

function printApiError(res) {
  const message = res.data && res.data.error ? res.data.error.message : res.statusText;
  console.error(`Error (${res.status}): ${message}`);
}

const program = new Command();
program.name('todo').description('Task Management API CLI').version('1.0.0');

program
  .command('login')
  .description('Sign in with email + password and store the session token locally')
  .option('--api-url <url>', 'API base URL', DEFAULT_API_URL)
  .action(async (opts) => {
    const email = await prompt('Email: ');
    const password = await prompt('Password: ', { hidden: true });
    console.log(); // newline after masked input

    const api = axios.create({ baseURL: opts.apiUrl, validateStatus: () => true });
    const res = await api.post('/api/auth/login', { email, password });

    if (res.status !== 200) return printApiError(res);

    saveConfig({ token: res.data.token, apiUrl: opts.apiUrl, email: res.data.user.email });
    console.log(`Logged in as ${res.data.user.email}. Token saved to ${CONFIG_FILE}`);
  });

program
  .command('logout')
  .description('Clear the locally stored session token')
  .action(() => {
    saveConfig({});
    console.log('Logged out.');
  });

program
  .command('whoami')
  .description('Show the currently signed-in user')
  .action(async () => {
    const res = await client().get('/api/auth/me');
    if (res.status !== 200) return printApiError(res);
    console.log(res.data.data);
  });

program
  .command('list')
  .description('List your tasks')
  .option('-s, --status <status>', 'filter by status (pending|in-progress|completed)')
  .option('-p, --priority <priority>', 'filter by priority (low|medium|high)')
  .action(async (opts) => {
    const res = await client().get('/api/tasks', { params: opts });
    if (res.status !== 200) return printApiError(res);
    if (res.data.data.length === 0) {
      console.log('No tasks found.');
      return;
    }
    res.data.data.forEach((t) => {
      console.log(`[${t.id}] (${t.status}, ${t.priority}) ${t.title}`);
    });
  });

program
  .command('add <title>')
  .description('Create a new task')
  .option('-d, --description <description>', 'task description', '')
  .option('-p, --priority <priority>', 'low|medium|high', 'medium')
  .action(async (title, opts) => {
    const res = await client().post('/api/tasks', {
      title,
      description: opts.description,
      priority: opts.priority,
    });
    if (res.status !== 201) return printApiError(res);
    console.log(`Created task [${res.data.data.id}] ${res.data.data.title}`);
  });

program
  .command('done <id>')
  .description('Mark a task as completed')
  .action(async (id) => {
    const res = await client().patch(`/api/tasks/${id}`, { status: 'completed' });
    if (res.status !== 200) return printApiError(res);
    console.log(`Task [${id}] marked completed.`);
  });

program
  .command('rm <id>')
  .description('Delete a task')
  .action(async (id) => {
    const res = await client().delete(`/api/tasks/${id}`);
    if (res.status !== 204) return printApiError(res);
    console.log(`Task [${id}] deleted.`);
  });

program.parseAsync(process.argv);
