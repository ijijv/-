/* ============================================================================
 * 志怪塔 · js/20_data.js —— 数据层
 * 由 原型.html 的内联脚本按原顺序切出来，经典外链脚本，双击本地打开就能玩
 * ============================================================================ */
// 关键词说明
const KEYWORDS = [
  ['格挡','抵消伤害的临时护盾：敌人攻击时先扣格挡，扣完才掉血。默认回合结束清零；苦行武僧未用完的保留最多 3 点，【卸甲】期间不清零。'],
  ['预格挡','下一回合开始时，场上召唤单位将为你带来的预计格挡值（格挡旁蓝色 ↑）。仅苦行武僧显示，用于提前规划攻防。'],
  ['预恢复','在这回合之后，场上召唤单位将为你带来的预计生命回复总量（＝召唤物攻击吸血 ＋ 五通神的回合开始回血 ＋ 小鬼消散回血 ＋ 骨铃按持续回合返魂 ＋ 渡魂归己的伤害转化；多个来源重叠时一并累加）。玩家面板血量旁绿色 ＋ 显示。'],
  ['预尸气','下一回合开始时，场上召唤物将为你带来的预计【尸气】总量（＝本回合末消散的召唤物的死亡返还 ＋ 下回合开始的「每个存活召唤物 +1」）。仅茅山赶尸人显示，用于提前规划召唤节奏。'],
  ['预血怒','下一回合末，场上存活的小鬼将为你带来的预计【血怒】层数（每个能撑过下回合末的小鬼 +1）。仅血祭阴差显示，用于提前规划召唤与爆发节奏。'],
  ['诅咒','叠加在敌人身上的资源标记（上限 6 层，每回合末 -2）。本身不增伤，而是被「斩妖剑」「噬魂术」等引爆换取伤害。'],
  ['诅咒牌','可施加诅咒的牌（10 张）：火符、万剑归宗、桃木符、蚀魂咒、舍身、焚符、咒印、咒雨、纸人、点咒符。'],
  ['引爆','把目标身上累积的【诅咒】（或【尸气】等印记）一次性转成伤害。引爆**不是【消耗】**：引爆牌不会离场，本场战斗可以反复打出。'],
  ['腐毒','玩家对敌人施加的持续伤害。你的回合开始时，每只带毒敌人按层数**累进**掉血（三角数：1 层 = 1 点、2 层 = 1+2 = 3 点、3 层 = 6 点……第 n 层就多打 n 点），随后层数 -1。'],
  ['魅惑','敌人下回合造成的伤害 -50%。'],
  ['镇魂','敌人下回合无法行动（跳过一回合）。'],
  ['虚弱','你造成的伤害 -25%，持续 2 回合。'],
  ['灼烧','每回合开始扣除 2 点生命（每层），永久持续、可叠加。可被「佛渡」「金钟罩」一次清除全部层数。'],
  ['力量','每点使该单位的攻击伤害 +1（永久叠加，上限 8 点）。'],
  ['蓄力','敌人本回合不攻击，下回合的单体「攻击」额外加伤。连击/群体攻击不吃这份加值。'],
  ['荆棘','本回合你每受到一次攻击，就反弹固定伤害给攻击你的敌人。'],
  ['勾魂','你下回合少抽 1 张牌。'],
  ['召唤','场上的友方单位，每回合末自动触发效果（纸人/小鬼/阴兵打伤害，阴差列还会按卡面为你回血；五通神按英雄给格挡或回血）。各牌持续时间不同，结束后消失。'],
  ['阴兵','召唤单位的一种，每回合末对敌人造成伤害（持续 3 回合）：天师以外随机索敌；天师列【阴兵过境】会锁定🎯阴兵目标。'],
  ['阴兵目标','被天师【阴兵过境】锁定的敌人（🎯标记）：每回合末阴兵优先攻击你上一次施加【诅咒】的敌人；再对其它敌人施咒会把标记移过去；标记敌死亡则转随机。'],
  ['立即触发','让场上所有召唤单位立刻发动一次回合末效果（不消耗其持续时间）。'],
  ['闪避','本回合完全抵挡下一次受到的攻击（伤害归零）。'],
  ['记名','判官王在生死簿上记下你：期间记录你打出的伤害，并随机记下一条词缀。'],
  ['清算','判官王打出记下的词缀，并把记账伤害的 30%（上限 24）反弹给你。'],
  ['业火','修罗王附体：期间你对它造成的伤害 -30%，每次对它造成伤害损失 1 点生命，它受到的【诅咒】层数翻倍。'],
  ['轮回','阎罗天子开局随机获得一种词缀；血条首次打空时进入第二阶段：回血、清除负面、力量增强。'],
  ['忘忧','孟婆的汤：接下来两回合，每回合开始可选 1 张手牌「饮下」（弃置），否则受 8 点真实伤害。'],
  ['开天眼','本回合你的攻击牌伤害提升（数值显示在顶部状态栏）。'],
  ['佛渡','清除自身所有负面状态（虚弱/勾魂/缠绕/灼烧/业火等）与手中【怨气】废牌，本回合免疫敌人施加的负面效果；升级后额外获得格挡或尸气。【忘忧】无法解除。消耗（每场战斗限用一次）。'],
  ['血祭','下回合多摸牌；本回合若受伤，再多摸 1 张。'],
  ['血怒','阴差专属资源，上限 10 层（持有【血玉】+3、领取里程档【血怒·涌】+3）、整局累积。打出扣血牌每失去 1 点生命 +1 层；「每层 +N」类牌打出时消耗实际用到的层数。'],
  ['尸气','赶尸人专属资源：上限 12 点（持有【尸玉】时 +3），战斗内跨回合累积、每场战斗清零。用于强化召唤（纸人/五通神）与引爆类牌（咒雨）；每消耗 1 点回复 1 点生命。'],
  ['召唤寿命','召唤单位能存活到第几回合（每回合结束 -1，归零即消散）。五通神按「回合开始」结算寿命，其余按「回合结束」结算。'],
  ['吸血','按实际造成的伤害等比回复生命（过量击杀只按敌人剩余血量计）。敌方也有【吸血】词缀。'],
  ['渡魂','接下来 5 回合内，你对敌人造成的伤害按比例转化为回复生命。'],
  ['卸甲','获得后若干回合内，格挡在回合结束不清零并持续累计；效果结束时剩余格挡转化为生命。'],
  ['消耗','每场战斗限用一次：打出后本关不再出现，战斗结束后回到牌库，下场战斗可以再用。'],
  ['灵化','敌人词缀：免疫负面效果（镇魂、魅惑等）。诅咒仍可叠加。'],
];

