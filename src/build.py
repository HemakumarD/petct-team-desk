#!/usr/bin/env python3
"""Build the GitHub Pages app (index.html) from the shared app code.

claude/index.html  – the app as written for claude.ai (also the base for this build)
src/standalone-shim.js  – replaces claude.ai's database / Claude / downloads with
                          IndexedDB + Google Drive sync, the user's own Claude API key
                          and normal browser downloads
src/standalone-inner.js – Excel upload for the appointment sheet, print window,
                          Settings cards (Drive sync, Claude key, name, import)

Run:  python3 src/build.py      (writes ./index.html)
"""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
base = (ROOT / "claude" / "index.html").read_text(encoding="utf-8")
shim = (ROOT / "src" / "standalone-shim.js").read_text(encoding="utf-8")
inner = (ROOT / "src" / "standalone-inner.js").read_text(encoding="utf-8")
VERSION = (ROOT / "src" / "VERSION").read_text().strip()

s = base
def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n < count or (count == 1 and n != 1):
        sys.exit(f"build: expected {count} match(es), found {n}: {old[:70]!r}")
    s = s.replace(old, new, count if count > 1 else 1)

# 1. head: title, PWA manifest, icons, service worker, Google sign-in, version
rep("<title>PET-CT Team – ACC Vanagaram</title>",
    f"""<title>PET-CT Desk – ACC Vanagaram</title>
<meta name="description" content="PET-CT Team Desk – appointments, billing, WhatsApp updates and dashboard for Apollo Cancer Centres, Vanagaram">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="PET-CT Desk">
<meta name="petct-version" content="{VERSION}">
<link rel="manifest" href="manifest.json">
<link rel="icon" href="icon-192.png">
<link rel="apple-touch-icon" href="icon-192.png">
<script>if('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{{}}));</script>
<script src="https://accounts.google.com/gsi/client" async defer></script>""")

# 2. standalone runtime before the app script
rep("<script>\n(function(){\n\"use strict\";", "<script>\n" + shim + "\n</script>\n<script>\n(function(){\n\"use strict\";")

# 3. app-side additions + settings wiring
rep('$("backupBtn").onclick = exportBackup;', '$("backupBtn").onclick = exportBackup;\n' + inner + '\nsetupStandaloneSettings();')

# 4. appointment sheet: Excel upload instead of Microsoft 365
rep("async function openSheetPull(){", "async function openSheetPull(){\n  if(window.PETCT_STANDALONE) return openSheetUpload($(\"dayPick\").value || today());")
rep("Pull from appointment sheet</button>", "Appointment sheet (Excel)</button>")

# 5. printing: real print window
rep('  const blob = doc.output("blob");\n  if(downloads){', '  const blob = doc.output("blob");\n  if(window.PETCT_STANDALONE) return standalonePdf(blob, filename);\n  if(downloads){')

# 6. reading errors: point to the Claude key in Settings
key_msg = 'code==="no_key"||code==="bad_key"?esc(err.message)+" <a href=\'#settings\'>Open Settings</a>":'
rep('${code==="rate_limited"?"Too many reads just now', '${' + key_msg + 'code==="rate_limited"?"Too many reads just now')
rep('${err&&err.code==="rate_limited"?"Too many reads just now', '${err&&(err.code==="no_key"||err.code==="bad_key")?esc(err.message)+" <a href=\'#settings\'>Open Settings</a>":err&&err.code==="rate_limited"?"Too many reads just now')

# 7. wording that only applies on claude.ai
rep("Open this app from its claude.ai link to see the team's shared cases.", "This browser can't run the app. Use a recent Chrome, Safari or Edge.")
s = s.replace("Only the extracted details are saved. The photos stay on this phone.", "Only the extracted details are saved. Photos are sent to Claude for reading and are not kept.")

(ROOT / "index.html").write_text(s, encoding="utf-8")
print(f"built index.html  v{VERSION}  {len(s):,} bytes")
