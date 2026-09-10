# -*- coding: utf-8 -*-
# ⑤⑥ 日志左栏长条 + 战斗界面布局重构（原型.html）
#  HTML 骨架 field/log/col-main；CSS 敌人透明右靠分级错落；log 全历史；回合起始行。
import io, sys, subprocess, tempfile, os, re

P = r"C:\Users\HP\Desktop\志怪塔\原型.html"
s = io.open(P, 'r', encoding='utf-8').read()

EDITS = []

# ============ HTML 骨架：把原 战斗/手牌/行动/提示/召唤/总结/log 包进 #field(#log + #col-main) ============
EDITS.append((
"""  <div class="battle">
    <div id="player-panel"></div>
    <div id="enemy-panel"></div>
  </div>
  <div class="hand-area">
    <div class="rune-display" id="rune-display">
      <img src="素材/rune.png" class="rune-icon" onerror="this.style.display='none';this.nextElementSibling.style.display='block';">
      <span class="rune-fallback">◆</span>
      <span class="rune-count" id="rune-count">3</span>
    </div>
    <div id="hand"></div>
  </div>
  <div id="actions">
    <button class="btn ghost" id="viewDeck">牌库</button>
    <button class="btn ghost" id="menuBtn">菜单</button>
    <button class="btn" id="endTurn">结束回合</button>
  </div>
  <div class="hint">点击/上拖出牌 · 攻击牌按住拖箭头指向敌人 · 长按卡牌放大描述 · 空格=结束回合 · 悬停金色词看说明</div>
  <div id="summon-panel"></div>
  <div id="turn-summary"></div>
  <div id="log"></div>
""",
"""  <div id="field">
    <div id="log"></div>
    <div id="col-main">
      <div class="battle">
        <div id="player-panel"></div>
        <div id="enemy-panel"></div>
      </div>
      <div id="summon-panel"></div>
      <div id="turn-summary"></div>
      <div class="hand-area">
        <div class="rune-display" id="rune-display">
          <img src="素材/rune.png" class="rune-icon" onerror="this.style.display='none';this.nextElementSibling.style.display='block';">
          <span class="rune-fallback">◆</span>
          <span class="rune-count" id="rune-count">3</span>
        </div>
        <div id="hand"></div>
      </div>
      <div id="actions">
        <button class="btn ghost" id="viewDeck">牌库</button>
        <button class="btn ghost" id="menuBtn">菜单</button>
        <button class="btn" id="endTurn">结束回合</button>
      </div>
      <div class="hint">点击/上拖出牌 · 攻击牌按住拖箭头指向敌人 · 长按卡牌放大描述 · 空格=结束回合 · 悬停金色词看说明</div>
    </div>
  </div>
"""))

# ============ CSS ============
# A #app 加宽给左日志+右战场留位
EDITS.append((
"""  #app{max-width:900px; margin:0 auto; padding:14px 14px 30px; position:relative; z-index:1;}""",
"""  #app{max-width:1060px; margin:0 auto; padding:14px 14px 30px; position:relative; z-index:1;}"""))

# B 引入 #field/#col-main 两栏容器
EDITS.append((
"""  .battle{display:flex; gap:14px; align-items:flex-end; margin-bottom:10px;}""",
"""  #field{display:flex; gap:14px; align-items:flex-start;}
  #col-main{flex:1 1 auto; min-width:0;}
  .battle{display:flex; gap:14px; align-items:flex-end; margin-bottom:10px;}"""))

# C 敌人区：右靠 + 纵向往下错落（row-reverse 令首敌/Boss 贴最右）
EDITS.append((
"""  #enemy-panel{display:flex; flex-direction:row; flex-wrap:wrap; gap:10px; flex:1 1 auto; min-width:0; align-items:flex-start;}""",
"""  #enemy-panel{display:flex; flex-direction:row-reverse; flex-wrap:wrap; justify-content:flex-start; align-items:flex-end; gap:24px 30px; flex:1 1 auto; min-width:0; padding:2px 2px 0;}"""))

