# -*- coding: utf-8 -*-
import io, sys
P = r"C:\Users\HP\Desktop\志怪塔\原型.html"
s = io.open(P, 'r', encoding='utf-8').read()

def rep(old, new, n=1, label=''):
    global s
    c = s.count(old)
    if c != n:
        print('FAIL[%s]: expected %d, got %d' % (label, n, c))
        sys.exit(1)
    s = s.replace(old, new)
    print('ok[%s]' % label)

# ---------- B1 effectiveCost: #5A/#5D/#8A/#46D ----------
old = """function effectiveCost(c){
  let cost=cardCost(c);
  if(c.type==='skill' && hasRelic('jifengfu') && (G.skillsPlayedThisTurn||0)===0){
    cost=Math.max(0,cost-1);
  }
  // 天雷正法：符箓天师版，目标每有1层诅咒，费用-1（最低0）
  if(c.id === 'tianlei' && G.hero === 'tianshi') {
    const t = curEnemy();
    if(t) {
      const curseReduction = t.curse || 0;
      cost = Math.max(0, cost - curseReduction);
    }
  }
  // 咒雨：符箓天师版，每名敌人每有1层诅咒，费用-1（最低0）
  if(c.id === 'zhouyu' && G.hero === 'tianshi') {
    const curseReduction = aliveEnemies().reduce((s,e)=>s+(e.curse||0), 0);
    cost = Math.max(0, cost - curseReduction);
  }
  return cost;
}"""
new = """function effectiveCost(c){
  let cost=cardCost(c);
  if(c.type==='skill' && hasRelic('jifengfu') && (G.skillsPlayedThisTurn||0)===0){
    cost=Math.max(0,cost-1);
  }
  // 天雷正法(#5) A 赶尸人：每 3 点【尸气】-1 费（最低 0）；D 天师：目标每 2 层【诅咒】-1 费（最低 0）
  if(c.id==='tianlei'){
    if(G.hero==='ganshiren'){ cost=Math.max(0, cost - Math.floor((G.尸气||0)/3)); }
    else if(G.hero==='tianshi'){ const t=curEnemy(); if(t) cost=Math.max(0, cost - Math.floor((t.curse||0)/2)); }
  }
  // 噬魂术(#8) A 赶尸人：本回合召唤过单位则 -1 费
  if(c.id==='shihun' && G.hero==='ganshiren' && (G.summonsMadeTurn||0)>0){ cost=Math.max(0,cost-1); }
  // 咒雨(#46) D 天师：敌人身上诅咒总层数每 1 层 -1 费（最低 0）
  if(c.id==='zhouyu' && G.hero==='tianshi'){
    cost=Math.max(0, cost - aliveEnemies().reduce((s,e)=>s+(e.curse||0), 0));
  }
  return cost;
}"""
rep(old, new, 1, 'B1-effectiveCost')

# ---------- B2 applyCurse: 强化诅咒 boost ----------
old = """  let v=n;
  if(e.key==='xiuluowang' && (G.karmaFire||0)>0) v=v*2;"""
new = """  let v=n;
  if(e.key==='xiuluowang' && (G.karmaFire||0)>0) v=v*2;
  // 守一(天师)强化：本张被强化的可施咒牌额外 +1 层（仅持续一次施加）
  if((G.boostCurse||0)>0){ v+=1; G.boostCurse--; log('守一强化：本次诅咒额外 +1 层'); }"""
rep(old, new, 1, 'B2-applyCurse-boost')

