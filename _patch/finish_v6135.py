# -*- coding: utf-8 -*-
"""v0.61.35 收尾：冒烟 → 清理 → 白名单校验 → 提交（本地，不 push）。

提交信息里**不写任何署名行**（用户 2026-09-24 指示，覆盖工具自身的署名指引）。
"""
import glob, json, os, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def run(cmd):
    return subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True,
                          encoding='utf-8', errors='replace')


# ── 1. 冒烟（必须全绿才继续）──
p = run(['node', os.path.join('_patch', 'smoke_host.js')])
try:
    rep = json.loads(p.stdout)
except Exception as e:
    print('!! 冒烟输出无法解析：', e)
    print((p.stdout or '')[:1500])
    print((p.stderr or '')[:1500])
    sys.exit(1)
print('冒烟 pass=%s fail=%s' % (rep.get('pass'), rep.get('fail')))
for e in (rep.get('errors') or []):
    print('  X', e)
if not rep.get('ok'):
    print('!! 冒烟未全绿，收尾中止')
    sys.exit(1)

# ── 2. 清理临时文件 ──
removed = []
for pat in (os.path.join(ROOT, '*.tmp'), os.path.join(ROOT, '_patch', '_pre_*.js')):
    for f in glob.glob(pat):
        os.remove(f)
        removed.append(os.path.relpath(f, ROOT))
print('清理临时文件：', removed or '（无）')

# ── 3. 白名单（防 git add -A 把杂物带进提交）──
# 说明：四份 `- 副本.md` 是用户 9/24 交付的新版卡池文件（天师版=本批依据；
# 武僧/赶尸人/阴差三份是后续批次要用的），与已入库的四份原版同一族，一并纳入。
ALLOW = {
    '原型.html', '更新日志.md',
    'js/20_data.js', 'js/30_engine.js', 'js/50_ui.js', 'js/60_boot.js',
    '_patch/smoke_runner.js',
    '_patch/patch_v6135_code.py', '_patch/patch_v6135_smoke.py',
    '_patch/patch_v6135_smoke2.py', '_patch/patch_v6135_changelog.py',
    '_patch/finish_v6135.py',
    '四个角色卡池/4/天师版卡池 - 副本.md',
    '四个角色卡池/4/武僧版卡池 - 副本.md',
    '四个角色卡池/4/赶尸人版卡池 - 副本.md',
    '四个角色卡池/4/阴差版卡池 - 副本.md',
}
st = run(['git', '-c', 'core.quotepath=false', 'status', '--porcelain'])
lines = [l for l in (st.stdout or '').splitlines() if l.strip()]
print('--- git status --short ---')
for l in lines:
    print(' ', l)
bad = []
for l in lines:
    path = l[3:].strip().strip('"')
    if ' -> ' in path:
        path = path.split(' -> ')[-1]
    if path not in ALLOW:
        bad.append(l)
if bad:
    print('!! 有白名单外的改动，未提交：')
    for l in bad:
        print('   ', l)
    sys.exit(1)

# ── 4. 提交（提交.py 自己从 原型.html 读版本号做前缀；本地不 push）──
MSG = ('天师(D 列)卡池按《天师版卡池 - 副本.md》重做 29 条 + 新初始卡组 10 张；'
       '初始牌组改雷符×3 金刚符×2 聚灵 渡魂归己 咒印 纸人 守一（去佛渡/画皮）；'
       '守一改为「保留的【诅咒牌】该牌自身下回合 -1 费」，用 c.costCutTurn=G.turn+1 时间戳到期、'
       '旧 boostCurse 链路整体退役；小鬼目标由「诅咒最高」改随机(命中带诅咒 +2/3)、'
       '纸人改为回合末伤害+施咒、CAN_CURSE_IDS 8→9(加纸人)、previewDamage 去掉小鬼的 mostCursedEnemy 借用；'
       '佛渡/移形换影/燃血术改按列分叉(仅天师列变)；'
       '顺带修掉天师天雷正法那行「注释吞掉后半句代码」的缺陷(node --check 抓到)；'
       '洗髓经/渡魂归己 v0.61.33 已修完，本批只加回归断言；'
       '冒烟 862→879 全绿；dist 重建 15.01MB、verify_dist 全绿；'
       '附带收录用户交付的四份「- 副本.md」新版卡池文件')
c = run([sys.executable, '提交.py', '-m', MSG])
print('--- 提交.py ---')
print((c.stdout or '').strip()[-1500:])
if c.returncode != 0:
    print((c.stderr or '').strip()[-1500:])
    sys.exit(1)
print('--- git log ---')
print((run(['git', 'log', '--oneline', '-3']).stdout or '').strip())

# ── 5. 提交后工作区是否干净 ──
st2 = run(['git', 'status', '--porcelain'])
left = [l for l in (st2.stdout or '').splitlines() if l.strip()]
print('提交后剩余未提交改动：', left or '（干净）')