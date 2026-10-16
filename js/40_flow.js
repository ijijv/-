/* ============================================================================
 * 志怪塔 · js/40_flow.js —— 局内流程层
 * 胜负结算 winFight·loseGame / startBattle / 节点推进 / 本局存档 / 排行榜
 * ----------------------------------------------------------------------------
 * 由 原型.html 的整段内联脚本按原顺序切分而来（v0.61.05 三层重构，纯搬移）。
 * 拼接校验：本文件组去掉各自横幅后，应与切分前的内联脚本正文逐字节一致。
 * 加载：经典外链脚本（非 ES module），双击本地打开即可直接游玩。
 * ============================================================================ */
/* ===================== 流程推进 ===================== */
/* ===================== v0.76.0：胜负结算的墨色过场 =====================
   用户口径：「胜负结算动画可以做，但不只要淡入淡出，还要**场景的合理过渡**」，形态圈定为
   「收尾拍 敌人消散，手牌与牌堆依次收拢 → 留白 → 墨汁自四边洇入、盖满战场 →
    揭幕 墨从中裂开褪去 → 结算面板自下升起 + 落款印章」，并分级「普通轻 / 精英·Boss·结局重」。

   **为什么包成一个函数而不是改四条结算路径**：`showOverlay` 是它们的唯一汇合点。
   包在它外面 ⇒ 四条路径的正文（数值、文案、按钮）一个字都不用改，
   「面板长什么样」与「面板怎么出场」彻底解耦，回滚也只回滚这一个函数。

   ⚠️ **第一句必须是无头 / 低配 / 减弱动态的早返回、且同刻调 `openFn()`**：
      四条结算路径的既有断言全是「`showOverlay` 之后**立刻**读 DOM」，过场一旦异步化，
      它们会集体变红。这一句也是「冒烟照常打印并退出」的保障（没有它就会漏定时器）。
   ⚠️ **一次性**：`doubleGold()` 会把 `showBattleResult` 再调一次（同一场战斗的第二块面板），
      过场不能重播 —— 判据是 `G._settlePlayed`，由 `startBattle` / `revive` 两处重置。 */
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
  /* 可跳过：整段过场点一下就到终态。挂**捕获相** + 常驻到过场结束才摘 ——
     与 `animBindSkip` 的常驻口径不同，这里必须摘：过场结束还留着的话，
     之后每一次点击都会白跑一遍 `open()`/`finish()`（它们幂等，但那是纯浪费）。 */
  function skip(){ open(); finish(); }
  if(!_settleSkipBound){ _settleSkipBound=true;
    try{ window.addEventListener('pointerdown', skip, true); }catch(e){} }
  const later=(ms, fn)=>{ timers.push(setTimeout(fn, ms)); };

  /* 收尾拍：三拍错开全靠 CSS 的 transition-delay，这里只挂一个类。 */
  if(app) app.classList.add('closing');
  if(!heavy){
    /* 轻档：**只铺一块看不见的挡板**，不铺墨。`#scene-veil` 静息是 display:none，
       给个 display:block 而不加 .show ⇒ opacity 仍是 0，但**照样吃得下点击**
       （opacity:0 的元素会命中测试，visibility:hidden 才不会）。
       没有这一下的话，这 0.5 秒里战场还是可交互的 —— 结算面板还没开，
       而敌人已经死光，玩家能继续点牌。 */
    if(veil) veil.style.display='block';
    later(520, ()=>{ open(); finish(); });
    return;
  }
  /* 重档：收尾拍 .45 → 墨自四边洇入 .55 → 留白 .3 → 揭幕（开面板 + 墨从中裂开 .5） */
  /* v1.1.23（用户报障「结算画面停留一会儿，怎么会黑屏」）：heavy 档是**结局视频缺席 / 解码失败**
     时唯一的回落出口（settleVideo 的三条回落路径都汇到这里）。v1.1.x 为让视频末帧充当背景，
     把整屏背景图撤了 —— 视频一旦没播成，结算面板就落在 #overlay 的 88% 黑幕上，看着就是「黑屏」。
     这里把整屏背景铺回去（失败 bg_defeat.jpg / 战胜 bg_victory.jpg），观感与「视频末帧」同一档：
     两张都在 SCENE_BG 表内 ⇒ #overlay 黑幕放松到 55%，图才透得出来。视频成功播放时这条不会走，
     所以 v1.1.x 的「视频末帧当背景」口径原样保留；铺下的背景随后由复活 setBg('act'+N) 或
     回主菜单 setBg('menu') 自然接管，不需要专门摘。 */
  if(typeof setBg==='function'){ try{ setBg(mode==='lose' ? 'defeat.jpg' : 'victory.jpg'); }catch(e){} }
  later(450, ()=>{ if(veil){ veil.style.display='block'; veil.className='show '+(mode==='lose'?'lose':'win'); } });
  later(1300, ()=>{ open(); if(veil) veil.classList.add('parting'); });
  later(1850, finish);
}
/* ===================== v1.1.x 结局结算视频（用户提供素材 素材/bg/<角色>-win/lose.mp4） =====================
   只在**整局终幕**两处接入：showVictory（通关）与 loseGame（被击败且不再复活）。
   普通战斗结算（showBattleResult）**不接** —— 保留原墨过场，否则每场战斗都放片会淹死玩家。
   形态：全屏视频播完**停在末帧**，结算面板（#overlay z-index:10）浮在画面上；
   视频 pointer-events:none 不吃点击；hideOverlay 收面板时一并摘掉（见 50_ui.js）。
   ⚠️ 武僧的 hero id 是 `wuseng`，素材文件名是 `kuseng` ⇒ 表里映射。
   ⚠️ 无头/关特效/素材缺失 ⇒ 一律回落 settleTransition 墨过场，**同刻或按时开面板**，
      冒烟断言（loseGame/showVictory 之后立刻读 DOM）不受影响：无头下 animLive() 为假，直接 openFn()。 */
