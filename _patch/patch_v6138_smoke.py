# -*- coding: utf-8 -*-
"""v0.61.38 · 冒烟新增断言：钉死「尸气=每场清零 / 血怒=整局累积」，防再被文案带错。"""
import io, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
F = os.path.join(ROOT, '_patch', 'smoke_runner.js')

raw = io.open(F, encoding='utf-8').read()
nl = '\r\n' if '\r\n' in raw else '\n'
body = raw.replace('\r\n', '\n')

ANCHOR = "  rep.pass = _p; rep.fail = _f;"
if body.count(ANCHOR) != 1:
    print('!! 锚点命中 %d 次，未写入' % body.count(ANCHOR))
    sys.exit(1)

NEW = """
  // ===== v0.61.38：尸气是「每场战斗清零」、血怒才是「整局累积」=====
  // 起因：js/20_data.js 的【尸气】词条与 tipOnce 首次提示都写成「整局累积不清零」——
  // 那是【血怒】的规则（阴差 2026-09-09 定案），尸气 2026-09-08 定案是每场清零。
  // 文案与引擎冲突时，以 30_engine.js 的 startBattle 重置区为准。这里把两边都钉死。
  (function () {
    // ① KEYWORDS【尸气】：不许再出现「整局累积」
    var __kwShiqi = ((KEYWORDS.filter(function (k) { return k[0] === '尸气'; })[0] || [])[1]) || '';
    __ok('v0.61.38 KEYWORDS 尸气 不再说「整局累积」',
      __kwShiqi.length > 0 && __kwShiqi.indexOf('整局累积') < 0, __kwShiqi);
    __ok('v0.61.38 KEYWORDS 尸气 说清「战斗内跨回合累积、每场战斗清零」',
      __kwShiqi.indexOf('战斗内跨回合累积') >= 0 && __kwShiqi.indexOf('每场战斗清零') >= 0, __kwShiqi);
    __ok('v0.61.38 KEYWORDS 尸气 补上「每消耗 1 点回复 1 点生命」（v0.61.37 新被动）',
      __kwShiqi.indexOf('每消耗 1 点') >= 0 && __kwShiqi.indexOf('回复 1 点生命') >= 0, __kwShiqi);

    // ② 反误伤：血怒词条必须**保留**「整局累积」——证明没把两边的词条改反
    var __kwBlood = ((KEYWORDS.filter(function (k) { return k[0] === '血怒'; })[0] || [])[1]) || '';
    __ok('v0.61.38 反误伤 KEYWORDS 血怒 仍保留「整局累积」',
      __kwBlood.indexOf('整局累积') >= 0, __kwBlood);
    var __yp = (HEROES.filter(function (h) { return h.id === 'yincha'; })[0] || {}).passive || '';
    __ok('v0.61.38 反误伤 阴差被动 仍保留「整局累积」',
      __yp.indexOf('整局累积') >= 0, __yp);

    // ③ tipOnce('shiqi') 的首次提示气泡（照 __realSfx 先例换桩捕获再还原）
    var __realTipOnce = tipOnce, __tipCap = null;
    tipOnce = function (key, html) { if (key === 'shiqi') { __tipCap = html; } return true; };
    try {
      G = __base('ganshiren');
      gainShiqi(1);
      __ok('v0.61.38 tipOnce 尸气提示 被触发',
        typeof __tipCap === 'string' && __tipCap.length > 0, String(__tipCap));
      __ok('v0.61.38 tipOnce 尸气提示 不再说「整局累积」',
        String(__tipCap).indexOf('整局累积') < 0, String(__tipCap));
      __ok('v0.61.38 tipOnce 尸气提示 说清「战斗内跨回合累积，每场战斗清零」',
        String(__tipCap).indexOf('战斗内跨回合累积') >= 0 && String(__tipCap).indexOf('每场战斗清零') >= 0, String(__tipCap));
    } finally { tipOnce = __realTipOnce; __tipCap = null; }

    // ④ 引擎行为对拍（把文案和事实绑在一起，而不是只比字符串）
    //    startBattle 的重置区在 30_engine.js:640（G.尸气=0），血怒那边一处都没有 → 跨战保留
    try {
      G = __base('ganshiren'); G.deck = [__card('leifu')];
      G.尸气 = 7; G.xuenu = 5;
      startBattle(['youhun']);
      __ok('v0.61.38 引擎 尸气 开战清零 → 0（文案「每场战斗清零」为真）',
        G.尸气 === 0, 'shiqi=' + G.尸气);
      __ok('v0.61.38 引擎 反误伤 血怒 开战不清零 → 仍 5（整局累积为真）',
        (G.xuenu || 0) === 5, 'xuenu=' + G.xuenu);
    } catch (e) {
      __ok('v0.61.38 引擎 尸气/血怒 开战重置对拍未抛错', false, String(e && e.message));
    }
  })();

"""

body = body.replace(ANCHOR, NEW + ANCHOR, 1)
io.open(F, 'w', encoding='utf-8', newline='').write(body.replace('\n', nl))
print('OK smoke_runner.js %d 字符' % len(body))