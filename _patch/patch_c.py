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

# c1 自伤全额（删除阴差减半 legacy）
rep("""  const c=bloodCost(n);
  G.hp-=c;""",
    """  const c=n; // 【失去生命】按卡面数值全额扣除（删除旧“阴差自伤减半”）
  G.hp-=c;""", 1, 'c1-loseHp-full')

# c2 打出 hpCost 门槛同步（不再 bloodCost 减半）
rep("  const hpCost = c.hpCost ? bloodCost(c.hpCost(c.up)) : 0;",
    "  const hpCost = c.hpCost ? c.hpCost(c.up) : 0;", 1, 'c2-playCard-hpCost')

# c3 effectiveCost：钟馗镇魂(#14) B 武僧：格挡 10/20/30 各减 1/2/3 费
rep("""  if(c.id==='zhouyu' && G.hero==='tianshi'){
    cost=Math.max(0, cost - aliveEnemies().reduce((s,e)=>s+(e.curse||0), 0));
  }
  return cost;""",
    """  if(c.id==='zhouyu' && G.hero==='tianshi'){
    cost=Math.max(0, cost - aliveEnemies().reduce((s,e)=>s+(e.curse||0), 0));
  }
  // 钟馗镇魂(#14) B 武僧：格挡分别达到 10/20/30 时费用 -1/-2/-3
  if(c.id==='zhongkui' && G.hero==='wuseng'){
    const blk=G.block||0;
    const red = blk>=30 ? 3 : blk>=20 ? 2 : blk>=10 ? 1 : 0;
    cost=Math.max(0,cost-red);
  }
  return cost;""", 1, 'c3-effectiveCost-zhongkui')

# c4 doPlayCard：支持按英雄的“消耗”（噬魂术 #8 仅天师列消耗）
rep("""  const deckIndex = (c.type!=='junk' && c.exhaust) ? G.deck.indexOf(c) : -1;""",
    """  const exNow = c.exhaust || (c.heroExhaust && c.heroExhaust===G.hero);
  const deckIndex = (c.type!=='junk' && exNow) ? G.deck.indexOf(c) : -1;""", 1, 'c4-doPlayCard-exNow-decl')

rep("""    if(c.exhaust){ if(deckIndex>=0){ G.deck.splice(deckIndex,1); } log(`【${c.name}】已消耗（本局不再出现）`); }
    else if(c.id==='shi_wang' && G.hero==='ganshiren'){ /* 尸王：召唤物存活期间不进弃牌堆（成功后记 G.shiWangCard） */ }
    else G.discard.push(c);""",
    """    if(exNow){ if(deckIndex>=0){ G.deck.splice(deckIndex,1); } log(`【${c.name}】已消耗（本局不再出现）`); }
    else if(c.id==='shi_wang' && G.hero==='ganshiren'){ /* 尸王：召唤物存活期间不进弃牌堆（成功后记 G.shiWangCard） */ }
    else G.discard.push(c);""", 1, 'c4-doPlayCard-exNow-discard')

rep("""    if(c.type!=='junk'){
      if(c.exhaust){
        if(deckIndex>=0 && !G.deck.includes(c)) G.deck.splice(Math.min(deckIndex, G.deck.length), 0, c);
      } else {
        const di = G.discard.lastIndexOf(c); if(di>=0) G.discard.splice(di,1);
      }
    }""",
    """    if(c.type!=='junk'){
      if(exNow){
        if(deckIndex>=0 && !G.deck.includes(c)) G.deck.splice(Math.min(deckIndex, G.deck.length), 0, c);
      } else {
        const di = G.discard.lastIndexOf(c); if(di>=0) G.discard.splice(di,1);
      }
    }""", 1, 'c4-doPlayCard-exNow-rollback')

# c5 summonAct：群鬼乱舞(#9) C 阴差“本回合每失去 2 点生命，召唤单位伤害 +1”（随回合实时累计）
rep("""  // 尸王在场：其他召唤单位伤害 +1
  const shiWangBonus = (s.type!=='shi_wang' && G.summons.some(x=>x.type==='shi_wang' && x.dur>0)) ? 1 : 0;
  const v = s.v + shiWangBonus;""",
    """  // 尸王在场：其他召唤单位伤害 +1
  const shiWangBonus = (s.type!=='shi_wang' && G.summons.some(x=>x.type==='shi_wang' && x.dur>0)) ? 1 : 0;
  // 群鬼乱舞(#9) C 阴差：本回合每失去 2 点生命，召唤单位伤害 +1
  const bleedBonus = G.bleedSummons ? Math.floor((G.hpLostTurn||0)/2) : 0;
  const v = s.v + shiWangBonus + bleedBonus;""", 1, 'c5-summonAct-bleed')

# c6 startTurn：每回合重置 bleedSummons
rep("""  G.dodgeShiqi=0; G.dodgeNextBlock=0; G.dodgeHealRage=0; G.dodgeCurse=0;""",
    """  G.dodgeShiqi=0; G.dodgeNextBlock=0; G.dodgeHealRage=0; G.dodgeCurse=0;
  G.bleedSummons=false;""", 1, 'c6-startTurn-bleed')

# c7 startBattle：重置咒雨(#46) A 的“被诅咒敌人死亡得尸气”本场标记
rep("  G.turn=0; G.turnSummary=''; G.daoxinUsed=false; G.skillsPlayedThisTurn=0; G.attackBuff=0; G.totalHpLost=0; G.dodge=0; G.dodgeDraw=0; G.debuffImmune=0; G.xuejiBonus=0; G.xuejiArmed=false; G.xuejiHurt=false; G.burn=0; G.zombieDmg=0; G.pendingSeal=0; G.karmaFire=0; G.duhun=null; G.xiejia=0;",
    "  G.turn=0; G.turnSummary=''; G.daoxinUsed=false; G.skillsPlayedThisTurn=0; G.attackBuff=0; G.totalHpLost=0; G.dodge=0; G.dodgeDraw=0; G.debuffImmune=0; G.xuejiBonus=0; G.xuejiArmed=false; G.xuejiHurt=false; G.burn=0; G.zombieDmg=0; G.pendingSeal=0; G.karmaFire=0; G.duhun=null; G.xiejia=0; G.zhouyuA=false;",
    1, 'c7-startBattle-zhouyuA')

# c8 onEnemyDeathCheck：被诅咒敌人死亡 -> 咒雨(#46) A 的尸气
rep("""  else {
    G.turnStats.kills.push(e.name); G.totalKills=(G.totalKills||0)+1; if(G.totalKills>=100) unlockAchievement('baizhan'); unlockBestiary(e.key);""",
    """  else {
    if((G.zhouyuA||0)>0 && (e.curse||0)>0){ gainShiqi(2); log('咒雨：被诅咒的敌人死亡，获得 2 点【尸气】'); }
    G.turnStats.kills.push(e.name); G.totalKills=(G.totalKills||0)+1; if(G.totalKills>=100) unlockAchievement('baizhan'); unlockBestiary(e.key);""", 1, 'c8-onDeath-zhouyuA')

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('PATCH C DONE')
