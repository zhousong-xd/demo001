"""Load level JSON files."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict

LEVELS_DIR = Path(__file__).resolve().parents[2] / "levels"


def load_level(level_id: str) -> Dict[str, Any]:
    name = level_id.lower()
    path = LEVELS_DIR / f"{name}.json"
    if not path.exists():
        # allow L01 -> l01
        path = LEVELS_DIR / f"{name.replace('L', 'l')}.json"
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def load_all_levels() -> Dict[str, Dict[str, Any]]:
    out: Dict[str, Dict[str, Any]] = {}
    for path in sorted(LEVELS_DIR.glob("l*.json")):
        with path.open(encoding="utf-8") as f:
            data = json.load(f)
        out[data["id"]] = data
    return out
