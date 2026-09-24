# -*- coding: utf-8 -*-
"""v0.61.36 冒烟断言（第三轮）：数字图四档接缝 + 浮字 .fx-in/crit 结构

锚在既有的「C 数字素材接缝」一节后面（v0.61.33 留下的两条）。
用「包一层 document.createElement 抓产物」的办法验证 DOM 结构 ——
这比读源码可靠：结构真没建出来（比如内层忘了 append）就会红。
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


rep("""    __ok('v0.61.33 C floatDamage 在无素材时不抛错', ferr === null, ferr && ferr.message);
""",
    """    __ok('v0.61.33 C floatDamage 在无素材时不抛错', ferr === null, ferr && ferr.message);

    /* —— v0.61.36 C2 数字图四档接缝（素材/num/{dmg,hurt,block,heal}/0-9.png） —— */
    __ok('v0.61.36 C2 kind → 目录名 映射四档齐全（'' / to-player / block / heal）',
      numKind('') === 'dmg' && numKind('to-player') === 'hurt' &&
      numKind('block') === 'block' && numKind('heal') === 'heal' &&
      numKind(undefined) === 'dmg' && numKind('没见过的 kind') === 'dmg',
      [numKind(''), numKind('to-player'), numKind('block'), numKind('heal'), numKind('没见过的 kind')].join('/'));
    __ok('v0.61.36 C2 四档各自独立探测：无素材时四档全部判定不可用',
      numProbe('') === false && numProbe('to-player') === false &&
      numProbe('block') === false && numProbe('heal') === false,
      JSON.stringify(NUM_STATE));
    __ok('v0.61.36 C2 探测状态按档存（不是单一标量）',
      typeof NUM_STATE === 'object' && NUM_STATE !== null &&
      typeof NUM_IMG === 'object' && NUM_IMG !== null,
      typeof NUM_STATE);

    /* —— v0.61.36 C3 浮字结构：外层 .fx-dmg（位移）＋内层 .fx-in（抖动/闪烁） —— */
    var __made = [], __origCE = document.createElement;
    var __fdErr = null;
    try {
      document.createElement = function (tag) { var el = __origCE(tag); __made.push(el); return el; };
      floatDamage('-25', '', null, { crit: true });
      floatDamage('+7', 'block', null);
    } catch (e4) { __fdErr = e4; } finally { document.createElement = __origCE; }
    var __spans = __made.filter(function (e) { return /fx-dmg/.test(String(e.className || '')); });
    var __inners = __made.filter(function (e) { return String(e.className || '') === 'fx-in'; });
    var __crit = __spans.filter(function (e) { return /(^|\\s)crit(\\s|$)/.test(String(e.className || '')); });
    __ok('v0.61.36 C3 floatDamage 建出「外层 .fx-dmg + 内层 .fx-in」两层，且不抛错',
      __fdErr === null && __spans.length === 2 && __inners.length === 2,
      (__fdErr && __fdErr.message) || ('spans=' + __spans.length + ' inners=' + __inners.length));
    __ok('v0.61.36 C3 只有 crit 那一次加了 .crit 类（opts 省略时不受影响）',
      __crit.length === 1 && /block/.test(String(__spans[0].className)) === false,
      __spans.map(function (e) { return e.className; }).join(' | '));
    __ok('v0.61.36 C3 文字回退时字形挂在**内层**（外层 .fx-dmg 自身不带字形）',
      String(__spans[0].textContent || '') === '' && String(__inners[0].textContent || '') === '-25',
      'outer="' + (__spans[0].textContent || '') + '" inner="' + (__inners[0].textContent || '') + '"');

    /* —— v0.61.36 C4 大伤害档阈值与打击音效**同源**（isCritHit 单一来源） —— */
    __ok('v0.61.36 C4 isCritHit：≥20 或击杀；19 不算',
      isCritHit(20, false) === true && isCritHit(19, false) === false &&
      isCritHit(3, true) === true && isCritHit(0, false) === false,
      [isCritHit(20, false), isCritHit(19, false), isCritHit(3, true)].join('/'));
    __ok('v0.61.36 C4 HIT_HEAVY_DMG=10 / HIT_CRIT_DMG=20 且 pickHitSfx 走同一套判据',
      HIT_HEAVY_DMG === 10 && HIT_CRIT_DMG === 20 &&
      pickHitSfx(25, false, false) === 'hit_crit' && pickHitSfx(12, false, false) === 'hit_heavy' &&
      pickHitSfx(5, false, false) === 'hit_light' && pickHitSfx(25, true, false) === 'hit_guard' &&
      pickHitSfx(1, false, true) === 'hit_crit',
      [pickHitSfx(25, false, false), pickHitSfx(12, false, false), pickHitSfx(5, false, false)].join('/'));
    // 行为验证（不看源码文本）：真打一下敌人，看浮字是否带 .crit
    function __critSpansOnHit(dmg) {
      var made = [], origCE = document.createElement, err = null;
      try {
        document.createElement = function (tag) { var el = origCE(tag); made.push(el); return el; };
        G = __base('wuseng'); G.enemies[0].hp = 300; G.enemies[0].maxHp = 300;
        dealDamageTo(G.enemies[0], dmg);
      } catch (e5) { err = e5; } finally { document.createElement = origCE; }
      var sp = made.filter(function (e) { return /fx-dmg/.test(String(e.className || '')); });
      var cr = sp.filter(function (e) { return /(^|\\s)crit(\\s|$)/.test(String(e.className || '')); });
      return { err: err, spans: sp.length, crits: cr.length };
    }
    var _h25 = __critSpansOnHit(25), _h8 = __critSpansOnHit(8);
    __ok('v0.61.36 C4 对敌 25 伤 → 浮字带 .crit（与 hit_crit 音效同址同判据）',
      _h25.err === null && _h25.spans === 1 && _h25.crits === 1,
      (_h25.err && _h25.err.message) || ('spans=' + _h25.spans + ' crits=' + _h25.crits));
    __ok('v0.61.36 C4 对敌 8 伤 → 浮字不带 .crit（小伤害档不受影响）',
      _h8.err === null && _h8.spans === 1 && _h8.crits === 0,
      (_h8.err && _h8.err.message) || ('spans=' + _h8.spans + ' crits=' + _h8.crits));
""",
    'C2/C3/C4 新增')

if errs:
    print('=== 锚点校验失败，未写入任何文件 ===')
    for e in errs:
        print(' ✗', e)
    sys.exit(1)

io.open(S, 'w', encoding='utf-8', newline='').write(body.replace('\n', nl))
print('OK smoke_runner.js %d 字符' % len(body))