# -*- coding: utf-8 -*-
r"""
v0.61.31 修正 —— 把「探测耗尽退到哪条轨」抽成纯函数，并撤掉一条**验不了**的冒烟用例

【为什么要改】第一版 v0.61.31 的冒烟里有一条：
    「开发期探测全 miss → 退回基础轨 battle」
  它**永远不可能通过**，而且不是代码错，是这条断言本身无效 ——

  `_patch/smoke_runner.js` 开头（第 22~26 行）为了不让测试挂定时器/碰真 Audio，
  **把 startBGM / startSynthBGM / stopBGM / clearSynthBGM 一起换成了空函数 __sil**：
      try { startBGM = __sil; } catch (e) {}
  于是 startBGM 的真实函数体在冒烟沙箱里**不可达** —— 我传进去的 Audio 桩、
  同步 setTimeout、startSynthBGM 打桩全都白搭，只有 __sil 被调用，BGM_TRACK 永远是 null。
  实测证据：`String(startBGM)` → `"function () {}"`。

【怎么修】不跟宿主的设计对抗（静音是有道理的），而是把**决策**从不可达的函数体里抽出来：
     bgmFallbackFor(track) → 该退到哪条轨；null = 没有可退的上级
  startBGM 的探测耗尽分支改为调它，冒烟直接验这个纯函数。
  剩下 `if(__fb) return startBGM(__fb)` 那一行的调用**仍不可达**，如实写在更新日志里，
  不假装验过 —— 决策全在纯函数里，那一行只是转发。

  另加一条**跨路径一致性**断言：打包期 bgmTrackFor 的退回目标必须 == 开发期 bgmFallbackFor，
  否则「打包能退、开发退不了」两条路径行为分叉（这正是本批要防的坑）。

锚点唯一性各校验 count==1。
"""
import io
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..')
AUD = os.path.join(ROOT, 'js', '10_audio.js')
RUNNER = os.path.join(HERE, 'smoke_runner.js')
LOG = os.path.join(ROOT, '更新日志.md')

# ---------------------------------------------------------------- 1. 抽纯函数

A1 = """/* 从敌人列表判定该用哪条战斗轨：Boss > 精英 > 普通。
   入参是数组而非直接读 G —— 这样读档续战（40_flow.js）和开局（30_engine.js）能共用，
   也便于冒烟里直接喂假数据验证。 */
function battleBgmFor(enemies){
"""
N1 = """/* startBGM 逐扩展名探测全部失败后，该退到哪条基础轨；返回 null = 没有可退的上级（照原轨走合成器）。
   单独抽成纯函数是为了**可测**：冒烟宿主开头会把 startBGM 换成静音桩（见 smoke_runner.js 顶部），
   startBGM 的函数体在沙箱里不可达，这条决策只能直接验函数本身。 */
function bgmFallbackFor(track){
  const fb=BGM_FALLBACK[track];
  return (fb && fb!==track) ? fb : null;   // fb===track 时返回 null，否则 startBGM 会自我递归
}
/* 从敌人列表判定该用哪条战斗轨：Boss > 精英 > 普通。
   入参是数组而非直接读 G —— 这样读档续战（40_flow.js）和开局（30_engine.js）能共用，
   也便于冒烟里直接喂假数据验证。 */
function battleBgmFor(enemies){
"""

A2 = """    if(idx>=exts.length){
      /* v0.61.31：升级轨探测全 miss → 退回基础轨（否则 Boss 房比普通战还安静）。
         兜底查表放在 startBGM 内部而不是加第二参数：这样所有直接调用点
         （如 60_boot.js 声音开关重开时的 startBGM(CUR_BGM)）自动获得回退能力。 */
      const __fb=BGM_FALLBACK[track];
      if(__fb && __fb!==track) return startBGM(__fb);
      BGM=null; startSynthBGM(track); return;
    }
"""
N2 = """    if(idx>=exts.length){
      /* v0.61.31：升级轨探测全 miss → 退回基础轨（否则 Boss 房比普通战还安静）。
         兜底放在 startBGM 内部而不是加第二参数：这样所有直接调用点
         （如 60_boot.js 声音开关重开时的 startBGM(CUR_BGM)）自动获得回退能力。
         「退到哪条」的决策在 bgmFallbackFor 里（纯函数、冒烟可验），这一行只负责转发。 */
      const __fb=bgmFallbackFor(track);
      if(__fb) return startBGM(__fb);
      BGM=null; startSynthBGM(track); return;
    }
"""

# ---------------------------------------------------------------- 2. 撤掉无效用例，换成可验的

A3 = "    __ok('v0.61.31 前置：startBGM 可被打桩（否则本组行为断言无意义）', __stubOK);\n"
N3 = ("    __ok('v0.61.31 前置：startBGM 可被桩替换（冒烟里它本就被全局静音桩 __sil 换掉了，"
      "本组只验路由、不验真实播放）', __stubOK);\n")

