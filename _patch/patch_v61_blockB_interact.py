# -*- coding: utf-8 -*-
# v0.61 批1·交互层：B7 火符可取消（伤害延后结算）/ B8 忘忧汤按引用结算+触发排序 /
#                    B11 未开局点牌库提示 / B12 浮字改小堆叠容器
# 注意：先 node --check 再落盘 —— 上一次 B10 反引号事故的教训
import io, sys, subprocess, tempfile, os, re

P = r"C:\Users\HP\Desktop\志怪塔\原型.html"
s = io.open(P, 'r', encoding='utf-8').read()
EDITS = []

# —— B7-1：火符 eff 改动 —— 伤害延后到「确认弃牌」时结算 ——
EDITS.append((
"""      if(G.hero==='yincha'){ d=(u?11:8); loseHp(2); }
      dealDamageTo(t,d);
      if(G.hero==='tianshi') applyCurse(t,1);
      if(G.hero==='ganshiren'){ startHuofuSelect(c, u); return; } // A 列：由玩家挑选要弃的手牌""",
"""      if(G.hero==='yincha'){ d=(u?11:8); loseHp(2); }
      if(G.hero==='ganshiren'){ startHuofuSelect(c, u, t, d); return; } // A 列：先挑要弃的手牌，确认后才结算伤害（v0.61 B7：可取消、可回退）
      dealDamageTo(t,d);
      if(G.hero==='tianshi') applyCurse(t,1);"""))

# —— B7-2：火符选择流程整体重写（取消按钮 + 延后伤害 + 击杀收尾）——
EDITS.append((
"""function startHuofuSelect(srcCard, up){
  if(!G.hand.length){ log('火符：没有可弃的手牌'); return; }
  G.huofuSelect={ card:srcCard||null, up:!!up };
  renderHuofuSelect();
}
function renderHuofuSelect(){
  const s=G.huofuSelect; if(!s) return;
  const cards=G.hand.map((c,i)=>`<div class="card ${RCOLOR[c.rarity]}" onclick="pickHuofuDiscard(${i})">${cardBody(c)}</div>`).join('');
  showOverlay(`<h2>火 符 · 弃 牌</h2><p style="color:var(--red)">挑选 <b>1</b> 张手牌弃掉；若弃掉的是【鬼怪牌】，获得 ${s.up?2:1} 点【尸气】</p><div class="reward-cards">${cards}</div>`);
}
function pickHuofuDiscard(i){
  const s=G.huofuSelect; if(!s) return;
  const c=G.hand.splice(i,1)[0]; if(!c){ renderHuofuSelect(); return; }
  if(c.type!=='junk') G.discard.push(c);
  log(`弃掉【${c.name}】`);
  let gain=0;
  if(isGhostCard(c)){ gain=s.up?2:1; gainShiqi(gain); log(`火符：弃掉鬼怪牌，获得 ${gain} 点【尸气】`); }
  G.huofuSelect=null; hideOverlay(); render();
  floatMsg(gain>0?`+${gain} 尸气`:'已弃牌');
}""",
"""function startHuofuSelect(srcCard, up, target, dmg){
  // 手牌只剩火符本身：选无可选，伤害照常结算（不再整张白打）
  if(!G.hand.length){ log('火符：没有可弃的手牌，伤害直接结算'); if(target && dmg>0) dealDamageTo(target, dmg); return; }
  G.huofuSelect={ card:srcCard||null, up:!!up, target:target||null, dmg:dmg||0, cost:srcCard?effectiveCost(srcCard):0 };
  renderHuofuSelect();
}
function renderHuofuSelect(){
  const s=G.huofuSelect; if(!s) return;
  const cards=G.hand.map((c,i)=>`<div class="card ${RCOLOR[c.rarity]}" onclick="pickHuofuDiscard(${i})">${cardBody(c)}</div>`).join('');
  showOverlay(`<h2>火 符 · 弃 牌</h2><p style="color:var(--red)">挑选 <b>1</b> 张手牌弃掉；若弃掉的是【鬼怪牌】，获得 ${s.up?2:1} 点【尸气】</p><div class="reward-cards">${cards}</div>
    <button class="btn ghost" onclick="cancelHuofuSelect()">取消（不弃牌 · 退符文 · 火符回手）</button>`);
}
function cancelHuofuSelect(){
  const s=G.huofuSelect; if(!s) return;
  // v0.61 B7：伤害尚未结算，取消＝完全回退（与焚符「放弃」同一惯例）
  if(s.card){ const di=G.discard.lastIndexOf(s.card); if(di>=0){ G.discard.splice(di,1); G.hand.push(s.card); log('放弃【火符】，牌已回手'); } }
  if(s.cost>0){ G.energy+=s.cost; log(`火符取消：退回 ${s.cost} 点符文`); }
  G.huofuSelect=null; hideOverlay(); render();
}
function pickHuofuDiscard(i){
  const s=G.huofuSelect; if(!s) return;
  const c=G.hand.splice(i,1)[0]; if(!c){ renderHuofuSelect(); return; }
  if(c.type!=='junk') G.discard.push(c);
  log(`弃掉【${c.name}】`);
  let gain=0;
  if(isGhostCard(c)){ gain=s.up?2:1; gainShiqi(gain); log(`火符：弃掉鬼怪牌，获得 ${gain} 点【尸气】`); }
  const _t=s.target, _d=s.dmg;
  G.huofuSelect=null; hideOverlay();
  if(_t && (_t.hp||0)>0 && _d>0) dealDamageTo(_t, _d); // v0.61 B7：确认弃牌后才结算伤害
  render();
  floatMsg(gain>0?`+${gain} 尸气`:'已弃牌');
  // 延后结算的伤害同样要收口胜负（幂等守卫见 B4）
  if(G.hp<=0){ G.hp=0; loseGame(); return; }
  if(aliveEnemies().length===0){ winFight(); return; }
}"""))

