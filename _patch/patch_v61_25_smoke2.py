# -*- coding: utf-8 -*-
"""
v0.61.25 步骤 4b —— 修首跑暴露的 5 条断言写法问题（断言本身没错，是探针用错了）

① enemyAct 在 runner 第 32 行就被 stub 成 __sil 了（留了真身 __realEnemyAct）。
   我那 16 条出招断言调的是 stub，自然零记录 → 改调 __realEnemyAct。
② 未知键名断言：runner 第 4 行 SETTINGS.sound=false，真 sfx 第一行就 return 了
   → 没走到 sfxWarnUnknown。要临时把 sound 顶开。这条也是「bugA 修复生效」的旁证。
③ bugA 断言：__probeSfx 为了金快照**故意**把 sfxVol 顶成 1，所以测不出 sfxVol=0
   → 改成自己打桩 tone/boom，只动 sfxVol，并加一条正对照证明探针是活的。
④ 尸气断言：整份冒烟在 120ms 内跑完，而 card_shiji 是 120ms 节流键，
   前面某条既有用例已把它点着 → 断言前把闸门清零。
⑤ sfxVol=0 时 exponentialRamp 会抛 RangeError（旧代码靠 0||1 侥幸躲开），
   顺手断言现在也不抛。

锚点唯一性各校验 count==1。
"""
import io
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
P = os.path.join(HERE, 'smoke_runner.js')

A3 = (
    "      /* ③ 未知键名：静默忽略 + 只记一次 */\n"
    "      __ok('v0.61.25 未知键名静默忽略不抛错',\n"
    "        (function () { try { __realSfx('__no_such_key__'); return true; } catch (e) { return false; } })());\n"
    "      __ok('v0.61.25 未知键名被记录（只 warn 一次）', _sfxWarned['__no_such_key__'] === 1);\n"
)
N3 = (
    "      /* ③ 未知键名：静默忽略 + 只记一次（runner 把 SETTINGS.sound 关了，得先顶开） */\n"
    "      var _snU = SETTINGS.sound, _eU = null; SETTINGS.sound = true;\n"
    "      try { __realSfx('__no_such_key__'); } catch (e) { _eU = String((e && e.message) || e); }\n"
    "      SETTINGS.sound = _snU;\n"
    "      __ok('v0.61.25 未知键名静默忽略不抛错', _eU === null, _eU || '');\n"
    "      __ok('v0.61.25 未知键名被记录（只 warn 一次）', _sfxWarned['__no_such_key__'] === 1,\n"
    "        'warned=' + _sfxWarned['__no_such_key__']);\n"
)

A4 = (
    "      /* ④ bug A 回归：sfxVol=0 必须真静音 */\n"
    "      var _sv = SETTINGS.sfxVol, _sn = SETTINGS.sound;\n"
    "      SETTINGS.sound = true; SETTINGS.sfxVol = 0;\n"
    "      var q = globalThis.__probeSfx(['hit', 'card', 'win']);\n"
    "      SETTINGS.sfxVol = _sv; SETTINGS.sound = _sn;\n"
    "      __ok('v0.61.25 bugA：sfxVol=0 时 tone/boom 零调用（旧写法会 100% 播放）',\n"
    "        !q.hit.length && !q.card.length && !q.win.length,\n"
    "        'hit=' + q.hit.length + ' card=' + q.card.length + ' win=' + q.win.length);\n"
)
N4 = (
    "      /* ④ bug A 回归：sfxVol=0 必须真静音。\n"
    "         不能用 __probeSfx —— 它为金快照故意把 sfxVol 顶成 1，正好绕开这条。自己打桩 tone/boom。 */\n"
    "      var _sv = SETTINGS.sfxVol, _sn = SETTINGS.sound;\n"
    "      var _t0 = tone, _b0 = boom, _tc = 0, _bc = 0, _eA = null;\n"
    "      tone = function () { _tc++; }; boom = function () { _bc++; };\n"
    "      SETTINGS.sound = true; SETTINGS.sfxVol = 0;\n"
    "      try { __realSfx('hit'); __realSfx('card'); __realSfx('win'); }\n"
    "      catch (e) { _eA = String((e && e.message) || e); }\n"
    "      var _t0c = _tc, _b0c = _bc;                    // 正对照：把音量开回来必须出声\n"
    "      SETTINGS.sfxVol = 1;\n"
    "      try { __realSfx('win'); } catch (e) { _eA = String((e && e.message) || e); }\n"
    "      SETTINGS.sfxVol = _sv; SETTINGS.sound = _sn; tone = _t0; boom = _b0;\n"
    "      __ok('v0.61.25 bugA：探针是活的（sfxVol=1 时确实出声）',\n"
    "        _tc > _t0c || _bc > _b0c, 'tone=' + _tc + ' boom=' + _bc);\n"
    "      __ok('v0.61.25 bugA：sfxVol=0 时 tone/boom 零调用（旧写法 0||1 会 100% 播放）',\n"
    "        _t0c === 0 && _b0c === 0 && _eA === null,\n"
    "        'tone=' + _t0c + ' boom=' + _b0c + ' err=' + _eA);\n"
)

A5 = (
    "      __ok('v0.61.25 接线·尸气 → card_shiji',\n"
    "        __rec(function () { G = __base('ganshiren'); gainShiqi(2); }).indexOf('card_shiji') >= 0);\n"
)
N5 = (
    "      _sfxGate['card_shiji'] = 0;   // 整份冒烟 <120ms，闸门会被前面既有用例点着\n"
    "      __ok('v0.61.25 接线·尸气 → card_shiji',\n"
    "        __rec(function () { G = __base('ganshiren'); gainShiqi(2); }).indexOf('card_shiji') >= 0);\n"
    "      __ok('v0.61.25 接线·尸气没涨就不出声',\n"
    "        (function () { _sfxGate['card_shiji'] = 0;\n"
    "          return __rec(function () { G = __base('ganshiren'); G.尸气 = G.maxShiQi || 12; gainShiqi(2); }).indexOf('card_shiji') < 0; })());\n"
)

A_ACT = "          enemyAct();\n        });\n      }\n"
N_ACT = "          __realEnemyAct();   // 全局 enemyAct 已被 runner stub，必须调真身\n        });\n      }\n"

REPL = [('③', A3, N3), ('④', A4, N4), ('⑤', A5, N5), ('出招', A_ACT, N_ACT)]


def main():
    src = io.open(P, encoding='utf-8', newline='').read()
    if 'bugA：探针是活的' in src:
        print('SKIP 已修')
        return 0
    for tag, a, b in REPL:
        n = src.count(a)
        if n != 1:
            print('FAIL [%s] anchor count=%d (expect 1): %r' % (tag, n, a[:56]))
            return 1
        src = src.replace(a, b, 1)
    io.open(P, 'w', encoding='utf-8', newline='').write(src)
    print('OK 冒烟断言已修 4 处')
    return 0


if __name__ == '__main__':
    sys.exit(main())
