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

# ================= doPlayCard 定向修改 =================
# d1 血怒自动消耗 -> 移除
old = """  // 血祭阴差：攻击牌伤害增加血怒层数
  let xuenuBonus = 0;
  if(G.hero === 'yincha' && c.type === 'attack' && G.xuenu > 0) {
    xuenuBonus = 1; // 每次攻击消耗1层血怒，增加1点伤害
    G.xuenu = Math.max(0, G.xuenu - 1); // 消耗1层血怒
    log(`血怒：消耗 1 层【血怒】，攻击伤害 +1（剩余 ${G.xuenu}/${G.maxXuenu} 层）`);
  }"""
new = """  // 血怒：不再随攻击牌自动消耗；仅卡面“每层+N（上限M）”效果在打出时自行消耗对应层数
  const xuenuBonus = 0;"""
rep(old, new, 1, 'd1-doPlayCard-rage')

# d2 弃牌堆：尸王不入堆
old = """  if(c.type!=='junk'){
    if(c.exhaust){ if(deckIndex>=0){ G.deck.splice(deckIndex,1); } log(`【${c.name}】已消耗（本局不再出现）`); }
    else G.discard.push(c);
  }"""
new = """  if(c.type!=='junk'){
    if(c.exhaust){ if(deckIndex>=0){ G.deck.splice(deckIndex,1); } log(`【${c.name}】已消耗（本局不再出现）`); }
    else if(c.id==='shi_wang' && G.hero==='ganshiren'){ /* 尸王：召唤物存活期间不进弃牌堆（成功后记 G.shiWangCard） */ }
    else G.discard.push(c);
  }"""
rep(old, new, 1, 'd2-doPlayCard-shiwang')

# d3 守一(天师)强化预结算
old = """  const effResult = c.eff(c.up, c, xuenuBonus);"""
new = """  if(G.hero==='tianshi' && c.curseBoostLayer){ G.boostCurse=(G.boostCurse||0)+1; c.curseBoostLayer=0; log('守一强化：此牌本次施加的诅咒额外 +1 层'); }
  const effResult = c.eff(c.up, c, xuenuBonus);"""
rep(old, new, 1, 'd3-doPlayCard-boost')

# d4 打出后：燃魂回复 + 尸王引用
old = """  if(c.type==='junk'){ // 状态牌（废牌）追踪：用于静心诀/燃魂天师
    G.junkPlayedThisTurn=(G.junkPlayedThisTurn||0)+1;
    if(G.ranhunTianshi){ G.hp=Math.min(G.maxHp, G.hp+2); floatMsg('+2 生命'); log('燃魂：打出状态牌，恢复 2 点生命'); }
  }"""
new = """  if(c.type==='junk'){ G.junkPlayedThisTurn=(G.junkPlayedThisTurn||0)+1; }
  // 燃魂(#36)：本回合每打出对应类型的牌（燃魂自身除外），恢复 2 点生命
  if(G.ranhunType && !(G.ranhunSelf && G.ranhunSelf===c)){
    const mt = G.ranhunType==='ghost' ? isGhostCard(c) : (c.type===G.ranhunType);
    if(mt){ G.hp=Math.min(G.maxHp, G.hp+2); floatMsg('+2 生命'); log(`燃魂：打出【${c.name}】，恢复 2 点生命`); }
  }
  // 尸王(#48)：成功打出后记录卡牌引用，等召唤物消散再回弃牌堆
  if(c.id==='shi_wang' && G.hero==='ganshiren'){ G.shiWangCard=c; }"""
rep(old, new, 1, 'd4-doPlayCard-ranhun-shiwang')

