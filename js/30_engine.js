/* ============================================================================
 * 志怪塔 · js/30_engine.js —— 战斗引擎层
 * 全局状态 newState / 敌人辅助 / 伤害结算 / 诅咒·召唤·封印·魅惑 / 回合流程 startTurn·enemyAct / 卡牌打出 doPlayCard
 * ----------------------------------------------------------------------------
 * 由 原型.html 的整段内联脚本按原顺序切分而来（v0.61.05 三层重构，纯搬移）。
 * 拼接校验：本文件组去掉各自横幅后，应与切分前的内联脚本正文逐字节一致。
 * 加载：经典外链脚本（非 ES module），双击本地打开即可直接游玩。
 * ============================================================================ */
/* ===================== 全局状态 ===================== */
let G = null;
function newState(){
  return { log:[], deck:[], drawPile:[], hand:[], discard:[],
    hp:80, maxHp:80, block:0, energy:3, weak:0, gouhun:0, thorns:0, act:1,
    pendingEnergy:0, pendingDiscard:0, summons:[], enemies:[], target:0, mapRow:0, mapCol:-1, rewardPicks:[],
    gold:0, removeCount:0, shopWares:[], shopMarkup:0, turn:0, battleStartHp:80,
    turnStats:{dmgTaken:0, blocked:0, dealt:0, kills:[]}, turnSummary:'',
    relics:[], skillsPlayedThisTurn:0, attackBuff:0, daoxinUsed:false, pendingRelic:false, relicPicks:[],
    revivedFree:false, goldDoubled:false, lastGold:0, battleGold:0, battleResult:null, openingPicks:[],
    hero:'tianshi', totalHpLost:0, turnAtkBuff:0, dodge:0, debuffImmune:0, xuejiBonus:0, xuejiArmed:false, xuejiHurt:false, discardSelect:null, burn:0, zombieDmg:0, pendingSeal:0, karmaFire:0, duhun:null, xiejia:0, bloodPact:0, retain:0, potions:[], score:0, wangyouTurns:0, wangyouDrunk:0, wangyouPool:null, battleOver:false, dead:false, endless:false, endlessFloor:0, forgeFrom:null,
    // 茅山赶尸人专用状态
    尸气:0, maxShiQi:12,
    // 血祭阴差专用状态
    xuenu:0, maxXuenu:10,
    // 符箓天师专用状态
    ybTarget:-1,  // 阴兵过境(天师#47)：🎯阴兵目标 = 你上一次施加诅咒的敌人 uid；-1 表示尚未锁定
    // ===== 全卡重做：新增通用状态 =====
    hpLostTurn:0, blockGainedTurn:0, summonsMadeTurn:0, lastDrawnCards:[],
    retainHeal:0, pendingBlockStart:0, boostCurse:0, xisuiTurns:0, bleedSummonsBonus:1,
    shiWangCard:null, ranhunType:null, ranhunSelf:null, endBlockKind:null, xiejiaUp:false,
    zhouhunSteal:0, stealWatch:false, stealAccum:0,   // 咒印(#42B)：咒魂吸血监视
    exhausted:[] };   // 本关已消耗的牌（战斗结束清空回牌库）
}

/* ===================== 敌人辅助 ===================== */
function alive(e){ return e.hp>0; }
function aliveEnemies(){ return G.enemies.filter(alive); }
function curEnemy(){
  const al=aliveEnemies();
  if(!al.length) return null;
  if(G.target>=0 && G.target<G.enemies.length && G.enemies[G.target].hp>0) return G.enemies[G.target];
  return al[0];
}
function randomAlive(){ const a=aliveEnemies(); return a.length? a[Math.floor(rng()*a.length)] : null; }
function selectTarget(i){ if(TUT && TUT.step===2) advanceTut(); G.target=i; render(); document.querySelectorAll('#hand .dmg-buff,#hand .dmg-nerf,#hand .dmg-plain,#hand .dmg-miss').forEach(el=>{ el.classList.remove('dmg-flash'); void el.offsetWidth; el.classList.add('dmg-flash'); }); }

