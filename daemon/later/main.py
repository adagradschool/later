import logging
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from later import db
from later.api import router
from later.scheduler import start_scheduler, stop_scheduler

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle."""
    logger.info("Starting Later daemon...")
    await db.init_db()
    start_scheduler()
    yield
    stop_scheduler()
    logger.info("Later daemon stopped")


app = FastAPI(
    title="Later",
    description="Schedule URLs to open at specific times",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


def run():
    """Run the daemon server."""
    uvicorn.run(
        "later.main:app",
        host="127.0.0.1",
        port=7432,
        reload=False,
    )


if __name__ == "__main__":
    run()
