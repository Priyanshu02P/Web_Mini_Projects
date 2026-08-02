from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from algorithms.registry import ALGORITHMS
from models import AlgorithmInfo, ScheduleRequest, ScheduleResponse

BASE_DIR = Path(__file__).parent
STATIC_DIR = BASE_DIR / "static"

app = FastAPI(
    title="CPU Scheduling Simulator",
    description=(
        "Simulates FCFS, SJF, LJF, SRTF, Round Robin and Priority "
        "(preemptive/non-preemptive) CPU scheduling. Returns a Gantt chart, "
        "a tick-by-tick ready-queue timeline, per-process CT/TAT/WT/RT and "
        "their averages, plus context-switch overhead accounting."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/algorithms", response_model=list[AlgorithmInfo])
def list_algorithms():
    return [
        AlgorithmInfo(
            key=key,
            label=meta["label"],
            preemptive=meta["preemptive"],
            requires_quantum=meta["requires_quantum"],
            requires_priority=meta["requires_priority"],
        )
        for key, meta in ALGORITHMS.items()
    ]


@app.post("/api/schedule", response_model=ScheduleResponse)
def schedule(req: ScheduleRequest):
    meta = ALGORITHMS.get(req.algorithm)
    if meta is None:
        raise HTTPException(status_code=400, detail=f"Unknown algorithm '{req.algorithm}'")

    kwargs = {
        "context_switch_time": req.context_switch_time,
    }
    if meta["requires_quantum"]:
        kwargs["time_quantum"] = req.time_quantum
    if meta["requires_priority"]:
        kwargs["priority_lower_is_higher"] = req.priority_lower_is_higher

    try:
        result = meta["run"](req.processes, **kwargs)
    except (ValueError, RuntimeError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    result["algorithm"] = req.algorithm
    return result


# --- static frontend -------------------------------------------------------
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/")
def index():
    return FileResponse(STATIC_DIR / "index.html")
