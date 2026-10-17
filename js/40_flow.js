/* ============================================================================
 * 局内流程层：结算 / 推进 / 本局存档 / 排行榜
 * ============================================================================ */
/* 流程推进 */
/* 结算墨过场：包住 showOverlay 这个唯一汇合点，四条结算路径的正文一个字不用改
   过场只能播一次（G._settlePlayed），startBattle / revive 各自复位 */
let _settleSkipBound=false;
function settleTransition(tier, mode, openFn){
  if(!animLive() || menuFxOff() || G._settlePlayed){ openFn(); return; }
  G._settlePlayed=true;
  const heavy=(tier==='heavy');
  const app=document.getElementById('app');
  const veil=document.getElementById('scene-veil');
  const timers=[];
  let opened=false, done=false;
  const open=()=>{ if(opened) return; opened=true; openFn(); };
  const finish=()=>{ if(done) return; done=true;
    for(let i=0;i<timers.length;i++) clearTimeout(timers[i]);
    if(app) app.classList.remove('closing');
    if(veil){ veil.className=''; veil.style.display=''; }
    if(_settleSkipBound){ _settleSkipBound=false;
      try{ window.removeEventListener('pointerdown', skip, true); }catch(e){} }
  };
  /* 过场挂着捕获相点击就跳过，结束记得摘掉，留着后面每次点击都白跑一趟 */
  function skip(){ open(); finish(); }
  if(!_settleSkipBound){ _settleSkipBound=true;
    try{ window.addEventListener('pointerdown', skip, true); }catch(e){} }
  const later=(ms, fn)=>{ timers.push(setTimeout(fn, ms)); };

  if(app) app.classList.add('closing');
  if(!heavy){
    /* 轻档只铺一层看不见的挡板：opacity:0 也会吃点击，不然这 0.5 秒还能继续点牌 */
    if(veil) veil.style.display='block';
    later(520, ()=>{ open(); finish(); });
    return;
  }
  /* heavy 档是结局视频没播成时唯一的回落口：把整屏背景补上，否则就只剩 overlay 的 88% 黑幕 */
  if(typeof setBg==='function'){ try{ setBg(mode==='lose' ? 'defeat.jpg' : 'victory.jpg'); }catch(e){} }
  later(450, ()=>{ if(veil){ veil.style.display='block'; veil.className='show '+(mode==='lose'?'lose':'win'); } });
  later(1300, ()=>{ open(); if(veil) veil.classList.add('parting'); });
  later(1850, finish);
}
/* 终局结算视频：只在通关 / 最后一败接入，普通战斗不接（每场都放会淹死人）
   无头 / 关特效 / 素材缺，一律回落墨过场 */
var _settleVid=null;
const SETTLE_VID_HERO={ wuseng:'kuseng' };   // 武僧 id 是 wuseng，素材名却是 kuseng
function settleVideo(mode, openFn){
  if(!animLive() || menuFxOff()){ openFn(); return; }
  if(typeof stopBGM==='function'){ try{ stopBGM(); }catch(e){} }
  const hero=(G && G.hero) || 'tianshi';
  const key=SETTLE_VID_HERO[hero]||hero;
  const rel='bg/'+key+'-'+(mode==='lose'?'lose':'win')+'.mp4';
  /* ASSET_MAP 里没有这个键就说明素材没进包，直接走墨过场 */
  if(ASSET_MAP && !ASSET_MAP[rel]){ settleTransition('heavy', mode, openFn); return; }
  const v=document.createElement('video');
  v.src=assetURL(rel, true); v.autoplay=true; v.playsInline=true; v.preload='auto';
  v.setAttribute('playsinline',''); v.setAttribute('webkit-playsinline','');
  /* 首帧解出来之前把视频 opacity 压 0，不然 WebView 会闪一段原生播放按钮 + 黑帧
     controls 也要显式关掉，有些 WebView 自己会挂控件条 */
  v.controls=false;
  v.style.cssText='position:fixed;inset:0;width:100%;height:100%;object-fit:cover;z-index:5;background:#000;pointer-events:none;opacity:0;transition:opacity .24s ease-out';
  let fin=false, shown=false;
  const show=()=>{ if(shown) return; shown=true; v.style.opacity='1'; };
  const done=()=>{ if(fin) return; fin=true; show(); openFn(); };
  const drop=()=>{ try{ v.parentNode&&v.parentNode.removeChild(v); }catch(e){} if(_settleVid===v) _settleVid=null; try{ document.body.classList.remove('settle-vid'); }catch(e){} };
  const fallback=()=>{ if(fin) return; fin=true; drop(); settleTransition('heavy', mode, openFn); };
  v.addEventListener('loadeddata', show);
  v.addEventListener('playing', show);
  v.addEventListener('ended', done);          // 播完不摘，停在末帧当结算面板背景
  v.addEventListener('error', fallback);
  _settleVid=v;
  try{ document.body.classList.add('settle-vid'); }catch(e){}   // 把 overlay 黑幕压到 50%，末帧才透得出来
  document.body.appendChild(v);
  const p=v.play&&v.play();
  if(p&&p.catch) p.catch(()=>{
    /* 带声自动播放被拦，就静音重试一次，再失败才回落墨过场 */
    v.muted=true; const p2=v.play&&v.play();
    if(p2&&p2.catch) p2.catch(fallback);
  });
  setTimeout(()=>{ if(!fin){ try{ v.currentTime=v.duration||0; }catch(e){} done(); } }, 12000);
}
/* 摘掉结局视频：hideOverlay 与 showStartScreen 两个出口都要调 */
function settleVidDrop(){
  if(!_settleVid) return;
  const v=_settleVid; _settleVid=null;
  try{ document.body.classList.remove('settle-vid'); }catch(e){}
  try{ v.pause&&v.pause(); }catch(e){}
  try{ v.parentNode&&v.parentNode.removeChild(v); }catch(e){}
}
/* 终局慢镜：终点先把最后一下放慢播一遍再衔接结算，只挂一个 body class，不动数值
   别走 heroAnim / enemyAttackAnim，它们 360 / 560ms 就摘类，会把慢镜截断 */
