"""Banquet Pilot pure rule kernel (no UI)."""

from .geometry import adjacent, faces, is_end, parse_seat, seats_for_layout
from .rules import (
    CONFLICT,
    PENDING,
    SATISFIED,
    evaluate_rule,
    evaluate_level,
    validate_assignment,
    is_win,
)
from .solver import enumerate_solutions, count_solutions

__all__ = [
    "adjacent",
    "faces",
    "is_end",
    "parse_seat",
    "seats_for_layout",
    "CONFLICT",
    "PENDING",
    "SATISFIED",
    "evaluate_rule",
    "evaluate_level",
    "validate_assignment",
    "is_win",
    "enumerate_solutions",
    "count_solutions",
]
