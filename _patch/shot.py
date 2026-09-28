# -*- coding: utf-8 -*-
"""headless 截图夹具 —— 给「冒烟测不到的 CSS / 几何 / canvas」补一只眼睛。

为什么需要它：`smoke_host.js` 的 DOM 桩是空操作（classList 无效、offsetHeight 恒 0、
getBoundingClientRect 恒 10×10），它只能证明「函数没抛异常」，证明不了「长得对不对」。
而地图/卡牌这类改动，**看错一眼比测错十条断言还贵**（v0.62.0 用户报的
「地图贴图在底层、还有半透明的战斗场景」就是冒烟全绿、肉眼一看就废的典型）。

用法：
    python _patch/shot.py                        # 默认 430 / 360 / 900 三档，出 _patch/_shot_map.png
    python _patch/shot.py --hero wuseng          # 换角色（_drv.js 的 pickHero）
    python _patch/shot.py --widths 430           # 只出一档
    python _patch/shot.py --dump                 # 不开图，只把角标文字打出来（等价 --dump-dom）
    python _patch/shot.py --direct --widths 1280 --h 720 --drv _patch/_drvmenu2.js --dump
                                                 # v0.66.0 横屏：不套 iframe，--dump 才拿得到角标

它做三件事：
  1. 把 `_drv.js` 拼进 `原型.html` 的副本 → `_shot.html`（放在**仓库根**，因为 js/ 与 素材/
     都是相对路径，放 _patch/ 里会全 404）；
  2. 生成 `_frame.html`：用 **iframe 包出真正的窄布局视口**。
     ⚠️ 这一步是踩出来的 —— Chrome for Windows 的 `--window-size` **有最小宽度**，
     传 430 实际得到 512 的布局（截出来是**裁切**不是窄布局）；`--force-device-scale-factor=2`
     也不改布局宽度（860 窗口仍得 838）。只有 iframe 能给出真的 430/360
     （判据：角标 `K vpW=430 bodyW=430 docW=430`）。
  3. 调 headless Chrome 截图。

⚠️ 两个已知夹具限制，**不是游戏 bug**，别照着改代码：
  - `--virtual-time-budget` 下「**后注册的 rAF 拿不到帧**」（解析期注册的有帧）。`showMap` 的
    `kick()` 是 setTimeout 之后才注册的 ⇒ 进场动画/连线在截图里停在初始态。`_drv.js` 尾部
    手工补了 `mapCamInit` + `setMapCam(tgt,false,0)` 把终态钉出来。
  - `--screenshot` **必须给绝对 Windows 路径**，相对路径会报「系统找不到指定的路径」。

v0.66.0 新增 `--direct`：**不套 iframe**，直接开 `_shot.html`。原因见 main() 里的注释 ——
简言之，`--dump-dom` **只序列化外层文档**，iframe 里的角标一个都拿不到（实测打出一片空）。
横屏 16:9 的档位（1280 / 1920）本来就 > Chrome 的 512 最小宽度，不需要 iframe 兜底。
"""
import io
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATCH = os.path.join(ROOT, '_patch')
CHROME = r'C:\Program Files\Google\Chrome\Application\chrome.exe'


def arg(name, default=None):
    a = sys.argv
    return a[a.index(name) + 1] if name in a else default


def build_shot(hero, clean, drv='_patch/_drv.js'):
    src = io.open(os.path.join(ROOT, '原型.html'), encoding='utf-8').read()
    # 驱动脚本放在所有游戏脚本之后：它一开头就悬停 confirmNewGame/pickHero，需要那些函数已存在。
    tag = '<script src="%s"></script>' % drv
    if tag not in src:
        src = src.replace('</body>', tag + '\n</body>')
    io.open(os.path.join(ROOT, '_shot.html'), 'w', encoding='utf-8').write(src)


def build_frame(widths, hero, clean, extra='', h=932):
    q = '?hero=%s%s%s' % (hero, '&clean=1' if clean else '', extra)
    # 不加 &clean 时角标会盖住顶部约 215px —— 只想看图时用 --clean。
    # h 默认 932（竖屏老基线）。v0.66.0 起目标形态是 16:9 横屏 ⇒ 用 --h 按 16:9 给
    # （1920×1080 / 1280×720 / 960×540 / 844×475 / 640×360）。
    cells = ''.join(
        '<iframe src="_shot.html%s" width="%d" height="%d"></iframe>' % (q, w, h) for w in widths)
    html = ('<!doctype html><meta charset="utf-8">'
            '<style>html,body{margin:0;background:#222;display:flex;gap:10px;padding:8px}'
            'iframe{border:1px solid #555;background:#000}</style>' + cells)
    io.open(os.path.join(ROOT, '_frame.html'), 'w', encoding='utf-8').write(html)


