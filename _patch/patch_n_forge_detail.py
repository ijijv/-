# -*- coding: utf-8 -*-
# v0.51 → v0.52：①锻造页：升级无变化的牌置灰、不可锻造、点击提示「不可升级」
#                  ②遗物/召唤物从玩家面板下方移到顶栏「详情」页（遗物带插图、召唤物入详情）
import io, sys, subprocess, tempfile, os, re

P = r"C:\Users\HP\Desktop\志怪塔\原型.html"
s = io.open(P, 'r', encoding='utf-8').read()

EDITS = []

# ---------- CSS ----------
EDITS.append((
"""  .player-relics{display:flex; flex-wrap:wrap; gap:6px; margin-top:6px; justify-content:center;}""",
"""  .player-relics{display:flex; flex-wrap:wrap; gap:6px; align-items:center;}"""))

EDITS.append((
"""  .prelic-chip .prelic-name{font-size:10px; color:var(--gold); white-space:nowrap;}""",
"""  .prelic-chip .prelic-name{font-size:10px; color:var(--gold); white-space:nowrap;}
  /* 锻造页：升级无变化的牌置灰、不可锻造 */
  .card.locked{filter:grayscale(1) brightness(.88); opacity:.55; cursor:not-allowed;}
  .card.locked:hover{transform:none;}
  .card.locked .cost{background:var(--ink3);}
  .noup{font-size:9px; color:var(--dim); border:1px solid var(--ink3); border-radius:6px; padding:0 4px; margin-left:4px; vertical-align:middle; white-space:nowrap;}
  .tb-summons{display:flex; flex-wrap:wrap; gap:6px; flex-basis:100%;}"""))

# 移除 #summon-panel 的 CSS（该栏已并入顶栏详情）
EDITS.append((
"""  #summon-panel{display:flex; flex-wrap:wrap; gap:6px; margin-bottom:8px;}
""",
""))

# ---------- HTML 骨架：删掉召唤栏 ----------
EDITS.append((
"""      <div id="summon-panel"></div>
      <div id="turn-summary"></div>""",
"""      <div id="turn-summary"></div>"""))

# ---------- JS：锻造可升级判定 ----------
EDITS.append((
"""function forgeCard(i){
  const c=G.deck[i];
  if(c.up){ floatMsg('这张牌已升级过'); log('这张牌已经升级过了'); return; }""",
"""/* 该牌是否存在可升级的变化（升级前后文案一致、且无费用减免 => 不可升级） */
function canUpgrade(c){
  try{
    if(String(c.t(false))!==String(c.t(true))) return true;
    return c.costU!=null && c.costU!==c.cost;
  }catch(e){ return true; }
}
function forgeCard(i){
  const c=G.deck[i];
  if(c.up){ floatMsg('这张牌已升级过'); log('这张牌已经升级过了'); return; }
  if(!canUpgrade(c)){ floatMsg('不可升级'); log(`【${c.name}】没有可升级的变化，无法锻造`); return; }"""))

EDITS.append((
"""function forgeCardHTML(c,i){
  const body = c.up
    ? `<div class="cdesc">${wrapKw(c.t(true))}</div>`
    : `<div class="cdesc">${wrapKw(c.t(false))}<div class="upgrade-preview">升级 → ${wrapKw(c.t(true))}</div></div>`;
  return `<div class="card ${RCOLOR[c.rarity]}" onclick="forgeCard(${i})">
    ${cardArt(c)}
    <div class="cost">${cardCost(c)}</div>
    <div class="cname">${c.name}${c.up?' <span style="color:var(--green)" title="已升级">↑</span>':''}</div>
    ${body}
    <div class="ctype">${TNAME[c.type]} · ${RNAME[c.rarity]}</div>
  </div>`;
}""",
"""function forgeCardHTML(c,i){
  const lock = !c.up && !canUpgrade(c);   // 升级无变化的牌：置灰、不可锻造
  const body = (c.up || lock)
    ? `<div class="cdesc">${wrapKw(c.t(c.up))}</div>`
    : `<div class="cdesc">${wrapKw(c.t(false))}<div class="upgrade-preview">升级 → ${wrapKw(c.t(true))}</div></div>`;
  return `<div class="card ${RCOLOR[c.rarity]}${lock?' locked':''}" onclick="forgeCard(${i})">
    ${cardArt(c)}
    <div class="cost">${cardCost(c)}</div>
    <div class="cname">${c.name}${c.up?' <span style="color:var(--green)" title="已升级">↑</span>':''}${lock?'<span class="noup">不可升级</span>':''}</div>
    ${body}
    <div class="ctype">${TNAME[c.type]} · ${RNAME[c.rarity]}</div>
  </div>`;
}"""))

