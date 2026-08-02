"""
Central registry of available scheduling algorithms.

Adding a brand-new algorithm to the whole app (engine + API + UI dropdown)
is just:
  1. write algorithms/my_algo.py with a `run(processes, **kwargs) -> dict`
  2. add one line to ALGORITHMS below
"""
from algorithms import fcfs, sjf, ljf, srtf, round_robin, priority_np, priority_p

ALGORITHMS = {
    "fcfs": {
        "label": "First Come First Served (FCFS)",
        "run": fcfs.run,
        "preemptive": False,
        "requires_quantum": False,
        "requires_priority": False,
    },
    "sjf": {
        "label": "Shortest Job First (SJF, Non-Preemptive)",
        "run": sjf.run,
        "preemptive": False,
        "requires_quantum": False,
        "requires_priority": False,
    },
    "ljf": {
        "label": "Longest Job First (LJF, Non-Preemptive)",
        "run": ljf.run,
        "preemptive": False,
        "requires_quantum": False,
        "requires_priority": False,
    },
    "srtf": {
        "label": "Shortest Remaining Time First (SRTF, Preemptive)",
        "run": srtf.run,
        "preemptive": True,
        "requires_quantum": False,
        "requires_priority": False,
    },
    "round_robin": {
        "label": "Round Robin",
        "run": round_robin.run,
        "preemptive": True,
        "requires_quantum": True,
        "requires_priority": False,
    },
    "priority_np": {
        "label": "Priority Scheduling (Non-Preemptive)",
        "run": priority_np.run,
        "preemptive": False,
        "requires_quantum": False,
        "requires_priority": True,
    },
    "priority_p": {
        "label": "Priority Scheduling (Preemptive)",
        "run": priority_p.run,
        "preemptive": True,
        "requires_quantum": False,
        "requires_priority": True,
    },
}
