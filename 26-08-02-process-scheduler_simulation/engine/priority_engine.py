"""
One generic, tick-by-tick simulation engine that powers every "pick the best
ready process by some key" algorithm: FCFS, SJF, LJF, SRTF, Priority
(non-preemptive) and Priority (preemptive).

Each algorithm module only supplies:
  - key_func(process_state, current_time) -> a sortable tuple (smaller = picked first)
  - preemptive: bool (re-evaluate the choice every tick, or only when the CPU is free)

Context-switch overhead is injected as `context_switch_fn(prev_pid, next_pid) -> int`
so it is trivially extendable later (e.g. a cost matrix, or a cost that depends
on process size) without touching the simulation loop itself. By default it is
a constant taken from `context_switch_time`.

Assumption (documented, and easy to change via context_switch_fn):
no context switch is charged before the very first process the CPU ever runs;
every subsequent change of the *executing* process charges the overhead once.
"""
from typing import Callable, Dict, List, Optional

from .common import ProcState, build_result, init_states

KeyFunc = Callable[[ProcState, int], tuple]
CostFunc = Callable[[Optional[str], str], int]


def simulate_priority_based(
    processes,
    key_func: KeyFunc,
    preemptive: bool,
    context_switch_time: int = 0,
    context_switch_fn: Optional[CostFunc] = None,
) -> dict:
    if context_switch_fn is None:
        context_switch_fn = lambda prev, nxt: context_switch_time  # noqa: E731

    states: Dict[str, ProcState] = init_states(processes)
    n = len(states)

    t = 0
    ready: List[str] = []
    current: Optional[str] = None
    pending_start: Optional[str] = None
    cs_remaining = 0
    last_pid: Optional[str] = None
    completed = 0
    context_switches = 0
    total_cs_time = 0
    gantt_ticks: List[tuple] = []
    ready_log: List[tuple] = []

    safety_margin = n * (context_switch_time + 5) + 1000
    max_ticks = sum(p.burst_time for p in processes) + max(
        (p.arrival_time for p in processes), default=0
    ) + safety_margin

    while completed < n and t <= max_ticks:
        # 1. bring newly arrived processes into the ready pool
        for pid, st in states.items():
            if (
                st.arrival_time == t
                and st.remaining_time > 0
                and pid != current
                and pid != pending_start
                and pid not in ready
            ):
                ready.append(pid)

        # 2. mid context-switch: CPU is busy switching, nothing else happens
        if cs_remaining > 0:
            gantt_ticks.append((t, "CS"))
            ready_log.append((t, sorted(ready)))
            cs_remaining -= 1
            if cs_remaining == 0:
                current = pending_start
                pending_start = None
                states[current].start_time = t + 1
                states[current].response_time = (
                    states[current].start_time - states[current].arrival_time
                )
            t += 1
            continue

        # 3. decide who should run this tick
        candidates = ([current] if current is not None else []) + ready
        if not preemptive and current is not None:
            chosen = current  # non-preemptive: never interrupt a running process
        else:
            chosen = (
                min(candidates, key=lambda pid: key_func(states[pid], t))
                if candidates
                else None
            )

        if chosen != current:
            if current is not None:
                last_pid = current
                ready.append(current)  # preempted process goes back to the pool
            if chosen is not None:
                ready.remove(chosen)

            cs_cost = 0
            if chosen is not None and last_pid is not None:
                cs_cost = max(0, context_switch_fn(last_pid, chosen))

            current = None
            if chosen is not None and cs_cost > 0:
                pending_start = chosen
                cs_remaining = cs_cost
                context_switches += 1
                total_cs_time += cs_cost
                continue
            else:
                current = chosen
                if current is not None and states[current].start_time is None:
                    states[current].start_time = t
                    states[current].response_time = t - states[current].arrival_time

        # 4. snapshot the ready queue at this instant (current/switching excluded)
        ready_log.append((t, sorted(ready)))

        # 5. execute one time unit
        if current is None:
            gantt_ticks.append((t, "IDLE"))
        else:
            gantt_ticks.append((t, current))
            states[current].remaining_time -= 1
            if states[current].remaining_time == 0:
                states[current].completion_time = t + 1
                completed += 1
                last_pid = current
                current = None
        t += 1

    if completed < n:
        raise RuntimeError(
            "Simulation did not converge - check inputs (this should not happen "
            "for valid arrival/burst times)."
        )

    return build_result(states, gantt_ticks, ready_log, context_switches, total_cs_time)