# D .enemy 去外框：透明竖排居中容器；按阶设容器宽度/立绘高度
EDITS.append((
"""  .enemy{background:var(--ink2); border:2px solid var(--ink3); border-radius:10px; padding:12px; cursor:pointer; transition:border .1s, box-shadow .1s; flex:1 1 170px; min-width:160px; max-width:230px;}""",
"""  .enemy{background:transparent; border:none; border-radius:0; padding:0; cursor:pointer; display:flex; flex-direction:column; align-items:center; text-align:center; flex:0 0 auto; min-width:0; transition:filter .12s ease; -webkit-tap-highlight-color:transparent;}
  .enemy.e-summon{width:58px;}
  .enemy.e-normal{width:118px;}
  .enemy.e-elite{width:170px;}
  .enemy.e-boss{width:216px;}
  .enemy .eportrait.e-summon{height:56px;}
  .enemy .eportrait.e-normal{height:120px;}
  .enemy .eportrait.e-elite{height:170px;}
  .enemy .eportrait.e-boss{height:220px;}
  .enemy .enemyhpbar{width:86px;}
  .enemy.e-elite .enemyhpbar{width:124px;}
  .enemy.e-boss .enemyhpbar{width:168px;}"""))

# E 选中/受击反馈改“立绘发光”
EDITS.append((
"""  .enemy.selected{border-color:var(--gold); box-shadow:0 0 8px rgba(224,179,65,.35);}""",
"""  .enemy.selected .eportrait{filter:drop-shadow(0 8px 16px rgba(0,0,0,.6)) drop-shadow(0 0 14px rgba(224,179,65,.6)) brightness(1.12);}
  .enemy.selected .ename{color:#ffd76a;}"""))

# F 徽章配色追加 🎯阴兵目标
EDITS.append((
"""  .badge.curse{color:#c86bd8;} .badge.charm{color:#e06b9b;} .badge.strength{color:#e08b3a;} .badge.seal{color:#3ac0c0;} .badge.thorns{color:#e06b6b;} .badge.affix{color:#e0b060;}""",
"""  .badge.curse{color:#c86bd8;} .badge.charm{color:#e06b9b;} .badge.strength{color:#e08b3a;} .badge.seal{color:#3ac0c0;} .badge.thorns{color:#e06b6b;} .badge.affix{color:#e0b060;} .badge.ybtarget{color:#ffd76a; border-color:rgba(255,215,106,.7); background:rgba(255,215,106,.12);}"""))

# G 日志改左栏长条（高随视口、内部滚动、粘顶）
EDITS.append((
"""  #log{min-height:72px; max-height:96px; overflow-y:auto; background:var(--ink2); border:1px solid var(--ink3); border-radius:10px; padding:8px 12px; margin-bottom:12px; font-size:12px; color:var(--dim); line-height:1.7;}""",
"""  #log{flex:0 0 236px; min-width:0; height:clamp(360px, calc(100vh - 190px), 660px); overflow-y:auto; background:var(--ink2); border:1px solid var(--ink3); border-radius:10px; padding:10px 12px; font-size:11.5px; color:var(--dim); line-height:1.6; box-sizing:border-box; position:sticky; top:8px; word-break:break-word;}
  #log .log-head{color:var(--gold); font-family:var(--font-kai); font-size:14px; letter-spacing:2px; margin-bottom:6px; border-bottom:1px solid var(--ink3); padding-bottom:4px;}
  #log .log-sep{color:#e0b060; font-weight:bold; margin:5px 0 2px;}"""))

# H 拖拽到敌人 = 立绘红光
EDITS.append((
"""  .enemy.drag-target{border-color:#ff6a3c; box-shadow:0 0 14px rgba(255,106,60,.55);}""",
"""  .enemy.drag-target .eportrait{filter:drop-shadow(0 8px 16px rgba(0,0,0,.6)) drop-shadow(0 0 16px rgba(255,106,60,.75)) brightness(1.15);}"""))

# I 立绘：去掉 width:100%（由容器/本体自然撑宽、按阶定高）
EDITS.append((
"""  .eportrait{width:100%; height:120px; object-fit:contain; object-position:bottom center; border-radius:0; margin-bottom:2px; background:transparent; display:block; filter:drop-shadow(0 6px 12px rgba(0,0,0,.55));}
  .eportrait.e-summon{height:64px;}
  .eportrait.e-normal{height:120px;}
  .eportrait.e-elite{height:150px;}
  .eportrait.e-boss{height:180px;}""",
"""  .eportrait{width:auto; height:120px; max-width:100%; object-fit:contain; object-position:bottom center; border-radius:0; margin-bottom:2px; background:transparent; display:block; filter:drop-shadow(0 6px 12px rgba(0,0,0,.55));}"""))

