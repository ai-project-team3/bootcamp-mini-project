import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings

# Nothing else configures logging, so app.* loggers (report_gen, question_gen) had
# no handler and every logger.info/logger.exception call was silently dropped —
# made it impossible to tell an LLM success from a fallback while testing.
logging.basicConfig(level=logging.INFO, format="%(levelname)s:%(name)s:%(message)s")
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