let _finaleSkipBound=false;
function finaleBlow(mode, then){
  if(!animLive() || menuFxOff()){ then(); return; }
  let done=false;
  const clean=()=>{
    try{ document.body.classList.remove('finale-slow'); }catch(e){}
    try{ document.querySelectorAll('.hero-art-box').forEach(b=>b.classList.remove('hero-hit','hero-attack')); }catch(e){}
    try{ document.querySelectorAll('.enemy.e-atk').forEach(el=>el.classList.remove('e-atk')); }catch(e){}
  };
  const finish=()=>{ if(done) return; done=true;
    if(_finaleSkipBound){ _finaleSkipBound=false; try{ window.removeEventListener('pointerdown', skip, true); }catch(e){} }
    clean(); then();
  };
  function skip(){ finish(); }
  if(!_finaleSkipBound){ _finaleSkipBound=true; try{ window.addEventListener('pointerdown', skip, true); }catch(e){} }
  try{ document.body.classList.add('finale-slow'); }catch(e){}
  if(mode==='lose'){
    try{ sfx('hurt'); }catch(e){}
    try{ if(typeof hurtVignette==='function') hurtVignette(); }catch(e){}
    try{ const b=document.querySelector('.hero-art-box');
      if(b){ b.classList.remove('hero-attack','hero-hit','hero-cast'); void b.offsetWidth; b.classList.add('hero-hit'); } }catch(e){}
    try{ (G.enemies||[]).forEach(e=>{ if(!alive(e)) return;
      const el=(typeof enemyEl==='function')?enemyEl(e):null; if(!el) return;
      el.style.setProperty('--atk-delay','0ms'); el.style.setProperty('--atk-times','1');
      el.classList.remove('e-atk'); void el.offsetWidth; el.classList.add('e-atk'); }); }catch(e){}
  } else {
    try{ sfx('death'); }catch(e){}
    /* 收尾敌人的消散：此刻 DOM 还停在死亡前渲染，得手动重排 dying 才看得见 */
    try{ const de=(G.enemies||[]).find(x=>x && x.dying);
      const el=de ? ((typeof enemyEl==='function')?enemyEl(de):null) : document.querySelector('.enemy.dying');
      if(el){ el.classList.remove('dying'); void el.offsetWidth; el.classList.add('dying'); } }catch(e){}
  }
  setTimeout(finish, 1600);
}
/* 新手教程：6 关线性，goNext 单点拦截推进；教程局不写档、不入榜 */
function startTutorial(){
  if(typeof hideOverlay==='function') hideOverlay();
  if(typeof ensureAudio==='function') ensureAudio();
  setRunSlot(0); RUN_FINISHED=false;
  G=newState(); G.mapRow=0;
  G.startTs=Date.now(); G.accMs=0; G.t0=Date.now();
  const __sd=rngSeedNow(); seedRng(__sd);
  G.mapSeed=__sd; buildActs(__sd); G.mapRow=0;
  track('runStart'); tapAchieve('Beginning');
  G.hero='tianshi';
  G.deck=heroDeck('tianshi');
  G.hp=G.maxHp=60;
  G.tutorial={ on:true, node:0, force:null, flags:{}, draw:null, foeOv:null };
  log('—— 新手教程 · 入塔 ——');
  tutEnterNode(0);
}
function tutEnterNode(i){
  const N=TUT_NODES[i]; if(!N){ tutGraduate(); return; }
  const T=G.tutorial; T.node=i; T.force=null; T.draw=null; T.foeOv=null; T.flags={};   // 一次性标记随关重置，重开本关要重播
  if(typeof narrateClear==='function') narrateClear();
  if(typeof tutSkipShow==='function') tutSkipShow(true);
  if(N.key==='fight'||N.key==='elite'||N.key==='boss'){
    if(i===2||i===5) G.hp=G.maxHp;
    T.draw=N.draw.slice(); T.foeOv=N.foeOv;
    startBattle(N.foes.slice());
  } else if(N.key==='shop'){
    G.gold=(N.gold!=null?N.gold:120);
    G.shopWares=N.wares.map(id=>cardById(id)); G.shopPotions=[];
    if(typeof showShop==='function') showShop();
    if(typeof narrate==='function') narrate('tut_2a','tut_2b');
  } else if(N.key==='camp'){
    if(typeof showCampfire==='function') showCampfire();
    if(typeof narrate==='function') narrate('tut_4a','tut_4b');
  } else if(N.key==='unknown'){
    if(typeof showUnknown==='function') showUnknown();
    if(typeof narrate==='function') narrate('tut_5a');
  }
}
function tutOn(evt, arg){
  if(!G||!G.tutorial||!G.tutorial.on) return;
  const T=G.tutorial, i=T.node, F=T.flags||(T.flags={});
  const N=function(){ if(typeof narrate==='function') narrate.apply(null, arguments); };
  if(evt==='battleStart'){
    if(i===0) N('tut_0_1','tut_0_2','tut_1a','tut_1b','tut_1c','tut_1d', function(){ tutForce('leifu','tut_1e'); });
    else if(i===2) N('tut_2_1','tut_2_2','tut_3a','tut_3b','tut_3c', function(){ tutForce('zhouyin','tut_3d'); });
    else if(i===5) N('tut_5_1','tut_5_2','tut_6a');
  }
  else if(evt==='playedForce'){
    const c=arg||{};
    if(i===0){
      if(c.id==='leifu' && !F.leifu1){ F.leifu1=1; N('tut_1f','tut_0_3','tut_1g'); }
      else if(c.id==='leifu'){ F.leifu2=1; if(!F.gang) tutForce('jingang','tut_1h'); }
      else if(c.id==='jingang'){ F.gang=1; N('tut_1i'); }
    }
    else if(i===2 && c.id==='zhouyin'){ N('tut_3e','tut_3f','tut_2_4'); }
  }
  else if(evt==='endTurn'){
    if(T.force){ T.force=null; if(typeof narrateHide==='function') narrateHide(); }
  }
  else if(evt==='playerHit'){
    if(i===0 && !F.hit){ F.hit=1;
      if(arg && arg.absorbed>0) N('tut_1j'); else N('tut_1j2');
    }
    else if(i===2 && !F.hit){ F.hit=1; N('tut_2_3'); }
  }
  else if(evt==='battleWin'){
    if(i===0) N('tut_1k','tut_0_4');
    else if(i===5) N('tut_5_5');
  }
  else if(evt==='turnStart'){
    if(i===2 && G.turn===2 && !F.daoti){ F.daoti=1; N('tut_3g'); }
    if(i===5){
      const boss=(G.enemies||[]).find(e=>e.boss);
      if(boss && boss.intent){
        if(!F.ba && (boss.intent.type==='charge'||boss.intent.type==='aoe')){ F.ba=1; N('tut_6b'); }
        if(!F.sum && boss.intent.type==='summon'){ F.sum=1; N('tut_5_3','tut_5_4','tut_6c'); }
      }
      if(boss && !F.half && boss.hp*2<=boss.maxHp){ F.half=1;
        boss.hp=Math.min(boss.maxHp, boss.hp+12); boss.strength=(boss.strength||0)+2;
        log('僵王血过半，尸变：恢复 12 点生命，力量 +2');
        N('tut_6d');
      }
    }
  }
  else if(evt==='forged'){ N('tut_4c','tut_4d'); }
  else if(evt==='unknownPotion'){ N('tut_5b','tut_5c'); }
}
function tutForce(cardId, narrId){
  if(!G||!G.tutorial||!G.tutorial.on) return;
  G.tutorial.force=cardId;
  if(narrId && typeof narrateShow==='function') narrateShow(narrId, true);
}
function tutAdvance(){
  if(!G||!G.tutorial||!G.tutorial.on) return;
  const next=G.tutorial.node+1;
  if(next>=TUT_NODES.length){ tutGraduate(); return; }
  const N=TUT_NODES[next];
  if(typeof narrateClear==='function') narrateClear();
  showOverlay('<h2>第 '+(next+1)+' 关 · '+N.name+'</h2><button class="btn" onclick="hideOverlay(); tutEnterNode('+next+');">继 续</button>');
}
function tutGraduate(){
  if(typeof narrateClear==='function') narrateClear();
  if(typeof tutSkipShow==='function') tutSkipShow(false);
  showOverlay('<h2>出 师</h2><p style="font-family:var(--font-brush);font-size:17px;line-height:1.9;text-align:left;max-width:560px">'+TUT_NARR.tut_6e+'</p><button class="btn" onclick="tutFinish()">正式入塔</button>');
  if(typeof playVoice==='function') playVoice('tut_6e');   // 出师那段整屏旁白也配音
}
function tutFinish(){
  if(typeof stopVoice==='function') stopVoice();
  if(G&&G.tutorial) G.tutorial.on=false;
  markTutorialSeen();
  if(typeof grantTutTrialOnce==='function'){ try{ grantTutTrialOnce(); }catch(e){} }
  try{ grantRunMilestones(); }catch(e){}
  hideOverlay();
  confirmNewGame();
}
function tutSkip(){
  if(!G||!G.tutorial||!G.tutorial.on) return;
  G.tutorial.on=false;
  if(typeof narrateClear==='function') narrateClear();
  if(typeof tutSkipShow==='function') tutSkipShow(false);
  markTutorialSeen();
  if(typeof grantTutTrialOnce==='function'){
    const got=grantTutTrialOnce();
    if(got>0 && typeof floatMsg==='function') floatMsg(`获得 ${got} 张【试玩符纸】`);
  }
  hideOverlay();
  confirmNewGame();
}
function tutOnDeath(){
  if(G.dead) return;
  G.dead=true; G.battleOver=true;
  sfx('lose');
  if(typeof narrateClear==='function') narrateClear();
  const _panel='<h2>倒 下 了</h2><p style="font-family:var(--font-brush);font-size:18px;line-height:1.9">'+TUT_NARR.tut_die+'</p><button class="btn" onclick="tutRetry()">重 来</button>';
  if(typeof playVoice==='function') playVoice('tut_die');
  if(typeof heroDeath==='function' && typeof animLive==='function' && animLive() && !(typeof menuFxOff==='function' && menuFxOff())){
    heroDeath(true);
    setTimeout(function(){ showOverlay(_panel); }, 1000);
  } else {
    showOverlay(_panel);
  }
}
function tutRetry(){
  hideOverlay();
  if(typeof stopVoice==='function') stopVoice();
  G.dead=false; G.battleOver=false; G._settlePlayed=false;
  G.hp=G.maxHp; G.weak=0; G.gouhun=0; G.thorns=0; G.block=0; G.burn=0;
  G.tutorial.force=null;
  tutEnterNode(G.tutorial.node);   // 重开本关（用户口径：死亡先旁白再重开本关）
}
function winFight(){
  if(G.battleOver) return;
  G.battleOver=true;
  if(G.tutorial && G.tutorial.on && typeof tutOn==='function'){ try{ tutOn('battleWin'); }catch(e){} }
  sfx('win');
  HITFX.enemies.clear();
  log('击败了所有敌人！');
  if(G.shiWangCard) returnShiWangCard();
  if(G.exhausted && G.exhausted.length){ const _n=G.exhausted.length; G.exhausted=[]; log(`本关结束，${_n} 张消耗牌回归牌库`); }
  track('battleWin');
  const hasElite=G.enemies.some(e=>e.elite);
  const isBoss=G.enemies.some(e=>e.boss);
  if(hasElite){ const p=randomPotion(); gainPotion(p); log(`击败精英，获得灵汁【${p.name}】`); }
  G.finalBoss = isBoss && G.act>=ACTS.length;
  let g=4; if(hasElite) g=8; if(isBoss) g=12;
  if(hasRelic('jubaopen')) g=Math.floor(g*1.5);
  G.gold+=g; log(`获得 ${g} 金币`);
  const hpLost = Math.max(0, G.battleStartHp - G.hp);
  let h=0, extra=0;
  if(!G.finalBoss){
    if(isBoss){ h=Math.floor(G.maxHp*0.5); log(`击败 Boss，汲取妖气恢复 ${h} 点生命（50%）`); }
    else { h=8; log(`战后恢复 ${h} 点生命`); }
    if(h>0) heal(h);
    if((hasElite || isBoss) && hasRelic('baiguilu')){ G.maxHp+=5; heal(5); log('百鬼录：击败精英/Boss，最大生命 +5'); }
    if(hasRelic('fanhunxiang')){ extra+=6; log('返魂香：战后额外恢复 6 点生命'); }
    if(hasRelic('zhaohunfan')){ extra+=4; log('招魂幡：战斗结束额外恢复 4 点生命'); }
    if(extra>0) heal(extra);
  }
  G.pendingRelic = hasElite || isBoss;
  G.rewardTier = isBoss?'boss':hasElite?'elite':'normal';
  G.lastGold=g; G.battleGold=g; G.goldDoubled=false;
  G.battleResult={g, hpLost, h, extra, isBoss, finalBoss:G.finalBoss};
  if(G.finalBoss){ advanceAct(); return; }
  if(isBoss){
    G.rewardTier=null;   // Boss 不产卡，tier 就地清空，别泄漏给下一家商店
    const relic=weightedRelic(); grantRelic(relic);
    const potion=randomPotion(); gainPotion(potion);
    log(`击败幕主，获得遗物【${relic.name}】和灵汁【${potion.name}】`);
  }
  playDropSequence();
}
function showBattleResult(r){
  const names=G.enemies.map(e=>e.name).join('、');
  const extraTxt = r.extra ? `额外汇总恢复 <b style="color:var(--green)">+${r.extra}</b> 生命` : '';
  const healTxt = r.h ? `恢复 <b style="color:var(--green)">+${r.h}</b> 生命${r.isBoss?'（50%）':''}` : '';
  const doubleBtn = '';
  const html=`<h2>战 斗 结 算</h2>
    <p>击败 <b>${names}</b><br>
    获得金币 <b style="color:var(--gold)">+${G.battleGold}</b> · 本场耗血 <b style="color:var(--red)">${r.hpLost}</b>${healTxt?` · ${healTxt}`:''}${extraTxt?` · ${extraTxt}`:''}</p>
    <p style="font-size:14px">当前生命 <b>${G.hp}</b> / ${G.maxHp}</p>
    ${doubleBtn}
    <button class="btn" onclick="continueAfterBattle()">继续</button>`;
  /* rewardTier 会被 showBossReward 清成 null，得连 r.isBoss 一起判；第三实参 result-scene 是入场 keyframe 唯一挂钩 */
  const tier=(G.rewardTier==='elite'||G.rewardTier==='boss'||r.isBoss)?'heavy':'light';
  settleTransition(tier, 'win', ()=>showOverlay(html, undefined, 'result-scene'));
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
  G.rewardTier = null;
  const relic=weightedRelic();
  grantRelic(relic);
  const potion=randomPotion(); gainPotion(potion);
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
  if(G&&G.tutorial&&G.tutorial.on){ tutAdvance(); return; }
  /* 唯一一处 G.mapRow++，顺手取最后两格当光边，交给 showMap 画推进动画 */
  const __p=G.mapPath||[];
  _mapGlowEdge = (__p.length>=2)
    ? mapEdgeKey(__p[__p.length-2].r, __p[__p.length-2].c, __p[__p.length-1].r, __p[__p.length-1].c)
    : null;
  G.mapRow++;
  _mapStepFrom=G.mapRow-1;
  G.shopWares=null;
  if(G.mapRow>=MAP.length){ advanceAct(); return; }
  showMap();
}
function advanceAct(){
  if(G.act>=ACTS.length){ showVictory(); return; }
  G.act++;
  if(G.act>=3) tapAchieve('Hard-three');
  MAP=ACTS[G.act-1];
  G.mapRow=0; G.mapCol=-1; G.mapPath=[]; G.shopWares=null;
  showOverlay(`<h2>第 ${G.act} 幕 · ${ACT_NAMES[G.act-1]}</h2><p>更凶的妖魔盘踞在更高层。<br>敌人的生命与攻击都变强了。</p><button class="btn" onclick="hideOverlay(); showMap({entry:true});">开始攀登</button>`);
}
/* 结算分数 / 里程：分项逐条弹出，停稳后大号数字从右到左浮出来 */
const SETTLE_KIND={ tianshi:'', ganshiren:'heal', wuseng:'block', yincha:'to-player' };
const SETTLE_NUMCLS={ '':'dmg', 'to-player':'hurt', 'block':'block', 'heal':'heal' };
function settleKind(){ return SETTLE_KIND[(G && G.hero) || 'tianshi'] || ''; }
function runElapsedMs(s){ const g=s||G; if(!g) return 0;
  return Math.max(0, (g.accMs||0) + (g.t0 ? (Date.now()-g.t0) : 0)); }
