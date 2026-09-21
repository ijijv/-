# -*- coding: utf-8 -*-
r"""
v0.61.31 —— BGM 三轨接线：精英战 / Boss 战 / 商店·营地·事件

【背景】素材清单.md 的第二节早就写了 6 轨（菜单/地图/普通战/精英战/Boss战/商店篝火），
但代码只认 menu/map/battle 三条 —— 文档超前于代码，是本仓库最典型的老化方式。
本批把差的三轨接上。

【关键坑（这次的核心）】Boss/精英轨不能「文件没交付也照样切」。
  若 Boss 房切到 battle_boss 而素材不存在：startBGM → tryNext 逐个扩展名探测 → 全 miss
  → `BGM=null; startSynthBGM('battle_boss')` → **反而比普通战少了音乐**
  （合成器只对 'battle' 叠鼓，见 startSynthBGM 里的 `track==='battle'` 特判）。
  即「升级轨没到位时，切过去是净亏损」。所以三轨都必须**能退回基础轨**：
      battle_elite → battle ｜ battle_boss → battle ｜ shop → map
  两条路径都要覆盖：
    · 打包产物（ASSET_MAP 是权威清单）→ bgmTrackFor() 同步查表，查不到当场退回，零空转
    · 开发期 file://（ASSET_MAP=null，没法预知磁盘）→ 交给 tryNext 探测，
      耗尽后由 startBGM 内部的兜底分支退回基础轨

【第二坑】判定 Boss/精英轨必须**在 G.enemies 建好之后**。
  原 startBattle 是 `setBGM('battle')` 写在 `G.enemies = keys.map(...)` 的上一行，
  那一刻 e.boss/e.elite 都还不存在 —— 判定放前面永远判不出来。故本批调序。

【第三坑（顺手补）】40_flow.js 读档续战那行也写死 'battle'，
  读档进 Boss 房会掉回普通战轨，同批改成 battleBgmFor(G.enemies)（该行在恢复敌人之后，可用）。

【不做】startBGM 的签名不加第二参数 —— 兜底改成它**自己查 BGM_FALLBACK**。
  这样 60_boot.js:433 的 `startBGM(CUR_BGM)`（声音开关重开）等所有直接调用点
  自动获得回退能力，不需要每个调用点都记得传参。

锚点唯一性各校验 count==1。
"""
import io
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..')

AUD = os.path.join(ROOT, 'js', '10_audio.js')
ENG = os.path.join(ROOT, 'js', '30_engine.js')
FLOW = os.path.join(ROOT, 'js', '40_flow.js')
UI = os.path.join(ROOT, 'js', '50_ui.js')
BOOT = os.path.join(ROOT, 'js', '60_boot.js')
HTML = os.path.join(ROOT, '原型.html')
VDIST = os.path.join(HERE, 'verify_dist.py')
RUNNER = os.path.join(HERE, 'smoke_runner.js')
LOG = os.path.join(ROOT, '更新日志.md')

# ---------------------------------------------------------------- 1. 路由层

A_AUD1 = """function startBGM(track){
  if(!SETTINGS.sound){ stopBGM(); return; }
"""
N_AUD1 = """/* v0.61.31：精英 / Boss / 商店三轨是「可选升级轨」—— 素材没交付就退回基础轨。
   不退的后果很实在：Boss 房切 battle_boss 而文件不存在 → tryNext 耗尽扩展名 →
   掉进 startSynthBGM('battle_boss')，**反而比普通战少了音乐**（合成器只给 'battle' 叠鼓）。
   基础轨 menu/map/battle 不设回退项（它们没有可退的上级）。 */
const BGM_FALLBACK = { battle_elite:'battle', battle_boss:'battle', shop:'map' };
/* 打包产物里 ASSET_MAP 是权威清单：查得到就直接用，查不到当场退回（同步、可测、零空转）。
   开发期（file:// 双击，打包.py 没注入 ASSET_MAP）无法预知磁盘上有什么，
   返回原轨交给 tryNext 逐扩展名探测，探测耗尽后由 startBGM 内部兜底。 */
function bgmTrackFor(track){
  if(!ASSET_MAP) return track;
  return BGM_EXTS.some(e=>ASSET_MAP['music/bgm_'+track+e]) ? track : (BGM_FALLBACK[track]||track);
}
/* 从敌人列表判定该用哪条战斗轨：Boss > 精英 > 普通。
   入参是数组而非直接读 G —— 这样读档续战（40_flow.js）和开局（30_engine.js）能共用，
   也便于冒烟里直接喂假数据验证。 */
function battleBgmFor(enemies){
  const l=enemies||[];
  if(l.some(e=>e&&e.boss)) return 'battle_boss';
  if(l.some(e=>e&&e.elite)) return 'battle_elite';
  return 'battle';
}
function startBGM(track){
  if(!SETTINGS.sound){ stopBGM(); return; }
"""

