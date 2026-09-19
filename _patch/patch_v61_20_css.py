# -*- coding: utf-8 -*-
# v0.61.20 批3（手机端 / UI）—— 第一刀：样式与 DOM 骨架
# 覆盖计划里的 P1 结束回合软提示(DOM) / P2 地图连线(样式) / P5 日志筛选(样式) /
#                   P7 移动端敌人热区 / P8 条件引导气泡(样式) / P9 色弱微调
import io, sys, os

ROOT = r"C:\Users\HP\Desktop\志怪塔"
P = os.path.join(ROOT, '原型.html')
s = io.open(P, 'r', encoding='utf-8', newline='').read()
log = []

def sub(old, new, label):
    global s
    c = s.count(old)
    if c != 1:
        print('ANCHOR FAIL [%s] %d 次' % (label, c)); sys.exit(1)
    s = s.replace(old, new, 1); log.append(label)

# ============================================================
# P1 结束回合软提示：按钮外面套一层相对定位容器，气泡浮在按钮左侧
# ============================================================
sub('        <button class="btn" id="endTurn">结束回合</button>\n',
    '        <div class="endcol">\n'
    '          <div id="end-turn-hint" class="off"></div>\n'
    '          <button class="btn" id="endTurn">结束回合</button>\n'
    '        </div>\n',
    'P1 结束回合容器')

sub('  .hand-area #endTurn{flex:0 0 auto; align-self:center; writing-mode:vertical-rl; letter-spacing:5px; font-size:17px; padding:16px 10px; min-height:132px;}\n',
    '  .hand-area #endTurn{flex:0 0 auto; align-self:center; writing-mode:vertical-rl; letter-spacing:5px; font-size:17px; padding:16px 10px; min-height:132px;}\n'
    '  /* v0.61.20(P1)：结束回合软提示 —— 竖排按钮左侧浮一枚小气泡，不挡手牌也不弹窗 */\n'
    '  .hand-area .endcol{position:relative; flex:0 0 auto; align-self:center; display:flex; align-items:center;}\n'
    '  #end-turn-hint{position:absolute; right:calc(100% + 10px); top:50%; transform:translateY(-50%); white-space:nowrap; pointer-events:none;\n'
    '    background:rgba(24,18,12,.95); border:1px solid var(--gold); color:var(--gold); border-radius:8px; padding:6px 12px; font-size:12.5px; letter-spacing:1px;\n'
    '    box-shadow:0 4px 14px rgba(0,0,0,.55); animation:hintPulse 1.8s ease-in-out infinite;}\n'
    '  #end-turn-hint.off{display:none;}\n'
    '  #end-turn-hint::after{content:""; position:absolute; left:100%; top:50%; margin-top:-5px; border:5px solid transparent; border-left-color:var(--gold);}\n'
    '  #end-turn-hint b{color:#f0e0b8;}\n'
    '  @keyframes hintPulse{0%,100%{opacity:.78;} 50%{opacity:1;}}\n',
    'P1 结束回合气泡样式')

# ============================================================
# P2 地图路径连线：SVG 覆盖层（虚线=可走，金色=已走）
# ============================================================
sub('  .map-row{display:flex; justify-content:center; gap:12px; margin:10px 0;}\n',
    '  /* v0.61.20(P2)：地图路径连线 —— 行与行之间用 SVG 曲线连起来，已走=金色实线、可达=金色虚线、其余=暗线 */\n'
    '  .map-wrap{position:relative;}\n'
    '  .map-lines{position:absolute; left:0; top:0; width:100%; height:100%; pointer-events:none; overflow:visible; z-index:0;}\n'
    '  .map-lines path{fill:none; stroke-linecap:round;}\n'
    '  .map-lines path.link-dim{stroke:var(--ink3); stroke-width:2; opacity:.55;}\n'
    '  .map-lines path.link-reach{stroke:var(--gold); stroke-width:3; opacity:.9; stroke-dasharray:7 5; animation:linkFlow 1.1s linear infinite;}\n'
    '  .map-lines path.link-past{stroke:var(--gold); stroke-width:3.5; opacity:.95;}\n'
    '  @keyframes linkFlow{to{stroke-dashoffset:-24;}}\n'
    '  .map-row{position:relative; z-index:1; display:flex; justify-content:center; gap:12px; margin:10px 0;}\n',
    'P2 地图连线样式')

