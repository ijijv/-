# -*- coding: utf-8 -*-
# v0.59 Block9g：修复 block9b 误引入的数组空洞（雷符行 `}},,` → `}},`）
# `,,` 会在 CARDS 里产生一个 elision（CARDS[1]===undefined）。当前只用 find/filter 侥幸不炸，
# 但 for..of / index 访问会命中 undefined，属于必须修掉的数据损坏。
import io, sys, subprocess, tempfile, os, re

P = r"C:\Users\HP\Desktop\志怪塔\原型.html"
s = io.open(P, 'r', encoding='utf-8').read()

OLD = "      } }},,\n"
NEW = "      } }},\n"
n = s.count(OLD)
if n != 1:
    print('FAIL: 匹配 %d 次（期望 1）' % n); sys.exit(1)
s = s.replace(OLD, NEW)

if s.count(',,'):
    print('STILL_HAS_DOUBLE_COMMA'); sys.exit(1)

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('PATCH v59_block9g_hole DONE: 1 处（数组空洞已修复）')
mm = re.search(r'<script>([\s\S]*?)</script>', s)
fd, tmpp = tempfile.mkstemp(suffix='.js')
os.write(fd, mm.group(1).encode('utf-8')); os.close(fd)
r = subprocess.run(['node', '--check', tmpp], capture_output=True, text=True)
os.unlink(tmpp)
if r.returncode != 0:
    print('NODE_FAIL:'); print(r.stderr); sys.exit(1)
print('NODE_OK')
