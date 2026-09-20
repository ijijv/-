# -*- coding: utf-8 -*-
"""
v0.61.25 步骤 0 —— 音效等价性「金快照」探针（幂等）

给 _patch/smoke_runner.js 追加 __probeSfx()：
把 tone/boom 打桩，按顺序记录 12 个旧键名的调用序列（每步的参数个数 + 数值）。
改造 10_audio.js（switch → 分发表）前后各跑一次，序列必须逐条相同 —— 这是「零行为变更」的机器证据。

两个坑（本脚本已处理）：
  1. runner 第 4 行把 SETTINGS.sound 置 false → 探针要自己临时开回来
  2. runner 第 631 行 `sfx = __sil` 把全局 sfx 顶成空函数 → 必须在它之前抓一份真 sfx（__realSfx）

锚点唯一性均校验 count==1。
"""
import io
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
P = os.path.join(HERE, 'smoke_runner.js')

A_REALSIL = "  var __sil = function () {};\n"
CAPTURE = "  var __realSfx = sfx; // v0.61.25 金快照探针要用真 sfx（第 631 行会把全局 sfx 顶成 __sil）\n"

A_CALL = "        for (i = 0; i < K.length; i++) { log.length = 0; sfx(K[i]); out[K[i]] = log.slice(); }\n"
CALL_FIX = "        for (i = 0; i < K.length; i++) { log.length = 0; __realSfx(K[i]); out[K[i]] = log.slice(); }\n"

A_END = "  rep.pass = _p; rep.fail = _f;\n"

PROBE = '''    /* ===== v0.61.25 音效金快照探针（分发表重写的等价性红线） =====
       打桩 tone/boom，记录每个键名的「调用序列」（步骤类型 + 全部实参）。
       与改造前的快照逐条比对：序列必须完全一致，参数个数也必须一致
       （旧代码里 tone 有 4/5/7 参三种叫法，转发时不能用默认值填充）。
       注意用 __realSfx：runner 中途把全局 sfx 顶成了空函数。 */
    globalThis.__probeSfx = function (keys) {
      var K = keys || ['card', 'error', 'block', 'death', 'hit', 'hurt',
                       'heal', 'gold', 'relic', 'win', 'lose', 'boss'];
      var _t = tone, _b = boom, out = {}, log = [], i;
      var _snd = SETTINGS.sound;
      tone = function () { log.push(['t'].concat(Array.prototype.slice.call(arguments))); };
      boom = function () { log.push(['b'].concat(Array.prototype.slice.call(arguments))); };
      try {
        SETTINGS.sound = true;                       // 探针不受设置开关影响
        for (i = 0; i < K.length; i++) { log.length = 0; sfx(K[i]); out[K[i]] = log.slice(); }
      } finally {
        SETTINGS.sound = _snd; tone = _t; boom = _b; // 无论如何都要还原
      }
      return out;
    };
    globalThis.__G12 = function () { return globalThis.__probeSfx(); };
    globalThis.__ALLKEYS = function () { return (typeof SFX_KEYS !== 'undefined') ? SFX_KEYS.slice() : null; };

'''


def sub1(src, anchor, new, what):
    n = src.count(anchor)
    if n != 1:
        print('FAIL %s anchor count=%d (expect 1)' % (what, n))
        return None
    return src.replace(anchor, new, 1)


def main():
    src = io.open(P, encoding='utf-8', newline='').read()
    changed = []

    # 1) 抓真 sfx（必须在第 631 行之前）
    if '__realSfx = sfx' not in src:
        s2 = sub1(src, A_REALSIL, A_REALSIL + CAPTURE, 'A_REALSIL')
        if s2 is None:
            return 1
        src = s2
        changed.append('capture')

    # 2) 插入探针定义
    if 'globalThis.__probeSfx' not in src:
        s2 = sub1(src, A_END, PROBE + A_END, 'A_END')
        if s2 is None:
            return 1
        src = s2
        changed.append('probe')

    # 3) 探针内部改调 __realSfx
    if A_CALL in src:
        s2 = sub1(src, A_CALL, CALL_FIX, 'A_CALL')
        if s2 is None:
            return 1
        src = s2
        changed.append('call-fix')

    if not changed:
        print('SKIP 三处均已就位，未改动')
        return 0

    io.open(P, 'w', encoding='utf-8', newline='').write(src)
    print('OK 已应用: ' + ', '.join(changed))
    return 0


if __name__ == '__main__':
    sys.exit(main())
