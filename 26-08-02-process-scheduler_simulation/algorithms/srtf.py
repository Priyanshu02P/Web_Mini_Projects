"""Shortest Remaining Time First - preemptive version of SJF."""
from engine.priority_engine import simulate_priority_based


def run(processes, context_switch_time: int = 0, **_):
    def key(state, time):
        return (state.remaining_time, state.arrival_time, state.process_id)

    return simulate_priority_based(
        processes,
        key_func=key,
        preemptive=True,
        context_switch_time=context_switch_time,
    )
