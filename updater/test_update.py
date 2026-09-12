"""Stdlib unit tests for the updater. Run: python3 -m unittest updater/test_update.py"""
import unittest
from update import current_rank


def ev(date, status, rank):
    return {"date": date, "kickoff": None, "status": status, "rank": rank}


class CurrentRankTest(unittest.TestCase):
    def test_uses_next_unplayed_game(self):
        events = [ev("2026-09-06", "post", 19), ev("2026-09-12", "pre", 17)]
        self.assertEqual(current_rank(events), 17)

    def test_unranked_next_game_means_unranked(self):
        # Dropping out of the poll must not fall back to an older ranked game.
        events = [ev("2026-09-06", "post", 19), ev("2026-09-12", "pre", None)]
        self.assertIsNone(current_rank(events))

    def test_season_over_uses_last_game(self):
        events = [ev("2026-09-06", "post", None), ev("2026-11-28", "post", 12)]
        self.assertEqual(current_rank(events), 12)

    def test_no_events(self):
        self.assertIsNone(current_rank([]))


if __name__ == "__main__":
    unittest.main()
