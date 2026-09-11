"""Static full-seat enumerator (no UI)."""

from __future__ import annotations

import itertools
from typing import Any, Dict, Iterator, List, Mapping, Optional, Sequence, Set, Tuple

from .geometry import seats_for_layout
from .rules import is_win


def _full_assignments(
    characters: Sequence[str], seats: Sequence[str]
) -> Iterator[Dict[str, str]]:
    if len(characters) != len(seats):
        raise ValueError(
            f"enumerator requires |characters|==|seats|, got {len(characters)} vs {len(seats)}"
        )
    for perm in itertools.permutations(seats):
        yield {c: s for c, s in zip(characters, perm)}


def enumerate_solutions(
    level: Mapping[str, Any],
    *,
    calm: Optional[Set[str]] = None,
) -> List[Dict[str, str]]:
    characters = list(level["characters"])
    seats = list(level.get("seats") or seats_for_layout(level["layout"]))
    solutions: List[Dict[str, str]] = []
    for asg in _full_assignments(characters, seats):
        if is_win(level, asg, calm=calm):
            solutions.append(asg)
    return solutions


def count_solutions(
    level: Mapping[str, Any],
    *,
    calm: Optional[Set[str]] = None,
) -> Tuple[int, int]:
    """Return (solution_count, permutations_checked)."""
    characters = list(level["characters"])
    seats = list(level.get("seats") or seats_for_layout(level["layout"]))
    n = 0
    total = 0
    for asg in _full_assignments(characters, seats):
        total += 1
        if is_win(level, asg, calm=calm):
            n += 1
    return n, total
