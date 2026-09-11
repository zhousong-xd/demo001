#!/usr/bin/env python3
"""Independent unit tests for Banquet Pilot T-002 rule kernel (Python reference)."""

from __future__ import annotations

import copy
import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from core.geometry import adjacent, faces, is_end, seats_for_layout  # noqa: E402
from core.loader import load_level  # noqa: E402
from core.rules import (  # noqa: E402
    CONFLICT,
    PENDING,
    SATISFIED,
    evaluate_level,
    evaluate_rule,
    is_win,
    resolve_effective_calm,
    validate_assignment,
    validate_level,
)
from core.solver import count_solutions, enumerate_solutions  # noqa: E402


def _status_map(results):
    return {rid: st for rid, st in results}


class GeometryTests(unittest.TestCase):
    def test_adjacent_same_row_only(self):
        self.assertTrue(adjacent("A1", "A2"))
        self.assertTrue(adjacent("A2", "A3"))
        self.assertFalse(adjacent("A1", "A3"))
        self.assertFalse(adjacent("A1", "B1"))
        self.assertFalse(adjacent("A1", "B2"))

    def test_faces(self):
        self.assertTrue(faces("A2", "B2"))
        self.assertFalse(faces("A1", "B2"))
        self.assertFalse(faces("A1", "A1"))

    def test_end_four_vs_six(self):
        four = seats_for_layout("4")
        six = seats_for_layout("6")
        self.assertTrue(is_end("A1", four))
        self.assertTrue(is_end("A2", four))
        self.assertTrue(is_end("B1", four))
        self.assertTrue(is_end("B2", four))
        self.assertTrue(is_end("A1", six))
        self.assertFalse(is_end("A2", six))
        self.assertTrue(is_end("A3", six))
        self.assertTrue(is_end("B1", six))
        self.assertFalse(is_end("B2", six))
        self.assertTrue(is_end("B3", six))


class PartialStateTests(unittest.TestCase):
    def test_unseated_is_pending_not_conflict(self):
        level = load_level("l01")
        asg = {"fox": None, "rabbit": "A2", "crane": "B1", "otter": "B2"}
        statuses = _status_map(evaluate_level(level, asg))
        self.assertEqual(statuses["L01-r1"], PENDING)
        self.assertEqual(statuses["L01-r3"], PENDING)
        self.assertEqual(statuses["L01-r2"], SATISFIED)

    def test_not_beside_conflict_when_both_seated(self):
        level = load_level("l01")
        asg = {"fox": "A1", "rabbit": "A2", "crane": "B1", "otter": "B2"}
        self.assertEqual(
            evaluate_rule(
                level["rules"][2],
                asg,
                available_seats=level["seats"],
            ),
            CONFLICT,
        )


class ValidationTests(unittest.TestCase):
    def test_illegal_id_and_duplicate_seat(self):
        level = load_level("l01")
        errs = validate_assignment(
            {"fox": "A1", "ghost": "A2"},
            characters=level["characters"],
            available_seats=level["seats"],
        )
        self.assertTrue(any("illegal character" in e for e in errs))

        errs2 = validate_assignment(
            {"fox": "A1", "rabbit": "A1", "crane": "B1", "otter": "B2"},
            characters=level["characters"],
            available_seats=level["seats"],
        )
        self.assertTrue(any("duplicate seat" in e for e in errs2))

    def test_illegal_seat(self):
        level = load_level("l01")
        errs = validate_assignment(
            {"fox": "A3", "rabbit": "A2", "crane": "B1", "otter": "B2"},
            characters=level["characters"],
            available_seats=level["seats"],
        )
        self.assertTrue(any("not available" in e for e in errs))


class L01Tests(unittest.TestCase):
    def test_known_solution_wins(self):
        level = load_level("l01")
        sol = level["known_solution"]
        self.assertTrue(is_win(level, sol))

    def test_enumerate_24_one_solution(self):
        level = load_level("l01")
        n, total = count_solutions(level)
        self.assertEqual(total, 24)
        self.assertEqual(n, 1)
        sols = enumerate_solutions(level)
        self.assertEqual(sols[0], level["known_solution"])


class L02Tests(unittest.TestCase):
    def test_known_solution_wins(self):
        level = load_level("l02")
        self.assertTrue(is_win(level, level["known_solution"]))

    def test_enumerate_720_one_solution(self):
        level = load_level("l02")
        n, total = count_solutions(level)
        self.assertEqual(total, 720)
        self.assertEqual(n, 1)
        self.assertEqual(enumerate_solutions(level)[0], level["known_solution"])


