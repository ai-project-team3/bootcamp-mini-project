from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .routers import health, participants, reports, rooms, survey, users

app = FastAPI(title="얼음땡 API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(users.router)
app.include_router(rooms.router)
app.include_router(participants.router)
app.include_router(survey.router)
app.include_router(reports.router)
