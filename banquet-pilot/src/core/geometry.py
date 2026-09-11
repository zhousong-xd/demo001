"""Seat geometry for Banquet Pilot.

Rows A (top) and B (bottom); column index increases left → right.
- adjacent: same row and |index| == 1 (never across the table; never diagonal)
- faces: different row and same column index
- end: leftmost or rightmost *available* seat in that row for the level
"""

from __future__ import annotations

from typing import Iterable, Sequence, Tuple


Seat = str  # e.g. "A1"


def parse_seat(seat: Seat) -> Tuple[str, int]:
    if len(seat) < 2 or seat[0] not in ("A", "B") or not seat[1:].isdigit():
        raise ValueError(f"illegal seat id: {seat!r}")
    return seat[0], int(seat[1:])


def seats_for_layout(layout: str) -> Tuple[Seat, ...]:
    layout = layout.lower()
    if layout in ("4", "l01", "four"):
        return ("A1", "A2", "B1", "B2")
    if layout in ("6", "l02", "l03", "six"):
        return ("A1", "A2", "A3", "B1", "B2", "B3")
    raise ValueError(f"unknown layout: {layout!r}")


def adjacent(a: Seat, b: Seat) -> bool:
    ra, ia = parse_seat(a)
    rb, ib = parse_seat(b)
    return ra == rb and abs(ia - ib) == 1


def faces(a: Seat, b: Seat) -> bool:
    ra, ia = parse_seat(a)
    rb, ib = parse_seat(b)
    return ra != rb and ia == ib


def is_end(seat: Seat, available: Sequence[Seat]) -> bool:
    if seat not in available:
        return False
    row, _ = parse_seat(seat)
    row_seats = sorted(
        (s for s in available if parse_seat(s)[0] == row),
        key=lambda s: parse_seat(s)[1],
    )
    if not row_seats:
        return False
    return seat == row_seats[0] or seat == row_seats[-1]


def row_mates(seat: Seat, available: Iterable[Seat]) -> Tuple[Seat, ...]:
    row, _ = parse_seat(seat)
    return tuple(s for s in available if parse_seat(s)[0] == row)
