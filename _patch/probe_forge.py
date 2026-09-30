# -*- coding: utf-8 -*-
"""v0.75.0 锻造页（forge-scene）的验收矩阵：**8 个横屏视口**。

用户口径：「锻造的界面太狭窄 建议改成 6列的宽度」「六列就是 每两列展示一种卡牌
左边是初始状态右边是升级状态中间有个箭头来指示升级」，补充「桌面端保持六列，
窄屏的时候保持四列，需要将锻造的界面做宽来」，本批再追加「844×390 也做成 6 列，要求美观」
⇒ 四列那档的断点压到 700px 以下，矩阵里**只剩 640×360** 落到四列。

这里验的**不是「规则文本在不在文件里」**（那是 verify_dist 的子串闸干的活），
而是**规则有没有活过 CSS 解析、有没有真的作用到这些元素上** —— CSS 是本仓的命门：
规则被解析器丢弃时，grep 得到、子串闸全绿，而页面默默退化成 flex 单列。

判据（每条对着一种真会发生的错法，规格写在本文件的 SPEC 里，**不由驱动现算**）：
  1. `#overlay` 挂着 forge-scene（错法：调用点漏传第三实参 ⇒ 整页仍是 620px 窄版）。
  2. `.reward-cards` 的 display 是 grid（退回 flex ⇒ 第 3 条必然跟着红）。
  3. gridTemplateColumns 的**轨道数** = 3（六列）/ 2（640×360 的四列）。
     这一栏是「六列」这句承诺唯一的证据 —— 数卡牌张数不行，`.forge-pair` 是**一组**。
  4. 一组的宽 = 卡宽×2 + 箭头槽 40（9 + 22 + 9）。卡宽 132/104 由既有档位决定。
  5. `#overlayWrap` 的宽 ≈ 视口宽（错法：基档 max-width:620 没放开 ⇒ 三组 932px 折行）。
  6. `.panel` 的 background-color **不是**透明的（本批明确保留纯色底，与 pick-scene 相反）。
  7. 右卡描述的 computed color **≠** 左卡（错法：只加 `.upgrade-preview` 类而不写那条
     高特异度规则 ⇒ `.card .cdesc`(0,2,0) 压过 `.upgrade-preview`(0,1,0)，红色不生效，
     而 grep 与子串闸全绿）。同时 margin-top / border-top 必须是 0（中和掉卡内红字那套盒模型）。
  8. 每行的组数 = 轨道数（错法：grid 与 max-content 打架、或有别处的 flex 基线把它挤掉）。

⚠️ 驱动走**真实代码路径** showForgePicker('camp')，不手抄 HTML（漂移会让夹具量一个不存在的界面）。
⚠️ `--direct` 式顶层文档（驱动拼进 原型.html 的副本），不套 iframe。
⚠️ `--direct` 下视口 ≠ `--window-size`：new headless 恒定少 22px 宽、98px 高，这里反补。
⚠️ 每个视口只起一次 Chrome；每次必须换一个全新的 `--user-data-dir`。

用法：`python _patch/probe_forge.py`   退出码 = bad 条数（0 = 全绿）
可选：`--budget=N`、`--only=1920x1080,1280x720`、`--deck=N`
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
DECK = 9                      # 牌组补到 9 张：够铺 3 行三列，也够把六列压到边界

# 横屏验收矩阵，**永远不含 430x932**（已成既定前提）。
VIEWPORTS = [(1920, 1080), (1440, 900), (1366, 768), (1280, 720),
             (1024, 768), (960, 540), (844, 390), (640, 360)]

# 规格表：视口 → (卡宽, 轨道数, 组宽, 每行组数)
#   卡宽 132 = 基档（`.card{width:132px}`）；104 = `max-height:560px` 档（`.reward-cards .card{width:104px}`）。
#   组宽 = 卡宽×2 + 40（`.forge-pair{gap:9px}` ×2 + 内联 svg 宽 22）。这两个数**写死**在这里，
#   不是从驱动读回来的 —— 让被测代码自己出题的话，它退化成一列也照样全绿。
SPEC = {
    (1920, 1080): (132, 3, 304, 3),
    (1440, 900):  (132, 3, 304, 3),
    (1366, 768):  (132, 3, 304, 3),
    (1280, 720):  (132, 3, 304, 3),
    (1024, 768):  (132, 3, 304, 3),
    (960, 540):   (104, 3, 248, 3),
    (844, 390):   (104, 3, 248, 3),   # ← 本批追加：这一档也要六列
    (640, 360):   (104, 2, 248, 2),   # ← 唯一落到四列的一档
}

TRANSPARENT = ('rgba(0, 0, 0, 0)', 'transparent')

BUDGET = 30000


def launch(w, h, tmpdir, deck):
    url = 'file:///' + SHOT.replace('\\', '/') + '?forge=1&deck=%d' % deck
    return [CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars',
            '--allow-file-access-from-files',
            '--window-size=%d,%d' % (w + 22, h + 98),
            '--dump-dom', '--virtual-time-budget=%d' % BUDGET,
            # ⚠️ **每次都开一个全新的 user-data-dir**，不要删（见 _patch/probe_evtmtx.py）。
            '--user-data-dir=' + tmpdir,
            '--no-first-run', '--no-default-browser-check',
            '--disable-extensions', '--disable-background-networking',
            url]


def run_one(w, h, deck):
    tmpdir = tempfile.mkdtemp(prefix='forge_')
    try:
        r = subprocess.run(launch(w, h, tmpdir, deck), capture_output=True, text=True,
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


def num(s):
    """从 '282px' / '282' 里取整数；取不到返回 None。"""
    m = re.match(r'\s*(-?\d+)', s or '')
    return int(m.group(1)) if m else None


def main():
    global BUDGET, DECK
    vps = VIEWPORTS
    for a in sys.argv[1:]:
        if a.startswith('--budget='):
            BUDGET = int(a.split('=', 1)[1])
        elif a.startswith('--deck='):
            DECK = int(a.split('=', 1)[1])
        elif a.startswith('--only='):
            want = set(a.split('=', 1)[1].split(','))
            vps = [v for v in VIEWPORTS if '%dx%d' % v in want]
    src = io.open(os.path.join(ROOT, '原型.html'), encoding='utf-8').read()
    tag = '<script src="%s"></script>' % DRV
    if tag not in src:
        src = src.replace('</body>', tag + '\n</body>')
    io.open(SHOT, 'w', encoding='utf-8').write(src)

    bad = 0
    total = 0
    for (w, h) in vps:
        want_card, want_tracks, want_pair, want_per_row = SPEC[(w, h)]
        print('=' * 74)
        print('%dx%d  （规格：卡宽 %d · 轨道 %d · 组宽 %d · 每行 %d 组）'
              % (w, h, want_card, want_tracks, want_pair, want_per_row))
        body, r = run_one(w, h, DECK)
        if not body:
            print('  ✗ 没读到 #__dbg —— 页面没跑起来，或驱动抛在了 emit() 之前')
            raw_dump(r)
            bad += 1
            continue
        lines = body.split('\n')
        head = {}
        for ln in lines:
            if '#' in ln and '=' in ln:
                head.setdefault('raw', ln)
                break
        # ---- 逐条断言 ----
        total += 1
        if 'forge-scene' not in (lines[0] if lines else ''):
            print('  ✗ #overlay 没有挂 forge-scene（调用点漏传第三实参？）\n      %s'
                  % (lines[0] if lines else '(空)'))
            bad += 1
        else:
            print('  ✓ %s' % lines[0].strip())

        def find(pat):
            for ln in lines:
                if pat in ln:
                    return ln
            return ''

        # 2/3 轨道
        row_rc = find('reward-cards display=')
        m = re.search(r'display=(\S+)\s+gridTemplateColumns=(.+?)\s+⇒ 轨道数 (\d+)', row_rc)
        total += 2
        if not m:
            print('  ✗ 读不到 .reward-cards 那一行：%s' % (row_rc or '(缺)'))
            bad += 2
        else:
            disp, tracks, got_tracks = m.group(1), m.group(2).strip(), int(m.group(3))
            if disp != 'grid':
                print('  ✗ .reward-cards 的 display = %s（期望 grid —— 规则可能被解析器丢弃）' % disp)
                bad += 1
            if got_tracks != want_tracks:
                print('  ✗ 轨道数 = %d（期望 %d）tracks=%s' % (got_tracks, want_tracks, tracks))
                bad += 1
            else:
                print('  ✓ display=grid · 轨道 %d（%s）' % (got_tracks, tracks))

        # 4 组宽
        row_pair = find('第 1 组')
        m = re.search(r'内含卡 (\d+) 张\s+左卡宽 (\d+)', row_pair)
        total += 3
        if not m:
            print('  ✗ 读不到第 1 组那一行：%s' % (row_pair or '(缺)'))
            bad += 3
        else:
            nfaces, cardw = int(m.group(1)), int(m.group(2))
            mp = re.search(r'第 1 组\s+(\d+)x(\d+)', row_pair)
            pairw = int(mp.group(1)) if mp else -1
            if nfaces != 2:
                print('  ✗ 第 1 组不是 2 张卡（拿到 %d）—— 对照不成立' % nfaces)
                bad += 1
            if cardw != want_card:
                print('  ✗ 卡宽 = %d（期望 %d）—— 本项不该改任何卡宽' % (cardw, want_card))
                bad += 1
            if abs(pairw - want_pair) > 2:
                print('  ✗ 组宽 = %d（期望 %d±2）—— 卡被挤扁或箭头槽不对' % (pairw, want_pair))
                bad += 1
            else:
                print('  ✓ 一组 2 张卡 · 卡宽 %d · 组宽 %d' % (cardw, pairw))

        # 5 #overlayWrap 宽度
        row_wrap = find('#overlayWrap width=')
        m = re.search(r'width=(\d+)（视口 (\d+)）\s+computed max-width=(\S+)', row_wrap)
        total += 3
        if not m:
            print('  ✗ 读不到 #overlayWrap 那一行：%s' % (row_wrap or '(缺)'))
            bad += 3
        else:
            ww, iw, mw = int(m.group(1)), int(m.group(2)), m.group(3)
            if iw != w:
                print('  ✗ 实际视口 = %d（期望 %d）—— --direct 的反补算错了' % (iw, w))
                bad += 1
            if mw != 'none':
                print('  ✗ #overlayWrap 的 computed max-width = %s（期望 none —— 没放开就装不下六列）' % mw)
                bad += 1
            if abs(ww - w) > 2:
                print('  ✗ #overlayWrap 宽 = %d（期望 ≈ 视口宽 %d）' % (ww, w))
                bad += 1
            else:
                print('  ✓ #overlayWrap 宽 %d ≈ 视口 %d · max-width=%s' % (ww, iw, mw))

        # 6 .panel 底色
        # ⚠️ `rgb(34, 33, 28)` **自带空格** ⇒ 分隔符不能写成单个 \s+，也不能用 [^ ]+ 取色
        #    （那样只拿到 `rgb(34,`）。驱动里各段之间是**两个**空格，按 \s{2,} 切。
        row_panel = find('.panel  ')
        m = re.search(r'background-color=(.+?)\s{2,}内部溢出', row_panel)
        total += 1
        if not m:
            print('  ✗ 读不到 .panel 那一行：%s' % (row_panel or '(缺)'))
            bad += 1
        elif m.group(1) in TRANSPARENT:
            print('  ✗ .panel 的 background-color = %s（本批明确**保留纯色底**，与 pick-scene 相反）'
                  % m.group(1))
            bad += 1
        else:
            print('  ✓ .panel 保留纯色底 %s' % m.group(1))

        # 7 左/右描述色
        row_l = find('左描述类=')
        row_r = find('右描述类=')
        total += 4
        ml = re.search(r'左描述类="([^"]*)"\s+色=(.+?)\s*$', row_l)
        mr = re.search(r'右描述类="([^"]*)"\s+色=(.+?)\s{2,}字重=(\S+)\s{2,}margin-top=(\S+)\s{2,}border-top=(\S+)', row_r)
        if not ml or not mr:
            print('  ✗ 读不到左右描述那两行：\n      %s\n      %s' % (row_l, row_r))
            bad += 4
        else:
            if 'upgrade-preview' not in mr.group(1):
                print('  ✗ 右描述没有 upgrade-preview 类（="%s"）—— 冒烟的子串闸要的正是它' % mr.group(1))
                bad += 1
            if 'upgrade-preview' in ml.group(1):
                print('  ✗ 左描述也带了 upgrade-preview（="%s"）—— 左侧是「当前」，不该有' % ml.group(1))
                bad += 1
            if ml.group(2) == mr.group(2):
                print('  ✗ 左右描述同色（%s）—— 红色没生效：`.card .cdesc` 压过了 `.upgrade-preview`'
                      % ml.group(2))
                bad += 1
            else:
                print('  ✓ 左描述 %s ≠ 右描述 %s（红色 = 升级后的效果）' % (ml.group(2), mr.group(2)))
            if num(mr.group(4)) != 0 or float(mr.group(5).replace('px', '') or 0) != 0:
                print('  ✗ 右描述的 margin-top=%s / border-top=%s（期望都归零 —— 卡内红字那套盒模型没中和掉）'
                      % (mr.group(4), mr.group(5)))
                bad += 1
            else:
                print('  ✓ 右描述盒模型已中和（margin-top=%s border-top=%s）' % (mr.group(4), mr.group(5)))

        # 8 每行组数
        row_rows = find('组-行数')
        m = re.search(r'组-行数 \d+（每行 ([\d/]+)）', row_rows)
        total += 1
        if not m:
            print('  ✗ 读不到组-行数那一行：%s' % (row_rows or '(缺)'))
            bad += 1
        else:
            per = [int(x) for x in m.group(1).split('/')]
            if not per or per[0] != want_per_row:
                print('  ✗ 首行 %d 组（期望 %d）—— 每行 %s' % (per[0] if per else 0, want_per_row, m.group(1)))
                bad += 1
            else:
                print('  ✓ 首行 %d 组（每行 %s）' % (per[0], m.group(1)))
            # 每组一行都应等于轨道数（末行可以少）
            extra = [x for x in per[:-1] if x != want_tracks]
            total += 1
            if extra:
                print('  ✗ 有非末行没排满 %d 组：每行 %s' % (want_tracks, m.group(1)))
                bad += 1

        # 箭头
        row_arrow = find('.forge-arrow')
        total += 1
        if 'svg=有' not in row_arrow:
            print('  ✗ 箭头不对：%s' % (row_arrow or '(缺)'))
            bad += 1
        else:
            print('  ✓ %s' % row_arrow.strip())

    print('=' * 74)
    print('八视口锻造页：%d 项断言，bad=%d' % (total, bad))
    if bad == 0:
        print('全部通过 ✓')
    return bad


if __name__ == '__main__':
    sys.exit(main())