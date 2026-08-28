from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .routers import (
    answers,
    health,
    impressions,
    liar,
    nunchi,
    persona,
    players,
    questions,
    reports,
    rooms,
    telepathy,
    trait,
    type_guess,
)

app = FastAPI(title="얼음땡 API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(rooms.router)
app.include_router(players.router)
app.include_router(questions.router)
app.include_router(answers.router)
app.include_router(impressions.router)
app.include_router(telepathy.router)
app.include_router(trait.router)
app.include_router(nunchi.router)
app.include_router(liar.router)
app.include_router(type_guess.router)
app.include_router(persona.router)
app.include_router(reports.router)
