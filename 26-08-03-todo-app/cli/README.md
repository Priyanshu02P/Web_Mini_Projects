# todo-cli

Terminal client for the Task Management API. This is the required "sign in via CLI" piece.

## Setup

```bash
cd cli
npm install
npm link          # makes the `todo` command available globally, or run via `node index.js`
```

## Usage

```bash
todo login                 # prompts for email + password, stores a token in ~/.todo-cli/config.json
todo whoami                # confirm who you're signed in as
todo list                  # list your tasks
todo list -s pending       # filter by status
todo add "Buy milk" -p high
todo done <taskId>
todo rm <taskId>
todo logout
```

Demo accounts (seeded by the backend):

| email               | password  |
|---------------------|-----------|
| user1@todo.local    | password1 |
| user2@todo.local    | password2 |
| user3@todo.local    | password3 |
| user4@todo.local    | password4 |
| user5@todo.local    | password5 |

By default the CLI talks to `http://localhost:4000`. Override with `--api-url` on `login`,
or set `TODO_API_URL`.