# —— B8-1：回合开始触发顺序 —— 先缠绕弃牌，再开忘忧汤（快照才是剩余手牌的真实集）——
EDITS.append((
"""  if(G.wangyouTurns>0){ G.wangyouTurns--; if(G.hand.length) showWangyouChoice(); else log('忘忧汤翻涌，但你手牌空空，躲过一劫'); }
  if(G.pendingDiscard>0){ G.pendingDiscard--; enemyRandomDiscard(); }""",
"""  // v0.61 B8：缠绕先结算、忘忧汤后开 —— 汤的手牌快照与后续索引才对得上
  if(G.pendingDiscard>0){ G.pendingDiscard--; enemyRandomDiscard(); }
  if(G.wangyouTurns>0){ G.wangyouTurns--; if(G.hand.length) showWangyouChoice(); else log('忘忧汤翻涌，但你手牌空空，躲过一劫'); }"""))

# —— B8-2：忘忧汤按卡对象引用结算，不再用渲染时的数组下标 ——
EDITS.append((
"""function showWangyouChoice(){
  const cards=G.hand.map((c,i)=>`<div class="card ${RCOLOR[c.rarity]}" onclick="drinkWangyou(${i})">${cardBody(c)}</div>`).join('');
  showOverlay(`<h2>忘 忧 汤</h2><p>孟婆的汤还萦绕在喉头——选择 1 张手牌「饮下」（弃置，进弃牌堆而非封印），或拒绝（受 <b style="color:var(--red)">8 点真实伤害</b>）。</p><div class="reward-cards">${cards}</div><button class="btn ghost" onclick="refuseWangyou()">拒绝 · 受 8 点真实伤害</button>`);
}
function drinkWangyou(i){
  const c=G.hand.splice(i,1)[0]; if(c.type!=='junk') G.discard.push(c);
  G.wangyouDrunk=(G.wangyouDrunk||0)+1;
  log(`饮下【${c.name}】——忘忧汤入喉，前尘如烟`);
  hideOverlay(); render();
}
function refuseWangyou(){
  const dead=directDamage(8, '你拒绝了忘忧汤，孟婆的怒火化作 8 点真实伤害');
  if(dead) return;
  hideOverlay(); render();
}""",
"""function showWangyouChoice(){
  // v0.61 B8：快照存「卡对象引用」而非下标 —— 同帧若还有缠绕/业火等 splice 手牌，下标会错位（弃错牌 / undefined.type）
  const pool=G.hand.slice();
  G.wangyouPool=pool;
  const cards=pool.map((c,i)=>`<div class="card ${RCOLOR[c.rarity]}" onclick="drinkWangyou(${i})">${cardBody(c)}</div>`).join('');
  showOverlay(`<h2>忘 忧 汤</h2><p>孟婆的汤还萦绕在喉头——选择 1 张手牌「饮下」（弃置，进弃牌堆而非封印），或拒绝（受 <b style="color:var(--red)">8 点真实伤害</b>）。</p><div class="reward-cards">${cards}</div><button class="btn ghost" onclick="refuseWangyou()">拒绝 · 受 8 点真实伤害</button>`);
}
function drinkWangyou(i){
  const pool=G.wangyouPool||G.hand;
  const picked=pool[i];
  G.wangyouPool=null;
  if(!picked){ hideOverlay(); render(); return; }
  const hi=G.hand.indexOf(picked); // 按引用回查真实位置
  const c = hi>=0 ? G.hand.splice(hi,1)[0] : picked; // 已被缠绕弃掉/封印移走的牌：只记「饮下」，不重复弃置
  if(hi>=0 && c.type!=='junk') G.discard.push(c);
  G.wangyouDrunk=(G.wangyouDrunk||0)+1;
  log(`饮下【${c.name}】——忘忧汤入喉，前尘如烟`);
  hideOverlay(); render();
}
function refuseWangyou(){
  G.wangyouPool=null;
  const dead=directDamage(8, '你拒绝了忘忧汤，孟婆的怒火化作 8 点真实伤害');
  if(dead) return;
  hideOverlay(); render();
}"""))

