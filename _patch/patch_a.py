# -*- coding: utf-8 -*-
import io, sys

P = r"C:\Users\HP\Desktop\志怪塔\原型.html"
s = io.open(P, 'r', encoding='utf-8').read()

def rep(old, new, n=1, label=''):
    global s
    c = s.count(old)
    if c != n:
        print('FAIL[%s]: expected %d occurrences, got %d' % (label, n, c))
        sys.exit(1)
    s = s.replace(old, new)
    print('ok[%s]' % label)

# ---------- A1 helpers block (replaces DYNAMIC_DMG const line) ----------
old1 = "const DYNAMIC_DMG = ['tiebushan','shihun','qungui','taomufu','shixue','baigui'];"
new1 = old1 + """
/* ===================== 全卡重做：流派 / 资源 / 召唤 / 状态 助手 ===================== */
const COL_A='ganshiren', COL_B='wuseng', COL_C='yincha', COL_D='tianshi';
const GHOST_IDS = ['zhiren','xiaogui','wutong','yinbingguo','zhongkui','shi_wang'];      // 【鬼怪牌】白名单（6 张）
const CAN_CURSE_IDS = ['huofu','wanjian','taomufu','shihunzhou','sheshen','fenfu','zhouyin','zhouyu']; // 无条件可施加诅咒的牌（8 张）
const isGhostCard = c => !!(c && c.type==='spirit' && GHOST_IDS.includes(c.id));
const isCanCurse  = c => !!(c && CAN_CURSE_IDS.includes(c.id));
/* —— 尸气 —— */
function gainShiqi(n){ if(!n || n<=0) return; G.尸气 = Math.min(G.maxShiQi||10, (G.尸气||0)+n); }
function hasShiqi(n){ return (G.尸气||0) >= n; }
function spendShiqi(n){ if(!hasShiqi(n)) return false; G.尸气 -= n; return true; }
/* —— 血怒（不自动烧；只在使用“每层+N”效果时消耗实际用到的层数） —— */
function gainRage(n){ if(!n || n<=0) return; G.xuenu = Math.min(G.maxXuenu||10, (G.xuenu||0)+n); }
function rageLayers(){ return G.xuenu||0; }
/* per=每层加成, cap=加成上限：返回可使用的层数，并就地消耗 */
function rageSpend(per, cap){ const layers=Math.floor(cap/per); const use=Math.min(layers, rageLayers()); if(use>0){ G.xuenu -= use; } return use; }
/* —— 召唤 —— */
function addSummon(o){ G.summonsMadeTurn=(G.summonsMadeTurn||0)+1; G.summons.push(o); }
function isSummon(type){ return G.summons.some(s=>s.type===type && s.dur>0); }
function summonTarget(preferCursed){
  const al=aliveEnemies(); if(!al.length) return null;
  if(preferCursed){ const cu=al.filter(e=>(e.curse||0)>0); if(cu.length) return cu[Math.floor(Math.random()*cu.length)]; }
  return al[Math.floor(Math.random()*al.length)];
}
/* —— 镇魂（含“此前已被镇魂”永久标记） —— */
function wasSealedBefore(e){ return !!(e && (e.seal || e.sealedEver)); }
function sealEnemy(e, turns){
  if(!e) return false;
  if(isLinghua(e)){ log(e.name+' 灵化免疫了【镇魂】'); return false; }
  e.sealedEver=true; e.seal=true; e.sealTurn=turns||1; floatMsg('镇魂');
  log(e.name+' 被【镇魂】封印'+(e.sealTurn>1?(' '+e.sealTurn+' 回合'):''));
  return true;
}
/* —— 魅惑（charmPct=剩余伤害比例；升级更狠 25%） —— */
function charmEnemy(e, pct){
  if(!e) return false;
  if(isLinghua(e)){ log(e.name+' 灵化免疫了【魅惑】'); return false; }
  e.charm=(e.charm||0)+1;
  const np=(pct==null?0.5:pct);
  e.charmPct = (e.charmPct==null?np:Math.min(e.charmPct,np));
  floatMsg('魅惑');
  log(e.name+' 被【魅惑】'+(np<0.5?('（伤害降至 '+Math.round(np*100)+'%）'):''));
  return true;
}
/* —— 尸王牌回到弃牌堆 —— */
function removeCardEverywhere(c){ [G.hand,G.drawPile,G.discard].forEach(p=>{ const i=p.indexOf(c); if(i>=0) p.splice(i,1); }); }
function returnShiWangCard(){
  const c=G.shiWangCard; if(!c) return;
  removeCardEverywhere(c); G.discard.push(c); G.shiWangCard=null;
  log('【尸王】的召唤物消散，回到弃牌堆');
}
"""
rep(old1, new1, 1, 'A1-helpers')