function clearTimeBonus(sec){
  const m=(sec||0)/60;
  if(m<15) return 3000;
  if(m<30) return 1500;
  if(m<50) return 800;
  return 400;
}
/* 总分 = 层数×50 + 普通×40 + 精英×140 + 首领×300 + 金币×8 + 灵汁×240，用时与通关加成只在通关时算 */
function scoreParts(s){
  const g=s||G; if(!g) return [];
  const floor=(Math.max(1,g.act|0)-1)*MAP_ROWS + Math.max(0,g.mapRow|0) + 1;
  const parts=[
    { lab:'层数推进', val:floor*50 },
    { lab:'普通击杀', val:Math.max(0,g.killNormal|0)*40 },
    { lab:'精英击杀', val:Math.max(0,g.killElite|0)*140 },
    { lab:'首领击杀', val:Math.max(0,g.killBoss|0)*300 },
    { lab:'剩余金币', val:(g.gold|0)*8 },
    { lab:'灵汁剩余', val:(g.potions?g.potions.length:0)*240 },
  ];
  if(g.finalBoss){
    parts.push({ lab:'用时', val:clearTimeBonus(Math.floor(runElapsedMs(g)/1000)) });
    parts.push({ lab:'通关加成', val:1000 });
  }
  return parts;
}
function calcScore(){ let t=0; scoreParts().forEach(function(p){ t+=p.val; }); return t; }
function settleResultHTML(mode){
  const kind=settleKind();
  const sp=scoreParts(G), mp=(G && G._mileParts) ? G._mileParts : mileParts(G);
  const sTot=sp.reduce(function(a,p){ return a+p.val; },0);
  const mTot=mp.reduce(function(a,p){ return a+p.val; },0);
  const rows=function(arr){ return arr.map(function(p){
    return '<div class="settle-row"><span class="settle-lab">'+p.lab+'</span><span class="settle-val">0</span></div>';
  }).join(''); };
  let btns='';
  if(mode==='win'){
    btns='<button class="btn" onclick="startGame()">再打一局</button>'
        +'<button class="btn ghost" onclick="showStartScreen()">返回主菜单</button>';
  }else if(mode==='abandon'){
    btns='<button class="btn ghost" onclick="showHeroSelect()">返回</button>';
  }else{
    btns=(G.revivedFree?'':'<button class="btn" onclick="reviveFree()">免费复活</button>')
        +'<button class="btn ghost" onclick="giveUp()">放弃 · 结束本局</button>';
  }
  const html='<div class="settle-wrap">'
    +'<div class="settle-block settle-score"><div class="settle-cap">总分计算过程</div>'
    +'<div class="settle-rows" id="settle-score-rows">'+rows(sp)
    +'<div class="settle-row settle-sum"><span class="settle-lab">总分</span><span class="settle-val">0</span></div></div>'
    +'<div class="settle-big" id="settle-big"></div></div>'
    +'<div class="settle-block settle-mile"><div class="settle-cap">里程分数</div>'
    +'<div class="settle-rows" id="settle-mile-rows">'+rows(mp)
    +'<div class="settle-row settle-sum"><span class="settle-lab">里程</span><span class="settle-val">0</span></div></div>'
    +'<div class="settle-big" id="settle-bigm"></div>'
    +'<div class="settle-acc">累计 <b>'+(typeof milePts==='function' ? milePts((G&&G.hero)||'tianshi') : 0)+'</b> 点</div>'
    +'</div>'
    +'<div class="settle-actions">'+btns+'</div>'
    +'</div>';
  return { html:html, kind:kind, sp:sp, mp:mp, sTot:sTot, mTot:mTot };
}
function settleAnim(R){
  const q=function(sel){ return document.querySelector(sel); };
  const qa=function(sel){ return Array.prototype.slice.call(document.querySelectorAll(sel)); };
  const sRows=qa('#settle-score-rows .settle-row:not(.settle-sum)');
  const mRows=qa('#settle-mile-rows .settle-row:not(.settle-sum)');
  const sSum=q('#settle-score-rows .settle-sum .settle-val');
  const mSum=q('#settle-mile-rows .settle-sum .settle-val');
  const putBig=function(sel, val){
    const el=q(sel); if(!el) return [];
    const txt=String(val);
    const h=(typeof numHTML==='function') ? numHTML(R.kind, txt) : null;
    el.innerHTML = h || ('<span class="settle-numfall '+SETTLE_NUMCLS[R.kind]+'">'+txt+'</span>');
    return Array.prototype.slice.call(el.querySelectorAll('.fx-num, .settle-numfall'));
  };
  const dS=putBig('#settle-big', R.sTot), dM=putBig('#settle-bigm', R.mTot);
  if(!animLive() || menuFxOff()){
    sRows.forEach(function(r,i){ r.classList.add('on'); const v=r.querySelector('.settle-val'); if(v) v.textContent='+'+R.sp[i].val; });
    mRows.forEach(function(r,i){ r.classList.add('on'); const v=r.querySelector('.settle-val'); if(v) v.textContent='+'+R.mp[i].val; });
    if(sSum) sSum.textContent=String(R.sTot);
    if(mSum) mSum.textContent=String(R.mTot);
    dS.forEach(function(d){ d.classList.add('on'); });
    dM.forEach(function(d){ d.classList.add('on'); });
    return;
  }
  const N=Math.max(sRows.length, mRows.length);
  let aS=0, aM=0;
  for(let i=0;i<N;i++){ (function(i){
    setTimeout(function(){
      sfx('number');
      const sr=sRows[i];
      if(sr){ sr.classList.add('on'); const v=sr.querySelector('.settle-val'); if(v) v.textContent='+'+R.sp[i].val; aS+=R.sp[i].val; if(sSum) sSum.textContent=String(aS); }
      const mr=mRows[i];
      if(mr){ mr.classList.add('on'); const v=mr.querySelector('.settle-val'); if(v) v.textContent='+'+R.mp[i].val; aM+=R.mp[i].val; if(mSum) mSum.textContent=String(aM); }
    }, i*150);
  })(i); }
  const dl=dS.length, dm=dM.length, n=Math.max(dl, dm);
  setTimeout(function(){
    for(let k=0;k<n;k++){ (function(k){
      const idx=n-1-k;
      setTimeout(function(){ sfx('number'); if(dS[idx]) dS[idx].classList.add('on'); if(dM[idx]) dM[idx].classList.add('on'); }, k*95);
    })(k); }
  }, N*150+280);
}
function rehydrateRunForSettle(d){
  if(!d || typeof d!=='object') return null;
  const t=newState();
  t.hero=d.hero||'tianshi';
  t.act=d.act||1; t.mapRow=d.mapRow||0;
  t.killNormal=d.killNormal||0; t.killElite=d.killElite||0; t.killBoss=d.killBoss||0; t.killSummon=d.killSummon||0;
  t.totalKills=d.totalKills||0;
  t.gold=d.gold||0; t.hp=d.hp||0; t.maxHp=d.maxHp||60;
  t.potions=(d.potions||[]).map(potionRestore).filter(Boolean);
  t.accMs=(d.accMs!=null)?Math.max(0,d.accMs|0):0;
  t.startTs=d.startTs||Date.now(); t.t0=Date.now();
  return t;
}
function settleOverwrittenRun(d){
  const savedG=G;
  const t=rehydrateRunForSettle(d);
  if(!t){ clearRunSave(0); showHeroSelect(); return; }
  G=t;
  G.score=calcScore(); G.dead=true; G.battleOver=true;
  recordScoreRun(false); grantRunMilestones();
  const R=settleResultHTML('abandon');
  clearRunSave(0); if(typeof cloudMarkDirty==='function') cloudMarkDirty();
  settleVideo('lose', ()=>{ showOverlay(R.html, undefined, 'result-scene'); settleAnim(R); });
  G=savedG;
}
function loseGame(){
  if(G&&G.tutorial&&G.tutorial.on){ tutOnDeath(); return; }
  if(G.dead) return;
  G.dead=true; G.battleOver=true;
  if(typeof heroDeath==='function') heroDeath(true);
  sfx('lose');
  track('death');
  G.score=calcScore();
  recordScoreRun(false);
  grantRunMilestones();
  const R=settleResultHTML('lose');
  finaleBlow('lose', ()=>{ settleVideo('lose', ()=>{ showOverlay(R.html, undefined, 'result-scene'); settleAnim(R); }); });
}
function giveUp(){
  if(typeof settleVidDrop==='function') settleVidDrop();
  const sc=G.score||calcScore();
  G.score=sc;
  clearRunSave();
  recordScoreRun(false);
  showStartScreen();
}
function revive(){
  G.dead=false;
  /* 复活回的是同一场战斗，battleOver 不清掉，打死最后一个敌人时 winFight 会直接 return，界面卡死 */
  G.battleOver=false;
  G._settlePlayed=false;
  G.hp=G.maxHp; G.weak=0; G.gouhun=0; G.thorns=0; G.block=0; G.burn=0;
  G.discard=G.discard.concat(G.hand); G.hand=[];
  if(typeof heroDeath==='function') heroDeath(false);
  /* 复活要把战斗背景和战斗 BGM 一起铺回去，失败屏把这两样都换掉了 */
  hideOverlay(); setBg('act'+G.act); setBGM(battleBgmFor(G.enemies)); sfx('heal');
  log('你复活了，重整旗鼓再战');
  startTurn();
}
function reviveFree(){
  if(G.revivedFree) return;
  G.revivedFree=true; track('revive');
  floatMsg('复活 · 回满血');
  revive();
}
function showVictory(){
  sfx('win');
  track('runWin');
  G.finalBoss=true;
  G.score=calcScore();
  destroyRunSave();
  const __elapsed=runElapsedMs();
  grantRunMilestones();
  recordClearTime(__elapsed);
  recordScoreRun(true);
  const R=settleResultHTML('win');
  finaleBlow('win', ()=>{ settleVideo('win', ()=>{ showOverlay(R.html, undefined, 'result-scene'); settleAnim(R); }); });
}