# 探测耗尽的兜底：退回基础轨，而不是硬播合成版升级轨
A_AUD2 = "    if(idx>=exts.length){ BGM=null; startSynthBGM(track); return; }\n"
N_AUD2 = """    if(idx>=exts.length){
      /* v0.61.31：升级轨探测全 miss → 退回基础轨（否则 Boss 房比普通战还安静）。
         兜底查表放在 startBGM 内部而不是加第二参数：这样所有直接调用点
         （如 60_boot.js 声音开关重开时的 startBGM(CUR_BGM)）自动获得回退能力。 */
      const __fb=BGM_FALLBACK[track];
      if(__fb && __fb!==track) return startBGM(__fb);
      BGM=null; startSynthBGM(track); return;
    }
"""

A_AUD3 = "function setBGM(track){ CUR_BGM=track; startBGM(track); }\n"
N_AUD3 = """/* CUR_BGM 记的是**逻辑轨**（设置页/存档看到的是「该在哪首曲子」），
   实际播放哪条由 bgmTrackFor 决定 —— 素材到货后无需改任何调用点，自动切回升级轨。 */
function setBGM(track){ CUR_BGM=track; startBGM(bgmTrackFor(track)); }
"""

# ---------------------------------------------------------------- 2. 开局判定（须在建敌人之后）

A_ENG = """  setBg(G.endless?'act3':'act'+G.act); setBGM('battle');
  G.enemies = keys.map(k=>makeEnemy(ENEMIES[k], k));
"""
N_ENG = """  setBg(G.endless?'act3':'act'+G.act);
  G.enemies = keys.map(k=>makeEnemy(ENEMIES[k], k));
  /* v0.61.31：Boss/精英轨必须**在这一行之后**判定 —— G.enemies 到上一行才存在，
     原来 setBGM('battle') 写在建敌人之前，那一刻 e.boss / e.elite 都还没生成，判不出来。 */
  setBGM(battleBgmFor(G.enemies));
"""

# ---------------------------------------------------------------- 3. 读档续战（同批补）

A_FLOW = "  if(d.scene==='battle'){ SCENE='battle'; setBg(G.endless?'act3':'act'+G.act); setBGM('battle'); render(); }\n"
N_FLOW = "  if(d.scene==='battle'){ SCENE='battle'; setBg(G.endless?'act3':'act'+G.act); setBGM(battleBgmFor(G.enemies)); render(); } // v0.61.31：读档进 Boss 房也走 Boss 轨（上一行已恢复 G.enemies）\n"

# ---------------------------------------------------------------- 4. 商店 / 营地 / 事件共用 shop 轨

A_UI1 = "  SCENE='unknown'; saveRun();\n"
N_UI1 = "  SCENE='unknown'; saveRun();\n  setBGM('shop'); // v0.61.31：事件节点是非战斗场景，与商店/营地共用同一条轨\n"

A_UI2 = "  G.campRemoved=false; G.campActed=false;\n  SCENE='camp'; saveRun();\n"
N_UI2 = "  G.campRemoved=false; G.campActed=false;\n  SCENE='camp'; saveRun();\n  setBGM('shop'); // v0.61.31：营地为非战斗场景，与商店共用同一条轨\n"

A_UI3 = "  SCENE='shop'; saveRun();\n  renderShop();\n"
N_UI3 = "  SCENE='shop'; saveRun();\n  setBGM('shop'); // v0.61.31\n  renderShop();\n"

# ---------------------------------------------------------------- 5. verify_dist 的 music 清单

A_VD = "music:['menu','map','battle'],"
N_VD = "music:['menu','map','battle','battle_elite','battle_boss','shop'],"

# ---------------------------------------------------------------- 6. 版本号 3 处

A_V1 = "<title>志怪塔 · 原型 v0.61.30</title>"
N_V1 = "<title>志怪塔 · 原型 v0.61.31</title>"
A_V2 = "玩法原型 v0.61.30"
N_V2 = "玩法原型 v0.61.31"
A_V3 = "志 怪 塔 · v0.61.30"
N_V3 = "志 怪 塔 · v0.61.31"

