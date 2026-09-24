# -*- coding: utf-8 -*-
"""v0.61.36 冒烟修补（第四轮）：结构断言必须用**真** floatDamage

第三轮我踩的坑（记下来）：
  我以为 C 段（:3511 那两条 v0.61.33 断言）能测到真的 floatDamage ——
  但 `:658` 有一句 `try { floatDamage = __sil; } catch (e) {}`，从那里起**全局**就被顶成空函数了，
  所以我的 C3/C4 结构断言全落在空函数上（__spans.length===0 → 取 [0].textContent 直接炸）。
  修法沿用同一个文件里早就有的先例：`var __realSfx = sfx;`（第 6 行）——
  这里照样存一份 `__realFloatDamage`，断言时临时换回来、跑完换回 __sil。
  另外给 __spans[0] 加了 `|| {}` 兜底：断言失败要报红，不能把整轮冒烟炸掉。
"""
import io, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = os.path.join(ROOT, '_patch', 'smoke_runner.js')

raw = io.open(S, encoding='utf-8').read()
nl = '\r\n' if '\r\n' in raw else '\n'
body = raw.replace('\r\n', '\n')
errs = []


def rep(old, new, tag):
    global body
    n = body.count(old)
    if n != 1:
        errs.append('[%s] 命中 %d 次，期望 1 次' % (tag, n))
        return
    body = body.replace(old, new, 1)


# 1. 存真函数（沿用 __realSfx / __realSaveRun 的既有先例）
rep("""  var __realSfx = sfx; // v0.61.25 金快照探针要用真 sfx（第 631 行会把全局 sfx 顶成 __sil）
""",
    """  var __realSfx = sfx; // v0.61.25 金快照探针要用真 sfx（第 631 行会把全局 sfx 顶成 __sil）
  var __realFloatDamage = floatDamage; // v0.61.36：第 658 行会把全局 floatDamage 顶成 __sil，结构断言要用真的
""",
    '存真 floatDamage')

# 2. C3 结构断言：临时换回真函数
rep("""    var __made = [], __origCE = document.createElement;
    var __fdErr = null;
    try {
      document.createElement = function (tag) { var el = __origCE(tag); __made.push(el); return el; };
      floatDamage('-25', '', null, { crit: true });
      floatDamage('+7', 'block', null);
    } catch (e4) { __fdErr = e4; } finally { document.createElement = __origCE; }
""",
    """    var __made = [], __origCE = document.createElement, __keepFD = floatDamage;
    var __fdErr = null;
    try {
      document.createElement = function (tag) { var el = __origCE(tag); __made.push(el); return el; };
      floatDamage = __realFloatDamage; // 换回真的：全局在 :658 已被顶成 __sil
      floatDamage('-25', '', null, { crit: true });
      floatDamage('+7', 'block', null);
    } catch (e4) { __fdErr = e4; } finally { document.createElement = __origCE; floatDamage = __keepFD; }
""",
    'C3 换真函数')

# 3. C3 两条断言：__spans[0] / __inners[0] 加兜底
rep("""    __ok('v0.61.36 C3 只有 crit 那一次加了 .crit 类（opts 省略时不受影响）',
      __crit.length === 1 && /block/.test(String(__spans[0].className)) === false,
      __spans.map(function (e) { return e.className; }).join(' | '));
    __ok('v0.61.36 C3 文字回退时字形挂在**内层**（外层 .fx-dmg 自身不带字形）',
      String(__spans[0].textContent || '') === '' && String(__inners[0].textContent || '') === '-25',
      'outer="' + (__spans[0].textContent || '') + '" inner="' + (__inners[0].textContent || '') + '"');
""",
    """    var __sp0 = __spans[0] || {}, __in0 = __inners[0] || {};
    __ok('v0.61.36 C3 只有 crit 那一次加了 .crit 类（opts 省略时不受影响）',
      __crit.length === 1 && /block/.test(String(__sp0.className)) === false,
      __spans.map(function (e) { return e.className; }).join(' | '));
    __ok('v0.61.36 C3 文字回退时字形挂在**内层**（外层 .fx-dmg 自身不带字形）',
      String(__sp0.textContent || '') === '' && String(__in0.textContent || '') === '-25',
      'outer="' + (__sp0.textContent || '') + '" inner="' + (__in0.textContent || '') + '"');
""",
    'C3 兜底')

# 4. C4 行为验证：dealDamageTo 内部也走全局 floatDamage，同样要临时换回
rep("""      var made = [], origCE = document.createElement, err = null;
      try {
        document.createElement = function (tag) { var el = origCE(tag); made.push(el); return el; };
        G = __base('wuseng'); G.enemies[0].hp = 300; G.enemies[0].maxHp = 300;
        dealDamageTo(G.enemies[0], dmg);
      } catch (e5) { err = e5; } finally { document.createElement = origCE; }
""",
    """      var made = [], origCE = document.createElement, err = null, keepFD = floatDamage;
      try {
        document.createElement = function (tag) { var el = origCE(tag); made.push(el); return el; };
        G = __base('wuseng'); G.enemies[0].hp = 300; G.enemies[0].maxHp = 300;
        floatDamage = __realFloatDamage; // dealDamageTo 内部调的是全局 floatDamage
        dealDamageTo(G.enemies[0], dmg);
      } catch (e5) { err = e5; } finally { document.createElement = origCE; floatDamage = keepFD; }
""",
    'C4 换真函数')

if errs:
    print('=== 锚点校验失败，未写入任何文件 ===')
    for e in errs:
        print(' ✗', e)
    sys.exit(1)

io.open(S, 'w', encoding='utf-8', newline='').write(body.replace('\n', nl))
print('OK smoke_runner.js %d 字符' % len(body))