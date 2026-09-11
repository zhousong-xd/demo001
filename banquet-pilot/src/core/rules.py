"""Rule evaluation: PENDING / SATISFIED / CONFLICT.

REFERENCE IMPLEMENTATION — production kernel is native JavaScript
(src/core/*.js). Keep behavior aligned with the JS kernel.
"""

from __future__ import annotations

from typing import Any, Dict, Iterable, List, Mapping, Optional, Sequence, Set, Tuple

from .geometry import adjacent, faces, is_end, parse_seat, seats_for_layout

PENDING = "PENDING"
SATISFIED = "SATISFIED"
CONFLICT = "CONFLICT"

Status = str
Assignment = Mapping[str, Optional[str]]  # character_id -> seat or None

KNOWN_KINDS = frozenset(
    {"at", "not_beside", "faces", "end", "same_row", "not_faces_unless"}
)


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


def resolve_effective_calm(
    level: Mapping[str, Any],
    calm: Optional[Iterable[str]] = None,
) -> Tuple[Set[str], List[str]]:
    """effective calm = explicit calm ∪ initial_calm, with prop checks."""
    errors: List[str] = []
    characters = list(level.get("characters") or [])
    char_set = set(characters)
    props = list(level.get("props") or [])
    initial = list(level.get("initial_calm") or [])
    explicit = list(calm or [])
    effective = set(initial) | set(explicit)

    for cid in effective:
        if cid not in char_set:
            errors.append(f"calm on unknown character: {cid}")

    if len(props) == 0:
        if effective:
            errors.append("calm illegal: level has no props that can grant calm")
        return effective, errors

    valid_targets: Set[str] = set()
    calm_stock = 0
    for prop in props:
        targets = list(prop.get("valid_targets") or [])
        valid_targets.update(targets)
        if targets:
            calm_stock += int(prop.get("stock") or 0)

    for cid in effective:
        if cid in char_set and cid not in valid_targets:
            errors.append(f"calm target not in any prop.valid_targets: {cid}")

    if len(effective) > calm_stock:
        errors.append(
            f"calm effects {len(effective)} exceed available calm stock {calm_stock}"
        )

    return effective, errors


def validate_level(level: Mapping[str, Any]) -> List[str]:
    """Structural validation; duplicates are errors (never silent overwrite)."""
    errors: List[str] = []
    characters = list(level.get("characters") or [])
    available = list(level.get("seats") or seats_for_layout(level["layout"]))
    rules = list(level.get("rules") or [])

    seen_chars: Set[str] = set()
    for c in characters:
        if c in seen_chars:
            errors.append(f"duplicate character id: {c}")
        else:
            seen_chars.add(c)

    seen_seats: Set[str] = set()
    for s in available:
        if s in seen_seats:
            errors.append(f"duplicate seat id: {s}")
        else:
            try:
                parse_seat(s)
                seen_seats.add(s)
            except ValueError as e:
                errors.append(str(e))

    seen_rule_ids: Set[str] = set()
    for rule in rules:
        rid = rule.get("id")
        if rid:
            if rid in seen_rule_ids:
                errors.append(f"duplicate rule id: {rid}")
            else:
                seen_rule_ids.add(rid)
        kind = rule.get("kind")
        if kind not in KNOWN_KINDS:
            errors.append(f"unknown rule kind: {kind!r}")
        subject = rule.get("subject")
        if subject is not None and subject not in seen_chars:
            errors.append(f"rule subject not in characters: {subject}")
        other = rule.get("other")
        if other is not None and other not in seen_chars:
            errors.append(f"rule other not in characters: {other}")
        if kind == "at":
            seat = rule.get("seat")
            if seat is not None and seat not in seen_seats:
                errors.append(f"rule seat not available: {seat}")

    _, calm_errs = resolve_effective_calm(level, None)
    errors.extend(calm_errs)
    return errors


def evaluate_level(
    level: Mapping[str, Any],
    assignment: Assignment,
    *,
    calm: Optional[Set[str]] = None,
) -> List[Tuple[str, Status]]:
    """Evaluate every rule as a list (no silent id overwrite).

    Returns a list of (rule_id, status) in rule order.
    """
    available = list(level.get("seats") or seats_for_layout(level["layout"]))
    calm_set, _ = resolve_effective_calm(level, calm)
    results: List[Tuple[str, Status]] = []
    for rule in level["rules"]:
        rid = rule.get("id") or f"{rule['kind']}:{rule['subject']}"
        results.append(
            (
                rid,
                evaluate_rule(
                    rule, assignment, available_seats=available, calm=calm_set
                ),
            )
        )
    return results


def is_win(
    level: Mapping[str, Any],
    assignment: Assignment,
    *,
    calm: Optional[Set[str]] = None,
) -> bool:
    if validate_level(level):
        return False

    characters = list(level["characters"])
    available = list(level.get("seats") or seats_for_layout(level["layout"]))
    calm_set, calm_errs = resolve_effective_calm(level, calm)
    if calm_errs:
        return False

    if validate_assignment(
        assignment, characters=characters, available_seats=available, calm=calm_set
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
    # iterate rules as a list — all must be SATISFIED
    for rule in level["rules"]:
        status = evaluate_rule(
            rule, assignment, available_seats=available, calm=calm_set
        )
        if status != SATISFIED:
            return False
    return True