# ---------------------------------------------------------------- 7. 冒烟断言

A_SM = "  rep.pass = _p; rep.fail = _f;\n"
N_SM = r"""  /* ============ v0.61.31 BGM 五轨路由 + 缺轨回退到基础轨 ============ */
  (function () {
    /* 1. 回退表本身：三条升级轨各有基础轨可退；三条基础轨不设项（没有可退的上级） */
    __ok('v0.61.31 BGM_FALLBACK 三条升级轨都有基础轨可退',
      BGM_FALLBACK.battle_elite === 'battle' && BGM_FALLBACK.battle_boss === 'battle' && BGM_FALLBACK.shop === 'map');
    __ok('v0.61.31 基础轨不设回退项（否则会自我递归）',
      !('menu' in BGM_FALLBACK) && !('map' in BGM_FALLBACK) && !('battle' in BGM_FALLBACK));

    /* 2. 战斗轨判定：Boss > 精英 > 普通 */
    __ok('v0.61.31 battleBgmFor：普通战 → battle',
      battleBgmFor([{ elite:false, boss:false }, { elite:false, boss:false }]) === 'battle');
    __ok('v0.61.31 battleBgmFor：含精英 → battle_elite',
      battleBgmFor([{ elite:false, boss:false }, { elite:true, boss:false }]) === 'battle_elite');
    __ok('v0.61.31 battleBgmFor：含 Boss → battle_boss（优先于精英）',
      battleBgmFor([{ elite:true, boss:false }, { elite:false, boss:true }]) === 'battle_boss');
    __ok('v0.61.31 battleBgmFor：空列表 / undefined 不抛错 → battle',
      battleBgmFor([]) === 'battle' && battleBgmFor(undefined) === 'battle' && battleBgmFor([null]) === 'battle');

    /* 3. 打包产物口径：ASSET_MAP 是权威清单 → 同步回退，不空转 4 次文件探测 */
    var __savA = ASSET_MAP;
    ASSET_MAP = { 'music/bgm_map.ogg': 'data:x', 'music/bgm_battle.ogg': 'data:x' };
    __ok('v0.61.31 缺 Boss 轨 → bgmTrackFor 退回 battle', bgmTrackFor('battle_boss') === 'battle');
    __ok('v0.61.31 缺精英轨 → bgmTrackFor 退回 battle', bgmTrackFor('battle_elite') === 'battle');
    __ok('v0.61.31 缺商店轨 → bgmTrackFor 退回 map', bgmTrackFor('shop') === 'map');
    __ok('v0.61.31 基础轨仍指向自己',
      bgmTrackFor('battle') === 'battle' && bgmTrackFor('map') === 'map' && bgmTrackFor('menu') === 'menu');
    ASSET_MAP = { 'music/bgm_map.ogg': 'data:x', 'music/bgm_battle_boss.mp3': 'data:x' };
    __ok('v0.61.31 交付了 Boss 轨 → 用它，且不挑扩展名（.mp3 也认）',
      bgmTrackFor('battle_boss') === 'battle_boss');
    __ok('v0.61.31 交付 Boss 轨不影响没交付的精英轨', bgmTrackFor('battle_elite') === 'battle');
    ASSET_MAP = __savA;

    /* 4. setBGM 打桩：CUR_BGM 记逻辑轨、实际请求走 bgmTrackFor */
    var __origStart = startBGM, __seen = [];
    startBGM = function (t) { __seen.push(t); };
    var __stubOK = (startBGM !== __origStart);
    __ok('v0.61.31 前置：startBGM 可被打桩（否则本组行为断言无意义）', __stubOK);
    if (__stubOK) {
      var __savB = ASSET_MAP;
      ASSET_MAP = { 'music/bgm_battle.ogg': 'data:x' };
      setBGM('battle_boss');
      __ok('v0.61.31 setBGM 记的是逻辑轨（CUR_BGM=battle_boss）', CUR_BGM === 'battle_boss');
      __ok('v0.61.31 缺 Boss 轨时实际只请求 battle（一次到位，不空转探测）',
        __seen.length === 1 && __seen[0] === 'battle', JSON.stringify(__seen));
      __seen = []; ASSET_MAP = { 'music/bgm_battle_boss.ogg': 'data:x' };
      setBGM('battle_boss');
      __ok('v0.61.31 有 Boss 轨时实际请求 battle_boss（素材到货即生效）',
        __seen.length === 1 && __seen[0] === 'battle_boss', JSON.stringify(__seen));
      ASSET_MAP = __savB;
      startBGM = __origStart;
    }

    /* 5. 端到端：真的开一场 Boss/精英/普通战，看 startBattle 请求了哪条轨。
       敌人 key 不写死 —— 从 ENEMIES 里现挑，挑不到就让上面的前置断言直接红。 */
    var __normalKey = Object.keys(ENEMIES).filter(function (k) {
      return !ENEMIES[k].elite && !ENEMIES[k].boss;
    })[0];
    var __eliteKey = Object.keys(ENEMIES).filter(function (k) { return ENEMIES[k].elite && !ENEMIES[k].boss; })[0];
    var __bossKey = Object.keys(ENEMIES).filter(function (k) { return ENEMIES[k].boss; })[0];
    __ok('v0.61.31 前置：ENEMIES 里普通/精英/Boss 三类都有可取样的 key',
      !!__normalKey && !!__eliteKey && !!__bossKey,
      'normal=' + __normalKey + ' elite=' + __eliteKey + ' boss=' + __bossKey);

    var __o2 = startBGM, __tracks = [];
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

    /* 6. tryNext 探测耗尽的兜底（开发期 file:// 口径）：不能硬播合成版升级轨。
       沙箱的 AudioStub 没有 load()，故这里临时换一个「load() 静默不作声」的桩，
       并把 setTimeout 变成同步立即执行 —— 于是逐个扩展名探测会当场走完，
       从而真正跑到 `idx>=exts.length` 那条分支。startSynthBGM 一并打桩记录。 */
    var __oA = Audio, __oT = setTimeout, __oSynth = startSynthBGM, __synth = [];
    var __oSnd = SETTINGS.sound; SETTINGS.sound = true;   // 前面的用例可能关过声音，否则 startBGM 会提前 return
    Audio = function () {
      var self = this;
      this.loop = false; this.volume = 0;
      this.play = function () { return { catch: function () {} }; };
      this.load = function () { /* 静默：既不 onerror 也不 oncanplaythrough */ };
      return self;
    };
    setTimeout = function (fn) { if (typeof fn === 'function') fn(); return 0; };
    startSynthBGM = function (t) { __synth.push(t); };
    var __savC = ASSET_MAP; ASSET_MAP = null;   // 开发期：没有权威清单，只能靠探测
    stopBGM();
    setBGM('battle_boss');
    __ok('v0.61.31 开发期探测全 miss → 退回基础轨 battle（而不是合成 battle_boss）',
      BGM_TRACK === 'battle', 'BGM_TRACK=' + BGM_TRACK);
    __ok('v0.61.31 探测全 miss 时合成器拿到的也是 battle，升级轨名一次都没进合成器',
      __synth.indexOf('battle_boss') === -1, JSON.stringify(__synth));
    ASSET_MAP = __savC; Audio = __oA; setTimeout = __oT; startSynthBGM = __oSynth;
    SETTINGS.sound = __oSnd;
    stopBGM();
  })();

  rep.pass = _p; rep.fail = _f;
"""

