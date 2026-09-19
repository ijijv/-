# -*- coding: utf-8 -*-
# v0.61.10 批2 平衡：按用户勾选的 8 条落地（P1/P2/P3/P5×2/P6/P7/P10/P11）
# 铁律：每条锚点 count==1；先 node --check 再写盘。
import io, sys, subprocess, os

ROOT = r"C:\Users\HP\Desktop\志怪塔"
FILES = ['js/20_data.js', 'js/30_engine.js', 'js/40_flow.js']
buf = {f: io.open(os.path.join(ROOT, f), 'r', encoding='utf-8', newline='').read() for f in FILES}
log = []

def sub(f, old, new, label):
    s = buf[f]
    c = s.count(old)
    if c != 1:
        print('ANCHOR FAIL [%s] %d 次' % (label, c)); sys.exit(1)
    buf[f] = s.replace(old, new, 1)
    log.append(label)

# ============================================================
# P1 佛渡：全列改【消耗】+ 1 费 → 0 费（免疫不再可续）
# ============================================================
sub('js/20_data.js',
    "  {id:'fodu', name:'佛渡', type:'defense', rarity:'blue', cost:1,\n"
    "    t:(u)=>G.hero==='ganshiren'?`清除所有状态牌与自身负面状态，本回合免疫敌人施加的负面效果${u?'，并获得 2 点【尸气】':''}`\n"
    "      :G.hero==='yincha'?`清除所有状态牌与自身负面状态，本回合免疫敌人施加的负面效果${u?'，额外获得 3 点格挡':''}`\n"
    "      :`清除所有状态牌与自身负面状态，本回合免疫敌人施加的负面效果${u?'，额外获得 4 点格挡':''}`,",
    "  /* v0.61.10(P1)：佛渡 1 费 → 0 费 + 全列【消耗】。免疫不再能靠重复打出续上（每场限一次）。 */\n"
    "  {id:'fodu', name:'佛渡', type:'defense', rarity:'blue', cost:0, exhaust:true,\n"
    "    t:(u)=>G.hero==='ganshiren'?`清除所有状态牌与自身负面状态，本回合免疫敌人施加的负面效果${u?'，并获得 2 点【尸气】':''}。消耗（一次性）`\n"
    "      :G.hero==='yincha'?`清除所有状态牌与自身负面状态，本回合免疫敌人施加的负面效果${u?'，额外获得 3 点格挡':''}。消耗（一次性）`\n"
    "      :`清除所有状态牌与自身负面状态，本回合免疫敌人施加的负面效果${u?'，额外获得 4 点格挡':''}。消耗（一次性）`,",
    'P1 佛渡 0费+消耗')

# 佛渡 关键词：原文「升级后下回合免疫负面效果」与实际不符（本是本回合），顺手校准 + 补【消耗】
sub('js/20_data.js',
    "  ['佛渡','清除自身所有负面状态（虚弱/勾魂/缠绕/灼烧/业火等）与手中【怨气】废牌；升级后下回合免疫负面效果。【忘忧】无法解除。'],",
    "  ['佛渡','清除自身所有负面状态（虚弱/勾魂/缠绕/灼烧/业火等）与手中【怨气】废牌，本回合免疫敌人施加的负面效果；升级后额外获得格挡或尸气。【忘忧】无法解除。消耗（每场战斗限用一次）。'],",
    'P1 佛渡 关键词校准')

# ============================================================
# P2 血契·武僧：格挡→血 由 100% 降为 60%（floor）；阴差列不动
# ============================================================
sub('js/20_data.js',
    "    t:(u)=>G.hero==='wuseng'?`将目前的格挡转化为血量${u?'（0 符文）':''}`",
    "    t:(u)=>G.hero==='wuseng'?`将目前的格挡按 60% 转化为血量${u?'（0 符文）':''}`",
    'P2 血契 卡面文案')

