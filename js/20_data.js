/* ============================================================================
 * 志怪塔 · js/20_data.js —— 数据层
 * 关键词 / CARDS / HEROES / 资源·召唤·状态助手 / RELICS / POTIONS / ENEMIES / 词缀 / 地图表 / 无尽 / 稀有度概率
 * ----------------------------------------------------------------------------
 * 由 原型.html 的整段内联脚本按原顺序切分而来（v0.61.05 三层重构，纯搬移）。
 * 拼接校验：本文件组去掉各自横幅后，应与切分前的内联脚本正文逐字节一致。
 * 加载：经典外链脚本（非 ES module），双击本地打开即可直接游玩。
 * ============================================================================ */
/* ===================== 关键词说明 ===================== */
const KEYWORDS = [
  ['格挡','抵消伤害的临时护盾：敌人攻击时先扣格挡，扣完才掉血。默认回合结束清零；苦行武僧未用完的保留最多 3 点，【卸甲】期间不清零。'],
  ['预格挡','下一回合开始时，场上召唤单位将为你带来的预计格挡值（格挡旁蓝色 ↑）。仅苦行武僧显示，用于提前规划攻防。'],
  ['诅咒','叠加在敌人身上的资源标记（上限 6 层，每回合末 -2）。本身不增伤，而是被「斩妖剑」「噬魂术」等引爆换取伤害。'],
  ['诅咒牌','可施加诅咒的牌（8 张）：火符、万剑归宗、桃木符、蚀魂咒、舍身、焚符、咒印、咒雨。'],
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
  ['血怒','阴差专属资源，上限 10 层、整局累积。打出扣血牌每失去 1 点生命 +1 层；「每层 +N」类牌打出时消耗实际用到的层数。'],
  ['尸气','赶尸人专属资源：上限 12 点、整局累积。用于强化召唤（纸人/五通神）与引爆类牌（咒雨）。'],
  ['召唤寿命','召唤单位能存活到第几回合（每回合结束 -1，归零即消散）。赶尸人召唤纸人/小鬼/五通神/阴兵时，寿命额外 +1 回合（尸王不受影响）。'],
  ['吸血','按实际造成的伤害等比回复生命（过量击杀只按敌人剩余血量计）。敌方也有【吸血】词缀。'],
  ['渡魂','接下来 5 回合内，你对敌人造成的伤害按比例转化为回复生命。'],
  ['卸甲','获得后若干回合内，格挡在回合结束不清零并持续累计；效果结束时剩余格挡转化为生命。'],
  ['消耗','每场战斗限用一次：打出后本关不再出现，战斗结束后回到牌库，下场战斗可以再用。'],
  ['灵化','敌人词缀：免疫负面效果（镇魂、魅惑等）。诅咒仍可叠加。'],
];

