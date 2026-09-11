#!/usr/bin/env python3
"""Static solver summary for L01/L02/L03 (acceptance numbers)."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from core.loader import load_level  # noqa: E402
from core.solver import count_solutions, enumerate_solutions  # noqa: E402


def main() -> int:
    print("=== Banquet Pilot static enumeration ===")
    l01 = load_level("l01")
    n, t = count_solutions(l01)
    print(f"L01: {t} perms → {n} solution(s)")
    for s in enumerate_solutions(l01):
        print(f"  {s}")

    l02 = load_level("l02")
    n, t = count_solutions(l02)
    print(f"L02: {t} perms → {n} solution(s)")
    for s in enumerate_solutions(l02):
        print(f"  {s}")

    l03 = load_level("l03")
    n0, t0 = count_solutions(l03, calm=set())
    print(f"L03 no calm: {t0} perms → {n0} solution(s)")
    n1, t1 = count_solutions(l03, calm={"rabbit"})
    print(f"L03 calm rabbit: {t1} perms → {n1} solution(s)")
    for s in enumerate_solutions(l03, calm={"rabbit"}):
        print(f"  {s}")
    for cid in ("fox", "crane", "otter", "tanuki", "hedgehog"):
        n, _ = count_solutions(l03, calm={cid})
        print(f"L03 calm {cid}: {n} solution(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
