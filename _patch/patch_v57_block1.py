# -*- coding: utf-8 -*-
# v0.57 赶尸人卡池重写批次 — 第 1 块
#   1. 尸气上限 10 → 12（状态默认 + gainShiqi 兜底）
#   2. 赶尸人初始卡池改为：雷符×2 金刚符×2 佛渡×1 舍身×1 血契×1 纸人×1 尸王×1 守一×1 小鬼×1
#   版本号 v0.56 → v0.57（<title> / <h1> / 主菜单 overlay 恰好 3 处）
import io, sys, subprocess, tempfile, os, re

P = r"C:\Users\HP\Desktop\志怪塔\原型.html"
s = io.open(P, 'r', encoding='utf-8').read()

EDITS = []

# 1.1 gainShiqi 兜底上限 10 -> 12
EDITS.append((
"""function gainShiqi(n){ if(!n || n<=0) return; G.尸气 = Math.min(G.maxShiQi||10, (G.尸气||0)+n); }""",
"""function gainShiqi(n){ if(!n || n<=0) return; G.尸气 = Math.min(G.maxShiQi||12, (G.尸气||0)+n); }"""))

# 1.2 状态默认 maxShiQi 10 -> 12
EDITS.append((
"""    尸气:0, maxShiQi:10,""",
"""    尸气:0, maxShiQi:12,"""))

# 1.3 赶尸人初始卡池：11 张（用户指定清单）
EDITS.append((
"""   deck:[['leifu',3],['jingang',3],['fodu',2], ['zhiren',2], ['xiaogui',1], ['wutong',1], ['shi_wang',1]]},  // 初始卡组包含召唤系卡牌和尸王""",
"""   deck:[['leifu',2],['jingang',2],['fodu',1],['sheshen',1],['xueqi',1],['zhiren',1],['shi_wang',1],['shouyi',1],['xiaogui',1]]},  // v0.57 赶尸人初始卡池：雷符×2 金刚符×2 佛渡×1 舍身×1 血契×1 纸人×1 尸王×1 守一×1 小鬼×1"""))

for i, (old, new) in enumerate(EDITS):
    n = s.count(old)
    if n != 1:
        print('EDIT #%d FAIL: 匹配 %d 次（期望 1）' % (i + 1, n)); sys.exit(1)
    s = s.replace(old, new)

# 版本号：v0.56 恰好 3 处（<title> / <h1> / 主菜单 overlay）
nv = s.count('v0.56')
if nv != 3:
    print('VER FAIL: v0.56 匹配 %d 次（期望 3）' % nv); sys.exit(1)
s = s.replace('v0.56', 'v0.57')

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('PATCH v57_block1 DONE: 原型 %d 处 + 版本号 v0.57' % len(EDITS))

mm = re.search(r'<script>([\s\S]*?)</script>', s)
js = mm.group(1)
fd, tmpp = tempfile.mkstemp(suffix='.js')
os.write(fd, js.encode('utf-8')); os.close(fd)
r = subprocess.run(['node', '--check', tmpp], capture_output=True, text=True)
os.unlink(tmpp)
if r.returncode != 0:
    print('NODE_FAIL:'); print(r.stderr); sys.exit(1)
print('NODE_OK (%d chars)' % len(js))
print('残留 maxShiQi||10: %d   残留 maxShiQi:10: %d' % (s.count('maxShiQi||10'), s.count('maxShiQi:10')))
print('残旧卡池 wutong,1]: %d   新卡池 xueqi,1]: %d' % (s.count("['wutong',1]"), s.count("['xueqi',1]")))