# ---------- B3 dealDamageToPlayer: 通用被攻击效果 + 各英雄闪避奖励 ----------
old = """function dealDamageToPlayer(n, attacker, floatDelay){
  if(G.dodge>0){ G.dodge--; if(G.yixingTianshi){ applyCurse(attacker, 2); log(`移形换影：闪避了 ${attacker.name} 的攻击，对其施加 2 层【诅咒】`); } else { G.dodgeDraw=(G.dodgeDraw||0)+1; log(`移形换影：闪避了 ${attacker.name} 的攻击（下回合多摸 1 张）`); } return; }
  let d=n+2*(attacker.strength||0);
  if(attacker.affixes){ const jd=attacker.affixes.find(a=>a.id==='judu'); if(jd) d+=2*jd.tier; }
  if(attacker.charm>0){ const cpr=attacker.charmPct!=null?attacker.charmPct:0.5; d=Math.floor(d*cpr); attacker.charm--; if(attacker.charm<=0) attacker.charmPct=0.5; }
  const full=d;
  const absorbed=Math.min(G.block,d); G.block-=absorbed;
  const dealt=d-absorbed;
  let loss=dealt;
  if(G.hp-dealt<=0 && hasRelic('daoxin') && !G.daoxinUsed){ loss=Math.max(0,G.hp-1); G.daoxinUsed=true; log('道心触发：抵挡致命伤，保留 1 点生命'); }
  G.hp-=loss;
  if(loss>0 && G.xuejiArmed) G.xuejiHurt=true;
  if(loss>0){
    const doFx=()=>{ sfx('hurt'); hurtVignette(); heroAnim('hit'); const bar=document.querySelector('#player-panel .hpbar'); floatDamage('-'+loss, 'to-player', bar); };
    if(floatDelay) setTimeout(doFx, floatDelay); else doFx();
  }
  G.totalHpLost=(G.totalHpLost||0)+loss;
  G.hpLostTurn=(G.hpLostTurn||0)+loss;
  G.turnStats.dmgTaken+=loss; G.turnStats.blocked+=absorbed;
  log(`${attacker.name} 对你造成 ${loss} 点伤害${absorbed>0?`（格挡吸收 ${absorbed}）`:''}`);
  if(G.thorns>0 && full>0){ attacker.hp-=G.thorns; log(`荆棘反弹 ${G.thorns} 点伤害给 ${attacker.name}`); afterEnemyDamaged(attacker); }
  // 荆棘符（天师版）：本回合每受到一次攻击，对攻击者施加 1 层诅咒
  if(G.jingjiCurse && loss>0) {
    applyCurse(attacker, 1);
    log(`荆棘符：对 ${attacker.name} 施加 1 层【诅咒】`);
  }
  // 铜皮铁骨（天师版）：本回合每受到一次攻击，对攻击者施加 1/2 层诅咒
  if(G.tongpiCurse && loss>0) {
    const curseAmount = G.tongpiCurseAmount || 1;
    applyCurse(attacker, curseAmount);
    log(`铜皮铁骨：对 ${attacker.name} 施加 ${curseAmount} 层【诅咒】`);
  }
  // 反震（天师版）：本回合每受到一次攻击，获得 1 点格挡并对攻击者施加 1/2 层诅咒
  if(G.fanzhenEffect && loss>0) {
    const curseAmount = G.fanzhenCurseAmount || 1;
    gainBlock(1);
    applyCurse(attacker, curseAmount);
    log(`反震：获得 1 点格挡，对 ${attacker.name} 施加 ${curseAmount} 层【诅咒】`);
  }
  if(attacker.key==='xiaojianshi' && loss>0){ G.zombieDmg=(G.zombieDmg||0)+loss; }
  if(attacker.lifesteal && loss>0){ const hl=Math.floor(loss*attacker.lifesteal); attacker.hp+=hl; log(`${attacker.name} 吸血：回复 ${hl} 点生命`); }
  if(attacker.affixes){
    const sx=attacker.affixes.find(a=>a.id==='shixue'); if(sx && loss>0){ attacker.hp=Math.min(attacker.maxHp, attacker.hp+3*sx.tier); log(`${attacker.name} 蚀血：回复 ${3*sx.tier} 点生命`); }
    if(attacker.affixes.some(a=>a.id==='gouhun') && !G.debuffImmune){ G.gouhun=1; log(`${attacker.name} 勾魂（下回合少抽 1 张）`); }
    if(attacker.affixes.some(a=>a.id==='feipai')){ addJunkToHand(1); }
  }
}"""
new = """function dealDamageToPlayer(n, attacker, floatDelay){
  // 移形换影(#38)：闪避成功按英雄获得不同奖励
  if(G.dodge>0){
    G.dodge--;
    if(G.dodgeShiqi){ gainShiqi(1); log(`移形换影：闪避了 ${attacker.name} 的攻击，获得 1 点【尸气】`); }
    else if(G.dodgeNextBlock){ G.pendingBlockStart=(G.pendingBlockStart||0)+G.dodgeNextBlock; log(`移形换影：闪避了 ${attacker.name} 的攻击（下回合 +${G.dodgeNextBlock} 格挡）`); }
    else if(G.dodgeHealRage){ heal(G.dodgeHealRage); gainRage(1); log(`移形换影：闪避了 ${attacker.name} 的攻击，恢复 ${G.dodgeHealRage} 点生命并获得 1 层【血怒】`); }
    else if(G.dodgeCurse){ applyCurse(attacker,1); log(`移形换影：闪避了 ${attacker.name} 的攻击，对其施加 1 层【诅咒】`); }
    else { G.dodgeDraw=(G.dodgeDraw||0)+1; log(`移形换影：闪避了 ${attacker.name} 的攻击（下回合多摸 1 张）`); }
    return;
  }
  let d=n+2*(attacker.strength||0);
  if(attacker.affixes){ const jd=attacker.affixes.find(a=>a.id==='judu'); if(jd) d+=2*jd.tier; }
  if(attacker.charm>0){ const cpr=attacker.charmPct!=null?attacker.charmPct:0.5; d=Math.floor(d*cpr); attacker.charm--; if(attacker.charm<=0) attacker.charmPct=0.5; }
  const full=d;
  const absorbed=Math.min(G.block,d); G.block-=absorbed;
  const dealt=d-absorbed;
  let loss=dealt;
  if(G.hp-dealt<=0 && hasRelic('daoxin') && !G.daoxinUsed){ loss=Math.max(0,G.hp-1); G.daoxinUsed=true; log('道心触发：抵挡致命伤，保留 1 点生命'); }
  G.hp-=loss;
  if(loss>0 && G.xuejiArmed) G.xuejiHurt=true;
  if(loss>0){
    const doFx=()=>{ sfx('hurt'); hurtVignette(); heroAnim('hit'); const bar=document.querySelector('#player-panel .hpbar'); floatDamage('-'+loss, 'to-player', bar); };
    if(floatDelay) setTimeout(doFx, floatDelay); else doFx();
  }
  G.totalHpLost=(G.totalHpLost||0)+loss;
  G.hpLostTurn=(G.hpLostTurn||0)+loss;
  G.turnStats.dmgTaken+=loss; G.turnStats.blocked+=absorbed;
  log(`${attacker.name} 对你造成 ${loss} 点伤害${absorbed>0?`（格挡吸收 ${absorbed}）`:''}`);
  // —— 本回合“受到攻击时”触发（荆棘符/铜皮铁骨/反震/卸甲等），非闪避命中即结算 ——
  if(full>0){
    if((G.thorns||0)>0){ attacker.hp-=G.thorns; log(`荆棘/反震：反弹 ${G.thorns} 点伤害给 ${attacker.name}`); afterEnemyDamaged(attacker); }
    if((G.hitHeal||0)>0){ heal(G.hitHeal); log(`荆棘符：受击恢复 ${G.hitHeal} 点生命`); }
    if((G.hitCurse||0)>0){ applyCurse(attacker, G.hitCurse); log(`铜皮/荆棘：对 ${attacker.name} 施加 ${G.hitCurse} 层【诅咒】`); }
    if((G.hitShiqi||0)>0){ gainShiqi(G.hitShiqi); log(`反震：受击获得 ${G.hitShiqi} 点【尸气】`); }
    if((G.hitRage||0)>0){ gainRage(G.hitRage); log(`反震：受击获得 ${G.hitRage} 层【血怒】`); }
    if((G.hitBlock||0)>0){ gainBlock(G.hitBlock); log(`反震：受击获得 ${G.hitBlock} 点格挡`); }
    if((G.nextBlock||0)>0){ G.pendingBlockStart=(G.pendingBlockStart||0)+G.nextBlock; log(`反震：下回合开始额外获得 ${G.nextBlock} 点格挡`); }
  }
  if(attacker.key==='xiaojianshi' && loss>0){ G.zombieDmg=(G.zombieDmg||0)+loss; }
  if(attacker.lifesteal && loss>0){ const hl=Math.floor(loss*attacker.lifesteal); attacker.hp+=hl; log(`${attacker.name} 吸血：回复 ${hl} 点生命`); }
  if(attacker.affixes){
    const sx=attacker.affixes.find(a=>a.id==='shixue'); if(sx && loss>0){ attacker.hp=Math.min(attacker.maxHp, attacker.hp+3*sx.tier); log(`${attacker.name} 蚀血：回复 ${3*sx.tier} 点生命`); }
    if(attacker.affixes.some(a=>a.id==='gouhun') && !G.debuffImmune){ G.gouhun=1; log(`${attacker.name} 勾魂（下回合少抽 1 张）`); }
    if(attacker.affixes.some(a=>a.id==='feipai')){ addJunkToHand(1); }
  }
}"""
rep(old, new, 1, 'B3-dealDamageToPlayer')

