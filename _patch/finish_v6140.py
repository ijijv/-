# -*- coding: utf-8 -*-
"""v0.61.40 收尾：冒烟 → 打包校验 → 白名单校验 → 提交（本地，不 push）。

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
print('v0.61.40 计数:', rep.get('v6140'))
for e in (rep.get('errors') or []):
    print('  X', e)
if not rep.get('ok'):
    print('!! 冒烟未全绿，收尾中止')
    sys.exit(1)

# ── 2. 重建产物 + 校验（本轮改了 js/*.js 与 原型.html，必须重打）──
pk = run([sys.executable, '打包.py'])
print('--- 打包.py 尾 ---')
print((pk.stdout or '').strip()[-400:])
if pk.returncode != 0:
    print((pk.stderr or '').strip()[-800:])
    sys.exit(1)
vd = run([sys.executable, os.path.join('_patch', 'verify_dist.py')])
print('--- verify_dist.py 尾 ---')
print((vd.stdout or '').strip()[-600:])
if vd.returncode != 0:
    print((vd.stderr or '').strip()[-800:])
    print('!! 产物校验未通过，收尾中止')
    sys.exit(1)

# ── 3. 白名单（防 git add -A 把杂物带进提交；-uall 让未跟踪目录展开成文件逐个核对）──
ALLOW = {
    '原型.html', '更新日志.md',
    'js/20_data.js', 'js/30_engine.js', 'js/40_flow.js', 'js/50_ui.js', 'js/60_boot.js',
    '_patch/smoke_runner.js',
    # 本批的改动脚本与收尾脚本（留作可复现证据）
    '_patch/patch_v6140_map.py', '_patch/patch_v6140_smoke.py',
    '_patch/patch_v6140_changelog.py', '_patch/patch_v6140_memory.py',
    '_patch/finish_v6140.py',
}

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
MSG = ('地图随机化：布局+树结构+敌人都随机（杀戮尖塔式自由分支图 + 逐层迷雾），'
       '不再展示每关信息与敌人数量，图标/背景留空槽；hpCost 自动对拍；反震/业火补 1:1 血怒；'
       '病根=20_data.js 的 ACT1 是写死的 14×4 字面量表（实际 30 格），第二/三幕是 swapMap 换敌人 key 的产物、'
       '拓扑逐格照抄，无尽是 genEndlessMap 换敌人留拓扑⇒「地图千年不变」是真的；'
       '新模型 MAP[r][c]={t,e,next,prev}（保留二维数组⇒40_flow/60_boot/50_ui 三处零改动），'
       't 新增 elite 独立类型（旧图精英是 fight 里混精英 key；e 仍在⇒startBattle/winFight/rollAffixes 零改动）；'
       '生成器 genAct(act,seed)+buildActs+mkRng/deriveSeed/bandBounds/linkRows/assignTypes，'
       '连边按构造保证不交叉（i<i\'⇒j<=j\'，旧 |Δc|<=1 规则本身是交叉的，不是「保持现状」是真修好）、无死路、无孤岛、人人能到 Boss；'
       'ELITES_BY_ACT/BOSS_POOL 从 50_ui.js 搬进 20_data.js（搬移非复制：同作用域重复 const 同名=整个脚本 SyntaxError 白屏，'
       '且 genAct 在 20_data 顶层就调用，那时 50_ui 未执行⇒TDZ）；'
       '铁律「生成器绝不碰全局 rng」（?seed=N 复现 + continueRun 先 rngRestore 再重建地图，吃主随机流会让牌序/奖励/词缀整体错位），'
       '冒烟有 rngSnapshot() 前后不变的断言钉死；'
       '实测（新旧图各 200 种子）：节点 30→28~37（均值32.6）、有分支的层 8~13（均值10）、篝火/商店恒 2/2、未知 3→5/4/3；'
       '⚠️ 精英密度没做到 plan 写的「对齐旧图」——配额 2/3/4（act1=2=旧图）但同一条「其余战斗节点 6% 升精英」'
       '把实测拉到 act1 3.21（2~7）/act2 4.05（3~8）/act3 5.21（4~9），约旧图 1.6 倍，已如实写进更新日志并给了两选项（撤6%⇒恒2/3/4），按已批准 plan 先留着；'
       'UI：fogTier 四档（past/choice/preview/hidden）、隐藏格复用 .map-node.empty 仍占位（高度恒定不抖，nodeAt 第一件事仍排除 .empty——它有尺寸、'
       '隐藏格不能换 class 名）、data-r/data-c 属性查询取代 cells[c] 位置法（不等宽后唯一会炸处）、'
       '只画三种线且两端都须 fogVisible（否则一条暗线泄露未解锁层拓扑）、nodeLabel 表驱动不再显示「⚔ 战斗×N」与敌人名'
       '（精英保留为独立类型=路线决策输入，副产物 nodeLabel 从此不碰 ENEMIES）、'
       'NODE_ICON 六键全空串 + MAP_BG{1..3,endless:\'act3\'}（必须显式给 endless，否则 act4 404 丢背景图）=留空槽，用户给图后只改这两张表、逻辑一行不动；'
       'chooseNode 补可达性二次校验（旧代码靠「只把可达节点渲染成 button」隐式限制）；'
       '存档 v2→v3 只加 mapSeed（MAP 一律不落盘）：新档逐字节复现三幕图且保留 mapCol/mapPath，'
       '旧档铸新种子+mapCol=-1/mapPath=[] 降级（不丢进度/不软锁/不崩），不改 RUN_KEY 否则「继续上次爬塔」永久消失；'
       'hpCost 与 loseHp 自动对拍（此前 0 条断言）：①逐张×逐英雄×两档 decl===实扣（doPlayCard(0) 量真实 G.hp 差，不能用 playCard——会先弹「以命相搏」）60 条漂移 0；'
       '②静态扫源码 + hpCost 卡恰 18 张；③空场白名单（直接调 c.eff，走 doPlayCard 会被当场判胜回 8 血）白名单恰 12 条全 0 扣、其余 48 条照扣；'
       '⚠️ 写这条时踩了自己的坑：hpCost 多半是 G.hero===\'yincha\'?N:0，必须先 __setup 摆好 G.hero 再读，我第一版读早了⇒读到上一轮英雄⇒'
       '凭空造出「赶尸人/天师 火符 decl=2 实扣=0」的假红，是测试写错不是代码错；另加「18 张每张至少在一个英雄列声明>0」防「改成恒 0」式假绿、'
       '「白名单恰 12 条+非白名单侧非空」防空集空转；'
       '反震/业火补成 1:1 转血怒：保持直写 G.hp 不变只补 if(G.hero===\'yincha\') gainRage(r)、不设 cardPlayWindow 门槛；'
       '不改成调 loseHp 的理由=它会连带触发血契加格挡+诅咒/舍身诅咒/血祭武装一整串「打出扣血牌」专属联动，'
       '而反震/业火是敌人反击不是「你打出了扣血牌」，且 loseHp 没有 Math.max(0,…) 下限（改它会让你在自己回合因反震暴毙、被 loseGame 抢走结算）；'
       '回答用户两问（已写进更新日志）：①台上无敌人时 6 张阴差牌不扣血=实战永远看不到（敌人全灭瞬间 winFight 就结束战斗，'
       '你根本没有再出一张牌的机会），用户「玩的时候没感觉」是正常的，不改（把 loseHp 挪到守卫前是更差的：空场白扣血、牌却什么也没做），只用白名单断言冻住；'
       '②四份陈旧文档=从代码导出的一次性快照，单栏卡池演进到四列时没有同步机制；《素材清单.md》§1.6 的错不是「标了 ✅ 却没交付」而是反方向——'
       '磁盘 69 键全有文件只标了 26 个 ✅ 少标 43 个，真正「标 ✅ 却重复」只有两处（hit_guard_1≡kw_shield_break_1 md5 851b30e8… 4862B、'
       'card_1≡card_discard_2 md5 4617703a… 5390B）；'
       '冒烟 1003→1073 全绿（新增 70 条：生成器不变量 3幕×20种子/不交叉/无死路/无孤岛/人人到 Boss/配额/'
       '端到端走完 13 层(3幕×12种子、只看 mapReachable 选路、步数恰 468，证明任何图任何种子都不会把人卡在地图页)/可复现/不消耗全局 rng/池子⊆无尽池/'
       '换幕表无缺键/迷雾四档+防泄露+防软锁/留空槽/旧档迁移不丢进度/新档逐字节复现/chooseNode 二次校验/hpCost 三组/反震业火对拍）；'
       'node --check 全绿、grep -n ",," 干净、版本三处同步 v0.61.40、dist 重打 + verify_dist 全绿；'
       '挂账：地图节点图标/背景素材（留空槽，用户给图后只改 NODE_ICON/MAP_BG）、地图视觉动效打磨、精英密度（见上，等用户发话）、'
       '窄行导致路线选择变少/篝火商店更难绕到（随机化的结构代价）、根目录四份陈旧文档、《素材清单.md》§1.6、两对重复音效（用户说先别动）')
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