/* ===================== 卡牌数据（44 张） ===================== */
const CARDS = [
/* —— 攻击 1~14（A赶尸人 / B武僧 / C阴差 / D天师 四列自动按英雄生效） —— */
  {id:'leifu', name:'雷符', type:'attack', rarity:'white', cost:1,
    t:(u)=>G.hero==='ganshiren'?`造成 ${u?7:4} 伤害。场上每有 1 个召唤单位，伤害 +1；若击杀敌人，获得 2 点【尸气】`
      :G.hero==='wuseng'?`造成 ${u?6:4} 伤害。每有 ${u?2:3} 点当前格挡，伤害 +1（上限 +6）`
      :G.hero==='yincha'?`造成 ${u?8:5} 伤害。每层【血怒】使此牌伤害 +2（上限 +6），打出时消耗对应【血怒】；若以此牌击杀敌人，获得 2 层【血怒】`
      :`造成 ${u?9:6} 伤害。若目标带【诅咒】，消耗 1 层，伤害 +3`,
    eff:(u)=>{ const t=curEnemy(); if(!t) return; let d=(G.hero==='tianshi'?(u?9:6):G.hero==='yincha'?(u?8:5):(u?6:4));
      if(G.hero==='ganshiren'){ d=(u?7:4)+G.summons.filter(s=>s.dur>0).length; }
      else if(G.hero==='wuseng') d+=Math.min(6,Math.floor((G.block||0)/(u?2:3)));
      else if(G.hero==='yincha') d+=2*rageSpend(2,6);
      else if(t.curse>0){ t.curse-=1; d+=3; }
      const before=t.hp;
      dealDamageTo(t,d);
      if(before>0 && t.hp<=0){
        if(G.hero==='ganshiren'){ gainShiqi(2); log('雷符：击杀敌人，获得 2 点【尸气】'); }
        else if(G.hero==='yincha'){ gainRage(2); log('雷符：击杀敌人，获得 2 层【血怒】'); }
      } }},
  {id:'huofu', name:'火符', type:'attack', rarity:'white', cost:1, hpCost:(u)=>G.hero==='yincha'?2:0,
    t:(u)=>G.hero==='ganshiren'?`造成 ${u?8:5} 伤害。挑选弃 1 张手牌；若弃掉的是【鬼怪牌】，获得 ${u?2:1} 点【尸气】`
      :G.hero==='wuseng'?`造成 ${u?7:5} 伤害。每有 ${u?2:3} 点当前格挡，伤害 +1（上限 +6），随机弃 1 张手牌`
      :G.hero==='yincha'?`造成 ${u?11:8} 伤害。失去 2 点生命`
      :`造成 ${u?8:5} 伤害。施加 1 层【诅咒】，随机弃 1 张手牌`,
    eff:(u,c)=>{ const t=curEnemy(); if(!t) return; let d=G.hero==='tianshi'?(u?8:5):(u?7:5);
      if(G.hero==='ganshiren') d=(u?8:5);
      if(G.hero==='wuseng') d+=Math.min(6,Math.floor((G.block||0)/(u?2:3)));
      if(G.hero==='yincha'){ d=(u?11:8); loseHp(2); }
      if(G.hero==='ganshiren'){ startHuofuSelect(c, u, t, d); return; } // A 列：先挑要弃的手牌，确认后才结算伤害（v0.61 B7：可取消、可回退）
      dealDamageTo(t,d);
      if(G.hero==='tianshi') applyCurse(t,1);
      if(G.hero==='yincha') return; // C 列：只造成伤害并失去生命，不弃牌
      discardRandomHand(); }},
  {id:'jianfu', name:'剑符', type:'attack', rarity:'white', cost:2,
    t:(u)=>G.hero==='ganshiren'?`造成 ${u?13:8} 伤害。消耗 2 点【尸气】，伤害翻倍`
      :G.hero==='wuseng'?`造成 ${u?10:6} 伤害。消耗全部格挡，每消耗 2 点格挡此牌伤害 +1（无上限）`
      :G.hero==='yincha'?`造成 10 伤害。本回合每失去 1 点生命，此牌伤害 +${u?2:1}`
      :`造成 ${u?14:9} 伤害。若目标【诅咒】≥3 层，消耗 3 层并使伤害翻倍`,
    eff:(u)=>{ const t=curEnemy(); if(!t) return; let d;
      if(G.hero==='wuseng'){ d=(u?10:6)+Math.floor(G.block/2); G.block=0; }
      else if(G.hero==='yincha'){ d=10+(G.hpLostTurn||0)*(u?2:1); }
      else if(G.hero==='tianshi'){ d=(u?14:9); if(t.curse>=3){ t.curse-=3; d*=2; log('剑符：消耗 3 层【诅咒】，伤害翻倍'); } }
      else { d=(u?13:8); if(hasShiqi(2)){ spendShiqi(2); d*=2; log('剑符：消耗 2 点【尸气】，伤害翻倍'); } }
      dealDamageTo(t,d); }},
  {id:'zhanyaojian', name:'斩妖剑', type:'attack', rarity:'purple', cost:2,
    t:(u)=>G.hero==='ganshiren'?`造成 ${u?12:8} 伤害。场上每有 1 个召唤单位，额外造成 2 点伤害`
      :G.hero==='wuseng'?`造成 ${u?12:8} 伤害。若目标带有【诅咒】，额外造成 6 点伤害`
      :G.hero==='yincha'?`造成 ${u?14:9} 伤害。若目标带有【诅咒】，额外造成 ${u?6:4} 伤害`
      :`造成 ${u?12:8} 伤害。引爆目标 2 层【诅咒】（每层 ${u?7:5} 伤害）`,
    eff:(u)=>{ const t=curEnemy(); if(!t) return;
      if(G.hero==='tianshi'){ dealDamageTo(t,u?12:8); const boom=Math.min(2,t.curse||0); for(let i=0;i<boom;i++) dealDamageTo(t,u?7:5); t.curse-=boom; if(boom>0) log(`斩妖剑引爆 ${boom} 层【诅咒】`); return; }
      if(G.hero==='yincha'){ let dc=(u?14:9); if((t.curse||0)>0) dc+=(u?6:4); dealDamageTo(t,dc); return; }
      let d=(u?12:8);
      if(G.hero==='ganshiren') d+=2*G.summons.filter(s=>s.dur>0).length;
      else if(t.curse>0) d+=6;
      dealDamageTo(t,d); }},
  {id:'tianlei', name:'天雷正法', type:'attack', rarity:'purple', cost:3, hpCost:(u)=>G.hero==='yincha'?5:0,
    t:(u)=>G.hero==='ganshiren'?`造成 ${u?24:18} 伤害。每有 3 点【尸气】此牌费用 -1（最低 0），打出时消耗减免费用×3 尸气`
      :G.hero==='wuseng'?`造成 ${u?20:15} 伤害，并获得等于造成伤害的格挡`
      :G.hero==='yincha'?`造成 ${u?21:16} 伤害。失去 5 点生命，本场每失去过 1 点生命，此牌伤害 +${u?2:1}（上限 +20）`
      :`造成 ${u?30:20} 伤害。目标每有 2 层【诅咒】此牌费用 -1（最低 0）；结算后目标失去减免费用×2 层【诅咒】`,
    eff:(u)=>{ const t=curEnemy(); if(!t) return;
      if(G.hero==='wuseng'){ const dealt=dealDamageTo(t,u?20:15); if(dealt>0){ gainBlock(dealt); log(`天雷正法：获得 ${dealt} 点格挡`); } return; }
      if(G.hero==='yincha'){ loseHp(5); dealDamageTo(t,(u?21:16)+Math.min(20,(G.totalHpLost||0)*(u?2:1))); return; }
      if(G.hero==='tianshi'){ const red=Math.min(3,Math.floor((t.curse||0)/2)); dealDamageTo(t,u?30:20); if(red>0){ t.curse=Math.max(0,t.curse-red*2); log(`天雷正法：目标失去 ${red*2} 层【诅咒】`); } return; }
      const red=Math.min(3,Math.floor((G.尸气||0)/3)); if(red>0){ spendShiqi(red*3); log(`天雷正法：消耗 ${red*3} 点【尸气】`); }
      dealDamageTo(t,u?24:18); }},
  {id:'wanjian', name:'万剑归宗', type:'attack', rarity:'gold', cost:3, hpCost:(u)=>G.hero==='yincha'?3:0,
    t:(u)=>G.hero==='ganshiren'?`对全体敌人造成 ${u?15:10} 伤害。每击败 1 名敌人，获得 3 点【尸气】并抽 1 张牌`
      :G.hero==='wuseng'?`对全体敌人造成 ${u?14:9} 伤害，并获得 ${u?12:10} 点格挡。每用此牌斩杀 1 名敌人，将 1 张 0 费的万剑归宗加入手牌`
      :G.hero==='yincha'?`对全体敌人造成 ${u?15:10} 伤害。失去 3 点生命。每击败 1 名敌人，恢复 ${u?12:8} 点生命并获得 1 点符文`
      :`对全体敌人造成 ${u?16:14} 伤害。对所有敌人施加 ${u?2:1} 层【诅咒】。每击败 1 名敌人，恢复 1 点符文`,
    eff:(u,c)=>{ const before=G.turnStats.kills.length; const targets=aliveEnemies().slice();
      if(G.hero==='wuseng'){ const d=u?14:9; targets.forEach(e=>{ if(e.hp>0) dealDamageTo(e,d); }); const bb=u?12:10; gainBlock(bb); log(`万剑归宗：获得 ${bb} 点格挡`); }
      else if(G.hero==='yincha'){ loseHp(3); const d=u?15:10; targets.forEach(e=>{ if(e.hp>0) dealDamageTo(e,d); }); }
      else if(G.hero==='tianshi'){ const d=u?16:14; targets.forEach(e=>{ if(e.hp>0) dealDamageTo(e,d); }); aliveEnemies().forEach(e=>applyCurse(e,u?2:1)); }
      else { const d=u?15:10; targets.forEach(e=>{ if(e.hp>0) dealDamageTo(e,d); }); }
      const killed=G.turnStats.kills.length-before;
      if(killed>0){
        if(G.hero==='ganshiren'){ gainShiqi(killed*3); drawCards(killed); log(`万剑归宗：击败 ${killed} 名敌人，获 ${killed*3} 尸气并抽 ${killed} 张`); }
        else if(G.hero==='yincha'){ const hk=killed*(u?12:8); heal(hk); G.energy+=killed; log(`万剑归宗：击败 ${killed} 名敌人，恢复 ${hk} 点生命并获得 ${killed} 点符文`); }
        else if(G.hero==='tianshi'){ G.energy+=killed; log(`万剑归宗：击败 ${killed} 名敌人，恢复 ${killed} 点符文`); }
        else if(G.hero==='wuseng' && c){ for(let i=0;i<killed;i++) G.hand.push(Object.assign({}, c, {cost:0, costU:null})); log(`万剑归宗：斩杀 ${killed} 名敌人，获得 ${killed} 张 0 费万剑归宗`); }
      } }},
  {id:'tiebushan', name:'铁布衫', type:'attack', rarity:'blue', cost:{wuseng:0, default:1}, costU:{wuseng:0, tianshi:1, default:0}, hpCost:(u)=>G.hero==='yincha'?2:0,
    t:(u)=>G.hero==='ganshiren'?`造成等于当前格挡的伤害。每有 2 点【尸气】，额外 +${u?2:1}${u?'（0 费）':''}`
      :G.hero==='wuseng'?`造成等于当前格挡的伤害。不消耗格挡`
      :G.hero==='yincha'?`造成等于当前格挡的伤害。失去 2 点生命${u?'（0 费）':''}`
      :`造成等于当前格挡的伤害。目标每 1 层【诅咒】额外 +${u?2:1}，并消耗其全部【诅咒】`,
    eff:(u)=>{ const t=curEnemy(); if(!t) return; let d=G.block||0;
      if(G.hero==='ganshiren') d+=Math.floor((G.尸气||0)/2)*(u?2:1);
      else if(G.hero==='yincha'){ loseHp(2); }
      else if(G.hero==='tianshi'){ d+=(t.curse||0)*(u?2:1); t.curse=0; }
      if(d>0) dealDamageTo(t,d); else log('铁布衫：当前没有格挡，落空'); }},
  {id:'shihun', name:'噬魂术', type:'attack', rarity:'blue', cost:2,
    t:(u)=>G.hero==='ganshiren'?`消耗 4 点【尸气】，对目标造成 ${u?18:14} 伤害。若本回合召唤过单位，费用 -1`
      :G.hero==='wuseng'?`消耗目标全部【诅咒】：每层造成 ${u?3:2} 点伤害，并获得 ${u?2:1} 点格挡`
      :G.hero==='yincha'?`对目标造成 ${u?15:10} 伤害。每层【血怒】使此牌伤害 +2（上限 +20），打出时消耗对应【血怒】`
      :`消耗目标全部【诅咒】，每层造成 ${u?6:5} 伤害`,
    eff:(u)=>{ const t=curEnemy(); if(!t) return;
      if(G.hero==='ganshiren'){ if(!hasShiqi(4)){ floatMsg('尸气不足'); return false; } spendShiqi(4); dealDamageTo(t,u?18:14); return; }
      if(G.hero==='wuseng'){ const c=t.curse||0; if(c<=0){ log('噬魂术：目标没有诅咒，落空'); return false; } t.curse=0; dealDamageTo(t,c*(u?3:2)); const bb=c*(u?2:1); gainBlock(bb); log(`噬魂术：引爆 ${c} 层【诅咒】，获得 ${bb} 点格挡`); return; }
      if(G.hero==='yincha'){ dealDamageTo(t,(u?15:10)+2*rageSpend(2,20)); return; }
      const c=t.curse||0; if(c<=0){ log('噬魂术：目标没有诅咒，落空'); return false; } t.curse=0; dealDamageTo(t,c*(u?6:5)); }},
  {id:'qungui', name:'群鬼乱舞', type:'attack', rarity:'blue', cost:1, hpCost:(u)=>G.hero==='yincha'?2:0,
    t:(u)=>G.hero==='ganshiren'?`消耗 ${u?2:4} 点【尸气】，所有召唤单位本回合立刻作用 1 次`
      :G.hero==='wuseng'?`造成 4 伤害。场上每有 1 个召唤单位，此牌伤害 +${u?2:1}`
      :G.hero==='yincha'?`失去 2 点生命。本回合每失去 2 点生命，召唤单位伤害 +${u?2:1}`
      :`造成 ${u?6:5} 伤害。目标每有 1 层【诅咒】此牌伤害 +1（上限 +${u?6:4}）`,
    eff:(u)=>{ if(G.hero==='ganshiren'){ if(!hasShiqi(u?2:4)){ floatMsg('尸气不足'); return false; } spendShiqi(u?2:4); triggerSummons(false); return; }
      if(G.hero==='wuseng'){ const t=curEnemy(); if(!t) return; dealDamageTo(t,4+G.summons.filter(s=>s.dur>0).length*(u?2:1)); return; }
      if(G.hero==='yincha'){ loseHp(2); G.bleedSummons=true; G.bleedSummonsBonus=u?2:1; log(`群鬼乱舞：本回合每失去 2 点生命，召唤单位伤害 +${u?2:1}`); return; }
      const t=curEnemy(); if(!t) return; dealDamageTo(t,(u?6:5)+Math.min(u?6:4,t.curse||0)); }},
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
    t:(u)=>G.hero==='ganshiren'?`造成 ${u?6:3} 伤害。若场上有召唤单位，每有 1 个恢复 1 点生命`
      :G.hero==='wuseng'?`造成 ${u?7:5} 伤害。消耗 2 点格挡，施加 ${u?2:1} 层【诅咒】`
      :G.hero==='yincha'?`造成 ${u?8:5} 伤害。失去 2 点生命，施加 2 层【诅咒】`
      :`造成 ${u?7:4} 伤害。施加 2 层【诅咒】`,
    eff:(u)=>{ const t=curEnemy(); if(!t) return;
      if(G.hero==='yincha') loseHp(2); // C 列卡面写明「失去 2 点生命」，原先只扣了格挡/血量前置却没实扣
      // v0.61.10(P5)：天师列 3/6 → 4/7（其余三列数值不动）
      dealDamageTo(t, G.hero==='ganshiren'?(u?6:3):(G.hero==='tianshi'?(u?7:4):(G.hero==='yincha'?(u?8:5):(u?7:5))));
      if(G.hero==='ganshiren'){ const n=G.summons.filter(s=>s.dur>0).length; if(n>0){ heal(n); log(`蚀魂咒：场上 ${n} 个召唤单位，恢复 ${n} 点生命`); } }
      else if(G.hero==='wuseng'){ if((G.block||0)>=2){ G.block-=2; applyCurse(t,u?2:1); } else log('蚀魂咒：格挡不足 2，未施加诅咒'); }
      else applyCurse(t,2); }},
  {id:'shixue', name:'嗜血', type:'attack', rarity:'purple', cost:1,
    t:(u)=>G.hero==='ganshiren'?`造成 ${u?7:5} 伤害。每有 2 点【尸气】，此牌伤害 +1（上限 +5）`
      :G.hero==='wuseng'?`造成 ${u?6:4} 伤害。每有 ${u?2:3} 点格挡，此牌伤害 +1（上限 +5）`
      :G.hero==='yincha'?`造成 ${u?6:4} 伤害。本场每失去 ${u?3:4} 点生命，此牌伤害 +1（上限 +${u?20:15}）`
      :`造成 ${u?8:6} 伤害。回复造成伤害 50% 的生命；目标【诅咒】≥3 层时，消耗 3 层并把比例提升到 100%`,
    eff:(u)=>{ const t=curEnemy(); if(!t) return; let d;
      if(G.hero==='ganshiren') d=(u?7:5)+Math.min(5,Math.floor((G.尸气||0)/2));
      else if(G.hero==='wuseng') d=(u?6:4)+Math.min(5,Math.floor((G.block||0)/(u?2:3)));
      else if(G.hero==='yincha') d=(u?6:4)+Math.min(u?20:15,Math.floor((G.totalHpLost||0)/(u?3:4)));
      else { d=(u?8:6); let ratio=0.5;
        if((t.curse||0)>=3){ t.curse-=3; ratio=1; log('嗜血：消耗 3 层【诅咒】，吸血比例提升到 100%'); }
        const dealt=dealDamageTo(t,d); if(dealt>0){ const h=Math.floor(dealt*ratio); if(h>0){ heal(h); floatMsg('+'+h+' 生命'); log('嗜血：回复 '+h+' 点生命'); } } return; }
      dealDamageTo(t,d); }},
  {id:'baigui', name:'百鬼夜行', type:'attack', rarity:'purple', cost:2, hpCost:(u)=>G.hero==='yincha'?2:0,
    t:(u)=>G.hero==='ganshiren'?`对全体敌人造成 ${u?6:4} 伤害。每有 1 个召唤单位，此牌伤害 +${u?3:2}`
      :G.hero==='wuseng'?`对全体敌人造成 ${u?6:5} 伤害。每有 ${u?1:2} 点格挡，此牌伤害 +1（上限 +${u?11:8}）`
      :G.hero==='yincha'?`对全体敌人造成 ${u?7:5} 伤害。失去 2 点生命。每有 1 个召唤单位，此牌伤害 +${u?3:2}`
      :`对全体敌人造成 7 伤害。每层【诅咒】使该敌人受到此伤害 +${u?2:1}，并消耗其全部【诅咒】`,
    eff:(u)=>{ if(G.hero==='tianshi'){ aliveEnemies().forEach(e=>{ const cc=e.curse||0; dealDamageTo(e,7+(u?2:1)*cc); e.curse=0; }); return; }
      const n=G.summons.filter(s=>s.dur>0).length;
      if(G.hero==='ganshiren'){ dealDamageToAll((u?6:4)+n*(u?3:2)); return; }
      if(G.hero==='wuseng'){ dealDamageToAll((u?6:5)+Math.min(u?11:8,Math.floor((G.block||0)/(u?1:2)))); return; }
      loseHp(2); dealDamageToAll((u?7:5)+n*(u?3:2)); }},
  {id:'zhongkui', name:'钟馗镇魂', type:'spirit', rarity:'gold', cost:3, exhaust:true, hpCost:(u)=>G.hero==='yincha'?4:0,
    t:(u)=>G.hero==='ganshiren'?`对目标造成 ${u?24:16} 伤害并【镇魂】。获得 ${u?5:4} 点【尸气】（消耗牌）`
      :G.hero==='wuseng'?`对目标造成 ${u?22:16} 伤害并【镇魂】。格挡达 12/15/21 时费用 -1/-2/-3（消耗）`
      :G.hero==='yincha'?`对目标造成 ${u?24:16} 伤害并【镇魂】。失去 4 点生命；若生命低于 40%，伤害翻倍。消耗牌（一次性）`
      :`对目标造成 ${u?24:18} 伤害并【镇魂】。引爆并清空目标全部【诅咒】（每层 ${u?6:5} 伤害）（消耗）`,
    eff:(u)=>{ const t=curEnemy(); if(!t) return;
      if(G.hero==='ganshiren'){ sealEnemy(t,1); dealDamageTo(t,u?24:16); gainShiqi(u?5:4); log(`钟馗镇魂：造成 ${u?24:16} 伤害并获得 ${u?5:4} 点【尸气】`); return; }
      if(G.hero==='wuseng'){ sealEnemy(t,1); dealDamageTo(t,u?22:16); return; }
      if(G.hero==='yincha'){ sealEnemy(t,1); loseHp(4); let d=u?24:16; if(G.hp < G.maxHp*0.4){ d*=2; log('钟馗镇魂：生命低于 40%，伤害翻倍'); } dealDamageTo(t,d); return; }
      // v0.61.10(P5)：天师列 15/20 → 18/24（每层诅咒引爆的 5/6 不动；其余三列数值不动）
      const c=t.curse||0; sealEnemy(t,1); dealDamageTo(t,u?24:18); for(let i=0;i<c;i++) dealDamageTo(t,u?6:5); t.curse=0; if(c>0) log(`钟馗镇魂引爆 ${c} 层【诅咒】`); }},
