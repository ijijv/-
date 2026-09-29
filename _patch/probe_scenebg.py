# -*- coding: utf-8 -*-
"""v0.74.0 六张整屏场景背景的验收矩阵：**8 个横屏视口 × (6 屏 + 1 控制组) = 56 个数据点**。

背景：v0.73.0 给八个事件房接了专用背景，做法是 `setBg` 挂 `body.evt-bg`、
CSS 据此把 `#overlay` 的常驻黑幕从 .88 放松到 .55（不放松的话任何深色场景图
铺上去只剩 12% 可见度，等于白铺）。本批把这套机制扩到六张一直躺在 `素材/bg/`
里、代码从未请求过的整屏图：商店 / 篝火 / 胜利 / 失败 / 选英雄 / 胜利奖励。

验的是五件事（每条都对应一个真实会静默失败的失败模式）：
  1. 六张图**真的加载出来**（naturalWidth>0）。只看 src 字符串证明不了 ——
     字符串永远等于你写进去的那个，404 了照样"对"。
  2. `#bg.src` 的 basename 是**该屏该有的那张**（由驱动拿生产的 assetURL/bgRel 现算，
     不在这里做字符串镜像 —— 本项目有过镜像漂掉的旧账）。
  3. `body.has-bg` 有（setBg 的 onerror 会摘掉它 ⇒ 这是 404 的第二条独立证据）。
  4. `body.evt-bg` 与 `body.at-menu` 的取值符合规格。**at-menu 这一列是本批的重点**：
     选英雄那一屏期望 `at-menu=Y` —— 那一刻 run 还没开始，setBg 若摘掉 at-menu，
     `#app` 会立刻显形，空骨架透在放松后的黑幕下（正是 v0.68.2 修掉的 bug）。
     同时 `ctl_act` 期望 `evt-bg=N` —— 幕背景在战局之内，黑幕必须留在 .88。
  5. `#overlay` 计算样式**正好**是 .55（整屏场景）或 .88（控制组），
     且摘掉开关后逐字节回落到基档 —— 可逆性是唯一能排除「碰巧命中别的规则」的做法。

⚠️ 走 `--direct` 式顶层文档（驱动拼进 原型.html 的副本），不套 iframe：
   `--dump-dom` 只序列化外层文档，iframe 里的 `#__out` 读不到（shot.py 文件头 v0.66.0 那条）。
⚠️ `--direct` 下视口 ≠ `--window-size`：new headless 恒定少 22px 宽、98px 高，这里反补。
⚠️ 每个视口只起一次 Chrome（驱动内部循环六屏）⇒ 8 次进程而不是 56 次。

用法：`python _patch/probe_scenebg.py`   退出码 = bad 条数（0 = 全绿）
可选：`--budget=N`、`--only=1920x1080,1280x720`
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

DRV = '_patch/_drvscenebg.js'
SHOT = os.path.join(ROOT, '_shot.html')

# 横屏验收矩阵，**永远不含 430x932**（已成既定前提）。
VIEWPORTS = [(1920, 1080), (1440, 900), (1366, 768), (1280, 720),
             (1024, 768), (960, 540), (844, 390), (640, 360)]

# 规格：id → (evt-bg 期望, at-menu 期望, #overlay 底色期望)
#   evt-bg=Y ⇒ 黑幕被放松（整屏场景）；N ⇒ 保持 .88（战局内的背景）
#   at-menu=Y ⇒ `#app` 不渲染（这一屏在战局之外）
#   期望值全部**算出来**，不照抄 CSS 注释里的数字。
EXPECT = {
    'shop':           ('Y', 'N', '10,8,6,0.55'),
    'campfire':       ('Y', 'N', '10,8,6,0.55'),
    'victory':        ('Y', 'N', '10,8,6,0.55'),
    'defeat':         ('Y', 'N', '10,8,6,0.55'),
    # 唯一 at-menu=Y 的一屏：run 还没开始，`#app` 必须继续不渲染。
    'hero_select':    ('Y', 'Y', '10,8,6,0.55'),
    'victory_reward': ('Y', 'N', '10,8,6,0.55'),
    # 控制组：幕背景在战局之内 ⇒ 不放松黑幕。缺了它，上面六行的 Y 说明不了任何问题
    #（可能只是开关恒真），这一行才是「放松严格跟着背景名走」的唯一证据。
    'ctl_act':        ('N', 'N', '10,8,6,0.88'),
}
ORDER = ['shop', 'campfire', 'victory', 'defeat', 'hero_select', 'victory_reward', 'ctl_act']

WANT_OFF = 'rgba(10, 8, 6, 0.88)'
WANT_ON = 'rgba(10, 8, 6, 0.55)'

# 六屏各是一张 1920x1080 的图，事件驱动等待基本不烧预算；60s 是照 _drvevtmtx.py 的余量给的。
BUDGET = 60000


def launch(w, h, tmpdir):
    url = 'file:///' + SHOT.replace('\\', '/')
    return [CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars',
            '--allow-file-access-from-files',
            '--window-size=%d,%d' % (w + 22, h + 98),
            '--dump-dom', '--virtual-time-budget=%d' % BUDGET,
            # ⚠️ **每次都开一个全新的 user-data-dir**，这是全套跑法的命门。
            # 不给的话八次启动共用默认配置目录，Chrome 还没释放 profile 锁就被下一次
            # 启动撞上 ⇒ 进程直接不出 stdout，`--dump-dom` 抓回来是空串。
            # 症状极具迷惑性：单跑任何一个视口都全绿，连着跑就成片「没读到 #__out」，
            # 而且失败个数每次都不一样（详见 _patch/probe_evtmtx.py 那段长注释）。
            '--user-data-dir=' + tmpdir,
            '--no-first-run', '--no-default-browser-check',
            '--disable-extensions', '--disable-background-networking',
            url]


def run_one(w, h):
    tmpdir = tempfile.mkdtemp(prefix='scenebg_')
    try:
        r = subprocess.run(launch(w, h, tmpdir), capture_output=True, text=True,
                           encoding='utf-8', errors='replace')
        m = re.search(r'<pre id="__out"[^>]*>(.*?)</pre>', r.stdout or '', re.S)
        return html.unescape(m.group(1)) if m else '', r
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


def raw_dump(r):
    """拿不到报告时把原始输出头一段打出来。最可能的两种原因：Chrome 起不来
    （stdout 全空、stderr 里有 profile/崩溃字样），或页面抛在了 emit() 之前。"""
    out = (r.stdout or '')
    print('    stdout %d 字节 / stderr %d 字节；有 __out=%s'
          % (len(out), len(r.stderr or ''), '__out' in out))
    print('    stderr 头：%s' % (r.stderr or '(空)')[:400].replace('\n', ' | '))


def main():
    global BUDGET
    vps = VIEWPORTS
    for a in sys.argv[1:]:
        if a.startswith('--budget='):
            BUDGET = int(a.split('=', 1)[1])
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
        print('=' * 74)
        print('%dx%d' % (w, h))
        body, r = run_one(w, h)
        if not body:
            print('  ✗ 没读到 #__out —— 页面没跑起来，或驱动抛在了 emit() 之前')
            raw_dump(r)
            bad += 1
            continue
        lines = body.split('\n')
        if not lines[0].startswith('vp=') or len(lines) < 5:
            # 驱动抛在了 emit() 中途 ⇒ 头几行不是我们约定的样子
            print('  ✗ 报告头不对（驱动中途抛出？）：\n%s' % body[:600])
            bad += 1
            continue
        head = dict(x.split('=', 1) for x in lines[0:2] if '=' in x)
        try:
            ov = int(head.get('overflow', '999'))
        except ValueError:
            ov = 999
        off = lines[2].split('=', 1)[1]
        on = lines[3].split('=', 1)[1]
        panel = lines[4].split('=', 1)[1]
        print('  实际视口 = %s   page overflow = %s px' % (head.get('vp', '?'), head.get('overflow', '?')))
        print('  #overlay 摘开关后 = %s   （期望 %s）' % (off, WANT_OFF))
        print('  #overlay 装开关后 = %s   （期望 %s）' % (on, WANT_ON))
        print('  .panel  底色      = %s   （期望不透明 —— 刻意没动）' % panel)
        print('  %s' % lines[5])
        for ln in lines[6:]:
            print('  %s' % ln)
        # ---- 断言：页级与可逆性 ----
        total += 1
        if ov > 0:
            print('  ✗ 页级 overflow > 0，被撑出了竖向滚动')
            bad += 1
        total += 1
        if on != WANT_ON:
            print('  ✗ 黑幕没被放松到 .55')
            bad += 1
        total += 1
        if off != WANT_OFF:
            print('  ✗ 摘掉 evt-bg 后没回落到 .88（说明命中的不是那条规则）')
            bad += 1
        total += 1
        if panel in ('rgba(0, 0, 0, 0)', 'transparent'):
            print('  ✗ .panel 底色成了透明 —— 面板正文可读性没了')
            bad += 1
        # ---- 断言：六屏 + 控制组逐行 ----
        rows = lines[6:]
        if len(rows) != len(ORDER):
            print('  ✗ 数据行数不是 %d（拿到 %d 行）' % (len(ORDER), len(rows)))
            bad += 1
            total += 1
        for ln in rows:
            parts = [p.strip() for p in ln.split('|')]
            if len(parts) != 8:
                print('  ✗ 行格式不对（该 8 段）：%s' % ln)
                bad += 1
                total += 1
                continue
            sid, srcok, nat, hasbg, evtbg, atmenu, rgbrgb, why = parts
            exp = EXPECT.get(sid)
            if not exp:
                print('  ✗ 出现了规格里没有的 id：%s' % sid)
                bad += 1
                total += 1
                continue
            want_evt, want_menu, want_rgb = exp
            total += 7
            if why != 'load':
                print('  ✗ %s 的图没在 load 事件上落定（%s）—— 404 或超时' % (sid, why))
                bad += 1
            if nat == '0x0':
                print('  ✗ %s 的图没加载出来（naturalWidth=0 = 404）' % sid)
                bad += 1
            if srcok != 'Y':
                print('  ✗ %s 的 #bg.src 不是那张图：%s' % (sid, srcok))
                bad += 1
            if hasbg != 'Y':
                print('  ✗ %s 的 body.has-bg 没了（setBg 的 onerror 走过）' % sid)
                bad += 1
            if evtbg != want_evt:
                print('  ✗ %s 的 body.evt-bg = %s（期望 %s）' % (sid, evtbg, want_evt))
                bad += 1
            if atmenu != want_menu:
                print('  ✗ %s 的 body.at-menu = %s（期望 %s）%s'
                      % (sid, atmenu, want_menu,
                         '  ← 选英雄必须保留 at-menu，否则 #app 空骨架会透出来'
                         if sid == 'hero_select' else ''))
                bad += 1
            if rgbrgb != want_rgb:
                print('  ✗ %s 的 #overlay 底色 = %s（期望 %s）' % (sid, rgbrgb, want_rgb))
                bad += 1

    print('=' * 74)
    print('八视口 × (六屏 + 控制组)：%d 项断言，bad=%d' % (total, bad))
    if bad == 0:
        print('全部通过 ✓')
    return bad


if __name__ == '__main__':
    sys.exit(main())