# ============================================================
# P5 战斗日志筛选 chip
# ============================================================
sub('  #log .log-sep{color:#e0b060; font-weight:bold; margin:5px 0 2px;}\n',
    '  #log .log-sep{color:#e0b060; font-weight:bold; margin:5px 0 2px;}\n'
    '  /* v0.61.20(P5)：战报筛选 chip（伤害 / 获得 / 状态），空选=全部 */\n'
    '  #log .log-head{display:flex; align-items:center; flex-wrap:wrap; gap:4px;}\n'
    '  #log .log-chips{margin-left:auto; display:flex; gap:3px;}\n'
    '  #log .log-chip{font-family:var(--font-kai); font-size:11px; letter-spacing:0; line-height:1.5; border:1px solid var(--ink3); background:transparent;\n'
    '    color:var(--dim); border-radius:10px; padding:1px 8px; cursor:pointer; user-select:none;}\n'
    '  #log .log-chip:hover{border-color:var(--gold); color:var(--gold);}\n'
    '  #log .log-chip.on{background:var(--gold); border-color:var(--gold); color:#241a10; font-weight:bold;}\n',
    'P5 日志筛选样式')

# ============================================================
# P7 移动端敌人热区 + P8 条件引导气泡 + P9 色弱微调
# ============================================================
sub('  .stat-hp i,.stat-block i,.stat-gold i{display:inline-block; width:10px; height:10px; border-radius:50%; margin-right:2px; vertical-align:middle;}\n'
    '  .stat-hp i{background:var(--red);}\n'
    '  .stat-block i{background:#5bb8d8;}\n',
    '  .stat-hp i,.stat-block i,.stat-gold i{display:inline-block; width:10px; height:10px; border-radius:50%; margin-right:2px; vertical-align:middle;}\n'
    '  .stat-hp i{background:var(--red);}\n'
    '  /* v0.61.20(P9)：色弱可辨 —— 格挡用「斜纹 + 方角」，血条用「纯色 + 圆点」。灰度打印/色弱下靠纹理与形状也能分开 */\n'
    '  .stat-block i{background:repeating-linear-gradient(45deg,#7fd0e8 0 2px,#2f7f9c 2px 4px); border-radius:2px;}\n',
    'P9 顶栏格挡图标')

sub('  .pstat-hp{color:#e8d9c4;} .pstat-hp i{background:var(--red);}\n'
    '  .pstat-block{color:#bfe6f5;} .pstat-block i{background:#5bb8d8;}\n',
    '  .pstat-hp{color:#e8d9c4;} .pstat-hp i{background:var(--red);}\n'
    '  .pstat-block{color:#bfe6f5;} .pstat-block i{background:repeating-linear-gradient(45deg,#7fd0e8 0 2px,#2f7f9c 2px 4px); border-radius:2px;}\n',
    'P9 玩家面板格挡图标')

sub('  #player-panel .hpbar.has-block .hpfill{background:linear-gradient(90deg,#5bb8d8,#3a9cc0,#7ad0f0); box-shadow:0 0 6px rgba(90,180,210,.4);}\n',
    '  /* v0.61.20(P9)：有格挡时血条套一层「斜纹护罩」纹理 —— 不再是纯色替换，灰度下仍看得出底下是血 */\n'
    '  #player-panel .hpbar.has-block .hpfill{background:repeating-linear-gradient(45deg,#5bb8d8 0 3px,#3a9cc0 3px 6px); box-shadow:0 0 6px rgba(90,180,210,.4);}\n',
    'P9 血条护罩纹理')

