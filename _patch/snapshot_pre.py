# -*- coding: utf-8 -*-
"""把某个 git 版本的游戏树还原到 _patch/_pre/，并导出「改前 vs 改后」的全卡面文案 JSON。

用途（v0.61.39 起）：写更新日志的「现值 → 新值」对照表时，**不凭记忆、不读代码块 diff**，
而是让两边各跑一遍游戏、把 48 张 × 4 英雄 × {未升级,升级} 的卡面文案导出来做真 diff。

用法：
    python _patch/snapshot_pre.py            # 默认对照 HEAD
    python _patch/snapshot_pre.py <rev>      # 对照任意 rev

产出（全部落在 _patch/_pre/，已被 .gitignore 忽略）：
    _patch/_pre/原型.html  _patch/_pre/js/*.js   —— rev 时的树
    _patch/_pre/texts.json                       —— rev 版文案
    _patch/_pre/texts_new.json                   —— 工作区文案
"""
import io, json, os, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PRE = os.path.join(ROOT, '_patch', '_pre')
JS = ['00_base', '10_audio', '20_data', '30_engine', '40_flow', '50_ui', '60_boot']


def run(cmd):
    return subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True,
                          encoding='utf-8', errors='replace')


def git_show(rev, path, dest):
    p = run(['git', 'show', '%s:%s' % (rev, path)])
    if p.returncode != 0:
        print('!! git show %s:%s 失败\n%s' % (rev, path, p.stderr))
        sys.exit(1)
    io.open(dest, 'w', encoding='utf-8', newline='').write(p.stdout)


def main():
    rev = sys.argv[1] if len(sys.argv) > 1 else 'HEAD'
    if not os.path.isdir(os.path.join(PRE, 'js')):
        os.makedirs(os.path.join(PRE, 'js'))
    git_show(rev, '原型.html', os.path.join(PRE, '原型.html'))
    for f in JS:
        git_show(rev, 'js/%s.js' % f, os.path.join(PRE, 'js', '%s.js' % f))
    print('已还原 %s 的树 → _patch/_pre/' % rev)

    for label, tgt, out in (('rev', os.path.join(PRE, '原型.html'), 'texts.json'),
                            ('工作区', os.path.join(ROOT, '原型.html'), 'texts_new.json')):
        p = subprocess.run(['node', os.path.join('_patch', 'dump_texts.js'), tgt],
                           cwd=ROOT, capture_output=True, text=True, encoding='utf-8', errors='replace')
        if p.returncode != 0:
            print('!! dump_texts.js (%s) 失败\n%s' % (label, p.stderr[-900:]))
            sys.exit(1)
        io.open(os.path.join(PRE, out), 'w', encoding='utf-8', newline='').write(p.stdout)
        print('  %s 文案 → _patch/_pre/%s（%d 字节）' % (label, out, len(p.stdout)))

    a = json.load(io.open(os.path.join(PRE, 'texts.json'), encoding='utf-8'))
    b = json.load(io.open(os.path.join(PRE, 'texts_new.json'), encoding='utf-8'))
    LBL = {'ganshiren': 'A赶尸人', 'wuseng': 'B武僧', 'yincha': 'C阴差', 'tianshi': 'D天师'}
    n = 0
    for h in a:
        for cid in a[h]:
            for u, tag in (('u0', '未升级'), ('u1', '升级')):
                if a[h][cid][u] != b[h][cid][u]:
                    n += 1
                    print('\n  [%s] %s (%s) %s' % (LBL[h], a[h][cid]['n'], cid, tag))
                    print('    旧: ' + a[h][cid][u])
                    print('    新: ' + b[h][cid][u])
    print('\n合计变化条目: %d' % n)


main()