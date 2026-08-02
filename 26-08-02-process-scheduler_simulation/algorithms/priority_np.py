"""Priority Scheduling - Non-Preemptive.

By convention (configurable) a *lower* priority number means *higher*
priority (this is the most common convention, e.g. priority 1 beats priority 5).
Set priority_lower_is_higher=False to flip that.
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
        preemptive=False,
        context_switch_time=context_switch_time,
    )
