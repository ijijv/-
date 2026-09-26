# -*- coding: utf-8 -*-
"""v0.61.41 收尾：冒烟 → 打包校验 → 白名单校验 → 提交（本地，不 push）。

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
    'js/00_base.js', 'js/10_audio.js', 'js/20_data.js', 'js/50_ui.js', 'js/60_boot.js',
    '_patch/smoke_runner.js', '_patch/verify_dist.py',
    # 本批的改动脚本与收尾脚本（留作可复现证据）
    # 注：更新日志与记忆本批是直接改的，没有生成 patch_v6141_changelog/memory 脚本，故不列
    '_patch/patch_v6141_mapui.py', '_patch/patch_v6141_smoke.py',
    '_patch/finish_v6141.py',
}
# 素材是用户交付物，本批新增 40 个文件（9 图标 + 1 背景 + 30 张数字图）——整目录放行，
# 但打包 + verify_dist 已经保证了「磁盘 ⊆ 产物」，所以这里放行不等于放任。
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
MSG = ('地图视觉用上用户交付的素材（9 张节点/道路图标 + 地图背景 jpg + 去掉原边框与代码自绘道路）'
       '+ 未知关卡去掉三选一直入随机 + 浮字四档全装且拖拽预伤害共用同一套字形 + 敌人数量随层数走'
       '+ 修 洗髓经「卡面 3/4 回合、实际恒 3」的漂移；'
       '【地图素材】素材/map/ 新收 9 张（combat/ellite/unknown/rest/shop/boss + locked + path-left/right，'
       '按用户原图命名、含其 ellite 拼法不改名；均 256×256 RGBA 四角全透明）；'
       'NODE_ICON 六键填满、NODE_ICON_LOCKED=locked.png，未解锁/预览档改挂 locked.png（不再留白也不再是 ? 剪影）；'
       '.map-node 的 border/background/padding/min-width:96px/border-radius 全清（去边框），图标 56/46/42px 三档、'
       '窄屏 52→40→34 递减、min-height 全改 0（图标自带高度，再留 min-height 会撑出空档）；'
       '节点文案去掉 emoji 前缀（类型交给图标说）；'
       '素材/bg/bg_map.jpg（用户给的 1295×3238）+ MAP_BG 四档全指向 map.jpg + setBg 抽出 bgRel(name)；'
       '道路：.map-lines 由 <svg> 改 <div> 贴 <img class="map-road">，createElementNS 整段删，'
       '按两点夹角 atan2 旋转对齐（贴图本身是 ±45° 斜路⇒用 ang∓45°）、dx<0 取 path-left、'
       '长度 clamp(42,距离×0.72,200)，三种线语义 dim/reach/past 改用 CSS filter（灰度/sepia 烫金）不再改 stroke；'
       '⚠️ 图标一律走 artImg()/assetURL() 运行时请求 —— 打包.py 只内联静态 HTML 里的 src="素材/rune.png"，'
       '写死 素材/... 的图标在单文件产物里会全丢；'
       '【bgRel 的坑，已写成教训】第一版 python 侧镜像了这条规则且自由发挥成「带扩展名走原名」⇒ 算出 bg/map.jpg，'
       '而磁盘真名是 素材/bg/bg_map.jpg，是 verify_dist [1] 抓出来的；现改成 dump_ids 里 .map(bgRel) 在游戏作用域求值、'
       'python 零镜像，只钉一组样本 [menu,map.jpg,map.jpeg] 防规则被改坏；规则本身＝带扩展名只补 bg_ 前缀不补 .png；'
       '【未知关卡】删掉 overlay 三张卡面与 descs 表，rng() 直抽 8 条事件之一 → floatMsg 报一声 → doUnknown(ev)，'
       'doUnknown 与全部 unknown*() 处理器一行未动；'
       '【浮字】新增共用件 numSplit/numGlyphSrc/numAppend(DOM 路径)/numHTML(HTML 串路径)/numPrewarm；'
       'floatDamage 走 numAppend、showDragPreview(#drag-dmg 拖拽预伤害) 走 numHTML 档位取 dmg ⇒ 两者同一套字形，'
       '素材缺失或文本非纯数字时两处都原样回落文字；开局 numPrewarm() 预加载四档'
       '（探测异步，不预热则本局第一次飘字必然回落文字，而那一下恰是玩家最会盯着看的）；'
       '设置页新增「伤害飘字」状态行 + numSelfTest() 自检按钮（四档各放一次并摊开 NUM_STATE）、流畅模式说明补上会关掉飘字；'
       '查「装了 dmg 浮字却看不到」的两个实证结论：①最强嫌疑是流畅模式——floatDamage 首行 if(!fx()) return，'
       'fx()=!SETTINGS.lowSpec 落 localStorage zhiguaitower_settings_v1，旧版 applyLowSpec 唯一可见效果只有「震屏/抖动没了」，'
       '飘字被一起静默关掉毫无提示，开过一次就永远看不到且无从联想；'
       '②桌面上的「志怪塔 - 副本」目录是 v0.61.38 旧副本，它连 素材/num/ 都不存在⇒在那个副本里跑永远只有文字飘字；'
       '【敌人数量】原来一刀切 R()<0.65?3:2，改按层查表 ENEMY3_P3[14]=[0,0,0,0,.55,.6,.6,.65,.65,.85×5] + enemy3Chance(row)'
       '（越界/非数回落 0.65，无尽与老调用点不受影响）+ pickFightFrom(pool,R,row)，assignTypes 把层号 r 传进去 ⇒ '
       '每一幕前 4 层恒 0（最多 2 只）、第 9 层起 0.85（原 0.65）；实测 3 幕×12 种子全量扫：前 4 层最大 2 只、3 只出现 0 次，9 层起占比≈0.85；'
       '【洗髓经漂移】eff 原来对所有列硬写 G.xisuiTurns=3，而 B/C/D 三列卡面写「接下来 3/4 回合」⇒ 升级了仍只有 3 回合；'
       '改成 (G.hero===\'ganshiren\')?3:(u?4:3) 且飘字同步报真实数；逐列核过 md：武僧/天师/阴差 的「- 副本.md」第 69 行都是 3/4，'
       '赶尸人版「- 副本.md」第 69 行是「3 回合 · 1/2」= A 列代码与权威 md 一致（v0.61.37 定的固定 3 回合）'
       '⇒ 只有 B/C/D 是代码错，改代码不改 md；'
       '【焚符】用户已说不用改，代码未动；留底：阴差版卡池 - 副本.md:71 写的就是「每弃 1 张，恢复 3/4 滴血」，'
       '与 confirmDiscardSelect 的 heal(u?4:3) 一致，没有漂移；'
       '冒烟 1073→1118 全绿（新增 46 条、退役 1 条旧的「NODE_ICON 是留空槽」）：图标表 9 条指向真实文件名、artImg 走 assetURL、'
       'showMap 挂 locked.png 且不再渲染 .empty、道路无 createElementNS + dx<0 选左右 + atan2、bgRel 3 条、MAP_BG 四档、'
       'numSplit/numHTML/numAppend/numPrewarm 行为对拍、floatDamage↔numAppend 与 showDragPreview↔numHTML 接线、'
       'ENEMY3_P3 形状+越界回落+3幕×12种子全量扫、洗髓经四列×两档「卡面回合数=实际套上的回合数」+真能撑满 4 回合、'
       '未知关卡直入随机（rng 打桩抽到古井许愿⇒恰扣 8 血+遗物+1）；'
       '⚠️ 写断言时踩的坑：全局 floatDamage 在 smoke_runner.js:658 已被顶成记录桩 __sil，结构断言要用 __realFloatDamage 取真身；'
       'verify_dist.py：地图图标 9 条唯一性、bgRel 钉样本（python 零镜像）、want 去重、四档数字图从「N/40 交付进度」升级成硬闸；'
       'node --check 全绿、grep -n ",," 干净、版本三处同步 v0.61.41、dist 重打 15.63MB + verify_dist 全绿；'
       '清理：删掉 _patch/tmp_float_probe.js、tmp_float_rec.js、_dump_raw.txt 三个用完即删的诊断件；'
       '挂账：精英密度（v0.61.40 遗留，等用户发话）、窄行导致路线选择变少/篝火商店更难绕到、地图视觉动效打磨、'
       '根目录四份陈旧文档、《素材清单.md》§1.6 少标 43 个 ✅、两对重复音效（用户说先别动）、'
       '素材/num/ 字形高 179~296px 且同档内宽度不等（与 v0.61.36 的 64px 等宽画布规格不符，当前自适应所以视觉无碍）')
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