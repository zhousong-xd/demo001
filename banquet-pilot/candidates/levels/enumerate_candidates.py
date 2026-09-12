#!/usr/bin/env python3
"""Enumerate solutions for candidate JSON under candidates/levels/ only.

Copies the product solver API usage pattern without modifying product
levels/, dist/, or src/. Loads sibling c01.json–c12.json and prints counts.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

CAND_DIR = Path(__file__).resolve().parent
ROOT = CAND_DIR.parents[1]  # banquet-pilot/
sys.path.insert(0, str(ROOT / "src"))

from core.rules import validate_level  # noqa: E402
from core.solver import count_solutions, enumerate_solutions  # noqa: E402


def load_candidate(stem: str) -> dict:
    path = CAND_DIR / f"{stem}.json"
    with path.open(encoding="utf-8") as f:
        data = json.load(f)
    errors = validate_level(data)
    if errors:
        raise ValueError(f"invalid candidate {data.get('id', stem)}: {'; '.join(errors)}")
    return data


def report(stem: str, label: str | None = None, calm: set | None = None) -> tuple[int, int]:
    data = load_candidate(stem)
    tag = label or data.get("id", stem.upper())
    kwargs = {}
    if calm is not None:
        kwargs["calm"] = calm
    n, t = count_solutions(data, **kwargs)
    print(f"{tag}: {t} perms → {n} solution(s)")
    for s in enumerate_solutions(data, **kwargs):
        print(f"  {s}")
    return n, t


def main() -> int:
    print("=== Banquet Pilot candidate enumeration (candidates/levels only) ===")
    print(f"dir: {CAND_DIR}")

    report("c01")
    report("c02")

    c03 = load_candidate("c03")
    n0, t0 = count_solutions(c03, calm=set())
    print(f"C03 no calm: {t0} perms → {n0} solution(s)")
    n1, t1 = count_solutions(c03, calm={"rabbit"})
    print(f"C03 calm rabbit: {t1} perms → {n1} solution(s)")
    for s in enumerate_solutions(c03, calm={"rabbit"}):
        print(f"  {s}")
    for cid in ("fox", "crane", "otter", "tanuki", "hedgehog"):
        n, _ = count_solutions(c03, calm={cid})
        print(f"C03 calm {cid}: {n} solution(s)")

    report("c04")
    report("c05")
    report("c06")

    c07 = load_candidate("c07")
    n0, t0 = count_solutions(c07, calm=set())
    print(f"C07 no calm: {t0} perms → {n0} solution(s)")
    for cid in ("rabbit", "tanuki", "fox", "crane", "otter", "hedgehog"):
        n, t = count_solutions(c07, calm={cid})
        print(f"C07 calm {cid}: {t} perms → {n} solution(s)")
        if n and cid in ("rabbit", "tanuki"):
            for s in enumerate_solutions(c07, calm={cid}):
                print(f"  {s}")

    report("c08")
    report("c09")

    report("c10")
    report("c11")

    c12 = load_candidate("c12")
    n0, t0 = count_solutions(c12, calm=set())
    print(f"C12 no calm: {t0} perms → {n0} solution(s)")
    for cid in ("rabbit", "fox", "crane", "otter", "tanuki", "hedgehog"):
        n, t = count_solutions(c12, calm={cid})
        print(f"C12 calm {cid}: {t} perms → {n} solution(s)")
        if n and cid == "rabbit":
            for s in enumerate_solutions(c12, calm={cid}):
                print(f"  {s}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
