import pytest

from app.mafia.roles.capacity import SUPPORTED_PLAYER_COUNTS, get_role_capacity


def test_capacity_for_4_players():
    assert get_role_capacity(4) == {"mafia": 1, "police": 1, "doctor": 1, "citizen": 1}


def test_capacity_for_5_players():
    assert get_role_capacity(5) == {"mafia": 1, "police": 1, "doctor": 1, "citizen": 2}


def test_capacity_for_6_players():
    assert get_role_capacity(6) == {"mafia": 1, "police": 1, "doctor": 1, "citizen": 3}


def test_capacity_for_7_players():
    assert get_role_capacity(7) == {"mafia": 1, "police": 1, "doctor": 1, "citizen": 4}


def test_capacity_for_8_players():
    assert get_role_capacity(8) == {"mafia": 1, "police": 1, "doctor": 1, "citizen": 5}


def test_supported_counts_are_four_through_eight():
    assert SUPPORTED_PLAYER_COUNTS == (4, 5, 6, 7, 8)


def test_capacity_totals_match_player_count():
    """A row that does not sum to its player count leaves someone unassigned."""
    for player_count in SUPPORTED_PLAYER_COUNTS:
        assert sum(get_role_capacity(player_count).values()) == player_count


def test_every_room_has_exactly_one_police_and_one_doctor():
    for player_count in SUPPORTED_PLAYER_COUNTS:
        capacity = get_role_capacity(player_count)
        assert capacity["police"] == 1
        assert capacity["doctor"] == 1


def test_unsupported_player_count_raises():
    for bad in (3, 9, 0, -1):
        with pytest.raises(ValueError):
            get_role_capacity(bad)


def test_every_room_has_exactly_one_mafia():
    """The split was tuned for an even win rate; a second mafia swings it to
    85~96%. See the note in capacity.py before changing this."""
    for player_count in SUPPORTED_PLAYER_COUNTS:
        assert get_role_capacity(player_count)["mafia"] == 1


def test_returned_dict_is_a_copy_not_shared_mutable_state():
    a = get_role_capacity(4)
    a["mafia"] = 99
    b = get_role_capacity(4)
    assert b["mafia"] == 1
