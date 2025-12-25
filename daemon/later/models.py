from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class ScheduleCreate(BaseModel):
    url: str
    scheduled_at: datetime
    title: str | None = None


class ScheduleUpdate(BaseModel):
    scheduled_at: datetime


class Schedule(BaseModel):
    id: UUID
    url: str
    title: str | None
    scheduled_at: datetime
    status: str = "pending"
    created_at: datetime
    opened_at: datetime | None = None


class ScheduleList(BaseModel):
    schedules: list[Schedule]
    total: int


class HealthResponse(BaseModel):
    status: str
    version: str
    uptime_seconds: float
    pending_count: int