# ---------- A2 newState new fields ----------
old2 = """    // 符箓天师专用状态
    curseOverflowBlock:0 };"""
new2 = """    // 符箓天师专用状态
    curseOverflowBlock:0,
    // ===== 全卡重做：新增通用状态 =====
    hpLostTurn:0, blockGainedTurn:0, summonsMadeTurn:0, lastDrawnCards:[],
    retainHeal:0, pendingBlockStart:0, boostCurse:0, xisuiTurns:0,
    shiWangCard:null, ranhunType:null, ranhunSelf:null, endBlockKind:null };"""
rep(old2, new2, 1, 'A2-newState')

# ---------- A3 loseHp: hpLostTurn counter + remove auto 血怒/小妖被动 ----------
old3 = """function loseHp(n){
  const c=bloodCost(n);
  G.hp-=c;
  G.totalHpLost=(G.totalHpLost||0)+c;

  // 血祭阴差：每失去1点生命，获得1层【血怒】（上限10层）
  if(G.hero === 'yincha') {
    G.xuenu = Math.min(G.maxXuenu, G.xuenu + c);
    log(`血祭阴差：失去 ${c} 点生命，获得 ${c} 层【血怒】（当前 ${G.xuenu}/${G.maxXuenu}）`);
  }

  // 血契（天师版）：每失去1点生命，对随机敌人施加1层诅咒并获得1/2格挡
  if(G.xueqiEffect && c > 0) {
    for(let i = 0; i < c; i++) {
      const randomEnemy = randomAlive();
      if(randomEnemy) {
        applyCurse(randomEnemy, 1);
      }
    }
    gainBlock(c * G.xueqiBlock);
    log(`血契：失去 ${c} 点生命，对敌人施加 ${c} 层【诅咒】并获得 ${c * G.xueqiBlock} 点格挡`);
  }

  // 舍身（天师版）：本回合每失去1点生命，对随机敌人施加1层诅咒
  if(G.sheshenCurse && c > 0) {
    for(let i = 0; i < c; i++) { const r=randomAlive(); if(r) applyCurse(r,1); }
  }

  if(G.xuejiArmed) G.xuejiHurt=true;
  if(G.hero==='yincha'){ yinchaSummon(); }
  if(G.bloodPact){
    gainBlock(c*G.bloodPact);
    log(`血契：以 ${c} 点生命换取 ${c*G.bloodPact} 点格挡`);
  }
}
function yinchaSummon(){
  const existing=G.summons.find(s=>s.type==='xiaoyao');
  if(existing){ existing.dur+=1; log('小妖嗜血，持续回合 +1'); }
  else { G.summons.push({type:'xiaoyao', v:1, dur:1}); log('血祭阴差：召唤一只小妖'); }
}"""
new3 = """function loseHp(n){
  // 【失去生命】口径：任何来源（含敌人攻击）都计入 hpLostTurn，仅作卡面计数；不再自动触发血怒/小妖
  const c=bloodCost(n);
  G.hp-=c;
  G.totalHpLost=(G.totalHpLost||0)+c;
  G.hpLostTurn=(G.hpLostTurn||0)+c;

  // 血契（天师版）：每失去1点生命，对随机敌人施加1层诅咒并获得1/2格挡
  if(G.xueqiEffect && c > 0) {
    for(let i = 0; i < c; i++) {
      const randomEnemy = randomAlive();
      if(randomEnemy) {
        applyCurse(randomEnemy, 1);
      }
    }
    gainBlock(c * G.xueqiBlock);
    log(`血契：失去 ${c} 点生命，对敌人施加 ${c} 层【诅咒】并获得 ${c * G.xueqiBlock} 点格挡`);
  }

  // 舍身（天师版）：本回合每失去1点生命，对随机敌人施加1层诅咒
  if(G.sheshenCurse && c > 0) {
    for(let i = 0; i < c; i++) { const r=randomAlive(); if(r) applyCurse(r,1); }
  }

  if(G.xuejiArmed) G.xuejiHurt=true;
  if(G.bloodPact){
    gainBlock(c*G.bloodPact);
    log(`血契：以 ${c} 点生命换取 ${c*G.bloodPact} 点格挡`);
  }
}
// 血祭阴差的扣血卡：召唤一只小妖（保留小妖身份，但仅在显式调用时触发）
function yinchaSummon(){
  const existing=G.summons.find(s=>s.type==='xiaoyao');
  if(existing){ existing.dur+=1; log('小妖嗜血，持续回合 +1'); }
  else { G.summons.push({type:'xiaoyao', v:1, dur:1}); log('血祭阴差：召唤一只小妖'); }
}"""
rep(old3, new3, 1, 'A3-loseHp')

