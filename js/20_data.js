/* ============================================================================
 * 志怪塔 · js/20_data.js —— 数据层
 * 关键词 / CARDS / HEROES / 资源·召唤·状态助手 / RELICS / POTIONS / ENEMIES / 词缀 / 地图表 / 稀有度概率
 * ----------------------------------------------------------------------------
 * 由 原型.html 的整段内联脚本按原顺序切分而来（v0.61.05 三层重构，纯搬移）。
 * 拼接校验：本文件组去掉各自横幅后，应与切分前的内联脚本正文逐字节一致。
 * 加载：经典外链脚本（非 ES module），双击本地打开即可直接游玩。
 * ============================================================================ */
/* ===================== 关键词说明 ===================== */
const KEYWORDS = [
  ['格挡','抵消伤害的临时护盾：敌人攻击时先扣格挡，扣完才掉血。默认回合结束清零；苦行武僧未用完的保留最多 3 点，【卸甲】期间不清零。'],
  ['预格挡','下一回合开始时，场上召唤单位将为你带来的预计格挡值（格挡旁蓝色 ↑）。仅苦行武僧显示，用于提前规划攻防。'],
  ['预恢复','在这回合之后，场上召唤单位将为你带来的预计生命回复总量（＝召唤物攻击吸血 ＋ 五通神的回合开始回血 ＋ 小鬼消散回血 ＋ 骨铃按持续回合返魂 ＋ 渡魂归己的伤害转化；多个来源重叠时一并累加）。玩家面板血量旁绿色 ＋ 显示。'],
  ['预尸气','下一回合开始时，场上召唤物将为你带来的预计【尸气】总量（＝本回合末消散的召唤物的死亡返还 ＋ 下回合开始的「每个存活召唤物 +1」）。仅茅山赶尸人显示，用于提前规划召唤节奏。'],
  ['预血怒','下一回合末，场上存活的小鬼将为你带来的预计【血怒】层数（每个能撑过下回合末的小鬼 +1）。仅血祭阴差显示，用于提前规划召唤与爆发节奏。'],
  ['诅咒','叠加在敌人身上的资源标记（上限 6 层，每回合末 -2）。本身不增伤，而是被「斩妖剑」「噬魂术」等引爆换取伤害。'],
  ['诅咒牌','可施加诅咒的牌（10 张）：火符、万剑归宗、桃木符、蚀魂咒、舍身、焚符、咒印、咒雨、纸人、点咒符。'],
  /* v0.63.0：用户指出「在天师牌库里，噬魂咒不适合消耗」—— 核实后：噬魂术**从来**不是消耗牌
     （isOneUse 按 exhaust 字段判，卡面也没有消耗 chip），病在它的自述用了「消耗」二字，
     读起来像游戏的【消耗】机制；而它自己的战斗日志写的正是「引爆 N 层」。
     所以这里立一个关键词把两者的差别说清，卡面文案随后统一改成「引爆」。 */
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

/* ===================== 卡牌数据（44 张） ===================== */
const CARDS = [
/* —— 攻击 1~14（A赶尸人 / B武僧 / C阴差 / D天师 四列自动按英雄生效） —— */
  {id:'leifu', name:'雷符', type:'attack', rarity:'white', cost:1,
    t:(u)=>G.hero==='ganshiren'?`造成 ${u?7:5} 伤害。场上每有 1 个召唤单位，伤害 +1；若击杀敌人，获得 ${u?3:2} 点【尸气】`
      :G.hero==='wuseng'?`造成 ${u?6:4} 伤害。每有 ${u?2:3} 点当前格挡，伤害 +1（上限 +6）`
      :G.hero==='yincha'?`造成 ${u?8:4} 伤害。每层【血怒】使此牌伤害 +3（上限 +6），打出时消耗对应【血怒】；若以此牌击杀敌人，获得 2 层【血怒】`
      :`造成 ${u?9:6} 伤害。若目标带【诅咒】，消耗 1 层，伤害 +${u?4:3}`,
    eff:(u)=>{ const t=curEnemy(); if(!t) return; let d=(G.hero==='tianshi'?(u?9:6):G.hero==='yincha'?(u?8:4):(u?6:4));
      if(G.hero==='ganshiren'){ d=(u?7:5)+G.summons.filter(s=>s.dur>0).length; }
      else if(G.hero==='wuseng') d+=Math.min(6,Math.floor((G.block||0)/(u?2:3)));
      else if(G.hero==='yincha') d+=3*rageSpend(3,6);
      else if(t.curse>0){ d+=(u?4:3); }   // v0.61.35 天师列：+3 → +3/+4
      const before=t.hp;
      dealDamageTo(t,d);
      /* v1.0.13：诅咒改成**结算之后**才消耗 —— 原先在伤害落下前就扣掉，
         满 6 层时这一扣当场变成 5 层，太上咒箓的「满 6 层 +25%」永远吃不到。 */
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
    eff:(u,c)=>{ const t=curEnemy(); if(!t) return; let d=G.hero==='tianshi'?(u?10:6):(u?7:5);   // v0.61.35 天师列：5/8 → 6/10
      if(G.hero==='ganshiren') d=(u?7:5);
      if(G.hero==='wuseng') d+=Math.min(6,Math.floor((G.block||0)/(u?2:3)));
      if(G.hero==='yincha'){ d=(u?10:6); loseHp(2); }
      if(G.hero==='ganshiren'){ startHuofuSelect(c, u, t, d); return; } // A 列：先挑要弃的手牌，确认后才结算伤害（v0.61 B7：可取消、可回退）
      dealDamageTo(t,d);
      if(G.hero==='tianshi') applyCurse(t,1);
      if(G.hero==='yincha') return; // C 列：只造成伤害并失去生命，不弃牌
      discardRandomHand(); }},
  {id:'jianfu', name:'剑符', type:'attack', rarity:'white', cost:2,
    t:(u)=>G.hero==='ganshiren'?`造成 ${u?16:12} 伤害。消耗 3 点【尸气】，伤害翻倍`
      :G.hero==='wuseng'?`造成 ${u?12:8} 伤害。消耗全部格挡，每消耗 2 点格挡此牌伤害 +1（无上限）`
      :G.hero==='yincha'?`造成 12 伤害。本回合每失去 1 点生命，此牌伤害 +${u?2:1}`
      :`造成 ${u?17:12} 伤害。若目标【诅咒】≥3 层，消耗 3 层并使伤害翻倍`,
    eff:(u)=>{ const t=curEnemy(); if(!t) return; let d;
      if(G.hero==='wuseng'){ d=(u?12:8)+Math.floor(G.block/2); G.block=0; }
      else if(G.hero==='yincha'){ d=12+(G.hpLostTurn||0)*(u?2:1); }
      else if(G.hero==='tianshi'){ d=(u?17:12); if(t.curse>=3){ d*=2; log('剑符：消耗 3 层【诅咒】，伤害翻倍'); } }   // v1.0.18 全列 +2
      else { d=(u?16:12); if(hasShiqi(3)){ spendShiqi(3); d*=2; log('剑符：消耗 3 点【尸气】，伤害翻倍'); } }
      dealDamageTo(t,d);   // v1.0.13：诅咒消耗挪到结算之后（同雷符，见上面那条注释）
      if(G.hero==='tianshi' && (t.curse||0)>=3) t.curse-=3; }},
  {id:'zhanyaojian', name:'斩妖剑', type:'attack', rarity:'purple', cost:2,
    t:(u)=>G.hero==='ganshiren'?`造成 ${u?12:7} 伤害。场上每有 1 个召唤单位，额外造成 2 点伤害`
      :G.hero==='wuseng'?`造成 ${u?12:8} 伤害。若目标带有【诅咒】，额外造成 6 点伤害`
      :G.hero==='yincha'?`造成 ${u?14:10} 伤害。若目标带有【诅咒】，额外造成 ${u?6:4} 伤害`
      :`造成 ${u?12:10} 伤害。引爆目标 2 层【诅咒】（每层 ${u?7:5} 伤害）`,
    eff:(u)=>{ const t=curEnemy(); if(!t) return;
      if(G.hero==='tianshi'){ const boom=Math.min(2,t.curse||0); SEG_HALVE=true; floatGroupStart(1+boom); try{ dealDamageTo(t,u?12:10); for(let i=0;i<boom;i++) dealDamageTo(t,u?7:5); }finally{ SEG_HALVE=false; floatGroupEnd(); } t.curse-=boom; if(boom>0){ sfx('kw_curse'); log(`斩妖剑引爆 ${boom} 层【诅咒】`); } return; }   // v0.61.32 / v1.1.15：多段牌每段增伤减半（SEG_HALVE）；v1.1.18：主伤+引爆同刻 ⇒ floatGroupStart/End 让浮字炸花
      if(G.hero==='yincha'){ let dc=(u?14:10); if((t.curse||0)>0) dc+=(u?6:4); dealDamageTo(t,dc); return; }
      let d=(G.hero==='ganshiren')?(u?12:7):(u?12:8);   // v0.61.37 A 列基础 8 → 7（B 列仍 8）
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
        // v0.61.35 天师列：主伤 20/30 → 22/32（减免费用×2 的扣诅咒口径不变）
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
      else if(G.hero==='tianshi'){ const d=u?18:14; targets.forEach(e=>{ if(e.hp>0) dealDamageTo(e,d); }); aliveEnemies().forEach(e=>applyCurse(e,u?2:1)); }   // v0.61.35 天师列：14/16 → 14/18
      else { const d=u?14:10; targets.forEach(e=>{ if(e.hp>0) dealDamageTo(e,d); }); }   // v0.61.37 A 列升级 15 → 14
      const killed=G.turnStats.kills.length-before;
      if(killed>0){
        if(G.hero==='ganshiren'){ gainShiqi(killed*3); const __hb=G.hand.length; drawCards(killed); const __cut=u?2:1;
          // v0.61.37：抽到的那张牌本回合 -1/-2 费。照易物(#27)先例——CARDS 里的对象是共享的，
          // 不能就地打标记，必须换成一个副本，并让它在 G.deck 里顶替原对象（保住 indexOf 语义）。
          for(let __i=__hb;__i<G.hand.length;__i++){ const __o=G.hand[__i]; if(!__o || (__o.tempCostCut||0)>=__cut) continue;
            const __n=Object.assign({}, __o); __n.tempCostCut=__cut;
            const __di=G.deck.indexOf(__o); if(__di>=0) G.deck[__di]=__n;
            G.hand[__i]=__n; }
          log(`万剑归宗：击败 ${killed} 名敌人，获 ${killed*3} 尸气并抽 ${killed} 张（本回合 -${__cut} 费）`); }
        else if(G.hero==='yincha'){ const hk=killed*(u?15:10); heal(hk); G.energy+=killed; log(`万剑归宗：击败 ${killed} 名敌人，恢复 ${hk} 点生命并获得 ${killed} 点符文`); }
        else if(G.hero==='tianshi'){ G.energy+=killed; log(`万剑归宗：击败 ${killed} 名敌人，恢复 ${killed} 点符文`); }
        /* v0.75.0：0 费副本是**真一次性** —— oneShot 与 exhaust 是两套语义，别合并：
           exhaust = 本关限用一次、战斗结束后回归牌库（KEYWORDS 词条与 doPlayCard 的日志都这么写）；
           oneShot = 用掉即消失，既不进弃牌堆也不留到下一关。挂 exhaust 会让那句说明当场撒谎。
           副本进不了 G.deck ⇒ 加 oneShot 不影响 deck 内的 indexOf 语义。 */
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
      else if(G.hero==='tianshi'){ const __c=(t.curse||0); d+=__c*(u?2:1); if(__c>0) sfx('kw_curse'); }   // v0.61.32
      if(d>0){ yuanqiStrike(t); sfx('energy'); dealDamageTo(t,d); if(G.hero==='tianshi') t.curse=0; }   // v1.0.13：引爆挪到结算之后（同雷符）
      else log('铁布衫：当前没有格挡，落空'); }},
  {id:'shihun', name:'噬魂术', type:'attack', rarity:'blue', cost:2,
    t:(u)=>G.hero==='ganshiren'?`消耗 ${u?2:4} 点【尸气】，对目标造成 ${u?18:14} 伤害。若本回合召唤过单位，费用 -1`
      :G.hero==='wuseng'?`引爆目标全部【诅咒】：每层造成 ${u?3:2} 点伤害，并获得 ${u?2:1} 点格挡`
      :G.hero==='yincha'?`对目标造成 ${u?16:10} 伤害。每层【血怒】使此牌伤害 +${u?3:2}（上限 +${u?18:12}），打出时消耗对应【血怒】`
      :`引爆目标全部【诅咒】，每层造成 ${u?6:5} 伤害`,
    eff:(u)=>{ const t=curEnemy(); if(!t) return;
      if(G.hero==='ganshiren'){ const __sc=u?2:4; if(!hasShiqi(__sc)){ floatMsg('尸气不足'); return false; } spendShiqi(__sc); dealDamageTo(t,u?18:14); return; }
      if(G.hero==='wuseng'){ const c=t.curse||0; if(c<=0){ log('噬魂术：目标没有诅咒，落空'); return false; } sfx('kw_curse'); burstShow(enemyEl(t), c, 110, 'shihun@'+t.uid); dealDamageTo(t,c*(u?3:2),false,0,false,false,{segs:c,step:110}); t.curse=0; const bb=c*(u?2:1); gainBlock(bb); log(`噬魂术：引爆 ${c} 层【诅咒】，获得 ${bb} 点格挡`); return; }   // v0.61.32 / v1.0.12 分段演出 / v1.0.13 引爆挪到结算之后 / v1.0.14 伤害逐层单独结算
      if(G.hero==='yincha'){ dealDamageTo(t,(u?16:10)+(u?3:2)*rageSpend(u?3:2,u?18:12)); return; }
      const c=t.curse||0; if(c<=0){ log('噬魂术：目标没有诅咒，落空'); return false; } sfx('kw_curse'); burstShow(enemyEl(t), c, 110, 'shihun@'+t.uid); dealDamageTo(t,c*(u?6:5),false,0,false,false,{segs:c,step:110}); t.curse=0; }},   // v0.61.32 / v1.0.12 分段演出 / v1.0.13 引爆挪到结算之后 / v1.0.14 伤害逐层单独结算
  {id:'qungui', name:'群鬼乱舞', type:'attack', rarity:'blue', cost:1, hpCost:(u)=>G.hero==='yincha'?2:0,
    t:(u)=>G.hero==='ganshiren'?`消耗 ${u?2:4} 点【尸气】，所有召唤单位本回合立刻作用 1 次`
      :G.hero==='wuseng'?`造成 4 伤害。场上每有 1 个召唤单位，此牌伤害 +${u?2:1}`
      :G.hero==='yincha'?`本回合每失去 2 点生命，召唤单位伤害 +${u?2:1}。立刻失去 2 点生命。`
      :`造成 ${u?9:6} 伤害。目标每有 1 层【诅咒】此牌伤害 +1（上限 +${u?6:4}）`,
    eff:(u)=>{ if(G.hero==='ganshiren'){ if(!hasShiqi(u?2:4)){ floatMsg('尸气不足'); return false; } spendShiqi(u?2:4); triggerSummons(false); return; }
      if(G.hero==='wuseng'){ const t=curEnemy(); if(!t) return; dealDamageTo(t,4+G.summons.filter(s=>s.dur>0).length*(u?2:1)); return; }
      if(G.hero==='yincha'){ loseHp(2); G.bleedSummons=true; G.bleedSummonsBonus=u?2:1; log(`群鬼乱舞：本回合每失去 2 点生命，召唤单位伤害 +${u?2:1}`); return; }
      const t=curEnemy(); if(!t) return; dealDamageTo(t,(u?9:6)+Math.min(u?6:4,t.curse||0)); }},   // v0.61.35 天师列：5/6 → 6/9
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
      if(G.hero==='yincha') loseHp(2); // C 列卡面写明「失去 2 点生命」，原先只扣了格挡/血量前置却没实扣
      // v0.61.35：天师列按新卡池文件改为 3/8（v0.61.10(P5) 的 4/7 作废；其余三列数值不动）
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
        if((t.curse||0)>=2){ ratio=1; log('嗜血：消耗 2 层【诅咒】，吸血比例提升到 100%'); }   // v0.61.35 天师列：阈值 3 层 → 2 层
        const dealt=dealDamageTo(t,d); if((t.curse||0)>=2) t.curse-=2; if(dealt>0){ const h=Math.floor(dealt*ratio); if(h>0){ heal(h); floatMsg('+'+h+' 生命'); log('嗜血：回复 '+h+' 点生命'); } } return; }   // v1.0.13：诅咒消耗挪到结算之后（同雷符）
      dealDamageTo(t,d); }},
  {id:'baigui', name:'百鬼夜行', type:'attack', rarity:'purple', cost:2, hpCost:(u)=>G.hero==='yincha'?2:0,
    t:(u)=>G.hero==='ganshiren'?`对全体敌人造成 ${u?6:4} 伤害。每有 1 个召唤单位，此牌伤害 +${u?3:2}`
      :G.hero==='wuseng'?`对全体敌人造成 ${u?6:5} 伤害。每有 ${u?1:2} 点格挡，此牌伤害 +1（上限 +${u?11:8}）`
      :G.hero==='yincha'?`对全体敌人造成 ${u?7:5} 伤害。失去 2 点生命。每有 1 个召唤单位，此牌伤害 +${u?3:2}`
      :`对全体敌人造成 8 伤害。每层【诅咒】使该敌人受到此伤害 +${u?2:1}，并引爆其全部【诅咒】`,
    eff:(u)=>{ if(G.hero==='tianshi'){ let __any=false; aliveEnemies().forEach(e=>{ const cc=e.curse||0; if(cc>0) __any=true; dealDamageTo(e,8+(u?2:1)*cc); e.curse=0; }); if(__any) sfx('kw_curse'); return; }   // v0.61.35 天师列：7 → 8
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
      // v0.61.35：天师列按新卡池文件改为「主伤 16 固定（升级不变）+ 每层引爆 3/4」
      //           （v0.61.10(P5) 的 18/24 + 每层 5/6 作废；其余三列数值不动）
      const c=t.curse||0; sealEnemy(t,1); SEG_HALVE=true; floatGroupStart(1+c); try{ dealDamageTo(t,16); for(let i=0;i<c;i++) dealDamageTo(t,u?4:3); }finally{ SEG_HALVE=false; floatGroupEnd(); } t.curse=0; if(c>0){ sfx('kw_curse'); log(`钟馗镇魂引爆 ${c} 层【诅咒】`); } }},   // v0.61.32 / v1.1.15：多段牌每段增伤减半（SEG_HALVE）；v1.1.18：主伤+引爆同刻 ⇒ floatGroupStart/End 让浮字炸花
/* —— 防御 15~23 —— */
  {id:'jingang', name:'金刚符', type:'defense', rarity:'white', cost:1, hpCost:(u)=>G.hero==='yincha'?(u?3:2):0,
    t:(u)=>G.hero==='ganshiren'?`获得 ${u?7:4} 点格挡。获得 ${u?2:1} 点【尸气】`
      :G.hero==='wuseng'?`获得 ${u?9:6} 点格挡`
      :G.hero==='yincha'?`获得 ${u?9:6} 点格挡。失去 ${u?3:2} 点生命`
      :`获得 ${u?7:5} 点格挡。本回合每施加 1 层【诅咒】额外 +${u?2:1} 格挡（上限 +6）`,
    eff:(u)=>{ let b;
      if(G.hero==='ganshiren'){ b=u?7:4; gainShiqi(u?2:1); }
      else if(G.hero==='wuseng'){ b=u?9:6; }
      else if(G.hero==='yincha'){ loseHp(u?3:2); b=u?9:6; }
      else { b=(u?7:5)+Math.min(6,(u?2:1)*(CURSE_THIS_TURN||0)); }   // v0.61.35 天师列：4/6 → 5/7
      gainBlock(b); }},
  {id:'yinshen', name:'隐身符', type:'defense', rarity:'white', cost:1,
    t:(u)=>G.hero==='ganshiren'?`获得 ${u?6:3} 点格挡，抽 1 张牌。若抽到【鬼怪牌】，获得 ${u?2:1} 点【尸气】`
      :G.hero==='wuseng'?`获得 ${u?6:4} 点格挡，抽 1 张牌。若本回合未失去生命，下回合额外抽 1 张`
      :G.hero==='yincha'?`获得 ${u?7:3} 点格挡，抽 1 张牌。若本回合失去过生命，改为抽 2 张`
      :`获得 ${u?5:3} 点格挡，抽 1 张牌。若抽到【诅咒牌】，再获得 ${u?4:3} 点格挡`,
    eff:(u)=>{ const b=G.hero==='ganshiren'?(u?6:3):(G.hero==='wuseng'?(u?6:4):(G.hero==='yincha'?(u?7:3):(u?5:3)));   // v0.61.35 天师列：3/6 → 3/5；v0.61.39 阴差列拆出并改 3/5 → 3/7
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
      else { gainBlock((u?17:12)+(CURSE_THIS_TURN||0)*(u?2:1)); } }},   // v0.61.35 天师列：每层诅咒 +1 → +1/+2
  {id:'jinzhong', name:'金钟罩', type:'defense', rarity:'purple', cost:2,
    t:(u)=>`获得 ${G.hero==='ganshiren'?(u?16:10):G.hero==='yincha'?(u?18:12):(u?17:12)} 点格挡。清除自身所有负面状态与手牌中的状态牌`,
    eff:(u)=>{ gainBlock(G.hero==='ganshiren'?(u?16:10):G.hero==='yincha'?(u?18:12):(u?17:12)); clearJunk(); clearPlayerDebuffs(); floatMsg('负面状态已清除'); }},
  {id:'jingji', name:'荆棘符', type:'defense', rarity:'blue', cost:1,
    t:(u)=>G.hero==='ganshiren'?`获得 ${u?6:3} 点格挡。本回合每受 1 次攻击，反弹 ${u?6:4} 点伤害`
      :G.hero==='wuseng'?`获得 ${u?7:4} 点格挡。本回合每受 1 次攻击，反弹 ${u?4:3} 点伤害`   // v0.61.36 武僧列：反弹 4/5 → 3/4
      :G.hero==='yincha'?`获得 ${u?6:4} 点格挡。本回合每受 1 次攻击，恢复 ${u?3:2} 点生命`
      :`获得 ${u?6:3} 点格挡。本回合每受到 1 次攻击，对攻击者施加 ${u?2:1} 层【诅咒】`,
    eff:(u)=>{ const b=G.hero==='ganshiren'?(u?6:3):(G.hero==='wuseng'?(u?7:4):(G.hero==='yincha'?(u?6:4):(u?6:3))); gainBlock(b);   // v0.61.35 天师列：3/5 → 3/6
      if(G.hero==='ganshiren'){ G.thorns+=u?6:4; }
      else if(G.hero==='wuseng'){ G.thorns+=u?4:3; }   // v0.61.36 武僧列：反弹 4/5 → 3/4
      else if(G.hero==='yincha'){ G.hitHeal=u?3:2; }
      else { G.hitCurse=u?2:1; } }},   // v0.61.35 天师列：反击诅咒 1 层 → 1/+2 层
  /* v0.61.10(P1)：佛渡 1 费 → 0 费 + 全列【消耗】。免疫不再能靠重复打出续上（每场限一次）。 */
  {id:'fodu', name:'佛渡', type:'defense', rarity:'blue', cost:0, exhaust:true,
    t:(u)=>G.hero==='ganshiren'?`清除所有状态牌与自身负面状态，本回合免疫敌人施加的负面效果${u?'，并获得 2 点【尸气】':''}。消耗（一次性）`
      :G.hero==='yincha'?`清除所有状态牌与自身负面状态，本回合免疫敌人施加的负面效果${u?'，回复 5 点生命':''}。消耗（一次性）`
      :G.hero==='tianshi'?`清除所有状态牌与自身负面状态，本回合免疫敌人施加的负面效果${u?'，额外获得 5 点格挡':''}。消耗（一次性）`
      :G.hero==='wuseng'?`清除所有状态牌与自身负面状态，本回合免疫敌人施加的负面效果${u?'，额外获得 5 点格挡':''}。消耗（一次性）`   // v0.61.36 武僧列：升级附加 4 → 5
      :`清除所有状态牌与自身负面状态，本回合免疫敌人施加的负面效果${u?'，额外获得 4 点格挡':''}。消耗（一次性）`,
    eff:(u)=>{ if(G.hero==='ganshiren'){ clearJunk(); clearPlayerDebuffs(); G.debuffImmune=1; floatMsg('本回合免疫负面效果'); if(u){ gainShiqi(2); log(`佛渡：升级后获得 2 点【尸气】`); } return; }
      const fb=(G.hero==='tianshi'||G.hero==='wuseng')?5:4;   // v0.61.39 阴差列升级改为「回复 5 点生命」，fb 不再含阴差
      clearJunk(); clearPlayerDebuffs(); G.debuffImmune=1; floatMsg('本回合免疫负面效果');
      if(G.hero==='yincha'){ if(u){ heal(5); log('佛渡：升级后回复 5 点生命'); } }
      else if(u){ gainBlock(fb); log(`佛渡：升级后获得 ${fb} 点格挡`); } }},
  {id:'tongpi', name:'铜皮铁骨', type:'defense', rarity:'blue', cost:2,   // v0.61.39 阴差列不再失血，hpCost 整体撤除
    t:(u)=>G.hero==='ganshiren'?`获得 ${u?12:8} 点格挡。反弹 ${u?5:4} 点伤害。每有 1 个召唤单位，额外反弹 1 点`
      :G.hero==='wuseng'?`获得 ${u?15:10} 点格挡。反弹 ${u?8:6} 点伤害`
      :G.hero==='yincha'?`获得 ${u?13:9} 点格挡。本回合每受到 1 次攻击，恢复 ${u?4:3} 点生命`
      :`获得 ${u?14:9} 点格挡。本回合每受到 1 次攻击，对攻击者施加 1 层【诅咒】`,
    eff:(u)=>{ if(G.hero==='ganshiren'){ gainBlock(u?12:8); G.thorns+=(u?5:4)+G.summons.filter(s=>s.dur>0).length; }
      else if(G.hero==='wuseng'){ gainBlock(u?15:10); G.thorns+=u?8:6; }
      else if(G.hero==='yincha'){ gainBlock(u?13:9); G.hitHeal=u?4:3; }
      else { gainBlock(u?14:9); G.hitCurse=1; } }},   // v0.61.35 天师列：8/12 → 9/14
  {id:'fanzhen', name:'反震', type:'defense', rarity:'blue', cost:1, costU:{wuseng:0},
    t:(u)=>G.hero==='ganshiren'?`反弹 ${u?4:3} 点伤害。本回合每受 1 次攻击，获得 ${u?2:1} 点【尸气】`
      :G.hero==='wuseng'?`本回合每受 1 次攻击，对攻击者造成 ${u?5:4} 点伤害`
      :G.hero==='yincha'?`本回合每受到 1 次攻击，获得 ${u?2:1} 层【血怒】并对攻击者造成 ${u?5:4} 点伤害`
      :`本回合每受到 1 次攻击，反击 ${u?4:3} 点伤害并对攻击者施加 ${u?2:1} 层【诅咒】`,
    eff:(u)=>{ if(G.hero==='ganshiren'){ G.thorns+=u?4:3; G.hitShiqi=Math.max(G.hitShiqi||0,u?2:1); }
      else if(G.hero==='wuseng'){ G.thorns+=u?5:4; } // B 文档：只反弹，不再给「下回合格挡」
      else if(G.hero==='yincha'){ G.thorns+=u?5:4; G.hitRage=Math.max(G.hitRage||0,u?2:1); }
      else { G.thorns+=u?4:3; G.hitCurse=Math.max(G.hitCurse||0,u?2:1); } }},   // v0.61.35 天师列：反击 3 → 3/4
  {id:'xiejiashengyuan', name:'卸甲生元', type:'defense', rarity:'blue', cost:1, hpCost:(u)=>G.hero==='yincha'?2:0,
    t:(u)=>G.hero==='ganshiren'?`获得 ${u?7:4} 点格挡。回合结束自动将剩余格挡换算为【尸气】：每保留 2 点，获得 ${u?2:1} 点（无论敌人是否攻击）`
      :G.hero==='wuseng'?`获得 ${u?8:5} 点格挡。使【卸甲】持续 ${u?3:2} 回合：期间格挡不清零，到期后剩余格挡转为生命`
      :G.hero==='yincha'?`获得 ${u?8:5} 点格挡。失去 2 点生命。敌人攻击后每保留 1 点格挡，恢复 1 点生命（上限恢复 ${u?14:11} 滴血量）`
      :`获得 ${u?12:8} 点格挡。敌人攻击后，将剩余格挡转为对随机敌人施加【诅咒】（每 2 格挡 = 1 层；敌人满 6 层时溢出部分转回格挡，于下回合开始生效）`,
    eff:(u)=>{ if(G.hero==='ganshiren'){ gainBlock(u?7:4); G.endBlockKind='A'; G.xiejiaUp=!!u; floatMsg('回合结束格挡将自动转为尸气'); }
      else if(G.hero==='wuseng'){ gainBlock(u?8:5); G.xiejia=u?3:2; floatMsg('【卸甲】已启动，格挡不再清零'); }
      else if(G.hero==='yincha'){ loseHp(2); gainBlock(u?8:5); G.endBlockKind='C'; G.xiejiaHealCap=u?14:11; floatMsg('敌人攻击后格挡将转为生命'); }
      else { gainBlock(u?12:8); G.endBlockKind='D'; floatMsg('敌人攻击后格挡将转为诅咒'); } }},   // v0.61.35 天师列：6/8 → 8/12
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
      :G.hero==='wuseng'?`失去 4 点生命。获得 4 点格挡，抽 ${u?2:1} 张牌`   // v0.61.36 武僧列：3/5 → 4 固定
      :G.hero==='yincha'?`失去 4 点生命。抽 ${u?3:2} 张牌`
      :`失去 4 点生命，抽 ${u?2:1} 张牌。对目标施加 ${u?2:1} 层【诅咒】`,
    eff:(u)=>{ loseHp(4); const n=G.hero==='yincha'?(u?3:2):(u?2:1); drawCards(n);
      if(G.hero==='ganshiren'){ gainShiqi(u?2:1); log(`舍身：获得 ${u?2:1} 点【尸气】`); }
      else if(G.hero==='wuseng'){ gainBlock(4); }   // v0.61.36 武僧列：3/5 → 4 固定
      /* v0.75.0：天师列由 randomAlive() 改成**拖拽落点那只** —— 加箭头（needsTarget）之后
         「箭头指着一只、诅咒落到另一只」是荒谬的，这是加箭头的**逻辑必然**而不是可选项。
         ⚠️ 对天师是**纯加强**（原来可能砸到不该砸的那只）。curEnemy() 在 G.target 非法/已死时
            回落 al[0]，再兜一层 randomAlive() 保证「有活敌就一定有目标」。
         ⚠️ G.target 由 onDragUp 在 playCard **之前**写入；「以命相搏」确认框不碰 G.target，
            所以 eff 里读得到拖拽锁定的那一只。 */
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
    /* v0.72.0：第 4 个实参 i 是「这张牌打出前在手牌里的下标」（doPlayCard 里 :1073 传的）。
       易物亮相要的源位就是它 —— 那一拍 #hand 还是打出之前的旧 DOM，而 G.hand 里已经
       splice 掉了这张牌，所以只能按下标取（animHandElAt）。其余卡片的 eff 不吃这个参数。 */
    eff:(u,c,_x,i)=>{ animExchangeCast(c,i); startExchangeSelect(1, c); }},
  {id:'xueqi', name:'血契', type:'skill', rarity:'blue', cost:1, costU:{wuseng:0, yincha:0, ganshiren:0},   // v0.61.37 赶尸人列升级 0 费
    t:(u)=>G.hero==='wuseng'?`将目前的格挡按 60% 转化为血量${u?'（0 符文）':''}`
      :G.hero==='yincha'?`扣除目前所有【血怒】，恢复【血怒】层数 ×2 的生命${u?'（0 符文）':''}`
      :G.hero==='tianshi'?`本回合每失去 1 点生命，获得 ${u?2:1} 点格挡`
      :`本回合每失去 1 点生命，获得 ${u?3:2} 点格挡${u?'（0 符文）':''}`,
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
    hpCost:(u)=>G.hero==='wuseng'?8:(G.hero==='yincha'?4:8),   // v0.61.37 赶尸人列：4 → 8（与武僧/天师同为 8）   // v0.61.36 武僧列：6 → 8   // v0.61.39 阴差列固定 4
    t:(u)=>{ const l=G.hero==='wuseng'?8:(G.hero==='yincha'?4:8);   // v0.61.36 武僧列：6 → 8（v0.61.39 阴差列固定 4）
      const gg=G.hero==='yincha'?1:2;
      return `失去 ${l} 点生命。获得 ${gg} 点符文`; },
    eff:(u)=>{ const l=G.hero==='wuseng'?8:(G.hero==='yincha'?4:8);   // v0.61.36 武僧列：6 → 8（v0.61.39 阴差列固定 4）
      const gg=G.hero==='yincha'?1:2;
      loseHp(l); G.energy+=gg; floatMsg(`符文 +${gg}`); log(`燃血术：失去 ${l} 点生命，获得 ${gg} 点符文`); }},
  {id:'xisui', name:'洗髓经', type:'skill', rarity:'gold', cost:2,
    t:(u)=>G.hero==='ganshiren'?`接下来 3 回合，每回合开始获得 ${u?2:1} 点【尸气】和 1 点符文`
      :G.hero==='wuseng'?`接下来 ${u?4:3} 回合，每回合开始获得 2 点格挡和 1 点符文`
      :G.hero==='yincha'?`接下来 ${u?4:3} 回合，每回合开始失去 2 点生命，获得 1 点符文`
      :`接下来 ${u?4:3} 回合，每回合开始对随机敌人施加 1 层【诅咒】和 1 点符文`,
    // v0.61.41：B/C/D 三列卡面写的是「3/4 回合」，eff 却对所有列硬写 3 ⇒ 升级了仍只有 3 回合（卡面骗人）。
    // A（赶尸人）列是 v0.61.37 明确定的「固定 3 回合」，保持不动；xisuiShiqi 同理只在 A 列有意义。
    eff:(u)=>{ const n=(G.hero==='ganshiren')?3:(u?4:3); G.xisuiTurns=n; G.xisuiShiqi=u?2:1;
      floatMsg(`洗髓经：接下来 ${n} 回合生效`); }},   // v0.61.37 A 列：持续固定 3 回合，升级改为尸气 1 → 2
  {id:'duhunguiji', name:'渡魂归己', type:'skill', rarity:'gold', cost:1, exhaust:true,
    t:(u)=>`消耗。接下来 5 回合，你对敌人造成伤害的 ${u?50:30}% 转化为生命`,
    eff:(u)=>{ G.duhun={turns:5, ratio:u?0.5:0.3}; floatMsg('渡魂归己 · 吸血化命'); log(`渡魂归己：接下来 5 回合，造成伤害的 ${Math.round(G.duhun.ratio*100)}% 转化为生命`); }},
  {id:'fenfu', name:'焚符', type:'skill', rarity:'purple', cost:0,
    t:(u)=>G.hero==='ganshiren'?`弃任意张手牌：每弃 1 张，获得 1 点【尸气】与 ${u?3:2} 点格挡`
      :G.hero==='wuseng'?`弃任意张手牌：每弃 1 张，获得 ${u?5:4} 点格挡`   // v0.61.36 武僧列：升级 6 → 5
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
      G.ranhunHeal = u ? ((G.hero==='wuseng'||G.hero==='tianshi')?3:4) : 2; // A/C 2→4；B/D 2→3
      G.ranhunSelf=c; floatMsg('燃魂 · 已点燃'); }},
  {id:'kaitianyan', name:'开天眼', type:'skill', rarity:'blue', cost:1,
    t:(u)=>G.hero==='ganshiren'?`本回合攻击牌伤害 +${u?5:3}（多段牌每段 +${u?2:1}）。场上每有 1 个召唤单位，额外 +1`
      :G.hero==='wuseng'?`本回合攻击牌伤害 +${u?4:2}（多段牌每段 +${u?2:1}）。每有 ${u?2:3} 点格挡，额外 +1（上限 +5）`
      :G.hero==='yincha'?`本回合攻击牌伤害 +${u?5:3}（多段牌每段 +${u?2:1}）。每层【血怒】使额外伤害 +1（上限 +${u?10:8}），打出后消耗对应【血怒】`
      :`本回合攻击牌伤害 +${u?6:4}（多段牌每段 +${u?3:2}）`,   // v1.1.15：卡面写明多段牌减半后数值
    eff:(u)=>{ let val;
      if(G.hero==='ganshiren') val=(u?5:3)+G.summons.filter(s=>s.dur>0).length;
      else if(G.hero==='wuseng') val=(u?4:2)+Math.min(5,Math.floor((G.block||0)/(u?2:3)));
      else if(G.hero==='yincha') val=(u?5:3)+rageSpend(1,u?10:8);
      else val=u?6:4;
      G.turnAtkBuff=(G.turnAtkBuff||0)+val;
      log(`开天眼：本回合攻击牌伤害 +${val}`); }},
  {id:'yixing', name:'移形换影', type:'skill', rarity:'purple', cost:1, costU:{tianshi:1, wuseng:1, ganshiren:1, yincha:1, default:1},   // v0.61.35 天师列取消 0 费升级；v0.61.36 武僧列同；v0.61.37 赶尸人列同；v0.61.39 阴差列同（1/1）
    t:(u)=>G.hero==='ganshiren'?`闪避下一次攻击。闪避成功后，获得 ${u?3:1} 点【尸气】`
      :G.hero==='wuseng'?`闪避下一次攻击。闪避成功后，下一回合获得 5 点格挡`   // v0.61.36 武僧列：1/1，不再有 0 费升级
      :G.hero==='yincha'?`闪避下一次攻击。闪避成功后，恢复 ${u?4:2} 点生命并获得 ${u?2:1} 层【血怒】`
      :`闪避下一次攻击。闪避成功后，对攻击者施加 1 层【诅咒】${(u&&G.hero!=='tianshi')?'（0 符文）':''}`,
    eff:(u)=>{ G.dodge+=1;
      if(G.hero==='ganshiren'){ G.dodgeShiqi=u?3:1; }   // v0.61.37：1/3（原先死写 2，且结算处硬编码 1，值是断的）
      else if(G.hero==='wuseng'){ G.dodgeNextBlock=5; }
      else if(G.hero==='yincha'){ G.dodgeHealRage=u?4:2; G.dodgeRageGain=u?2:1; }
      else { G.dodgeCurse=1; }
      floatMsg('移形换影：闪避下一次攻击'); }},
  {id:'fuling', name:'附灵术', type:'skill', rarity:'purple', cost:{ganshiren:0, default:2}, costU:{tianshi:1, wuseng:1}, exhaustOnly:['ganshiren'], needs:'summon',   // v0.61.36 武僧列：2 → 2/1
    t:(u)=>G.hero==='ganshiren'?`立即触发所有召唤单位。消耗牌（一次性）`
      :G.hero==='wuseng'?`立即触发所有召唤单位。每触发 1 个，获得 3 点格挡${u?'（1 符文）':''}`   // v0.61.36 武僧列：3/4 → 3 固定，升级改为 2→1 费
      :G.hero==='yincha'?`立即触发所有召唤单位。每触发 1 个，恢复 ${u?4:2} 点生命`
      :`立即触发所有召唤单位。每触发 1 个，对随机敌人施加 1 层【诅咒】${u?'（1 符文）':''}`,
    eff:(u)=>{ const n=G.summons.filter(s=>s.dur>0).length;
      triggerSummons(false);
      if(n>0){
        if(G.hero==='wuseng'){ const bb=n*3; gainBlock(bb); log(`附灵术：触发 ${n} 个召唤单位，获得 ${bb} 点格挡`); }   // v0.61.36 武僧列：每触发 1 个固定 3
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
      if(G.hero==='ganshiren'){ const __zq=u?4:3; sealEnemy(t,1,'zhenyaoling'); dealDamageTo(t,u?15:10); gainShiqi(__zq); log(`镇妖铃：造成 ${u?15:10} 伤害并获得 ${__zq} 点【尸气】`); return; }  // v0.61 B3：单引号→反引号，日志正常插值；v1.1.20（用户 txt #11）音效改专用键 zhenyaoling
      if(G.hero==='wuseng'){ sealEnemy(t,1,'zhenyaoling'); let d=u?15:10; if((G.block||0)>=10){ d+=(u?11:8); log(`镇妖铃：格挡 ≥10，伤害 +${u?11:8}`); } dealDamageTo(t,d); return; }
      if(G.hero==='yincha'){ loseHp(3); sealEnemy(t,1,'zhenyaoling'); dealDamageTo(t,(u?16:10)+(u?3:2)*rageSpend(u?3:2,u?18:12)); return; }
      // v0.61.35 天师列：伤害 10/14 → 10/15；镇魂 2 回合的条件由「带诅咒」改为「【诅咒】≥4 层，并消耗 4 层」
      const __cc4=(t.curse||0)>=4; sealEnemy(t, __cc4?2:1,'zhenyaoling'); dealDamageTo(t,u?15:10); if(__cc4) t.curse-=4; }},   // v1.0.13：诅咒消耗挪到结算之后（同雷符）；v1.1.20（用户 txt #11）音效改专用键 zhenyaoling
/* —— 召唤 / 秘法 41~48 —— */
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
    eff:(u)=>{ const v=G.hero==='wuseng'?(u?3:2):(G.hero==='tianshi'?(u?3:2):(G.hero==='yincha'?(u?2:1):(u?4:2)));   // v0.61.35 天师列：3/4 → 2/3
      if(G.hero==='yincha') loseHp(2);
      addSummon({type:'xiaogui', v, dur:2, up:!!u}); floatMsg('小鬼 · 奉命出巡'); }},
  {id:'huapi', name:'画皮', type:'spirit', rarity:'blue', cost:1,
    t:(u)=>`对目标施加 1 层【魅惑】（其下回合伤害 -${u?75:50}%）`,
    eff:(u)=>{ const t=curEnemy(); if(!t) return; charmEnemy(t, u?0.25:0.5); }},
  {id:'wutong', name:'五通神', type:'spirit', rarity:'purple', cost:2,
    t:(u)=>G.hero==='ganshiren'?`召唤五通神。立即获得 5 点格挡，之后每回合开始重复一次（持续 ${u?3:2} 回合）。若打出时【尸气】≥5，消耗 5 点【尸气】强化：立即获得 6 点格挡，之后每回合开始重复一次（持续 ${u?4:3} 回合）`
      :G.hero==='wuseng'?`召唤五通神。立即获得 7 点格挡（1 点基础 + 首次触发 6 点）；之后每回合开始获得 6 点格挡（持续 ${u?3:2} 回合）`   // v0.61.36 武僧列：立即 5/6 → 7 固定、每回合 4 → 6
      :G.hero==='yincha'?`召唤五通神。立即恢复 6 点生命；之后每回合开始恢复 6 点生命（持续 ${u?3:2} 回合）。若打出时【血怒】≥3，消耗 3 点【血怒】强化：持续 ${u?4:3} 回合`
      :`召唤五通神。立即获得 6 点格挡并对随机敌人施加 1 层【诅咒】，之后每回合开始重复一次（持续 ${u?3:2} 回合）`,
    eff:(u)=>{ // 现形即结算首回合：第一次「回合开始」效果落在当前回合（v0.61.36 武僧 = 基础 1 + 首次触发 6 = 立即 7 格挡）
      let wv=G.hero==='wuseng'?6:(G.hero==='tianshi'?6:3), wdur=u?3:2;   // v0.61.35 天师列 4 → 6；v0.61.36 武僧列每回合 4 → 6
      if(G.hero==='wuseng'){ gainBlock(1); }   // v0.61.36：立即合计 7 = 基础 1 + 首触 6（wv 已在上行按列定值）
      else if(G.hero==='yincha'){ heal(6); wv=6; if(rageLayers()>=3){ G.xuenu-=3; wdur=u?4:3; log('五通神：消耗 3 点【血怒】强化'); } }
      if(G.hero==='ganshiren'){ if(hasShiqi(5)){ spendShiqi(5); wv=6; wdur=u?4:3; log('五通神：消耗 5 点【尸气】强化'); } else { wv=5; } }
      const s=addSummon({type:'wutong', v:wv, dur:wdur});
      wutongTick(s);
      floatMsg('五通神 · 现形'); }},
  {id:'zhouyu', name:'咒雨', type:'spirit', rarity:'purple', cost:{ganshiren:3, wuseng:0, default:2}, exhaust:true,   // v0.61.37 赶尸人列 2 → 3
    t:(u)=>G.hero==='ganshiren'?`引爆当前所有【尸气】：清零尸气，每层尸气转化为 ${u?6:5} 点伤害，随机分配给所有敌人。消耗（一次性）`
      :G.hero==='wuseng'?`将当前全部格挡转化为等量伤害，每 1 点随机打在一个敌人身上（逐点结算）。消耗牌（一次性）`
      :G.hero==='yincha'?`将 ${u?6:4} 层【诅咒】随机施加在敌人身上。每施加 1 层，恢复 2 点生命`
      :`对所有敌人施加 1 层【诅咒】。所有敌人每有 1 层【诅咒】，此牌费用 -1（最低 ${u?0:1}）`,
    eff:(u)=>{ if(G.hero==='ganshiren'){ const q=G.尸气||0; if(q<=0){ floatMsg('没有尸气可引爆'); log('咒雨：没有尸气可引爆'); return; }
        /* v1.0.13【上限口径改为「跟随尸气上限」】原先死封 12 层（= 尸玉出现前的原上限），
           用户口径：不封顶，**跟着上限走** ⇒ 改成 min(当前尸气, relicMaxShiqi())：
           无尸玉 = 12 层（上限 72），有尸玉 = 15 层（上限 90）。 */
        const qConv=Math.min(q, relicMaxShiqi());
        G.尸气=0; if(q>0){ heal(q); log(`咒雨：引爆 ${q} 点【尸气】，回复 ${q} 点生命`); }   // v0.61.37：清零＝消耗，按新被动等量回血
        const total=qConv*(u?6:5); const al=aliveEnemies(); if(!al.length) return;
        const dist=al.map(()=>0);
        for(let i=0;i<total;i++){ dist[Math.floor(rng()*al.length)]++; }
        /* v1.0.12【分段演出】伤害本体与改版前**逐字节相同**（每只敌人仍是一次 dealDamageTo，
           整张牌口径的加成照样只吃一次），只是把「每只敌人的那一坨」按屏序错开 120ms 飘字/受击/音效，
           看得见是一阵乱雨砸下来，而不是一拍全掉。 */
        const __bStep=SETTINGS.lowSpec?0:120;
        al.forEach((e,i)=>{ if(dist[i]>0) dealDamageTo(e,dist[i],false,i*__bStep); });
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
      let n=0; const __zyl=aliveEnemies(); const __zyt=u?6:4;   // v0.61.39 阴差列：4/6 层随机分配（原为每个敌人各 2/3 层）
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
  /* 断刃[金·通用] 的附加卡：**不进任何卡池**（weightedCard 里按 id 排除），
     只在获得【断刃】遗物时由 grantRelic() 塞进牌库。
     v1.0.17（用户口径）：「和普通雷符一样的数值和属性，可以受到增益」⇒ 不再走
     `dealDamageTo(t,5,false,0,true,true)` 那条「不吃增伤与弱化」的稳定伤，
     改为逐字段对齐【雷符】本体 —— 具体对齐在下面的 CARDS 数组之后（那时才取得到 leifu）。 */
  {id:'duanren_leifu', name:'断刃雷符', type:'attack', rarity:'gold', cost:0,
    t:()=>'造成伤害（与【雷符】同数值、同属性，可受增益）',
    eff:()=>{ const t=curEnemy(); if(t) dealDamageTo(t,0); }},
  /* 引魂灯[金·赶尸人] 的附加卡（v1.0.20）：**不进任何卡池**（weightedCard 里按 id 排除），
     只在获得【引魂灯】遗物时由 grantRelic() 塞进牌库（与【断刃雷符】同一套机制）。
     数值＝原「开战自带阴兵」的口径：基础 4 伤 / 持续 3 回合；升级后 +1 伤、+1 回合。
     0 费 ⇒ 可与其他增益/卡牌配合；死亡照走 onSummonDeath ⇒ 骨铃按其「持续回合数」回血。 */
  {id:'yinbing', name:'阴兵', type:'spirit', rarity:'gold', cost:0,
    t:(u)=>`召唤 1 只阴兵。每回合末造成 ${u?5:4} 伤害（持续 ${u?4:3} 回合）`,
    eff:(u)=>{ addSummon({type:'yinbing', v:u?5:4, dur:u?4:3, healV:2, up:!!u}); floatMsg('阴兵 · 听令而来'); }},
  /* —— 里程碑专属 · 符箓天师（里程轨 tianshi_t1 / tianshi_t2）——
     这是**单独卡池**：未在里程界面领取对应档位前，不进任何池（weightedCard 的 `_baseOK`
     里按 `hero` 与 `mile` 双过滤；`mileOn` 另有一道与测试期总开关无关的硬门禁，见 50_ui.js）。
     解锁后按稀有度进天师的三选一 / 商店 / 锻造池。 */
  {id:'dianzhoufu', name:'点咒符', type:'skill', rarity:'white', cost:0, hero:'tianshi', mile:'tianshi_t1',
    t:(u)=>`对【诅咒】最高的敌人施加 ${u?2:1} 层【诅咒】；其【诅咒】达 6 层上限时抽 ${u?2:1} 张牌`,
    eff:(u)=>{ const t=mostCursedEnemy(); if(!t) return; applyCurse(t, u?2:1); if((t.curse||0)>=6) drawCards(u?2:1); }},
  {id:'leiqianfu', name:'雷谴符', type:'attack', rarity:'purple', cost:1, hero:'tianshi', mile:'tianshi_t2',
    t:(u)=>u
      ? `对全体敌人按其各自的【诅咒】层数打出等量雷击（第 n 段 n 点；6 层 = 21 伤），随后清空各自的【诅咒】`
      : `对全体敌人按其各自的【诅咒】层数各打 2 点雷击（6 层 = 12 伤），随后清空各自的【诅咒】`,
    eff:(u)=>{ const es=aliveEnemies().slice(); if(!es.length) return; let any=false;
      const step=90;   // v1.1.x：多段雷击更紧凑（原 dealDamageTo 默认 110）
      /* v1.1.15：雷谴符是「多段牌」—— 每段各走一次 calcDamageTo，朱砂笔/开天眼类平增
         原先每段全额叠加（6 层 = +18），过强；结算窗口内置 SEG_HALVE ⇒ 每段只加减半值。 */
      SEG_HALVE=true;
      try{
      es.forEach(t=>{ const c=t.curse||0; if(c<=0) return; any=true;
        const uid=t.uid, snapEl=enemyEl(t);
        /* v1.1.x：**逐段雷击** —— 每段各自扣血 / 各自飘字 / 各自触发逐击反应，
           并配 lightning 落雷精灵图（每段一记，key 带段号 ⇒ 同名重播）+ lightning.wav 分段多段雷音（紧凑连绵）。
           流畅模式 / 无头（enemyActBeats 为假）仍一次算完（冒烟与低配档逐字节不变）。 */
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
  /* t5：五雷法印 —— 把至多 5 张手牌化为 0 费【雷符】（**本场临时**，oneShot 不进牌堆循环）。
     未打出的会在本回合末依次自动打出，默认击向**绝对血量最少**的敌人（见 30_engine 的 autoPlayWulei）。
     0 费副本与【断刃雷符】同数值，但挂 oneShot ⇒ 用掉即消失，不重洗、不留到下一关。 */
  {id:'wuleifayin', name:'五雷法印', type:'skill', rarity:'gold', cost:3, hero:'tianshi', mile:'tianshi_t5',
    t:(u)=>`选择至多 5 张手牌，将其变为 0 费${u?'升级版':''}雷符（本场临时，不进牌堆循环）；本回合结束时未打出的会依次自动打出，击向血量最少的敌人`,
    eff:(u,c)=>{ startWuleiSelect(c, u); }},
  /* —— 里程碑专属 · 茅山赶尸人（里程轨 ganshiren_t1 / ganshiren_t3）——
     与天师那套同一「单独卡池」：未在里程界面领取对应档位前不进任何池（weightedCard 的 `_baseOK`
     按 hero + mile 双过滤；mileOn 另有与测试期总开关无关的硬门禁）。
     两张都是「消耗【尸气】召唤纸人」的召唤牌：
       · 赶尸令 t1：0 费，花 2 点【尸气】召 1 只纸人（沿承【纸人】的「≥4 尸气再花 4 点强化」口径）；
       · 万尸朝宗 t3：2 费，按当前【尸气】多召纸人（**纯召唤 / 当回合不立刻攻击**，无额外封顶）。 */
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
  /* —— 里程碑专属 · 苦行武僧（里程轨 wuseng_t1 / wuseng_t3）——
     与天师/赶尸人同一套「单独卡池」：未领取对应档位前进不了任何池（weightedCard 的 `_baseOK`
     按 hero + mile 双过滤；mileOn 另有与测试期总开关无关的硬门禁）。
       · t1 罗汉伏虎：1 费攻击，伤害 = 基础(5/7) + 当前格挡的一半（**向下取整**，上限 10/15）；
       · t3 化甲为毒：0 费技能，**格挡 <10 时打不出**；消耗 10 点格挡，为全体敌人施加 **1 层**【腐毒】。
         每打一次叠 1 层（持续消耗型攻击手段），本牌自身上限 4/5 层；可与【腐骨散】(散灵汁) 叠加，
         腐毒层数本身**无全局硬顶**。
         ⚠️ 它不是消耗牌（不加 exhaust，不是【消耗】）；腐毒结算走 30_engine 的三角数口径。 */
  {id:'luohanfuhu', name:'罗汉伏虎', type:'attack', rarity:'blue', cost:1, hero:'wuseng', mile:'wuseng_t1',
    t:(u)=>`造成 ${u?7:5} 点伤害，额外加上你当前格挡的一半（上限${u?15:10}，向下取整）`,
    eff:(u)=>{ const t=curEnemy(); if(!t) return; const bonus=Math.min(Math.floor((G.block||0)/2), u?15:10);
      yuanqiStrike(t); sfx('energy');
      dealDamageTo(t, (u?7:5)+bonus); if(bonus>0) log(`罗汉伏虎：额外加上格挡的一半 ${bonus} 点`); }},
  {id:'huajiaweidu', name:'化甲为毒', type:'skill', rarity:'purple', cost:0, hero:'wuseng', mile:'wuseng_t3',
    t:(u)=>`消耗 10 点格挡，为全体敌人施加 1 层【腐毒】（本牌叠加上限 ${u?5:4} 层）`,
    eff:(u)=>{ if((G.block||0)<10){ floatMsg('格挡不足！需要 10 点'); return false; }
      G.block-=10; applyPoisonAll(1, u?5:4); log(`化甲为毒：消耗 10 点格挡，为全体敌人施加 1 层【腐毒】`); }},
  /* —— 里程碑专属 · 血祭阴差（里程轨 yincha_t1 / yincha_t3）——
     与天师/赶尸人/武僧同一套「单独卡池」：未领取对应档位前进不了任何池
     （weightedCard 的 `_baseOK` 按 hero + mile 双过滤；mileOn 另有与测试期总开关无关的硬门禁）。
       · t1 饮血刃：0 费攻击。**失血在前、消耗在后** —— 打出的那一刻先失 3 血（走 loseHp，
         在出牌窗口内 ⇒ 被动「以血引怒」先 +3 层），然后才 rageSpend(3,6) 消耗（最多只吃 2 层 ⇒ +6）。
         击杀敌人再补 2 层【血怒】。放大的只是本牌伤害，不消耗多于 2 层的血怒。
       · t3 焚身咒：0 费技能 / **消耗**。失 3 血，本回合攻击牌伤害 +3（升级 +5）。
         与【开天眼】/【金刚酒】同走 G.turnAtkBuff ⇒ 同回合多张自然叠加，回合末随 turnAtkBuff 一起清零。 */
  {id:'yinxueren', name:'饮血刃', type:'attack', rarity:'blue', cost:0, hero:'yincha', mile:'yincha_t1', hpCost:(u)=>G.hero==='yincha'?3:0,
    t:(u)=>`失去 3 点生命，造成 ${u?8:4} 伤害。每层【血怒】使此牌伤害 +3（上限 +6），打出时消耗对应【血怒】；若以此牌击杀敌人，获得 2 层【血怒】`,
    eff:(u)=>{ const t=curEnemy(); if(!t) return;
      loseHp(3);                                  // 失血在前：被动「以血引怒」先 +3 层（受上限约束）
      const _hp0=t.hp;
      dealDamageTo(t,(u?8:4)+3*rageSpend(3,6));    // 消耗在后：rageSpend(3,6) 最多吃 2 层 ⇒ +6
      if(_hp0>0 && t.hp<=0){ gainRage(2); log('饮血刃：击杀敌人，获得 2 层【血怒】'); } }},
  {id:'fenshenzhou', name:'焚身咒', type:'skill', rarity:'purple', cost:0, hero:'yincha', mile:'yincha_t3', exhaust:true, hpCost:(u)=>G.hero==='yincha'?3:0,
    t:(u)=>`失去 3 点生命。本回合你的攻击牌伤害 +${u?5:3}（多段牌每段 +${u?2:1}）`,
    eff:(u)=>{ loseHp(3); G.turnAtkBuff=(G.turnAtkBuff||0)+(u?5:3); floatMsg(`攻击 +${u?5:3}`); log(`焚身咒：失去 3 点生命，本回合攻击牌伤害 +${u?5:3}`); }},
];
/* v1.0.17：把【断刃雷符】对齐到【雷符】本体 —— 只换 id 与名字，rarity / t / eff
   跟着雷符走，但 **cost 固定为 0**（用户口径：断刃雷符是 0 费）。
   为什么要「先建后对齐」：卡表是数组字面量，此刻按 id 还取不到 leifu。
   好处：以后改雷符数值，这张附加卡自动同步，不会两处各漂各的（也就不会再出现
   「雷符吃增伤、断刃雷符不吃」这种半截口径）。 */
(function(){
  const lf=CARDS.find(c=>c.id==='leifu'), dr=CARDS.find(c=>c.id==='duanren_leifu');
  if(!lf || !dr) return;
  dr.cost=0; dr.rarity=lf.rarity; dr.t=lf.t; dr.eff=lf.eff;
})();
/* ===================== 卡面短文案（v0.69.0） =====================
   背景：牌框换成真美术后，铭牌窗只占卡高 28%，132x200 的卡上 .cdesc 实测**只装得下 3 行**
   （用 _patch/_drvfit.js 实拍标定：30 个纯汉字 = 正好 3 行，32 个 = 4 行开始截断）。
   而卡池里 34 张牌的 t() 最长到 88 列宽（尸王），**静默截断，玩家根本读不到后半句**。

   双层文案：
     · `t(u)`  —— **全文，唯一真相源**。卡面放不下不代表要删：长按放大弹窗（showCardZoom）
                  与关键词说明照旧读它，一个字的机制说明都不丢。
     · `ts(u)` —— **牌面短版**（可选）。只有 t 放不下的卡才写；写了就必须满足两条硬闸
                  （见 smoke_runner「v0.69.0 卡面短文案」那一段）：
                    ① 列宽 ≤30（ASCII 记 0.5 列，其余记 1 列）
                    ② 数字多重集与 t() 逐元素相等 —— **压缩只许删字，绝不许改数值**
    没写 ts 的卡自动回落成 t（14 张本来就放得下，不需要写）。
   ⚠️ 别把 ts 当成「精简版机制」：它是同一份机制的**编排**，数字一个不少，只是换了句式。 */
function cardText(c, up){
  if(!c) return '';
  try {
    /* ⚠️ ts 允许在某些分支**返回空串**（=「这一支不用缩」）⇒ 回落 t。
       为什么需要这条：超长是逐 (卡,英雄,升级态) 的，而 ts 是按卡写的四个分支；
       群鬼乱舞只有阴差那一支超长，其余三支本来就放得下 —— 没有这条就得把
       三支没问题的文案也重抄一遍，纯属给以后留抄错的坑。 */
    if(typeof c.ts==='function'){ const s=c.ts(up); if(s) return s; }
    return c.t(up);
  } catch(e){ return c.t(up); }
}
/* ===================== 卡面短版文案（v0.69.0） =====================
   ⚠️ 这里只写 **t() 放不下的那 34 张**（其余 14 张自动回落成 t，见 cardText）。
      写在这里而不是每张卡的字面量里，是因为「短版」是一整套改写策略（同一套缩写、
      同一套列宽预算），散在 48 个卡对象里没法通读；而 t() 是**唯一真相源**，
      这套附加表一个字都不动它 —— 改文案时只要两条硬闸还绿就没风险。
   两条硬闸（smoke_runner「v0.69.0 卡面短文案」）：
     ① 列宽 ≤30（ASCII 记 0.5 列，其余记 1 列；30 个纯汉字实测正好 3 行，32 个开始截断）
     ② 数字多重集与 t() 逐元素相等 —— 压缩只许删字，绝不许改数值
   缩写约定：伤 N / 格挡 N / 回 N / 失 N / 抽 N / 【诅咒】N / 【尸气】N / 续 N。
   全文（含被省掉的从句）在长按放大弹窗 showCardZoom 里，一字未删。 */
const SHORT_TEXT = {
  shi_wang:(u)=>`耗 10【尸气】召尸王：回合末群伤 10，他召伤 +1，续 5 回合`,
  zhiren:(u)=>G.hero === 'ganshiren'
      ? `召纸人：末伤${u ? 4 : 2}。【尸气】≥4耗4→伤${u ? 7 : 5}，亡得【尸气】2，续2`
      : G.hero === 'wuseng'
        ? `召纸人：回合末伤 ${u ? 3 : 2}，存活时回合开始格挡 ${u ? 3 : 2}，续 2`
        : G.hero === 'yincha'
          ? `召纸人：失2，末伤${u ? 2 : 1}回${u ? 3 : 2}，续2。【血怒】≥3耗3→末伤${u ? 5 : 4}回${u ? 4 : 3}`
          : `召纸人：回合末对随机敌伤 ${u ? 3 : 2} 并【诅咒】${u ? 2 : 1}，续 2`,
  /* ⚠️ 「召X」一律简写成「召唤」—— 牌名就在正上方的 .cname 里，
     描述里再念一遍是纯浪费（五通神那张省下 3 列，正好从 4 行挤回 3 行）。 */
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
          : `本回合攻击牌伤+${u ? 6 : 4}（多段每段+${u ? 3 : 2}）`,   // v1.1.15：短版同步多段减半数值（v0.69.0 数字闸要求与全文逐元素相等）
  shihun:(u)=>G.hero === 'ganshiren'
      ? `耗 ${u ? 2 : 4}【尸气】，伤 ${u ? 18 : 14}。本回合召唤过则费用-1`
      : G.hero === 'wuseng'
        ? `引爆目标全部【诅咒】：每层伤 ${u ? 3 : 2} 并格挡 ${u ? 2 : 1}`
        : G.hero === 'yincha'
          ? `伤 ${u ? 16 : 10}。每层【血怒】伤+${u ? 3 : 2}（上限+${u ? 18 : 12}），打出耗对应层`
          : `引爆目标全部【诅咒】，每层伤 ${u ? 6 : 5}`,
  /* ⚠️ 升级态的「（0 符文）」是**费用注解**，不能删（删了数字 0 就没了，
     硬闸②会红）。它挤在第 3 行末尾最容易把整串顶到第 4 行，
     所以把它并进前一个括号里写成「（上限+4，0符文）」。 */
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
  /* 这两张只有**阴差那一支**超长（29.5 列，实拍 4 行）⇒ 另外三支直接返回空串回落 t()。 */
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
  /* 里程碑专属（符箓天师）—— 全文太长，牌面走短版；数字与 t() 逐元素一致。 */
  dianzhoufu:(u)=>`对【诅咒】最高的敌人 +${u ? 2 : 1} 层；满 6 层则抽 ${u ? 2 : 1} 张`,
  leiqianfu:(u)=>u
      ? `全体按其【诅咒】层数逐段雷击（6 层=21 伤），并清空诅咒`
      : `全体按其【诅咒】层数各打 2 点（6 层=12 伤），并清空诅咒`,
  wuleifayin:(u)=>`至多 5 张变为 0 费${u?'升级':''}雷符；回合末自动击向血量最少者`,
  /* 里程碑专属（茅山赶尸人）—— 全文太长，牌面走短版；数字与 t() 逐元素一致。 */
  ganzhiling:(u)=>u
      ? `耗2【尸气】召1升级纸人（末伤4）；【尸气】≥4再耗4→末伤7`
      : `耗2【尸气】召1纸人（末伤2）；【尸气】≥4再耗4→末伤5`,
  wanshichaozong:(u)=>u
      ? `耗至多4【尸气】，每1点召1升级纸人（末伤4）`
      : `耗至多3【尸气】，每1点召1纸人（末伤2）`,
  /* 里程碑专属（苦行武僧）—— 全文太长，牌面走短版；数字与 t() 逐元素一致。 */
  huajiaweidu:(u)=>`耗 10 格挡，全体+1 层【腐毒】(上限 ${u?5:4})`,
  /* 里程碑专属（血祭阴差）—— 饮血刃全文太长走短版；数字与 t() 逐元素一致。
     焚身咒 t() 才 19 列，不走短版。 */
  yinxueren:(u)=>`失3血，伤${u?8:4}。【血怒】每层伤+3（上限+6）并耗层；击杀得2层`,
};
/* v1.0.17：断刃雷符的 t() 与【雷符】逐字相同（见上面 CARDS 之后的 sync），
   所以它的牌面短版也直接共用雷符那一份 —— 不必再抄一遍，也就不会漏改。 */
CARDS.forEach(c=>{
  if(c.id==='duanren_leifu') c.ts=SHORT_TEXT.leifu;
  else if(SHORT_TEXT[c.id]) c.ts=SHORT_TEXT[c.id];
});

const RCOLOR={white:'r-white',blue:'r-blue',purple:'r-purple',gold:'r-gold'};
const RNAME={white:'白',blue:'蓝',purple:'紫',gold:'金'};
const TNAME={attack:'攻击',defense:'防御',skill:'技能',spirit:'鬼怪',junk:'废牌'};
function cardById(id){ const c=CARDS.find(x=>x.id===id); return {...c, up:false}; }
/* 机制来源：某个关键词/流派由哪些牌提供（用于卡池过滤，避免出现"用不了"的牌） */
const GRANTS = { curse:['zhouyin','zhiren','shihunzhou','zhouyu'], summon:['zhiren','xiaogui','wutong','yinbingguo'] };
function deckHasMechanic(mech){ return GRANTS[mech].some(id=>G.deck.some(c=>c.id===id)); }
/* ===================== 英雄（初始角色选择） ===================== */
/* v0.76.1：新增 brief（一句话定位，选英雄卡上显示）与 passiveShort（被动精简版）。
   ⚠️ desc / passive 是**全文**，一个字都没删 —— 它们仍是 tooltip（resolveTip 的 type==='hero'）
      与战斗页 pmech 的唯一来源。选英雄卡改用 brief/passiveShort，是为了让四张卡不再被
      两段长文撑成一面字墙（用户报「文字冗长枯燥，面板单调」）。
   ⚠️ 卡上**必须**留一句被动（本仓红线：任何信息都不能只存在于 hover 里，触屏一律靠 :active 兜底）。 */
const HEROES = [
  {id:'tianshi', name:'符箓天师', desc:'精通符咒，用诅咒削弱并连锁击杀敌人。', mech:'咒印道体', passive:'【咒印道体】每回合开始对【诅咒】层数最高的敌人施加 1 层【诅咒】；施加产生的溢出（超过上限 6 层）每层转化为 2 点格挡。',
   brief:'诅咒连锁 · 以咒杀敌', passiveShort:'回合开始给诅咒最高的敌人 +1 诅咒，溢出转格挡',
   deck:[['leifu',3],['jingang',2],['juling',1],['duhunguiji',1],['zhouyin',1],['zhiren',1],['shouyi',1]]},  // v0.61.35 天师初始卡池：雷符×3 金刚符×2 聚灵×1 渡魂归己×1 咒印×1 纸人×1 守一×1（共 10 张；去掉佛渡/画皮、加纸人）
  {id:'ganshiren', name:'茅山赶尸人', desc:'役使尸骸，靠尸气与召唤物持续输出。', mech:'尸气', passive:'每回合开始时，场上每有 1 个召唤单位，获得 1 点【尸气】。召唤单位死亡时，获得 2 点【尸气】。每消耗 1 点【尸气】，回复 1 点生命。【尸气】可用于加强召唤系卡牌效果。',
   brief:'召唤尸傀 · 尸气续航', passiveShort:'回合开始每个召唤物 +1 尸气，消耗尸气回血',
   deck:[['leifu',2],['jingang',1],['zhouyin',1],['sheshen',1],['fuling',1],['zhiren',1],['shi_wang',1],['shouyi',1],['xiaogui',1],['wutong',1]]},  // v0.61.37 赶尸人初始卡池：雷符×2 金刚符×1 咒印×1 舍身×1 附灵术×1 纸人×1 尸王×1 守一×1 小鬼×1 五通神×1（共 11 张；金刚符 2→1、去佛渡/血契、加咒印/附灵术/五通神）
  {id:'wuseng', name:'苦行武僧', desc:'以守为攻，格挡既是盾也是矛。', mech:'格挡保留', passive:'每回合开始获得 2 点格挡；回合结束未用完的格挡保留最多 3 点。',
   brief:'格挡护体 · 以守为攻', passiveShort:'回合开始 +2 格挡，回合结束保留最多 3 点',
   deck:[['leifu',2],['jingang',2],['jinzhong',1],['tiebushan',1],['xueqi',1],['fanzhen',1],['zhouyu',1],['shouyi',1]]},
  {id:'yincha', name:'血祭阴差', desc:'以血为引，燃烧生命换取爆发。', mech:'血怒 · 以血换力', passive:'【血怒】上限 10 层、整局累积（开新局才清零）。打出扣血牌时每失去 1 点生命，自动 +1 层【血怒】；带“每层 +N（上限 M）”的牌打出时消耗对应【血怒】爆发，生命越低部分牌越强。',
   brief:'自伤蓄怒 · 绝境爆发', passiveShort:'扣血即 +1 血怒（上限 10），消耗血怒爆发',
   deck:[['leifu',3],['jingang',1],['huofu',1],['fenfu',1],['xueqi',1],['shouyi',1],['ranxue',1],['zhiren',1]]},  // v0.61.39 阴差初始卡池：雷符×3 金刚符×1 火符×1 焚符×1 血契×1 守一×1 燃血术×1 纸人×1（8 种、共 10 张）
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
  else checkFengduLing();            // 酆都令：扣血之后判「首次降至 ≤9（绝对）」——不自伤致死者才判（致死者已判负）
}

/* —— 酆都令[fengduling · 血祭阴差 t5]：每场战斗一次 ——
   生命**首次**降至 9 点及以下（绝对血量）时触发：立即充满【血怒】，并置本回合对敌伤害翻倍。
   触发口径：loseHp（自伤/洗髓经等）与 dealDamageToPlayer（敌人攻击）的扣血**之后**各判一次；
   与【道心】同场时，道心在 dealDamageToPlayer 里先结算 ⇒ 天然满足用户口径「道心优先」。
   为什么填满走 gainRage：借它的上限封顶 + 燃血令累积口径，避免两处各算一套。
   「本回合翻倍」记在 G.damageDoubleTurn，回合末随 turnAtkBuff 一起清零（见 30_engine startTurn）。 */
function checkFengduLing(){
  if(!G || G.hero!=='yincha') return;
  if(!hasRelic('fengduling') || G.fengduUsed) return;
  if(G.hp>9) return;                 // 绝对血量口径（非百分比）
  G.fengduUsed=true;
  gainRage(relicMaxXuenu());         // 充满：gainRage 内自带 relicMaxXuenu() 封顶
  G.damageDoubleTurn=1;
  floatMsg('酆都令 · 血怒满、伤害翻倍');
  log('酆都令：生命首次降至 9 点及以下，立即充满【血怒】，本回合对敌伤害翻倍');
}
const DYNAMIC_DMG = ['tiebushan','shihun','qungui','taomufu','shixue','baigui','zhouyu'];
// 苦行武僧：伤害随「当前格挡/目标诅咒」浮动的牌 —— 卡面正文只写基础值，徽章恒定显示实时预伤害
const WUSENG_BLOCK_DMG = ['leifu','huofu','jianfu','shixue','baigui','zhenyaoling','zhanyaojian'];
const WUSENG_NO_CURSE_TAG = ['leifu','huofu','jianfu','shixue','baigui','zhenyaoling']; // 这些牌不吃【诅咒】，徽章不挂诅咒标签
// 阴差：伤害随【血怒】/本场失血/本回合失血/召唤数/目标状态浮动的牌 —— 卡面正文只写基础值，徽章恒定显示实时预伤害
const YINCHA_DYN_DMG = ['leifu','jianfu','tianlei','shihun','shixue','baigui','zhenyaoling','zhanyaojian','taomufu','zhongkui','yinxueren'];
const YINCHA_NO_CURSE_TAG = ['leifu','huofu','jianfu','tianlei','shihun','shixue','baigui','zhenyaoling','taomufu','zhongkui','yinxueren']; // C 列不吃诅咒，徽章不挂诅咒标签
// 天师：伤害随【诅咒】层数 / 当前格挡 / 召唤物浮动的牌 —— 卡面正文只写基础值，徽章恒定显示实时预伤害
const TIANSHI_DYN_DMG = ['leifu','jianfu','zhanyaojian','tiebushan','shihun','qungui','taomufu','baigui','zhongkui','zhiren','xiaogui','leiqianfu']; // v0.61.35：小鬼改为「目标带诅咒则 +2/3」，伤害随目标状态浮动；v1.1.0 加雷谴符（裸伤随目标诅咒层数）
/* ===================== 全卡重做：流派 / 资源 / 召唤 / 状态 助手 ===================== */
const COL_B='wuseng', COL_C='yincha', COL_D='tianshi';
const GHOST_IDS = ['zhiren','xiaogui','wutong','yinbingguo','zhongkui','shi_wang','yinbing'];   // 【鬼怪牌】白名单（v1.0.20 补引魂灯附加卡【阴兵】）
const CAN_CURSE_IDS = ['huofu','wanjian','taomufu','shihunzhou','sheshen','fenfu','zhouyin','zhouyu','zhiren','dianzhoufu']; // 无条件可施加诅咒的牌（10 张；v0.61.35 加入纸人；v1.1.0 加入点咒符[天师里程碑]——目标恒为诅咒最高者，无前置条件）
const isGhostCard = c => !!(c && c.type==='spirit' && GHOST_IDS.includes(c.id));
const isCanCurse  = c => !!(c && CAN_CURSE_IDS.includes(c.id));

/* ——— v0.61.32：逐张点名的音效表 ———
   只有「没有统一引擎收口点」的键才需要写在这：能收口的一律走收口点，别往这里堆。
   （给格挡的牌走 gainBlock 的 card_defense，召唤走 addSummon，血怒走 gainRage，
     镇魂/魅惑走 sealEnemy/charmEnemy —— 所以它们**不在**下表里。） */
const CARD_SFX = {
  /* A 组·玩家输出细分：17 张按听感归 4 类。一张牌只给一个音 —— 冲突时取更有辨识度的那类，
     所以「剑符」归斩击（不归符咒）、「万剑归宗」归符咒（不归群伤）、「群鬼乱舞/百鬼夜行」归群伤（不归钝击）。 */
  leifu:'lei',               huofu:'atk_talisman',      jianfu:'atk_slash',
  duanren_leifu:'lei',       // v1.0.13：断刃雷符与普通雷符同听感（用户口径）；v1.1.20（用户 txt #2「lei 换个音效」）两者一起改走专用键 lei
  zhanyaojian:'atk_slash',   tianlei:'tianlei',         wanjian:'wanjian',   // v1.1.20：万剑归宗改专用键（素材/sfx/wanjian.wav）；天雷正法改专用键 tianlei（用户 txt #7）
  tiebushan:'atk_blunt',     shihun:'atk_slash',        shixue:'thorns',   // v1.1.20（用户 2026-10-15 音效库口径「thorns 用于嗜血」）atk_slash→thorns
  taomufu:'atk_talisman',    shihunzhou:'atk_talisman', zhongkui:'atk_blunt',
  qungui:'atk_aoe',          baigui:'atk_aoe',          zhouyu:'atk_multi_each',
  /* v1.1.20r2（用户口径「purple_rain 的音效要换成苦僧咒雨那个连击的音效」）：
     咒雨出牌音 atk_aoe → **atk_multi_each**（＝苦僧咒雨那套逐点连击每一段响的那个音）；
     咒雨是 4 个角色（天师/苦僧/赶尸人/阴差）共用的同一张牌 ⇒ 本条一改**全部角色同时生效**。 */
  yinbingguo:'atk_aoe',      shi_wang:'atk_aoe',
  /* D 组·自我强化：这些牌没有共性收口点（不是给格挡、不是召唤），只能逐张点名 */
  kaitianyan:'card_buff',    xueji:'card_buff',         ranxue:'card_buff',
  ranhun:'card_buff',        jingxin:'card_buff',       yixing:'card_buff',
  fuling:'card_buff',        xisui:'card_buff',
  /* E 组·天师里程碑（v1.1.2）：三张奖励牌逐张点名 —— 出牌即响，不依赖任何收口点。
     点咒符落咒 → 诅咒音；雷谴符群雷 → 符咒音（与雷符/天雷正法同族）；五雷法印是自身强化 → 强化音。 */
  dianzhoufu:'card_curse',   leiqianfu:'lightning',     wuleifayin:'card_buff',
  /* E 组补（v1.1.x 审计）：里程碑里这两张原本**没有任何收口点**可依（饮血刃是纯攻击、
     焚身咒是纯自身增益），不点名就只有通用 'card' 那一声 ⇒ 这里逐张补上。
     其余里程碑牌的音效都已被收口点覆盖，登记反而会同一帧叠两遍：
       赶尸令 / 万尸朝宗 / 阴兵 → addSummon 的 card_summon；
       化甲为毒 → applyPoisonAll 的 card_curse；点咒符 → applyCurse 的 card_curse；
       罗汉伏虎 / 铁布衫 → eff 里的 sfx('energy')。 */
  yinxueren:'slash',         fenshenzhou:'card_buff'
};
function cardSfxFor(c){ return (c && CARD_SFX[c.id]) || null; }

/* ——— v0.64.0：精灵图特效表 ———
   素材 `素材/fx/<key>.png`，8 列纵向精灵图、单元 240×240（v1.1.20r 起全量 ×0.5；原 480×480），帧数由 `_patch/mk_fx_sheets.py`
   **按每格 alpha 实测**扫出来（8 列的末排常常是空的，不能拿 行×8 当帧数）。要改尺寸就改那个脚本。
   `scale` 默认 1.0，逐个可调 —— 值由 `_patch/shot_fx.py` 的实拍对照图定，不许拍脑袋。 */
const FX_SHEETS = {
  baigui:      { c:8, f:37, f0:44, rows:6, i0:6, scale:2.14, ox:0, oy:0.23 },   // 百鬼夜行　素材 44 帧，两端看不见的 7 帧不播
  block:       { c:8, f:36, f0:37, rows:5, i0:1, scale:2.03, ox:0, oy:0.18 },   // 格挡 / 金刚符　素材 37 帧，两端看不见的 1 帧不播
  burn:        { c:8, f:38, f0:43, rows:6, scale:2.47, ox:0, oy:0.23 },   // 灼烧　素材 43 帧，两端看不见的 5 帧不播
  charge:      { c:8, f:37, f0:42, rows:6, scale:1.35, ox:0, oy:0.22 },   // 蓄力　素材 42 帧，两端看不见的 5 帧不播
  charm:       { c:8, f:35, f0:45, rows:6, i0:4, scale:1.76, ox:0, oy:0.15 },   // 魅惑　素材 45 帧，两端看不见的 10 帧不播
  curse:       { c:8, f:35, f0:43, rows:6, i0:4, scale:2.47, ox:0, oy:0.23 },   // 诅咒　素材 43 帧，两端看不见的 8 帧不播
  fodu:        { c:8, f:38, f0:41, rows:6, i0:1, scale:1.75, ox:0, oy:0.17 },   // 佛渡（净化）　素材 41 帧，两端看不见的 3 帧不播
  /* v1.1.6 腐毒发作（腐骨散 / 化甲为毒）：用户提供的素材原始排布是 5 列 × 4 行、单元 768×720、
     实际 16 帧（末行只有 1 格），**不是**工程的 8 列 × 480 约定 —— 已按排重排成 8 列 × 2 行、
     单元 480×480（`_patch` 外的临时脚本重采样，逐帧 LANCZOS 缩放、原样保留在格内位置。
     v1.1.20r 起全量合成格再 ×0.5 ⇒ 单元 240×240）。
     ox/oy 由重采样后逐帧 alpha 并集实量（cell-local 内容框中心 − 格中心）：0.01 / 0.06。
     与 burn（同为 DoT 跳伤、同锚点敌人）取同一 scale，观感才连得上。 */
  fudu_hit:    { c:8, f:16, rows:2, i0:0, scale:2.0, ox:0.01, oy:0.06 },
  gouhun:      { c:8, f:36, rows:6, i0:0, scale:1.83, ox:0.22 },   // 勾魂　v1.1.20（用户 txt #17「特效不明显，需要更换」）：换 8 列 6 行新素材（hand_grab_full_8lie6hang_480x480.png，v1.1.20r 起全量 ×0.5 ⇒ 整图 1920×1440）；素材帧 36 全播（i0:0，无两端空帧）；内容占格子 55%×45% ⇒ 实测 scale 1.83、ox 0.22
  purple_rain: { c:8, f:48, rows:6, i0:0, scale:1.01 },   // 咒雨　v1.1.20r（用户跨轮口径：新加的咒雨特效）：8 列 6 行新素材（purple_rain_full_8lie6hang_480x480.png，v1.1.20r 起全量 ×0.5 ⇒ 整图 1920×1440）；素材帧 48 全播（i0:0，逐帧 alpha 实测无空帧）；内容逐帧铺满格子（宽 99.2%、高 98.3%）⇒ 实测 scale 1.01、ox/oy 0
  /* v1.0.17 新增（程序绘制，`_patch/mk_flame_sheets.py`）：下面 4 张都是自绘精灵图、
     每一格都有内容（不存在「两端空帧」）⇒ **不写 f0**（f0 是「素材原帧数 − 裁掉的两端空帧」的记账字段，
     只在 `_patch/fx_tune.py` 扫外部素材时才有意义；自绘图 f0 == f，写进去只会让冒烟那条
     「f0 ≥ i0+f 且 f0 > f」的自洽断言误报）。i0 也一律 0。**帧数分两档**：
       · guling_suck / relic_proc —— 一次性演出，48 帧 6 行（f = 48）；
       · shiqi_flame / xuenu_flame —— 芯片上的**无限循环**，只出 8 帧 1 行（f = 8）。
         为什么火焰不是 48 帧：循环只要一个周期；48 帧＝1920×1440（v1.1.20r 起全量 ×0.5 后的尺寸），而 `打包.py` 会**按排**
         切成 `fx/<名>_r0..r5.png`，多出来的 5 排永远没人请求（CSS 只循环第 0 排），
         还会被 verify_dist 的「从未被请求的素材」咬一口。8 帧 1 排 = 拆出来正好 `_r0.png` 一张。
         ⚠️ 正因如此，芯片火焰的地址**不能**按整键取 —— 见 `fxStripURL()`（js/00_base.js）。
      `scale` 冒烟断言要求每条都 > 0：guling_suck / relic_proc 是 playFx 挂在玩家身上的大特效，
      原取与 heal/shiqi 同族的 2.47；v1.1.16 按用户口径**连同下面这张 lightning、fudu_hit 一起缩到 2.0**。
      两张火焰不进 playFx（尺寸由 CSS 的 background-size 定），scale 只是占位。 */
  guling_suck: { c:8, f:48, rows:6, i0:0, scale:2.0, op:0.6 },   // 骨铃吸血：绿色魂气向内收束　v1.1.20（用户 txt「截断全部回调」）帧数回全长（f 16→48）；6 成透明度（op 0.6）保留
  heal:        { c:8, f:34, f0:43, rows:6, i0:3, scale:2.9, ox:0, oy:0.23 },   // 治疗回血　素材 43 帧，两端看不见的 9 帧不播　v1.1.19（用户 txt「特效太小」）2.47→2.9
  huo:         { c:8, f:18, f0:21, rows:4, scale:1.75, ox:0, oy:0.18 },   // 火符　素材 21 帧，两端看不见的 3 帧不播
  hurt:        { c:8, f:16, f0:17, rows:4, scale:2.15, ox:0, oy:0.23 },   // 玩家受击（帧数最短，17）　素材 17 帧，两端看不见的 1 帧不播
  jian:        { c:8, f:18, f0:21, rows:4, i0:1, scale:1.00, ox:0, oy:0.23 },   // 剑符 / 斩妖剑（提示词文档里本就是同一条）　素材 21 帧，两端看不见的 3 帧不播
  jiangshi:    { c:8, f:34, f0:40, rows:6, i0:5, scale:1.98, ox:0, oy:0.27 },   // 召唤僵尸手（僵王）　素材 40 帧，两端看不见的 6 帧不播
  jinzhong:    { c:8, f:41, f0:43, rows:6, i0:1, scale:2.3, ox:0, oy:0.2 },   // 金光罩 / 金钟罩　素材 43 帧，两端看不见的 2 帧不播　v1.1.20（用户 txt「截断全部回调」）帧数回全长（f 24→41）；放大 1.82→2.3 保留
  lei:         { c:8, f:11, f0:19, rows:5, scale:1.35 },   // 雷符　素材 19 帧，两端看不见的 8 帧不播　v1.1.19（用户 txt「特效太小」）1.05→1.35
  /* v1.1.9 修正（用户实机报「列数/行数搞错了，特效错乱」）：
     ⚠️ 这两张与 boss_vfx 同一套出图规格 —— **8 列 × 4 行、单帧 480×720**（v1.1.20r 起全量 ×0.5
        ⇒ 单帧 240×360、宽 1920、高 1440；`ch` 是比例 1.5，与本条几何描述无关，仍写 ch:1.5）。
        以前按「正方形格 480×480 ⇒ 6 行」切，纵偏移算成 480 的整数倍，实际每格高 720
        ⇒ 播到第 2 格起就整体错位一格半。修法：progress 里新增 `ch`（单帧高/宽 = 720/480 = 1.5）
        字段，fxCellPos / playFx 按非方形格算纵偏移与内层高（见 js/00_base.js）。
     ⚠️ 帧率：同一出图管线是 **30fps**（README 规格），本仓其它自绘精灵图是 24fps（playFx 默认）。
        故这两条显式写 `fps:30`，播放时长才与出图一致（用户口径「注意帧间隔时间」）。
     lightning（雷谴符**逐段落雷**）：素材 32 帧 ⇒ f:32。scale 取与 burn/fudu_hit 同族的大特效档。 */
  lightning:   { c:8, f:32, rows:4, ch:1.5, i0:0, scale:1.5, fps:30 },   // v1.1.19（用户 txt「特效太大」）2.0→1.5
  /* 反伤 / 反震**共用**这张精灵图：画布 8 列 × 4 行、单帧 480×720（v1.1.20r 起全量 ×0.5 ⇒ 240×360）；
     动作只占**前 24 帧**（末 8 帧是出图留白）⇒ f:24。
     玩家反伤给敌人（荆棘/罗汉拳套/铁壁…）→ 锚在**玩家**、基准朝向不动；
     敌人反震给玩家（fanzhen 词缀）→ 锚在**敌人**并**镜像**（playFx 的 opts.mirror）。 */
  damage_reflect: { c:8, f:24, rows:4, ch:1.5, i0:0, scale:1.2, fps:30 },   // v1.1.19（用户 txt「缩小为原来的 5 分之 3」）2.0→1.2
  lifesteal:   { c:8, f:34, f0:37, rows:5, i0:1, scale:1.43, ox:0.15, oy:0.17 },   // 吸血 / 渡魂归己　素材 37 帧，两端看不见的 3 帧不播
  /* v1.0.14 多段斩击：**一行 = 一个方向**（8 帧一记斩痕），6 行 = 6 个方向。
     播哪一行由 `opts.i0` 现定（`burstShow` 按斩击段数轮流取方向，i0 = 方向 × 8），
     所以这里的 i0:0 只是「不动 opts 时的默认方向」。
     ⚠️ 不能跑 `_patch/fx_tune.py` 重算这一条：它按「整张图两端裁空帧」的口径量，
     对这种「每行一个方向、每行都从第 0 格起播」的图会把 f 写成 48（跨 6 行）。已在那个脚本里跳过它。 */
  multi_slash: { c:8, f:8, rows:6, i0:0, scale:1.09 },
  relic_proc:  { c:8, f:48, rows:6, i0:0, scale:2.5 },   // v1.0.17 自绘：遗物触发通用金光（金符纹扩散 + 上浮光点）　v1.1.19（用户 txt「特效太小」）2.0→2.5
  shiqi:       { c:8, f:40, f0:46, rows:7, i0:5, scale:2.47, ox:0, oy:0.23 },   // 尸气　素材 46 帧，两端看不见的 6 帧不播
  shiqi_flame: { c:8, f:8, rows:1, i0:0, scale:1 },   // v1.0.17 自绘：尸玉在场时尸气芯片的幽蓝火焰（8 帧 1 行，循环；scale 占位，不进 playFx）
  shiwang:     { c:8, f:46, f0:51, rows:7, i0:4, scale:1.98, ox:0, oy:0.28 },   // 尸王召唤　素材 51 帧，两端看不见的 5 帧不播
  thorns:      { c:8, f:19, f0:24, rows:5, i0:4, scale:2.4, ox:0, oy:0.18 },   // 荆棘符 / 反震　素材 24 帧，两端看不见的 5 帧不播　v1.1.19（用户 txt「特效太小」）1.98→2.4
  /* v1.1.4 自绘（_patch/mk_flame_sheets.py）：浅显荆棘 · 立绘叠图 —— 受到反伤时在**立绘上**闪一道
     很细的荆棘尖刺 + 微光（"浅显"= 低透明度、细线、不遮挡）。与 `thorns`（荆棘符本体那种大特效）分开：
     它是「受击时叠在立绘上的轻量提示」，不是一张牌打出去的本体演出。 */
  thorns_light: { c:8, f:48, rows:6, i0:0, scale:2.0 },   // 浅显荆棘·立绘叠图（见上）　v1.1.20（用户 txt「截断全部回调」）帧数回全长（f 16→48）、透明度回调（撤 op 0.5）
  tianlei:     { c:8, f:14, f0:21, rows:5, scale:1.3 },   // 天雷正法　素材 21 帧，两端看不见的 7 帧不播　v1.1.19（用户 txt「特效太小」）1.00→1.3
  wangyou:     { c:8, f:42, f0:46, rows:6, i0:1, scale:2.82, ox:0, oy:0.23 },   // 忘忧汤（孟婆）　素材 46 帧，两端看不见的 4 帧不播
  wanjian:     { c:8, f:45, f0:46, rows:6, i0:0, scale:1.04 },   // 万剑归宗　v1.1.20（用户 txt #8「换个特效」）：换 8 列 6 行新素材（wanjian_full_8lie6hang_480x480.png，v1.1.20r 起全量 ×0.5 ⇒ 整图 1920×1440）；素材帧 46、实播 45（i0:0）；内容占格子 96% ⇒ 实测 scale 1.04
  weak:        { c:8, f:38, f0:44, rows:6, i0:5, scale:2.54, ox:0, oy:0.23 },   // 虚弱　素材 44 帧，两端看不见的 6 帧不播
  xiaogui:     { c:8, f:35, f0:42, rows:6, i0:5, scale:2.51, ox:0, oy:0.23 },   // 小鬼召唤　素材 42 帧，两端看不见的 7 帧不播
  xuenu:       { c:8, f:32, f0:41, rows:6, i0:4, scale:2.47, ox:0, oy:0.23 },   // 血怒　素材 41 帧，两端看不见的 9 帧不播
  xuenu_flame: { c:8, f:8, rows:1, i0:0, scale:1 },   // v1.0.17 自绘：血玉在场时血怒芯片的紫焰 + 暗红余烬（8 帧 1 行，循环；scale 占位，不进 playFx）
  yehuo:       { c:8, f:45, f0:47, rows:6, scale:2.47, ox:0, oy:0.23 },   // 业火（修罗王）　素材 47 帧，两端看不见的 2 帧不播
  yinbing:     { c:8, f:44, f0:51, rows:7, i0:4, scale:1.00, ox:0, oy:0.27 },   // 阴兵过境　素材 51 帧，两端看不见的 7 帧不播
  zhenyaoling: { c:8, f:41, f0:43, rows:6, i0:1, scale:1.7, ox:0, oy:0.09 },   // 镇妖铃　素材 43 帧，两端看不见的 2 帧不播　v1.1.19（用户 txt「特效太小」）1.28→1.7
  zhiren:      { c:8, f:34, f0:42, rows:6, i0:6, scale:2.51, ox:0, oy:0.23 },   // 纸人召唤　素材 42 帧，两端看不见的 8 帧不播
  zhongkui:    { c:8, f:31, f0:38, rows:6, i0:6, scale:1.4 },   // 钟馗镇魂　素材 38 帧，两端看不见的 7 帧不播　v1.1.19（用户 txt「特效太小」）1.08→1.4
  /* ——— v1.1.10/11：boss_vfx 全部 9 幕 Boss 技能特效（用户交付的 46 段全接入）———
     前 34 段（第 1~6 幕）在 v1.1.10、后 12 段（第 7~9 幕 夜王/修罗王/阎罗天子）在 v1.1.12。
     v1.1.15 起换新规格（用户重出图）：`_hit` / `_self` 段 8 列 × 4 行、**单帧 480×480**（整图 3840×1920，
     正方形格 ⇒ 不写 ch；v1.1.20r 起全量 ×0.5 ⇒ 单帧 240×240、整图 1920×960）、**30fps** ⇒ 32 帧 ≈ 1.07s。
     v1.1.20r：**10 条 `_cast` 换 8 列 6 行新图** ⇒ 单帧 240×240、整图 1920×1440、f 48。
     （lightning / damage_reflect 仍是旧的 480×720 格、保留 ch:1.5，不随这次换。）
     这些 `_hit` / `_self` 图**没有两端空帧**（出图校验：首帧非空、末帧覆盖率 0）⇒ 一律 i0:0、f:32。
     scale：v1.1.16 起按用户口径把 boss_vfx 那批**整体缩到 2.0**（原 2.47 偏大、手机端偏卡；
     卡顿主因是像素填充量而非帧率 ⇒ 本条只缩尺寸，fps 仍 30）。
     v1.1.20（用户 txt「删掉这个」）：4 条连接段 `_link` 全部删除（键位 + 素材 + bossLinkFx 平铺播放器一并摘掉），
     连同 `b2_hanba_burn_apply_hit` / `b3_xueshi_charge_self` 两条独立段 —— 46 段 → 40 段。
     v1.1.20r（用户 txt 第三批）：**10 条 `_cast` 起手换新图**（用户重出 8 列 6 行精灵图 ⇒ rows 4→6、f 32→48）；
     只换 `_cast` 这一套（同一技能挂角色/挂 Boss 的两份里 `_hit` 那套逐字节不动）。
     v1.1.20r2（用户真机复核）：**撤掉这 10 条 `_cast` 的 oy 0.25**（v1.1.19 ③ 加的「上移半个单帧宽」→ v1.1.20 ⑥ 收到
     0.25），实机观感仍偏上 ⇒ 改回正常水平（oy 不写 = 0）；scale 原样保留。
     同批 **全量 fx 精灵图合成格 480→240**（源图统一 ×0.5 重采样；playFx 的屏上尺寸由锚点盒决定、与源图格尺寸无关 ⇒ 观感不变）。
     挂点与触发时机见 30_engine.js 的 BOSS_VFX / bossSkillFx（_cast 挂 Boss、_hit 默认挂玩家、_self 挂 Boss）。 */
  /* 第一幕 · 僵王（爪击 / 吸食 / 召唤小僵尸） */
  b1_jiangwang_attack_claw_cast:   { c:8, f:48, rows:6, i0:0, scale:2.5, fps:30 },   // v1.1.20r：换 8 列 6 行新图（f 32→48）；v1.1.20r2：scale 2.5 保留、**撤掉 oy 0.25**（同批起手图观感偏上 ⇒ 改回正常水平，oy 不写 = 0）
  b1_jiangwang_attack_claw_hit:    { c:8, f:32, rows:4, i0:0, scale:2.0, fps:30 },
  b1_jiangwang_drain_feed_cast:    { c:8, f:32, rows:4, i0:0, scale:2.0, fps:30 },
  b1_jiangwang_drain_feed_hit:     { c:8, f:32, rows:4, i0:0, scale:2.0, fps:30 },
  b1_jiangwang_summon_minion_self: { c:8, f:32, rows:4, i0:0, scale:2.0, fps:30 },
  /* 第一幕 · 旱魃（焰爪 / 灼烧施加 / 灼烧跳伤循环） */
  b2_hanba_attack_flame_claw_cast: { c:8, f:48, rows:6, i0:0, scale:2.0, fps:30 },   // v1.1.20r：换 8 列 6 行新图（f 32→48）；v1.1.20r2：scale 保留、**撤掉 oy 0.25**（实机观感偏上 ⇒ 改回正常水平，oy 不写 = 0）
  b2_hanba_attack_flame_claw_hit:  { c:8, f:32, rows:4, i0:0, scale:2.0, fps:30 },
  b2_hanba_burn_tick_hit:          { c:8, f:32, rows:4, i0:0, scale:2.0, fps:30 },
  /* 第一幕 · 血尸（爪击 / 蓄力 / 蓄力重击 / 吸血） */
  b3_xueshi_attack_claw_cast:      { c:8, f:48, rows:6, i0:0, scale:2.0, fps:30 },   // v1.1.20r：换 8 列 6 行新图（f 32→48）；v1.1.20r2：scale 保留、**撤掉 oy 0.25**（实机观感偏上 ⇒ 改回正常水平，oy 不写 = 0）
  b3_xueshi_attack_claw_hit:       { c:8, f:32, rows:4, i0:0, scale:2.0, fps:30 },
  b3_xueshi_heavy_smash_cast:      { c:8, f:48, rows:6, i0:0, scale:2.0, fps:30 },   // v1.1.20r：换 8 列 6 行新图（f 32→48）；v1.1.20r2：scale 保留、**撤掉 oy 0.25**（实机观感偏上 ⇒ 改回正常水平，oy 不写 = 0）
  b3_xueshi_heavy_smash_hit:       { c:8, f:32, rows:4, i0:0, scale:2.0, fps:30 },
  b3_xueshi_lifesteal_cast:        { c:8, f:32, rows:4, i0:0, scale:2.4, fps:30 },   // v1.1.19（用户 txt「特效太小」）2.0→2.4
  b3_xueshi_lifesteal_hit:         { c:8, f:32, rows:4, i0:0, scale:2.0, fps:30 },
  /* 第二幕 · 谢必安（哭丧棒 / 勾魂 / 分化；分出的「必安」复用同一套） */
  b4_xiebian_attack_staff_cast:    { c:8, f:48, rows:6, i0:0, scale:2.0, fps:30 },   // v1.1.20r：换 8 列 6 行新图（f 32→48）；v1.1.20r2：scale 保留、**撤掉 oy 0.25**（实机观感偏上 ⇒ 改回正常水平，oy 不写 = 0）
  b4_xiebian_attack_staff_hit:     { c:8, f:32, rows:4, i0:0, scale:2.0, fps:30 },
  b4_xiebian_soul_hook_cast:       { c:8, f:32, rows:4, i0:0, scale:2.0, fps:30 },
  b4_xiebian_soul_hook_hit:        { c:8, f:32, rows:4, i0:0, scale:2.0, fps:30 },
  b4_xiebian_split_self:           { c:8, f:32, rows:4, i0:0, scale:2.0, fps:30 },
  /* 第二幕 · 判官王（惊堂木 / 记名 / 清算） */
  b5_judge_attack_gavel_cast:      { c:8, f:48, rows:6, i0:0, scale:2.0, fps:30 },   // v1.1.20r：换 8 列 6 行新图（f 32→48）；v1.1.20r2：scale 保留、**撤掉 oy 0.25**（实机观感偏上 ⇒ 改回正常水平，oy 不写 = 0）
  b5_judge_attack_gavel_hit:       { c:8, f:32, rows:4, i0:0, scale:2.0, fps:30 },
  b5_judge_record_hit:             { c:8, f:32, rows:4, i0:0, scale:2.0, fps:30 },
  b5_judge_settle_cast:            { c:8, f:32, rows:4, i0:0, scale:2.0, fps:30 },
  b5_judge_settle_hit:             { c:8, f:32, rows:4, i0:0, scale:2.0, fps:30 },
  /* 第二幕 · 孟婆（汤勺 / 忘忧 / 汲血） */
  b6_mengpo_attack_ladle_cast:     { c:8, f:48, rows:6, i0:0, scale:2.0, fps:30 },   // v1.1.20r：换 8 列 6 行新图（f 32→48）；本条本无 oy，保持无
  b6_mengpo_attack_ladle_hit:      { c:8, f:32, rows:4, i0:0, scale:2.0, fps:30 },
  b6_mengpo_forget_hit:            { c:8, f:32, rows:4, i0:0, scale:2.0, fps:30 },
  b6_mengpo_heal_self:             { c:8, f:32, rows:4, i0:0, scale:2.0, fps:30 },
  /* 第三幕 · 夜王（暗刃 / 暗夜威压） */
  b7_yewang_attack_blade_cast:     { c:8, f:48, rows:6, i0:0, scale:2.0, fps:30 },   // v1.1.20r：换 8 列 6 行新图（f 32→48）；v1.1.20r2：scale 保留、**撤掉 oy 0.25**（实机观感偏上 ⇒ 改回正常水平，oy 不写 = 0）
  b7_yewang_attack_blade_hit:      { c:8, f:32, rows:4, i0:0, scale:2.0, fps:30 },
  b7_yewang_pressure_hit:          { c:8, f:32, rows:4, i0:0, scale:2.0, fps:30 },
  /* 第三幕 · 修罗王（业火斩 / 业火反噬 / 业火附体） */
  b8_xiuluo_attack_slash_cast:     { c:8, f:48, rows:6, i0:0, scale:2.0, fps:30 },   // v1.1.20r：换 8 列 6 行新图（f 32→48）；v1.1.20r2：scale 保留、**撤掉 oy 0.25**（实机观感偏上 ⇒ 改回正常水平，oy 不写 = 0）
  b8_xiuluo_attack_slash_hit:      { c:8, f:32, rows:4, i0:0, scale:2.0, fps:30 },
  b8_xiuluo_backlash_self:         { c:8, f:32, rows:4, i0:0, scale:2.0, fps:30 },
  b8_xiuluo_karma_fire_self:       { c:8, f:32, rows:4, i0:0, scale:2.0, fps:30 },
  /* 第三幕 · 阎罗天子（开局词缀 / 幽冥重击 / 轮回复活 / 召唤阴差） */
  b9_yanluo_affix_self:            { c:8, f:32, rows:4, i0:0, scale:2.0, fps:30 },
  b9_yanluo_attack_smash_cast:     { c:8, f:48, rows:6, i0:0, scale:2.0, fps:30 },   // v1.1.20r：换 8 列 6 行新图（f 32→48）；v1.1.20r2：scale 保留、**撤掉 oy 0.25**（实机观感偏上 ⇒ 改回正常水平，oy 不写 = 0）
  b9_yanluo_attack_smash_hit:      { c:8, f:32, rows:4, i0:0, scale:2.0, fps:30 },
  b9_yanluo_revive_self:           { c:8, f:32, rows:4, i0:0, scale:2.0, fps:30 },
  b9_yanluo_summon_yinchai_self:   { c:8, f:32, rows:4, i0:0, scale:2.0, fps:30 }
};
/* `锁_破裂` **故意不在这张表里**：v0.62.0 已用移植 canvas 代码实现（playLockBreak），
   不接精灵图；30 条提示词文档里也没有它。 */

/* ——— v0.64.0：卡牌 → 特效 ———
   只登记「有对应素材」的牌（23/48）。**没登记的牌自动退回 v0.43 的 CSS 四件套**（符箓/护体/黑雾/脉冲），
   所以这里漏一张的后果只是「那张牌没有精灵图特效」，不是「那张牌没有特效」。
   a = 锚点：enemy 单体敌人 / field 战场（全体） / enemies 逐只存活敌人（全体牌一张对各敌各播一份，
               由 cardPlayFx 遍历 aliveEnemies() 落点；v1.1.20r 用户口径：万剑归宗要按敌人数分别施加） /
       player 玩家面板 / summon 屏幕中心（召唤位） /
       handcard 刚打出的那张手牌（v1.1.20 用户 txt #5/#9/#10/#12：尸王/纸人/小鬼/阴兵这几张的精灵图是**手牌特效**，
                              打在牌面中部，牌挪走后特效留在原位播完）。
   s = 覆写 FX_SHEETS 的 scale（默认不写，由对照图定）。 */
const CARD_FX = {
  /* 攻击 · 单体 */
  leifu:{n:'lei',a:'enemy'},          huofu:{n:'huo',a:'enemy'},
  duanren_leifu:{n:'lei',a:'enemy'},  // v1.0.13：沿用普通雷符的雷击精灵图（命中后敌人照走 HITFX 受击反应）
  jianfu:{n:'jian',a:'enemy'},        zhanyaojian:{n:'jian',a:'enemy'},
  tianlei:{n:'tianlei',a:'enemy'},
  /* 攻击 · 全体 */
  wanjian:{n:'wanjian',a:'enemies'},  baigui:{n:'baigui',a:'field'},   // v1.1.20r：万剑归宗 a:'enemies' —— 逐只存活敌人各播一份（原来 a:'field' 只在战场中心播一个）
  zhouyu:{n:'purple_rain',a:'enemies',stg:120},   // v1.1.20r：落点「逐只存活敌人」；v1.1.20r2（用户口径「其他角色都要改为逐个叠加效果来搭配连击音效」）：stg 120 ⇒ **逐个叠加**（每个敌人隔 120ms 落一份、key 带 uid 各自独立叠加）—— 咒雨 4 个角色共用本条目，一改全部生效
  /* 防御 · 护盾系（基础盾 block / 高级盾 jinzhong / 反伤 thorns / 净化 fodu） */
  jingang:{n:'block',a:'player'},     yinshen:{n:'block',a:'player'},
  tongpi:{n:'block',a:'player'},      xiejiashengyuan:{n:'block',a:'player'},
  jinguang:{n:'jinzhong',a:'player'}, jinzhong:{n:'jinzhong',a:'player'},
  jingji:{n:'thorns',a:'player'},     fanzhen:{n:'thorns',a:'player'},
  fodu:{n:'fodu',a:'player'},
  /* 鬼怪 · 单体压制 */
  zhongkui:{n:'zhongkui',a:'enemy'},  zhenyaoling:{n:'zhenyaoling',a:'enemy'},
  huapi:{n:'charm',a:'enemy'},
  /* 鬼怪 · 召唤（v1.1.20 用户 txt #5/#9/#10/#12：这四张的精灵图是**手牌特效** ——
     打出时锚在刚点下的那张手牌中部，不再往屏幕中心的 summon 锚点放。
     召唤物本身仍在顶栏小字 / 逐只召唤的黑雾照旧由 addSummon 的 summonMistFx 收口。） */
  zhiren:{n:'zhiren',a:'handcard'},     xiaogui:{n:'xiaogui',a:'handcard'},
  yinbingguo:{n:'yinbing',a:'handcard'},shi_wang:{n:'shiwang',a:'handcard'},
  /* v1.1.x 审计补：0 费【阴兵】本体（引魂灯发牌）也沿承【阴兵过境】的召唤精灵图 ——
     之前只靠 addSummon 的黑雾，牌本体没有自己的特效。v1.1.20 起同挂手牌锚点。 */
  yinbing:{n:'yinbing',a:'handcard'},
  /* 天师里程碑（v1.1.2）：雷谴符是群雷 → 战场锚点（复用雷符的雷击精灵图）；
     五雷法印是自身强化 → 玩家锚点（复用遗物触发金光 relic_proc）。
     点咒符**不在此表**：它的落咒走 applyCurse 的 playFx('curse') 收口点，登记了会同一帧放两遍。 */
  leiqianfu:{n:'lightning',a:'field'},   // v1.1.x：雷谴符逐段清算改用用户交付的落雷精灵图（lightning）
  wuleifayin:{n:'relic_proc',a:'player'},
  /* 茅山赶尸人里程碑（v1.1.3）：赶尸令 / 万尸朝宗都是「召唤纸人」⇒ 沿承【纸人】的召唤精灵图
     （v1.1.20 起与【纸人】同挂 handcard 手牌锚点）。逐只召唤的黑雾另由 addSummon 的 summonMistFx 收口，
     两张卡各自只补这一张「召唤纸人」的本体特效。 */
  ganzhiling:{n:'zhiren',a:'handcard'},
  wanshichaozong:{n:'zhiren',a:'handcard'},
  /* 苦行武僧里程碑（v1.1.4）：罗汉伏虎是拳掌重击 → 单体锚点（复用斩击精灵图）；
     化甲为毒是向全场泼毒 → 战场锚点（复用诅咒的弥散精灵图，逐敌受击反应照走 HITFX）。 */
  luohanfuhu:{n:'jian',a:'enemy'},
  huajiaweidu:{n:'curse',a:'field'},
  /* 血祭阴差里程碑（v1.1.5）：饮血刃是近战斩击 → 单体锚点（复用斩击精灵图）。
     焚身咒**不在此表**：它是自身增益（与【燃血术】同族），退回 CSS 四件套。 */
  yinxueren:{n:'jian',a:'enemy'}
};
/* 没登记的牌 = 确实没有对应素材，**不是忘了**。其中这三张最容易被当成漏：
   铁布衫（伤害=当前格挡+引爆诅咒）/ 噬魂术（引爆诅咒）/ 群鬼乱舞（触发全部召唤）——
   提示词文档的 30 条里没有它们，已记进 `特效接入对照表.md` 的「有机制没素材」清单。 */

/* I 组·遗物分化：12 件法器按「铃/幡 · 符/笔/剑 · 镜/录/道心」三类分开，
   聚宝盆与返魂香不属这三类 → 退回通用的 relic 音（所以 relic 键也没退役）。 */
const RELIC_SFX = {
  zhaohunfan:'relic_bell',   shehunling:'relic_bell',
  zhushabi:'relic_fu',       jifengfu:'relic_fu',        hushenfu:'relic_fu',
  taomujian:'relic_fu',      tongqianjian:'relic_fu',
  yinyangjing:'relic_mirror',daoxin:'relic_mirror',      baiguilu:'relic_mirror',
  /* —— 本次新增 15 件：按「铃 / 符·笔·剑 / 镜·录·道心」同一套三分类落键 —— */
  tongling:'relic_bell',     guling:'relic_bell',        ranxueling:'relic_bell',
  duanren:'relic_fu',        zhenmoyin:'relic_fu',       leifaxinjue:'relic_fu',
  taishangzhou:'relic_fu',   luohanquan:'relic_fu',      jingangjing:'relic_fu',
  xuemodao:'relic_fu',
  yinyangyu:'relic_mirror',  shiyu:'relic_mirror',       yinhundeng:'relic_mirror',
  budongmingwang:'relic_mirror', xueyu:'relic_mirror',
  /* —— 天师里程碑（v1.1.2）：朱砂砚是书符的砚台，与朱砂笔同族归「符/笔/剑」 —— */
  zhushayan:'relic_fu',
  /* —— 茅山赶尸人里程碑（v1.1.3）：阴司牒是阴司的文书（牒/录），归「镜/录/道心」那一类 —— */
  yinsidie:'relic_mirror',
  /* —— 苦行武僧里程碑（v1.1.4）：金刚杵是降魔法器（杵/剑族）归「符·笔·剑」；达摩影是虚影（镜/录/道心） —— */
  jingangchu:'relic_fu',
  damoying:'relic_mirror',
  /* —— 血祭阴差里程碑（v1.1.5）：酆都令是阴司令牌（铃/幡族），归「铃」 —— */
  fengduling:'relic_bell'
};
function relicSfxFor(r){ return (r && RELIC_SFX[r.id]) || 'relic'; }
/* —— 尸气 —— */
function gainShiqi(n){ if(!n || n<=0) return;
  const __before=(G.尸气||0);
  G.尸气 = Math.min(relicMaxShiqi(), __before+n);
  if(G.尸气>__before){ sfxOnce('card_shiji', 120); playFx('shiqi', 'player'); } }   // v0.61.25：尸气真的涨了才出声，且防同帧叠音；v0.64.0 补特效（同理：涨了才播）
function hasShiqi(n){ return (G.尸气||0) >= n; }
function spendShiqi(n){ if(!hasShiqi(n)) return false; G.尸气 -= n;
  if(G.hero==='ganshiren' && n>0) heal(n);   // v0.61.37 新被动：每消耗 1 点【尸气】回复 1 点生命
  return true; }
/* —— 血怒（不自动烧；只在使用“每层+N”效果时消耗实际用到的层数） —— */
function gainRage(n){ if(!n || n<=0) return;
  const __b=(G.xuenu||0);
  G.xuenu = Math.min(relicMaxXuenu(), __b+n);
  const _got = G.xuenu-__b;
  if(G.xuenu>__b){ sfx('card_xuenu'); playFx('xuenu', 'player'); }   // v0.61.32：满层后不再出声（满了就「涨不上去」了）；v0.64.0 补特效
  /* 燃血令[金·阴差]：每累积 20 点血怒，立刻获得 1 符文（累计口径 —— 不随消耗回退，
     读数 G.rageAccum 挂在血怒标识旁，见 js/60_boot.js 顶栏）。 */
  if(hasRelic('ranxueling') && _got>0){
    G.rageAccum=(G.rageAccum||0)+_got;
    while(G.rageAccum>=20){ G.rageAccum-=20; G.energy+=1; floatMsg('燃血令 · 符文 +1'); log(`燃血令：累积血怒满 20，获得 1 点符文（现 ${G.energy}）`); ranxuelingFx(); }   // v1.1.x：血怒累积位凝血滴→淡红飘带→符文标识凝符文并融入
  } }
function rageLayers(){ return G.xuenu||0; }
/* per=每层加成, cap=加成上限：返回可使用的层数，并就地消耗 */
function rageSpend(per, cap){ const layers=Math.floor(cap/per); const use=Math.min(layers, rageLayers()); if(use>0){ G.xuenu -= use; } return use; }
/* —— 召唤 —— */
/* v0.61.37：删除 v0.61.10(P6) 的「召唤 4 种召唤物寿命 +1」被动，改为【每消耗 1 点尸气回复 1 点生命】
   （落在 spendShiqi）。寿命偏移的唯一来源没了，A 列召唤物 dur 从此与卡面完全一致
   （纸人 2 / 小鬼 2 / 五通神 2-3 / 阴兵 3）。 */
function addSummon(o){ G.summonsMadeTurn=(G.summonsMadeTurn||0)+1;
  /* v1.0.20：记下**创建时的持续回合数**（dur0）—— 骨铃[紫·赶尸人] 按其回血的口径。
     必须在这里落定：之后每回合的 dur-- 会把 dur 磨到 0，光看 dur 已经读不出「原本持续几回合」。
     （五通神那张牌是 addSummon 之后才调 wutongTick 扣当回合寿命 ⇒ dur0 仍是卡面 dur，不受影响。） */
  o.dur0 = o.dur;
  sfx('card_summon');   // v0.61.32：所有己方召唤的**唯一**入口（含尸王与附灵术）
  summonMistFx(o.type, nextMistSeq(o.type));   // v1.0.17：从刚打出的鬼怪牌冒一团翻滚黑雾飞到召唤物位；v1.0.21：按类型上色 + 同批多只错峰追尾
  G.summons.push(o); return o; }
/* 五通神「回合开始」效果（现形当回合立即结算一次，之后每个回合开始再触发；寿命 -1） */
function wutongTick(s, noDecay){   // v0.61.39：noDecay=true 时只结算效果、不扣寿命（附灵术/群鬼乱舞用）
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
/* 苦行武僧：某个召唤单位在「回合开始」时会带来的格挡（纸人/阴兵看升级态，五通神固定 6） */
function summonTurnBlock(s){
  if(G.hero!=='wuseng') return 0;
  if(s.type==='zhiren') return s.up?3:2;
  if(s.type==='yinbing') return s.up?4:3;
  if(s.type==='wutong') return 6;   // v0.61.36 武僧列：五通神每回合 4 → 6（与五通神 eff 的 wv 必须一致）
  return 0;
}
/* 预格挡：下一回合开始时，场上召唤单位预计带来的格挡合计（仅苦行武僧，供卡面/顶栏显示） */
function preBlockNextTurn(){
  if(G.hero!=='wuseng') return 0;
  let n=0;
  for(const s of G.summons){ if(s.dur>0) n+=summonTurnBlock(s); }
  return n;
}
/* v1.0.4：预伤害 —— 下一回合「回合末」场上召唤物预计造成的**总伤害**（供折叠键的「伤 X」）。
   口径逐条对齐 summonAct()：纸人/小鬼/阴兵打单体 v，尸王对**全体**打 s.v（每只一份）。
   ⚠️ 排除五通神 —— 它走「回合开始」给格挡/回血，从不造成伤害（summonAct 的 type 白名单里也没有它）。
   ⚠️ 小鬼「命中带诅咒目标 +2/3」与纸人「阴差回血」不计：前者依赖随机目标、是偶发项
      （与 30_engine.js 里小鬼卡面预览同口径），后者根本不是伤害。 */
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
    /* wutong / 其它：不造成伤害，不计 */
  }
  return n;
}
/* 预恢复（v1.0.21 用户口径「每个角色都要」）：**这回合之后**，场上召唤单位将为你带来的预计回复总量。
   逐条对齐真实结算，多个来源重叠时一并累加（用户明确要求「重叠也要显示总额」）：
     ① 阴差：纸人 / 阴兵的**攻击吸血**（summonAct 里 s.healV —— 需有存活敌人，打空则不回）；
     ② 阴差：五通神「回合开始」回血（wutongTick 的 s.v）；
     ③ 骨铃：本回合末 / 下回合开始将消散的召唤物，按创建时的 dur0 返魂（onSummonDeath）；
     ④ 阴差：小鬼消散回血（onSummonDeath 的 up?4:2）；
     ⑤ 渡魂归己：本回合召唤物真实伤害 × ratio（duhunFlush 的 floor 口径）。
     ⑥ 尸气回流[里程碑·赶尸人 t2]：每个消散的召唤物额外回 2（与 ③ 骨铃叠加，显示两者之和）。
   ⚠️ 与 summonAct 一致：尸王既不吸血也不吃这些来源，故只由 ③ 覆盖。 */
function preSummonHeal(){
  if(!G || !G.summons) return 0;
  let n=0;
  const hasEnemy=aliveEnemies().length>0;
  for(const s of G.summons){
    const dur=s.dur||0;
    if(dur<=0 && !s.indefinite) continue;
    if(G.hero==='yincha' && hasEnemy && (s.type==='zhiren'||s.type==='yinbing')) n += (s.healV||2);   // ①
    if(G.hero==='yincha' && s.type==='wutong') n += (s.v||3);                                        // ②
    const willDie = !s.indefinite && dur<=1;
    if(willDie && hasRelic('guling')) n += (s.dur0!=null ? s.dur0 : dur);                            // ③
    if(willDie && G.hero==='yincha' && s.type==='xiaogui') n += (s.up?4:2);                          // ④
    /* ⑥ 尸气回流[Milestone·赶尸人 t2]：每个召唤物死亡额外回 2（用户口径：与骨铃**叠加**，预恢复里显示两者之和）。 */
    if(willDie && G.hero==='ganshiren' && mileClaimed('ganshiren_t2')) n += 2;
  }
  if(duhunActive()){ const h=Math.floor(preSummonDamage()*(G.duhun.ratio||0)); if(h>0) n+=h; }        // ⑤
  return n;
}
/* 预尸气：下一回合开始时，场上召唤物将带来的【尸气】合计（仅茅山赶尸人，供顶栏显示）。
   ＝ ①本回合末会消散的召唤物的死亡返还（纸人 2 / 小鬼 2 或 3 / 阴兵 1）
     ＋ ②下回合开始仍在场的召唤物，每个 +1（＝「养尸为用」被动）。
   ⚠ 与 startTurn() 的真实结算顺序对齐：尸气被动跑在 wutongTick **之前**，所以 dur=1 的五通神
   **算 +1**、且它消散**不给**尸气；尸王消散只回牌、不给尸气，故两边都不计。 */
function preShiqiNextTurn(){
  if(G.hero!=='ganshiren') return 0;
  let n=0;
  for(const s of G.summons){
    if((s.dur||0)<=0) continue;
    const diesThisEnd = (s.type!=='wutong') && s.dur<=1;   // 回合末消散（五通神走回合开始的 tick）
    if(diesThisEnd){
      if(s.type==='zhiren') n+=2;
      else if(s.type==='xiaogui') n+=s.up?3:2;
      else if(s.type==='yinbing') n+=1;
      /* 尸王消散不给尸气 → 不计 */
    } else n+=1;   // 下回合开始仍在场 → 每个 +1
  }
  return n;
}
/* 预血怒：下一回合末场上存活的小鬼将带来的【血怒】合计（仅血祭阴差，供顶栏显示）。
   血怒的可预测来源只有小鬼这一条（summonAct 里 `if(G.hero==='yincha') gainRage(1)`）：
   小鬼每**行动一次** +1，行动完自己的 `dur--`。
   ⚠ 能活到下回合末的只有 `dur>=2` 的那批：`dur<=1` 的这次行动后就消散了（它那 1 层算**本回合**的进账，
   已进 G.xuenu，不算「预」）。其余来源（以血引怒按失血、反震/业火/闪避的回怒）由玩家操作决定，
   不是「到账」的固定收入，故不计入。 */
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
/* —— 镇魂（含“此前已被镇魂”永久标记） ——
   v1.1.20（用户 txt #11「镇妖铃…换个音效」）：第三参 snd 可改播专用键 ——
   镇妖铃走 `zhenyaoling`（素材/sfx/zhenyaoling.wav），钟馗镇魂不传、仍走 card_zhenhun。 */
function sealEnemy(e, turns, snd){
  if(!e) return false;
  if(isLinghua(e)){ sfx('kw_linghua'); log(e.name+' 灵化免疫了【镇魂】'); return false; }   // v0.61.32：弹开的听感要能分辨
  sfx(snd||'card_zhenhun');
  e.sealedEver=true; e.seal=true; e.sealTurn=turns||1; floatMsg('镇魂');
  log(e.name+' 被【镇魂】封印'+(e.sealTurn>1?(' '+e.sealTurn+' 回合'):''));
  return true;
}
/* —— 魅惑（charmPct=剩余伤害比例；升级更狠 25%） —— */
function charmEnemy(e, pct){
  if(!e) return false;
  if(isLinghua(e)){ sfx('kw_linghua'); log(e.name+' 灵化免疫了【魅惑】'); return false; }   // v0.61.32
  sfx('card_charm');
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


/* ===================== 遗物数据 =====================
   —— 本次改造（v1.0.0 内）：按《遗物设计.md》定稿，现有 12 件改 7 件，新增 15 件（3 通用 + 12 专属）。
   ⚠️ 专属遗物带 hero 字段（'tianshi'|'ganshiren'|'wuseng'|'yincha'），只进该英雄的掉落池；
      过滤在 js/50_ui.js 的 weightedRelic() / showRelicReward()（两个入口覆盖三处掉落点）。
   ⚠️ 桃木剑 / 铜钱剑 / 疾风符 / 护身符 **本次不动**（用户口径：「我都没碰」）。
   ⚠️ 新遗物必须配 素材/relic/<id>.png，缺图会静默空白（relicIcon → artImg onerror）。 */
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

  /* —— 新增 · 通用（四英雄共享池） —— */
  {id:'tongling',    name:'铜铃',   rarity:'white', desc:'战斗开始时额外抽 2 张牌'},
  {id:'yinyangyu',   name:'阴阳鱼', rarity:'blue',  desc:'受到负面效果时，恢复 2 点生命'},
  {id:'duanren',     name:'断刃',   rarity:'gold',  desc:'牌库中生成一张【断刃雷符】：数值与属性同【雷符】，可受增益与升级'},

  /* —— 新增 · 专属 · 符箓天师（诅咒流） —— */
  {id:'zhenmoyin',    hero:'tianshi',   name:'镇魔印',     rarity:'gold',   desc:'被动强化：【咒印道体】溢出诅咒转化的格挡 +1（每层 3 点），且每回合施加的诅咒 +1 层'},
  {id:'leifaxinjue',  hero:'tianshi',   name:'雷法心诀',   rarity:'purple', desc:'敌人每次诅咒达到 6 层，受到 4 点雷击'},
  {id:'taishangzhou', hero:'tianshi',   name:'太上咒箓',   rarity:'gold',   desc:'敌人身上的诅咒达到 6 层时，其受到的伤害 +25%'},
  /* —— 里程碑专属 · 符箓天师（里程轨 tianshi_t4）——
     与两张里程碑牌同一套「单独卡池」：未领取 t4 前进不了遗物池（见 mileOn 的硬门禁）。 */
  {id:'zhushayan',    hero:'tianshi',   name:'朱砂砚',     rarity:'purple', mile:'tianshi_t4', desc:'敌人每次【诅咒】达到 6 层上限时，抽 1 张牌'},

  /* —— 新增 · 专属 · 茅山赶尸人（尸气流） —— */
  {id:'shiyu',       hero:'ganshiren', name:'尸玉',       rarity:'blue',   desc:'尸气上限 +3；战斗开始时获得 3 点尸气'},
  {id:'guling',      hero:'ganshiren', name:'骨铃',       rarity:'purple', desc:'每个召唤单位死亡时，按其持续过的回合数恢复等量生命'},
  {id:'yinhundeng',  hero:'ganshiren', name:'引魂灯',     rarity:'gold',   desc:'牌库中生成一张 0 费【阴兵】（召唤 1 只阴兵，可受增益与升级）'},
  /* —— 里程碑专属 · 茅山赶尸人（里程轨 ganshiren_t5）——
     与两张里程碑牌同一套「单独卡池」：未领取 t5 前进不了遗物池（见 mileOn 的硬门禁）。
     只强化【尸王】这一张牌：尸王每次攻击后额外获得 5 点格挡（卡面自动进入「强化态」，见 50_ui.js）。 */
  {id:'yinsidie',    hero:'ganshiren', name:'阴司牒',     rarity:'gold',   mile:'ganshiren_t5', desc:'强化【尸王】：尸王每次攻击后，额外获得 5 点格挡'},

  /* —— 新增 · 专属 · 苦行武僧（格挡流） —— */
  {id:'luohanquan',    hero:'wuseng',   name:'罗汉拳套',   rarity:'blue',   desc:'永久自带 2 点反伤（荆棘）'},
  {id:'jingangjing',   hero:'wuseng',   name:'金刚经残页', rarity:'purple', desc:'回合结束保留的格挡上限由 3 提升到 6'},
  {id:'budongmingwang',hero:'wuseng',   name:'不动明王像', rarity:'gold',   desc:'战斗开始时自动触发【卸甲生元】'},
  /* —— 里程碑专属 · 苦行武僧（里程轨 wuseng_t4 / wuseng_t5）——
     与两张里程碑牌同一套「单独卡池」：未领取对应档位前进不了遗物池（见 mileOn 的硬门禁）。
       · t4 金刚杵：本场战斗内累计获得过的格挡，每满 50 送一张临时【铁布衫】（oneShot 不进牌库循环）；
       · t5 达摩影：格挡被敌人一击打光时爆破，造成「击碎前格挡总量」的伤害（逐点随机分配给全体敌人）。 */
  {id:'jingangchu',  hero:'wuseng',   name:'金刚杵',     rarity:'purple', mile:'wuseng_t4', desc:'本场战斗内每累计获得 50 点格挡，手牌多一张临时【铁布衫】（不进牌库循环）'},
  {id:'damoying',    hero:'wuseng',   name:'达摩影',     rarity:'gold',   mile:'wuseng_t5', desc:'格挡被敌人击碎时爆破，造成「击碎前格挡总量」的伤害，随机分配给全体敌人'},

  /* —— 新增 · 专属 · 血祭阴差（血怒流） —— */
  {id:'xueyu',       hero:'yincha',    name:'血玉',       rarity:'blue',   desc:'血怒上限 +3'},
  {id:'ranxueling',  hero:'yincha',    name:'燃血令',     rarity:'purple', desc:'每累积 20 点血怒，立刻获得 1 符文'},
  {id:'xuemodao',    hero:'yincha',    name:'血魔刀',     rarity:'gold',   desc:'生命低于 30% 时，攻击牌伤害 +25%'},
  /* —— 里程碑专属 · 血祭阴差（里程轨 yincha_t5）——
     与两张里程碑牌同一套「单独卡池」：未领取该档前进不了遗物池（见 mileOn 的硬门禁）。
       · t5 酆都令：每场战斗一次，生命**首次**降至 9 点及以下（绝对血量）时，立即充满【血怒】，
         且本回合对敌伤害翻倍（与其他增伤走同一加法桶，与【血魔刀】+25% 相加，例：1 + 1.0 + 0.25）。
         触发点：loseHp 与 dealDamageToPlayer 的扣血之后 ⇒ 与【道心】同场时，道心先结算（用户口径「道心优先」）。 */
  {id:'fengduling',  hero:'yincha',    name:'酆都令',     rarity:'gold',   mile:'yincha_t5', desc:'每场战斗一次：生命首次降至 9 点（绝对）及以下时，立即充满【血怒】，本回合对敌伤害翻倍'},
];
/* —— 待交付美术素材登记（设计稿见项目根目录《美术设计要求.md》）——
   设计已定稿、图还没到手。这些路径在 `_patch/verify_dist.py` 的 [1] 素材覆盖闸里**按名单豁免**，
   否则「缺图」会让打包闸假红，逼得人要么乱塞占位图、要么把闸整个关掉。
   ⚠️ 图交付之后**必须把对应条目删掉** —— 删一条，闸就多守一张（名单会随交付缩短，不会烂在这）。
   ⚠️ 只登记「路径写死在 id 规则里、被闸扫到」的那两类：`relic/<id>.png` 与 `card/<id>.png`。
      符文 / buff / fx 这些走的是运行时拼串（`buff/`+id+'.png'），闸本来就扫不到，不必登记。 */
/* v1.0.14：顶栏 / 玩家面板的状态图标（金币 / 血量）。**图还没到** —— iconTag 在文件缺席时逐字节
   回落成现在的 CSS 圆点（灰度/色弱下靠形状也能分），图一放进 素材/ui/ 就自动换成 <img>，代码零改动。
   本表是唯一真相源：60_boot.js 只从它取路径，_patch/verify_dist.py 也从它取名单（python 侧不镜像）。 */
const STAT_ICONS = { gold:'ui/stat_gold.png', hp:'ui/stat_hp.png' };
/* v1.0.17：名单清空 —— 已交付的图都到位了：
   · 金币 / 血量状态图标已放进 素材/ui/stat_gold.png、stat_hp.png；
   · 主菜单「解锁」符纸**沿用 素材/ui/menu/leaderboard.png**（用户口径）⇒ 不再另出 mileage.png。
   闸从此重新守住每一张图：新待出图必须同步登记进本表，否则会被 verify_dist 的 [2] 报成「从未被游戏请求」。 */
const ART_PENDING = [
  /* v1.1.5（2026-10-11）：四批里程碑待出图**全部交付、名单清空** ——
     天师 4（dianzhoufu / leiqianfu / wuleifayin / zhushayan）＋
     赶尸人 3（ganzhiling / wanshichaozong / yinsidie）＋
     武僧 4（luohanfuhu / huajiaweidu / jingangchu / damoying）＋
     阴差 3（yinxueren / fenshenzhou / fengduling）＝ 14 张，均已入库。
     闸从此重新守住每一张：新待出图必须同步登记进本表，否则会被 verify_dist 的 [2] 报成「从未被游戏请求」。 */
];
function hasRelic(id){ return G && G.relics.includes(id); }
function relById(id){ return RELICS.find(r=>r.id===id); }
/* —— 获得遗物的**唯一入口** ——
   ⚠️ 三处获取点都必须走这里：精英三选一 pickRelic()、Boss 战利品 showBossReward()、
      古井许愿 doWellOffer()。漏一处就会出现「拿到【断刃】却没有断刃雷符」这种半截状态。
   需要「获得即生效/发牌」的遗物都挂在这个函数里，别再散落到各入口。 */
function grantRelic(r, srcEl, done){
  if(!r){ if(done) done(); return; }
  if(!hasRelic(r.id)) G.relics.push(r.id);
  /* v1.0.17：拿到遗物的那一刻，叠一道**通用金光**（fx/relic_proc，自绘：金符纹扩散 + 上浮光点）。
     它是一张「任何遗物生效都能复用」的通用素材 —— 这里先挂在「获得遗物」这个最显眼的触点上。
     只在战斗场景里播：菜单 / 地图场景没有 #player-panel，锚点解析不到会白跑一次。 */
  if(typeof SCENE !== 'undefined' && SCENE === 'battle'){ try{ playFx('relic_proc', 'player'); }catch(e){} }
  if(r.id==='duanren'){ G.deck.push(cardById('duanren_leifu')); log('断刃：牌库中生成一张【断刃雷符】'); }
  if(r.id==='yinhundeng'){ G.deck.push(cardById('yinbing')); log('引魂灯：牌库中生成一张【阴兵】'); }
  /* v1.1.x（用户口径）：获得遗物的瞬间，小图标**从来源位置飞进锦囊**，到位后锦囊闪金光。
     srcEl 由调用方按语境给（精英三选一给选中那张卡）；不给就取战斗里**最后击杀的敌人**。 */
  flyToPouch(srcEl || dropSourceEl(), relicIcon(r), done);
}

/* —— 遗物对「上限类 / 被动数值」的加成：统一走函数 ——
   为什么不是直接改 G.maxShiQi / G.maxXuenu：
     遗物是**中途获得**的，若写成一次性赋值，存档续档后就会与遗物态脱节。
     派生函数读的时候现算，天然与 G.relics 一致（存档只存 relics 即可）。 */
function relicMaxShiqi(){ return 12 + (hasRelic('shiyu') ? 3 : 0); }        // 尸玉：尸气上限 +3
function relicMaxXuenu(){ return 10 + (hasRelic('xueyu') ? 3 : 0) + (mileClaimed('yincha_t2') ? 3 : 0); }  // 血玉 +3；里程档【血怒·涌】+3（两者可叠）
function relicBlockKeep(){ return hasRelic('jingangjing') ? 6 : 3; }        // 金刚经残页：保留上限 3→6
function relicThorns(){ return hasRelic('luohanquan') ? 2 : 0; }            // 罗汉拳套：反伤基线 2
/* 铁壁（武僧里程碑 t2 · 纯机制）：领取后**该角色永久被动** —— 自带全局荆棘反伤 2 点。
   与【罗汉拳套】/临时【荆棘】同走 dealDamageToPlayer 的受击反伤那一条口径（数值直接相加）。
   为什么走函数而不是一次性赋值：与 relicMaxShiqi 同理 —— 遗物/里程碑是中途获得的，
   派生函数读的时候现算，天然与领取态一致（不落存档也不会脱节）。 */
function mileThorns(){ return (G && G.hero==='wuseng' && mileClaimed('wuseng_t2')) ? 2 : 0; }
function relicCurseOverflowBlock(){ return 2 + (hasRelic('zhenmoyin') ? 1 : 0); }   // v1.0.18 用户口径：天师被动基线 1 → 2；镇魔印再 +1（每层 3 点）
/* 镇魔印[金·天师]：「随机释放的诅咒增加 1」—— 经与用户确认，指的是**被动【咒印道体】每回合施加的
   诅咒层数 1 → 2**（该项本就不是随机目标，用户口径按「加强被动本身」理解）。 */
function relicPassiveCursePerTurn(){ return 1 + (hasRelic('zhenmoyin') ? 1 : 0); }
/* 道心：本场战斗已触发过 ⇒ 遗物图标要变灰（用户定稿要求「本场战斗使用后，要变成灰色的图」）。
   三个遗物展示点都拼上这个类：60_boot.js 顶栏详情、50_ui.js runStatusHTML / mapTopbarHTML。 */
function relicUsedCls(id){ return (id==='daoxin' && G && G.daoxinUsed) ? ' relic-used' : ''; }
/* —— 英雄被动的「遗物加成」追加行 ——
   用户定稿：「如果涉及被动的修改，获得对应遗物也要将点击角色显示的被动信息及时修改」。
   做法：被动**全文一个字不删**，只在 tooltip 末尾追加一行「遗物加成 · …」，把被遗物改写的
   数值（上限 / 保留量 / 溢出格挡等）如实列出。接入点：resolveTip 的 type==='hero' 分支。 */
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

/* ===================== 灵汁（战斗消耗品，类药水） ===================== */
/* v1.0.14：4 瓶 → 8 瓶（治疗 / 资源 / 防御 / 过牌 四系各补一瓶，补到 8）。
   `ic` 是**顶栏芯片的回落 emoji**（顶栏只出图标+数量，不出名字）——
   真图（`素材/lingshi/lingshi_<id>.png`）登记进 LINGSHI_FILE 后自动换图，没图就用这枚 emoji。 */
const POTIONS = [
  {id:'huanyanglu', name:'还阳露', ic:'💧', desc:'恢复 10 点生命', eff:()=>heal(10)},
  {id:'huangquanjiu', name:'黄泉酒', ic:'🍶', desc:'获得 2 点符文', eff:()=>{ G.energy+=2; floatMsg('符文 +2'); }},
  {id:'zhenhunshui', name:'镇魂水', ic:'🛡️', desc:'获得 10 点格挡', eff:()=>gainBlock(10)},
  {id:'mengpotang', name:'孟婆汤', ic:'🃏', desc:'抽 2 张牌', eff:()=>drawCards(2)},
  {id:'jingangjiu', name:'金刚酒', ic:'👊', desc:'本回合攻击牌 +4 伤害（多段牌每段 +2）', eff:()=>{ G.turnAtkBuff=(G.turnAtkBuff||0)+4; floatMsg('攻击 +4'); }},
  /* v1.0.19：用户口径「清心露效果跟佛渡一样，除清负面外还清废牌，只是只能在该回合生效」——逐条对齐 佛渡(fodu) 的清场三件套。 */
  {id:'qingxinlu', name:'清心露', ic:'✨', desc:'清除自身全部负面状态与废牌，本回合免疫负面效果', eff:()=>{ clearJunk(); clearPlayerDebuffs(); G.debuffImmune=1; floatMsg('本回合免疫负面效果'); }},
  {id:'fugusan', name:'腐骨散', ic:'☠️', desc:'对全体敌人施加 2 层【腐毒】（每回合开始按层数累进掉血）', eff:()=>applyPoisonAll(2)},
  {id:'tongyoucha', name:'通幽茶', ic:'🍵', desc:'抽 3 张牌', eff:()=>drawCards(3)},
];
/* 腐毒：玩家对敌人的持续伤害（回合开始按**三角数**结算一次后减 1 层：第 n 层就多打 n 点）。
   ⚠️ 与敌人的【诅咒】无关 —— 诅咒是「印记」，本身不掉血；腐毒是真正的 DoT。
   ⚠️ 层数**没有全局硬顶**（腐骨散可叠加）；化甲为毒的 4/5 上限是「那张牌自己」施加时的口径，
      由这里的第二个参数 `cap` 承担：若目标已 ≥ cap 则该牌本次不再叠加（但不会把已有的高层数打回去）。
   ⚠️ n 是「本次施加层数」：腐骨散 = 2（int 直加）、化甲为毒 = 1（受 cap 约束）。 */
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
/* ===================== 灵石图标（道具 / 灵汁的贴图） =====================
   11 张，两类混装：
     · 3 张补给**已有遗物**（朱砂笔 / 护身符 / 返魂香）
     · 8 张是**灵汁的头一次图标**（还阳露 / 黄泉酒 / 镇魂水 / 孟婆汤 /
       金刚酒 / 清心露 / 腐骨散 / 通幽茶）
   灵汁此前一直是无图的纯文字卡（走 potionIcon 的 .ricon-fb 字牌占位），v0.69.0 补齐 4 张，
   v1.0.14 扩到 8 瓶灵汁时又补齐 4 张。

   ⚠️ **本表的键是「物品 id」，值是「磁盘上的文件名」，两者不保证同形** —— 表存在的意义
   就是让它们解耦，所以别拿 id 去硬拼路径。历史教训：`huangquanjiu` 的文件曾经少个 an
   （`lingshi_huangqujiu.png`），硬拼 `'lingshi/lingshi_'+id+'.png'` 会请求到不存在的路径，
   而 `artImg` 的 onerror 降级是 `outerHTML=''` —— 结果是**静默少一张图**，
   不报错、不断言、只有肉眼能看出来。v0.69.0 已把文件改名对齐，但**这条约束仍然成立**。

   表里没有的 id：遗物回落 `relic/<id>.png`（其余 9 个）；灵汁**不出图**（回落字牌占位）。 */
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
/* typeof 兜底：本表在 20_data.js，而 relicIcon 定义在更早加载的 10_audio.js ——
   只在运行时被调用，顺序没问题；但冒烟/降级场景下若本表缺位，也不该抛 ReferenceError。 */
function lingshiSrc(id){ return (typeof LINGSHI_FILE !== 'undefined' && LINGSHI_FILE[id]) || ''; }

function randomPotion(){
  /* v1.0.15：唯一入口 —— 只从**已解锁**的灵汁里抽（老 4 瓶恒开、新 4 瓶看里程碑）。
     兜底：门禁把池子抽空时放开门禁（理论上不会，但绝不允许出现空奖励/死循环）。 */
  let pool=POTIONS.filter(p=>mileOn('potion',p.id));
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
  if(G.enemyPhase) return;   // v1.0.14：敌人/召唤物行动演出期间不可使用灵汁
  const p=G.potions[i]; if(!p) return;
  p.eff(); G.potions.splice(i,1); sfx('heal');
  log(`使用灵汁【${p.name}】`); hideOverlay(); render();
}
/* v1.0.14：顶栏灵汁改「图标 + 数量」，不再写名字（用户口径）——
   名字与效果都在 data-tip（`potionname:`）里，点一下即可使用。 */
function usePotionByName(name){
  const i=G.potions.findIndex(p=>p.name===name);
  if(i<0) return;
  const p=G.potions[i];
  p.eff(); G.potions.splice(i,1); sfx('heal');
  log(`使用灵汁【${p.name}】`); render();
}

/* ===================== 废牌（敌人怨气机制） ===================== */
function junkCard(){ return {id:'yuanqi', name:'怨气', type:'junk', rarity:'white', cost:0, t:()=>'废牌 · 打出时失去 3 点生命（若不打出，回合结束自动打出）', eff:()=>{ directDamage(3, '怨气噬心：失去 3 点生命'); }}; }
function addJunkToHand(n){ let __added=0;
  for(let i=0;i<n;i++){
    if(G.hand.filter(c=>c.type==='junk').length>=3){ log('怨气已达上限（最多 3 张），不再塞入废牌'); break; }
    G.hand.push(junkCard()); __added++;
  }
  /* v0.61.32：把原来的中途 return 改 break —— 语义不变（到上限时同样不记「怨气缠身」那行），
     但能知道到底塞进去没有，好决定 kw_junk 要不要响。 */
  if(__added){ sfx('kw_junk'); log('怨气缠身：一张【怨气】废牌塞入你的手牌'); } }
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
function showTip(html, ev, cardMode){
  const el=tooltipEl(); el.innerHTML=html; el.classList.add('show');
  /* v1.0.4：卡的长按浮层放宽到 min(340px,88vw) —— 牌面短版被裁掉的机制全文在这里补全。
     桌面 hover 路径不传第三参 ⇒ tt-card 恒被摘掉 ⇒ 桌面样式与行为一个像素都不变。 */
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
    const icon=KIND_ICON[def.kind]?iconTag('ui/kind_'+def.kind+'.png', KIND_ICON[def.kind]):'';   // v1.0.13：图鉴/名牌早就是这枚图标了，悬停提示漏了一处，补齐（无图时逐字节回落 emoji）
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

/* ===================== 触屏长按简介（v1.0.4） ===================== */
/* 手机没有 hover ⇒ 上面那套 mouseover/mouseout 在触屏上**永远不触发**，「长按看完整
   信息」在手机上等于全站失效（战斗 / 锻造 / 选牌 / 牌库一并如此，与哪个面板无关）。
   这里补一条**触摸专有**的长按通道，覆盖三类目标：
     ① 面板里的卡（锻造 / 选牌 / 牌库 / 奖励 / 商店 …）—— 卡面 `.cdesc` 是 overflow:hidden，
        窄屏下机制被裁，长按弹**全文**（口径与手牌放大 showCardZoom 完全一致：走 c.t()，
        不是牌面短版 cardText）；
     ② 任意 [data-tip]（敌人 / 遗物 / 关键词 / 词缀 / 药水 / 徽章）；
     ③ 召唤物筹码（.summon 只有原生 title= 浮层，触屏根本看不到）→ 兜底成我们的浮层。
   ⚠️ 手牌整体跳过：#hand 已有 cardPointerDown 的 500ms → showCardZoom 通道，
      两条路同时挂会在同一张牌上打架（先弹浮层再开面板）。
   ⚠️ 只认 e.pointerType==='touch' ⇒ 桌面鼠标/触控板行为零变化。 */
const TIP_HOLD_MS=420, TIP_MOVE_PX=10;
let TIP_TIMER=null, TIP_START=null, TIP_SWALLOW=0;
function tipCancelHold(){ if(TIP_TIMER){ clearTimeout(TIP_TIMER); TIP_TIMER=null; } TIP_START=null; }
/* 从被触摸的节点反查一张卡的 id / 升级态。`.cplate` 带着 data-cardid（cardBody 与
   forgeCardHTML 两处模板写的），这里先 locate 到外层 .card，再在其**内部**查属性 ——
   这样点卡面任何位置（图窗 / 费用 / 铭牌 / 描述）都能命中，不必给 18 个 .card 根节点逐个补属性。
   ⚠️ 必须用 querySelector 在卡内找，不能用 closest 从触点往上找：点图窗时那条链上并没有 .cplate。 */
function tipCardOf(target){
  const cardEl=target && target.closest ? target.closest('.card') : null;
  const holder=cardEl && cardEl.querySelector ? cardEl.querySelector('[data-cardid]') : null;
  if(!holder) return null;
  return { id:holder.getAttribute('data-cardid'), up:holder.getAttribute('data-cardup')==='1' };
}
/* 卡的长按浮层：标题 + 费用 + **全文**机制 + 升级预览 + 消耗提示。
   ⚠️ 全文统一走 c.t()（与 showCardZoom 同源）—— 牌面上印的是短版 cardText，
      长按要看的就是被裁掉的那截全文，用 cardText 就白弹了。 */
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
/* 该触点是否有可长按的内容；返回 {html, card}。 */
function tipSpecAt(target){
  if(!target || !target.closest) return null;
  if(target.closest('#hand')) return null;          // 手牌交给 showCardZoom
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
    /* 锚点抬高 44px：否则浮层正好压在指尖底下，等于没弹。 */
    showTip(st.spec.html, { clientX:st.x, clientY:st.y-44 }, st.spec.card);
    TIP_SWALLOW=1;                                // 抬指那一下的 click 要吞掉，别把牌/选项点掉
  }, TIP_HOLD_MS);
}, true);
document.addEventListener('pointermove', function(e){
  if(e.pointerType!=='touch' || !TIP_START) return;
  if(Math.abs(e.clientX-TIP_START.x)>TIP_MOVE_PX || Math.abs(e.clientY-TIP_START.y)>TIP_MOVE_PX) tipCancelHold();
});
/* 抬指/被打断：清计时器。若此时浮层已经弹出（TIP_SWALLOW>0），补一个 350ms 兜底清零 ——
   浏览器在「长按后拖动过」这类情况下**可能不补发 click**，没有兜底的话那个 1 会留到
   下一次**无关的**点击上被吞掉（用户会感觉「点一下没反应」）。 */
document.addEventListener('pointerup', function(e){ if(e.pointerType!=='touch') return; tipCancelHold();
  if(TIP_SWALLOW>0) setTimeout(function(){ TIP_SWALLOW=0; }, 350); });
document.addEventListener('pointercancel', function(e){ if(e.pointerType!=='touch') return; tipCancelHold();
  if(TIP_SWALLOW>0) setTimeout(function(){ TIP_SWALLOW=0; }, 350); });
/* 长按成功 → 抬指 → click：capture 阶段吞掉这一次（早于所有 onclick 与 onDocClick），
   于是「看完整信息」不会顺手把这张牌 / 这个选项点掉，浮层也留在原地供阅读。
   ⚠️ 只吞一次：下一次点击照常执行（onDocClick 同时把浮层收起），不会连吃用户的真实操作。
      桌面鼠标 TIP_SWALLOW 恒为 0 ⇒ 零影响。 */
document.addEventListener('click', function(e){
  if(TIP_SWALLOW>0){ TIP_SWALLOW=0; e.stopPropagation(); e.preventDefault(); }
}, true);
/* 按英雄取费用：数值＝全英雄通用；对象＝{ganshiren:0, default:2}（如附灵术 A 列免费、D 列升级 1 费） */
function _costPick(v){ if(v==null) return null; if(typeof v!=='object') return v; return v[G.hero]!=null?v[G.hero]:(v.default!==undefined?v.default:null); }
function cardCost(c){ const u=_costPick(c.costU); return c.up && u!=null ? u : _costPick(c.cost); }
function effectiveCost(c){
  let cost=cardCost(c);
  if(c.tempCostCut) cost=Math.max(0, cost-c.tempCostCut); // v0.61.39：易物已不再发这个标记，现在只有万剑归宗 A 列在用（击败敌人后抽到的牌 -1/-2 费）
  // v0.61.35 守一(#26)天师列：保留的【诅咒牌】**只减自己**、且只减下回合那一回合。
  // 用 G.turn 做到期判据（不做显式清零）—— G.turn 已随存档读写（40_flow.js:195/237），
  // 而且 startTurn() 开头就把本回合标记清了一遍，写在标记里会被自己在生效前擦掉。
  if(c.costCutTurn && c.costCutTurn===G.turn) cost=Math.max(0, cost-1);
  if(c.type==='skill' && hasRelic('jifengfu') && (G.skillsPlayedThisTurn||0)===0){
    cost=Math.max(0,cost-1);
  }
  // 天雷正法(#5) A 赶尸人：每 2 点【尸气】-1 费（最低 0）；D 天师：目标每 2 层【诅咒】-1 费（最低 0）   // v0.61.37 A：每 3 点 → 每 2 点
  if(c.id==='tianlei'){
    if(G.hero==='ganshiren'){ cost=Math.max(0, cost - Math.floor((G.尸气||0)/2)); }
    /* v1.0.19：用户口径——天师列按**全场最高**诅咒数减费（原按当前/最右目标，牌面费用会随选中目标跳变）。 */
    else if(G.hero==='tianshi'){ const mx=aliveEnemies().reduce((s,e)=>Math.max(s,e.curse||0),0); cost=Math.max(0, cost - Math.floor(mx/2)); }
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
/* v0.76.0：精英与 Boss 各带四档台词（sayIn 出场 / sayHit 受击 / sayLow 濒死 / sayOut 被击败）。
   ⚠️ **普通敌人一个字段都不加** —— 场上有 3~5 只普通怪时满屏气泡反而吵，而且它们
      一轮就死，台词来不及读。冒烟里有一条专门钉「普通敌人四档全缺」。
   ⚠️ 四档都**只在精英/Boss 上出现**，缺省即不发言 ⇒ 零体积代价。
   ⚠️ 剧本在 `敌人台词剧本.md`，**两处要同批改**：改词只改一边 = 剧本与实物静默漂移
      （「四档齐全」那条闸只查字段在不在，不查内容）。
   ⚠️ 台词与数值**零耦合**：不进 `serializeEnemy`（显式白名单，默认就不会进）、
      不进 `cardSnap`、不影响 `makeEnemy` 的数值计算 ⇒ 可单独回滚。 */
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
  /* ⚠️ 必安**不在开局阵容里** —— 它是谢必安 `split` 分化出来的。它的 sayIn 由分化分支发，
     不由 `startBattle` 发（那只循环遍历的是开局阵容）。分出的两只**只有先手那只**念，
     与「同场多敌只念一条」同一条口径。 */
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
/* v0.76.0：**中段台词**另开一张小表 —— 只有两只 Boss 有，且触发条件各不相同
   （谢必安只在分化那一刻、阎罗天子只在血条首次打空那一刻）。
   ⚠️ 单独成表而不是塞进四档，是因为四档的触发点都是**每只敌都会经历**的通用事件，
      而这两条各绑一个 Boss 的**独有机制分支**。混在一起会让 `sayPick` 那套
      「一次一档」的记名逻辑说不清（分化不是「第四档」，它可能发生在 any 时刻）。
   ⚠️ 不新引状态机：`when` 由代码在**既有那两个分支**上各调一次。 */
const ENEMY_SAY_MID = {
  xiebian:     { when:'split',  text:'一分为二——同去，同归。' },
  yanluotianzi:{ when:'phase2', text:'判你——永不超生。' }
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
  const hp = Math.round(def.hp * hpMul);
  const scaleAtk = it => { const c={...it}; if(c.v && (c.type==='attack'||c.type==='multi'||c.type==='attackBlock')) c.v=Math.round(c.v*atkMul); return c; };
  const intents = def.intents.map(scaleAtk);
  const intents2 = def.intents2 ? def.intents2.map(scaleAtk) : null;
  const e = {key:key, name:def.name, hp, maxHp:hp, block:0, pingbi:0, intents, intentIndex:0, intent:{type:'dormant'}, pendingDamage:0, curse:0, charm:0, charmPct:0.5, charmUsed:false, sealedEver:false, seal:false, strength:0, kind:def.kind, elite:!!def.elite, boss:!!def.boss, aggressive:!!def.aggressive, lifesteal:def.lifesteal||0, phase:!!def.phase, phase2:false, intents2, ledgerActive:false, ledgerDmg:0, ledgerAffix:null, split:!!def.split, splitDone:false, sealedCost:0, poison:0, uid:UID++,
    /* v0.76.0：四档台词透传。**这一行是显式构造，漏了就是「字段写了、气泡永远不出现」
       的静默失效** —— 上面 `ENEMIES` 里那四档全都白写，而冒烟的四档齐全闸照样绿
       （它查的是 `ENEMIES`，不是 `makeEnemy` 的产物）⇒ 另有一条断言专门查
       `makeEnemy(...).sayIn === ENEMIES.baiwuchang.sayIn`。
       ⚠️ 只透传，不参与上面任何数值计算（零耦合，可单独回滚）。 */
    sayIn:def.sayIn, sayHit:def.sayHit, sayLow:def.sayLow, sayOut:def.sayOut};
  e.affixes = rollAffixes(def);
  if(def.bossAffix && !e.affixes.length){ const a=AFFIXES[Math.floor(rng()*AFFIXES.length)]; e.affixes=[{id:a.id, tier:1}]; }
  /* v0.61.32：词缀「附上」那一刻的听感（素材清单 1.3 第 24 条：再生/屏壁/刚体/灵化 生效那一刻）。
     一场多敌各带词缀时用 sfxOnce 节流，免得几个附体音叠成和弦。
     ⚠ 这条键**不能**因为 yehuo 改走 boss_yehuo 就当它没用了 —— 用户已经交付了
     素材/sfx/enemy_buff_self_1.mp3，搁着不接等于让人家的文件白发。 */
  if(e.affixes.length){ sfxOnce('enemy_buff_self', 200); const pb=e.affixes.find(a=>a.id==='pingbi'); if(pb){ e.block=8*pb.tier; e.pingbi=8*pb.tier; } }
  return e;
}
function rollAffixes(def){
  if(!G || def.boss) return [];
  let count;
  const act = G.act||1;
  // 难度靠「词缀叠加」而非数值翻倍：第三幕敌人携带更多（不同）词缀
  count = act===1 ? (def.elite ? 1 : 0) : act===2 ? (def.elite ? 2 : 1) : (def.elite ? 3 : 2);
  return shuffle(AFFIXES.slice()).slice(0,count).map(a=>({id:a.id, tier:1}));
}
/* 节点化 Run：三幕地图（v0.61.40 起为「每次生成」的随机树状图，参考杀戮尖塔）
   —— 结构与敌人一起随机：每层宽度 1~4、连边显式生成，允许分叉/汇合；
     不再有写死的 14×4 字面量表，第二/三幕也不再是它的换皮产物。
   ⚠ 生成器**绝不碰全局 rng**（自带 mkRng 局部流）。三个理由：
     ① ?seed=N 复现要求地图不消耗主随机流；
     ② continueRun 先 rngRestore 再重建地图，若地图吃主随机流，牌序/奖励/词缀会整体错位；
     ③ 冒烟要能对拍「生成前后 rngSnapshot 完全不变」。 */
const MAP_ROWS = 14;   // 层数不变 ⇒ 战斗场次、calcScore 的 act*1000+mapRow*50、顶栏「第 X/14 层」全部不变
/* v0.61.42（用户要求，参照杀戮尖塔）——形状与旧版的差别都在这里：
   · **2~3 条初始路线**：第 1 层恒 2~3 格。旧形状是 [1,2]，实测 40 个种子里有 17 个**只有 1 格**
     （第 1 层就没得选，等于没有路线规划）。
   · **分叉路口少**：分叉只可能发生在「往上变宽」的层间过渡（linkRows 的构造性质，见其注释），
     所以形状设计成**基本只收不放**：13 次层间过渡里只有 2~3 次会变宽，且每次只 +1
     ⇒ 单格最多分出 2 条。旧形状有 [1,2]→[3,4] 这种一次分 4 条的，正是「路口太多」的来源。
   · 除末层 Boss 行外每层恒 2~3 格：不会宽到眼花，也不会窄到没得选。
   v0.62.0（用户要求「每一条路线都要经过 ≥1 商店 / ≥2 篝火 / ≥1 未知 / ≥2 精英」）——
   **第 10~12 层收成单格**（第 9 层保留 [2,2] 的那次分叉），形成一段「走廊」。
   实测（3 幕 × 30 种子）这样把第一幕精英从 +57% 压到 +30%，而路线数 5.8/5.5/6.4 基本不变。
   走廊的副作用与对策见 CORRIDOR_ROWS 的注释。 */
const ROW_SHAPE = [[2,3],[3,3],[3,3],[2,3],[2,2],[2,3],[2,2],[2,3],[2,2],[2,2],[1,1],[1,1],[1,1],[1,1]];
/* 每幕特殊节点配额（其余填普通战）。
   v0.62.0：elite 从 2/3/4 **降到 1/2/3**。原因是新的「每路线 ≥2 精英」下限（见 ROUTE_NEED）
   会由 enforceRouteQuota 再补一批精英上去 —— 基础配额与下限是**叠加**的，不降就会双份。
   实测（3 幕 × 30 种子，按 1/2/3 出货）：精英/幕 3.73 / 4.27 / 5.27（现值 2.87 / 3.90 / 4.93，
   即 +30% / +9% / +7%）；若保留 2/3/4 则是 4.50 / 4.87 / 5.90（第一幕 +57%，正是要避免的）。
   另外实测：「缺口补齐顺序」「精英权重」对结果**毫无影响**，唯一的杠杆就是这里的 elite 基数。 */
const TYPE_QUOTA = { 1:{camp:2, shop:2, elite:1, unknown:5}, 2:{camp:2, shop:2, elite:2, unknown:4}, 3:{camp:2, shop:2, elite:3, unknown:3} };
const ACT1_MINIONS = ['youhun','zhizharen','huyao','jiangshi','shanxiao','shuigui','mengpo'];
const ACT2_SWAP = {youhun:'wangchuan', zhizharen:'niutou', huyao:'mamian', jiangshi:'panguan', shanxiao:'niutou', shuigui:'wangchuan', mengpo:'wangchuan', baiwuchang:'juhunshi', heiwuchang:'juhunshi', huapigui:'niumamian', yecha:'niumamian'};
const ACT3_SWAP = {youhun:'mingwei', zhizharen:'luosha', huyao:'xiuluo', jiangshi:'yanluo', shanxiao:'xiuluo', shuigui:'mingwei', mengpo:'yanluo', baiwuchang:'xiuluojiang', heiwuchang:'yecha', huapigui:'xiuluojiang', yecha:'yecha'};
/* v0.61.40：从 50_ui.js 顶层**搬移**到这里（**不是复制** —— 同作用域重复 const 同名 = 整脚本 SyntaxError 白屏）。
   原因：genAct 在本文件顶层就被调用，那一刻 50_ui.js 还没执行，留在那边会 TDZ 报错。 */
const ELITES_BY_ACT = { 1:['baiwuchang','heiwuchang','huapigui','yecha'], 2:['juhunshi','niumamian'], 3:['xiuluojiang','yecha'] };
const BOSS_POOL = { 1:['jiangwang','hanba','xueshi'], 2:['xiebian','panguanwang','mengpowang'], 3:['yewang','xiuluowang','yanluotianzi'] };

/* —— 局部随机流（与 00_base.js 的 rng() 同为 mulberry32，但**互不干扰**）—— */
function mkRng(seed){ let s=(seed>>>0)||1; return function(){ s=(s+0x6D2B79F5)|0; let t=Math.imul(s^(s>>>15), 1|s); t=(t+Math.imul(t^(t>>>7), 61|t))^t; return ((t^(t>>>14))>>>0)/4294967296; }; }
function deriveSeed(seed, k){ let h=((((seed>>>0)||1)^Math.imul((k||1), 0x9E3779B1))>>>0); h=Math.imul(h^(h>>>16), 0x85EBCA6B)>>>0; h=Math.imul(h^(h>>>13), 0xC2B2AE35)>>>0; return ((h^(h>>>16))>>>0)||1; }
function mkShuffle(R){ return function(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(R()*(i+1)); const t=a[i]; a[i]=a[j]; a[j]=t; } return a; }; }

/* —— 敌人池：复用既有换幕表，不新增第二份真相 —— */
function actMinionPool(act){
  if(act===2) return ACT1_MINIONS.map(function(k){ return ACT2_SWAP[k]||k; });
  if(act===3) return ACT1_MINIONS.map(function(k){ return ACT3_SWAP[k]||k; });
  return ACT1_MINIONS.slice();
}
/* v0.61.41：敌人数量随「层」走（用户要求）——
   每一幕**前 4 层**最多 2 只（开局不该被 3 只围殴，也留出教学空间）；
   第 9 层起「3 只」的概率从老的 0.65 抬到 0.85（后期加压）；中间层维持老口径。
   下标 = MAP 的层号 r（0 起算）；越界一律回落 0.65。 */
const ENEMY3_P3 = [0, 0, 0, 0, 0.55, 0.6, 0.6, 0.65, 0.65, 0.85, 0.85, 0.85, 0.85, 0.85];
function enemy3Chance(r, act){
  if(typeof r!=='number' || r<0 || r>=ENEMY3_P3.length) return 0.65;
  const p=ENEMY3_P3[r];
  /* v1.0.21：第一幕「3 只」概率再压一档（用户反馈第一幕难度偏高）——**只对 act===1 生效**：
     其余两幕与越界回落（单参调用，如冒烟断言）逐字节不变 ⇒ ENEMY3_P3 的数值断言不受影响。 */
  if(act===1) return p*0.6;
  return p;
}
function pickFightFrom(pool, R, row, act){
  const p3=enemy3Chance(row, act);
  return mkShuffle(R)(pool.slice()).slice(0, R()<p3?3:2);
}

/* —— 分带（band partition）：把 total 个下标切成 parts 段**连续非空**区间 —— */
function bandBounds(total, parts){
  parts=Math.max(1, Math.min(parts, total));
  const base=Math.floor(total/parts), extra=total%parts;
  const out=[]; let x=0;
  for(let i=0;i<parts;i++){ const w=base+(i<extra?1:0); out.push([x, x+w-1]); x+=w; }
  return out;
}
/* 相邻两层连边。**不交叉 / 上层无死路 / 下层无孤岛 由构造保证**：
   · loN<=upN：上层切成 loN 段，第 j 段整段挂到下层 j（多个汇到同一个 → 汇合点）
   · loN>upN ：下层切成 upN 段，第 i 段整段挂在 上层 i（一个分出多个 → 分叉点）
   每条边的两端都落在同段内 ⇒ 段号随下标单调 ⇒ i<i' 必有 j<=j'（不交叉）。 */
function linkRows(upN, loN){
  const nextOf=Array.from({length:loN}, function(){ return []; });   // 下标 = **下层**列号，值是能走到的上层列号
  const prevOf=Array.from({length:upN}, function(){ return []; });   // 下标 = **上层**列号，值是能下来的下层列号
  if(loN<=upN){
    const bands=bandBounds(upN, loN);   // 上层切成 loN 段：每段整段挂到下层同段号的格子（多个汇到同一个 → 汇合点）
    for(let j=0;j<loN;j++) for(let i=bands[j][0]; i<=bands[j][1]; i++){ nextOf[j].push(i); prevOf[i].push(j); }
  } else {
    const bands=bandBounds(loN, upN);   // 下层切成 upN 段：每段整段挂到上层同段号的格子（一个分出多个 → 分叉点）
    for(let i=0;i<upN;i++) for(let j=bands[i][0]; j<=bands[i][1]; j++){ prevOf[i].push(j); nextOf[j].push(i); }
  }
  return {nextOf:nextOf, prevOf:prevOf};
}

/* —— 布类型 —— */
function assignTypes(act, R, rows, minionPool, elitePool, bossPool, quotaOverride){
  const q = quotaOverride || TYPE_QUOTA[act] || TYPE_QUOTA[1];
  const shuf = mkShuffle(R);
  for(let r=0;r<MAP_ROWS;r++) for(let c=0;c<rows[r].length;c++) rows[r][c]={t:'fight', e:[], next:[], prev:[]};
  const slots=[];
  for(let r=1;r<MAP_ROWS-1;r++){
    // 首层与末层不参与特殊节点。
    // v0.62.0：**走廊层也不参与基础配额** —— 否则走廊会被基础配额填满，
    // 每个玩家在最后 3 层白拿一套特殊节点，路线规划就失去意义（详见 CORRIDOR_ROWS 注释）。
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
        if(pass===0 && usedRow[s[0]]) continue;   // 第一轮：特殊节点各自独占一层，避免扎堆
        node.t=kind; usedRow[s[0]]=1; n++;
      }
    }
    return n;   // 第二轮无约束兜底 ⇒ 配额一定能填满
  }
  pick('camp', q.camp||0);
  pick('shop', q.shop||0);
  pick('unknown', q.unknown||0);
  pick('elite', q.elite||0);
  // 末层唯一 Boss：**生成期**就定死 key（旧代码是在 chooseNode 里点开才抽 ⇒ 同一存档续档后 Boss 会变）
  rows[MAP_ROWS-1][0] = {t:'boss', e:[bossPool[Math.floor(R()*bossPool.length)]], next:[], prev:[]};
  const pickElite=function(){
    const k=[elitePool[Math.floor(R()*elitePool.length)]];
    if(R()<0.5) k.push(minionPool[Math.floor(R()*minionPool.length)]);   // 旧图精英是「精英+小怪」对，单只会明显变软
    return k;
  };
  for(let r=0;r<MAP_ROWS-1;r++) for(let c=0;c<rows[r].length;c++){
    const node=rows[r][c];
    if(node.t==='elite'){ node.e=pickElite(); continue; }
    if(node.t!=='fight') continue;
    if(r>0 && R()<0.06){ node.t='elite'; node.e=pickElite(); }   // 少量野生精英，保持稀有
    else node.e=pickFightFrom(minionPool, R, r, act);   // v0.61.41：把层号传进去；v1.0.21：再传幕号（第一幕 3 敌概率下调）
  }
  return q;
}

/* —— v0.61.42 落位（用户要求「图标不要规规整整 / 不要紧凑」）——
   每格随机占 5 个槽位之一，再叠 ±3% 横向 / ±7px 纵向抖动 ⇒ 图标不再排成等距直列，
   路径随之变得长短不一、互不平行。槽位由 R 洗牌后取前 n 个**再升序**，
   所以「列序 = 槽位序」—— linkRows 的「边不交叉」性质靠它保住（否则线会拧成一团）。
   槽位百分比表在 50_ui.js 的 MAP_SLOT_PCT，两边的槽数必须一致（冒烟有断言）。
   ⚠️ v0.76.1：横向抖动由 ±4% 收成 ±3%。槽位表本身（8~92）不动 —— 冒烟的夹紧断言
      钉着 mapSlotPct({sx:9})===92 / ({sx:-3})===8。但 92+4=96% 落在 760px 画心上时，
      56px 的节点右沿只剩 2px 余量，描边发光贴着画心边被裁掉 ⇒ 收窄抖动即可：
      极值变成 5%~95%，两侧各留约 10px。R() 的调用次数没变，下游随机流不受影响。 */
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
      // 末层 Boss **居中**且不抖：它要收拢所有路线，摆到边上会拉出一条很斜的长线
      if(r===rows.length-1){ nd.sx=2; nd.jx=0; nd.jy=0; continue; }
      nd.sx=(typeof sl[c]==='number') ? sl[c] : Math.round(c*(MAP_SLOT_N-1)/Math.max(1,n-1));
      nd.jx=Math.round((R()*2-1)*3);   // ±3%：槽间距 21%，绝不越槽（v0.76.1 由 ±4 收窄，见文件头注释）
      nd.jy=Math.round((R()*2-1)*7);   // ±7px：行高 88px 撑得住，也不会碰到上下行
    }
  }
}

