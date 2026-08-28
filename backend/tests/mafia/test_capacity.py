import pytest

from app.mafia.roles.capacity import get_role_capacity


def test_capacity_for_4_players():
    assert get_role_capacity(4) == {"mafia": 1, "police": 1, "doctor": 1, "citizen": 1}


def test_capacity_for_5_players():
    assert get_role_capacity(5) == {"mafia": 1, "police": 1, "doctor": 1, "citizen": 2}


def test_capacity_for_6_players():
    assert get_role_capacity(6) == {"mafia": 2, "police": 1, "doctor": 1, "citizen": 2}


def test_capacity_totals_match_player_count():
    for player_count in (4, 5, 6):
        assert sum(get_role_capacity(player_count).values()) == player_count


def test_unsupported_player_count_raises():
    with pytest.raises(ValueError):
        get_role_capacity(7)


def test_returned_dict_is_a_copy_not_shared_mutable_state():
    a = get_role_capacity(4)
    a["mafia"] = 99
    b = get_role_capacity(4)
    assert b["mafia"] == 1