# ---------- A4 gainBlock counter ----------
old4 = """function gainBlock(n){
  G.block+=n;
  if(n>0){ sfx('block'); floatDamage('+'+n, 'block', document.querySelector('#player-panel .hpbar')); }
}"""
new4 = """function gainBlock(n){
  G.block+=n;
  if(n>0){ G.blockGainedTurn=(G.blockGainedTurn||0)+n; sfx('block'); floatDamage('+'+n, 'block', document.querySelector('#player-panel .hpbar')); }
}"""
rep(old4, new4, 1, 'A4-gainBlock')

# ---------- A5 drawCards lastDrawnCards ----------
old5 = """function drawCards(n){
  const drawn=[];
  for(let i=0;i<n;i++){
    if(G.hand.length>=10){ log('手牌已满'); break; }
    if(!G.drawPile.length){ if(!G.discard.length) break; G.drawPile=shuffle(G.discard); G.discard=[]; log('弃牌堆洗回抽牌堆'); }
    const c=G.drawPile.pop(); G.hand.push(c); drawn.push(c.name);
  }
  if(drawn.length) log(`摸 ${drawn.length} 张：${drawn.join('、')}`);
}"""
new5 = """function drawCards(n){
  const drawn=[]; const objs=[];
  for(let i=0;i<n;i++){
    if(G.hand.length>=10){ log('手牌已满'); break; }
    if(!G.drawPile.length){ if(!G.discard.length) break; G.drawPile=shuffle(G.discard); G.discard=[]; log('弃牌堆洗回抽牌堆'); }
    const c=G.drawPile.pop(); G.hand.push(c); drawn.push(c.name); objs.push(c);
  }
  G.lastDrawnCards=objs;
  if(drawn.length) log(`摸 ${drawn.length} 张：${drawn.join('、')}`);
}"""
rep(old5, new5, 1, 'A5-drawCards')

# ---------- A6 discardRandomHand returns card ----------
old6 = "function discardRandomHand(){ if(!G.hand.length) return; const i=Math.floor(Math.random()*G.hand.length); const c=G.hand.splice(i,1)[0]; if(c.type!=='junk') G.discard.push(c); log(`弃掉【${c.name}】`); }"
new6 = "function discardRandomHand(){ if(!G.hand.length) return null; const i=Math.floor(Math.random()*G.hand.length); const c=G.hand.splice(i,1)[0]; if(c.type!=='junk') G.discard.push(c); log(`弃掉【${c.name}】`); return c; }"
rep(old6, new6, 1, 'A6-discardRandomHand')

# ---------- A7 dealDamageTo self-damage counters ----------
old7a = """  if(e.affixes && d>0){ const fz=e.affixes.find(a=>a.id==='fanzhen'); if(fz){ const r=3*fz.tier; G.hp=Math.max(0,G.hp-r); G.totalHpLost=(G.totalHpLost||0)+r; G.turnStats.dmgTaken+=r; log(`${e.name} 反震：反弹 ${r} 点伤害`); } }
  if(e.key==='xiuluowang' && (G.karmaFire||0)>0 && d>0){ G.hp=Math.max(0,G.hp-1); G.totalHpLost=(G.totalHpLost||0)+1; G.turnStats.dmgTaken+=1; log('业火反噬：你对修罗王造成伤害，损失 1 点生命'); }"""
new7a = """  if(e.affixes && d>0){ const fz=e.affixes.find(a=>a.id==='fanzhen'); if(fz){ const r=3*fz.tier; G.hp=Math.max(0,G.hp-r); G.totalHpLost=(G.totalHpLost||0)+r; G.hpLostTurn=(G.hpLostTurn||0)+r; G.turnStats.dmgTaken+=r; log(`${e.name} 反震：反弹 ${r} 点伤害`); } }
  if(e.key==='xiuluowang' && (G.karmaFire||0)>0 && d>0){ G.hp=Math.max(0,G.hp-1); G.totalHpLost=(G.totalHpLost||0)+1; G.hpLostTurn=(G.hpLostTurn||0)+1; G.turnStats.dmgTaken+=1; log('业火反噬：你对修罗王造成伤害，损失 1 点生命'); }"""
rep(old7a, new7a, 1, 'A7a-selfdmg')

# ---------- A8 dealDamageToPlayer: charm pct + hpLostTurn ----------
old8 = "  if(attacker.charm>0){ d=Math.floor(d*0.5); attacker.charm--; }"
new8 = "  if(attacker.charm>0){ const cpr=attacker.charmPct!=null?attacker.charmPct:0.5; d=Math.floor(d*cpr); attacker.charm--; if(attacker.charm<=0) attacker.charmPct=0.5; }"
rep(old8, new8, 1, 'A8a-charmPct')