var _settleVid=null;
const SETTLE_VID_HERO={ wuseng:'kuseng' };   // hero id → 素材名（其余同名）
function settleVideo(mode, openFn){
  if(!animLive() || menuFxOff()){ openFn(); return; }
  /* v1.1.x（用户 2026-10-12）：「不论是战败还是战胜，都要顿时终止背景音乐」 ——
     结局视频一开场就把 BGM 掐掉，别让塔顶/战场的循环音乐盖过片子的声音。 */
  if(typeof stopBGM==='function'){ try{ stopBGM(); }catch(e){} }
  const hero=(G && G.hero) || 'tianshi';
  const key=SETTLE_VID_HERO[hero]||hero;
  const rel='bg/'+key+'-'+(mode==='lose'?'lose':'win')+'.mp4';
  /* 单文件产物：ASSET_MAP 是唯一真相源，键不在 ⇒ 素材没进包，直接走墨过场。
     拆包/开发树：ASSET_MAP=null 探不了 ⇒ 试播，onerror 再回落。 */
  if(ASSET_MAP && !ASSET_MAP[rel]){ settleTransition('heavy', mode, openFn); return; }
  const v=document.createElement('video');
  v.src=assetURL(rel, true); v.autoplay=true; v.playsInline=true; v.preload='auto';
  v.setAttribute('playsinline',''); v.setAttribute('webkit-playsinline','');
  /* v1.1.18（用户 2026-10-14 报障：「战败动画出现前先闪一小段没有视频源的空图」）：
     成因是 video 一创建就被 append，而素材还没解出首帧（单文件产物里这段 mp4 是几十 MB 的
     data: URI，解码窗口更长）；此时 WebView 会把「视频未就绪、要点一下才播」的**原生播放按钮占位**
     画出来，前后各配一帧纯黑 —— 那就是用户说的「无视频源的图片」。
     处置（两条一起上，缺一仍有残留）：
       ① 显式 v.controls=false —— 部分 WebView 会自作主张给视频挂原生控件条；
       ② 首帧就绪前整块 opacity:0（不绘制 ⇒ 播放按钮占位根本没机会画出来），
          屏幕上仍是刚刚的战局画面；loadeddata / playing 任一到达再淡入。
     ⚠️ 不能改成「一开始就 muted」来绕：那会让本来能带声的结局片一律静音。
        muted 只在 unmuted 自动播放被拦时作**重试**（见文件下方 play().catch 那一支）。 */
  v.controls=false;
  v.style.cssText='position:fixed;inset:0;width:100%;height:100%;object-fit:cover;z-index:5;background:#000;pointer-events:none;opacity:0;transition:opacity .24s ease-out';
  let fin=false, shown=false;
  const show=()=>{ if(shown) return; shown=true; v.style.opacity='1'; };
  const done=()=>{ if(fin) return; fin=true; show(); openFn(); };
  const drop=()=>{ try{ v.parentNode&&v.parentNode.removeChild(v); }catch(e){} if(_settleVid===v) _settleVid=null; try{ document.body.classList.remove('settle-vid'); }catch(e){} };
  const fallback=()=>{ if(fin) return; fin=true; drop(); settleTransition('heavy', mode, openFn); };
  v.addEventListener('loadeddata', show);     // 首帧解码完成 ⇒ 淡入
  v.addEventListener('playing', show);        // 兜底：个别 WebView 不派 loadeddata
  v.addEventListener('ended', done);          // 播完**不摘**：停在末帧当结算面板的背景
  v.addEventListener('error', fallback);
  _settleVid=v;
  try{ document.body.classList.add('settle-vid'); }catch(e){}   // 把 #overlay 的 88% 黑幕压到 50%，末帧才透得出来
  document.body.appendChild(v);
  const p=v.play&&v.play();
  if(p&&p.catch) p.catch(()=>{
    /* 自动播放被拦（带声）⇒ 静音重试一次；再失败才回落墨过场。 */
    v.muted=true; const p2=v.play&&v.play();
    if(p2&&p2.catch) p2.catch(fallback);
  });
  /* 看门狗：12 秒还没播完（素材损坏 / 解码卡死）⇒ 直接开面板，视频留在末帧也无妨。 */
  setTimeout(()=>{ if(!fin){ try{ v.currentTime=v.duration||0; }catch(e){} done(); } }, 12000);
}
/* 摘掉结局视频（若挂着）。结算面板关闭的出口都要调：
   hideOverlay（复活 / 继续）与 showStartScreen（回主菜单 / 再打一局）。 */
