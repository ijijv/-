# -*- coding: utf-8 -*-
"""牌堆页（v0.76.0 的 pile-scene）八视口夹具 —— `probe_forge.py` 的姊妹件。

为什么非有它不可：**这一项没有任何别的东西守着。**
  - `_drvpile.js` 量的是**战斗页上那两个立牌**的盒模型（本批只加了 cursor，零漂移）；
  - `verify_dist.py` 那组 `pile-scene` 闸只证明**源码里有那些规则文本**；
  - 而 CSS 是**静默失败**的：规则文本在文件里、grep 得到、子串闸绿，浏览器却可能整条丢弃
    （注释被正文里的结束符提前截断 ⇒ 后半句变非法选择器前奏 ⇒ 吞掉紧随其后的规则）。
    本仓 `.exhaust-tag` 就这么被吞过。
⇒ 唯一能证明「这套排列真的成立」的，是让真浏览器读 `getComputedStyle`。

用法：
    python _patch/probe_pile.py                 # 八视口 × (抽牌堆 + 弃牌堆)
    python _patch/probe_pile.py --only=640x360  # 只跑一档
    python _patch/probe_pile.py --kind=discard  # 只跑一个堆

⚠️ 视口 ≠ `--window-size`：new headless 恒定少 22px 宽、98px 高（1302,818 → innerW=1280
   innerH=720），照 `probe_forge.py` 反补。每个视口**都开一个全新的 user-data-dir**
   （见 `_patch/probe_evtmtx.py` 的注释：复用会被上一次的缓存/单例搅出假读数）。
"""
import html
import io
import os
import re
import shutil
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATCH = os.path.join(ROOT, '_patch')
sys.path.insert(0, PATCH)
from shot import CHROME  # noqa: E402  —— chrome.exe 的路径只维护在 shot.py 一处

DRV = '_patch/_drvclip.js'
SHOT = os.path.join(ROOT, '_shot.html')

# 横屏验收矩阵，**永远不含 430x932**（已成既定前提）。
VIEWPORTS = [(1920, 1080), (1440, 900), (1366, 768), (1280, 720),
             (1024, 768), (960, 540), (844, 390), (640, 360)]

# 规格表：视口 → 轨道数
#   `max-width:700px` 是唯一改排列的断点（844 > 700 ⇒ 仍是 3 轨；640 ≤ 700 ⇒ 2 轨）。
#   ⚠️ 这两个数**写死**在这里，不是从驱动读回来的 —— 让被测代码自己出题的话，
#      它退化成一列也照样全绿（forge 那份 SPEC 的注释写着同一条）。
#   ⚠️ **卡宽不在本表的判据里**：矮屏档（高 ≤560）的卡宽 104 来自一条**既有的全局**规则
#      `.reward-cards .card{width:104px}`（原型.html:1726，v0.71.0 选牌小窗那批留的），
#      pile-scene 是与它**共用**的 ⇒ 本项一个字都不用写，写一条场景限定的 104 反而会
#      变成「同一件事有两处真相」。实测 960×540 / 844×390 / 640×360 都是 104×150，
#      与 forge 那档完全一致。
SPEC = {
    (1920, 1080): 3,
    (1440, 900):  3,
    (1366, 768):  3,
    (1280, 720):  3,
    (1024, 768):  3,
    (960, 540):   3,   # 高 540 落进 max-height:560px（只改内边距，不改轨道）
    (844, 390):   3,   # 用户点名的一档：844 宽 > 700 ⇒ 必须还是 3 轨
    (640, 360):   2,   # 唯一落到 2 轨的一档
}

# 高 ≥ 720 的档：内容不该溢出（矮屏档溢出是**预期**的，靠 .panel 自己滚，
# 归 §五「美观」那一档管，不在这里当失败）。
TALL = 720

TRANSPARENT = ('rgba(0, 0, 0, 0)', 'transparent')
# `.panel` 必须还是个滚动容器：矮屏上卡多了一定溢出，`overflow-y:hidden` 会让
# 下面几行的卡**拿不到**（不是难看，是丢内容）。
SCROLLABLE = ('auto', 'scroll', 'overlay')

BUDGET = 30000


def launch(w, h, tmpdir, kind):
    url = 'file:///' + SHOT.replace('\\', '/') + '?pile=%s&n=8' % kind
    return [CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars',
            '--allow-file-access-from-files',
            '--window-size=%d,%d' % (w + 22, h + 98),
            '--dump-dom', '--virtual-time-budget=%d' % BUDGET,
            '--user-data-dir=' + tmpdir,
            '--no-first-run', '--no-default-browser-check',
            '--disable-extensions', '--disable-background-networking',
            url]


