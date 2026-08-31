#!/usr/bin/env python3
from pathlib import Path
root = Path(__file__).resolve().parents[1]
parts = [root / "app" / "chunks" / f"{i:03}.txt" for i in range(6)]
parts += sorted((root / "app" / "tail").glob("*.txt"))
out = root / "dist" / "artistic-qr-lab.html"
out.parent.mkdir(exist_ok=True)
out.write_text("".join(p.read_text() for p in parts))
print(out)
