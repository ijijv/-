# -*- coding: utf-8 -*-
r"""
v0.61.32 —— 32 条 ⏳ 待接线音效全部落地（素材清单.md 第一节 A~I 组）

【本批性质】纯「接线」：SFX_TABLE 里 70 个键**早就全在了**（v0.61.25 入表），
采样通路也早就通了（丢文件即生效）。缺的只是**触发点**——32 条键没有任何一处调用。
所以本批一行表数据都不改，只加/换调用点。

【接线口径：能收口就收口】
  · 收口型（一处覆盖多张牌/多个机制）—— 优先，改一处胜过改二十处：
      gainBlock()          → card_defense    （「防御牌起盾」= 出牌窗口内的格挡，11 张防御牌一次覆盖）
      addSummon()          → card_summon     （纸人/小鬼/五通神/阴兵/尸王/通灵/附灵术 全走这里）
      gainRage()           → card_xuenu      （阴差血怒的**唯一**入口，且只在真的涨了时出声）
      sealEnemy()          → card_zhenhun / kw_linghua （镇妖铃+钟馗镇魂共用；灵化弹开换听感）
      charmEnemy()         → card_charm / kw_linghua
      addJunkToHand()      → kw_junk
      discardRandomHand()/enemyRandomDiscard() → card_discard
  · 点名型（没有统一收口点，只好逐张列表）—— CARD_SFX 一张表 + doPlayCard 一处消费：
      atk_slash / atk_talisman / atk_blunt / atk_aoe（17 张攻击/法术牌）
      card_buff（8 张自我强化技能牌）
  · 改既有键（**这会改动 v0.61.25 已验收的行为**，素材清单.md 是这么定的，逐条列出）：
      enemyDebuff 3 处 → kw_weak ×2（虚弱/暗夜威压）、kw_gouhun ×1（勾魂）
      enemyBuffSelf 1 处 → boss_yehuo（业火附体）
      relic 1 处 → boss_split（谢必安分化；原先是蹭遗物音）
      relic 2 处 → relic_bell/fu/mirror（按法器类别分化，见 RELIC_SFX）
      relic 1 处 → ui_levelup（锻造升级；原先也是蹭遗物音）
      gold  1 处 → ui_unlock（成就解锁；原先是蹭金币音）
      card  1 处 → card_discard（敌人缠绕弃牌）
      **block 在出牌窗口内改播 card_defense** —— 非出牌来源（遗物/武僧被动/反震）仍是 block，
      所以「格挡」这个键并没有退役，只是分成了「牌给的」和「别的来源给的」两种听感。

【doc 里自相冲突的几条，本批的裁定（一张牌只给一个音）】
  · 剑符同时被列进 atk_slash 与 atk_talisman → 取 atk_slash（它排在斩击组首位）
  · 万剑归宗同时被列进 atk_talisman 与「群伤」 → 取 atk_talisman（doc 正面写的是「法术段」）
  · 群鬼乱舞/百鬼夜行同列 atk_blunt 与 atk_aoe → 取 atk_aoe（全体伤害的听感更有辨识度）
  · 卸甲生元同列 card_defense 与 card_buff → 取 card_defense（它确实是给格挡的，走收口点）
  · 嗜血 doc 未列 → 暂归 atk_slash（斩击吸血），已在更新日志里标注为待用户确认项
未接线的仅剩 2 项，均已记入更新日志：kw_curse 的「每回合末 -2」（本作诅咒不自动跳伤，无此机制）、
ui_panel 的「自动存档提示」（persistSave 调用极频繁，挂上去会吵，故意不接）。

锚点唯一性各校验 count==1；锚点按目标文件实际换行序列折算（本仓库混合 LF/CRLF）。
"""
import io
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..')
D20 = os.path.join(ROOT, 'js', '20_data.js')
ENG = os.path.join(ROOT, 'js', '30_engine.js')
UI = os.path.join(ROOT, 'js', '50_ui.js')
FLOW = os.path.join(ROOT, 'js', '40_flow.js')