// 卡牌表，四列按英雄分支
const CARDS = [
// 攻击
  {id:'leifu', name:'雷符', type:'attack', rarity:'white', cost:1,
    t:(u)=>G.hero==='ganshiren'?`造成 ${u?7:5} 伤害。场上每有 1 个召唤单位，伤害 +1；若击杀敌人，获得 ${u?3:2} 点【尸气】`
      :G.hero==='wuseng'?`造成 ${u?6:4} 伤害。每有 ${u?2:3} 点当前格挡，伤害 +1（上限 +6）`
      :G.hero==='yincha'?`造成 ${u?8:4} 伤害。每层【血怒】使此牌伤害 +3（上限 +6），打出时消耗对应【血怒】；若以此牌击杀敌人，获得 2 层【血怒】`
      :`造成 ${u?9:6} 伤害。若目标带【诅咒】，消耗 1 层，伤害 +${u?4:3}`,
    eff:(u)=>{ const t=curEnemy(); if(!t) return; let d=(G.hero==='tianshi'?(u?9:6):G.hero==='yincha'?(u?8:4):(u?6:4));
      if(G.hero==='ganshiren'){ d=(u?7:5)+G.summons.filter(s=>s.dur>0).length; }
      else if(G.hero==='wuseng') d+=Math.min(6,Math.floor((G.block||0)/(u?2:3)));
      else if(G.hero==='yincha') d+=3*rageSpend(3,6);
      else if(t.curse>0){ d+=(u?4:3); }
      const before=t.hp;
      dealDamageTo(t,d);
      if(G.hero==='tianshi' && (t.curse||0)>0) t.curse-=1;
      if(before>0 && t.hp<=0){
        if(G.hero==='ganshiren'){ const __q=u?3:2; gainShiqi(__q); log(`雷符：击杀敌人，获得 ${__q} 点【尸气】`); }
        else if(G.hero==='yincha'){ gainRage(2); log('雷符：击杀敌人，获得 2 层【血怒】'); }
      } }},
  {id:'huofu', name:'火符', type:'attack', rarity:'white', cost:1, hpCost:(u)=>G.hero==='yincha'?2:0,
    t:(u)=>G.hero==='ganshiren'?`造成 ${u?7:5} 伤害。挑选弃 1 张手牌；若弃掉的是【鬼怪牌】，获得 ${u?3:2} 点【尸气】`
      :G.hero==='wuseng'?`造成 ${u?7:5} 伤害。每有 ${u?2:3} 点当前格挡，伤害 +1（上限 +6），随机弃 1 张手牌`
      :G.hero==='yincha'?`造成 ${u?10:6} 伤害。失去 2 点生命`
      :`造成 ${u?10:6} 伤害。施加 1 层【诅咒】，随机弃 1 张手牌`,
    eff:(u,c)=>{ const t=curEnemy(); if(!t) return; let d=G.hero==='tianshi'?(u?10:6):(u?7:5);
      if(G.hero==='ganshiren') d=(u?7:5);
      if(G.hero==='wuseng') d+=Math.min(6,Math.floor((G.block||0)/(u?2:3)));
      if(G.hero==='yincha'){ d=(u?10:6); loseHp(2); }
      if(G.hero==='ganshiren'){ startHuofuSelect(c, u, t, d); return; }
      dealDamageTo(t,d);
      if(G.hero==='tianshi') applyCurse(t,1);
      if(G.hero==='yincha') return;
      discardRandomHand(); }},
  {id:'jianfu', name:'剑符', type:'attack', rarity:'white', cost:2,
    t:(u)=>G.hero==='ganshiren'?`造成 ${u?16:12} 伤害。消耗 3 点【尸气】，伤害翻倍`
      :G.hero==='wuseng'?`造成 ${u?12:8} 伤害。消耗全部格挡，每消耗 2 点格挡此牌伤害 +1（无上限）`
      :G.hero==='yincha'?`造成 12 伤害。本回合每失去 1 点生命，此牌伤害 +${u?2:1}`
      :`造成 ${u?17:12} 伤害。若目标【诅咒】≥3 层，消耗 3 层并使伤害翻倍`,
    eff:(u)=>{ const t=curEnemy(); if(!t) return; let d;
      if(G.hero==='wuseng'){ d=(u?12:8)+Math.floor(G.block/2); G.block=0; }
      else if(G.hero==='yincha'){ d=12+(G.hpLostTurn||0)*(u?2:1); }
      else if(G.hero==='tianshi'){ d=(u?17:12); if(t.curse>=3){ d*=2; log('剑符：消耗 3 层【诅咒】，伤害翻倍'); } }
      else { d=(u?16:12); if(hasShiqi(3)){ spendShiqi(3); d*=2; log('剑符：消耗 3 点【尸气】，伤害翻倍'); } }
      dealDamageTo(t,d);
      if(G.hero==='tianshi' && (t.curse||0)>=3) t.curse-=3; }},
  {id:'zhanyaojian', name:'斩妖剑', type:'attack', rarity:'purple', cost:2,
    t:(u)=>G.hero==='ganshiren'?`造成 ${u?12:7} 伤害。场上每有 1 个召唤单位，额外造成 2 点伤害`
      :G.hero==='wuseng'?`造成 ${u?12:8} 伤害。若目标带有【诅咒】，额外造成 6 点伤害`
      :G.hero==='yincha'?`造成 ${u?14:10} 伤害。若目标带有【诅咒】，额外造成 ${u?6:4} 伤害`
      :`造成 ${u?12:10} 伤害。引爆目标 2 层【诅咒】（每层 ${u?7:5} 伤害）`,
    eff:(u)=>{ const t=curEnemy(); if(!t) return;
      if(G.hero==='tianshi'){ const boom=Math.min(2,t.curse||0); SEG_HALVE=true; floatGroupStart(1+boom); try{ dealDamageTo(t,u?12:10); for(let i=0;i<boom;i++) dealDamageTo(t,u?7:5); }finally{ SEG_HALVE=false; floatGroupEnd(); } t.curse-=boom; if(boom>0){ sfx('kw_curse'); log(`斩妖剑引爆 ${boom} 层【诅咒】`); } return; }
      if(G.hero==='yincha'){ let dc=(u?14:10); if((t.curse||0)>0) dc+=(u?6:4); dealDamageTo(t,dc); return; }
      let d=(G.hero==='ganshiren')?(u?12:7):(u?12:8);
      if(G.hero==='ganshiren') d+=2*G.summons.filter(s=>s.dur>0).length;
      else if(t.curse>0) d+=6;
      dealDamageTo(t,d); }},
  {id:'tianlei', name:'天雷正法', type:'attack', rarity:'purple', cost:3, hpCost:(u)=>G.hero==='yincha'?5:0,
    t:(u)=>G.hero==='ganshiren'?`造成 ${u?28:20} 伤害。每有 2 点【尸气】此牌费用 -1（最低 0），打出时消耗减免费用×2 尸气`
      :G.hero==='wuseng'?`造成 ${u?20:15} 伤害，并获得等于造成伤害的格挡`
      :G.hero==='yincha'?`造成 ${u?21:16} 伤害。失去 5 点生命，本场每失去过 1 点生命，此牌伤害 +${u?2:1}（上限 +${u?26:20}）`
      :`造成 ${u?32:22} 伤害。目标每有 2 层【诅咒】此牌费用 -1（最低 0）；结算后目标失去减免费用×2 层【诅咒】`,
    eff:(u)=>{ const t=curEnemy(); if(!t) return;
      if(G.hero==='wuseng'){ const dealt=dealDamageTo(t,u?20:15); if(dealt>0){ gainBlock(dealt); log(`天雷正法：获得 ${dealt} 点格挡`); } return; }
      if(G.hero==='yincha'){ loseHp(5); dealDamageTo(t,(u?21:16)+Math.min(u?26:20,(G.totalHpLost||0)*(u?2:1))); return; }
      if(G.hero==='tianshi'){
        const red=Math.min(3,Math.floor((t.curse||0)/2)); dealDamageTo(t,u?32:22);
        if(red>0){ t.curse=Math.max(0,t.curse-red*2); log(`天雷正法：目标失去 ${red*2} 层【诅咒】`); }
        return; }
      const red=Math.min(3,Math.floor((G.尸气||0)/2)); if(red>0){ spendShiqi(red*2); log(`天雷正法：消耗 ${red*2} 点【尸气】`); }
      dealDamageTo(t,u?28:20); }},
  {id:'wanjian', name:'万剑归宗', type:'attack', rarity:'gold', cost:3, hpCost:(u)=>G.hero==='yincha'?5:0,
    t:(u)=>G.hero==='ganshiren'?`对全体敌人造成 ${u?14:10} 伤害。每击败 1 名敌人，获得 3 点【尸气】并抽 1 张牌（抽到的牌本回合费用 -${u?2:1}）`
      :G.hero==='wuseng'?`对全体敌人造成 ${u?14:9} 伤害，并获得 ${u?12:10} 点格挡。每用此牌斩杀 1 名敌人，将 1 张 0 费的万剑归宗加入手牌（一次性：打出或回合结束时消失，不进入弃牌堆，也不会留到下一场战斗）`
      :G.hero==='yincha'?`对全体敌人造成 ${u?15:10} 伤害。失去 5 点生命。每击败 1 名敌人，恢复 ${u?15:10} 点生命并获得 1 点符文`
      :`对全体敌人造成 ${u?18:14} 伤害。对所有敌人施加 ${u?2:1} 层【诅咒】。每击败 1 名敌人，恢复 1 点符文`,
    eff:(u,c)=>{ const before=G.turnStats.kills.length; const targets=aliveEnemies().slice();
      if(G.hero==='wuseng'){ const d=u?14:9; targets.forEach(e=>{ if(e.hp>0) dealDamageTo(e,d); }); const bb=u?12:10; gainBlock(bb); log(`万剑归宗：获得 ${bb} 点格挡`); }
      else if(G.hero==='yincha'){ loseHp(5); const d=u?15:10; targets.forEach(e=>{ if(e.hp>0) dealDamageTo(e,d); }); }
      else if(G.hero==='tianshi'){ const d=u?18:14; targets.forEach(e=>{ if(e.hp>0) dealDamageTo(e,d); }); aliveEnemies().forEach(e=>applyCurse(e,u?2:1)); }
      else { const d=u?14:10; targets.forEach(e=>{ if(e.hp>0) dealDamageTo(e,d); }); }
      const killed=G.turnStats.kills.length-before;
      if(killed>0){
        if(G.hero==='ganshiren'){ gainShiqi(killed*3); const __hb=G.hand.length; drawCards(killed); const __cut=u?2:1;
          for(let __i=__hb;__i<G.hand.length;__i++){ const __o=G.hand[__i]; if(!__o || (__o.tempCostCut||0)>=__cut) continue;
            const __n=Object.assign({}, __o); __n.tempCostCut=__cut;
            const __di=G.deck.indexOf(__o); if(__di>=0) G.deck[__di]=__n;
            G.hand[__i]=__n; }
          log(`万剑归宗：击败 ${killed} 名敌人，获 ${killed*3} 尸气并抽 ${killed} 张（本回合 -${__cut} 费）`); }
        else if(G.hero==='yincha'){ const hk=killed*(u?15:10); heal(hk); G.energy+=killed; log(`万剑归宗：击败 ${killed} 名敌人，恢复 ${hk} 点生命并获得 ${killed} 点符文`); }
        else if(G.hero==='tianshi'){ G.energy+=killed; log(`万剑归宗：击败 ${killed} 名敌人，恢复 ${killed} 点符文`); }
        else if(G.hero==='wuseng' && c){ for(let i=0;i<killed;i++) G.hand.push(Object.assign({}, c, {cost:0, costU:null, oneShot:true})); log(`万剑归宗：斩杀 ${killed} 名敌人，获得 ${killed} 张 0 费万剑归宗`); }
      } }},
  {id:'tiebushan', name:'铁布衫', type:'attack', rarity:'blue', cost:{wuseng:0, default:1}, costU:{wuseng:0, tianshi:1, default:0}, hpCost:(u)=>G.hero==='yincha'?2:0,
    t:(u)=>G.hero==='ganshiren'?`造成等于当前格挡的伤害。每有 2 点【尸气】，额外 +${u?2:1}${u?'（0 费）':''}`
      :G.hero==='wuseng'?`造成等于当前格挡的伤害。不消耗格挡`
      :G.hero==='yincha'?`造成等于当前格挡的伤害。失去 2 点生命${u?'（0 费）':''}`
      :`造成等于当前格挡的伤害。目标每 1 层【诅咒】额外 +${u?2:1}，并引爆其全部【诅咒】`,
    eff:(u)=>{ const t=curEnemy(); if(!t) return; let d=G.block||0;
      if(G.hero==='ganshiren') d+=Math.floor((G.尸气||0)/2)*(u?2:1);
      else if(G.hero==='yincha'){ loseHp(2); }
      else if(G.hero==='tianshi'){ const __c=(t.curse||0); d+=__c*(u?2:1); if(__c>0) sfx('kw_curse'); }
      if(d>0){ yuanqiStrike(t); sfx('energy'); dealDamageTo(t,d); if(G.hero==='tianshi') t.curse=0; }
      else log('铁布衫：当前没有格挡，落空'); }},
  {id:'shihun', name:'噬魂术', type:'attack', rarity:'blue', cost:2,
    t:(u)=>G.hero==='ganshiren'?`消耗 ${u?2:4} 点【尸气】，对目标造成 ${u?18:14} 伤害。若本回合召唤过单位，费用 -1`
      :G.hero==='wuseng'?`引爆目标全部【诅咒】：每层造成 ${u?3:2} 点伤害，并获得 ${u?2:1} 点格挡`
      :G.hero==='yincha'?`对目标造成 ${u?16:10} 伤害。每层【血怒】使此牌伤害 +${u?3:2}（上限 +${u?18:12}），打出时消耗对应【血怒】`
      :`引爆目标全部【诅咒】，每层造成 ${u?6:5} 伤害`,
    eff:(u)=>{ const t=curEnemy(); if(!t) return;
      if(G.hero==='ganshiren'){ const __sc=u?2:4; if(!hasShiqi(__sc)){ floatMsg('尸气不足'); return false; } spendShiqi(__sc); dealDamageTo(t,u?18:14); return; }
      if(G.hero==='wuseng'){ const c=t.curse||0; if(c<=0){ log('噬魂术：目标没有诅咒，落空'); return false; } sfx('kw_curse'); burstShow(enemyEl(t), c, 110, 'shihun@'+t.uid); dealDamageTo(t,c*(u?3:2),false,0,false,false,{segs:c,step:110}); t.curse=0; const bb=c*(u?2:1); gainBlock(bb); log(`噬魂术：引爆 ${c} 层【诅咒】，获得 ${bb} 点格挡`); return; }
      if(G.hero==='yincha'){ dealDamageTo(t,(u?16:10)+(u?3:2)*rageSpend(u?3:2,u?18:12)); return; }
      const c=t.curse||0; if(c<=0){ log('噬魂术：目标没有诅咒，落空'); return false; } sfx('kw_curse'); burstShow(enemyEl(t), c, 110, 'shihun@'+t.uid); dealDamageTo(t,c*(u?6:5),false,0,false,false,{segs:c,step:110}); t.curse=0; }},
  {id:'qungui', name:'群鬼乱舞', type:'attack', rarity:'blue', cost:1, hpCost:(u)=>G.hero==='yincha'?2:0,
    t:(u)=>G.hero==='ganshiren'?`消耗 ${u?2:4} 点【尸气】，所有召唤单位本回合立刻作用 1 次`
      :G.hero==='wuseng'?`造成 4 伤害。场上每有 1 个召唤单位，此牌伤害 +${u?2:1}`
      :G.hero==='yincha'?`本回合每失去 2 点生命，召唤单位伤害 +${u?2:1}。立刻失去 2 点生命。`
      :`造成 ${u?9:6} 伤害。目标每有 1 层【诅咒】此牌伤害 +1（上限 +${u?6:4}）`,
    eff:(u)=>{ if(G.hero==='ganshiren'){ if(!hasShiqi(u?2:4)){ floatMsg('尸气不足'); return false; } spendShiqi(u?2:4); triggerSummons(false); return; }
      if(G.hero==='wuseng'){ const t=curEnemy(); if(!t) return; dealDamageTo(t,4+G.summons.filter(s=>s.dur>0).length*(u?2:1)); return; }
      if(G.hero==='yincha'){ loseHp(2); G.bleedSummons=true; G.bleedSummonsBonus=u?2:1; log(`群鬼乱舞：本回合每失去 2 点生命，召唤单位伤害 +${u?2:1}`); return; }
      const t=curEnemy(); if(!t) return; dealDamageTo(t,(u?9:6)+Math.min(u?6:4,t.curse||0)); }},
  {id:'taomufu', name:'桃木符', type:'attack', rarity:'white', cost:1,
    t:(u)=>{ const gh=`对鬼怪/僵尸额外 +${u?6:4} 伤害`;
      if(G.hero==='ganshiren') return `造成 ${u?7:5} 伤害。${gh}。若击杀目标，获得 2 点【尸气】`;
      if(G.hero==='wuseng') return `造成 ${u?6:4} 伤害。${gh}。若本回合获得过格挡，额外 +2`;
      if(G.hero==='yincha') return `造成 ${u?7:4} 伤害。${gh}。若目标生命低于 50%，额外 +2`;
      return `造成 ${u?7:5} 伤害。${gh}。施加 1 层【诅咒】`; },
    eff:(u)=>{ const t=curEnemy(); if(!t) return;
      let d = G.hero==='tianshi'?(u?7:5) : G.hero==='ganshiren'?(u?7:5) : (G.hero==='yincha'?(u?7:4):(u?6:4));
      if(t.kind==='ghost'||t.kind==='jiangshi') d+=(u?6:4);
      if(G.hero==='wuseng' && (G.blockGainedTurn||0)>0) d+=2;
      else if(G.hero==='yincha' && t.hp < t.maxHp*0.5) d+=2;
      const before=t.hp;
      dealDamageTo(t,d);
      if(G.hero==='tianshi') applyCurse(t,1);
      if(G.hero==='ganshiren' && before>0 && t.hp<=0){ gainShiqi(2); log('桃木符：击杀目标，获得 2 点【尸气】'); } }},
  {id:'shihunzhou', name:'蚀魂咒', type:'attack', rarity:'blue', cost:1, hpCost:(u)=>G.hero==='yincha'?2:0,
    t:(u)=>G.hero==='ganshiren'?`造成 ${u?8:4} 伤害。根据场上召唤物的数量回复等额的血量`
      :G.hero==='wuseng'?`造成 ${u?7:5} 伤害。消耗 2 点格挡，施加 ${u?2:1} 层【诅咒】`
      :G.hero==='yincha'?`造成 ${u?8:5} 伤害。失去 2 点生命，施加 2 层【诅咒】`
      :`造成 ${u?8:3} 伤害。施加 2 层【诅咒】`,
    eff:(u)=>{ const t=curEnemy(); if(!t) return;
      if(G.hero==='yincha') loseHp(2);
      dealDamageTo(t, G.hero==='ganshiren'?(u?8:4):(G.hero==='tianshi'?(u?8:3):(G.hero==='yincha'?(u?8:5):(u?7:5))));
      if(G.hero==='ganshiren'){ const n=G.summons.filter(s=>s.dur>0).length; if(n>0){ heal(n); log(`蚀魂咒：场上 ${n} 个召唤单位，恢复 ${n} 点生命`); } }
      else if(G.hero==='wuseng'){ if((G.block||0)>=2){ G.block-=2; applyCurse(t,u?2:1); } else log('蚀魂咒：格挡不足 2，未施加诅咒'); }
      else applyCurse(t,2); }},
  {id:'shixue', name:'嗜血', type:'attack', rarity:'purple', cost:1,
    t:(u)=>G.hero==='ganshiren'?`造成 ${u?7:5} 伤害。每有 1 点【尸气】，此牌伤害 +1（上限 +${u?7:6}）`
      :G.hero==='wuseng'?`造成 ${u?6:4} 伤害。每有 ${u?2:3} 点格挡，此牌伤害 +1（上限 +5）`
      :G.hero==='yincha'?`造成 5 伤害。本场每失去 ${u?3:4} 点生命，此牌伤害 +1（上限 +${u?20:15}）`
      :`造成 ${u?8:6} 伤害。回复造成伤害 50% 的生命；目标【诅咒】≥2 层时，消耗 2 层并把比例提升到 100%`,
    eff:(u)=>{ const t=curEnemy(); if(!t) return; let d;
      if(G.hero==='ganshiren') d=(u?7:5)+Math.min(u?7:6,(G.尸气||0));
      else if(G.hero==='wuseng') d=(u?6:4)+Math.min(5,Math.floor((G.block||0)/(u?2:3)));
      else if(G.hero==='yincha') d=5+Math.min(u?20:15,Math.floor((G.totalHpLost||0)/(u?3:4)));
      else { d=(u?8:6); let ratio=0.5;
        if((t.curse||0)>=2){ ratio=1; log('嗜血：消耗 2 层【诅咒】，吸血比例提升到 100%'); }
        const dealt=dealDamageTo(t,d); if((t.curse||0)>=2) t.curse-=2; if(dealt>0){ const h=Math.floor(dealt*ratio); if(h>0){ heal(h); floatMsg('+'+h+' 生命'); log('嗜血：回复 '+h+' 点生命'); } } return; }
      dealDamageTo(t,d); }},
  {id:'baigui', name:'百鬼夜行', type:'attack', rarity:'purple', cost:2, hpCost:(u)=>G.hero==='yincha'?2:0,
    t:(u)=>G.hero==='ganshiren'?`对全体敌人造成 ${u?6:4} 伤害。每有 1 个召唤单位，此牌伤害 +${u?3:2}`
      :G.hero==='wuseng'?`对全体敌人造成 ${u?6:5} 伤害。每有 ${u?1:2} 点格挡，此牌伤害 +1（上限 +${u?11:8}）`
      :G.hero==='yincha'?`对全体敌人造成 ${u?7:5} 伤害。失去 2 点生命。每有 1 个召唤单位，此牌伤害 +${u?3:2}`
      :`对全体敌人造成 8 伤害。每层【诅咒】使该敌人受到此伤害 +${u?2:1}，并引爆其全部【诅咒】`,
    eff:(u)=>{ if(G.hero==='tianshi'){ let __any=false; aliveEnemies().forEach(e=>{ const cc=e.curse||0; if(cc>0) __any=true; dealDamageTo(e,8+(u?2:1)*cc); e.curse=0; }); if(__any) sfx('kw_curse'); return; }
      const n=G.summons.filter(s=>s.dur>0).length;
      if(G.hero==='ganshiren'){ dealDamageToAll((u?6:4)+n*(u?3:2)); return; }
      if(G.hero==='wuseng'){ dealDamageToAll((u?6:5)+Math.min(u?11:8,Math.floor((G.block||0)/(u?1:2)))); return; }
      loseHp(2); dealDamageToAll((u?7:5)+n*(u?3:2)); }},
  {id:'zhongkui', name:'钟馗镇魂', type:'spirit', rarity:'gold', cost:3, exhaust:true, hpCost:(u)=>G.hero==='yincha'?5:0,
    t:(u)=>G.hero==='ganshiren'?`对目标造成 ${u?24:16} 伤害并【镇魂】。获得 ${u?6:4} 点【尸气】（消耗牌）`
      :G.hero==='wuseng'?`对目标造成 ${u?22:16} 伤害并【镇魂】。格挡达 12/15/21 时费用 -1/-2/-3（消耗）`
      :G.hero==='yincha'?`对目标造成 ${u?24:16} 伤害并【镇魂】。失去 5 点生命；若生命低于 40%，伤害翻倍。消耗牌（一次性）`
      :`对目标造成 16 伤害并【镇魂】。引爆并清空目标全部【诅咒】（每层 ${u?4:3} 伤害）（消耗）`,
    eff:(u)=>{ const t=curEnemy(); if(!t) return;
      if(G.hero==='ganshiren'){ sealEnemy(t,1); dealDamageTo(t,u?24:16); gainShiqi(u?6:4); log(`钟馗镇魂：造成 ${u?24:16} 伤害并获得 ${u?6:4} 点【尸气】`); return; }
      if(G.hero==='wuseng'){ sealEnemy(t,1); dealDamageTo(t,u?22:16); return; }
      if(G.hero==='yincha'){ sealEnemy(t,1); loseHp(5); let d=u?24:16; if(G.hp < G.maxHp*0.4){ d*=2; log('钟馗镇魂：生命低于 40%，伤害翻倍'); } dealDamageTo(t,d); return; }
      const c=t.curse||0; sealEnemy(t,1); SEG_HALVE=true; floatGroupStart(1+c); try{ dealDamageTo(t,16); for(let i=0;i<c;i++) dealDamageTo(t,u?4:3); }finally{ SEG_HALVE=false; floatGroupEnd(); } t.curse=0; if(c>0){ sfx('kw_curse'); log(`钟馗镇魂引爆 ${c} 层【诅咒】`); } }},
// 防御
  {id:'jingang', name:'金刚符', type:'defense', rarity:'white', cost:1, hpCost:(u)=>G.hero==='yincha'?(u?3:2):0,
    t:(u)=>G.hero==='ganshiren'?`获得 ${u?7:4} 点格挡。获得 ${u?2:1} 点【尸气】`
      :G.hero==='wuseng'?`获得 ${u?9:6} 点格挡`
      :G.hero==='yincha'?`获得 ${u?9:6} 点格挡。失去 ${u?3:2} 点生命`
      :`获得 ${u?7:5} 点格挡。本回合每施加 1 层【诅咒】额外 +${u?2:1} 格挡（上限 +6）`,
    eff:(u)=>{ let b;
      if(G.hero==='ganshiren'){ b=u?7:4; gainShiqi(u?2:1); }
      else if(G.hero==='wuseng'){ b=u?9:6; }
      else if(G.hero==='yincha'){ loseHp(u?3:2); b=u?9:6; }
      else { b=(u?7:5)+Math.min(6,(u?2:1)*(CURSE_THIS_TURN||0)); }
      gainBlock(b); }},
  {id:'yinshen', name:'隐身符', type:'defense', rarity:'white', cost:1,
    t:(u)=>G.hero==='ganshiren'?`获得 ${u?6:3} 点格挡，抽 1 张牌。若抽到【鬼怪牌】，获得 ${u?2:1} 点【尸气】`
      :G.hero==='wuseng'?`获得 ${u?6:4} 点格挡，抽 1 张牌。若本回合未失去生命，下回合额外抽 1 张`
      :G.hero==='yincha'?`获得 ${u?7:3} 点格挡，抽 1 张牌。若本回合失去过生命，改为抽 2 张`
      :`获得 ${u?5:3} 点格挡，抽 1 张牌。若抽到【诅咒牌】，再获得 ${u?4:3} 点格挡`,
    eff:(u)=>{ const b=G.hero==='ganshiren'?(u?6:3):(G.hero==='wuseng'?(u?6:4):(G.hero==='yincha'?(u?7:3):(u?5:3)));
      if(G.hero==='yincha'){ gainBlock(b); drawCards((G.hpLostTurn||0)>0?2:1); return; }
      gainBlock(b); drawCards(1);
      if(G.hero==='wuseng' && !(G.hpLostTurn||0)){ G.dodgeDraw=Math.max(G.dodgeDraw||0,1); log('隐身诀：本回合未受伤，下回合额外抽 1 张'); }
      else if(G.hero==='ganshiren'){ const hit=G.lastDrawnCards&&G.lastDrawnCards.find(x=>isGhostCard(x)); if(hit){ gainShiqi(u?2:1); log(`隐身诀：抽到鬼怪牌，获得 ${u?2:1} 点【尸气】`); } }
      else if(G.hero==='tianshi'){ const hit=G.lastDrawnCards&&G.lastDrawnCards.find(x=>isCanCurse(x)); if(hit){ const b2=u?4:3; gainBlock(b2); log(`隐身诀：抽到【诅咒牌】，额外获得 ${b2} 点格挡`); } } }},
  {id:'jinguang', name:'金光罩', type:'defense', rarity:'blue', cost:2, hpCost:(u)=>G.hero==='yincha'?(u?5:4):0,
    t:(u)=>G.hero==='ganshiren'?`获得 ${u?14:9} 点格挡。再消耗 2 点【尸气】额外获得 ${u?7:5} 点格挡`
      :G.hero==='wuseng'?`获得 ${u?19:14} 点格挡`
      :G.hero==='yincha'?`获得 ${u?17:11} 点格挡。失去 ${u?5:4} 点生命`
      :`获得 ${u?17:12} 点格挡。本回合每施加 1 层【诅咒】额外 +${u?2:1} 格挡`,
    eff:(u)=>{ if(G.hero==='ganshiren'){ gainBlock(u?14:9); if(hasShiqi(2)){ spendShiqi(2); gainBlock(u?7:5); log(`金光罩：消耗 2 点尸气，额外获得 ${u?7:5} 点格挡`); } }
      else if(G.hero==='wuseng'){ gainBlock(u?19:14); }
      else if(G.hero==='yincha'){ loseHp(u?5:4); gainBlock(u?17:11); }
      else { gainBlock((u?17:12)+(CURSE_THIS_TURN||0)*(u?2:1)); } }},
  {id:'jinzhong', name:'金钟罩', type:'defense', rarity:'purple', cost:2,
    t:(u)=>`获得 ${G.hero==='ganshiren'?(u?16:10):G.hero==='yincha'?(u?18:12):(u?17:12)} 点格挡。清除自身所有负面状态与手牌中的状态牌`,
    eff:(u)=>{ gainBlock(G.hero==='ganshiren'?(u?16:10):G.hero==='yincha'?(u?18:12):(u?17:12)); clearJunk(); clearPlayerDebuffs(); floatMsg('负面状态已清除'); }},
  {id:'jingji', name:'荆棘符', type:'defense', rarity:'blue', cost:1,
    t:(u)=>G.hero==='ganshiren'?`获得 ${u?6:3} 点格挡。本回合每受 1 次攻击，反弹 ${u?6:4} 点伤害`
      :G.hero==='wuseng'?`获得 ${u?7:4} 点格挡。本回合每受 1 次攻击，反弹 ${u?4:3} 点伤害`
      :G.hero==='yincha'?`获得 ${u?6:4} 点格挡。本回合每受 1 次攻击，恢复 ${u?3:2} 点生命`
      :`获得 ${u?6:3} 点格挡。本回合每受到 1 次攻击，对攻击者施加 ${u?2:1} 层【诅咒】`,
    eff:(u)=>{ const b=G.hero==='ganshiren'?(u?6:3):(G.hero==='wuseng'?(u?7:4):(G.hero==='yincha'?(u?6:4):(u?6:3))); gainBlock(b);
      if(G.hero==='ganshiren'){ G.thorns+=u?6:4; }
      else if(G.hero==='wuseng'){ G.thorns+=u?4:3; }
      else if(G.hero==='yincha'){ G.hitHeal=u?3:2; }
      else { G.hitCurse=u?2:1; } }},
  {id:'fodu', name:'佛渡', type:'defense', rarity:'blue', cost:0, exhaust:true,
    t:(u)=>G.hero==='ganshiren'?`清除所有状态牌与自身负面状态，本回合免疫敌人施加的负面效果${u?'，并获得 2 点【尸气】':''}。消耗（一次性）`
      :G.hero==='yincha'?`清除所有状态牌与自身负面状态，本回合免疫敌人施加的负面效果${u?'，回复 5 点生命':''}。消耗（一次性）`
      :G.hero==='tianshi'?`清除所有状态牌与自身负面状态，本回合免疫敌人施加的负面效果${u?'，额外获得 5 点格挡':''}。消耗（一次性）`
      :G.hero==='wuseng'?`清除所有状态牌与自身负面状态，本回合免疫敌人施加的负面效果${u?'，额外获得 5 点格挡':''}。消耗（一次性）`
      :`清除所有状态牌与自身负面状态，本回合免疫敌人施加的负面效果${u?'，额外获得 4 点格挡':''}。消耗（一次性）`,
    eff:(u)=>{ if(G.hero==='ganshiren'){ clearJunk(); clearPlayerDebuffs(); G.debuffImmune=1; floatMsg('本回合免疫负面效果'); if(u){ gainShiqi(2); log(`佛渡：升级后获得 2 点【尸气】`); } return; }
      const fb=(G.hero==='tianshi'||G.hero==='wuseng')?5:4;
      clearJunk(); clearPlayerDebuffs(); G.debuffImmune=1; floatMsg('本回合免疫负面效果');
      if(G.hero==='yincha'){ if(u){ heal(5); log('佛渡：升级后回复 5 点生命'); } }
      else if(u){ gainBlock(fb); log(`佛渡：升级后获得 ${fb} 点格挡`); } }},
  {id:'tongpi', name:'铜皮铁骨', type:'defense', rarity:'blue', cost:2,
    t:(u)=>G.hero==='ganshiren'?`获得 ${u?12:8} 点格挡。反弹 ${u?5:4} 点伤害。每有 1 个召唤单位，额外反弹 1 点`
      :G.hero==='wuseng'?`获得 ${u?15:10} 点格挡。反弹 ${u?8:6} 点伤害`
      :G.hero==='yincha'?`获得 ${u?13:9} 点格挡。本回合每受到 1 次攻击，恢复 ${u?4:3} 点生命`
      :`获得 ${u?14:9} 点格挡。本回合每受到 1 次攻击，对攻击者施加 1 层【诅咒】`,
    eff:(u)=>{ if(G.hero==='ganshiren'){ gainBlock(u?12:8); G.thorns+=(u?5:4)+G.summons.filter(s=>s.dur>0).length; }
      else if(G.hero==='wuseng'){ gainBlock(u?15:10); G.thorns+=u?8:6; }
      else if(G.hero==='yincha'){ gainBlock(u?13:9); G.hitHeal=u?4:3; }
      else { gainBlock(u?14:9); G.hitCurse=1; } }},
  {id:'fanzhen', name:'反震', type:'defense', rarity:'blue', cost:1, costU:{wuseng:0},
    t:(u)=>G.hero==='ganshiren'?`反弹 ${u?4:3} 点伤害。本回合每受 1 次攻击，获得 ${u?2:1} 点【尸气】`
      :G.hero==='wuseng'?`本回合每受 1 次攻击，对攻击者造成 ${u?5:4} 点伤害`
      :G.hero==='yincha'?`本回合每受到 1 次攻击，获得 ${u?2:1} 层【血怒】并对攻击者造成 ${u?5:4} 点伤害`
      :`本回合每受到 1 次攻击，反击 ${u?4:3} 点伤害并对攻击者施加 ${u?2:1} 层【诅咒】`,
    eff:(u)=>{ if(G.hero==='ganshiren'){ G.thorns+=u?4:3; G.hitShiqi=Math.max(G.hitShiqi||0,u?2:1); }
      else if(G.hero==='wuseng'){ G.thorns+=u?5:4; }
      else if(G.hero==='yincha'){ G.thorns+=u?5:4; G.hitRage=Math.max(G.hitRage||0,u?2:1); }
      else { G.thorns+=u?4:3; G.hitCurse=Math.max(G.hitCurse||0,u?2:1); } }},
  {id:'xiejiashengyuan', name:'卸甲生元', type:'defense', rarity:'blue', cost:1, hpCost:(u)=>G.hero==='yincha'?2:0,
    t:(u)=>G.hero==='ganshiren'?`获得 ${u?7:4} 点格挡。回合结束自动将剩余格挡换算为【尸气】：每保留 2 点，获得 ${u?2:1} 点（无论敌人是否攻击）`
      :G.hero==='wuseng'?`获得 ${u?8:5} 点格挡。使【卸甲】持续 ${u?3:2} 回合：期间格挡不清零，到期后剩余格挡转为生命`
      :G.hero==='yincha'?`获得 ${u?8:5} 点格挡。失去 2 点生命。敌人攻击后每保留 1 点格挡，恢复 1 点生命（上限恢复 ${u?14:11} 滴血量）`
      :`获得 ${u?12:8} 点格挡。敌人攻击后，将剩余格挡转为对随机敌人施加【诅咒】（每 2 格挡 = 1 层；敌人满 6 层时溢出部分转回格挡，于下回合开始生效）`,
    eff:(u)=>{ if(G.hero==='ganshiren'){ gainBlock(u?7:4); G.endBlockKind='A'; G.xiejiaUp=!!u; floatMsg('回合结束格挡将自动转为尸气'); }
      else if(G.hero==='wuseng'){ gainBlock(u?8:5); G.xiejia=u?3:2; floatMsg('【卸甲】已启动，格挡不再清零'); }
      else if(G.hero==='yincha'){ loseHp(2); gainBlock(u?8:5); G.endBlockKind='C'; G.xiejiaHealCap=u?14:11; floatMsg('敌人攻击后格挡将转为生命'); }
      else { gainBlock(u?12:8); G.endBlockKind='D'; floatMsg('敌人攻击后格挡将转为诅咒'); } }},
// 功能
  {id:'juling', name:'聚灵', type:'skill', rarity:'white', cost:0,
    t:(u)=>G.hero==='ganshiren'?`抽 ${u?2:1} 张牌。若抽到【鬼怪牌】，获得 ${u?2:1} 点【尸气】`
      :G.hero==='wuseng'?`抽 1 张牌${u?'。若抽到【防御牌】，获得 4 点格挡':''}`
      :G.hero==='yincha'?`抽 ${u?2:1} 张牌。若本回合失去过生命，再抽 1 张`
      :`抽 ${u?2:1} 张牌。若抽到【诅咒牌】，获得 1 点符文`,
    eff:(u)=>{ const n=(G.hero==='wuseng')?1:(u?2:1); drawCards(n); const drew=G.lastDrawnCards||[];
      if(G.hero==='ganshiren'){ if(drew.some(x=>isGhostCard(x))){ gainShiqi(u?2:1); log(`聚灵：抽到鬼怪牌，获得 ${u?2:1} 点【尸气】`); } }
      else if(G.hero==='wuseng'){ if(u && drew.some(x=>x.type==='defense')){ gainBlock(4); log('聚灵：升级后抽到防御牌，获得 4 点格挡'); } }
      else if(G.hero==='yincha'){ if((G.hpLostTurn||0)>0){ drawCards(1); log('聚灵：本回合失去过生命，再抽 1 张'); } }
      else if(drew.some(x=>isCanCurse(x))){ G.energy+=1; log('聚灵：抽到【诅咒牌】，获得 1 点符文'); } }},
  {id:'sheshen', name:'舍身', type:'skill', rarity:'blue', cost:0, hpCost:()=>4,
    t:(u)=>G.hero==='ganshiren'?`失去 4 点生命。抽 ${u?2:1} 张牌。获得 ${u?2:1} 点【尸气】`
      :G.hero==='wuseng'?`失去 4 点生命。获得 4 点格挡，抽 ${u?2:1} 张牌`
      :G.hero==='yincha'?`失去 4 点生命。抽 ${u?3:2} 张牌`
      :`失去 4 点生命，抽 ${u?2:1} 张牌。对目标施加 ${u?2:1} 层【诅咒】`,
    eff:(u)=>{ loseHp(4); const n=G.hero==='yincha'?(u?3:2):(u?2:1); drawCards(n);
      if(G.hero==='ganshiren'){ gainShiqi(u?2:1); log(`舍身：获得 ${u?2:1} 点【尸气】`); }
      else if(G.hero==='wuseng'){ gainBlock(4); }
      else if(G.hero==='tianshi'){ const re=curEnemy()||randomAlive(); if(re){ applyCurse(re,u?2:1); log(`舍身：对 ${re.name} 施加 ${u?2:1} 层【诅咒】`); } } }},
  {id:'shouyi', name:'守一', type:'skill', rarity:'purple', cost:0,
    t:(u)=>G.hero==='ganshiren'?`保留 ${u?2:1} 张手牌。每保留 1 张【鬼怪牌】，获得 1 点【尸气】`
      :G.hero==='wuseng'?`保留 ${u?2:1} 张手牌。每保留 1 张防御牌，获得 ${u?4:3} 点格挡`
      :G.hero==='yincha'?`保留 ${u?2:1} 张手牌。下回合恢复保留手牌费用之和的生命`
      :`保留 ${u?2:1} 张手牌。保留的每张【诅咒牌】，下回合该牌费用 -1（仅一回合）`,
    eff:(u)=>{ G.retain+=(u?2:1); G.shouyiUp=!!u; floatMsg(`回合结束时可保留 ${G.retain} 张手牌`); }},
  {id:'yiwu', name:'易物', type:'skill', rarity:'blue', cost:0,
    t:(u)=>G.hero==='ganshiren'?`选择 1 张手牌与抽牌堆交换。若换出的是【鬼怪牌】，获得 2 点【尸气】`
      :G.hero==='wuseng'?`选择 1 张手牌与抽牌堆交换。若换出的是防御牌，获得 4 点格挡`
      :G.hero==='yincha'?`选择 1 张手牌与抽牌堆交换。若换出的是技能牌，恢复 5 点生命`
      :`选择 1 张手牌与抽牌堆交换。若换出的是攻击牌，额外抽 1 张牌`,
    eff:(u,c,_x,i)=>{ animExchangeCast(c,i); startExchangeSelect(1, c); }},
  {id:'xueqi', name:'血契', type:'skill', rarity:'blue', cost:1, costU:{wuseng:0, yincha:0, ganshiren:0},
    t:(u)=>G.hero==='wuseng'?`将目前的格挡按 60% 转化为血量${u?'（0 符文）':''}`
      :G.hero==='yincha'?`扣除目前所有【血怒】，恢复【血怒】层数 ×2 的生命${u?'（0 符文）':''}`
      :G.hero==='tianshi'?`本回合每失去 1 点生命，获得 ${u?2:1} 点格挡`
      :`本回合每失去 1 点生命，获得 ${u?3:2} 点格挡${u?'（0 符文）':''}`,
    eff:(u)=>{ if(G.hero==='wuseng'){ const b=G.block||0; if(b>0){ const h=Math.floor(b*0.6); G.block=0; heal(h); floatMsg(`格挡化血 +${h}`); log(`血契：${b} 点格挡转化为 ${h} 点生命（60%）`); } else log('血契：当前没有格挡'); return; }
      if(G.hero==='yincha'){ const r=rageLayers(); if(r<=0){ floatMsg('没有【血怒】'); log('血契：当前没有【血怒】'); return; } G.xuenu=0; const hh=r*2; heal(hh); floatMsg(`血怒化命 +${hh}`); log(`血契：扣除 ${r} 层【血怒】，恢复 ${hh} 点生命`); return; }
      G.bloodPact=(G.bloodPact||0)+(G.hero==='tianshi'?(u?2:1):(u?3:2)); floatMsg('血契：以血换盾'); log(`血契：本回合每失去 1 点生命，获得 ${G.bloodPact} 点格挡`); }},
  {id:'tongling', name:'通灵', type:'skill', rarity:'white', cost:1, costU:0,
    t:(u)=>`抽 2 张牌${u?'（0 符文）':''}`,
    eff:(u)=>{ drawCards(2); }},
  {id:'jingxin', name:'静心诀', type:'skill', rarity:'blue', cost:1, costU:0,
    t:(u)=>`下回合获得 1 点符文${u?'（0 符文）':''}`,
    eff:(u)=>{ G.pendingEnergy=(G.pendingEnergy||0)+1; floatMsg('下回合 +1 符文'); }},
  {id:'ranxue', name:'燃血术', type:'skill', rarity:'purple', cost:0,
    hpCost:(u)=>G.hero==='wuseng'?8:(G.hero==='yincha'?4:8),
    t:(u)=>{ const l=G.hero==='wuseng'?8:(G.hero==='yincha'?4:8);
      const gg=G.hero==='yincha'?1:2;
      return `失去 ${l} 点生命。获得 ${gg} 点符文`; },
    eff:(u)=>{ const l=G.hero==='wuseng'?8:(G.hero==='yincha'?4:8);
      const gg=G.hero==='yincha'?1:2;
      loseHp(l); G.energy+=gg; floatMsg(`符文 +${gg}`); log(`燃血术：失去 ${l} 点生命，获得 ${gg} 点符文`); }},
  {id:'xisui', name:'洗髓经', type:'skill', rarity:'gold', cost:2,
    t:(u)=>G.hero==='ganshiren'?`接下来 3 回合，每回合开始获得 ${u?2:1} 点【尸气】和 1 点符文`
      :G.hero==='wuseng'?`接下来 ${u?4:3} 回合，每回合开始获得 2 点格挡和 1 点符文`
      :G.hero==='yincha'?`接下来 ${u?4:3} 回合，每回合开始失去 2 点生命，获得 1 点符文`
      :`接下来 ${u?4:3} 回合，每回合开始对随机敌人施加 1 层【诅咒】和 1 点符文`,
    eff:(u)=>{ const n=(G.hero==='ganshiren')?3:(u?4:3); G.xisuiTurns=n; G.xisuiShiqi=u?2:1;
      floatMsg(`洗髓经：接下来 ${n} 回合生效`); }},
  {id:'duhunguiji', name:'渡魂归己', type:'skill', rarity:'gold', cost:1, exhaust:true,
    t:(u)=>`消耗。接下来 5 回合，你对敌人造成伤害的 ${u?50:30}% 转化为生命`,
    eff:(u)=>{ G.duhun={turns:5, ratio:u?0.5:0.3}; floatMsg('渡魂归己 · 吸血化命'); log(`渡魂归己：接下来 5 回合，造成伤害的 ${Math.round(G.duhun.ratio*100)}% 转化为生命`); }},
  {id:'fenfu', name:'焚符', type:'skill', rarity:'purple', cost:0,
    t:(u)=>G.hero==='ganshiren'?`弃任意张手牌：每弃 1 张，获得 1 点【尸气】与 ${u?3:2} 点格挡`
      :G.hero==='wuseng'?`弃任意张手牌：每弃 1 张，获得 ${u?5:4} 点格挡`
      :G.hero==='yincha'?`弃任意张手牌：每弃 1 张，恢复 ${u?4:3} 点生命`
      :`弃任意张手牌：每弃 1 张，对随机敌人施加 1 层【诅咒】并获得 ${u?3:2} 点格挡`,
    eff:(u,c)=>{ startDiscardSelect(G.hand.length, c); }},
  {id:'xueji', name:'血祭', type:'skill', rarity:'purple', cost:1, costU:0, hpCost:(u)=>G.hero==='yincha'?4:3,
    t:(u)=>G.hero==='ganshiren'?`失去 3 点生命。本回合每召唤 1 个单位，下回合多摸 1 张牌（上限 3张）${u?'（0 符文）':''}`
      :G.hero==='wuseng'?`失去 3 点生命。本回合每获得 5 点格挡，下回合多摸 1 张牌（上限 +4）${u?'（0 符文）':''}`
      :G.hero==='yincha'?`本回合每失去 4 点生命，下回合多摸 1 张牌（上限 +4）。立刻失去 4 点生命${u?'（0 符文）':''}`
      :`失去 3 点生命。本回合每施加 1 层【诅咒】，下回合多摸 1 张牌（上限 +4）${u?'（0 符文）':''}`,
    eff:(u)=>{ loseHp(G.hero==='yincha'?4:3); G.xuejiArmed=true; floatMsg('血祭：回合末结算，下回合多摸牌'); }},
  {id:'ranhun', name:'燃魂', type:'skill', rarity:'purple', cost:0, hpCost:(u)=>G.hero==='yincha'?6:(u?4:6),
    t:(u)=>G.hero==='ganshiren'?`失去 ${u?4:6} 点生命。抽 2 张牌。本回合每打出 1 张【鬼怪牌】，恢复 ${u?4:2} 点生命。获得 1 点符文`
      :G.hero==='wuseng'?`失去 ${u?4:6} 点生命。抽 3 张牌。本回合每打出 1 张防御牌，恢复 ${u?3:2} 点生命`
      :G.hero==='yincha'?`失去 6 点生命。抽 3 张牌。本回合每打出 1 张技能牌，恢复 ${u?4:2} 点生命`
      :`失去 ${u?4:6} 点生命。抽 3 张牌。本回合每打出 1 张攻击牌，恢复 ${u?3:2} 点生命`,
    eff:(u,c)=>{ loseHp(G.hero==='yincha'?6:(u?4:6));
      if(G.hero==='ganshiren'){ drawCards(2); G.energy+=1; } else { drawCards(3); }
      G.ranhunType = G.hero==='ganshiren'?'ghost' : G.hero==='wuseng'?'defense' : G.hero==='yincha'?'skill' : 'attack';
      G.ranhunHeal = u ? ((G.hero==='wuseng'||G.hero==='tianshi')?3:4) : 2;
      G.ranhunSelf=c; floatMsg('燃魂 · 已点燃'); }},
  {id:'kaitianyan', name:'开天眼', type:'skill', rarity:'blue', cost:1,
    t:(u)=>G.hero==='ganshiren'?`本回合攻击牌伤害 +${u?5:3}（多段牌每段 +${u?2:1}）。场上每有 1 个召唤单位，额外 +1`
      :G.hero==='wuseng'?`本回合攻击牌伤害 +${u?4:2}（多段牌每段 +${u?2:1}）。每有 ${u?2:3} 点格挡，额外 +1（上限 +5）`
      :G.hero==='yincha'?`本回合攻击牌伤害 +${u?5:3}（多段牌每段 +${u?2:1}）。每层【血怒】使额外伤害 +1（上限 +${u?10:8}），打出后消耗对应【血怒】`
      :`本回合攻击牌伤害 +${u?6:4}（多段牌每段 +${u?3:2}）`,
    eff:(u)=>{ let val;
      if(G.hero==='ganshiren') val=(u?5:3)+G.summons.filter(s=>s.dur>0).length;
      else if(G.hero==='wuseng') val=(u?4:2)+Math.min(5,Math.floor((G.block||0)/(u?2:3)));
      else if(G.hero==='yincha') val=(u?5:3)+rageSpend(1,u?10:8);
      else val=u?6:4;
      G.turnAtkBuff=(G.turnAtkBuff||0)+val;
      log(`开天眼：本回合攻击牌伤害 +${val}`); }},
  {id:'yixing', name:'移形换影', type:'skill', rarity:'purple', cost:1, costU:{tianshi:1, wuseng:1, ganshiren:1, yincha:1, default:1},
    t:(u)=>G.hero==='ganshiren'?`闪避下一次攻击。闪避成功后，获得 ${u?3:1} 点【尸气】`
      :G.hero==='wuseng'?`闪避下一次攻击。闪避成功后，下一回合获得 5 点格挡`
      :G.hero==='yincha'?`闪避下一次攻击。闪避成功后，恢复 ${u?4:2} 点生命并获得 ${u?2:1} 层【血怒】`
      :`闪避下一次攻击。闪避成功后，对攻击者施加 1 层【诅咒】${(u&&G.hero!=='tianshi')?'（0 符文）':''}`,
    eff:(u)=>{ G.dodge+=1;
      if(G.hero==='ganshiren'){ G.dodgeShiqi=u?3:1; }
      else if(G.hero==='wuseng'){ G.dodgeNextBlock=5; }
      else if(G.hero==='yincha'){ G.dodgeHealRage=u?4:2; G.dodgeRageGain=u?2:1; }
      else { G.dodgeCurse=1; }
      floatMsg('移形换影：闪避下一次攻击'); }},
  {id:'fuling', name:'附灵术', type:'skill', rarity:'purple', cost:{ganshiren:0, default:2}, costU:{tianshi:1, wuseng:1}, exhaustOnly:['ganshiren'], needs:'summon',
    t:(u)=>G.hero==='ganshiren'?`立即触发所有召唤单位。消耗牌（一次性）`
      :G.hero==='wuseng'?`立即触发所有召唤单位。每触发 1 个，获得 3 点格挡${u?'（1 符文）':''}`
      :G.hero==='yincha'?`立即触发所有召唤单位。每触发 1 个，恢复 ${u?4:2} 点生命`
      :`立即触发所有召唤单位。每触发 1 个，对随机敌人施加 1 层【诅咒】${u?'（1 符文）':''}`,
    eff:(u)=>{ const n=G.summons.filter(s=>s.dur>0).length;
      triggerSummons(false);
      if(n>0){
        if(G.hero==='wuseng'){ const bb=n*3; gainBlock(bb); log(`附灵术：触发 ${n} 个召唤单位，获得 ${bb} 点格挡`); }
        else if(G.hero==='yincha'){ const hh=n*(u?4:2); heal(hh); log(`附灵术：触发 ${n} 个召唤单位，恢复 ${hh} 点生命`); }
        else if(G.hero==='tianshi'){ for(let k=0;k<n;k++){ const re=randomAlive(); if(re) applyCurse(re,1); } log(`附灵术：触发 ${n} 个召唤单位，施加 ${n} 层【诅咒】`); }
        else log(`附灵术：触发 ${n} 个召唤单位`);
      } else log('附灵术：没有召唤单位可触发'); }},
  {id:'zhenyaoling', name:'镇妖铃', type:'spirit', rarity:'purple', cost:2, exhaust:true, hpCost:(u)=>G.hero==='yincha'?3:0,
    t:(u)=>G.hero==='ganshiren'?`造成 ${u?15:10} 伤害并【镇魂】。获得 ${u?4:3} 点【尸气】。消耗牌（一次性）`
      :G.hero==='wuseng'?`造成 ${u?15:10} 伤害并【镇魂】。若此时格挡 ≥10，伤害 +${u?11:8}。消耗牌（一次性）`
      :G.hero==='yincha'?`造成 ${u?16:10} 伤害并【镇魂】。失去 3 点生命，每层【血怒】使此牌伤害 +${u?3:2}（上限 +${u?18:12}）（消耗）`
      :`造成 ${u?15:10} 伤害并【镇魂】。若目标【诅咒】≥4 层，消耗 4 层，镇魂持续 2 回合（消耗）`,
    eff:(u)=>{ const t=curEnemy(); if(!t) return;
      if(G.hero==='ganshiren'){ const __zq=u?4:3; sealEnemy(t,1,'zhenyaoling'); dealDamageTo(t,u?15:10); gainShiqi(__zq); log(`镇妖铃：造成 ${u?15:10} 伤害并获得 ${__zq} 点【尸气】`); return; }
      if(G.hero==='wuseng'){ sealEnemy(t,1,'zhenyaoling'); let d=u?15:10; if((G.block||0)>=10){ d+=(u?11:8); log(`镇妖铃：格挡 ≥10，伤害 +${u?11:8}`); } dealDamageTo(t,d); return; }
      if(G.hero==='yincha'){ loseHp(3); sealEnemy(t,1,'zhenyaoling'); dealDamageTo(t,(u?16:10)+(u?3:2)*rageSpend(u?3:2,u?18:12)); return; }
      const __cc4=(t.curse||0)>=4; sealEnemy(t, __cc4?2:1,'zhenyaoling'); dealDamageTo(t,u?15:10); if(__cc4) t.curse-=4; }},
// 召唤 / 秘法
  {id:'zhiren', name:'纸人', type:'spirit', rarity:'white', cost:1, hpCost:(u)=>G.hero==='yincha'?2:0,
    t:(u)=>G.hero==='ganshiren'?`召唤纸人。每回合末造成 ${u?4:2} 伤害。若打出时【尸气】≥4，消耗 4 点【尸气】强化：每回合末造成 ${u?7:5} 伤害。死亡时获得 2 点【尸气】（持续 2 回合）`
      :G.hero==='wuseng'?`召唤纸人。每回合末造成 ${u?3:2} 伤害。纸人存活时，每回合开始获得 ${u?3:2} 点格挡（持续 2 回合）`
      :G.hero==='yincha'?`召唤纸人。失去 2 点生命。每回合末造成 ${u?2:1} 伤害，纸人攻击时为你恢复 ${u?3:2} 点生命（持续 2 回合）。若打出时【血怒】≥3，消耗 3 点【血怒】强化：每回合末造成 ${u?5:4} 伤害，攻击时恢复 ${u?4:3} 点生命`
      :`召唤纸人。每回合末对随机敌人造成 ${u?3:2} 伤害并施加 ${u?2:1} 层【诅咒】（持续 2 回合）`,
    eff:(u)=>{ let v = G.hero==='wuseng' ? (u?3:2) : (G.hero==='tianshi' ? (u?3:2) : (u?4:2)); let hv=0;
      if(G.hero==='ganshiren' && hasShiqi(4)){ spendShiqi(4); v=u?7:5; log('纸人：消耗 4 点【尸气】强化'); }
      else if(G.hero==='yincha'){ loseHp(2); v=u?2:1; hv=u?3:2;
        if(rageLayers()>=3){ G.xuenu-=3; v=u?5:4; hv=u?4:3; log('纸人：消耗 3 点【血怒】强化'); } }
      addSummon({type:'zhiren', v, healV:hv, dur:2, up:!!u}); floatMsg('纸人 · 受命而起'); }},
  {id:'zhouyin', name:'咒印', type:'spirit', rarity:'white', cost:1, exhaustOnly:['wuseng'],
    t:(u)=>G.hero==='ganshiren'?`立即获得 ${u?5:3} 点【尸气】`
      :G.hero==='wuseng'?`招来咒魂：本回合打出的下一张攻击牌获得 100% 【吸血】（按其实际伤害回复生命）。消耗牌（一次性）`
      :G.hero==='tianshi'?`施加 ${u?3:2} 层【诅咒】。若目标已有【诅咒】，额外施加 1 层`
      :`施加 ${u?3:2} 层【诅咒】`,
    eff:(u)=>{ if(G.hero==='ganshiren'){ gainShiqi(u?5:3); log(`咒印：获得 ${u?5:3} 点【尸气】`); return; }
      if(G.hero==='wuseng'){ G.zhouhunSteal=1; floatMsg('咒魂 · 已伏于刃上'); log('咒印：本回合下一张攻击牌获得 100% 吸血'); return; }
      const t=curEnemy(); if(!t) return; let n=u?3:2;
      if(G.hero==='tianshi' && (t.curse||0)>0){ n+=1; log('咒印：目标已有诅咒，额外 +1 层'); }
      applyCurse(t,n); }},
  {id:'xiaogui', name:'小鬼', type:'spirit', rarity:'white', cost:1, hpCost:(u)=>G.hero==='yincha'?2:0,
    t:(u)=>G.hero==='ganshiren'?`召唤小鬼。每回合末造成 ${u?4:2} 伤害。死亡时获得 ${u?3:2} 点【尸气】（持续 2 回合）`
      :G.hero==='wuseng'?`召唤小鬼。每回合末造成 ${u?3:2} 伤害。小鬼死亡时，获得 ${u?7:5} 点格挡（持续 2 回合）`
      :G.hero==='yincha'?`召唤小鬼。失去 2 点生命。每回合末造成 ${u?2:1} 伤害并获得 1 层【血怒】；小鬼死亡时，恢复 ${u?4:2} 点生命（持续 2 回合）`
      :`召唤小鬼。每回合末对随机敌人造成 ${u?3:2} 伤害；若该敌人带【诅咒】，伤害 +${u?3:2}（持续 2 回合）`,
    eff:(u)=>{ const v=G.hero==='wuseng'?(u?3:2):(G.hero==='tianshi'?(u?3:2):(G.hero==='yincha'?(u?2:1):(u?4:2)));
      if(G.hero==='yincha') loseHp(2);
      addSummon({type:'xiaogui', v, dur:2, up:!!u}); floatMsg('小鬼 · 奉命出巡'); }},
  {id:'huapi', name:'画皮', type:'spirit', rarity:'blue', cost:1,
    t:(u)=>`对目标施加 1 层【魅惑】（其下回合伤害 -${u?75:50}%）`,
    eff:(u)=>{ const t=curEnemy(); if(!t) return; charmEnemy(t, u?0.25:0.5); }},
  {id:'wutong', name:'五通神', type:'spirit', rarity:'purple', cost:2,
    t:(u)=>G.hero==='ganshiren'?`召唤五通神。立即获得 5 点格挡，之后每回合开始重复一次（持续 ${u?3:2} 回合）。若打出时【尸气】≥5，消耗 5 点【尸气】强化：立即获得 6 点格挡，之后每回合开始重复一次（持续 ${u?4:3} 回合）`
      :G.hero==='wuseng'?`召唤五通神。立即获得 7 点格挡（1 点基础 + 首次触发 6 点）；之后每回合开始获得 6 点格挡（持续 ${u?3:2} 回合）`
      :G.hero==='yincha'?`召唤五通神。立即恢复 6 点生命；之后每回合开始恢复 6 点生命（持续 ${u?3:2} 回合）。若打出时【血怒】≥3，消耗 3 点【血怒】强化：持续 ${u?4:3} 回合`
      :`召唤五通神。立即获得 6 点格挡并对随机敌人施加 1 层【诅咒】，之后每回合开始重复一次（持续 ${u?3:2} 回合）`,
    eff:(u)=>{
      let wv=G.hero==='wuseng'?6:(G.hero==='tianshi'?6:3), wdur=u?3:2;
      if(G.hero==='wuseng'){ gainBlock(1); }
      else if(G.hero==='yincha'){ heal(6); wv=6; if(rageLayers()>=3){ G.xuenu-=3; wdur=u?4:3; log('五通神：消耗 3 点【血怒】强化'); } }
      if(G.hero==='ganshiren'){ if(hasShiqi(5)){ spendShiqi(5); wv=6; wdur=u?4:3; log('五通神：消耗 5 点【尸气】强化'); } else { wv=5; } }
      const s=addSummon({type:'wutong', v:wv, dur:wdur});
      wutongTick(s);
      floatMsg('五通神 · 现形'); }},
  {id:'zhouyu', name:'咒雨', type:'spirit', rarity:'purple', cost:{ganshiren:3, wuseng:0, default:2}, exhaust:true,
    t:(u)=>G.hero==='ganshiren'?`引爆当前所有【尸气】：清零尸气，每层尸气转化为 ${u?6:5} 点伤害，随机分配给所有敌人。消耗（一次性）`
      :G.hero==='wuseng'?`将当前全部格挡转化为等量伤害，每 1 点随机打在一个敌人身上（逐点结算）。消耗牌（一次性）`
      :G.hero==='yincha'?`将 ${u?6:4} 层【诅咒】随机施加在敌人身上。每施加 1 层，恢复 2 点生命`
      :`对所有敌人施加 1 层【诅咒】。所有敌人每有 1 层【诅咒】，此牌费用 -1（最低 ${u?0:1}）`,
    eff:(u)=>{ if(G.hero==='ganshiren'){ const q=G.尸气||0; if(q<=0){ floatMsg('没有尸气可引爆'); log('咒雨：没有尸气可引爆'); return; }
        const qConv=Math.min(q, relicMaxShiqi());  // 上限跟着尸气上限走，不写死
        G.尸气=0; if(q>0){ heal(q); log(`咒雨：引爆 ${q} 点【尸气】，回复 ${q} 点生命`); }
        const total=qConv*(u?6:5); const al=aliveEnemies(); if(!al.length) return;
        const dist=al.map(()=>0);
        for(let i=0;i<total;i++){ dist[Math.floor(rng()*al.length)]++; }
        const __bStep=SETTINGS.lowSpec?0:120;  // 屏序错开的毫秒数，低配直接 0
        al.forEach((e,i)=>{ if(dist[i]>0) dealDamageTo(e,dist[i],false,i*__bStep); });
        log(`咒雨：引爆 ${q} 点【尸气】，造成 ${total} 点伤害随机分配`); floatMsg(`咒雨 · 引爆 ${q} 尸气`); return; }
      if(G.hero==='tianshi'){ aliveEnemies().forEach(e=>applyCurse(e,1)); return; }
      if(G.hero==='wuseng'){
        const b=G.block||0;
        if(b<=0){ floatMsg('没有格挡可转化'); log('咒雨：当前没有格挡'); return; }
        G.block=0;
        let pts=b+(G.attackBuff||0)+(G.turnAtkBuff||0);
        if(G.weak>0) pts=Math.floor(pts*0.75);  // 逐点 1 伤没法再乘，折算到点数上
        const smooth=!!SETTINGS.lowSpec;
        const step=smooth?0:(pts>12?60:120);
        let hits=0, total=0;
        for(let i=0;i<pts;i++){
          const al2=aliveEnemies(); if(!al2.length) break;
          const e=al2[Math.floor(rng()*al2.length)];
          total+=dealDamageTo(e,1,false,smooth?0:i*step,true);
          hits++;
          if(G.hp<=0) break;
        }
        log(`咒雨：${b} 点格挡化为 ${hits} 连击，合计 ${total} 点伤害`);
        floatMsg(smooth?`咒雨 · ${hits} 连击 · 合计 ${total}`:`咒雨 · ${hits} 连击`);
        return;
      }
      let n=0; const __zyl=aliveEnemies(); const __zyt=u?6:4;
      for(let i=0;i<__zyt;i++){ if(!__zyl.length) break; const __zye=__zyl[Math.floor(rng()*__zyl.length)]; if(__zye) n+=applyCurse(__zye,1); }
      heal(n*2); log(`咒雨：随机施加 ${n} 层诅咒，恢复 ${n*2} 点生命`); }},
  {id:'yinbingguo', name:'阴兵过境', type:'spirit', rarity:'gold', cost:3,
    t:(u)=>G.hero==='ganshiren'?`召唤 ${u?3:2} 只阴兵。每回合末造成 ${u?5:4} 伤害。每只死亡时获得 1 点【尸气】（持续 3 回合）`
      :G.hero==='wuseng'?`召唤 ${u?3:2} 只阴兵。每回合末造成 ${u?5:4} 伤害。阴兵存活时，每回合开始获得 ${u?4:3} 点格挡（持续 3 回合）`
      :G.hero==='yincha'?`召唤 ${u?3:2} 只阴兵。每回合末造成 ${u?5:4} 伤害。每只阴兵攻击时，为你恢复 2 点生命（持续 3 回合）`
      :`召唤 ${u?3:2} 只阴兵。每回合末优先攻击你上一次施加【诅咒】的敌人（带🎯阴兵目标标记），造成 ${u?5:4} 伤害（持续 3 回合；标记敌死亡则转随机）`,
    eff:(u)=>{ const count=u?3:2; const v=u?5:4;
      for(let i=0;i<count;i++) addSummon({type:'yinbing', v, dur:3, healV:2, up:!!u});
      floatMsg(`阴兵过境 ×${count}`); log(`阴兵过境：召唤 ${count} 只阴兵`); }},
  {id:'shi_wang', name:'尸王', type:'spirit', rarity:'gold', cost:0,
    t:(u)=>`消耗 10 点【尸气】召唤尸王。每回合末对全体敌人造成 10 点伤害。在场时其他召唤单位伤害 +1。持续 5 回合。召唤物存活期间此牌不进入弃牌堆，死亡后才回到弃牌堆（不消耗符文，不可升级）`,
    eff:(u)=>{ if(G.hero!=='ganshiren') return false;
      if(isSummon('shi_wang')){ floatMsg('已有尸王在场'); return false; }
      if(!hasShiqi(10)){ floatMsg('尸气不足！需要 10 点'); return false; }
      spendShiqi(10);
      addSummon({type:'shi_wang', v:10, dur:5});
      floatMsg('尸王 · 苏醒');
      log('尸王：消耗 10 点【尸气】，召唤尸王（持续 5 回合）'); }},
  {id:'duanren_leifu', name:'断刃雷符', type:'attack', rarity:'gold', cost:0,
    t:()=>'造成伤害（与【雷符】同数值、同属性，可受增益）',
    eff:()=>{ const t=curEnemy(); if(t) dealDamageTo(t,0); }},
  {id:'yinbing', name:'阴兵', type:'spirit', rarity:'gold', cost:0,
    t:(u)=>`召唤 1 只阴兵。每回合末造成 ${u?5:4} 伤害（持续 ${u?4:3} 回合）`,
    eff:(u)=>{ addSummon({type:'yinbing', v:u?5:4, dur:u?4:3, healV:2, up:!!u}); floatMsg('阴兵 · 听令而来'); }},
  {id:'dianzhoufu', name:'点咒符', type:'skill', rarity:'white', cost:0, hero:'tianshi', mile:'tianshi_t1',
    t:(u)=>`对【诅咒】最高的敌人施加 ${u?2:1} 层【诅咒】；其【诅咒】达 6 层上限时抽 ${u?2:1} 张牌`,
    eff:(u)=>{ const t=mostCursedEnemy(); if(!t) return; applyCurse(t, u?2:1); if((t.curse||0)>=6) drawCards(u?2:1); }},
  {id:'leiqianfu', name:'雷谴符', type:'attack', rarity:'purple', cost:1, hero:'tianshi', mile:'tianshi_t2',
    t:(u)=>u
      ? `对全体敌人按其各自的【诅咒】层数打出等量雷击（第 n 段 n 点；6 层 = 21 伤），随后清空各自的【诅咒】`
      : `对全体敌人按其各自的【诅咒】层数各打 2 点雷击（6 层 = 12 伤），随后清空各自的【诅咒】`,
    eff:(u)=>{ const es=aliveEnemies().slice(); if(!es.length) return; let any=false;
      const step=90;  // 多段雷击的段间间隔，毫秒
      SEG_HALVE=true;
      try{
      es.forEach(t=>{ const c=t.curse||0; if(c<=0) return; any=true;
        const uid=t.uid, snapEl=enemyEl(t);
        for(let i=1;i<=c;i++){
          const d=calcDamageTo(t, u?i:2, false, false);
          if(!enemyActBeats()){
            if(t.hp<=0) break;
            applyDamageTo(t, d, false, false, false, 0);
            continue;
          }
          (function(i,d){
            setTimeout(function(){
              try{
                if(t.hp>0) applyDamageTo(t, d, false, true, false, 0);
                const live=uid ? document.querySelector('#enemy-panel .enemy[data-uid="'+uid+'"]') : null;
                playFx('lightning', live||snapEl, { key:'lqf@'+uid+'#'+i });
                sfxOnce('lightning', 55);
                syncBattleHpDom();
              }catch(e){}
            }, (i-1)*step);
          })(i,d);
        }
        t.curse=0; });
      }finally{ SEG_HALVE=false; }
      if(any) log('雷谴符：清算全体敌人身上的【诅咒】为雷击');
      if(any && enemyActBeats()){
        setTimeout(function(){ try{ syncBattleHpDom(); if(!G.battleOver && G.hp>0 && aliveEnemies().length===0) winFight(); }catch(e){} }, 6*step+40);
      } }},
  {id:'wuleifayin', name:'五雷法印', type:'skill', rarity:'gold', cost:3, hero:'tianshi', mile:'tianshi_t5',
    t:(u)=>`选择至多 5 张手牌，将其变为 0 费${u?'升级版':''}雷符（本场临时，不进牌堆循环）；本回合结束时未打出的会依次自动打出，击向血量最少的敌人`,
    eff:(u,c)=>{ startWuleiSelect(c, u); }},
  {id:'ganzhiling', name:'赶尸令', type:'spirit', rarity:'white', cost:0, hero:'ganshiren', mile:'ganshiren_t1',
    t:(u)=>`消耗 2 点【尸气】，召唤 1 个${u?'升级':''}纸人（每回合末造成 ${u?4:2} 伤害）；若此时【尸气】≥4，再消耗 4 点使其强化（每回合末造成 ${u?7:5} 伤害）`,
    eff:(u)=>{ if(!hasShiqi(2)){ floatMsg('尸气不足！需要 2 点'); return false; }
      spendShiqi(2);
      let v=u?4:2;
      if(hasShiqi(4)){ spendShiqi(4); v=u?7:5; log('赶尸令：再消耗 4 点【尸气】强化纸人'); }
      addSummon({type:'zhiren', v, healV:0, dur:2, up:!!u});
      floatMsg('纸人 · 受命而起'); }},
  {id:'wanshichaozong', name:'万尸朝宗', type:'spirit', rarity:'purple', cost:2, hero:'ganshiren', mile:'ganshiren_t3',
    t:(u)=>`消耗至多 ${u?4:3} 点【尸气】，每消耗 1 点召唤 1 个${u?'升级':''}纸人（每回合末造成 ${u?4:2} 伤害）。纯召唤，当回合不立刻攻击`,
    eff:(u)=>{ const q=Math.min(G.尸气||0, u?4:3);
      if(q<=0){ floatMsg('没有尸气可消耗'); return false; }
      const v=u?4:2; spendShiqi(q);
      for(let i=0;i<q;i++) addSummon({type:'zhiren', v, healV:0, dur:2, up:!!u});
      floatMsg(`万尸朝宗 · 召 ${q} 纸人`); log(`万尸朝宗：消耗 ${q} 点【尸气】，召唤 ${q} 个纸人`); }},
  {id:'luohanfuhu', name:'罗汉伏虎', type:'attack', rarity:'blue', cost:1, hero:'wuseng', mile:'wuseng_t1',
    t:(u)=>`造成 ${u?7:5} 点伤害，额外加上你当前格挡的一半（上限${u?15:10}，向下取整）`,
    eff:(u)=>{ const t=curEnemy(); if(!t) return; const bonus=Math.min(Math.floor((G.block||0)/2), u?15:10);
      yuanqiStrike(t); sfx('energy');
      dealDamageTo(t, (u?7:5)+bonus); if(bonus>0) log(`罗汉伏虎：额外加上格挡的一半 ${bonus} 点`); }},
  {id:'huajiaweidu', name:'化甲为毒', type:'skill', rarity:'purple', cost:0, hero:'wuseng', mile:'wuseng_t3',
    t:(u)=>`消耗 10 点格挡，为全体敌人施加 1 层【腐毒】（本牌叠加上限 ${u?5:4} 层）`,
    eff:(u)=>{ if((G.block||0)<10){ floatMsg('格挡不足！需要 10 点'); return false; }
      G.block-=10; applyPoisonAll(1, u?5:4); log(`化甲为毒：消耗 10 点格挡，为全体敌人施加 1 层【腐毒】`); }},
  {id:'yinxueren', name:'饮血刃', type:'attack', rarity:'blue', cost:0, hero:'yincha', mile:'yincha_t1', hpCost:(u)=>G.hero==='yincha'?3:0,
    t:(u)=>`失去 3 点生命，造成 ${u?8:4} 伤害。每层【血怒】使此牌伤害 +3（上限 +6），打出时消耗对应【血怒】；若以此牌击杀敌人，获得 2 层【血怒】`,
    eff:(u)=>{ const t=curEnemy(); if(!t) return;
      loseHp(3);
      const _hp0=t.hp;
      dealDamageTo(t,(u?8:4)+3*rageSpend(3,6));
      if(_hp0>0 && t.hp<=0){ gainRage(2); log('饮血刃：击杀敌人，获得 2 层【血怒】'); } }},
  {id:'fenshenzhou', name:'焚身咒', type:'skill', rarity:'purple', cost:0, hero:'yincha', mile:'yincha_t3', exhaust:true, hpCost:(u)=>G.hero==='yincha'?3:0,
    t:(u)=>`失去 3 点生命。本回合你的攻击牌伤害 +${u?5:3}（多段牌每段 +${u?2:1}）`,
    eff:(u)=>{ loseHp(3); G.turnAtkBuff=(G.turnAtkBuff||0)+(u?5:3); floatMsg(`攻击 +${u?5:3}`); log(`焚身咒：失去 3 点生命，本回合攻击牌伤害 +${u?5:3}`); }},
];
(function(){
  const lf=CARDS.find(c=>c.id==='leifu'), dr=CARDS.find(c=>c.id==='duanren_leifu');
  if(!lf || !dr) return;
  dr.cost=0; dr.rarity=lf.rarity; dr.t=lf.t; dr.eff=lf.eff;  // 断刃雷符固定 0 费，其余跟雷符走
})();

