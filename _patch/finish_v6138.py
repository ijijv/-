# -*- coding: utf-8 -*-
"""v0.61.38 收尾：冒烟 → 打包校验 → 白名单校验 → 提交（本地，不 push）。

提交信息里**不写任何署名行**（用户 2026-09-24 指示，覆盖工具自身的署名指引）。
"""
import json, os, subprocess, sys

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

# ── 2. 重建产物 + 校验（本轮改了 js/20_data.js 与 原型.html，必须重打）──
pk = run([sys.executable, '打包.py'])
print('--- 打包.py 尾 ---')
print((pk.stdout or '').strip()[-400:])
if pk.returncode != 0:
    print((pk.stderr or '').strip()[-800:])
    sys.exit(1)
vd = run([sys.executable, os.path.join('_patch', 'verify_dist.py')])
print('--- verify_dist.py 尾 ---')
print((vd.stdout or '').strip()[-900:])
if vd.returncode != 0:
    print((vd.stderr or '').strip()[-800:])
    print('!! 产物校验未通过，收尾中止')
    sys.exit(1)

# ── 3. 白名单（防 git add -A 把杂物带进提交）──
ALLOW = {
    '原型.html', '更新日志.md',
    'js/20_data.js', 'js/60_boot.js',
    '_patch/smoke_runner.js',
    # 附带收录：用户今天 16:34 更新的阴差卡池副本（阴差 C 列的源码改动是下一批）
    '四个角色卡池/4/阴差版卡池 - 副本.md',
    '_patch/patch_v6138_code.py', '_patch/patch_v6138_smoke.py',
    '_patch/patch_v6138_changelog.py', '_patch/patch_v6138_memory.py',
    '_patch/finish_v6138.py',
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
MSG = ('更正 v0.61.37 报告里的两条错误挂账 + 修掉两处「尸气整局累积不清零」的撒谎文案；'
       '更正一：武僧/阴差/天师初始牌库不该出现在「仍未做」里——三副牌早已交付'
       '(武僧按 苦僧.txt v0.58 / 阴差按 阴差.txt v0.59 / 天师 v0.60 后 v0.60.02 对调、'
       '再按 v0.61.35 给的新副 v0.61.35)，本批并无待办牌库；'
       '更正二：引擎没有矛盾——尸气每场清零(30_engine.js:640 有 G.尸气=0，2026-09-08 拍板)，'
       '「整局累积不清零」本是血怒的规则(全仓 G.xuenu 无任何战斗重置，2026-09-09 拍板)，'
       '错的是 js/20_data.js 两处把血怒规则错印在尸气头上的卡面文案：'
       ':38 KEYWORDS【尸气】「上限 12 点、整局累积」→「战斗内跨回合累积、每场战斗清零」并补上 v0.61.37 的'
       '「每消耗 1 点回复 1 点生命」，:654 tipOnce(shiqi) 「整局累积不清零」→「战斗内跨回合累积，每场战斗清零」；'
       '血怒的两处文案(:37 词条、:570 阴差被动)本来就写对，一行未动；'
       '错误源头不是 v0.61.37，是 v0.58 的 patch_v58_block8j_kw.py 与 v0.61.20 的 patch_v61_20_logic.py，'
       '本批只是照抄了既有错误文案并误当成「引擎自相矛盾」；全部 .md 里没有任何一句说「尸气整局累积」，'
       '这个说法只存在于游戏内文案；'
       '教训：游戏内文案(KEYWORDS/tipOnce)不是事实来源，引设计口径必须回 30_engine.js 的 startBattle 重置区核实，'
       '文案与代码冲突时先假定文案错；'
       '冒烟 979→989 全绿(+10 条，0 条改动，含反误伤 2 条证明没把两边的词条改反 + 引擎行为对拍 2 条'
       '断言 startBattle 后尸气=0 而血怒保持 5)；版本号三处同步 v0.61.38；'
       'dist 重打、verify_dist 全绿；附带收录你今天更新的《阴差版卡池 - 副本.md》(25 行)，'
       '阴差 C 列的源码改动是下一批')
c = run([sys.executable, '提交.py', '-m', MSG])
print('--- 提交.py ---')
print((c.stdout or '').strip()[-1500:])
if c.returncode != 0:
    print((c.stderr or '').strip()[-1500:])
    sys.exit(1)
print('--- git log ---')
print((run(['git', 'log', '--oneline', '-3']).stdout or '').strip())

# ── 5. 提交后工作区是否干净（只本地，不 push）──
st2 = run(['git', 'status', '--porcelain'])
left = [l for l in (st2.stdout or '').splitlines() if l.strip()]
print('提交后剩余未提交改动：', left or '（干净）')
print('本地领先 origin：', (run(['git', 'rev-list', '--count', 'origin/main..HEAD']).stdout or '').strip())