"""Priority Scheduling - Preemptive.

Same priority convention as priority_np.py, but the CPU is re-evaluated on
every tick, so a newly-arrived higher-priority process can interrupt the
currently running one.
"""
from engine.priority_engine import simulate_priority_based


def run(
    processes,
    context_switch_time: int = 0,
    priority_lower_is_higher: bool = True,
    **_,
):
    sign = 1 if priority_lower_is_higher else -1

    def key(state, time):
        p = state.priority if state.priority is not None else 0
        return (sign * p, state.arrival_time, state.process_id)

    return simulate_priority_based(
        processes,
        key_func=key,
        preemptive=True,
        context_switch_time=context_switch_time,
    )
