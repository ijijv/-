# -*- coding: utf-8 -*-
"""v0.61.37 收尾：冒烟 → 打包校验 → 清理 → 白名单校验 → 提交（本地，不 push）。

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

# ── 3. 清理本批临时文件（改前树 / 一次性探针 / 仿真中间产物）──
removed = []
for f in ('_smoke_backup.js', '_smoke1.json', '_smoke2.json', '_smoke3.json',
          '_b1.json', '_b2.json',
          '_pre_all_sim.json', '_post_all_sim.json',
          '_pre_ganshiren_sim.json', '_post_ganshiren_sim.json'):
    full = os.path.join(ROOT, '_patch', f)
    if os.path.exists(full):
        os.remove(full)
        removed.append('_patch/' + f)
print('清理本批临时文件：', removed or '（无）')

# ── 4. 白名单（防 git add -A 把杂物带进提交）──
ALLOW = {
    '原型.html', '更新日志.md',
    'js/20_data.js', 'js/30_engine.js', 'js/40_flow.js', 'js/60_boot.js',
    '_patch/smoke_runner.js',
    '四个角色卡池/4/赶尸人版卡池 - 副本.md',
    '_patch/patch_v6137_code.py', '_patch/patch_v6137_ui.py',
    '_patch/patch_v6137_smoke.py', '_patch/patch_v6137_changelog.py',
    '_patch/patch_v6137_memory.py', '_patch/finish_v6137.py',
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
MSG = ('赶尸人(A 列)卡池按《赶尸人版卡池 - 副本.md》重做 18 条：'
       '雷符 4→5 且击杀尸气 2→2/3、火符 8→7 且弃鬼怪尸气 1/2→2/3、剑符 8/13→10/14 且消耗 2→3、'
       '斩妖剑 8→7、天雷正法 18/24→20/28 且阈值每 3→每 2、系数 ×3→×2、'
       '万剑归宗 15→14 并新增「抽到的牌本回合费用 -1/-2」、噬魂术消耗 4→4/2、蚀魂咒 3/6→4/8、'
       '嗜血 每 2 点→每 1 点且上限 5→6/7、钟馗镇魂尸气 5→6、金光罩 10/15→9/14 且额外 4/5→5/7、'
       '铜皮铁骨 9→8 且反弹 6→5、易物换出鬼怪尸气 1→2、血契升级 1→0 费、燃血术失血 4→8、'
       '洗髓经持续 4/3→固定 3 且每回合尸气 1→1/2、移形换影升级 0→1 费且闪避尸气 1→1/3、'
       '镇妖铃 16→15 且尸气 3→4、咒雨费用 2→3 且每层 6/7→5/6；'
       '佛渡零改动(副本仍写 1 费，代码早已是 0，是旧卡池文件过时)；'
       '被动替换：删掉「召唤纸人/小鬼/五通神/阴兵额外 +1 回合寿命」(SUMMON_LIFE_TYPES + addSummon 钩子)，'
       '改为「每消耗 1 点尸气回复 1 点生命」，收口在 spendShiqi，剑符/金光罩/纸人强化/五通神/尸王/噬魂术/'
       '群鬼乱舞/天雷减免全部自动生效；咒雨 G.尸气=0 是唯一旁路，按「清零也算消耗」显式补回血；'
       '删掉 +1 后 A 列召唤物 dur 与卡面逐字一致(被动是寿命唯一偏移源)；'
       '新增「预尸气」标志(顶栏尸气右侧，紫色小标，0 不显示)＝下回合总进账(回合末消散者死亡返还 + 下回合开始每召唤 +1)，'
       '已与 startTurn 真实结算顺序对齐(尸气被动跑在 wutongTick 之前，dur=1 五通神算 +1 不算死亡、尸王消散不计)；'
       '顺带修移形换影 A 列真 bug(卡面写 2、eff 也存 G.dodgeShiqi=2，但结算处硬编码 gainShiqi(1)，那 2 从没被读过)；'
       '顺带补缺失的 .stat-shiqi b 紫色；'
       'CARD_DMG 四处跨列共用分支拆开(斩妖剑 base、万剑归宗/镇妖铃尾支 A/C、咒雨尾支)，'
       '并纠正旧判断：咒雨 C/D 预览非缺陷——previewDamage 对非赶尸人提前 return null，该尾支不可达；'
       '新初始牌库：雷符×2 金刚符×1 咒印×1 舍身×1 附灵术×1 纸人×1 尸王×1 守一×1 小鬼×1 五通神×1(尸王保持 ×1)；'
       '冒烟 899→979 全绿(改 33 条过期断言，新增 ~80 条，含反误伤 4 条与预尸气 11 条边界)；'
       '修一条既有脆弱用例 D#39 附灵(原先只诅咒 enemies[0] 而小鬼目标随机→随机红绿，改为两只都诅咒使断言确定)；'
       'sim 四英雄 80 场景对照：20 个有差异且全部是赶尸人、其余三英雄 60 场景逐字节不变；'
       '赶尸人第一幕普通 winRate 0.7527→0.9100、受伤 −16.9，前期乏力问题解决；'
       'dist 重建 15.02MB、verify_dist 全绿')
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