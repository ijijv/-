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
    pendingEnergy:0, pendingDiscard:0, summons:[], enemies:[], target:0, mapRow:0, mapCol:-1, mapPath:[], rewardPicks:[], // v0.61.20(P2)：mapPath 记走过的 (层,列)，地图连线的「已走」靠它
    gold:0, removeCount:0, shopWares:[], shopMarkup:0, turn:0, battleStartHp:80,
    turnStats:{dmgTaken:0, blocked:0, dealt:0, kills:[]}, turnSummary:'',
    relics:[], skillsPlayedThisTurn:0, attackBuff:0, daoxinUsed:false, pendingRelic:false, relicPicks:[],
    revivedFree:false, goldDoubled:false, lastGold:0, battleGold:0, battleResult:null, openingPicks:[],
    hero:'tianshi', totalHpLost:0, turnAtkBuff:0, dodge:0, debuffImmune:0, xuejiBonus:0, xuejiArmed:false, xuejiHurt:false, discardSelect:null, burn:0, zombieDmg:0, karmaFire:0, duhun:null, xiejia:0, bloodPact:0, retain:0, potions:[], score:0, wangyouTurns:0, wangyouDrunk:0, wangyouPool:null, battleOver:false, dead:false, endless:false, endlessFloor:0, forgeFrom:null, mapSeed:0,
    // 茅山赶尸人专用状态
    尸气:0, maxShiQi:12,
    // 血祭阴差专用状态
    xuenu:0, maxXuenu:10,
    // 符箓天师专用状态
    ybTarget:-1,  // 阴兵过境(天师#47)：🎯阴兵目标 = 你上一次施加诅咒的敌人 uid；-1 表示尚未锁定
    // ===== 全卡重做：新增通用状态 =====
    hpLostTurn:0, blockGainedTurn:0, summonsMadeTurn:0, lastDrawnCards:[],
    retainHeal:0, pendingBlockStart:0, xisuiTurns:0, bleedSummonsBonus:1,
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
/* v0.61.33：删除「点击敌人锁定目标」（原 selectTarget）。目标只由**拖拽落点**决定
   （60_boot.js 的 onDragUp 里写 G.target），点敌人不再改目标、卡面也不再有预伤徽章。
   原因：徽章与敌人高亮都按「上次锁定的那只」算，拖动改指向另一只时数字不跟着变，会显示错的伤害。
   原 selectTarget 兼职的「推进引导第 2 步」改由「把牌拖到敌人身上」触发（见 onDragUp）。 */

/* ===================== 战斗函数 ===================== */
/* 渡魂归己（v0.61.33 改口径）：把「一张牌 / 一次召唤行动」内对敌人造成的**真实总伤害**攒起来一次转化。
   真实伤害 = 走完遗物增伤(桃木剑/铜钱剑)、朱砂笔、开天眼、虚弱、敌人格挡之后真正扣在敌人身上的血量
   （即 dealDamageTo 里的 actual），所以群伤、增益、遗物、格挡、虚弱全部已被计入。
   攒批的理由：群伤/多段（百鬼夜行、尸王全体、多段攻击）逐击 floor 会丢掉零头，
   只有对「总伤害」取整一次，才等于用户要求的「真实总伤害 × 比例」。 */
let DUHUN_ACC=0, DUHUN_BATCH=false;   // DUHUN_ACC=本批累计真实伤害；DUHUN_BATCH=批已开（回合中）
function duhunActive(){ return !!(G.duhun && G.duhun.turns>0); }
function duhunFlush(){
  const acc=DUHUN_ACC; DUHUN_ACC=0;
  if(!duhunActive() || acc<=0) return;
  const h=Math.floor(acc*G.duhun.ratio);
  if(h>0){
    G.hp=Math.min(G.maxHp, G.hp+h);
    playFx('lifesteal', 'player');   // v0.64.0：吸血/渡魂归己（提示词文档 #26 的触发点就是「吸血效果」生效这一下）
    sfx('heal');   // v1.0.12：回血一律带 heal 音（用户口径：每次回血都要有特效+音效；这里是唯一绕过 heal() 的一处）
    floatDamage('+'+h, 'heal', document.querySelector('#player-panel .hpbar'));
    log(`渡魂归己：回复 ${h} 点生命（本批真实伤害 ${acc} × ${Math.round(G.duhun.ratio*100)}%）`);
  }
}
function duhunBatchBegin(){ DUHUN_BATCH=true; DUHUN_ACC=0; }
function duhunBatchEnd(){ DUHUN_BATCH=false; duhunFlush(); }
/* floatDelay：>0 时把「音效 / 飘字 / 受击闪 / 日志」推迟到该毫秒 —— 伤害本体照旧同步结算，
   只有演出错开（多段攻击的连击演出用；敌人 multi 走的是 dealDamageToPlayer，同一套手法）。
   point：true 表示「这是调用方预结算好的 1 点」，跳过按整张牌口径设计的加成/减伤
   （攻击力、桃木剑、钱剑、虚弱、业火），只走逐击反应。见 咒雨·武僧。
   hitNormal：point=true 时默认走极短的 atk_multi_each（那是给 60ms 一发的连击段设计的）；
   置 true 则改用按伤害分级的常规打击音 —— 断刃雷符（单发定值 5 伤）用它，听感与普通雷符一致。 */
function dealDamageTo(e,n,ignoreBlock,floatDelay,point,hitNormal){
  let d=n;
  if(!point){
    d+=(G.attackBuff||0)+(G.turnAtkBuff||0);
    if((e.kind==='ghost'||e.kind==='jiangshi') && hasRelic('taomujian')) d=Math.floor(d*1.25);
    if(e.kind==='yao' && hasRelic('tongqianjian')) d=Math.floor(d*1.25);
    /* 血魔刀[金·阴差]：生命低于最大生命 30% 时，攻击牌伤害 +25%（临界值随最大生命自动联动）。 */
    if(G.hero==='yincha' && hasRelic('xuemodao') && G.hp < G.maxHp*0.3) d=Math.floor(d*1.25);
    /* 太上咒箓[金·天师]：目标身上诅咒满 6 层时，其受到的伤害 +25%。 */
    if(hasRelic('taishangzhou') && (e.curse||0)>=6) d=Math.floor(d*1.25);
    if(G.weak>0 && !ignoreBlock) d=Math.floor(d*0.75);
    if(e.key==='xiuluowang' && (G.karmaFire||0)>0) d=Math.floor(d*0.7);
  }
  let absorbed=0;
  let __hadBlock=0; // v0.61.32：记住打之前有没有格挡，好在「刚好打光」那一击播碎盾
  if(!ignoreBlock && e.block>0){ __hadBlock=e.block; absorbed=Math.min(e.block,d); e.block-=absorbed; d-=absorbed; if(e.pingbi>0) e.pingbi=Math.min(e.pingbi, e.block); }
  if(__hadBlock>0 && e.block<=0) sfx('kw_shield_break');   // 「碎」而不是「挡」：只在被打光的那一下响
  if(e.ledgerActive && d>0) e.ledgerDmg=(e.ledgerDmg||0)+Math.min(d, e.hp); // v0.61 B9：记账含斩杀溢出会让清算反弹系统性虚高 → 按实际可扣血量截断
  const hpBefore=e.hp; const actual=Math.min(d, hpBefore); // 实际扣除血量：d 可能溢出击杀，回血按 actual 而非打出伤害
  if(G.stealWatch){ G.stealAccum=(G.stealAccum||0)+actual; } // 咒印(#42B)：累计这张攻击牌的实际伤害，供 100% 吸血
  e.hp-=d; G.turnStats.dealt+=d; afterEnemyDamaged(e);
  if(duhunActive() && actual>0){ DUHUN_ACC+=actual; if(!DUHUN_BATCH) duhunFlush(); } // v0.61.33：攒批，批外（如敌人自伤类）单发即结
  if(e.affixes && d>0){ const fz=e.affixes.find(a=>a.id==='fanzhen'); if(fz){ const r=3*fz.tier; G.hp=Math.max(0,G.hp-r); G.totalHpLost=(G.totalHpLost||0)+r; G.hpLostTurn=(G.hpLostTurn||0)+r; G.turnStats.dmgTaken+=r; log(`${e.name} 反震：反弹 ${r} 点伤害`); if(G.hero==='yincha' && r>0) gainRage(r); } }
  if(e.key==='xiuluowang' && (G.karmaFire||0)>0 && d>0){ sfx('kw_yehuo'); G.hp=Math.max(0,G.hp-1); G.totalHpLost=(G.totalHpLost||0)+1; G.hpLostTurn=(G.hpLostTurn||0)+1; G.turnStats.dmgTaken+=1; log('业火反噬：你对修罗王造成伤害，损失 1 点生命'); if(G.hero==='yincha') gainRage(1); }
  /* v0.61.25：打击层按「打在什么上 / 打了多少 / 有没有打死」分级；
     point=true 是连击的逐段调用，改用极短的 atk_multi_each（60ms 一发也不糊）。 */
  const __blockedAll=(absorbed>0 && d<=0), __killed=(hpBefore>0 && e.hp<=0);
  const __hk=__blockedAll ? 'hit_guard' : ((point && !hitNormal) ? 'atk_multi_each' : pickHitSfx(actual, false, __killed));
  const __hopt=(__hk==='hit_guard' || __hk==='atk_multi_each') ? null : { rate:sfxDamageRate(actual) };
  const viz=()=>{ sfx(__hk, __hopt);
    const el=document.querySelector('#enemy-panel .enemy[data-uid="'+e.uid+'"]');
    // v0.61.36：大伤害浮字档 —— 与上一行 __hk 用的是同一套判据（blockedAll / point / killed 都对齐音效）
    floatDamage('-'+d, '', el, { crit: !__blockedAll && !point && isCritHit(actual, __killed) });
    HITFX.enemies.add(e);
    if(e.boss) inkBurst(el);
    else if(e.elite) screenMicroShake();
    log(`对 ${e.name} 造成 ${d} 点伤害`);
    /* v0.76.0：受击台词挂在这里 ⇒ 免费继承 floatDelay 的**多段错峰**（多段伤害的第 2、3 段
       浮字本来就隔开出现，台词跟着错峰，不会挤在一起）。
       ⚠️ 打空的这一击**不念受击词**：上面 `afterEnemyDamaged(e)` 那一行先跑，
       `onEnemyDeathCheck` 已经把「被击败」那条排进队了，这里再排一条就成了
       「死后还在挨打」的错序 —— 判据用 `e.hp>0`（扣血的当刻就已经是 0）。 */
    if(e.hp>0) enemySay(e,'hit'); };
  if(floatDelay) setTimeout(viz, floatDelay); else viz();
  return actual;
}
function dealDamageToTarget(n, ignoreBlock){ const e=curEnemy(); if(e) dealDamageTo(e,n,ignoreBlock); }
function dealDamageToAll(n){ aliveEnemies().forEach(e=>dealDamageTo(e,n)); }
/* v1.0.12：**引爆类卡牌的分段演出**（噬魂术这类「按层数一次打光」的牌）。
   ⚠️ 只错开演出（受击音 + multi_slash 特效），**伤害仍是调用方那一次 dealDamageTo** ⇒
      「整张牌口径」的加成（桃木剑 / 攻击加成 / 太上咒箓 / 虚弱）口径逐字不变。
      为什么不照咒雨·武僧那样真拆成 N 次 dealDamageTo：那必须逐点走 point=true，
      会把这批加成整段丢掉（武僧那列每点只有 1 伤，会被 floor 抹成 0，只能那么办）。
   segs：段数（= 引爆的层数）；step：每段间隔 ms；流畅模式下整段跳过。 */
