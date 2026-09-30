/* ============================================================================
 * 志怪塔 · js/40_flow.js —— 局内流程层
 * 胜负结算 winFight·loseGame / startBattle / 节点推进 / 本局存档 / 排行榜
 * ----------------------------------------------------------------------------
 * 由 原型.html 的整段内联脚本按原顺序切分而来（v0.61.05 三层重构，纯搬移）。
 * 拼接校验：本文件组去掉各自横幅后，应与切分前的内联脚本正文逐字节一致。
 * 加载：经典外链脚本（非 ES module），双击本地打开即可直接游玩。
 * ============================================================================ */
/* ===================== 流程推进 ===================== */
function winFight(){
  if(G.battleOver) return; // v0.61 B4：重入守卫 —— 一场战斗只结算一次胜利
  G.battleOver=true;
  sfx('win');
  HITFX.enemies.clear();
  log('击败了所有敌人！');
  if(G.shiWangCard) returnShiWangCard(); // 尸王：战斗结束消散，牌回到弃牌堆
  if(G.exhausted && G.exhausted.length){ const _n=G.exhausted.length; G.exhausted=[]; log(`本关结束，${_n} 张消耗牌回归牌库`); }
  track('battleWin');
  const hasElite=G.enemies.some(e=>e.elite);
  const isBoss=G.enemies.some(e=>e.boss);
  if(hasElite){ const p=randomPotion(); G.potions.push(p); log(`击败精英，获得灵汁【${p.name}】`); }
  G.finalBoss = isBoss && G.act>=ACTS.length && !G.endless;
  // v0.61.10(P7)：战后金币 3/6/9 → 4/8/12（普通/精英/Boss）。Boss 血量与篝火密度均不动。
  let g=4; if(hasElite) g=8; if(isBoss) g=12;
  if(hasRelic('jubaopen')) g=Math.floor(g*1.5);
  G.gold+=g; log(`获得 ${g} 金币`);
  const hpLost = Math.max(0, G.battleStartHp - G.hp);
  if(hpLost===0) unlockAchievement('wushang');
  if(G.energy===0) unlockAchievement('lingfu');
  if(isBoss) unlockAchievement('tushen');
  let h=0;
  if(!G.finalBoss){
    h=8;
    if(isBoss){ h=Math.floor(G.maxHp*0.5); G.hp=Math.min(G.maxHp, G.hp+h); log(`击败 Boss，汲取妖气恢复 ${h} 点生命（50%）`); }
    else { G.hp=Math.min(G.maxHp,G.hp+h); log(`战后恢复 ${h} 点生命`); }
    if(hasElite && hasRelic('baiguilu')){ G.maxHp+=5; G.hp=Math.min(G.maxHp,G.hp+5); log('百鬼录：击败精英，最大生命 +5'); }
    if(hasRelic('fanhunxiang')){ G.hp=Math.min(G.maxHp, G.hp+10); log('返魂香：战后额外恢复 10 点生命'); }
  }
  G.pendingRelic = hasElite || isBoss;
  G.rewardTier = isBoss?'boss':hasElite?'elite':'normal';
  G.lastGold=g; G.battleGold=g; G.goldDoubled=false;
  G.battleResult={g, hpLost, h, isBoss, finalBoss:G.finalBoss};
  showBattleResult(G.battleResult);
}
function showBattleResult(r){
  const names=G.enemies.map(e=>e.name).join('、');
  const healTxt = r.h ? `恢复 <b style="color:var(--green)">+${r.h}</b> 生命${r.isBoss?'（50%）':''}` : '';
  const doubleBtn = (!G.goldDoubled && r.g>0) ? `<button class="btn" onclick="doubleGold()">看广告 · 金币翻倍（再 +${r.g}）</button>` : '';
  showOverlay(`<h2>战 斗 结 算</h2>
    <p>击败 <b>${names}</b><br>
    获得金币 <b style="color:var(--gold)">+${G.battleGold}</b> · 本场耗血 <b style="color:var(--red)">${r.hpLost}</b>${healTxt?` · ${healTxt}`:''}</p>
    <p style="font-size:14px">当前生命 <b>${G.hp}</b> / ${G.maxHp}</p>
    ${doubleBtn}
    <button class="btn" onclick="continueAfterBattle()">继续</button>`);
}
function doubleGold(){
  const r=G.battleResult; if(!r || G.goldDoubled) return;
  adPlaceholder('奖励翻倍', ()=>{ G.gold+=G.lastGold; G.battleGold+=G.lastGold; G.goldDoubled=true; showBattleResult(G.battleResult); });
}
function continueAfterBattle(){
  hideOverlay();
  if(G.finalBoss){ advanceAct(); return; }
  if(G.battleResult && G.battleResult.isBoss){ showBossReward(); return; }
  showReward();
}
function showBossReward(){
  G.rewardTier = null; // v0.61 B5：Boss 奖励是遗物/灵汁/锻造、不产卡 —— 就地清空 tier，别让「boss」泄漏到下一场商店的稀有度表
  const relic=weightedRelic();
  if(!hasRelic(relic.id)) G.relics.push(relic.id);
  const potion=randomPotion(); G.potions.push(potion);
  log(`击败幕主，获得遗物【${relic.name}】和灵汁【${potion.name}】`);
  showOverlay(`<h2>Boss 战利品</h2><p>你击败了幕主，收获丰厚：</p>
    <div class="reward-cards">
      <div class="relic ${RCOLOR[relic.rarity]}">${relicIcon(relic)}<div class="cname">${relic.name}</div><div class="cdesc">${relic.desc}</div><div class="ctype">遗物</div></div>
      <div class="relic r-blue">${potionIcon(potion)}<div class="cname">${potion.name}</div><div class="cdesc">${potion.desc}</div><div class="ctype">灵汁</div></div>
    </div>
    <button class="btn" onclick="hideOverlay(); showForgePicker('boss');">锻造（升级一张牌）</button>
    <button class="btn ghost" onclick="hideOverlay(); goNext();">继续前进</button>`);
}
function goNext(){
  /* v0.61.42：记下**刚打通的这条边**，交给随后的 showMap → drawMapLinks 做一次
     「淡黄色浅浅的光边沿着路径延长过去」的动画。必须在本行之前取 —— G.mapPath 的最后两项
     正是「上一层那格 → 刚清掉的这格」。唯一的推进出口就是这里（全仓只有这一处 G.mapRow++），
     所以其它入口（重开地图 / 续档 / 换幕 / resize）都不会误放动画。 */
  const __p=G.mapPath||[];
  _mapGlowEdge = (__p.length>=2)
    ? mapEdgeKey(__p[__p.length-2].r, __p[__p.length-2].c, __p[__p.length-1].r, __p[__p.length-1].c)
    : null;
  G.mapRow++;
  /* v0.62.0：告诉随后的 showMap「相机是从哪一行跟上来的」= G.mapRow-1（刚清掉的那一层）。
     于是相机只往上走一行（600ms ease-out），不会回地图顶部、也不重播进场动画。
     与上面的 _mapGlowEdge 一样是**一次性**标记：showMap 用过就清，
     所以重开地图 / 续档 / 换幕 / resize 都不会误放动画。 */
  _mapStepFrom=G.mapRow-1;
  if(G.endless) G.endlessFloor++;
  G.shopWares=null;
  if(G.mapRow>=MAP.length){ advanceAct(); return; }
  showMap();
}
function advanceAct(){
  if(G.endless){ nextEndlessLap(); return; }
  if(G.act>=ACTS.length){ showVictory(); return; }
  G.act++;
  MAP=ACTS[G.act-1];
  G.mapRow=0; G.mapCol=-1; G.mapPath=[]; G.shopWares=null;
  showOverlay(`<h2>第 ${G.act} 幕 · ${ACT_NAMES[G.act-1]}</h2><p>更凶的妖魔盘踞在更高层。<br>敌人的生命与攻击都变强了。</p><button class="btn" onclick="hideOverlay(); showMap({entry:true});">开始攀登</button>`);
}
function nextEndlessLap(){
  sfx('ui_endless');   // v0.61.32：无尽进入下一层的过渡音
  MAP=genEndlessMap();
  G.mapRow=0; G.mapCol=-1; G.mapPath=[]; G.shopWares=null;
  showOverlay(`<h2>第 ${G.endlessFloor} 层 · 镇妖塔</h2><p>塔身继续向上延伸，妖魔愈发凶戾。<br>敌人属性与词缀随层数继续攀升。</p><button class="btn" onclick="hideOverlay(); showMap({entry:true});">继续攀登</button>`);
}
function calcScore(){
  const kills=G.totalKills||0;
  if(G.endless) return G.endlessFloor*100 + Math.max(0,G.hp)*20 + kills*10 + G.gold*10;
  return G.act*1000 + G.mapRow*50 + Math.max(0,G.hp)*20 + kills*8 + G.gold*10 + G.potions.length*100;
}
function submitScore(score, act){
  if(!SAVE.highScores) SAVE.highScores=[];
  const wk=weekKey();
  SAVE.highScores=SAVE.highScores.filter(h=>h.week===wk); // 周榜：每周一重置
  SAVE.highScores.push({score, act:act!=null?act:(G?G.act:1), mode:G&&G.endless?'endless':'normal', floor:G&&G.endless?G.endlessFloor:0, week:wk, date:todayStr()});
  SAVE.highScores.sort((a,b)=>b.score-a.score);
  SAVE.highScores=SAVE.highScores.slice(0,10);
  persistSave();
}
function loseGame(){
  if(G.dead) return; // 防止重复结算（多张怨气/连续判定）
  G.dead=true; G.battleOver=true; // v0.61 B4：胜负旗标统一收口
  sfx('lose');
  track('death');
  G.score=calcScore();
  /* v0.74.0：失败专用整屏背景。三个出口各有归属 —— revive() 显式把战斗背景铺回去
     （**它原先根本不调 setBg，这一句是本次必须补的**，否则复活后背后仍是那张败局图）；
     giveUp() 保留这张图（「本局结束」本来就还是败局，观感一致）；showStartScreen() 走 setBg('menu')。 */
  setBg('defeat.jpg');
  const where = G.endless ? `镇妖塔 · 第 ${G.endlessFloor} 层` : `第 ${G.act} 幕 · 第 ${G.mapRow+1} 层`;
  const reviveBtn = G.revivedFree
    ? `<button class="btn" onclick="reviveAd()">看广告 · 复活回满血继续</button>`
    : `<button class="btn" onclick="reviveFree()">免费复活 · 回满血继续</button>`;
  showOverlay(`<h2>妖气侵蚀了你</h2><p>你被击败了。<br>运气和牌组都还差一点。</p>
    <p style="color:var(--gold)">当前得分 <b>${G.score}</b>　（${where} · 击杀 ${G.totalKills||0} · 金币 ${G.gold}）</p>
    ${reviveBtn}
    <button class="btn ghost" onclick="giveUp()">放弃 · 结束本局</button>`);
}
function giveUp(){
  const sc=G.score||calcScore();
  submitScore(sc);
  clearRunSave();
  const where = G.endless ? `镇妖塔 · 第 ${G.endlessFloor} 层` : `第 ${G.act} 幕`;
  showOverlay(`<h2>本局结束</h2><p style="color:var(--gold)">最终得分 <b>${sc}</b></p><p>已记入周榜（${where}）。</p><button class="btn" onclick="showStartScreen()">返回主菜单</button>`);
}
function revive(){
  G.dead=false;
  /* v0.61.30 修：复活回到的是**同一场战斗**，必须把 B4 的终局旗标一起清掉。
     否则 battleOver 恒为 true → 之后打死最后一个敌人时 winFight() 在重入守卫处直接 return，
     战斗永远不结算，表现为「敌人已清」但界面卡死。 */
  G.battleOver=false;
  G.hp=G.maxHp; G.weak=0; G.gouhun=0; G.thorns=0; G.block=0; G.burn=0;
  G.discard=G.discard.concat(G.hand); G.hand=[];
  /* v0.74.0：复活回的是**同一场战斗** ⇒ 必须把战斗背景铺回去（失败屏刚把它换成了 bg_defeat）。
     漏掉这一句的表现是「血回满了、顶栏回来了，可背后还是那张败局图」，而且没有任何闸会响。
     表达式与 startBattle 里那一行逐字相同（无尽档是 act3）—— 别写成两个不同的判法。 */
  hideOverlay(); setBg(G.endless?'act3':'act'+G.act); sfx('heal');
  log('你复活了，重整旗鼓再战');
  startTurn();
}
function reviveFree(){
  if(G.revivedFree) return;
  G.revivedFree=true; track('revive');
  floatMsg('复活 · 回满血');
  revive();
}
function reviveAd(){
  adPlaceholder('复活', ()=>{ track('revive'); revive(); });
}
function showVictory(){
  sfx('win');
  track('runWin');
  G.score=calcScore()+5000; submitScore(G.score);
  SAVE.endlessUnlocked=true; persistSave(); // 三幕通关解锁镇妖塔无尽模式
  /* v0.74.0：通关专用整屏背景。恢复不用单独写 —— 两个出口 startEndless() 与 startGame()
     都经 showHeroSelect()→setBg('hero_select.jpg')，中途回主菜单则由 setBg('menu') 接管。 */
  setBg('victory.jpg');
  showOverlay(`<h2>通 关 ！</h2><p>你一路打上了塔顶，镇服了百鬼。<br>剩余生命 ${G.hp} / ${G.maxHp}。</p>
    <p style="color:var(--gold)">本局得分 <b>${G.score}</b>（含通关加成 +5000）　（第 ${G.act} 幕 · 击杀 ${G.totalKills||0} · 金币 ${G.gold}）</p>
    <p style="font-size:13px;color:var(--dim)">镇妖塔已开启——无尽攀爬，层数越高妖魔越凶，冲击周榜。</p>
    <button class="btn ghost" onclick="startEndless()">进入镇妖塔 · 无尽模式</button>
    <button class="btn" onclick="startGame()">再打一局</button>`);
}

