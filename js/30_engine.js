/* ============================================================================
 * 战斗引擎：状态 / 敌人辅助 / 伤害 / 诅咒召唤封印 / 回合流程 / 出牌
 * 从 原型.html 内联脚本按原顺序切出，去掉各自横幅后应与切分前正文逐字节一致
 * ============================================================================ */
let G = null;
function newState(){
  // 开局清掉卡表上残留的 up，上一局改脏的能擦回来
  for(const c of CARDS){ if(c.up) c.up=false; }
  return { log:[], deck:[], drawPile:[], hand:[], discard:[],
    hp:80, maxHp:80, block:0, energy:3, weak:0, gouhun:0, thorns:0, act:1,
    pendingEnergy:0, pendingDiscard:0, summons:[], enemies:[], target:0, mapRow:0, mapCol:-1, mapPath:[], rewardPicks:[],
    gold:0, removeCount:0, shopWares:[], shopMarkup:0, turn:0, battleStartHp:80,
    turnStats:{dmgTaken:0, blocked:0, dealt:0, kills:[], daoxin:false}, turnSummary:'',
    relics:[], skillsPlayedThisTurn:0, attackBuff:0, daoxinUsed:false, pendingRelic:false, relicPicks:[],
    revivedFree:false, goldDoubled:false, lastGold:0, battleGold:0, battleResult:null, openingPicks:[],
    hero:'tianshi', totalHpLost:0, turnAtkBuff:0, dodge:0, debuffImmune:0, xuejiBonus:0, xuejiArmed:false, xuejiHurt:false, discardSelect:null, burn:0, zombieDmg:0, karmaFire:0, duhun:null, xiejia:0, bloodPact:0, retain:0, potions:[], score:0, wangyouTurns:0, wangyouDrunk:0, wangyouPool:null, battleOver:false, dead:false, forgeFrom:null, mapSeed:0,
    尸气:0, maxShiQi:12,
    xuenu:0, maxXuenu:10,
    // -1 表示阴兵还没索到目标
    ybTarget:-1,
    hpLostTurn:0, blockGainedTurn:0, summonsMadeTurn:0, lastDrawnCards:[],
    retainHeal:0, pendingBlockStart:0, xisuiTurns:0, bleedSummonsBonus:1,
    shiWangCard:null, ranhunType:null, ranhunSelf:null, endBlockKind:null, xiejiaUp:false,
    zhouhunSteal:0, stealWatch:false, stealAccum:0,
    _mileCounted:false,
    _mileGranted:0,
    _mileParts:null,
    killNormal:0, killElite:0, killBoss:0, killSummon:0,
    accMs:0, t0:0,
    exhausted:[] };
}

function alive(e){ return e.hp>0; }
function aliveEnemies(){ return G.enemies.filter(alive); }
function curEnemy(){
  const al=aliveEnemies();
  if(!al.length) return null;
  if(G.target>=0 && G.target<G.enemies.length && G.enemies[G.target].hp>0) return G.enemies[G.target];
  return al[0];
}
function randomAlive(){ const a=aliveEnemies(); return a.length? a[Math.floor(rng()*a.length)] : null; }
// 绝对血量最低的，血一样取靠前的
function lowestHpEnemy(){ const a=aliveEnemies(); if(!a.length) return null; return a.reduce((x,y)=> y.hp<x.hp ? y : x); }
// 目标只认拖拽落点，点敌人不锁定

