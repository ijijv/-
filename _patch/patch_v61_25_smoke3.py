# -*- coding: utf-8 -*-
"""
v0.61.25 步骤 4c —— 把最后两条「查源码文本」的断言改成验行为

原写法 `String(pickReward).indexOf("sfx('ui_reward')")` 在**混淆产物**里必然红
（字符串数组化后源码文本面目全非），会让产物冒烟的已知红项从 7 条涨到 9 条 ——
凭空多两条噪音，还都是我自己加的。

改成：把下游要 DOM 的入口（goNext / hideOverlay / render / saveRun / updateGoldCompensation）
临时打桩，直接调 pickReward(0) / chooseNode(0) 验它真出声。
已在 VM 里试过：pickReward → ['ui_reward']，chooseNode(0) → ['ui_map','card_curse']，都不抛错。

锚点唯一性各校验 count==1。
"""
import io
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
P = os.path.join(HERE, 'smoke_runner.js')

A = ('      __ok(\'v0.61.25 接线·三选一 → ui_reward 调用点在位\', String(pickReward).indexOf("sfx(\'ui_reward\')") >= 0);\n'
     '      __ok(\'v0.61.25 接线·地图选点 → ui_map 调用点在位\', String(chooseNode).indexOf("sfx(\'ui_map\')") >= 0);\n')

B = ('''      /* 三选一 / 地图选点：下游要 DOM，把下游入口临时打桩后直接调 —— 验行为，不验源码文本
         （原先用 String(fn).indexOf 查源码，混淆产物里必然红，等于给产物冒烟白添两条噪音）。 */
      got = __rec(function () {
        var _g = goNext, _h = hideOverlay, _r = render, _s2 = saveRun, _u = updateGoldCompensation;
        goNext = hideOverlay = render = saveRun = updateGoldCompensation = function () {};
        try {
          G = __base('tianshi');
          G.rewardPicks = [__card('leifu')];
          pickReward(0);
        } finally {
          goNext = _g; hideOverlay = _h; render = _r; saveRun = _s2; updateGoldCompensation = _u;
        }
      });
      __ok('v0.61.25 接线·三选一翻牌 → ui_reward', got.indexOf('ui_reward') >= 0, got.join(','));

      got = __rec(function () { G = __base('tianshi'); G.mapRow = 0; G.mapPath = []; chooseNode(0); });
      __ok('v0.61.25 接线·地图选点 → ui_map', got.indexOf('ui_map') >= 0, got.join(','));
''')


def main():
    src = io.open(P, encoding='utf-8', newline='').read()
    if '接线·三选一翻牌' in src:
        print('SKIP 已改')
        return 0
    n = src.count(A)
    if n != 1:
        print('FAIL anchor count=%d (expect 1)' % n)
        return 1
    io.open(P, 'w', encoding='utf-8', newline='').write(src.replace(A, B, 1))
    print('OK 两条断言改为验行为')
    return 0


if __name__ == '__main__':
    sys.exit(main())