# ---------------------------------------------------------------- 8. 更新日志

LOG_ENTRY = """## v0.61.31 BGM 三轨接线：精英战 / Boss 战 / 商店·营地·事件（2026-09-21）

> 素材清单.md 第二节早就写了 6 轨，代码却只认 `menu`/`map`/`battle` 三条 ——
> **文档超前于代码**。本批把差的三轨接上，并且处理掉「升级轨没到位时切过去反而更差」这个坑。

### 接了什么

| 场景 | 轨 | 接入点 |
|---|---|---|
| Boss 战（含带小怪混编） | `battle_boss` | `30_engine.js` `startBattle()` |
| 精英战（含带小怪混编） | `battle_elite` | 同上 |
| 商店 / 营地 / 随机事件 | `shop` | `50_ui.js` `showShop` / `showCampfire` / `showUnknown` |
| 读档续战 | 按敌人现判 | `40_flow.js`（原来写死 `'battle'`） |

判定收口在一个纯函数 `battleBgmFor(enemies)`（Boss > 精英 > 普通），开局与读档共用。

### 关键坑：升级轨必须能退回基础轨

Boss 房切 `battle_boss` 而素材没交付，原逻辑会：`tryNext` 逐个扩展名探测 → 全 miss →
`startSynthBGM('battle_boss')` —— 而合成器**只对 `'battle'` 叠鼓** →
**Boss 房反而比普通战少了音乐**。即「升级轨没到位时，切过去是净亏损」。

修法是给三条升级轨各配一条基础轨，且**两条路径都覆盖**：

```
battle_elite → battle ｜ battle_boss → battle ｜ shop → map
```

- **打包产物**（`打包.py` 注入了 `ASSET_MAP`，它是权威清单）→ `bgmTrackFor()` 同步查表，
  查不到当场退回，**零空转**（不会白建 4 个 Audio 去撞 404）
- **开发期** `file://` 双击（`ASSET_MAP=null`，无法预知磁盘上有什么）→ 返回原轨交给
  `tryNext` 探测，探测耗尽后由 `startBGM` **内部**兜底退回基础轨
- 兜底写在 `startBGM` 内部而不是加第二参数：这样 `60_boot.js` 里声音开关重开的
  `startBGM(CUR_BGM)` 等**所有直接调用点自动获得回退能力**，不需要每个调用点都记得传参

`CUR_BGM` 存的仍是**逻辑轨**（设置页/存档看到的是「该在哪首曲子」）——
**素材到货后不用改任何调用点**，同名文件丢进 `素材/music/` 即自动切回升级轨。

### 顺手修：判定必须建敌人在后

原 `startBattle` 是 `setBGM('battle')` 写在 `G.enemies = keys.map(...)` 的**上一行**，
那一刻 `e.boss` / `e.elite` 都还没生成 —— 判定放前面永远判不出来。故本批调序。

### 验证

冒烟 **738 → 767 全绿**（+29）。覆盖：回退表自洽、`battleBgmFor` 四类输入、
打包期同步回退（含扩展名不挑）、**打桩 `startBGM` 验 `setBGM` 只请求一次且记逻辑轨**、
端到端开普通/精英/Boss/混编战各请求正确的轨（敌人 key 从 `ENEMIES` 现挑、不写死，
配前置断言）、`tryNext` 探测耗尽的兜底（临时换 Audio 桩 + 同步 setTimeout，
真正跑到 `idx>=exts.length` 分支，并断言升级轨名**一次都没进合成器**）。

### 浏览器复核清单（VM 无真 WebAudio，只能目视）

1. 进普通战听到原战斗曲；进 Boss 房（9 个 Boss 任一）**若没交付 `bgm_battle_boss.*`，应仍是战斗曲**
   —— 不能变成安静或另一套合成音
2. 丢一个 `素材/music/bgm_battle_boss.mp3` 进去 → 重进 Boss 房应换成它（不用改代码）
3. 精英战同理（`bgm_battle_elite.*`）
4. 进商店/营地/随机事件应换成地图轨那首（`bgm_shop.*` 交付后换成新曲）
5. 声音开关关掉再打开 → 应恢复到**当前场景该有的**那条轨（不是永远回普通战）
6. 存档后重进（读档续战）→ 若存的是 Boss 房，音乐应是 Boss 轨

---

"""

A_LOG = "## v0.61.30 文档补 · 素材清单 §1.6「按文件平铺交付单」+ .gitignore 修正（2026-09-21）\n"
N_LOG = LOG_ENTRY + A_LOG

EDITS = [
    (AUD, A_AUD1, N_AUD1),
    (AUD, A_AUD2, N_AUD2),
    (AUD, A_AUD3, N_AUD3),
    (ENG, A_ENG, N_ENG),
    (FLOW, A_FLOW, N_FLOW),
    (UI, A_UI1, N_UI1),
    (UI, A_UI2, N_UI2),
    (UI, A_UI3, N_UI3),
    (VDIST, A_VD, N_VD),
    (HTML, A_V1, N_V1),
    (HTML, A_V2, N_V2),
    (BOOT, A_V3, N_V3),
    (RUNNER, A_SM, N_SM),
    (LOG, A_LOG, N_LOG),
]


def main():
    # 幂等：已落地就跳过（版本号是最省事的探针）
    if 'v0.61.31' in io.open(HTML, encoding='utf-8').read():
        print('SKIP 已改过')
        return 0
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
    print('OK 共落地 %d 处' % len(EDITS))
    return 0


if __name__ == '__main__':
    sys.exit(main())