/* 通关计时榜：只比谁通关最快，用时升序留前 10 条 */
const CLEAR_KEY='zhiguaitower_cleartimes_v1';
const CLEAR_MAX=10;        // 展示条数
const CLEAR_STORE=60;      // 本机存储上限
function readClearTimes(){
  try{ const a=JSON.parse(Store.get(CLEAR_KEY)||'[]'); return Array.isArray(a)?a:[]; }catch(e){ return []; }
}
function writeClearTimes(a){ try{ Store.set(CLEAR_KEY, JSON.stringify((a||[]).slice(0, CLEAR_STORE))); }catch(e){} }
function fmtMMSS(ms){ const t=Math.max(0, Math.floor((ms||0)/1000));
  const m=Math.floor(t/60), s=t%60; return m+':'+(s<10?'0':'')+s; }
function recordClearTime(ms){
  if(!(ms>=0)) return;
  /* 按 startTs 去重，同一局只入一次榜（startTs 随档往返、跨续档不变） */
  const sign=G.startTs||0;
  const list=readClearTimes().filter(x=>!(sign && x && x.startTs===sign));
  list.push({ hero:G.hero||'', ms:Math.round(ms), act:G.act||0, score:G.score||0, startTs:sign, ts:Date.now() });
  /* sort 得给数值比较器，默认按字符串比会把 10:00 排到 2:00 前面 */
  list.sort((a,b)=>(a.ms-b.ms)||((b.score||0)-(a.score||0)));
  writeClearTimes(list.slice(0, CLEAR_STORE));
  if(typeof rankSubmit === 'function'){
    /* 提交毫秒不是秒：榜单按时间类型建，传秒数会被当成毫秒，30 分钟显示成 1.8 秒 */
    const vms=Math.max(0, Math.round(ms));
    let _clearErrShown='';
    function clearRankSay(e){
      const msg='榜单上传失败：'+((e&&e.message)||e);
      if(msg===_clearErrShown) return;
      _clearErrShown=msg;
      if(typeof floatMsg==='function') floatMsg(msg);
    }
    try{ rankSubmit(vms, 'clear_total').catch(clearRankSay); }catch(e){}
    const hb='clear_'+(G.hero||'');
    try{ if(typeof RANK_IDS!=='undefined' && RANK_IDS[hb]) rankSubmit(vms, hb).catch(clearRankSay); }catch(e){}
  }
}