// 牌面只放得下 3 行，装不下的才写 ts() 短版；数字必须和全文对得上
function cardText(c, up){
  if(!c) return '';
  try {
    if(typeof c.ts==='function'){ const s=c.ts(up); if(s) return s; }
    return c.t(up);
  } catch(e){ return c.t(up); }
}
const SHORT_TEXT = {
  shi_wang:(u)=>`耗 10【尸气】召尸王：回合末群伤 10，他召伤 +1，续 5 回合`,
  zhiren:(u)=>G.hero === 'ganshiren'
      ? `召纸人：末伤${u ? 4 : 2}。【尸气】≥4耗4→伤${u ? 7 : 5}，亡得【尸气】2，续2`
      : G.hero === 'wuseng'
        ? `召纸人：回合末伤 ${u ? 3 : 2}，存活时回合开始格挡 ${u ? 3 : 2}，续 2`
        : G.hero === 'yincha'
          ? `召纸人：失2，末伤${u ? 2 : 1}回${u ? 3 : 2}，续2。【血怒】≥3耗3→末伤${u ? 5 : 4}回${u ? 4 : 3}`
          : `召纸人：回合末对随机敌伤 ${u ? 3 : 2} 并【诅咒】${u ? 2 : 1}，续 2`,
  wutong:(u)=>G.hero === 'ganshiren'
      ? `召唤：格挡5每回合重复，续${u ? 3 : 2}（【尸气】≥5耗5：格挡6续${u ? 4 : 3}）`
      : G.hero === 'wuseng'
        ? `召唤：格挡7（基础1+首触6），每回合重复格挡6，续${u ? 3 : 2}`
        : G.hero === 'yincha'
          ? `召唤：回6，之后每回合回6，续${u ? 3 : 2}（【血怒】≥3耗3：续${u ? 4 : 3}）`
          : `召唤：格挡6并对随机敌【诅咒】1，每回合重复，续${u ? 3 : 2}`,
  xiejiashengyuan:(u)=>G.hero === 'ganshiren'
      ? `格挡 ${u ? 7 : 4}。回合结束剩余格挡每 2 换【尸气】${u ? 2 : 1}`
      : G.hero === 'wuseng'
        ? `格挡 ${u ? 8 : 5}。【卸甲】续 ${u ? 3 : 2}：期间格挡不清零，到期转生命`
        : G.hero === 'yincha'
          ? `格挡 ${u ? 8 : 5}，失 2。敌人攻击后每留 1 格挡回 1（上限回 ${u ? 14 : 11}）`
          : `格挡${u ? 12 : 8}。敌攻击后剩余格挡每2换【诅咒】1，满6溢出转格挡`,
  yinbingguo:(u)=>G.hero === 'ganshiren'
      ? `召 ${u ? 3 : 2} 只阴兵：回合末伤 ${u ? 5 : 4}，每只死亡时【尸气】1，续 3`
      : G.hero === 'wuseng'
        ? `召 ${u ? 3 : 2} 只阴兵：回合末伤 ${u ? 5 : 4}，回合开始格挡 ${u ? 4 : 3}，续 3`
        : G.hero === 'yincha'
          ? `召 ${u ? 3 : 2} 只阴兵：回合末伤 ${u ? 5 : 4}，每只攻击时回 2，续 3`
          : `召 ${u ? 3 : 2} 只阴兵：回合末优先打上次【诅咒】的目标，伤 ${u ? 5 : 4}，续 3`,
  leifu:(u)=>G.hero === 'ganshiren'
      ? `伤 ${u ? 7 : 5}。每有召唤 1 个，伤+1；击杀则【尸气】${u ? 3 : 2}`
      : G.hero === 'wuseng'
        ? `伤 ${u ? 6 : 4}。每 ${u ? 2 : 3} 格挡伤+1（上限+6）`
        : G.hero === 'yincha'
          ? `伤${u ? 8 : 4}。【血怒】每层伤+3（上限+6）并耗对应层；击杀得2层`
          : `伤 ${u ? 9 : 6}。目标带【诅咒】则耗 1 层，伤+${u ? 4 : 3}`,
  xiaogui:(u)=>G.hero === 'ganshiren'
      ? `召唤：末伤${u ? 4 : 2}，亡时【尸气】${u ? 3 : 2}，续2`
      : G.hero === 'wuseng'
        ? `召唤：末伤${u ? 3 : 2}，亡时格挡${u ? 7 : 5}，续2`
        : G.hero === 'yincha'
          ? `召唤：失2，末伤${u ? 2 : 1}得1层【血怒】，亡时回${u ? 4 : 2}，续2`
          : `召唤：末伤随机敌${u ? 3 : 2}，带【诅咒】再+${u ? 3 : 2}，续2`,
  wanjian:(u)=>G.hero === 'ganshiren'
      ? `群体伤 ${u ? 14 : 10}。每击杀 1 个，得【尸气】3 并抽 1（费用-${u ? 2 : 1}）`
      : G.hero === 'wuseng'
        ? `群体伤 ${u ? 14 : 9} 并格挡 ${u ? 12 : 10}。每击杀 1 个，加 1 张 0 费此牌`
        : G.hero === 'yincha'
          ? `群体伤 ${u ? 15 : 10}，失 5。每击杀 1 个，回 ${u ? 15 : 10} 并符文 1`
          : `群体伤 ${u ? 18 : 14} 并对全体【诅咒】${u ? 2 : 1}。每击杀 1 个，符文 1`,
  fodu:(u)=>G.hero === 'ganshiren'
      ? (u ? `清状态与负面，本回合免疫负面，得【尸气】2。消耗`
           : `清状态与负面，本回合免疫负面。消耗`)
      : G.hero === 'wuseng'
        ? (u ? `清状态与负面，本回合免疫负面，格挡 5。消耗`
             : `清状态与负面，本回合免疫负面。消耗`)
        : G.hero === 'yincha'
          ? (u ? `清状态与负面，本回合免疫负面，回 5。消耗`
               : `清状态与负面，本回合免疫负面。消耗`)
          : (u ? `清状态与负面，本回合免疫负面，格挡 5。消耗`
               : `清状态与负面，本回合免疫负面。消耗`),
  zhouyin:(u)=>G.hero === 'ganshiren'
      ? `立即得【尸气】${u ? 5 : 3}`
      : G.hero === 'wuseng'
        ? `本回合下张攻击牌获 100%【吸血】。消耗`
        : G.hero === 'yincha'
          ? `【诅咒】${u ? 3 : 2}`
          : `【诅咒】${u ? 3 : 2}。目标已有【诅咒】则再+1`,
  tianlei:(u)=>G.hero === 'ganshiren'
      ? `伤 ${u ? 28 : 20}。每 2【尸气】费用-1（最低 0），打出耗减免×2 尸气`
      : G.hero === 'wuseng'
        ? `伤 ${u ? 20 : 15}，并格挡等于伤害`
        : G.hero === 'yincha'
          ? `伤 ${u ? 21 : 16}，失 5。本场每失 1 生命伤+${u ? 2 : 1}（上限+${u ? 26 : 20}）`
          : `伤${u ? 32 : 22}。目标每2层【诅咒】费-1（最低0），结算失减免×2层`,
  zhouyu:(u)=>G.hero === 'ganshiren'
      ? `引爆全部【尸气】：每层转 ${u ? 6 : 5} 伤随机分给敌人。消耗`
      : G.hero === 'wuseng'
        ? `全部格挡转为等量伤，每 1 点随机打一个敌人。消耗`
        : G.hero === 'yincha'
          ? `【诅咒】${u ? 6 : 4}随机施加给敌人，每施加1层回2`
          : `对全体【诅咒】1。敌人每 1 层【诅咒】此牌费用-1（最低 ${u ? 0 : 1}）`,
  shixue:(u)=>G.hero === 'ganshiren'
      ? `伤 ${u ? 7 : 5}。每 1【尸气】伤+1（上限+${u ? 7 : 6}）`
      : G.hero === 'wuseng'
        ? `伤 ${u ? 6 : 4}。每 ${u ? 2 : 3} 格挡伤+1（上限+5）`
        : G.hero === 'yincha'
          ? `伤 5。本场每失 ${u ? 3 : 4} 生命伤+1（上限+${u ? 20 : 15}）`
          : `伤 ${u ? 8 : 6}，回伤害 50%。目标【诅咒】≥2 则耗 2 层，比例升到 100%`,
  zhongkui:(u)=>G.hero === 'ganshiren'
      ? `伤 ${u ? 24 : 16} 并【镇魂】，得【尸气】${u ? 6 : 4}。消耗`
      : G.hero === 'wuseng'
        ? `伤 ${u ? 22 : 16} 并【镇魂】。格挡达 12/15/21 时费用-1/-2/-3。消耗`
        : G.hero === 'yincha'
          ? `伤 ${u ? 24 : 16} 并【镇魂】，失 5。生命低于 40% 则伤翻倍。消耗`
          : `伤16【镇魂】，引爆清空目标全部【诅咒】（每层${u ? 4 : 3}伤）。消耗`,
  zhenyaoling:(u)=>G.hero === 'ganshiren'
      ? `伤 ${u ? 15 : 10} 并【镇魂】，得【尸气】${u ? 4 : 3}。消耗`
      : G.hero === 'wuseng'
        ? `伤 ${u ? 15 : 10} 并【镇魂】。格挡≥10 则再+${u ? 11 : 8}。消耗`
        : G.hero === 'yincha'
          ? `伤 ${u ? 16 : 10} 并【镇魂】，失 3。每层【血怒】伤+${u ? 3 : 2}（上限+${u ? 18 : 12}）。消耗`
          : `伤 ${u ? 15 : 10} 并【镇魂】。目标【诅咒】≥4 则耗 4 层，镇魂续 2。消耗`,
  ranhun:(u)=>G.hero === 'ganshiren'
      ? `失 ${u ? 4 : 6}，抽 2。本回合每打出 1 张【鬼怪牌】回 ${u ? 4 : 2}，符文 1`
      : G.hero === 'wuseng'
        ? `失 ${u ? 4 : 6}，抽 3。本回合每打出 1 张防御牌回 ${u ? 3 : 2}`
        : G.hero === 'yincha'
          ? `失 6，抽 3。本回合每打出 1 张技能牌回 ${u ? 4 : 2}`
          : `失 ${u ? 4 : 6}，抽 3。本回合每打出 1 张攻击牌回 ${u ? 3 : 2}`,
  kaitianyan:(u)=>G.hero === 'ganshiren'
      ? `本回合攻击牌伤+${u ? 5 : 3}（多段每段+${u ? 2 : 1}）。每有召唤 1 个再+1`
      : G.hero === 'wuseng'
        ? `本回合攻击牌伤+${u ? 4 : 2}（多段每段+${u ? 2 : 1}）。每${u ? 2 : 3}格挡再+1（上限+5）`
        : G.hero === 'yincha'
          ? `本回合攻击牌伤+${u ? 5 : 3}（多段每段+${u ? 2 : 1}）。血怒每层+1（上限+${u ? 10 : 8}）`
          : `本回合攻击牌伤+${u ? 6 : 4}（多段每段+${u ? 3 : 2}）`,
  shihun:(u)=>G.hero === 'ganshiren'
      ? `耗 ${u ? 2 : 4}【尸气】，伤 ${u ? 18 : 14}。本回合召唤过则费用-1`
      : G.hero === 'wuseng'
        ? `引爆目标全部【诅咒】：每层伤 ${u ? 3 : 2} 并格挡 ${u ? 2 : 1}`
        : G.hero === 'yincha'
          ? `伤 ${u ? 16 : 10}。每层【血怒】伤+${u ? 3 : 2}（上限+${u ? 18 : 12}），打出耗对应层`
          : `引爆目标全部【诅咒】，每层伤 ${u ? 6 : 5}`,
  xueji:(u)=>G.hero === 'ganshiren'
      ? `失3。本回合每召唤1个下回合多抽1（上限3张${u ? '，0符文' : ''}）`
      : G.hero === 'wuseng'
        ? `失3。本回合每得5格挡下回合多抽1（上限+4${u ? '，0符文' : ''}）`
        : G.hero === 'yincha'
          ? `本回合每失4生命下回合多抽1（上限+4），立刻失4${u ? '（0符文）' : ''}`
          : `失3。本回合每【诅咒】1层下回合多抽1（上限+4${u ? '，0符文' : ''}）`,
  baigui:(u)=>G.hero === 'ganshiren'
      ? `群体伤 ${u ? 6 : 4}。每有召唤 1 个，伤+${u ? 3 : 2}`
      : G.hero === 'wuseng'
        ? `群体伤 ${u ? 6 : 5}。每 ${u ? 1 : 2} 格挡伤+1（上限+${u ? 11 : 8}）`
        : G.hero === 'yincha'
          ? `群体伤 ${u ? 7 : 5}，失 2。每有召唤 1 个，伤+${u ? 3 : 2}`
          : `群体伤 8。每层【诅咒】使该敌多受 +${u ? 2 : 1} 并引爆其全部【诅咒】`,
  tiebushan:(u)=>G.hero === 'ganshiren'
      ? `伤 = 当前格挡。每 2【尸气】再+${u ? 2 : 1}${u ? '（0 费）' : ''}`
      : G.hero === 'wuseng'
        ? `伤 = 当前格挡，不消耗格挡`
        : G.hero === 'yincha'
          ? `伤 = 当前格挡，失 2${u ? '（0 费）' : ''}`
          : `伤 = 当前格挡。目标每 1 层【诅咒】再+${u ? 2 : 1} 并引爆其全部【诅咒】`,
  fuling:(u)=>G.hero === 'ganshiren'
      ? `立即触发全部召唤单位。消耗`
      : G.hero === 'wuseng'
        ? `立即触发全部召唤单位，每触发1个格挡3${u ? '（1符文）' : ''}`
        : G.hero === 'yincha'
          ? `立即触发全部召唤单位，每触发1个回${u ? 4 : 2}`
          : `立即触发全部召唤单位，每触发1个对随机敌【诅咒】1${u ? '（1符文）' : ''}`,
  huofu:(u)=>G.hero === 'ganshiren'
      ? `伤 ${u ? 7 : 5}。弃 1 张手牌，弃到【鬼怪牌】则【尸气】${u ? 3 : 2}`
      : G.hero === 'wuseng'
        ? `伤 ${u ? 7 : 5}。每 ${u ? 2 : 3} 格挡伤+1（上限+6），随机弃 1 张`
        : G.hero === 'yincha'
          ? `伤 ${u ? 10 : 6}，失 2`
          : `伤 ${u ? 10 : 6}，【诅咒】1，随机弃 1 张`,
  taomufu:(u)=>G.hero === 'ganshiren'
      ? `伤 ${u ? 7 : 5}。对鬼怪/僵尸再+${u ? 6 : 4}，击杀得【尸气】2`
      : G.hero === 'wuseng'
        ? `伤 ${u ? 6 : 4}。对鬼怪/僵尸再+${u ? 6 : 4}，本回合得过格挡再+2`
        : G.hero === 'yincha'
          ? `伤 ${u ? 7 : 4}。对鬼怪/僵尸再+${u ? 6 : 4}，目标血低于 50% 再+2`
          : `伤 ${u ? 7 : 5}。对鬼怪/僵尸再+${u ? 6 : 4}，【诅咒】1`,
  fenfu:(u)=>G.hero === 'ganshiren'
      ? `弃任意张：每弃 1 张得【尸气】1 与格挡 ${u ? 3 : 2}`
      : G.hero === 'wuseng'
        ? `弃任意张：每弃 1 张格挡 ${u ? 5 : 4}`
        : G.hero === 'yincha'
          ? `弃任意张：每弃 1 张回 ${u ? 4 : 3}`
          : `弃任意张：每弃 1 张对随机敌【诅咒】1 并格挡 ${u ? 3 : 2}`,
  yiwu:(u)=>G.hero === 'ganshiren'
      ? `选 1 张手牌与抽牌堆交换，换出【鬼怪牌】则得【尸气】2`
      : G.hero === 'wuseng'
        ? `选 1 张手牌与抽牌堆交换，换出防御牌则格挡 4`
        : G.hero === 'yincha'
          ? `选 1 张手牌与抽牌堆交换，换出技能牌则回 5`
          : `选 1 张手牌与抽牌堆交换，换出攻击牌则多抽 1`,
  shouyi:(u)=>G.hero === 'ganshiren'
      ? `保留 ${u ? 2 : 1} 张手牌。每保留 1 张【鬼怪牌】得【尸气】1`
      : G.hero === 'wuseng'
        ? `保留 ${u ? 2 : 1} 张手牌。每保留 1 张防御牌格挡 ${u ? 4 : 3}`
        : G.hero === 'yincha'
          ? `保留 ${u ? 2 : 1} 张手牌，下回合回其费用之和的生命`
          : `保留 ${u ? 2 : 1} 张手牌。保留的每张【诅咒牌】下回合费用-1`,
  tongpi:(u)=>G.hero === 'ganshiren'
      ? `格挡 ${u ? 12 : 8}，反伤 ${u ? 5 : 4}。每有召唤 1 个再反 1`
      : G.hero === 'wuseng'
        ? `格挡 ${u ? 15 : 10}，反伤 ${u ? 8 : 6}`
        : G.hero === 'yincha'
          ? `格挡 ${u ? 13 : 9}。本回合每受 1 击回 ${u ? 4 : 3}`
          : `格挡 ${u ? 14 : 9}。本回合每受 1 击对攻击者【诅咒】1`,
  jianfu:(u)=>G.hero === 'ganshiren'
      ? `伤 ${u ? 16 : 12}。耗 3【尸气】，伤翻倍`
      : G.hero === 'wuseng'
        ? `伤 ${u ? 12 : 8}。耗全部格挡，每 2 点伤+1（无上限）`
        : G.hero === 'yincha'
          ? `伤 12。本回合每失 1 生命伤+${u ? 2 : 1}`
          : `伤 ${u ? 17 : 12}。目标【诅咒】≥3 则耗 3 层，伤翻倍`,
  yinshen:(u)=>G.hero === 'ganshiren'
      ? `格挡 ${u ? 6 : 3}，抽 1。抽到【鬼怪牌】则得【尸气】${u ? 2 : 1}`
      : G.hero === 'wuseng'
        ? `格挡 ${u ? 6 : 4}，抽 1。本回合未失血则下回合多抽 1`
        : G.hero === 'yincha'
          ? `格挡 ${u ? 7 : 3}，抽 1。本回合失过血则改为抽 2`
          : `格挡 ${u ? 5 : 3}，抽 1。抽到【诅咒牌】则再格挡 ${u ? 4 : 3}`,
  xisui:(u)=>G.hero === 'ganshiren'
      ? `接下来 ${u ? 3 : 3} 回合，回合开始【尸气】${u ? 2 : 1} 与符文 1`
      : G.hero === 'wuseng'
        ? `接下来 ${u ? 4 : 3} 回合，回合开始格挡 2 与符文 1`
        : G.hero === 'yincha'
          ? `接下来 ${u ? 4 : 3} 回合，回合开始失 2 并符文 1`
          : `接下来 ${u ? 4 : 3} 回合，回合开始对随机敌【诅咒】1 与符文 1`,
  jingji:(u)=>G.hero === 'ganshiren'
      ? `格挡 ${u ? 6 : 3}。本回合每受 1 击反伤 ${u ? 6 : 4}`
      : G.hero === 'wuseng'
        ? `格挡 ${u ? 7 : 4}。本回合每受 1 击反伤 ${u ? 4 : 3}`
        : G.hero === 'yincha'
          ? `格挡 ${u ? 6 : 4}。本回合每受 1 击回 ${u ? 3 : 2}`
          : `格挡 ${u ? 6 : 3}。本回合每受 1 击对攻击者【诅咒】${u ? 2 : 1}`,
  jingang:(u)=>G.hero === 'ganshiren'
      ? `格挡 ${u ? 7 : 4}，得【尸气】${u ? 2 : 1}`
      : G.hero === 'wuseng'
        ? `格挡 ${u ? 9 : 6}`
        : G.hero === 'yincha'
          ? `格挡 ${u ? 9 : 6}，失 ${u ? 3 : 2}`
          : `格挡 ${u ? 7 : 5}。本回合每【诅咒】1 层再+${u ? 2 : 1} 格挡（上限+6）`,
  qungui:(u)=>G.hero === 'yincha'
      ? `本回合每失2，召唤伤+${u ? 2 : 1}；立刻失2` : '',
  xueqi:(u)=>G.hero === 'yincha'
      ? `清空【血怒】，回其层数×2生命${u ? '（0符文）' : ''}` : '',
  fanzhen:(u)=>G.hero === 'ganshiren'
      ? `反伤 ${u ? 4 : 3}。本回合每受 1 击得【尸气】${u ? 2 : 1}`
      : G.hero === 'wuseng'
        ? `本回合每受 1 击，对攻击者伤 ${u ? 5 : 4}`
        : G.hero === 'yincha'
          ? `本回合每受 1 击得 ${u ? 2 : 1} 层【血怒】并对攻击者伤 ${u ? 5 : 4}`
          : `本回合每受 1 击反伤 ${u ? 4 : 3} 并对攻击者【诅咒】${u ? 2 : 1}`,
  dianzhoufu:(u)=>`对【诅咒】最高的敌人 +${u ? 2 : 1} 层；满 6 层则抽 ${u ? 2 : 1} 张`,
  leiqianfu:(u)=>u
      ? `全体按其【诅咒】层数逐段雷击（6 层=21 伤），并清空诅咒`
      : `全体按其【诅咒】层数各打 2 点（6 层=12 伤），并清空诅咒`,
  wuleifayin:(u)=>`至多 5 张变为 0 费${u?'升级':''}雷符；回合末自动击向血量最少者`,
  ganzhiling:(u)=>u
      ? `耗2【尸气】召1升级纸人（末伤4）；【尸气】≥4再耗4→末伤7`
      : `耗2【尸气】召1纸人（末伤2）；【尸气】≥4再耗4→末伤5`,
  wanshichaozong:(u)=>u
      ? `耗至多4【尸气】，每1点召1升级纸人（末伤4）`
      : `耗至多3【尸气】，每1点召1纸人（末伤2）`,
  huajiaweidu:(u)=>`耗 10 格挡，全体+1 层【腐毒】(上限 ${u?5:4})`,
  yinxueren:(u)=>`失3血，伤${u?8:4}。【血怒】每层伤+3（上限+6）并耗层；击杀得2层`,
};
CARDS.forEach(c=>{
  if(c.id==='duanren_leifu') c.ts=SHORT_TEXT.leifu;
  else if(SHORT_TEXT[c.id]) c.ts=SHORT_TEXT[c.id];
});

