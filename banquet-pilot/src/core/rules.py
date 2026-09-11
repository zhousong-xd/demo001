"""Rule evaluation: PENDING / SATISFIED / CONFLICT."""

from __future__ import annotations

from typing import Any, Dict, Iterable, List, Mapping, Optional, Sequence, Set

from .geometry import adjacent, faces, is_end, parse_seat, seats_for_layout

PENDING = "PENDING"
SATISFIED = "SATISFIED"
CONFLICT = "CONFLICT"

Status = str
Assignment = Mapping[str, Optional[str]]  # character_id -> seat or None


def _seated(assignment: Assignment, char_id: str) -> Optional[str]:
    seat = assignment.get(char_id)
    if seat is None or seat == "":
        return None
    return seat


def evaluate_rule(
    rule: Mapping[str, Any],
    assignment: Assignment,
    *,
    available_seats: Sequence[str],
    calm: Optional[Set[str]] = None,
) -> Status:
    """Evaluate one rule against a (possibly partial) seating.

    `calm` is the set of character ids currently in calm state.
    """
    calm = calm or set()
    kind = rule["kind"]
    subject = rule["subject"]

    if kind == "at":
        seat = _seated(assignment, subject)
        if seat is None:
            return PENDING
        target = rule["seat"]
        return SATISFIED if seat == target else CONFLICT

    if kind == "not_beside":
        other = rule["other"]
        a = _seated(assignment, subject)
        b = _seated(assignment, other)
        if a is None or b is None:
            return PENDING
        return CONFLICT if adjacent(a, b) else SATISFIED

    if kind == "faces":
        other = rule["other"]
        a = _seated(assignment, subject)
        b = _seated(assignment, other)
        if a is None or b is None:
            return PENDING
        return SATISFIED if faces(a, b) else CONFLICT

    if kind == "end":
        seat = _seated(assignment, subject)
        if seat is None:
            return PENDING
        return SATISFIED if is_end(seat, available_seats) else CONFLICT

    if kind == "same_row":
        other = rule["other"]
        a = _seated(assignment, subject)
        b = _seated(assignment, other)
        if a is None or b is None:
            return PENDING
        return SATISFIED if parse_seat(a)[0] == parse_seat(b)[0] else CONFLICT

    if kind == "not_faces_unless":
        # subject must not face `other` unless subject has the required state
        other = rule["other"]
        required = rule.get("unless_state", "calm")
        a = _seated(assignment, subject)
        b = _seated(assignment, other)
        if a is None or b is None:
            return PENDING
        if required == "calm" and subject in calm:
            return SATISFIED  # waived
        if faces(a, b):
            return CONFLICT
        return SATISFIED

    raise ValueError(f"unknown rule kind: {kind!r}")


def validate_assignment(
    assignment: Assignment,
    *,
    characters: Sequence[str],
    available_seats: Sequence[str],
    calm: Optional[Set[str]] = None,
) -> List[str]:
    """Return a list of validation error strings (empty if ok)."""
    errors: List[str] = []
    calm = calm or set()
    char_set = set(characters)
    seat_set = set(available_seats)

    for cid in assignment:
        if cid not in char_set:
            errors.append(f"illegal character id: {cid}")

    occupied: Dict[str, str] = {}
    for cid, seat in assignment.items():
        if seat is None or seat == "":
            continue
        try:
            parse_seat(seat)
        except ValueError as e:
            errors.append(str(e))
            continue
        if seat not in seat_set:
            errors.append(f"seat {seat} not available in this level")
            continue
        if seat in occupied:
            errors.append(f"duplicate seat {seat}: {occupied[seat]} and {cid}")
        else:
            occupied[seat] = cid

    for cid in calm:
        if cid not in char_set:
            errors.append(f"calm on unknown character: {cid}")

    return errors


def evaluate_level(
    level: Mapping[str, Any],
    assignment: Assignment,
    *,
    calm: Optional[Set[str]] = None,
) -> Dict[str, Status]:
    available = list(level.get("seats") or seats_for_layout(level["layout"]))
    calm_set = set(calm or []) | set(level.get("initial_calm") or [])
    # merge assignment prop state if provided via keyword only
    results: Dict[str, Status] = {}
    for rule in level["rules"]:
        rid = rule.get("id") or f"{rule['kind']}:{rule['subject']}"
        results[rid] = evaluate_rule(
            rule, assignment, available_seats=available, calm=calm_set
        )
    return results


def is_win(
    level: Mapping[str, Any],
    assignment: Assignment,
    *,
    calm: Optional[Set[str]] = None,
) -> bool:
    characters = list(level["characters"])
    available = list(level.get("seats") or seats_for_layout(level["layout"]))
    if validate_assignment(
        assignment, characters=characters, available_seats=available, calm=calm
    ):
        return False
    # all characters seated on distinct legal seats
    seats = [_seated(assignment, c) for c in characters]
    if any(s is None for s in seats):
        return False
    if len(set(seats)) != len(seats):
        return False
    if any(s not in available for s in seats):  # type: ignore[operator]
        return False
    statuses = evaluate_level(level, assignment, calm=calm)
    return all(s == SATISFIED for s in statuses.values())
