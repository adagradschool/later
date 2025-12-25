import time
from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from later import __version__, db
from later.models import HealthResponse, Schedule, ScheduleCreate, ScheduleList, ScheduleUpdate

router = APIRouter(prefix="/api/v1")

START_TIME = time.time()


@router.post("/schedules", status_code=status.HTTP_201_CREATED)
async def create_schedule(data: ScheduleCreate) -> Schedule:
    """Create a new scheduled URL."""
    schedule = await db.create_schedule(
        url=data.url,
        scheduled_at=data.scheduled_at,
        title=data.title,
    )
    return schedule


@router.get("/schedules")
async def list_schedules(
    status: str | None = None,
    date: str | None = None,
) -> ScheduleList:
    """List all scheduled URLs."""
    schedules = await db.get_schedules(status=status, date=date)
    return ScheduleList(schedules=schedules, total=len(schedules))


@router.patch("/schedules/{schedule_id}")
async def update_schedule(schedule_id: UUID, data: ScheduleUpdate) -> dict:
    """Update a scheduled URL's time."""
    updated = await db.update_schedule(schedule_id, data.scheduled_at)
    if not updated:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return {"status": "updated"}


@router.delete("/schedules/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_schedule(schedule_id: UUID) -> None:
    """Delete a scheduled URL."""
    deleted = await db.delete_schedule(schedule_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Schedule not found")


@router.get("/health")
async def health_check() -> HealthResponse:
    """Health check endpoint."""
    pending_count = await db.get_pending_count()
    return HealthResponse(
        status="ok",
        version=__version__,
        uptime_seconds=time.time() - START_TIME,
        pending_count=pending_count,
    )
