# -*- coding: utf-8 -*-
# v0.60.01 → v0.60.02（3 处：<title> / <h1> / showOverlay）
import io, sys, subprocess, tempfile, os, re

P = r"C:\Users\HP\Desktop\志怪塔\原型.html"
s = io.open(P, 'r', encoding='utf-8').read()

cnt = s.count('v0.60.01')
if cnt != 3:
    print('FAIL: v0.60.01 出现 %d 次（期望 3）' % cnt); sys.exit(1)
s = s.replace('v0.60.01', 'v0.60.02')
io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('PATCH v0.60.01 -> v0.60.02 DONE（3 处）')

mm = re.search(r'<script>([\s\S]*?)</script>', s)
fd, tmpp = tempfile.mkstemp(suffix='.js')
os.write(fd, mm.group(1).encode('utf-8')); os.close(fd)
r = subprocess.run(['node', '--check', tmpp], capture_output=True, text=True)
os.unlink(tmpp)
if r.returncode != 0:
    print('NODE_FAIL:'); print(r.stderr); sys.exit(1)
print('NODE_OK')
