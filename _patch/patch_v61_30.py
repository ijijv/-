# -*- coding: utf-8 -*-
"""
v0.61.30 —— 修「复活后打死最后一个敌人，战斗永远不结算」

【根因】
  v0.61 B4 给 winFight() 加了重入守卫 `if(G.battleOver) return;`，loseGame() 里统一置
  `G.dead=true; G.battleOver=true;`。但 revive() 只清了 G.dead，**没清 G.battleOver**。
  于是「死亡 → 复活 → 继续同一场战斗」之后，battleOver 恒为 true：
  打死最后一个敌人时 winFight() 在守卫处直接 return，奖励面板永远不出 ——
  屏幕表现就是「敌人已清」但界面卡死（玩家 2026-09-21 实测截图复现）。
  日志里没有「击败了所有敌人！」这行，也证明 winFight 是在守卫处返回、而不是中途抛错。

【修法】
  revive() 里补 G.battleOver=false —— 复活回到的是同一场战斗，终局旗标必须一并清掉。

【顺带】
  双击 file:// 打开时，采样探测本来就被有意跳过（浏览器拦 fetch），但一直是静默的，
  玩家会以为「素材放了却没生效」。补一条 console.info 说明原因 + 给出路。

改动：js/40_flow.js 1 处、js/10_audio.js 1 处、smoke_runner.js 追加 1 段、版本号 3 处。
锚点唯一性各校验 count==1。
"""
import io
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..')

FLOW = os.path.join(ROOT, 'js', '40_flow.js')
AUD = os.path.join(ROOT, 'js', '10_audio.js')
SMOKE = os.path.join(HERE, 'smoke_runner.js')
HTML = os.path.join(ROOT, '原型.html')
BOOT = os.path.join(ROOT, 'js', '60_boot.js')

# ---------- ① revive() 清终局旗标 ----------
A1 = ("function revive(){\n"
      "  G.dead=false;\n")
N1 = ("function revive(){\n"
      "  G.dead=false;\n"
      "  /* v0.61.30 修：复活回到的是**同一场战斗**，必须把 B4 的终局旗标一起清掉。\n"
      "     否则 battleOver 恒为 true → 之后打死最后一个敌人时 winFight() 在重入守卫处直接 return，\n"
      "     战斗永远不结算，表现为「敌人已清」但界面卡死。 */\n"
      "  G.battleOver=false;\n")

# ---------- ② file:// 跳过采样时给出可见提示 ----------
A2 = "var SFX_LOADED = false, SFX_LOADING = false;\n"
N2 = "var SFX_LOADED = false, SFX_LOADING = false, _sfxHinted = false;\n"

A3 = "  if(sfxMode==='auto' && !ASSET_MAP && !SFX_FETCH_OK) return;   // 开发期双击本地打开：无注入表且取不到文件\n"
N3 = ("  if(sfxMode==='auto' && !ASSET_MAP && !SFX_FETCH_OK){\n"
      "    /* 开发期双击本地打开：无注入表且取不到文件。这是**有意为之**（file:// 下 fetch 会被拦，试也是白试），\n"
      "       但以前完全静默 —— 玩家会以为「素材放进 素材/sfx/ 了却没生效」。这里说明一次。 */\n"
      "    if(!_sfxHinted){ _sfxHinted=true;\n"
      "      try{ console.info('[音效] 当前是 file:// 双击打开，浏览器会拦 fetch，'+\n"
      "        '素材/sfx/ 下的外置音效探测已跳过，全部走 WebAudio 合成音。'+\n"
      "        '想听到自己放进去的音效：用 `python 试玩.py` 起本地 http 服务再打开，'+\n"
      "        '或 `python 打包.py` 用产物（音效已内联）。随时可用 sfxSamples() 查采样状态。'); }catch(e){}\n"
      "    }\n"
      "    return;\n"
      "  }\n")

# ---------- ③ 冒烟：回归用例 ----------
SMOKE_BLOCK = """
  /* ============ v0.61.30 复活后战斗能正常结算（B4 终局旗标回归） ============ */
  (function () {
    /* 复现路径：死亡 → 复活 → 打死最后一个敌人。此前 revive() 只清 G.dead，
       G.battleOver 留在 true，winFight() 被重入守卫挡掉 → 战斗永不结算（界面卡死）。 */
    G = __base('ganshiren'); __fresh();
    loseGame();
    var flagAfterLose = G.battleOver;
    revive();
    __ok('v0.61.30 前置：loseGame 确实置了 battleOver', flagAfterLose === true);
    __ok('v0.61.30 revive 后 battleOver 已清（不再卡死）', G.battleOver === false, 'battleOver=' + G.battleOver);
    __ok('v0.61.30 revive 后 dead 也已清（旧行为未破坏）', G.dead === false);

    // 行为验：复活后打死全部敌人，胜利结算要真的跑起来（battleResult 只有 winFight 尾段会写）
    G = __base('ganshiren'); __fresh();
    loseGame();
    revive();
    G.enemies.forEach(function (e) { e.hp = 0; });
    __ok('v0.61.30 前置：此刻已无存活敌人', aliveEnemies().length === 0);
    var threw = null;
    try { winFight(); } catch (e) { threw = e; }
    __ok('v0.61.30 winFight 不抛异常', threw === null, threw && threw.message);
    __ok('v0.61.30 复活后清场 → 胜利结算执行（不再被守卫吞掉）', !!G.battleResult, 'result=' + JSON.stringify(G.battleResult));
    __ok('v0.61.30 结算后 battleOver 重新置 true', G.battleOver === true);
  })();

"""

A4 = "  rep.pass = _p; rep.fail = _f;\n"
N4 = SMOKE_BLOCK + "  rep.pass = _p; rep.fail = _f;\n"

# ---------- ④ 版本号 v0.61.25 → v0.61.30 ----------
A5 = "<title>志怪塔 · 原型 v0.61.25</title>\n"
N5 = "<title>志怪塔 · 原型 v0.61.30</title>\n"
A6 = "<h1 class=\"title\">志 怪 塔 <small>· 玩法原型 v0.61.25</small>"
N6 = "<h1 class=\"title\">志 怪 塔 <small>· 玩法原型 v0.61.30</small>"
A7 = "  showOverlay(`<h2>志 怪 塔 · v0.61.25</h2>"
N7 = "  showOverlay(`<h2>志 怪 塔 · v0.61.30</h2>"

EDITS = [(FLOW, A1, N1), (AUD, A2, N2), (AUD, A3, N3), (SMOKE, A4, N4),
         (HTML, A5, N5), (HTML, A6, N6), (BOOT, A7, N7)]


def main():
    cache, bad = {}, []
    for path, a, b in EDITS:
        if path not in cache:
            cache[path] = io.open(path, encoding='utf-8', newline='').read()
        n = cache[path].count(a)
        if n != 1:
            bad.append((os.path.relpath(path, ROOT), n, a.split('\n')[0][:60]))
            continue
        cache[path] = cache[path].replace(a, b, 1)
    if bad:
        print('FAIL 锚点不唯一/缺失，整体未落盘：')
        for f, n, s in bad:
            print('  [%s] count=%d  %r' % (f, n, s))
        return 1
    for path, s in cache.items():
        io.open(path, 'w', encoding='utf-8', newline='').write(s)
        print('OK %s' % os.path.relpath(path, ROOT))
    print('OK 共落地 %d 处改动' % len(EDITS))
    return 0


if __name__ == '__main__':
    sys.exit(main())