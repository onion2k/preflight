#!/usr/bin/env python3
"""Stamp a build version across the files that have to agree.

The service worker cache name, the build constant the page displays, and the
version.json the page fetches to detect a stale cache all have to move together.
Doing it by hand is how you end up debugging a cached script for ten minutes.

    python3 tools/stamp.py          # bump: v5 -> v6
    python3 tools/stamp.py v9       # set explicitly
"""
import json
import re
import sys

def current():
    sw = open("sw.js").read()
    return re.search(r'preflight-shell-(v\d+)', sw).group(1)

def bump(version):
    return "v" + str(int(version[1:]) + 1)

def stamp(version):
    sw = open("sw.js").read()
    sw = re.sub(r'preflight-shell-v\d+', "preflight-shell-" + version, sw)
    sw = re.sub(r'preflight-runtime-v\d+', "preflight-runtime-" + version, sw)
    open("sw.js", "w").write(sw)

    app = open("app.js").read()
    app = re.sub(r'const BUILD = "v\d+";', 'const BUILD = "%s";' % version, app)
    open("app.js", "w").write(app)

    html = open("index.html").read()
    html = re.sub(r'<span id="build">[^<]*</span>',
                  '<span id="build">build %s</span>' % version, html)
    open("index.html", "w").write(html)

    open("version.json", "w").write(json.dumps({"build": version}) + "\n")
    print("stamped " + version)

if __name__ == "__main__":
    stamp(sys.argv[1] if len(sys.argv) > 1 else bump(current()))