const RCOLOR={white:'r-white',blue:'r-blue',purple:'r-purple',gold:'r-gold'};
const RNAME={white:'白',blue:'蓝',purple:'紫',gold:'金'};
const TNAME={attack:'攻击',defense:'防御',skill:'技能',spirit:'鬼怪',junk:'废牌'};
function cardById(id){ const c=CARDS.find(x=>x.id===id); return {...c, up:false}; }
// 哪张牌提供哪个关键词，卡池过滤用
const GRANTS = { curse:['zhouyin','zhiren','shihunzhou','zhouyu'], summon:['zhiren','xiaogui','wutong','yinbingguo'] };
function deckHasMechanic(mech){ return GRANTS[mech].some(id=>G.deck.some(c=>c.id===id)); }
// 英雄
const HEROES = [
  {id:'tianshi', name:'符箓天师', desc:'精通符咒，用诅咒削弱并连锁击杀敌人。', mech:'咒印道体', passive:'【咒印道体】每回合开始对【诅咒】层数最高的敌人施加 1 层【诅咒】；施加产生的溢出（超过上限 6 层）每层转化为 2 点格挡。',
   brief:'诅咒连锁 · 以咒杀敌', passiveShort:'回合开始给诅咒最高的敌人 +1 诅咒，溢出转格挡',
   deck:[['leifu',3],['jingang',2],['juling',1],['duhunguiji',1],['zhouyin',1],['zhiren',1],['shouyi',1]]},
  {id:'ganshiren', name:'茅山赶尸人', desc:'役使尸骸，靠尸气与召唤物持续输出。', mech:'尸气', passive:'每回合开始时，场上每有 1 个召唤单位，获得 1 点【尸气】。召唤单位死亡时，获得 2 点【尸气】。每消耗 1 点【尸气】，回复 1 点生命。【尸气】可用于加强召唤系卡牌效果。',
   brief:'召唤尸傀 · 尸气续航', passiveShort:'回合开始每个召唤物 +1 尸气，消耗尸气回血',
   deck:[['leifu',2],['jingang',1],['zhouyin',1],['sheshen',1],['fuling',1],['zhiren',1],['shi_wang',1],['shouyi',1],['xiaogui',1],['wutong',1]]},
  {id:'wuseng', name:'苦行武僧', desc:'以守为攻，格挡既是盾也是矛。', mech:'格挡保留', passive:'每回合开始获得 2 点格挡；回合结束未用完的格挡保留最多 3 点。',
   brief:'格挡护体 · 以守为攻', passiveShort:'回合开始 +2 格挡，回合结束保留最多 3 点',
   deck:[['leifu',2],['jingang',2],['jinzhong',1],['tiebushan',1],['xueqi',1],['fanzhen',1],['zhouyu',1],['shouyi',1]]},
  {id:'yincha', name:'血祭阴差', desc:'以血为引，燃烧生命换取爆发。', mech:'血怒 · 以血换力', passive:'【血怒】上限 10 层、整局累积（开新局才清零）。打出扣血牌时每失去 1 点生命，自动 +1 层【血怒】；带“每层 +N（上限 M）”的牌打出时消耗对应【血怒】爆发，生命越低部分牌越强。',
   brief:'自伤蓄怒 · 绝境爆发', passiveShort:'扣血即 +1 血怒（上限 10），消耗血怒爆发',
   deck:[['leifu',3],['jingang',1],['huofu',1],['fenfu',1],['xueqi',1],['shouyi',1],['ranxue',1],['zhiren',1]]},
];
let cardPlayWindow=false;
function loseHp(n){
  const c=n;
  G.hp-=c;
  G.totalHpLost=(G.totalHpLost||0)+c;
  G.hpLostTurn=(G.hpLostTurn||0)+c;
  if(cardPlayWindow && G.hero==='yincha' && c>0){ const _b4=rageLayers(); gainRage(c); const _got=rageLayers()-_b4; if(_got>0){ floatMsg('🩸 血怒 +'+_got); log('以血引怒：失去 '+c+' 点生命，获得 '+_got+' 层【血怒】（现 '+rageLayers()+' 层）'); } }  // 只在出牌窗口内失血才涨血怒

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

  if(G.sheshenCurse && c > 0) {
    for(let i = 0; i < c; i++) { const r=randomAlive(); if(r) applyCurse(r,1); }
  }

  if(G.xuejiArmed) G.xuejiHurt=true;
  if(G.bloodPact){
    gainBlock(c*G.bloodPact);
    log(`血契：以 ${c} 点生命换取 ${c*G.bloodPact} 点格挡`);
  }
  if(G.hp<=0){ G.hp=0; loseGame(); }
  else checkFengduLing();
}

