# -*- coding: utf-8 -*-
"""
v0.61.25 步骤 1b —— 修金快照探针：它必须同时把 sfxVol 顶成 1

原因：runner 第 4 行设了 SETTINGS.sfxVol=0，而 v0.61.25 修好了
「sfxVol=0 反而 100% 播放」那个 bug —— 现在 sfxVol=0 是真静音，
探针再不改就会被自己的修复挡住（首跑 13 条红即此）。

锚点唯一性各校验 count==1。幂等。
"""
import io
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
P = os.path.join(HERE, 'smoke_runner.js')

REPL = [
    ("      var _snd = SETTINGS.sound;\n",
     "      var _snd = SETTINGS.sound, _vol = SETTINGS.sfxVol;\n"),
    ("        SETTINGS.sound = true;                       // 探针不受设置开关影响\n",
     "        SETTINGS.sound = true; SETTINGS.sfxVol = 1;  // 探针不受设置开关/音量影响\n"),
    ("        SETTINGS.sound = _snd; tone = _t; boom = _b; // 无论如何都要还原\n",
     "        SETTINGS.sound = _snd; SETTINGS.sfxVol = _vol; tone = _t; boom = _b; // 无论如何都要还原\n"),
]


def main():
    src = io.open(P, encoding='utf-8', newline='').read()
    if 'SETTINGS.sfxVol = 1' in src:
        print('SKIP 探针已修')
        return 0
    for a, b in REPL:
        n = src.count(a)
        if n != 1:
            print('FAIL anchor count=%d (expect 1): %r' % (n, a[:48]))
            return 1
        src = src.replace(a, b, 1)
    io.open(P, 'w', encoding='utf-8', newline='').write(src)
    print('OK 探针已补 sfxVol 保存/还原')
    return 0


if __name__ == '__main__':
    sys.exit(main())
