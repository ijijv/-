# -*- coding: utf-8 -*-
r"""
v0.61.31 修正 2 —— 冒烟第 5 组：把 ASSET_MAP 显式摆好，别再依赖「跑在哪个环境」

【错在哪】产物冒烟比源码冒烟多红了 3 条，全是本批新加的：
    v0.61.31 开精英战 → 请求 battle_elite ... got=battle
    v0.61.31 开 Boss 战 → 请求 battle_boss ... got=battle
    v0.61.31 精英带小怪 → 仍是 battle_elite ... got=battle

  不是代码错，是**我的断言没控制 ASSET_MAP**，于是它读的是「当前环境」：
    · 源码树冒烟：ASSET_MAP = null（开发期口径）→ setBGM 原样透传逻辑轨 → 断言过
    · 打包产物：`打包.py` **注入了 ASSET_MAP**（它是权威清单），而用户还没交付那三首曲子
      → `bgmTrackFor('battle_elite')` 正确地退回 'battle' → 断言红
  也就是说：**这条断言在 dist 里红，恰恰证明回退逻辑是对的**。断言本身写错了。

【怎么修】不再依赖环境，显式摆出两种情形各验一次：
  (a) 逻辑轨：直接问 `battleBgmFor(G.enemies)`（与素材无关，环境无关）
  (b) 端到端·已交付：ASSET_MAP 里放上这三首 → startBattle 必须交出升级轨
  (c) 端到端·未交付：ASSET_MAP 里只有基础轨 → startBattle 必须退回 'battle'
      —— 这一条就是 dist 里的真实情形，本批之前没有任何用例覆盖它，
         正好借这次失误把它补成正式用例（比原来只测 (b) 更有价值）。

锚点唯一性各校验 count==1；锚点按目标文件实际换行序列折算（见 patch_v61_31_verify.py 的教训）。
"""
import io
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..')
RUNNER = os.path.join(HERE, 'smoke_runner.js')
LOG = os.path.join(ROOT, '更新日志.md')

A1 = """    var __o2 = startBGM, __tracks = [];
    startBGM = function (t) { __tracks.push(t); };
    if (startBGM !== __o2 && __normalKey && __eliteKey && __bossKey) {
      var __stErr = null;
      function __startWith(keys) {
        __tracks = [];
        try { G = __base('ganshiren'); __fresh(); startBattle(keys); }
        catch (e) { __stErr = e; }
        return __tracks[__tracks.length - 1];
      }
      var __tn = __startWith([__normalKey]);
      __ok('v0.61.31 前置：startBattle 在本沙箱跑得动（不抛异常）',
        __stErr === null, __stErr && __stErr.message);
      __ok('v0.61.31 开普通战 → 请求 battle（前置：该敌人确实非精英非Boss）',
        __tn === 'battle' && G.enemies.every(function (e) { return !e.boss && !e.elite; }), 'got=' + __tn);
      var __te = __startWith([__eliteKey]);
      __ok('v0.61.31 开精英战 → 请求 battle_elite（前置：该敌人确实是精英）',
        __te === 'battle_elite' && G.enemies.some(function (e) { return e.elite; }), 'got=' + __te);
      var __tb = __startWith([__bossKey]);
      __ok('v0.61.31 开 Boss 战 → 请求 battle_boss（前置：该敌人确实是 Boss）',
        __tb === 'battle_boss' && G.enemies.some(function (e) { return e.boss; }), 'got=' + __tb);
      /* 混编：Boss + 小怪仍是 Boss 轨；精英 + 小怪仍是精英轨 */
      var __tmix = __startWith([__eliteKey, __normalKey]);
      __ok('v0.61.31 精英带小怪 → 仍是 battle_elite（不被小怪拉回普通轨）',
        __tmix === 'battle_elite', 'got=' + __tmix);
    }
    startBGM = __o2;
"""

