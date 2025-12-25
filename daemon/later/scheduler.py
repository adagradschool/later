import asyncio
import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from later import db
from later.opener import open_url

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


async def check_and_open_due() -> None:
    """Check for due schedules and open them."""
    try:
        due_schedules = await db.get_due_schedules()

        for schedule in due_schedules:
            logger.info(f"Opening scheduled URL: {schedule.url}")
            success = open_url(schedule.url)

            if success:
                await db.mark_opened(schedule.id)
                logger.info(f"Marked schedule {schedule.id} as opened")
            else:
                logger.error(f"Failed to open URL: {schedule.url}")

    except Exception as e:
        logger.error(f"Error checking due schedules: {e}")


def start_scheduler() -> None:
    """Start the background scheduler."""
    scheduler.add_job(
        check_and_open_due,
        "interval",
        seconds=30,
        id="check_due",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("Scheduler started - checking every 30 seconds")


def stop_scheduler() -> None:
    """Stop the background scheduler."""
    scheduler.shutdown(wait=False)
    logger.info("Scheduler stopped")