sub('js/20_data.js',
    "    eff:(u)=>{ if(G.hero==='wuseng'){ const b=G.block||0; if(b>0){ G.block=0; heal(b); floatMsg(`格挡化血 +${b}`); log(`血契：${b} 点格挡转化为生命`); } else log('血契：当前没有格挡'); return; }",
    "    /* v0.61.10(P2)：武僧 格挡→血 100% → 60%（向下取整）。阴差/天师/赶尸人列逻辑不动。 */\n"
    "    eff:(u)=>{ if(G.hero==='wuseng'){ const b=G.block||0; if(b>0){ const h=Math.floor(b*0.6); G.block=0; heal(h); floatMsg(`格挡化血 +${h}`); log(`血契：${b} 点格挡转化为 ${h} 点生命（60%）`); } else log('血契：当前没有格挡'); return; }",
    'P2 血契 60%')

# ============================================================
# P3 咒雨·武僧：格挡全转伤害，随机分配，每点 1 伤，**逐点结算**（真·连击）
# ============================================================
sub('js/20_data.js',
    "      :G.hero==='wuseng'?`将本回合积累的格挡值全部转化为血量。消耗牌（一次性）`",
    "      :G.hero==='wuseng'?`将当前全部格挡转化为等量伤害，每 1 点随机打在一个敌人身上（逐点结算）。消耗牌（一次性）`",
    'P3 咒雨 卡面文案')

sub('js/20_data.js',
    "      if(G.hero==='wuseng'){ const b=G.block||0; if(b>0){ G.block=0; heal(b); floatMsg(`格挡化血 +${b}`); log(`咒雨：${b} 点格挡转化为生命`); } else log('咒雨：当前没有格挡'); return; }",
    "      /* v0.61.10(P3)：咒雨·武僧 —— 格挡全转伤害，**真·逐点结算**：每 1 点＝独立一击，\n"
    "         每击随机挑一个「当前存活」的敌人（某只被打死后，后面的点数重新随机，不会打在尸体上）。\n"
    "         伤害本体**同步**扣完（结算顺序与一次性打 N 点等价），只有演出错开：\n"
    "         飘字/受击闪/音效按 120ms 逐发，点数 >12 时自动压到 60ms；「流畅模式」直接同步批量结算\n"
    "         （dealDamageTo 里 floatDamage 本就静默），末尾用 floatMsg 报总连击数。\n"
    "         逐点走 point=true：跳过「攻击力加成 / 桃木剑·钱剑 / 虚弱 / 业火减伤」这类按**整张牌**口径\n"
    "         设计的乘加修饰（在 1 点上会被 floor 抹成 0，或被逐点放大 N 倍），但**保留**所有逐击反应——\n"
    "         格挡吸收、记名、反震、业火反噬、渡魂归己、咒印吸血，这些本来就是「每受一次伤」结算一次。 */\n"
    "      if(G.hero==='wuseng'){\n"
    "        const b=G.block||0;\n"
    "        if(b<=0){ floatMsg('没有格挡可转化'); log('咒雨：当前没有格挡'); return; }\n"
    "        G.block=0;\n"
    "        let pts=b+(G.attackBuff||0)+(G.turnAtkBuff||0);\n"
    "        if(G.weak>0) pts=Math.floor(pts*0.75);   // 虚弱是全局减伤：逐点 1 伤没法再乘，折算到点数上\n"
    "        const smooth=!!SETTINGS.lowSpec;\n"
    "        const step=smooth?0:(pts>12?60:120);     // 连击节奏：点数多时自动压缩，别让一回合拖太久\n"
    "        let hits=0, total=0;\n"
    "        for(let i=0;i<pts;i++){\n"
    "          const al2=aliveEnemies(); if(!al2.length) break;\n"
    "          const e=al2[Math.floor(rng()*al2.length)];\n"
    "          total+=dealDamageTo(e,1,false,smooth?0:i*step,true);\n"
    "          hits++;\n"
    "          if(G.hp<=0) break;                     // 被反震/业火反噬打死：停止后续（同敌人 multi 的收尾惯例）\n"
    "        }\n"
    "        log(`咒雨：${b} 点格挡化为 ${hits} 连击，合计 ${total} 点伤害`);\n"
    "        floatMsg(smooth?`咒雨 · ${hits} 连击 · 合计 ${total}`:`咒雨 · ${hits} 连击`);\n"
    "        return;\n"
    "      }",
    'P3 咒雨 逐点结算')