# ---------- B4 焚符 弃牌选择（任意张，按英雄给奖） ----------
old = """function renderDiscardSelect(){
  const s=G.discardSelect; if(!s) return;
  const left=s.need-s.picked.length;
  const cards=G.hand.map((c,i)=>{
    const sel=s.picked.includes(i);
    return `<div class="card ${RCOLOR[c.rarity]} ${sel?'selected':''}" onclick="toggleDiscardPick(${i})">${cardBody(c)}${sel?'<div style="color:var(--green);margin-top:4px">✓ 已选</div>':''}</div>`;
  }).join('');
  showOverlay(`<h2>焚 符 · 弃 牌</h2><p style="color:var(--red)">选择 ${s.need} 张手牌弃掉（还差 <b>${left}</b> 张）</p><div class="reward-cards">${cards}</div>
    <button class="btn" onclick="confirmDiscardSelect()">${left>0?`还差 ${left} 张`:'确认弃牌'}</button>
    <button class="btn ghost" onclick="cancelDiscardSelect()">放弃（焚符回退）</button>`);
}
function toggleDiscardPick(i){
  const s=G.discardSelect; if(!s) return;
  const idx=s.picked.indexOf(i);
  if(idx>=0) s.picked.splice(idx,1);
  else if(s.picked.length<s.need) s.picked.push(i);
  renderDiscardSelect();
}
function confirmDiscardSelect(){
  const s=G.discardSelect; if(!s) return;
  if(s.picked.length<s.need) return;
  let discardedCount = 0;
  [...s.picked].sort((a,b)=>b-a).forEach(i=>{
    const c=G.hand.splice(i,1)[0];
    if(c.type!=='junk') G.discard.push(c);
    log(`弃掉【${c.name}】`);
    discardedCount++;

    // 如果是符箓天师的焚符效果，对随机敌人施加诅咒并获得格挡
    if(s.card && s.card.id === 'fenfu' && G.hero === 'tianshi') {
      const randomEnemy = randomAlive();
      if(randomEnemy) {
        applyCurse(randomEnemy, 1);
        log(`焚符：对 ${randomEnemy.name} 施加 1 层【诅咒】`);
      }
      gainBlock(1); // 每弃1张牌获得1点格挡
    }
  });

  // 天师版焚符：弃牌后不增加符文，而是对每个被弃的牌施加诅咒并获得格挡
  if(s.card && s.card.id === 'fenfu' && G.hero === 'tianshi') {
    log(`焚符：弃掉 ${discardedCount} 张牌，对敌人施加诅咒并获得 ${discardedCount} 点格挡`);
  } else if(s.card) {
    G.energy+=1; floatMsg('符文 +1'); log('焚符：弃牌完成，符文 +1');
  }

  G.discardSelect=null;
  hideOverlay(); render();
}"""
new = """function renderDiscardSelect(){
  const s=G.discardSelect; if(!s) return;
  const cards=G.hand.map((c,i)=>{
    const sel=s.picked.includes(i);
    return `<div class="card ${RCOLOR[c.rarity]} ${sel?'selected':''}" onclick="toggleDiscardPick(${i})">${cardBody(c)}${sel?'<div style="color:var(--green);margin-top:4px">✓ 已选</div>':''}</div>`;
  }).join('');
  showOverlay(`<h2>焚 符 · 弃 牌</h2><p style="color:var(--red)">可弃任意张手牌，每弃 1 张触发一次效果（已选 <b>${s.picked.length}</b> 张）</p><div class="reward-cards">${cards}</div>
    <button class="btn" onclick="confirmDiscardSelect()">${s.picked.length>0?`弃掉 ${s.picked.length} 张`:'请选择要弃的牌'}</button>
    <button class="btn ghost" onclick="cancelDiscardSelect()">放弃（焚符回退）</button>`);
}
function toggleDiscardPick(i){
  const s=G.discardSelect; if(!s) return;
  const idx=s.picked.indexOf(i);
  if(idx>=0) s.picked.splice(idx,1);
  else s.picked.push(i);
  renderDiscardSelect();
}
function confirmDiscardSelect(){
  const s=G.discardSelect; if(!s) return;
  if(!s.picked.length){ floatMsg('至少弃 1 张'); return; }
  const u=!!(s.card && s.card.up);
  const nDiscarded=s.picked.length;
  [...s.picked].sort((a,b)=>b-a).forEach(i=>{
    const c=G.hand.splice(i,1)[0];
    if(c.type!=='junk') G.discard.push(c);
    log(`弃掉【${c.name}】`);
  });
  // 焚符(#34)：每弃 1 张，按英雄结算
  for(let k=0;k<nDiscarded;k++){
    if(G.hero==='ganshiren'){ gainShiqi(1); gainBlock(u?3:2); }
    else if(G.hero==='wuseng'){ gainBlock(u?4:3); }
    else if(G.hero==='yincha'){ heal(u?3:2); }
    else { const re=randomAlive(); if(re) applyCurse(re,1); gainBlock(u?3:2); }
  }
  log(`焚符：弃掉 ${nDiscarded} 张手牌`);
  G.discardSelect=null;
  hideOverlay(); render();
}"""
rep(old, new, 1, 'B4-fenfu')

