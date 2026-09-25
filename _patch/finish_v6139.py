# -*- coding: utf-8 -*-
"""v0.61.39 收尾：冒烟 → 打包校验 → 白名单校验 → 提交（本地，不 push）。

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

# ── 2. 重建产物 + 校验（本轮改了 js/*.js、原型.html 与 素材/num/dmg/，必须重打）──
pk = run([sys.executable, '打包.py'])
print('--- 打包.py 尾 ---')
print((pk.stdout or '').strip()[-400:])
if pk.returncode != 0:
    print((pk.stderr or '').strip()[-800:])
    sys.exit(1)
vd = run([sys.executable, os.path.join('_patch', 'verify_dist.py')])
print('--- verify_dist.py 尾 ---')
print((vd.stdout or '').strip()[-1200:])
if vd.returncode != 0:
    print((vd.stderr or '').strip()[-800:])
    print('!! 产物校验未通过，收尾中止')
    sys.exit(1)

# ── 3. 白名单（防 git add -A 把杂物带进提交；-uall 让未跟踪目录展开成文件逐个核对）──
ALLOW = {
    '原型.html', '更新日志.md',
    'js/20_data.js', 'js/30_engine.js', 'js/40_flow.js', 'js/60_boot.js',
    '_patch/smoke_runner.js',
    # 附带收录：用户今天更新的阴差卡池副本（本轮源码改动的依据）
    '四个角色卡池/4/阴差版卡池 - 副本.md',
    # 40 张浮字只装 dmg 一档（用户裁定「装，但只装一档试水」）
    '_patch/patch_v6139_c.py', '_patch/patch_v6139_bug.py',
    '_patch/patch_v6139_smoke.py', '_patch/patch_v6139_smoke2.py',
    '_patch/patch_v6139_changelog.py', '_patch/patch_v6139_memory.py',
    '_patch/finish_v6139.py',
    # 本批排查用的探针与工具（留作可复现证据）
    '_patch/probe_hpcost.js', '_patch/probe_rage_ex.js',
    '_patch/dump_texts.js', '_patch/snapshot_pre.py',
}
for i in range(10):
    ALLOW.add('素材/num/dmg/%d.png' % i)

st = run(['git', '-c', 'core.quotepath=false', 'status', '--porcelain', '-uall'])
lines = [l for l in (st.stdout or '').splitlines() if l.strip()]
print('--- git status --short -uall ---')
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
MSG = ('阴差(C 列)卡池按《阴差版卡池 - 副本.md》重做 26 张 + 修 3 个 bug + 40 张浮字只装 dmg 一档；'
       'C 列 26 张：雷符 5→4 且每层血怒 +2→+3（上限 +6 不变）、火符 8/11→6/10、斩妖剑基础 9→10、'
       '天雷正法升级上限 +20→+26、万剑归宗失血 3→5 且斩杀回血 8/12→10/15、'
       '噬魂术未升级上限 +20→+12 且升级 10→16/每层 +3/上限 +18、嗜血 4/6→固定 5、钟馗镇魂失 4→5、'
       '金刚符 7/9→6/9 且失血 2→2/3、隐身符升级 5→7、金光罩 10/14→11/17 且失血 3→4/5、金钟罩 10/15→12/18、'
       '荆棘符 3/5→4/6 且每受击回血 2→2/3、佛渡升级「+3 格挡」→「回复 5 点生命」、'
       '铜皮铁骨整体重做（撤掉失血与反弹 6/8，改 9/13 格挡 + 每受击回 3/4 血）、'
       '卸甲生元 5/7→5/8 且失 3→2 并新增回血上限 11/14、燃血术 C 列升级固定失 4/1 符文、'
       '血祭阈值每失 2→每失 4、开天眼上限 +6→+8/+10、'
       '移形换影回 2/4 + 血怒 1/2 且取消阴差 (U:0) 四列统一 1/1、镇妖铃上限 +12/+18 且升级系数 +3、'
       '纸人门槛 ≥4/耗 4→≥3/耗 3、五通神回血 5→6 且门槛 ≥3/耗 3、咒雨改为「将 4/6 层诅咒随机施加在敌人身上」；'
       '配套 hpCost 声明同步(金刚符/金光罩/万剑归宗/钟馗镇魂/卸甲生元，铜皮铁骨整条撤除，小鬼与纸人新增——'
       '两牌卡面本来就写「失去 2 点生命」却没有阵亡弹窗)；30_engine CARD_DMG 镜像同步 + 新增 G.xiejiaHealCap 承接回血上限；'
       '阴差初始卡池 11 张→8 种 10 张(雷符×3 金刚符 火符 焚符 血契 守一 燃血术 纸人)，换下佛渡/聚灵/渡魂归己；'
       '修 bug①五通神在附灵术/群鬼乱舞后不触发——summonAct 的 type 白名单只认 zhiren/xiaogui/yinbing/shi_wang，'
       '五通神的结算在 wutongTick 里被静默跳过，改为 decay===false 时交给 wutongTick(s,true)(新增 noDecay 形参，'
       '只结算效果不扣寿命，寿命仍只由 startTurn 扣，不会一回合扣两次)；'
       '修 bug②易物白送换入牌 -1 费——v0.61.10(P11) 采纳外部评审建议后加的料，四份卡池 md/卡牌特性整合表/数值表/机制总表'
       '全都没写过，按裁定完全删掉，保留副本+在 G.deck 顶替原对象与 tempCostCut 消费端(万剑归宗 A 列仍在用)；'
       '修 bug③续档不恢复生命/上限/金币——40_flow.js:224 三项写在同一行末尾被上一句 `//` 注释整段吞掉，'
       '续档后回落成 newState() 默认值(生命 60/金币 0)，拆行修好；'
       '排查「扣血牌是否等额转血怒」：结论是(探针 probe_hpcost.js/probe_rage_ex.js 实测)——hpCost 声明与实扣 60/60 一致、'
       '阴差扣血→血怒 36 条里 34 条等额、机制坐实(loseHp 只在 cardPlayWindow 内触发被动，窗口外 loseHp(3)→血怒+0)；'
       '三条例外：反震(30_engine.js:91)/业火(:92) 直写 G.hp 绕过 loseHp→0 血怒但仍喂 totalHpLost(喂嗜血/天雷正法)，属有意；'
       '怨气废牌回合末自动打出走 doPlayCard 算「打出」→阴差照样 +3 血怒；镇妖铃看似扣 3 却 +0 是它同一次打牌里自己 rageSpend 消耗了 3，设计内；'
       '另台上无敌人时 6 张阴差牌(火符/天雷正法/铁布衫/蚀魂咒/钟馗镇魂/镇妖铃)的 curEnemy() 提前 return 排在 loseHp 之前，'
       '卡面「失去 N 点生命」整段不执行，实战几乎不可达→挂账；'
       '40 张浮字按裁定只装 dmg 一档(素材/num/dmg/0-9.png 共 10 张，hurt/block/heal 源图齐备但不装)，'
       '四档接缝 v0.61.36 已铺好，交付即生效；'
       '冒烟 989→1003 全绿(改 27 条被 C 列打翻的旧断言 + 新增 21 条，含 3 个 bug 的行为对拍、续档三项回填、'
       '移形换影闪避结算、易物五条翻面 + 反误伤)；node --check 全绿、grep -n ",," 干净；'
       '更新日志的「现值→新值」对照表由 _patch/snapshot_pre.py 让 HEAD 版与工作区版各跑一遍卡面导出做真 diff 得出(53 条)，不凭记忆；'
       '版本号三处同步 v0.61.39；dist 重打、verify_dist 全绿；'
       '挂账：地图/关卡千年不变(只给了 plan，一行代码没动，用户要求之后再说)、hpCost 与 loseHp 无自动对拍、'
       '反震/业火断血怒与怨气给血怒是否要改(等裁定)、台上无敌人 6 张牌不扣血、根目录四份陈旧文档、素材清单 §1.6')
c = run([sys.executable, '提交.py', '-m', MSG])
print('--- 提交.py ---')
print((c.stdout or '').strip()[-1500:])
if c.returncode != 0:
    print((c.stderr or '').strip()[-1500:])
    sys.exit(1)
print('--- git log ---')
print((run(['git', 'log', '--oneline', '-3']).stdout or '').strip())

# ── 5. 提交后工作区是否干净（只本地，不 push）──
st2 = run(['git', '-c', 'core.quotepath=false', 'status', '--porcelain'])
left = [l for l in (st2.stdout or '').splitlines() if l.strip()]
print('提交后剩余未提交改动：', left or '（干净）')
print('本地领先 origin：', (run(['git', 'rev-list', '--count', 'origin/main..HEAD']).stdout or '').strip())