/* —— 防御 15~23 —— */
  {id:'jingang', name:'金刚符', type:'defense', rarity:'white', cost:1, hpCost:(u)=>G.hero==='yincha'?2:0,
    t:(u)=>G.hero==='ganshiren'?`获得 ${u?7:4} 点格挡。获得 ${u?2:1} 点【尸气】`
      :G.hero==='wuseng'?`获得 ${u?9:6} 点格挡`
      :G.hero==='yincha'?`获得 ${u?9:7} 点格挡。失去 2 点生命`
      :`获得 ${u?6:4} 点格挡。本回合每施加 1 层【诅咒】额外 +${u?2:1} 格挡（上限 +6）`,
    eff:(u)=>{ let b;
      if(G.hero==='ganshiren'){ b=u?7:4; gainShiqi(u?2:1); }
      else if(G.hero==='wuseng'){ b=u?9:6; }
      else if(G.hero==='yincha'){ loseHp(2); b=u?9:7; }
      else { b=(u?6:4)+Math.min(6,(u?2:1)*(CURSE_THIS_TURN||0)); }
      gainBlock(b); }},
  {id:'yinshen', name:'隐身符', type:'defense', rarity:'white', cost:1,
    t:(u)=>G.hero==='ganshiren'?`获得 ${u?6:3} 点格挡，抽 1 张牌。若抽到【鬼怪牌】，获得 ${u?2:1} 点【尸气】`
      :G.hero==='wuseng'?`获得 ${u?6:4} 点格挡，抽 1 张牌。若本回合未失去生命，下回合额外抽 1 张`
      :G.hero==='yincha'?`获得 ${u?5:3} 点格挡，抽 1 张牌。若本回合失去过生命，改为抽 2 张`
      :`获得 ${u?6:3} 点格挡，抽 1 张牌。若抽到【诅咒牌】，再获得 ${u?4:3} 点格挡`,
    eff:(u)=>{ const b=G.hero==='ganshiren'?(u?6:3):(G.hero==='wuseng'?(u?6:4):(G.hero==='yincha'?(u?5:3):(u?6:3)));
      if(G.hero==='yincha'){ gainBlock(b); drawCards((G.hpLostTurn||0)>0?2:1); return; }
      gainBlock(b); drawCards(1);
      if(G.hero==='wuseng' && !(G.hpLostTurn||0)){ G.dodgeDraw=Math.max(G.dodgeDraw||0,1); log('隐身诀：本回合未受伤，下回合额外抽 1 张'); }
      else if(G.hero==='ganshiren'){ const hit=G.lastDrawnCards&&G.lastDrawnCards.find(x=>isGhostCard(x)); if(hit){ gainShiqi(u?2:1); log(`隐身诀：抽到鬼怪牌，获得 ${u?2:1} 点【尸气】`); } }
      else if(G.hero==='tianshi'){ const hit=G.lastDrawnCards&&G.lastDrawnCards.find(x=>isCanCurse(x)); if(hit){ const b2=u?4:3; gainBlock(b2); log(`隐身诀：抽到【诅咒牌】，额外获得 ${b2} 点格挡`); } } }},
  {id:'jinguang', name:'金光罩', type:'defense', rarity:'blue', cost:2, hpCost:(u)=>G.hero==='yincha'?3:0,
    t:(u)=>G.hero==='ganshiren'?`获得 ${u?15:10} 点格挡。再消耗 2 点【尸气】额外获得 ${u?5:4} 点格挡`
      :G.hero==='wuseng'?`获得 ${u?19:14} 点格挡`
      :G.hero==='yincha'?`获得 ${u?14:10} 点格挡。失去 3 点生命`
      :`获得 ${u?17:12} 点格挡。本回合每施加 1 层【诅咒】额外 +1 格挡`,
    eff:(u)=>{ if(G.hero==='ganshiren'){ gainBlock(u?15:10); if(hasShiqi(2)){ spendShiqi(2); gainBlock(u?5:4); log(`金光罩：消耗 2 点尸气，额外获得 ${u?5:4} 点格挡`); } }
      else if(G.hero==='wuseng'){ gainBlock(u?19:14); }
      else if(G.hero==='yincha'){ loseHp(3); gainBlock(u?14:10); }
      else { gainBlock((u?17:12)+(CURSE_THIS_TURN||0)); } }},
  {id:'jinzhong', name:'金钟罩', type:'defense', rarity:'purple', cost:2,
    t:(u)=>`获得 ${G.hero==='ganshiren'?(u?16:10):G.hero==='yincha'?(u?15:10):(u?17:12)} 点格挡。清除自身所有负面状态与手牌中的状态牌`,
    eff:(u)=>{ gainBlock(G.hero==='ganshiren'?(u?16:10):G.hero==='yincha'?(u?15:10):(u?17:12)); clearJunk(); clearPlayerDebuffs(); floatMsg('负面状态已清除'); }},
  {id:'jingji', name:'荆棘符', type:'defense', rarity:'blue', cost:1,
    t:(u)=>G.hero==='ganshiren'?`获得 ${u?6:3} 点格挡。本回合每受 1 次攻击，反弹 ${u?6:4} 点伤害`
      :G.hero==='wuseng'?`获得 ${u?7:4} 点格挡。本回合每受 1 次攻击，反弹 ${u?5:4} 点伤害`
      :G.hero==='yincha'?`获得 ${u?5:3} 点格挡。本回合每受 1 次攻击，恢复 2 点生命`
      :`获得 ${u?5:3} 点格挡。本回合每受到 1 次攻击，对攻击者施加 1 层【诅咒】`,
    eff:(u)=>{ const b=G.hero==='ganshiren'?(u?6:3):(G.hero==='wuseng'?(u?7:4):(u?5:3)); gainBlock(b);
      if(G.hero==='ganshiren'){ G.thorns+=u?6:4; }
      else if(G.hero==='wuseng'){ G.thorns+=u?5:4; }
      else if(G.hero==='yincha'){ G.hitHeal=2; }
      else { G.hitCurse=1; } }},
  /* v0.61.10(P1)：佛渡 1 费 → 0 费 + 全列【消耗】。免疫不再能靠重复打出续上（每场限一次）。 */
  {id:'fodu', name:'佛渡', type:'defense', rarity:'blue', cost:0, exhaust:true,
    t:(u)=>G.hero==='ganshiren'?`清除所有状态牌与自身负面状态，本回合免疫敌人施加的负面效果${u?'，并获得 2 点【尸气】':''}。消耗（一次性）`
      :G.hero==='yincha'?`清除所有状态牌与自身负面状态，本回合免疫敌人施加的负面效果${u?'，额外获得 3 点格挡':''}。消耗（一次性）`
      :`清除所有状态牌与自身负面状态，本回合免疫敌人施加的负面效果${u?'，额外获得 4 点格挡':''}。消耗（一次性）`,
    eff:(u)=>{ if(G.hero==='ganshiren'){ clearJunk(); clearPlayerDebuffs(); G.debuffImmune=1; floatMsg('本回合免疫负面效果'); if(u){ gainShiqi(2); log(`佛渡：升级后获得 2 点【尸气】`); } return; }
      const fb=(G.hero==='yincha')?3:4;
      clearJunk(); clearPlayerDebuffs(); G.debuffImmune=1; floatMsg('本回合免疫负面效果'); if(u){ gainBlock(fb); log(`佛渡：升级后获得 ${fb} 点格挡`); } }},
  {id:'tongpi', name:'铜皮铁骨', type:'defense', rarity:'blue', cost:2, hpCost:(u)=>G.hero==='yincha'?3:0,
    t:(u)=>G.hero==='ganshiren'?`获得 ${u?12:9} 点格挡。反弹 ${u?6:4} 点伤害。每有 1 个召唤单位，额外反弹 1 点`
      :G.hero==='wuseng'?`获得 ${u?15:10} 点格挡。反弹 ${u?8:6} 点伤害`
      :G.hero==='yincha'?`获得 ${u?11:8} 点格挡。失去 3 点生命，反弹 ${u?8:6} 点伤害`
      :`获得 ${u?12:8} 点格挡。本回合每受到 1 次攻击，对攻击者施加 1 层【诅咒】`,
    eff:(u)=>{ if(G.hero==='ganshiren'){ gainBlock(u?12:9); G.thorns+=(u?6:4)+G.summons.filter(s=>s.dur>0).length; }
      else if(G.hero==='wuseng'){ gainBlock(u?15:10); G.thorns+=u?8:6; }
      else if(G.hero==='yincha'){ loseHp(3); gainBlock(u?11:8); G.thorns+=u?8:6; }
      else { gainBlock(u?12:8); G.hitCurse=1; } }},
  {id:'fanzhen', name:'反震', type:'defense', rarity:'blue', cost:1, costU:{wuseng:0},
    t:(u)=>G.hero==='ganshiren'?`反弹 ${u?4:3} 点伤害。本回合每受 1 次攻击，获得 ${u?2:1} 点【尸气】`
      :G.hero==='wuseng'?`本回合每受 1 次攻击，对攻击者造成 ${u?5:4} 点伤害`
      :G.hero==='yincha'?`本回合每受到 1 次攻击，获得 ${u?2:1} 层【血怒】并对攻击者造成 ${u?5:4} 点伤害`
      :`本回合每受到 1 次攻击，反击 3 点伤害并对攻击者施加 ${u?2:1} 层【诅咒】`,
    eff:(u)=>{ if(G.hero==='ganshiren'){ G.thorns+=u?4:3; G.hitShiqi=Math.max(G.hitShiqi||0,u?2:1); }
      else if(G.hero==='wuseng'){ G.thorns+=u?5:4; } // B 文档：只反弹，不再给「下回合格挡」
      else if(G.hero==='yincha'){ G.thorns+=u?5:4; G.hitRage=Math.max(G.hitRage||0,u?2:1); }
      else { G.thorns+=3; G.hitCurse=Math.max(G.hitCurse||0,u?2:1); } }},
  {id:'xiejiashengyuan', name:'卸甲生元', type:'defense', rarity:'blue', cost:1, hpCost:(u)=>G.hero==='yincha'?3:0,
    t:(u)=>G.hero==='ganshiren'?`获得 ${u?7:4} 点格挡。回合结束自动将剩余格挡换算为【尸气】：每保留 2 点，获得 ${u?2:1} 点（无论敌人是否攻击）`
      :G.hero==='wuseng'?`获得 ${u?8:5} 点格挡。使【卸甲】持续 ${u?3:2} 回合：期间格挡不清零，到期后剩余格挡转为生命`
      :G.hero==='yincha'?`获得 ${u?7:5} 点格挡。失去 3 点生命。敌人攻击后每保留 1 点格挡，恢复 1 点生命`
      :`获得 ${u?8:6} 点格挡。敌人攻击后，将剩余格挡转为对随机敌人施加【诅咒】（每 2 格挡 = 1 层，上限 6 层；敌人满 6 层时溢出部分会转回格挡）`,
    eff:(u)=>{ if(G.hero==='ganshiren'){ gainBlock(u?7:4); G.endBlockKind='A'; G.xiejiaUp=!!u; floatMsg('回合结束格挡将自动转为尸气'); }
      else if(G.hero==='wuseng'){ gainBlock(u?8:5); G.xiejia=u?3:2; floatMsg('【卸甲】已启动，格挡不再清零'); }
      else if(G.hero==='yincha'){ loseHp(3); gainBlock(u?7:5); G.endBlockKind='C'; floatMsg('敌人攻击后格挡将转为生命'); }
      else { gainBlock(u?8:6); G.endBlockKind='D'; floatMsg('敌人攻击后格挡将转为诅咒'); } }},