EDITS = []

# ============================================================================
# 一、js/20_data.js
# ============================================================================
# 1) 两张点名表 + 两个查表函数（放在卡牌数据之后、机制函数之前）
EDITS.append((D20, """const isGhostCard = c => !!(c && c.type==='spirit' && GHOST_IDS.includes(c.id));
const isCanCurse  = c => !!(c && CAN_CURSE_IDS.includes(c.id));
""", """const isGhostCard = c => !!(c && c.type==='spirit' && GHOST_IDS.includes(c.id));
const isCanCurse  = c => !!(c && CAN_CURSE_IDS.includes(c.id));

/* ——— v0.61.32：逐张点名的音效表 ———
   只有「没有统一引擎收口点」的键才需要写在这：能收口的一律走收口点，别往这里堆。
   （给格挡的牌走 gainBlock 的 card_defense，召唤走 addSummon，血怒走 gainRage，
     镇魂/魅惑走 sealEnemy/charmEnemy —— 所以它们**不在**下表里。） */
const CARD_SFX = {
  /* A 组·玩家输出细分：17 张按听感归 4 类。一张牌只给一个音 —— 冲突时取更有辨识度的那类，
     所以「剑符」归斩击（不归符咒）、「万剑归宗」归符咒（不归群伤）、「群鬼乱舞/百鬼夜行」归群伤（不归钝击）。 */
  leifu:'atk_talisman',      huofu:'atk_talisman',      jianfu:'atk_slash',
  zhanyaojian:'atk_slash',   tianlei:'atk_talisman',    wanjian:'atk_talisman',
  tiebushan:'atk_blunt',     shihun:'atk_slash',        shixue:'atk_slash',
  taomufu:'atk_talisman',    shihunzhou:'atk_talisman', zhongkui:'atk_blunt',
  qungui:'atk_aoe',          baigui:'atk_aoe',          zhouyu:'atk_aoe',
  yinbingguo:'atk_aoe',      shi_wang:'atk_aoe',
  /* D 组·自我强化：这些牌没有共性收口点（不是给格挡、不是召唤），只能逐张点名 */
  kaitianyan:'card_buff',    xueji:'card_buff',         ranxue:'card_buff',
  ranhun:'card_buff',        jingxin:'card_buff',       yixing:'card_buff',
  fuling:'card_buff',        xisui:'card_buff'
};
function cardSfxFor(c){ return (c && CARD_SFX[c.id]) || null; }

/* I 组·遗物分化：12 件法器按「铃/幡 · 符/笔/剑 · 镜/录/道心」三类分开，
   聚宝盆与返魂香不属这三类 → 退回通用的 relic 音（所以 relic 键也没退役）。 */
const RELIC_SFX = {
  zhaohunfan:'relic_bell',   shehunling:'relic_bell',
  zhushabi:'relic_fu',       jifengfu:'relic_fu',        hushenfu:'relic_fu',
  taomujian:'relic_fu',      tongqianjian:'relic_fu',
  yinyangjing:'relic_mirror',daoxin:'relic_mirror',      baiguilu:'relic_mirror'
};
function relicSfxFor(r){ return (r && RELIC_SFX[r.id]) || 'relic'; }
"""))

# 2) 血怒获取（阴差核心资源）—— 收口点：只在真的涨了时出声（到上限后不再响）
EDITS.append((D20,
    "function gainRage(n){ if(!n || n<=0) return; G.xuenu = Math.min(G.maxXuenu||10, (G.xuenu||0)+n); }",
    """function gainRage(n){ if(!n || n<=0) return;
  const __b=(G.xuenu||0);
  G.xuenu = Math.min(G.maxXuenu||10, __b+n);
  if(G.xuenu>__b) sfx('card_xuenu'); }   // v0.61.32：满 10 层后不再出声（满了就「涨不上去」了）"""))

