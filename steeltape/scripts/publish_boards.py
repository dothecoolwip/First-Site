#!/usr/bin/env python3
"""Patch only the live scoreboard feature into the existing self-contained release.

The source branch does not contain the cached baked UAL model used in the built
release. Patching the existing deployed game preserves those assets verbatim.
"""
from pathlib import Path
import re
import subprocess
import sys
import tempfile

if len(sys.argv) != 4:
    raise SystemExit("Usage: publish_boards.py <boards-source> <main-index> <main-sw>")

source = Path(sys.argv[1]).read_text()
index_path = Path(sys.argv[2])
sw_path = Path(sys.argv[3])
index = index_path.read_text()
sw = sw_path.read_text()
marker = "// Spawn scoreboards: real BuhurtOS-account career results and signed-in online heartbeats."

if marker in index:
    print("Spawn boards already present. No changes required.")
    raise SystemExit(0)

subs = (
    ("buildSpecialVendors(); buildWorld(); navBuild();",
     "buildSpecialVendors(); buildWorld(); buildSpawnBoards(); navBuild();"),
    ("  updateWorld(dt);\n}\nfunction townTalk(",
     "  updateWorld(dt);\n  boardTick();\n}\nfunction townTalk("),
    ("initPhoto(); loadUAL(); installForged(); SPLIT.on = store.get('split', true);",
     "initPhoto(); loadUAL(); installForged(); SPLIT.on = store.get('split', true); boardsStartHeartbeat();"),
)
for original, replacement in subs:
    if index.count(original) != 1:
        raise SystemExit(f"Expected one occurrence of {original!r}, found {index.count(original)}. No files changed.")
    index = index.replace(original, replacement)

end = "\n})();\n</script>"
if index.count(end) != 1:
    raise SystemExit("Game script closure not found uniquely. No files changed.")
index = index.replace(end, "\n" + source + "\n" + end)
if not re.search(r'window.BUILD_VER="steel-tape-[^"]+"', index):
    raise SystemExit("Release version not found. No files changed.")
index = re.sub(r'window.BUILD_VER="steel-tape-[^"]+"',
               'window.BUILD_VER="steel-tape-boards-20261011a"', index, count=1)
if not re.search(r"const VERSION = '[^']+';", sw):
    raise SystemExit("Service-worker cache version not found. No files changed.")
sw = re.sub(r"const VERSION = '[^']+';",
            "const VERSION = 'steel-tape-boards-20261011a-adminfix1';", sw, count=1)

# Check the actual assembled JS that browsers will parse. Never commit a broken build.
start = index.find("(function(){\n'use strict';")
if start == -1:
    raise SystemExit("Cannot isolate bundled script to verify")
stop = index.find(end, start)
if stop == -1:
    raise SystemExit("Cannot find bundled script end")
with tempfile.TemporaryDirectory() as d:
    bundle = Path(d) / "game.js"
    bundle.write_text(index[start:stop] + "\n})();\n")
    subprocess.run(["node", "--check", str(bundle)], check=True)

index_path.write_text(index)
sw_path.write_text(sw)
print(f"Board release prepared and syntax-checked ({len(index):,} characters).")