/* —— 功能 24~40 —— */
  {id:'juling', name:'聚灵', type:'skill', rarity:'white', cost:0,
    t:(u)=>G.hero==='ganshiren'?`抽 ${u?2:1} 张牌。若抽到【鬼怪牌】，获得 ${u?2:1} 点【尸气】`
      :G.hero==='wuseng'?`抽 1 张牌${u?'。若抽到【防御牌】，获得 4 点格挡':''}`
      :G.hero==='yincha'?`抽 ${u?2:1} 张牌。若本回合失去过生命，再抽 1 张`
      :`抽 ${u?2:1} 张牌。若抽到【诅咒牌】，获得 1 点符文`,
    /* v0.61.10(P10)：武僧列升级效果整体替换 —— 原「升级抽 2」取消，改为「仍抽 1，抽到防御牌则 +4 格挡」。 */
    eff:(u)=>{ const n=(G.hero==='wuseng')?1:(u?2:1); drawCards(n); const drew=G.lastDrawnCards||[];
      if(G.hero==='ganshiren'){ if(drew.some(x=>isGhostCard(x))){ gainShiqi(u?2:1); log(`聚灵：抽到鬼怪牌，获得 ${u?2:1} 点【尸气】`); } }
      else if(G.hero==='wuseng'){ if(u && drew.some(x=>x.type==='defense')){ gainBlock(4); log('聚灵：升级后抽到防御牌，获得 4 点格挡'); } }
      else if(G.hero==='yincha'){ if((G.hpLostTurn||0)>0){ drawCards(1); log('聚灵：本回合失去过生命，再抽 1 张'); } }
      else if(drew.some(x=>isCanCurse(x))){ G.energy+=1; log('聚灵：抽到【诅咒牌】，获得 1 点符文'); } }},
  {id:'sheshen', name:'舍身', type:'skill', rarity:'blue', cost:0, hpCost:()=>4,
    t:(u)=>G.hero==='ganshiren'?`失去 4 点生命。抽 ${u?2:1} 张牌。获得 ${u?2:1} 点【尸气】`
      :G.hero==='wuseng'?`失去 4 点生命。获得 ${u?5:3} 点格挡，抽 ${u?2:1} 张牌`
      :G.hero==='yincha'?`失去 4 点生命。抽 ${u?3:2} 张牌`
      :`失去 4 点生命，抽 ${u?2:1} 张牌。对随机敌人施加 ${u?2:1} 层【诅咒】`,
    eff:(u)=>{ loseHp(4); const n=G.hero==='yincha'?(u?3:2):(u?2:1); drawCards(n);
      if(G.hero==='ganshiren'){ gainShiqi(u?2:1); log(`舍身：获得 ${u?2:1} 点【尸气】`); }
      else if(G.hero==='wuseng'){ gainBlock(u?5:3); }
      else if(G.hero==='tianshi'){ const re=randomAlive(); if(re){ applyCurse(re,u?2:1); log(`舍身：对 ${re.name} 施加 ${u?2:1} 层【诅咒】`); } } }},
  {id:'shouyi', name:'守一', type:'skill', rarity:'purple', cost:0,
    t:(u)=>G.hero==='ganshiren'?`保留 ${u?2:1} 张手牌。每保留 1 张【鬼怪牌】，获得 1 点【尸气】`
      :G.hero==='wuseng'?`保留 ${u?2:1} 张手牌。每保留 1 张防御牌，获得 ${u?4:3} 点格挡`
      :G.hero==='yincha'?`保留 ${u?2:1} 张手牌。下回合恢复保留手牌费用之和的生命`
      :`保留 ${u?2:1} 张手牌。保留的每张【诅咒牌】，下回合首次施咒额外 +1 层（仅一回合）`,
    eff:(u)=>{ G.retain+=(u?2:1); G.shouyiUp=!!u; floatMsg(`回合结束时可保留 ${G.retain} 张手牌`); }},
  {id:'yiwu', name:'易物', type:'skill', rarity:'blue', cost:0,
    t:(u)=>G.hero==='ganshiren'?`选择 1 张手牌与弃牌堆交换，换入的牌本回合费用 -1。若换出的是【鬼怪牌】，获得 1 点【尸气】`
      :G.hero==='wuseng'?`选择 1 张手牌与弃牌堆交换，换入的牌本回合费用 -1。若换出的是防御牌，获得 4 点格挡`
      :G.hero==='yincha'?`选择 1 张手牌与弃牌堆交换，换入的牌本回合费用 -1。若换出的是技能牌，恢复 5 点生命`
      :`选择 1 张手牌与弃牌堆交换，换入的牌本回合费用 -1。若换出的是攻击牌，额外抽 1 张牌`,
    eff:(u,c)=>{ startExchangeSelect(1, c); }},
  {id:'xueqi', name:'血契', type:'skill', rarity:'blue', cost:1, costU:{wuseng:0, yincha:0},
    t:(u)=>G.hero==='wuseng'?`将目前的格挡按 60% 转化为血量${u?'（0 符文）':''}`
      :G.hero==='yincha'?`扣除目前所有【血怒】，恢复【血怒】层数 ×2 的生命${u?'（0 符文）':''}`
      :G.hero==='tianshi'?`本回合每失去 1 点生命，获得 ${u?2:1} 点格挡`
      :`本回合每失去 1 点生命，获得 ${u?3:2} 点格挡`,
    /* v0.61.10(P2)：武僧 格挡→血 100% → 60%（向下取整）。阴差/天师/赶尸人列逻辑不动。 */
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
    hpCost:(u)=>G.hero==='wuseng'?6:(G.hero==='yincha'?(u?6:4):(G.hero==='tianshi'?(u?3:6):4)),
    t:(u)=>{ const l=G.hero==='wuseng'?6:(G.hero==='yincha'?(u?6:4):(G.hero==='tianshi'?(u?3:6):4));
      const gg=G.hero==='yincha'?(u?2:1):2;
      return `失去 ${l} 点生命。获得 ${gg} 点符文`; },
    eff:(u)=>{ const l=G.hero==='wuseng'?6:(G.hero==='yincha'?(u?6:4):(G.hero==='tianshi'?(u?3:6):4));
      const gg=G.hero==='yincha'?(u?2:1):2;
      loseHp(l); G.energy+=gg; floatMsg(`符文 +${gg}`); log(`燃血术：失去 ${l} 点生命，获得 ${gg} 点符文`); }},
  {id:'xisui', name:'洗髓经', type:'skill', rarity:'gold', cost:2,
    t:(u)=>G.hero==='ganshiren'?`接下来 ${u?4:3} 回合，每回合开始获得 1 点【尸气】和 1 点符文`
      :G.hero==='wuseng'?`接下来 ${u?4:3} 回合，每回合开始获得 2 点格挡和 1 点符文`
      :G.hero==='yincha'?`接下来 ${u?4:3} 回合，每回合开始失去 2 点生命，获得 1 点符文`
      :`接下来 ${u?4:3} 回合，每回合开始对随机敌人施加 1 层【诅咒】和 1 点符文`,
    eff:(u)=>{ G.xisuiTurns=u?4:3; floatMsg(`洗髓经：接下来 ${G.xisuiTurns} 回合生效`); }},
  {id:'duhunguiji', name:'渡魂归己', type:'skill', rarity:'gold', cost:1, exhaust:true,
    t:(u)=>`消耗。接下来 5 回合，你对敌人造成伤害的 ${u?50:30}% 转化为生命`,
    eff:(u)=>{ G.duhun={turns:5, ratio:u?0.5:0.3}; floatMsg('渡魂归己 · 吸血化命'); log(`渡魂归己：接下来 5 回合，造成伤害的 ${Math.round(G.duhun.ratio*100)}% 转化为生命`); }},
  {id:'fenfu', name:'焚符', type:'skill', rarity:'purple', cost:0,
    t:(u)=>G.hero==='ganshiren'?`弃任意张手牌：每弃 1 张，获得 1 点【尸气】与 ${u?3:2} 点格挡`
      :G.hero==='wuseng'?`弃任意张手牌：每弃 1 张，获得 ${u?6:4} 点格挡`
      :G.hero==='yincha'?`弃任意张手牌：每弃 1 张，恢复 ${u?4:3} 点生命`
      :`弃任意张手牌：每弃 1 张，对随机敌人施加 1 层【诅咒】并获得 ${u?3:2} 点格挡`,
    eff:(u,c)=>{ startDiscardSelect(G.hand.length, c); }},
  {id:'xueji', name:'血祭', type:'skill', rarity:'purple', cost:1, costU:0, hpCost:(u)=>G.hero==='yincha'?4:3,
    t:(u)=>G.hero==='ganshiren'?`失去 3 点生命。本回合每召唤 1 个单位，下回合多摸 1 张牌（上限 3张）${u?'（0 符文）':''}`
      :G.hero==='wuseng'?`失去 3 点生命。本回合每获得 5 点格挡，下回合多摸 1 张牌（上限 +4）${u?'（0 符文）':''}`
      :G.hero==='yincha'?`失去 4 点生命。本回合每失去 2 点生命，下回合多摸 1 张牌（上限 +4）${u?'（0 符文）':''}`
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
      G.ranhunHeal = u ? ((G.hero==='wuseng'||G.hero==='tianshi')?3:4) : 2; // A/C 2→4；B/D 2→3
      G.ranhunSelf=c; floatMsg('燃魂 · 已点燃'); }},
  {id:'kaitianyan', name:'开天眼', type:'skill', rarity:'blue', cost:1,
    t:(u)=>G.hero==='ganshiren'?`本回合攻击牌伤害 +${u?5:3}。场上每有 1 个召唤单位，额外 +1`
      :G.hero==='wuseng'?`本回合攻击牌伤害 +${u?4:2}。每有 ${u?2:3} 点格挡，额外 +1（上限 +5）`
      :G.hero==='yincha'?`本回合攻击牌伤害 +${u?5:3}。每层【血怒】使额外伤害 +1（上限 +6），打出后消耗对应【血怒】`
      :`本回合攻击牌伤害 +${u?6:4}`,
    eff:(u)=>{ let val;
      if(G.hero==='ganshiren') val=(u?5:3)+G.summons.filter(s=>s.dur>0).length;
      else if(G.hero==='wuseng') val=(u?4:2)+Math.min(5,Math.floor((G.block||0)/(u?2:3)));
      else if(G.hero==='yincha') val=(u?5:3)+rageSpend(1,6);
      else val=u?6:4;
      G.turnAtkBuff=(G.turnAtkBuff||0)+val;
      log(`开天眼：本回合攻击牌伤害 +${val}`); }},
  {id:'yixing', name:'移形换影', type:'skill', rarity:'purple', cost:1, costU:0,
    t:(u)=>G.hero==='ganshiren'?`闪避下一次攻击。闪避成功后，获得 2 点【尸气】${u?'（0 符文）':''}`
      :G.hero==='wuseng'?`闪避下一次攻击。闪避成功后，下一回合获得 5 点格挡${u?'（0 符文）':''}`
      :G.hero==='yincha'?`闪避下一次攻击。闪避成功后，恢复 4 点生命并获得 1 层【血怒】${u?'（0 符文）':''}`
      :`闪避下一次攻击。闪避成功后，对攻击者施加 1 层【诅咒】${u?'（0 符文）':''}`,
    eff:(u)=>{ G.dodge+=1;
      if(G.hero==='ganshiren'){ G.dodgeShiqi=2; }
      else if(G.hero==='wuseng'){ G.dodgeNextBlock=5; }
      else if(G.hero==='yincha'){ G.dodgeHealRage=4; }
      else { G.dodgeCurse=1; }
      floatMsg('移形换影：闪避下一次攻击'); }},
  {id:'fuling', name:'附灵术', type:'skill', rarity:'purple', cost:{ganshiren:0, default:2}, costU:{tianshi:1}, exhaustOnly:['ganshiren'], needs:'summon',
    t:(u)=>G.hero==='ganshiren'?`立即触发所有召唤单位。消耗牌（一次性）`
      :G.hero==='wuseng'?`立即触发所有召唤单位。每触发 1 个，获得 ${u?4:3} 点格挡`
      :G.hero==='yincha'?`立即触发所有召唤单位。每触发 1 个，恢复 ${u?4:2} 点生命`
      :`立即触发所有召唤单位。每触发 1 个，对随机敌人施加 1 层【诅咒】${u?'（1 符文）':''}`,
    eff:(u)=>{ const n=G.summons.filter(s=>s.dur>0).length;
      triggerSummons(false);
      if(n>0){
        if(G.hero==='wuseng'){ const bb=n*(u?4:3); gainBlock(bb); log(`附灵术：触发 ${n} 个召唤单位，获得 ${bb} 点格挡`); }
        else if(G.hero==='yincha'){ const hh=n*(u?4:2); heal(hh); log(`附灵术：触发 ${n} 个召唤单位，恢复 ${hh} 点生命`); }
        else if(G.hero==='tianshi'){ for(let k=0;k<n;k++){ const re=randomAlive(); if(re) applyCurse(re,1); } log(`附灵术：触发 ${n} 个召唤单位，施加 ${n} 层【诅咒】`); }
        else log(`附灵术：触发 ${n} 个召唤单位`);
      } else log('附灵术：没有召唤单位可触发'); }},
  {id:'zhenyaoling', name:'镇妖铃', type:'spirit', rarity:'purple', cost:2, exhaust:true, hpCost:(u)=>G.hero==='yincha'?3:0,
    t:(u)=>G.hero==='ganshiren'?`造成 ${u?16:10} 伤害并【镇魂】。获得 3 点【尸气】。消耗牌（一次性）`
      :G.hero==='wuseng'?`造成 ${u?15:10} 伤害并【镇魂】。若此时格挡 ≥10，伤害 +${u?11:8}。消耗牌（一次性）`
      :G.hero==='yincha'?`造成 ${u?16:10} 伤害并【镇魂】。失去 3 点生命，每层【血怒】使此牌伤害 +2（上限 +20）（消耗）`
      :`造成 ${u?14:10} 伤害并【镇魂】。若目标带【诅咒】，镇魂持续 2 回合（消耗）`,
    eff:(u)=>{ const t=curEnemy(); if(!t) return;
      if(G.hero==='ganshiren'){ sealEnemy(t,1); dealDamageTo(t,u?16:10); gainShiqi(3); log(`镇妖铃：造成 ${u?16:10} 伤害并获得 3 点【尸气】`); return; }  // v0.61 B3：单引号→反引号，日志正常插值
      if(G.hero==='wuseng'){ sealEnemy(t,1); let d=u?15:10; if((G.block||0)>=10){ d+=(u?11:8); log(`镇妖铃：格挡 ≥10，伤害 +${u?11:8}`); } dealDamageTo(t,d); return; }
      if(G.hero==='yincha'){ loseHp(3); sealEnemy(t,1); dealDamageTo(t,(u?16:10)+2*rageSpend(2,20)); return; }
      sealEnemy(t, (t.curse||0)>0?2:1); dealDamageTo(t,u?14:10); }},