# 3) 召唤己方 —— 收口点（纸人/小鬼/五通神/阴兵/尸王/通灵/附灵术 全走这里）
EDITS.append((D20,
    "  G.summons.push(o); return o; }",
    "  sfx('card_summon');   // v0.61.32：所有己方召唤的**唯一**入口（含尸王与附灵术）\n  G.summons.push(o); return o; }"))

# 4) 镇魂：成功 vs 被灵化弹开，两种听感
EDITS.append((D20,
    "  if(isLinghua(e)){ log(e.name+' 灵化免疫了【镇魂】'); return false; }",
    "  if(isLinghua(e)){ sfx('kw_linghua'); log(e.name+' 灵化免疫了【镇魂】'); return false; }   // v0.61.32：弹开的听感要能分辨\n  sfx('card_zhenhun');"))

# 5) 魅惑：同上
EDITS.append((D20,
    "  if(isLinghua(e)){ log(e.name+' 灵化免疫了【魅惑】'); return false; }",
    "  if(isLinghua(e)){ sfx('kw_linghua'); log(e.name+' 灵化免疫了【魅惑】'); return false; }   // v0.61.32\n  sfx('card_charm');"))

# 6) 怨气塞手牌：只有真塞进去了才出声（到 3 张上限时原样只记日志）
EDITS.append((D20,
    "function addJunkToHand(n){ for(let i=0;i<n;i++){ if(G.hand.filter(c=>c.type==='junk').length>=3){ log('怨气已达上限（最多 3 张），不再塞入废牌'); return; } G.hand.push(junkCard()); } log('怨气缠身：一张【怨气】废牌塞入你的手牌'); }",
    """function addJunkToHand(n){ let __added=0;
  for(let i=0;i<n;i++){
    if(G.hand.filter(c=>c.type==='junk').length>=3){ log('怨气已达上限（最多 3 张），不再塞入废牌'); break; }
    G.hand.push(junkCard()); __added++;
  }
  /* v0.61.32：把原来的中途 return 改 break —— 语义不变（到上限时同样不记「怨气缠身」那行），
     但能知道到底塞进去没有，好决定 kw_junk 要不要响。 */
  if(__added){ sfx('kw_junk'); log('怨气缠身：一张【怨气】废牌塞入你的手牌'); } }"""))

# 7) 诅咒引爆（kw_curse）—— 5 处「把诅咒转成伤害」的地方
#    斩妖剑（天师，引爆 2 层）
EDITS.append((D20,
    "      if(G.hero==='tianshi'){ dealDamageTo(t,u?12:8); const boom=Math.min(2,t.curse||0); for(let i=0;i<boom;i++) dealDamageTo(t,u?7:5); t.curse-=boom; if(boom>0) log(`斩妖剑引爆 ${boom} 层【诅咒】`); return; }",
    "      if(G.hero==='tianshi'){ dealDamageTo(t,u?12:8); const boom=Math.min(2,t.curse||0); for(let i=0;i<boom;i++) dealDamageTo(t,u?7:5); t.curse-=boom; if(boom>0){ sfx('kw_curse'); log(`斩妖剑引爆 ${boom} 层【诅咒】`); } return; }   // v0.61.32"))
#    铁布衫（天师，消耗全部诅咒换伤害）
EDITS.append((D20,
    "      else if(G.hero==='tianshi'){ d+=(t.curse||0)*(u?2:1); t.curse=0; }",
    "      else if(G.hero==='tianshi'){ const __c=(t.curse||0); d+=__c*(u?2:1); t.curse=0; if(__c>0) sfx('kw_curse'); }   // v0.61.32"))
