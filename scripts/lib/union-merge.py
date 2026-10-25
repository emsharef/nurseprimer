#!/usr/bin/env python3
"""Resolve append-style merge conflicts by keeping both sides (ours, then theirs). For files where parallel
chapter builders each added entries: decisions log, citations, exports, stylesheet additions."""
import re, sys, pathlib
for f in sys.argv[1:]:
    p = pathlib.Path(f)
    s = p.read_text()
    s = re.sub(r"<<<<<<< [^\n]*\n(.*?)=======\n(.*?)>>>>>>> [^\n]*\n", lambda m: m.group(1) + m.group(2), s, flags=re.S)
    p.write_text(s)
    print(f"resolved {f}")