function checkFengduLing(){
  if(!G || G.hero!=='yincha') return;
  if(!hasRelic('fengduling') || G.fengduUsed) return;
  if(G.hp>9) return;  // 绝对血量，不是百分比
  G.fengduUsed=true;
  gainRage(relicMaxXuenu());
  G.damageDoubleTurn=1;
  floatMsg('酆都令 · 血怒满、伤害翻倍');
  log('酆都令：生命首次降至 9 点及以下，立即充满【血怒】，本回合对敌伤害翻倍');
}
// 伤害会浮动的牌：卡面只写基础值，徽章显示实时预估
const DYNAMIC_DMG = ['tiebushan','shihun','qungui','taomufu','shixue','baigui','zhouyu'];
const WUSENG_BLOCK_DMG = ['leifu','huofu','jianfu','shixue','baigui','zhenyaoling','zhanyaojian'];
const WUSENG_NO_CURSE_TAG = ['leifu','huofu','jianfu','shixue','baigui','zhenyaoling'];
const YINCHA_DYN_DMG = ['leifu','jianfu','tianlei','shihun','shixue','baigui','zhenyaoling','zhanyaojian','taomufu','zhongkui','yinxueren'];
const YINCHA_NO_CURSE_TAG = ['leifu','huofu','jianfu','tianlei','shihun','shixue','baigui','zhenyaoling','taomufu','zhongkui','yinxueren'];
const TIANSHI_DYN_DMG = ['leifu','jianfu','zhanyaojian','tiebushan','shihun','qungui','taomufu','baigui','zhongkui','zhiren','xiaogui','leiqianfu'];
const COL_B='wuseng', COL_C='yincha', COL_D='tianshi';
const GHOST_IDS = ['zhiren','xiaogui','wutong','yinbingguo','zhongkui','shi_wang','yinbing'];
const CAN_CURSE_IDS = ['huofu','wanjian','taomufu','shihunzhou','sheshen','fenfu','zhouyin','zhouyu','zhiren','dianzhoufu'];
const isGhostCard = c => !!(c && c.type==='spirit' && GHOST_IDS.includes(c.id));
const isCanCurse  = c => !!(c && CAN_CURSE_IDS.includes(c.id));

// 逐张点名的音效表。能走收口点的就别往这堆
const CARD_SFX = {
  leifu:'lei',               huofu:'atk_talisman',      jianfu:'atk_slash',
  duanren_leifu:'lei',
  zhanyaojian:'atk_slash',   tianlei:'tianlei',         wanjian:'wanjian',
  tiebushan:'atk_blunt',     shihun:'atk_slash',        shixue:'thorns',
  taomufu:'atk_talisman',    shihunzhou:'atk_talisman', zhongkui:'atk_blunt',
  qungui:'atk_aoe',          baigui:'atk_aoe',          zhouyu:'atk_multi_each',
  yinbingguo:'atk_aoe',      shi_wang:'atk_aoe',
  kaitianyan:'card_buff',    xueji:'card_buff',         ranxue:'card_buff',
  ranhun:'card_buff',        jingxin:'card_buff',       yixing:'card_buff',
  fuling:'card_buff',        xisui:'card_buff',
  dianzhoufu:'card_curse',   leiqianfu:'lightning',     wuleifayin:'card_buff',
  yinxueren:'slash',         fenshenzhou:'card_buff'
};
function cardSfxFor(c){ return (c && CARD_SFX[c.id]) || null; }

// 精灵图特效表。素材 fx/<key>.png，8 列纵向，帧数按每格 alpha 扫出来的
const FX_SHEETS = {
  baigui:      { c:8, f:37, f0:44, rows:6, i0:6, scale:2.14, ox:0, oy:0.23 },
  block:       { c:8, f:36, f0:37, rows:5, i0:1, scale:2.03, ox:0, oy:0.18 },
  burn:        { c:8, f:38, f0:43, rows:6, scale:2.47, ox:0, oy:0.23 },
  charge:      { c:8, f:37, f0:42, rows:6, scale:1.35, ox:0, oy:0.22 },
  charm:       { c:8, f:35, f0:45, rows:6, i0:4, scale:1.76, ox:0, oy:0.15 },
  curse:       { c:8, f:35, f0:43, rows:6, i0:4, scale:2.47, ox:0, oy:0.23 },
  fodu:        { c:8, f:38, f0:41, rows:6, i0:1, scale:1.75, ox:0, oy:0.17 },
  fudu_hit:    { c:8, f:16, rows:2, i0:0, scale:2.0, ox:0.01, oy:0.06 },
  gouhun:      { c:8, f:36, rows:6, i0:0, scale:1.83, ox:0.22 },
  purple_rain: { c:8, f:48, rows:6, i0:0, scale:1.01 },
  guling_suck: { c:8, f:48, rows:6, i0:0, scale:2.0, op:0.6 },
  heal:        { c:8, f:34, f0:43, rows:6, i0:3, scale:2.9, ox:0, oy:0.23 },
  huo:         { c:8, f:18, f0:21, rows:4, scale:1.75, ox:0, oy:0.18 },
  hurt:        { c:8, f:16, f0:17, rows:4, scale:2.15, ox:0, oy:0.23 },
  jian:        { c:8, f:18, f0:21, rows:4, i0:1, scale:1.00, ox:0, oy:0.23 },
  jiangshi:    { c:8, f:34, f0:40, rows:6, i0:5, scale:1.98, ox:0, oy:0.27 },
  jinzhong:    { c:8, f:41, f0:43, rows:6, i0:1, scale:2.3, ox:0, oy:0.2 },
  lei:         { c:8, f:11, f0:19, rows:5, scale:1.35 },
  lightning:   { c:8, f:32, rows:4, ch:1.5, i0:0, scale:1.5, fps:30 },
  damage_reflect: { c:8, f:24, rows:4, ch:1.5, i0:0, scale:1.2, fps:30 },
  lifesteal:   { c:8, f:34, f0:37, rows:5, i0:1, scale:1.43, ox:0.15, oy:0.17 },
  multi_slash: { c:8, f:8, rows:6, i0:0, scale:1.09 },
  relic_proc:  { c:8, f:48, rows:6, i0:0, scale:2.5 },
  shiqi:       { c:8, f:40, f0:46, rows:7, i0:5, scale:2.47, ox:0, oy:0.23 },
  shiqi_flame: { c:8, f:8, rows:1, i0:0, scale:1 },
  shiwang:     { c:8, f:46, f0:51, rows:7, i0:4, scale:1.98, ox:0, oy:0.28 },
  thorns:      { c:8, f:19, f0:24, rows:5, i0:4, scale:2.4, ox:0, oy:0.18 },
  thorns_light: { c:8, f:48, rows:6, i0:0, scale:2.0 },
  tianlei:     { c:8, f:14, f0:21, rows:5, scale:1.3 },
  wangyou:     { c:8, f:42, f0:46, rows:6, i0:1, scale:2.82, ox:0, oy:0.23 },
  wanjian:     { c:8, f:45, f0:46, rows:6, i0:0, scale:1.04 },
  weak:        { c:8, f:38, f0:44, rows:6, i0:5, scale:2.54, ox:0, oy:0.23 },
  xiaogui:     { c:8, f:35, f0:42, rows:6, i0:5, scale:2.51, ox:0, oy:0.23 },
  xuenu:       { c:8, f:32, f0:41, rows:6, i0:4, scale:2.47, ox:0, oy:0.23 },
  xuenu_flame: { c:8, f:8, rows:1, i0:0, scale:1 },
  yehuo:       { c:8, f:45, f0:47, rows:6, scale:2.47, ox:0, oy:0.23 },
  yinbing:     { c:8, f:44, f0:51, rows:7, i0:4, scale:1.00, ox:0, oy:0.27 },
  zhenyaoling: { c:8, f:41, f0:43, rows:6, i0:1, scale:1.7, ox:0, oy:0.09 },
  zhiren:      { c:8, f:34, f0:42, rows:6, i0:6, scale:2.51, ox:0, oy:0.23 },
  zhongkui:    { c:8, f:31, f0:38, rows:6, i0:6, scale:1.4 },
  b1_jiangwang_attack_claw_cast:   { c:8, f:48, rows:6, i0:0, scale:2.5, fps:30 },
  b1_jiangwang_attack_claw_hit:    { c:8, f:32, rows:4, i0:0, scale:2.0, fps:30 },
  b1_jiangwang_drain_feed_cast:    { c:8, f:32, rows:4, i0:0, scale:2.0, fps:30 },
  b1_jiangwang_drain_feed_hit:     { c:8, f:32, rows:4, i0:0, scale:2.0, fps:30 },
  b1_jiangwang_summon_minion_self: { c:8, f:32, rows:4, i0:0, scale:2.0, fps:30 },
  b2_hanba_attack_flame_claw_cast: { c:8, f:48, rows:6, i0:0, scale:2.0, fps:30 },
  b2_hanba_attack_flame_claw_hit:  { c:8, f:32, rows:4, i0:0, scale:2.0, fps:30 },
  b2_hanba_burn_tick_hit:          { c:8, f:32, rows:4, i0:0, scale:2.0, fps:30 },
  b3_xueshi_attack_claw_cast:      { c:8, f:48, rows:6, i0:0, scale:2.0, fps:30 },
  b3_xueshi_attack_claw_hit:       { c:8, f:32, rows:4, i0:0, scale:2.0, fps:30 },
  b3_xueshi_heavy_smash_cast:      { c:8, f:48, rows:6, i0:0, scale:2.0, fps:30 },
  b3_xueshi_heavy_smash_hit:       { c:8, f:32, rows:4, i0:0, scale:2.0, fps:30 },
  b3_xueshi_lifesteal_cast:        { c:8, f:32, rows:4, i0:0, scale:2.4, fps:30 },
  b3_xueshi_lifesteal_hit:         { c:8, f:32, rows:4, i0:0, scale:2.0, fps:30 },
  b4_xiebian_attack_staff_cast:    { c:8, f:48, rows:6, i0:0, scale:2.0, fps:30 },
  b4_xiebian_attack_staff_hit:     { c:8, f:32, rows:4, i0:0, scale:2.0, fps:30 },
  b4_xiebian_soul_hook_cast:       { c:8, f:32, rows:4, i0:0, scale:2.0, fps:30 },
  b4_xiebian_soul_hook_hit:        { c:8, f:32, rows:4, i0:0, scale:2.0, fps:30 },
  b4_xiebian_split_self:           { c:8, f:32, rows:4, i0:0, scale:2.0, fps:30 },
  b5_judge_attack_gavel_cast:      { c:8, f:48, rows:6, i0:0, scale:2.0, fps:30 },
  b5_judge_attack_gavel_hit:       { c:8, f:32, rows:4, i0:0, scale:2.0, fps:30 },
  b5_judge_record_hit:             { c:8, f:32, rows:4, i0:0, scale:2.0, fps:30 },
  b5_judge_settle_cast:            { c:8, f:32, rows:4, i0:0, scale:2.0, fps:30 },
  b5_judge_settle_hit:             { c:8, f:32, rows:4, i0:0, scale:2.0, fps:30 },
  b6_mengpo_attack_ladle_cast:     { c:8, f:48, rows:6, i0:0, scale:2.0, fps:30 },
  b6_mengpo_attack_ladle_hit:      { c:8, f:32, rows:4, i0:0, scale:2.0, fps:30 },
  b6_mengpo_forget_hit:            { c:8, f:32, rows:4, i0:0, scale:2.0, fps:30 },
  b6_mengpo_heal_self:             { c:8, f:32, rows:4, i0:0, scale:2.0, fps:30 },
  b7_yewang_attack_blade_cast:     { c:8, f:48, rows:6, i0:0, scale:2.0, fps:30 },
  b7_yewang_attack_blade_hit:      { c:8, f:32, rows:4, i0:0, scale:2.0, fps:30 },
  b7_yewang_pressure_hit:          { c:8, f:32, rows:4, i0:0, scale:2.0, fps:30 },
  b8_xiuluo_attack_slash_cast:     { c:8, f:48, rows:6, i0:0, scale:2.0, fps:30 },
  b8_xiuluo_attack_slash_hit:      { c:8, f:32, rows:4, i0:0, scale:2.0, fps:30 },
  b8_xiuluo_backlash_self:         { c:8, f:32, rows:4, i0:0, scale:2.0, fps:30 },
  b8_xiuluo_karma_fire_self:       { c:8, f:32, rows:4, i0:0, scale:2.0, fps:30 },
  b9_yanluo_affix_self:            { c:8, f:32, rows:4, i0:0, scale:2.0, fps:30 },
  b9_yanluo_attack_smash_cast:     { c:8, f:48, rows:6, i0:0, scale:2.0, fps:30 },
  b9_yanluo_attack_smash_hit:      { c:8, f:32, rows:4, i0:0, scale:2.0, fps:30 },
  b9_yanluo_revive_self:           { c:8, f:32, rows:4, i0:0, scale:2.0, fps:30 },
  b9_yanluo_summon_yinchai_self:   { c:8, f:32, rows:4, i0:0, scale:2.0, fps:30 }
};

// 卡牌 → 特效
const CARD_FX = {
  leifu:{n:'lei',a:'enemy'},          huofu:{n:'huo',a:'enemy'},
  duanren_leifu:{n:'lei',a:'enemy'},
  jianfu:{n:'jian',a:'enemy'},        zhanyaojian:{n:'jian',a:'enemy'},
  tianlei:{n:'tianlei',a:'enemy'},
  wanjian:{n:'wanjian',a:'enemies'},  baigui:{n:'baigui',a:'field'},
  zhouyu:{n:'purple_rain',a:'enemies',stg:120},
  jingang:{n:'block',a:'player'},     yinshen:{n:'block',a:'player'},
  tongpi:{n:'block',a:'player'},      xiejiashengyuan:{n:'block',a:'player'},
  jinguang:{n:'jinzhong',a:'player'}, jinzhong:{n:'jinzhong',a:'player'},
  jingji:{n:'thorns',a:'player'},     fanzhen:{n:'thorns',a:'player'},
  fodu:{n:'fodu',a:'player'},
  zhongkui:{n:'zhongkui',a:'enemy'},  zhenyaoling:{n:'zhenyaoling',a:'enemy'},
  huapi:{n:'charm',a:'enemy'},
  zhiren:{n:'zhiren',a:'handcard'},     xiaogui:{n:'xiaogui',a:'handcard'},
  yinbingguo:{n:'yinbing',a:'handcard'},shi_wang:{n:'shiwang',a:'handcard'},
  yinbing:{n:'yinbing',a:'handcard'},
  leiqianfu:{n:'lightning',a:'field'},
  wuleifayin:{n:'relic_proc',a:'player'},
  ganzhiling:{n:'zhiren',a:'handcard'},
  wanshichaozong:{n:'zhiren',a:'handcard'},
  luohanfuhu:{n:'jian',a:'enemy'},
  huajiaweidu:{n:'curse',a:'field'},
  yinxueren:{n:'jian',a:'enemy'}
};

// 遗物音效：铃/幡、符笔剑、镜录道心 三类
const RELIC_SFX = {
  zhaohunfan:'relic_bell',   shehunling:'relic_bell',
  zhushabi:'relic_fu',       jifengfu:'relic_fu',        hushenfu:'relic_fu',
  taomujian:'relic_fu',      tongqianjian:'relic_fu',
  yinyangjing:'relic_mirror',daoxin:'relic_mirror',      baiguilu:'relic_mirror',
  tongling:'relic_bell',     guling:'relic_bell',        ranxueling:'relic_bell',
  duanren:'relic_fu',        zhenmoyin:'relic_fu',       leifaxinjue:'relic_fu',
  taishangzhou:'relic_fu',   luohanquan:'relic_fu',      jingangjing:'relic_fu',
  xuemodao:'relic_fu',
  yinyangyu:'relic_mirror',  shiyu:'relic_mirror',       yinhundeng:'relic_mirror',
  budongmingwang:'relic_mirror', xueyu:'relic_mirror',
  zhushayan:'relic_fu',
  yinsidie:'relic_mirror',
  jingangchu:'relic_fu',
  damoying:'relic_mirror',
  fengduling:'relic_bell'
};
function relicSfxFor(r){ return (r && RELIC_SFX[r.id]) || 'relic'; }
// 尸气
function gainShiqi(n){ if(!n || n<=0) return;
  const __before=(G.尸气||0);
  G.尸气 = Math.min(relicMaxShiqi(), __before+n);
  if(G.尸气>__before){ sfxOnce('card_shiji', 120); playFx('shiqi', 'player'); } }
function hasShiqi(n){ return (G.尸气||0) >= n; }
function spendShiqi(n){ if(!hasShiqi(n)) return false; G.尸气 -= n;
  if(G.hero==='ganshiren' && n>0) heal(n);  // 消耗 1 点尸气回 1 血
  return true; }
// 血怒。不自动烧，只在「每层+N」类效果里按实际用到的层数消耗
function gainRage(n){ if(!n || n<=0) return;
  const __b=(G.xuenu||0);
  G.xuenu = Math.min(relicMaxXuenu(), __b+n);
  const _got = G.xuenu-__b;
  if(G.xuenu>__b){ sfx('card_xuenu'); playFx('xuenu', 'player'); }
  if(hasRelic('ranxueling') && _got>0){
    G.rageAccum=(G.rageAccum||0)+_got;  // 累计口径，不随消耗回退
    while(G.rageAccum>=20){ G.rageAccum-=20; G.energy+=1; floatMsg('燃血令 · 符文 +1'); log(`燃血令：累积血怒满 20，获得 1 点符文（现 ${G.energy}）`); ranxuelingFx(); }
  } }
function rageLayers(){ return G.xuenu||0; }
function rageSpend(per, cap){ const layers=Math.floor(cap/per); const use=Math.min(layers, rageLayers()); if(use>0){ G.xuenu -= use; } return use; }
// 召唤
function addSummon(o){ G.summonsMadeTurn=(G.summonsMadeTurn||0)+1;
  o.dur0 = o.dur;  // 记下创建时的回合数，之后 dur-- 就读不出来了
  sfx('card_summon');
  summonMistFx(o.type, nextMistSeq(o.type));
  G.summons.push(o); return o; }