#    噬魂术（武僧列 / 其余列的引爆分支；「落空」分支不出声）
EDITS.append((D20,
    "      if(G.hero==='wuseng'){ const c=t.curse||0; if(c<=0){ log('噬魂术：目标没有诅咒，落空'); return false; } t.curse=0; dealDamageTo(t,c*(u?3:2)); const bb=c*(u?2:1); gainBlock(bb); log(`噬魂术：引爆 ${c} 层【诅咒】，获得 ${bb} 点格挡`); return; }",
    "      if(G.hero==='wuseng'){ const c=t.curse||0; if(c<=0){ log('噬魂术：目标没有诅咒，落空'); return false; } t.curse=0; sfx('kw_curse'); dealDamageTo(t,c*(u?3:2)); const bb=c*(u?2:1); gainBlock(bb); log(`噬魂术：引爆 ${c} 层【诅咒】，获得 ${bb} 点格挡`); return; }   // v0.61.32"))
EDITS.append((D20,
    "      const c=t.curse||0; if(c<=0){ log('噬魂术：目标没有诅咒，落空'); return false; } t.curse=0; dealDamageTo(t,c*(u?6:5)); }},",
    "      const c=t.curse||0; if(c<=0){ log('噬魂术：目标没有诅咒，落空'); return false; } t.curse=0; sfx('kw_curse'); dealDamageTo(t,c*(u?6:5)); }},   // v0.61.32"))
#    百鬼夜行（天师列，全体引爆）
EDITS.append((D20,
    "    eff:(u)=>{ if(G.hero==='tianshi'){ aliveEnemies().forEach(e=>{ const cc=e.curse||0; dealDamageTo(e,7+(u?2:1)*cc); e.curse=0; }); return; }",
    "    eff:(u)=>{ if(G.hero==='tianshi'){ let __any=false; aliveEnemies().forEach(e=>{ const cc=e.curse||0; if(cc>0) __any=true; dealDamageTo(e,7+(u?2:1)*cc); e.curse=0; }); if(__any) sfx('kw_curse'); return; }   // v0.61.32"))
#    钟馗镇魂（天师列，引爆并清空全部诅咒）
EDITS.append((D20,
    "      const c=t.curse||0; sealEnemy(t,1); dealDamageTo(t,u?24:18); for(let i=0;i<c;i++) dealDamageTo(t,u?6:5); t.curse=0; if(c>0) log(`钟馗镇魂引爆 ${c} 层【诅咒】`); }},",
    "      const c=t.curse||0; sealEnemy(t,1); dealDamageTo(t,u?24:18); for(let i=0;i<c;i++) dealDamageTo(t,u?6:5); t.curse=0; if(c>0){ sfx('kw_curse'); log(`钟馗镇魂引爆 ${c} 层【诅咒】`); } }},   // v0.61.32"))

# ============================================================================
# 二、js/30_engine.js
# ============================================================================
# 8) 格挡被击碎（打光）+ 业火反噬
EDITS.append((ENG,
    """  if(!ignoreBlock && e.block>0){ absorbed=Math.min(e.block,d); e.block-=absorbed; d-=absorbed; if(e.pingbi>0) e.pingbi=Math.min(e.pingbi, e.block); }""",
    """  let __hadBlock=0; // v0.61.32：记住打之前有没有格挡，好在「刚好打光」那一击播碎盾
  if(!ignoreBlock && e.block>0){ __hadBlock=e.block; absorbed=Math.min(e.block,d); e.block-=absorbed; d-=absorbed; if(e.pingbi>0) e.pingbi=Math.min(e.pingbi, e.block); }
  if(__hadBlock>0 && e.block<=0) sfx('kw_shield_break');   // 「碎」而不是「挡」：只在被打光的那一下响"""))
EDITS.append((ENG,
    "  if(e.key==='xiuluowang' && (G.karmaFire||0)>0 && d>0){ G.hp=Math.max(0,G.hp-1);",
    "  if(e.key==='xiuluowang' && (G.karmaFire||0)>0 && d>0){ sfx('kw_yehuo'); G.hp=Math.max(0,G.hp-1);"))
