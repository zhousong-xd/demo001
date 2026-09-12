#!/usr/bin/env python3
"""T-068: bake SVG keyframe sequences → horizontal sprite sheets under assets/vivid/.
Frame-cut pipeline (NOT CSS bob). Replace sheets when T-067 art arrives (same names/layout).
"""
from __future__ import annotations
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "candidates/presentation-sample/assets/vivid"
FRAMES = ROOT / "frames"
SHEETS = ROOT
W, H = 96, 112  # frame size

COLORS = {
    "fox": {"body": "#e8874a", "belly": "#f3d2b0", "accent": "#c45a20", "label": "狐"},
    "rabbit": {"body": "#f0d0c8", "belly": "#f8e8e4", "accent": "#e8b0b0", "label": "兔"},
    "crane": {"body": "#7eb8d8", "belly": "#d8eef8", "accent": "#e85840", "label": "鹤"},
}

def svg_wrap(inner: str) -> str:
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
  <ellipse cx="48" cy="102" rx="22" ry="6" fill="#000" opacity=".22"/>
  {inner}
</svg>'''

def face(mood: str, blink: bool = False) -> str:
    if blink:
        return '''
        <path d="M34 44 L42 44" stroke="#2a1a18" stroke-width="2.2" stroke-linecap="round"/>
        <path d="M54 44 L62 44" stroke="#2a1a18" stroke-width="2.2" stroke-linecap="round"/>
        <path d="M40 54 Q48 57 56 54" stroke="#2a1a18" stroke-width="1.8" fill="none" stroke-linecap="round"/>'''
    if mood == "mad":
        return '''
        <path d="M32 38 L42 42" stroke="#2a1a18" stroke-width="2.2" stroke-linecap="round"/>
        <path d="M64 38 L54 42" stroke="#2a1a18" stroke-width="2.2" stroke-linecap="round"/>
        <ellipse cx="38" cy="46" rx="3.2" ry="3.6" fill="#2a1a18"/>
        <ellipse cx="58" cy="46" rx="3.2" ry="3.6" fill="#2a1a18"/>
        <path d="M40 58 Q48 54 56 58" stroke="#2a1a18" stroke-width="2" fill="none"/>'''
    if mood == "happy":
        return '''
        <path d="M34 46 Q38 42 42 46" stroke="#2a1a18" stroke-width="2" fill="none" stroke-linecap="round"/>
        <path d="M54 46 Q58 42 62 46" stroke="#2a1a18" stroke-width="2" fill="none" stroke-linecap="round"/>
        <path d="M40 56 Q48 62 56 56" stroke="#2a1a18" stroke-width="2.2" fill="none" stroke-linecap="round"/>'''
    if mood == "awkward":
        return '''
        <ellipse cx="38" cy="46" rx="3" ry="3.4" fill="#2a1a18"/>
        <ellipse cx="58" cy="46" rx="3" ry="3.4" fill="#2a1a18"/>
        <path d="M40 58 Q48 54 56 58" stroke="#2a1a18" stroke-width="2" fill="none"/>
        <circle cx="30" cy="52" r="3" fill="#e888a8" opacity=".55"/>
        <circle cx="66" cy="52" r="3" fill="#e888a8" opacity=".55"/>'''
    if mood == "refuse":
        return '''
        <path d="M32 38 L42 42" stroke="#2a1a18" stroke-width="2.2" stroke-linecap="round"/>
        <path d="M64 38 L54 42" stroke="#2a1a18" stroke-width="2.2" stroke-linecap="round"/>
        <ellipse cx="38" cy="46" rx="3.2" ry="3.6" fill="#2a1a18"/>
        <ellipse cx="58" cy="46" rx="3.2" ry="3.6" fill="#2a1a18"/>
        <path d="M40 58 L56 58" stroke="#2a1a18" stroke-width="2.2" stroke-linecap="round"/>
        <path d="M24 28 L16 20" stroke="#ff6b6b" stroke-width="2.2" stroke-linecap="round"/>
        <path d="M72 28 L80 20" stroke="#ff6b6b" stroke-width="2.2" stroke-linecap="round"/>'''
    # idle
    return '''
        <ellipse cx="38" cy="46" rx="3.2" ry="3.8" fill="#2a1a18"/>
        <ellipse cx="58" cy="46" rx="3.2" ry="3.8" fill="#2a1a18"/>
        <circle cx="39.2" cy="44.6" r="1" fill="#fff" opacity=".75"/>
        <circle cx="59.2" cy="44.6" r="1" fill="#fff" opacity=".75"/>
        <path d="M40 56 Q48 58 56 56" stroke="#2a1a18" stroke-width="1.8" fill="none" stroke-linecap="round"/>'''

def head_fox(c, mood, blink=False, lean=0):
    return f'''
    <g transform="translate({lean},0)">
      <polygon points="22,40 26,12 40,38" fill="{c['body']}"/>
      <polygon points="56,38 70,12 74,40" fill="{c['body']}"/>
      <polygon points="26,34 28,18 36,34" fill="{c['belly']}" opacity=".9"/>
      <polygon points="60,34 68,18 70,34" fill="{c['belly']}" opacity=".9"/>
      <circle cx="48" cy="48" r="20" fill="{c['body']}"/>
      <ellipse cx="48" cy="56" rx="9" ry="6" fill="{c['belly']}" opacity=".92"/>
      {face(mood, blink)}
    </g>'''

def head_rabbit(c, mood, blink=False, lean=0, ear=0):
    return f'''
    <g transform="translate({lean},0)">
      <ellipse cx="34" cy="{18+ear}" rx="6" ry="15" fill="{c['body']}"/>
      <ellipse cx="62" cy="{18-ear}" rx="6" ry="15" fill="{c['body']}"/>
      <ellipse cx="34" cy="{16+ear}" rx="3" ry="9" fill="{c['belly']}"/>
      <ellipse cx="62" cy="{16-ear}" rx="3" ry="9" fill="{c['belly']}"/>
      <circle cx="48" cy="48" r="20" fill="{c['body']}"/>
      <ellipse cx="48" cy="58" rx="7" ry="5" fill="{c['accent']}" opacity=".55"/>
      {face(mood, blink)}
    </g>'''

def head_crane(c, mood, blink=False, lean=0):
    eye = face(mood, blink)
    return f'''
    <g transform="translate({lean},0)">
      <ellipse cx="48" cy="22" rx="10" ry="12" fill="{c['body']}"/>
      <path d="M56 20 Q76 6 72 30 Q66 40 56 32" fill="{c['body']}"/>
      <path d="M40 24 L30 30 L40 28" fill="{c['accent']}"/>
      <path d="M48 10 L50 4 L46 4 Z" fill="{c['accent']}"/>
      <circle cx="48" cy="50" r="18" fill="{c['body']}"/>
      {eye}
    </g>'''

HEAD = {"fox": head_fox, "rabbit": head_rabbit, "crane": head_crane}

def torso(c, y=62, scale=1.0):
    return f'''<ellipse cx="48" cy="{y}" rx="{16*scale}" ry="{14*scale}" fill="{c['body']}"/>
    <ellipse cx="48" cy="{y+2}" rx="{10*scale}" ry="{8*scale}" fill="{c['belly']}" opacity=".85"/>'''

def arm(c, side, pose):
    """Filled capsules — must read after rasterize."""
    sig = -1 if side == "L" else 1
    sx = 30 if side == "L" else 66
    def capsule(x1, y1, x2, y2, r=6):
        return (
            f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" '
            f'stroke="{c["body"]}" stroke-width="{r*2}" stroke-linecap="round"/>'
            f'<circle cx="{x2}" cy="{y2}" r="{r-1}" fill="{c["accent"]}"/>'
        )
    if pose == "down":
        return capsule(sx, 58, sx + sig * 2, 92)
    if pose == "out":
        return capsule(sx, 58, sx + sig * 28, 74)
    if pose == "up":
        return capsule(sx, 58, sx + sig * 10, 20)
    if pose == "crossL":
        return capsule(30, 58, 60, 72)
    if pose == "crossR":
        return capsule(66, 58, 36, 74)
    if pose == "wave1":
        return capsule(sx, 56, sx + sig * 14, 16)
    if pose == "wave2":
        return capsule(sx, 56, sx + sig * 26, 30)
    return ""


def legs(c, pose, sit=0):
    """Exaggerated leg poses so walk frame-cuts are obvious."""
    base_y = 72 + int(sit * 10)
    foot_y = 100 - int(sit * 20)
    def limb(x1, y1, x2, y2):
        return (
            f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" '
            f'stroke="{c["body"]}" stroke-width="12" stroke-linecap="round"/>'
            f'<ellipse cx="{x2}" cy="{y2}" rx="9" ry="4.5" fill="{c["accent"]}"/>'
        )
    if pose == "tucked" or sit > 0.85:
        return f"""
        <ellipse cx="38" cy="{base_y+6}" rx="11" ry="7" fill="{c['body']}"/>
        <ellipse cx="58" cy="{base_y+6}" rx="11" ry="7" fill="{c['body']}"/>
        <ellipse cx="38" cy="{base_y+10}" rx="8" ry="3.5" fill="{c['accent']}"/>
        <ellipse cx="58" cy="{base_y+10}" rx="8" ry="3.5" fill="{c['accent']}"/>"""
    if pose == "Lfwd":
        return limb(42, base_y, 18, foot_y) + limb(54, base_y, 70, foot_y - 6)
    if pose == "Rfwd":
        return limb(42, base_y, 26, foot_y - 6) + limb(54, base_y, 78, foot_y)
    if pose == "wide":
        return limb(42, base_y, 14, foot_y) + limb(54, base_y, 82, foot_y)
    dx = -6 if pose == "plantL" else (6 if pose == "plantR" else 0)
    return limb(42, base_y, 36 + dx, foot_y) + limb(54, base_y, 60 - dx, foot_y)


def body_stack(who, mood, *, blink=False, leg="plant", armL="down", armR="down", sit=0, lean=0, ear=0, head_dy=0):
    c = COLORS[who]
    # draw order: back arm, legs, torso, front arm, head
    back_arm = arm(c, "L", armL) if who != "crane" else arm(c, "L", armL)
    front_arm = arm(c, "R", armR)
    hfn = HEAD[who]
    kwargs = {"blink": blink, "lean": lean}
    if who == "rabbit":
        kwargs["ear"] = ear
    head = hfn(c, mood, **kwargs)
    # shift head up when standing from sit
    head = f'<g transform="translate(0,{head_dy})">{head}</g>'
    ty = 68 + int(sit * 8)
    return "\n".join([
        back_arm,
        legs(c, leg, sit=sit),
        torso(c, y=ty, scale=1.0 - sit * 0.08),
        front_arm,
        head,
    ])

def frames_for(who: str) -> dict[str, list[str]]:
    """Return anim name -> list of SVG strings (distinct limb poses)."""
    out: dict[str, list[str]] = {}

    # idle: blink + leg swing (gossip-ready) — clearly different drawings
    out["idle"] = [
        svg_wrap(body_stack(who, "idle", leg="plantL", armL="down", armR="down")),
        svg_wrap(body_stack(who, "idle", blink=True, leg="plantL", armL="down", armR="down")),
        svg_wrap(body_stack(who, "idle", leg="plant", armL="down", armR="down")),
        svg_wrap(body_stack(who, "idle", leg="plantR", armL="down", armR="out", ear=2)),
        svg_wrap(body_stack(who, "idle", leg="plant", armL="out", armR="down", ear=-2)),
        svg_wrap(body_stack(who, "idle", leg="plantL", armL="down", armR="down")),
    ]

    # walk cycle — legs alternate, arms opposite (4 frames)
    out["walk"] = [
        svg_wrap(body_stack(who, "idle", leg="Lfwd", armL="out", armR="down", lean=-3, head_dy=-2)),
        svg_wrap(body_stack(who, "idle", leg="plant", armL="down", armR="down", lean=0, head_dy=-5)),
        svg_wrap(body_stack(who, "idle", leg="Rfwd", armL="down", armR="out", lean=3, head_dy=-2)),
        svg_wrap(body_stack(who, "idle", leg="wide", armL="out", armR="out", lean=0, head_dy=-5)),
    ]

    # stand-up: tucked → half → plant (weight)
    out["stand"] = [
        svg_wrap(body_stack(who, "idle", leg="tucked", sit=1.0, armL="down", armR="down", head_dy=10)),
        svg_wrap(body_stack(who, "idle", leg="wide", sit=0.45, armL="out", armR="out", head_dy=4)),
        svg_wrap(body_stack(who, "idle", leg="plant", sit=0.0, armL="down", armR="down", head_dy=0)),
    ]

    # sit-down: plant → half → tucked (weight settle)
    out["sit"] = [
        svg_wrap(body_stack(who, "idle", leg="plant", sit=0.0, armL="down", armR="down")),
        svg_wrap(body_stack(who, "idle", leg="wide", sit=0.45, armL="out", armR="out", head_dy=4)),
        svg_wrap(body_stack(who, "happy" if who != "fox" else "idle", leg="tucked", sit=1.0, armL="down", armR="down", head_dy=10)),
    ]

    # refuse: approach stand → cross arms lean back (body+face same beat)
    out["refuse"] = [
        svg_wrap(body_stack(who, "awkward", leg="plant", armL="out", armR="out")),
        svg_wrap(body_stack(who, "refuse", leg="wide", armL="crossL", armR="crossR", lean=-4)),
        svg_wrap(body_stack(who, "refuse", leg="wide", armL="crossL", armR="crossR", lean=-6, head_dy=-2)),
    ]

    # greet / wave
    out["greet"] = [
        svg_wrap(body_stack(who, "happy", leg="plant", armL="down", armR="wave1")),
        svg_wrap(body_stack(who, "happy", leg="plantL", armL="down", armR="wave2")),
        svg_wrap(body_stack(who, "happy", leg="plant", armL="down", armR="wave1")),
        svg_wrap(body_stack(who, "happy", leg="plantR", armL="down", armR="wave2")),
    ]

    # mad / bristle escalate
    out["mad"] = [
        svg_wrap(body_stack(who, "mad", leg="plant", armL="down", armR="down")),
        svg_wrap(body_stack(who, "mad", leg="wide", armL="out", armR="out", lean=2)),
        svg_wrap(body_stack(who, "mad", leg="plant", armL="up", armR="up")),
    ]

    # awkward
    out["awkward"] = [
        svg_wrap(body_stack(who, "awkward", leg="plant", armL="down", armR="down", lean=-2)),
        svg_wrap(body_stack(who, "awkward", leg="plantL", armL="crossL", armR="crossR", lean=-3)),
    ]

    # happy seated
    out["happy"] = [
        svg_wrap(body_stack(who, "happy", leg="tucked", sit=1.0, armL="down", armR="down", head_dy=8)),
        svg_wrap(body_stack(who, "happy", leg="tucked", sit=1.0, armL="down", armR="wave1", head_dy=8)),
    ]

    # held / pick up (standing ready)
    out["held"] = [
        svg_wrap(body_stack(who, "idle", leg="plant", armL="out", armR="out", head_dy=-6)),
        svg_wrap(body_stack(who, "happy", leg="plant", armL="out", armR="out", head_dy=-8)),
    ]

    # clash
    out["clash"] = [
        svg_wrap(body_stack(who, "mad", leg="Lfwd", armL="up", armR="out", lean=-6)),
        svg_wrap(body_stack(who, "mad", leg="Rfwd", armL="out", armR="up", lean=6)),
        svg_wrap(body_stack(who, "mad", leg="wide", armL="out", armR="out", lean=0)),
    ]

    return out

def rasterize(svg_path: Path, png_path: Path):
    subprocess.check_call([
        "convert", "-background", "none", str(svg_path), str(png_path)
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def stitch(pngs: list[Path], out: Path):
    # horizontal montage
    cmd = ["convert", "+append", *[str(p) for p in pngs], str(out)]
    subprocess.check_call(cmd)
    # write sidecar meta
    meta = out.with_suffix(".json")
    meta.write_text(
        '{"frameW:%d,"frameH":%d,"count":%d,"fpsHint":8}\n'.replace("frameW:%d", f'"frameW":{W}')
        % (H, len(pngs)),
        encoding="utf-8",
    )
    # fix json properly
    meta.write_text(
        f'{{"frameW":{W},"frameH":{H},"count":{len(pngs)},"fpsHint":8}}\n',
        encoding="utf-8",
    )

def main():
    FRAMES.mkdir(parents=True, exist_ok=True)
    SHEETS.mkdir(parents=True, exist_ok=True)
    manifest = []
    for who in ("fox", "rabbit", "crane"):
        anims = frames_for(who)
        for anim, svgs in anims.items():
            paths = []
            for i, s in enumerate(svgs):
                svg_p = FRAMES / f"{who}_{anim}_{i:02d}.svg"
                png_p = FRAMES / f"{who}_{anim}_{i:02d}.png"
                svg_p.write_text(s, encoding="utf-8")
                rasterize(svg_p, png_p)
                paths.append(png_p)
            sheet = SHEETS / f"{who}_{anim}.png"
            stitch(paths, sheet)
            manifest.append(f"{who}_{anim}: {len(paths)} frames @ {W}x{H} → {sheet.name}")
            print(f"baked {sheet.name} ({len(paths)} frames)")
    (SHEETS / "MANIFEST.txt").write_text(
        "T-068 vivid sprite sheets (SVG分帧占位 → PNG strips)\n"
        "Player MUST cut frames (background-position / drawImage). No single-bitmap CSS bob.\n"
        "T-067 art may replace same filenames keeping frameW/frameH/count in *.json.\n\n"
        + "\n".join(manifest) + "\n",
        encoding="utf-8",
    )
    print("done", len(manifest), "sheets")

if __name__ == "__main__":
    main()