function settleVidDrop(){
  if(!_settleVid) return;
  const v=_settleVid; _settleVid=null;
  try{ document.body.classList.remove('settle-vid'); }catch(e){}
  try{ v.pause&&v.pause(); }catch(e){}
  try{ v.parentNode&&v.parentNode.removeChild(v); }catch(e){}
}
/* ===================== v1.1.23 终局慢镜（用户口径） =====================
   用户 2026-10-16：「不论角色还是敌人，在终结游戏的最后一个行为要加入行为 + 音效 + 特效的**慢动作**，
   再衔接结算动画。」—— 用户在别处说的「纯动画增量」就是**既有 heroAnim / enemyActAnim 那套行为效果**，
   不是 `_动作产线/` 的帧序列。
   ⇒ 本局终点两处（loseGame 被击败 / showVictory 通关）在推结算视频前，先把「最后一下」放慢播一遍：
     · lose：玩家立绘中刀（hero-hit）+ 出手敌人 e-atk + 承伤暗角 + 音效；
     · win ：收尾敌人（Boss）的 dying 消散重排一次 —— 在 body.finale-slow 下拉长的时长里播完。
   实现只靠一个 body 级 class（body.finale-slow，见 原型.html）⇒ **不动任何判定数值**。
   ⚠️ 无头 / 关特效 ⇒ **同刻** then()：冒烟在 loseGame 之后立刻读 DOM，不能异步化。
   ⚠️ loseGame 的 `if(G.dead) return` 重入守卫在其函数首行 ⇒ 本函数必须在守卫**之后**、settleVideo **之前**调。
   ⚠️ 不走 heroAnim / enemyAttackAnim：它们自带 360 / 560ms 的摘类定时器，会把慢镜**截断**；
      这里直接挂类、留到终局由 clean() 统一摘。 */
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
    /* 玩家中刀：直接挂 hero-hit 并留到终局（heroAnim 会 360ms 摘类，截断慢镜） */
    try{ const b=document.querySelector('.hero-art-box');
      if(b){ b.classList.remove('hero-attack','hero-hit','hero-cast'); void b.offsetWidth; b.classList.add('hero-hit'); } }catch(e){}
    /* 出手的敌人：同刻重排一次 e-atk（同样留到终局） */
    try{ (G.enemies||[]).forEach(e=>{ if(!alive(e)) return;
      const el=(typeof enemyEl==='function')?enemyEl(e):null; if(!el) return;
      el.style.setProperty('--atk-delay','0ms'); el.style.setProperty('--atk-times','1');
      el.classList.remove('e-atk'); void el.offsetWidth; el.classList.add('e-atk'); }); }catch(e){}
  } else {
    try{ sfx('death'); }catch(e){}
    /* 收尾敌人的消散重排一次：此刻 DOM 还停在死亡前的渲染（dying 类要下一次 render 才写），
       所以优先按 e.dying 找到元素再手动挂类。 */
    try{ const de=(G.enemies||[]).find(x=>x && x.dying);
      const el=de ? ((typeof enemyEl==='function')?enemyEl(de):null) : document.querySelector('.enemy.dying');
      if(el){ el.classList.remove('dying'); void el.offsetWidth; el.classList.add('dying'); } }catch(e){}
  }
  setTimeout(finish, 1600);
}
/* ===================== v1.1.24 新手教程 · 流程控制（教程成品脚本落定） =====================
   线性 6 关：goNext 单点拦截推进；死亡转 tutOnDeath 重开本关；recordScoreRun 不入榜；
   saveRun 全程不写（教程局不产存档 ⇒ 重玩教程也不冲掉玩家的旧档）。 */
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
  const T=G.tutorial; T.node=i; T.force=null; T.draw=null; T.foeOv=null; T.flags={};   // v1.1.25：一次性标记随关重置（重开本关也重播）
  if(typeof narrateClear==='function') narrateClear();
  if(typeof tutSkipShow==='function') tutSkipShow(true);
  if(N.key==='fight'||N.key==='elite'||N.key==='boss'){
    if(i===2||i===5) G.hp=G.maxHp;   // 精英关、Boss 关进关前回满
    T.draw=N.draw.slice(); T.foeOv=N.foeOv;
    startBattle(N.foes.slice());
  } else if(N.key==='shop'){
    G.gold=(N.gold!=null?N.gold:120);
    G.shopWares=N.wares.map(id=>cardById(id)); G.shopPotions=[];   // 教程固定货位（showShop 见非 null 不重抽）
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
/* 事件机：30_engine / 50_ui 各钩子汇到这里。flags 记一次性，重开本关时随 node 重置。 */
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
    /* 带着强制锁收回合 = 玩家没照做（如没出金刚符）—— 放锁收旁白，挨打时由 playerHit 讲变体 */
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
/* 强制出牌：锁的是卡牌 id（playCard 拦别的牌，doPlayCard 命中即清锁）。 */
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
  if(typeof playVoice==='function') playVoice('tut_6e');   // v1.1.25r：出师那段整屏旁白也配音
}
function tutFinish(){
  if(typeof stopVoice==='function') stopVoice();
  if(G&&G.tutorial) G.tutorial.on=false;
  markTutorialSeen();
  /* v1.1.25r：教程结束**兜底**发放那 3 张【试玩符纸】（幂等 —— 打完僵王若已在奖励界面点过
     「收下」，这里 grantTutTrialOnce 直接返回 0；玩家中途没点也保证到手）。 */
  if(typeof grantTutTrialOnce==='function'){ try{ grantTutTrialOnce(); }catch(e){} }
  try{ grantRunMilestones(); }catch(e){}   // 里程照算（用户口径：教程局仅不入榜）
  hideOverlay();
  confirmNewGame();   // 开新局 → 选角界面（用户拍板）
}
/* 常驻跳过：单击即跳，免确认（用户口径）。旧档不动 —— 教程全程 saveRun 空转。 */
function tutSkip(){
  if(!G||!G.tutorial||!G.tutorial.on) return;
  G.tutorial.on=false;
  if(typeof narrateClear==='function') narrateClear();
  if(typeof tutSkipShow==='function') tutSkipShow(false);
  markTutorialSeen();
  /* v1.1.25r（用户口径「跳过当然也能照样得到哇」）：**跳过教程也照发**那 3 张【试玩符纸】——
     与「打完僵王领奖励」走同一个 grantTutTrialOnce()（trialGiftV1 守卫，只领一次，重玩不再给）。 */
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
  if(typeof playVoice==='function') playVoice('tut_die');   // v1.1.25r：倒下那段旁白也配音
  /* v1.1.25：先播玩家阵亡倾倒（用户口径「死亡动画也没有」），再上「倒下了」面板；
     无头 / 关特效 ⇒ 同刻上屏（不给冒烟添定时器）。 */
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
  if(G.battleOver) return; // v0.61 B4：重入守卫 —— 一场战斗只结算一次胜利
  G.battleOver=true;
  if(G.tutorial && G.tutorial.on && typeof tutOn==='function'){ try{ tutOn('battleWin'); }catch(e){} }   // v1.1.24 教程：击杀讲解
  sfx('win');
  HITFX.enemies.clear();
  log('击败了所有敌人！');
  if(G.shiWangCard) returnShiWangCard(); // 尸王：战斗结束消散，牌回到弃牌堆
  if(G.exhausted && G.exhausted.length){ const _n=G.exhausted.length; G.exhausted=[]; log(`本关结束，${_n} 张消耗牌回归牌库`); }
  track('battleWin');
  const hasElite=G.enemies.some(e=>e.elite);
  const isBoss=G.enemies.some(e=>e.boss);
  if(hasElite){ const p=randomPotion(); gainPotion(p); log(`击败精英，获得灵汁【${p.name}】`); }
  G.finalBoss = isBoss && G.act>=ACTS.length;
  // v0.61.10(P7)：战后金币 3/6/9 → 4/8/12（普通/精英/Boss）。Boss 血量与篝火密度均不动。
  let g=4; if(hasElite) g=8; if(isBoss) g=12;
  if(hasRelic('jubaopen')) g=Math.floor(g*1.5);
  G.gold+=g; log(`获得 ${g} 金币`);
  const hpLost = Math.max(0, G.battleStartHp - G.hp);
  /* v1.1.23（用户口径）：游戏内成就已删、用户已在 TapTap 后台重建 6 条 ⇒ winFight 里原
     「无伤(wushang) / 零符(lingfu) / 屠神(tushen)」三条上报点整条移除（新 6 条无对应项）。
     新上报点：新局开始→登塔 Beginning、推进第三幕→Hard-three、累计击杀→身经百战 All-unlocked、
     局末按已通关角色数→全能降魔者 No-matter-Who、解锁角色→Get-all、首次上榜→Nice-encounter。 */
  let h=0, extra=0;   // h = 基础战后恢复；extra = 「战后额外恢复」（招魂幡/返魂香，结算面板单独标识）
  if(!G.finalBoss){
    if(isBoss){ h=Math.floor(G.maxHp*0.5); log(`击败 Boss，汲取妖气恢复 ${h} 点生命（50%）`); }
    else { h=8; log(`战后恢复 ${h} 点生命`); }
    if(h>0) heal(h);   // 回血一律走 heal ⇒ 带 heal 特效（用户口径：每次回血都要特效）
    /* 百鬼录[金] 本次改造：精英 → 精英和 Boss，均为 +5 最大生命（并回复 5 点生命）。 */
    if((hasElite || isBoss) && hasRelic('baiguilu')){ G.maxHp+=5; heal(5); log('百鬼录：击败精英/Boss，最大生命 +5'); }
    if(hasRelic('fanhunxiang')){ extra+=6; log('返魂香：战后额外恢复 6 点生命'); }
    if(hasRelic('zhaohunfan')){ extra+=4; log('招魂幡：战斗结束额外恢复 4 点生命'); }
    if(extra>0) heal(extra);
  }
  G.pendingRelic = hasElite || isBoss;
  G.rewardTier = isBoss?'boss':hasElite?'elite':'normal';
  G.lastGold=g; G.battleGold=g; G.goldDoubled=false;
  G.battleResult={g, hpLost, h, extra, isBoss, finalBoss:G.finalBoss};
  /* v1.1.x（用户口径）：**撤掉「战斗结算」面板** —— 打完直接走「掉落 → 抽牌」，选完牌自动进地图。
     三条特例：
       · 最后一幕最后一关 boss（G.finalBoss）：不掉落、不抽牌，直接结束（advanceAct → 通关画面）。
       · 前 1/2 幕 boss：战利品（遗物 + 灵汁）随掉落就地发放，图标飞进锦囊；抽完牌**自动进锻造**。
       · 精英：额外来一件遗物（走既有遗物三选一，选中那件飞进锦囊）。
     ⚠️ showBattleResult 本体**保留**（冒烟 / 驱动脚本仍直接调它，smoke_runner.js:832/841）；只是战斗流程不再经过。
     ⚠️ 因此 `result-scene` 的墨过场也不再从这条战斗路径走（loseGame / showVictory 仍然照走，那两条没撤）。 */
  if(G.finalBoss){ advanceAct(); return; }
  if(isBoss){
    G.rewardTier=null;   // v0.61 B5：Boss 不产卡，就地清空 tier，别泄漏给下一家商店的稀有度表
    const relic=weightedRelic(); grantRelic(relic);
    const potion=randomPotion(); gainPotion(potion);
    log(`击败幕主，获得遗物【${relic.name}】和灵汁【${potion.name}】`);
  }
  playDropSequence();   // 击杀末敌掉落动画 → 抽牌界面（详见 50_ui.js）
}
function showBattleResult(r){
  const names=G.enemies.map(e=>e.name).join('、');
  /* 「战后额外恢复」标识（招魂幡/返魂香）—— md 明确要求单列，别和基础恢复混在一句里。 */
  const extraTxt = r.extra ? `额外汇总恢复 <b style="color:var(--green)">+${r.extra}</b> 生命` : '';
  const healTxt = r.h ? `恢复 <b style="color:var(--green)">+${r.h}</b> 生命${r.isBoss?'（50%）':''}` : '';
  /* v1.0.1：广告入口全部隐藏（尚未接入广告）—— 保留 doubleGold / adPlaceholder 本体，
     接广告后把这一行还原即可。 */
  const doubleBtn = '';
  const html=`<h2>战 斗 结 算</h2>
    <p>击败 <b>${names}</b><br>
    获得金币 <b style="color:var(--gold)">+${G.battleGold}</b> · 本场耗血 <b style="color:var(--red)">${r.hpLost}</b>${healTxt?` · ${healTxt}`:''}${extraTxt?` · ${extraTxt}`:''}</p>
    <p style="font-size:14px">当前生命 <b>${G.hp}</b> / ${G.maxHp}</p>
    ${doubleBtn}
    <button class="btn" onclick="continueAfterBattle()">继续</button>`;
  /* 分级：`G.rewardTier` 由 winFight 按 精英/Boss 算好（'elite'/'boss' ⇒ 重档）。
     ⚠️ **不要读 `G.battleResult.isBoss` 之外的东西**：showBossReward 会把 rewardTier 清成 null，
     而 doubleGold 是在那之前调回来的 —— 两处一起判才稳。
     ⚠️ 第三实参 `result-scene` 是「面板自下升起」那一套 keyframe 的**唯一**挂钩，漏传不报错。 */
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
  G.rewardTier = null; // v0.61 B5：Boss 奖励是遗物/灵汁/锻造、不产卡 —— 就地清空 tier，别让「boss」泄漏到下一场商店的稀有度表
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
  if(G&&G.tutorial&&G.tutorial.on){ tutAdvance(); return; }   // v1.1.24 教程：线性 6 关推进的唯一收口
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
  G.shopWares=null;
  if(G.mapRow>=MAP.length){ advanceAct(); return; }
  showMap();
}
function advanceAct(){
  if(G.act>=ACTS.length){ showVictory(); return; }
  G.act++;
  if(G.act>=3) tapAchieve('Hard-three');   // v1.1.23：推进到第三幕 → 上报「初入第三幕」
  MAP=ACTS[G.act-1];
  G.mapRow=0; G.mapCol=-1; G.mapPath=[]; G.shopWares=null;
  showOverlay(`<h2>第 ${G.act} 幕 · ${ACT_NAMES[G.act-1]}</h2><p>更凶的妖魔盘踞在更高层。<br>敌人的生命与攻击都变强了。</p><button class="btn" onclick="hideOverlay(); showMap({entry:true});">开始攀登</button>`);
}
/* ===================== v1.1.x：结算分数 / 里程的分项与动画（用户 2026-10-12 重做） =====================
   用户口径：左上「总分计算过程」逐条弹出、右侧累计，**不从 0 慢滚**；停稳后大号 num 浮字
   从右到左依次弹出组成总分；右上「里程分数」同法、与分数计算同时进行；只要纯文字数字 + 透明背景。
   角色的 num 配色（用户指定）：block=苦僧(武僧) / dmg=天师 / heal=赶尸人 / hurt=阴差。 */