# ---- 引擎：dealDamageTo 支持「延迟演出」与「预结算点」 ----
sub('js/30_engine.js',
    "function dealDamageTo(e,n,ignoreBlock){\n"
    "  let d=n+(G.attackBuff||0)+(G.turnAtkBuff||0);\n"
    "  if((e.kind==='ghost'||e.kind==='jiangshi') && hasRelic('taomujian')) d=Math.floor(d*1.25);\n"
    "  if(e.kind==='yao' && hasRelic('tongqianjian')) d=Math.floor(d*1.25);\n"
    "  if(G.weak>0 && !ignoreBlock) d=Math.floor(d*0.75);\n"
    "  if(e.key==='xiuluowang' && (G.karmaFire||0)>0) d=Math.floor(d*0.7);\n",
    "/* floatDelay：>0 时把「音效 / 飘字 / 受击闪 / 日志」推迟到该毫秒 —— 伤害本体照旧同步结算，\n"
    "   只有演出错开（多段攻击的连击演出用；敌人 multi 走的是 dealDamageToPlayer，同一套手法）。\n"
    "   point：true 表示「这是调用方预结算好的 1 点」，跳过按整张牌口径设计的加成/减伤\n"
    "   （攻击力、桃木剑、钱剑、虚弱、业火），只走逐击反应。见 咒雨·武僧。 */\n"
    "function dealDamageTo(e,n,ignoreBlock,floatDelay,point){\n"
    "  let d=n;\n"
    "  if(!point){\n"
    "    d+=(G.attackBuff||0)+(G.turnAtkBuff||0);\n"
    "    if((e.kind==='ghost'||e.kind==='jiangshi') && hasRelic('taomujian')) d=Math.floor(d*1.25);\n"
    "    if(e.kind==='yao' && hasRelic('tongqianjian')) d=Math.floor(d*1.25);\n"
    "    if(G.weak>0 && !ignoreBlock) d=Math.floor(d*0.75);\n"
    "    if(e.key==='xiuluowang' && (G.karmaFire||0)>0) d=Math.floor(d*0.7);\n"
    "  }\n",
    'P3 dealDamageTo 前置修饰')

sub('js/30_engine.js',
    "  sfx('hit');\n"
    "  const el=document.querySelector('#enemy-panel .enemy[data-uid=\"'+e.uid+'\"]');\n"
    "  floatDamage('-'+d, '', el);\n"
    "  HITFX.enemies.add(e);\n"
    "  if(e.boss) inkBurst(el);\n"
    "  else if(e.elite) screenMicroShake();\n"
    "  log(`对 ${e.name} 造成 ${d} 点伤害`);\n"
    "  return actual;\n"
    "}",
    "  const viz=()=>{ sfx('hit');\n"
    "    const el=document.querySelector('#enemy-panel .enemy[data-uid=\"'+e.uid+'\"]');\n"
    "    floatDamage('-'+d, '', el);\n"
    "    HITFX.enemies.add(e);\n"
    "    if(e.boss) inkBurst(el);\n"
    "    else if(e.elite) screenMicroShake();\n"
    "    log(`对 ${e.name} 造成 ${d} 点伤害`); };\n"
    "  if(floatDelay) setTimeout(viz, floatDelay); else viz();\n"
    "  return actual;\n"
    "}",
    'P3 dealDamageTo 演出延迟')

