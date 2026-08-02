"""First Come First Served - non-preemptive, ordered purely by arrival time."""
from engine.priority_engine import simulate_priority_based


def run(processes, context_switch_time: int = 0, **_):
    def key(state, time):
        return (state.arrival_time, state.process_id)

    return simulate_priority_based(
        processes,
        key_func=key,
        preemptive=False,
        context_switch_time=context_switch_time,
    )