/* 整局总分榜：通关/被击败/放弃都入榜，同一局按 startTs 取最高分 */
const SCORE_KEY='zhiguaitower_scores_v1';
const SCORE_MAX=10;
function readScores(){ try{ const a=JSON.parse(Store.get(SCORE_KEY)||'[]'); return Array.isArray(a)?a:[]; }catch(e){ return []; } }
function writeScores(a){ try{ Store.set(SCORE_KEY, JSON.stringify((a||[]).slice(0, SCORE_MAX))); }catch(e){} }
function recordScoreRun(win){
  if(G&&G.tutorial&&G.tutorial.on) return;
  const sc=G.score||0;
  const sign=G.startTs||0;
  const list=readScores().filter(x=>!(sign && x && x.startTs===sign));
  list.push({ hero:G.hero||'', score:sc, act:G.act||0, win:!!win, startTs:sign, ts:Date.now() });
  list.sort((a,b)=>(b.score||0)-(a.score||0));
  writeScores(list.slice(0, SCORE_MAX));
  if(typeof rankSubmit === 'function'){
    try{ rankSubmit(sc, 'total_score').catch(function(e){
      if(typeof floatMsg==='function') floatMsg('总分榜上传失败：'+((e&&e.message)||e));
    }); }catch(e){}
  }
}