const SETTLE_KIND={ tianshi:'', ganshiren:'heal', wuseng:'block', yincha:'to-player' };
const SETTLE_NUMCLS={ '':'dmg', 'to-player':'hurt', 'block':'block', 'heal':'heal' };
function settleKind(){ return SETTLE_KIND[(G && G.hero) || 'tianshi'] || ''; }
/* 本局用时（毫秒）。v1.1.x（用户 2026-10-12）：改成「累计量 + 当前段」两段式 ——
     · accMs = 已冻结的累计毫秒（每次 saveRun 结算一次）
     · t0    = 当前计时段起点（新局 / 续档 / 存档后各自落定）
   用时 = accMs + (now - t0)。切后台仍走真实墙钟（照样累计）；**存档期间停表**
   （saveRun 把到此刻的累计量写进 accMs、并把 t0 挪到此刻 ⇒ 关掉游戏那段时间不再计入）。 */
function runElapsedMs(s){ const g=s||G; if(!g) return 0;
  return Math.max(0, (g.accMs||0) + (g.t0 ? (Date.now()-g.t0) : 0)); }
/* 通关用时加分（**仅通关结算**，用户口径）：0~15min +3000 / 15~30min +1500 / 30~50min +800 / 50min 往后 +400。 */
function clearTimeBonus(sec){
  const m=(sec||0)/60;
  if(m<15) return 3000;
  if(m<30) return 1500;
  if(m<50) return 800;
  return 400;
}
/* 总分分项（用户 2026-10-12 定稿口径 / 2026-10-17 修订）：
     层数推进 = 全局层号×50 · 普通击杀×40 · 精英击杀×140 · Boss 击杀×300 ·
     剩余金币×8 · 灵汁剩余×240；用时加分与 +1000 通关加成**仅通关时**计入。
     （2026-10-17 删去「召唤物击杀」「剩余生命」两条。）
   「层号」按**全局楼层**算：(幕-1)×14 + 当前层（1 基）—— 单调递增，契合「推进」语义。
   2026-10-16 修订：击杀四档 10/20/30/5 → **6/8/10/7**；剩余生命 ×10 → **×1**。
   2026-10-17 定稿（用户口径）：层数推进 ×40 → **×50**；击杀**三档**（普通/精英/首领）
   ×6 / ×8 / ×10 → **×40 / ×140 / ×300**；**删去「召唤物击杀」与「剩余生命」两条**；
   灵汁剩余 ×40 → **×240**；剩余金币 ×8 **不变**。 */
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
/* 结算面板正文（纯文字数字 + 透明背景、无纯色底板）。返回 { html, kind, sp, mp, sTot, mTot } 交给 settleAnim。 */
function settleResultHTML(mode){
  const kind=settleKind();
  /* v1.1.8（用户报障「结算 +700 多、里程界面只 +500 多」）：里程分项取**发放当刻的快照**
     （grantRunMilestones 落 G._mileParts）—— 「先败 → 复活 → 再败」时，第二次结算若用当时的 G
     重算会显示一个**根本没发出去**的更大值（幂等守卫已把第二次发放挡掉了）。分数 sp 不受此限：
     总分是每局实时重算的（复活后分数确实会涨，也真的会入榜）。 */
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
    /* v1.1.15：覆盖存档的败局结算 —— 只有「返回」（回选角界面），不给免费复活。 */
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
    /* v1.1.8（用户口径「结算画面的『里程』是本局获得的、『累计』就是里程界面该角色海报下的累积」）：
       「累计」直接读 milePts(G.hero) —— 与里程界面海报下 `.ml-hinfo` 的读数是**同一个数**，
       不再用无参的全局 p.pts（那是跨角色累加，与界面读数对不上）。
       ⚠️ 这一行是**静态**的、不进 `#settle-mile-rows`：settleAnim 按「行序」对齐 R.mp，多一行会让下标错位。 */
    +'<div class="settle-acc">累计 <b>'+(typeof milePts==='function' ? milePts((G&&G.hero)||'tianshi') : 0)+'</b> 点</div>'
    +'</div>'
    +'<div class="settle-actions">'+btns+'</div>'
    +'</div>';
  return { html:html, kind:kind, sp:sp, mp:mp, sTot:sTot, mTot:mTot };
}
/* 结算动画：① 逐条弹出分项 + 累计（分数/里程同一拍）② 停稳后大号 num 浮字从右到左弹出。
   ⚠️ 无头 / 关特效 ⇒ 直接落终态、**不排任何 setTimeout**（冒烟与低配档零影响）。 */
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
  const dS=putBig('#settle-big', R.sTot), dM=putBig('#settle-bigm', R.mTot);   // 先占位（CSS opacity:0），布局不跳
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
      sfx('number');   // v1.1.x：滚字滴答（每弹一条分项一声）
      const sr=sRows[i];
      if(sr){ sr.classList.add('on'); const v=sr.querySelector('.settle-val'); if(v) v.textContent='+'+R.sp[i].val; aS+=R.sp[i].val; if(sSum) sSum.textContent=String(aS); }
      const mr=mRows[i];
      if(mr){ mr.classList.add('on'); const v=mr.querySelector('.settle-val'); if(v) v.textContent='+'+R.mp[i].val; aM+=R.mp[i].val; if(mSum) mSum.textContent=String(aM); }
    }, i*150);
  })(i); }
  const dl=dS.length, dm=dM.length, n=Math.max(dl, dm);
  setTimeout(function(){
    for(let k=0;k<n;k++){ (function(k){
      const idx=n-1-k;                      // 右到左：最末位先出
      setTimeout(function(){ sfx('number'); if(dS[idx]) dS[idx].classList.add('on'); if(dM[idx]) dM[idx].classList.add('on'); }, k*95);
    })(k); }
  }, N*150+280);
}
/* v1.1.15：把一份存档数据**轻量水合**成「只为结算用」的临时局 ——
   不做 buildActs / 牌堆复原（那些对算分与里程毫无意义），只覆写算分/里程/榜单读取的字段。
   返回 null 表示这份档没法结算（调用方兜底删档回选角）。 */
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
/* v1.1.15（用户口径 Q3/Q4）：「继续」覆盖旧档 ⇒ 立即为**旧档里那个角色**补一场败局结算
   （算分 + 里程 + 入榜，播旧角色的败局视频），随后删档；结算页只有「返回」，点它回选角界面。
   ⚠️ 全程临时替换全局 G（选角界面那份新局态先存起来）。**settleVideo 必须在 G=t 期间调用**
   —— 它同步读 G.hero 选片源；openFn 回调只碰已生成的 R（不读 G），故恢复 savedG 后触发也安全。 */
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
  if(G&&G.tutorial&&G.tutorial.on){ tutOnDeath(); return; }   // v1.1.24 教程：死亡转「重来本关」，不走败局结算
  if(G.dead) return; // 防止重复结算（多张怨气/连续判定）
  G.dead=true; G.battleOver=true; // v0.61 B4：胜负旗标统一收口
  if(typeof heroDeath==='function') heroDeath(true);   // v1.1.25：玩家阵亡倾倒（配合 finaleBlow 的 1.6s 慢镜）
  sfx('lose');
  track('death');
  G.score=calcScore();
  /* v1.0.19：**整局总分榜** —— 被击败即入榜（不用等玩家点「放弃」，直接关掉也算数）。
     复活后分数还会涨，recordScoreRun 按 startTs 去重取最高分 ⇒ 不会重复也不会记低分。 */
  recordScoreRun(false);
  /* v1.1.x（用户 2026-10-12）：**省去失败整屏背景图**（defeat.jpg）——
     结算画面由角色败局视频的末帧承担背景，不再额外铺一张整屏图。
     revive() 仍显式把战斗背景铺回去（`setBg('act'+G.act)`），不依赖这里。 */
  /* v1.0.15：失败也累计里程碑（幂等 —— 复活后再败/再胜不会重复发）。
     v1.1.x：结算画面重做 —— 透明浮层 + 左上「总分计算过程」+ 右上「里程分数」+ 右下按键，
     不再有 <h2> 标题、得分行、里程碑框等赘述；大号 num 浮字从右到左弹出组成总分。 */
  grantRunMilestones();
  const R=settleResultHTML('lose');
  /* v1.1.x：结局接**角色败局视频**（settleVideo 内部无头/缺素材回落墨过场）。
     v1.1.23：先播一段「承受到致命伤害」的终局慢镜（玩家中刀 + 出手敌人 + 音效 + 暗角），再衔接结算。 */
  finaleBlow('lose', ()=>{ settleVideo('lose', ()=>{ showOverlay(R.html, undefined, 'result-scene'); settleAnim(R); }); });
}
function giveUp(){
  if(typeof settleVidDrop==='function') settleVidDrop();   // v1.1.x：败局面板点「放弃」也要摘掉结局视频
  const sc=G.score||calcScore();
  G.score=sc;                 // v1.0.19：落定分数，供整局总分榜记录（放弃也算一整局）
  clearRunSave();
  recordScoreRun(false);
  /* v1.1.x（用户 2026-10-12）：分数 / 里程已结算完，「放弃 · 结束本局」直接回主菜单 ——
     不再多弹一层「本局结束」面板（结算画面已经承担了这件事）。 */
  showStartScreen();
}
function revive(){
  G.dead=false;
  /* v0.61.30 修：复活回到的是**同一场战斗**，必须把 B4 的终局旗标一起清掉。
     否则 battleOver 恒为 true → 之后打死最后一个敌人时 winFight() 在重入守卫处直接 return，
     战斗永远不结算，表现为「敌人已清」但界面卡死。 */
  G.battleOver=false;
  /* v0.76.0：复活回到的是**同一场战斗**，结算过场的一次性标记也要一起清 ——
     否则看了败局墨幕、复活、再打赢 Boss，胜利结算会静默地不铺墨（而没有任何闸会响）。 */
  G._settlePlayed=false;
  G.hp=G.maxHp; G.weak=0; G.gouhun=0; G.thorns=0; G.block=0; G.burn=0;
  G.discard=G.discard.concat(G.hand); G.hand=[];
  if(typeof heroDeath==='function') heroDeath(false);   // v1.1.25：复活回到同一场战斗 ⇒ 摘掉阵亡倾倒类
  /* v0.74.0：复活回的是**同一场战斗** ⇒ 必须把战斗背景铺回去（失败屏刚把它换成了 bg_defeat）。
     漏掉这一句的表现是「血回满了、顶栏回来了，可背后还是那张败局图」，而且没有任何闸会响。
     表达式与 startBattle 里那一行逐字相同 —— 别写成两个不同的判法。
     v1.1.14（用户 2026-10-14 报障「复活后本关无背景音乐」）：失败屏把 BGM 一并换掉了
     ⇒ 复活回同一场战斗，必须把**战斗轨**铺回去（与 startBattle 的选轨逐字同源：
     交给 battleBgmFor(G.enemies) 判 Boss/精英/普通轨）。漏掉这一句的表现是
     「血回满了、画面回来了，可整场战斗静音」，而且没有任何闸会响。 */
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
  G.finalBoss=true;                 // 通关即终局：结算画面的「用时 / 通关加成」分项靠它（scoreParts）
  G.score=calcScore();
  /* v1.1.x（用户 2026-10-12）：**省去通关整屏背景图**（victory.jpg）——
     结算画面由角色通关视频的末帧承担背景，不再额外铺一张整屏图。
     出口 startGame() 经 showHeroSelect()→setBg('hero_select.jpg')，回主菜单由 setBg('menu') 接管。 */
  /* v1.0.14：通关即**终结本局** —— 清掉本局存档。根因是打出最后一张牌时 winFight() 直接 return，
     跳过了 saveRun()，本局档还停在进战斗前（打 Boss 时就是「Boss 战前」）⇒ 续档面板会留一份打不透的档。
     v1.0.17b：升级为 destroyRunSave() —— 置 RUN_FINISHED 拒写 + 删本场那槽 + 云端记脏。
     用户报障「通关后退出菜单再继续，会重新刷新一份通关记录，而且是有存档的」，
     根因就是通关后还有路径能把这一局写回存档位（只删一次是治不住的，必须拒写）。 */
  destroyRunSave();
  /* 用时起点 startTs 由 confirmNewGame / continueRun 落定（并随存档往返）。 */
  const __elapsed=runElapsedMs();
  /* v1.0.15：通关同样累计里程碑（幂等）。 */
  grantRunMilestones();
  /* v1.0.17：记一笔**通关计时**（用户口径「之前的排行榜你全删了，我要保留通关计时榜，
     现在把榜单放在设置里」）。只在通关这一处写入；失败/放弃不入榜。 */
  recordClearTime(__elapsed);
  recordScoreRun(true);   // v1.0.19：整局总分榜（通关，含 +5000 加成）
  /* v1.1.x：结算画面重做 —— 透明浮层 + 左上「总分计算过程」+ 右上「里程分数」+ 右下按键
     （战胜保留「再打一局 / 返回主菜单」）。排行榜入口已移到主界面右下，故不再在结算页放榜单按钮。 */
  const R=settleResultHTML('win');
  /* 通关是**最重**的一档（金墨自下升）。`giveUp()` 刻意**不接** —— 它不是结算，
     是结算面板上的一个次级出口，给它铺一场墨幕会显得「又赢了一次」。
     v1.1.x：结局接**角色通关视频**（settleVideo 内部无头/缺素材回落墨过场）。
     v1.1.23：先播一段终局慢镜（收尾敌人的消散放慢），再衔接结算。 */
  finaleBlow('win', ()=>{ settleVideo('win', ()=>{ showOverlay(R.html, undefined, 'result-scene'); settleAnim(R); }); });
}

