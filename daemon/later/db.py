import aiosqlite
from datetime import datetime
from pathlib import Path
from uuid import UUID, uuid4

from later.models import Schedule

DATABASE_PATH = Path.home() / ".later" / "later.db"


async def init_db() -> None:
    """Initialize the database and create tables."""
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)

    async with aiosqlite.connect(DATABASE_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS schedules (
                id TEXT PRIMARY KEY,
                url TEXT NOT NULL,
                title TEXT,
                scheduled_at TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                created_at TEXT NOT NULL,
                opened_at TEXT
            )
        """)
        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_schedules_status_time
            ON schedules(status, scheduled_at)
        """)
        await db.commit()


async def create_schedule(url: str, scheduled_at: datetime, title: str | None) -> Schedule:
    """Create a new schedule."""
    schedule_id = uuid4()
    created_at = datetime.now()

    async with aiosqlite.connect(DATABASE_PATH) as db:
        await db.execute(
            """
            INSERT INTO schedules (id, url, title, scheduled_at, status, created_at)
            VALUES (?, ?, ?, ?, 'pending', ?)
            """,
            (str(schedule_id), url, title, scheduled_at.isoformat(), created_at.isoformat())
        )
        await db.commit()

    return Schedule(
        id=schedule_id,
        url=url,
        title=title,
        scheduled_at=scheduled_at,
        status="pending",
        created_at=created_at,
        opened_at=None,
    )


async def get_schedules(status: str | None = None, date: str | None = None) -> list[Schedule]:
    """Get all schedules, optionally filtered by status and date."""
    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row

        query = "SELECT * FROM schedules WHERE 1=1"
        params: list[str] = []

        if status:
            query += " AND status = ?"
            params.append(status)

        if date:
            query += " AND DATE(scheduled_at) = ?"
            params.append(date)

        query += " ORDER BY scheduled_at ASC"

        async with db.execute(query, params) as cursor:
            rows = await cursor.fetchall()

        return [
            Schedule(
                id=UUID(row["id"]),
                url=row["url"],
                title=row["title"],
                scheduled_at=datetime.fromisoformat(row["scheduled_at"]),
                status=row["status"],
                created_at=datetime.fromisoformat(row["created_at"]),
                opened_at=datetime.fromisoformat(row["opened_at"]) if row["opened_at"] else None,
            )
            for row in rows
        ]


async def get_due_schedules() -> list[Schedule]:
    """Get all pending schedules that are due (scheduled_at <= now)."""
    now = datetime.now().isoformat()

    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row

        async with db.execute(
            """
            SELECT * FROM schedules
            WHERE status = 'pending' AND scheduled_at <= ?
            ORDER BY scheduled_at ASC
            """,
            (now,)
        ) as cursor:
            rows = await cursor.fetchall()

        return [
            Schedule(
                id=UUID(row["id"]),
                url=row["url"],
                title=row["title"],
                scheduled_at=datetime.fromisoformat(row["scheduled_at"]),
                status=row["status"],
                created_at=datetime.fromisoformat(row["created_at"]),
                opened_at=datetime.fromisoformat(row["opened_at"]) if row["opened_at"] else None,
            )
            for row in rows
        ]


async def mark_opened(schedule_id: UUID) -> None:
    """Mark a schedule as opened."""
    opened_at = datetime.now().isoformat()

    async with aiosqlite.connect(DATABASE_PATH) as db:
        await db.execute(
            "UPDATE schedules SET status = 'opened', opened_at = ? WHERE id = ?",
            (opened_at, str(schedule_id))
        )
        await db.commit()


async def get_pending_count() -> int:
    """Get count of pending schedules."""
    async with aiosqlite.connect(DATABASE_PATH) as db:
        async with db.execute(
            "SELECT COUNT(*) FROM schedules WHERE status = 'pending'"
        ) as cursor:
            row = await cursor.fetchone()
            return row[0] if row else 0


async def delete_schedule(schedule_id: UUID) -> bool:
    """Delete a schedule. Returns True if deleted, False if not found."""
    async with aiosqlite.connect(DATABASE_PATH) as db:
        cursor = await db.execute(
            "DELETE FROM schedules WHERE id = ?",
            (str(schedule_id),)
        )
        await db.commit()
        return cursor.rowcount > 0


async def update_schedule(schedule_id: UUID, scheduled_at: datetime) -> bool:
    """Update a schedule's time. Returns True if updated, False if not found."""
    async with aiosqlite.connect(DATABASE_PATH) as db:
        cursor = await db.execute(
            "UPDATE schedules SET scheduled_at = ?, status = 'pending' WHERE id = ?",
            (scheduled_at.isoformat(), str(schedule_id))
        )
        await db.commit()
        return cursor.rowcount > 0
