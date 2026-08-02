"""
Shared building blocks used by every scheduling engine (priority-style engine
and round-robin engine): the internal process state, gantt-chart merging,
metric computation and final result assembly.

Keeping this logic in one place is what makes the individual algorithm files
(algorithms/fcfs.py, algorithms/sjf.py, ...) tiny -- they only need to supply
a "selection key" or, for Round Robin, a quantum.
"""
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple


@dataclass
class ProcState:
    """Mutable, per-process working state used only during simulation."""
    process_id: str
    arrival_time: int
    burst_time: int
    priority: Optional[int] = None

    remaining_time: int = field(init=False)
    start_time: Optional[int] = None       # first time it ever got the CPU
    response_time: Optional[int] = None    # start_time - arrival_time
    completion_time: Optional[int] = None

    def __post_init__(self):
        self.remaining_time = self.burst_time


def init_states(processes) -> Dict[str, ProcState]:
    states: Dict[str, ProcState] = {}
    for p in processes:
        states[p.process_id] = ProcState(
            process_id=p.process_id,
            arrival_time=p.arrival_time,
            burst_time=p.burst_time,
            priority=p.priority,
        )
    return states


def merge_gantt(ticks: List[Tuple[int, str]]) -> List[dict]:
    """Collapse a list of (time, label) 1-unit ticks into contiguous blocks."""
    blocks: List[dict] = []
    for t, label in ticks:
        if blocks and blocks[-1]["label"] == label and blocks[-1]["end"] == t:
            blocks[-1]["end"] = t + 1
        else:
            blocks.append({"label": label, "start": t, "end": t + 1})
    return blocks


def compute_metrics(states: Dict[str, ProcState]) -> List[dict]:
    results = []
    for pid, st in states.items():
        ct = st.completion_time
        tat = ct - st.arrival_time
        wt = tat - st.burst_time
        rt = st.response_time if st.response_time is not None else 0
        results.append(
            {
                "process_id": pid,
                "arrival_time": st.arrival_time,
                "burst_time": st.burst_time,
                "priority": st.priority,
                "completion_time": ct,
                "turnaround_time": tat,
                "waiting_time": wt,
                "response_time": rt,
            }
        )
    # keep the original submission order (helps the UI), fall back to arrival time
    results.sort(key=lambda r: (r["arrival_time"], r["process_id"]))
    return results


def build_result(
    states: Dict[str, ProcState],
    gantt_ticks: List[Tuple[int, str]],
    ready_log: List[Tuple[int, list]],
    context_switches: int,
    total_context_switch_time: int,
) -> dict:
    gantt = merge_gantt(gantt_ticks)
    metrics = compute_metrics(states)
    n = len(metrics)
    avg_tat = sum(m["turnaround_time"] for m in metrics) / n
    avg_wt = sum(m["waiting_time"] for m in metrics) / n
    avg_rt = sum(m["response_time"] for m in metrics) / n
    ready_queue_snapshots = [{"time": t, "queue": q} for t, q in ready_log]

    return {
        "gantt_chart": gantt,
        "ready_queue_snapshots": ready_queue_snapshots,
        "process_results": metrics,
        "averages": {
            "avg_turnaround_time": round(avg_tat, 2),
            "avg_waiting_time": round(avg_wt, 2),
            "avg_response_time": round(avg_rt, 2),
        },
        "context_switches": context_switches,
        "total_context_switch_time": total_context_switch_time,
        "total_time": gantt[-1]["end"] if gantt else 0,
    }
