from app.mafia.persona.provider import MockPersonaProvider
from app.mafia.models.persona import PersonaScores, PERSONA_AXES


def test_mock_provider_returns_one_persona_per_player_id():
    provider = MockPersonaProvider(seed=1)
    result = provider.get_personas(["p1", "p2", "p3"])
    assert set(result.keys()) == {"p1", "p2", "p3"}
    for persona in result.values():
        assert isinstance(persona, PersonaScores)
        for axis in PERSONA_AXES:
            assert 0 <= getattr(persona, axis) <= 100


def test_mock_provider_is_deterministic_given_the_same_seed():
    a = MockPersonaProvider(seed=42).get_personas(["p1", "p2"])
    b = MockPersonaProvider(seed=42).get_personas(["p1", "p2"])
    assert a["p1"] == b["p1"]
    assert a["p2"] == b["p2"]


def test_mock_provider_varies_without_a_fixed_seed_across_instances():
    a = MockPersonaProvider(seed=1).get_personas(["p1"])
    b = MockPersonaProvider(seed=2).get_personas(["p1"])
    assert a["p1"] != b["p1"]