/* —— v0.62.0 每路线特殊节点下限（用户要求，原话「这只是限制」= 是下限不是配额）——
   「每一幕的每一条路线都要经过至少 1 个商店，2 个篝火，1 个未知和 2 个精英」。
   实测（v0.61.42 存档地图）现值是 **0/0/0/0** —— 今天一条路线可以一个特殊节点都没有。
   缺口由 enforceRouteQuota 在连边之后后置补齐。

   ⚠️ 走廊（第 10~12 层，收成单格后**所有路线都经过它们**）
   把特殊节点放在走廊上「一次覆盖全部路线」对贪心永远是最优解 ⇒ 走廊必定被填满 4 个，
   于是每个玩家在最后 3 层白拿 2 篝火 1 商店、**「路线规划」就失去意义了**。
   实测发现走廊总是满的**主因不是后置贪心，是 assignTypes 自己把基础配额放上去了**
   （加多严的走廊上限都没用）。所以两句一起下：
     ① 基础配额（TYPE_QUOTA）的候选格**排除走廊**（见 assignTypes 的 slots）；
     ② 后置贪心只在走廊放不下时才用走廊，且**分级放宽** 2 → 3 → 无限。
   实测 90/90 张图都在第①级就满足，从不降级 ⇒ 走廊只剩 1~3 个特殊节点，且随种子变。
   ⚠️ 实测最终落点（3 幕 × 30 种子，配合 TYPE_QUOTA 的 elite 降到 1/2/3）：
      精英/幕 **3.83 / 4.37 / 5.00**（改动前 2.87 / 3.90 / 4.93 ⇒ **+33% / +12% / +1.4%**），
      特殊节点/幕 15.57 / 15.17 / 14.80，路线数 5.0 / 5.0 / 5.0，
      走廊（10~12 层）特殊节点实测 **0~2 个**（分级上限第一级 2 就够，90/90 从不降级），
      每路线最少 camp2/shop1/unknown1/elite2 —— **90/90 全部满足，0 卡死**。
      第一幕 +33% 是这条下限的结构代价（不降 TYPE_QUOTA 会是 +57%）。
   ⚠️ 上面这几个数是**实测**，不是设计目标 —— 设计时的预估值（精英 3.57/4.20/4.87、
      特殊 10.8/9.8/9.2「比现在还少」）**实测都不成立**：特殊节点/幕 反而从 11.9 涨到 15.5，
      因为「每路线 ≥2 篝火」是下限，路线有 5 条时下限本身就要求十几个特殊节点。
      数字若与 更新日志.md 的 v0.62.0 段不一致，以**那一段**为准（那里是发布时复测的）。 */
