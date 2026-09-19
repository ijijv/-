# -*- coding: utf-8 -*-
# v0.61.06 冒烟补充 2：?seed=N 调试接缝（VM 里 location.search 默认 undefined，
#                只有显式造一个才能覆盖到这条分支）
import io, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = os.path.join(ROOT, '_patch', 'smoke_runner.js')
s = io.open(P, 'r', encoding='utf-8', newline='').read()

ANCHOR = "    /* --- 随机态确实落进存档 --- */"
NEW = """    /* ?seed=N 调试接缝（复现某一局） */
    var __ls = location.search;
    location.search = '?foo=1&seed=12345'; var q1s = rngSeedNow(); seedRng(q1s); var q1 = draw(5);
    location.search = '?seed=12345'; seedRng(rngSeedNow()); var q2 = draw(5);
    __ok('v0.61.06 ?seed=12345 解析出固定种子', q1s === 12345, String(q1s));
    __ok('v0.61.06 ?seed=N 两局完全一致（可复现报障）', JSON.stringify(q1) === JSON.stringify(q2));
    location.search = __ls;

""" + ANCHOR

if s.count(ANCHOR) != 1:
    print('FAIL 锚点 %d 次' % s.count(ANCHOR)); sys.exit(1)
io.open(P, 'w', encoding='utf-8', newline='').write(s.replace(ANCHOR, NEW, 1))
print('SMOKE v0.61.06-2 OK')
