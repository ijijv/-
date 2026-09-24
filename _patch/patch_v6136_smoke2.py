# -*- coding: utf-8 -*-
"""v0.61.36 冒烟修补（第二轮）：第一轮漏掉的 3 处旧值断言 + 我写错的 3 处新断言

我第一轮犯错的地方（记下来，别再犯）：
  1. 漏了 3 处「武僧列旧值」断言（第一轮 grep 只覆盖了计划里点名的那几行）：
     `:329` 佛渡 blk 升级 +4、`:1296` 五通神 立即 5/6 与每回合 4、`:2681` 荆棘 3×4=12
  2. 反误伤块里我把「荆棘符 赶尸人」的档位写反了：源码是 `u?6:4`，即**升级 6 / 未升级 4**，
     我按文档的「反弹 6/4」直读成了「未升级 6」。冒烟输出 `A=4/6` 一眼看出来了
  3. 我以为五通神「立即格挡」赶尸人是 0 —— 实际是 5（老的 :782 断言早写着 +5格挡）
  4. 我拿 `summonTurnBlock()` 去量天师列，但它**第一行就是 `if(G.hero!=='wuseng') return 0`** ——
     它是武僧专用函数。改成「武僧 6 + 天师恒 0（函数契约）」反而更钉得住
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


# ── 1. 佛渡 blk 升级 +4 → +5 ──
rep("    __ok('B#20 佛渡 升级 +4 格挡', blk('fodu') === 0 && blk('fodu', true) === 4, blk('fodu') + '/' + blk('fodu', true));\n",
    "    __ok('B#20 佛渡 升级 +5 格挡（v0.61.36 武僧列 4 → 5）', blk('fodu') === 0 && blk('fodu', true) === 5, blk('fodu') + '/' + blk('fodu', true));\n",
    '佛渡 blk')

# ── 2. 五通神 立即 5/6 → 7/7，每回合 4 → 6 ──
rep("""    // #45 五通神：立即 1/2 + 首次 4 = 5/6，之后每回合开始 4
    g = __base('wuseng'); g.block = 0; c = __card('wutong'); c.eff(false, c);
    var wb = g.block, wv = g.summons[0].v;
    g = __base('wuseng'); g.block = 0; c = Object.assign({}, __card('wutong'), { up: true }); c.eff(true, c);
    __ok('v0.58 B#45 五通神 立即 5/6，之后每回合 4', wb === 5 && g.block === 6 && wv === 4 && g.summons[0].v === 4,
      wb + '/' + g.block + ' v=' + wv + '/' + g.summons[0].v);
""",
    """    // #45 五通神：立即 1 + 首次 6 = 7（两档同值），之后每回合开始 6（v0.61.36 武僧列）
    g = __base('wuseng'); g.block = 0; c = __card('wutong'); c.eff(false, c);
    var wb = g.block, wv = g.summons[0].v;
    g = __base('wuseng'); g.block = 0; c = Object.assign({}, __card('wutong'), { up: true }); c.eff(true, c);
    __ok('v0.58 B#45 五通神 立即 7/7，之后每回合 6（v0.61.36：5/6 与 4 → 7 与 6）',
      wb === 7 && g.block === 7 && wv === 6 && g.summons[0].v === 6,
      wb + '/' + g.block + ' v=' + wv + '/' + g.summons[0].v);