# P7：扩大敌人热区（触屏/窄屏才开，避免桌面上相邻敌人互相抢点击）
sub('  .enemy{background:transparent; border:none; border-radius:0; padding:0; cursor:pointer; display:flex; flex-direction:column; align-items:center; text-align:center; flex:0 0 auto; min-width:0; transition:filter .12s ease; -webkit-tap-highlight-color:transparent;}\n',
    '  .enemy{position:relative; background:transparent; border:none; border-radius:0; padding:0; cursor:pointer; display:flex; flex-direction:column; align-items:center; text-align:center; flex:0 0 auto; min-width:0; transition:filter .12s ease; -webkit-tap-highlight-color:transparent;}\n'
    '  /* v0.61.20(P7)：触屏下用伪元素把点击热区撑到 ≥120px 宽、上下各多 18px。\n'
    '     伪元素不参与 DOM，elementFromPoint 仍返回宿主 .enemy，所以 enemyAtPoint() 一行不用改。\n'
    '     只在 (pointer:coarse) 或窄屏生效 —— 桌面用鼠标，热区变大反而会让相邻敌人互相抢点击。 */\n'
    '  @media (pointer:coarse), (max-width:760px){\n'
    '    .enemy::after{content:""; position:absolute; left:50%; transform:translateX(-50%); top:-18px; bottom:-18px; width:max(100%,120px);}\n'
    '  }\n',
    'P7 敌人热区')

# P8 条件引导气泡样式 + 拖拽受击预览样式（P3 的元素在 60_boot 里动态建，这里只给样式）
sub('  #tut-hint b{color:#f0e0b8;}\n',
    '  #tut-hint b{color:#f0e0b8;}\n'
    '  /* v0.61.20(P8)：条件引导气泡 —— 首次遇到 诅咒/格挡/召唤物/尸气 各弹一次，可点掉、7 秒自动收 */\n'
    '  #tip-bubble{position:fixed; left:50%; bottom:150px; transform:translateX(-50%); z-index:32; max-width:min(560px,92vw);\n'
    '    background:rgba(24,18,12,.96); border:1px solid var(--gold); border-left:4px solid var(--gold); border-radius:10px; padding:10px 18px;\n'
    '    color:var(--text); font-size:14px; line-height:1.75; letter-spacing:1px; box-shadow:0 6px 22px rgba(0,0,0,.66); cursor:pointer;\n'
    '    opacity:0; transition:opacity .25s ease;}\n'
    '  #tip-bubble.show{opacity:1;}\n'
    '  #tip-bubble .tip-tag{display:inline-block; background:var(--gold); color:#241a10; border-radius:4px; padding:1px 8px; margin-right:8px; font-size:12px; letter-spacing:0; font-weight:bold;}\n'
    '  #tip-bubble b{color:#f0e0b8;}\n'
    '  /* v0.61.20(P3)：拖拽指向敌人时，目标头顶的受击预览（与卡面徽章同源的 previewDamage） */\n'
    '  #drag-dmg{position:fixed; z-index:34; pointer-events:none; font-family:var(--font-kai); font-size:30px; font-weight:bold; letter-spacing:1px;\n'
    '    color:#ff9a3c; text-shadow:0 0 12px rgba(0,0,0,.95), 0 2px 5px rgba(0,0,0,.9); transform:translate(-50%,-100%); transition:opacity .1s ease;}\n'
    '  #drag-dmg.weak{color:#8fc6ff;}\n'
    '  #drag-dmg.dyn{opacity:.9;}\n'
    '  #drag-dmg.off{display:none;}\n',
    'P8/P3 气泡与受击预览样式')

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('OK 原型.html')
for i, x in enumerate(log, 1): print('%2d. %s' % (i, x))