# 9) 剧毒（词缀里唯一没有独立音的）→ affix_proc
EDITS.append((ENG,
    "  if(attacker.affixes){ const jd=attacker.affixes.find(a=>a.id==='judu'); if(jd) d+=2*jd.tier; }",
    "  if(attacker.affixes){ const jd=attacker.affixes.find(a=>a.id==='judu'); if(jd){ d+=2*jd.tier; sfx('affix_proc'); } }   // v0.61.32：剧毒是 9 词缀里唯一没有独立音的，走通用词缀音"))
# 10) 蚀血（敌人被动回血）→ kw_regen；勾魂词缀 → kw_gouhun
EDITS.append((ENG,
    "    const sx=attacker.affixes.find(a=>a.id==='shixue'); if(sx && loss>0){ attacker.hp=Math.min(attacker.maxHp, attacker.hp+3*sx.tier); log(`${attacker.name} 蚀血：回复 ${3*sx.tier} 点生命`); }",
    "    const sx=attacker.affixes.find(a=>a.id==='shixue'); if(sx && loss>0){ attacker.hp=Math.min(attacker.maxHp, attacker.hp+3*sx.tier); sfx('kw_regen'); log(`${attacker.name} 蚀血：回复 ${3*sx.tier} 点生命`); }   // v0.61.32：敌人的被动回血都归 kw_regen"))
EDITS.append((ENG,
    "    if(attacker.affixes.some(a=>a.id==='gouhun') && !G.debuffImmune){ G.gouhun=1; log(`${attacker.name} 勾魂（下回合少抽 1 张）`); }",
    "    if(attacker.affixes.some(a=>a.id==='gouhun') && !G.debuffImmune){ sfx('kw_gouhun'); G.gouhun=1; log(`${attacker.name} 勾魂（下回合少抽 1 张）`); }   // v0.61.32"))
# 11) 谢必安分化：从蹭遗物音改为专属
EDITS.append((ENG,
    "  if(G.target>idx) G.target=idx;\n  sfx('relic');",
    "  if(G.target>idx) G.target=idx;\n  sfx('boss_split');   // v0.61.32：从蹭 relic 改成 Boss 分化专属音"))
# 12) 防御牌起盾（收口点：出牌窗口内的格挡 = 牌给的；窗口外仍是通用 block）
EDITS.append((ENG,
    "  if(n>0){ G.blockGainedTurn=(G.blockGainedTurn||0)+n; sfx('block'); floatDamage('+'+n, 'block', document.querySelector('#player-panel .hpbar')); }",
    "  /* v0.61.32：出牌窗口内 = 「防御牌起盾」走 card_defense；窗口外（遗物/武僧被动/反震/五通神）仍是通用 block。\n     两键并存，block 没有退役。 */\n  if(n>0){ G.blockGainedTurn=(G.blockGainedTurn||0)+n; sfx(cardPlayWindow?'card_defense':'block'); floatDamage('+'+n, 'block', document.querySelector('#player-panel .hpbar')); }"))
# 13) 弃牌的两条路径 → card_discard
EDITS.append((ENG,
    "function discardRandomHand(){ if(!G.hand.length) return null; const i=Math.floor(rng()*G.hand.length); const c=G.hand.splice(i,1)[0]; if(c.type!=='junk') G.discard.push(c); log(`弃掉【${c.name}】`); return c; }",
    "function discardRandomHand(){ if(!G.hand.length) return null; const i=Math.floor(rng()*G.hand.length); const c=G.hand.splice(i,1)[0]; if(c.type!=='junk') G.discard.push(c); sfx('card_discard'); log(`弃掉【${c.name}】`); return c; }   // v0.61.32"))
EDITS.append((ENG,
    "  floatMsg(`被弃掉：${c.name}`); sfx('card');",
    "  floatMsg(`被弃掉：${c.name}`); sfx('card_discard');   // v0.61.32：缠绕弃牌从通用 card 改成弃牌专用音"))