# —— B11：未开局点「牌库」给出提示 ——
EDITS.append((
"""function viewDeck(){
  if(!G || !G.deck.length){ return; }""",
"""function viewDeck(){
  if(!G){ floatMsg('开局后可查看牌库'); return; } // v0.61 B11：原本静默无反应
  if(!G.deck.length){ floatMsg('牌库为空'); return; }"""))

# —— B12-1：浮字容器 CSS —— 单元素改为小堆叠（最多 3 条）——
EDITS.append((
"""  #float-msg{position:fixed; left:50%; top:34%; transform:translate(-50%,-50%); font-family:var(--font-kai); font-size:26px; color:var(--gold); text-shadow:0 0 12px rgba(0,0,0,.9), 0 2px 4px rgba(0,0,0,.8); pointer-events:none; opacity:0; z-index:20; letter-spacing:3px; white-space:nowrap;}
  #float-msg.show{animation:floatUp 1.15s ease-out forwards;}
  @keyframes floatUp{0%{opacity:0; transform:translate(-50%,-50%) translateY(10px);}12%{opacity:1;}100%{opacity:0; transform:translate(-50%,-50%) translateY(-32px);}}""",
"""  /* v0.61 B12：浮字改为小堆叠容器（最多 3 条并存，同类不再互相顶掉） */
  #float-msg{position:fixed; left:50%; top:34%; transform:translateX(-50%); display:flex; flex-direction:column; align-items:center; gap:2px; pointer-events:none; z-index:20;}
  #float-msg .fm{font-family:var(--font-kai); font-size:26px; color:var(--gold); text-shadow:0 0 12px rgba(0,0,0,.9), 0 2px 4px rgba(0,0,0,.8); letter-spacing:3px; white-space:nowrap; opacity:0; animation:floatUpItem 1.6s ease-out forwards;}
  @keyframes floatUpItem{0%{opacity:0; transform:translateY(10px);}12%{opacity:1;}100%{opacity:0; transform:translateY(-32px);}}"""))

# —— B12-2：窄屏适配同步 ——
EDITS.append((
"""    #float-msg{font-size:20px; top:30%;}""",
"""    #float-msg{top:30%;} #float-msg .fm{font-size:20px;}"""))

# —— B12-3：floatMsg 实现 ——
EDITS.append((
"""function floatMsg(msg){
  const el=document.getElementById('float-msg');
  if(!el) return;
  el.textContent=msg;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
}""",
"""function floatMsg(msg){
  // v0.61 B12：追加一条浮字，最多同时 3 条（各 1.6s 淡出），不再互相覆盖
  const el=document.getElementById('float-msg');
  if(!el) return;
  const item=document.createElement('div');
  item.className='fm'; item.textContent=msg;
  el.appendChild(item);
  while(el.children && el.children.length>3) el.removeChild(el.children[0]);
  setTimeout(()=>{ if(item.parentNode && item.parentNode.removeChild) item.parentNode.removeChild(item); }, 1700);
}"""))

# 前置断言：floatUp 关键帧只被这一处使用，替换后不应再有引用
if s.count('floatUp') != 2:
    print('ABORT: floatUp 出现 %d 次（期望 2），可能有其它引用' % s.count('floatUp')); sys.exit(1)

for i, (old, new) in enumerate(EDITS):
    n = s.count(old)
    if n != 1:
        print('EDIT #%d FAIL: 匹配 %d 次（期望 1）\n---%s---' % (i + 1, n, old[:150])); sys.exit(1)
    s = s.replace(old, new)

# 先语法检查，通过才落盘
mm = re.search(r'<script>([\s\S]*?)</script>', s)
fd, tmpp = tempfile.mkstemp(suffix='.js')
os.write(fd, mm.group(1).encode('utf-8')); os.close(fd)
r = subprocess.run(['node', '--check', tmpp], capture_output=True, text=True)
if r.returncode != 0:
    os.unlink(tmpp); print('NODE_FAIL（未落盘）:'); print(r.stderr); sys.exit(1)
os.unlink(tmpp)
io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('PATCH v61_blockB_interact DONE: %d 处' % len(EDITS))
print('NODE_OK')
