"""Standalone dev server for the two persona minigames.

Run from `backend/`:

    uvicorn app.standalone:app --reload --host 0.0.0.0

This module is **not** part of either game — it is the local equivalent of
`frontend/src/main.tsx`. Each game is a self-contained package that exports a
`routers` list and owns a namespaced URL prefix, so mounting them into another
FastAPI app (CrewVerse's `app/main.py`) is the same loop used below. Because
the host owns `app/main.py` and `app/config.py`, this file deliberately does
not use those names.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.mafia import routers as mafia_routers
from app.marble import routers as marble_routers

API_TITLE = "Persona Minigames (standalone dev server)"

# The games are played by several people on their own phones around one table,
# so the frontend is usually reached over the LAN at the host machine's address
# rather than on localhost. Listing every possible private IP is impractical, so
# private-network origins are matched by pattern. A real deployment narrows this
# to the actual frontend domain — and CrewVerse configures its own CORS anyway.
CORS_ALLOW_ORIGIN_REGEX = (
    r"^http://("
    r"localhost"
    r"|127\.\d+\.\d+\.\d+"
    r"|10\.\d+\.\d+\.\d+"
    r"|192\.168\.\d+\.\d+"
    r"|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+"
    r"):\d+$"
)

app = FastAPI(title=API_TITLE)
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=CORS_ALLOW_ORIGIN_REGEX,
    allow_methods=["*"],
    allow_headers=["*"],
)

for router in (*mafia_routers, *marble_routers):
    app.include_router(router)


@app.get("/health", tags=["health"])
def health() -> dict[str, str]:
    return {"status": "ok"}
