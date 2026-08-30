"""Mafia game — a self-contained add-on feature.

Everything this feature needs lives under `app.mafia`, so it can be dropped
into the CrewVerse backend without touching any of its files. To mount it:

    from app.mafia import routers as mafia_routers

    for router in mafia_routers:
        app.include_router(router)

All routes are namespaced under `/mafia/` so they never collide with
CrewVerse's own endpoints.
"""

from app.mafia.routers import game, persona, players, rooms

routers = [rooms.router, persona.router, game.router, players.router]

__all__ = ["routers"]
