from app.marble.game.board import allocate_stat_tile_counts, generate_board
from app.marble.models.room import BOARD_SIZE, PersonaStats, TileType


def stats(logic=0, empathy=0, drive=0, caution=0) -> PersonaStats:
    return PersonaStats(logic=logic, empathy=empathy, drive=drive, caution=caution)


class TestAllocateStatTileCounts:
    def test_splits_evenly_when_weights_are_equal(self):
        counts = allocate_stat_tile_counts({"logic": 0, "empathy": 0, "drive": 0, "caution": 0})
        assert counts == {"logic": 2, "empathy": 2, "drive": 2, "caution": 2}

    def test_gives_all_slots_to_a_single_dominant_category(self):
        counts = allocate_stat_tile_counts({"logic": 100, "empathy": 0, "drive": 0, "caution": 0})
        assert counts == {"logic": 8, "empathy": 0, "drive": 0, "caution": 0}

    def test_always_sums_to_eight(self):
        counts = allocate_stat_tile_counts({"logic": 37, "empathy": 12, "drive": 5, "caution": 91})
        assert sum(counts.values()) == 8


class TestGenerateBoard:
    def test_has_twelve_tiles_starting_with_start(self):
        board = generate_board(stats(), stats())
        assert len(board) == BOARD_SIZE
        assert board[0].index == 0
        assert board[0].type is TileType.START

    def test_contains_exactly_three_chance_tiles(self):
        board = generate_board(stats(logic=80), stats(empathy=60))
        assert sum(1 for t in board if t.type is TileType.CHANCE) == 3

    def test_stat_tiles_match_the_proportional_allocation(self):
        a = stats(logic=80, empathy=10, drive=20, caution=30)
        b = stats(logic=20, empathy=10, drive=20, caution=30)
        board = generate_board(a, b)
        expected = allocate_stat_tile_counts(
            {
                "logic": a.logic + b.logic,
                "empathy": a.empathy + b.empathy,
                "drive": a.drive + b.drive,
                "caution": a.caution + b.caution,
            }
        )
        assert sum(1 for t in board if t.type is TileType.LOGIC) == expected["logic"]
        assert sum(1 for t in board if t.type is TileType.EMPATHY) == expected["empathy"]
        assert sum(1 for t in board if t.type is TileType.DRIVE) == expected["drive"]
        assert sum(1 for t in board if t.type is TileType.CAUTION) == expected["caution"]

    def test_indices_are_sequential(self):
        board = generate_board(stats(), stats())
        assert [t.index for t in board] == list(range(BOARD_SIZE))