function wutongTick(s, noDecay){
  const b=s.v||3;
  if(G.hero==='yincha'){ heal(b); log(`五通神：恢复 ${b} 点生命`); }
  else {
    gainBlock(b);
    if(G.hero==='ganshiren'){ log(`五通神：获得 ${b} 点格挡`); }
    else if(G.hero==='tianshi'){ const wt=randomAlive(); if(wt) applyCurse(wt,1); log(`五通神：获得 ${b} 点格挡并对随机敌人施加 1 层【诅咒】`); }
    else log(`五通神：获得 ${b} 点格挡`);
  }
  if(!s.indefinite && !noDecay) s.dur--;
}
function isSummon(type){ return G.summons.some(s=>s.type===type && s.dur>0); }
function summonTurnBlock(s){
  if(G.hero!=='wuseng') return 0;
  if(s.type==='zhiren') return s.up?3:2;
  if(s.type==='yinbing') return s.up?4:3;
  if(s.type==='wutong') return 6;  // 五通神走回合开始给格挡，固定 6
  return 0;
}
function preBlockNextTurn(){
  if(G.hero!=='wuseng') return 0;
  let n=0;
  for(const s of G.summons){ if(s.dur>0) n+=summonTurnBlock(s); }
  return n;
}
function preSummonDamage(){
  if(!G || !G.summons) return 0;
  const sw=G.summons.some(x=>x.type==='shi_wang' && x.dur>0);
  const bleed=G.bleedSummons ? Math.floor((G.hpLostTurn||0)/2)*(G.bleedSummonsBonus||1) : 0;
  let n=0;
  for(const s of G.summons){
    if((s.dur||0)<=0) continue;
    if(s.type==='shi_wang'){ n += (s.v||0)*aliveEnemies().length; continue; }
    if(s.type==='zhiren'||s.type==='xiaogui'||s.type==='yinbing'){
      n += (s.v||0) + ((s.type!=='shi_wang' && sw)?1:0) + bleed;
    }
  }
  return n;
}
function preSummonHeal(){
  if(!G || !G.summons) return 0;
  let n=0;
  const hasEnemy=aliveEnemies().length>0;
  for(const s of G.summons){
    const dur=s.dur||0;
    if(dur<=0 && !s.indefinite) continue;
    if(G.hero==='yincha' && hasEnemy && (s.type==='zhiren'||s.type==='yinbing')) n += (s.healV||2);
    if(G.hero==='yincha' && s.type==='wutong') n += (s.v||3);
    const willDie = !s.indefinite && dur<=1;
    if(willDie && hasRelic('guling')) n += (s.dur0!=null ? s.dur0 : dur);
    if(willDie && G.hero==='yincha' && s.type==='xiaogui') n += (s.up?4:2);
    if(willDie && G.hero==='ganshiren' && mileClaimed('ganshiren_t2')) n += 2;
  }
  if(duhunActive()){ const h=Math.floor(preSummonDamage()*(G.duhun.ratio||0)); if(h>0) n+=h; }
  return n;
}
function preShiqiNextTurn(){
  if(G.hero!=='ganshiren') return 0;
  let n=0;
  for(const s of G.summons){
    if((s.dur||0)<=0) continue;
    const diesThisEnd = (s.type!=='wutong') && s.dur<=1;
    if(diesThisEnd){
      if(s.type==='zhiren') n+=2;
      else if(s.type==='xiaogui') n+=s.up?3:2;
      else if(s.type==='yinbing') n+=1;
    } else n+=1;
  }
  return n;
}
function preXuenuNextTurn(){
  if(G.hero!=='yincha') return 0;
  let n=0;
  for(const s of G.summons){ if(s.type==='xiaogui' && (s.dur||0)>=2) n+=1; }
  return n;
}
function summonTarget(preferCursed){
  const al=aliveEnemies(); if(!al.length) return null;
  if(preferCursed){ const cu=al.filter(e=>(e.curse||0)>0); if(cu.length) return cu[Math.floor(rng()*cu.length)]; }
  return al[Math.floor(rng()*al.length)];
}
// 镇魂。第三参 snd 可以换个专用音效键
function sealEnemy(e, turns, snd){
  if(!e) return false;
  if(isLinghua(e)){ sfx('kw_linghua'); log(e.name+' 灵化免疫了【镇魂】'); return false; }
  sfx(snd||'card_zhenhun');
  e.sealedEver=true; e.seal=true; e.sealTurn=turns||1; floatMsg('镇魂');
  log(e.name+' 被【镇魂】封印'+(e.sealTurn>1?(' '+e.sealTurn+' 回合'):''));
  return true;
}
// 魅惑，charmPct 是剩余伤害比例
function charmEnemy(e, pct){
  if(!e) return false;
  if(isLinghua(e)){ sfx('kw_linghua'); log(e.name+' 灵化免疫了【魅惑】'); return false; }
  sfx('card_charm');
  e.charm=(e.charm||0)+1;
  const np=(pct==null?0.5:pct);
  e.charmPct = (e.charmPct==null?np:Math.min(e.charmPct,np));
  floatMsg('魅惑');
  log(e.name+' 被【魅惑】'+(np<0.5?('（伤害降至 '+Math.round(np*100)+'%）'):''));
  return true;
}
function removeCardEverywhere(c){ [G.hand,G.drawPile,G.discard].forEach(p=>{ const i=p.indexOf(c); if(i>=0) p.splice(i,1); }); }
function returnShiWangCard(){
  const c=G.shiWangCard; if(!c) return;
  removeCardEverywhere(c); G.discard.push(c); G.shiWangCard=null;
  log('【尸王】的召唤物消散，回到弃牌堆');
}


// 遗物
const RELICS = [
  {id:'zhaohunfan', name:'招魂幡', rarity:'white', desc:'每场战斗结束额外恢复 4 点生命'},
  {id:'zhushabi', name:'朱砂笔', rarity:'white', desc:'攻击牌伤害 +3（多段牌每段 +1）'},
  {id:'jifengfu', name:'疾风符', rarity:'purple', desc:'每回合第 1 张技能牌符文 -1（最低 0）'},
  {id:'taomujian', name:'桃木剑', rarity:'blue', desc:'对鬼怪/僵尸类敌人伤害 +25%'},
  {id:'yinyangjing', name:'阴阳镜', rarity:'purple', desc:'每回合多抽 1 张牌'},
  {id:'jubaopen', name:'聚宝盆', rarity:'blue', desc:'战斗获得金币 +50%；商店灵汁打 7 折'},
  {id:'daoxin', name:'道心', rarity:'white', desc:'每场战斗首次受致命伤时，改为保留 1 点生命'},
  {id:'baiguilu', name:'百鬼录', rarity:'gold', desc:'每击败 1 个精英或 Boss，永久 +5 最大生命'},
  {id:'hushenfu', name:'护身符', rarity:'purple', desc:'每回合开始获得 2 点格挡'},
  {id:'tongqianjian', name:'铜钱剑', rarity:'blue', desc:'对「妖」类敌人伤害 +25%'},
  {id:'fanhunxiang', name:'返魂香', rarity:'purple', desc:'战斗胜利后额外恢复 6 点生命'},
  {id:'shehunling', name:'摄魂铃', rarity:'gold', desc:'每打出一张攻击牌，恢复 3 点生命'},

  {id:'tongling',    name:'铜铃',   rarity:'white', desc:'战斗开始时额外抽 2 张牌'},
  {id:'yinyangyu',   name:'阴阳鱼', rarity:'blue',  desc:'受到负面效果时，恢复 2 点生命'},
  {id:'duanren',     name:'断刃',   rarity:'gold',  desc:'牌库中生成一张【断刃雷符】：数值与属性同【雷符】，可受增益与升级'},

  {id:'zhenmoyin',    hero:'tianshi',   name:'镇魔印',     rarity:'gold',   desc:'被动强化：【咒印道体】溢出诅咒转化的格挡 +1（每层 3 点），且每回合施加的诅咒 +1 层'},
  {id:'leifaxinjue',  hero:'tianshi',   name:'雷法心诀',   rarity:'purple', desc:'敌人每次诅咒达到 6 层，受到 4 点雷击'},
  {id:'taishangzhou', hero:'tianshi',   name:'太上咒箓',   rarity:'gold',   desc:'敌人身上的诅咒达到 6 层时，其受到的伤害 +25%'},
  {id:'zhushayan',    hero:'tianshi',   name:'朱砂砚',     rarity:'purple', mile:'tianshi_t4', desc:'敌人每次【诅咒】达到 6 层上限时，抽 1 张牌'},

  {id:'shiyu',       hero:'ganshiren', name:'尸玉',       rarity:'blue',   desc:'尸气上限 +3；战斗开始时获得 3 点尸气'},
  {id:'guling',      hero:'ganshiren', name:'骨铃',       rarity:'purple', desc:'每个召唤单位死亡时，按其持续过的回合数恢复等量生命'},
  {id:'yinhundeng',  hero:'ganshiren', name:'引魂灯',     rarity:'gold',   desc:'牌库中生成一张 0 费【阴兵】（召唤 1 只阴兵，可受增益与升级）'},
  {id:'yinsidie',    hero:'ganshiren', name:'阴司牒',     rarity:'gold',   mile:'ganshiren_t5', desc:'强化【尸王】：尸王每次攻击后，额外获得 5 点格挡'},

  {id:'luohanquan',    hero:'wuseng',   name:'罗汉拳套',   rarity:'blue',   desc:'永久自带 2 点反伤（荆棘）'},
  {id:'jingangjing',   hero:'wuseng',   name:'金刚经残页', rarity:'purple', desc:'回合结束保留的格挡上限由 3 提升到 6'},
  {id:'budongmingwang',hero:'wuseng',   name:'不动明王像', rarity:'gold',   desc:'战斗开始时自动触发【卸甲生元】'},
  {id:'jingangchu',  hero:'wuseng',   name:'金刚杵',     rarity:'purple', mile:'wuseng_t4', desc:'本场战斗内每累计获得 50 点格挡，手牌多一张临时【铁布衫】（不进牌库循环）'},
  {id:'damoying',    hero:'wuseng',   name:'达摩影',     rarity:'gold',   mile:'wuseng_t5', desc:'格挡被敌人击碎时爆破，造成「击碎前格挡总量」的伤害，随机分配给全体敌人'},

  {id:'xueyu',       hero:'yincha',    name:'血玉',       rarity:'blue',   desc:'血怒上限 +3'},
  {id:'ranxueling',  hero:'yincha',    name:'燃血令',     rarity:'purple', desc:'每累积 20 点血怒，立刻获得 1 符文'},
  {id:'xuemodao',    hero:'yincha',    name:'血魔刀',     rarity:'gold',   desc:'生命低于 30% 时，攻击牌伤害 +25%'},
  {id:'fengduling',  hero:'yincha',    name:'酆都令',     rarity:'gold',   mile:'yincha_t5', desc:'每场战斗一次：生命首次降至 9 点（绝对）及以下时，立即充满【血怒】，本回合对敌伤害翻倍'},
];
const STAT_ICONS = { gold:'ui/stat_gold.png', hp:'ui/stat_hp.png' };
// 还没到手的图。图交付后记得删条目，不然打包闸会假绿
const ART_PENDING = [
];
function hasRelic(id){ return G && G.relics.includes(id); }
function relById(id){ return RELICS.find(r=>r.id===id); }
// 拿遗物只有这一个入口，三处获取点都走它
function grantRelic(r, srcEl, done){
  if(!r){ if(done) done(); return; }
  if(!hasRelic(r.id)) G.relics.push(r.id);
  if(typeof SCENE !== 'undefined' && SCENE === 'battle'){ try{ playFx('relic_proc', 'player'); }catch(e){} }
  if(r.id==='duanren'){ G.deck.push(cardById('duanren_leifu')); log('断刃：牌库中生成一张【断刃雷符】'); }
  if(r.id==='yinhundeng'){ G.deck.push(cardById('yinbing')); log('引魂灯：牌库中生成一张【阴兵】'); }
  flyToPouch(srcEl || dropSourceEl(), relicIcon(r), done);
}

// 遗物加成一律现算，不落存档（存档只存 relics）
function relicMaxShiqi(){ return 12 + (hasRelic('shiyu') ? 3 : 0); }
function relicMaxXuenu(){ return 10 + (hasRelic('xueyu') ? 3 : 0) + (mileClaimed('yincha_t2') ? 3 : 0); }
function relicBlockKeep(){ return hasRelic('jingangjing') ? 6 : 3; }
function relicThorns(){ return hasRelic('luohanquan') ? 2 : 0; }
function mileThorns(){ return (G && G.hero==='wuseng' && mileClaimed('wuseng_t2')) ? 2 : 0; }
function relicCurseOverflowBlock(){ return 2 + (hasRelic('zhenmoyin') ? 1 : 0); }
function relicPassiveCursePerTurn(){ return 1 + (hasRelic('zhenmoyin') ? 1 : 0); }
function relicUsedCls(id){ return (id==='daoxin' && G && G.daoxinUsed) ? ' relic-used' : ''; }
function relicPassiveExtra(heroId){
  const rows=[];
  if(heroId==='tianshi'){
    if(hasRelic('zhenmoyin'))   rows.push(`诅咒溢出转格挡 ${relicCurseOverflowBlock()} 点/层，每回合施加诅咒 ${relicPassiveCursePerTurn()} 层`);
    if(hasRelic('leifaxinjue')) rows.push('敌人诅咒满 6 层时额外受 4 点雷击');
    if(hasRelic('taishangzhou'))rows.push('敌人诅咒满 6 层时其受到的伤害 +25%');
  } else if(heroId==='ganshiren'){
    if(hasRelic('shiyu'))       rows.push(`尸气上限 ${relicMaxShiqi()} 点`);
    if(hasRelic('guling'))      rows.push('召唤物消散时按其持续回合数回血');
    if(hasRelic('yinhundeng'))  rows.push('牌库中生成一张 0 费【阴兵】');
  } else if(heroId==='wuseng'){
    if(mileClaimed('wuseng_t2')) rows.push(`自带反伤 2（铁壁）`);
    if(hasRelic('jingangjing')) rows.push(`回合结束保留格挡 ${relicBlockKeep()} 点`);
    if(hasRelic('luohanquan'))  rows.push(`自带反伤 ${relicThorns()}`);
    if(hasRelic('budongmingwang'))rows.push('开局触发【卸甲生元】');
  } else if(heroId==='yincha'){
    if(mileClaimed('yincha_t2')) rows.push(`血怒上限 +3（血怒·涌）`);
    if(hasRelic('xueyu'))       rows.push(`血怒上限 ${relicMaxXuenu()} 层`);
    if(hasRelic('ranxueling'))  rows.push('每累积 20 血怒得 1 符文');
    if(hasRelic('xuemodao'))    rows.push('生命低于 30% 时攻击牌伤害 +25%');
    if(hasRelic('fengduling'))  rows.push('生命首次降至 9 点时充满血怒、本回合伤害翻倍');
  }
  return rows.length ? `<div class="tt-line" style="color:#8ad0ff">遗物加成 · ${rows.join('；')}</div>` : '';
}

// 灵汁
const POTIONS = [
  {id:'huanyanglu', name:'还阳露', ic:'💧', desc:'恢复 10 点生命', eff:()=>heal(10)},
  {id:'huangquanjiu', name:'黄泉酒', ic:'🍶', desc:'获得 2 点符文', eff:()=>{ G.energy+=2; floatMsg('符文 +2'); }},
  {id:'zhenhunshui', name:'镇魂水', ic:'🛡️', desc:'获得 10 点格挡', eff:()=>gainBlock(10)},
  {id:'mengpotang', name:'孟婆汤', ic:'🃏', desc:'抽 2 张牌', eff:()=>drawCards(2)},
  {id:'jingangjiu', name:'金刚酒', ic:'👊', desc:'本回合攻击牌 +4 伤害（多段牌每段 +2）', eff:()=>{ G.turnAtkBuff=(G.turnAtkBuff||0)+4; floatMsg('攻击 +4'); }},
  {id:'qingxinlu', name:'清心露', ic:'✨', desc:'清除自身全部负面状态与废牌，本回合免疫负面效果', eff:()=>{ clearJunk(); clearPlayerDebuffs(); G.debuffImmune=1; floatMsg('本回合免疫负面效果'); }},
  {id:'fugusan', name:'腐骨散', ic:'☠️', desc:'对全体敌人施加 2 层【腐毒】（每回合开始按层数累进掉血）', eff:()=>applyPoisonAll(2)},
  {id:'tongyoucha', name:'通幽茶', ic:'🍵', desc:'抽 3 张牌', eff:()=>drawCards(3)},
];
// 腐毒：三角数结算，第 n 层多打 n 点
function applyPoisonAll(n, cap){
  const list=aliveEnemies();
  if(!list.length) return;
  let gained=0;
  list.forEach(e=>{ const cur=e.poison||0; if(cap && cur>=cap) return;
    e.poison = cap ? Math.min(cur+n, cap) : cur+n; gained += e.poison-cur; });
  if(cap && gained===0){ floatMsg('【腐毒】已达上限'); log('化甲为毒：敌人【腐毒】已达本牌上限'); return; }
  sfx('card_curse');
  floatMsg('腐毒 +'+n);
  log(`全体敌人获得 ${n} 层【腐毒】`);
}


// 键是物品 id、值是文件名，不一定同形，别拿 id 硬拼路径
const LINGSHI_FILE = {
  zhushabi:     'lingshi/lingshi_zhushabi.png',
  hushenfu:     'lingshi/lingshi_hushenfu.png',
  fanhunxiang:  'lingshi/lingshi_fanhunxiang.png',
  huangquanjiu: 'lingshi/lingshi_huangquanjiu.png',
  zhenhunshui:  'lingshi/lingshi_zhenhunshui.png',
  huanyanglu:   'lingshi/lingshi_huanyanglu.png',
  mengpotang:   'lingshi/lingshi_mengpotang.png',
  jingangjiu:   'lingshi/lingshi_jingangjiu.png',
  qingxinlu:    'lingshi/lingshi_qingxinlu.png',
  fugusan:      'lingshi/lingshi_fugusan.png',
  tongyoucha:   'lingshi/lingshi_tongyoucha.png'
};
function lingshiSrc(id){ return (typeof LINGSHI_FILE !== 'undefined' && LINGSHI_FILE[id]) || ''; }

function randomPotion(){
  let pool=POTIONS.filter(p=>mileOn('potion',p.id));  // 只从已解锁的灵汁里抽
  if(!pool.length) pool=POTIONS;
  const p=pool[Math.floor(rng()*pool.length)];
  return {...p};
}
function potionTooltipHTML(){
  if(!G.potions.length) return '';
  const m={}; G.potions.forEach(p=>{ m[p.name]=(m[p.name]||0)+1; });
  return `<div class="tt-title">🧪 灵汁</div>`+Object.entries(m).map(([name,n])=>{ const p=G.potions.find(x=>x.name===name); return `<div class="tt-line">${name} ×${n}：${p?p.desc:''}</div>`; }).join('');
}
function showPotionSelect(){
  if(!G.potions.length){ floatMsg('没有灵汁'); return; }
  const html=G.potions.map((p,i)=>`<div class="relic r-blue" data-tip="potion:${i}" onclick="usePotion(${i})">${potionIcon(p)}<div class="cname">${p.name}</div><div class="cdesc">点击使用 · 悬停查看效果</div></div>`).join('');
  showOverlay(`<h2>使 用 灵 汁</h2><p>点击一瓶灵汁使用（战斗消耗，本局保留直到使用）</p><div class="reward-cards">${html}</div><button class="btn ghost" onclick="hideOverlay()">返回</button>`);
}
function usePotion(i){
  if(G.enemyPhase) return;  // 敌人行动演出期间不能喝
  const p=G.potions[i]; if(!p) return;
  p.eff(); G.potions.splice(i,1); sfx('heal');
  log(`使用灵汁【${p.name}】`); hideOverlay(); render();
}
function usePotionByName(name){
  const i=G.potions.findIndex(p=>p.name===name);
  if(i<0) return;
  const p=G.potions[i];
  p.eff(); G.potions.splice(i,1); sfx('heal');
  log(`使用灵汁【${p.name}】`); render();
}

// 废牌
function junkCard(){ return {id:'yuanqi', name:'怨气', type:'junk', rarity:'white', cost:0, t:()=>'废牌 · 打出时失去 3 点生命（若不打出，回合结束自动打出）', eff:()=>{ directDamage(3, '怨气噬心：失去 3 点生命'); }}; }
function addJunkToHand(n){ let __added=0;
  for(let i=0;i<n;i++){
    if(G.hand.filter(c=>c.type==='junk').length>=3){ log('怨气已达上限（最多 3 张），不再塞入废牌'); break; }
    G.hand.push(junkCard()); __added++;
  }
  if(__added){ sfx('kw_junk'); log('怨气缠身：一张【怨气】废牌塞入你的手牌'); } }
function clearJunk(){
  const n=G.hand.filter(c=>c.type==='junk').length;
  if(n>0){ G.hand=G.hand.filter(c=>c.type!=='junk'); floatMsg('怨气驱散'); log(`驱散怨气缠身：${n} 张【怨气】废牌消失`); }
}
function clearPlayerDebuffs(){
  // 【忘忧】（孟婆汤）是专属机制，不在下面这串里
  const had = G.weak || G.gouhun || G.burn || G.karmaFire || G.pendingDiscard;
  G.weak=0; G.gouhun=0; G.burn=0; G.karmaFire=0; G.pendingDiscard=0;
  if(had) log('负面状态已清除');
  return had;
}

// tooltip
function tooltipEl(){
  let el=document.getElementById('tooltip');
  if(!el){ el=document.createElement('div'); el.id='tooltip'; document.body.appendChild(el); }
  return el;
}
function showTip(html, ev, cardMode){
  const el=tooltipEl(); el.innerHTML=html; el.classList.add('show');
  el.classList.toggle('tt-card', !!cardMode);
  const pad=14, w=el.offsetWidth||250, h=el.offsetHeight||90;
  let x=ev.clientX+pad, y=ev.clientY+pad;
  if(x+w>window.innerWidth-8) x=ev.clientX-w-pad;
  if(y+h>window.innerHeight-8) y=ev.clientY-h-pad;
  el.style.left=Math.max(4,x)+'px'; el.style.top=Math.max(4,y)+'px';
}
function hideTip(){ const el=document.getElementById('tooltip'); if(el) el.classList.remove('show'); }
function resolveTip(spec){
  const i=spec.indexOf(':'); const type=spec.slice(0,i), key=spec.slice(i+1);
  if(type==='enemy'){
    const def=ENEMIES[key]; if(!def) return '';
    const live=(G&&G.enemies)?G.enemies.find(x=>x.key===key):null;
    const icon=KIND_ICON[def.kind]?iconTag('ui/kind_'+def.kind+'.png', KIND_ICON[def.kind]):'';
    const badge=def.boss?'👹 Boss':def.elite?'☠ 精英':'';
    const hp=live?`${live.hp}/${live.maxHp}`:`${def.hp}`;
    const intent=live?intentText(live):'';
    const mech=BOSS_MECH[key]||'';
    return `<div class="tt-title">${icon}${def.name} ${badge}</div><div class="tt-line">生命 ${hp}</div>${intent?`<div class="tt-line">意图：${intent}</div>`:''}${mech?`<div class="tt-line" style="color:var(--gold)">机制：${mech}</div>`:''}<div class="tt-story">${STORIES[key]||''}</div>`;
  }
  if(type==='relic'){ const r=relById(key); return r?`<div class="tt-title">${r.name} <span style="font-size:11px;color:var(--dim)">${RNAME[r.rarity]}</span></div><div class="tt-line">${r.desc}</div>`:''; }
  if(type==='hero'){ const h=HEROES.find(x=>x.id===key); return h?`<div class="tt-title">${h.name}</div><div class="tt-line">${h.desc}</div><div class="tt-line" style="color:var(--gold)">被动 · ${h.passive}</div>${relicPassiveExtra(key)}`:''; }
  if(type==='kw'){ const kw=KEYWORDS.find(x=>x[0]===key); return kw?`<div class="tt-title">【${key}】</div><div class="tt-line">${kw[1]}</div>`:''; }
  if(type==='affix'){ const a=AFFIXES.find(x=>x.id===key); return a?`<div class="tt-title">词缀 · ${a.name}</div><div class="tt-line">${a.desc}</div>`:''; }
  if(type==='potionbag') return potionTooltipHTML();
  if(type==='potion'){ const p=G.potions[parseInt(key,10)]; return p?`<div class="tt-title">🧪 ${p.name}</div><div class="tt-line">${p.desc}</div>`:''; }
  if(type==='potionname'){ const p=POTIONS.find(x=>x.name===key); return p?`<div class="tt-title">🧪 ${p.name}</div><div class="tt-line">${p.desc}</div><div class="tt-line">点击直接使用</div>`:''; }
  return '';
}
function wrapKw(text){ return text.replace(/【([^】]+)】/g, (m,k)=>`<span class="kw" data-tip="kw:${k}">${m}</span>`); }
document.addEventListener('mouseover', function(e){
  const t=e.target && e.target.closest ? e.target.closest('[data-tip]') : null;
  if(t){ const html=resolveTip(t.getAttribute('data-tip')); if(html) showTip(html, e); }
});
document.addEventListener('mouseout', function(e){
  const t=e.target && e.target.closest ? e.target.closest('[data-tip]') : null;
  if(t && !(e.relatedTarget && t.contains(e.relatedTarget))) hideTip();
});
function onDocClick(e){
  try{
    const bt=e.target && e.target.closest ? e.target.closest('button,.btn,[onclick],.map-node,[role="button"]') : null;
    if(bt) sfxOnce('ui_click', 40);
  }catch(err){}
  if(!(e.target && e.target.closest && e.target.closest('[data-tip]'))) hideTip();
}
document.addEventListener('click', onDocClick);
document.addEventListener('keydown', function(e){ if(e.key==='Escape') hideTip(); });