# 14) 忘忧饮下
EDITS.append((ENG,
    "  G.wangyouDrunk=(G.wangyouDrunk||0)+1;\n  log(`饮下【${c.name}】——忘忧汤入喉，前尘如烟`);",
    "  G.wangyouDrunk=(G.wangyouDrunk||0)+1;\n  sfx('kw_wangyou');   // v0.61.32：饮下那一刻的听感（「奉汤」是 enemy_debuff，两者不同）\n  log(`饮下【${c.name}】——忘忧汤入喉，前尘如烟`);"))
# 15) 灼烧跳伤（每回合开始 -2/层）
EDITS.append((ENG,
    "  if(G.burn>0){ const bd=G.burn*2; G.hp=Math.max(0,G.hp-bd); G.turnStats.dmgTaken+=bd;",
    "  if(G.burn>0){ sfx('kw_burn'); const bd=G.burn*2; G.hp=Math.max(0,G.hp-bd); G.turnStats.dmgTaken+=bd;   // v0.61.32：灼烧跳伤"))
# 16) 再生词缀（敌人每回合 +4）
EDITS.append((ENG,
    "      const zs=e.affixes.find(a=>a.id==='zaisheng'); if(zs && e.hp>0){ e.hp=Math.min(e.maxHp, e.hp+4*zs.tier); }",
    "      const zs=e.affixes.find(a=>a.id==='zaisheng'); if(zs && e.hp>0){ e.hp=Math.min(e.maxHp, e.hp+4*zs.tier); sfx('kw_regen'); }   // v0.61.32"))
# 17) 虚弱 / 勾魂 / 暗夜威压：从通用 enemy_debuff 拆出专属键
EDITS.append((ENG,
    "      case 'weak': sfx('enemy_debuff');",
    "      case 'weak': sfx('kw_weak');   // v0.61.32：虚弱从通用 enemy_debuff 拆出（狐妖/判官）"))
EDITS.append((ENG,
    "      case 'gouhun': sfx('enemy_debuff');",
    "      case 'gouhun': sfx('kw_gouhun');   // v0.61.32：勾魂从通用 enemy_debuff 拆出（白无常/拘魂使/阎罗）"))
EDITS.append((ENG,
    "if(e.intent.weak){ if(!G.debuffImmune){ G.weak=2; floatMsg('你被【虚弱】');",
    "if(e.intent.weak){ sfx('kw_weak'); if(!G.debuffImmune){ G.weak=2; floatMsg('你被【虚弱】');"))
# 18) 判官王生死簿记账 / 修罗王业火附体：Boss 招牌机制专属音
EDITS.append((ENG,
    "      case 'jiming': { e.ledgerActive=true;",
    "      case 'jiming': { sfx('boss_ledger'); e.ledgerActive=true;   // v0.61.32：生死簿记账（原先整段静默）"))
EDITS.append((ENG,
    "      case 'yehuo': sfx('enemy_buff_self');",
    "      case 'yehuo': sfx('boss_yehuo');   // v0.61.32：业火附体是修罗王招牌机制，从通用 buff 拆出"))
# 19) 出牌时的逐张点名音（CARD_SFX 的唯一消费点）
EDITS.append((ENG,
    "  sfx('card'); if(exNow) sfx('card_exhaust');   // v0.61.25：消耗牌额外给一声",
    """  sfx('card'); if(exNow) sfx('card_exhaust');   // v0.61.25：消耗牌额外给一声
  const __cs=cardSfxFor(c); if(__cs) sfx(__cs);   // v0.61.32：逐张点名的施法/斩击/钝击/群伤/自我强化听感"""))

# ============================================================================
# 三、js/50_ui.js
# ============================================================================
# 20) 图鉴收录
EDITS.append((UI,
    "  SAVE.unlocked.push(key); persistSave();\n  floatMsg('图鉴 · ' + ENEMIES[key].name);",
    "  SAVE.unlocked.push(key); persistSave();\n  sfx('ui_unlock');   // v0.61.32：图鉴新条目\n  floatMsg('图鉴 · ' + ENEMIES[key].name);"))
