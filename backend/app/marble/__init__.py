"""Persona Marble — a self-contained add-on feature.

A 1-on-1 couple board game. Everything it needs lives under `app.marble`, and
every route is namespaced under `/marble/`, so it can be mounted into another
FastAPI app without touching a single file of that app:

    from app.marble import routers as marble_routers

    for router in marble_routers:
        app.include_router(router)
"""

from app.marble.routers import game, rooms

routers = [rooms.router, game.router]

__all__ = ["routers"]
