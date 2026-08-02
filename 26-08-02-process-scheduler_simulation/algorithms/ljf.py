"""Longest Job First - non-preemptive, longest burst time first."""
from engine.priority_engine import simulate_priority_based


def run(processes, context_switch_time: int = 0, **_):
    def key(state, time):
        # negative burst so the *largest* burst sorts first with min()
        return (-state.remaining_time, state.arrival_time, state.process_id)

    return simulate_priority_based(
        processes,
        key_func=key,
        preemptive=False,
        context_switch_time=context_switch_time,
    )