/* ===================== 通关计时榜（v1.0.17） =====================
   用户口径：「之前的排行榜你全删了，我要保留通关计时榜，现在把榜单放在设置里」。
   所以这里只做**一件事**：谁通关用的时间最短。不做无尽、不做分数总榜、不做联网。
   排序口径：用时升序（越快越前），只留前 10 条 —— 榜的意义就是「最好成绩」，
   留满屏的历史记录反而看不出重点。 */
const CLEAR_KEY='zhiguaitower_cleartimes_v1';
const CLEAR_MAX=10;        // 每个榜**展示**条数
const CLEAR_STORE=60;      // 本机**存储**上限（够 4 个角色分榜各留若干条；展示时再按角色过滤取前 10）
function readClearTimes(){
  try{ const a=JSON.parse(Store.get(CLEAR_KEY)||'[]'); return Array.isArray(a)?a:[]; }catch(e){ return []; }
}
function writeClearTimes(a){ try{ Store.set(CLEAR_KEY, JSON.stringify((a||[]).slice(0, CLEAR_STORE))); }catch(e){} }
function fmtMMSS(ms){ const t=Math.max(0, Math.floor((ms||0)/1000));
  const m=Math.floor(t/60), s=t%60; return m+':'+(s<10?'0':'')+s; }