""",
    '五通神 立即/每回合')

# ── 3. 荆棘无上限叠加 3×4=12 → 3×3=9 ──
rep("    __ok('v0.61.10 未勾选项 P4 荆棘无上限叠加（3 次 × 4 = 12，未被钳制）', G.thorns === 12, 'thorns=' + G.thorns);\n",
    "    __ok('v0.61.10 未勾选项 P4 荆棘无上限叠加（3 次 × 3 = 9，未被钳制；v0.61.36 武僧列每层 4 → 3）', G.thorns === 9, 'thorns=' + G.thorns);\n",
    '荆棘无上限')

# ── 4. 反误伤：荆棘符 赶尸人 档位写反了（源码 u?6:4 → 未升级 4 / 升级 6）──
rep("""      __ok('v0.61.36 反误伤 荆棘符 赶尸人仍反弹 6/4、阴差仍 hitHeal=2、天师仍 hitCurse=1',
        jA0 === 6 && jA1 === 4 && jC.h === 2 && !jC.t && jD.c === 1 && !jD.t,
        'A=' + jA0 + '/' + jA1 + ' C=' + jC.h + ' D=' + jD.c);
""",
    """      __ok('v0.61.36 反误伤 荆棘符 赶尸人仍反弹 4/6、阴差仍 hitHeal=2、天师仍 hitCurse=1',
        jA0 === 4 && jA1 === 6 && jC.h === 2 && !jC.t && jD.c === 1 && !jD.t,
        'A=' + jA0 + '/' + jA1 + '（未升级/升级） C=' + jC.h + ' D=' + jD.c);
""",
    '荆棘符 反误伤档位')

# ── 5. 反误伤：五通神 赶尸人立即格挡是 5，不是 0 ──
rep("""      __ok('v0.61.36 反误伤 五通神 立即格挡：武僧 7 / 天师 6 / 阴差 0 / 赶尸人 0',
        wtBlock('wuseng', false) === 7 && wtBlock('tianshi', false) === 6 &&
        wtBlock('yincha', false) === 0 && wtBlock('ganshiren', false) === 0,
        [wtBlock('wuseng', false), wtBlock('tianshi', false), wtBlock('yincha', false), wtBlock('ganshiren', false)].join('/'));
""",
    """      // 阴差走回血（heal 5，不给格挡）、赶尸人走尸气分支但召唤自身仍给 5 格挡（老断言 :782 即 +5格挡）
      __ok('v0.61.36 反误伤 五通神 立即格挡：武僧 7（本批）/ 天师 6 / 赶尸人 5 / 阴差 0',
        wtBlock('wuseng', false) === 7 && wtBlock('tianshi', false) === 6 &&
        wtBlock('ganshiren', false) === 5 && wtBlock('yincha', false) === 0,
        [wtBlock('wuseng', false), wtBlock('tianshi', false), wtBlock('ganshiren', false), wtBlock('yincha', false)].join('/'));
""",
    '五通神 立即格挡反误伤')

# ── 6. 五通神 每回合：summonTurnBlock 是武僧专用函数，天师恒 0 才是契约 ──
rep("""      __ok('v0.61.36 五通神 每回合开始格挡：武僧 6（4 → 6）/ 天师 6（v0.61.35 4 → 6）',
        wtU('wuseng') === 6 && wtU('tianshi') === 6, 'B=' + wtU('wuseng') + ' D=' + wtU('tianshi'));
""",
    """      // 注意：summonTurnBlock / preBlockNextTurn 第一行就是 `if(G.hero!=='wuseng') return 0` ——
      // 它是**武僧专用**函数（天师的每回合格挡走 wutongTick，不经过这里）。
      __ok('v0.61.36 五通神 每回合开始格挡：武僧 6（4 → 6）；summonTurnBlock 对非武僧恒 0（函数契约）',
        wtU('wuseng') === 6 && wtU('tianshi') === 0 &&
        (__base('yincha'), summonTurnBlock({ type: 'wutong', v: 6, dur: 2, up: false }) === 0),
        'B=' + wtU('wuseng') + ' D=' + wtU('tianshi'));
""",
    '五通神 每回合格挡')

if errs:
    print('=== 锚点校验失败，未写入任何文件 ===')
    for e in errs:
        print(' ✗', e)
    sys.exit(1)

io.open(S, 'w', encoding='utf-8', newline='').write(body.replace('\n', nl))
print('OK smoke_runner.js %d 字符' % len(body))