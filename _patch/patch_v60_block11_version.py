# -*- coding: utf-8 -*-
# v0.60 Block11：版本号 v0.59 → v0.60（<title> / <h1> / 主菜单 overlay）
import io, sys, subprocess, tempfile, os, re

P = r"C:\Users\HP\Desktop\志怪塔\原型.html"
s = io.open(P, 'r', encoding='utf-8').read()
EDITS = [
    ("<title>志怪塔 · 原型 v0.59</title>",
     "<title>志怪塔 · 原型 v0.60</title>"),
    ("<h1 class=\"title\">志 怪 塔 <small>· 玩法原型 v0.59</small>",
     "<h1 class=\"title\">志 怪 塔 <small>· 玩法原型 v0.60</small>"),
    ("showOverlay(`<h2>志 怪 塔 · v0.59</h2>",
     "showOverlay(`<h2>志 怪 塔 · v0.60</h2>"),
]

for i, (old, new) in enumerate(EDITS):
    n = s.count(old)
    if n != 1:
        print('EDIT #%d FAIL: 匹配 %d 次（期望 1）\n---%s---' % (i + 1, n, old[:120])); sys.exit(1)
    s = s.replace(old, new)

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('PATCH v60_block11_version DONE: %d 处' % len(EDITS))
mm = re.search(r'<script>([\s\S]*?)</script>', s)
fd, tmpp = tempfile.mkstemp(suffix='.js')
os.write(fd, mm.group(1).encode('utf-8')); os.close(fd)
r = subprocess.run(['node', '--check', tmpp], capture_output=True, text=True)
os.unlink(tmpp)
if r.returncode != 0:
    print('NODE_FAIL:'); print(r.stderr); sys.exit(1)
print('NODE_OK')