# J 移动端(≤520)：敌人容器/立绘/血条按比例缩（去内边距规则，换 gap）
EDITS.append((
"""    #enemy-panel .enemy{padding:6px 8px;}
    .enemy .eportrait{height:80px;}
    .enemy .eportrait.e-summon{height:48px;}
    .enemy .eportrait.e-elite{height:110px;}
    .enemy .eportrait.e-boss{height:130px;}""",
"""    #enemy-panel{gap:12px 14px;}
    .enemy .eportrait.e-normal{height:84px;}
    .enemy .eportrait.e-summon{height:40px;}
    .enemy .eportrait.e-elite{height:118px;}
    .enemy .eportrait.e-boss{height:150px;}
    .enemy.e-normal{width:88px;}
    .enemy.e-elite{width:118px;}
    .enemy.e-boss{width:150px;}
    .enemy .enemyhpbar{width:62px;}
    .enemy.e-elite .enemyhpbar{width:88px;}
    .enemy.e-boss .enemyhpbar{width:112px;}"""))

# K 中屏(≤760)：field 竖排，日志排到战场下方
EDITS.append((
"""  @media (max-width:360px){""",
"""  @media (max-width:760px){
    #app{max-width:100%;}
    #field{flex-direction:column; gap:8px; align-items:stretch;}
    #field #log{order:2; flex:none; width:100%; height:150px; max-height:150px; position:static;}
    #field #col-main{order:1;}
  }
  @media (max-width:360px){"""))

# ============ JS ============
# L log 上限 40 → 800（保留全部历史回合）
EDITS.append((
"""function log(msg){ if(!G) return; G.log.push(msg); if(G.log.length>40) G.log.shift(); }""",
"""function log(msg){ if(!G) return; G.log.push(msg); if(G.log.length>800) G.log.shift(); }"""))

# M 每个回合开始写一行分隔（startTurn 内，紧接回合横幅）
EDITS.append((
"""  G.turnStats={dmgTaken:0, blocked:0, dealt:0, kills:[]};
  turnBanner('第 '+G.turn+' 回合');""",
"""  G.turnStats={dmgTaken:0, blocked:0, dealt:0, kills:[]};
  turnBanner('第 '+G.turn+' 回合');
  log('—— 第 '+G.turn+' 回合开始 ——');"""))

# N enemyPanelHTML：计算错落抬升量（首敌/Boss 为 0 最低）
EDITS.append((
"""  const selected = (e===curEnemy());""",
"""  const selected = (e===curEnemy());
  const RISE=[0,26,14,38,22]; const liftY=(idx>=0?RISE[idx%RISE.length]:0); // 纵深错落：Boss/首敌最低(0)，右→左逐级抬高"""))

# O enemyPanelHTML：容器带上 eSize 类 + 内联 translateY 抬升
EDITS.append((
"""  return `<div class="enemy ${selected?'selected':''} ${e.dying?'dying':''} ${HITFX.enemies.has(e)?'hit':''}" data-uid="${e.uid}" onclick="selectTarget(${idx})">""",
"""  return `<div class="enemy ${eSize} ${selected?'selected':''} ${e.dying?'dying':''} ${HITFX.enemies.has(e)?'hit':''}" data-uid="${e.uid}" onclick="selectTarget(${idx})" style="transform:translateY(-${liftY}px)">"""))

# P 渲染日志：全历史 + 标题 + 回合分隔行 + 滚动到底
EDITS.append((
"""  document.getElementById('log').innerHTML=G.log.slice(-8).map(x=>'· '+x).join('<br>');""",
"""  const _logBox=document.getElementById('log');
  if(_logBox){ _logBox.innerHTML='<div class="log-head">⚔ 战报</div>'+G.log.slice(-600).map(x=>x.indexOf('——')===0?('<div class="log-sep">'+x+'</div>'):x).join(''); _logBox.scrollTop=_logBox.scrollHeight; }"""))

for i, (old, new) in enumerate(EDITS):
    n = s.count(old)
    if n != 1:
        print('EDIT #%d FAIL: 匹配 %d 次（期望 1）' % (i+1, n)); sys.exit(1)
    s = s.replace(old, new)

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('PATCH b4_layout DONE: %d 处替换成功' % len(EDITS))

mm = re.search(r'<script>([\s\S]*?)</script>', s)
if not mm:
    print('FAIL: 找不到 <script>'); sys.exit(1)
js = mm.group(1)
fd, tmpp = tempfile.mkstemp(suffix='.js')
os.write(fd, js.encode('utf-8')); os.close(fd)
r = subprocess.run(['node', '--check', tmpp], capture_output=True, text=True)
os.unlink(tmpp)
if r.returncode != 0:
    print('NODE_FAIL:'); print(r.stderr); sys.exit(1)
print('NODE_OK (%d chars)' % len(js))
