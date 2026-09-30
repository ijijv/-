# -*- coding: utf-8 -*-
"""结算墨色过场（v0.76.0 的 #scene-veil）八视口夹具。

为什么非有它不可：**这一项的核心判据冒烟一条都证不了。**
  - 冒烟跑在 vm 沙箱里，`animLive()` 恒假 ⇒ `settleTransition` 整段不执行、`openFn()` 同步调。
    那正是**必须**保住的行为（四条结算路径的既有断言全靠它），但也就意味着
    「轻档不铺墨 / 重档铺墨 / 揭幕接得上 / 败局是暗红墨」这四条**在冒烟里根本没有代码路径**。
  - `verify_dist.py` 只能证明规则**文本**在产物里 —— 而 CSS 是静默失败的：规则在文件里、
    grep 得到、子串闸绿，浏览器却可能整条丢弃。
  - 「该铺的墨没铺」是**看不见的失败**：它不会抛异常、不会红任何闸，只是玩家少看了一段过场；
    而它反面（墨铺上了不褪）是**最严重的可见事故**：整屏黑，游戏玩不了。
⇒ 唯一能证明分级真的成立的，是让真浏览器跑真实路径、把每一次类/样式变化都记下来事后判。

四例（每例对应一个真会发生的错法）：
    light       普通战斗 ⇒ 墨幕一次都没出现（.show 从未挂上），挡板照落，面板最终开
    heavy_win   精英     ⇒ .show → .parting（次序如此），且是 win 墨
    heavy_lose  败局     ⇒ .show.lose（暗红墨自上压），揭幕照走
    reduced     系统「减弱动态效果」⇒ 墨一次没铺、style 一次没动，面板**同刻**就在

⚠️ 判「同刻」用**同步读**（驱动里在 `winFight()` 的下一行取值），不是等一拍再看。
⚠️ 视口 ≠ `--window-size`：new headless 恒定少 22px 宽、98px 高，照 `probe_forge.py` 反补。
   每个视口**都开一个全新的 user-data-dir**。
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

DRV = '_patch/_drvveil.js'
SHOT = os.path.join(ROOT, '_shot.html')

# 横屏验收矩阵，**永远不含 430x932**（已成既定前提）。
VIEWPORTS = [(1920, 1080), (1440, 900), (1366, 768), (1280, 720),
             (1024, 768), (960, 540), (844, 390), (640, 360)]

# 规格：行 id → (show, parting, lose, 次序, style动过, 同刻, 内容, veilClass)
# 期望值**写死在这里**，不回头读 `G.rewardTier` 之类 —— 那是让被测代码自己出题。
SPEC = [
    ('light',      ('N', 'N', 'N', 'NA', 'Y', 'N', 'Y', '(空)')),
    ('heavy_win',  ('Y', 'Y', 'N', 'ok', 'Y', 'N', 'Y', '(空)')),
    ('heavy_lose', ('Y', 'Y', 'Y', 'ok', 'Y', 'N', 'Y', '(空)')),
    ('reduced',    ('N', 'N', 'N', 'NA', 'N', 'Y', 'Y', '(空)')),
]
COLS = ['show', 'parting', 'lose', '次序', 'style动过', '同刻', '内容', 'veilClass']
COLWHY = {
    'show':     '墨幕该/不该出现（分级判据）',
    'parting':  '揭幕那一拍有没有接上（漏了就是墨盖住不走 = 整屏黑）',
    'lose':     '败局是不是暗红墨（配错方向观感正好相反）',
    '次序':     '.parting 必须晚于 .show（SS 顺序错了等于没揭幕）',
    'style动过': '轻档那一下 invisible 挡板有没有落（漏了就能在空战场上点操作）',
    '同刻':     'reduced 下面板必须同步开（异步了就是黑屏半秒）',
    '内容':     '面板最终有没有真的开出来',
    'veilClass': '收尾清理（跑完还剩 .show 就是永久黑屏）',
}

BUDGET = 40000


def launch(w, h, tmpdir):
    url = 'file:///' + SHOT.replace('\\', '/')
    return [CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars',
            '--allow-file-access-from-files',
            '--window-size=%d,%d' % (w + 22, h + 98),
            '--dump-dom', '--virtual-time-budget=%d' % BUDGET,
            '--user-data-dir=' + tmpdir,
            '--no-first-run', '--no-default-browser-check',
            '--disable-extensions', '--disable-background-networking',
            url]


def run_one(w, h):
    tmpdir = tempfile.mkdtemp(prefix='veil_')
    try:
        r = subprocess.run(launch(w, h, tmpdir), capture_output=True, text=True,
                           encoding='utf-8', errors='replace')
        m = re.search(r'<pre id="__out"[^>]*>(.*?)</pre>', r.stdout or '', re.S)
        return (html.unescape(m.group(1)) if m else ''), r
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


def raw_dump(r):
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
        if not lines[0].startswith('vp='):
            print('  ✗ 报告头不对（驱动中途抛出？）：\n%s' % body[:600])
            bad += 1
            continue
        head = dict(x.split('=', 1) for x in lines[0:2] if '=' in x)
        if head.get('vp') != '%dx%d' % (w, h):
            print('  ✗ 实际视口 = %s（期望 %dx%d）—— 反补算错了' % (head.get('vp'), w, h))
            bad += 1
            total += 1
        rows = lines[3:]
        if len(rows) != len(SPEC):
            print('  ✗ 数据行数不是 %d（拿到 %d 行）：\n%s' % (len(SPEC), len(rows), body[:600]))
            bad += 1
            total += 1
            continue

        for ln, (rid, want) in zip(rows, SPEC):
            parts = [p.strip() for p in ln.split('|')]
            if len(parts) != 10:
                print('  ✗ 行格式不对（该 10 段）：%s' % ln)
                bad += 1
                total += 1
                continue
            gid = parts[0]
            got = tuple(parts[2:])
            if gid != rid:
                print('  ✗ 行 id 与规格不符：%s（规格 %s）' % (ln, rid))
                bad += 1
                total += 1
                continue
            for ci, (col, g, e) in enumerate(zip(COLS, got, want)):
                total += 1
                if g != e:
                    print('  ✗ %s · %s = %s（期望 %s）—— %s'
                          % (rid, col, g, e, COLWHY[col]))
                    bad += 1
            if got == want:
                print('  ✓ %-10s 墨幕 %s/%s/%s · 次序 %s · style %s · 同刻 %s · 内容 %s · 残留 %s'
                      % (rid, got[0], got[1], got[2], got[3], got[4], got[5], got[6], got[7]))

    print('=' * 74)
    print('结算墨色过场 %d 视口 × %d 例 × %d 列：%d 项断言，bad=%d'
          % (len(vps), len(SPEC), len(COLS), total, bad))
    if bad == 0:
        print('全部通过 ✓')
    return bad


if __name__ == '__main__':
    sys.exit(main())