# ============================================================
# P5 天师后期：蚀魂咒 3/6 → 4/7；钟馗镇魂 15/20 → 18/24
# ============================================================
sub('js/20_data.js',
    "      :`造成 ${u?6:3} 伤害。施加 2 层【诅咒】`,\n"
    "    eff:(u)=>{ const t=curEnemy(); if(!t) return;\n"
    "      if(G.hero==='yincha') loseHp(2); // C 列卡面写明「失去 2 点生命」，原先只扣了格挡/血量前置却没实扣\n"
    "      dealDamageTo(t, G.hero==='ganshiren'?(u?6:3):(G.hero==='tianshi'?(u?6:3):(G.hero==='yincha'?(u?8:5):(u?7:5))));",
    "      :`造成 ${u?7:4} 伤害。施加 2 层【诅咒】`,\n"
    "    eff:(u)=>{ const t=curEnemy(); if(!t) return;\n"
    "      if(G.hero==='yincha') loseHp(2); // C 列卡面写明「失去 2 点生命」，原先只扣了格挡/血量前置却没实扣\n"
    "      // v0.61.10(P5)：天师列 3/6 → 4/7（其余三列数值不动）\n"
    "      dealDamageTo(t, G.hero==='ganshiren'?(u?6:3):(G.hero==='tianshi'?(u?7:4):(G.hero==='yincha'?(u?8:5):(u?7:5))));",
    'P5 蚀魂咒 天师 4/7')

sub('js/20_data.js',
    "      :`对目标造成 ${u?20:15} 伤害并【镇魂】。引爆并清空目标全部【诅咒】（每层 ${u?6:5} 伤害）（消耗）`,",
    "      :`对目标造成 ${u?24:18} 伤害并【镇魂】。引爆并清空目标全部【诅咒】（每层 ${u?6:5} 伤害）（消耗）`,",
    'P5 钟馗镇魂 卡面文案')

sub('js/20_data.js',
    "      const c=t.curse||0; sealEnemy(t,1); dealDamageTo(t,u?20:15); for(let i=0;i<c;i++) dealDamageTo(t,u?6:5); t.curse=0; if(c>0) log(`钟馗镇魂引爆 ${c} 层【诅咒】`); }},",
    "      // v0.61.10(P5)：天师列 15/20 → 18/24（每层诅咒引爆的 5/6 不动；其余三列数值不动）\n"
    "      const c=t.curse||0; sealEnemy(t,1); dealDamageTo(t,u?24:18); for(let i=0;i<c;i++) dealDamageTo(t,u?6:5); t.curse=0; if(c>0) log(`钟馗镇魂引爆 ${c} 层【诅咒】`); }},",
    'P5 钟馗镇魂 天师 18/24')

# ============================================================
# P6 赶尸人新被动：4 种召唤物召唤时寿命 +1（尸王除外，被动只加一次）
# ============================================================
sub('js/20_data.js',
    "function addSummon(o){ G.summonsMadeTurn=(G.summonsMadeTurn||0)+1; G.summons.push(o); return o; }",
    "/* v0.61.10(P6)：赶尸人新被动 —— 召唤【纸人/小鬼/五通神/阴兵】时寿命 +1 回合。\n"
    "   收口在这一处，所以「升级版卡面自带的 dur 提升」与被动**叠算**，但被动只加一次（不会 +2）。\n"
    "   尸王（shi_wang）是亡灵本体、不属召来的役使，明确排除在外。 */\n"
    "const SUMMON_LIFE_TYPES = ['zhiren','xiaogui','wutong','yinbing'];\n"
    "function addSummon(o){ G.summonsMadeTurn=(G.summonsMadeTurn||0)+1;\n"
    "  if(G.hero==='ganshiren' && SUMMON_LIFE_TYPES.indexOf(o.type)>=0) o.dur=(o.dur||0)+1;\n"
    "  G.summons.push(o); return o; }",
    'P6 addSummon 寿命+1')