/* 本局存档 */
const RUN_KEY='zhiguaitower_run_v1';
const RUN_SLOTS=[RUN_KEY, 'zhiguaitower_run_s2_v1', 'zhiguaitower_run_s3_v1'];
let RUN_SLOT=0;
let RUN_FINISHED=false;
function runKeyOf(i){ const n=RUN_SLOTS.length; return RUN_SLOTS[Math.max(0, Math.min(n-1, i|0))]; }
function setRunSlot(i){ const n=RUN_SLOTS.length; RUN_SLOT=Math.max(0, Math.min(n-1, i|0)); }
function newestRunSlot(){
  let best=-1, bestTs=-1;
  for(let i=0;i<RUN_SLOTS.length;i++){
    const d=readRun(i); if(!d) continue;
    const ts=d.startTs||0;
    if(ts>bestTs){ bestTs=ts; best=i; }
  }
  return best;
}
function normalizeSingleRunSave(){
  const i=newestRunSlot();
  if(i<0){ setRunSlot(0); return; }
  if(i!==0){ try{ Store.setJSON(runKeyOf(0), readRun(i)); }catch(e){} }
  for(let k=1;k<RUN_SLOTS.length;k++){ try{ Store.del(runKeyOf(k)); }catch(e){} }
  setRunSlot(0);
}
/* 断点续玩：全场景实时存档 */
let SCENE='menu';
/* oneShot 副本要随档往返：不给每张牌加字段，只给副本带，否则续档会掉 0 费/一次性 */
function cardSnap(c){
  const d={id:c.id, up:!!c.up, sealed:c.sealed||0};
  if(c.oneShot) d.oneShot=1;
  return d;
}
function cardRestore(d){ const c=cardById(d.id); c.up=!!d.up; c.sealed=d.sealed||0;
  if(d.oneShot) Object.assign(c, {cost:0, costU:null, oneShot:true});
  return c; }