const ROUTE_NEED = { camp:2, shop:1, unknown:1, elite:2 };
const CORRIDOR_ROWS = [10, 11, 12];
const CORRIDOR_TIERS = [2, 3, Infinity];

/* 枚举**全部**路线：第 0 层每格 DFS 沿 next 走到末层 Boss。实测 3~9 条，很便宜。 */
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

/* 路线缺口 → 穷举「每条路线上每个 fight 格」的收益（改它能同时补掉多少**同类型**缺口）→ 改型。
   评分取「覆盖面最大的候选」而不是「第一个够用的」：一个走廊格能一次补掉全部路线的同款缺口，
   所以只有在走廊被上限挡住时才会退而求其次打散到下半段。
   **只改 t/e，完全不动 next/prev** ⇒ 「边不交叉 i<i'⇒j<=j' / 无死路 / 无孤岛 / 都能到 Boss」全部保持。
   第 0 层与末层永不参与 ⇒ 开局仍是「能赢的普通战」、Boss 行仍唯一。
   随机流用 mkRng(deriveSeed(seed,4242))，**绝不碰全局 rng**。 */
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
    const defs=[];                                    // 缺口 [路线下标, 类型]
    for(let i=0;i<routes.length;i++){
      const c=counts(routes[i]);
      for(const k in ROUTE_NEED){ if(ROUTE_NEED[k]-c[k]>0) defs.push([i,k]); }
    }
    if(!defs.length) return;                          // 全部满足 → 收工（绝大多数图在这里返回）
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
    if(!best){                                        // 当前分级放不下 → 放宽走廊上限再试
      if(tier < CORRIDOR_TIERS.length-1){ tier++; continue; }
      return;                                        // 走廊全开时必然有解，到不了这里
    }
    const node=rows[best.r][best.c];
    node.t=best.ty;
    if(best.ty==='elite'){                            // 精英节点必须带 1 只精英（50% 再带 1 只小怪，同 assignTypes 口径）
      const k=[elitePool[Math.floor(R()*elitePool.length)]];
      if(R()<0.5) k.push(minionPool[Math.floor(R()*minionPool.length)]);
      node.e=k;
    } else node.e=[];                                 // 篝火/商店/未知：无敌人
  }
}

