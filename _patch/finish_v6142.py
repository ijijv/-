# -*- coding: utf-8 -*-
"""v0.61.42 收尾：冒烟 → 打包校验 → 白名单校验 → 提交（本地，不 push）。

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

# ── 2. 重建产物 + 校验（本轮改了 js/*.js 与 原型.html，必须重打）──
pk = run([sys.executable, '打包.py'])
print('--- 打包.py 尾 ---')
print((pk.stdout or '').strip()[-400:])
if pk.returncode != 0:
    print((pk.stderr or '').strip()[-800:])
    sys.exit(1)
vd = run([sys.executable, os.path.join('_patch', 'verify_dist.py')])
print('--- verify_dist.py 尾 ---')
print((vd.stdout or '').strip()[-700:])
if vd.returncode != 0:
    print((vd.stderr or '').strip()[-800:])
    print('!! 产物校验未通过，收尾中止')
    sys.exit(1)

# ── 3. 白名单（防 git add -A 把杂物带进提交；-uall 让未跟踪目录展开成文件逐个核对）──
ALLOW = {
    '原型.html', '更新日志.md',
    'js/00_base.js', 'js/20_data.js', 'js/40_flow.js', 'js/50_ui.js', 'js/60_boot.js',
    '_patch/smoke_runner.js', '_patch/verify_dist.py',
    # 本批的收尾脚本（留作可复现证据）
    # 注：本批是直接改的源码与更新日志，没有生成 patch_v6142_*.py，故不列
    '_patch/finish_v6142.py',
}
ALLOW_PREFIX = ('素材/',)

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
    if path not in ALLOW and not path.startswith(ALLOW_PREFIX):
        bad.append(l)
if bad:
    print('!! 有白名单外的改动，未提交：')
    for l in bad:
        print('   ', l)
    sys.exit(1)

# ── 4. 提交（提交.py 自己从 原型.html 读版本号做前缀；本地不 push）──
MSG = ('地图路径回到代码自绘（二次贝塞尔弧 + 通关后淡黄光边沿路径延长）+ 图标随机落位/2~3 条初始路线/少分叉'
       '+ 修「地图背景怎么没有改」（#overlay 黑幕 + 不透明面板把背景压成一片黑）+ 浮字正负号配色对齐数字；'
       '【地图背景没改的真因 · 代码级核实】地图页渲染进 #overlay，而 #overlay 老样式是 rgba(10,8,6,.88) 的 88% 近黑全屏幕布、'
       '它里面的 .panel 又是完全不透明的 var(--ink2)；#bg 在 z-index:0、#overlay 在 10 ⇒ 叠出来 0.12×背景+0.88×(10,8,6)≈(14,12,11) 等于纯黑，'
       '换哪张图都一样黑 —— 图在 v0.61.41 就装好了且游戏确实在请求，是被盖住的；'
       '修法：给 #overlay 加 .map-scene（showMap 在 showOverlay **之后**加，showOverlay 开任何面板前先 remove）'
       '⇒ 地图页黑幕 .88→.22、面板改 rgba(12,9,7,.30)、overlayWrap 放宽到 720px，其余面板保持原深色底；'
       '.map-node .node-label 补 text-shadow（小字压在照片上）；'
       '⚠️ 这是代码级核实不是「我看着用户屏幕确认的」，若仍黑则下一个嫌疑是浏览器缓存/看的不是新产物；'
       '【浮字正负号】根因是两条渲染路不一致：数字是 PNG 颜色烤死在图里（PIL 实测主色簇 #ff3c02/#cc0a00/#059fff/#06c603），'
       'numHTML（拖拽预伤害）本来就包 .fx-sign，而 numAppend（飘字）只塞 createTextNode 裸文本 ⇒ 继承 .fx-dmg 的文字色'
       '（#ff7b5a/#ff4b4b/#7fb0d8/var(--green)）与 PNG 填充色色相同、明度差一截 ⇒ 用户报的突兀；'
       '修法：numAppend 的符号也包 .fx-sign，配色交给 CSS 四条 .fx-dmg .fx-sign 分档规则 + #drag-dmg .fx-sign 恒 dmg 档，'
       '盒子几何与 .fx-num 数值完全对齐（同 height:1.15em/同 vertical-align:-.18em）；'
       '不加黑描边（实测近黑像素占比≤0.04%，四档最暗像素都是自己色相的暗部 hurt#770000/heal#005900/dmg#b22102/block#16285a，是内渐变非描边）；'
       '⚠️ 配色 PIL 实测、基线几何是按数值推的没在真浏览器逐像素量过；'
       '【路径】v0.61.41 的道路贴图退役（MAP_ROAD_ICON 整表删），改回代码自绘：每条边是 SVG 二次贝塞尔弧 mapArcD'
       '（控制点沿垂直方向偏移⇒永不画直线；弯曲方向与大小由两端坐标哈希 mapArcBow 定、夹在 0.45~1.00 绝不接近 0⇒每条边都看得出弧、'
       '同一条边每次画都弯同一边不会闪；外凸量 min(距离×0.14,42px) 夹住不让弧线窜出面板）；'
       '生长动画：刚打通的那条边挂 .link-new，取 getTotalLength 写进 CSS 变量 --len，@keyframes mapGlowGrow 把 stroke-dashoffset 从 len 收到 0'
       '⇒ 淡黄光边从下往上沿弧线延展；降级：拿不到长度就**不加** .link-new 只留 .link-past 浅光边，观感依然对（不会变虚线或看不见）；'
       '只放一次：goNext 是全仓唯一 G.mapRow++ 出口，它把刚打通的边写进 _mapGlowEdge，drawMapLinks 画完消费；'
       '重开地图/续档/换幕/resize 都不放动画；顺带修边界：drawMapLinks 量不到坐标会提前 return 而不清标记 ⇒ '
       '推帧闭包里补一次 _mapGlowEdge=null（否则旧边会留到下次打开地图才生长）；'
       '【落位与形状】MAP_SLOT_N=5 槽位表 MAP_SLOT_PCT=[8,29,50,71,92]，每格随机占一槽 + ±4% 横向/±7px 纵向抖动'
       '（槽间距 21% 是抖动上限 8% 的两倍以上⇒绝不越槽）；pickSlots 洗牌后取前 n 个**再升序**⇒列序=槽位序，'
       'linkRows 的「边不交叉」性质靠它保住；mapNodeStyle 出内联 left%/top px，showMap 四档分支全带上（老档/手造 fixture 无 sx 时兜底居中槽）；'
       'ROW_SHAPE 改成基本只收不放：第 1 层恒 2~3 格（旧形状 [1,2] 实测 40 种子里 17 个只有 1 格=开局没得选）；'
       '实测 3 幕×40 种子：首层 2:51/3:69、单格最多分 2 条（旧形状有一次分 4 条的「路口爆开」）、分叉节点≤3、分叉层≤3、层宽 1~3、节点 29~33；'
       '末层 Boss 居中且零抖动（要收拢所有路线，摆边上会拉出很斜的长线）；'
       '落位用生成器自带 mkRng，不碰全局 rng（断言钉住 genAct 前后 rngSnapshot() 完全不变，否则 ?seed=N 复现与续档牌序会整体错位）；'
       '【验证】冒烟 1103→1152 全绿（新增 42 条：落位表两处一致/mapNodeStyle 兜底/形状五项实测/'
       'mapArcD 与 mapArcBow 纯函数对拍（竖直边控制点横向偏移、外凸夹紧≤42、退化<4px 返回空串、有向 key）'
       '/.fx-sign 行为级验证——临时把 NUM_STATE/NUM_IMG 灌成可用并把 createElement/Image 换成记录器，真的看见它造出 1×fx-sign(span)+2×fx-num(img)'
       '/goNext 端到端写出 0,0>1,0、mapPath 短于 2 时不硬凑）；'
       '⚠️ 写断言时踩的两个坑：①showOverlay 在 smoke_runner.js:14 已被顶成空桩⇒要新捕获 __realShowOverlay 才看得到「摘 .map-scene」；'
       '②Function.toString() 会把注释算进去⇒「赋值次数」「不含 createTextNode」这类计数断言会被自己写的注释判红，改成只匹配代码形态；'
       'verify_dist.py 三处：地图图标清单 9→7（两条道路贴图退役，Map_ROAD_ICON 变 undefined 会让这行求值直接抛错）、'
       '把 map/path-left.png 与 path-right.png 从「从未被请求」提示里显式排除（免得诱导以后真去删用户的素材）、'
       '新增产物必须保留 .map-scene / mapGlowGrow / .fx-sign 三条 CSS（冒烟不读文件，CSS 被误删只能在这里拦）；'
       'node --check 全绿、grep -n ",," 干净、版本三处同步 v0.61.42、dist 重打 + verify_dist 全绿；'
       '清理：删掉 _patch/_bg_act1_small.png、_bgcrop_1600.png、_bgcrop_1920.png 三个用完即删的裁图诊断件；'
       '素材：map/path-left.png 与 path-right.png **保留未删**（用户的素材不擅自删），只是游戏不再请求；'
       '挂账（未做，不谎报）：精英密度（等用户拍板）、窄行导致路线选择变少/篝火商店更难绕到、隐藏层仍露出地图形状（v0.61.41 遗留的取舍）、'
       '根目录四份陈旧文档（数值表.md v0.43 / 角色机制说明.md / 角色机制详细指南.md / 卡牌机制数据总表_v047.md）、'
       '《素材清单.md》§1.6 少标 43 个 ✅、两对重复音效（hit_guard_1≡kw_shield_break_1、card_1≡card_discard_2，用户说先别动）、'
       '素材/num/ 字形高 179~296px 且同档内宽度不等')
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