# -*- coding: utf-8 -*-
"""
v0.61.25 步骤 0b —— 把金快照写成断言（幂等）

读取 _patch/sfx_golden_v61_24.json（改造前 switch 版的真实调用序列），
以内联字面量的形式插入 _patch/smoke_runner.js 末尾，逐键断言序列未变。

这是「switch → 分发表」零行为变更的唯一机器证据。
锚点唯一性：'  rep.pass = _p; rep.fail = _f;\n' 出现 1 次。
"""
import io
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
RUNNER = os.path.join(HERE, 'smoke_runner.js')
GOLD = os.path.join(HERE, 'sfx_golden_v61_24.json')
A_END = "  rep.pass = _p; rep.fail = _f;\n"

BLOCK = '''    /* ===== v0.61.25 音效金快照断言：分发表重写的「零行为变更」红线 =====
       __GOLD 是改造前（switch 版）打桩 tone/boom 采到的真实调用序列，
       存档见 _patch/sfx_golden_v61_24.json（12 键 / 27 步）。
       只要这块绿着，就证明「switch → 分发表」没动过任何一条现有音效的听感参数 ——
       包括参数个数（旧代码 tone 有 4/5/7 参三种叫法，转发时不能用默认值填充）。 */
    var __GOLD = __GOLD_LITERAL__;
    (function () {
      var now = globalThis.__probeSfx() || {};
      var gk = Object.keys(__GOLD), i, diffs = [], steps = 0;
      for (i = 0; i < gk.length; i++) {
        var k = gk[i];
        var a = JSON.stringify(now[k]), b = JSON.stringify(__GOLD[k]);
        if (a !== b) diffs.push(k);
        steps += (__GOLD[k] || []).length;
      }
      __ok('v0.61.25 金快照 · 覆盖 12 键 / 27 步（探针自检）', gk.length === 12 && steps === 27,
        'keys=' + gk.length + ' steps=' + steps);
      for (i = 0; i < gk.length; i++) {
        var kk = gk[i];
        var aa = JSON.stringify(now[kk]), bb = JSON.stringify(__GOLD[kk]);
        __ok('v0.61.25 金快照 · ' + kk + ' 调用序列未变', aa === bb,
          aa === bb ? '' : ('now=' + aa + ' gold=' + bb));
      }
      __ok('v0.61.25 金快照 · 12 键整体一致', diffs.length === 0, diffs.join(','));
    })();

'''


def main():
    if not os.path.exists(GOLD):
        print('FAIL 缺少金快照文件: ' + GOLD)
        return 1
    gold = json.load(io.open(GOLD, encoding='utf-8'))

    src = io.open(RUNNER, encoding='utf-8', newline='').read()
    if 'var __GOLD =' in src:
        print('SKIP 金快照断言已存在')
        return 0

    n = src.count(A_END)
    if n != 1:
        print('FAIL anchor count=%d (expect 1)' % n)
        return 1

    lit = json.dumps(gold, ensure_ascii=False, separators=(',', ':'))
    block = BLOCK.replace('__GOLD_LITERAL__', lit)
    src = src.replace(A_END, block + A_END, 1)
    io.open(RUNNER, 'w', encoding='utf-8', newline='').write(src)
    print('OK 已插入金快照断言（%d 键）' % len(gold))
    return 0


if __name__ == '__main__':
    sys.exit(main())
