# CPU Scheduling Simulator

A modular FastAPI backend + vanilla HTML/CSS/JS frontend that simulates CPU
process scheduling algorithms and visualizes the execution timeline, the
ready-queue trace, and all standard scheduling metrics.

## Algorithms included

| key            | algorithm                              | mode           |
|----------------|-----------------------------------------|----------------|
| `fcfs`         | First Come First Served                 | non-preemptive |
| `sjf`          | Shortest Job First                      | non-preemptive |
| `ljf`          | Longest Job First                       | non-preemptive |
| `srtf`         | Shortest Remaining Time First           | preemptive     |
| `round_robin`  | Round Robin (needs `time_quantum`)      | preemptive     |
| `priority_np`  | Priority Scheduling                     | non-preemptive |
| `priority_p`   | Priority Scheduling                     | preemptive     |

Every algorithm returns:
- **Gantt chart** — merged execution blocks `{label, start, end}` (`label` is
  a process id, `"IDLE"`, or `"CS"` for a context switch)
- **Ready-queue trace** — one snapshot per time unit of who's waiting
- **Context-switch accounting** — count + total overhead time (see below)
- **Per-process** completion time (CT), turnaround time (TAT), waiting time
  (WT), response time (RT)
- **Averages** of TAT / WT / RT

## Run it

```bash
pip install -r requirements.txt
uvicorn main:app --reload
```

Then open **http://localhost:8000**. Interactive API docs are at
**http://localhost:8000/docs**.

## Project layout

```
main.py                     FastAPI app: /api/algorithms, /api/schedule, static hosting
models.py                   Pydantic request/response models + validation

engine/
  common.py                 ProcState, gantt merging, metric/average computation
  priority_engine.py        Generic tick engine for "pick best by a key" algorithms
                             (FCFS, SJF, LJF, SRTF, Priority NP/P)
  round_robin.py            Separate FIFO+quantum engine for Round Robin

algorithms/
  fcfs.py / sjf.py / ljf.py / srtf.py / priority_np.py / priority_p.py
                             Each is just a `key_func` + a call into priority_engine
  round_robin.py             Thin wrapper over engine/round_robin.py
  registry.py                Maps algorithm key -> run() + UI metadata

static/
  index.html, style.css, app.js    Frontend (no build step, no frameworks)
```

## How the simulation works

Both engines run a **tick-by-tick loop** (1 time unit at a time). This keeps
the logic simple to read/verify/extend, and makes it trivial to log the ready
queue at every instant. It assumes integer arrival/burst times, which is the
standard textbook model.

- `engine/priority_engine.py` re-implements FCFS, SJF, LJF, SRTF and both
  Priority variants as **one function**: every tick it asks a `key_func` which
  ready process (plus the currently-running one) is "best", picks it, and
  either keeps running it (non-preemptive: only re-asks when the CPU is free)
  or preempts (preemptive: re-asks every tick). Adding a new "pick-the-best"
  algorithm is a 5-line file — see `algorithms/sjf.py` for the simplest example.
- `engine/round_robin.py` is a classic FIFO ready queue with a quantum
  countdown, kept separate because it isn't key-based.

### Context-switch overhead (extendable)

By default it's a constant `context_switch_time` (in time units) charged
whenever the CPU starts running a *different* process than the one it last
ran (never charged before the very first dispatch). Internally this is
implemented as a callback:

```python
context_switch_fn: Callable[[prev_process_id, next_process_id], int]
```

which defaults to `lambda prev, nxt: context_switch_time`. To make the
overhead depend on anything else (e.g. a fixed matrix of costs, or a cost
proportional to process size), just pass a different `context_switch_fn` into
`simulate_priority_based(...)` / `simulate_round_robin(...)` — no change to
the simulation loop is needed.

### Adding a brand-new algorithm

1. Create `algorithms/my_algo.py` with:
   ```python
   from engine.priority_engine import simulate_priority_based

   def run(processes, context_switch_time=0, **_):
       def key(state, time):
           return (state.arrival_time, state.process_id)  # your rule here
       return simulate_priority_based(processes, key_func=key, preemptive=False,
                                       context_switch_time=context_switch_time)
   ```
2. Register it in `algorithms/registry.py`.
3. It automatically appears in the frontend's algorithm dropdown and in
   `/api/algorithms` — no other changes required.

## API

`POST /api/schedule`

```json
{
  "algorithm": "priority_p",
  "processes": [
    {"process_id": "P1", "arrival_time": 0, "burst_time": 5, "priority": 2},
    {"process_id": "P2", "arrival_time": 1, "burst_time": 3, "priority": 1}
  ],
  "time_quantum": 2,
  "context_switch_time": 1,
  "priority_lower_is_higher": true
}
```

`time_quantum` is required only for `round_robin`. `priority` is required for
every process only when using `priority_np` / `priority_p`.