# ---------- B5 守一 保留确认（按英雄奖励） ----------
old = """function confirmRetainSelect(){
  const s=G.retainSelect; if(!s) return;
  let junkKept=0;
  s.picked.forEach(i=>{ if(G.hand[i]){ G.hand[i].retain=true; if(G.hand[i].type==='junk' && G.shouyiTianshi) junkKept++; } });
  if(G.shouyiTianshi && junkKept>0){ G.shouyiCurseCount=(G.shouyiCurseCount||0)+junkKept; log(`守一：保留 ${junkKept} 张状态牌，下回合开始对随机敌人施加 ${junkKept} 层诅咒`); }
  G.retainSelect=null;
  hideOverlay();
  finishEndTurn();
}"""
new = """function confirmRetainSelect(){
  const s=G.retainSelect; if(!s) return;
  let costSum=0, shiqiKeep=0;
  s.picked.forEach(i=>{
    const c=G.hand[i]; if(!c) return;
    c.retain=true;
    // 守一(#26)：按英雄在保留时/下回合结算奖励
    if(G.hero==='ganshiren'){ if(isGhostCard(c)){ shiqiKeep++; } }
    else if(G.hero==='wuseng'){ if(c.type==='defense'){ gainBlock(2); log('守一：保留防御牌，获得 2 点格挡'); } }
    else if(G.hero==='yincha'){ costSum += cardCost(c); }
    else if(G.hero==='tianshi'){ if(isCanCurse(c)) c.curseBoostLayer=1; }
  });
  if(shiqiKeep>0){ gainShiqi(shiqiKeep); log(`守一：保留 ${shiqiKeep} 张鬼怪牌，获得 ${shiqiKeep} 点【尸气】`); }
  if(costSum>0){ G.retainHeal=(G.retainHeal||0)+costSum; log(`守一：保留手牌费用合计 ${costSum}，下回合恢复等量生命`); }
  G.retainSelect=null;
  hideOverlay();
  finishEndTurn();
}"""
rep(old, new, 1, 'B5-shouyi-retain')