sub('js/20_data.js',
    "passive:'每回合开始时，场上每有 1 个召唤单位，获得 1 点【尸气】。召唤单位死亡时，获得 2 点【尸气】。【尸气】可用于加强召唤系卡牌效果。',",
    "passive:'每回合开始时，场上每有 1 个召唤单位，获得 1 点【尸气】。召唤单位死亡时，获得 2 点【尸气】。召唤纸人/小鬼/五通神/阴兵时，它们额外获得 1 回合寿命（尸王不受影响）。【尸气】可用于加强召唤系卡牌效果。',",
    'P6 英雄被动文案')

sub('js/20_data.js',
    "  ['尸气','赶尸人专属资源：上限 12 点、整局累积。用于强化召唤（纸人/五通神）与引爆类牌（咒雨）。'],",
    "  ['尸气','赶尸人专属资源：上限 12 点、整局累积。用于强化召唤（纸人/五通神）与引爆类牌（咒雨）。'],\n"
    "  ['召唤寿命','召唤单位能存活到第几回合（每回合结束 -1，归零即消散）。赶尸人召唤纸人/小鬼/五通神/阴兵时，寿命额外 +1 回合（尸王不受影响）。'],",
    'P6 关键词 召唤寿命')

# ============================================================
# P7 幕间断崖：只动战后金币 3/6/9 → 4/8/12
# ============================================================
sub('js/40_flow.js',
    "  let g=3; if(hasElite) g=6; if(isBoss) g=9;",
    "  // v0.61.10(P7)：战后金币 3/6/9 → 4/8/12（普通/精英/Boss）。Boss 血量与篝火密度均不动。\n"
    "  let g=4; if(hasElite) g=8; if(isBoss) g=12;",
    'P7 战后金币 4/8/12')

# ============================================================
# P10 聚灵·武僧：升级效果整体替换 —— 仍抽 1；升级后「若抽到防御牌 +4 格挡」
# ============================================================
sub('js/20_data.js',
    "      :G.hero==='wuseng'?`抽 ${u?2:1} 张牌`",
    "      :G.hero==='wuseng'?`抽 1 张牌${u?'。若抽到【防御牌】，获得 4 点格挡':''}`",
    'P10 聚灵 卡面文案')

sub('js/20_data.js',
    "    eff:(u)=>{ const n=u?2:1; drawCards(n); const drew=G.lastDrawnCards||[];\n"
    "      if(G.hero==='ganshiren'){ if(drew.some(x=>isGhostCard(x))){ gainShiqi(u?2:1); log(`聚灵：抽到鬼怪牌，获得 ${u?2:1} 点【尸气】`); } }\n"
    "      else if(G.hero==='wuseng'){ /* B 文档：只抽牌，无附加 */ }",
    "    /* v0.61.10(P10)：武僧列升级效果整体替换 —— 原「升级抽 2」取消，改为「仍抽 1，抽到防御牌则 +4 格挡」。 */\n"
    "    eff:(u)=>{ const n=(G.hero==='wuseng')?1:(u?2:1); drawCards(n); const drew=G.lastDrawnCards||[];\n"
    "      if(G.hero==='ganshiren'){ if(drew.some(x=>isGhostCard(x))){ gainShiqi(u?2:1); log(`聚灵：抽到鬼怪牌，获得 ${u?2:1} 点【尸气】`); } }\n"
    "      else if(G.hero==='wuseng'){ if(u && drew.some(x=>x.type==='defense')){ gainBlock(4); log('聚灵：升级后抽到防御牌，获得 4 点格挡'); } }",
    'P10 聚灵 武僧效果')