/* ===================== 战斗函数 ===================== */
function dealDamageTo(e,n,ignoreBlock){
  let d=n+(G.attackBuff||0)+(G.turnAtkBuff||0);
  if((e.kind==='ghost'||e.kind==='jiangshi') && hasRelic('taomujian')) d=Math.floor(d*1.25);
  if(e.kind==='yao' && hasRelic('tongqianjian')) d=Math.floor(d*1.25);
  if(G.weak>0 && !ignoreBlock) d=Math.floor(d*0.75);
  if(e.key==='xiuluowang' && (G.karmaFire||0)>0) d=Math.floor(d*0.7);
  if(!ignoreBlock && e.block>0){ const absorbed=Math.min(e.block,d); e.block-=absorbed; d-=absorbed; if(e.pingbi>0) e.pingbi=Math.min(e.pingbi, e.block); }
  if(e.ledgerActive && d>0) e.ledgerDmg=(e.ledgerDmg||0)+Math.min(d, e.hp); // v0.61 B9：记账含斩杀溢出会让清算反弹系统性虚高 → 按实际可扣血量截断
  const hpBefore=e.hp; const actual=Math.min(d, hpBefore); // 实际扣除血量：d 可能溢出击杀，回血按 actual 而非打出伤害
  if(G.stealWatch){ G.stealAccum=(G.stealAccum||0)+actual; } // 咒印(#42B)：累计这张攻击牌的实际伤害，供 100% 吸血
  e.hp-=d; G.turnStats.dealt+=d; afterEnemyDamaged(e);
  if(G.duhun && G.duhun.turns>0 && actual>0){ const h=Math.floor(actual*G.duhun.ratio); if(h>0){ G.hp=Math.min(G.maxHp, G.hp+h); floatDamage('+'+h, 'heal', document.querySelector('#player-panel .hpbar')); log(`渡魂归己：回复 ${h} 点生命`); } }
  if(e.affixes && d>0){ const fz=e.affixes.find(a=>a.id==='fanzhen'); if(fz){ const r=3*fz.tier; G.hp=Math.max(0,G.hp-r); G.totalHpLost=(G.totalHpLost||0)+r; G.hpLostTurn=(G.hpLostTurn||0)+r; G.turnStats.dmgTaken+=r; log(`${e.name} 反震：反弹 ${r} 点伤害`); } }
  if(e.key==='xiuluowang' && (G.karmaFire||0)>0 && d>0){ G.hp=Math.max(0,G.hp-1); G.totalHpLost=(G.totalHpLost||0)+1; G.hpLostTurn=(G.hpLostTurn||0)+1; G.turnStats.dmgTaken+=1; log('业火反噬：你对修罗王造成伤害，损失 1 点生命'); }
  sfx('hit');
  const el=document.querySelector('#enemy-panel .enemy[data-uid="'+e.uid+'"]');
  floatDamage('-'+d, '', el);
  HITFX.enemies.add(e);
  if(e.boss) inkBurst(el);
  else if(e.elite) screenMicroShake();
  log(`对 ${e.name} 造成 ${d} 点伤害`);
  return actual;
}
function dealDamageToTarget(n, ignoreBlock){ const e=curEnemy(); if(e) dealDamageTo(e,n,ignoreBlock); }
function dealDamageToAll(n){ aliveEnemies().forEach(e=>dealDamageTo(e,n)); }
function isLinghua(e){ return !!(e && e.affixes && e.affixes.some(a=>a.id==='linghua')); }
function applyCurse(e, n){
  let v=n;
  if(e.key==='xiuluowang' && (G.karmaFire||0)>0) v=v*2;
  // 守一(天师)强化：本张被强化的可施咒牌额外 +1 层（仅持续一次施加）
  if((G.boostCurse||0)>0){ v+=1; G.boostCurse--; log('守一强化：本次诅咒额外 +1 层'); }
  // 计算诅咒溢出
  const currentCurse = e.curse || 0;
  const potentialCurse = currentCurse + v;
  const overflow = Math.max(0, potentialCurse - 6);

  // 设置诅咒上限为6
  e.curse = Math.min(6, potentialCurse);

  // 如果是符箓天师且有溢出，转换为格挡
  if(G.hero === 'tianshi' && overflow > 0) {
    gainBlock(overflow);
    log(`诅咒溢出：${overflow} 层诅咒转换为 ${overflow} 点格挡`);
  }

  if(e.curse>=6) unlockAchievement('zuzhou');
  // 追踪本回合实际施加的诅咒层数（符箓天师，用于血祭/金刚符/金光罩等）
  const applied = e.curse - currentCurse;
  if(G.hero==='tianshi'){ CURSE_THIS_TURN = (CURSE_THIS_TURN||0) + Math.max(0, applied); }
  // 阴兵过境(天师#47)：每次对某敌施咒（含溢出尝试）即把下回合阴兵索敌标记🎯切到它
  if(G.hero==='tianshi' && e.hp>0) G.ybTarget=e.uid;
  // 返回实际生效的层数（调用方可据此判断是否有变化）
  return applied;
}
/* 攻击牌基础伤害（手牌实时伤害预览用，u=是否升级；zhanyaojian 含诅咒加成） */
const CARD_DMG = {
  /* 手牌伤害预览 = eff 逐列"当前状态"同式抄写。重做前旧值已整体废弃，勿再单独补行。
     仅镜像结算数值，不吃副作用、不实际扣资源；四列顺序：A赶尸人/B武僧/C阴差/D天师。 */
  leifu: u=>{ const t=curEnemy(); if(!t) return 0; let d=(G.hero==='tianshi'?(u?9:6):G.hero==='yincha'?(u?8:5):(u?6:4));
    if(G.hero==='ganshiren') d=(u?7:4)+G.summons.filter(s=>s.dur>0).length;
    else if(G.hero==='wuseng') d+=Math.min(6,Math.floor((G.block||0)/(u?2:3)));
    else if(G.hero==='yincha') d+=2*Math.min(3,rageLayers()); // eff: 2×rageSpend(2,6) 至多 +6
    else if(t.curse>0) d+=3;
    return d; },
  huofu: u=>{ const t=curEnemy(); if(!t) return 0; let d=G.hero==='tianshi'?(u?8:5):(u?7:5);
    if(G.hero==='ganshiren') d=u?8:5;
    if(G.hero==='wuseng') d+=Math.min(6,Math.floor((G.block||0)/(u?2:3)));
    if(G.hero==='yincha') d=u?11:8; // C 固定 11/8（本回合有格挡也不加），与 eff 一致
    return d; },
  jianfu: u=>{ const t=curEnemy(); if(!t) return 0; let d;
    if(G.hero==='wuseng') d=(u?10:6)+Math.floor(G.block/2); // 耗全部格挡，每2格挡+1
    else if(G.hero==='yincha') d=10+(G.hpLostTurn||0)*(u?2:1); // C 固定 10，本回合每失 1 血 +1/+2
    else if(G.hero==='tianshi'){ d=(u?14:9); if((t.curse||0)>=3) d*=2; }
    else { d=(u?13:8); if(hasShiqi(2)) d*=2; }
    return d; },
  zhanyaojian: u=>{ const t=curEnemy(); if(!t) return 0; const base=u?12:8;
    if(G.hero==='tianshi'){ const boom=Math.min(2,t.curse||0); return base+boom*(u?7:5); } // D 引爆≤2层诅咒
    if(G.hero==='ganshiren') return base+2*G.summons.filter(s=>s.dur>0).length;
    if(G.hero==='yincha') return (u?14:9)+((t.curse||0)>0?(u?6:4):0); // C：9/14 且带诅咒额外 4/6
    return (t.curse>0)?base+6:base; }, // B：目标带诅咒 +6
  tianlei: u=>{ if(!curEnemy()) return 0;
    if(G.hero==='wuseng') return u?20:15; // 获得格挡是副效果，不进伤害预览（与 eff 的主伤害一致）
    if(G.hero==='yincha') return (u?21:16)+Math.min(20,(G.totalHpLost||0)*(u?2:1)); // 近似：未含本牌自扣的5血
    if(G.hero==='tianshi') return u?30:20; // D 诅咒仅作费用减免，不改伤害
    return u?24:18; },
  wanjian: u=>G.hero==='wuseng'?(u?14:9):(G.hero==='tianshi'?(u?16:14):(u?15:10)),
  zhongkui: u=>{ const t=curEnemy(); if(!t) return 0;
    if(G.hero==='tianshi') return (u?20:15)+(t.curse||0)*(u?6:5); // D 引爆全部诅咒
    if(G.hero==='ganshiren') return u?24:16; // A 固定 16/24（无条件获尸气，不改伤害）
    let d=u?22:16; if(G.hero==='yincha' && G.hp<G.maxHp*0.4) d*=2; // C 残血（<40%）翻倍
    return d; },
  tiebushan: u=>{ let d=G.block||0;
    if(G.hero==='ganshiren') d+=Math.floor((G.尸气||0)/2)*(u?2:1);
    else if(G.hero==='tianshi'){ const t=curEnemy(); if(t) d+=(t.curse||0)*(u?2:1); }
    return d; },
  shihun: u=>{ const t=curEnemy(); if(!t) return 0; // 四列：预览须与 eff 逐列一致
    if(G.hero==='ganshiren') return u?18:14; // 赶尸人：耗4尸气固定伤，不吃诅咒
    if(G.hero==='wuseng') return (t.curse||0)*(u?3:2); // 武僧：每层 2/3 伤害（另按每层获 1/2 格挡）
    if(G.hero==='yincha') return (u?15:10)+2*Math.min(10,rageLayers()); // 阴差：血怒每层+2(至多10层=+20)，打出时消耗
    return (t.curse||0)*(u?6:5); },
  qungui: u=>{ const t=curEnemy();
    if(G.hero==='wuseng') return t?4+G.summons.filter(s=>s.dur>0).length*(u?2:1):0; // B 直伤
    if(G.hero==='tianshi') return t?((u?6:5)+Math.min(u?6:4,t.curse||0)):0;         // D 直伤
    if(G.hero==='yincha') return 0; // C 无直接伤害（增伤buff），数值以召唤面板为准
    // A：数值=全场召唤"立即作用一次"的总伤害（近似总伤），无召唤时 0→显示"无召唤"
    return G.summons.filter(s=>s.dur>0).reduce((a,s)=>a+s.v+(s.type!=='shi_wang'&&isSummon('shi_wang')?1:0),0); },
  taomufu: u=>{ const t=curEnemy(); if(!t) return 0; let d=G.hero==='tianshi'?(u?7:5):G.hero==='ganshiren'?(u?7:5):(G.hero==='yincha'?(u?7:4):(u?6:4));
    if(t.kind==='ghost'||t.kind==='jiangshi') d+=(u?6:4);
    if(G.hero==='wuseng' && (G.blockGainedTurn||0)>0) d+=2;
    else if(G.hero==='yincha' && t.hp<t.maxHp*0.5) d+=2;
    return d; },
  shixue: u=>{ const t=curEnemy(); if(!t) return 0; let d;
    if(G.hero==='ganshiren') d=(u?7:5)+Math.min(5,Math.floor((G.尸气||0)/2));
    else if(G.hero==='wuseng') d=(u?6:4)+Math.min(5,Math.floor((G.block||0)/(u?2:3)));
    else if(G.hero==='yincha') d=(u?6:4)+Math.min(u?20:15,Math.floor((G.totalHpLost||0)/(u?3:4)));
    else d=(u?8:6);
    return d; },
  baigui: u=>{ const n=G.summons.filter(s=>s.dur>0).length;
    if(G.hero==='ganshiren') return (u?6:4)+n*(u?3:2);
    if(G.hero==='wuseng') return (u?6:5)+Math.min(u?11:8,Math.floor((G.block||0)/(u?1:2)));
    if(G.hero==='yincha') return (u?7:5)+n*(u?3:2);
    const t=curEnemy(); return t?7+(u?2:1)*(t.curse||0):0; }, // D 每目标按自身诅咒独立
  shihunzhou: u=>G.hero==='ganshiren'?(u?6:3):(G.hero==='tianshi'?(u?6:3):(G.hero==='yincha'?(u?8:5):(u?7:5))),
  zhiren: u=>{ const base = G.hero==='ganshiren' ? (hasShiqi(4)?(u?7:5):(u?4:2)) : (G.hero==='wuseng'||G.hero==='tianshi'?(u?3:2):(G.hero==='yincha'?(rageLayers()>=4?(u?5:4):(u?2:1)):(u?2:1)));
    const bleed=(G.bleedSummons)?Math.floor((G.hpLostTurn||0)/2):0;
    return base+(isSummon('shi_wang')?1:0)+bleed; }, // 每回合末 v（+尸王在场 / +阴差群鬼流血）
  xiaogui: u=>{ const v=G.hero==='tianshi'?(u?4:3):(G.hero==='ganshiren'?(u?4:2):(G.hero==='yincha'?(u?2:1):(u?3:2)));
    const bleed=(G.bleedSummons)?Math.floor((G.hpLostTurn||0)/2):0;
    return v+(isSummon('shi_wang')?1:0)+bleed; },
  yinbingguo: u=>{ const bleed=(G.bleedSummons)?Math.floor((G.hpLostTurn||0)/2):0;
    return (u?5:4)+(isSummon('shi_wang')?1:0)+bleed; }, // 每只阴兵 v
  zhenyaoling: u=>{ const t=curEnemy(); if(!t) return 0;
    const base = G.hero==='wuseng'?(u?15:10):(G.hero==='tianshi'?(u?14:10):(u?16:10));
    if(G.hero==='wuseng') return base+(((G.block||0)>=10)?(u?11:8):0); // 格挡 ≥10 → +8/+11
    if(G.hero==='yincha') return base+2*Math.min(10,rageLayers()); // 血怒每层 +2（至多 10 层）
    return base; },
  zhouyu: u=>G.hero==='wuseng'?0:(G.尸气||0)*(u?7:6), // B 咒雨无伤害（格挡转化），预览不显示
  shi_wang: ()=>10                // 尸王自身每回合末全体 10（不吃自身 +1）
};
const PER_TURN_SUMMONS = ['zhiren','xiaogui','yinbingguo','shi_wang'];
function previewDamage(c){
  const rawFn = CARD_DMG[c.id];
  if(!rawFn) return null;
  if(c.id==='zhouyu' && (G.hero==='wuseng'||G.hero==='yincha'||G.hero==='tianshi')) return null; // B 格挡转化 / C 只施咒 / D 只施咒，本身都无伤害
  if(c.id==='qungui' && G.hero==='yincha') return null; // C 群鬼乱舞是召唤增伤 buff，本身无直伤（数值看召唤面板）
  const perTurn = PER_TURN_SUMMONS.includes(c.id);
  // 召唤牌目标：小鬼/阴兵打「诅咒层数最高」的敌人，纸人打随机敌人（预览用当前选中目标作参照）
  let e = curEnemy();
  if(perTurn && (c.id==='xiaogui' || c.id==='yinbingguo')) e = mostCursedEnemy() || e;
  if(!e) return null;
  const raw = rawFn(c.up);
  const dynamic = DYNAMIC_DMG.includes(c.id);
  if(dynamic){
    if(raw<=0){
      const why = c.id==='tiebushan' ? '无格挡'
        : c.id==='shihun' ? ((G.hero==='wuseng'||G.hero==='tianshi')?'无诅咒':'无目标')
        : c.id==='zhouyu' ? (G.hero==='ganshiren'?'无尸气':'无目标')
        : (G.hero==='tianshi' ? '无目标' : '无召唤');
      return { raw:0, d:0, miss:why, dynamic:true };
    }
  } else if(raw==null || raw<=0){
    return null;
  }
  let d = raw;
  if(G.hero==='tianshi' && c.id==='zhiren' && (e.curse||0)>0) d += (c.up?3:2); // 纸人（天师）：目标带诅咒 +2/+3
  const zhusha = c.type==='attack' && hasRelic('zhushabi');
  if(zhusha) d += 2;
  const turnBuf = c.type==='attack' && G.turnAtkBuff>0;
  if(turnBuf) d += G.turnAtkBuff;
  const taomu = (e.kind==='ghost'||e.kind==='jiangshi') && hasRelic('taomujian');
  if(taomu) d=Math.floor(d*1.25);
  const tongqian = e.kind==='yao' && hasRelic('tongqianjian');
  if(tongqian) d=Math.floor(d*1.25);
  const ignoreWeak = c.id==='tianlei' && c.up;
  if(G.weak>0 && !ignoreWeak) d=Math.floor(d*0.75);
  if(e.key==='xiuluowang' && (G.karmaFire||0)>0) d=Math.floor(d*0.7);

  const wbDmg = G.hero==='wuseng' && WUSENG_BLOCK_DMG.indexOf(c.id)>=0;
  const ycDmg = G.hero==='yincha' && YINCHA_DYN_DMG.indexOf(c.id)>=0; // 阴差流血/血怒浮动牌：徽章常显
  const tsDmg = G.hero==='tianshi' && TIANSHI_DYN_DMG.indexOf(c.id)>=0; // 天师诅咒/格挡浮动牌：徽章常显
  const curseTag = ((G.hero==='wuseng' && WUSENG_NO_CURSE_TAG.indexOf(c.id)>=0)
    || (G.hero==='yincha' && YINCHA_NO_CURSE_TAG.indexOf(c.id)>=0)) ? 0 : (e.curse||0);
  return { raw, d, curse:curseTag, weak:G.weak>0 && !ignoreWeak, taomu, tongqian, zhusha, turnBuf, dynamic: dynamic || wbDmg || ycDmg || tsDmg, perTurn };
}
function dealDamageToPlayer(n, attacker, floatDelay){
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
  let d=n+(attacker.strength||0); // v0.61 C2：每点力量 +2 → +1（力量×蓄力×连击的叠乘过高）
  if(attacker.affixes){ const jd=attacker.affixes.find(a=>a.id==='judu'); if(jd) d+=2*jd.tier; }
  // v0.61 C1：魅惑只标记、不按段消耗 —— 否则连击/蓄力重击只有第一段被削减（与关键词「下回合伤害 -50%」不符）
  if(attacker.charm>0){ const cpr=attacker.charmPct!=null?attacker.charmPct:0.5; d=Math.floor(d*cpr); attacker.charmUsed=true; }
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
  if(attacker.lifesteal && loss>0){ const hl=Math.floor(loss*attacker.lifesteal); const _cap=Math.floor((attacker.maxHp||attacker.hp)*LIFESTEAL_HEAL_CAP_RATIO); attacker.hp=Math.min(attacker.hp+hl, _cap); log(`${attacker.name} 吸血：回复 ${hl} 点生命`); }
  if(attacker.affixes){
    const sx=attacker.affixes.find(a=>a.id==='shixue'); if(sx && loss>0){ attacker.hp=Math.min(attacker.maxHp, attacker.hp+3*sx.tier); log(`${attacker.name} 蚀血：回复 ${3*sx.tier} 点生命`); }
    if(attacker.affixes.some(a=>a.id==='gouhun') && !G.debuffImmune){ G.gouhun=1; log(`${attacker.name} 勾魂（下回合少抽 1 张）`); }
    if(attacker.affixes.some(a=>a.id==='feipai')){ addJunkToHand(1); }
  }
}
function afterEnemyDamaged(e){
  if(e.hp<=0){ onEnemyDeathCheck(e); return; }
  if(e.split && !e.splitDone && e.hp < e.maxHp/2){ splitBoss(e); }
}
function splitBoss(e){
  e.splitDone=true;
  unlockBestiary(e.key);
  const idx=G.enemies.indexOf(e);
  const b1=makeEnemy(ENEMIES['bian'], 'bian');
  const b2=makeEnemy(ENEMIES['bian'], 'bian');
  b2.intentIndex=1; // 错开两个必安的意图循环，避免同时勾魂
  G.enemies.splice(idx,1,b1,b2);
  if(G.target>idx) G.target=idx;
  sfx('relic');
  floatMsg('谢必安 · 分化！');
  log('谢必安血线过半，分化为两个「必安」！');
}
function onEnemyDeathCheck(e){
  if(e.phase && !e.phase2){ enterPhase2(e); }
  else {
    G.turnStats.kills.push(e.name); G.totalKills=(G.totalKills||0)+1; if(G.totalKills>=100) unlockAchievement('baizhan'); unlockBestiary(e.key);
    e.dying=true; sfx('death');
    setTimeout(()=>{ e.dying=false; render(); }, 450);
  }
}
function enterPhase2(e){
  e.phase2=true;
  e.hp=Math.floor(e.maxHp*0.6);
  e.block=0; e.curse=0; e.charm=0; e.charmPct=0.5; e.seal=false; e.pendingDamage=0;
  addEnemyStrength(e, 2);
  e.intents = e.intents2 ? e.intents2.map(it=>({...it})) : e.intents;
  e.intentIndex=0;
  sfx('relic');
  floatMsg('轮回 · 第二阶段');
  log('阎罗天子堕入轮回，阴气更盛——进入第二阶段！');
}
function directDamage(n, msg){
  if(n<=0) return false;
  sfx('hurt'); hurtVignette(); floatDamage('-'+n, 'to-player', document.querySelector('#player-panel .hpbar'));
  if(msg) log(msg);
  // 统一走 loseHp：扣血 + totalHpLost + 血契/舍身/阴差血怒联动（避免重复扣血与重复累加 totalHpLost）
  loseHp(n);
  G.turnStats.dmgTaken=(G.turnStats.dmgTaken||0)+n;
  if(G.hp<=0){ G.hp=0; loseGame(); return true; }
  return false;
}
function tickSeals(){ [G.hand, G.drawPile, G.discard].forEach(pile=>pile.forEach(c=>{ if(c.sealed>0) c.sealed--; })); }
function gainBlock(n){
  G.block+=n;
  if(n>0){ G.blockGainedTurn=(G.blockGainedTurn||0)+n; sfx('block'); floatDamage('+'+n, 'block', document.querySelector('#player-panel .hpbar')); }
}
function heal(n){ G.hp=Math.min(G.maxHp, G.hp+n); sfx('heal'); const bar=document.querySelector('#player-panel .hpbar'); floatDamage('+'+n, 'heal', bar); }
function discardRandomHand(){ if(!G.hand.length) return null; const i=Math.floor(rng()*G.hand.length); const c=G.hand.splice(i,1)[0]; if(c.type!=='junk') G.discard.push(c); log(`弃掉【${c.name}】`); return c; }
function enemyRandomDiscard(){
  if(!G.hand.length){ log('缠绕生效，但你已无手牌可弃'); return; }
  const i=Math.floor(rng()*G.hand.length);
  const c=G.hand.splice(i,1)[0];
  if(c.type!=='junk') G.discard.push(c);
  floatMsg(`被弃掉：${c.name}`); sfx('card');
  log(`敌人的缠绕：随机弃掉你的【${c.name}】`);
  render();
}
function showWangyouChoice(){
  // v0.61 B8：快照存「卡对象引用」而非下标 —— 同帧若还有缠绕/业火等 splice 手牌，下标会错位（弃错牌 / undefined.type）
  const pool=G.hand.slice();
  G.wangyouPool=pool;
  const cards=pool.map((c,i)=>`<div class="card ${RCOLOR[c.rarity]}" onclick="drinkWangyou(${i})">${cardBody(c)}</div>`).join('');
  showOverlay(`<h2>忘 忧 汤</h2><p>孟婆的汤还萦绕在喉头——选择 1 张手牌「饮下」（弃置，进弃牌堆而非封印），或拒绝（受 <b style="color:var(--red)">8 点真实伤害</b>）。</p><div class="reward-cards">${cards}</div><button class="btn ghost" onclick="refuseWangyou()">拒绝 · 受 8 点真实伤害</button>`);
}
function drinkWangyou(i){
  const pool=G.wangyouPool||G.hand;
  const picked=pool[i];
  G.wangyouPool=null;
  if(!picked){ hideOverlay(); render(); return; }
  const hi=G.hand.indexOf(picked); // 按引用回查真实位置
  const c = hi>=0 ? G.hand.splice(hi,1)[0] : picked; // 已被缠绕弃掉/封印移走的牌：只记「饮下」，不重复弃置
  if(hi>=0 && c.type!=='junk') G.discard.push(c);
  G.wangyouDrunk=(G.wangyouDrunk||0)+1;
  log(`饮下【${c.name}】——忘忧汤入喉，前尘如烟`);
  hideOverlay(); render();
}
function refuseWangyou(){
  G.wangyouPool=null;
  const dead=directDamage(8, '你拒绝了忘忧汤，孟婆的怒火化作 8 点真实伤害');
  if(dead) return;
  hideOverlay(); render();
}
function startDiscardSelect(n, srcCard){
  if(G.hand.length < n){
    // 手牌不足，无法弃足 —— 回退焚符（牌回手，不给符文）
    if(srcCard){ const di=G.discard.lastIndexOf(srcCard); if(di>=0) G.discard.splice(di,1); G.hand.push(srcCard); log('手牌不足，【焚符】已回退'); }
    render(); return;
  }
  G.discardSelect={ need:n, picked:[], card:srcCard||null };
  renderDiscardSelect();
}
function renderDiscardSelect(){
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
    else if(G.hero==='wuseng'){ gainBlock(u?6:4); }
    else if(G.hero==='yincha'){ heal(u?4:3); }
    else { const re=randomAlive(); if(re) applyCurse(re,1); gainBlock(u?3:2); }
  }
  log(`焚符：弃掉 ${nDiscarded} 张手牌`);
  G.discardSelect=null;
  hideOverlay(); render();
}
function cancelDiscardSelect(){
  const s=G.discardSelect; if(!s) return;
  if(s.card){ const di=G.discard.lastIndexOf(s.card); if(di>=0) G.discard.splice(di,1); G.hand.push(s.card); log('放弃【焚符】，未弃牌、未获得符文'); }
  G.discardSelect=null;
  hideOverlay(); render();
}
/* 火符(#2，赶尸人 A 列)：挑选弃 1 张手牌；弃到鬼怪牌额外获得尸气（其余三列仍为随机弃） */
function startHuofuSelect(srcCard, up, target, dmg){
  // 手牌只剩火符本身：选无可选，伤害照常结算（不再整张白打）
  if(!G.hand.length){ log('火符：没有可弃的手牌，伤害直接结算'); if(target && dmg>0) dealDamageTo(target, dmg); return; }
  G.huofuSelect={ card:srcCard||null, up:!!up, target:target||null, dmg:dmg||0, cost:srcCard?effectiveCost(srcCard):0 };
  renderHuofuSelect();
}
function renderHuofuSelect(){
  const s=G.huofuSelect; if(!s) return;
  const cards=G.hand.map((c,i)=>`<div class="card ${RCOLOR[c.rarity]}" onclick="pickHuofuDiscard(${i})">${cardBody(c)}</div>`).join('');
  showOverlay(`<h2>火 符 · 弃 牌</h2><p style="color:var(--red)">挑选 <b>1</b> 张手牌弃掉；若弃掉的是【鬼怪牌】，获得 ${s.up?2:1} 点【尸气】</p><div class="reward-cards">${cards}</div>
    <button class="btn ghost" onclick="cancelHuofuSelect()">取消（不弃牌 · 退符文 · 火符回手）</button>`);
}
function cancelHuofuSelect(){
  const s=G.huofuSelect; if(!s) return;
  // v0.61 B7：伤害尚未结算，取消＝完全回退（与焚符「放弃」同一惯例）
  if(s.card){ const di=G.discard.lastIndexOf(s.card); if(di>=0){ G.discard.splice(di,1); G.hand.push(s.card); log('放弃【火符】，牌已回手'); } }
  if(s.cost>0){ G.energy+=s.cost; log(`火符取消：退回 ${s.cost} 点符文`); }
  G.huofuSelect=null; hideOverlay(); render();
}
function pickHuofuDiscard(i){
  const s=G.huofuSelect; if(!s) return;
  const c=G.hand.splice(i,1)[0]; if(!c){ renderHuofuSelect(); return; }
  if(c.type!=='junk') G.discard.push(c);
  log(`弃掉【${c.name}】`);
  let gain=0;
  if(isGhostCard(c)){ gain=s.up?2:1; gainShiqi(gain); log(`火符：弃掉鬼怪牌，获得 ${gain} 点【尸气】`); }
  const _t=s.target, _d=s.dmg;
  G.huofuSelect=null; hideOverlay();
  if(_t && (_t.hp||0)>0 && _d>0) dealDamageTo(_t, _d); // v0.61 B7：确认弃牌后才结算伤害
  render();
  floatMsg(gain>0?`+${gain} 尸气`:'已弃牌');
  // 延后结算的伤害同样要收口胜负（幂等守卫见 B4）
  if(G.hp<=0){ G.hp=0; loseGame(); return; }
  if(aliveEnemies().length===0){ winFight(); return; }
}
function startExchangeSelect(times, srcCard){
  if(!G.hand.length){ // v0.61 B13：异常兜底（正常已被 playCard 前置守卫拦住）——易物回手，别白打
    if(srcCard){ const di=G.discard.lastIndexOf(srcCard); if(di>=0){ G.discard.splice(di,1); G.hand.push(srcCard); log('没有可交换的手牌，【易物】已回手'); } }
    floatMsg('没有手牌可交换'); render(); return; }
  G.exchange={ times, phase:'pickHand', handIndex:null, pool:null, card:srcCard||null, done:0 };
  renderExchange();
}
function cancelExchangeSelect(){
  const ex=G.exchange; if(!ex) return;
  // 打出后未成交即放弃：把易物牌从弃牌堆取回手牌（与焚符"放弃"一致），不吞牌
  if(ex.card && ex.done===0){ const di=G.discard.lastIndexOf(ex.card); if(di>=0){ G.discard.splice(di,1); G.hand.push(ex.card); log('放弃【易物】，牌已回手'); } }
  G.exchange=null; hideOverlay(); render();
}
function renderExchange(){
  const ex=G.exchange; if(!ex) return;
  if(ex.phase==='pickHand'){
    const cards=G.hand.map((c,i)=>`<div class="card ${RCOLOR[c.rarity]}" onclick="pickExchangeHand(${i})">${cardBody(c)}</div>`).join('');
    showOverlay(`<h2>易物 · 选一张手牌</h2><p>选择一张要交换出去的手牌（还剩 <b>${ex.times}</b> 次交换）</p><div class="reward-cards">${cards}</div><button class="btn ghost" onclick="cancelExchangeSelect()">放弃继续交易</button>`);
  } else if(ex.phase==='pickNew'){
    const cards=ex.pool.map((c,i)=>`<div class="card ${RCOLOR[c.rarity]}" onclick="pickExchangeNew(${i})">${cardBody(c)}</div>`).join('');
    showOverlay(`<h2>易物 · 牌堆随机三张</h2><p>选一张换入你的手牌</p><div class="reward-cards">${cards}</div><button class="btn ghost" onclick="cancelExchangeSelect()">放弃交换</button>`);
  }
}
function pickExchangeHand(i){
  const ex=G.exchange; if(!ex) return;
  ex.handIndex=i;
  const all=G.drawPile.concat(G.discard);
  ex.pool=shuffle(all).slice(0,3);
  ex.phase='pickNew';
  renderExchange();
}
function removeCardFromPiles(c){
  let i=G.drawPile.indexOf(c);
  if(i>=0){ G.drawPile.splice(i,1); return; }
  i=G.discard.indexOf(c);
  if(i>=0){ G.discard.splice(i,1); }
}
function pickExchangeNew(i){
  const ex=G.exchange; if(!ex) return;
  const c=ex.pool[i]; if(!c) return;
  const old=G.hand.splice(ex.handIndex,1)[0];
  if(old.type!=='junk') G.discard.push(old);
  removeCardFromPiles(c);
  G.hand.push(c);
  ex.done=(ex.done||0)+1; // 已完成一次交换：此后取消不再把易物回退
  // 易物(#27)：若换出的是特定类型，按英雄给奖
  if(G.hero==='ganshiren' && isGhostCard(old)){ gainShiqi(1); log('易物：换出鬼怪牌，获得 1 点【尸气】'); }
  else if(G.hero==='wuseng' && old.type==='defense'){ gainBlock(4); log('易物：换出防御牌，获得 4 点格挡'); }
  else if(G.hero==='yincha' && old.type==='skill'){ heal(5); log('易物：换出技能牌，恢复 5 点生命'); }
  else if(G.hero==='tianshi' && old.type==='attack'){ drawCards(1); log('易物：换出攻击牌，额外抽 1 张'); }
  log(`易物：用【${old.name}】换入【${c.name}】`);
  ex.times--;
  if(ex.times>0 && G.hand.length){ ex.phase='pickHand'; ex.handIndex=null; ex.pool=null; renderExchange(); }
  else { G.exchange=null; hideOverlay(); render(); }
}
function renderRetainSelect(){
  const s=G.retainSelect; if(!s) return;
  const cards=G.hand.map((c,i)=>{ const sel=s.picked.includes(i); return `<div class="card ${RCOLOR[c.rarity]} ${sel?'selected':''}" onclick="toggleRetainPick(${i})">${cardBody(c)}${sel?'<div style="color:var(--green);margin-top:4px">✓ 已选</div>':''}</div>`; }).join('');
  showOverlay(`<h2>守一 · 保留手牌</h2><p>选择最多 <b>${s.need}</b> 张牌保留到下一回合（已选 <b>${s.picked.length}</b> 张），其余弃掉。</p><div class="reward-cards">${cards}</div>
    <button class="btn" onclick="confirmRetainSelect()">确认保留</button>
    <button class="btn ghost" onclick="skipRetainSelect()">不保留 · 全部弃掉</button>`);
}
function toggleRetainPick(i){
  const s=G.retainSelect; if(!s) return;
  const idx=s.picked.indexOf(i);
  if(idx>=0) s.picked.splice(idx,1);
  else if(s.picked.length<s.need) s.picked.push(i);
  renderRetainSelect();
}
function confirmRetainSelect(){
  const s=G.retainSelect; if(!s) return;
  let costSum=0, shiqiKeep=0;
  s.picked.forEach(i=>{
    const c=G.hand[i]; if(!c) return;
    c.retain=true;
    // 守一(#26)：按英雄在保留时/下回合结算奖励
    if(G.hero==='ganshiren'){ if(isGhostCard(c)){ shiqiKeep++; } }
    else if(G.hero==='wuseng'){ if(c.type==='defense'){ const sb=G.shouyiUp?4:3; gainBlock(sb); log(`守一：保留防御牌，获得 ${sb} 点格挡`); } }
    else if(G.hero==='yincha'){ costSum += cardCost(c); }
    else if(G.hero==='tianshi'){ if(isCanCurse(c)) c.curseBoostLayer=1; }
  });
  if(shiqiKeep>0){ gainShiqi(shiqiKeep); log(`守一：保留 ${shiqiKeep} 张鬼怪牌，获得 ${shiqiKeep} 点【尸气】`); }
  if(costSum>0){ G.retainHeal=(G.retainHeal||0)+costSum; log(`守一：保留手牌费用合计 ${costSum}，下回合恢复等量生命`); }
  G.retainSelect=null;
  hideOverlay();
  finishEndTurn();
}
function skipRetainSelect(){
  G.retainSelect=null;
  hideOverlay();
  finishEndTurn();
}