# ---------- B6 易物：按“换出的旧牌”类型给英雄奖励 ----------
old = """  const old=G.hand.splice(ex.handIndex,1)[0];
  if(old.type!=='junk') G.discard.push(old);
  removeCardFromPiles(c);
  G.hand.push(c);
  if(G.hero==='tianshi' && c.type==='junk'){ drawCards(1); log('易物：换入状态牌，额外抽 1 张'); }
  log(`易物：用【${old.name}】换入【${c.name}】`);"""
new = """  const old=G.hand.splice(ex.handIndex,1)[0];
  if(old.type!=='junk') G.discard.push(old);
  removeCardFromPiles(c);
  G.hand.push(c);
  // 易物(#27)：若换出的是特定类型，按英雄给奖
  if(G.hero==='ganshiren' && isGhostCard(old)){ gainShiqi(1); log('易物：换出鬼怪牌，获得 1 点【尸气】'); }
  else if(G.hero==='wuseng' && old.type==='defense'){ gainBlock(4); log('易物：换出防御牌，获得 4 点格挡'); }
  else if(G.hero==='yincha' && old.type==='skill'){ heal(5); log('易物：换出技能牌，恢复 5 点生命'); }
  else if(G.hero==='tianshi' && old.type==='attack'){ drawCards(1); log('易物：换出攻击牌，额外抽 1 张'); }
  log(`易物：用【${old.name}】换入【${c.name}】`);"""