# ================= startTurn 整段重写 =================
old = """function startTurn(){
  G.turn=(G.turn||0)+1;
  G.turnStats={dmgTaken:0, blocked:0, dealt:0, kills:[]};
  turnBanner('第 '+G.turn+' 回合');
  if(G.burn>0){ const bd=G.burn*2; G.hp=Math.max(0,G.hp-bd); G.turnStats.dmgTaken+=bd; log(`灼烧：失去 ${bd} 点生命（${G.burn} 层）`); if(G.hp<=0){ G.hp=0; loseGame(); return; } }
  G.skillsPlayedThisTurn=0; G.attackBuff=0; G.turnAtkBuff=0; G.bloodPact=0; G.retain=0;
  G.energy=3+G.pendingEnergy;
  if(G.energyBonusTurns>0){ G.energy+=1; G.energyBonusTurns--; }
  G.pendingEnergy=0;
  tickSeals();
  if(G.karmaFire>0) G.karmaFire--;
  if(G.duhun && G.duhun.turns>0) G.duhun.turns--;
  if(G.xiejia>0){ /* 卸甲生元：格挡不清零，累计 */ }
  else if(G.hero !== 'wuseng'){ G.block = 0; }  // 非苦行武僧和卸甲生元状态的角色回合结束清零格挡
  G.thorns=0; G.dodge=0; if(G.debuffImmune>0) G.debuffImmune--;
  if(hasRelic('hushenfu')){ gainBlock(2); log('护身符：+2 格挡'); }
  if(G.hero==='wuseng'){ gainBlock(2); log('苦行武僧：+2 格挡'); }
  // 洗髓经（天师版）：每回合开始时对随机敌人施加1层诅咒
  if(G.xisuiCurseTurns > 0) {
    const randomEnemy = randomAlive();
    if(randomEnemy) {
      applyCurse(randomEnemy, 1);
      log(`洗髓经：对 ${randomEnemy.name} 施加 1 层【诅咒】`);
    }
    G.xisuiCurseTurns--;
  }
  // 茅山赶尸人：每回合开始时，场上每有 1 个召唤单位，获得 1 点【尸气】
  if(G.hero==='ganshiren'){
    const summonCount = G.summons.length;
    if(summonCount > 0) {
      G.尸气 = Math.min(G.maxShiQi, G.尸气 + summonCount);
      log(`养尸为用：获得 ${summonCount} 点【尸气】（当前 ${G.尸气}/${G.maxShiQi}）`);
    }
  }
  // 五通神：每回合开始给格挡（剩余回合 -1）
  if(G.summons.some(s=>s.type==='wutong')){
    const wb = G.hero==='ganshiren' ? 1 : 0;
    G.summons.forEach(s=>{ if(s.type==='wutong' && s.dur>0){ gainBlock(s.v+wb); log(`五通神：你获得 ${s.v+wb} 点格挡`); s.dur--; } });
    G.summons=G.summons.filter(s=>s.dur>0);
  }
  // 五通神（天师版）：每回合开始获得 4 格挡，并对随机敌人施加 1 层诅咒
  if(G.summons.some(s=>s.type==='wutong_tianshi')){
    G.summons.forEach(s=>{ if(s.type==='wutong_tianshi' && s.dur>0){ gainBlock(s.v); const wt=randomAlive(); if(wt) applyCurse(wt,1); log('五通神：获得 4 格挡并对随机敌人施加 1 层【诅咒】'); s.dur--; } });
    G.summons=G.summons.filter(s=>s.dur>0);
  }
  if(G.hero==='tianshi'){
    // 咒印道体：每回合开始时，对【诅咒】层数最高的敌人施加 1 层诅咒。若该敌人已达 6 层上限，改为获得 2 点格挡。
    let maxCurseEnemy = null;
    let maxCurseCount = -1;
    for(const enemy of aliveEnemies()){
      if(enemy.curse > maxCurseCount){
        maxCurseCount = enemy.curse;
        maxCurseEnemy = enemy;
      }
    }
    if(maxCurseEnemy){
      if(maxCurseCount >= 6){
        gainBlock(2);
        log('咒印道体：敌人诅咒已达上限，获得 2 点格挡');
      } else {
        applyCurse(maxCurseEnemy, 1);
        log(`咒印道体：对敌人施加 1 层诅咒（当前最高 ${maxCurseCount} 层）`);
      }
    }
    // 守一（天师版）：上回合保留的状态牌 → 本回合开始对随机敌人施加诅咒
    if((G.shouyiCurseCount||0)>0){
      for(let i=0;i<G.shouyiCurseCount;i++){ const st=randomAlive(); if(st) applyCurse(st,1); }
      log(`守一：本回合开始对随机敌人施加 ${G.shouyiCurseCount} 层【诅咒】`);
      G.shouyiCurseCount=0;
    }
    // 更新本回合的诅咒计数器
    CURSE_THIS_TURN = 0;
    // 重置本回合限定的天师效果标志
    G.ranhunTianshi=false; G.yixingTianshi=false; G.xuejiCurseTrack=false; G.junkPlayedThisTurn=0; G.shouyiTianshi=false; G.kaitianyanTianshi=false;
    G.jingjiCurse=false; G.tongpiCurse=false; G.fanzhenEffect=false; G.xueqiEffect=false; G.sheshenCurse=false;
  }
  aliveEnemies().forEach(e=>{
    if(G.turn===1 && !e.boss && !e.aggressive){ e.intent={type:'dormant'}; }
    else { e.intent=e.intents[e.intentIndex % e.intents.length]; e.intentIndex++; }
  });
  let n=5; if(G.gouhun>0){ n-=1; log('勾魂：本回合少抽 1 张牌'); } n=Math.max(1,n); if(G.dodgeDraw>0){ n+=G.dodgeDraw; log(`移形换影：闪避成功，额外摸 ${G.dodgeDraw} 张`); G.dodgeDraw=0; }
  if(hasRelic('yinyangjing')){ n+=1; log('阴阳镜：多抽 1 张'); }
  if(G.xuejiBonus>0){ n += G.xuejiBonus + (G.xuejiHurt?1:0); log(`血祭：额外摸 ${G.xuejiBonus+(G.xuejiHurt?1:0)} 张`); }
  G.xuejiBonus=0; G.xuejiArmed=false; G.xuejiHurt=false;
  log(`—— 第 ${G.turn} 回合 · HP ${G.hp}/${G.maxHp} · 格挡 ${G.block} · 符文 ${G.energy} ——`);
  drawCards(n); render();
  if(G.wangyouTurns>0){ G.wangyouTurns--; if(G.hand.length) showWangyouChoice(); else log('忘忧汤翻涌，但你手牌空空，躲过一劫'); }
  if(G.pendingDiscard>0){ G.pendingDiscard--; enemyRandomDiscard(); }
  saveRun();
}"""
new = """function startTurn(){
  G.turn=(G.turn||0)+1;
  G.turnStats={dmgTaken:0, blocked:0, dealt:0, kills:[]};
  turnBanner('第 '+G.turn+' 回合');
  // —— 回合内计数与一次性标记清零（供各列“本回合/抽到/失去生命/召唤”判定）——
  G.hpLostTurn=0; G.blockGainedTurn=0; G.summonsMadeTurn=0; CURSE_THIS_TURN=0;
  G.boostCurse=0; G.junkPlayedThisTurn=0; G.ranhunType=null; G.ranhunSelf=null;
  G.thorns=0; G.hitHeal=0; G.hitCurse=0; G.hitShiqi=0; G.hitRage=0; G.hitBlock=0; G.nextBlock=0;
  G.dodgeShiqi=0; G.dodgeNextBlock=0; G.dodgeHealRage=0; G.dodgeCurse=0;
  if(G.burn>0){ const bd=G.burn*2; G.hp=Math.max(0,G.hp-bd); G.turnStats.dmgTaken+=bd; log(`灼烧：失去 ${bd} 点生命（${G.burn} 层）`); if(G.hp<=0){ G.hp=0; loseGame(); return; } }
  G.skillsPlayedThisTurn=0; G.attackBuff=0; G.turnAtkBuff=0; G.bloodPact=0; G.retain=0;
  G.energy=3+G.pendingEnergy;
  if(G.energyBonusTurns>0){ G.energy+=1; G.energyBonusTurns--; }
  G.pendingEnergy=0;
  tickSeals();
  if(G.karmaFire>0) G.karmaFire--;
  if(G.duhun && G.duhun.turns>0) G.duhun.turns--;
  if(G.xiejia>0){ /* 卸甲生元：格挡不清零，累计 */ }
  else if(G.hero !== 'wuseng'){ G.block = 0; }  // 非苦行武僧和卸甲生元状态的角色回合结束清零格挡
  G.dodge=0; if(G.debuffImmune>0) G.debuffImmune--;
  if(hasRelic('hushenfu')){ gainBlock(2); log('护身符：+2 格挡'); }
  if(G.hero==='wuseng'){ gainBlock(2); log('苦行武僧：+2 格挡'); }
  // 上回合结转：守一(#26C 回血 / #26B 或 #22B 反震给的格挡)
  if(G.pendingBlockStart>0){ gainBlock(G.pendingBlockStart); log(`上回合结转：获得 ${G.pendingBlockStart} 点格挡`); G.pendingBlockStart=0; }
  if(G.retainHeal>0){ heal(G.retainHeal); log(`守一：恢复 ${G.retainHeal} 点生命`); G.retainHeal=0; }
  // 洗髓经(#32)：接下来 X 回合，每回合开始获得该英雄增益 + 1 点符文
  if((G.xisuiTurns||0)>0){
    G.xisuiTurns--;
    G.energy+=1;
    if(G.hero==='ganshiren'){ gainShiqi(1); log('洗髓经：获得 1 点【尸气】与 1 点符文'); }
    else if(G.hero==='wuseng'){ gainBlock(2); log('洗髓经：获得 2 点格挡与 1 点符文'); }
    else if(G.hero==='yincha'){ loseHp(2); gainRage(1); log('洗髓经：失去 2 点生命，获得 1 层【血怒】与 1 点符文'); }
    else { const re=randomAlive(); if(re) applyCurse(re,1); log('洗髓经：对随机敌人施加 1 层【诅咒】并获 1 点符文'); }
  }
  // 茅山赶尸人：每回合开始时，场上每有 1 个存活召唤单位，获得 1 点【尸气】
  if(G.hero==='ganshiren'){
    const summonCount = G.summons.filter(s=>s.dur>0).length;
    if(summonCount > 0) {
      G.尸气 = Math.min(G.maxShiQi, G.尸气 + summonCount);
      log(`养尸为用：获得 ${summonCount} 点【尸气】（当前 ${G.尸气}/${G.maxShiQi}）`);
    }
  }
  // 召唤单位·回合开始效果（纸人[武僧]、阴兵[武僧]、五通神全英雄）
  for(const s of G.summons.slice()){
    if(s.dur<=0) continue;
    if(s.type==='zhiren' && G.hero==='wuseng'){ gainBlock(2); log('纸人存活：获得 2 点格挡'); }
    else if(s.type==='yinbing' && G.hero==='wuseng'){ gainBlock(3); log('阴兵存活：获得 3 点格挡'); }
    else if(s.type==='wutong'){
      gainBlock(3);
      if(G.hero==='ganshiren'){ gainShiqi(1); log('五通神：获得 3 点格挡与 1 点【尸气】'); }
      else if(G.hero==='tianshi'){ const wt=randomAlive(); if(wt) applyCurse(wt,1); log('五通神：获得 3 点格挡并对随机敌人施加 1 层【诅咒】'); }
      else log('五通神：获得 3 点格挡');
      if(!s.indefinite) s.dur--;
    }
  }
  G.summons = G.summons.filter(s=> s.type==='wutong' ? (s.indefinite || s.dur>0) : s.dur>0);
  if(G.hero==='tianshi'){
    // 咒印道体：每回合开始时，对【诅咒】层数最高的敌人施加 1 层诅咒。若该敌人已达 6 层上限，改为获得 2 点格挡。
    let maxCurseEnemy = null;
    let maxCurseCount = -1;
    for(const enemy of aliveEnemies()){
      if(enemy.curse > maxCurseCount){
        maxCurseCount = enemy.curse;
        maxCurseEnemy = enemy;
      }
    }
    if(maxCurseEnemy){
      if(maxCurseCount >= 6){ gainBlock(2); log('咒印道体：敌人诅咒已达上限，获得 2 点格挡'); }
      else { applyCurse(maxCurseEnemy, 1); log(`咒印道体：对敌人施加 1 层诅咒（当前最高 ${maxCurseCount} 层）`); }
    }
  }
  aliveEnemies().forEach(e=>{
    if(G.turn===1 && !e.boss && !e.aggressive){ e.intent={type:'dormant'}; }
    else { e.intent=e.intents[e.intentIndex % e.intents.length]; e.intentIndex++; }
  });
  let n=5; if(G.gouhun>0){ n-=1; log('勾魂：本回合少抽 1 张牌'); } n=Math.max(1,n); if(G.dodgeDraw>0){ n+=G.dodgeDraw; log(`额外摸 ${G.dodgeDraw} 张（上回合效果）`); G.dodgeDraw=0; }
  if(hasRelic('yinyangjing')){ n+=1; log('阴阳镜：多抽 1 张'); }
  if(G.xuejiBonus>0){ n += G.xuejiBonus; log(`血祭：额外摸 ${G.xuejiBonus} 张`); }
  G.xuejiBonus=0; G.xuejiArmed=false; G.xuejiHurt=false;
  log(`—— 第 ${G.turn} 回合 · HP ${G.hp}/${G.maxHp} · 格挡 ${G.block} · 符文 ${G.energy} ——`);
  drawCards(n); render();
  if(G.wangyouTurns>0){ G.wangyouTurns--; if(G.hand.length) showWangyouChoice(); else log('忘忧汤翻涌，但你手牌空空，躲过一劫'); }
  if(G.pendingDiscard>0){ G.pendingDiscard--; enemyRandomDiscard(); }
  saveRun();
}"""
rep(old, new, 1, 'startTurn')

