# -*- coding: utf-8 -*-
# v0.60.02 补丁：赶尸人牌组张数注释修正
#   用户给的名单实际是 2+2+1+1+1+1+1+1+1 = 11 张（我原先误标 9 张）
import io, sys, subprocess, tempfile, os, re

P = r"C:\Users\HP\Desktop\志怪塔\原型.html"
s = io.open(P, 'r', encoding='utf-8').read()

old = '''（共 9 张）'''
new = '''（共 11 张）'''
n = s.count(old)
if n != 1:
    print('FAIL: 匹配 %d 次（期望 1）' % n); sys.exit(1)
s = s.replace(old, new)

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('PATCH v60_block15_deckcount DONE')
mm = re.search(r'<script>([\s\S]*?)</script>', s)
fd, tmpp = tempfile.mkstemp(suffix='.js')
os.write(fd, mm.group(1).encode('utf-8')); os.close(fd)
r = subprocess.run(['node', '--check', tmpp], capture_output=True, text=True)
os.unlink(tmpp)
if r.returncode != 0:
    print('NODE_FAIL:'); print(r.stderr); sys.exit(1)
print('NODE_OK')