rep(old, new, 1, 'B6-yiwu')

# ---------- B7 尸王 存档处理 + 保存 尸气/血怒 ----------
old = """function saveRun(scene){
  if(!G || G.endless) return; // 无尽模式不落档
  const s=scene || SCENE || 'map';"""
new = """function saveRun(scene){
  if(!G || G.endless) return; // 无尽模式不落档
  // 尸王召唤存活期间此牌不在手牌/弃牌堆：存档时先让它回到弃牌堆，避免卡牌丢失
  if(G.shiWangCard){ removeCardEverywhere(G.shiWangCard); G.discard.push(G.shiWangCard); G.shiWangCard=null; }
  const s=scene || SCENE || 'map';"""
rep(old, new, 1, 'B7-save-shiwang')

old = """    turnAtkBuff:G.turnAtkBuff||0, karmaFire:G.karmaFire||0, bloodPact:G.bloodPact||0, retain:G.retain||0, xiejia:G.xiejia||0,
    duhun:G.duhun||null, xuejiBonus:G.xuejiBonus||0, turnStats:G.turnStats||null,"""
new = """    turnAtkBuff:G.turnAtkBuff||0, karmaFire:G.karmaFire||0, bloodPact:G.bloodPact||0, retain:G.retain||0, xiejia:G.xiejia||0,
    shiqi:G.尸气||0, xuenu:G.xuenu||0, xisuiTurns:G.xisuiTurns||0,
    duhun:G.duhun||null, xuejiBonus:G.xuejiBonus||0, turnStats:G.turnStats||null,"""
rep(old, new, 1, 'B7b-save-res')

old = """  G.totalHpLost=d.totalHpLost||0;
  G.wangyouTurns=d.wangyouTurns||0; G.wangyouDrunk=d.wangyouDrunk||0;"""
new = """  G.totalHpLost=d.totalHpLost||0;
  G.尸气=d.shiqi||0; G.xuenu=d.xuenu||0; G.xisuiTurns=d.xisuiTurns||0;
  G.wangyouTurns=d.wangyouTurns||0; G.wangyouDrunk=d.wangyouDrunk||0;"""
rep(old, new, 1, 'B7c-continue-res')

# ---------- B8 weightedCard：尸王仅赶尸人专属 ----------
old = """  const eligible=CARDS.filter(c=>!c.needs || deckHasMechanic(c.needs));"""
new = """  const eligible=CARDS.filter(c=> (c.id!=='shi_wang' || G.hero==='ganshiren') && (!c.needs || deckHasMechanic(c.needs)));"""
rep(old, new, 1, 'B8-weighted-shiwang')

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('BATCH B1 DONE')