# ================= triggerSummons 整段重写 + summonAct / onSummonDeath =================
old = """function triggerSummons(decay){
  // 检查是否有尸王在场
  const hasShiWang = G.summons.some(s => s.type === 'shi_wang');
  const bonus = G.hero==='ganshiren' ? 1 : 0;

  for(const s of G.summons){
    if(s.dur<=0) continue;
    if(s.type==='zhiren'){ const t=randomAlive(); if(t){ dealDamageTo(t, (hasShiWang ? s.v + 2 : s.v) + bonus); applyCurse(t,1); floatMsg('诅咒 +1'); log('纸人施加 1 层【诅咒】'); } }
    else if(s.type==='zhiren_enhanced'){ const t=randomAlive(); if(t){ dealDamageTo(t, (hasShiWang ? s.v + 2 : s.v) + bonus); applyCurse(t,2); floatMsg('诅咒 +2'); log('强化纸人施加 2 层【诅咒】'); } }  // 增强版纸人施加2层诅咒
    else if(s.type==='zhiren_tianshi'){ // 符箓天师纸人：对有诅咒的敌人造成额外伤害
      const t=randomAlive();
      if(t){
        let damage = s.v + bonus;
        damage += t.curse || 0; // 每层诅咒增加1点伤害
        dealDamageTo(t, damage);
        log(`纸人：因敌人有 ${(t.curse||0)} 层诅咒，伤害 +${(t.curse||0)}`);
      }
    }
    else if(s.type==='xiaogui'){ const t=randomAlive(); if(t) dealDamageTo(t, (hasShiWang ? s.v + 2 : s.v) + bonus); }
    else if(s.type==='xiaogui_enhanced'){ const t=randomAlive(); if(t) dealDamageTo(t, (hasShiWang ? s.v + 2 : s.v) + bonus + 2); }  // 增强版小鬼额外+2伤害
    else if(s.type==='xiaogui_tianshi'){ const t=mostCursedEnemy(); if(t){ dealDamageTo(t, s.v + bonus); log('小鬼：攻击诅咒层数最高的敌人'); } }
    else if(s.type==='yinbing'){ const t=randomAlive(); if(t) dealDamageTo(t, (hasShiWang ? s.v + 2 : s.v) + bonus); }
    else if(s.type==='yinbing_tianshi'){ const t=mostCursedEnemy(); if(t){ dealDamageTo(t, s.v + bonus); applyCurse(t, 1); } }
    else if(s.type==='xiaoyao'){ const t=randomAlive(); if(t) dealDamageTo(t, (hasShiWang ? s.v + 2 : s.v) + bonus); }
    else if(s.type==='shi_wang'){
      // 尸王对所有敌人造成伤害
      for(const e of aliveEnemies()) {
        // 使用统一字段 v（与其他召唤单位一致）作为伤害值
        dealDamageTo(e, s.v);
      }
    }
    if(decay && s.type!=='wutong' && s.type!=='wutong_tianshi') s.dur--;
  }
  if(decay) {
    // 处理死亡的召唤单位，包括尸王死亡时给予尸气
    const expiredSummons = [];
    for(const s of G.summons) {
      if(s.dur <= 0 && s.type !== 'wutong' && s.type !== 'wutong_tianshi') {
        expiredSummons.push(s);
      }
    }

    // 移除持续回合结束的召唤单位
    G.summons = G.summons.filter(s => s.dur > 0 || s.type === 'wutong' || s.type === 'wutong_tianshi');

    // 茅山赶尸人：召唤单位死亡时，获得 2 点【尸气】
    if(G.hero === 'ganshiren') {
      let shiqiGain = 0;
      for(const s of expiredSummons) {
        if(s.type === 'shi_wang') {
          // 尸王死亡时获得5点尸气
          shiqiGain += 5;
        } else {
          // 其他召唤单位死亡时获得2点尸气
          shiqiGain += 2;
        }
      }

      if(shiqiGain > 0) {
        G.尸气 = Math.min(G.maxShiQi, G.尸气 + shiqiGain);
        log(`养尸为用：召唤单位死亡，获得 ${shiqiGain} 点【尸气】（当前 ${G.尸气}/${G.maxShiQi}）`);
      }
    }
  }
}"""
new = """/* 单个召唤单位触发一次“回合末行动”（被回合末 / 附灵术 / 群鬼乱舞调用） */
function summonAct(s){
  const types=['zhiren','xiaogui','yinbing','xiaoyao','shi_wang'];
  if(!types.includes(s.type)) return;
  // 尸王在场：其他召唤单位伤害 +1
  const shiWangBonus = (s.type!=='shi_wang' && G.summons.some(x=>x.type==='shi_wang' && x.dur>0)) ? 1 : 0;
  const v = s.v + shiWangBonus;
  if(s.type==='zhiren'){
    if(G.hero==='tianshi'){
      // 天师：#41D 对随机敌人造成伤害，该敌人每有 1 层诅咒纸人伤害 +1
      const t=randomAlive();
      if(t){ dealDamageTo(t, v + (t.curse||0)); log(`纸人：因敌人 ${t.curse||0} 层诅咒，伤害 +${t.curse||0}`); }
    } else {
      // 赶尸人/武僧/阴差：#41A/B/C 造成伤害并施加 1 层诅咒；阴差额外回 1 血
      const t=randomAlive();
      if(t){ dealDamageTo(t, v); applyCurse(t,1); if(G.hero==='yincha'){ heal(1); log('纸人攻击，恢复 1 点生命'); } }
    }
  }
  else if(s.type==='xiaogui'){
    // #43：天师打诅咒最高敌人，其余打随机敌人
    const t = G.hero==='tianshi' ? (mostCursedEnemy()||randomAlive()) : randomAlive();
    if(t) dealDamageTo(t, v);
  }
  else if(s.type==='yinbing'){
    // #47：天师优先打带诅咒的敌人；其余随机。阴差(武僧/阴兵每只)按各自列结算回血在召唤处处理
    const t = G.hero==='tianshi' ? summonTarget(true) : randomAlive();
    if(t){
      dealDamageTo(t, v);
      if(G.hero==='yincha'){ heal(s.healV||1); log('阴兵攻击，为你恢复生命'); }
    }
  }
  else if(s.type==='xiaoyao'){ const t=randomAlive(); if(t) dealDamageTo(t, v); }
  else if(s.type==='shi_wang'){
    for(const e of aliveEnemies()) dealDamageTo(e, s.v);   // 尸王：每回合末对全体造成 10 点伤害
  }
}
/* 召唤单位消散时的结算（#41/#43/#47/#48） */
function onSummonDeath(s){
  if(s.type==='zhiren'){
    if(G.hero==='ganshiren'){ gainShiqi(2); log('纸人死亡，获得 2 点【尸气】'); }
  } else if(s.type==='xiaogui'){
    if(G.hero==='ganshiren'){ gainShiqi(2); log('小鬼死亡，获得 2 点【尸气】'); }
    else if(G.hero==='wuseng'){ gainBlock(6); log('小鬼死亡，获得 6 点格挡'); }
    else if(G.hero==='yincha'){ heal(4); log('小鬼死亡，恢复 4 点生命'); }
  } else if(s.type==='yinbing'){
    if(G.hero==='ganshiren'){ gainShiqi(1); log('阴兵死亡，获得 1 点【尸气】'); }
  } else if(s.type==='shi_wang'){
    gainShiqi(2); returnShiWangCard(); log('尸王消散，获得 2 点【尸气】，【尸王】回到弃牌堆');
  }
}
function triggerSummons(decay){
  for(const s of G.summons.slice()){ if(s.dur>0) summonAct(s); }
  if(decay){
    const dying=[];
    for(const s of G.summons){
      if(s.type==='wutong') continue;        // 五通神按“回合开始”结算寿命
      s.dur--; if(s.dur<=0) dying.push(s);
    }
    for(const s of dying) onSummonDeath(s);
    G.summons = G.summons.filter(s=> s.type==='wutong' ? (s.indefinite || s.dur>0) : s.dur>0);
  }
}"""
rep(old, new, 1, 'triggerSummons')

