#!/usr/bin/env python3
from pathlib import Path
root = Path(__file__).resolve().parents[1]
# GitHub-hosted source is split only to keep connector/API writes manageable.
parts = [root / "app" / "chunks" / f"{i:03}.txt" for i in range(6)]
parts += [root / "app" / "tail" / f"{i:03}.txt" for i in range(19)]
core = "".join(p.read_text() for p in parts)
patch = (root / "app" / "smiley-solver.js").read_text()
out = root / "dist" / "artistic-qr-lab.html"
out.parent.mkdir(exist_ok=True)
out.write_text(core.replace("</body>", f"<script>\n{patch}\n</script>\n</body>"))
print(out)