function burstShow(el, segs, step, key){
  if(!el || segs<=1 || typeof SETTINGS==='undefined' || SETTINGS.lowSpec) return;
  for(let i=1;i<segs;i++){
    setTimeout(function(){
      try{ sfx('atk_multi_each'); playFx('multi_slash', el, key?{key:key}:undefined); }catch(e){}
    }, i*(step||90));
  }
}
function isLinghua(e){ return !!(e && e.affixes && e.affixes.some(a=>a.id==='linghua')); }
function applyCurse(e, n){
  if(n>0) sfx('card_curse');   // v0.61.25：施用诅咒的听感（天师整套牌的核心动作）
  if(n>0) tipOnce('curse', '<b>【诅咒】</b>是你在敌人身上累积的印记，本身不掉血 —— 要靠【噬魂术】【钟馗镇魂】【百鬼夜行】这类牌去「引爆」它，才变成伤害。符箓天师整套牌都围着它转。');
  let v=n;
  if(e.key==='xiuluowang' && (G.karmaFire||0)>0) v=v*2;
  // v0.61.35：守一改「减免该牌自身费用」后，旧的「本次施咒 +1 层」不再有生产者，整段退役
  // 计算诅咒溢出
  const currentCurse = e.curse || 0;
  const potentialCurse = currentCurse + v;
  const overflow = Math.max(0, potentialCurse - 6);

  // 设置诅咒上限为6
  e.curse = Math.min(6, potentialCurse);

  // 如果是符箓天师且有溢出，转换为格挡（镇魔印[蓝·天师]：每层溢出转化的格挡值 +1 ⇒ 1 层 = 2 点）
  if(G.hero === 'tianshi' && overflow > 0) {
    const _ob=overflow*relicCurseOverflowBlock();
    gainBlock(_ob);
    log(`诅咒溢出：${overflow} 层诅咒转换为 ${_ob} 点格挡`);
  }
  /* 雷法心诀[紫·天师]：敌人诅咒**达到** 6 层的那一刻，受到 4 点雷击（特效走雷符精灵图）。
     判据是跃迁（<6 → 6）—— 已在 6 层再施咒不会重复触发。
     伤害走 point=true = 不吃增伤/弱化/桃木剑，与「受到伤害为 4 的雷击」的定值口径一致。 */
  if(hasRelic('leifaxinjue') && currentCurse < 6 && e.curse >= 6 && e.hp > 0){
    playFx('lei', enemyEl(e));
    dealDamageTo(e, 4, false, 0, true);
    log(`雷法心诀：${e.name} 诅咒满 6 层，受到 4 点雷击`);
  }

  if(e.curse>=6) unlockAchievement('zuzhou');
  // 追踪本回合实际施加的诅咒层数（符箓天师，用于血祭/金刚符/金光罩等）
  const applied = e.curse - currentCurse;
  if(G.hero==='tianshi'){ CURSE_THIS_TURN = (CURSE_THIS_TURN||0) + Math.max(0, applied); }
  // 阴兵过境(天师#47)：每次对某敌施咒（含溢出尝试）即把下回合阴兵索敌标记🎯切到它
  if(G.hero==='tianshi' && e.hp>0) G.ybTarget=e.uid;
  /* v0.64.0：诅咒精灵图挂在**敌人**身上，且要等 `applied` 算完（放前面会踩 TDZ）。
     key 带 uid —— 全场 AoE（万剑/百鬼/咒雨）会同时给每个敌人施咒，只按名字作键会让后一个顶掉前一个。 */
  if(v>0) playFx('curse', enemyEl(e), { key:'curse@'+e.uid });
  // 返回实际生效的层数（调用方可据此判断是否有变化）
  return applied;
}
/* 攻击牌基础伤害（手牌实时伤害预览用，u=是否升级；zhanyaojian 含诅咒加成） */
const CARD_DMG = {
  /* 手牌伤害预览 = eff 逐列"当前状态"同式抄写。重做前旧值已整体废弃，勿再单独补行。
     仅镜像结算数值，不吃副作用、不实际扣资源；四列顺序：A赶尸人/B武僧/C阴差/D天师。 */
  leifu: (u,e)=>{ const t=e||curEnemy(); if(!t) return 0; let d=(G.hero==='tianshi'?(u?9:6):G.hero==='yincha'?(u?8:4):(u?6:4));
    if(G.hero==='ganshiren') d=(u?7:5)+G.summons.filter(s=>s.dur>0).length;   // v0.61.37 A：4 → 5
    else if(G.hero==='wuseng') d+=Math.min(6,Math.floor((G.block||0)/(u?2:3)));
    else if(G.hero==='yincha') d+=3*Math.min(2,rageLayers()); // eff: 3×rageSpend(3,6) 至多 +6
    else if(t.curse>0) d+=(u?4:3);   // v0.61.35 D：带诅咒加成 +3 → +3/+4
    return d; },
  huofu: (u,e)=>{ const t=e||curEnemy(); if(!t) return 0; let d=G.hero==='tianshi'?(u?10:6):(u?7:5);   // v0.61.35 D：5/8 → 6/10
    if(G.hero==='ganshiren') d=u?7:5;   // v0.61.37 A：8 → 7
    if(G.hero==='wuseng') d+=Math.min(6,Math.floor((G.block||0)/(u?2:3)));
    if(G.hero==='yincha') d=u?10:6; // C 固定 10/6（本回合有格挡也不加），与 eff 一致
    return d; },
  jianfu: (u,e)=>{ const t=e||curEnemy(); if(!t) return 0; let d;
    if(G.hero==='wuseng') d=(u?10:6)+Math.floor(G.block/2); // 耗全部格挡，每2格挡+1
    else if(G.hero==='yincha') d=10+(G.hpLostTurn||0)*(u?2:1); // C 固定 10，本回合每失 1 血 +1/+2
    else if(G.hero==='tianshi'){ d=(u?15:10); if((t.curse||0)>=3) d*=2; }   // v0.61.35 D：9/14 → 10/15
    else { d=(u?14:10); if(hasShiqi(3)) d*=2; }   // v0.61.37 A：13/8 → 14/10，门槛 2 → 3
    return d; },
  zhanyaojian: (u,e)=>{ const t=e||curEnemy(); if(!t) return 0;
    // v0.61.37：base 原与 A/B 共用 —— A 列基础 8 → 7，B 列仍 8，故 A 单独取值
    if(G.hero==='ganshiren') return (u?12:7)+2*G.summons.filter(s=>s.dur>0).length;
    const base=u?12:8;
    if(G.hero==='tianshi'){ const boom=Math.min(2,t.curse||0); return (u?12:10)+boom*(u?7:5); } // v0.61.35 D 主伤 8/12 → 10/12（引爆每层 5/7 不变；base 与 A/B 共用，故 D 另起）
    if(G.hero==='yincha') return (u?14:10)+((t.curse||0)>0?(u?6:4):0); // C：10/14 且带诅咒额外 4/6
    return (t.curse>0)?base+6:base; }, // B：目标带诅咒 +6
  tianlei: (u,e)=>{ if(!(e||curEnemy())) return 0;
    if(G.hero==='wuseng') return u?20:15; // 获得格挡是副效果，不进伤害预览（与 eff 的主伤害一致）
    if(G.hero==='yincha') return (u?21:16)+Math.min(u?26:20,(G.totalHpLost||0)*(u?2:1)); // 近似：未含本牌自扣的5血
    if(G.hero==='tianshi') return u?32:22; // v0.61.35 D：20/30 → 22/32（诅咒仍只减费，不改伤害）
    return u?28:20; },   // v0.61.37 A：24/18 → 28/20
  wanjian: u=>G.hero==='wuseng'?(u?14:9):(G.hero==='tianshi'?(u?18:14):(G.hero==='yincha'?(u?15:10):(u?14:10))),   // v0.61.35 D：14/16 → 14/18；v0.61.37 尾支原与 C 共用 → 拆开，A 升级 15 → 14（C 仍 15/10）
  zhongkui: (u,e)=>{ const t=e||curEnemy(); if(!t) return 0;
    if(G.hero==='tianshi') return 16+(t.curse||0)*(u?4:3); // v0.61.35 D：主伤固定 16（升级不变）+ 每层 3/4（原 15/20 + 5/6）
    if(G.hero==='ganshiren') return u?24:16; // A 固定 16/24（无条件获尸气，不改伤害）
    let d=u?22:16; if(G.hero==='yincha' && G.hp<G.maxHp*0.4) d*=2; // C 残血（<40%）翻倍
    return d; },
  tiebushan: (u,e)=>{ let d=G.block||0;
    if(G.hero==='ganshiren') d+=Math.floor((G.尸气||0)/2)*(u?2:1);
    else if(G.hero==='tianshi'){ const t=e||curEnemy(); if(t) d+=(t.curse||0)*(u?2:1); }
    return d; },
  shihun: (u,e)=>{ const t=e||curEnemy(); if(!t) return 0; // 四列：预览须与 eff 逐列一致
    if(G.hero==='ganshiren') return u?18:14; // 赶尸人：耗4尸气固定伤，不吃诅咒
    if(G.hero==='wuseng') return (t.curse||0)*(u?3:2); // 武僧：每层 2/3 伤害（另按每层获 1/2 格挡）
    if(G.hero==='yincha') return (u?16:10)+(u?3:2)*Math.min(6,rageLayers()); // 阴差：血怒每层+2/+3(至多6层=+12/+18)，打出时消耗
    return (t.curse||0)*(u?6:5); },
  qungui: (u,e)=>{ const t=e||curEnemy();
    if(G.hero==='wuseng') return t?4+G.summons.filter(s=>s.dur>0).length*(u?2:1):0; // B 直伤
    if(G.hero==='tianshi') return t?((u?9:6)+Math.min(u?6:4,t.curse||0)):0;         // v0.61.35 D：5/6 → 6/9
    if(G.hero==='yincha') return 0; // C 无直接伤害（增伤buff），数值以召唤面板为准
    // A：数值=全场召唤"立即作用一次"的总伤害（近似总伤），无召唤时 0→显示"无召唤"
    return G.summons.filter(s=>s.dur>0).reduce((a,s)=>a+s.v+(s.type!=='shi_wang'&&isSummon('shi_wang')?1:0),0); },
  taomufu: (u,e)=>{ const t=e||curEnemy(); if(!t) return 0; let d=G.hero==='tianshi'?(u?7:5):G.hero==='ganshiren'?(u?7:5):(G.hero==='yincha'?(u?7:4):(u?6:4));
    if(t.kind==='ghost'||t.kind==='jiangshi') d+=(u?6:4);
    if(G.hero==='wuseng' && (G.blockGainedTurn||0)>0) d+=2;
    else if(G.hero==='yincha' && t.hp<t.maxHp*0.5) d+=2;
    return d; },
  shixue: (u,e)=>{ const t=e||curEnemy(); if(!t) return 0; let d;
    if(G.hero==='ganshiren') d=(u?7:5)+Math.min(u?7:6,(G.尸气||0));   // v0.61.37 A：每 1 点尸气 +1，上限 6/7
    else if(G.hero==='wuseng') d=(u?6:4)+Math.min(5,Math.floor((G.block||0)/(u?2:3)));
    else if(G.hero==='yincha') d=5+Math.min(u?20:15,Math.floor((G.totalHpLost||0)/(u?3:4)));
    else d=(u?8:6);
    return d; },
  baigui: (u,e)=>{ const n=G.summons.filter(s=>s.dur>0).length;
    if(G.hero==='ganshiren') return (u?6:4)+n*(u?3:2);
    if(G.hero==='wuseng') return (u?6:5)+Math.min(u?11:8,Math.floor((G.block||0)/(u?1:2)));
    if(G.hero==='yincha') return (u?7:5)+n*(u?3:2);
    const t=e||curEnemy(); return t?8+(u?2:1)*(t.curse||0):0; }, // v0.61.35 D 全体主伤 7 → 8（每层 +1/+2 不变）
  shihunzhou: u=>G.hero==='ganshiren'?(u?8:4):(G.hero==='tianshi'?(u?8:3):(G.hero==='yincha'?(u?8:5):(u?7:5))), // v0.61.35 D：3/6 → 3/8（其余三列不动）
  zhiren: u=>{ const base = G.hero==='ganshiren' ? (hasShiqi(4)?(u?7:5):(u?4:2)) : (G.hero==='wuseng'||G.hero==='tianshi'?(u?3:2):(G.hero==='yincha'?(rageLayers()>=3?(u?5:4):(u?2:1)):(u?2:1)));
    const bleed=(G.bleedSummons)?Math.floor((G.hpLostTurn||0)/2):0;
    return base+(isSummon('shi_wang')?1:0)+bleed; }, // 每回合末 v（+尸王在场 / +阴差群鬼流血）
  xiaogui: u=>{ const v=G.hero==='tianshi'?(u?3:2):(G.hero==='ganshiren'?(u?4:2):(G.hero==='yincha'?(u?2:1):(u?3:2)));   // v0.61.35 D：3/4 → 2/3（带诅咒 +2/3 是随机目标的偶发项，不进预览）
    const bleed=(G.bleedSummons)?Math.floor((G.hpLostTurn||0)/2):0;
    return v+(isSummon('shi_wang')?1:0)+bleed; },
  yinbingguo: u=>{ const bleed=(G.bleedSummons)?Math.floor((G.hpLostTurn||0)/2):0;
    return (u?5:4)+(isSummon('shi_wang')?1:0)+bleed; }, // 每只阴兵 v
  zhenyaoling: (u,e)=>{ const t=e||curEnemy(); if(!t) return 0;
    const base = G.hero==='wuseng'?(u?15:10):(G.hero==='tianshi'?(u?15:10):(G.hero==='yincha'?(u?16:10):(u?15:10)));   // v0.61.35 D：10/14 → 10/15；v0.61.37 尾支原与 C 共用 → 拆开，A 升级 16 → 15（C 仍 16/10）
    if(G.hero==='wuseng') return base+(((G.block||0)>=10)?(u?11:8):0); // 格挡 ≥10 → +8/+11
    if(G.hero==='yincha') return base+(u?3:2)*Math.min(6,rageLayers()); // 血怒每层 +2/+3（至多 6 层）
    return base; },
  // v0.61.37：尾支原与 C/D 共用。A 列每层 7/6 → 6/5；C/D 出的是别的效果（咒雨对它们本就不造成伤害），
  //          既有缺陷本批不动、也不弄得更糟，故保持原值走尾支。
  zhouyu: u=>G.hero==='wuseng'?0:(G.hero==='ganshiren'?(G.尸气||0)*(u?6:5):(G.尸气||0)*(u?7:6)),
  shi_wang: ()=>10                // 尸王自身每回合末全体 10（不吃自身 +1）
};
const PER_TURN_SUMMONS = ['zhiren','xiaogui','yinbingguo','shi_wang'];
function previewDamage(c, targetEnemy){
  /* v0.61.33：targetEnemy = 拖拽正指向的那只敌人。传了就用它，没传才回落 curEnemy()（= 当前目标）。
     这样「头顶预伤」永远算的是你真正要打的那只，而不是上次锁定的那只（天师 9/6 错的根因）。 */
  const rawFn = CARD_DMG[c.id];
  if(!rawFn) return null;
  if(c.id==='zhouyu' && (G.hero==='wuseng'||G.hero==='yincha'||G.hero==='tianshi')) return null; // B 格挡转化 / C 只施咒 / D 只施咒，本身都无伤害
  if(c.id==='qungui' && G.hero==='yincha') return null; // C 群鬼乱舞是召唤增伤 buff，本身无直伤（数值看召唤面板）
  const perTurn = PER_TURN_SUMMONS.includes(c.id);
  // 召唤牌目标：阴兵打「诅咒层数最高」的敌人（预览用当前选中目标作参照）
  // v0.61.35 天师：小鬼的目标已从「诅咒最高」改为「随机」，故不再借用 mostCursedEnemy 当参照
  let e = targetEnemy || curEnemy();
  if(perTurn && c.id==='yinbingguo') e = mostCursedEnemy() || e;
  if(!e) return null;
  const raw = rawFn(c.up, e); // v0.61.33：把目标透传给 CARD_DMG 的裸伤函数
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
/* ===================== v0.75.0：防御牌的格挡预览 =====================
   用户要「打出防御牌获得的格挡，在卡牌往上拖拽的时候提前显示出来」⇒ 玩家头顶的蓝色浮字。
   口径与 CARD_DMG 同一个：**镜像 eff 里 gainBlock() 实际会收到的那个数**（逐列"当前状态"同式抄写），
   不吃副作用、不实际加格挡。四列顺序沿用 A赶尸人 / B武僧 / C阴差 / D天师。
   ⚠️ 只覆盖 type==='defense'（用户原话就是"防御牌"）。非防御牌一律 0 ——
      武僧【舍身】4 格挡、【万剑归宗】10/12 格挡都**故意不进**这张表（它们不是防御牌），
      将来要放开就改 previewBlock 的第一行判断，别在这张表里偷偷加行。
   ⚠️ 与 CARD_DMG 一样，这里的数字**必须与 js/20_data.js 的 eff 逐字对齐** ——
      冒烟里那组期望值是照着 eff 的 gainBlock 实参算的，抄错列就会当场红。 */
const CARD_BLOCK = {
  // 金刚符：A 4/7（另给尸气，不加格挡）；B 6/9；C 6/9（另失血）；D 5/7 + 每层诅咒 1/2（上限 +6）
  jingang: u=>{ if(G.hero==='ganshiren') return u?7:4;
    if(G.hero==='wuseng') return u?9:6;
    if(G.hero==='yincha') return u?9:6;
    return (u?7:5)+Math.min(6,(u?2:1)*(CURSE_THIS_TURN||0)); },
  // 隐身符：A 3/6；B 4/6；C 3/7（弃牌数由本回合失血决定，与格挡无关）；D 3/5
  yinshen: u=>G.hero==='ganshiren'?(u?6:3):(G.hero==='wuseng'?(u?6:4):(G.hero==='yincha'?(u?7:3):(u?5:3))),
  // 金光罩：A 9/14（尸气≥2 再 +7/5）；B 14/19；C 11/17（另失血）；D 12/17 + 每层诅咒 1/2
  jinguang: u=>{ if(G.hero==='ganshiren') return (u?14:9)+(hasShiqi(2)?(u?7:5):0);
    if(G.hero==='wuseng') return u?19:14;
    if(G.hero==='yincha') return u?17:11;
    return (u?17:12)+(CURSE_THIS_TURN||0)*(u?2:1); },
  // 金钟罩：A 16/10；C 18/12；B 与 D 同为 17/12（eff 的尾支共用）
  jinzhong: u=>G.hero==='ganshiren'?(u?16:10):(G.hero==='yincha'?(u?18:12):(u?17:12)),
  // 荆棘符：A 6/3；B 7/4；C 6/4；D 6/3（反弹/回血是副效应，不进格挡预览）
  jingji: u=>G.hero==='ganshiren'?(u?6:3):(G.hero==='wuseng'?(u?7:4):(G.hero==='yincha'?(u?6:4):(u?6:3))),
  // 佛渡（消耗）：**只有升级后才给格挡**，且 A 给尸气、C 回血 ⇒ 那两列的升级支也不给格挡
  fodu: u=>{ if(!u) return 0;
    if(G.hero==='ganshiren') return 0;
    if(G.hero==='yincha') return 0;
    return 5; },   // B 与 D 升级后都是 5（eff 的 fb 同式）
  // 铜皮铁骨：A 12/8；B 15/10；C 13/9；D 14/9
  tongpi: u=>G.hero==='ganshiren'?(u?12:8):(G.hero==='wuseng'?(u?15:10):(G.hero==='yincha'?(u?13:9):(u?14:9))),
  // 反震：四列的 eff **都没有 gainBlock**（只挂 thorns / hitCurse / hitRage）⇒ 恒 0，永远不显示
  fanzhen: ()=>0,
  // 卸甲生元：A 7/4；B 8/5；C 8/5（另失 2 血）；D 12/8
  xiejiashengyuan: u=>G.hero==='ganshiren'?(u?7:4):(G.hero==='wuseng'?(u?8:5):(G.hero==='yincha'?(u?8:5):(u?12:8)))
};
/* 拖拽时**算不出来**的格挡加成（要打完才知道），只在这几个 id 上标 dynamic：
   隐身符-天师列的「抽到诅咒牌再 +3/4」——抽牌发生在 eff 里，拖拽时无从得知。
   ⇒ 显示保底值 + .dyn 弱化标记，而不是假装能算准。 */
const DYNAMIC_BLOCK = ['yinshen'];
function previewBlock(c){
  if(!c || c.type!=='defense') return 0;   // 只认防御牌（舍身/万剑归宗不在此列，见 CARD_BLOCK 的头注）
  const fn = CARD_BLOCK[c.id];
  if(!fn) return 0;
  let b;
  try{ b = fn(!!c.up); }catch(e){ return 0; }
  return (typeof b==='number' && isFinite(b) && b>0) ? b : 0;
}
function dealDamageToPlayer(n, attacker, floatDelay, opt){
  // 移形换影(#38)：闪避成功按英雄获得不同奖励
  if(G.dodge>0){
    G.dodge--;
    if(G.dodgeShiqi){ const __dq=G.dodgeShiqi; gainShiqi(__dq); log(`移形换影：闪避了 ${attacker.name} 的攻击，获得 ${__dq} 点【尸气】`); }   // v0.61.37：原先硬编码 1，与卡面/eff 存的 G.dodgeShiqi 断开
    else if(G.dodgeNextBlock){ G.pendingBlockStart=(G.pendingBlockStart||0)+G.dodgeNextBlock; log(`移形换影：闪避了 ${attacker.name} 的攻击（下回合 +${G.dodgeNextBlock} 格挡）`); }
    else if(G.dodgeHealRage){ const __rg=G.dodgeRageGain||1; heal(G.dodgeHealRage); gainRage(__rg); log(`移形换影：闪避了 ${attacker.name} 的攻击，恢复 ${G.dodgeHealRage} 点生命并获得 ${__rg} 层【血怒】`); }
    else if(G.dodgeCurse){ applyCurse(attacker,1); log(`移形换影：闪避了 ${attacker.name} 的攻击，对其施加 1 层【诅咒】`); }
    else { G.dodgeDraw=(G.dodgeDraw||0)+1; log(`移形换影：闪避了 ${attacker.name} 的攻击（下回合多摸 1 张）`); }
    return;
  }
  let d=n+(attacker.strength||0); // v0.61 C2：每点力量 +2 → +1（力量×蓄力×连击的叠乘过高）
  if(attacker.affixes){ const jd=attacker.affixes.find(a=>a.id==='judu'); if(jd){ d+=2*jd.tier; sfx('affix_proc'); } }   // v0.61.32：剧毒是 9 词缀里唯一没有独立音的，走通用词缀音
  // v0.61 C1：魅惑只标记、不按段消耗 —— 否则连击/蓄力重击只有第一段被削减（与关键词「下回合伤害 -50%」不符）
  if(attacker.charm>0){ const cpr=attacker.charmPct!=null?attacker.charmPct:0.5; d=Math.floor(d*cpr); attacker.charmUsed=true; }
  const full=d;
  const absorbed=Math.min(G.block,d); G.block-=absorbed;
  const dealt=d-absorbed;
  let loss=dealt;
  if(G.hp-dealt<=0 && hasRelic('daoxin') && !G.daoxinUsed){ loss=Math.max(0,G.hp-1); G.daoxinUsed=true; log('道心触发：抵挡致命伤，保留 1 点生命'); }
  G.hp-=loss;
  if(loss>0 && G.xuejiArmed) G.xuejiHurt=true;
  /* v0.61.25：连击每段改响 enemy_multi（短促），单次攻击仍响 hurt 但按伤害量变调；
     这一段的伤害被格挡吃光也出声（否则整轮连击全被挡下会一片死寂）。 */
  const doFx=()=>{
    if(opt && opt.multi) sfx('enemy_multi'); else sfx('hurt', { rate:sfxDamageRate(loss) });
    if(loss<=0) return;
    hurtVignette(); heroAnim('hit'); playFx('hurt', 'player');   // v0.64.0：受击精灵图（与红晕/立绘抖动**叠加**，不是替换）
    const bar=document.querySelector('#player-panel .hpbar'); floatDamage('-'+loss, 'to-player', bar);
  };
  if(loss>0 || (opt && opt.multi)){ if(floatDelay) setTimeout(doFx, floatDelay); else doFx(); }
  G.totalHpLost=(G.totalHpLost||0)+loss;
  G.hpLostTurn=(G.hpLostTurn||0)+loss;
  G.turnStats.dmgTaken+=loss; G.turnStats.blocked+=absorbed;
  log(`${attacker.name} 对你造成 ${loss} 点伤害${absorbed>0?`（格挡吸收 ${absorbed}）`:''}`);
  // —— 本回合“受到攻击时”触发（荆棘符/铜皮铁骨/反震/卸甲等），非闪避命中即结算 ——
  if(full>0){
    /* 罗汉拳套[蓝·武僧]：永久自带反伤 1（与临时【荆棘】叠加，走同一条结算）。 */
    const _th=(G.thorns||0)+relicThorns();
    if(_th>0){ sfx('thorns'); attacker.hp-=_th; log(`荆棘/反震：反弹 ${_th} 点伤害给 ${attacker.name}`); afterEnemyDamaged(attacker); }
    if((G.hitHeal||0)>0){ heal(G.hitHeal); log(`荆棘符：受击恢复 ${G.hitHeal} 点生命`); }
    if((G.hitCurse||0)>0){ applyCurse(attacker, G.hitCurse); log(`铜皮/荆棘：对 ${attacker.name} 施加 ${G.hitCurse} 层【诅咒】`); }
    if((G.hitShiqi||0)>0){ gainShiqi(G.hitShiqi); log(`反震：受击获得 ${G.hitShiqi} 点【尸气】`); }
    if((G.hitRage||0)>0){ gainRage(G.hitRage); log(`反震：受击获得 ${G.hitRage} 层【血怒】`); }
    if((G.hitBlock||0)>0){ gainBlock(G.hitBlock); log(`反震：受击获得 ${G.hitBlock} 点格挡`); }
    if((G.nextBlock||0)>0){ G.pendingBlockStart=(G.pendingBlockStart||0)+G.nextBlock; log(`反震：下回合开始额外获得 ${G.nextBlock} 点格挡`); }
  }
  if(attacker.key==='xiaojianshi' && loss>0){ G.zombieDmg=(G.zombieDmg||0)+loss; }
  if(attacker.lifesteal && loss>0){ const hl=Math.floor(loss*attacker.lifesteal); const _cap=Math.floor((attacker.maxHp||attacker.hp)*LIFESTEAL_HEAL_CAP_RATIO); const _lvB4=attacker.hp; attacker.hp=Math.min(attacker.hp+hl, _cap); const _lvGot=Math.round(attacker.hp-_lvB4); if(_lvGot>0){ const _el=enemyEl(attacker); playFx('lifesteal', _el); floatDamage('+'+_lvGot, 'heal', _el?_el.querySelector('.enemyhpbar'):null); } log(`${attacker.name} 吸血：回复 ${hl} 点生命`); }   // v1.0.13：补吸血特效/飘字
  if(attacker.affixes){
    const sx=attacker.affixes.find(a=>a.id==='shixue'); if(sx && loss>0) enemyGainHp(attacker, 3*sx.tier, 'kw_regen', '蚀血：回复');   // v1.0.13：走漏斗（原先裸赋值，无特效/飘字）
    if(attacker.affixes.some(a=>a.id==='gouhun') && !G.debuffImmune){ sfx('kw_gouhun'); G.gouhun=1; log(`${attacker.name} 勾魂（下回合少抽 1 张）`); }   // v0.61.32
    if(attacker.affixes.some(a=>a.id==='feipai')){ addJunkToHand(1); }
  }
}
function afterEnemyDamaged(e){
  if(e.hp<=0){ onEnemyDeathCheck(e); return; }
  /* v0.76.0：濒死档。刻意放在**死亡判定之后** —— 同归于尽的那一击只念「被击败」，
     不该先把「濒死」念一遍（那一击根本没停在濒死上）。 */
  if(e.hp<=e.maxHp*0.3) enemySay(e,'low');
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
  sfx('boss_split');   // v0.61.32：从蹭 relic 改成 Boss 分化专属音
  floatMsg('谢必安 · 分化！');
  log('谢必安血线过半，分化为两个「必安」！');
  /* v0.76.0：中段台词（谢必安说，但**锚在先手那只必安**身上 —— 见 enemySayMid 的注释），
     外加先手必安的出场词。⚠️ **只有先手那只念出场词**：两只都发就是连播两条一模一样的句子。
     这两条都要等下一次 render 才量得到锚点，`pumpSay` 会把它们放回队首等着。 */
  enemySayMid(e, b1);
  enemySay(b1,'in');
}
function onEnemyDeathCheck(e){
  if(e.phase && !e.phase2){ enterPhase2(e); }
  else {
    G.turnStats.kills.push(e.name); G.totalKills=(G.totalKills||0)+1; if(G.totalKills>=100) unlockAchievement('baizhan'); unlockBestiary(e.key);
    e.dying=true; sfx('death');
    /* v0.76.0：被击败档，与 `dying=true` **同刻**发 ⇒ 气泡与 450ms 的消散同窗。
       此刻 DOM 还没重排，`enemyEl(e)` 量得到（阵亡敌人靠 `||e.dying` 留到收尾 render）。 */
    enemySay(e,'out');
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
  sfx('boss_phase2');   // v0.61.25：二阶段专用转场（原来是蹭遗物音）
  floatMsg('轮回 · 第二阶段');
  bossPhaseIntro(e.name||'阎罗天子'); // v0.61.20(P4)：裂印 + 红目的二阶段转场（非阻塞，见该函数注释）
  log('阎罗天子堕入轮回，阴气更盛——进入第二阶段！');
  /* v0.76.0：二阶段中段台词。锚在**自己**身上（它没被换掉，只是换了血条）。 */
  enemySayMid(e);
}
function directDamage(n, msg){
  if(n<=0) return false;
  sfx('atk_true');   // v0.61.25：真实伤害（忘忧拒饮 / 判官王清算）专用听感
  hurtVignette(); floatDamage('-'+n, 'to-player', document.querySelector('#player-panel .hpbar'));
  if(msg) log(msg);
  // 统一走 loseHp：扣血 + totalHpLost + 血契/舍身/阴差血怒联动（避免重复扣血与重复累加 totalHpLost）
  loseHp(n);
  G.turnStats.dmgTaken=(G.turnStats.dmgTaken||0)+n;
  if(G.hp<=0){ G.hp=0; loseGame(); return true; }
  return false;
}
function tickSeals(){ [G.hand, G.drawPile, G.discard].forEach(pile=>pile.forEach(c=>{ if(c.sealed>0) c.sealed--; })); }
function gainBlock(n){
  if(n>0) tipOnce('block', '<b>格挡</b>先替你挨打 —— 敌人打过来时先扣格挡、再扣血。但它在<b>回合结束时清零</b>（苦行武僧除外），所以能挡就这回合挡完。');
  G.block+=n;
  /* v0.61.32：出牌窗口内 = 「防御牌起盾」走 card_defense；窗口外（遗物/武僧被动/反震/五通神）仍是通用 block。
     两键并存，block 没有退役。 */
  /* v0.64.0：格挡精灵图。**同名重播**（不是叠加）—— 五通神每回合 tick、武僧回合格挡会被反复触发，
     若叠加会在玩家身上堆出十几个元素。*/
  if(n>0){ G.blockGainedTurn=(G.blockGainedTurn||0)+n; sfx(cardPlayWindow?'card_defense':'block'); playFx('block', 'player'); floatDamage('+'+n, 'block', document.querySelector('#player-panel .hpbar')); }
}
function heal(n){ if(n>0) playFx('heal', 'player'); G.hp=Math.min(G.maxHp, G.hp+n); sfx('heal'); const bar=document.querySelector('#player-panel .hpbar'); floatDamage('+'+n, 'heal', bar); }
/* 阴阳鱼[蓝·通用]：**受到负面效果**时恢复 2 点生命。
   负面效果 = 虚弱 / 勾魂 / 缠绕 / 灼烧 / 忘忧 / 业火（enemyAct 里对玩家施加 debuff 的六处）。
   统一走 heal() ⇒ 带 heal 特效；本函数由这六处调用，别在别的地方重复调用。 */
function playerDebuffReceived(){ if(hasRelic('yinyangyu')){ heal(2); log('阴阳鱼：受到负面效果，恢复 2 点生命'); } }
/* —— v1.0.13：**敌人回血 / 涨格挡的统一漏斗** ——
   用户口径：「注意每次触发的回血效果都要触发特效（包括遗物的回血效果，比如摄魂铃等）」
             「格挡回血也加上血条边框变成玻璃质感和血条慢慢涨的动画效果」。
   改版前这些点是散在各处的**裸赋值**（case heal / zaisheng 再生 / 僵王吸食 / attackBlock 的格挡余量），
   既不飘字也没有回血特效 ⇒ 手机上完全看不出敌人回了血。这里收口成两个函数，以后新机制只管调它俩。
   血条那一侧不用额外做事：50_ui.js 的 enemyPanelHTML 已经按 ENEMY_HP_PREV 比对，
   这一帧涨了就给 `.enemyhpbar` 挂 `hp-gain`（玻璃描边 + 慢档过渡），走漏斗自然继承。 */
function enemyGainHp(e, n, snd, note){
  if(!e || n<=0 || e.hp<=0) return 0;
  sfx(snd || 'enemy_heal');   // 三处来源各有自己的听感（再生 kw_regen / 常规 enemy_heal / 吸食 enemy_heal）
  const before=e.hp;
  e.hp=Math.min(e.maxHp, e.hp+n);
  const got=Math.round(e.hp-before);
  if(got<=0) return 0;        // 满血时不飘字不特效，但**动作与声音照出**（"它想回血"这件事玩家要看得见）
  const el=enemyEl(e);
  playFx('heal', el);
  floatDamage('+'+got, 'heal', el ? el.querySelector('.enemyhpbar') : null);
  log(note ? `${e.name} ${note} ${got} 点生命` : `${e.name} 恢复 ${got} 点生命`);
  return got;
}
function enemyGainBlock(e, n){
  if(!e || n<=0) return 0;
  e.block=(e.block||0)+n;
  const el=enemyEl(e);
  sfx('enemy_block');
  playFx('block', el);
  floatDamage('+'+n, 'block', el ? el.querySelector('.enemyhpbar') : null);
  log(`${e.name} 获得 ${n} 点格挡`);
  return n;
}
function discardRandomHand(){ if(!G.hand.length) return null; const i=Math.floor(rng()*G.hand.length); const c=G.hand.splice(i,1)[0]; if(c.type!=='junk') G.discard.push(c); sfx('card_discard'); log(`弃掉【${c.name}】`); return c; }   // v0.61.32
function enemyRandomDiscard(){
  if(!G.hand.length){ log('缠绕生效，但你已无手牌可弃'); return; }
  const i=Math.floor(rng()*G.hand.length);
  const c=G.hand.splice(i,1)[0];
  if(c.type!=='junk') G.discard.push(c);
  floatMsg(`被弃掉：${c.name}`); sfx('card_discard');   // v0.61.32：缠绕弃牌从通用 card 改成弃牌专用音
  log(`敌人的缠绕：随机弃掉你的【${c.name}】`);
  render();
}
function showWangyouChoice(){
  // v0.61 B8：快照存「卡对象引用」而非下标 —— 同帧若还有缠绕/业火等 splice 手牌，下标会错位（弃错牌 / undefined.type）
  const pool=G.hand.slice();
  G.wangyouPool=pool;
  const cards=pool.map((c,i)=>`<div class="card has-frame ${RCOLOR[c.rarity]}" onclick="drinkWangyou(${i})">${cardBody(c)}</div>`).join('');
  /* v0.72.0：本文件里共**六处**选牌小窗（忘忧 / 焚符 / 火符 / 易物·选出手牌 / 易物·选入牌 / 守一），
     一律显式传第三实参 'pick-scene' —— 桌面档据此去掉小窗的纯色底、把卡牌放到 1.25 倍。
     为什么必须**显式**传：showOverlay 的 sceneChanged = !!scene && scene !== wasScene 是 .ov-enter
     进场动画的门闩，第三实参同时也是场景类本身 —— 漏传 = 既没有场景类、从别的弹窗进来也不再重播进场。 */
  showOverlay(`<h2>忘 忧 汤</h2><p>孟婆的汤还萦绕在喉头——选择 1 张手牌「饮下」（弃置，进弃牌堆而非封印），或拒绝（受 <b style="color:var(--red)">8 点真实伤害</b>）。</p><div class="reward-cards">${cards}</div><button class="btn ghost" onclick="refuseWangyou()">拒绝 · 受 8 点真实伤害</button>`, undefined, 'pick-scene');
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
  sfx('kw_wangyou');   // v0.61.32：饮下那一刻的听感（「奉汤」是 enemy_debuff，两者不同）
  log(`饮下【${c.name}】——忘忧汤入喉，前尘如烟`);
  hideOverlay(); render();
}
function refuseWangyou(){
  G.wangyouPool=null;
  const dead=directDamage(8, '你拒绝了忘忧汤，孟婆的怒火化作 8 点真实伤害');
  if(dead) return;
  hideOverlay(); render();
}
/* v0.76.0：手牌写入里**唯一一处逐字重复的惯用法**收成一个口子 —— 「弃牌堆里摘掉 → 手牌里加回」。
   焚符×2（:486 手牌不足回退 / :532 放弃）、火符（:552 取消）、易物×2（:574 无手牌兜底 /
   :582 放弃）共 5 处，改之前是同一行代码抄了五遍。
   返回 true = 这张牌确实是从弃牌堆里取回来的（个别调用点用它决定要不要记日志）。
   ⚠️ **只收这一种**，别的「加进手牌」一处都不许并进来，它们语义各不相同：
      · drawCards（:694）     —— 伴随飞牌动画，来源是抽牌堆
      · 尸王（:734）          —— 来源是抽牌堆（filter 摘掉后入手的），不是弃牌堆
      · 易物换入（:632）      —— 来源是候选池，还要在 G.deck 里顶替原对象
      · doPlayCard 失败回退（:1162 `splice(i,0,c)`）—— 是**原位插入**而不是 push，
        并进来会把这张牌挪到手牌末尾，手牌顺序类断言当场红。
   ⚠️ 兜底分支（不在弃牌堆也照样 push）是刻意留的：这个函数的本意就是「牌回手」，
      调用点全都发生在「这张牌已被 doPlayCard 推进弃牌堆」之后，`i<0` 实际不可达。 */
function handReturnFromDiscard(c){
  if(!c) return false;
  const i=G.discard.lastIndexOf(c);
  if(i<0){ G.hand.push(c); return false; }
  G.discard.splice(i,1); G.hand.push(c); return true;
}
function startDiscardSelect(n, srcCard){
  if(G.hand.length < n){
    // 手牌不足，无法弃足 —— 回退焚符（牌回手，不给符文）
    if(srcCard){ handReturnFromDiscard(srcCard); log('手牌不足，【焚符】已回退'); }
    render(); return;
  }
  G.discardSelect={ need:n, picked:[], card:srcCard||null };
  renderDiscardSelect();
}
function renderDiscardSelect(){
  const s=G.discardSelect; if(!s) return;
  const cards=G.hand.map((c,i)=>{
    const sel=s.picked.includes(i);
    return `<div class="card has-frame ${RCOLOR[c.rarity]} ${sel?'selected':''}" onclick="toggleDiscardPick(${i})">${cardBody(c)}${sel?'<div class="card-extra" style="color:var(--green)">✓ 已选</div>':''}</div>`;
  }).join('');
  showOverlay(`<h2>焚 符 · 弃 牌</h2><p style="color:var(--red)">可弃任意张手牌，每弃 1 张触发一次效果（已选 <b>${s.picked.length}</b> 张）</p><div class="reward-cards">${cards}</div>
    <button class="btn" onclick="confirmDiscardSelect()">${s.picked.length>0?`弃掉 ${s.picked.length} 张`:'请选择要弃的牌'}</button>
    <button class="btn ghost" onclick="cancelDiscardSelect()">放弃（焚符回退）</button>`, undefined, 'pick-scene');
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
    else if(G.hero==='wuseng'){ gainBlock(u?5:4); }   // v0.61.36 武僧列：升级 6 → 5
    else if(G.hero==='yincha'){ heal(u?4:3); }
    else { const re=randomAlive(); if(re) applyCurse(re,1); gainBlock(u?3:2); }
  }
  log(`焚符：弃掉 ${nDiscarded} 张手牌`);
  G.discardSelect=null;
  hideOverlay(); render();
}
function cancelDiscardSelect(){
  const s=G.discardSelect; if(!s) return;
  if(s.card){ handReturnFromDiscard(s.card); log('放弃【焚符】，未弃牌、未获得符文'); }
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
  const cards=G.hand.map((c,i)=>`<div class="card has-frame ${RCOLOR[c.rarity]}" onclick="pickHuofuDiscard(${i})">${cardBody(c)}</div>`).join('');
  showOverlay(`<h2>火 符 · 弃 牌</h2><p style="color:var(--red)">挑选 <b>1</b> 张手牌弃掉；若弃掉的是【鬼怪牌】，获得 ${s.up?2:1} 点【尸气】</p><div class="reward-cards">${cards}</div>
    <button class="btn ghost" onclick="cancelHuofuSelect()">取消（不弃牌 · 退符文 · 火符回手）</button>`, undefined, 'pick-scene');
}
function cancelHuofuSelect(){
  const s=G.huofuSelect; if(!s) return;
  // v0.61 B7：伤害尚未结算，取消＝完全回退（与焚符「放弃」同一惯例）
  if(s.card && handReturnFromDiscard(s.card)){ log('放弃【火符】，牌已回手'); }
  if(s.cost>0){ G.energy+=s.cost; log(`火符取消：退回 ${s.cost} 点符文`); }
  G.huofuSelect=null; hideOverlay(); render();
}
function pickHuofuDiscard(i){
  const s=G.huofuSelect; if(!s) return;
  const c=G.hand.splice(i,1)[0]; if(!c){ renderHuofuSelect(); return; }
  if(c.type!=='junk') G.discard.push(c);
  log(`弃掉【${c.name}】`);
  let gain=0;
  if(isGhostCard(c)){ gain=s.up?3:2; gainShiqi(gain); log(`火符：弃掉鬼怪牌，获得 ${gain} 点【尸气】`); }   // v0.61.37 A：1/2 → 2/3
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
    if(srcCard && handReturnFromDiscard(srcCard)){ log('没有可交换的手牌，【易物】已回手'); }
    floatMsg('没有手牌可交换'); render(); return; }
  G.exchange={ times, phase:'pickHand', handIndex:null, pool:null, card:srcCard||null, done:0 };
  renderExchange();
}
function cancelExchangeSelect(){
  const ex=G.exchange; if(!ex) return;
  // 打出后未成交即放弃：把易物牌从弃牌堆取回手牌（与焚符"放弃"一致），不吞牌
  if(ex.card && ex.done===0 && handReturnFromDiscard(ex.card)){ log('放弃【易物】，牌已回手'); }
  G.exchange=null; hideOverlay(); render();
}
function renderExchange(){
  const ex=G.exchange; if(!ex) return;
  if(ex.phase==='pickHand'){
    const cards=G.hand.map((c,i)=>`<div class="card has-frame ${RCOLOR[c.rarity]}" onclick="pickExchangeHand(${i})">${cardBody(c)}</div>`).join('');
    showOverlay(`<h2>易物 · 选一张手牌</h2><p>选择一张要交换出去的手牌（还剩 <b>${ex.times}</b> 次交换）</p><div class="reward-cards">${cards}</div><button class="btn ghost" onclick="cancelExchangeSelect()">放弃继续交易</button>`, undefined, 'pick-scene');
  } else if(ex.phase==='pickNew'){
    const cards=ex.pool.map((c,i)=>`<div class="card has-frame ${RCOLOR[c.rarity]}" onclick="pickExchangeNew(${i})">${cardBody(c)}</div>`).join('');
    showOverlay(`<h2>易物 · 抽牌堆随机三张</h2><p>选一张换入你的手牌</p><div class="reward-cards">${cards}</div><button class="btn ghost" onclick="cancelExchangeSelect()">放弃交换</button>`, undefined, 'pick-scene');
  }
  /* v0.72.0：易物成交动画的开播点。pickExchangeNew 里 `ex.times>0` 那条分支只调
     renderExchange()（**不调 render()**），成交载荷就没人在 render 尾部 flush 了 ⇒ 卡在 pending。
     这里补一次：pending 为空时 flush 直接早退，所以本次唯一调用点（times 恒为 1）走的是
     末尾那条 render() 分支，这行是「万一以后有多次交换」的保险，不是当前路径的一部分。 */
  Anim.flush();
}
function pickExchangeHand(i){
  const ex=G.exchange; if(!ex) return;
  ex.handIndex=i;
  /* v0.76.0：候选池**只从抽牌堆取**（原先是 drawPile+discard 并起来）—— 卡面文案「与抽牌堆交换」
     自 v0.47 起一直是这么写的，实现却一直在翻弃牌堆，本次把实现收到文案这一侧。
     不足 3 张时把弃牌堆洗回抽牌堆，用的是 drawCards（:711）那套**既有范式**，连洗牌动画一起复用。
     洗回放在**这一步**（选完手牌）而不是 startExchangeSelect：真要用牌堆时才洗，
     取消交换就不会白白洗乱一次（cancelExchangeSelect 因此不需要任何撤销逻辑）。
     ⚠️ `slice()` 是**硬要求**：shuffle 是**就地**打乱并返回同一个数组。池只是**乱序展示**用的，
        真牌序一个字节都不能动 —— 少了这层就是「点开易物看一眼，抽牌堆顺序就变了」。
        （原式 `shuffle(all)` 安全是因为 concat 已经产生了新数组，改写成从 G.drawPile 直接取时容易漏。） */
  if(G.drawPile.length<3 && G.discard.length){
    /* ⚠️ 必须是 concat，**不能**照抄 drawCards（:711）那句 `G.drawPile=shuffle(G.discard)` ——
       drawCards 的守卫是 `!G.drawPile.length`（堆已空，直接顶替才等价），这里的守卫是 `<3`，
       抽牌堆里可能还躺着 1~2 张，直接顶替会把它们**丢掉**。 */
    G.drawPile=G.drawPile.concat(shuffle(G.discard)); G.discard=[];
    log('抽牌堆不足，弃牌堆洗回'); animShuffleQueued();
  }
  ex.pool=shuffle(G.drawPile.slice()).slice(0,3);
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
  /* v0.72.0：换出那张牌**成交前的手位**只能在这一拍量 —— 从这里到函数末尾全程没有 render()
     （两条分支分别是 renderExchange 与 render），#hand 还是「打出易物之前」的旧 DOM，
     它的下标就是此刻 G.hand 的下标（旧的 exchange 界面从未重排过手牌）。
     必须量在 splice **之前**：splice 一执行，G.hand 与 #hand 就对不上号了。 */
  const _oldSlot=animRect(animHandElAt(ex.handIndex));
  const old=G.hand.splice(ex.handIndex,1)[0];
  if(old.type!=='junk') G.discard.push(old);
  removeCardFromPiles(c);
  /* v0.61.39：删除 v0.61.10(P11) 的「换入的牌本回合费用 -1」。四份卡池 md / 卡牌特性整合表 /
     数值表 / 卡牌机制数据总表 全都没写过这条（原为采纳外部评审建议后加的料）。
     仍保留副本 + 在 G.deck 里顶替原对象 —— cardById() 返回的是 CARDS 里的共享对象，
     直接改属性会连带改掉同名牌的另外几份；副本顶替同时保住 indexOf 语义
     （消耗牌本关结束要靠 G.deck.indexOf 回牌库）。 */
  const cNew=Object.assign({}, c);
  const _di=G.deck.indexOf(c); if(_di>=0) G.deck[_di]=cNew;
  G.hand.push(cNew);
  ex.done=(ex.done||0)+1; // 已完成一次交换：此后取消不再把易物回退
  /* v0.72.0：成交的「一出一进」动画入队。放在这里而不是末尾那条分支之后 ——
     入队本身必须早于 render（build 里要按身份找换入牌的**落位**，而身份标记得在
     render 写 handCardHTML 之前登记，见 animExchangeQueued 的注释）。 */
  animExchangeQueued(old, cNew, _oldSlot);
  // 易物(#27)：若换出的是特定类型，按英雄给奖
  if(G.hero==='ganshiren' && isGhostCard(old)){ gainShiqi(2); log('易物：换出鬼怪牌，获得 2 点【尸气】'); }   // v0.61.37 A：1 → 2
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
  const cards=G.hand.map((c,i)=>{ const sel=s.picked.includes(i); return `<div class="card has-frame ${RCOLOR[c.rarity]} ${sel?'selected':''}" onclick="toggleRetainPick(${i})">${cardBody(c)}${sel?'<div class="card-extra" style="color:var(--green)">✓ 已选</div>':''}</div>`; }).join('');
  showOverlay(`<h2>守一 · 保留手牌</h2><p>选择最多 <b>${s.need}</b> 张牌保留到下一回合（已选 <b>${s.picked.length}</b> 张），其余弃掉。</p><div class="reward-cards">${cards}</div>
    <button class="btn" onclick="confirmRetainSelect()">确认保留</button>
    <button class="btn ghost" onclick="skipRetainSelect()">不保留 · 全部弃掉</button>`, undefined, 'pick-scene');
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
    // v0.61.35 守一(#26)天师列：保留到【诅咒牌】→ 该牌**自身**下回合费用 -1（仅一回合）
    // 落成 G.turn+1 的时间戳（而不是布尔标记），到期自然失效，不必在任何地方清
    else if(G.hero==='tianshi'){ if(isCanCurse(c)){ c.costCutTurn=G.turn+1; log(`守一：保留【${c.name}】，下回合其费用 -1`); } }
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
    if(!G.drawPile.length){ if(!G.discard.length) break; G.drawPile=shuffle(G.discard); G.discard=[]; log('弃牌堆洗回抽牌堆'); animShuffleQueued(); }
    const c=G.drawPile.pop(); G.hand.push(c); drawn.push(c.name); objs.push(c);
  }
  G.lastDrawnCards=objs;
  /* v0.72.0：抽牌动画的载荷在这里入队 —— objs 就是**本次**抽到的牌，粒度天然正确。
     必须在这个位置：等到了 render 就没法把「本次抽的」和「本来就躺手里的」分开了。
     只入队不出队：动没动画的决定权在 render 尾部的 Anim.flush()（那里手牌终位才量得到），
     而 drawCards 的 11 个调用点里只有一处紧随 render。状态变更（G.hand / G.lastDrawnCards /
     sfx）全部保持同步 —— 冒烟那几处是同步断言的。 */
  animDrawQueued(objs);
  if(drawn.length){ sfx('card_draw'); log(`摸 ${drawn.length} 张：${drawn.join('、')}`); }
}

