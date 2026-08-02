"""
Round Robin simulation engine.

Kept separate from priority_engine.py because RR is queue-based (FIFO with a
quantum) rather than "pick the best key" based, but it shares the same
ProcState / build_result plumbing from common.py.

Ordering convention used when a quantum expires at the same tick a new
process arrives: the newly arrived process is enqueued *before* the
just-preempted process (the most common textbook convention).
"""
from collections import deque
from typing import Callable, Dict, List, Optional

from .common import ProcState, build_result, init_states

CostFunc = Callable[[Optional[str], str], int]


def simulate_round_robin(
    processes,
    time_quantum: int,
    context_switch_time: int = 0,
    context_switch_fn: Optional[CostFunc] = None,
) -> dict:
    if time_quantum is None or time_quantum <= 0:
        raise ValueError("Round Robin requires a positive time_quantum")
    if context_switch_fn is None:
        context_switch_fn = lambda prev, nxt: context_switch_time  # noqa: E731

    states: Dict[str, ProcState] = init_states(processes)
    n = len(states)

    t = 0
    ready: deque = deque()
    in_ready: set = set()
    current: Optional[str] = None
    pending_start: Optional[str] = None
    pending_requeue: Optional[str] = None
    quantum_left = 0
    cs_remaining = 0
    last_pid: Optional[str] = None
    completed = 0
    context_switches = 0
    total_cs_time = 0
    gantt_ticks: List[tuple] = []
    ready_log: List[tuple] = []

    safety_margin = n * (time_quantum + context_switch_time + 5) + 1000
    max_ticks = sum(p.burst_time for p in processes) + max(
        (p.arrival_time for p in processes), default=0
    ) + safety_margin

    while completed < n and t <= max_ticks:
        # 1. new arrivals join the back of the queue
        for pid, st in states.items():
            if (
                st.arrival_time == t
                and st.remaining_time > 0
                and pid != current
                and pid != pending_start
                and pid != pending_requeue
                and pid not in in_ready
            ):
                ready.append(pid)
                in_ready.add(pid)

        # 2. the process preempted at the end of the previous tick re-joins
        #    the queue *after* fresh arrivals (standard RR convention)
        if pending_requeue is not None:
            ready.append(pending_requeue)
            in_ready.add(pending_requeue)
            pending_requeue = None

        # 3. mid context-switch
        if cs_remaining > 0:
            gantt_ticks.append((t, "CS"))
            ready_log.append((t, list(ready)))
            cs_remaining -= 1
            if cs_remaining == 0:
                current = pending_start
                pending_start = None
                quantum_left = time_quantum
                if states[current].start_time is None:
                    states[current].start_time = t + 1
                    states[current].response_time = (
                        states[current].start_time - states[current].arrival_time
                    )
            t += 1
            continue

        # 4. dispatch a new process if the CPU is free
        if current is None and ready:
            candidate = ready.popleft()
            in_ready.discard(candidate)
            cs_cost = 0
            if last_pid is not None:
                cs_cost = max(0, context_switch_fn(last_pid, candidate))

            if cs_cost > 0:
                pending_start = candidate
                cs_remaining = cs_cost
                context_switches += 1
                total_cs_time += cs_cost
                continue
            else:
                current = candidate
                quantum_left = time_quantum
                if states[current].start_time is None:
                    states[current].start_time = t
                    states[current].response_time = t - states[current].arrival_time

        # 5. snapshot ready queue
        ready_log.append((t, list(ready)))

        # 6. execute one time unit
        if current is None:
            gantt_ticks.append((t, "IDLE"))
        else:
            gantt_ticks.append((t, current))
            states[current].remaining_time -= 1
            quantum_left -= 1
            if states[current].remaining_time == 0:
                states[current].completion_time = t + 1
                completed += 1
                last_pid = current
                current = None
            elif quantum_left == 0:
                pending_requeue = current
                last_pid = current
                current = None
        t += 1

    if completed < n:
        raise RuntimeError(
            "Simulation did not converge - check inputs (this should not happen "
            "for valid arrival/burst times)."
        )

    return build_result(states, gantt_ticks, ready_log, context_switches, total_cs_time)
