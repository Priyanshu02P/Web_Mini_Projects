"""Round Robin - FIFO ready queue with a fixed time quantum."""
from engine.round_robin import simulate_round_robin


def run(processes, time_quantum: int, context_switch_time: int = 0, **_):
    return simulate_round_robin(
        processes,
        time_quantum=time_quantum,
        context_switch_time=context_switch_time,
    )