old8b = "  G.totalHpLost=(G.totalHpLost||0)+loss;"
new8b = "  G.totalHpLost=(G.totalHpLost||0)+loss;\n  G.hpLostTurn=(G.hpLostTurn||0)+loss;"
rep(old8b, new8b, 1, 'A8b-hpLostPlayer')

# ---------- A9 makeEnemy literal: charmPct + sealedEver ----------
old9 = "curse:0, charm:0, seal:false, strength:0, kind:def.kind, elite:!!def.elite, boss:!!def.boss, aggressive:!!def.aggressive, lifesteal:def.lifesteal||0, phase:!!def.phase, phase2:false, intents2, ledgerActive:false, ledgerDmg:0, ledgerAffix:null, split:!!def.split, splitDone:false, sealedCost:0, uid:UID++};"
new9 = "curse:0, charm:0, charmPct:0.5, sealedEver:false, seal:false, strength:0, kind:def.kind, elite:!!def.elite, boss:!!def.boss, aggressive:!!def.aggressive, lifesteal:def.lifesteal||0, phase:!!def.phase, phase2:false, intents2, ledgerActive:false, ledgerDmg:0, ledgerAffix:null, split:!!def.split, splitDone:false, sealedCost:0, uid:UID++};"
rep(old9, new9, 1, 'A9-makeEnemy')

# ---------- A10 enterPhase2 reset charmPct ----------
old10 = "  e.block=0; e.curse=0; e.charm=0; e.seal=false; e.pendingDamage=0;"
new10 = "  e.block=0; e.curse=0; e.charm=0; e.charmPct=0.5; e.seal=false; e.pendingDamage=0;"
rep(old10, new10, 1, 'A10-phase2')

# ---------- A11 serializeEnemy / restoreEnemy ----------
old11 = " return { key:e.key, hp:e.hp, maxHp:e.maxHp, block:e.block, pingbi:e.pingbi||0, curse:e.curse||0, charm:e.charm||0, seal:!!e.seal, sealTurn:e.sealTurn||0, strength:e.strength||0, pendingDamage:e.pendingDamage||0, intentIndex:e.intentIndex||0, intent:e.intent||{type:'dormant'}, phase2:!!e.phase2, ledgerActive:!!e.ledgerActive, ledgerDmg:e.ledgerDmg||0, ledgerAffix:e.ledgerAffix||null, splitDone:!!e.splitDone, sealedCost:e.sealedCost||0, affixes:e.affixes||[] };"
new11 = " return { key:e.key, hp:e.hp, maxHp:e.maxHp, block:e.block, pingbi:e.pingbi||0, curse:e.curse||0, charm:e.charm||0, charmPct:e.charmPct||0.5, sealedEver:!!e.sealedEver, seal:!!e.seal, sealTurn:e.sealTurn||0, strength:e.strength||0, pendingDamage:e.pendingDamage||0, intentIndex:e.intentIndex||0, intent:e.intent||{type:'dormant'}, phase2:!!e.phase2, ledgerActive:!!e.ledgerActive, ledgerDmg:e.ledgerDmg||0, ledgerAffix:e.ledgerAffix||null, splitDone:!!e.splitDone, sealedCost:e.sealedCost||0, affixes:e.affixes||[] };"
rep(old11, new11, 1, 'A11a-serializeEnemy')

old11b = " e.hp=d.hp; e.maxHp=d.maxHp; e.block=d.block; e.pingbi=d.pingbi; e.curse=d.curse; e.charm=d.charm; e.seal=d.seal; e.sealTurn=d.sealTurn||0; e.strength=d.strength; e.pendingDamage=d.pendingDamage; e.intentIndex=d.intentIndex; e.intent=d.intent; e.phase2=d.phase2; e.ledgerActive=d.ledgerActive; e.ledgerDmg=d.ledgerDmg; e.ledgerAffix=d.ledgerAffix; e.splitDone=d.splitDone; e.sealedCost=d.sealedCost; e.affixes=d.affixes;"
new11b = " e.hp=d.hp; e.maxHp=d.maxHp; e.block=d.block; e.pingbi=d.pingbi; e.curse=d.curse; e.charm=d.charm; e.charmPct=d.charmPct||0.5; e.sealedEver=!!d.sealedEver; e.seal=d.seal; e.sealTurn=d.sealTurn||0; e.strength=d.strength; e.pendingDamage=d.pendingDamage; e.intentIndex=d.intentIndex; e.intent=d.intent; e.phase2=d.phase2; e.ledgerActive=d.ledgerActive; e.ledgerDmg=d.ledgerDmg; e.ledgerAffix=d.ledgerAffix; e.splitDone=d.splitDone; e.sealedCost=d.sealedCost; e.affixes=d.affixes;"
rep(old11b, new11b, 1, 'A11b-restoreEnemy')

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('BATCH A DONE')