/* —— 召唤 / 秘法 41~48 —— */
  {id:'zhiren', name:'纸人', type:'spirit', rarity:'white', cost:1,
    t:(u)=>G.hero==='ganshiren'?`召唤纸人。每回合末造成 ${u?4:2} 伤害。若打出时【尸气】≥4，消耗 4 点【尸气】强化：每回合末造成 ${u?7:5} 伤害。死亡时获得 2 点【尸气】（持续 2 回合）`
      :G.hero==='wuseng'?`召唤纸人。每回合末造成 ${u?3:2} 伤害。纸人存活时，每回合开始获得 ${u?3:2} 点格挡（持续 2 回合）`
      :G.hero==='yincha'?`召唤纸人。失去 2 点生命。每回合末造成 ${u?2:1} 伤害，纸人攻击时为你恢复 ${u?3:2} 点生命（持续 2 回合）。若打出时【血怒】≥4，消耗 4 点【血怒】强化：每回合末造成 ${u?5:4} 伤害，攻击时恢复 ${u?4:3} 点生命`
      :`召唤纸人。每回合末对随机敌人造成 ${u?3:2} 伤害；若该敌人带【诅咒】，伤害 +${u?3:2}（持续 2 回合）`,
    eff:(u)=>{ let v = G.hero==='wuseng' ? (u?3:2) : (G.hero==='tianshi' ? (u?3:2) : (u?4:2)); let hv=0;
      if(G.hero==='ganshiren' && hasShiqi(4)){ spendShiqi(4); v=u?7:5; log('纸人：消耗 4 点【尸气】强化'); }
      else if(G.hero==='yincha'){ loseHp(2); v=u?2:1; hv=u?3:2;
        if(rageLayers()>=4){ G.xuenu-=4; v=u?5:4; hv=u?4:3; log('纸人：消耗 4 点【血怒】强化'); } }
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
  {id:'xiaogui', name:'小鬼', type:'spirit', rarity:'white', cost:1,
    t:(u)=>G.hero==='ganshiren'?`召唤小鬼。每回合末造成 ${u?4:2} 伤害。死亡时获得 ${u?3:2} 点【尸气】（持续 2 回合）`
      :G.hero==='wuseng'?`召唤小鬼。每回合末造成 ${u?3:2} 伤害。小鬼死亡时，获得 ${u?7:5} 点格挡（持续 2 回合）`
      :G.hero==='yincha'?`召唤小鬼。失去 2 点生命。每回合末造成 ${u?2:1} 伤害并获得 1 层【血怒】；小鬼死亡时，恢复 ${u?4:2} 点生命（持续 2 回合）`
      :`召唤小鬼。每回合末对【诅咒】最高的敌人造成 ${u?4:3} 伤害（持续 2 回合）`,
    eff:(u)=>{ const v=G.hero==='wuseng'?(u?3:2):(G.hero==='tianshi'?(u?4:3):(G.hero==='yincha'?(u?2:1):(u?4:2)));
      if(G.hero==='yincha') loseHp(2);
      addSummon({type:'xiaogui', v, dur:2, up:!!u}); floatMsg('小鬼 · 奉命出巡'); }},
  {id:'huapi', name:'画皮', type:'spirit', rarity:'blue', cost:1,
    t:(u)=>`对目标施加 1 层【魅惑】（其下回合伤害 -${u?75:50}%）`,
    eff:(u)=>{ const t=curEnemy(); if(!t) return; charmEnemy(t, u?0.25:0.5); }},
  {id:'wutong', name:'五通神', type:'spirit', rarity:'purple', cost:2,
    t:(u)=>G.hero==='ganshiren'?`召唤五通神。立即获得 5 点格挡，之后每回合开始重复一次（持续 ${u?3:2} 回合）。若打出时【尸气】≥5，消耗 5 点【尸气】强化：立即获得 6 点格挡，之后每回合开始重复一次（持续 ${u?4:3} 回合）`
      :G.hero==='wuseng'?`召唤五通神。立即获得 ${u?6:5} 点格挡（${u?2:1} 点基础 + 首次触发 4 点）；之后每回合开始获得 4 点格挡（持续 ${u?3:2} 回合）`
      :G.hero==='yincha'?`召唤五通神。立即恢复 5 点生命；之后每回合开始恢复 5 点生命（持续 ${u?3:2} 回合）。若打出时【血怒】≥4，消耗 4 点【血怒】强化：持续 ${u?4:3} 回合`
      :`召唤五通神。立即获得 4 点格挡并对随机敌人施加 1 层【诅咒】，之后每回合开始重复一次（持续 ${u?3:2} 回合）`,
    eff:(u)=>{ // 现形即结算首回合：第一次「回合开始」效果落在当前回合（武僧 = 基础 1/2 + 首次触发 4 = 5/6 格挡）
      let wv=(G.hero==='wuseng'||G.hero==='tianshi')?4:3, wdur=u?3:2;
      if(G.hero==='wuseng'){ gainBlock(u?2:1); }
      else if(G.hero==='yincha'){ heal(5); wv=5; if(rageLayers()>=4){ G.xuenu-=4; wdur=u?4:3; log('五通神：消耗 4 点【血怒】强化'); } }
      if(G.hero==='ganshiren'){ if(hasShiqi(5)){ spendShiqi(5); wv=6; wdur=u?4:3; log('五通神：消耗 5 点【尸气】强化'); } else { wv=5; } }
      const s=addSummon({type:'wutong', v:wv, dur:wdur});
      wutongTick(s);
      floatMsg('五通神 · 现形'); }},
  {id:'zhouyu', name:'咒雨', type:'spirit', rarity:'purple', cost:{wuseng:0, default:2}, exhaust:true,
    t:(u)=>G.hero==='ganshiren'?`引爆当前所有【尸气】：清零尸气，每层尸气转化为 ${u?7:6} 点伤害，随机分配给所有敌人。消耗（一次性）`
      :G.hero==='wuseng'?`将当前全部格挡转化为等量伤害，每 1 点随机打在一个敌人身上（逐点结算）。消耗牌（一次性）`
      :G.hero==='yincha'?`对所有敌人施加 ${u?3:2} 层【诅咒】。每施加 1 层，恢复 2 点生命`
      :`对所有敌人施加 1 层【诅咒】。所有敌人每有 1 层【诅咒】，此牌费用 -1（最低 ${u?0:1}）`,
    eff:(u)=>{ if(G.hero==='ganshiren'){ const q=G.尸气||0; if(q<=0){ floatMsg('没有尸气可引爆'); log('咒雨：没有尸气可引爆'); return; }
        G.尸气=0; const total=q*(u?7:6); const al=aliveEnemies(); if(!al.length) return;
        const dist=al.map(()=>0);
        for(let i=0;i<total;i++){ dist[Math.floor(rng()*al.length)]++; }
        al.forEach((e,i)=>{ if(dist[i]>0) dealDamageTo(e,dist[i]); });
        log(`咒雨：引爆 ${q} 点【尸气】，造成 ${total} 点伤害随机分配`); floatMsg(`咒雨 · 引爆 ${q} 尸气`); return; }
      if(G.hero==='tianshi'){ aliveEnemies().forEach(e=>applyCurse(e,1)); return; }
      /* v0.61.10(P3)：咒雨·武僧 —— 格挡全转伤害，**真·逐点结算**：每 1 点＝独立一击，
         每击随机挑一个「当前存活」的敌人（某只被打死后，后面的点数重新随机，不会打在尸体上）。
         伤害本体**同步**扣完（结算顺序与一次性打 N 点等价），只有演出错开：
         飘字/受击闪/音效按 120ms 逐发，点数 >12 时自动压到 60ms；「流畅模式」直接同步批量结算
         （dealDamageTo 里 floatDamage 本就静默），末尾用 floatMsg 报总连击数。
         逐点走 point=true：跳过「攻击力加成 / 桃木剑·钱剑 / 虚弱 / 业火减伤」这类按**整张牌**口径
         设计的乘加修饰（在 1 点上会被 floor 抹成 0，或被逐点放大 N 倍），但**保留**所有逐击反应——
         格挡吸收、记名、反震、业火反噬、渡魂归己、咒印吸血，这些本来就是「每受一次伤」结算一次。 */
      if(G.hero==='wuseng'){
        const b=G.block||0;
        if(b<=0){ floatMsg('没有格挡可转化'); log('咒雨：当前没有格挡'); return; }
        G.block=0;
        let pts=b+(G.attackBuff||0)+(G.turnAtkBuff||0);
        if(G.weak>0) pts=Math.floor(pts*0.75);   // 虚弱是全局减伤：逐点 1 伤没法再乘，折算到点数上
        const smooth=!!SETTINGS.lowSpec;
        const step=smooth?0:(pts>12?60:120);     // 连击节奏：点数多时自动压缩，别让一回合拖太久
        let hits=0, total=0;
        for(let i=0;i<pts;i++){
          const al2=aliveEnemies(); if(!al2.length) break;
          const e=al2[Math.floor(rng()*al2.length)];
          total+=dealDamageTo(e,1,false,smooth?0:i*step,true);
          hits++;
          if(G.hp<=0) break;                     // 被反震/业火反噬打死：停止后续（同敌人 multi 的收尾惯例）
        }
        log(`咒雨：${b} 点格挡化为 ${hits} 连击，合计 ${total} 点伤害`);
        floatMsg(smooth?`咒雨 · ${hits} 连击 · 合计 ${total}`:`咒雨 · ${hits} 连击`);
        return;
      }
      let n=0; aliveEnemies().forEach(e=>{ n+=applyCurse(e,u?3:2); });
      heal(n*2); log(`咒雨：施加 ${n} 层诅咒，恢复 ${n*2} 点生命`); }},
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
];
const RCOLOR={white:'r-white',blue:'r-blue',purple:'r-purple',gold:'r-gold'};
const RNAME={white:'白',blue:'蓝',purple:'紫',gold:'金'};
const TNAME={attack:'攻击',defense:'防御',skill:'技能',spirit:'鬼怪',junk:'废牌'};
function cardById(id){ const c=CARDS.find(x=>x.id===id); return {...c, up:false}; }
/* 机制来源：某个关键词/流派由哪些牌提供（用于卡池过滤，避免出现"用不了"的牌） */
const GRANTS = { curse:['zhouyin','zhiren','shihunzhou','zhouyu'], summon:['zhiren','xiaogui','wutong','yinbingguo'] };
function deckHasMechanic(mech){ return GRANTS[mech].some(id=>G.deck.some(c=>c.id===id)); }
/* ===================== 英雄（初始角色选择） ===================== */
const HEROES = [
  {id:'tianshi', name:'符箓天师', desc:'精通符咒，用诅咒削弱并连锁击杀敌人。', mech:'咒印道体', passive:'【咒印道体】每回合开始对【诅咒】层数最高的敌人施加 1 层【诅咒】；施加产生的溢出（超过上限 6 层）每层转化为 1 点格挡。',
   deck:[['leifu',3],['jingang',1],['fodu',1],['juling',1],['duhunguiji',1],['zhouyin',1],['huapi',1],['shouyi',1]]},  // v0.60.02 天师初始卡池：雷符×3 金刚符×1 佛渡×1 聚灵×1 渡魂归己×1 咒印×1 画皮×1 守一×1（共 10 张）
  {id:'ganshiren', name:'茅山赶尸人', desc:'役使尸骸，靠尸气与召唤物持续输出。', mech:'尸气', passive:'每回合开始时，场上每有 1 个召唤单位，获得 1 点【尸气】。召唤单位死亡时，获得 2 点【尸气】。召唤纸人/小鬼/五通神/阴兵时，它们额外获得 1 回合寿命（尸王不受影响）。【尸气】可用于加强召唤系卡牌效果。',
   deck:[['leifu',2],['jingang',2],['fodu',1],['sheshen',1],['xueqi',1],['zhiren',1],['shi_wang',1],['shouyi',1],['xiaogui',1]]},  // v0.60.02 赶尸人初始卡池：雷符×2 金刚符×2 佛渡×1 舍身×1 血契×1 纸人×1 尸王×1 守一×1 小鬼×1（共 11 张）
  {id:'wuseng', name:'苦行武僧', desc:'以守为攻，格挡既是盾也是矛。', mech:'格挡保留', passive:'每回合开始获得 2 点格挡；回合结束未用完的格挡保留最多 3 点。',
   deck:[['leifu',2],['jingang',2],['jinzhong',1],['tiebushan',1],['xueqi',1],['fanzhen',1],['zhouyu',1],['shouyi',1]]},
  {id:'yincha', name:'血祭阴差', desc:'以血为引，燃烧生命换取爆发。', mech:'血怒 · 以血换力', passive:'【血怒】上限 10 层、整局累积（开新局才清零）。打出扣血牌时每失去 1 点生命，自动 +1 层【血怒】；带“每层 +N（上限 M）”的牌打出时消耗对应【血怒】爆发，生命越低部分牌越强。',
   deck:[['leifu',3],['jingang',2],['huofu',1],['fodu',1],['juling',1],['xueqi',1],['shouyi',1],['duhunguiji',1]]},  // v0.59 阴差初始卡池：雷符×3 金刚符×2 火符×1 佛渡×1 聚灵×1 血契×1 守一×1 渡魂归己×1（共 11 张）
];
let cardPlayWindow=false; // 阴差被动·以血引怒：doPlayCard 执行 c.eff 期间为 true
function loseHp(n){
  // 【失去生命】口径：任何来源（含敌人攻击）都计入 hpLostTurn，仅作卡面计数；不再自动触发血怒
  const c=n; // 【失去生命】按卡面数值全额扣除（删除旧“阴差自伤减半”）
  G.hp-=c;
  G.totalHpLost=(G.totalHpLost||0)+c;
  G.hpLostTurn=(G.hpLostTurn||0)+c;
  // 阴差被动·以血引怒：仅当「正在打出扣血牌」（doPlayCard 窗口内）失血时，每失去 1 点生命 +1【血怒】
  if(cardPlayWindow && G.hero==='yincha' && c>0){ const _b4=rageLayers(); gainRage(c); const _got=rageLayers()-_b4; if(_got>0){ floatMsg('🩸 血怒 +'+_got); log('以血引怒：失去 '+c+' 点生命，获得 '+_got+' 层【血怒】（现 '+rageLayers()+' 层）'); } }

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
  if(G.hp<=0){ G.hp=0; loseGame(); } // v0.61 B1：统一失血→判负口径，任何来源（洗髓经/燃血/反噬…）扣到 0 立即判负，不再负血穿牌
}
const DYNAMIC_DMG = ['tiebushan','shihun','qungui','taomufu','shixue','baigui','zhouyu'];
// 苦行武僧：伤害随「当前格挡/目标诅咒」浮动的牌 —— 卡面正文只写基础值，徽章恒定显示实时预伤害
const WUSENG_BLOCK_DMG = ['leifu','huofu','jianfu','shixue','baigui','zhenyaoling','zhanyaojian'];
const WUSENG_NO_CURSE_TAG = ['leifu','huofu','jianfu','shixue','baigui','zhenyaoling']; // 这些牌不吃【诅咒】，徽章不挂诅咒标签
// 阴差：伤害随【血怒】/本场失血/本回合失血/召唤数/目标状态浮动的牌 —— 卡面正文只写基础值，徽章恒定显示实时预伤害
const YINCHA_DYN_DMG = ['leifu','jianfu','tianlei','shihun','shixue','baigui','zhenyaoling','zhanyaojian','taomufu','zhongkui'];
const YINCHA_NO_CURSE_TAG = ['leifu','huofu','jianfu','tianlei','shihun','shixue','baigui','zhenyaoling','taomufu','zhongkui']; // C 列不吃诅咒，徽章不挂诅咒标签
// 天师：伤害随【诅咒】层数 / 当前格挡 / 召唤物浮动的牌 —— 卡面正文只写基础值，徽章恒定显示实时预伤害
const TIANSHI_DYN_DMG = ['leifu','jianfu','zhanyaojian','tiebushan','shihun','qungui','taomufu','baigui','zhongkui','zhiren'];
/* ===================== 全卡重做：流派 / 资源 / 召唤 / 状态 助手 ===================== */
const COL_A='ganshiren', COL_B='wuseng', COL_C='yincha', COL_D='tianshi';
const GHOST_IDS = ['zhiren','xiaogui','wutong','yinbingguo','zhongkui','shi_wang'];      // 【鬼怪牌】白名单（6 张）
const CAN_CURSE_IDS = ['huofu','wanjian','taomufu','shihunzhou','sheshen','fenfu','zhouyin','zhouyu']; // 无条件可施加诅咒的牌（8 张）
const isGhostCard = c => !!(c && c.type==='spirit' && GHOST_IDS.includes(c.id));
const isCanCurse  = c => !!(c && CAN_CURSE_IDS.includes(c.id));
/* —— 尸气 —— */
function gainShiqi(n){ if(!n || n<=0) return;
  tipOnce('shiqi', '<b>【尸气】</b>是茅山赶尸人的专属资源：上限 12 点、<b>整局累积不清零</b>。场上每有 1 个召唤物，回合开始就 +1；攒着可以强化【五通神】，或用【咒雨】一次引爆。');
  const __before=(G.尸气||0);
  G.尸气 = Math.min(G.maxShiQi||12, __before+n);
  if(G.尸气>__before) sfxOnce('card_shiji', 120); }   // v0.61.25：尸气真的涨了才出声，且防同帧叠音
function hasShiqi(n){ return (G.尸气||0) >= n; }
function spendShiqi(n){ if(!hasShiqi(n)) return false; G.尸气 -= n; return true; }
/* —— 血怒（不自动烧；只在使用“每层+N”效果时消耗实际用到的层数） —— */
function gainRage(n){ if(!n || n<=0) return; G.xuenu = Math.min(G.maxXuenu||10, (G.xuenu||0)+n); }
function rageLayers(){ return G.xuenu||0; }
/* per=每层加成, cap=加成上限：返回可使用的层数，并就地消耗 */
function rageSpend(per, cap){ const layers=Math.floor(cap/per); const use=Math.min(layers, rageLayers()); if(use>0){ G.xuenu -= use; } return use; }
/* —— 召唤 —— */
/* v0.61.10(P6)：赶尸人新被动 —— 召唤【纸人/小鬼/五通神/阴兵】时寿命 +1 回合。
   收口在这一处，所以「升级版卡面自带的 dur 提升」与被动**叠算**，但被动只加一次（不会 +2）。
   尸王（shi_wang）是亡灵本体、不属召来的役使，明确排除在外。 */
const SUMMON_LIFE_TYPES = ['zhiren','xiaogui','wutong','yinbing'];
function addSummon(o){ G.summonsMadeTurn=(G.summonsMadeTurn||0)+1;
  if(G.hero==='ganshiren' && SUMMON_LIFE_TYPES.indexOf(o.type)>=0) o.dur=(o.dur||0)+1;
  tipOnce('summon', '<b>召唤物</b>不算「敌人」—— 它站在你这边，每回合结束自动结算一次自己的效果（打人 / 给你格挡 / 回血），寿命归零就消散。敌人血条下面那排小字就是它们的剩余回合数。');
  G.summons.push(o); return o; }
/* 五通神「回合开始」效果（现形当回合立即结算一次，之后每个回合开始再触发；寿命 -1） */
function wutongTick(s){
  const b=s.v||3;
  if(G.hero==='yincha'){ heal(b); log(`五通神：恢复 ${b} 点生命`); }
  else {
    gainBlock(b);
    if(G.hero==='ganshiren'){ log(`五通神：获得 ${b} 点格挡`); }
    else if(G.hero==='tianshi'){ const wt=randomAlive(); if(wt) applyCurse(wt,1); log(`五通神：获得 ${b} 点格挡并对随机敌人施加 1 层【诅咒】`); }
    else log(`五通神：获得 ${b} 点格挡`);
  }
  if(!s.indefinite) s.dur--;
}
function isSummon(type){ return G.summons.some(s=>s.type===type && s.dur>0); }
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
}
function summonTarget(preferCursed){
  const al=aliveEnemies(); if(!al.length) return null;
  if(preferCursed){ const cu=al.filter(e=>(e.curse||0)>0); if(cu.length) return cu[Math.floor(rng()*cu.length)]; }
  return al[Math.floor(rng()*al.length)];
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


/* ===================== 遗物数据（8 个） ===================== */
const RELICS = [
  {id:'zhaohunfan', name:'招魂幡', rarity:'white', desc:'每场战斗开始恢复 3 点生命'},
  {id:'zhushabi', name:'朱砂笔', rarity:'white', desc:'攻击牌伤害 +2'},
  {id:'jifengfu', name:'疾风符', rarity:'purple', desc:'每回合第 1 张技能牌符文 -1（最低 0）'},
  {id:'taomujian', name:'桃木剑', rarity:'blue', desc:'对鬼怪/僵尸类敌人伤害 +25%'},
  {id:'yinyangjing', name:'阴阳镜', rarity:'blue', desc:'每回合多抽 1 张牌'},
  {id:'jubaopen', name:'聚宝盆', rarity:'blue', desc:'战斗获得金币 +50%'},
  {id:'daoxin', name:'道心', rarity:'white', desc:'每场战斗首次受致命伤时，改为保留 1 点生命'},
  {id:'baiguilu', name:'百鬼录', rarity:'gold', desc:'每击败 1 个精英，永久 +5 最大生命'},
  {id:'hushenfu', name:'护身符', rarity:'purple', desc:'每回合开始获得 2 点格挡'},
  {id:'tongqianjian', name:'铜钱剑', rarity:'blue', desc:'对「妖」类敌人伤害 +25%'},
  {id:'fanhunxiang', name:'返魂香', rarity:'purple', desc:'战斗胜利后额外恢复 10 点生命'},
  {id:'shehunling', name:'摄魂铃', rarity:'gold', desc:'每打出一张攻击牌，恢复 2 点生命'},
];
function hasRelic(id){ return G && G.relics.includes(id); }
function relById(id){ return RELICS.find(r=>r.id===id); }

/* ===================== 灵汁（战斗消耗品，类药水） ===================== */
const POTIONS = [
  {id:'huanyanglu', name:'还阳露', desc:'恢复 10 点生命', eff:()=>heal(10)},
  {id:'huangquanjiu', name:'黄泉酒', desc:'获得 2 点符文', eff:()=>{ G.energy+=2; floatMsg('符文 +2'); }},
  {id:'zhenhunshui', name:'镇魂水', desc:'获得 10 点格挡', eff:()=>gainBlock(10)},
  {id:'mengpotang', name:'孟婆汤', desc:'抽 2 张牌', eff:()=>drawCards(2)},
];
function randomPotion(){ const p=POTIONS[Math.floor(rng()*POTIONS.length)]; return {...p}; }
function potionSummary(){
  const m={};
  G.potions.forEach(p=>{ m[p.name]=(m[p.name]||0)+1; });
  return Object.entries(m).map(([name,n])=>`🧪${name}×${n}`).join(' ');
}
function potionTooltipHTML(){
  if(!G.potions.length) return '';
  const m={}; G.potions.forEach(p=>{ m[p.name]=(m[p.name]||0)+1; });
  return `<div class="tt-title">🧪 灵汁</div>`+Object.entries(m).map(([name,n])=>{ const p=G.potions.find(x=>x.name===name); return `<div class="tt-line">${name} ×${n}：${p?p.desc:''}</div>`; }).join('');
}
function showPotionSelect(){
  if(!G.potions.length){ floatMsg('没有灵汁'); return; }
  const html=G.potions.map((p,i)=>`<div class="relic r-blue" data-tip="potion:${i}" onclick="usePotion(${i})"><div class="cname">${p.name}</div><div class="cdesc">点击使用 · 悬停查看效果</div></div>`).join('');
  showOverlay(`<h2>使 用 灵 汁</h2><p>点击一瓶灵汁使用（战斗消耗，本局保留直到使用）</p><div class="reward-cards">${html}</div><button class="btn ghost" onclick="hideOverlay()">返回</button>`);
}
function usePotion(i){
  const p=G.potions[i]; if(!p) return;
  p.eff(); G.potions.splice(i,1); sfx('heal');
  log(`使用灵汁【${p.name}】`); hideOverlay(); render();
}
function potionBagHTML(){
  if(!G.potions.length) return '';
  const m={}; const order=[];
  G.potions.forEach(p=>{ if(!m[p.name]){ m[p.name]=1; order.push(p.name); } else m[p.name]++; });
  const items=order.map(name=>`<span style="cursor:pointer;white-space:nowrap" data-tip="potionname:${name}" onclick="event.stopPropagation();usePotionByName('${name}')">${name}${m[name]>1?`×${m[name]}`:''}</span>`).join('　');
  return `<span class="stat" style="color:#c86bd8">🧪灵汁：${items}</span>`;
}
function usePotionByName(name){
  const i=G.potions.findIndex(p=>p.name===name);
  if(i<0) return;
  const p=G.potions[i];
  p.eff(); G.potions.splice(i,1); sfx('heal');
  log(`使用灵汁【${p.name}】`); render();
}

/* ===================== 废牌（敌人怨气机制） ===================== */
function junkCard(){ return {id:'yuanqi', name:'怨气', type:'junk', rarity:'white', cost:0, t:()=>'废牌 · 打出时失去 3 点生命（若不打出，回合结束自动打出）', eff:()=>{ directDamage(3, '怨气噬心：失去 3 点生命'); }}; }
function addJunkToHand(n){ for(let i=0;i<n;i++){ if(G.hand.filter(c=>c.type==='junk').length>=3){ log('怨气已达上限（最多 3 张），不再塞入废牌'); return; } G.hand.push(junkCard()); } log('怨气缠身：一张【怨气】废牌塞入你的手牌'); }
function clearJunk(){
  const n=G.hand.filter(c=>c.type==='junk').length;
  if(n>0){ G.hand=G.hand.filter(c=>c.type!=='junk'); floatMsg('怨气驱散'); log(`驱散怨气缠身：${n} 张【怨气】废牌消失`); }
}
function clearPlayerDebuffs(){
  // 清除可解除的负面状态；【忘忧】（孟婆汤）为专属机制，不可解除
  const had = G.weak || G.gouhun || G.burn || G.karmaFire || G.pendingDiscard;
  G.weak=0; G.gouhun=0; G.burn=0; G.karmaFire=0; G.pendingDiscard=0;
  if(had) log('负面状态已清除');
  return had;
}

/* ===================== Hover 简介（tooltip） ===================== */
function tooltipEl(){
  let el=document.getElementById('tooltip');
  if(!el){ el=document.createElement('div'); el.id='tooltip'; document.body.appendChild(el); }
  return el;
}
function showTip(html, ev){
  const el=tooltipEl(); el.innerHTML=html; el.classList.add('show');
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
    const icon=KIND_ICON[def.kind]||'';
    const badge=def.boss?'👹 Boss':def.elite?'☠ 精英':'';
    const hp=live?`${live.hp}/${live.maxHp}`:`${def.hp}`;
    const intent=live?intentText(live):'';
    const mech=BOSS_MECH[key]||'';
    return `<div class="tt-title">${icon}${def.name} ${badge}</div><div class="tt-line">生命 ${hp}</div>${intent?`<div class="tt-line">意图：${intent}</div>`:''}${mech?`<div class="tt-line" style="color:var(--gold)">机制：${mech}</div>`:''}<div class="tt-story">${STORIES[key]||''}</div>`;
  }
  if(type==='relic'){ const r=relById(key); return r?`<div class="tt-title">${r.name} <span style="font-size:11px;color:var(--dim)">${RNAME[r.rarity]}</span></div><div class="tt-line">${r.desc}</div>`:''; }
  if(type==='hero'){ const h=HEROES.find(x=>x.id===key); return h?`<div class="tt-title">${h.name}</div><div class="tt-line">${h.desc}</div><div class="tt-line" style="color:var(--gold)">被动 · ${h.passive}</div>`:''; }
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
/* 关闭 tooltip：点击空白处、或按 ESC（触屏上 tap 后的提示可这样轻松关掉） */
/* v0.61.25：全局按钮点击音 —— 原来全项目零按钮音。只对可点元素出声，
   免得拖卡、点空白也响；40ms 节流防抖。抽成具名函数是为了冒烟能直接喂假事件验它。 */
function onDocClick(e){
  try{
    const bt=e.target && e.target.closest ? e.target.closest('button,.btn,[onclick],.map-node,[role="button"]') : null;
    if(bt) sfxOnce('ui_click', 40);
  }catch(err){}
  if(!(e.target && e.target.closest && e.target.closest('[data-tip]'))) hideTip();
}
document.addEventListener('click', onDocClick);
document.addEventListener('keydown', function(e){ if(e.key==='Escape') hideTip(); });
/* 按英雄取费用：数值＝全英雄通用；对象＝{ganshiren:0, default:2}（如附灵术 A 列免费、D 列升级 1 费） */
function _costPick(v){ if(v==null) return null; if(typeof v!=='object') return v; return v[G.hero]!=null?v[G.hero]:(v.default!==undefined?v.default:null); }
function cardCost(c){ const u=_costPick(c.costU); return c.up && u!=null ? u : _costPick(c.cost); }
function effectiveCost(c){
  let cost=cardCost(c);
  if(c.tempCostCut) cost=Math.max(0, cost-c.tempCostCut); // v0.61.10(P11)：易物换入的牌本回合费用 -1
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
  // 咒雨(#46) D 天师：敌人身上诅咒总层数每 1 层 -1 费（文档：下限 1，升级后下限 0）
  if(c.id==='zhouyu' && G.hero==='tianshi'){
    const fl=c.up?0:1;
    cost=Math.max(fl, cost - aliveEnemies().reduce((s,e)=>s+(e.curse||0), 0));
  }
  // 钟馗镇魂(#14) B 武僧：格挡分别达到 12/15/21 时费用 -1/-2/-3
  if(c.id==='zhongkui' && G.hero==='wuseng'){
    const blk=G.block||0;
    const red = blk>=21 ? 3 : blk>=15 ? 2 : blk>=12 ? 1 : 0;
    cost=Math.max(0,cost-red);
  }
  return cost;
}

/* ===================== 敌人数据（Boss / 精英 / 小怪） ===================== */
const ENEMIES = {
  youhun:{name:'游魂', hp:24, kind:'ghost', intents:[{type:'attack',v:6},{type:'charge',v:4}]},
  zhizharen:{name:'纸扎人', hp:28, kind:'ghost', intents:[{type:'attack',v:8},{type:'block',v:6}]},
  huyao:{name:'狐妖', hp:26, kind:'yao', intents:[{type:'attack',v:7},{type:'weak'}]},
  jiangshi:{name:'僵尸', hp:34, kind:'jiangshi', intents:[{type:'attack',v:9},{type:'heal',v:5}]},
  shanxiao:{name:'山魈', hp:30, kind:'yao', aggressive:true, intents:[{type:'attack',v:6},{type:'multi',n:3,v:3}]},
  shuigui:{name:'水鬼', hp:28, kind:'ghost', aggressive:true, intents:[{type:'attack',v:6},{type:'discard'}]},
  mengpo:{name:'孟婆鬼', hp:32, kind:'ghost', aggressive:true, intents:[{type:'attack',v:7},{type:'discard'}]},
  baiwuchang:{name:'白无常', hp:50, kind:'ghost', elite:true, aggressive:true, intents:[{type:'attack',v:12},{type:'gouhun'},{type:'attack',v:12}]},
  heiwuchang:{name:'黑无常', hp:52, kind:'ghost', elite:true, aggressive:true, intents:[{type:'attack',v:12},{type:'strength',v:2}]},
  huapigui:{name:'画皮鬼', hp:46, kind:'ghost', elite:true, aggressive:true, intents:[{type:'attackBlock',v:8,block:6},{type:'attack',v:12}]},
  yecha:{name:'夜叉', hp:55, kind:'ghost', elite:true, aggressive:true, intents:[{type:'charge',v:8},{type:'attack',v:14}]},
  jiangwang:{name:'僵王', hp:120, kind:'jiangshi', boss:true, intents:[{type:'multi',n:2,v:6},{type:'summon',n:2},{type:'multi',n:2,v:7},{type:'strength',v:3}]},
  xiebian:{name:'谢必安', hp:180, kind:'ghost', boss:true, aggressive:true, split:true, intents:[{type:'multi',n:2,v:8},{type:'gouhun'},{type:'multi',n:2,v:9}]},
  bian:{name:'必安', hp:90, kind:'ghost', boss:true, aggressive:true, intents:[{type:'multi',n:2,v:4},{type:'gouhun'},{type:'multi',n:2,v:4}]},
  yewang:{name:'夜王', hp:220, kind:'ghost', boss:true, aggressive:true, intents:[{type:'multi',n:2,v:9},{type:'strength',v:3,weak:true}]},
  hanba:{name:'旱魃', hp:110, kind:'jiangshi', boss:true, aggressive:true, intents:[{type:'multi',n:2,v:6},{type:'burn',v:1},{type:'multi',n:2,v:8},{type:'strength',v:2}]},
  xueshi:{name:'血尸', hp:110, kind:'jiangshi', boss:true, aggressive:true, lifesteal:0.8, intents:[{type:'multi',n:2,v:7},{type:'charge',v:8},{type:'multi',n:2,v:10},{type:'strength',v:2}]},
  panguanwang:{name:'判官王', hp:170, kind:'ghost', boss:true, aggressive:true, intents:[{type:'multi',n:2,v:6},{type:'jiming'},{type:'multi',n:2,v:7},{type:'qingsuan'}]},
  mengpowang:{name:'孟婆', hp:155, kind:'ghost', boss:true, aggressive:true, intents:[{type:'multi',n:2,v:7},{type:'wangyou'},{type:'multi',n:2,v:8},{type:'strength',v:2,sealHeal:true}]},
  xiuluowang:{name:'修罗王', hp:210, kind:'yao', boss:true, aggressive:true, intents:[{type:'multi',n:2,v:8},{type:'yehuo'},{type:'multi',n:2,v:9},{type:'strength',v:2}]},
  yanluotianzi:{name:'阎罗天子', hp:230, kind:'ghost', boss:true, aggressive:true, phase:true, bossAffix:true, intents:[{type:'multi',n:2,v:8},{type:'summon',n:1,unit:'yinchai'},{type:'multi',n:2,v:9},{type:'strength',v:2}], intents2:[{type:'multi',n:2,v:10},{type:'multi',n:2,v:11},{type:'multi',n:2,v:11},{type:'strength',v:3}]},
  yinchai:{name:'阴差', hp:14, kind:'ghost', summon:true, intents:[{type:'attack',v:8}]},
  xiaojianshi:{name:'小僵尸', hp:6, kind:'jiangshi', summon:true, intents:[{type:'attack',v:6}]},
  niutou:{name:'牛头', hp:42, kind:'ghost', intents:[{type:'attack',v:10},{type:'block',v:10}]},
  mamian:{name:'马面', hp:38, kind:'ghost', intents:[{type:'multi',n:2,v:7},{type:'attack',v:10}]},
  wangchuan:{name:'忘川鬼', hp:36, kind:'ghost', aggressive:true, intents:[{type:'attack',v:9},{type:'gouhun'}]},
  panguan:{name:'判官', hp:46, kind:'ghost', aggressive:true, intents:[{type:'attack',v:11},{type:'weak'}]},
  juhunshi:{name:'拘魂使', hp:62, kind:'ghost', elite:true, aggressive:true, intents:[{type:'attack',v:14},{type:'gouhun'},{type:'attack',v:14}]},
  niumamian:{name:'牛头马面', hp:70, kind:'ghost', elite:true, aggressive:true, intents:[{type:'attack',v:12},{type:'strength',v:3},{type:'multi',n:2,v:9}]},
  xiuluo:{name:'修罗', hp:48, kind:'yao', aggressive:true, intents:[{type:'attack',v:13},{type:'strength',v:2}]},
  luosha:{name:'罗刹', hp:52, kind:'yao', intents:[{type:'attack',v:12},{type:'attack',v:12},{type:'heal',v:8}]},
  mingwei:{name:'幽冥守卫', hp:50, kind:'ghost', intents:[{type:'block',v:8},{type:'attack',v:11}]},
  yanluo:{name:'阎罗', hp:58, kind:'ghost', aggressive:true, intents:[{type:'attack',v:15},{type:'gouhun'},{type:'attack',v:13}]},
  xiuluojiang:{name:'修罗将', hp:80, kind:'yao', elite:true, aggressive:true, intents:[{type:'attack',v:16},{type:'multi',n:3,v:8}]},
};
let UID=0;
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
/* Boss 特色机制说明（tooltip 显示，标明各 Boss 的独有机制） */
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
const MAX_ENEMY_STRENGTH = 8;          // 敌人力量成长封顶（防血尸无限拉锯/词缀/二阶段叠高）
const LIFESTEAL_HEAL_CAP_RATIO = 1.5;    // 吸血回复封顶 = maxHp×150%（仍可突破 100% 上限）
function addEnemyStrength(e, n){ e.strength = Math.min((e.strength||0) + n, MAX_ENEMY_STRENGTH); }
function makeEnemy(def, key){
  // 难度：普通生命+25%/攻击+25%，精英生命+40%/攻击+30%，Boss生命+60%/攻击+40%；召唤物与其余属性（格挡/回血/蓄力/力量/词缀等）不变
  const summon = !!def.summon;
  const hpMul = summon ? 1 : (def.boss ? 1.6 : def.elite ? 1.4 : 1.25);
  const atkMul = summon ? 1 : (def.boss ? 1.4 : def.elite ? 1.3 : 1.25);
  // 无尽：随层数线性成长（召唤物除外）
  const endMul = (!summon && G && G.endless) ? (1 + (G.endlessFloor||0)*ENDLESS_GROWTH) : 1;
  const hp = Math.round(def.hp * hpMul * endMul);
  const scaleAtk = it => { const c={...it}; if(c.v && (c.type==='attack'||c.type==='multi'||c.type==='attackBlock')) c.v=Math.round(c.v*atkMul*endMul); return c; };
  const intents = def.intents.map(scaleAtk);
  const intents2 = def.intents2 ? def.intents2.map(scaleAtk) : null;
  const e = {key:key, name:def.name, hp, maxHp:hp, block:0, pingbi:0, intents, intentIndex:0, intent:{type:'dormant'}, pendingDamage:0, curse:0, charm:0, charmPct:0.5, charmUsed:false, sealedEver:false, seal:false, strength:0, kind:def.kind, elite:!!def.elite, boss:!!def.boss, aggressive:!!def.aggressive, lifesteal:def.lifesteal||0, phase:!!def.phase, phase2:false, intents2, ledgerActive:false, ledgerDmg:0, ledgerAffix:null, split:!!def.split, splitDone:false, sealedCost:0, uid:UID++};
  e.affixes = rollAffixes(def);
  if(def.bossAffix && !e.affixes.length){ const a=AFFIXES[Math.floor(rng()*AFFIXES.length)]; e.affixes=[{id:a.id, tier:1}]; }
  if(e.affixes.length){ const pb=e.affixes.find(a=>a.id==='pingbi'); if(pb){ e.block=8*pb.tier; e.pingbi=8*pb.tier; } }
  return e;
}
function rollAffixes(def){
  if(!G || def.boss) return [];
  let count;
  if(G.endless){
    // 无尽：词缀随层数叠加（每 2 层 +1，精英 +1，上限 6 条）
    count = Math.min(6, 1 + Math.floor((G.endlessFloor||0)/2) + (def.elite?1:0));
  } else {
    const act = G.act||1;
    // 难度靠「词缀叠加」而非数值翻倍：第三幕敌人携带更多（不同）词缀
    count = act===1 ? (def.elite ? 1 : 0) : act===2 ? (def.elite ? 2 : 1) : (def.elite ? 3 : 2);
  }
  return shuffle(AFFIXES.slice()).slice(0,count).map(a=>({id:a.id, tier:1}));
}
/* 节点化 Run：三幕地图（Boss 不同，敌人靠幕间系数增强） */
const ACT1 = [
  [{t:'fight',e:['youhun','youhun']},       null,                                       {t:'fight',e:['youhun','zhizharen']},       {t:'fight',e:['zhizharen','youhun']}],
  [{t:'fight',e:['huyao','shuigui']},       null,                                       null,                                       {t:'fight',e:['jiangshi','youhun']}],
  [null,                                     {t:'unknown'},                             {t:'fight',e:['youhun','mengpo']},         null],
  [null,                                     null,                                       {t:'fight',e:['jiangshi','shanxiao']},      null],
  [null,                                     {t:'fight',e:['shuigui','jiangshi']},      {t:'camp'},                                 {t:'fight',e:['huyao','shanxiao']}],
  [{t:'fight',e:['jiangshi','jiangshi']},    null,                                       {t:'fight',e:['huyao','shanxiao']},         null],
  [{t:'unknown'},                             null,                                       null,                                       {t:'fight',e:['shuigui','yecha']}],
  [null,                                     {t:'fight',e:['huyao','jiangshi','shanxiao']}, {t:'fight',e:['youhun','mengpo']},       null],
  [{t:'shop'},                               null,                                       {t:'unknown'},                              null],
  [null,                                     {t:'fight',e:['youhun','huapigui']},       null,                                       {t:'fight',e:['shuigui','jiangshi']}],
  [{t:'fight',e:['huyao','jiangshi']},       {t:'camp'},                                 null,                                       {t:'fight',e:['youhun','mengpo']}],
  [null,                                     {t:'fight',e:['jiangshi','shanxiao','shuigui']}, {t:'fight',e:['huyao','jiangshi']},       null],
  [null,                                     {t:'shop'},                                 {t:'fight',e:['youhun','youhun']},          {t:'fight',e:['huyao','shanxiao']}],
  [null,                                     null,                                       {t:'boss'},                                 null],
];

function swapMap(src, swap){
  return src.map(row=>row.map(node=>{
    if(!node) return null;
    if(node.t!=='fight') return {...node};
    return {t:'fight', e:node.e.map(k=>swap[k]||k)};
  }));
}
const ACT2_SWAP = {youhun:'wangchuan', zhizharen:'niutou', huyao:'mamian', jiangshi:'panguan', shanxiao:'niutou', shuigui:'wangchuan', mengpo:'wangchuan', baiwuchang:'juhunshi', heiwuchang:'juhunshi', huapigui:'niumamian', yecha:'niumamian'};
const ACT3_SWAP = {youhun:'mingwei', zhizharen:'luosha', huyao:'xiuluo', jiangshi:'yanluo', shanxiao:'xiuluo', shuigui:'mingwei', mengpo:'yanluo', baiwuchang:'xiuluojiang', heiwuchang:'yecha', huapigui:'xiuluojiang', yecha:'yecha'};
const ACT2 = swapMap(ACT1, ACT2_SWAP);
const ACT3 = swapMap(ACT1, ACT3_SWAP);
// 第三幕最终 Boss 后无需篝火（击败后直接通关）
ACT3[ACT3.length-1] = ACT3[ACT3.length-1].map(n => (n && n.t==='camp') ? null : n);
const ACTS = [ACT1, ACT2, ACT3];
const ACT_NAMES = ['第一幕 · 乱葬岗', '第二幕 · 黄泉路', '第三幕 · 幽冥塔', '镇妖塔 · 无尽'];
let MAP = ACTS[0];

/* ===================== 镇妖塔 · 无尽模式 ===================== */
const ENDLESS_MINIONS = ['youhun','zhizharen','huyao','jiangshi','shanxiao','shuigui','mengpo','niutou','mamian','wangchuan','panguan','xiuluo','luosha','mingwei','yanluo'];
const ENDLESS_ELITES = ['baiwuchang','heiwuchang','huapigui','yecha','juhunshi','niumamian','xiuluojiang'];
const ENDLESS_BOSSES = ['jiangwang','hanba','xueshi','xiebian','panguanwang','mengpowang','yewang','xiuluowang','yanluotianzi'];
const ENDLESS_GROWTH = 0.06; // 每爬 1 层，敌人生命/攻击 +6%
function randEndlessFight(){
  // 15% 概率刷精英（单个），否则 2~3 个小怪；词缀由 rollAffixes 按层数叠加
  if(rng()<0.15) return [ENDLESS_ELITES[Math.floor(rng()*ENDLESS_ELITES.length)]];
  const n = rng()<0.5 ? 2 : 3;
  return shuffle(ENDLESS_MINIONS.slice()).slice(0,n);
}
function genEndlessMap(){
  // 复用 ACT1 节点骨架（保证节奏 + 可达性），敌人随机化，难度靠 endlessFloor 成长
  return ACT1.map(row=>row.map(node=>{
    if(!node) return null;
    if(node.t==='fight') return {t:'fight', e:randEndlessFight()};
    return {...node};
  }));
}

/* ===================== 金卡补偿值系统 ===================== */
// 【动态稀有度系统】金卡补偿值变量（用于动态稀有度概率）
let goldCompensation = 0; // v0.61 B6：开局改从 0 起（原 -0.05 会让前 5 场精英/商店金卡概率恒为 0）；出金后仍重置 -0.05 防连金

// 【动态稀有度系统】基础概率配置表
const RARITY_BASE_PROBABILITIES = {
  normal: { white: 0.60, blue: 0.37, purple: 0.03, gold: 0.00 },
  elite: { white: 0.40, blue: 0.35, purple: 0.20, gold: 0.05 },
  boss: { white: 0.00, blue: 0.00, purple: 0.40, gold: 0.60 },
  shop: { white: 0.50, blue: 0.35, purple: 0.10, gold: 0.05 },
  starter: { white: 0.60, blue: 0.35, purple: 0.05, gold: 0.00 }
};

/**
 * 【动态稀有度系统】更新金卡补偿值
 * @param {boolean} hasGold - 是否获得了金卡
 */
function updateGoldCompensation(hasGold) {
  if (hasGold) {
    goldCompensation = -0.05; // 出现金卡时重置为-5%
  } else {
    goldCompensation = Math.min(goldCompensation + 0.01, 0.30); // 未出金卡时+1%，上限30%
  }

  // 限制补偿值在合理范围内 (-5% 到 30%)
  goldCompensation = Math.max(-0.05, Math.min(0.30, goldCompensation));
}

/**
 * 【动态稀有度系统】获取调整后的金卡概率
 * @param {string} tier - 战斗类型 (normal, elite, boss, shop, starter)
 * @returns {number} 调整后的金卡概率
 */
function getAdjustedGoldProbability(tier) {
  const baseGoldProb = RARITY_BASE_PROBABILITIES[tier]?.gold || 0;

  // Boss战不受补偿值影响
  if (tier === 'boss') {
    return baseGoldProb;
  }

  // 计算调整后的概率
  const adjustedProb = baseGoldProb + goldCompensation;

  // 限制概率范围 [0, 0.95] (不能超过95%避免其他卡牌概率为负)
  return Math.max(0, Math.min(adjustedProb, 0.95));
}

/**
 * 【动态稀有度系统】滚动确定卡牌稀有度（支持动态补偿）
 * @param {string} tier - 战斗类型 (normal, elite, boss, shop, starter)
 * @returns {string} 稀有度 (white, blue, purple, gold)
 */
function rollCardRarity(tier) {
  const probs = RARITY_BASE_PROBABILITIES[tier];
  if (!probs) {
    return 'white'; // 默认返回白色
  }

  // 根据战斗类型计算实际概率
  let whiteProb = probs.white;
  let blueProb = probs.blue;
  let purpleProb = probs.purple;
  let goldProb = getAdjustedGoldProbability(tier);

  // 如果不是Boss战，重新计算其他颜色的概率以确保总和为100%
  if (tier !== 'boss' && goldProb > 0) {
    // 调整后需要重新分配其他卡牌的概率，保证总数为1
    const otherProbTotal = whiteProb + blueProb + purpleProb;
    if (otherProbTotal + goldProb > 1.0) {
      // 缩放其他概率，确保总和为1
      const scaleFactor = (1.0 - goldProb) / otherProbTotal;
      whiteProb *= scaleFactor;
      blueProb *= scaleFactor;
      purpleProb *= scaleFactor;
    }
  }

  // 生成随机数
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

