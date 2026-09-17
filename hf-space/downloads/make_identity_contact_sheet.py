#!/usr/bin/env python3
"""Build a simple comparison sheet for ComfyUI identity-preservation tests.

Usage:
    python make_identity_contact_sheet.py output.jpg image1.png image2.png image3.png ...

The script intentionally does not score identity. It only creates a stable visual
layout so a human or permitted vision model can compare outputs consistently.
"""

from __future__ import annotations

import argparse
import math
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw


def build_sheet(paths: list[Path], output: Path, columns: int = 2, cell_w: int = 640, cell_h: int = 420) -> None:
    if not paths:
        raise SystemExit("No input images supplied")

    margin = 18
    label_h = 34
    rows = math.ceil(len(paths) / columns)
    canvas_w = columns * cell_w + (columns - 1) * margin
    canvas_h = rows * (cell_h + label_h) + (rows - 1) * margin
    canvas = Image.new("RGB", (canvas_w, canvas_h), (20, 20, 20))
    draw = ImageDraw.Draw(canvas)

    for index, path in enumerate(paths):
        row, col = divmod(index, columns)
        x = col * (cell_w + margin)
        y = row * (cell_h + label_h + margin)

        image = Image.open(path).convert("RGB")
        fitted = ImageOps.fit(image, (cell_w, cell_h), method=Image.Resampling.LANCZOS, centering=(0.5, 0.45))
        canvas.paste(fitted, (x, y))
        draw.text((x + 8, y + cell_h + 8), f"{index + 1:02d}  {path.name}", fill=(225, 225, 225))

    output.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(output, quality=88, optimize=True)
    print(output)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("output", type=Path)
    parser.add_argument("images", nargs="+", type=Path)
    parser.add_argument("--columns", type=int, default=2)
    args = parser.parse_args()

    build_sheet(args.images, args.output, columns=args.columns)


if __name__ == "__main__":
    main()