N1 = """    var __o2 = startBGM, __tracks = [];
    startBGM = function (t) { __tracks.push(t); };
    /* 本节每一条都必须**显式摆好 ASSET_MAP** —— 它决定 setBGM 是原样透传逻辑轨还是先退回基础轨。
       曾经这里没摆，于是同一组断言「源码树过、打包产物红」：源码树 ASSET_MAP=null（开发期透传），
       产物里 打包.py 注入了 ASSET_MAP 且用户还没交付那三首 → 正确退回 'battle' → 断言红。
       断言依赖了环境而不是被测逻辑，是写错了；现在三种情形各验一次。 */
    var __savE = ASSET_MAP;
    var __TRACKS_ALL = { 'music/bgm_battle.ogg': 'data:x',
      'music/bgm_battle_elite.ogg': 'data:x', 'music/bgm_battle_boss.ogg': 'data:x',
      'music/bgm_map.ogg': 'data:x', 'music/bgm_shop.ogg': 'data:x' };
    var __ONLY_BASE = { 'music/bgm_battle.ogg': 'data:x', 'music/bgm_map.ogg': 'data:x' };
    if (startBGM !== __o2 && __normalKey && __eliteKey && __bossKey) {
      var __stErr = null;
      function __startWith(keys, amap) {
        __tracks = [];
        ASSET_MAP = amap;
        try { G = __base('ganshiren'); __fresh(); startBattle(keys); }
        catch (e) { __stErr = e; }
        return __tracks[__tracks.length - 1];
      }
      /* (a) 逻辑轨 —— 与素材是否交付无关（这条是本节的地基，环境无关） */
      __startWith([__normalKey], __TRACKS_ALL);
      __ok('v0.61.31 前置：startBattle 在本沙箱跑得动（不抛异常）',
        __stErr === null, __stErr && __stErr.message);
      __ok('v0.61.31 普通战的逻辑轨 = battle（前置：该敌人确实非精英非Boss）',
        battleBgmFor(G.enemies) === 'battle' && G.enemies.every(function (e) { return !e.boss && !e.elite; }),
        'logic=' + battleBgmFor(G.enemies));
      __startWith([__eliteKey], __TRACKS_ALL);
      __ok('v0.61.31 精英战的逻辑轨 = battle_elite（前置：该敌人确实是精英）',
        battleBgmFor(G.enemies) === 'battle_elite' && G.enemies.some(function (e) { return e.elite; }),
        'logic=' + battleBgmFor(G.enemies));
      __startWith([__bossKey], __TRACKS_ALL);
      __ok('v0.61.31 Boss 战的逻辑轨 = battle_boss（前置：该敌人确实是 Boss）',
        battleBgmFor(G.enemies) === 'battle_boss' && G.enemies.some(function (e) { return e.boss; }),
        'logic=' + battleBgmFor(G.enemies));
      __startWith([__eliteKey, __normalKey], __TRACKS_ALL);
      __ok('v0.61.31 精英带小怪 → 逻辑轨仍是 battle_elite（不被小怪拉回普通轨）',
        battleBgmFor(G.enemies) === 'battle_elite', 'logic=' + battleBgmFor(G.enemies));

      /* (b) 端到端·三首都已交付 → startBattle 真的把升级轨交出去 */
      var __te = __startWith([__eliteKey], __TRACKS_ALL);
      __ok('v0.61.31 已交付精英轨时，startBattle 交出 battle_elite', __te === 'battle_elite', 'got=' + __te);
      var __tb = __startWith([__bossKey], __TRACKS_ALL);
      __ok('v0.61.31 已交付 Boss 轨时，startBattle 交出 battle_boss', __tb === 'battle_boss', 'got=' + __tb);

      /* (c) 端到端·只交付了基础轨（= 打包产物当下的真实情形）→ 必须退回，且不空转 */
      var __tfb = __startWith([__bossKey], __ONLY_BASE);
      __ok('v0.61.31 未交付 Boss 轨时，startBattle 退回 battle（回退在真实开战路径上生效）',
        __tfb === 'battle', 'got=' + __tfb);
      var __tfe = __startWith([__eliteKey], __ONLY_BASE);
      __ok('v0.61.31 未交付精英轨时，startBattle 退回 battle', __tfe === 'battle', 'got=' + __tfe);
      var __tnb = __startWith([__normalKey], __ONLY_BASE);
      __ok('v0.61.31 普通战不受回退影响，仍是 battle', __tnb === 'battle', 'got=' + __tnb);
    }
    ASSET_MAP = __savE;
    startBGM = __o2;
"""

# 更新日志：把产物冒烟的真实情况写清楚
A2 = """> 因此浏览器复核清单第 1 条（Boss 房没素材时应仍是战斗曲）**必须真机目视**。
"""
N2 = """> 因此浏览器复核清单第 1 条（Boss 房没素材时应仍是战斗曲）**必须真机目视**。

**产物冒烟（`node _patch/smoke_host.js dist/志怪塔.html`）：754 / 10**，其中
**7 条是既有的「查源码文本」类断言**（`fn.toString().indexOf(…)`，混淆后字符串必然面目全非，
与本次无关，数量与上批记录的 7 一致），**另 3 条是本批新加用例的写错**，已修：

> 那 3 条断言遥测的是「`startBattle` 把哪条轨交给 `setBGM`」，却**没显式摆 ASSET_MAP**，
> 于是读的是环境：源码树 `ASSET_MAP=null`（开发期原样透传逻辑轨）→ 过；
> 产物里 `打包.py` 注入了 `ASSET_MAP` 且用户还没交付那三首 → `bgmTrackFor` 正确退回 `battle` → 红。
> **断言红的原因恰恰是回退逻辑对了**，错的是断言依赖了环境。
> 修法：显式摆出 (a) 逻辑轨（问 `battleBgmFor`，环境无关）。(b) 三首已交付 → 交出升级轨。
> (c) **只交付基础轨 → 必须退回 `battle`** —— 这条正是打包产物当下的真实情形，
> 本批之前没有任何用例覆盖它，借这次失误补成了正式用例。
"""

EDITS = [(RUNNER, A1, N1), (LOG, A2, N2)]


def main():
    if '未交付 Boss 轨时，startBattle 退回 battle' in io.open(RUNNER, encoding='utf-8').read():
        print('SKIP 已改过')
        return 0
    cache, bad = {}, []
    for path, a, b in EDITS:
        if path not in cache:
            cache[path] = io.open(path, encoding='utf-8', newline='').read()
        raw = cache[path]
        # 锚点写成 \n，按目标文件实际换行序列折算（本仓库混合 LF/CRLF）
        nl = '\r\n' if '\r\n' in raw else '\n'
        a2, b2 = a.replace('\n', nl), b.replace('\n', nl)
        n = raw.count(a2)
        if n != 1:
            bad.append((os.path.relpath(path, ROOT), n, a.split('\n')[0][:60]))
            continue
        cache[path] = raw.replace(a2, b2, 1)
    if bad:
        print('FAIL 锚点不唯一/缺失，整体未落盘：')
        for f, n, s in bad:
            print('  [%s] count=%d  %r' % (f, n, s))
        return 1
    for path, s in cache.items():
        io.open(path, 'w', encoding='utf-8', newline='').write(s)
        print('OK %s' % os.path.relpath(path, ROOT))
    print('OK 共落地 %d 处' % len(EDITS))
    return 0


if __name__ == '__main__':
    sys.exit(main())