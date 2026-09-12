"""Stdlib unit tests for the updater. Run: python3 -m unittest updater/test_update.py"""
import os, tempfile, unittest
from datetime import datetime, timedelta, timezone
from update import current_rank, fetch_live_summary, Notifier


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


class NotifierTest(unittest.TestCase):
    T0 = datetime(2026, 9, 12, 12, 0, tzinfo=timezone.utc)

    def make(self):
        sent = []
        self.now = self.T0
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".json"); tmp.close(); os.unlink(tmp.name)
        n = Notifier(url="http://ntfy/test", hours=6, state_path=tmp.name,
                     post=lambda url, title, body, **kw: sent.append(title), clock=lambda: self.now)
        return n, sent, tmp.name

    def sched(self, hours_ago, err=None):
        d = {"updated": (self.now - timedelta(hours=hours_ago)).isoformat()}
        if err: d["sync_error"] = err
        return d

    def test_fresh_data_is_quiet(self):
        n, sent, _ = self.make()
        n.check(self.sched(1)); self.assertEqual(sent, [])

    def test_alerts_once_then_recovers_once(self):
        n, sent, path = self.make()
        n.check(self.sched(7, "403")); n.check(self.sched(8, "403"))
        self.assertEqual(len(sent), 1); self.assertIn("stale", sent[0])
        # state survives a restart
        n2 = Notifier(url="http://ntfy/test", hours=6, state_path=path,
                      post=lambda url, title, body, **kw: sent.append(title), clock=lambda: self.now)
        n2.check(self.sched(9, "403")); self.assertEqual(len(sent), 1)
        n2.check(self.sched(0)); n2.check(self.sched(0))
        self.assertEqual(len(sent), 2); self.assertIn("recovered", sent[1])

    def test_send_failure_retries_next_cycle(self):
        n, sent, _ = self.make()
        def boom(url, title, body, **kw): raise OSError("down")
        n.post = boom; n.check(self.sched(7)); self.assertFalse(n.state["alerted"])
        n.post = lambda url, title, body, **kw: sent.append(title)
        n.check(self.sched(7)); self.assertEqual(len(sent), 1)

    def test_disabled_without_url(self):
        n, sent, _ = self.make(); n.url = ""
        n.check(self.sched(48)); self.assertEqual(sent, [])


if __name__ == "__main__":
    unittest.main()
