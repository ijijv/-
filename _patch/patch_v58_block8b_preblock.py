# -*- coding: utf-8 -*-
# v0.58 Block8b：武僧「预格挡」概念 + 蓝色向上箭头 UI
#   预格挡 = 下一回合开始时，场上召唤单位将带来的预计格挡值（纸人/阴兵/五通神）
#   用于提前规划「这回合要不要留格挡给下回合的召唤物结算」
import io, sys, subprocess, tempfile, os, re

P = r"C:\Users\HP\Desktop\志怪塔\原型.html"
s = io.open(P, 'r', encoding='utf-8').read()
EDITS = []

# ---------- 1) CSS：预格挡（蓝色上箭头 + 数字），尺寸对齐格挡圆点(9px) ----------
EDITS.append((
""".pstat-block{color:#bfe6f5;} .pstat-block i{background:#5bb8d8;}""",
""".pstat-block{color:#bfe6f5;} .pstat-block i{background:#5bb8d8;}
  /* 预格挡：紧挨格挡标记的蓝色向上箭头，箭头 9×11px（与格挡圆点 9px 同宽，不抢视线） */
  .pstat-preblock{display:inline-flex; align-items:center; gap:2px; color:#8ed0ff; font-size:11px; line-height:1;}
  .pstat-preblock svg{display:block; width:9px; height:11px; filter:drop-shadow(0 0 3px rgba(74,168,255,.6));}"""))

# ---------- 2) 关键词：新增「预格挡」；格挡词条补武僧例外 ----------
EDITS.append((
"""  ['格挡','本回合临时抵消伤害。敌人攻击时先扣格挡；你下回合开始前，没用完的格挡会清零。'],""",
"""  ['格挡','抵消伤害的临时护盾：敌人攻击时先扣格挡，扣完才掉血。默认回合结束清零；苦行武僧未用完的保留最多 3 点，【卸甲】期间不清零。'],
  ['预格挡','下一回合开始时，场上召唤单位将为你带来的预计格挡值（格挡旁蓝色 ↑）。仅苦行武僧显示，用于提前规划攻防。'],"""))

# ---------- 3) 召唤物「回合开始格挡」单一出处 + 预格挡计算 ----------
EDITS.append((
"""function isSummon(type){ return G.summons.some(s=>s.type===type && s.dur>0); }""",
"""function isSummon(type){ return G.summons.some(s=>s.type===type && s.dur>0); }
/* 苦行武僧：某个召唤单位在「回合开始」时会带来的格挡（纸人/阴兵看升级态，五通神固定 4） */
function summonTurnBlock(s){
  if(G.hero!=='wuseng') return 0;
  if(s.type==='zhiren') return s.up?3:2;
  if(s.type==='yinbing') return s.up?4:3;
  if(s.type==='wutong') return 4;
  return 0;
}
/* 预格挡：下一回合开始时，场上召唤单位预计带来的格挡合计（仅苦行武僧，供卡面/顶栏显示） */
function preBlockNextTurn(){
  if(G.hero!=='wuseng') return 0;
  let n=0;
  for(const s of G.summons){ if(s.dur>0) n+=summonTurnBlock(s); }
  return n;
}"""))

# ---------- 4) 回合开始：召唤物格挡走同一出处（数值随升级态） ----------
EDITS.append((
"""    if(s.type==='zhiren' && G.hero==='wuseng'){ gainBlock(2); log('纸人存活：获得 2 点格挡'); }
    else if(s.type==='yinbing' && G.hero==='wuseng'){ gainBlock(3); log('阴兵存活：获得 3 点格挡'); }""",
"""    if(s.type==='zhiren' && G.hero==='wuseng'){ const b=summonTurnBlock(s); gainBlock(b); log(`纸人存活：获得 ${b} 点格挡`); }
    else if(s.type==='yinbing' && G.hero==='wuseng'){ const b=summonTurnBlock(s); gainBlock(b); log(`阴兵存活：获得 ${b} 点格挡`); }"""))

# ---------- 5) 玩家面板：格挡标记旁渲染蓝色上箭头 ----------
EDITS.append((
"""  const heroMech=heroObj.mech||'';""",
"""  const heroMech=heroObj.mech||'';
  const preBlock=preBlockNextTurn(); // 预格挡：下回合召唤物预计带来的格挡"""))

EDITS.append((
"""    <div class="pstats"><span class="pstat-hp"><i></i>${G.hp}/${G.maxHp}</span>${G.block>0?`<span class="pstat-block"><i></i>${G.block}</span>`:''}</div>`;""",
"""    <div class="pstats"><span class="pstat-hp"><i></i>${G.hp}/${G.maxHp}</span>${(G.block>0||preBlock>0)?`<span class="pstat-block"><i></i>${G.block}</span>`:''}${preBlock>0?`<span class="pstat-preblock" data-tip="kw:预格挡"><svg viewBox="0 0 10 12" aria-hidden="true"><path d="M5 0 L10 6.5 H6.8 V12 H3.2 V6.5 H0 Z" fill="#4aa8ff"/></svg>${preBlock}</span>`:''}</div>`;"""))

for i, (old, new) in enumerate(EDITS):
    n = s.count(old)
    if n != 1:
        print('EDIT #%d FAIL: 匹配 %d 次（期望 1）' % (i + 1, n)); sys.exit(1)
    s = s.replace(old, new)

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('PATCH v58_block8b_preblock DONE: %d 处' % len(EDITS))
mm = re.search(r'<script>([\s\S]*?)</script>', s)
fd, tmpp = tempfile.mkstemp(suffix='.js')
os.write(fd, mm.group(1).encode('utf-8')); os.close(fd)
r = subprocess.run(['node', '--check', tmpp], capture_output=True, text=True)
os.unlink(tmpp)
if r.returncode != 0:
    print('NODE_FAIL:'); print(r.stderr); sys.exit(1)
print('NODE_OK')