function recordClearTime(ms){
  if(!(ms>=0)) return;
  /* v1.0.17b：幂等去重 —— 同一局（G.startTs 相同）只入榜一次。
     用户报障「通关后回主菜单再继续，会重新刷新一份新的通关记录」：旧版每调一次就 push 一条，
     同一局被结算两次（或续档后重打上顶）就会多出一条重复记录。
     判据用开局时刻 startTs（它随存档往返、跨续档不变），比 Date.now() 稳。 */
  const sign=G.startTs||0;
  const list=readClearTimes().filter(x=>!(sign && x && x.startTs===sign));
  list.push({ hero:G.hero||'', ms:Math.round(ms), act:G.act||0, score:G.score||0, startTs:sign, ts:Date.now() });
  /* ⚠️ `sort` 必须给**数值**比较器：默认按字符串比 ⇒ 10:00 会排到 2:00 前面（"1"<"2"）。
     同用时再比得分，高者在前 —— 否则两条一样快的成绩谁的先后随机。 */
  list.sort((a,b)=>(a.ms-b.ms)||((b.score||0)-(a.score||0)));
  writeClearTimes(list.slice(0, CLEAR_STORE));
  /* v1.0.17b：顺手把这局成绩提交到 TapTap 全平台排行榜（best-effort）——
     未发现排行榜接口 / 非 TapTap 环境 ⇒ rankSubmit 直接 reject，本地榜不受任何影响。
     v1.0.19：**同时提交「通关计时总榜」与「该角色的分榜」**（两个独立榜 ID）。 */
  if(typeof rankSubmit === 'function'){
    /* v1.0.20：提交**毫秒**而非秒。用户报障「打了 30 多分钟，TapTap 榜单显示 1 秒多」——
       榜单在后台是按**时间类型**建的（TapTap 的时间榜收毫秒、并自动格式化成「X 秒/分」）。
       原先提交 1800（秒）被当成 1800ms ⇒ 官方榜显示 1.8 秒。这里原样提交 ms 即对齐。 */
    const vms=Math.max(0, Math.round(ms));
    /* v1.1.8：**不再静默** —— 用户报障「TapTap 开发者中心里 6 个榜一直没变」，
       旧版这条路两个 catch 都是空的，真机上一条新成绩都没上去也看不到任何原因。
       改为与 recordScoreRun 同款：把真实错误（含 rankDiag 的方法名诊断串）浮字出来，
       一次真机回报即可判定是「后台建榜/权限没配」还是「基础库太低拿不到管理器」。
       两个榜的错误串完全相同时只浮一条，免得同一原因刷屏。 */
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

/* ===================== 整局总分榜（v1.0.19） =====================
   用户口径：「不论是通关或者是被击败，一整局总分数的榜单」；已确认口径 = 含通关 +5000 加成，
   通关 / 被击败 / 放弃**都入榜**。入口三处各记一次：showVictory() / loseGame() / giveUp()。
   同一局（G.startTs 相同）取**最高分**入榜 —— 复活后分数还会涨，后记的更大 ⇒ 覆盖前面那条。 */
const SCORE_KEY='zhiguaitower_scores_v1';
const SCORE_MAX=10;
function readScores(){ try{ const a=JSON.parse(Store.get(SCORE_KEY)||'[]'); return Array.isArray(a)?a:[]; }catch(e){ return []; } }
function writeScores(a){ try{ Store.set(SCORE_KEY, JSON.stringify((a||[]).slice(0, SCORE_MAX))); }catch(e){} }
function recordScoreRun(win){
  if(G&&G.tutorial&&G.tutorial.on) return;   // v1.1.24 教程：不入风云榜（用户口径）
  const sc=G.score||0;
  const sign=G.startTs||0;
  const list=readScores().filter(x=>!(sign && x && x.startTs===sign));
  list.push({ hero:G.hero||'', score:sc, act:G.act||0, win:!!win, startTs:sign, ts:Date.now() });
  list.sort((a,b)=>(b.score||0)-(a.score||0));
  writeScores(list.slice(0, SCORE_MAX));
  /* v1.0.21：失败不再静默 —— 用户报障「分数榜上传不了」时看不到任何原因，
     这里把真实错误（含 boardId 诊断串）浮字出来，一次真机回报即可定位是后台建榜配置还是权限。 */
  if(typeof rankSubmit === 'function'){
    /* v1.1.23r（用户 2026-10-16 纠正口径）：成就「Nice-encounter」的上报已**上移到 rankSubmit 成功回调内**
       （任何榜提交成功都触发，不再只认总分榜），此处不再重复上报。 */
    try{ rankSubmit(sc, 'total_score').catch(function(e){
      if(typeof floatMsg==='function') floatMsg('总分榜上传失败：'+((e&&e.message)||e));
    }); }catch(e){}
  }
}

/* ===================== 本局存档 ===================== */
/* v1.0.1：3 个存档槽。**1 号槽沿用旧键名** ⇒ 老玩家的单档天然落进 1 号槽，不需要迁移代码。 */
const RUN_KEY='zhiguaitower_run_v1';
const RUN_SLOTS=[RUN_KEY, 'zhiguaitower_run_s2_v1', 'zhiguaitower_run_s3_v1'];
let RUN_SLOT=0;                                   // 当前进行中的槽位（0 基）；新局 / 续档时落定
/* v1.0.17b：本局是否已「终结」（通关即终结）。一旦置位，saveRun 全面拒写 ——
   用户报障「通关后回主菜单再继续，会凭空多出一份通关记录，而且是有存档的」的根因之一，
   就是通关后仍有一条路径（quitToMenu / manualSave / 各场景 saveRun）能把已完结的一局写回存档位。
   复位点：confirmNewGame（新局）与 continueRun（续档）。 */
let RUN_FINISHED=false;
function runKeyOf(i){ const n=RUN_SLOTS.length; return RUN_SLOTS[Math.max(0, Math.min(n-1, i|0))]; }
function setRunSlot(i){ const n=RUN_SLOTS.length; RUN_SLOT=Math.max(0, Math.min(n-1, i|0)); }
/* v1.1.15：存档**单档化** —— 全机只留一份本局档（落 0 号槽）。
   newestRunSlot：三槽里找 startTs 最大（最新）的那槽；并列取最小下标；全空返回 -1。 */
function newestRunSlot(){
  let best=-1, bestTs=-1;
  for(let i=0;i<RUN_SLOTS.length;i++){
    const d=readRun(i); if(!d) continue;
    const ts=d.startTs||0;
    if(ts>bestTs){ bestTs=ts; best=i; }
  }
  return best;
}
/* 单档归一：把最新那档搬进 0 号槽，其余槽清空；全空则只把当前槽指回 0。
   旧多档玩家在 boot 时经它收敛一次，之后所有读写只碰 0 号槽。 */
function normalizeSingleRunSave(){
  const i=newestRunSlot();
  if(i<0){ setRunSlot(0); return; }
  if(i!==0){ try{ Store.setJSON(runKeyOf(0), readRun(i)); }catch(e){} }
  for(let k=1;k<RUN_SLOTS.length;k++){ try{ Store.del(runKeyOf(k)); }catch(e){} }
  setRunSlot(0);
}
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
  if(G.tutorial && G.tutorial.on) return;   // v1.1.24 教程：全程不产存档（重玩教程不冲旧档）
  if(RUN_FINISHED) return;   // v1.0.17b：本局已终结（通关）⇒ 一个字都不许再落盘
  /* v1.1.x（用户口径「存档可以暂时暂停时间计算」）：落档前把到此刻的累计用时**冻结**进 accMs，
     并把计时锚点 t0 挪到此刻 ⇒ 存档 / 关掉游戏那段时间不计入；续档后从 accMs 继续累加。 */
  G.accMs=runElapsedMs(G); G.t0=Date.now();
  const s=scene || SCENE || 'map';
  const data={
    v:3, scene:s,               // v3：新增 mapSeed（地图随机化的复现依据）
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
    /* v1.0.9：补齐**跨回合持久**字段。此前只存了 xiejia / retain，下面这些漏存 ⇒
       续档时被 newState() 的默认值静默归零，玩家在生效回合刷新即被吃掉收益
       （实测：卸甲生元升级后结束回合该得 6 点尸气，过一次存读档变 0）。
       · pendingSeal 是死字段（全库无读）故不存；
       · bleedSummons / hpLostTurn 是 bleedSummonsBonus 生效的前提，必须一起存，
         否则单独存那个倍率没有任何意义（bleedSummons=false 时它算出来恒 0）。 */
    endBlockKind:G.endBlockKind||null, xiejiaUp:!!G.xiejiaUp, xiejiaHealCap:G.xiejiaHealCap||0,
    ybTarget:(G.ybTarget!=null?G.ybTarget:-1),
    retainHeal:G.retainHeal||0, pendingBlockStart:G.pendingBlockStart||0,
    zombieDmg:G.zombieDmg||0, bleedSummons:!!G.bleedSummons, bleedSummonsBonus:(G.bleedSummonsBonus||1),
    hpLostTurn:G.hpLostTurn||0,
    shiqi:G.尸气||0, xuenu:G.xuenu||0, xisuiTurns:G.xisuiTurns||0, xisuiShiqi:G.xisuiShiqi||0,
    duhun:G.duhun||null, xuejiBonus:G.xuejiBonus||0, turnStats:G.turnStats||null,
    totalHpLost:G.totalHpLost||0, totalKills:G.totalKills||0, score:calcScore(),
    /* v1.1.x：分档击杀计数（结算分数规则）与冻结后的累计用时 accMs —— 都要随档往返。 */
    killNormal:G.killNormal||0, killElite:G.killElite||0, killBoss:G.killBoss||0, killSummon:G.killSummon||0,
    accMs:G.accMs||0,
    startTs:G.startTs||0,        // v1.0.1：本局开局时刻（结算显示本局用时靠它，随存档往返）
    relics:G.relics||[], potions:(G.potions||[]).map(potionSnap),
    removeCount:G.removeCount||0, shopMarkup:G.shopMarkup||0, potionBought:G.potionBought||0,
    shopWares:G.shopWares?G.shopWares.map(cardSnap):null,
    shopPotions:G.shopPotions?G.shopPotions.map(potionSnap):null,
    campRemoved:!!G.campRemoved, campActed:!!G.campActed,
    wangyouTurns:G.wangyouTurns||0, wangyouDrunk:G.wangyouDrunk||0,
    log:G.log||[],
    rng:rngSnapshot()            // v0.61.06：随机态随存档落盘，续档后牌序/掉落可复现
  };
  try{ Store.setJSON(runKeyOf(RUN_SLOT), data); }catch(e){}
  /* v0.76.2：本局档变了 ⇒ 给云存档记一笔脏（只为 TapTap 端排队，非 TapTap 环境是 no-op）。
     ⚠️ 上传**不在这里直发** —— 官方频控 createArchive/updateArchive 一分钟只能一次。 */
  if(typeof cloudMarkDirty === 'function'){ try{ cloudMarkDirty(); }catch(e){} }
}
function hasRunSave(){ try{ for(let i=0;i<RUN_SLOTS.length;i++){ if(Store.get(runKeyOf(i))) return true; } return false; }catch(e){ return false; } }
function readRun(i){ try{ return Store.getJSON(runKeyOf(i==null?RUN_SLOT:i)); }catch(e){ return null; } }
function clearRunSave(i){ try{ Store.del(runKeyOf(i==null?RUN_SLOT:i)); }catch(e){} }
/* v1.0.17b：通关即**立即销毁本局存档**（用户口径「还要有个通关后立即销毁该场游戏存档的手段」）。
   与 clearRunSave 的区别有三，都是这个需求要的：
     ① **堵口**（关键）：置 RUN_FINISHED ⇒ 之后任何 saveRun（quitToMenu / manualSave / 各场景）
        都写不进去。用户报障的根因就是通关后仍有一条路径把已完结的一局写回存档位，
        于是回主菜单「继续」又能续上、再打一次 Boss ⇒ 凭空多一条通关记录。
     ② 删掉**本场这一槽**。只删 RUN_SLOT，不连另两槽一起删 —— 用户口径是「该场游戏存档」，
        另两槽若养着别的进度（换角色再爬的那种），不能跟着一起没。
     ③ 给云存档记一笔脏 ⇒ 让「本局已终结」这份状态按节流上传，
        避免换设备 / 清缓存后被云端那份**通关前一刻**的旧档拉回来、凭空复活一局。 */
function destroyRunSave(){
  RUN_FINISHED=true;
  try{ Store.del(runKeyOf(RUN_SLOT)); }catch(e){}
  if(typeof cloudMarkDirty === 'function'){ try{ cloudMarkDirty(); }catch(e){} }
}
/* v1.1.15：单档化后「主菜单·续」由 resumeRun 直连这里（无槽号，读 0 号槽）。
   `slot` 形参保留兼容旧调用；单档口径下永远落 0 号槽。 */
function continueRun(slot){
  if(slot!=null) setRunSlot(slot);
  let d; try{ d=Store.getJSON(runKeyOf(RUN_SLOT)); }catch(e){}
  if(!d){ floatMsg('该存档位是空的'); return; }
  RUN_FINISHED=false;   // v1.0.17b：续起了这局（也只会续到未终结的档）⇒ 解除拒写
  G=newState();
  G.startTs=d.startTs||Date.now();   // v1.0.1：老档没有 startTs ⇒ 以本次续档时刻为计时起点
  /* v1.1.x：用时两段式恢复 —— 老档（无 accMs）回落「now-startTs」，保持老行为；
     新档从冻结的 accMs 继续累加；t0 一律取此刻 ⇒ 续档后从这一秒接着计时。 */
  G.accMs=(d.accMs!=null)?Math.max(0,d.accMs|0):Math.max(0, Date.now()-G.startTs);
  G.t0=Date.now();
  G.killNormal=d.killNormal||0; G.killElite=d.killElite||0; G.killBoss=d.killBoss||0; G.killSummon=d.killSummon||0;
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
  G.summons=(d.summons||[]).map(x=>({type:x.type, v:x.v, dur:x.dur, dur0:(x.dur0!=null?x.dur0:x.dur), healV:x.healV, up:x.up}));
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
  /* v1.0.9：与 saveRun 新增字段一一对应的恢复（老档没有这些键 ⇒ 各自回落到默认值，安全） */
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
  /* v0.68.2：camp / shop / unknown 三支**不经过 setBg** ⇒ 得在这儿显式退出「主菜单壳」状态，
     否则从主菜单续档落进营地/鬼市/未知之地时，body.at-menu 还亮着 ⇒ #app 整块不渲染
     （那三个页面自己铺在 #overlay 里，看不出缺什么，但背后的玩家面板/顶栏/日志全没了，
      下次回到地图才会突然"长回来"）。进战斗与进地图两支由 setBg 自己清，不用重复。 */
  if(document.body && document.body.classList) document.body.classList.remove('at-menu');
  if(d.scene==='battle'){ SCENE='battle'; setBg('act'+G.act); setBGM(battleBgmFor(G.enemies)); render(); } // v0.61.31：读档进 Boss 房也走 Boss 轨（上一行已恢复 G.enemies）
  else if(d.scene==='camp'){ SCENE='camp'; renderCampfire(); }
  else if(d.scene==='shop'){ SCENE='shop'; renderShop(); }
  else if(d.scene==='unknown'){ SCENE='unknown'; showUnknown(); }
  else { SCENE='map'; showMap({entry:true}); }   // v0.62.0：续档落在地图页 → 走进场动画（Boss 层缓入到当前层）
}