A4 = """    /* 6. tryNext 探测耗尽的兜底（开发期 file:// 口径）：不能硬播合成版升级轨。
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
"""
N4 = """    /* 6. 开发期 file:// 口径（ASSET_MAP=null，无法预知磁盘上有什么）靠 tryNext 探测，
       探测耗尽后由 startBGM 退回基础轨。**这条分支在冒烟里验不了** —— runner 开头把
       startBGM / startSynthBGM / stopBGM 一起换成了静音桩 __sil（避免测试挂定时器、碰真 Audio），
       真实函数体在沙箱里不可达（实测 String(startBGM) === "function () {}"）。
       硬测只会得到一条恒假的断言，所以这里改成验**决策**：退到哪条轨由纯函数
       bgmFallbackFor 决定，它可验；`if(__fb) return startBGM(__fb)` 那行转发不可达，
       如实记在更新日志里，不假装验过。 */
    __ok('v0.61.31 bgmFallbackFor：三条升级轨 → 各自的基础轨',
      bgmFallbackFor('battle_elite') === 'battle' && bgmFallbackFor('battle_boss') === 'battle'
      && bgmFallbackFor('shop') === 'map');
    __ok('v0.61.31 bgmFallbackFor：基础轨返回 null（关键：否则 startBGM 会自我递归）',
      bgmFallbackFor('menu') === null && bgmFallbackFor('map') === null && bgmFallbackFor('battle') === null);
    __ok('v0.61.31 bgmFallbackFor：未知轨名返回 null（战斗中不抛错）', bgmFallbackFor('nope') === null);

    /* 跨路径一致性：打包期（bgmTrackFor 查 ASSET_MAP）与开发期（探测耗尽走 bgmFallbackFor）
       必须退到**同一条轨**，否则「打包能退、开发退不了」就是两条路径行为分叉。 */
    var __savC = ASSET_MAP;
    ASSET_MAP = {};   // 空清单 = 所有轨都查不到，等价于「全都没交付」
    var __fbList = ['battle_elite', 'battle_boss', 'shop'];
    var __diverged = __fbList.filter(function (t) { return bgmTrackFor(t) !== bgmFallbackFor(t); });
    ASSET_MAP = __savC;
    __ok('v0.61.31 两条路径退回目标一致（打包期 bgmTrackFor == 开发期 bgmFallbackFor）',
      __diverged.length === 0, '分歧的轨：' + JSON.stringify(__diverged));
"""

# ---------------------------------------------------------------- 3. 更新日志：改成如实描述

A5 = """冒烟 **738 → 767 全绿**（+29）。覆盖：回退表自洽、`battleBgmFor` 四类输入、
打包期同步回退（含扩展名不挑）、**打桩 `startBGM` 验 `setBGM` 只请求一次且记逻辑轨**、
端到端开普通/精英/Boss/混编战各请求正确的轨（敌人 key 从 `ENEMIES` 现挑、不写死，
配前置断言）、`tryNext` 探测耗尽的兜底（临时换 Audio 桩 + 同步 setTimeout，
真正跑到 `idx>=exts.length` 分支，并断言升级轨名**一次都没进合成器**）。
"""
N5 = """冒烟 **738 → 764 全绿**（+26）。覆盖：回退表自洽、`battleBgmFor` 四类输入、
打包期同步回退（含扩展名不挑）、**打桩 `startBGM` 验 `setBGM` 只请求一次且记逻辑轨**、
端到端开普通/精英/Boss/混编战各请求正确的轨（敌人 key 从 `ENEMIES` 现挑、不写死，
配前置断言）、`bgmFallbackFor` 的决策、以及**跨路径一致性**（打包期 `bgmTrackFor` 的
退回目标必须 == 开发期 `bgmFallbackFor`）。

> **一条没验到的，如实说明**：开发期「探测全部扩展名失败 → 退回基础轨」这条分支走的是
> `startBGM` 函数体内部，而 `_patch/smoke_runner.js` 开头为了不让测试挂定时器、碰真 Audio，
> 把 `startBGM` / `startSynthBGM` / `stopBGM` **一起换成了静音桩 `__sil`** ——
> 真实函数体在冒烟沙箱里不可达（`String(startBGM)` 就是 `"function () {}"`）。
> 第一版补丁在这里写了条断言，结果**恒假**，也暴露了「断言本身无效」而非代码有问题。
> 现在把「退到哪条轨」的决策抽成纯函数 `bgmFallbackFor` 来验，
> 剩下 `if(__fb) return startBGM(__fb)` 那一行**只做转发**、仍不可达 —— 没验过就是没验过。
> 因此浏览器复核清单第 1 条（Boss 房没素材时应仍是战斗曲）**必须真机目视**。
"""

EDITS = [(AUD, A1, N1), (AUD, A2, N2), (RUNNER, A3, N3), (RUNNER, A4, N4), (LOG, A5, N5)]


def main():
    if 'bgmFallbackFor' in io.open(AUD, encoding='utf-8').read():
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