def main():
    widths = [int(w) for w in (arg('--widths', '430,360,900')).split(',')]
    hero = arg('--hero', 'tianshi')
    clean = '--clean' in sys.argv
    out = os.path.join(ROOT, arg('--out', r'_patch\_shot_map.png'))
    drv = arg('--drv', '_patch/_drv.js')      # v0.65.0：可换驱动（默认仍进战斗；主菜单用 _drvmenu2.js）
    h = int(arg('--h', '932'))                # v0.66.0：目标形态是 16:9 横屏 ⇒ 传 --h 按 16:9 给
    # --direct：**不套 iframe**，直接开 _shot.html。iframe 的唯一理由是绕开 Chrome
    # `--window-size` 的最小宽度（<512 会被抬到 512，截出来是**裁切**不是窄布局），
    # 代价是 `--dump-dom` **只看得到外层文档**，iframe 里的角标一个都拿不到
    # （v0.66.0 实测：`--dump` 打出一片空）。所以：要看数（--dump）就用 --direct；
    # 要窄屏看图就用 iframe。横屏 16:9 的档位（1280/1920）本来就 > 512，不必套 iframe。
    # ⚠️ --direct 下视口 ≠ --window-size：实测 new headless 恒定少 22px 宽、98px 高
    #    （1302,818 → innerW=1280 innerH=720）。这里反补，让 --widths/--h 就是真视口。
    direct = '--direct' in sys.argv
    build_shot(hero, clean, drv)
    if direct:
        # ⚠️ --direct 也要带上查询串（--clean / --q 全靠它），否则 _drvmenu2.js 的 q.get('fx')
        #    永远是 null —— 驱动里那些「点一下拍演出」的分支就静默不跑了。
        target = os.path.join(ROOT, '_shot.html') + '?hero=%s%s%s' % (
            hero, '&clean=1' if clean else '', arg('--q', ''))
        win_w, win_h = widths[0] + 22, h + 98
    else:
        build_frame(widths, hero, clean, arg('--q', ''), h)   # v0.65.0：附加查询串（如 --q &panel=1）
        target = os.path.join(ROOT, '_frame.html')
        win_w, win_h = sum(widths) + 10 * (len(widths) - 1) + 16, h + 40
    cmd = [CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars',
           '--allow-file-access-from-files',          # 否则 file:// 父页不许嵌 file:// iframe
           '--window-size=%d,%d' % (win_w, win_h)]
    if '--coarse' in sys.argv:
        # 让 headless Chrome 报**粗指针**（触摸设备）。默认 primaryPointerType=4(fine)，
        # 于是 `@media (pointer:coarse)` 在无头里恒假 —— 竖屏闸那条
        # `(orientation:portrait) and (pointer:coarse)` 就永远验不到。
        # Blink 的 PointerType：none=1 / coarse=2 / fine=4。
        cmd.append('--blink-settings=primaryPointerType=2,availablePointerTypes=2')
    if '--dump' in sys.argv:
        # ⚠️ 必须连 --virtual-time-budget 一起给：驱动普遍把量测推迟到 t≈700ms（躲开入场动画），
        #    只给 --dump-dom 的话 Chrome 在 load 之后立刻序列化，角标还是空的。
        cmd += ['--dump-dom', '--virtual-time-budget=8000']
    else:
        # --budget：定帧用。配驱动的 ?shatter / ?talis 分支，拍「演出进行到第几毫秒」。
        # 默认 12000（等所有入场动画落定）；拍中间帧就传 200 / 500 / 850 这种。
        cmd += ['--virtual-time-budget=' + arg('--budget', '12000'), '--screenshot=' + out]
    cmd.append('file:///' + target.replace('\\', '/'))
    r = subprocess.run(cmd, capture_output=True, text=True)
    if '--dump' in sys.argv:
        # 角标是一整块 **textContent**（内含换行）⇒ 先把 __dbg 那个 div 整块抠出来再解实体。
        # 按行 grep 首字母是行不通的：HTML 源码里换行虽然在，但前缀匹配经不起属性/编码变化，
        # 而且在 iframe 模式下外层文档里根本没有这块。
        import re as _re2
        m = _re2.search(r'<div id="__dbg"[^>]*>(.*?)</div>', r.stdout, _re2.S)
        if m:
            print(m.group(1).replace('&lt;', '<').replace('&gt;', '>')
                  .replace('&quot;', '"').replace('&amp;', '&'))
        else:
            print('(没找到 __dbg —— 驱动没跑起来，或用了 iframe（加 --direct）)\n'
                  + (r.stdout or r.stderr)[:400])
    else:
        # ⚠️ --screenshot 在 new headless 下抓的是**窗口**位图（尺寸 = --window-size），
        #    比真实视口大 22×98。左上角对齐且 1:1 ⇒ 直接裁掉右边/下边那两条死黑边。
        #    不裁的话评审图里混进一条黑边，看着像「背景没铺满」，v0.66.0 就被它误导过。
        if direct:
            try:
                from PIL import Image
                im = Image.open(out)
                if im.size != (widths[0], h):
                    im.crop((0, 0, widths[0], h)).save(out)
            except Exception as ex:
                print('   (裁边失败，保留原图：%s)' % ex)
        print('OK -> %s' % out)
        print('   %s' % (r.stdout or r.stderr).strip().splitlines()[-1:])


if __name__ == '__main__':
    main()