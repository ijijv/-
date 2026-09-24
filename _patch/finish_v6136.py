# -*- coding: utf-8 -*-
"""v0.61.36 收尾：冒烟 → 打包校验 → 清理 → 白名单校验 → 提交（本地，不 push）。

提交信息里**不写任何署名行**（用户 2026-09-24 指示，覆盖工具自身的署名指引）。
"""
import glob, json, os, shutil, subprocess, sys

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

# ── 2. 重建产物 + 校验（打包只读 js 与 素材，改完 js 必须重打）──
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

# ── 3. 清理本批临时文件（改前树 / 一次性探针）──
removed = []
for d in ('_pre_tree',):
    full = os.path.join(ROOT, '_patch', d)
    if os.path.isdir(full):
        shutil.rmtree(full)
        removed.append('_patch/' + d + '/')
for f in ('_probe_wuseng_deck.js',):
    full = os.path.join(ROOT, '_patch', f)
    if os.path.exists(full):
        os.remove(full)
        removed.append('_patch/' + f)
print('清理本批临时文件：', removed or '（无）')

# ── 4. 白名单（防 git add -A 把杂物带进提交）──
ALLOW = {
    '原型.html', '更新日志.md',
    '素材清单.md', '素材/README.md',
    'js/00_base.js', 'js/10_audio.js', 'js/20_data.js', 'js/30_engine.js', 'js/60_boot.js',
    '_patch/smoke_runner.js', '_patch/verify_dist.py',
    '_patch/patch_v6136_code.py', '_patch/patch_v6136_num.py',
    '_patch/patch_v6136_verify.py',
    '_patch/patch_v6136_smoke.py', '_patch/patch_v6136_smoke2.py',
    '_patch/patch_v6136_smoke3.py', '_patch/patch_v6136_smoke4.py',
    '_patch/patch_v6136_smoke5.py',
    '_patch/patch_v6136_docs.py', '_patch/patch_v6136_changelog.py',
    '_patch/patch_v6136_memory.py',
    '_patch/finish_v6136.py',
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

# ── 5. 提交（提交.py 自己从 原型.html 读版本号做前缀；本地不 push）──
MSG = ('武僧(B 列/苦僧)卡池按《武僧版卡池 - 副本.md》重做 8 条：'
       '荆棘符反弹 4/5→3/4、佛渡升级附加格挡 4→5、舍身格挡 3/5→4 固定、'
       '燃血术失血 6→8、焚符每弃 1 张格挡 4/6→4/5、移形换影费用 1/0→1/1、'
       '附灵术费用 2/1 每触发格挡 3/4→3 固定、五通神立即 5/6→7 固定且每回合开始 4→6；'
       '其中两处 grep wuseng 抓不到的隐式落点(佛渡 eff 的 else 兜底、summonTurnBlock 硬编码)已显式改；'
       '攻击段与备注一行未动、CARD_DMG 零改动、武僧初始卡组不动；'
       '素材/num 接缝改四档(dmg/hurt/block/heal 各 10 张，逐档独立探测、全或无)，'
       '并要求文档写进《素材清单.md》与《素材/README.md》——40 张图本身仍未交付，图到即生效；'
       '浮字加内层 .fx-in 抖动/闪烁 + .crit 暴击档(与 hit_crit 音效共用 HIT_CRIT_DMG=20/isCritHit 阈值)；'
       '修 verify_dist.py 误报：怨气是运行时废牌 junkCard() 不在 CARDS 里导致 card/yuanqi.png 被误报「从未被请求」，'
       '补 junkCard 来源后 104 个请求全命中、该提示消失(上一批的错报已撤销)；'
       '40 条 num 路径按 musicOptional 先例走「交付即生效」而非「必须命中」，避免图未交付就 FAIL；'
       '冒烟 879→899 全绿；sim.js 只打初始牌组与本批 8 张无交集故无差异，另用一次性探针 A/B 得真实 Δ；'
       'dist 重建 15.01MB、verify_dist 全绿')
c = run([sys.executable, '提交.py', '-m', MSG])
print('--- 提交.py ---')
print((c.stdout or '').strip()[-1500:])
if c.returncode != 0:
    print((c.stderr or '').strip()[-1500:])
    sys.exit(1)
print('--- git log ---')
print((run(['git', 'log', '--oneline', '-3']).stdout or '').strip())

# ── 6. 提交后工作区是否干净（只本地，不 push）──
st2 = run(['git', 'status', '--porcelain'])
left = [l for l in (st2.stdout or '').splitlines() if l.strip()]
print('提交后剩余未提交改动：', left or '（干净）')
print('本地领先 origin：', (run(['git', 'rev-list', '--count', 'origin/main..HEAD']).stdout or '').strip())