# 21) 成就解锁（gold → ui_unlock）
EDITS.append((UI,
    "  if(a){\n    sfx('gold');",
    "  if(a){\n    sfx('ui_unlock');   // v0.61.32：成就从蹭金币音改成专属解锁音"))
# 22) 面板开合（showOverlay/hideOverlay 是全部面板与结算的唯一开合点）
EDITS.append((UI,
    "function showOverlay(html, closable){ document.getElementById('overlayContent').innerHTML=html; document.getElementById('overlay').classList.remove('hidden');",
    "function showOverlay(html, closable){ sfx('ui_panel');   // v0.61.32：面板开合（设置/图鉴/成就/牌库/结算）\n  document.getElementById('overlayContent').innerHTML=html; document.getElementById('overlay').classList.remove('hidden');"))
EDITS.append((UI,
    "function hideOverlay(){ document.getElementById('overlay').classList.add('hidden'); }",
    "function hideOverlay(){ sfx('ui_panel');   // v0.61.32：与 showOverlay 成对\n  document.getElementById('overlay').classList.add('hidden'); }"))
# 23) 遗物按法器类别分化（古井许愿）
EDITS.append((UI,
    "  sfx('relic'); log(`获得遗物【${relic.name}】`);",
    "  sfx(relicSfxFor(relic)); log(`获得遗物【${relic.name}】`);   // v0.61.32：铃/幡·符/笔/剑·镜/录 三类分化"))
# 24) 遗物按法器类别分化（三选一）
EDITS.append((UI,
    "function pickRelic(i){ const r=G.relicPicks[i]; if(!hasRelic(r.id)) G.relics.push(r.id); sfx('relic');",
    "function pickRelic(i){ const r=G.relicPicks[i]; if(!hasRelic(r.id)) G.relics.push(r.id); sfx(relicSfxFor(r));   // v0.61.32"))
# 25) 锻造升级（relic → ui_levelup）
EDITS.append((UI,
    "  c.up=true; log(`锻造升级【${c.name}】`); sfx('relic');",
    "  c.up=true; log(`锻造升级【${c.name}】`); sfx('ui_levelup');   // v0.61.32：升级从蹭遗物音改成专属音"))

# ============================================================================
# 四、js/40_flow.js
# ============================================================================
# 26) 无尽攀塔过渡
EDITS.append((FLOW,
    "function nextEndlessLap(){\n  MAP=genEndlessMap();",
    "function nextEndlessLap(){\n  sfx('ui_endless');   // v0.61.32：无尽进入下一层的过渡音\n  MAP=genEndlessMap();"))


def main():
    if 'cardSfxFor' in io.open(D20, encoding='utf-8').read():
        print('SKIP 已改过')
        return 0
    cache, bad = {}, []
    for path, a, b in EDITS:
        if path not in cache:
            cache[path] = io.open(path, encoding='utf-8', newline='').read()
        raw = cache[path]
        nl = '\r\n' if '\r\n' in raw else '\n'
        a2, b2 = a.replace('\n', nl), b.replace('\n', nl)
        n = raw.count(a2)
        if n != 1:
            bad.append((os.path.relpath(path, ROOT), n, a.split('\n')[0][:70]))
            continue
        cache[path] = raw.replace(a2, b2, 1)
    if bad:
        print('FAIL 锚点不唯一/缺失，整体未落盘：')
        for f, n, s in bad:
            print('  [%s] count=%d  %r' % (f, n, s))
        return 1
    for path, s in cache.items():
        io.open(path, 'w', encoding='utf-8', newline='').write(s)
        print('OK %s' % os.path.relpath(path, ROOT))
    print('OK 共落地 %d 处' % len(EDITS))
    return 0


if __name__ == '__main__':
    sys.exit(main())