// 渡魂攒批：群伤/多段逐击取整会丢零头，攒总伤只取一次
let DUHUN_ACC=0, DUHUN_BATCH=false;
function duhunActive(){ return !!(G.duhun && G.duhun.turns>0); }
function duhunFlush(){
  const acc=DUHUN_ACC; DUHUN_ACC=0;
  if(!duhunActive() || acc<=0) return;
  const h=Math.floor(acc*G.duhun.ratio);
  if(h>0){
    G.hp=Math.min(G.maxHp, G.hp+h);
    playFx('lifesteal', 'player');
    // 回血一律给音效和飘字
    sfx('heal');
    floatDamage('+'+h, 'heal', document.querySelector('#player-panel .hpbar'));
    log(`渡魂归己：回复 ${h} 点生命（本批真实伤害 ${acc} × ${Math.round(G.duhun.ratio*100)}%）`);
  }
}
function duhunBatchBegin(){ DUHUN_BATCH=true; DUHUN_ACC=0; }
function duhunBatchEnd(){ DUHUN_BATCH=false; duhunFlush(); }
// 多段攻击每段加成减半，只有这三张天师牌开窗口
let SEG_HALVE=false;
function calcDamageTo(e,n,ignoreBlock,point){
  let d=n;
  if(!point){
    if(SEG_HALVE) d+=Math.floor((G.attackBuff||0)/2)+Math.floor((G.turnAtkBuff||0)/2);
    else d+=(G.attackBuff||0)+(G.turnAtkBuff||0);
    if((e.kind==='ghost'||e.kind==='jiangshi') && hasRelic('taomujian')) d=Math.floor(d*1.25);
    if(e.kind==='yao' && hasRelic('tongqianjian')) d=Math.floor(d*1.25);
    let _mul=1;
    if(G.hero==='yincha' && hasRelic('xuemodao') && G.hp < G.maxHp*0.3) _mul+=0.25;
    if(G.hero==='yincha' && G.damageDoubleTurn) _mul+=1;
    if(_mul!==1) d=Math.floor(d*_mul);
    if(hasRelic('taishangzhou') && (e.curse||0)>=6) d=Math.floor(d*1.25);
    if(G.weak>0 && !ignoreBlock) d=Math.floor(d*0.75);
    if(e.key==='xiuluowang' && (G.karmaFire||0)>0) d=Math.floor(d*0.7);
  }
  return d;
}
function applyDamageTo(e,d,ignoreBlock,point,hitNormal,floatDelay){
  let absorbed=0;
  // 记住打之前有没有格挡，好在这下刚好打光时播碎盾
  let __hadBlock=0;
  if(!ignoreBlock && e.block>0){ __hadBlock=e.block; absorbed=Math.min(e.block,d); e.block-=absorbed; d-=absorbed; if(e.pingbi>0) e.pingbi=Math.min(e.pingbi, e.block); }
  if(__hadBlock>0 && e.block<=0) sfx('kw_shield_break');
  if(e.ledgerActive && d>0) e.ledgerDmg=(e.ledgerDmg||0)+Math.min(d, e.hp);
  const hpBefore=e.hp; const actual=Math.min(d, hpBefore);
  if(G.stealWatch){ G.stealAccum=(G.stealAccum||0)+actual; }
  e.hp-=d; G.turnStats.dealt+=d; afterEnemyDamaged(e);
  if(duhunActive() && actual>0){ DUHUN_ACC+=actual; if(!DUHUN_BATCH) duhunFlush(); }
  if(e.affixes && d>0){ const fz=e.affixes.find(a=>a.id==='fanzhen'); if(fz){ const r=3*fz.tier; G.hp=Math.max(0,G.hp-r); G.totalHpLost=(G.totalHpLost||0)+r; G.hpLostTurn=(G.hpLostTurn||0)+r; G.turnStats.dmgTaken+=r; sfx('spark'); playFx('damage_reflect', enemyEl(e), {mirror:true}); log(`${e.name} 反震：反弹 ${r} 点伤害`); if(G.hero==='yincha' && r>0) gainRage(r); } }
  if(e.key==='xiuluowang' && (G.karmaFire||0)>0 && d>0){ if(bossVfxKey(e,'backlash')) bossSelfFx(e,'backlash'); else sfx('kw_yehuo'); G.hp=Math.max(0,G.hp-1); G.totalHpLost=(G.totalHpLost||0)+1; G.hpLostTurn=(G.hpLostTurn||0)+1; G.turnStats.dmgTaken+=1; log('业火反噬：你对修罗王造成伤害，损失 1 点生命'); if(G.hero==='yincha') gainRage(1); }
  const __blockedAll=(absorbed>0 && d<=0), __killed=(hpBefore>0 && e.hp<=0);
  const __hk=__blockedAll ? 'hit_guard' : ((point && !hitNormal) ? 'atk_multi_each' : pickHitSfx(actual, false, __killed));
  const __hopt=(__hk==='hit_guard' || __hk==='atk_multi_each') ? null : { rate:sfxDamageRate(actual) };
  const viz=()=>{ sfx(__hk, __hopt);
    const el=document.querySelector('#enemy-panel .enemy[data-uid="'+e.uid+'"]');
    floatDamage('-'+d, '', el, { crit: !__blockedAll && !point && isCritHit(actual, __killed) });
    HITFX.enemies.add(e);
    if(e.boss) inkBurst(el);
    else if(e.elite) screenMicroShake();
    log(`对 ${e.name} 造成 ${d} 点伤害`);
    // 打空的一击不念受击词，不然会死后还在挨打
    if(e.hp>0) enemySay(e,'hit'); };
  if(floatDelay) setTimeout(viz, floatDelay); else viz();
  return actual;
}
function dealDamageTo(e,n,ignoreBlock,floatDelay,point,hitNormal,o){
  const d=calcDamageTo(e,n,ignoreBlock,point);
  // 引爆类按层拆段，只有真机非流畅模式才拆
  if(o && o.segs>1 && enemyActBeats()){
    const segs=o.segs|0, step=o.step||110;
    const parts=[];
    let left=d;
    for(let i=0;i<segs;i++){ const s=(i===segs-1)?left:Math.floor(d/segs); parts.push(s); left-=s; }
    parts.forEach(function(seg,i){
      if(seg<=0) return;
      setTimeout(function(){
        try{
          if(e.hp>0) applyDamageTo(e,seg,ignoreBlock,true,hitNormal,0);
          syncBattleHpDom();
        }catch(err){}
      }, i*step);
    });
    setTimeout(function(){
      try{
        syncBattleHpDom();
        // 分段伤害落地后补判胜负，不然引爆打死最后一只判不出胜利
        if(!G.battleOver && G.hp>0 && aliveEnemies().length===0) winFight();
      }catch(err){}
    }, (segs-1)*step+40);
    return d;
  }
  return applyDamageTo(e,d,ignoreBlock,point,hitNormal,floatDelay);
}
function dealDamageToAll(n){ aliveEnemies().forEach(e=>dealDamageTo(e,n)); }
function burstShow(el, segs, step, key){
  if(!el || segs<=1 || typeof SETTINGS==='undefined' || SETTINGS.lowSpec) return;
  // 锚点现查现用，敌人死了就退回倒下那刻的矩形，别跳屏幕中间
  const uid=(el.dataset && el.dataset.uid) ? el.dataset.uid : null;
  const snap=(el.getBoundingClientRect ? el.getBoundingClientRect() : null);
  for(let i=1;i<segs;i++){
    setTimeout(function(){
      try{
        sfx('atk_multi_each');
        const live=uid ? document.querySelector('#enemy-panel .enemy[data-uid="'+uid+'"]') : null;
        const anchor=live || (snap ? { dataset:{uid:uid}, getBoundingClientRect:function(){ return snap; } } : el);
        const dir=i%6;
        playFx('multi_slash', anchor, { key:(key||'ms')+'#'+dir, i0:dir*8 });
      }catch(e){}
    }, i*(step||90));
  }
}
function isLinghua(e){ return !!(e && e.affixes && e.affixes.some(a=>a.id==='linghua')); }
function applyCurse(e, n){
  if(n>0) sfx('card_curse');
  let v=n;
  if(e.key==='xiuluowang' && (G.karmaFire||0)>0) v=v*2;
  const currentCurse = e.curse || 0;
  const potentialCurse = currentCurse + v;
  // 诅咒上限 6，超出的按天师被动转格挡
  const overflow = Math.max(0, potentialCurse - 6);

  e.curse = Math.min(6, potentialCurse);

  if(G.hero === 'tianshi' && overflow > 0) {
    const _ob=overflow*relicCurseOverflowBlock();
    gainBlock(_ob);
    log(`诅咒溢出：${overflow} 层诅咒转换为 ${_ob} 点格挡`);
  }
  if(hasRelic('leifaxinjue') && currentCurse < 6 && e.curse >= 6 && e.hp > 0){
    playFx('lei', enemyEl(e));
    dealDamageTo(e, 4, false, 0, true);
    log(`雷法心诀：${e.name} 诅咒满 6 层，受到 4 点雷击`);
  }
  if(hasRelic('zhushayan') && currentCurse < 6 && e.curse >= 6 && e.hp > 0){
    drawCards(1);
    log(`朱砂砚：${e.name} 诅咒满 6 层，抽 1 张牌`);
  }

  const applied = e.curse - currentCurse;
  // 计打出的诅咒总量（含溢出），金刚符/金刚罩靠它
  if(G.hero==='tianshi'){ CURSE_THIS_TURN = (CURSE_THIS_TURN||0) + Math.max(0, v); }
  if(G.hero==='tianshi' && e.hp>0) G.ybTarget=e.uid;
  if(v>0) playFx('curse', enemyEl(e), { key:'curse@'+e.uid });
  return applied;
}
// 手牌预伤逐列照抄 eff，改一边别忘了另一边
const CARD_DMG = {
  leiqianfu: (u,e)=>{ const t=e||curEnemy(); if(!t) return 0; const c=t.curse||0; return u ? (c*(c+1)/2) : (c*2); },
  leifu: (u,e)=>{ const t=e||curEnemy(); if(!t) return 0; let d=(G.hero==='tianshi'?(u?9:6):G.hero==='yincha'?(u?8:4):(u?6:4));
    if(G.hero==='ganshiren') d=(u?7:5)+G.summons.filter(s=>s.dur>0).length;
    else if(G.hero==='wuseng') d+=Math.min(6,Math.floor((G.block||0)/(u?2:3)));
    else if(G.hero==='yincha') d+=3*Math.min(2,rageLayers());
    else if(t.curse>0) d+=(u?4:3);
    return d; },
  huofu: (u,e)=>{ const t=e||curEnemy(); if(!t) return 0; let d=G.hero==='tianshi'?(u?10:6):(u?7:5);
    if(G.hero==='ganshiren') d=u?7:5;
    if(G.hero==='wuseng') d+=Math.min(6,Math.floor((G.block||0)/(u?2:3)));
    if(G.hero==='yincha') d=u?10:6;
    return d; },
  yinxueren: (u,e)=>{ if(!(e||curEnemy())) return 0; return (u?8:4)+3*Math.min(2, rageLayers()+3); },
  jianfu: (u,e)=>{ const t=e||curEnemy(); if(!t) return 0; let d;
    if(G.hero==='wuseng') d=(u?12:8)+Math.floor(G.block/2);
    else if(G.hero==='yincha') d=12+(G.hpLostTurn||0)*(u?2:1);
    else if(G.hero==='tianshi'){ d=(u?17:12); if((t.curse||0)>=3) d*=2; }
    else { d=(u?16:12); if(hasShiqi(3)) d*=2; }
    return d; },
  zhanyaojian: (u,e)=>{ const t=e||curEnemy(); if(!t) return 0;
    if(G.hero==='ganshiren') return (u?12:7)+2*G.summons.filter(s=>s.dur>0).length;
    const base=u?12:8;
    if(G.hero==='tianshi'){ const boom=Math.min(2,t.curse||0); return (u?12:10)+boom*(u?7:5); }
    if(G.hero==='yincha') return (u?14:10)+((t.curse||0)>0?(u?6:4):0);
    return (t.curse>0)?base+6:base; },
  tianlei: (u,e)=>{ if(!(e||curEnemy())) return 0;
    if(G.hero==='wuseng') return u?20:15;
    if(G.hero==='yincha') return (u?21:16)+Math.min(u?26:20,(G.totalHpLost||0)*(u?2:1));
    if(G.hero==='tianshi') return u?32:22;
    return u?28:20; },
  wanjian: u=>G.hero==='wuseng'?(u?14:9):(G.hero==='tianshi'?(u?18:14):(G.hero==='yincha'?(u?15:10):(u?14:10))),
  zhongkui: (u,e)=>{ const t=e||curEnemy(); if(!t) return 0;
    if(G.hero==='tianshi') return 16+(t.curse||0)*(u?4:3);
    if(G.hero==='ganshiren') return u?24:16;
    let d=u?22:16; if(G.hero==='yincha' && G.hp<G.maxHp*0.4) d*=2;
    return d; },
  tiebushan: (u,e)=>{ let d=G.block||0;
    if(G.hero==='ganshiren') d+=Math.floor((G.尸气||0)/2)*(u?2:1);
    else if(G.hero==='tianshi'){ const t=e||curEnemy(); if(t) d+=(t.curse||0)*(u?2:1); }
    return d; },
  shihun: (u,e)=>{ const t=e||curEnemy(); if(!t) return 0;
    if(G.hero==='ganshiren') return u?18:14;
    if(G.hero==='wuseng') return (t.curse||0)*(u?3:2);
    if(G.hero==='yincha') return (u?16:10)+(u?3:2)*Math.min(6,rageLayers());
    return (t.curse||0)*(u?6:5); },
  qungui: (u,e)=>{ const t=e||curEnemy();
    if(G.hero==='wuseng') return t?4+G.summons.filter(s=>s.dur>0).length*(u?2:1):0;
    if(G.hero==='tianshi') return t?((u?9:6)+Math.min(u?6:4,t.curse||0)):0;
    if(G.hero==='yincha') return 0;
    return G.summons.filter(s=>s.dur>0 && s.type!=='wutong').reduce((a,s)=>a+s.v+(s.type!=='shi_wang'&&isSummon('shi_wang')?1:0),0); },
  taomufu: (u,e)=>{ const t=e||curEnemy(); if(!t) return 0; let d=G.hero==='tianshi'?(u?7:5):G.hero==='ganshiren'?(u?7:5):(G.hero==='yincha'?(u?7:4):(u?6:4));
    if(t.kind==='ghost'||t.kind==='jiangshi') d+=(u?6:4);
    if(G.hero==='wuseng' && (G.blockGainedTurn||0)>0) d+=2;
    else if(G.hero==='yincha' && t.hp<t.maxHp*0.5) d+=2;
    return d; },
  shixue: (u,e)=>{ const t=e||curEnemy(); if(!t) return 0; let d;
    if(G.hero==='ganshiren') d=(u?7:5)+Math.min(u?7:6,(G.尸气||0));
    else if(G.hero==='wuseng') d=(u?6:4)+Math.min(5,Math.floor((G.block||0)/(u?2:3)));
    else if(G.hero==='yincha') d=5+Math.min(u?20:15,Math.floor((G.totalHpLost||0)/(u?3:4)));
    else d=(u?8:6);
    return d; },
  baigui: (u,e)=>{ const n=G.summons.filter(s=>s.dur>0).length;
    if(G.hero==='ganshiren') return (u?6:4)+n*(u?3:2);
    if(G.hero==='wuseng') return (u?6:5)+Math.min(u?11:8,Math.floor((G.block||0)/(u?1:2)));
    if(G.hero==='yincha') return (u?7:5)+n*(u?3:2);
    const t=e||curEnemy(); return t?8+(u?2:1)*(t.curse||0):0; },
  shihunzhou: u=>G.hero==='ganshiren'?(u?8:4):(G.hero==='tianshi'?(u?8:3):(G.hero==='yincha'?(u?8:5):(u?7:5))),
  zhiren: u=>{ const base = G.hero==='ganshiren' ? (hasShiqi(4)?(u?7:5):(u?4:2)) : (G.hero==='wuseng'||G.hero==='tianshi'?(u?3:2):(G.hero==='yincha'?(rageLayers()>=3?(u?5:4):(u?2:1)):(u?2:1)));
    const bleed=(G.bleedSummons)?Math.floor((G.hpLostTurn||0)/2):0;
    return base+(isSummon('shi_wang')?1:0)+bleed; },
  xiaogui: u=>{ const v=G.hero==='tianshi'?(u?3:2):(G.hero==='ganshiren'?(u?4:2):(G.hero==='yincha'?(u?2:1):(u?3:2)));
    const bleed=(G.bleedSummons)?Math.floor((G.hpLostTurn||0)/2):0;
    return v+(isSummon('shi_wang')?1:0)+bleed; },
  yinbingguo: u=>{ const bleed=(G.bleedSummons)?Math.floor((G.hpLostTurn||0)/2):0;
    return (u?5:4)+(isSummon('shi_wang')?1:0)+bleed; },
  zhenyaoling: (u,e)=>{ const t=e||curEnemy(); if(!t) return 0;
    const base = G.hero==='wuseng'?(u?15:10):(G.hero==='tianshi'?(u?15:10):(G.hero==='yincha'?(u?16:10):(u?15:10)));
    if(G.hero==='wuseng') return base+(((G.block||0)>=10)?(u?11:8):0);
    if(G.hero==='yincha') return base+(u?3:2)*Math.min(6,rageLayers());
    return base; },
  zhouyu: u=>G.hero==='wuseng'?0:(G.hero==='ganshiren'?(G.尸气||0)*(u?6:5):(G.尸气||0)*(u?7:6)),
  shi_wang: ()=>10
};
// 断刃雷符和雷符同数值，直接共用同一个函数
CARD_DMG.duanren_leifu = CARD_DMG.leifu;
// 罗汉伏虎漏过预伤行，拖拽时不显示数字
CARD_DMG.luohanfuhu = (u,e)=>{ if(!(e||curEnemy())) return 0; return (u?7:5)+Math.min(Math.floor((G.block||0)/2), u?15:10); };
const PER_TURN_SUMMONS = ['zhiren','xiaogui','yinbingguo','shi_wang'];
// 多段牌段数，预览要用
const CARD_SEGS = {
  leiqianfu: (u,e)=>{ const t=e||curEnemy(); return t ? (t.curse||0) : 0; },
  zhanyaojian: (u,e)=>{ if(G.hero!=='tianshi') return 1; const t=e||curEnemy(); return t ? 1+Math.min(2,t.curse||0) : 1; },
  zhongkui: (u,e)=>{ if(G.hero!=='tianshi') return 1; const t=e||curEnemy(); return t ? 1+(t.curse||0) : 1; },
};
function previewDamage(c, targetEnemy){
  const rawFn = CARD_DMG[c.id];
  if(!rawFn) return null;
  if(c.id==='zhouyu' && (G.hero==='wuseng'||G.hero==='yincha'||G.hero==='tianshi')) return null;
  if(c.id==='qungui' && G.hero==='yincha') return null;
  const perTurn = PER_TURN_SUMMONS.includes(c.id);
  // 传了打谁就算谁头顶，不传才回落当前目标
  let e = targetEnemy || curEnemy();
  if(perTurn && c.id==='yinbingguo') e = mostCursedEnemy() || e;
  if(!e) return null;
  const raw = rawFn(c.up, e);
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
  const _segs = (c.type==='attack' && CARD_SEGS[c.id]) ? CARD_SEGS[c.id](c.up, e) : 1;
  const zhusha = c.type==='attack' && hasRelic('zhushabi');
  if(zhusha) d += _segs>1 ? _segs*Math.floor(3/2) : 3;
  const turnBuf = c.type==='attack' && G.turnAtkBuff>0;
  if(turnBuf) d += _segs>1 ? _segs*Math.floor(G.turnAtkBuff/2) : G.turnAtkBuff;
  const taomu = (e.kind==='ghost'||e.kind==='jiangshi') && hasRelic('taomujian');
  if(taomu) d=Math.floor(d*1.25);
  const tongqian = e.kind==='yao' && hasRelic('tongqianjian');
  if(tongqian) d=Math.floor(d*1.25);
  const xuemodao = G.hero==='yincha' && hasRelic('xuemodao') && G.hp < G.maxHp*0.3;
  const dbl = G.hero==='yincha' && G.damageDoubleTurn;
  if(xuemodao || dbl){ let _m=1; if(xuemodao) _m+=0.25; if(dbl) _m+=1; d=Math.floor(d*_m); }
  const taishang = hasRelic('taishangzhou') && (e.curse||0)>=6;
  if(taishang) d=Math.floor(d*1.25);
  const ignoreWeak = c.id==='tianlei' && c.up;
  if(G.weak>0 && !ignoreWeak) d=Math.floor(d*0.75);
  if(e.key==='xiuluowang' && (G.karmaFire||0)>0) d=Math.floor(d*0.7);

  const wbDmg = G.hero==='wuseng' && WUSENG_BLOCK_DMG.indexOf(c.id)>=0;
  const ycDmg = G.hero==='yincha' && YINCHA_DYN_DMG.indexOf(c.id)>=0;
  const tsDmg = G.hero==='tianshi' && TIANSHI_DYN_DMG.indexOf(c.id)>=0;
  const curseTag = ((G.hero==='wuseng' && WUSENG_NO_CURSE_TAG.indexOf(c.id)>=0)
    || (G.hero==='yincha' && YINCHA_NO_CURSE_TAG.indexOf(c.id)>=0)) ? 0 : (e.curse||0);
  return { raw, d, curse:curseTag, weak:G.weak>0 && !ignoreWeak, taomu, tongqian, xuemodao, taishang, zhusha, turnBuf, dynamic: dynamic || wbDmg || ycDmg || tsDmg, perTurn };
}
// 防御牌格挡预览：照抄 eff 里 gainBlock 收到的数
// 只认 type==='defense'，舍身/万剑归宗不算
const CARD_BLOCK = {
  jingang: u=>{ if(G.hero==='ganshiren') return u?7:4;
    if(G.hero==='wuseng') return u?9:6;
    if(G.hero==='yincha') return u?9:6;
    return (u?7:5)+Math.min(6,(u?2:1)*(CURSE_THIS_TURN||0)); },
  yinshen: u=>G.hero==='ganshiren'?(u?6:3):(G.hero==='wuseng'?(u?6:4):(G.hero==='yincha'?(u?7:3):(u?5:3))),
  jinguang: u=>{ if(G.hero==='ganshiren') return (u?14:9)+(hasShiqi(2)?(u?7:5):0);
    if(G.hero==='wuseng') return u?19:14;
    if(G.hero==='yincha') return u?17:11;
    return (u?17:12)+(CURSE_THIS_TURN||0)*(u?2:1); },
  jinzhong: u=>G.hero==='ganshiren'?(u?16:10):(G.hero==='yincha'?(u?18:12):(u?17:12)),
  jingji: u=>G.hero==='ganshiren'?(u?6:3):(G.hero==='wuseng'?(u?7:4):(G.hero==='yincha'?(u?6:4):(u?6:3))),
  fodu: u=>{ if(!u) return 0;
    if(G.hero==='ganshiren') return 0;
    if(G.hero==='yincha') return 0;
    return 5; },
  tongpi: u=>G.hero==='ganshiren'?(u?12:8):(G.hero==='wuseng'?(u?15:10):(G.hero==='yincha'?(u?13:9):(u?14:9))),
  fanzhen: ()=>0,
  xiejiashengyuan: u=>G.hero==='ganshiren'?(u?7:4):(G.hero==='wuseng'?(u?8:5):(G.hero==='yincha'?(u?8:5):(u?12:8)))
};
// 隐身符天师列打完才知道加多少，标 dynamic 显示保底
const DYNAMIC_BLOCK = ['yinshen'];
function previewBlock(c){
  if(!c || c.type!=='defense') return 0;
  const fn = CARD_BLOCK[c.id];
  if(!fn) return 0;
  let b;
  try{ b = fn(!!c.up); }catch(e){ return 0; }
  return (typeof b==='number' && isFinite(b) && b>0) ? b : 0;
}
function dealDamageToPlayer(n, attacker, floatDelay, opt){
  if(G.dodge>0){
    G.dodge--;
    if(G.dodgeShiqi){ const __dq=G.dodgeShiqi; gainShiqi(__dq); log(`移形换影：闪避了 ${attacker.name} 的攻击，获得 ${__dq} 点【尸气】`); }
    else if(G.dodgeNextBlock){ G.pendingBlockStart=(G.pendingBlockStart||0)+G.dodgeNextBlock; log(`移形换影：闪避了 ${attacker.name} 的攻击（下回合 +${G.dodgeNextBlock} 格挡）`); }
    else if(G.dodgeHealRage){ const __rg=G.dodgeRageGain||1; heal(G.dodgeHealRage); gainRage(__rg); log(`移形换影：闪避了 ${attacker.name} 的攻击，恢复 ${G.dodgeHealRage} 点生命并获得 ${__rg} 层【血怒】`); }
    else if(G.dodgeCurse){ applyCurse(attacker,1); log(`移形换影：闪避了 ${attacker.name} 的攻击，对其施加 1 层【诅咒】`); }
    else { G.dodgeDraw=(G.dodgeDraw||0)+1; log(`移形换影：闪避了 ${attacker.name} 的攻击（下回合多摸 1 张）`); }
    return;
  }
  let d=n+(attacker.strength||0);
  if(attacker.affixes){ const jd=attacker.affixes.find(a=>a.id==='judu'); if(jd){ d+=2*jd.tier; sfx('affix_proc'); } }
  // 魅惑管一整次行动，标记到行动结束才扣层
  if(attacker.charm>0){ const cpr=attacker.charmPct!=null?attacker.charmPct:0.5; d=Math.floor(d*cpr); attacker.charmUsed=true; }
  const full=d;
  const __preBlock=G.block||0;
  const absorbed=Math.min(G.block,d); G.block-=absorbed;
  const dealt=d-absorbed;
  let loss=dealt;
  if(G.hp-dealt<=0 && hasRelic('daoxin') && !G.daoxinUsed){ loss=Math.max(0,G.hp-1); G.daoxinUsed=true; G.turnStats.daoxin=true; log('道心触发：抵挡致命伤，保留 1 点生命'); daoxinBurst(); }
  G.hp-=loss;
  if(loss>0) checkFengduLing();
  if(loss>0 && G.xuejiArmed) G.xuejiHurt=true;
  const doFx=()=>{
    if(opt && opt.multi) sfx('enemy_multi'); else sfx('hurt', { rate:sfxDamageRate(loss) });
    if(loss<=0) return;
    hurtVignette(); heroAnim('hit'); playFx('hurt', 'player');
    const bar=document.querySelector('#player-panel .hpbar'); floatDamage('-'+loss, 'to-player', bar);
  };
  if(loss>0 || (opt && opt.multi)){ if(floatDelay) setTimeout(doFx, floatDelay); else doFx(); }
  G.totalHpLost=(G.totalHpLost||0)+loss;
  G.hpLostTurn=(G.hpLostTurn||0)+loss;
  G.turnStats.dmgTaken+=loss; G.turnStats.blocked+=absorbed;
  log(`${attacker.name} 对你造成 ${loss} 点伤害${absorbed>0?`（格挡吸收 ${absorbed}）`:''}`);
  if(G.tutorial && G.tutorial.on && typeof tutOn==='function'){ try{ tutOn('playerHit',{loss:loss, absorbed:absorbed}); }catch(e){} }
  if(full>0){
    const _th=(G.thorns||0)+relicThorns()+mileThorns();
    if(_th>0){ sfx('spark'); playFx('damage_reflect', 'player'); attacker.hp-=_th; log(`荆棘/反震：反弹 ${_th} 点伤害给 ${attacker.name}`); afterEnemyDamaged(attacker); }
    if((G.hitHeal||0)>0){ heal(G.hitHeal); log(`荆棘符：受击恢复 ${G.hitHeal} 点生命`); }
    if((G.hitCurse||0)>0){ applyCurse(attacker, G.hitCurse); log(`铜皮/荆棘：对 ${attacker.name} 施加 ${G.hitCurse} 层【诅咒】`); }
    if((G.hitShiqi||0)>0){ gainShiqi(G.hitShiqi); log(`反震：受击获得 ${G.hitShiqi} 点【尸气】`); }
    if((G.hitRage||0)>0){ gainRage(G.hitRage); log(`反震：受击获得 ${G.hitRage} 层【血怒】`); }
    if((G.hitBlock||0)>0){ gainBlock(G.hitBlock); log(`反震：受击获得 ${G.hitBlock} 点格挡`); }
    if((G.nextBlock||0)>0){ G.pendingBlockStart=(G.pendingBlockStart||0)+G.nextBlock; log(`反震：下回合开始额外获得 ${G.nextBlock} 点格挡`); }
  }
  // 达摩影：这击把格挡打光，就按击碎前的量爆一次
  if(__preBlock>0 && (G.block||0)<=0 && hasRelic('damoying')) damoyingBurst(__preBlock);
  if(attacker.key==='xiaojianshi' && loss>0){ G.zombieDmg=(G.zombieDmg||0)+loss; }
  if(attacker.lifesteal && loss>0){ const hl=Math.floor(loss*attacker.lifesteal); const _cap=Math.floor((attacker.maxHp||attacker.hp)*LIFESTEAL_HEAL_CAP_RATIO); const _lvB4=attacker.hp; attacker.hp=Math.min(attacker.hp+hl, _cap); const _lvGot=Math.round(attacker.hp-_lvB4); if(_lvGot>0){ const _el=enemyEl(attacker); if(bossVfxKey(attacker,'drain')) bossSkillFx(attacker,'drain'); else if(_el) playFx('lifesteal', _el); floatDamage('+'+_lvGot, 'heal', _el?_el.querySelector('.enemyhpbar'):null); } log(`${attacker.name} 吸血：回复 ${hl} 点生命`); }
  if(attacker.affixes){
    const sx=attacker.affixes.find(a=>a.id==='shixue'); if(sx && loss>0) enemyGainHp(attacker, 3*sx.tier, 'kw_regen', '蚀血：回复');
    if(attacker.affixes.some(a=>a.id==='gouhun') && !G.debuffImmune){ sfx('kw_gouhun'); G.gouhun=1; log(`${attacker.name} 勾魂（下回合少抽 1 张）`); }
    if(attacker.affixes.some(a=>a.id==='feipai')){ addJunkToHand(1); }
  }
  if(enemyActBeats()) syncBattleHpDom();
}
// 逐点独立一击，随机甩给存活敌人
function damoyingBurst(amount){
  const total=amount|0; if(total<=0) return;
  sfx('kw_shield_break');
  playFx('thorns_light', 'player');
  const smooth=!!SETTINGS.lowSpec;
  const step=smooth?0:(total>12?60:120);
  let hits=0, dealt=0;
  for(let i=0;i<total;i++){
    const al=aliveEnemies(); if(!al.length) break;
    const e=al[Math.floor(rng()*al.length)];
    dealt+=dealDamageTo(e,1,false,smooth?0:i*step,true);
    hits++;
    if(G.hp<=0) break;
  }
  log(`达摩影：格挡被击碎，爆破 ${hits} 点伤害随机分配给全体敌人`);
  floatMsg(`达摩影 · ${hits} 连击`);
}
// 濒死台词放在死亡判定之后，同归于尽那下只念被击败
function afterEnemyDamaged(e){
  if(e.hp<=0){ onEnemyDeathCheck(e); return; }
  if(e.hp<=e.maxHp*0.3) enemySay(e,'low');
  if(e.split && !e.splitDone && e.hp < e.maxHp/2){ splitBoss(e); }
}
function splitBoss(e){
  e.splitDone=true;
  unlockBestiary(e.key);
  const idx=G.enemies.indexOf(e);
  // 谢必安血线过半分两只，意图错开免得一起勾魂
  const b1=makeEnemy(ENEMIES['bian'], 'bian');
  const b2=makeEnemy(ENEMIES['bian'], 'bian');
  b2.intentIndex=1;
  G.enemies.splice(idx,1,b1,b2);
  if(G.target>idx) G.target=idx;
  if(bossVfxKey(e,'split')) bossSelfFx(e,'split'); else sfx('boss_split');
  floatMsg('谢必安 · 分化！');
  log('谢必安血线过半，分化为两个「必安」！');
  enemySayMid(e, b1);
  enemySay(b1,'in');
}
function onEnemyDeathCheck(e){
  if(e.phase && !e.phase2){ enterPhase2(e); }
  else {
    G.turnStats.kills.push(e.name); G.totalKills=(G.totalKills||0)+1; unlockBestiary(e.key);
    // 图鉴收录条数上报成就，跟击杀数无关
    tapAchieveProgress('All-unlocked', BESTIARY_ORDER.filter(k=>SAVE.unlocked.includes(k)).length);
    const _def=ENEMIES[e.key]||{};
    if(_def.summon) G.killSummon=(G.killSummon||0)+1;
    else if(e.boss) G.killBoss=(G.killBoss||0)+1;
    else if(e.elite) G.killElite=(G.killElite||0)+1;
    else G.killNormal=(G.killNormal||0)+1;
    e.dying=true; sfx('death');
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
  if(bossVfxKey(e,'revive')) bossSelfFx(e,'revive'); else sfx('boss_phase2');
  floatMsg('轮回 · 第二阶段');
  bossPhaseIntro(e.name||'阎罗天子');
  log('阎罗天子堕入轮回，阴气更盛——进入第二阶段！');
  enemySayMid(e);
}
function directDamage(n, msg){
  if(n<=0) return false;
  sfx('atk_true');
  hurtVignette(); floatDamage('-'+n, 'to-player', document.querySelector('#player-panel .hpbar'));
  if(msg) log(msg);
  loseHp(n);
  G.turnStats.dmgTaken=(G.turnStats.dmgTaken||0)+n;
  if(G.hp<=0){ G.hp=0; loseGame(); return true; }
  return false;
}
function tickSeals(){ [G.hand, G.drawPile, G.discard].forEach(pile=>pile.forEach(c=>{ if(c.sealed>0) c.sealed--; })); }
function gainBlock(n){
  G.block+=n;
  // 格挡特效同名重播别叠加；金钟罩/金光罩各走自己的音
  if(n>0){ G.blockGainedTurn=(G.blockGainedTurn||0)+n; sfx(cardPlayWindow ? ((G._playCardId==='jinzhong'||G._playCardId==='jinguang') ? 'jinzhong' : 'card_defense') : 'block'); playFx('block', 'player'); floatDamage('+'+n, 'block', document.querySelector('#player-panel .hpbar')); }
  // 金刚杵每攒满 50 格挡塞一张临时铁布衫
  if(n>0 && hasRelic('jingangchu')){
    G.blockAccum=(G.blockAccum||0)+n;
    while(G.blockAccum>=50){
      G.blockAccum-=50;
      G.hand.push(Object.assign({}, cardById('tiebushan'), {cost:0, costU:null, oneShot:true}));
      sfx('relic_proc'); floatMsg('金刚杵 · 铁布衫'); log('金刚杵：累计格挡满 50，手牌获得 1 张临时【铁布衫】');
      jingangchuFx();
    }
  }
}
function heal(n){ if(n>0) playFx('heal', 'player'); G.hp=Math.min(G.maxHp, G.hp+n); sfx('heal'); const bar=document.querySelector('#player-panel .hpbar'); floatDamage('+'+n, 'heal', bar); }
function playerDebuffReceived(){ if(hasRelic('yinyangyu')){ heal(2); log('阴阳鱼：受到负面效果，恢复 2 点生命'); } }
// 敌人回血统一走这里，血条才有膨胀动画
function enemyGainHp(e, n, snd, note){
  if(!e || n<=0 || e.hp<=0) return 0;
  sfx(snd || 'enemy_heal');
  const before=e.hp;
  e.hp=Math.min(e.maxHp, e.hp+n);
  const got=Math.round(e.hp-before);
  if(got<=0) return 0;
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
// 尸王免疫非玩家主动的弃牌
function isProtectedFromDiscard(c){ return !!(c && c.id==='shi_wang'); }
// 没尸王时 rng 消耗和旧版一字不差
function pickDiscardIndex(){
  const n=G.hand.length; if(!n) return -1;
  let prot=0; for(let k=0;k<n;k++) if(isProtectedFromDiscard(G.hand[k])) prot++;
  if(!prot) return Math.floor(rng()*n);
  const cand=[]; for(let k=0;k<n;k++) if(!isProtectedFromDiscard(G.hand[k])) cand.push(k);
  if(!cand.length) return -1;
  return cand[Math.floor(rng()*cand.length)];
}
function discardRandomHand(){ if(!G.hand.length) return null; const i=pickDiscardIndex(); if(i<0) return null; const c=G.hand.splice(i,1)[0]; if(c.type!=='junk') G.discard.push(c); sfx('card_discard'); log(`弃掉【${c.name}】`); return c; }
function enemyRandomDiscard(){
  if(!G.hand.length){ log('缠绕生效，但你已无手牌可弃'); return; }
  const i=pickDiscardIndex();
  if(i<0){ floatMsg('【尸王】镇住神魂'); log('缠绕：可弃之牌皆被【尸王】镇住，无从下手'); return; }
  const c=G.hand.splice(i,1)[0];
  if(c.type!=='junk') G.discard.push(c);
  floatMsg(`被弃掉：${c.name}`); sfx('card_discard');
  log(`敌人的缠绕：随机弃掉你的【${c.name}】`);
  render();
}
function showWangyouChoice(){
  const pool=G.hand.slice().filter(c=>!isProtectedFromDiscard(c));
  if(!pool.length){ log('忘忧汤翻涌，但【尸王】镇住神魂，你躲过一劫'); return; }
  G.wangyouPool=pool;
  const cards=pool.map((c,i)=>`<div class="card has-frame ${RCOLOR[c.rarity]}" onclick="drinkWangyou(${i})">${cardBody(c)}</div>`).join('');
  showOverlay(`<h2>忘 忧 汤</h2><p>孟婆的汤还萦绕在喉头——选择 1 张手牌「饮下」（弃置，进弃牌堆而非封印），或拒绝（受 <b style="color:var(--red)">8 点真实伤害</b>）。</p><div class="reward-cards">${cards}</div><button class="btn ghost" onclick="refuseWangyou()">拒绝 · 受 8 点真实伤害</button>`, undefined, 'pick-scene');
}
function drinkWangyou(i){
  const pool=G.wangyouPool||G.hand;
  const picked=pool[i];
  G.wangyouPool=null;
  if(!picked){ hideOverlay(); render(); return; }
  const hi=G.hand.indexOf(picked);
  const c = hi>=0 ? G.hand.splice(hi,1)[0] : picked;
  if(hi>=0 && c.type!=='junk') G.discard.push(c);
  G.wangyouDrunk=(G.wangyouDrunk||0)+1;
  sfx('kw_wangyou');
  log(`饮下【${c.name}】——忘忧汤入喉，前尘如烟`);
  hideOverlay(); render();
}
function refuseWangyou(){
  G.wangyouPool=null;
  const dead=directDamage(8, '你拒绝了忘忧汤，孟婆的怒火化作 8 点真实伤害');
  if(dead) return;
  hideOverlay(); render();
}
// 把牌从弃牌堆摘回手牌
function handReturnFromDiscard(c){
  if(!c) return false;
  const i=G.discard.lastIndexOf(c);
  if(i<0){ G.hand.push(c); return false; }
  G.discard.splice(i,1); G.hand.push(c); return true;
}
function startDiscardSelect(n, srcCard){
  if(G.hand.length < n){
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
  for(let k=0;k<nDiscarded;k++){
    if(G.hero==='ganshiren'){ gainShiqi(1); gainBlock(u?3:2); }
    else if(G.hero==='wuseng'){ gainBlock(u?5:4); }
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
function startWuleiSelect(srcCard, up){
  if(!G.hand.length){ log('五雷法印：没有可转化的手牌'); return; }
  G.wuleiSelect={ up:!!up, picked:[], srcCard:srcCard||null, cost:srcCard?effectiveCost(srcCard):0 };
  renderWuleiSelect();
}
function renderWuleiSelect(){
  const s=G.wuleiSelect; if(!s) return;
  const cards=G.hand.map((c,i)=>{
    const sel=s.picked.includes(i);
    return `<div class="card has-frame ${RCOLOR[c.rarity]} ${sel?'selected':''}" onclick="toggleWuleiPick(${i})">${cardBody(c)}${sel?'<div class="card-extra" style="color:var(--green)">✓ 已选</div>':''}</div>`;
  }).join('');
  showOverlay(`<h2>五 雷 法 印</h2><p style="color:var(--red)">选择至多 <b>5</b> 张手牌，化为 0 费${s.up?'升级':''}【雷符】（已选 <b>${s.picked.length}</b> / 5）</p>
    <div class="reward-cards">${cards}</div>
    <button class="btn" onclick="confirmWuleiSelect()">${s.picked.length>0?`转化 ${s.picked.length} 张`:'请选择要转化的牌'}</button>
    <button class="btn ghost" onclick="cancelWuleiSelect()">放弃（五雷法印回手）</button>`, undefined, 'pick-scene');
}
function toggleWuleiPick(i){
  const s=G.wuleiSelect; if(!s) return;
  const idx=s.picked.indexOf(i);
  if(idx>=0) s.picked.splice(idx,1);
  else if(s.picked.length>=5){ floatMsg('至多 5 张'); return; }
  else s.picked.push(i);
  renderWuleiSelect();
}
function confirmWuleiSelect(){
  const s=G.wuleiSelect; if(!s || s.confirming) return;
  if(!s.picked.length){ floatMsg('至少选 1 张'); return; }
  const doSwap=function(){
    const lf=cardById('leifu');
    let n=0;
    [...s.picked].sort((a,b)=>b-a).forEach(i=>{
      if(!G.hand[i]) return;
      if(G.discard) G.discard.push(G.hand[i]);
      G.hand[i]=Object.assign({}, lf, {cost:0, costU:null, oneShot:true, up:!!s.up});
      n++;
    });
    sfx('ui_unlock'); log(`五雷法印：${n} 张手牌化为 0 费${s.up?'升级':''}【雷符】（本场临时）`);
    G.wuleiSelect=null; hideOverlay(); render(); saveRun();
  };
  if(!animLive() || menuFxOff()){ doSwap(); return; }
  s.confirming=true;
  const nodes=Array.prototype.slice.call(document.querySelectorAll('.reward-cards .card'));
  s.picked.forEach(i=>{ const el=nodes[i]; if(el && el.classList) el.classList.add('is-smoking'); });
  sfx('card_exhaust');
  setTimeout(function(){ try{ doSwap(); }catch(e){} }, 520);
}
function cancelWuleiSelect(){
  const s=G.wuleiSelect; if(!s) return;
  if(s.srcCard && handReturnFromDiscard(s.srcCard)) log('放弃【五雷法印】，牌已回手');
  if(s.cost>0){ G.energy+=s.cost; log(`五雷法印取消：退回 ${s.cost} 点符文`); }
  G.wuleiSelect=null; hideOverlay(); log('放弃【五雷法印】'); render();
}
function autoPlayWulei(){
  let guard=0;
  while(guard++<16){
    const idx=G.hand.findIndex(c=> c && c.oneShot && c.id==='leifu');
    if(idx<0) break;
    const t=lowestHpEnemy();
    if(!t) break;
    const ti=G.enemies.indexOf(t);
    if(ti>=0) G.target=ti;
    doPlayCard(idx);
    if(G.hp<=0 || G.battleOver || !aliveEnemies().length) break;
  }
}
function startHuofuSelect(srcCard, up, target, dmg){
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
  if(isGhostCard(c)){ gain=s.up?3:2; gainShiqi(gain); log(`火符：弃掉鬼怪牌，获得 ${gain} 点【尸气】`); }
  const _t=s.target, _d=s.dmg;
  G.huofuSelect=null; hideOverlay();
  if(_t && (_t.hp||0)>0 && _d>0) dealDamageTo(_t, _d);
  render();
  floatMsg(gain>0?`+${gain} 尸气`:'已弃牌');
  if(G.hp<=0){ G.hp=0; loseGame(); return; }
  if(aliveEnemies().length===0){ winFight(); return; }
}
function startExchangeSelect(times, srcCard){
  if(!G.hand.length){
    if(srcCard && handReturnFromDiscard(srcCard)){ log('没有可交换的手牌，【易物】已回手'); }
    floatMsg('没有手牌可交换'); render(); return; }
  G.exchange={ times, phase:'pickHand', handIndex:null, pool:null, card:srcCard||null, done:0 };
  renderExchange();
}
function cancelExchangeSelect(){
  const ex=G.exchange; if(!ex) return;
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
  Anim.flush();
}
function pickExchangeHand(i){
  const ex=G.exchange; if(!ex) return;
  ex.handIndex=i;
  if(G.drawPile.length<3 && G.discard.length){
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
  const _oldSlot=animRect(animHandElAt(ex.handIndex));
  const old=G.hand.splice(ex.handIndex,1)[0];
  if(old.type!=='junk') G.discard.push(old);
  removeCardFromPiles(c);
  const cNew=Object.assign({}, c);
  const _di=G.deck.indexOf(c); if(_di>=0) G.deck[_di]=cNew;
  G.hand.push(cNew);
  ex.done=(ex.done||0)+1;
  animExchangeQueued(old, cNew, _oldSlot);
  if(G.hero==='ganshiren' && isGhostCard(old)){ gainShiqi(2); log('易物：换出鬼怪牌，获得 2 点【尸气】'); }
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
    if(G.hero==='ganshiren'){ if(isGhostCard(c)){ shiqiKeep++; } }
    else if(G.hero==='wuseng'){ if(c.type==='defense'){ const sb=G.shouyiUp?4:3; gainBlock(sb); log(`守一：保留防御牌，获得 ${sb} 点格挡`); } }
    else if(G.hero==='yincha'){ costSum += cardCost(c); }
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

function resetDeck(){
  // 教程关固定上手顺序，drawCards 从堆底 pop 所以要先反转
  if(G.tutorial && G.tutorial.on && G.tutorial.draw){
    const used=new Set(); const seq=[];
    G.tutorial.draw.forEach(id=>{ const c=G.deck.find(x=>x.id===id && !used.has(x)); if(c){ used.add(c); seq.push(c); } });
    const rest=G.deck.filter(x=>!used.has(x));
    G.drawPile = shuffle(rest).concat(seq.reverse());
    G.hand=[]; G.discard=[]; return;
  }
  G.drawPile=shuffle([...G.deck]); G.hand=[]; G.discard=[];
}
function drawCards(n){
  const drawn=[]; const objs=[];
  for(let i=0;i<n;i++){
    if(G.hand.length>=10){ log('手牌已满'); break; }
    if(!G.drawPile.length){ if(!G.discard.length) break; G.drawPile=shuffle(G.discard); G.discard=[]; log('弃牌堆洗回抽牌堆'); animShuffleQueued(); }
    const c=G.drawPile.pop(); G.hand.push(c); drawn.push(c.name); objs.push(c);
  }
  G.lastDrawnCards=objs;
  animDrawQueued(objs);
  if(drawn.length){ sfx('card_draw'); log(`摸 ${drawn.length} 张：${drawn.join('、')}`); }
}

let CURSE_THIS_TURN = 0;

function applyBattleStartRelics(){
  if(hasRelic('shiyu')){ gainShiqi(3); log('尸玉：战斗开始获得 3 点【尸气】'); }
  if(G.hero==='wuseng' && hasRelic('budongmingwang')){ gainBlock(5); G.xiejia=Math.max(G.xiejia||0, 2); floatMsg('不动明王像 · 卸甲'); log('不动明王像：开局触发【卸甲生元】（+5 格挡，卸甲 2 回合）'); }
}
function startBattle(keys){
  SCENE='battle';
  fxStopAll();
  if(typeof heroDeath==='function') heroDeath(false);
  setBg('act'+G.act);
  G.enemies = keys.map(k=>makeEnemy(ENEMIES[k], k));
  // 敌人建好才判得出 boss/精英，BGM 得放后面
  setBGM(battleBgmFor(G.enemies));
  G.enemies.forEach((e,i)=>{ if(e.intents.length>1) e.intentIndex = i % e.intents.length; });
  if(G.tutorial && G.tutorial.on && G.tutorial.foeOv){
    G.enemies.forEach(e=>{ const ov=G.tutorial.foeOv[e.key]; if(!ov) return;
      if(ov.hp!=null){ e.hp=ov.hp; e.maxHp=ov.hp; }
      if(ov.intents) e.intents=ov.intents.map(it=>Object.assign({},it));
      e.affixes=(ov.affixes||[]).map(a=>Object.assign({},a));
      e.intentIndex=0;
    });
  }
  G.target=0;
  G.battleOver=false;
  G._settlePlayed=false;
  G.ybTarget=-1;
  PLAYER_HP_PREV=null; ENEMY_HP_PREV={};
  G.block=0; G.weak=0; G.gouhun=0; G.thorns=0; G.pendingEnergy=0; G.pendingDiscard=0; G.summons=[]; G.blockAccum=0;
  G.turn=0; G.turnSummary=''; G.daoxinUsed=false; G.fengduUsed=false; G.damageDoubleTurn=0; G.skillsPlayedThisTurn=0; G.attackBuff=0; G.totalHpLost=0; G.dodge=0; G.dodgeDraw=0; G.debuffImmune=0; G.xuejiBonus=0; G.xuejiArmed=false; G.xuejiHurt=false; G.burn=0; G.zombieDmg=0; G.karmaFire=0; G.duhun=null; G.xiejia=0; G.zhouyuA=false; G.尸气=0; G.exhausted=[];
  G.curseCarryNext=0;
  G.xisuiTurns=0;
  G.wangyouTurns=0; G.wangyouDrunk=0; G.wangyouPool=null;
  G.deck.forEach(c=>c.sealed=0);
  G.battleStartHp=G.hp;
  log(`—— 遭遇 ${G.enemies.map(e=>e.name).join('、')} ——`);
  const beginBattle=()=>{
    resetDeck();
    if(G.hero==='ganshiren'){
      const _sw = G.drawPile.find(c=>c.id==='shi_wang');
      if(_sw){ G.drawPile = G.drawPile.filter(c=>c!==_sw); G.hand.push(_sw); log('【尸王】已在手牌，随时可召唤'); }
    }
    if(typeof fxPreheatBattle==='function') fxPreheatBattle();
    if(typeof render==='function') render();
    // 这里先把 render 走一遍，不然玩家特效锚点量到 0 掉屏幕中间
    applyBattleStartRelics();
    G.enemies.forEach(e=>enemySay(e,'in'));
    G.enemies.forEach(e=>{ if(bossVfxKey(e,'affix')) bossSelfFx(e,'affix'); });
    bindSaySkip();
    if(G.tutorial && G.tutorial.on && typeof tutOn==='function'){ try{ tutOn('battleStart'); }catch(e){} }
    startTurn();
  };
  if(G.enemies.some(e=>e.boss)) bossIntro(beginBattle);
  else beginBattle();
}
function startTurn(){
  G.turn=(G.turn||0)+1;
  G.turnStats={dmgTaken:0, blocked:0, dealt:0, kills:[], daoxin:false};
  turnBanner('第 '+G.turn+' 回合');
  log('—— 第 '+G.turn+' 回合开始 ——');
  G.hpLostTurn=0; G.blockGainedTurn=0; G.summonsMadeTurn=0; CURSE_THIS_TURN=0;
  // 卸甲结转来的诅咒并进本回合计数
  if(G.curseCarryNext){ CURSE_THIS_TURN=(CURSE_THIS_TURN||0)+G.curseCarryNext; log(`卸甲生元结转：本回合额外计入 ${G.curseCarryNext} 层【诅咒】`); G.curseCarryNext=0; }
  G.junkPlayedThisTurn=0; G.ranhunType=null; G.ranhunSelf=null; G.ranhunHeal=0; G.shouyiUp=false;
  G.zhouhunSteal=0; G.stealWatch=false; G.stealAccum=0;
  DUHUN_ACC=0; DUHUN_BATCH=false;
  G.thorns=0; G.hitHeal=0; G.hitCurse=0; G.hitShiqi=0; G.hitRage=0; G.hitBlock=0; G.nextBlock=0;
  G.dodgeShiqi=0; G.dodgeNextBlock=0; G.dodgeHealRage=0; G.dodgeRageGain=0; G.dodgeCurse=0;
  G.bleedSummons=false; G.bleedSummonsBonus=1;
  // 减费标记四个牌堆都扫，只清手牌会漏
  [G.hand,G.drawPile,G.discard,G.deck].forEach(p=>(p||[]).forEach(c=>{ if(c&&c.tempCostCut) delete c.tempCostCut; }));
  if(G.burn>0){ sfx('b2_hanba_burn_tick'); playFx('b2_hanba_burn_tick_hit','player'); const bd=G.burn*2; G.hp=Math.max(0,G.hp-bd); G.turnStats.dmgTaken+=bd; log(`灼烧：失去 ${bd} 点生命（${G.burn} 层）`); if(G.hp<=0){ G.hp=0; loseGame(); return; } }
  if(G.enemies && G.enemies.some(e=>e.hp>0 && e.poison>0)){
    sfx('kw_burn');
    G.enemies.forEach(e=>{
      if(e.hp<=0 || !(e.poison>0)) return;
      const p=e.poison, pd=(p*(p+1))/2, el=enemyEl(e);
      e.hp=Math.max(0, e.hp-pd);
      if(el){ playFx('fudu_hit', el); floatDamage('-'+pd, '', el, {}); }
      sfxOnce('atk_aoe', 90);
      log(`${e.name} 腐毒发作，失去 ${pd} 点生命（${p} 层三角结算）`);
      e.poison=Math.max(0, e.poison-1);
      if(e.hp<=0) onEnemyDeathCheck(e);
    });
    if(!aliveEnemies().length){ winFight(); return; }
    render();
  }
  G.skillsPlayedThisTurn=0; G.attackBuff=0; G.turnAtkBuff=0; G.bloodPact=0; G.retain=0;
  G.energy=3+G.pendingEnergy;
  G.pendingEnergy=0;
  tickSeals();
  if(G.karmaFire>0) G.karmaFire--;
  if(G.duhun && G.duhun.turns>0) G.duhun.turns--;
  if(G.xiejia>0){                     }
  else if(G.hero !== 'wuseng'){ G.block = 0; }
  G.dodge=0; if(G.debuffImmune>0) G.debuffImmune--;
  if(hasRelic('hushenfu')){ gainBlock(2); log('护身符：+2 格挡'); }
  if(G.hero==='wuseng'){ gainBlock(2); log('苦行武僧：+2 格挡'); }
  if(G.pendingBlockStart>0){ gainBlock(G.pendingBlockStart); log(`上回合结转：获得 ${G.pendingBlockStart} 点格挡`); G.pendingBlockStart=0; }
  if(G.retainHeal>0){ heal(G.retainHeal); log(`守一：恢复 ${G.retainHeal} 点生命`); G.retainHeal=0; }
  if((G.xisuiTurns||0)>0){
    G.xisuiTurns--;
    G.energy+=1;
    if(G.hero==='ganshiren'){ const __sq=G.xisuiShiqi||1; gainShiqi(__sq); log(`洗髓经：获得 ${__sq} 点【尸气】与 1 点符文`); }
    else if(G.hero==='wuseng'){ gainBlock(2); log('洗髓经：获得 2 点格挡与 1 点符文'); }
    else if(G.hero==='yincha'){ loseHp(2); log('洗髓经：失去 2 点生命，获得 1 点符文'); }
    else { const re=randomAlive(); if(re) applyCurse(re,1); log('洗髓经：对随机敌人施加 1 层【诅咒】并获 1 点符文'); }
  }
  if(G.hero==='ganshiren'){
    const summonCount = G.summons.filter(s=>s.dur>0).length;
    if(summonCount > 0) {
      G.尸气 = Math.min(relicMaxShiqi(), G.尸气 + summonCount);
      log(`养尸为用：获得 ${summonCount} 点【尸气】（当前 ${G.尸气}/${relicMaxShiqi()}）`);
    }
  }
  const __wtDie=[];
  for(const s of G.summons.slice()){
    if(s.dur<=0) continue;
    if(s.type==='zhiren' && G.hero==='wuseng'){ const b=summonTurnBlock(s); gainBlock(b); log(`纸人存活：获得 ${b} 点格挡`); }
    else if(s.type==='yinbing' && G.hero==='wuseng'){ const b=summonTurnBlock(s); gainBlock(b); log(`阴兵存活：获得 ${b} 点格挡`); }
    else if(s.type==='wutong'){ wutongTick(s); if(!s.indefinite && s.dur<=0) __wtDie.push(s); }
  }
  // 五通神寿命按回合开始算，寿终要补一次消散结算
  for(const s of __wtDie) onSummonDeath(s);
  G.summons = G.summons.filter(s=> s.type==='wutong' ? (s.indefinite || s.dur>0) : s.dur>0);
  if(G.hero==='tianshi'){
    let maxCurseEnemy = null;
    let maxCurseCount = -1;
    for(const enemy of aliveEnemies()){
      if(enemy.curse > maxCurseCount){
        maxCurseCount = enemy.curse;
        maxCurseEnemy = enemy;
      }
    }
    if(maxCurseEnemy){
      const __pv=relicPassiveCursePerTurn();
      applyCurse(maxCurseEnemy, __pv);
      if(maxCurseCount < 6) log(`咒印道体：对敌人施加 ${__pv} 层诅咒（当前最高 ${maxCurseCount} 层）`);
    }
  }
  aliveEnemies().forEach(e=>{
    if(G.turn===1 && !e.boss && !e.aggressive){ e.intent={type:'dormant'}; }
    else { e.intent=e.intents[e.intentIndex % e.intents.length]; e.intentIndex++; }
  });
  if(G.tutorial && G.tutorial.on && typeof tutOn==='function'){ try{ tutOn('turnStart'); }catch(e){} }
  let n=5; if(G.gouhun>0){ n-=1; log('勾魂：本回合少抽 1 张牌'); } n=Math.max(1,n); if(G.dodgeDraw>0){ n+=G.dodgeDraw; log(`额外摸 ${G.dodgeDraw} 张（上回合效果）`); G.dodgeDraw=0; }
  if(hasRelic('yinyangjing')){ n+=1; log('阴阳镜：多抽 1 张'); }
  if(hasRelic('tongling') && G.turn===1){ n+=2; log('铜铃：战斗开始额外抽 2 张'); }
  if(G.xuejiBonus>0){ n += G.xuejiBonus; log(`血祭：额外摸 ${G.xuejiBonus} 张`); }
  G.xuejiBonus=0; G.xuejiArmed=false; G.xuejiHurt=false;
  log(`—— 第 ${G.turn} 回合 · HP ${G.hp}/${G.maxHp} · 格挡 ${G.block} · 符文 ${G.energy} ——`);
  drawCards(n); render();
  if(G.pendingDiscard>0){ G.pendingDiscard--; enemyRandomDiscard(); }
  if(G.wangyouTurns>0){ G.wangyouTurns--; if(G.hand.length) showWangyouChoice(); else log('忘忧汤翻涌，但你手牌空空，躲过一劫'); }
  saveRun();
}
function mostCursedEnemy(){
  let best=null, mx=-1;
  for(const e of aliveEnemies()){ if((e.curse||0)>mx){ mx=e.curse||0; best=e; } }
  return best;
}
function summonAct(s){
  const types=['zhiren','xiaogui','yinbing','shi_wang'];
  if(!types.includes(s.type)) return;
  duhunBatchBegin();
  const shiWangBonus = (s.type!=='shi_wang' && G.summons.some(x=>x.type==='shi_wang' && x.dur>0)) ? 1 : 0;
  const bleedBonus = G.bleedSummons ? Math.floor((G.hpLostTurn||0)/2)*(G.bleedSummonsBonus||1) : 0;
  const v = s.v + shiWangBonus + bleedBonus;
  if(s.type==='zhiren'){
    if(G.hero==='tianshi'){
      const t=randomAlive();
      if(t){ dealDamageTo(t, v); applyCurse(t, s.up?2:1); }
    } else if(G.hero==='ganshiren'){
      const t=randomAlive(); if(t) dealDamageTo(t, v);
    } else if(G.hero==='wuseng'){
      const t=randomAlive(); if(t) dealDamageTo(t, v);
    } else {
      const t=randomAlive();
      if(t){ dealDamageTo(t, v); const zh=s.healV||2; heal(zh); log(`纸人攻击，恢复 ${zh} 点生命`); }
    }
  }
  else if(s.type==='xiaogui'){
    const t = randomAlive();
    if(t){
      const zb=(G.hero==='tianshi' && (t.curse||0)>0)?(s.up?3:2):0;
      dealDamageTo(t, v + zb);
      if(zb>0) log(`小鬼：目标带【诅咒】，伤害 +${zb}`);
    }
    if(G.hero==='yincha'){ gainRage(1); log('小鬼：获得 1 层【血怒】'); }
  }
  else if(s.type==='yinbing'){
    const t = G.hero==='tianshi' ? (aliveEnemies().find(x=>x.uid===G.ybTarget) || summonTarget(true)) : randomAlive();
    if(t){
      dealDamageTo(t, v);
      if(G.hero==='yincha'){ const yh=s.healV||2; heal(yh); log(`阴兵攻击，为你恢复 ${yh} 点生命`); }
    }
  }
  else if(s.type==='shi_wang'){
    for(const e of aliveEnemies()) dealDamageTo(e, s.v);
    if(hasRelic('yinsidie')){ gainBlock(5); log('阴司牒：尸王攻击后获得 5 点格挡'); }
  }
  duhunBatchEnd();
}
function onSummonDeath(s){
  if(hasRelic('guling')){ const _n=(s.dur0!=null ? s.dur0 : (s.dur||0)); if(_n>0){ playFx('guling_suck', 'player'); heal(_n); log(`骨铃：召唤物消散，恢复 ${_n} 点生命`); } }
  if(G.hero==='ganshiren' && mileClaimed('ganshiren_t2')){ heal(2); log('尸气回流：召唤物消散，额外恢复 2 点生命'); }
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
    if(s.type==='wutong'){ if(!decay) wutongTick(s,true); }
    else summonAct(s);
  }
  if(decay){
    const dying=[];
    for(const s of G.summons){
      if(s.type==='wutong') continue;
      s.dur--; if(s.dur<=0) dying.push(s);
    }
    for(const s of dying) onSummonDeath(s);
    G.summons = G.summons.filter(s=> s.type==='wutong' ? (s.indefinite || s.dur>0) : s.dur>0);
  }
}
function endTurn(){
  if(G.enemyPhase) return;
  if(G.tutorial && G.tutorial.on && ((typeof narrBusy==='function' && narrBusy()) || G.tutorial.force)){ sfx('error'); floatMsg('先听师父的话'); return; }
  if(G.tutorial && G.tutorial.on && typeof tutOn==='function'){ try{ tutOn('endTurn'); }catch(e){} }
  const junks=G.hand.filter(c=>c.type==='junk');
  if(junks.length){
    log(`回合结束，${junks.length} 张【怨气】废牌自动打出`);
    const indices = [];
    for(let i=G.hand.length-1;i>=0;i--){ if(G.hand[i] && G.hand[i].type==='junk') indices.push(i); }
    for(const idx of indices){
      doPlayCard(idx);
    }
    G.hand=G.hand.filter(c=>c.type!=='junk');
  }
  if(G.hp<=0){ G.hp=0; loseGame(); return; }
  if(G.retain>0 && G.hand.length>0){ showEndTurnRetain(); return; }
  finishEndTurn();
}
function showEndTurnRetain(){
  G.retainSelect={ need:Math.min(G.retain, G.hand.length), picked:[] };
  renderRetainSelect();
}
function finishEndTurn(){
  G.gouhun=0;
  autoPlayWulei();
  if(G.battleOver){ return; }
  G.damageDoubleTurn=0;
  const kept=G.hand.filter(c=>c.retain || (G.hero==='ganshiren' && c.id==='shi_wang'));
  const _d0=G.discard.length;
  // 万剑归宗的 0 费副本没打出也不进弃牌堆，直接丢；只加条件不拆这行
  G.discard=G.discard.concat(G.hand.filter(c=>!c.retain && !(G.hero==='ganshiren' && c.id==='shi_wang') && !c.oneShot));
  // 只刷牌堆徽章，别 render，会把弃牌动作抹掉
  refreshPileCounts();
  animDiscardQueued(G.discard.slice(_d0));
  kept.forEach(c=>c.retain=false);
  G.hand=kept;
  aliveEnemies().forEach(e=>{ if(e.curse>0) e.curse=Math.max(0,e.curse-2); });
  runSummonPhase(function(){
  if(G.xuejiArmed){
    let cnt=0;
    if(G.hero==='ganshiren') cnt=G.summonsMadeTurn||0;
    else if(G.hero==='wuseng') cnt=Math.floor((G.blockGainedTurn||0)/5);
    else if(G.hero==='yincha') cnt=Math.floor((G.hpLostTurn||0)/4);
    else cnt=CURSE_THIS_TURN||0;
    G.xuejiBonus=Math.min(4,cnt); G.xuejiArmed=false;
    if(G.xuejiBonus>0) log(`血祭：下回合多摸 ${G.xuejiBonus} 张`);
  }
  if(G.hp<=0){ G.hp=0; loseGame(); return; }
  if(G.weak>0) G.weak--;
  if(G.endBlockKind==='A' && G.block>0){
    const _bk=G.block; const _q=Math.floor(_bk/2)*(G.xiejiaUp?2:1);
    G.block=0; G.endBlockKind=null; G.xiejiaUp=false;
    if(_q>0){ gainShiqi(_q); log(`卸甲生元：${_bk} 点格挡转为 ${_q} 点【尸气】`); floatMsg(`尸气 +${_q}`); }
  }
  enemyAct();
  });
}
function runSummonPhase(next){
  if(!enemyActBeats()){ triggerSummons(true); next(); return; }
  const list=G.summons.filter(s=> s.type!=='wutong' && s.dur>0)
    // 召唤物逐个出手，尸王排最前免得少打一只
    .sort((a,b)=> (b.type==='shi_wang'?1:0) - (a.type==='shi_wang'?1:0));
  if(!list.length){ triggerSummons(true); next(); return; }
  setBattlePhase(true);
  const STEP=200; let i=0;
  const step=function(){
    if(G.hp<=0){ G.hp=0; setBattlePhase(false); loseGame(); return; }
    if(i>=list.length){
      G.summons=G.summons.filter(s=> s.type==='wutong' ? (s.indefinite || s.dur>0) : s.dur>0);
      setBattlePhase(false); next(); return;
    }
    const s=list[i++];
    if(s.dur>0 && G.summons.indexOf(s)>=0){
      summonAct(s);
      s.dur--; if(s.dur<=0) onSummonDeath(s);
      G.summons=G.summons.filter(x=> x.type==='wutong' ? (x.indefinite || x.dur>0) : x.dur>0);
      syncSummonDom();
    }
    setTimeout(step, STEP);
  };
  step();
}
function resolveEndBlock(){
  if(!G.endBlockKind) return;
  const bk=G.block;
  if(bk>0){
    if(G.endBlockKind==='A'){ const q=Math.floor(bk/2); if(q>0){ gainShiqi(q); log(`卸甲生元：${bk} 点格挡转为 ${q} 点【尸气】`); } }
    else if(G.endBlockKind==='C'){ const __hc=G.xiejiaHealCap||99; const __hb2=Math.min(__hc,bk); heal(__hb2); log(`卸甲生元：${bk} 点格挡转为 ${__hb2} 点生命（上限 ${__hc}）`); }
    else if(G.endBlockKind==='D'){
      const want=Math.floor(bk/2);
      const __before=G.block;
      if(want>0){ const re=randomAlive(); if(re){ const __ap=applyCurse(re,want);
        const __ov=Math.max(0, want-__ap);
        // D 列溢出的诅咒结转到下回合，不然金刚符吃不到
        if(__ov>0) G.curseCarryNext=(G.curseCarryNext||0)+__ov;
        log(`卸甲生元：${bk} 点格挡转为 ${want} 层【诅咒】`); } }
      const back=Math.max(0, G.block-__before);
      if(back>0){ G.block=__before; G.pendingBlockStart=(G.pendingBlockStart||0)+back;
        log(`卸甲生元：诅咒溢出 ${back} 层转回格挡（下回合开始生效）`); }
    }
  }
  G.block=Math.max(0, G.block-bk);
  G.endBlockKind=null; G.xiejiaHealCap=0;
}
// boss_vfx 特效表：敌人 key + 意图槽位 映射到特效前缀
const BOSS_VFX = {
  jiangwang:  { multi:'b1_jiangwang_attack_claw', summon:'b1_jiangwang_summon_minion', feed:'b1_jiangwang_drain_feed' },
  hanba:      { multi:'b2_hanba_attack_flame_claw', burn:'b2_hanba_burn_apply', burnTick:'b2_hanba_burn_tick' },
  xueshi:     { multi:'b3_xueshi_attack_claw', charge:'b3_xueshi_charge', heavy:'b3_xueshi_heavy_smash', drain:'b3_xueshi_lifesteal' },
  xiebian:    { multi:'b4_xiebian_attack_staff', gouhun:'b4_xiebian_soul_hook', split:'b4_xiebian_split' },
  bian:       { multi:'b4_xiebian_attack_staff', gouhun:'b4_xiebian_soul_hook' },
  panguanwang:{ multi:'b5_judge_attack_gavel', jiming:'b5_judge_record', qingsuan:'b5_judge_settle' },
  mengpowang: { multi:'b6_mengpo_attack_ladle', wangyou:'b6_mengpo_forget', heal:'b6_mengpo_heal' },
  yewang:      { multi:'b7_yewang_attack_blade', pressure:'b7_yewang_pressure' },
  xiuluowang:  { multi:'b8_xiuluo_attack_slash', backlash:'b8_xiuluo_backlash', karma:'b8_xiuluo_karma_fire' },
  yanluotianzi:{ multi:'b9_yanluo_attack_smash', summon:'b9_yanluo_summon_yinchai', affix:'b9_yanluo_affix', revive:'b9_yanluo_revive' }
};
function bossVfxKey(e, slot){ const m=e && BOSS_VFX[e.key]; return (m && m[slot]) || null; }
function bossSkillFx(e, slot, opt){
  const base=bossVfxKey(e, slot); if(!base) return;
  opt=opt||{};
  sfx(base);
  const el=enemyEl(e);
  const hasCast=!!fxSheet(base+'_cast');
  if(hasCast && el) playFx(base+'_cast', el);
  const fire=function(){ if(e && e.dying) return; if(fxSheet(base+'_hit')) playFx(base+'_hit', opt.hitAnchor||'player'); };
  // _cast 放完 260ms 再放 _hit
  if(hasCast) setTimeout(fire, opt.delay||260); else fire();
}
function bossSelfFx(e, slot){
  const base=bossVfxKey(e, slot); if(!base) return;
  sfx(base);
  const el=enemyEl(e); if(!el) return;
  playFx(base+'_self', el);
}
// 只在真机非流畅模式走节拍，冒烟和流畅模式保持老同步逻辑
function enemyActBeats(){ return animLive() && !(typeof SETTINGS!=='undefined' && SETTINGS.lowSpec); }
function setBattlePhase(on){ G.enemyPhase=!!on; }
// 节拍期不能 render，就地改血条格挡，别用 innerHTML 抹掉图标
function syncBattleHpDom(){
  try{
    const pp=Math.max(0,G.hp/G.maxHp*100);
    const bar=document.querySelector('#player-panel .hpbar');
    if(bar){
      const fs=bar.querySelectorAll('i.hpfill,i.hpghost');
      for(let i=0;i<fs.length;i++){ fs[i].style.width=pp+'%'; fs[i].setAttribute('data-w',pp); }
      bar.classList.toggle('has-block', G.block>0);
    }
    const lab=document.querySelector('#player-panel .pstat-hp .hpnum');
    if(lab) lab.textContent=G.hp+'/'+G.maxHp;
    const stats=document.querySelector('#player-panel .pstats');
    const blk=stats ? stats.querySelector('.pstat-block') : null;
    if(blk){
      const tail=blk.lastChild;
      const v=String(Math.max(0,G.block));
      if(tail && tail.nodeType===3) tail.nodeValue=v;
      else if(tail) tail.textContent=v;
      let pb=0; try{ if(typeof preBlockNextTurn==='function') pb=preBlockNextTurn()||0; }catch(e){}
      blk.classList.toggle('is-empty', !(G.block>0 || pb>0));
    }
    PLAYER_HP_PREV=pp;
    G.enemies.forEach(function(e){
      const el=enemyEl(e); if(!el) return;
      const num=el.querySelector('.stat b');
      if(num) num.textContent=String(Math.max(0,e.hp));
      if(e.hp<=0 || !e.maxHp) return;
      const pct=Math.max(0,e.hp/e.maxHp*100);
      const fs=el.querySelectorAll('.enemyhpbar i.hpfill,.enemyhpbar i.hpghost');
      for(let i=0;i<fs.length;i++){ fs[i].style.width=pct+'%'; fs[i].setAttribute('data-w',pct); }
      ENEMY_HP_PREV[e.uid]=pct;
    });
  }catch(err){}
}
// 召唤物逐拍只轻量同步，结构性变化才整块 render
function syncSummonDom(){
  if(typeof syncBattleHpDom==='function') syncBattleHpDom();
  const list=(G.summons||[]).filter(s=>(s.dur||0)>0);
  const fold=document.querySelector('#player-panel .ps-fold');
  const bar=document.querySelector('#player-panel .psummons');
  if(!list.length || !fold){
    if(typeof render==='function') render();
    else if(typeof renderLogBox==='function') renderLogBox();
    return;
  }
  const lbl=summonFoldLabel(list);
  if(fold.textContent!==lbl) fold.textContent=lbl;
  if(bar) bar.innerHTML=list.map(s=>summonHTML(s)).join('');
  if(typeof renderLogBox==='function') renderLogBox();
}
function enemyActOne(e, atkDly){
  {
    const __atkDly=atkDly||0;
    e.block = e.pingbi||0;
    if(e.affixes){
      const zs=e.affixes.find(a=>a.id==='zaisheng');
      if(zs && e.hp>0){ enemyActAnim(e,'mend',__atkDly); enemyGainHp(e, 4*zs.tier, 'kw_regen'); }
      const gt=e.affixes.find(a=>a.id==='gangti'); if(gt) addEnemyStrength(e, gt.tier);
    }
    if(e.seal){ if(e.sealTurn>1){ e.sealTurn--; } else { e.seal=false; e.sealTurn=0; } log(`${e.name} 被镇魂，无法行动`); }
    else switch(e.intent.type){
      case 'attack': { sfx('enemy_attack'); enemyAttackAnim(e,1,__atkDly); const d=e.intent.v+(e.pendingDamage||0); e.pendingDamage=0; dealDamageToPlayer(d,e); break; }
      case 'charge': enemyActAnim(e,'gather',__atkDly); if(bossVfxKey(e,'charge')){ bossSelfFx(e,'charge'); if(bossVfxKey(e,'heavy')) e.vfxHeavy=true; } else { sfx('enemy_charge'); playFx('charge', enemyEl(e)); } e.pendingDamage=(e.pendingDamage||0)+e.intent.v; log(`${e.name} 蓄力（下回合单体攻击 +${e.intent.v}）`); break;
      case 'block': enemyActAnim(e,'guard',__atkDly); enemyGainBlock(e, e.intent.v); break;
      case 'heal': enemyActAnim(e,'mend',__atkDly); enemyGainHp(e, e.intent.v); break;
      case 'weak': enemyActAnim(e,'cast',__atkDly); sfx('kw_weak'); if(!G.debuffImmune){ G.weak=2; playFx('weak', 'player'); floatMsg('你被【虚弱】'); log(`${e.name} 对你施加【虚弱】`); playerDebuffReceived(); } else log(`佛渡免疫了${e.name}的【虚弱】`); break;
      case 'gouhun': enemyActAnim(e,'cast',__atkDly); if(bossVfxKey(e,'gouhun')) bossSkillFx(e,'gouhun'); else sfx('gouhun'); if(!G.debuffImmune){ G.gouhun=1; if(!bossVfxKey(e,'gouhun')) playFx('gouhun', 'player'); floatMsg('勾魂'); log(`${e.name} 勾魂：你下回合少抽 1 张`); playerDebuffReceived(); } else log(`佛渡免疫了${e.name}的【勾魂】`); break;
      case 'strength': { enemyActAnim(e,'cast',__atkDly); sfx('enemy_strength'); const _sB4=e.strength||0; addEnemyStrength(e, e.intent.v); const _sGot=(e.strength||0)-_sB4; if(_sGot>0) log(`${e.name} 力量 +${_sGot}`); if(e.intent.weak){ const _pvb=bossVfxKey(e,'pressure'); if(_pvb) bossSkillFx(e,'pressure'); else sfx('kw_weak'); if(!G.debuffImmune){ G.weak=2; floatMsg('你被【虚弱】'); log(`${e.name} 暗夜威压：对你施加【虚弱】`); playerDebuffReceived(); } else log(`佛渡免疫了${e.name}的【暗夜威压】`); } if(e.intent.sealHeal){ if(bossVfxKey(e,'heal')) bossSelfFx(e,'heal'); const h=(G.wangyouDrunk||0)*8; if(h>0) enemyGainHp(e, h, 'enemy_heal', '汲取你饮下的忘忧汤，回复'); G.wangyouDrunk=0; } break; }
      // 连击不吃蓄力，也不消耗已存蓄力
      case 'multi': { if(e.vfxHeavy){ e.vfxHeavy=false; bossSkillFx(e,'heavy'); } else bossSkillFx(e,'multi'); enemyAttackAnim(e,e.intent.n||1,__atkDly); for(let i=0;i<e.intent.n;i++){ if(G.hp<=0) break; dealDamageToPlayer(e.intent.v,e,i*140,{multi:true}); } break; }
      case 'discard': enemyActAnim(e,'cast',__atkDly); sfx('enemy_debuff'); if(!G.debuffImmune){ G.pendingDiscard++; playFx('gouhun', 'player'); floatMsg('下回合随机弃 1 张牌'); log(`${e.name} 缠绕你：下回合开始随机弃 1 张牌`); playerDebuffReceived(); } else log(`佛渡免疫了${e.name}的【缠绕】`); break;
      case 'attackBlock': { sfx('enemy_attack'); enemyAttackAnim(e,1,__atkDly); dealDamageToPlayer(e.intent.v,e); if(e.intent.block>0) enemyGainBlock(e, e.intent.block); break; }
      case 'summon': { enemyActAnim(e,'call',__atkDly); const __sv=bossVfxKey(e,'summon'); if(__sv) sfx(__sv); else sfx('enemy_summon'); const uk=e.intent.unit||'xiaojianshi'; const un=ENEMIES[uk].name; let added=0; const __new=[];
                 // 召唤上限按存活数算，尸体不算
                 for(let i=0;i<e.intent.n;i++){ if(aliveEnemies().length>=5) break; const __ne=makeEnemy(ENEMIES[uk], uk); G.enemies.push(__ne); __new.push(__ne); added++; } log(`${e.name} 召唤了 ${added} 只${un}`);
                 const __summonFx=function(){ const __t=__new.length?__new[__new.length-1]:null; const __el=__t?enemyEl(__t):null; const __sa=bottomAnchor(__el)||'field';
                   if(__sv) playFx(__sv+'_self', __sa); else playFx('jiangshi', __sa); };
                 if(animLive()) setTimeout(__summonFx,0); else __summonFx(); break; }
      case 'aoe': { enemyAttackAnim(e,1,__atkDly); dealDamageToPlayer(e.intent.v,e); if(G.summons.length){ G.summons.shift(); log(`${e.name} 的幽冥之气驱散了一个召唤单位`); } break; }
      case 'burn': { enemyActAnim(e,'cast',__atkDly); const _bvb=bossVfxKey(e,'burn'); if(_bvb) bossSkillFx(e,'burn'); else sfx('enemy_debuff'); if(!G.debuffImmune){ G.burn=(G.burn||0)+e.intent.v; if(!_bvb) playFx('burn', 'player'); floatMsg(`灼烧 +${e.intent.v}`); log(`${e.name} 对你施加灼烧（每回合 -${e.intent.v*2} 生命，可叠加）`); playerDebuffReceived(); } else log(`佛渡免疫了${e.name}的【灼烧】`); break; }
      case 'jiming': { enemyActAnim(e,'rite',__atkDly); if(bossVfxKey(e,'jiming')) bossSkillFx(e,'jiming'); else sfx('boss_ledger'); e.ledgerActive=true; e.ledgerDmg=0; const avail=AFFIXES.filter(a=>!(e.affixes||[]).some(x=>x.id===a.id)); if(avail.length){ const a=avail[Math.floor(rng()*avail.length)]; e.ledgerAffix={id:a.id, tier:1}; log(`${e.name} 记下你的名字，并记下一条罪状【${a.name}】`); } else { e.ledgerAffix=null; log(`${e.name} 记下你的名字（罪状已记满）`); } floatMsg('生死簿 · 记名'); break; }
      case 'qingsuan': { enemyActAnim(e,'rite',__atkDly); if(bossVfxKey(e,'qingsuan')) bossSkillFx(e,'qingsuan'); else sfx('enemy_qingsuan'); const ledger=e.ledgerDmg||0; const dmg=Math.min(24, Math.floor(ledger*0.3)); if(e.ledgerAffix){ const a=AFFIXES.find(x=>x.id===e.ledgerAffix.id); if(a){ if(!e.affixes) e.affixes=[]; e.affixes.push({id:a.id, tier:1}); if(a.id==='pingbi'){ e.pingbi=(e.pingbi||0)+8; enemyGainBlock(e, 8); } log(`${e.name} 清算：【${a.name}】生效——${a.desc}`); } } e.ledgerActive=false; e.ledgerDmg=0; e.ledgerAffix=null; if(dmg>0){ floatMsg('生死簿 · 清算'); const dead=directDamage(dmg, `${e.name} 清算生死簿：反弹 ${dmg} 点伤害`); if(dead) return 'dead';                                                                    } else log(`${e.name} 翻开生死簿：无账可清`); break; }
      case 'yehuo': { enemyActAnim(e,'cast',__atkDly); const _kvb=bossVfxKey(e,'karma'); if(_kvb) bossSelfFx(e,'karma'); else sfx('boss_yehuo'); if(!G.debuffImmune){ G.karmaFire=2; if(!_kvb) playFx('yehuo', 'player'); floatMsg('业火附体'); log(`${e.name} 业火附体：接下来 2 回合，你对它伤害 -30%，每次造成伤害反噬 1 点生命，它受到的诅咒层数翻倍`); playerDebuffReceived(); } else log(`佛渡免疫了${e.name}的【业火】`); break; }
      case 'wangyou': enemyActAnim(e,'cast',__atkDly); if(bossVfxKey(e,'wangyou')) bossSkillFx(e,'wangyou'); else { sfx('wangyou'); playFx('wangyou', playerBottomAnchor()||'player'); } G.wangyouTurns=2; G.wangyouDrunk=0; floatMsg('忘忧 · 两回合'); log(`${e.name} 奉上忘忧汤：接下来两回合，每回合开始时可选 1 张手牌「饮下」弃置，否则受 8 点真实伤害`); playerDebuffReceived(); break;
      case 'dormant': sfx('enemy_dormant'); log(`${e.name} 在观望`); break;
    }
    // 一次魅惑管一整次行动，行动完才扣一层
    if(e.charmUsed){ e.charmUsed=false; e.charm--; if(e.charm<=0){ e.charm=0; e.charmPct=0.5; } }
  }
}
function enemyActTail(){
  if((G.zombieDmg||0)>0){ const jw=G.enemies.find(en=>en.key==='jiangwang' && en.hp>0); if(jw){ const heal=Math.floor(G.zombieDmg/2); enemyActAnim(jw,'mend',0); if(bossVfxKey(jw,'feed')){ const __z=G.enemies.find(en=>en.key==='xiaojianshi' && en.hp>0); bossSkillFx(jw,'feed',{hitAnchor:(__z&&enemyEl(__z))||'player'}); } enemyGainHp(jw, heal, 'enemy_heal', '吸食小僵尸的血气，回复'); } G.zombieDmg=0; }
  if(aliveEnemies().length===0){ winFight(); return; }
  if(G.hero==='wuseng' && !(G.xiejia>0)) G.block = Math.min(relicBlockKeep(), G.block);
  if(G.xiejia>0){ G.xiejia--; if(G.xiejia===0 && G.block>0){ const h=G.block; G.block=0; heal(h); floatMsg(`卸甲生元 · 格挡化血 +${h}`); log(`卸甲生元：${h} 点格挡转化为生命`); } }
  resolveEndBlock();
  logTurnSummary();
  startTurn();
}
function enemyAct(){
  const ATK_STEP=260;
  // panel 是 row-reverse，屏幕左到右就是 G.enemies 逆序
  const actingEnemies = aliveEnemies().slice().reverse();
  if(!enemyActBeats()){
    let atkIdx=0;
    for(const e of actingEnemies){
      const r=enemyActOne(e, (atkIdx++)*ATK_STEP);
      if(r==='dead') return;
      if(G.hp<=0){ G.hp=0; loseGame(); return; }
      if(aliveEnemies().length===0){ winFight(); return; }
    }
    enemyActTail();
    return;
  }
  const BEAT=620;
  setBattlePhase(true);
  let idx=0;
  const step=function(){
    if(G.hp<=0){ G.hp=0; setBattlePhase(false); loseGame(); return; }
    if(aliveEnemies().length===0){ setBattlePhase(false); winFight(); return; }
    let e=null;
    while(idx<actingEnemies.length){ const c=actingEnemies[idx++]; if(c.hp>0){ e=c; break; } }
    if(!e){ setBattlePhase(false); enemyActTail(); return; }
    const r=enemyActOne(e, 0);
    syncBattleHpDom();
    if(r==='dead'){ setBattlePhase(false); return; }
    if(G.hp<=0){ G.hp=0; setBattlePhase(false); loseGame(); return; }
    if(aliveEnemies().length===0){ setBattlePhase(false); winFight(); return; }
    setTimeout(step, BEAT);
  };
  step();
}

function logTurnSummary(){
  const s=G.turnStats;
  const parts=[];
  if(s.daoxin) parts.push(`<b>道心破碎</b>（挡下致命伤，保留 1 点生命）`);
  if(s.dmgTaken>0||s.blocked>0) parts.push(`你受伤 <b>${s.dmgTaken}</b>${s.blocked>0?`（格挡抵消 ${s.blocked}）`:''}`);
  if(s.dealt>0) parts.push(`对敌造成 ${s.dealt} 点伤害`);
  if(s.kills.length) parts.push(`击败 ${s.kills.join('、')}`);
  G.turnSummary = `第 ${G.turn} 回合结束` + (parts.length ? '：' + parts.join(' · ') : '');
  log(`—— 第 ${G.turn} 回合结束 ${parts.join(' · ')} ——`);
}

function playCard(i){
  if(G.enemyPhase) return;
  const c=G.hand[i]; if(!c) return;
  if(G.tutorial && G.tutorial.on && G.tutorial.force && c.id!==G.tutorial.force){ sfx('error'); floatMsg('先听师父的话'); shakeCard(i); return; }
  if(G.tutorial && G.tutorial.on && typeof narrBusy==='function' && narrBusy() && c.id!==G.tutorial.force){ sfx('error'); floatMsg('先听师父的话'); shakeCard(i); return; }
  if(c.sealed>0){ floatMsg('【'+c.name+'】被忘忧封印'); log('这张牌被忘忧封印，无法打出'); return; }
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
  if(c.id==='yiwu' && G.hand.length<=1){ sfx('error'); floatMsg('没有可交换的手牌'); shakeCard(i); return; }
  if(c.id==='yiwu' && G.drawPile.length===0 && G.discard.length===0){ sfx('error'); floatMsg('牌堆与弃牌堆皆空，无牌可换入'); shakeCard(i); return; }
  doPlayCard(i);
}
function confirmPlayCard(i){ hideOverlay(); doPlayCard(i); }
function doPlayCard(i){
  const c=G.hand[i]; if(!c) return;
  if(G.tutorial && G.tutorial.on && G.tutorial.force && c.id===G.tutorial.force){
    G.tutorial.force=null;
    if(typeof narrateHide==='function') narrateHide();
    if(typeof tutOn==='function'){ try{ tutOn('playedForce', c); }catch(e){} }
  }
  const cost=effectiveCost(c);
  const exNow = isOneUse(c);
  const wasSkill = (c.type==='skill');
  const prevSkillsPlayed = G.skillsPlayedThisTurn || 0;
  const prevBuff=G.attackBuff;

  G.energy-=cost; G.hand.splice(i,1);
  notePlayRect(i);
  if(wasSkill) G.skillsPlayedThisTurn=prevSkillsPlayed+1;

  const xuenuBonus = 0;

  G.attackBuff=(c.type==='attack' && hasRelic('zhushabi'))?3:0;
  if(c.type!=='junk'){
    if(exNow){ (G.exhausted=G.exhausted||[]).push(c); log(`【${c.name}】已消耗（本关不再出现，战斗结束后回归牌库）`); }
    // 0 费副本用掉即消失，不进弃牌堆也不进 exhausted
    else if(c.oneShot){                  }
    else if(c.id==='shi_wang' && G.hero==='ganshiren'){                                           }
    else G.discard.push(c);
  }
  sfx('card'); if(exNow) sfx('card_exhaust');
  const __cs=cardSfxFor(c); if(__cs) sfx(__cs);
  cardPlayFx(c);
  if(c.type==='attack') heroAnim('attack');
  log(`打出【${c.name}】${c.up?'（升级）':''}`);
  if(c.costCutTurn){ c.costCutTurn=0; log('守一：此牌的费用减免已生效'); }
  const __stealPending = !!G.zhouhunSteal;
  if(G.hero==='wuseng' && G.zhouhunSteal && c.type==='attack'){ G.stealWatch=true; G.stealAccum=0; }
  duhunBatchBegin();
  cardPlayWindow=true; G._playCardId=c.id;
  const effResult = c.eff(c.up, c, xuenuBonus, i);
  cardPlayWindow=false; G._playCardId=null;
  duhunBatchEnd();
  if(G.stealWatch){
    G.stealWatch=false; const __sh=G.stealAccum||0; G.stealAccum=0; G.zhouhunSteal=0;
    if(__sh>0){ heal(__sh); floatMsg('咒魂吸血 +'+__sh); log(`咒印：吸血回复 ${__sh} 点生命`); }
    else log('咒印：这张攻击牌没有造成伤害');
  }
  // eff 返回 false 就当打出失败，费用手牌弃牌全回退
  if(effResult===false){
    if(__stealPending) G.zhouhunSteal=1;
    G.energy += cost;
    G.hand.splice(i,0,c);
    if(c.type!=='junk'){
      if(exNow){
        const ei=(G.exhausted||[]).lastIndexOf(c); if(ei>=0) G.exhausted.splice(ei,1);
      } else {
        const di = G.discard.lastIndexOf(c); if(di>=0) G.discard.splice(di,1);
      }
    }
    if(wasSkill) G.skillsPlayedThisTurn = Math.max(0, prevSkillsPlayed);
    G.attackBuff = prevBuff;
    floatMsg('打出失败'); log(`打出【${c.name}】失败，已回退`);
    render();
    return;
  }
  if(c.type==='junk'){ G.junkPlayedThisTurn=(G.junkPlayedThisTurn||0)+1; }
  if(G.ranhunType && !(G.ranhunSelf && G.ranhunSelf===c)){
    const mt = G.ranhunType==='ghost' ? isGhostCard(c) : (c.type===G.ranhunType);
    if(mt){ const rh=(G.ranhunHeal!=null?G.ranhunHeal:2); heal(rh); floatMsg('+'+rh+' 生命'); log(`燃魂：打出【${c.name}】，恢复 ${rh} 点生命`); }
  }
  if(c.id==='shi_wang' && G.hero==='ganshiren'){ G.shiWangCard=c; }
  if(c.type==='attack' && hasRelic('shehunling')){ heal(3); log('摄魂铃：回复 3 点生命'); }
  G.attackBuff=prevBuff;
  if(G.hp<=0){ G.hp=0; loseGame(); return; }
  if(aliveEnemies().length===0){ winFight(); return; }
  render();
  saveRun();
}