class L03Tests(unittest.TestCase):
    def test_no_calm_zero_solutions(self):
        level = load_level("l03")
        n, total = count_solutions(level, calm=set())
        self.assertEqual(total, 720)
        self.assertEqual(n, 0)

    def test_calm_rabbit_one_solution(self):
        level = load_level("l03")
        n, total = count_solutions(level, calm={"rabbit"})
        self.assertEqual(total, 720)
        self.assertEqual(n, 1)
        self.assertEqual(
            enumerate_solutions(level, calm={"rabbit"})[0],
            level["known_solution_with_calm_rabbit"],
        )
        self.assertTrue(
            is_win(level, level["known_solution_with_calm_rabbit"], calm={"rabbit"})
        )

    def test_calm_other_five_still_zero(self):
        level = load_level("l03")
        others = ["fox", "crane", "otter", "tanuki", "hedgehog"]
        for cid in others:
            n, _ = count_solutions(level, calm={cid})
            self.assertEqual(n, 0, f"calm on {cid} should still be 0 solutions")

    def test_calm_but_other_rules_fail_not_win(self):
        level = load_level("l03")
        bad = {
            "fox": "A2",
            "otter": "A1",
            "hedgehog": "A3",
            "rabbit": "B1",
            "crane": "B2",
            "tanuki": "B3",
        }
        self.assertFalse(is_win(level, bad, calm={"rabbit"}))


class AntiCaseTests(unittest.TestCase):
    def test_anti1_l01_calm_rabbit_no_props(self):
        level = load_level("l01")
        self.assertFalse(is_win(level, level["known_solution"], calm={"rabbit"}))
        _, errs = resolve_effective_calm(level, {"rabbit"})
        self.assertTrue(errs)

    def test_anti2_l03_two_calms_stock1(self):
        level = load_level("l03")
        self.assertFalse(
            is_win(
                level,
                level["known_solution_with_calm_rabbit"],
                calm={"rabbit", "fox"},
            )
        )
        _, errs = resolve_effective_calm(level, {"rabbit", "fox"})
        self.assertTrue(errs)

    def test_anti3_initial_calm_unknown_id(self):
        level = copy.deepcopy(load_level("l03"))
        level["initial_calm"] = ["rabbit", "ghost"]
        errs = validate_level(level)
        self.assertTrue(any("unknown character" in e or "ghost" in e for e in errs))
        self.assertFalse(is_win(level, level["known_solution_with_calm_rabbit"]))

    def test_anti4_duplicate_rule_id(self):
        level = copy.deepcopy(load_level("l01"))
        level["rules"].append(
            {"id": "L01-r1", "kind": "at", "subject": "fox", "seat": "B2"}
        )
        errs = validate_level(level)
        self.assertTrue(any("duplicate rule id" in e for e in errs))
        self.assertFalse(is_win(level, level["known_solution"]))
        results = evaluate_level(level, level["known_solution"])
        self.assertEqual(len(results), 4)
        self.assertTrue(any(rid == "L01-r1" and st == CONFLICT for rid, st in results))

    def test_anti5_duplicate_seat(self):
        level = copy.deepcopy(load_level("l01"))
        level["seats"] = list(level["seats"]) + ["A1"]
        errs = validate_level(level)
        self.assertTrue(any("duplicate seat" in e for e in errs))
        self.assertFalse(is_win(level, level["known_solution"]))


class MissingRefTests(unittest.TestCase):
    def test_subject_missing(self):
        level = copy.deepcopy(load_level("l01"))
        level["rules"][0]["subject"] = "ghost"
        errs = validate_level(level)
        self.assertTrue(any("subject not in characters" in e for e in errs))

    def test_other_missing(self):
        level = copy.deepcopy(load_level("l01"))
        level["rules"][2]["other"] = "ghost"
        errs = validate_level(level)
        self.assertTrue(any("other not in characters" in e for e in errs))

    def test_seat_missing(self):
        level = copy.deepcopy(load_level("l01"))
        level["rules"][0]["seat"] = "A9"
        errs = validate_level(level)
        self.assertTrue(any("seat not available" in e for e in errs))


class SolverScriptSmoke(unittest.TestCase):
    def test_levels_json_roundtrip(self):
        for name in ("l01", "l02", "l03"):
            path = ROOT / "levels" / f"{name}.json"
            with path.open(encoding="utf-8") as f:
                data = json.load(f)
            self.assertIn("rules", data)
            self.assertIn("characters", data)
            self.assertEqual(validate_level(data), [])


if __name__ == "__main__":
    unittest.main(verbosity=2)