function potionSnap(p){ return p.id; }
function potionRestore(id){ const p=POTIONS.find(x=>x.id===id); return p?{...p}:null; }
function serializeEnemy(e){
  return { key:e.key, hp:e.hp, maxHp:e.maxHp, block:e.block, pingbi:e.pingbi||0, curse:e.curse||0, charm:e.charm||0, charmPct:e.charmPct||0.5, sealedEver:!!e.sealedEver, seal:!!e.seal, sealTurn:e.sealTurn||0, strength:e.strength||0, pendingDamage:e.pendingDamage||0, intentIndex:e.intentIndex||0, intent:e.intent||{type:'dormant'}, phase2:!!e.phase2, ledgerActive:!!e.ledgerActive, ledgerDmg:e.ledgerDmg||0, ledgerAffix:e.ledgerAffix||null, splitDone:!!e.splitDone, sealedCost:e.sealedCost||0, poison:e.poison||0, affixes:e.affixes||[] };
}
function restoreEnemy(d){
  const def=ENEMIES[d.key]; if(!def) return null;
  const e=makeEnemy(def, d.key);
  e.hp=d.hp; e.maxHp=d.maxHp; e.block=d.block; e.pingbi=d.pingbi; e.curse=d.curse; e.charm=d.charm; e.charmPct=d.charmPct||0.5; e.sealedEver=!!d.sealedEver; e.seal=d.seal; e.sealTurn=d.sealTurn||0; e.strength=d.strength; e.pendingDamage=d.pendingDamage; e.intentIndex=d.intentIndex; e.intent=d.intent; e.phase2=d.phase2; e.ledgerActive=d.ledgerActive; e.ledgerDmg=d.ledgerDmg; e.ledgerAffix=d.ledgerAffix; e.splitDone=d.splitDone; e.sealedCost=d.sealedCost; e.poison=d.poison||0; e.affixes=d.affixes;
  return e;
}
function saveRun(scene){
  if(!G) return;
  if(G.tutorial && G.tutorial.on) return;
  if(RUN_FINISHED) return;
  G.accMs=runElapsedMs(G); G.t0=Date.now();
  const s=scene || SCENE || 'map';
  const data={
    v:3, scene:s,
    act:G.act, mapRow:G.mapRow, mapCol:G.mapCol, mapPath:(G.mapPath||[]).slice(),
    mapSeed:G.mapSeed||0,
    hero:G.hero, hp:G.hp, maxHp:G.maxHp, gold:G.gold, energy:G.energy, block:G.block,
    deck:G.deck.map(cardSnap), hand:G.hand.map(cardSnap), drawPile:G.drawPile.map(cardSnap), discard:G.discard.map(cardSnap),
    enemies:G.enemies.map(serializeEnemy), target:G.target, turn:G.turn, battleStartHp:G.battleStartHp,
    summons:G.summons.map(x=>({type:x.type, v:x.v, dur:x.dur, dur0:x.dur0, healV:x.healV, up:x.up})),
    shiWangOut: !!G.shiWangCard,
    exhaustedIdx:(G.exhausted||[]).map(c=>G.deck.indexOf(c)).filter(i=>i>=0),
    weak:G.weak||0, gouhun:G.gouhun||0, thorns:G.thorns||0, burn:G.burn||0, dodge:G.dodge||0, debuffImmune:G.debuffImmune||0,
    pendingEnergy:G.pendingEnergy||0, pendingDiscard:G.pendingDiscard||0,
    turnAtkBuff:G.turnAtkBuff||0, karmaFire:G.karmaFire||0, bloodPact:G.bloodPact||0, retain:G.retain||0, xiejia:G.xiejia||0,
    /* 跨回合的持久字段都要存，漏一个续档时会被 newState 的默认值静默归零 */
    endBlockKind:G.endBlockKind||null, xiejiaUp:!!G.xiejiaUp, xiejiaHealCap:G.xiejiaHealCap||0,
    ybTarget:(G.ybTarget!=null?G.ybTarget:-1),
    retainHeal:G.retainHeal||0, pendingBlockStart:G.pendingBlockStart||0,
    zombieDmg:G.zombieDmg||0, bleedSummons:!!G.bleedSummons, bleedSummonsBonus:(G.bleedSummonsBonus||1),
    hpLostTurn:G.hpLostTurn||0,
    shiqi:G.尸气||0, xuenu:G.xuenu||0, xisuiTurns:G.xisuiTurns||0, xisuiShiqi:G.xisuiShiqi||0,
    duhun:G.duhun||null, xuejiBonus:G.xuejiBonus||0, turnStats:G.turnStats||null,
    totalHpLost:G.totalHpLost||0, totalKills:G.totalKills||0, score:calcScore(),
    killNormal:G.killNormal||0, killElite:G.killElite||0, killBoss:G.killBoss||0, killSummon:G.killSummon||0,
    accMs:G.accMs||0,
    startTs:G.startTs||0,
    relics:G.relics||[], potions:(G.potions||[]).map(potionSnap),
    removeCount:G.removeCount||0, shopMarkup:G.shopMarkup||0, potionBought:G.potionBought||0,
    shopWares:G.shopWares?G.shopWares.map(cardSnap):null,
    shopPotions:G.shopPotions?G.shopPotions.map(potionSnap):null,
    campRemoved:!!G.campRemoved, campActed:!!G.campActed,
    wangyouTurns:G.wangyouTurns||0, wangyouDrunk:G.wangyouDrunk||0,
    log:G.log||[],
    rng:rngSnapshot()            // 随机态落盘，续档后牌序/掉落可复现
  };
  try{ Store.setJSON(runKeyOf(RUN_SLOT), data); }catch(e){}
  /* 只记脏不直传，云存档接口一分钟只能调一次 */
  if(typeof cloudMarkDirty === 'function'){ try{ cloudMarkDirty(); }catch(e){} }
}
function hasRunSave(){ try{ for(let i=0;i<RUN_SLOTS.length;i++){ if(Store.get(runKeyOf(i))) return true; } return false; }catch(e){ return false; } }
function readRun(i){ try{ return Store.getJSON(runKeyOf(i==null?RUN_SLOT:i)); }catch(e){ return null; } }
function clearRunSave(i){ try{ Store.del(runKeyOf(i==null?RUN_SLOT:i)); }catch(e){} }
/* 通关就销毁本局存档：光删一次治不住，得置 RUN_FINISHED 拒写，否则回菜单继续还能刷出通关记录 */
function destroyRunSave(){
  RUN_FINISHED=true;
  try{ Store.del(runKeyOf(RUN_SLOT)); }catch(e){}
  if(typeof cloudMarkDirty === 'function'){ try{ cloudMarkDirty(); }catch(e){} }
}
function continueRun(slot){
  if(slot!=null) setRunSlot(slot);
  let d; try{ d=Store.getJSON(runKeyOf(RUN_SLOT)); }catch(e){}
  if(!d){ floatMsg('该存档位是空的'); return; }
  RUN_FINISHED=false;
  G=newState();
  G.startTs=d.startTs||Date.now();
  G.accMs=(d.accMs!=null)?Math.max(0,d.accMs|0):Math.max(0, Date.now()-G.startTs);
  G.t0=Date.now();
  G.killNormal=d.killNormal||0; G.killElite=d.killElite||0; G.killBoss=d.killBoss||0; G.killSummon=d.killSummon||0;
  rngRestore(d.rng);          // 先恢复随机态，再重放后续判定
  G.act=d.act; G.mapRow=d.mapRow; G.mapCol=d.mapCol; G.mapPath=Array.isArray(d.mapPath)?d.mapPath:[]; G.hero=d.hero;
  // 曾被行末 // 注释整段吞掉，续档后生命/金币回落到默认值
  G.hp=d.hp; G.maxHp=d.maxHp; G.gold=d.gold;
  G.energy=d.energy!=null?d.energy:3; G.block=d.block||0;
  // 旧档没地图种子就铸一个，并把上一层列号/已走路径清空，让可达性走整层可选，不软锁
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
  G.summons=(d.summons||[]).map(x=>({type:x.type, v:x.v, dur:x.dur, dur0:(x.dur0!=null?x.dur0:x.dur), healV:x.healV, up:x.up}));
  if(d.shiWangOut && G.summons.some(x=>x.type==='shi_wang' && x.dur>0)){
    const sw = G.deck.find(x=>x.id==='shi_wang' && !G.hand.includes(x) && !G.drawPile.includes(x) && !G.discard.includes(x));
    if(sw) G.shiWangCard = sw;
  }
  G.exhausted=(d.exhaustedIdx||[]).map(i=>G.deck[i]).filter(Boolean);
  G.weak=d.weak||0; G.gouhun=d.gouhun||0; G.thorns=d.thorns||0; G.burn=d.burn||0; G.dodge=d.dodge||0; G.debuffImmune=d.debuffImmune||0;
  G.pendingEnergy=d.pendingEnergy||0; G.pendingDiscard=d.pendingDiscard||0;
  G.turnAtkBuff=d.turnAtkBuff||0; G.karmaFire=d.karmaFire||0; G.bloodPact=d.bloodPact||0; G.retain=d.retain||0; G.xiejia=d.xiejia||0;
  G.endBlockKind=d.endBlockKind||null; G.xiejiaUp=!!d.xiejiaUp; G.xiejiaHealCap=d.xiejiaHealCap||0;
  G.ybTarget=(d.ybTarget!=null?d.ybTarget:-1);
  G.retainHeal=d.retainHeal||0; G.pendingBlockStart=d.pendingBlockStart||0;
  G.zombieDmg=d.zombieDmg||0; G.bleedSummons=!!d.bleedSummons; G.bleedSummonsBonus=(d.bleedSummonsBonus||1);
  G.hpLostTurn=d.hpLostTurn||0;
  G.duhun=d.duhun||null; G.xuejiBonus=d.xuejiBonus||0; G.turnStats=d.turnStats||{dmgTaken:0,blocked:0,dealt:0,kills:[],daoxin:false};
  G.totalHpLost=d.totalHpLost||0;
  G.尸气=d.shiqi||0; G.xuenu=d.xuenu||0; G.xisuiTurns=d.xisuiTurns||0; G.xisuiShiqi=d.xisuiShiqi||0;
  G.wangyouTurns=d.wangyouTurns||0; G.wangyouDrunk=d.wangyouDrunk||0;
  G.log=d.log||[];
  G.enemies=(d.enemies||[]).map(restoreEnemy).filter(Boolean);
  PLAYER_HP_PREV=null; ENEMY_HP_PREV={};
  log(`继续旅程：第 ${G.act} 幕（生命 ${G.hp}/${G.maxHp} · 金币 ${G.gold}）`);
  hideOverlay();
  /* camp/shop/unknown 不走 setBg，得在这里显式摘掉 body.at-menu，否则 #app 整块不渲染 */
  if(document.body && document.body.classList) document.body.classList.remove('at-menu');
  if(d.scene==='battle'){ SCENE='battle'; setBg('act'+G.act); setBGM(battleBgmFor(G.enemies)); render(); } // 读档进 Boss 房也走 Boss 轨
  else if(d.scene==='camp'){ SCENE='camp'; renderCampfire(); }
  else if(d.scene==='shop'){ SCENE='shop'; renderShop(); }
  else if(d.scene==='unknown'){ SCENE='unknown'; showUnknown(); }
  else { SCENE='map'; showMap({entry:true}); }   // 续档落在地图页，走进场动画
}