def run_one(w, h, kind):
    tmpdir = tempfile.mkdtemp(prefix='pile_')
    try:
        r = subprocess.run(launch(w, h, tmpdir, kind), capture_output=True, text=True,
                           encoding='utf-8', errors='replace')
        m = re.search(r'<div id="__dbg"[^>]*>(.*?)</div>', r.stdout or '', re.S)
        return (html.unescape(m.group(1)) if m else ''), r
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


def raw_dump(r):
    out = (r.stdout or '')
    print('    stdout %d 字节 / stderr %d 字节；有 __dbg=%s'
          % (len(out), len(r.stderr or ''), '__dbg' in out))
    print('    stderr 头：%s' % (r.stderr or '(空)')[:400].replace('\n', ' | '))


def main():
    global BUDGET
    vps = VIEWPORTS
    kinds = ['draw', 'discard']
    for a in sys.argv[1:]:
        if a.startswith('--budget='):
            BUDGET = int(a.split('=', 1)[1])
        elif a.startswith('--only='):
            want = set(a.split('=', 1)[1].split(','))
            vps = [v for v in VIEWPORTS if '%dx%d' % v in want]
        elif a.startswith('--kind='):
            kinds = [a.split('=', 1)[1]]
    # 驱动脚本拼进 原型.html 的副本 —— 与 probe_forge.py 同一手法（_shot.html 在仓库根，
    # 因为 js/ 与 素材/ 都是相对路径，放 _patch/ 里会全 404）。
    src = io.open(os.path.join(ROOT, '原型.html'), encoding='utf-8').read()
    tag = '<script src="%s"></script>' % DRV
    if tag not in src:
        src = src.replace('</body>', tag + '\n</body>')
    io.open(SHOT, 'w', encoding='utf-8').write(src)

    bad = 0
    total = 0
    for (w, h) in vps:
        want_tracks = SPEC[(w, h)]
        for kind in kinds:
            print('=' * 74)
            print('%dx%d · %s  （规格：轨道 %d）' % (w, h, kind, want_tracks))
            body, r = run_one(w, h, kind)
            if not body:
                print('  ✗ 没读到 #__dbg —— 页面没跑起来，或驱动抛在了 emit() 之前')
                raw_dump(r)
                bad += 1
                continue
            lines = body.split('\n')

            def find(pat):
                for ln in lines:
                    if pat in ln:
                        return ln
                return ''

            # 1 #overlay 挂了 pile-scene
            row_ov = find('牌堆页 kind=')
            total += 1
            if 'pile-scene' not in row_ov:
                print('  ✗ #overlay 没有挂 pile-scene（showPile 漏传第三实参？）\n      %s'
                      % (row_ov or '(缺)'))
                bad += 1
            else:
                print('  ✓ %s' % row_ov.strip())

            # 2/3 排列：display=grid + 轨道数
            row_rc = find('.reward-cards display=')
            m = re.search(r'display=(\S+)\s+gridTemplateColumns=(.+?)\s+⇒ 轨道数 (\d+)', row_rc)
            total += 2
            if not m:
                print('  ✗ 读不到 .reward-cards 那一行：%s' % (row_rc or '(缺)'))
                bad += 2
            else:
                disp, tracks, got = m.group(1), m.group(2).strip(), int(m.group(3))
                if disp != 'grid':
                    print('  ✗ .reward-cards 的 display = %s（期望 grid —— 分组规则可能被解析器丢弃）'
                          % disp)
                    bad += 1
                if got != want_tracks:
                    print('  ✗ 轨道数 = %d（期望 %d）tracks=%s' % (got, want_tracks, tracks))
                    bad += 1
                else:
                    print('  ✓ display=grid · 轨道 %d（%s）' % (got, tracks))

            # 4/5 #overlayWrap 放开 + 铺满
            row_wrap = find('#overlayWrap width=')
            m = re.search(r'width=(\d+)（视口 (\d+)）\s+computed max-width=(\S+)', row_wrap)
            total += 3
            if not m:
                print('  ✗ 读不到 #overlayWrap 那一行：%s' % (row_wrap or '(缺)'))
                bad += 3
            else:
                ww, iw, mw = int(m.group(1)), int(m.group(2)), m.group(3)
                if iw != w:
                    print('  ✗ 实际视口 = %d（期望 %d）—— 反补算错了' % (iw, w))
                    bad += 1
                if mw != 'none':
                    print('  ✗ #overlayWrap 的 computed max-width = %s（期望 none —— 没放开就装不下三张）'
                          % mw)
                    bad += 1
                if abs(ww - w) > 2:
                    print('  ✗ #overlayWrap 宽 = %d（期望 ≈ 视口宽 %d）' % (ww, w))
                    bad += 1
                else:
                    print('  ✓ #overlayWrap 宽 %d ≈ 视口 %d · max-width=%s' % (ww, iw, mw))

            # 6 .panel 底色 + 还是滚动容器 + 高屏不溢出
            row_panel = find('.panel  ')
            m = re.search(r'background-color=(.+?)\s{2,}overflow-y=(\S+)\s{2,}内部溢出=(-?\d+)', row_panel)
            total += 2
            if not m:
                print('  ✗ 读不到 .panel 那一行：%s' % (row_panel or '(缺)'))
                bad += 2
            else:
                bg, oy, over = m.group(1), m.group(2), int(m.group(3))
                if bg in TRANSPARENT:
                    print('  ✗ .panel 的 background-color = %s（与 forge-scene 同一条约定：保留纯色底）'
                          % bg)
                    bad += 1
                if oy not in SCROLLABLE:
                    print('  ✗ .panel 的 overflow-y = %s（期望 auto —— 矮屏上溢出的卡会**拿不到**）' % oy)
                    bad += 1
                if over > 0 and h < TALL:
                    print('  · .panel 底色 %s · overflow-y=%s · 溢出 %d（矮屏预期溢出，靠滚动看全）'
                          % (bg, oy, over))
                elif over > 0:
                    print('  ✗ .panel 内部溢出 %d（高 %d 的高屏档不该溢出）' % (over, h))
                    bad += 1
                else:
                    print('  ✓ .panel 底色 %s · overflow-y=%s · 溢出 0' % (bg, oy))

            # 7 卡数与牌堆数一致
            row_cards = find('卡 ')
            m = re.search(r'卡 (\d+) 张（该堆 (\d+) 张）(?:\s+首卡 (\d+)x(\d+))?', row_cards)
            total += 1
            if not m:
                print('  ✗ 读不到卡数那一行：%s' % (row_cards or '(缺)'))
                bad += 1
            else:
                nc, npile = int(m.group(1)), int(m.group(2))
                if nc != npile or nc == 0:
                    print('  ✗ 面板里 %d 张卡，该堆 %d 张 —— 不是「把这一堆摊开」' % (nc, npile))
                    bad += 1
                else:
                    print('  ✓ %s' % row_cards.strip())

            # 8 forge 残留必须四件全 0
            row_forge = find('forge 残留')
            m = re.search(r'\.forge-pair=(\d+)\s+\.upgrade-preview=(\d+)\s+\.forge-arrow=(\d+)\s+'
                          r'\.card\[onclick\]=(\d+)', row_forge)
            total += 1
            if not m:
                print('  ✗ 读不到 forge 残留那一行：%s' % (row_forge or '(缺)'))
                bad += 1
            elif any(int(m.group(i)) for i in (1, 2, 3, 4)):
                print('  ✗ 牌堆页混进了锻造页的东西：%s\n'
                      '      （把 forge-scene 那三条容器规则复制第二份时带过来的？）' % row_forge.strip())
                bad += 1
            else:
                print('  ✓ %s' % row_forge.strip())

            # 9 真牌序没被动过（`.slice()` 那一层的回归闸）
            #   ⚠️ 驱动里带 `⇒` 的行**不止一条**（`.reward-cards … ⇒ 轨道数 N` 也带），
            #      按 `⇒` 找会捞到轨道那条 ⇒ 判据恒假。按**判词本身**找。
            row_verdict = ''
            for ln in lines:
                if '未被动过' in ln or '被改写了' in ln:
                    row_verdict = ln
                    break
            row_before = find('真牌序 ') if not row_verdict else row_verdict
            total += 1
            if '未被动过' not in row_verdict:
                print('  ✗ 看一眼牌堆就把真牌序改了（shuffle 就地打乱，漏了 .slice()）\n'
                      '      %s' % (row_verdict or '(缺 真牌序 那一行)'))
                bad += 1
            else:
                print('  ✓ %s' % row_verdict.strip())
                print('      %s' % find('前=').strip())

    print('=' * 74)
    print('牌堆页 %d 视口 × %s：%d 项断言，bad=%d'
          % (len(vps), '+'.join(kinds), total, bad))
    if bad == 0:
        print('全部通过 ✓')
    return bad


if __name__ == '__main__':
    sys.exit(main())