/* ===================== 回合流程 ===================== */
let CURSE_THIS_TURN = 0; // 本回合施加的诅咒数量

/* —— 战斗开始类遗物（统一入口）——
   为什么单独拎成函数并**在 beginBattle 的 render 之后**调用：
     尸玉/引魂灯/不动明王像都会立刻播特效（playFx('shiqi'|'summon'|'block','player')），
     而 fxAnchorRect('player') 要量 #player-panel —— 一局的第一场战斗打到 beginBattle 之前
     #player-panel 还是空的（上一屏是英雄地图），量到 0×0 会掉进「屏幕中心」兜底。
     beginBattle 里 render() 已在 L807 之后 ⇒ 锚点必然就绪。 */
function applyBattleStartRelics(){
  if(hasRelic('shiyu')){ gainShiqi(3); log('尸玉：战斗开始获得 3 点【尸气】'); }
  if(hasRelic('yinhundeng')){ addSummon({type:'yinbing', v:4, dur:3, healV:2}); log('引魂灯：战斗开始自带一只阴兵'); }
  if(G.hero==='wuseng' && hasRelic('budongmingwang')){ gainBlock(5); G.xiejia=Math.max(G.xiejia||0, 2); floatMsg('不动明王像 · 卸甲'); log('不动明王像：开局触发【卸甲生元】（+5 格挡，卸甲 2 回合）'); }
}
function startBattle(keys){
  SCENE='battle';
  fxStopAll();
  setBg(G.endless?'act3':'act'+G.act);
  G.enemies = keys.map(k=>makeEnemy(ENEMIES[k], k));
  /* v0.61.31：Boss/精英轨必须**在这一行之后**判定 —— G.enemies 到上一行才存在，
     原来 setBGM('battle') 写在建敌人之前，那一刻 e.boss / e.elite 都还没生成，判不出来。 */
  setBGM(battleBgmFor(G.enemies));
  G.enemies.forEach((e,i)=>{ if(e.intents.length>1) e.intentIndex = i % e.intents.length; });
  G.target=0;
  G.battleOver=false; // v0.61 B4：每场开打重置终局旗标
  G._settlePlayed=false; // v0.76.0：结算墨色过场的一次性标记，随战斗一起重置（见 settleTransition）
  G.ybTarget=-1; // 阴兵索敌标记：本场战斗从头锁（-1=无目标，落到带诅咒随机）
  PLAYER_HP_PREV=null; ENEMY_HP_PREV={};
  G.block=0; G.weak=0; G.gouhun=0; G.thorns=0; G.pendingEnergy=0; G.pendingDiscard=0; G.summons=[];
  G.turn=0; G.turnSummary=''; G.daoxinUsed=false; G.skillsPlayedThisTurn=0; G.attackBuff=0; G.totalHpLost=0; G.dodge=0; G.dodgeDraw=0; G.debuffImmune=0; G.xuejiBonus=0; G.xuejiArmed=false; G.xuejiHurt=false; G.burn=0; G.zombieDmg=0; G.karmaFire=0; G.duhun=null; G.xiejia=0; G.zhouyuA=false; G.尸气=0; G.exhausted=[];
  G.xisuiTurns=0; // v0.61.33：洗髓经是「本场战斗内接下来 N 回合」的增益，原来此处漏重置 → 上一关末尾打出会漏到下一关开头
  G.deck.forEach(c=>c.sealed=0);
  /* 招魂幡[白] 本次改造：从「开战 +3」改为「战后额外恢复 4」—— 已挪到 40_flow.winFight，
     以免与「战斗开始类遗物」的语义打架（开战回血会让 battleStartHp 虚高，污染「本场耗血」统计）。 */
  G.battleStartHp=G.hp;
  log(`—— 遭遇 ${G.enemies.map(e=>e.name).join('、')} ——`);
  const beginBattle=()=>{
    resetDeck();
    // 尸王（赶尸人）：每关开始必然在手牌。洗牌后把它从抽牌堆取回手牌（本关若还没打出召唤，牌在循环里）
    if(G.hero==='ganshiren'){
      const _sw = G.drawPile.find(c=>c.id==='shi_wang');
      if(_sw){ G.drawPile = G.drawPile.filter(c=>c!==_sw); G.hand.push(_sw); log('【尸王】已在手牌，随时可召唤'); }
    }
    /* v0.69.0：startTurn 之前先 render 一次。startTurn 里玩家侧的 gainBlock/heal
       （见本文件 :390/:392 的 playFx('block'|'heal','player')）跑在它自己的 render 之前，
       而本函数此前**通篇没有 render** —— 一局的第一场战斗打到这儿时 #player-panel 还是空的
       （上一屏是英雄选择/地图），fxAnchorRect('player') 量到 0×0 ⇒ 掉进「屏幕中心」兜底
       ⇒ 玩家在**屏幕正中**看到一个 96px 的小特效，而不是贴在自己身上。
       G.enemies 到这里已经就绪，render 幂等无害；这也顺带成为两个牌堆计数徽章的首次填充点。 */
    if(typeof render==='function') render();
    applyBattleStartRelics();
    /* v0.76.0：出场台词在 **render 之后**发 —— 气泡锚在 `.enemy` 的 rect 上，
       DOM 没建出来就量不到。全发一遍不会多出气泡：`sayPick` 对普通敌人返 null
       （连 `_said` 都还没建）。
       ⚠️ Boss 战这条路径在 `bossIntro` 的回调里 ⇒ 气泡出现在**印章退场之后**，次序是对的。
       ⚠️ `bindSaySkip()` 幂等，放这儿只为「用到才挂」，不给启动期添副作用。 */
    G.enemies.forEach(e=>enemySay(e,'in'));
    bindSaySkip();
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
  G.junkPlayedThisTurn=0; G.ranhunType=null; G.ranhunSelf=null; G.ranhunHeal=0; G.shouyiUp=false;
  G.zhouhunSteal=0; G.stealWatch=false; G.stealAccum=0; // 咒印：吸血只在本回合内有效
  DUHUN_ACC=0; DUHUN_BATCH=false; // v0.61.33：渡魂攒批兜底清零（正常应在上一批收尾时已 flush）
  G.thorns=0; G.hitHeal=0; G.hitCurse=0; G.hitShiqi=0; G.hitRage=0; G.hitBlock=0; G.nextBlock=0;
  G.dodgeShiqi=0; G.dodgeNextBlock=0; G.dodgeHealRage=0; G.dodgeRageGain=0; G.dodgeCurse=0;
  G.bleedSummons=false; G.bleedSummonsBonus=1;
  // tempCostCut 到期清理：易物已不再发这个标记（v0.61.39 删除），现在只剩
  // 万剑归宗 A 列（20_data.js 击败敌人后抽到的牌 -1/-2 费）在用，故保留。
  // 手里、抽牌堆、弃牌堆、牌库都扫一遍（牌可能已被弃掉，只在手牌上清会漏，下回合再抽回来就白赚一次减费）。
  [G.hand,G.drawPile,G.discard,G.deck].forEach(p=>(p||[]).forEach(c=>{ if(c&&c.tempCostCut) delete c.tempCostCut; }));
  /* v0.61.32：灼烧跳伤（旱魃招牌，每层 -2/回合） */
  if(G.burn>0){ sfx('kw_burn'); const bd=G.burn*2; G.hp=Math.max(0,G.hp-bd); G.turnStats.dmgTaken+=bd; log(`灼烧：失去 ${bd} 点生命（${G.burn} 层）`); if(G.hp<=0){ G.hp=0; loseGame(); return; } }
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
    if(G.hero==='ganshiren'){ const __sq=G.xisuiShiqi||1; gainShiqi(__sq); log(`洗髓经：获得 ${__sq} 点【尸气】与 1 点符文`); }   // v0.61.37 A：尸气 1 → 1/2
    else if(G.hero==='wuseng'){ gainBlock(2); log('洗髓经：获得 2 点格挡与 1 点符文'); }
    else if(G.hero==='yincha'){ loseHp(2); log('洗髓经：失去 2 点生命，获得 1 点符文'); }
    else { const re=randomAlive(); if(re) applyCurse(re,1); log('洗髓经：对随机敌人施加 1 层【诅咒】并获 1 点符文'); }
  }
  // 茅山赶尸人：每回合开始时，场上每有 1 个存活召唤单位，获得 1 点【尸气】
  if(G.hero==='ganshiren'){
    const summonCount = G.summons.filter(s=>s.dur>0).length;
    if(summonCount > 0) {
      G.尸气 = Math.min(relicMaxShiqi(), G.尸气 + summonCount);
      log(`养尸为用：获得 ${summonCount} 点【尸气】（当前 ${G.尸气}/${relicMaxShiqi()}）`);
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
  if(hasRelic('tongling') && G.turn===1){ n+=2; log('铜铃：战斗开始额外抽 2 张'); }   // 铜铃[白]：只在第 1 回合（= 战斗开始）多抽
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
  duhunBatchBegin(); // v0.61.33：一次召唤行动算一批（尸王打全体也只取整一次）
  // 尸王在场：其他召唤单位伤害 +1
  const shiWangBonus = (s.type!=='shi_wang' && G.summons.some(x=>x.type==='shi_wang' && x.dur>0)) ? 1 : 0;
  // 群鬼乱舞(#9) C 阴差：本回合每失去 2 点生命，召唤单位伤害 +1
  const bleedBonus = G.bleedSummons ? Math.floor((G.hpLostTurn||0)/2)*(G.bleedSummonsBonus||1) : 0;
  const v = s.v + shiWangBonus + bleedBonus;
  if(s.type==='zhiren'){
    if(G.hero==='tianshi'){
      // v0.61.35 天师 #41D：每回合末对随机敌人造成伤害 **并施加 1/2 层【诅咒】**
      // （去掉旧「该敌带诅咒则 +2/3 伤害」；这是全牌池里唯一「无条件可施咒」的召唤物，故计入 isCanCurse）
      const t=randomAlive();
      if(t){ dealDamageTo(t, v); applyCurse(t, s.up?2:1); }
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
    // v0.61.35 天师 #43D：目标由「诅咒最高」改为**随机**；命中带【诅咒】的目标则本击 +2/3
    const t = randomAlive();
    if(t){
      const zb=(G.hero==='tianshi' && (t.curse||0)>0)?(s.up?3:2):0;
      dealDamageTo(t, v + zb);
      if(zb>0) log(`小鬼：目标带【诅咒】，伤害 +${zb}`);
    }
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
  duhunBatchEnd(); // v0.61.33：批收尾→按本批真实总伤害回复一次
}
/* 召唤单位消散时的结算（#41/#43/#47/#48） */
function onSummonDeath(s){
  /* 骨铃[紫·赶尸人]：每个召唤单位死亡时，恢复等于其「费用」的生命（回血一律走 heal ⇒ 吸血特效）。
     刻意放在最前面 —— 死亡结算先于敌人攻击，回血也应在同一拍发生（与 md 口径一致）。 */
  if(hasRelic('guling')){ const _sc=SUMMON_COST[s.type]; if(_sc && _sc.c>0){ heal(_sc.c); log(`骨铃：${_sc.n}消散，恢复 ${_sc.c} 点生命`); } }
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
  for(const s of G.summons.slice()){
    if(s.dur<=0) continue;
    /* v0.61.39：五通神此前被 summonAct 的 type 白名单挡掉，附灵术/群鬼乱舞永远触发不到它。
       decay===false 时才补触发（decay===true 是回合末，五通神的寿命归 startTurn 管，
       再走一次会变成一回合扣两次寿命）。noDecay=true → 只结算效果、不扣 dur。 */
    if(s.type==='wutong'){ if(!decay) wutongTick(s,true); }
    else summonAct(s);
  }
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
  /* v0.72.0：弃牌动画要的是「这一拍新进弃牌堆的那几张」。
     用**事后 slice** 而不是把这行拆开 —— 这行的语义被完整钉住（冒烟 8 处 finishEndTurn
     的同步断言都压在它下游），拆成两行虽等价，但任何 diff 都会把它标红；slice 零侵入。 */
  const _d0=G.discard.length;
  /* v0.75.0：`&& !c.oneShot` —— 万剑归宗的 0 费副本**没打出去也不进弃牌堆**，
     留在手里而 kept 不含它 ⇒ 末尾 G.hand=kept 直接把它丢掉，这才是「一次性」的落点。
     只加条件、**不拆这一行**（理由见上一条注释）。 */
  G.discard=G.discard.concat(G.hand.filter(c=>!c.retain && !(G.hero==='ganshiren' && c.id==='shi_wang') && !c.oneShot));
  /* v0.69.0：弃牌堆徽章在这里刷一次。本函数接下来是 triggerSummons → enemyAct，
     **全程没有 render()**（要等下一次 startTurn 才渲染），徽章会整整滞后一段敌人行动；
     而「这回合弃了多少张」正是玩家此刻最想看的数。
     只刷徽章、**不调 render()** —— render 会连手牌一起重排，把弃牌动作的视觉反馈抹掉。 */
  refreshPileCounts();
  /* v0.72.0：弃牌动画。放在 refreshPileCounts() **之后** ⇒「牌飞进弃牌堆」与「徽章 +1」同一拍。
     它自己会同步量手位（此刻 #hand 还是弃牌前的 DOM —— 再往后就没有量得到的机会了），
     所以是 Anim.play 而不是入队等 render，理由见 00_base.js 里 animDiscardQueued 的注释。 */
  animDiscardQueued(G.discard.slice(_d0));
  kept.forEach(c=>c.retain=false);
  G.hand=kept;
  aliveEnemies().forEach(e=>{ if(e.curse>0) e.curse=Math.max(0,e.curse-2); }); // v0.60：诅咒每回合末掉 2 层
  triggerSummons(true);
  // 血祭(#35)：本回合按英雄口径累计（召唤/格挡/失血/诅咒），下回合多摸（上限 +4）
  if(G.xuejiArmed){
    let cnt=0;
    if(G.hero==='ganshiren') cnt=G.summonsMadeTurn||0;
    else if(G.hero==='wuseng') cnt=Math.floor((G.blockGainedTurn||0)/5);
    else if(G.hero==='yincha') cnt=Math.floor((G.hpLostTurn||0)/4);   // v0.61.39 阴差列：每失 4 点（原每失 2 点）
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
    else if(G.endBlockKind==='C'){ const __hc=G.xiejiaHealCap||99; const __hb2=Math.min(__hc,bk); heal(__hb2); log(`卸甲生元：${bk} 点格挡转为 ${__hb2} 点生命（上限 ${__hc}）`); }
    /* v0.68.1：D 列两处修正（用户报「诅咒满了并不会转回护盾」）——
       ① 旧写法 `Math.min(6, Math.floor(bk/2))` 把**要转化的层数先裁到 6** 才递给 applyCurse：
          24 格挡只递 6 层进去，剩下 18 格挡既没变成诅咒、也没回成格挡，凭空蒸发。
          上限 6 该由 applyCurse 去卡 —— 只有让它看见真实的层数，超出部分才会走它的溢出分支
          转回格挡，这正是卡面写的「敌人满 6 层时溢出部分会转回格挡」。
       ② 转回来的那笔格挡**活不过下一行**：本函数紧跟着就是 startTurn，而 startTurn 里
          「非武僧格挡清零」会把刚发的格挡抹掉 —— 玩家浮字看到 +N 格挡，下回合一点用不上。
          改投 pendingBlockStart（移形换影 / 反震 用的就是这条「上回合结转」通道），
          下一回合开始再发回来，格挡才真的能挡刀。两处缺一不可。 */
    else if(G.endBlockKind==='D'){
      const want=Math.floor(bk/2);
      const __before=G.block;
      if(want>0){ const re=randomAlive(); if(re){ applyCurse(re,want); log(`卸甲生元：${bk} 点格挡转为 ${want} 层【诅咒】`); } }
      const back=Math.max(0, G.block-__before);   // applyCurse 溢出分支当场 gainBlock 回来的那份
      if(back>0){ G.block=__before; G.pendingBlockStart=(G.pendingBlockStart||0)+back;
        log(`卸甲生元：诅咒溢出 ${back} 层转回格挡（下回合开始生效）`); }
    }
  }
  G.block=Math.max(0, G.block-bk);
  G.endBlockKind=null; G.xiejiaHealCap=0;
}
function enemyAct(){
  /* v1.0.12：**敌人按屏幕从左到右依次行动**（用户口径）。
     #enemy-panel 是 flex-direction:row-reverse ⇒ 屏幕左→右 = G.enemies 逆序 ⇒ 这里 reverse() 一次。
     ⚠️ 只反转「行动顺序」，**伤害本体仍同步结算**（没有把 enemyAct 改成异步，也没用 setTimeout 拆回合）——
        错峰的只有出手动作（enemyAttackAnim 的 --atk-delay）与随之的飘字节拍，
        所以「血量在同一拍掉完」这条既有事实不变，存档/闸门都不受影响。 */
  const ATK_STEP=260;
  const actingEnemies = aliveEnemies().slice().reverse();
  let atkIdx=0;
  for(const e of actingEnemies){
    const __atkDly=(atkIdx++)*ATK_STEP;
    e.block = e.pingbi||0;
    if(e.affixes){
      const zs=e.affixes.find(a=>a.id==='zaisheng');
      if(zs && e.hp>0){ enemyActAnim(e,'mend',__atkDly); enemyGainHp(e, 4*zs.tier, 'kw_regen'); }   // v1.0.13：原先裸赋值，看不出回血
      const gt=e.affixes.find(a=>a.id==='gangti'); if(gt) addEnemyStrength(e, gt.tier);
    }
    if(e.seal){ if(e.sealTurn>1){ e.sealTurn--; } else { e.seal=false; e.sealTurn=0; } log(`${e.name} 被镇魂，无法行动`); }
    else switch(e.intent.type){
      case 'attack': { sfx('enemy_attack'); enemyAttackAnim(e,1,__atkDly); const d=e.intent.v+(e.pendingDamage||0); e.pendingDamage=0; dealDamageToPlayer(d,e); break; }
      // v0.61.01：蓄力只被单体 attack 消费（见 case 'attack'），连击 multi / 群体 aoe 不叠加 —— 用户拍板口径
      case 'charge': sfx('enemy_charge'); enemyActAnim(e,'gather',__atkDly); playFx('charge', enemyEl(e)); e.pendingDamage=(e.pendingDamage||0)+e.intent.v; log(`${e.name} 蓄力（下回合单体攻击 +${e.intent.v}）`); break;
      case 'block': enemyActAnim(e,'guard',__atkDly); enemyGainBlock(e, e.intent.v); break;   // v1.0.13：动作 + 特效/飘字/慢涨血条
      case 'heal': enemyActAnim(e,'mend',__atkDly); enemyGainHp(e, e.intent.v); break;       // v1.0.13：同上（原先裸赋值）
      /* v0.61.32：虚弱从通用 enemy_debuff 拆出（狐妖/判官） */
      case 'weak': enemyActAnim(e,'cast',__atkDly); sfx('kw_weak'); if(!G.debuffImmune){ G.weak=2; playFx('weak', 'player'); floatMsg('你被【虚弱】'); log(`${e.name} 对你施加【虚弱】`); playerDebuffReceived(); } else log(`佛渡免疫了${e.name}的【虚弱】`); break;
      /* v0.61.32：勾魂从通用 enemy_debuff 拆出（白无常/拘魂使/阎罗） */
      case 'gouhun': enemyActAnim(e,'cast',__atkDly); sfx('kw_gouhun'); if(!G.debuffImmune){ G.gouhun=1; playFx('gouhun', 'player'); floatMsg('勾魂'); log(`${e.name} 勾魂：你下回合少抽 1 张`); playerDebuffReceived(); } else log(`佛渡免疫了${e.name}的【勾魂】`); break;
      case 'strength': { enemyActAnim(e,'cast',__atkDly); sfx('enemy_strength'); const _sB4=e.strength||0; addEnemyStrength(e, e.intent.v); const _sGot=(e.strength||0)-_sB4; if(_sGot>0) log(`${e.name} 力量 +${_sGot}`); if(e.intent.weak){ sfx('kw_weak'); if(!G.debuffImmune){ G.weak=2; floatMsg('你被【虚弱】'); log(`${e.name} 暗夜威压：对你施加【虚弱】`); playerDebuffReceived(); } else log(`佛渡免疫了${e.name}的【暗夜威压】`); } if(e.intent.sealHeal){ const h=(G.wangyouDrunk||0)*8; if(h>0) enemyGainHp(e, h, 'enemy_heal', '汲取你饮下的忘忧汤，回复'); G.wangyouDrunk=0; } break; }
      // v0.61.01：连击不吃蓄力加值，也不消耗已存的蓄力（用户拍板口径）
      // v1.0.12：出手动作按**段**重播（n 段 = 抽动 n 下），并接上「依次行动」的屏序错峰
      case 'multi': { enemyAttackAnim(e,e.intent.n||1,__atkDly); for(let i=0;i<e.intent.n;i++){ if(G.hp<=0) break; dealDamageToPlayer(e.intent.v,e,i*140,{multi:true}); } break; }
      case 'discard': enemyActAnim(e,'cast',__atkDly); sfx('enemy_debuff'); if(!G.debuffImmune){ G.pendingDiscard++; floatMsg('下回合随机弃 1 张牌'); log(`${e.name} 缠绕你：下回合开始随机弃 1 张牌`); playerDebuffReceived(); } else log(`佛渡免疫了${e.name}的【缠绕】`); break;
      case 'attackBlock': { sfx('enemy_attack'); enemyAttackAnim(e,1,__atkDly); dealDamageToPlayer(e.intent.v,e); if(e.intent.block>0) enemyGainBlock(e, e.intent.block); break; }   // v1.0.13：格挡余量走漏斗（原先裸赋值，无飘字/特效）
      case 'summon': { enemyActAnim(e,'call',__atkDly); sfx('enemy_summon'); const uk=e.intent.unit||'xiaojianshi'; const un=ENEMIES[uk].name; playFx('jiangshi', enemyEl(e)); let added=0; /* v1.0.9：上限判据改用**存活**数 —— 敌人阵亡只置 dying 标记、从不从 G.enemies 移除，
                   旧判据 `G.enemies.length>=5` 会被尸体占满 ⇒ 几轮后僵王再也召不出小僵尸（招牌机制哑火）。 */
                 for(let i=0;i<e.intent.n;i++){ if(aliveEnemies().length>=5) break; G.enemies.push(makeEnemy(ENEMIES[uk], uk)); added++; } log(`${e.name} 召唤了 ${added} 只${un}`); break; }
      case 'aoe': { enemyAttackAnim(e,1,__atkDly); dealDamageToPlayer(e.intent.v,e); if(G.summons.length){ G.summons.shift(); log(`${e.name} 的幽冥之气驱散了一个召唤单位`); } break; }
      case 'burn': enemyActAnim(e,'cast',__atkDly); sfx('enemy_debuff'); if(!G.debuffImmune){ G.burn=(G.burn||0)+e.intent.v; playFx('burn', 'player'); floatMsg(`灼烧 +${e.intent.v}`); log(`${e.name} 对你施加灼烧（每回合 -${e.intent.v*2} 生命，可叠加）`); playerDebuffReceived(); } else log(`佛渡免疫了${e.name}的【灼烧】`); break;
      /* v0.61.32：生死簿记账（原先整段静默） */
      case 'jiming': { enemyActAnim(e,'rite',__atkDly); sfx('boss_ledger'); e.ledgerActive=true; e.ledgerDmg=0; const avail=AFFIXES.filter(a=>!(e.affixes||[]).some(x=>x.id===a.id)); if(avail.length){ const a=avail[Math.floor(rng()*avail.length)]; e.ledgerAffix={id:a.id, tier:1}; log(`${e.name} 记下你的名字，并记下一条罪状【${a.name}】`); } else { e.ledgerAffix=null; log(`${e.name} 记下你的名字（罪状已记满）`); } floatMsg('生死簿 · 记名'); break; }
      case 'qingsuan': { enemyActAnim(e,'rite',__atkDly); sfx('enemy_qingsuan'); const ledger=e.ledgerDmg||0; const dmg=Math.min(24, Math.floor(ledger*0.3)); if(e.ledgerAffix){ const a=AFFIXES.find(x=>x.id===e.ledgerAffix.id); if(a){ if(!e.affixes) e.affixes=[]; e.affixes.push({id:a.id, tier:1}); if(a.id==='pingbi'){ e.pingbi=(e.pingbi||0)+8; enemyGainBlock(e, 8); } log(`${e.name} 清算：【${a.name}】生效——${a.desc}`); } } e.ledgerActive=false; e.ledgerDmg=0; e.ledgerAffix=null; if(dmg>0){ floatMsg('生死簿 · 清算'); const dead=directDamage(dmg, `${e.name} 清算生死簿：反弹 ${dmg} 点伤害`); if(dead) return; /* v0.61 B10：判负已在 directDamage→loseGame 幂等收口，棋盘停格属正常终局，不再续跑其余敌人 */ } else log(`${e.name} 翻开生死簿：无账可清`); break; }
      /* v0.61.32：业火附体是修罗王招牌机制，从通用 buff 拆出 */
      case 'yehuo': enemyActAnim(e,'cast',__atkDly); sfx('boss_yehuo'); if(!G.debuffImmune){ G.karmaFire=2; playFx('yehuo', 'player'); floatMsg('业火附体'); log(`${e.name} 业火附体：接下来 2 回合，你对它伤害 -30%，每次造成伤害反噬 1 点生命，它受到的诅咒层数翻倍`); playerDebuffReceived(); } else log(`佛渡免疫了${e.name}的【业火】`); break;
      case 'wangyou': enemyActAnim(e,'cast',__atkDly); sfx('enemy_debuff'); G.wangyouTurns=2; G.wangyouDrunk=0; playFx('wangyou', 'player'); floatMsg('忘忧 · 两回合'); log(`${e.name} 奉上忘忧汤：接下来两回合，每回合开始时可选 1 张手牌「饮下」弃置，否则受 8 点真实伤害`); playerDebuffReceived(); break;
      case 'dormant': sfx('enemy_dormant'); log(`${e.name} 在观望`); break;
    }
    // v0.61 C1：一次魅惑 = 削减该敌人「一整次行动」的全部伤害（连击各段、蓄力重击都算），行动结束才消耗 1 层
    if(e.charmUsed){ e.charmUsed=false; e.charm--; if(e.charm<=0){ e.charm=0; e.charmPct=0.5; } }
    if(G.hp<=0){ G.hp=0; loseGame(); return; } // v0.61 B2：死亡先判（与 doPlayCard 尾部一致）
    if(aliveEnemies().length===0){ winFight(); return; }
  }
  if((G.zombieDmg||0)>0){ const jw=G.enemies.find(en=>en.key==='jiangwang' && en.hp>0); if(jw){ const heal=Math.floor(G.zombieDmg/2); enemyActAnim(jw,'mend',0); enemyGainHp(jw, heal, 'enemy_heal', '吸食小僵尸的血气，回复'); } G.zombieDmg=0; }   // v1.0.13：走上漏斗（原先裸赋值，无动作/特效/飘字）
  if(aliveEnemies().length===0){ winFight(); return; }
  // 苦行武僧：敌人攻击全部结算完（格挡已按需消耗）之后，才算「格挡存留」——未用完的保留（上限 3，金刚经残页[紫·武僧]升到 6）。
  // 卸甲生元[#23B]持续期间不清零（改为到期时整体转生命，见下一行）。
  if(G.hero==='wuseng' && !(G.xiejia>0)) G.block = Math.min(relicBlockKeep(), G.block);
  if(G.xiejia>0){ G.xiejia--; if(G.xiejia===0 && G.block>0){ const h=G.block; G.block=0; heal(h); floatMsg(`卸甲生元 · 格挡化血 +${h}`); log(`卸甲生元：${h} 点格挡转化为生命`); } }
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
    /* v0.75.0：oneShot（万剑归宗斩杀产出的 0 费副本）**就地消失** —— 既不进弃牌堆
       （进去就会被重洗再抽到，等于无限续），也不进 G.exhausted（那个列表战后会「回归牌库」并打日志）。
       回滚分支不用动：下方 lastIndexOf 有 `>=0` 守卫，副本不在弃牌堆里 ⇒ 天然 no-op。 */
    else if(c.oneShot){ /* 一次性牌：用掉即消失 */ }
    else if(c.id==='shi_wang' && G.hero==='ganshiren'){ /* 尸王：召唤物存活期间不进弃牌堆（成功后记 G.shiWangCard） */ }
    else G.discard.push(c);
  }
  sfx('card'); if(exNow) sfx('card_exhaust');   // v0.61.25：消耗牌额外给一声
  const __cs=cardSfxFor(c); if(__cs) sfx(__cs);   // v0.61.32：逐张点名的施法/斩击/钝击/群伤/自我强化听感
  cardPlayFx(c);
  if(c.type==='attack') heroAnim('attack');
  log(`打出【${c.name}】${c.up?'（升级）':''}`);
  // v0.61.35 守一：减费标记用掉即清（同一回合被换回手里再打出不会二次减免）
  if(c.costCutTurn){ c.costCutTurn=0; log('守一：此牌的费用减免已生效'); }
  // 咒印(#42 B)：咒魂为「本回合内打出的一张攻击牌」附加 100% 吸血
  const __stealPending = !!G.zhouhunSteal;
  if(G.hero==='wuseng' && G.zhouhunSteal && c.type==='attack'){ G.stealWatch=true; G.stealAccum=0; }
  duhunBatchBegin(); // v0.61.33：渡魂归己按「这一张牌造成的真实总伤害」结算（群伤/多段只取整一次）
  cardPlayWindow=true;
  const effResult = c.eff(c.up, c, xuenuBonus, i);
  cardPlayWindow=false;
  duhunBatchEnd();
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
    if(mt){ const rh=(G.ranhunHeal!=null?G.ranhunHeal:2); heal(rh); floatMsg('+'+rh+' 生命'); log(`燃魂：打出【${c.name}】，恢复 ${rh} 点生命`); }
  }
  // 尸王(#48)：成功打出后记录卡牌引用，等召唤物消散再回弃牌堆
  if(c.id==='shi_wang' && G.hero==='ganshiren'){ G.shiWangCard=c; }
  if(TUT && TUT.step===1) advanceTut();
  /* 摄魂铃[金] 本次改造：2 → 3，并改走 heal() ⇒ 每次触发都带回血特效（用户口径：回血一律要特效）。 */
  if(c.type==='attack' && hasRelic('shehunling')){ heal(3); log('摄魂铃：回复 3 点生命'); }
  G.attackBuff=prevBuff;
  if(G.hp<=0){ G.hp=0; loseGame(); return; }   // v0.61 B2：死亡先判 —— 同帧自爆绝杀按判负，不再带 0 血进胜利结算
  if(aliveEnemies().length===0){ winFight(); return; }
  render();
  saveRun();
}