# ---------- JS：玩家面板不再显示遗物 ----------
EDITS.append((
"""  const relicsRow=G.relics.length?`<div class="player-relics">${G.relics.map(id=>{const r=relById(id);return `<span class="prelic-chip" data-tip="relic:${id}">${relicIcon(r)}<span class="prelic-name">${r.name}</span></span>`;}).join('')}</div>`:'';
  document.getElementById('player-panel').innerHTML=`""",
"""  document.getElementById('player-panel').innerHTML=`"""))

EDITS.append((
"""    <div class="pstats"><span class="pstat-hp"><i></i>${G.hp}/${G.maxHp}</span>${G.block>0?`<span class="pstat-block"><i></i>${G.block}</span>`:''}</div>
    ${relicsRow}`;""",
"""    <div class="pstats"><span class="pstat-hp"><i></i>${G.hp}/${G.maxHp}</span>${G.block>0?`<span class="pstat-block"><i></i>${G.block}</span>`:''}</div>`;"""))

# ---------- JS：召唤栏渲染移除 ----------
EDITS.append((
"""  document.getElementById('summon-panel').innerHTML=G.summons.length? G.summons.map(s=>summonHTML(s)).join('') : '';
  document.getElementById('turn-summary').innerHTML=G.turnSummary || '';""",
"""  document.getElementById('turn-summary').innerHTML=G.turnSummary || '';"""))

# ---------- JS：顶栏详情页 = 灵汁 + buff + 召唤物 + 遗物(带插图) ----------
EDITS.append((
"""  if(TOPBAR_OPEN){
    const buffs=playerBuffHTML();
    const relics=G.relics.length?`<div class="prelics">${G.relics.map(id=>`<span class="kw" data-tip="relic:${id}">${relById(id).name}</span>`).join(' · ')}</div>`:'';
    const potion=potionBagHTML();
    html+=`<div class="tb-detail">
      ${potion}
      ${buffs?`<div class="badges">${buffs}</div>`:''}
      ${relics}
    </div>`;
  }""",
"""  if(TOPBAR_OPEN){
    const buffs=playerBuffHTML();
    // 遗物：详情页内带插图（图标 + 名称）——不再显示在玩家面板下方
    const relics=G.relics.length?`<div class="player-relics">${G.relics.map(id=>{const r=relById(id);return `<span class="prelic-chip" data-tip="relic:${id}">${relicIcon(r)}<span class="prelic-name">${r.name}</span></span>`;}).join('')}</div>`:'';
    // 召唤物：入详情页；只在战斗中显示（召唤物在 startBattle 时清空）
    const summons=(SCENE==='battle' && G.summons && G.summons.length)?`<div class="tb-summons">${G.summons.map(s=>summonHTML(s)).join('')}</div>`:'';
    const potion=potionBagHTML();
    html+=`<div class="tb-detail">
      ${potion}
      ${buffs?`<div class="badges">${buffs}</div>`:''}
      ${summons}
      ${relics}
    </div>`;
  }"""))

for i, (old, new) in enumerate(EDITS):
    n = s.count(old)
    if n != 1:
        print('EDIT #%d FAIL: 匹配 %d 次（期望 1）' % (i+1, n)); sys.exit(1)
    s = s.replace(old, new)

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('PATCH n_forge_detail DONE: %d 处替换成功' % len(EDITS))

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
print('残留 summon-panel 引用: %d' % s.count('summon-panel'))