# ================= finishEndTurn 整段重写 =================
old = """function finishEndTurn(){
  G.gouhun=0; // 勾魂效果本回合已结算
  // 守一：保留被标记的手牌
  const kept=G.hand.filter(c=>c.retain);
  G.discard=G.discard.concat(G.hand.filter(c=>!c.retain));
  kept.forEach(c=>c.retain=false);
  G.hand=kept;
  aliveEnemies().forEach(e=>{ if(e.curse>0) e.curse--; });
  triggerSummons(true);
  // 血祭（天师版）：本回合每施加 1 层诅咒，下回合多摸 1 张（上限 +5）
  if(G.xuejiCurseTrack){
    G.xuejiBonus = Math.min(5, CURSE_THIS_TURN);
    G.xuejiCurseTrack=false;
    if(G.xuejiBonus>0) log(`血祭：本回合施加 ${CURSE_THIS_TURN} 层诅咒，下回合多摸 ${G.xuejiBonus} 张`);
  }
  if(G.hp<=0){ G.hp=0; loseGame(); return; }
  // 卸甲生元（天师版）：回合结束时将剩余格挡转化为诅咒
  if(G.xiejiaCurse && G.block > 0) {
    const curseAmount = Math.min(6, Math.floor(G.block / 2)); // 每2格挡转化为1层诅咒，最多6层
    if(curseAmount > 0) {
      const randomEnemy = randomAlive();
      if(randomEnemy) {
        applyCurse(randomEnemy, curseAmount);
        log(`卸甲生元：${G.block} 点格挡转化为 ${curseAmount} 层【诅咒】，施加给 ${randomEnemy.name}`);
      }
    }
    G.block = 0; // 消耗所有格挡
    G.xiejiaCurse = false;
  }
  // 苦行武僧：回合结束时保留最多3点格挡
  else if(G.hero === 'wuseng') {
    G.block = Math.min(3, G.block);
  }
  if(G.weak>0) G.weak--;
  enemyAct();
}"""
new = """function finishEndTurn(){
  G.gouhun=0; // 勾魂效果本回合已结算
  // 守一：保留被标记的手牌
  const kept=G.hand.filter(c=>c.retain);
  G.discard=G.discard.concat(G.hand.filter(c=>!c.retain));
  kept.forEach(c=>c.retain=false);
  G.hand=kept;
  aliveEnemies().forEach(e=>{ if(e.curse>0) e.curse--; });
  triggerSummons(true);
  // 血祭(#35)：本回合按英雄口径累计（召唤/格挡/失血/诅咒），下回合多摸（上限 +4）
  if(G.xuejiArmed){
    let cnt=0;
    if(G.hero==='ganshiren') cnt=G.summonsMadeTurn||0;
    else if(G.hero==='wuseng') cnt=Math.floor((G.blockGainedTurn||0)/5);
    else if(G.hero==='yincha') cnt=Math.floor((G.hpLostTurn||0)/2);
    else cnt=CURSE_THIS_TURN||0;
    G.xuejiBonus=Math.min(4,cnt); G.xuejiArmed=false;
    if(G.xuejiBonus>0) log(`血祭：下回合多摸 ${G.xuejiBonus} 张`);
  }
  if(G.hp<=0){ G.hp=0; loseGame(); return; }
  // 卸甲生元(#23)：回合末把剩余格挡结算成对应英雄收益（A→尸气 / C→生命 / D→诅咒）
  if(G.endBlockKind){
    const bk=G.block;
    if(bk>0){
      if(G.endBlockKind==='A'){ const q=Math.floor(bk/2); if(q>0){ gainShiqi(q); log(`卸甲生元：${bk} 点格挡转为 ${q} 点【尸气】`); } }
      else if(G.endBlockKind==='C'){ heal(bk); log(`卸甲生元：${bk} 点格挡转为生命`); }
      else if(G.endBlockKind==='D'){ const cAmt=Math.min(6, Math.floor(bk/2)); if(cAmt>0){ const re=randomAlive(); if(re){ applyCurse(re,cAmt); log(`卸甲生元：${bk} 点格挡转为 ${cAmt} 层【诅咒】`); } } }
    }
    G.block=0; G.endBlockKind=null;
  }
  // 苦行武僧：回合结束时保留最多 3 点格挡（卸甲生元[武僧#23B]持续期间不清零）
  else if(G.hero === 'wuseng' && !(G.xiejia>0)) {
    G.block = Math.min(3, G.block);
  }
  if(G.weak>0) G.weak--;
  enemyAct();
}"""
rep(old, new, 1, 'finishEndTurn')

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('BATCH B2 DONE')
