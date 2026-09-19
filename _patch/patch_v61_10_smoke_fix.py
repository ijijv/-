# -*- coding: utf-8 -*-
# 修正 v0.61.10 冒烟新增断言里的两处事实错误：
#   1) 召唤卡 id 是 yinbingguo（'yinbing' 只是召唤物 type），五通神基础 dur 是 2 不是 3
#   2) 尸王 dur 是 5（也不是 3）
import io, sys, subprocess, os

ROOT = r"C:\Users\HP\Desktop\志怪塔"
P = os.path.join(ROOT, '_patch', 'smoke_runner.js')
s = io.open(P, 'r', encoding='utf-8', newline='').read()
log = []

def sub(old, new, label):
    global s
    c = s.count(old)
    if c != 1:
        print('ANCHOR FAIL [%s] %d 次' % (label, c)); sys.exit(1)
    s = s.replace(old, new, 1); log.append(label)

sub("var LIFE = { zhiren: 2, xiaogui: 2, wutong: 3, yinbing: 3 };",
    "// 注意：id 用**卡牌 id**（阴兵是 yinbingguo，'yinbing' 只是召唤物 type）；dur 取卡面基础值\n"
    "    var LIFE = { zhiren: 2, xiaogui: 2, wutong: 2, yinbingguo: 3 };",
    'LIFE 表修正')

sub("__ok('v0.61.10 P6 尸王 不受被动影响（不是「役使」）', sw2 && sw2.dur === 3, 'dur=' + (sw2 && sw2.dur));",
    "__ok('v0.61.10 P6 尸王 不受被动影响（不是「役使」）', sw2 && sw2.dur === 5, 'dur=' + (sw2 && sw2.dur));",
    '尸王 dur 5')

P2 = P + '.check.js'
io.open(P2, 'w', encoding='utf-8', newline='').write(s)
r = subprocess.run(['node', '--check', P2], capture_output=True, text=True)
if r.returncode != 0:
    os.remove(P2); print('NODE CHECK FAIL'); print(r.stdout, r.stderr); sys.exit(1)
os.replace(P2, P)
print('OK', ' / '.join(log))