/* —— v1.1.8 分岔口「前方不重样」（用户要求「地图的分岔路尽量避免前方出现一样的关卡」）——
   一个节点 next≥2 时，若后继里出现同类型节点（fight/camp/shop/unknown/elite 标签相同），
   就尽量把其中一个与**同一行**的另一种类型节点**互换类型**。
   换位只改 t/e、完全不动 next/prev；同一行的类型多重集不变 ⇒ 拓扑/走廊计数都不受影响，
   只在结尾补跑一次 enforceRouteQuota 补回可能被挪走的路线下限缺口。
   随机流独立（deriveSeed(seed,7777)），绝不碰全局 rng ⇒ 「同种子完全一致」仍成立。 */
function diversifyForks(rows, act, seed, minionPool, elitePool){
  const R=mkRng(deriveSeed(seed, 7777));
  const LAST=rows.length-1;
  const fillE=function(node, row){                      // 换型后按新类型补敌人（口径同 assignTypes）
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
      if(nx.length<2) continue;                         // 非分岔点
      const lo=rows[r+1];
      const seen={};                                    // 类型 → 该类型后继的列号
      for(let i=0;i<nx.length;i++){ const nd=lo[nx[i]]; if(nd) (seen[nd.t]=seen[nd.t]||[]).push(nx[i]); }
      for(const ty in seen){
        if(ty==='boss' || seen[ty].length<2) continue;   // Boss 行唯一，不参与；无重样则跳过
        for(let k=1;k<seen[ty].length;k++){             // 保留第一个，其余逐个换掉
          const dc=seen[ty][k], dn=lo[dc];
          if(!dn || dn.t!==ty) continue;                // 可能已被本行更早的分岔换走
          const cands=[];
          for(let cc=0;cc<lo.length;cc++){
            if(cc===dc) continue;
            const cn=lo[cc];
            if(!cn || cn.t==='boss' || cn.t===ty) continue;
            if(seen[cn.t]) continue;                    // 该类型也已在分岔口出现 ⇒ 换了还重样
            cands.push(cc);
          }
          if(!cands.length) break;                      // 本行没有可用的另一种类型
          const cc=cands[Math.floor(R()*cands.length)];
          const cn=lo[cc];
          const tmp=dn.t; dn.t=cn.t; cn.t=tmp;           // 纯类型换位
          fillE(dn, r+1);                                 // 两侧都按新类型重刷敌人
          fillE(cn, r+1);
          seen[dn.t]=[dc];                               // 换进来的类型也计入「已出现」，后续不再重复引回
        }
      }
    }
  }
}