function resetDeck(){ G.drawPile=shuffle([...G.deck]); G.hand=[]; G.discard=[]; }
function drawCards(n){
  const drawn=[]; const objs=[];
  for(let i=0;i<n;i++){
    if(G.hand.length>=10){ log('手牌已满'); break; }
    if(!G.drawPile.length){ if(!G.discard.length) break; G.drawPile=shuffle(G.discard); G.discard=[]; log('弃牌堆洗回抽牌堆'); }
    const c=G.drawPile.pop(); G.hand.push(c); drawn.push(c.name); objs.push(c);
  }
  G.lastDrawnCards=objs;
  if(drawn.length) log(`摸 ${drawn.length} 张：${drawn.join('、')}`);
}

/* ===================== 回合流程 ===================== */
let CURSE_THIS_TURN = 0; // 本回合施加的诅咒数量

function startBattle(keys){
  SCENE='battle';
  setBg(G.endless?'act3':'act'+G.act); setBGM('battle');
  G.enemies = keys.map(k=>makeEnemy(ENEMIES[k], k));
  G.enemies.forEach((e,i)=>{ if(e.intents.length>1) e.intentIndex = i % e.intents.length; });
  G.target=0;
  G.battleOver=false; // v0.61 B4：每场开打重置终局旗标
  G.ybTarget=-1; // 阴兵索敌标记：本场战斗从头锁（-1=无目标，落到带诅咒随机）
  PLAYER_HP_PREV=null; ENEMY_HP_PREV={};
  G.block=0; G.weak=0; G.gouhun=0; G.thorns=0; G.pendingEnergy=0; G.pendingDiscard=0; G.summons=[];
  G.turn=0; G.turnSummary=''; G.daoxinUsed=false; G.skillsPlayedThisTurn=0; G.attackBuff=0; G.totalHpLost=0; G.dodge=0; G.dodgeDraw=0; G.debuffImmune=0; G.xuejiBonus=0; G.xuejiArmed=false; G.xuejiHurt=false; G.burn=0; G.zombieDmg=0; G.pendingSeal=0; G.karmaFire=0; G.duhun=null; G.xiejia=0; G.zhouyuA=false; G.尸气=0; G.exhausted=[];
  G.deck.forEach(c=>c.sealed=0);
  if(hasRelic('zhaohunfan')){ G.hp=Math.min(G.maxHp,G.hp+3); log('招魂幡：恢复 3 点生命'); }
  G.battleStartHp=G.hp;
  log(`—— 遭遇 ${G.enemies.map(e=>e.name).join('、')} ——`);
  const beginBattle=()=>{
    resetDeck();
    // 尸王（赶尸人）：每关开始必然在手牌。洗牌后把它从抽牌堆取回手牌（本关若还没打出召唤，牌在循环里）
    if(G.hero==='ganshiren'){
      const _sw = G.drawPile.find(c=>c.id==='shi_wang');
      if(_sw){ G.drawPile = G.drawPile.filter(c=>c!==_sw); G.hand.push(_sw); log('【尸王】已在手牌，随时可召唤'); }
    }
    if(!tutorialSeen()) startGuidedTutorial(); startTurn();
  };
  if(G.enemies.some(e=>e.boss)) bossIntro(beginBattle);
  else beginBattle();
}
function startTurn(){
  G.turn=(G.turn||0)+1;
  G.turnStats={dmgTaken:0, blocked:0, dealt:0, kills:[]};
  turnBanner('第 '+G.turn+' 回合');
  log('—— 第 '+G.turn+' 回合开始 ——');
  // —— 回合内计数与一次性标记清零（供各列“本回合/抽到/失去生命/召唤”判定）——
  G.hpLostTurn=0; G.blockGainedTurn=0; G.summonsMadeTurn=0; CURSE_THIS_TURN=0;
  G.boostCurse=0; G.junkPlayedThisTurn=0; G.ranhunType=null; G.ranhunSelf=null; G.ranhunHeal=0; G.shouyiUp=false;
  G.zhouhunSteal=0; G.stealWatch=false; G.stealAccum=0; // 咒印：吸血只在本回合内有效
  G.thorns=0; G.hitHeal=0; G.hitCurse=0; G.hitShiqi=0; G.hitRage=0; G.hitBlock=0; G.nextBlock=0;
  G.dodgeShiqi=0; G.dodgeNextBlock=0; G.dodgeHealRage=0; G.dodgeCurse=0;
  G.bleedSummons=false; G.bleedSummonsBonus=1;
  if(G.burn>0){ const bd=G.burn*2; G.hp=Math.max(0,G.hp-bd); G.turnStats.dmgTaken+=bd; log(`灼烧：失去 ${bd} 点生命（${G.burn} 层）`); if(G.hp<=0){ G.hp=0; loseGame(); return; } }
  G.skillsPlayedThisTurn=0; G.attackBuff=0; G.turnAtkBuff=0; G.bloodPact=0; G.retain=0;
  G.energy=3+G.pendingEnergy;
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
    else if(G.hero==='yincha'){ loseHp(2); log('洗髓经：失去 2 点生命，获得 1 点符文'); }
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
    if(s.type==='zhiren' && G.hero==='wuseng'){ const b=summonTurnBlock(s); gainBlock(b); log(`纸人存活：获得 ${b} 点格挡`); }
    else if(s.type==='yinbing' && G.hero==='wuseng'){ const b=summonTurnBlock(s); gainBlock(b); log(`阴兵存活：获得 ${b} 点格挡`); }
    else if(s.type==='wutong'){ wutongTick(s); }
  }
  G.summons = G.summons.filter(s=> s.type==='wutong' ? (s.indefinite || s.dur>0) : s.dur>0);
  if(G.hero==='tianshi'){
    // 咒印道体：每回合开始时，对【诅咒】层数最高的敌人施加 1 层诅咒；施加产生的溢出（超 6 层上限）每层转为 1 点格挡。
    let maxCurseEnemy = null;
    let maxCurseCount = -1;
    for(const enemy of aliveEnemies()){
      if(enemy.curse > maxCurseCount){
        maxCurseCount = enemy.curse;
        maxCurseEnemy = enemy;
      }
    }
    if(maxCurseEnemy){
      applyCurse(maxCurseEnemy, 1);
      if(maxCurseCount < 6) log(`咒印道体：对敌人施加 1 层诅咒（当前最高 ${maxCurseCount} 层）`);
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
  // v0.61 B8：缠绕先结算、忘忧汤后开 —— 汤的手牌快照与后续索引才对得上
  if(G.pendingDiscard>0){ G.pendingDiscard--; enemyRandomDiscard(); }
  if(G.wangyouTurns>0){ G.wangyouTurns--; if(G.hand.length) showWangyouChoice(); else log('忘忧汤翻涌，但你手牌空空，躲过一劫'); }
  saveRun();
}
function mostCursedEnemy(){
  let best=null, mx=-1;
  for(const e of aliveEnemies()){ if((e.curse||0)>mx){ mx=e.curse||0; best=e; } }
  return best;
}
/* 单个召唤单位触发一次“回合末行动”（被回合末 / 附灵术 / 群鬼乱舞调用） */
function summonAct(s){
  const types=['zhiren','xiaogui','yinbing','shi_wang'];
  if(!types.includes(s.type)) return;
  // 尸王在场：其他召唤单位伤害 +1
  const shiWangBonus = (s.type!=='shi_wang' && G.summons.some(x=>x.type==='shi_wang' && x.dur>0)) ? 1 : 0;
  // 群鬼乱舞(#9) C 阴差：本回合每失去 2 点生命，召唤单位伤害 +1
  const bleedBonus = G.bleedSummons ? Math.floor((G.hpLostTurn||0)/2)*(G.bleedSummonsBonus||1) : 0;
  const v = s.v + shiWangBonus + bleedBonus;
  if(s.type==='zhiren'){
    if(G.hero==='tianshi'){
      // 天师：#41D 对随机敌人造成伤害，该敌人每有 1 层诅咒纸人伤害 +1
      const t=randomAlive();
      if(t){ const zb=(t.curse||0)>0?(s.up?3:2):0; dealDamageTo(t, v + zb); if(zb>0) log(`纸人：目标带【诅咒】，伤害 +${zb}`); }
    } else if(G.hero==='ganshiren'){
      // 赶尸人 #41A：每回合末造成伤害（不叠诅咒）
      const t=randomAlive(); if(t) dealDamageTo(t, v);
    } else if(G.hero==='wuseng'){
      // 武僧 #41B：只造成伤害，不再附带诅咒
      const t=randomAlive(); if(t) dealDamageTo(t, v);
    } else {
      // 阴差 #41C：造成伤害，并按召唤时记录的 healV 为你回血（强化版 4/5 伤害 + 回 3/4）
      const t=randomAlive();
      if(t){ dealDamageTo(t, v); const zh=s.healV||2; heal(zh); log(`纸人攻击，恢复 ${zh} 点生命`); }
    }
  }
  else if(s.type==='xiaogui'){
    // #43：天师打诅咒最高敌人，其余打随机敌人
    const t = G.hero==='tianshi' ? (mostCursedEnemy()||randomAlive()) : randomAlive();
    if(t) dealDamageTo(t, v);
    if(G.hero==='yincha'){ gainRage(1); log('小鬼：获得 1 层【血怒】'); }
  }
  else if(s.type==='yinbing'){
    // #47：天师优先攻击🎯阴兵目标（上一次被施咒的敌人）；标记敌已死则回落带诅咒随机。其余列随机。
    const t = G.hero==='tianshi' ? (aliveEnemies().find(x=>x.uid===G.ybTarget) || summonTarget(true)) : randomAlive();
    if(t){
      dealDamageTo(t, v);
      if(G.hero==='yincha'){ const yh=s.healV||2; heal(yh); log(`阴兵攻击，为你恢复 ${yh} 点生命`); }
    }
  }
  else if(s.type==='shi_wang'){
    for(const e of aliveEnemies()) dealDamageTo(e, s.v);   // 尸王：每回合末对全体造成 10 点伤害
  }
}
/* 召唤单位消散时的结算（#41/#43/#47/#48） */
function onSummonDeath(s){
  if(s.type==='zhiren'){
    if(G.hero==='ganshiren'){ gainShiqi(2); log('纸人死亡，获得 2 点【尸气】'); }
  } else if(s.type==='xiaogui'){
    if(G.hero==='ganshiren'){ const q=s.up?3:2; gainShiqi(q); log(`小鬼死亡，获得 ${q} 点【尸气】`); }
    else if(G.hero==='wuseng'){ const xb=s.up?7:5; gainBlock(xb); log(`小鬼死亡，获得 ${xb} 点格挡`); }
    else if(G.hero==='yincha'){ const xh=s.up?4:2; heal(xh); log(`小鬼死亡，恢复 ${xh} 点生命`); }
  } else if(s.type==='yinbing'){
    if(G.hero==='ganshiren'){ gainShiqi(1); log('阴兵死亡，获得 1 点【尸气】'); }
  } else if(s.type==='shi_wang'){
    returnShiWangCard(); log('尸王消散，【尸王】回到弃牌堆');
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
}
function endTurn(){
  if(TUT && TUT.step===3) advanceTut();
  // 废牌：未主动打出的自动打出
  const junks=G.hand.filter(c=>c.type==='junk');
  if(junks.length){
    log(`回合结束，${junks.length} 张【怨气】废牌自动打出`);
    // 使用统一的打出流程（doPlayCard）以保持一致的资源消耗与副作用处理
    // 先收集需要自动打出的卡牌索引（从后向前以免索引错位）
    const indices = [];
    for(let i=G.hand.length-1;i>=0;i--){ if(G.hand[i] && G.hand[i].type==='junk') indices.push(i); }
    for(const idx of indices){
      // 尝试打出；doPlayCard 会处理能量/弃牌/消耗及相关副作用（包括 G.junkPlayedThisTurn 与 燃魂）
      doPlayCard(idx);
    }
    // 确保清理残余的废牌（如果 eff 未移除），作为兜底
    G.hand=G.hand.filter(c=>c.type!=='junk');
  }
  if(G.hp<=0){ G.hp=0; loseGame(); return; }
  // 守一：结束回合时弹出选择保留
  if(G.retain>0 && G.hand.length>0){ showEndTurnRetain(); return; }
  finishEndTurn();
}
function showEndTurnRetain(){
  G.retainSelect={ need:Math.min(G.retain, G.hand.length), picked:[] };
  renderRetainSelect();
}
function finishEndTurn(){
  G.gouhun=0; // 勾魂效果本回合已结算
  // 守一：保留被标记的手牌
  // 守一保留 + 尸王（赶尸人）：未打出的【尸王】留手，不弃（打出/死亡后才入循环）
  const kept=G.hand.filter(c=>c.retain || (G.hero==='ganshiren' && c.id==='shi_wang'));
  G.discard=G.discard.concat(G.hand.filter(c=>!c.retain && !(G.hero==='ganshiren' && c.id==='shi_wang')));
  kept.forEach(c=>c.retain=false);
  G.hand=kept;
  aliveEnemies().forEach(e=>{ if(e.curse>0) e.curse=Math.max(0,e.curse-2); }); // v0.60：诅咒每回合末掉 2 层
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
  // 苦行武僧的「格挡存留最多 3 点」**不在这里**做——必须在敌人攻击消耗完格挡之后（见 enemyAct 末尾），
  // 否则本回合攒的格挡还没挡伤害就先被压成 3（v0.58 修复）。
  if(G.weak>0) G.weak--;
  // 卸甲生元 A 列（赶尸人）：回合结束自动把剩余格挡换算成【尸气】，无论敌人是否攻击
  if(G.endBlockKind==='A' && G.block>0){
    const _bk=G.block; const _q=Math.floor(_bk/2)*(G.xiejiaUp?2:1);
    G.block=0; G.endBlockKind=null; G.xiejiaUp=false;
    if(_q>0){ gainShiqi(_q); log(`卸甲生元：${_bk} 点格挡转为 ${_q} 点【尸气】`); floatMsg(`尸气 +${_q}`); }
  }
  enemyAct();
}
/* 卸甲生元(#23 A/C/D)：敌人攻击全部结算之后，把没被消耗的剩余格挡转为英雄收益。
   A 赶尸人 每 2 格挡→1 尸气；C 阴差 每 1 格挡→1 生命；D 天师 每 2 格挡→1 诅咒（上限 6）。
   只扣掉结算中消耗的 bk 而不整体清零——D 若目标满 6 层，applyCurse 的溢出会当场转回格挡并保留。 */
function resolveEndBlock(){
  if(!G.endBlockKind) return;
  const bk=G.block;
  if(bk>0){
    if(G.endBlockKind==='A'){ const q=Math.floor(bk/2); if(q>0){ gainShiqi(q); log(`卸甲生元：${bk} 点格挡转为 ${q} 点【尸气】`); } }
    else if(G.endBlockKind==='C'){ heal(bk); log(`卸甲生元：${bk} 点格挡转为生命`); }
    else if(G.endBlockKind==='D'){ const cAmt=Math.min(6, Math.floor(bk/2)); if(cAmt>0){ const re=randomAlive(); if(re){ applyCurse(re,cAmt); log(`卸甲生元：${bk} 点格挡转为 ${cAmt} 层【诅咒】`); } } }
  }
  G.block=Math.max(0, G.block-bk);
  G.endBlockKind=null;
}
function enemyAct(){
  const actingEnemies = aliveEnemies().slice();
  for(const e of actingEnemies){
    e.block = e.pingbi||0;
    if(e.affixes){
      const zs=e.affixes.find(a=>a.id==='zaisheng'); if(zs && e.hp>0){ e.hp=Math.min(e.maxHp, e.hp+4*zs.tier); }
      const gt=e.affixes.find(a=>a.id==='gangti'); if(gt) addEnemyStrength(e, gt.tier);
    }
    if(e.seal){ if(e.sealTurn>1){ e.sealTurn--; } else { e.seal=false; e.sealTurn=0; } log(`${e.name} 被镇魂，无法行动`); }
    else switch(e.intent.type){
      case 'attack': { const d=e.intent.v+(e.pendingDamage||0); e.pendingDamage=0; dealDamageToPlayer(d,e); break; }
      // v0.61.01：蓄力只被单体 attack 消费（见 case 'attack'），连击 multi / 群体 aoe 不叠加 —— 用户拍板口径
      case 'charge': e.pendingDamage=(e.pendingDamage||0)+e.intent.v; log(`${e.name} 蓄力（下回合单体攻击 +${e.intent.v}）`); break;
      case 'block': e.block+=e.intent.v; log(`${e.name} 获得 ${e.intent.v} 点格挡`); break;
      case 'heal': e.hp=Math.min(e.maxHp, e.hp+e.intent.v); log(`${e.name} 恢复 ${e.intent.v} 点生命`); break;
      case 'weak': if(!G.debuffImmune){ G.weak=2; floatMsg('你被【虚弱】'); log(`${e.name} 对你施加【虚弱】`); } else log(`佛渡免疫了${e.name}的【虚弱】`); break;
      case 'gouhun': if(!G.debuffImmune){ G.gouhun=1; floatMsg('勾魂'); log(`${e.name} 勾魂：你下回合少抽 1 张`); } else log(`佛渡免疫了${e.name}的【勾魂】`); break;
      case 'strength': { const _sB4=e.strength||0; addEnemyStrength(e, e.intent.v); const _sGot=(e.strength||0)-_sB4; if(_sGot>0) log(`${e.name} 力量 +${_sGot}`); if(e.intent.weak){ if(!G.debuffImmune){ G.weak=2; floatMsg('你被【虚弱】'); log(`${e.name} 暗夜威压：对你施加【虚弱】`); } else log(`佛渡免疫了${e.name}的【暗夜威压】`); } if(e.intent.sealHeal){ const h=(G.wangyouDrunk||0)*8; if(h>0){ e.hp=Math.min(e.maxHp, e.hp+h); log(`${e.name} 汲取你饮下的忘忧汤，回复 ${h} 点生命`); } G.wangyouDrunk=0; } break; }
      // v0.61.01：连击不吃蓄力加值，也不消耗已存的蓄力（用户拍板口径）
      case 'multi': for(let i=0;i<e.intent.n;i++){ if(G.hp<=0) break; dealDamageToPlayer(e.intent.v,e,i*140); } break;
      case 'discard': if(!G.debuffImmune){ G.pendingDiscard++; floatMsg('下回合随机弃 1 张牌'); log(`${e.name} 缠绕你：下回合开始随机弃 1 张牌`); } else log(`佛渡免疫了${e.name}的【缠绕】`); break;
      case 'attackBlock': { dealDamageToPlayer(e.intent.v,e); e.block+=e.intent.block; log(`${e.name} 攻击并格挡 ${e.intent.block}`); break; }
      case 'summon': { const uk=e.intent.unit||'xiaojianshi'; const un=ENEMIES[uk].name; let added=0; for(let i=0;i<e.intent.n;i++){ if(G.enemies.length>=5) break; G.enemies.push(makeEnemy(ENEMIES[uk], uk)); added++; } log(`${e.name} 召唤了 ${added} 只${un}`); break; }
      case 'aoe': { dealDamageToPlayer(e.intent.v,e); if(G.summons.length){ G.summons.shift(); log(`${e.name} 的幽冥之气驱散了一个召唤单位`); } break; }
      case 'burn': if(!G.debuffImmune){ G.burn=(G.burn||0)+e.intent.v; floatMsg(`灼烧 +${e.intent.v}`); log(`${e.name} 对你施加灼烧（每回合 -${e.intent.v*2} 生命，可叠加）`); } else log(`佛渡免疫了${e.name}的【灼烧】`); break;
      case 'jiming': { e.ledgerActive=true; e.ledgerDmg=0; const avail=AFFIXES.filter(a=>!(e.affixes||[]).some(x=>x.id===a.id)); if(avail.length){ const a=avail[Math.floor(rng()*avail.length)]; e.ledgerAffix={id:a.id, tier:1}; log(`${e.name} 记下你的名字，并记下一条罪状【${a.name}】`); } else { e.ledgerAffix=null; log(`${e.name} 记下你的名字（罪状已记满）`); } floatMsg('生死簿 · 记名'); break; }
      case 'qingsuan': { const ledger=e.ledgerDmg||0; const dmg=Math.min(24, Math.floor(ledger*0.3)); if(e.ledgerAffix){ const a=AFFIXES.find(x=>x.id===e.ledgerAffix.id); if(a){ if(!e.affixes) e.affixes=[]; e.affixes.push({id:a.id, tier:1}); if(a.id==='pingbi'){ e.block+=8; e.pingbi=(e.pingbi||0)+8; } log(`${e.name} 清算：【${a.name}】生效——${a.desc}`); } } e.ledgerActive=false; e.ledgerDmg=0; e.ledgerAffix=null; if(dmg>0){ floatMsg('生死簿 · 清算'); const dead=directDamage(dmg, `${e.name} 清算生死簿：反弹 ${dmg} 点伤害`); if(dead) return; /* v0.61 B10：判负已在 directDamage→loseGame 幂等收口，棋盘停格属正常终局，不再续跑其余敌人 */ } else log(`${e.name} 翻开生死簿：无账可清`); break; }
      case 'yehuo': if(!G.debuffImmune){ G.karmaFire=2; floatMsg('业火附体'); log(`${e.name} 业火附体：接下来 2 回合，你对它伤害 -30%，每次造成伤害反噬 1 点生命，它受到的诅咒层数翻倍`); } else log(`佛渡免疫了${e.name}的【业火】`); break;
      case 'wangyou': G.wangyouTurns=2; G.wangyouDrunk=0; floatMsg('忘忧 · 两回合'); log(`${e.name} 奉上忘忧汤：接下来两回合，每回合开始时可选 1 张手牌「饮下」弃置，否则受 8 点真实伤害`); break;
      case 'dormant': log(`${e.name} 在观望`); break;
    }
    // v0.61 C1：一次魅惑 = 削减该敌人「一整次行动」的全部伤害（连击各段、蓄力重击都算），行动结束才消耗 1 层
    if(e.charmUsed){ e.charmUsed=false; e.charm--; if(e.charm<=0){ e.charm=0; e.charmPct=0.5; } }
    if(G.hp<=0){ G.hp=0; loseGame(); return; } // v0.61 B2：死亡先判（与 doPlayCard 尾部一致）
    if(aliveEnemies().length===0){ winFight(); return; }
  }
  if((G.zombieDmg||0)>0){ const jw=G.enemies.find(en=>en.key==='jiangwang' && en.hp>0); if(jw){ const heal=Math.floor(G.zombieDmg/2); jw.hp=Math.min(jw.maxHp, jw.hp+heal); log(`僵王吸食小僵尸的血气，回复 ${heal} 点生命`); } G.zombieDmg=0; }
  if(aliveEnemies().length===0){ winFight(); return; }
  // 苦行武僧：敌人攻击全部结算完（格挡已按需消耗）之后，才算「格挡存留」——未用完的保留最多 3 点。
  // 卸甲生元[#23B]持续期间不清零（改为到期时整体转生命，见下一行）。
  if(G.hero==='wuseng' && !(G.xiejia>0)) G.block = Math.min(3, G.block);
  if(G.xiejia>0){ G.xiejia--; if(G.xiejia===0 && G.block>0){ const h=G.block; G.block=0; G.hp=Math.min(G.maxHp, G.hp+h); sfx('heal'); floatMsg(`卸甲生元 · 格挡化血 +${h}`); log(`卸甲生元：${h} 点格挡转化为生命`); } }
  resolveEndBlock();
  logTurnSummary();
  startTurn();
}

/* ===================== 回合总结 ===================== */
function logTurnSummary(){
  const s=G.turnStats;
  const parts=[];
  if(s.dmgTaken>0||s.blocked>0) parts.push(`你受伤 <b>${s.dmgTaken}</b>${s.blocked>0?`（格挡抵消 ${s.blocked}）`:''}`);
  if(s.dealt>0) parts.push(`对敌造成 ${s.dealt} 点伤害`);
  if(s.kills.length) parts.push(`击败 ${s.kills.join('、')}`);
  G.turnSummary = `第 ${G.turn} 回合结束` + (parts.length ? '：' + parts.join(' · ') : '');
  log(`—— 第 ${G.turn} 回合结束 ${parts.join(' · ')} ——`);
}

/* ===================== 卡牌打出 ===================== */
function playCard(i){
  const c=G.hand[i]; if(!c) return;
  if(c.sealed>0){ floatMsg('【'+c.name+'】被封印'); log('这张牌被忘忧封印，无法打出'); return; }
  const cost=effectiveCost(c);
  if(G.energy<cost){ sfx('error'); floatMsg('符文不足'); shakeCard(i); return; }
  const hpCost = c.hpCost ? c.hpCost(c.up) : 0;
  if(hpCost>0 && G.hp<=hpCost){
    showOverlay(`<h2>⚠ 以命相搏</h2><p>打出【${c.name}】将损失 <b style="color:var(--red)">${hpCost}</b> 生命，<br>你当前只剩 <b style="color:var(--red)">${G.hp}</b> 点，会<b>直接阵亡</b>。</p>
      <button class="btn" onclick="confirmPlayCard(${i})">确定打出</button>
      <button class="btn ghost" onclick="hideOverlay()">取消</button>`);
    return;
  }
  if(c.id==='huofu' && G.hand.length<=1){ sfx('error'); floatMsg('没有可弃的手牌'); shakeCard(i); return; }
  // v0.61 B13：易物在手牌只剩自己时会整段静默跳过（交换界面不出现、白打一张）——改成出牌前拦住
  if(c.id==='yiwu' && G.hand.length<=1){ sfx('error'); floatMsg('没有可交换的手牌'); shakeCard(i); return; }
  if(c.id==='yiwu' && G.drawPile.length===0 && G.discard.length===0){ sfx('error'); floatMsg('牌堆与弃牌堆皆空，无牌可换入'); shakeCard(i); return; }
  doPlayCard(i);
}
function confirmPlayCard(i){ hideOverlay(); doPlayCard(i); }
function doPlayCard(i){
  const c=G.hand[i]; if(!c) return;
  const cost=effectiveCost(c);
  // 记录可回退信息（以防 eff 返回 false 需要回滚）
  const exNow = isOneUse(c);
  const wasSkill = (c.type==='skill');
  const prevSkillsPlayed = G.skillsPlayedThisTurn || 0;
  const prevBuff=G.attackBuff;

  G.energy-=cost; G.hand.splice(i,1);
  if(wasSkill) G.skillsPlayedThisTurn=prevSkillsPlayed+1;

  // 血怒：不再随攻击牌自动消耗；仅卡面“每层+N（上限M）”效果在打出时自行消耗对应层数
  const xuenuBonus = 0;

  G.attackBuff=(c.type==='attack' && hasRelic('zhushabi'))?2:0;
  if(c.type!=='junk'){
    if(exNow){ (G.exhausted=G.exhausted||[]).push(c); log(`【${c.name}】已消耗（本关不再出现，战斗结束后回归牌库）`); }
    else if(c.id==='shi_wang' && G.hero==='ganshiren'){ /* 尸王：召唤物存活期间不进弃牌堆（成功后记 G.shiWangCard） */ }
    else G.discard.push(c);
  }
  sfx('card');
  cardPlayFx(c);
  if(c.type==='attack') heroAnim('attack');
  log(`打出【${c.name}】${c.up?'（升级）':''}`);
  if(G.hero==='tianshi' && c.curseBoostLayer){ G.boostCurse=(G.boostCurse||0)+1; c.curseBoostLayer=0; log('守一强化：此牌本次施加的诅咒额外 +1 层'); }
  // 咒印(#42 B)：咒魂为「本回合内打出的一张攻击牌」附加 100% 吸血
  const __stealPending = !!G.zhouhunSteal;
  if(G.hero==='wuseng' && G.zhouhunSteal && c.type==='attack'){ G.stealWatch=true; G.stealAccum=0; }
  cardPlayWindow=true;
  const effResult = c.eff(c.up, c, xuenuBonus);
  cardPlayWindow=false;
  if(G.stealWatch){
    G.stealWatch=false; const __sh=G.stealAccum||0; G.stealAccum=0; G.zhouhunSteal=0;
    if(__sh>0){ heal(__sh); floatMsg('咒魂吸血 +'+__sh); log(`咒印：吸血回复 ${__sh} 点生命`); }
    else log('咒印：这张攻击牌没有造成伤害');
  }
  // 若 eff 明确返回 false，则视为打出失败，回滚消耗与卡牌状态
  if(effResult===false){
    if(__stealPending) G.zhouhunSteal=1; // 咒印：打出失败不消耗吸血
    // 回退符文
    G.energy += cost;
    // 回退手牌（放回原位）
    G.hand.splice(i,0,c);
    // 回退弃牌/消耗
    if(c.type!=='junk'){
      if(exNow){
        const ei=(G.exhausted||[]).lastIndexOf(c); if(ei>=0) G.exhausted.splice(ei,1);
      } else {
        const di = G.discard.lastIndexOf(c); if(di>=0) G.discard.splice(di,1);
      }
    }
    // 回退技能计数与攻击增益
    if(wasSkill) G.skillsPlayedThisTurn = Math.max(0, prevSkillsPlayed);
    G.attackBuff = prevBuff;
    floatMsg('打出失败'); log(`打出【${c.name}】失败，已回退`);
    render();
    return;
  }
  if(c.type==='junk'){ G.junkPlayedThisTurn=(G.junkPlayedThisTurn||0)+1; }
  // 燃魂(#36)：本回合每打出对应类型的牌（燃魂自身除外），恢复 2 点生命
  if(G.ranhunType && !(G.ranhunSelf && G.ranhunSelf===c)){
    const mt = G.ranhunType==='ghost' ? isGhostCard(c) : (c.type===G.ranhunType);
    if(mt){ const rh=(G.ranhunHeal!=null?G.ranhunHeal:2); G.hp=Math.min(G.maxHp, G.hp+rh); floatMsg('+'+rh+' 生命'); log(`燃魂：打出【${c.name}】，恢复 ${rh} 点生命`); }
  }
  // 尸王(#48)：成功打出后记录卡牌引用，等召唤物消散再回弃牌堆
  if(c.id==='shi_wang' && G.hero==='ganshiren'){ G.shiWangCard=c; }
  if(TUT && TUT.step===1) advanceTut();
  if(c.type==='attack' && hasRelic('shehunling')){ G.hp=Math.min(G.maxHp, G.hp+2); log('摄魂铃：回复 2 点生命'); }
  G.attackBuff=prevBuff;
  if(G.hp<=0){ G.hp=0; loseGame(); return; }   // v0.61 B2：死亡先判 —— 同帧自爆绝杀按判负，不再带 0 血进胜利结算
  if(aliveEnemies().length===0){ winFight(); return; }
  render();
  saveRun();
}