// 触屏长按。手机没 hover，只能自己搭一套
const TIP_HOLD_MS=420, TIP_MOVE_PX=10;
let TIP_TIMER=null, TIP_START=null, TIP_SWALLOW=0;
function tipCancelHold(){ if(TIP_TIMER){ clearTimeout(TIP_TIMER); TIP_TIMER=null; } TIP_START=null; }
function tipCardOf(target){
  const cardEl=target && target.closest ? target.closest('.card') : null;
  const holder=cardEl && cardEl.querySelector ? cardEl.querySelector('[data-cardid]') : null;
  if(!holder) return null;
  return { id:holder.getAttribute('data-cardid'), up:holder.getAttribute('data-cardup')==='1' };
}
function resolveCardTip(id, up){
  const base=CARDS.find(x=>x.id===id); if(!base) return '';
  const cc=up?Object.assign({}, base, {up:true}):base;
  const title=`<div class="tt-title">${cc.name}${cc.up?' <span style="color:var(--green)">↑</span>':''} <span style="font-size:11px;color:var(--dim)">${TNAME[cc.type]} · ${RNAME[cc.rarity]}</span></div>`;
  const cost=`<div class="tt-line">符文费用：${cardCost(cc)}</div>`;
  const body=`<div class="tt-body">${wrapKw(String(cc.t(cc.up)))}</div>`;
  const prev=(!cc.up && canUpgrade(base))?`<div class="tt-line" style="color:var(--red2)">升级后 → ${wrapKw(String(base.t(true)))}</div>`:'';
  const one=isOneUse(cc)?`<div class="tt-line" style="color:var(--red2)">消耗 · 每场战斗限用一次</div>`:'';
  return title+cost+body+prev+one;
}
function tipSpecAt(target){
  if(!target || !target.closest) return null;
  if(target.closest('#hand')) return null;
  const c=tipCardOf(target);
  if(c){ const html=resolveCardTip(c.id, c.up); if(html) return { html, card:true }; }
  const t=target.closest('[data-tip]');
  if(t){ const html=resolveTip(t.getAttribute('data-tip')); if(html) return { html, card:false }; }
  const s=target.closest('.summon[title]');
  if(s){ const txt=s.getAttribute('title'); if(txt) return { html:`<div class="tt-line">${txt}</div>`, card:false }; }
  return null;
}
document.addEventListener('pointerdown', function(e){
  if(e.pointerType!=='touch') return;
  const spec=tipSpecAt(e.target); if(!spec) return;
  tipCancelHold();
  TIP_START={ x:e.clientX, y:e.clientY, spec };
  TIP_TIMER=setTimeout(function(){
    TIP_TIMER=null; const st=TIP_START; if(!st) return;
    showTip(st.spec.html, { clientX:st.x, clientY:st.y-44 }, st.spec.card);  // 抬高 44px，别让浮层压在指尖底下
    TIP_SWALLOW=1;
  }, TIP_HOLD_MS);
}, true);
document.addEventListener('pointermove', function(e){
  if(e.pointerType!=='touch' || !TIP_START) return;
  if(Math.abs(e.clientX-TIP_START.x)>TIP_MOVE_PX || Math.abs(e.clientY-TIP_START.y)>TIP_MOVE_PX) tipCancelHold();
});
document.addEventListener('pointerup', function(e){ if(e.pointerType!=='touch') return; tipCancelHold();
  if(TIP_SWALLOW>0) setTimeout(function(){ TIP_SWALLOW=0; }, 350); });
document.addEventListener('pointercancel', function(e){ if(e.pointerType!=='touch') return; tipCancelHold();
  if(TIP_SWALLOW>0) setTimeout(function(){ TIP_SWALLOW=0; }, 350); });
document.addEventListener('click', function(e){
  if(TIP_SWALLOW>0){ TIP_SWALLOW=0; e.stopPropagation(); e.preventDefault(); }
}, true);
function _costPick(v){ if(v==null) return null; if(typeof v!=='object') return v; return v[G.hero]!=null?v[G.hero]:(v.default!==undefined?v.default:null); }
function cardCost(c){ const u=_costPick(c.costU); return c.up && u!=null ? u : _costPick(c.cost); }
// 费用修正都集中在这
function effectiveCost(c){
  let cost=cardCost(c);
  if(c.tempCostCut) cost=Math.max(0, cost-c.tempCostCut);
  if(c.costCutTurn && c.costCutTurn===G.turn) cost=Math.max(0, cost-1);
  if(c.type==='skill' && hasRelic('jifengfu') && (G.skillsPlayedThisTurn||0)===0){
    cost=Math.max(0,cost-1);
  }
  if(c.id==='tianlei'){
    if(G.hero==='ganshiren'){ cost=Math.max(0, cost - Math.floor((G.尸气||0)/2)); }
    else if(G.hero==='tianshi'){ const mx=aliveEnemies().reduce((s,e)=>Math.max(s,e.curse||0),0); cost=Math.max(0, cost - Math.floor(mx/2)); }
  }
  if(c.id==='shihun' && G.hero==='ganshiren' && (G.summonsMadeTurn||0)>0){ cost=Math.max(0,cost-1); }
  if(c.id==='zhouyu' && G.hero==='tianshi'){
    const fl=c.up?0:1;
    cost=Math.max(fl, cost - aliveEnemies().reduce((s,e)=>s+(e.curse||0), 0));
  }
  if(c.id==='zhongkui' && G.hero==='wuseng'){
    const blk=G.block||0;
    const red = blk>=21 ? 3 : blk>=15 ? 2 : blk>=12 ? 1 : 0;
    cost=Math.max(0,cost-red);
  }
  return cost;
}

// 敌人
const ENEMIES = {
  youhun:{name:'游魂', hp:24, kind:'ghost', intents:[{type:'attack',v:6},{type:'charge',v:4}]},
  zhizharen:{name:'纸扎人', hp:28, kind:'yao', intents:[{type:'attack',v:8},{type:'block',v:6}]},
  huyao:{name:'狐妖', hp:26, kind:'yao', intents:[{type:'attack',v:7},{type:'weak'}]},
  jiangshi:{name:'僵尸', hp:34, kind:'jiangshi', intents:[{type:'attack',v:9},{type:'heal',v:5}]},
  shanxiao:{name:'山魈', hp:30, kind:'yao', aggressive:true, intents:[{type:'attack',v:6},{type:'multi',n:3,v:3}]},
  shuigui:{name:'水鬼', hp:28, kind:'ghost', aggressive:true, intents:[{type:'attack',v:6},{type:'discard'}]},
  mengpo:{name:'孟婆鬼', hp:32, kind:'ghost', aggressive:true, intents:[{type:'attack',v:7},{type:'discard'}]},
  baiwuchang:{name:'白无常', hp:50, kind:'ghost', elite:true, aggressive:true,
    sayIn:'一见生财——名字，我记下了。', sayHit:'索子…竟扯不动。',
    sayLow:'你这命，硬得很。', sayOut:'记下了…便勾得去…',
    intents:[{type:'attack',v:12},{type:'gouhun'},{type:'attack',v:12}]},
  heiwuchang:{name:'黑无常', hp:52, kind:'ghost', elite:true, aggressive:true,
    sayIn:'天下太平？我不信。', sayHit:'唔——好重的煞气。',
    sayLow:'太平…怕要到头了。', sayOut:'太平…倒也好。',
    intents:[{type:'attack',v:12},{type:'strength',v:2}]},
  huapigui:{name:'画皮鬼', hp:46, kind:'yao', elite:true, aggressive:true,
    sayIn:'这张脸，你可喜欢？', sayHit:'别打脸！别打脸…',
    sayLow:'皮…要掉了…', sayOut:'别揭…别揭我…',
    intents:[{type:'attackBlock',v:8,block:6},{type:'attack',v:12}]},
  yecha:{name:'夜叉', hp:55, kind:'yao', elite:true, aggressive:true,
    sayIn:'血食，来。', sayHit:'咯——有点嚼头。',
    sayLow:'饿……更饿了……', sayOut:'饿……',
    intents:[{type:'charge',v:8},{type:'attack',v:14}]},
  jiangwang:{name:'僵王', hp:120, kind:'jiangshi', boss:true,
    sayIn:'吾以尸身，镇此乱葬岗。', sayHit:'尸身…不痛。',
    sayLow:'小僵尸…何在。', sayOut:'葬…吾…',
    intents:[{type:'multi',n:2,v:6},{type:'summon',n:2},{type:'multi',n:2,v:7},{type:'strength',v:3}]},
  xiebian:{name:'谢必安', hp:180, kind:'ghost', boss:true, aggressive:true, split:true,
    sayIn:'在下谢必安，特来请君同行。', sayHit:'这一下…有几分意思。',
    sayLow:'那么——便分个明白。', sayOut:'同行…不远了…',
    intents:[{type:'multi',n:2,v:8},{type:'gouhun'},{type:'multi',n:2,v:9}]},
  bian:{name:'必安', hp:90, kind:'ghost', boss:true, aggressive:true,
    sayIn:'我二人，同去同归。', sayHit:'分身…也知痛。',
    sayLow:'兄长…我先走一步。', sayOut:'兄长…等我…',
    intents:[{type:'multi',n:2,v:4},{type:'gouhun'},{type:'multi',n:2,v:4}]},
  yewang:{name:'夜王', hp:220, kind:'yao', boss:true, aggressive:true,
    sayIn:'长夜由我执掌。', sayHit:'夜…也会疼么。',
    sayLow:'天黑…怎么还不黑。', sayOut:'天…要亮了么…',
    intents:[{type:'multi',n:2,v:9},{type:'strength',v:3,weak:true}]},
  hanba:{name:'旱魃', hp:110, kind:'jiangshi', boss:true, aggressive:true,
    sayIn:'赤地千里，皆我所至。', sayHit:'焦土…也烫手。',
    sayLow:'我的火…要灭了。', sayOut:'雨…要来了么…',
    intents:[{type:'multi',n:2,v:6},{type:'burn',v:1},{type:'multi',n:2,v:8},{type:'strength',v:2}]},
  xueshi:{name:'血尸', hp:110, kind:'jiangshi', boss:true, aggressive:true, lifesteal:0.8,
    sayIn:'你的血，很香。', sayHit:'血…溅出来了。',
    sayLow:'不够…还不够…', sayOut:'不…够…',
    intents:[{type:'multi',n:2,v:7},{type:'charge',v:8},{type:'multi',n:2,v:10},{type:'strength',v:2}]},
  panguanwang:{name:'判官王', hp:170, kind:'ghost', boss:true, aggressive:true,
    sayIn:'生死簿上，你已记名。', sayHit:'簿子…被风掀了。',
    sayLow:'朱笔…还握得住。', sayOut:'朱笔…断了…',
    intents:[{type:'multi',n:2,v:6},{type:'jiming'},{type:'multi',n:2,v:7},{type:'qingsuan'}]},
  mengpowang:{name:'孟婆', hp:155, kind:'ghost', boss:true, aggressive:true,
    sayIn:'喝一碗，前尘俱忘。', sayHit:'这碗…你不肯喝。',
    sayLow:'汤…凉了。', sayOut:'……你也忘了？',
    intents:[{type:'multi',n:2,v:7},{type:'wangyou'},{type:'multi',n:2,v:8},{type:'strength',v:2,sealHeal:true}]},
  xiuluowang:{name:'修罗王', hp:210, kind:'yao', boss:true, aggressive:true,
    sayIn:'业火焚身，方为修罗。', sayHit:'业火…认得你。',
    sayLow:'火…往心里去了。', sayOut:'火，熄了…',
    intents:[{type:'multi',n:2,v:8},{type:'yehuo'},{type:'multi',n:2,v:9},{type:'strength',v:2}]},
  yanluotianzi:{name:'阎罗天子', hp:230, kind:'ghost', boss:true, aggressive:true, phase:true, bossAffix:true,
    sayIn:'阎罗殿前，跪。', sayHit:'殿前…无此先例。',
    sayLow:'这一笔，须重写。', sayOut:'……这一笔，算你赢。',
    intents:[{type:'multi',n:2,v:8},{type:'summon',n:1,unit:'yinchai'},{type:'multi',n:2,v:9},{type:'strength',v:2}], intents2:[{type:'multi',n:2,v:10},{type:'multi',n:2,v:11},{type:'multi',n:2,v:11},{type:'strength',v:3}]},
  yinchai:{name:'阴差', hp:14, kind:'ghost', summon:true, intents:[{type:'attack',v:8}]},
  xiaojianshi:{name:'小僵尸', hp:6, kind:'jiangshi', summon:true, intents:[{type:'attack',v:6}]},
  niutou:{name:'牛头', hp:42, kind:'ghost', intents:[{type:'attack',v:10},{type:'block',v:10}]},
  mamian:{name:'马面', hp:38, kind:'ghost', intents:[{type:'multi',n:2,v:7},{type:'attack',v:10}]},
  wangchuan:{name:'忘川鬼', hp:36, kind:'ghost', aggressive:true, intents:[{type:'attack',v:9},{type:'gouhun'}]},
  panguan:{name:'判官', hp:46, kind:'ghost', aggressive:true, intents:[{type:'attack',v:11},{type:'weak'}]},
  juhunshi:{name:'拘魂使', hp:62, kind:'ghost', elite:true, aggressive:true,
    sayIn:'拘你三魂，随我走一趟。', sayHit:'枷锁…被弹开了。',
    sayLow:'三魂…只拘得一魂。', sayOut:'差事…没办成…',
    intents:[{type:'attack',v:14},{type:'gouhun'},{type:'attack',v:14}]},
  niumamian:{name:'牛头马面', hp:70, kind:'ghost', elite:true, aggressive:true,
    sayIn:'牛头马面，锁你归案！', sayHit:'锁链在颤。',
    sayLow:'二身…去了一身。', sayOut:'锁链…竟断在你手里…',
    intents:[{type:'attack',v:12},{type:'strength',v:3},{type:'multi',n:2,v:9}]},
  xiuluo:{name:'修罗', hp:48, kind:'yao', aggressive:true, intents:[{type:'attack',v:13},{type:'strength',v:2}]},
  luosha:{name:'罗刹', hp:52, kind:'yao', intents:[{type:'attack',v:12},{type:'attack',v:12},{type:'heal',v:8}]},
  mingwei:{name:'幽冥守卫', hp:50, kind:'yao', intents:[{type:'block',v:8},{type:'attack',v:11}]},
  yanluo:{name:'阎罗', hp:58, kind:'ghost', aggressive:true, intents:[{type:'attack',v:15},{type:'gouhun'},{type:'attack',v:13}]},
  xiuluojiang:{name:'修罗将', hp:80, kind:'yao', elite:true, aggressive:true,
    sayIn:'修罗道上，无人生还。', sayHit:'好！再来！',
    sayLow:'这才…像场厮杀。', sayOut:'杀得…痛快…',
    intents:[{type:'attack',v:16},{type:'multi',n:3,v:8}]},
};
// 中段台词，只有这两只 Boss 有
const ENEMY_SAY_MID = {
  xiebian:     { when:'split',  text:'一分为二——同去，同归。' },
  yanluotianzi:{ when:'phase2', text:'判你——永不超生。' }
};
let UID=0;
// 词缀
const AFFIXES = [
  {id:'gouhun', name:'勾魂', desc:'攻击时施加勾魂（你下回合少抽 1 张）'},
  {id:'fanzhen', name:'反震', desc:'受击反弹伤害'},
  {id:'zaisheng', name:'再生', desc:'每回合回复生命'},
  {id:'gangti', name:'刚体', desc:'每回合力量 +1'},
  {id:'pingbi', name:'屏壁', desc:'进场自带格挡'},
  {id:'judu', name:'剧毒', desc:'攻击附带额外伤害'},
  {id:'shixue', name:'蚀血', desc:'攻击时回复自身生命'},
  {id:'feipai', name:'怨气缠身', desc:'攻击时往你手牌塞一张【怨气】废牌'},
  {id:'linghua', name:'灵化', desc:'免疫负面效果（镇魂、魅惑等）'}
];
// Boss 机制说明，tooltip 里显示
const BOSS_MECH = {
  jiangwang:'召唤小僵尸，并吸食小僵尸造成伤害的半数回血。',
  hanba:'施加【灼烧】：每层每回合 -2 生命，永久可叠加，可被佛渡/金钟罩清空。',
  xueshi:'攻击吸血 80%，可突破血量上限（回复封顶为上限 150%）；力量成长封顶为 8。',
  xiebian:'血量低于 50% 时，分化为两个「必安」，击败全部才能获胜。',
  bian:'谢必安的一半，联手勾魂索命。',
  panguanwang:'生死簿：记名时记录你的伤害并随机记下一条词缀，清算时打出该词缀并反弹记录伤害的 30%。',
  mengpowang:'忘忧让你接下来两回合各选 1 张手牌「饮下」（弃置）；力量回合按你饮下的牌数量 ×8 回血。',
  yewang:'力量回合对你施加【虚弱】。',
  xiuluowang:'业火附体：你对它伤害 -30%，反噬 1 点生命，它受到的诅咒层数翻倍。',
  yanluotianzi:'开局随机获得一种词缀；血条首次打空进入第二阶段（回血 + 强化）。',
};
const MAX_ENEMY_STRENGTH = 8;  // 力量成长封顶
const LIFESTEAL_HEAL_CAP_RATIO = 1.5;  // 吸血回血封顶 = maxHp×150%，可突破 100%
function addEnemyStrength(e, n){ e.strength = Math.min((e.strength||0) + n, MAX_ENEMY_STRENGTH); }
function makeEnemy(def, key){
  const summon = !!def.summon;
  const hpMul = summon ? 1 : (def.boss ? 1.6 : def.elite ? 1.4 : 1.25);  // 普通+25% / 精英+40% / Boss+60%，召唤物不加
  const atkMul = summon ? 1 : (def.boss ? 1.4 : def.elite ? 1.3 : 1.25);  // 攻击 +25/30/40
  const hp = Math.round(def.hp * hpMul);
  const scaleAtk = it => { const c={...it}; if(c.v && (c.type==='attack'||c.type==='multi'||c.type==='attackBlock')) c.v=Math.round(c.v*atkMul); return c; };
  const intents = def.intents.map(scaleAtk);
  const intents2 = def.intents2 ? def.intents2.map(scaleAtk) : null;
  const e = {key:key, name:def.name, hp, maxHp:hp, block:0, pingbi:0, intents, intentIndex:0, intent:{type:'dormant'}, pendingDamage:0, curse:0, charm:0, charmPct:0.5, charmUsed:false, sealedEver:false, seal:false, strength:0, kind:def.kind, elite:!!def.elite, boss:!!def.boss, aggressive:!!def.aggressive, lifesteal:def.lifesteal||0, phase:!!def.phase, phase2:false, intents2, ledgerActive:false, ledgerDmg:0, ledgerAffix:null, split:!!def.split, splitDone:false, sealedCost:0, poison:0, uid:UID++,
    sayIn:def.sayIn, sayHit:def.sayHit, sayLow:def.sayLow, sayOut:def.sayOut};
  e.affixes = rollAffixes(def);
  if(def.bossAffix && !e.affixes.length){ const a=AFFIXES[Math.floor(rng()*AFFIXES.length)]; e.affixes=[{id:a.id, tier:1}]; }
  if(e.affixes.length){ sfxOnce('enemy_buff_self', 200); const pb=e.affixes.find(a=>a.id==='pingbi'); if(pb){ e.block=8*pb.tier; e.pingbi=8*pb.tier; } }
  return e;
}
function rollAffixes(def){
  if(!G || def.boss) return [];
  let count;
  const act = G.act||1;
  count = act===1 ? (def.elite ? 1 : 0) : act===2 ? (def.elite ? 2 : 1) : (def.elite ? 3 : 2);  // 难度靠叠词缀，不是把数值翻倍
  return shuffle(AFFIXES.slice()).slice(0,count).map(a=>({id:a.id, tier:1}));
}
const MAP_ROWS = 14;  // 层数固定，战斗场次和 calcScore 都依赖它
// 每层宽度 [下限, 上限]
const ROW_SHAPE = [[2,3],[3,3],[3,3],[2,3],[2,2],[2,3],[2,2],[2,3],[2,2],[2,2],[1,1],[1,1],[1,1],[1,1]];
// 每幕特殊节点配额，其余填普通战
const TYPE_QUOTA = { 1:{camp:2, shop:2, elite:1, unknown:5}, 2:{camp:2, shop:2, elite:2, unknown:4}, 3:{camp:2, shop:2, elite:3, unknown:3} };
const ACT1_MINIONS = ['youhun','zhizharen','huyao','jiangshi','shanxiao','shuigui','mengpo'];
const ACT2_SWAP = {youhun:'wangchuan', zhizharen:'niutou', huyao:'mamian', jiangshi:'panguan', shanxiao:'niutou', shuigui:'wangchuan', mengpo:'wangchuan', baiwuchang:'juhunshi', heiwuchang:'juhunshi', huapigui:'niumamian', yecha:'niumamian'};
const ACT3_SWAP = {youhun:'mingwei', zhizharen:'luosha', huyao:'xiuluo', jiangshi:'yanluo', shanxiao:'xiuluo', shuigui:'mingwei', mengpo:'yanluo', baiwuchang:'xiuluojiang', heiwuchang:'yecha', huapigui:'xiuluojiang', yecha:'yecha'};
const ELITES_BY_ACT = { 1:['baiwuchang','heiwuchang','huapigui','yecha'], 2:['juhunshi','niumamian'], 3:['xiuluojiang','yecha'] };
const BOSS_POOL = { 1:['jiangwang','hanba','xueshi'], 2:['xiebian','panguanwang','mengpowang'], 3:['yewang','xiuluowang','yanluotianzi'] };

function mkRng(seed){ let s=(seed>>>0)||1; return function(){ s=(s+0x6D2B79F5)|0; let t=Math.imul(s^(s>>>15), 1|s); t=(t+Math.imul(t^(t>>>7), 61|t))^t; return ((t^(t>>>14))>>>0)/4294967296; }; }
function deriveSeed(seed, k){ let h=((((seed>>>0)||1)^Math.imul((k||1), 0x9E3779B1))>>>0); h=Math.imul(h^(h>>>16), 0x85EBCA6B)>>>0; h=Math.imul(h^(h>>>13), 0xC2B2AE35)>>>0; return ((h^(h>>>16))>>>0)||1; }
function mkShuffle(R){ return function(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(R()*(i+1)); const t=a[i]; a[i]=a[j]; a[j]=t; } return a; }; }

function actMinionPool(act){
  if(act===2) return ACT1_MINIONS.map(function(k){ return ACT2_SWAP[k]||k; });
  if(act===3) return ACT1_MINIONS.map(function(k){ return ACT3_SWAP[k]||k; });
  return ACT1_MINIONS.slice();
}
// 下标 = 层号（0 起），越界按 0.65
const ENEMY3_P3 = [0, 0, 0, 0, 0.55, 0.6, 0.6, 0.65, 0.65, 0.85, 0.85, 0.85, 0.85, 0.85];
function enemy3Chance(r, act){
  if(typeof r!=='number' || r<0 || r>=ENEMY3_P3.length) return 0.65;
  const p=ENEMY3_P3[r];
  if(act===1) return p*0.6;  // 第一幕再压一档
  return p;
}
function pickFightFrom(pool, R, row, act){
  const p3=enemy3Chance(row, act);
  return mkShuffle(R)(pool.slice()).slice(0, R()<p3?3:2);
}

// 分带：把 total 个下标切成 parts 段连续区间
function bandBounds(total, parts){
  parts=Math.max(1, Math.min(parts, total));
  const base=Math.floor(total/parts), extra=total%parts;
  const out=[]; let x=0;
  for(let i=0;i<parts;i++){ const w=base+(i<extra?1:0); out.push([x, x+w-1]); x+=w; }
  return out;
}
// 相邻两层连边。不交叉 / 无死路 / 无孤岛 靠构造保证
function linkRows(upN, loN){
  const nextOf=Array.from({length:loN}, function(){ return []; });
  const prevOf=Array.from({length:upN}, function(){ return []; });
  if(loN<=upN){
    const bands=bandBounds(upN, loN);
    for(let j=0;j<loN;j++) for(let i=bands[j][0]; i<=bands[j][1]; i++){ nextOf[j].push(i); prevOf[i].push(j); }
  } else {
    const bands=bandBounds(loN, upN);
    for(let i=0;i<upN;i++) for(let j=bands[i][0]; j<=bands[i][1]; j++){ prevOf[i].push(j); nextOf[j].push(i); }
  }
  return {nextOf:nextOf, prevOf:prevOf};
}

// 布类型
function assignTypes(act, R, rows, minionPool, elitePool, bossPool, quotaOverride){
  const q = quotaOverride || TYPE_QUOTA[act] || TYPE_QUOTA[1];
  const shuf = mkShuffle(R);
  for(let r=0;r<MAP_ROWS;r++) for(let c=0;c<rows[r].length;c++) rows[r][c]={t:'fight', e:[], next:[], prev:[]};
  const slots=[];
  for(let r=1;r<MAP_ROWS-1;r++){
    if(CORRIDOR_ROWS.indexOf(r)>=0) continue;
    for(let c=0;c<rows[r].length;c++) slots.push([r,c]);
  }
  shuf(slots);
  const usedRow={};
  function pick(kind, quota){
    let n=0;
    for(let pass=0; pass<2 && n<quota; pass++){
      for(let i=0;i<slots.length && n<quota;i++){
        const s=slots[i], node=rows[s[0]][s[1]];
        if(node.t!=='fight') continue;
        if(pass===0 && usedRow[s[0]]) continue;
        node.t=kind; usedRow[s[0]]=1; n++;
      }
    }
    return n;
  }
  pick('camp', q.camp||0);
  pick('shop', q.shop||0);
  pick('unknown', q.unknown||0);
  pick('elite', q.elite||0);
  rows[MAP_ROWS-1][0] = {t:'boss', e:[bossPool[Math.floor(R()*bossPool.length)]], next:[], prev:[]};  // Boss 生成期就定死 key，续档才不会变
  const pickElite=function(){
    const k=[elitePool[Math.floor(R()*elitePool.length)]];
    if(R()<0.5) k.push(minionPool[Math.floor(R()*minionPool.length)]);
    return k;
  };
  for(let r=0;r<MAP_ROWS-1;r++) for(let c=0;c<rows[r].length;c++){
    const node=rows[r][c];
    if(node.t==='elite'){ node.e=pickElite(); continue; }
    if(node.t!=='fight') continue;
    if(r>0 && R()<0.06){ node.t='elite'; node.e=pickElite(); }  // 野生精英，保持稀有
    else node.e=pickFightFrom(minionPool, R, r, act);
  }
  return q;
}

