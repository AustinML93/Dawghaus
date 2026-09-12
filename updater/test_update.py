"""Stdlib unit tests for the updater. Run: python3 -m unittest updater/test_update.py"""
import unittest
from update import current_rank, fetch_live_summary


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


class LiveSummaryTest(unittest.TestCase):
    PAYLOAD = {"header": {"competitions": [{
        "status": {"period": 2, "displayClock": "1:23", "type": {"shortDetail": "1:23 - 2nd"}},
        "competitors": [{"id": "264", "homeAway": "home", "score": "10"},
                        {"id": "328", "homeAway": "away", "score": "7"}]}]}}

    def test_scores_from_summary_strings(self):
        live = fetch_live_summary("401858446", 264, fetch=lambda url: self.PAYLOAD)
        self.assertEqual((live["us"], live["them"]), (10, 7))
        self.assertEqual(live["status"]["displayClock"], "1:23")

    def test_missing_scores_returns_none(self):
        payload = {"header": {"competitions": [{"competitors": [{"id": "264", "score": None}, {"id": "328", "score": None}]}]}}
        self.assertIsNone(fetch_live_summary("x", 264, fetch=lambda url: payload))

    def test_fetch_error_returns_none(self):
        def boom(url): raise OSError("403")
        self.assertIsNone(fetch_live_summary("x", 264, fetch=boom))


if __name__ == "__main__":
    unittest.main()
