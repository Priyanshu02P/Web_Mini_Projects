from typing import List, Literal, Optional

from pydantic import BaseModel, Field, field_validator, model_validator

AlgorithmName = Literal[
    "fcfs", "sjf", "ljf", "srtf", "round_robin", "priority_np", "priority_p"
]


class ProcessIn(BaseModel):
    process_id: str = Field(..., min_length=1, examples=["P1"])
    arrival_time: int = Field(..., ge=0, examples=[0])
    burst_time: int = Field(..., gt=0, examples=[5])
    priority: Optional[int] = Field(
        default=None, description="Lower number = higher priority by default"
    )


class ScheduleRequest(BaseModel):
    algorithm: AlgorithmName
    processes: List[ProcessIn]
    time_quantum: Optional[int] = Field(default=None, gt=0)
    context_switch_time: int = Field(default=0, ge=0)
    priority_lower_is_higher: bool = True

    @field_validator("processes")
    @classmethod
    def _validate_processes(cls, v: List[ProcessIn]):
        if not v:
            raise ValueError("At least one process is required")
        ids = [p.process_id for p in v]
        if len(ids) != len(set(ids)):
            raise ValueError("process_id values must be unique")
        return v

    @model_validator(mode="after")
    def _validate_algorithm_requirements(self):
        if self.algorithm == "round_robin" and not self.time_quantum:
            raise ValueError("time_quantum is required for round_robin")
        if self.algorithm in ("priority_np", "priority_p"):
            missing = [p.process_id for p in self.processes if p.priority is None]
            if missing:
                raise ValueError(
                    f"priority is required for every process with this algorithm "
                    f"(missing for: {', '.join(missing)})"
                )
        return self


class GanttBlock(BaseModel):
    label: str  # process_id, or "IDLE" / "CS"
    start: int
    end: int


class ReadyQueueSnapshot(BaseModel):
    time: int
    queue: List[str]


class ProcessResult(BaseModel):
    process_id: str
    arrival_time: int
    burst_time: int
    priority: Optional[int] = None
    completion_time: int
    turnaround_time: int
    waiting_time: int
    response_time: int


class Averages(BaseModel):
    avg_turnaround_time: float
    avg_waiting_time: float
    avg_response_time: float


class ScheduleResponse(BaseModel):
    algorithm: AlgorithmName
    gantt_chart: List[GanttBlock]
    ready_queue_snapshots: List[ReadyQueueSnapshot]
    process_results: List[ProcessResult]
    averages: Averages
    context_switches: int
    total_context_switch_time: int
    total_time: int


class AlgorithmInfo(BaseModel):
    key: str
    label: str
    preemptive: bool
    requires_quantum: bool
    requires_priority: bool