# ============================================================
# P11 易物：换入的牌本回合费用 -1（各列通用）
# ============================================================
sub('js/20_data.js',
    "    t:(u)=>G.hero==='ganshiren'?`选择 1 张手牌与弃牌堆交换。若换出的是【鬼怪牌】，获得 1 点【尸气】`\n"
    "      :G.hero==='wuseng'?`选择 1 张手牌与弃牌堆交换。若换出的是防御牌，获得 4 点格挡`\n"
    "      :G.hero==='yincha'?`选择 1 张手牌与弃牌堆交换。若换出的是技能牌，恢复 5 点生命`\n"
    "      :`选择 1 张手牌与弃牌堆交换。若换出的是攻击牌，额外抽 1 张牌`,",
    "    t:(u)=>G.hero==='ganshiren'?`选择 1 张手牌与弃牌堆交换，换入的牌本回合费用 -1。若换出的是【鬼怪牌】，获得 1 点【尸气】`\n"
    "      :G.hero==='wuseng'?`选择 1 张手牌与弃牌堆交换，换入的牌本回合费用 -1。若换出的是防御牌，获得 4 点格挡`\n"
    "      :G.hero==='yincha'?`选择 1 张手牌与弃牌堆交换，换入的牌本回合费用 -1。若换出的是技能牌，恢复 5 点生命`\n"
    "      :`选择 1 张手牌与弃牌堆交换，换入的牌本回合费用 -1。若换出的是攻击牌，额外抽 1 张牌`,",
    'P11 易物 卡面文案')

sub('js/20_data.js',
    "function effectiveCost(c){\n"
    "  let cost=cardCost(c);\n",
    "function effectiveCost(c){\n"
    "  let cost=cardCost(c);\n"
    "  if(c.tempCostCut) cost=Math.max(0, cost-c.tempCostCut); // v0.61.10(P11)：易物换入的牌本回合费用 -1\n",
    'P11 effectiveCost 减费')

sub('js/30_engine.js',
    "  removeCardFromPiles(c);\n"
    "  G.hand.push(c);\n"
    "  ex.done=(ex.done||0)+1; // 已完成一次交换：此后取消不再把易物回退",
    "  removeCardFromPiles(c);\n"
    "  /* v0.61.10(P11)：换入的牌本回合费用 -1。\n"
    "     不能直接给 c 打标记 —— cardById() 返回的是 CARDS 里的**共享对象**，同一张牌的 3 张副本\n"
    "     会一起被减费。所以往手牌放一个副本，并让它在 G.deck 里**顶替原对象**\n"
    "     （保住 indexOf 语义：消耗牌本关结束要靠 G.deck.indexOf 回牌库）。 */\n"
    "  const cNew=Object.assign({}, c); cNew.tempCostCut=1;\n"
    "  const _di=G.deck.indexOf(c); if(_di>=0) G.deck[_di]=cNew;\n"
    "  G.hand.push(cNew);\n"
    "  ex.done=(ex.done||0)+1; // 已完成一次交换：此后取消不再把易物回退",
    'P11 pickExchangeNew 换入副本')

sub('js/30_engine.js',
    "  G.bleedSummons=false; G.bleedSummonsBonus=1;",
    "  G.bleedSummons=false; G.bleedSummonsBonus=1;\n"
    "  // v0.61.10(P11)：易物换入牌的「本回合 -1 费」到期。手里、抽牌堆、弃牌堆、牌库都扫一遍\n"
    "  // （牌可能已被弃掉，只在手牌上清会漏，下回合再抽回来就白赚一次减费）。\n"
    "  [G.hand,G.drawPile,G.discard,G.deck].forEach(p=>(p||[]).forEach(c=>{ if(c&&c.tempCostCut) delete c.tempCostCut; }));",
    'P11 startTurn 到期清除')

# ---------- 写盘 ----------
for f in FILES:
    p = os.path.join(ROOT, f)
    tmp = p + '.check.js'   # 必须以 .js 结尾，node --check 才认
    io.open(tmp, 'w', encoding='utf-8', newline='').write(buf[f])
    r = subprocess.run(['node', '--check', tmp], capture_output=True, text=True)
    if r.returncode != 0:
        os.remove(tmp); print('NODE CHECK FAIL', f); print(r.stdout, r.stderr); sys.exit(1)
    os.replace(tmp, p)
    print('OK  %s' % f)

print('\n--- %d 处改动 ---' % len(log))
for i, x in enumerate(log, 1):
    print('%2d. %s' % (i, x))