// 落位：每格随机挑一个槽位，再叠点抖动，别排得太齐
const MAP_SLOT_N = 5;
function pickSlots(R, n){
  const all=[]; for(let i=0;i<MAP_SLOT_N;i++) all.push(i);
  for(let i=all.length-1;i>0;i--){ const j=Math.floor(R()*(i+1)); const t=all[i]; all[i]=all[j]; all[j]=t; }
  return all.slice(0, Math.max(0, Math.min(n, MAP_SLOT_N))).sort(function(a,b){ return a-b; });
}
function assignSlots(R, rows){
  for(let r=0;r<rows.length;r++){
    const n=rows[r].length;
    const sl=pickSlots(R, n);
    for(let c=0;c<n;c++){
      const nd=rows[r][c]; if(!nd) continue;
      if(r===rows.length-1){ nd.sx=2; nd.jx=0; nd.jy=0; continue; }
      nd.sx=(typeof sl[c]==='number') ? sl[c] : Math.round(c*(MAP_SLOT_N-1)/Math.max(1,n-1));
      nd.jx=Math.round((R()*2-1)*3);
      nd.jy=Math.round((R()*2-1)*7);
    }
  }
}


// 每条路线至少要有的特殊节点数（下限，不是配额）
const ROUTE_NEED = { camp:2, shop:1, unknown:1, elite:2 };
// 走廊层，不参与基础配额
const CORRIDOR_ROWS = [10, 11, 12];
const CORRIDOR_TIERS = [2, 3, Infinity];

function routesOf(rows){
  const out=[];
  function dfs(r,c,acc){
    acc.push([r,c]);
    if(r===rows.length-1) out.push(acc.slice());
    else { const nx=rows[r][c].next||[]; for(let k=0;k<nx.length;k++) dfs(r+1,nx[k],acc); }
    acc.pop();
  }
  for(let c=0;c<rows[0].length;c++) dfs(0,c,[]);
  return out;
}

function enforceRouteQuota(rows, act, seed, minionPool, elitePool){
  const R=mkRng(deriveSeed(seed, 4242));
  const routes=routesOf(rows);
  const counts=function(rt){
    const o={camp:0,shop:0,unknown:0,elite:0};
    for(let i=0;i<rt.length;i++){ const t=rows[rt[i][0]][rt[i][1]].t; if(o[t]!==undefined) o[t]++; }
    return o;
  };
  const corridorUsed=function(){
    let n=0;
    for(let i=0;i<CORRIDOR_ROWS.length;i++){
      const row=rows[CORRIDOR_ROWS[i]];
      if(row && row[0] && row[0].t!=='fight' && row[0].t!=='boss') n++;
    }
    return n;
  };
  let tier=0, guard=0;
  while(guard++ < 600){
    const defs=[];
    for(let i=0;i<routes.length;i++){
      const c=counts(routes[i]);
      for(const k in ROUTE_NEED){ if(ROUTE_NEED[k]-c[k]>0) defs.push([i,k]); }
    }
    if(!defs.length) return;
    const limit=CORRIDOR_TIERS[Math.min(tier, CORRIDOR_TIERS.length-1)];
    const cu=corridorUsed();
    let best=null;
    for(let qi=0;qi<defs.length;qi++){
      const rt=routes[defs[qi][0]], ty=defs[qi][1];
      for(let p=0;p<rt.length;p++){
        const r=rt[p][0], c=rt[p][1];
        if(r===0 || r===rows.length-1) continue;
        if(rows[r][c].t!=='fight') continue;
        if(CORRIDOR_ROWS.indexOf(r)>=0 && cu>=limit) continue;
        let gain=0;
        for(let q2=0;q2<defs.length;q2++){
          if(defs[q2][1]!==ty) continue;
          const rt2=routes[defs[q2][0]];
          for(let z=0;z<rt2.length;z++){ if(rt2[z][0]===r && rt2[z][1]===c){ gain++; break; } }
        }
        if(!best || gain>best.gain) best={r:r, c:c, gain:gain, ty:ty};
      }
    }
    if(!best){
      if(tier < CORRIDOR_TIERS.length-1){ tier++; continue; }
      return;
    }
    const node=rows[best.r][best.c];
    node.t=best.ty;
    if(best.ty==='elite'){
      const k=[elitePool[Math.floor(R()*elitePool.length)]];
      if(R()<0.5) k.push(minionPool[Math.floor(R()*minionPool.length)]);
      node.e=k;
    } else node.e=[];
  }
}

function diversifyForks(rows, act, seed, minionPool, elitePool){
  const R=mkRng(deriveSeed(seed, 7777));
  const LAST=rows.length-1;
  const fillE=function(node, row){
    if(node.t==='elite'){
      const k=[elitePool[Math.floor(R()*elitePool.length)]];
      if(R()<0.5) k.push(minionPool[Math.floor(R()*minionPool.length)]);
      node.e=k;
    } else if(node.t==='fight') node.e=pickFightFrom(minionPool, R, row, act);
    else node.e=[];
  };
  for(let r=0;r<LAST;r++){
    for(let c=0;c<rows[r].length;c++){
      const nx=rows[r][c].next||[];
      if(nx.length<2) continue;
      const lo=rows[r+1];
      const seen={};
      for(let i=0;i<nx.length;i++){ const nd=lo[nx[i]]; if(nd) (seen[nd.t]=seen[nd.t]||[]).push(nx[i]); }
      for(const ty in seen){
        if(ty==='boss' || seen[ty].length<2) continue;
        for(let k=1;k<seen[ty].length;k++){
          const dc=seen[ty][k], dn=lo[dc];
          if(!dn || dn.t!==ty) continue;
          const cands=[];
          for(let cc=0;cc<lo.length;cc++){
            if(cc===dc) continue;
            const cn=lo[cc];
            if(!cn || cn.t==='boss' || cn.t===ty) continue;
            if(seen[cn.t]) continue;
            cands.push(cc);
          }
          if(!cands.length) break;
          const cc=cands[Math.floor(R()*cands.length)];
          const cn=lo[cc];
          const tmp=dn.t; dn.t=cn.t; cn.t=tmp;
          fillE(dn, r+1);
          fillE(cn, r+1);
          seen[dn.t]=[dc];
        }
      }
    }
  }
}

// 入口：一个种子 → 一整幕树状图
function genAct(act, seed, opts){
  const O=opts||{};
  const R=mkRng(seed);
  const rows=[];
  for(let r=0;r<MAP_ROWS;r++){
    const sh=ROW_SHAPE[r]||[1,1];
    const lo=sh[0], hi=(r===MAP_ROWS-1) ? 1 : Math.max(lo, sh[1]);
    rows.push(new Array(lo+Math.floor(R()*(hi-lo+1))).fill(null));
  }
  const minionPool=O.minions||actMinionPool(act);
  const elitePool=O.elites||ELITES_BY_ACT[act]||ELITES_BY_ACT[1];
  const bossPool=O.bosses||BOSS_POOL[act]||BOSS_POOL[1];
  assignTypes(act, R, rows, minionPool, elitePool, bossPool, O.quota);
  assignSlots(R, rows);
  for(let r=0;r<MAP_ROWS-1;r++){
    const L=linkRows(rows[r+1].length, rows[r].length);
    for(let i=0;i<rows[r].length;i++) rows[r][i].next=L.nextOf[i].slice().sort(function(a,b){ return a-b; });
    for(let j=0;j<rows[r+1].length;j++) rows[r+1][j].prev=L.prevOf[j].slice().sort(function(a,b){ return a-b; });
  }
  rows[MAP_ROWS-1][0].next=[];
  diversifyForks(rows, act, seed, minionPool, elitePool);
  enforceRouteQuota(rows, act, seed, minionPool, elitePool);
  return rows;
}
let ACTS = [genAct(1,101), genAct(2,202), genAct(3,303)];  // 加载即有一张合法地图；ACTS 长度必须恒为 3
const ACT_NAMES = ['第一幕 · 乱葬岗', '第二幕 · 黄泉路', '第三幕 · 幽冥塔'];
let MAP = ACTS[0];
function buildActs(seed){
  const sd=(seed>>>0)||1;
  ACTS=[genAct(1,deriveSeed(sd,1)), genAct(2,deriveSeed(sd,2)), genAct(3,deriveSeed(sd,3))];
  MAP=ACTS[((G&&G.act)||1)-1] || ACTS[0];
  return ACTS;
}

let goldCompensation = 0;  // 开局从 0 起，出金后回 -0.05 防连金

// 动态稀有度：基础概率
const RARITY_BASE_PROBABILITIES = {
  normal: { white: 0.60, blue: 0.37, purple: 0.03, gold: 0.00 },
  elite: { white: 0.40, blue: 0.35, purple: 0.20, gold: 0.05 },
  boss: { white: 0.00, blue: 0.00, purple: 0.40, gold: 0.60 },
  shop: { white: 0.50, blue: 0.35, purple: 0.10, gold: 0.05 },
  starter: { white: 0.60, blue: 0.35, purple: 0.05, gold: 0.00 }
};

function updateGoldCompensation(hasGold) {
  if (hasGold) {
    goldCompensation = -0.05;
  } else {
    goldCompensation = Math.min(goldCompensation + 0.01, 0.30);
  }

  goldCompensation = Math.max(-0.05, Math.min(0.30, goldCompensation));
}

function getAdjustedGoldProbability(tier) {
  const baseGoldProb = RARITY_BASE_PROBABILITIES[tier]?.gold || 0;

  if (tier === 'boss') {
    return baseGoldProb;
  }

  const adjustedProb = baseGoldProb + goldCompensation;

  return Math.max(0, Math.min(adjustedProb, 0.95));
}

function rollCardRarity(tier) {
  const probs = RARITY_BASE_PROBABILITIES[tier];
  if (!probs) {
    return 'white';
  }

  let whiteProb = probs.white;
  let blueProb = probs.blue;
  let purpleProb = probs.purple;
  let goldProb = getAdjustedGoldProbability(tier);

  if (tier !== 'boss' && goldProb > 0) {
    const otherProbTotal = whiteProb + blueProb + purpleProb;
    if (otherProbTotal + goldProb > 1.0) {
      const scaleFactor = (1.0 - goldProb) / otherProbTotal;
      whiteProb *= scaleFactor;
      blueProb *= scaleFactor;
      purpleProb *= scaleFactor;
    }
  }

  const rand = rng();

  if (rand <= whiteProb) {
    return 'white';
  } else if (rand <= whiteProb + blueProb) {
    return 'blue';
  } else if (rand <= whiteProb + blueProb + purpleProb) {
    return 'purple';
  } else {
    return 'gold';
  }
}


// 门禁总开关
let MILE_GATE_ON = true;
// 遗留的内容门禁表，只给 mileOn 判断内容开不开
const MILESTONES = [
  { id:'adv_card',       need:220,  name:'符箓精进', desc:'紫/金进阶卡牌进入奖励池',   advCards:true },
  { id:'potion_new',     need:300,  name:'丹炉重开', desc:'解锁 4 瓶新灵汁',           potions:['jingangjiu','qingxinlu','fugusan','tongyoucha'] },
  { id:'adv_relic',      need:700,  name:'法器通灵', desc:'紫/金遗物进入掉落池',       advRelics:true },
];
function milePointsFor(s){
  const g = s || (typeof G!=='undefined' ? G : null);
  if(!g) return 0;
  return Math.max(0, mileParts(g).reduce(function(a,p){ return a + p.val; }, 0));
}
function mileParts(s){
  const g = s || (typeof G!=='undefined' ? G : null);
  if(!g) return [];
  const act = Math.max(0,(g.act|0)) - 1;
  const parts = [
    { lab:'幕数推进', val: act*200 },
    { lab:'爬塔层数', val: Math.max(0,(g.mapRow|0))*22 },
    { lab:'击败敌人', val: Math.max(0,(g.totalKills|0))*7 },
  ];
  if(g.finalBoss) parts.push({ lab:'通关加成', val: 300 });
  return parts;
}
const MILE_TIER_COUNT = 6;
const MILE_MYSTERY = { id:'mystery', name:'???', mech:'敬请期待', teaser:true };
// 每个角色一条 6 档轨的阈值
const MILE_TIER_NEED = {
  tianshi:   [350, 700, 1000, 1400, 1850, 2400],
  ganshiren: [550, 1400, 2900, 4500, 7500, 11000],
  wuseng:    [550, 1400, 2900, 4500, 7500, 11000],
  yincha:    [550, 1400, 2900, 4500, 7500, 11000],
};
const MILE_TRACKS = {};
const MILE_TIANSHI_RW = {
  1:{ name:'点咒符', desc:'解锁卡牌【点咒符】：0 费，对【诅咒】最高的敌人再施诅咒，其满 6 层则抽牌' },
  2:{ name:'雷谴符', desc:'解锁卡牌【雷谴符】：对全体敌人按各自【诅咒】层数打出多段雷击，随后清空各自的诅咒' },
  3:{ name:'天师真传', desc:'开局抉择改为可从本角色全部牌库中自由挑选一张加入起始牌组' },
  4:{ name:'朱砂砚', desc:'解锁遗物【朱砂砚】：敌人每次【诅咒】达到 6 层上限时，抽 1 张牌' },
  5:{ name:'五雷法印', desc:'解锁卡牌【五雷法印】：将至多 5 张手牌化为 0 费雷符，回合末未打完的自动击向血量最少者' },
};
const MILE_GANSHIREN_RW = {
  1:{ name:'赶尸令', desc:'解锁卡牌【赶尸令】：0 费，消耗【尸气】召唤纸人（尸气富余可强化）' },
  2:{ name:'尸气回流', desc:'被动强化：每个召唤单位死亡时，额外恢复 2 点生命（与【骨铃】叠加）' },
  3:{ name:'万尸朝宗', desc:'解锁卡牌【万尸朝宗】：2 费，按当前【尸气】召唤多个纸人（纯召唤，当回合不攻击）' },
  4:{ name:'尸王真传', desc:'开局抉择改为可从本角色全部牌库中自由挑选一张加入起始牌组' },
  5:{ name:'阴司牒', desc:'解锁遗物【阴司牒】：强化【尸王】，尸王每次攻击后额外获得 5 点格挡' },
};
const MILE_WUSENG_RW = {
  1:{ name:'罗汉伏虎', desc:'解锁卡牌【罗汉伏虎】：1 费攻击，造成伤害并额外加上当前格挡一半（向下取整，上限 10）' },
  2:{ name:'铁壁', desc:'永久被动：自带全局荆棘反伤 2 点（与【罗汉拳套】/临时【荆棘】叠加）' },
  3:{ name:'化甲为毒', desc:'解锁卡牌【化甲为毒】：0 费，消耗 10 点格挡为全体敌人施加【腐毒】（不足 10 点打不出）' },
  4:{ name:'金刚杵', desc:'解锁遗物【金刚杵】：本场战斗内每累计获得 50 点格挡，手牌多一张临时【铁布衫】' },
  5:{ name:'达摩影', desc:'解锁遗物【达摩影】：格挡被敌人击碎时爆破，造成击碎前格挡总量值的伤害（随机分配）' },
};
const MILE_YINCHA_RW = {
  1:{ name:'饮血刃', desc:'解锁卡牌【饮血刃】：0 费攻击，先失 3 血再消耗至多 2 层【血怒】（每层 +3），击杀再补 2 层' },
  2:{ name:'血怒·涌', desc:'被动强化：【血怒】上限由 10 提升到 13（可与【血玉】+3 叠加）' },
  3:{ name:'焚身咒', desc:'解锁卡牌【焚身咒】：0 费消耗牌，失 3 血，本回合你的攻击牌伤害 +3（可与开天眼/灵汁叠加）' },
  4:{ name:'新初始牌组', desc:'选角后立刻（首轮抽牌前）可在「现有阴差初始牌组」与「血怒流初始牌组」中二选一' },
  5:{ name:'酆都令', desc:'解锁遗物【酆都令】：每场战斗一次，生命首次降至 9 点及以下时充满【血怒】、本回合对敌伤害翻倍' },
};
Object.keys(MILE_TIER_NEED).forEach(function(hid){
  MILE_TRACKS[hid] = { nodes: MILE_TIER_NEED[hid].map(function(need,i){
    const last = (i === MILE_TIER_COUNT - 1), tier = i + 1;
    const rw = (hid==='tianshi') ? MILE_TIANSHI_RW[tier] : (hid==='ganshiren') ? MILE_GANSHIREN_RW[tier] : (hid==='wuseng') ? MILE_WUSENG_RW[tier] : (hid==='yincha') ? MILE_YINCHA_RW[tier] : null;
    if(rw) return { id:hid+'_t'+tier, tier:tier, need:need, pending:false, name:rw.name, desc:rw.desc };
    if(last) return { id:hid+'_t'+tier, tier:tier, need:need, pending:false, ticket:true,
      name:'入门符纸', desc:'领取后得 1 张【入门符纸】，可在选角页解锁一名角色。' };
    return { id:hid+'_t'+tier, tier:tier, need:need, pending:true,
      name:'奖励待定', desc:'档位奖励待定稿（里程数已定）。' };
  })};
});
// 新手教程六关
const TUT_NODES=[
 { key:'fight', name:'荒径', foes:['youhun'],
   foeOv:{ youhun:{ hp:16, intents:[{type:'attack',v:4}], affixes:[] } },
   draw:['leifu','leifu','jingang','juling','zhouyin','leifu','jingang','shouyi','zhiren','duhunguiji'] },
 { key:'shop', name:'鬼市', gold:120, wares:['zhanyaojian','huofu','jingang'], relic:'zhaohunfan', relicPrice:30 },
 { key:'elite', name:'祟岭', foes:['baiwuchang','youhun'],
   foeOv:{ baiwuchang:{ hp:40, intents:[{type:'multi',n:2,v:4},{type:'strength',v:2},{type:'multi',n:2,v:5}], affixes:[{id:'zaisheng',tier:1}] },
           youhun:{ hp:12, intents:[{type:'attack',v:4}], affixes:[] } },
   draw:['zhouyin','leifu','zhanyaojian','jingang','juling','leifu','jingang','shouyi','zhiren','duhunguiji','leifu'] },
 { key:'camp', name:'篝火' },
 { key:'unknown', name:'灵泉' },
 { key:'boss', name:'山门', foes:['jiangwang'],
   foeOv:{ jiangwang:{ hp:72, intents:[{type:'attack',v:8},{type:'charge',v:8},{type:'aoe',v:6},{type:'summon',n:1,unit:'xiaojianshi'}], affixes:[] } },
   draw:['zhouyin','leifu','zhanyaojian','leifu','jingang','leifu','juling','jingang','shouyi','zhiren','duhunguiji'] },
];
// 教程旁白。id 就是将来配音的文件名
const TUT_NARR={
 tut_00:'徒儿，塔分三重天，妖邪自上而下盘踞。为师传你一门「符箓御妖」的法子——今日先教你<b>怎么执符、怎么打法</b>，走一遍便懂了。随我来。',
 tut_1a:'瞧见没有，前头那缕游魂——最孱弱的小妖，正好拿来练手。它头顶是阳寿，你左下也是。谁的先见了底，谁就打道回府。',
 tut_1b:'记两笔：左下那道红的是你的<b>阳寿</b>——真血，见底人就没了；阳寿边上是<b>护体金光</b>，金光在，妖的爪牙先落在金光上。',
 tut_1c:'底下这五张是<b>符箓</b>，你的家当。符角上那粒朱砂数，是打它要费的<b>灵气</b>——你每回合有三点灵气，省着使。',
 tut_1d:'再看妖头顶那枚记号——那是<b>此妖将行何事</b>。它这会儿在打盹（蛰伏），下一手就要打你四分。看清了再动。',
 tut_1e:'来，执一道【雷符】——按住它，拖到那妖身上，再松手。',
 tut_1f:'着。妖受了六分。三点灵气，去了其一——符上的朱砂数，就是这么扣的。',
 tut_1g:'乘它还没缓过神，再来一道雷符，送它半条命。',
 tut_1h:'它龇牙了——下一手要抓你四分。出【金刚符】，聚五点护体金光，把这一击挡在门外。',
 tut_1i:'手里没牌好打了？点右下【结束回合】。记住：每回合开始取<b>五</b>道符，一手至多执<b>十</b>道，多了也拿不下。',
 tut_1j:'瞧见没有——它这四分，全被护体金光吃了去，你的阳寿分毫未动。没有金光，挨打扣的就是真血。',
 tut_1j2:'疼吧——没有护体金光，妖的爪牙就直接落在阳寿上。下回记得先聚金光再收手。',
 tut_1k:'好，妖灭了。妖死遗符法——三张拣一张，拣顺手的拿。拿了符，咱们继续走。',
 tut_2a:'这是<b>鬼市</b>。你怀里那 120 枚<b>冥钱</b>，只在这等地方花得出去——出了塔，就是一堆纸灰。',
 tut_2b:'瞧见那柄【斩妖剑】没有——<b>玄品</b>符箓，威力远胜你那些凡品雷符。买下它。',
 tut_2c:'符已入了你的牌库——往后取符时，它自会到你手上来。',
 tut_2d:'再看边上那杆【招魂幡】——这是<b>法宝</b>，买下了本局一直护着你，不占手、不耗灵气。买下它。',
 tut_2e:'法宝、灵液这些杂物，都收进题头那只<b>锦囊</b>里。想起来了就点开瞧瞧。',
 tut_2f:'这儿还能花冥钱<b>删符</b>——把孱弱的符烧了，牌库越精越稳。删不删随你，删完咱们就走。',
 tut_3a:'留神——前头是<b>白无常</b>，精英妖物，比游魂硬得多。当然，它身上掉的东西，也更值钱。',
 tut_3b:'看它名号底下那行小字——<b>妖异·再生</b>。这是它天生的邪性：每逢回合自愈。硬打耗不过它，得用巧劲。',
 tut_3c:'再瞧它头顶的记号——<b>连击</b>是连打数下，<b>加力</b>是此后出手更重。精英的花样多，看一步想两步。',
 tut_3d:'先出【咒印】——把咒缠到白无常身上。咒本身不伤人，却是引爆的柴薪。',
 tut_3e:'瞧好了——雷符打在带咒的妖身上，会<b>点燃一层咒</b>，多伤三分。符箓之间，是这般呼应的。',
 tut_3f:'是时候了——出【斩妖剑】，一剑<b>引爆两层咒</b>，每层五分。先缠咒、再一炬焚之，这是你往后吃饭的本事。',
 tut_3g:'忘了说——你的<b>道体</b>每回合会自行给咒最重的妖再添一层。缠上的咒，只会越滚越深。',
 tut_4a:'<b>篝火</b>到了。这儿能办三件事：删符、锻造、歇息。坐。',
 tut_4b:'先<b>锻造</b>——拣那道【雷符】，把它锻得更利些。',
 tut_4c:'记好：锻造与<b>歇息</b>（回阳寿）一炉只能选一样。此番选了锻造——牌强了，比血厚管用。',
 tut_4d:'删符这儿随时能办，不挑日子。牌库越精，出手越稳。办完事，咱们上路。',
 tut_5a:'前头雾茫茫的，是<b>未知</b>之地——祸福自取，没人替你拿主意。探不探，你自己掂量。',
 tut_5b:'运气不坏，得了一瓶<b>灵液</b>——一次性丹液，题头一点就饮，收在锦囊里。留着，紧要关头能救命。',
 tut_5c:'往后这等地界，是探是退都随你。贪险者得利，也多折损——自己掂量着来。',
 tut_6a:'到了——<b>僵王</b>镇着山门。这种大妖出手有<b>套路</b>：一招一式轮着来，看清它四五手轮流着什么，就好打了。',
 tut_6b:'留神——它在<b>蓄势</b>，下一击加倍；那记<b>群攻</b>是满场招呼，躲不过的，攒足护体金光最要紧。',
 tut_6c:'它喊帮手了。小喽啰不必慌，先着落主妖——主妖一死，小的自散。',
 tut_6d:'它血过半了——大妖到了这步会<b>起变化</b>，出手更狠。稳住，收它！',
 tut_6e:'好。执符、看妖意图、聚护体金光、逛鬼市、识妖异、缠咒引爆、篝火锻造、临事自择——你都走全了，还破了僵王。此局<b>不入风云榜</b>；往后随机成图、三重天妖邪各不同，才是真正爬塔。<b>去吧。</b>',
 tut_0_1:'冷……借一口阳气，暖暖。',
 tut_0_2:'游魂无依，只会打盹。它不动，是骗你伸手。',
 tut_0_3:'疼……好久没疼过了。',
 tut_0_4:'它散了。前头就是鬼市。',
 tut_2_1:'一见生财——名字，我记下了。',
 tut_2_2:'帽上那道绿纹是「再生」，放倒还会站起来。',
 tut_2_3:'索子上的结，解不开的。',
 tut_2_4:'斩妖剑已在牌堆。下一掌，拿它招呼。',
 tut_5_1:'吾以尸身，镇此乱葬岗。',
 tut_5_2:'蓄势那一掌是横扫，先聚金光。',
 tut_5_3:'小僵尸，起。',
 tut_5_4:'它靠小僵尸续命——先掐了它们。',
 tut_5_5:'葬……吾……',
 tut_die:'莫慌。胜败乃常事——这一关，咱们重来。',
};
// 说话人登记。只登记妖物，不在表里的按天师算
const TUT_WHO={
 tut_0_1:'游魂', tut_0_3:'游魂',
 tut_2_1:'白无常', tut_2_3:'白无常',
 tut_5_1:'僵王', tut_5_3:'僵王', tut_5_5:'僵王',
};


