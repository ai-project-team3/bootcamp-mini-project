from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .routers import answers, demo_rooms, health, impressions, players, reports, rooms, statements, type_guess

app = FastAPI(title="얼음땡 API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(rooms.router)
app.include_router(demo_rooms.router)
app.include_router(players.router)
app.include_router(answers.router)
app.include_router(impressions.router)
app.include_router(statements.router)
app.include_router(type_guess.router)
app.include_router(reports.router)