/* —— 入口：一个种子 → 一整幕树状图 —— */
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
  // v0.61.42：落位放在 assignTypes **之后** —— assignTypes 会把每格重建成新对象（含末层 Boss），
  // 先落位的话 sx/jx/jy 会被整个抹掉。
  assignSlots(R, rows);
  for(let r=0;r<MAP_ROWS-1;r++){
    const L=linkRows(rows[r+1].length, rows[r].length);
    for(let i=0;i<rows[r].length;i++) rows[r][i].next=L.nextOf[i].slice().sort(function(a,b){ return a-b; });
    for(let j=0;j<rows[r+1].length;j++) rows[r+1][j].prev=L.prevOf[j].slice().sort(function(a,b){ return a-b; });
  }
  rows[MAP_ROWS-1][0].next=[];
  // v1.1.8：分岔口去重（前方尽量不重样），只改 t/e 不动拓扑。
  diversifyForks(rows, act, seed, minionPool, elitePool);
  // v0.62.0：按路线补齐特殊节点下限。**必须在连边之后**（靠 next 枚举路线），
  // 且只改 t/e 不动拓扑 ⇒ 不影响 linkRows 建立的「边不交叉 / 无死路 / 无孤岛」。
  // 放在 diversifyForks 之后 ⇒ 把被换走的特殊节点缺口补回来。
  enforceRouteQuota(rows, act, seed, minionPool, elitePool);
  return rows;
}
let ACTS = [genAct(1,101), genAct(2,202), genAct(3,303)];   // 加载即有一张合法地图；ACTS.length **必须恒为 3**（40_flow 用它判通关）
const ACT_NAMES = ['第一幕 · 乱葬岗', '第二幕 · 黄泉路', '第三幕 · 幽冥塔'];
let MAP = ACTS[0];
/* 开新局 / 续档 都走它：一个种子 → 三幕地图，MAP 同步指向当前幕 */
function buildActs(seed){
  const sd=(seed>>>0)||1;
  ACTS=[genAct(1,deriveSeed(sd,1)), genAct(2,deriveSeed(sd,2)), genAct(3,deriveSeed(sd,3))];
  MAP=ACTS[((G&&G.act)||1)-1] || ACTS[0];
  return ACTS;
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

/* ===================== 里程碑（渐进门禁制 · v1.0.15） =====================
   设计口径（用户拍板）：**只解锁内容，不给任何数值加成**。
   初始只开 1 个角色（tianshi 符箓天师）+ 基础内容（白/蓝卡牌、白/蓝遗物、老 4 瓶灵汁）；
   每局结束（通关或失败都算）累积「里程碑点数」，达到 need 即**永久解锁**对应内容。
   进度并入主存档 SAVE（SAVE.progress / SAVE.mile），与图鉴、成就同一份云存档。

   ⚠️ 本表是**唯一真相源**：判定走 js/50_ui.js 的 mileOn()，接线散在 4 个内容入口。
   ⚠️ 阈值标定（按下面的公式实测）：
     · 开局未推进 ≈ 0；第 2 幕中段失败 ≈ 250~350；第 3 幕失败 ≈ 430~600；
     · **一次普通通关 ≈ 950~1050**（3 幕 240 + 层 195 + 通关 500 + 击杀约 30×3）。
     所以设计成「首次通关能一次点亮前 4 条」，最后两条（法器通灵 / 血祭成煞）刻意抬到 700 / 1250
     —— 让**首次通关也吃不完**，血祭阴差是跨局的收尾解锁，保留「渐进」手感。 */
/* ⚠️ v1.0.16：**门禁总开关**。测试期先关掉（用户口径「里程碑的设定最后装上」）：
   关掉时 mileOn() 一律放行 —— 全部角色 / 卡牌 / 遗物 / 灵汁都可正常取用，方便试玩；
   但进度记录（SAVE.progress / SAVE.mile）与独立的「解锁」界面**照常工作**，
   等正式上线把这里改回 true 即可，其余一行都不用动。
   ⚠️ v1.1.x（用户报障「未解锁角色仍可使用角色特权」）：**开关已按原口径正式打开** ⇒
      角色/紫·金卡/紫·金遗物/新灵汁全部走 MILESTONES 门禁。配套改动：grantRunMilestones
      除推每角色轨档位外，同步按**全局累计 pts** 推旧表 id 进 SAVE.mile（否则 mileOn 查不到）。 */
let MILE_GATE_ON = true;
/* ⚠️ v1.0.25：这是一张**遗留的内容门禁表**，只供 mileOn() 判断「某类内容现在开不开」。
   它**不再是进度来源** —— 里程的累积与达标已全面由下面的**每角色 6 档 MILE_TRACKS** 驱动
   （见 grantRunMilestones）。等第 1~5 档的真实奖励内容定稿后，把奖励与档位对上，
   这张表就彻底退休（连同 MILE_GATE_ON 一起撤）。 */
/* v1.1.8（用户 2026-10-13）：「撤掉这三条角色门禁」—— 三条 `heroes:[...]` 条目
   （hero_ganshiren / hero_wuseng / hero_yincha）已删除：角色不再按全局里程点数自动放行，
   改为「入门符纸」解锁 —— 第 6 档【入门符纸】领取后得 1 张（SAVE.mileTickets），
   在选角页对锁定角色**消耗 1 张**才解锁（SAVE.unlockedHeroes）。见 50_ui.js 的 mileOn / unlockHeroWithTicket。
   ⚠️ 这也顺带修掉「每用一名角色打一场就自动解锁下一名角色」的根因 —— 旧配合段
      （grantRunMilestones 里按全局 pts 推旧表 id）再也不会写进任何 hero_* id。 */
const MILESTONES = [
  { id:'adv_card',       need:220,  name:'符箓精进', desc:'紫/金进阶卡牌进入奖励池',   advCards:true },
  { id:'potion_new',     need:300,  name:'丹炉重开', desc:'解锁 4 瓶新灵汁',           potions:['jingangjiu','qingxinlu','fugusan','tongyoucha'] },
  { id:'adv_relic',      need:700,  name:'法器通灵', desc:'紫/金遗物进入掉落池',       advRelics:true },
];
/* 一局结束时的里程碑点数 —— **独立函数**，便于冒烟直接断言。
   v1.0.25（用户定稿口径）：公式改为 —— 每推进一幕 200 点（act 从 1 起，故 act-1）·
     每爬一层 15 点 · 每击杀 1 个 5 点 · 通关（打穿最后一幕幕主）额外 600 点；结果不小于 0。
   v1.1.23（用户定稿）：层数 15→22 · 击杀 5→7 · 通关 600→300（幕数 ×200 不变）。
     加权后平均每把仍 ≈ 570 点 ⇒ 下面 6 档阈值无需重标。
   取这套权重的依据：按真实地图结构做 20 万局蒙特卡洛，平均每把 ≈ 572 点，
   正好落在下面 6 档阈值「550 / 1400 / 2900 / 4500 / 7500 / 11000」（≈ 1.0 / 2.4 / 5.1 / 7.9 / 13.1 / 19.2 把）上。
   传入 s 可指定状态（不传则读全局 G），对老档/空值一律安全回落。 */
function milePointsFor(s){
  const g = s || (typeof G!=='undefined' ? G : null);
  if(!g) return 0;
  return Math.max(0, mileParts(g).reduce(function(a,p){ return a + p.val; }, 0));
}
/* v1.1.x（用户 2026-10-12）：结算画面右上「里程分数」要**逐条弹出**地展示里程怎么来的 ⇒
   把 milePointsFor 的加数拆成可读分项（标签 + 分值）。milePointsFor 反过来调它，杜绝两处漂。
   v1.1.23（用户定稿口径）：层数 ×15→×22 · 击杀 ×5→×7 · 通关 +600→+300（幕数 ×200 不变），
   分项标签不动；本规则原先被 7 条回归断言钉着具体数值，已同步改数（见 smoke_runner.js）。 */
function mileParts(s){
  const g = s || (typeof G!=='undefined' ? G : null);
  if(!g) return [];
  const act = Math.max(0,(g.act|0)) - 1;                 // act=1 ⇒ 0
  const parts = [
    { lab:'幕数推进', val: act*200 },
    { lab:'爬塔层数', val: Math.max(0,(g.mapRow|0))*22 },
    { lab:'击败敌人', val: Math.max(0,(g.totalKills|0))*7 },
  ];
  if(g.finalBoss) parts.push({ lab:'通关加成', val: 300 });
  return parts;
}
/* —— 里程碑「里程轨」（v1.0.21，用户草图）：左侧 4 个角色开关（横屏立绘 + 名字），
   右侧一条**横向蓝色里程线**向左固定、向右随里程延长；线上一串节点，节点上方是白框奖励，
   节点下方标里程数。每条轨属于**一个角色**，切角色看各自的轨。
   ⚠️ 待定稿：各角色的**专属奖励内容 / 对应里程数 / 里程增长规则**要等与用户讨论后再填。
     定稿前 MILE_TRACKS[hero] 留空，UI 按下面的骨架兜底渲染（见 50_ui.js 的 mileNodesFor），
     保证界面可看可点；定稿后只需在 MILE_TRACKS 里按 {nodes:[{id,need,name,desc}, ...]} 补数据，
     UI / CSS 一行都不用改。
   v1.0.24（用户定稿口径）：每条角色轨**暂时 6 档**，第 1~5 档 = 真实奖励（卡牌 / 机制 / 遗物等，
     内容与里程数**待与用户一起设计**），第 6 档 = 一张【入门符纸】（解开一名角色）；
     **里程数不设上限**，轨的尽头放一个「敬请期待」占位节点（后续版本继续加奖励）。 */
const MILE_TIER_COUNT = 6;
/* 神秘人：**尚未实装的新角色**的海报位（黑调 · 敬请期待）。刻意**不进 HEROES**——
   一旦进去就会被选角页 / 牌组 / 存档当成真角色。它的轨用「未知」节点盖住，不透露任何内容。 */
const MILE_MYSTERY = { id:'mystery', name:'???', mech:'敬请期待', teaser:true };
/* v1.0.25（用户拍板）：**新体系取代旧的全局 MILESTONES 进度** —— 每个角色一条各自的 6 档轨，
   阈值按「平均每把 ≈ 572 点」折算：
     · 通用角色（赶尸人 / 武僧 / 阴差）：550 / 1400 / 2900 / 4500 / 7500 / 11000
     · 天师（初始角色）**刻意压低** —— 350 / 700 / 1000 / 1400 / 1850 / 2400，
       让刚入坑的玩家尽快看到「下一档」、尽早拿到下一个角色，把正反馈前置。
   ⚠️ 第 1~5 档的**奖励内容**仍待与用户一起设计（里程数已定稿）⇒ 标 pending，先按「待定稿」渲染；
      第 6 档 = 一张【入门符纸】（可任选一名角色解锁）。定稿后只改这里的 name/desc 即可。
   神秘人不在此表 ⇒ mileNodesFor 走「未知」骨架。 */
const MILE_TIER_NEED = {
  tianshi:   [350, 700, 1000, 1400, 1850, 2400],
  ganshiren: [550, 1400, 2900, 4500, 7500, 11000],
  wuseng:    [550, 1400, 2900, 4500, 7500, 11000],
  yincha:    [550, 1400, 2900, 4500, 7500, 11000],
};
const MILE_TRACKS = {};
/* v1.1.0：符箓天师的第 1 / 2 / 4 档奖励已实装（点咒符 / 雷谴符 / 朱砂砚）——
   节点 `id` 必须与卡牌 / 遗物的 `mile` 字段一致（tianshi_t1 / tianshi_t2 / tianshi_t4）；
   未在里程界面领取该档前，对应内容被 mileOn 的硬门禁挡在任何卡池之外（单独卡池）。
   v1.1.1：第 3 档改为「天师真传」（开局抉择＝可从本角色全部牌库自由挑一张，无贴图、纯机制），
   第 5 档实装【五雷法印】（卡牌 / 金 / 3 费，卡图 card/wuleifayin.png）。
   第 6 档【入门符纸】存量口径未定 ⇒ 继续标 pending。 */
const MILE_TIANSHI_RW = {
  1:{ name:'点咒符', desc:'解锁卡牌【点咒符】：0 费，对【诅咒】最高的敌人再施诅咒，其满 6 层则抽牌' },
  2:{ name:'雷谴符', desc:'解锁卡牌【雷谴符】：对全体敌人按各自【诅咒】层数打出多段雷击，随后清空各自的诅咒' },
  3:{ name:'天师真传', desc:'开局抉择改为可从本角色全部牌库中自由挑选一张加入起始牌组' },
  4:{ name:'朱砂砚', desc:'解锁遗物【朱砂砚】：敌人每次【诅咒】达到 6 层上限时，抽 1 张牌' },
  5:{ name:'五雷法印', desc:'解锁卡牌【五雷法印】：将至多 5 张手牌化为 0 费雷符，回合末未打完的自动击向血量最少者' },
};
/* v1.1.3：茅山赶尸人的 5 档奖励已实装 —— 节点 id 必须与卡牌 / 遗物的 `mile` 字段一致
   （ganshiren_t1 赶尸令 / ganshiren_t3 万尸朝宗 / ganshiren_t5 阴司牒），
   第 2 档【尸气回流】与第 4 档【尸王真传】是**纯机制**（无独立 id，直接挂在里程节点上，不产贴图）：
     · t2 尸气回流：每个召唤物死亡额外恢复 2 点生命（落在 onSummonDeath，与骨铃叠加）；
     · t4 尸王真传：开局抉择改为「本角色全部牌库自由挑一张」（与天师真传同一套，只是不能选尸王）。 */
const MILE_GANSHIREN_RW = {
  1:{ name:'赶尸令', desc:'解锁卡牌【赶尸令】：0 费，消耗【尸气】召唤纸人（尸气富余可强化）' },
  2:{ name:'尸气回流', desc:'被动强化：每个召唤单位死亡时，额外恢复 2 点生命（与【骨铃】叠加）' },
  3:{ name:'万尸朝宗', desc:'解锁卡牌【万尸朝宗】：2 费，按当前【尸气】召唤多个纸人（纯召唤，当回合不攻击）' },
  4:{ name:'尸王真传', desc:'开局抉择改为可从本角色全部牌库中自由挑选一张加入起始牌组' },
  5:{ name:'阴司牒', desc:'解锁遗物【阴司牒】：强化【尸王】，尸王每次攻击后额外获得 5 点格挡' },
};
/* v1.1.4：苦行武僧的 5 档奖励已实装 —— 节点 id 必须与卡牌 / 遗物的 `mile` 字段一致
   （wuseng_t1 罗汉伏虎 / wuseng_t3 化甲为毒 / wuseng_t4 金刚杵 / wuseng_t5 达摩影），
   第 2 档【铁壁】是**纯机制**（无独立 id，直接挂在里程节点上，不产贴图）：
     · t2 铁壁：领取后该角色**永久被动** —— 自带全局荆棘反伤 2 点（走 mileThorns()，与拳套/荆棘叠加）。 */
const MILE_WUSENG_RW = {
  1:{ name:'罗汉伏虎', desc:'解锁卡牌【罗汉伏虎】：1 费攻击，造成伤害并额外加上当前格挡一半（向下取整，上限 10）' },
  2:{ name:'铁壁', desc:'永久被动：自带全局荆棘反伤 2 点（与【罗汉拳套】/临时【荆棘】叠加）' },
  3:{ name:'化甲为毒', desc:'解锁卡牌【化甲为毒】：0 费，消耗 10 点格挡为全体敌人施加【腐毒】（不足 10 点打不出）' },
  4:{ name:'金刚杵', desc:'解锁遗物【金刚杵】：本场战斗内每累计获得 50 点格挡，手牌多一张临时【铁布衫】' },
  5:{ name:'达摩影', desc:'解锁遗物【达摩影】：格挡被敌人击碎时爆破，造成击碎前格挡总量值的伤害（随机分配）' },
};
/* v1.1.5：血祭阴差的 5 档奖励已实装 —— 节点 id 必须与卡牌 / 遗物的 `mile` 字段一致
   （yincha_t1 饮血刃 / yincha_t3 焚身咒 / yincha_t5 酆都令），
   第 2 档【血怒·涌】与第 4 档【新初始牌组】是**纯机制**（无独立 id，直接挂在里程节点上，不产贴图）：
     · t2 血怒·涌：血怒上限 10 → 13（走 relicMaxXuenu()，与【血玉】+3 可叠）；
     · t4 新初始牌组：选角后立刻（首轮抽牌前）弹出「现有阴差初始牌组 / 血怒流初始牌组」二选一。 */
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
    /* v1.1.8（用户 2026-10-13）：第 6 档【入门符纸】**已实装** —— 到点即可点「领取」，
       领取后 `SAVE.mileTickets` +1（不再是「待定稿」占位）。其余未实装的档位仍标 pending。 */
    if(last) return { id:hid+'_t'+tier, tier:tier, need:need, pending:false, ticket:true,
      name:'入门符纸', desc:'领取后得 1 张【入门符纸】，可在选角页解锁一名角色。' };
    return { id:hid+'_t'+tier, tier:tier, need:need, pending:true,
      name:'奖励待定', desc:'档位奖励待定稿（里程数已定）。' };
  })};
});
/* ===================== v1.1.24 新手教程 · 六关配置（教程成品脚本落定） =====================
   用户口径（2026-10-16）：旧教程（TUTORIAL_STEPS / tipOnce 族）删除，按成品脚本实现：
   线性 6 关「荒径战 → 鬼市 → 祟岭精英 → 篝火 → 灵泉 → 山门僵王」；
   固定牌序（resetDeck 教程分支反转写入，drawCards 从末位 pop ⇒ 手牌顺序 == draw 数组顺序）；
   敌人覆写（startBattle 在意图偏移行之后套用，先清词缀再上固定词缀）；
   我方：阳寿/上限 60，灵气 3/回合，抽 5/回合；鬼市给 120 冥钱；精英关、Boss 关进关前回满。 */
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
 { key:'unknown', name:'灵泉' },   // showUnknown 教程分支固定 ev='potion'
 { key:'boss', name:'山门', foes:['jiangwang'],
   foeOv:{ jiangwang:{ hp:72, intents:[{type:'attack',v:8},{type:'charge',v:8},{type:'aoe',v:6},{type:'summon',n:1,unit:'xiaojianshi'}], affixes:[] } },
   draw:['zhouyin','leifu','zhanyaojian','leifu','jingang','leifu','juling','jingang','shouyi','zhiren','duhunguiji'] },
];
/* 旁白全文（天师口吻；id 即未来配音文件 素材/voice/<id>.mp3）。
   术语口径：灵气=符文 / 阳寿=生命 / 护体金光=格挡 / 此妖将行何事=意图 / 妖异=词缀 /
   符箓品阶=品质（凡品/灵品/玄品/神品）/ 法宝=遗物 / 灵液=灵汁 / 冥钱=金币 / 咒=诅咒 /
   取符=抽牌 / 一手至多执十道符=手牌上限 10 / 重天=幕。 */
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
 /* v1.1.25：玩家↔妖物互动对话（脚本见 `教程对话脚本.md`；用户将按此 id 录 mp3，本批先只出文本）。
    妖物台词整条让位给教程泡，避免与敌人头顶的四档气泡同屏（见 00_base.js enemySay 教程早返回）。 */
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
/* v1.1.25：说话人登记表 —— **只登记妖物**（不在表里的按天师）；妖物泡由 narrWho 加 `.foe` 鬼气边框 + 名字行。 */
const TUT_WHO={
 tut_0_1:'游魂', tut_0_3:'游魂',
 tut_2_1:'白无常', tut_2_3:'白无常',
 tut_5_1:'僵王', tut_5_3:'僵王', tut_5_5:'僵王',
};