/* ===================== 本局存档 + 排行榜 ===================== */
const RUN_KEY='zhiguaitower_run_v1';
/* —— 断点续玩：全场景实时存档（战斗/篝火/商店/地图） —— */
let SCENE='menu';
/* v0.75.0：oneShot（万剑归宗的 0 费一次性副本）必须**往返存档**。
   不给每张牌都加字段 —— 快照形状被别的闸盯着，且会白白抬高所有存档的体积。
   只给副本带上：没这一条，战斗中途存档再续档会把副本洗成一张 3 费的普通万剑归宗
   （cardRestore 用 cardById 重建，cost:0 与一次性一起丢）。 */
function cardSnap(c){
  const d={id:c.id, up:!!c.up, sealed:c.sealed||0};
  if(c.oneShot) d.oneShot=1;
  return d;
}
function cardRestore(d){ const c=cardById(d.id); c.up=!!d.up; c.sealed=d.sealed||0;
  if(d.oneShot) Object.assign(c, {cost:0, costU:null, oneShot:true});   // 0 费是副本的定义之一，一起复原
  return c; }
function potionSnap(p){ return p.id; }
function potionRestore(id){ const p=POTIONS.find(x=>x.id===id); return p?{...p}:null; }
function serializeEnemy(e){
  return { key:e.key, hp:e.hp, maxHp:e.maxHp, block:e.block, pingbi:e.pingbi||0, curse:e.curse||0, charm:e.charm||0, charmPct:e.charmPct||0.5, sealedEver:!!e.sealedEver, seal:!!e.seal, sealTurn:e.sealTurn||0, strength:e.strength||0, pendingDamage:e.pendingDamage||0, intentIndex:e.intentIndex||0, intent:e.intent||{type:'dormant'}, phase2:!!e.phase2, ledgerActive:!!e.ledgerActive, ledgerDmg:e.ledgerDmg||0, ledgerAffix:e.ledgerAffix||null, splitDone:!!e.splitDone, sealedCost:e.sealedCost||0, affixes:e.affixes||[] };
}
function restoreEnemy(d){
  const def=ENEMIES[d.key]; if(!def) return null;
  const e=makeEnemy(def, d.key);
  e.hp=d.hp; e.maxHp=d.maxHp; e.block=d.block; e.pingbi=d.pingbi; e.curse=d.curse; e.charm=d.charm; e.charmPct=d.charmPct||0.5; e.sealedEver=!!d.sealedEver; e.seal=d.seal; e.sealTurn=d.sealTurn||0; e.strength=d.strength; e.pendingDamage=d.pendingDamage; e.intentIndex=d.intentIndex; e.intent=d.intent; e.phase2=d.phase2; e.ledgerActive=d.ledgerActive; e.ledgerDmg=d.ledgerDmg; e.ledgerAffix=d.ledgerAffix; e.splitDone=d.splitDone; e.sealedCost=d.sealedCost; e.affixes=d.affixes;
  return e;
}
function saveRun(scene){
  if(!G || G.endless) return; // 无尽模式不落档
  const s=scene || SCENE || 'map';
  const data={
    v:3, scene:s,               // v3：新增 mapSeed（地图随机化的复现依据）
    act:G.act, mapRow:G.mapRow, mapCol:G.mapCol, mapPath:(G.mapPath||[]).slice(),
    mapSeed:G.mapSeed||0,
    hero:G.hero, hp:G.hp, maxHp:G.maxHp, gold:G.gold, energy:G.energy, block:G.block,
    deck:G.deck.map(cardSnap), hand:G.hand.map(cardSnap), drawPile:G.drawPile.map(cardSnap), discard:G.discard.map(cardSnap),
    enemies:G.enemies.map(serializeEnemy), target:G.target, turn:G.turn, battleStartHp:G.battleStartHp,
    summons:G.summons.map(x=>({type:x.type, v:x.v, dur:x.dur, healV:x.healV, up:x.up})),
    shiWangOut: !!G.shiWangCard,
    exhaustedIdx:(G.exhausted||[]).map(c=>G.deck.indexOf(c)).filter(i=>i>=0),
    weak:G.weak||0, gouhun:G.gouhun||0, thorns:G.thorns||0, burn:G.burn||0, dodge:G.dodge||0, debuffImmune:G.debuffImmune||0,
    pendingEnergy:G.pendingEnergy||0, pendingDiscard:G.pendingDiscard||0,
    turnAtkBuff:G.turnAtkBuff||0, karmaFire:G.karmaFire||0, bloodPact:G.bloodPact||0, retain:G.retain||0, xiejia:G.xiejia||0,
    shiqi:G.尸气||0, xuenu:G.xuenu||0, xisuiTurns:G.xisuiTurns||0, xisuiShiqi:G.xisuiShiqi||0,
    duhun:G.duhun||null, xuejiBonus:G.xuejiBonus||0, turnStats:G.turnStats||null,
    totalHpLost:G.totalHpLost||0, totalKills:G.totalKills||0, score:calcScore(),
    relics:G.relics||[], potions:(G.potions||[]).map(potionSnap),
    removeCount:G.removeCount||0, shopMarkup:G.shopMarkup||0, potionBought:G.potionBought||0,
    shopWares:G.shopWares?G.shopWares.map(cardSnap):null,
    shopPotions:G.shopPotions?G.shopPotions.map(potionSnap):null,
    campRemoved:!!G.campRemoved, campActed:!!G.campActed,
    wangyouTurns:G.wangyouTurns||0, wangyouDrunk:G.wangyouDrunk||0,
    log:G.log||[],
    rng:rngSnapshot()            // v0.61.06：随机态随存档落盘，续档后牌序/掉落可复现
  };
  try{ Store.setJSON(RUN_KEY, data); }catch(e){}
}
function hasRunSave(){ try{ return !!Store.get(RUN_KEY); }catch(e){ return false; } }
function readRun(){ try{ return Store.getJSON(RUN_KEY); }catch(e){ return null; } }
function clearRunSave(){ try{ Store.del(RUN_KEY); }catch(e){} }
function continueRun(){
  let d; try{ d=Store.getJSON(RUN_KEY); }catch(e){}
  if(!d){ floatMsg('没有可继续的进度'); return; }
  G=newState();
  rngRestore(d.rng);          // v0.61.06：先恢复随机态，再重放后续判定
  G.act=d.act; G.mapRow=d.mapRow; G.mapCol=d.mapCol; G.mapPath=Array.isArray(d.mapPath)?d.mapPath:[]; G.hero=d.hero; // 老存档没 mapPath → 空数组，连线退化成只有「可达」
  // v0.61.39 修 bug：G.hp/G.maxHp/G.gold 原先写在同一行末尾，被上面那句 `//` 注释整段吞掉，
  //             导致续档后三项回落到 newState() 的默认值（生命 60、金币 0）。
  G.hp=d.hp; G.maxHp=d.maxHp; G.gold=d.gold;
  G.energy=d.energy!=null?d.energy:3; G.block=d.block||0;
  // v0.61.40：地图改为随机树状图 → 由存档里的 mapSeed 复现整张三幕图（MAP 一律不落盘）。
  // 旧档（v<=2）没有种子：铸一个，并把「上一层列号 / 已走路径」降级清空 —— 旧图的列号对新图毫无意义，
  // 清空后 mapReachable 走「整层可选」分支 ⇒ 不丢进度、不软锁、不崩，只失去路径装饰线与上一层列语义。
  var __isNewSave = (d.v>=3);
  if(__isNewSave){ G.mapSeed=(d.mapSeed>>>0)||1; }
  else { G.mapSeed=((((d.rng&&d.rng.s)||0)>>>0) || (rngSeedNow()>>>0) || 1); G.mapCol=-1; G.mapPath=[]; }
  buildActs(G.mapSeed);
  if(!(G.mapRow>=0 && G.mapRow<MAP.length)) G.mapRow=Math.max(0, Math.min(G.mapRow||0, MAP.length-1));
  G.deck=(d.deck||[]).map(cardRestore);
  G.hand=(d.hand||[]).map(cardRestore);
  G.drawPile=(d.drawPile||[]).map(cardRestore);
  G.discard=(d.discard||[]).map(cardRestore);
  G.relics=d.relics||[]; G.potions=(d.potions||[]).map(potionRestore).filter(Boolean);
  G.totalKills=d.totalKills||0; G.score=d.score||0; G.removeCount=d.removeCount||0;
  G.shopMarkup=d.shopMarkup||0; G.potionBought=d.potionBought||0;
  G.shopWares=d.shopWares?d.shopWares.map(cardRestore):null;
  G.shopPotions=d.shopPotions?d.shopPotions.map(potionRestore).filter(Boolean):null;
  G.campRemoved=!!d.campRemoved; G.campActed=!!d.campActed;
  G.target=d.target||0; G.turn=d.turn||0; G.battleStartHp=d.battleStartHp||G.hp;
  G.summons=(d.summons||[]).map(x=>({type:x.type, v:x.v, dur:x.dur, healV:x.healV, up:x.up}));
  // 尸王：召唤存活期间此牌处于“脱离牌库”态——读档后重新挂钩（G.deck 主清单恒含它）
  if(d.shiWangOut && G.summons.some(x=>x.type==='shi_wang' && x.dur>0)){
    const sw = G.deck.find(x=>x.id==='shi_wang' && !G.hand.includes(x) && !G.drawPile.includes(x) && !G.discard.includes(x));
    if(sw) G.shiWangCard = sw;
  }
  // 消耗牌：读档后按存档下标重新挂回本关消耗区
  G.exhausted=(d.exhaustedIdx||[]).map(i=>G.deck[i]).filter(Boolean);
  G.weak=d.weak||0; G.gouhun=d.gouhun||0; G.thorns=d.thorns||0; G.burn=d.burn||0; G.dodge=d.dodge||0; G.debuffImmune=d.debuffImmune||0;
  G.pendingEnergy=d.pendingEnergy||0; G.pendingDiscard=d.pendingDiscard||0;
  G.turnAtkBuff=d.turnAtkBuff||0; G.karmaFire=d.karmaFire||0; G.bloodPact=d.bloodPact||0; G.retain=d.retain||0; G.xiejia=d.xiejia||0;
  G.duhun=d.duhun||null; G.xuejiBonus=d.xuejiBonus||0; G.turnStats=d.turnStats||{dmgTaken:0,blocked:0,dealt:0,kills:[]};
  G.totalHpLost=d.totalHpLost||0;
  G.尸气=d.shiqi||0; G.xuenu=d.xuenu||0; G.xisuiTurns=d.xisuiTurns||0; G.xisuiShiqi=d.xisuiShiqi||0;
  G.wangyouTurns=d.wangyouTurns||0; G.wangyouDrunk=d.wangyouDrunk||0;
  G.log=d.log||[];
  G.enemies=(d.enemies||[]).map(restoreEnemy).filter(Boolean);
  PLAYER_HP_PREV=null; ENEMY_HP_PREV={};
  log(`继续旅程：第 ${G.act} 幕（生命 ${G.hp}/${G.maxHp} · 金币 ${G.gold}）`);
  hideOverlay();
  /* v0.68.2：camp / shop / unknown 三支**不经过 setBg** ⇒ 得在这儿显式退出「主菜单壳」状态，
     否则从主菜单续档落进营地/鬼市/未知之地时，body.at-menu 还亮着 ⇒ #app 整块不渲染
     （那三个页面自己铺在 #overlay 里，看不出缺什么，但背后的玩家面板/顶栏/日志全没了，
      下次回到地图才会突然"长回来"）。进战斗与进地图两支由 setBg 自己清，不用重复。 */
  if(document.body && document.body.classList) document.body.classList.remove('at-menu');
  if(d.scene==='battle'){ SCENE='battle'; setBg(G.endless?'act3':'act'+G.act); setBGM(battleBgmFor(G.enemies)); render(); } // v0.61.31：读档进 Boss 房也走 Boss 轨（上一行已恢复 G.enemies）
  else if(d.scene==='camp'){ SCENE='camp'; renderCampfire(); }
  else if(d.scene==='shop'){ SCENE='shop'; renderShop(); }
  else if(d.scene==='unknown'){ SCENE='unknown'; showUnknown(); }
  else { SCENE='map'; showMap({entry:true}); }   // v0.62.0：续档落在地图页 → 走进场动画（Boss 层缓入到当前层）
}
function viewLeaderboard(){
  const wk=weekKey();
  const list=(SAVE.highScores||[]).filter(h=>h.week===wk).map((h,i)=>{
    const where = h.mode==='endless' ? `镇妖塔 · 第 ${h.floor} 层` : `第 ${h.act} 幕`;
    return `<p>${i+1}. <b style="color:var(--gold)">${h.score}</b> 分　${where} · ${h.date}</p>`;
  }).join('') || '<p style="color:var(--dim)">本周暂无记录</p>';
  showOverlay(`<h2>周 榜 行 榜</h2><p style="font-size:12px;color:var(--dim)">每周一重置 · 本机 Top 10 · ${wk}</p><div class="kwlist">${list}</div>`, true, 'scroll-scene');
}

