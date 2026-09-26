/* ============================================================================
 * 志怪塔 · js/00_base.js —— 公共基础层
 * 工具 / 飘字提示 / 战斗特效(juce) / 出卡动效 / 受击分层 / Boss 战前过场
 * ----------------------------------------------------------------------------
 * 由 原型.html 的整段内联脚本按原顺序切分而来（v0.61.05 三层重构，纯搬移）。
 * 拼接校验：本文件组去掉各自横幅后，应与切分前的内联脚本正文逐字节一致。
 * 加载：经典外链脚本（非 ES module），双击本地打开即可直接游玩。
 * ============================================================================ */
/* ===================== 基础设施：存储 / 随机 / 广告位 =====================
 * v0.61.06 收口。三处都是给 Cocos 正式工程预留的**唯一接缝**，
 * HTML 原型的行为与旧版一致（键名、随机分布、奖励内容都没变）。
 * ========================================================================= */

/* 存储 —— 所有 localStorage 读写都走这里。微信/Cocos 阶段只换这一个对象 */
const Store = {
  get(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } },
  set(k,v){ try{ localStorage.setItem(k,v); return true; }catch(e){ return false; } },
  del(k){ try{ localStorage.removeItem(k); }catch(e){} },
  getJSON(k){ const r=Store.get(k); if(r==null) return null; try{ return JSON.parse(r); }catch(e){ return null; } },
  setJSON(k,o){ return Store.set(k, JSON.stringify(o)); }
};

/* 随机 —— 可播种（mulberry32）。开局定种子并随存档落盘，
 * 用来复现玩家报障、以及批2 战斗仿真器的同种子对比。
 * 想复现某一局：在地址后加 ?seed=数字 即可。 */
let _rngSeed = 1, _rngCalls = 0;
function seedRng(seed){ _rngSeed=(seed>>>0)||1; _rngCalls=0; }
function rngSeedNow(){
  const q=(typeof location!=='undefined' && location.search)? /[?&]seed=(\d+)/.exec(location.search) : null;
  if(q) return (+q[1])>>>0;                 // ?seed=123 → 同一副牌序、同一批奖励
  return (Date.now() ^ Math.floor(Math.random()*0x100000000))>>>0;   // 这里用真随机取种子
}
function rng(){
  _rngSeed = (_rngSeed + 0x6D2B79F5) >>> 0;
  let t = _rngSeed;
  t = Math.imul(t ^ (t>>>15), t | 1);
  t = (t + Math.imul(t ^ (t>>>7), t | 61)) ^ t;
  _rngCalls++;
  return ((t ^ (t>>>14)) >>> 0) / 4294967296;
}
function rngInt(n){ return Math.floor(rng()*n); }
function rngSnapshot(){ return { s:_rngSeed, n:_rngCalls }; }
function rngRestore(snap){
  if(snap && typeof snap.s==='number' && snap.s){ _rngSeed=snap.s>>>0; _rngCalls=snap.n||0; return true; }
  seedRng(rngSeedNow()); return false;      // 旧存档没有随机态：退回新种子（只是不再可复现）
}

/* 广告位 —— 4 个激励点位的唯一入口。HTML 原型直接放行并记埋点；
 * Cocos 版把 request 内部换成 wx.createRewardedVideoAd(id) 即可，调用点不用动。 */
const AD_SLOTS = ['奖励翻倍','复活','签到翻倍','开局重随'];
const AdSlot = {
  request(id, onReward){
    if(AD_SLOTS.indexOf(id)<0) log(`【广告位】未登记的槽位「${id}」，请同步 AD_SLOTS`);
    log(`【广告占位·${id}】模拟观看成功，发放奖励（正式版接抖音/微信激励视频 SDK）`);
    floatMsg('广告 · 已观看');
    track('ad'); track('ad_'+id);
    if(typeof onReward==='function') onReward();
  }
};

/* ===================== 工具 ===================== */
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=rngInt(i+1); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function log(msg){ if(!G) return; G.log.push(msg); if(G.log.length>800) G.log.shift(); }

/* ===================== 飘字提示（debuff 视觉反馈） ===================== */
function floatMsg(msg){
  // v0.61 B12：追加一条浮字，最多同时 3 条（各 1.6s 淡出），不再互相覆盖
  const el=document.getElementById('float-msg');
  if(!el) return;
  const item=document.createElement('div');
  item.className='fm'; item.textContent=msg;
  el.appendChild(item);
  while(el.children && el.children.length>3) el.removeChild(el.children[0]);
  setTimeout(()=>{ if(item.parentNode && item.parentNode.removeChild) item.parentNode.removeChild(item); }, 1700);
}

/* ===================== 条件引导气泡（v0.61.20 P8） =====================
 * 首次遇到「诅咒 / 格挡 / 召唤物 / 尸气」各弹一次，讲清它是什么。
 * 和 floatMsg（战斗飘字，1.6s 就散）不同：气泡是**可读的**——停到你看完，点一下收起，7 秒自动收。
 * 看过就记在 Store 里（zhiguaitower_tips_v1），换局不重弹；清掉存档即重置。
 * 只在真正的战斗场景里触发（SCENE==='battle'），免得在菜单/商店/仿真里乱冒。
 * 注意：tipOnce 的返回值与「是否真的画了 DOM」解耦 —— 冒烟环境没有 DOM，仍要能断言触发过。 */
const TIPS_KEY = 'zhiguaitower_tips_v1';
let TIPS_SEEN = null;
function tipsSeen(){ if(!TIPS_SEEN){ TIPS_SEEN = Store.getJSON(TIPS_KEY) || {}; } return TIPS_SEEN; }
function inBattleScene(){
  try{ return typeof SCENE==='string' && SCENE==='battle' && typeof G!=='undefined' && !!G && !G.dead; }catch(e){ return false; }
}
function hideTipBubble(){
  try{
    const el=document.getElementById('tip-bubble');
    if(el){ el.classList.remove('show'); setTimeout(()=>{ if(el.parentNode) el.parentNode.removeChild(el); }, 300); }
  }catch(e){}
}
function showTipBubble(html){
  if(!document || !document.body || !document.createElement) return;
  try{
    hideTipBubble();
    const el=document.createElement('div');
    el.id='tip-bubble';
    el.innerHTML='<span class="tip-tag">提示</span>'+html;
    el.onclick=hideTipBubble;
    document.body.appendChild(el);
    try{ requestAnimationFrame(()=>{ el.classList.add('show'); }); }catch(e){ el.classList.add('show'); }
    setTimeout(()=>{ const x=document.getElementById('tip-bubble'); if(x===el) hideTipBubble(); }, 7000);
  }catch(e){}
}
/* 返回 true 表示「这次真的弹了」（冒烟用它断言，别依赖 DOM） */
function tipOnce(key, html){
  try{
    const s=tipsSeen();
    if(s[key]) return false;
    s[key]=1; Store.setJSON(TIPS_KEY, s);
    if(inBattleScene()) showTipBubble(html);
    return true;
  }catch(e){ return false; }
}

/* ===================== 战斗特效（juice：伤害飘字 / 受击震屏 / 敌人抖动） ===================== */
let HITFX = { enemies: new Set() };
/* v0.61.33 · 伤害浮字的数字素材接缝（素材/num/{dmg,hurt,block,heal}/0.png … 9.png）
   v0.61.36：由「单目录 10 张」改成**四档各 10 张**（共 40 张）——
   颜色和描边必须画进图里（CSS 的 color / text-shadow 对 <img> 无效），所以每档一套。
   每档**独立探测**：某一档没画完只退那一档，不牵连其他档。
   NUM_STATE[k]：0=还没探测 1=图片可用 -1=不可用（含探测中，先按不可用渲染，加载完自动切换） */
/* ⚠️ kind ↔ 目录名的**唯一**映射处（floatDamage 的 kind 取值：'' / 'to-player' / 'block' / 'heal'） */
const NUM_KIND_DIR = { '': 'dmg', 'to-player': 'hurt', 'block': 'block', 'heal': 'heal' };
let NUM_IMG = {}, NUM_STATE = {};
function numKind(kind){ return NUM_KIND_DIR[kind] || 'dmg'; }
function numProbe(kind){
  const k = numKind(kind);
  if(NUM_STATE[k]) return NUM_STATE[k]===1;
  if(typeof Image==='undefined' || typeof assetURL!=='function'){ NUM_STATE[k]=-1; return false; }
  NUM_STATE[k]=-1; // 先假定不可用：本次仍用文字，等这一档 10 张全部加载成功再把 NUM_STATE[k] 翻成 1
  try{
    const arr=[]; let left=10, done=false;
    for(let i=0;i<10;i++){
      const im=new Image();
      im.onload=()=>{ if(done) return; if(--left===0){ NUM_IMG[k]=arr; NUM_STATE[k]=1; } };
      im.onerror=()=>{ if(done) return; done=true; NUM_STATE[k]=-1; NUM_IMG[k]=null; };
      im.src=assetURL('num/'+k+'/'+i+'.png');
      arr.push(im);
    }
  }catch(e){ NUM_STATE[k]=-1; NUM_IMG[k]=null; }
  return false;
}
/* v0.61.41：数字字形渲染的**共用件** —— 伤害飘字与拖拽预伤害（#drag-dmg）都走这里，
   免得「预伤害要用素材」却在另一处自己拼 <img>。
   numAppend：往元素里塞 <img> 字形（DOM 路径，飘字用）；
   numHTML  ：同一套拼成 HTML 串（innerHTML 路径，拖拽预伤害用）；
   两者在「该档不可用 / 文本不是纯数字（含 0-9 之外的字符）」时都返回假值，由调用方回落文字。 */
function numSplit(text){
  const sign=/^[+-]/.test(text) ? text[0] : '';
  const digits=sign ? text.slice(1) : text;
  if(!digits.length || /[^0-9]/.test(digits)) return null;
  return { sign:sign, digits:digits };
}
function numGlyphSrc(kind){
  const k=numKind(kind);
  return (numProbe(kind) && NUM_IMG[k]) ? NUM_IMG[k] : null;
}
function numAppend(parent, kind, text){
  const sp=numSplit(text); if(!sp) return false;
  const imgs=numGlyphSrc(kind); if(!imgs) return false;
  /* v0.61.42：符号也包一层 .fx-sign。原来这一处只塞**裸文本**（createTextNode），
     于是它继承的是 .fx-dmg 的**文字色**（dmg #ff7b5a / 受伤 #ff4b4b / 格挡 #7fb0d8 / 治疗 #3fa060），
     而紧跟其后的数字是**烤死在 PNG 里**的色（#fc3802 / #c90902 / #0398fa / #05c504）——
     色相虽同、明度差一截 ⇒ 用户报的「加号减号颜色没变，突兀」。numHTML 那条路径本来就有 .fx-sign，
     两条路（飘字 / 拖拽预伤害）必须表现一致，所以这里补齐，配色统一交给 CSS 的分档规则。 */
  if(sp.sign){ const sg=document.createElement('span'); sg.className='fx-sign'; sg.textContent=sp.sign; parent.appendChild(sg); }
  for(const ch of sp.digits){ const im=new Image(); im.className='fx-num'; im.src=imgs[+ch].src; im.alt=ch; parent.appendChild(im); }
  return true;
}
function numHTML(kind, text){
  const sp=numSplit(text); if(!sp) return null;
  const imgs=numGlyphSrc(kind); if(!imgs) return null;
  let s=sp.sign ? '<span class="fx-sign">'+sp.sign+'</span>' : '';
  for(const ch of sp.digits) s+='<img class="fx-num" src="'+imgs[+ch].src+'" alt="'+ch+'">';
  return s;
}
/* v0.61.41：开局就把四档字形预加载。
   不预加载的话**本局第一次**飘字必然回落文字（探测是异步的，首次调用时那 10 张还没 load 完），
   而第一次飘字恰好是玩家最会盯着看的那一下 —— 很容易被当成「素材没生效」。 */
function numPrewarm(){ ['', 'to-player', 'block', 'heal'].forEach(function(k){ try{ numProbe(k); }catch(e){} }); }
let PLAYER_HP_PREV = null;
let ENEMY_HP_PREV = {};
function fxLayer(){
  let el=document.getElementById('fx-layer');
  if(!el){ el=document.createElement('div'); el.id='fx-layer'; document.body.appendChild(el); }
  return el;
}
/* 敌人元素（按 uid 找）。cardPlayFx 与特效锚点共用，别再各写一份选择器 */
function enemyEl(e){ return (e && document.querySelector) ? document.querySelector('#enemy-panel .enemy[data-uid="'+e.uid+'"]') : null; }

/* ===================== v0.64.0：精灵图特效播放器 =====================
   素材 `素材/fx/<name>.png`：8 列纵向精灵图、单元 480×480、帧数见 20_data.js 的 FX_SHEETS。
   **为什么是精灵图不是那 30 个 mp4**：交付视频全是 h264/yuv420p + 纯黑底**无 alpha**，
   内联管线根本吃不下（打包.py 的 IMG_EXT 不含视频扩展名），贴上去还是黑方块 —— 真透明只在 PNG 里。
   **为什么用 background-position 而不是 canvas**：省一层离屏合成；而且 `fxSeek` 能直接钉帧，
   截图夹具要靠它（headless 的 --virtual-time-budget 下后注册的 rAF 拿不到帧）。 */
let FX_LIVE = {};
/* 取表项；未知名字返回 null。别在别处直接下标 FX_SHEETS —— 少一处裸引用少一处崩点 */
function fxSheet(name){
  return (typeof FX_SHEETS!=='undefined' && FX_SHEETS) ? (FX_SHEETS[name] || null) : null;
}
/* 盒子边长（**纯函数，冒烟可测**）：锚点短边 × 1.15，下夹 96、上夹 min(vw,vh)×0.9。
   为什么两个夹：帧画布 960×960 且**四周留空**（提示词文档明写「特效居中、周围留空」），
   照锚点框贴必然偏大；上界保证再大的框也不会超出屏幕。 */
function fxBoxSize(anchorShort, vw, vh){
  let s=(anchorShort||0)*1.15;
  const cap=Math.min(vw||0, vh||0)*0.9;
  if(!(s>96)) s=96;
  if(cap>0 && s>cap) s=cap;
  return Math.round(s);
}
/* 第 i 帧在精灵图里的左上角偏移（**纯函数**）：行优先，8 列 */
function fxCellPos(i, cols, box){
  const c=Math.max(1, cols||8);
  return { x:-(i%c)*box, y:-Math.floor(i/c)*box };
}
/* 锚点 → 视口矩形。'enemy'/'field'/'player'/'summon' 四个别名之外也能直接传元素。
   v0.64.0 起 'summon' 也落到 **#player-panel**（原先落「屏幕中心」，短边恒 0 ⇒ 被 96px 下限兜住，
   四个召唤特效会明显偏小）。只有**连元素都量不到**时才退到屏幕中心那一行。 */
function fxAnchorRect(anchor){
  if(anchor && anchor.getBoundingClientRect){
    const r=anchor.getBoundingClientRect();
    if(r && r.width>0 && r.height>0) return r;
  }
  // v0.64.0：'summon' 落到 #player-panel 而不是「屏幕中心、短边 0」——
  // 召唤位没有自己的元素，而召唤物是**站在玩家这一侧**的（纸人/小鬼/尸王/阴兵）。
  // 落屏幕中心时短边恒 0 ⇒ 盒子被 96px 下限兜住，四个召唤特效会明显小于周围的单位。
  const sel = anchor==='player' ? '#player-panel'
            : anchor==='field'  ? '#enemy-panel'
            : (anchor==='enemy') ? '#enemy-panel' : (anchor==='summon') ? '#player-panel' : null;
  if(sel){
    const el=document.querySelector(sel);
    if(el && el.getBoundingClientRect){
      const r=el.getBoundingClientRect();
      if(r && r.width>0 && r.height>0) return r;
    }
  }
  return { left:window.innerWidth*0.5, top:window.innerHeight*0.42, width:0, height:0 };   // 量不到元素才落这里
}
function fxStop(key){
  const st=FX_LIVE[key]; if(!st) return;
  st.dead=true;
  try{ cancelAnimationFrame(st.raf); }catch(e){}
  if(st.el && st.el.remove) st.el.remove();
  delete FX_LIVE[key];
}
function fxStopAll(){ Object.keys(FX_LIVE).forEach(fxStop); }
/* 播放。opts：{key（同名并发键，默认=name；逐敌人特效要传 'curse@uid' 才不会互相顶掉）,
   scale（覆写表里的 scale）, rate（播放倍速）, still（钉帧模式：不排 rAF，交给 fxSeek）} */
function playFx(name, anchor, opts){
  if(!fx()) return null;                      // 流畅模式门禁 —— 全项目特效的既有惯例（见 10_audio.js 的 fx()）
  const S=fxSheet(name); if(!S) return null;
  opts=opts||{};
  const key=opts.key||name;
  const r=fxAnchorRect(anchor);
  const cap=Math.round(Math.min(window.innerWidth||0, window.innerHeight||0)*0.9);
  let box=Math.round(fxBoxSize(Math.min(r.width||0, r.height||0), window.innerWidth, window.innerHeight)
                     * (opts.scale||S.scale||1));
  if(cap>0 && box>cap) box=cap;
  fxStop(key);                                // 同名正在播 → **重播**而不是叠加（连击会在原地堆十几个元素）
  const el=document.createElement('div');
  el.className='fx-sheet';
  el.style.width=box+'px'; el.style.height=box+'px';
  /* v0.64.0：ox/oy 是**量出来的**「内容框中心相对格子中心」的偏移（占 480 单元的比例），
     由 _patch/fx_tune.py 用 PIL 扫每张图所有帧的 alpha 并集算得，写进 FX_SHEETS。
     不补这一步的后果：不少特效的画面本来就画在格子偏下 1/4 处（烟从地面升起那类），
     照格子中心贴到锚点上，scale 一放大就整块沉到单位脚底下。补完之后
     **内容框的中心**落在锚点中心 —— 与素材留白多少、scale 多少都无关。 */
  const ox=(S.ox||0)*box, oy=(S.oy||0)*box;
  el.style.left=Math.round(r.left+r.width/2-box/2-ox)+'px';
  el.style.top=Math.round(r.top+r.height/2-box/2-oy)+'px';
  el.style.backgroundImage='url("'+assetURL('fx/'+name+'.png')+'")';
  el.style.backgroundSize=(S.c*box)+'px auto';
  /* v0.64.0：i0 = 起始帧。素材每张图的两端都有整格的**全透明**帧（实测最长首空 6 帧、尾空 9 帧），
     是出图时留的余量，不是动作的一部分。照原始帧数从第 0 格播的后果：
     开头 0.2 秒画面上什么都没有（像点了没反应），结尾又挂着一个透明元素不删。
     裁剪边界由 _patch/fx_tune.py 用 PIL 逐帧量覆盖率算得，写进 FX_SHEETS。 */
  const i0=S.i0||0;
  const p0=fxCellPos(i0, S.c, box);
  el.style.backgroundPosition=p0.x+'px '+p0.y+'px';
  fxLayer().appendChild(el);
  if(opts.still) return el;                   // 钉帧：不进 FX_LIVE、不排 rAF（只给截图夹具用）
  const st={ el:el, key:key, i:0, S:S, i0:i0, box:box, dead:false,
             dur:1000/(24*(opts.rate||1)),    // 源速 24fps
             t0:(window.performance&&performance.now?performance.now():Date.now()), raf:0 };
  FX_LIVE[key]=st;
  st.raf=requestAnimationFrame(function step(){
    if(st.dead) return;
    const now=(window.performance&&performance.now?performance.now():Date.now());
    const i=Math.floor((now-st.t0)/st.dur);
    if(i>=S.f){ fxStop(key); return; }
    if(i!==st.i){ st.i=i; const p=fxCellPos(st.i0+i, S.c, box); el.style.backgroundPosition=p.x+'px '+p.y+'px'; }
    st.raf=requestAnimationFrame(step);
  });
  return el;
}
/* 纯 setter：把某特效**钉在**播放序列的第 i 帧（0 = 第一帧**画面**，已含 i0 偏移）——
   截图夹具专用（见上：headless 里 rAF 钉不住） */
function fxSeek(name, i, anchor, opts){
  const S=fxSheet(name); if(!S) return null;
  const o=Object.assign({}, opts||{}, { still:true });
  const el=playFx(name, anchor, o);
  if(!el) return null;
  const box=parseFloat(el.style.width)||0;
  const i0=S.i0||0;
  const k=Math.max(0, Math.min(i0+S.f-1, i0+(i|0)));
  const p=fxCellPos(k, S.c, box);
  el.style.backgroundPosition=p.x+'px '+p.y+'px';
  return el;
}
/* opts.crit：大伤害档（阈值与打击音效同源，见 10_audio.js 的 isCritHit） */
function floatDamage(text, kind, anchor, opts){
  if(!fx()) return;
  const span=document.createElement('span');
  span.className='fx-dmg '+kind+((opts && opts.crit) ? ' crit' : '');
  // v0.61.36：字形统一包一层 .fx-in —— 外层管位移（fxDmg 的 translate/scale），
  // 内层管抖动（translateX）与闪烁（filter），两条动画不抢同一个属性
  const inner=document.createElement('i'); inner.className='fx-in';
  // v0.61.41：字形渲染改走共用件 numAppend（与 #drag-dmg 的预伤害同一套），返回 false 才回落文字
  if(!numAppend(inner, kind, text)) inner.textContent=text;
  span.appendChild(inner);
  fxLayer().appendChild(span);
  if(anchor){
    const r=anchor.getBoundingClientRect();
    span.style.left=(r.left+r.width/2)+'px';
    span.style.top=(r.top+r.height*0.4)+'px';
  } else {
    span.style.left='50%'; span.style.top='28%';
  }
  setTimeout(()=>span.remove(), 950);
}
function hurtVignette(){
  if(!fx()) return;
  let v=document.getElementById('hurt-vignette');
  if(!v){ v=document.createElement('div'); v.id='hurt-vignette'; document.body.appendChild(v); }
  v.classList.remove('flash'); void v.offsetWidth; v.classList.add('flash');
}
function heroAnim(state){
  var box=document.querySelector('.hero-art-box');
  if(!box) return;
  box.classList.remove('hero-attack','hero-hit','hero-cast');
  if(state){
    void box.offsetWidth;
    box.classList.add('hero-'+state);
    if(state==='hit'||state==='attack') setTimeout(function(){ box.classList.remove('hero-'+state); },350);
  }
}
/* 全屏震屏 screenShake 已移除（见 CSS 注释） */
function turnBanner(text){
  const el=document.getElementById('turn-banner');
  if(!el) return;
  el.textContent=text;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
}
function shakeCard(i){
  if(!fx()) return;
  const el=document.querySelectorAll('#hand .card')[i];
  if(el){ el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
}

/* ===================== 出卡动效（按类型差异化） ===================== */
function cardPlayFx(c){
  if(!fx()) return;
  /* v0.64.0：接了精灵图的牌走 playFx（锚点由 CARD_FX 的 a 字段定）；**没接的牌退回下面这套 CSS 特效**，
     所以四件套（符箓/护体/黑雾/脉冲）一个都没退役，未接的牌观感不退化。 */
  const E=(typeof CARD_FX!=='undefined' && c) ? CARD_FX[c.id] : null;
  if(E && E.n){
    let anchor;
    if(E.a==='enemy'){ anchor=enemyEl(curEnemy()) || 'field'; }   // 目标已死/找不到元素时兜底全场
    else if(E.a==='field') anchor='field';
    else if(E.a==='summon') anchor='summon';
    else anchor='player';
    playFx(E.n, anchor, { scale:E.s });
    return;
  }
  if(c.type==='attack'){
    let targetEl=null;
    if(!needsTarget(c)){ targetEl=document.getElementById('enemy-panel'); }
    else { const t=curEnemy(); targetEl=enemyEl(t); }
    attackFx(targetEl);
  } else if(c.type==='defense') defenseFx();
  else if(c.type==='spirit') spiritFx();
  else if(c.type==='skill') skillFx();
}
function attackFx(targetEl){
  const layer=fxLayer();
  const tal=document.createElement('div'); tal.className='fx-talisman';
  const sx=window.innerWidth/2, sy=window.innerHeight*0.72;
  let tx=sx, ty=window.innerHeight*0.42;
  if(targetEl){ const r=targetEl.getBoundingClientRect(); tx=r.left+r.width/2; ty=r.top+r.height*0.5; }
  tal.style.transform=`translate(${sx}px,${sy}px) rotate(-14deg)`;
  layer.appendChild(tal);
  void tal.offsetWidth;
  tal.style.transform=`translate(${tx}px,${ty}px) rotate(5deg)`;
  setTimeout(()=>{ tal.remove(); cinnabarBurst(tx,ty); }, 300);
}
function cinnabarBurst(x,y){
  const d=document.createElement('div'); d.className='fx-burst';
  d.style.left=x+'px'; d.style.top=y+'px';
  fxLayer().appendChild(d);
  setTimeout(()=>d.remove(), 600);
}
function defenseFx(){
  const p=document.getElementById('player-panel');
  const r=p?p.getBoundingClientRect():null;
  const x=r?r.left+r.width/2:window.innerWidth*0.28;
  const y=r?r.top+r.height*0.45:window.innerHeight*0.3;
  const s=Math.max(130, (r?r.width:180)*1.25);
  const d=document.createElement('div'); d.className='fx-halo';
  d.style.left=x+'px'; d.style.top=y+'px'; d.style.width=s+'px'; d.style.height=s+'px';
  fxLayer().appendChild(d);
  setTimeout(()=>d.remove(), 650);
}
function spiritFx(){
  const d=document.createElement('div'); d.className='fx-mist';
  d.style.left=(window.innerWidth*0.5)+'px'; d.style.top=(window.innerHeight*0.42)+'px';
  d.style.width='190px'; d.style.height='190px';
  fxLayer().appendChild(d);
  setTimeout(()=>d.remove(), 800);
}
function skillFx(){
  const d=document.createElement('div'); d.className='fx-skill';
  d.style.left=(window.innerWidth*0.5)+'px'; d.style.top=(window.innerHeight*0.5)+'px';
  d.style.width='96px'; d.style.height='96px';
  fxLayer().appendChild(d);
  setTimeout(()=>d.remove(), 500);
}
/* ===================== 受击分层：精英屏幕微震 / Boss 全屏墨晕 ===================== */
function screenMicroShake(){
  if(!fx()) return;
  const el=document.getElementById('app'); if(!el) return;
  el.classList.remove('micro-shake'); void el.offsetWidth; el.classList.add('micro-shake');
}
function inkBurst(anchor){
  if(!fx()) return;
  const d=document.createElement('div'); d.className='fx-ink';
  let x=window.innerWidth/2, y=window.innerHeight*0.4;
  if(anchor){ const r=anchor.getBoundingClientRect(); x=r.left+r.width/2; y=r.top+r.height/2; }
  d.style.background=`radial-gradient(circle at ${x}px ${y}px, rgba(8,5,8,0) 8%, rgba(8,5,8,.55) 72%)`;
  fxLayer().appendChild(d);
  setTimeout(()=>d.remove(), 650);
}
/* ===================== Boss 战前过场：墨韵铺开 + 名讳印章 ===================== */
function bossIntro(onDone){
  const boss=G.enemies.find(e=>e.boss);
  const name=boss?boss.name:'幕主';
  let b=document.getElementById('boss-intro');
  if(!b){ b=document.createElement('div'); b.id='boss-intro'; document.body.appendChild(b); }
  b.innerHTML=(fx()?`<div class="boss-ink"></div>`:'')+`<div class="boss-seal"><span class="bs-name">${name}</span><span class="bs-sub">幕 主 降 临</span></div>`;
  b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
  sfx('boss');
  setTimeout(()=>{ b.classList.remove('show'); b.innerHTML=''; if(onDone) onDone(); }, 1150);
}
/* v0.61.20(P4)：Boss 二阶段转场 —— 复用同一枚印章，换成「裂印 + 红目」变体。
   与 bossIntro 的关键区别：**不阻塞流程**。二阶段是从「血条打空」的同步路径里触发的，
   卡住等动画会把「死亡→复活→回合收尾」的时序搅乱，所以这里只铺 1.4 秒视觉，游戏在背后照常推进。 */
function bossPhaseIntro(name){
  if(!document || !document.body) return;
  try{
    let b=document.getElementById('boss-intro');
    if(!b){ b=document.createElement('div'); b.id='boss-intro'; document.body.appendChild(b); }
    if(b.classList.contains('show')) return;   // 别和战前过场打架
    b.classList.add('phase2');
    b.innerHTML=(fx()?`<div class="boss-ink"></div>`:'')+`<div class="boss-seal"><span class="bs-eyes">◉◉</span><span class="bs-name">${name}</span><span class="bs-sub">轮 回 再 临</span></div>`;
    b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
    sfx('boss');
    setTimeout(()=>{ b.classList.remove('show','phase2'); b.innerHTML=''; }, 1400);
  }catch(e){}
}

/* ===================== 锁破裂解锁过渡（v0.62.0） =====================
   用户要求：「用 锁_破裂_黑底_960x960_24fps.mp4 这个动画效果于下一关卡图标的解锁过渡，
   锁破裂后展示相连的下面关卡的对应图标」。
   为什么**不用那个 mp4**（实测）：它是 h264 / yuv420p，**根本没有 alpha 通道**，直接贴上去就是一个
   黑方块盖住地图；想抠黑底也不行 —— 特效自己带暗色碎片与暗色裂纹，会被一起抠掉。
   而 志怪塔UI重设计\锁破裂渲染器.html 是**确定性 canvas 代码**（12 KB / 1.0s / 24 帧），
   它渲染的正是游戏自己的 素材/map/locked.png ⇒ 直接**移植代码**：零外部素材、和节点图标像素对齐。
   （渲染器本身**不会**变出图标 —— 碎片飞散后全透明。所以「露出下面的关卡图标」由调用方做：
     把真实图标先铺在 canvas 底下，在 SHATTER 那一帧调 onReveal 换图标 + 淡白描边淡入。）

   ⚠️ 几何换算（原渲染器是按 870×637 的那张 locked.png 写的；游戏里这张是 256×256）：
     原：IMG 870×637、S=1.06、居中 ⇒ 画布上锁面 922×675、破裂中心画布坐标 (559.6, 483.8)。
     本：IMG 256×256，不透明区 (0,36)-(255,222) = 255×186（PIL 实测），与 870×637 是同一张画
         （宽高比 1.371 vs 1.366）⇒ 要让锁面同样是 922×675：S = 922/255 ≈ 3.62；
         再把不透明区左上角对到原 (OX,OY)=(19, 142.5) ⇒ OY = 142.5 - 36×3.62 ≈ 12.2。
     破裂中心 C 保持**图片坐标**：原 (510,322)/(870,637) 的相对位置 (0.5862, 0.5055)
         ⇒ 本图 C = (0.5862×255, 36 + 0.5055×186) = (149.5, 130.0)。
     碎片环半径**必须按 S 反算回图片坐标**（原画布半径 55/120/200/300/430 ×1.06 ÷3.62）
         ⇒ 16/35/59/88/126。照抄 430 会远超 256 的图幅，绝大多数碎片采样到空白、
           碎开时看着「没几块」。同理裂纹线宽 3.2/1.1 与单段长 637/5.5 也都是**画布空间**量，
           要乘 LOCK_LW=1/S 换回图片坐标，否则裂纹会粗 3.6 倍。
     其余（白闪、冲击环、光晕、火花、碎屑、重力 300t²/520t²、裂纹扩散 640、抖动 149/181）
     全部是**画布空间**常量，原样保留 ⇒ 观感与渲染器逐帧一致。
   画布逻辑边长固定 960（上面那些常量都按 960 空间写的），显示时用 CSS 缩到 ~120px。

   ⚠️ canvas 在冒烟里**测不了**（vm_host.js 的 DOM 桩是空操作、Image 永不加载），
      所以「生成碎片」拆成纯函数 lockBreakShards(seed)，冒烟只断言它（块数/确定性/顶点范围）。 */
const LOCK_IMG_REL = 'map/locked.png';
const LOCK_CV = 960;                             // 画布逻辑边长（渲染分辨率，CSS 再缩到 ~120px）
const LOCK_IMG_W = 256, LOCK_IMG_H = 256;        // 素材/map/locked.png 的像素尺寸
const LOCK_S = 3.62;                             // ≈922/255：让锁面在画布上仍是 922×675
const LOCK_OX = 19, LOCK_OY = 12.2;              // 图片左上角在画布上的落点
const LOCK_C = { x:149.5, y:130.0 };             // 破裂中心（**图片坐标**，锁孔上方）
const LOCK_RING_R = [0, 16, 35, 59, 88, 126];    // 碎片环半径（图片坐标，已按 S 反算）
const LOCK_RING_N = [10, 12, 14, 16, 18];        // 每环块数 ⇒ 合计 70 块
const LOCK_DUR = 1.0, LOCK_SHATTER = 0.20;       // 时长 1.0s；破裂时刻 0.20s
const LOCK_LW = 1 / LOCK_S;                      // 画布 px → 图片坐标的线宽换算
const LOCK_CRACK_STEP = 33.9;                    // 裂纹单段长（图片坐标）= 637/5.5×1.06÷3.62

function lockClamp01(v){ return v<0 ? 0 : v>1 ? 1 : v; }
function lockSmooth(a,b,v){ const p=lockClamp01((v-a)/(b-a)); return p*p*(3-2*p); }
function lockRaf(cb){
  try{ if(typeof requestAnimationFrame==='function'){ requestAnimationFrame(cb); return; } }catch(e){}
  setTimeout(cb, 40);
}

/* 纯函数：种子 → 70 块极坐标碎片（**图片坐标**的多边形 + 画布空间的飞散参数）。
   确定性：同 seed 全等、异 seed 不等 —— 冒烟钉这两条 + 块数 + 顶点范围。 */
function lockBreakShards(seed){
  const rnd = mkRng((seed>>>0)||1);              // mkRng 在 20_data.js，同为 mulberry32（全局共享，调用期一定已定义）
  const out=[];
  const cx0 = LOCK_OX + LOCK_C.x*LOCK_S, cy0 = LOCK_OY + LOCK_C.y*LOCK_S;
  for(let ring=0; ring<LOCK_RING_N.length; ring++){
    const ri=LOCK_RING_R[ring], ro=LOCK_RING_R[ring+1], n=LOCK_RING_N[ring];
    for(let s=0; s<n; s++){
      const jA=()=>(rnd()-0.5)*(Math.PI*2/n)*0.45;
      const jR=(r)=>r*(1+(rnd()-0.5)*0.22);
      const a0=(s/n)*Math.PI*2+jA(), a1=((s+1)/n)*Math.PI*2+jA();
      const r0=jR(ri), r1=jR(ro);
      const pts=[
        { x:LOCK_C.x+Math.cos(a0)*r0, y:LOCK_C.y+Math.sin(a0)*r0 },
        { x:LOCK_C.x+Math.cos(a0)*r1, y:LOCK_C.y+Math.sin(a0)*r1 },
        { x:LOCK_C.x+Math.cos(a1)*r1, y:LOCK_C.y+Math.sin(a1)*r1 },
        { x:LOCK_C.x+Math.cos(a1)*r0, y:LOCK_C.y+Math.sin(a1)*r0 }
      ];
      const center={ x:(pts[0].x+pts[1].x+pts[2].x+pts[3].x)/4, y:(pts[0].y+pts[1].y+pts[2].y+pts[3].y)/4 };
      // 飞散方向用**画布坐标**算：图片坐标算出来的方向一样，但半径小 3.62 倍，
      // 会让 speed 里的 dist/300 项整体失真（碎片飞得太近）。
      let dx=(LOCK_OX+center.x*LOCK_S)-cx0, dy=(LOCK_OY+center.y*LOCK_S)-cy0;
      const dist=Math.max(12, Math.sqrt(dx*dx+dy*dy));
      dx/=dist; dy/=dist;
      const speed=(60+rnd()*150)*(0.55+dist/300);
      out.push({ pts:pts, center:center, dist:dist, dx:dx, dy:dy,
                 speed:speed*(0.8+rnd()*0.4), spin:(rnd()-0.5)*7, alphaJ:0.75+rnd()*0.25 });
    }
  }
  return out;
}

/* 三张离屏：原图 / 纯白剪影（白闪用）/ 带裂纹（裂纹只落在锁的不透明区上，source-atop）。
   裂纹形状与 seed **无关**（渲染器里就是固定 777）—— 锁就那一个样子，每次裂法一致才不显得随机。 */
function lockMakeOffscreens(img){
  const mk=function(){ const c=document.createElement('canvas'); c.width=LOCK_IMG_W; c.height=LOCK_IMG_H; return c; };
  const lockCv=mk(), whiteCv=mk(), crackCv=mk();
  lockCv.getContext('2d').drawImage(img,0,0);
  const wc=whiteCv.getContext('2d'); wc.drawImage(img,0,0);
  wc.globalCompositeOperation='source-in'; wc.fillStyle='#fff'; wc.fillRect(0,0,LOCK_IMG_W,LOCK_IMG_H);
  const cc=crackCv.getContext('2d'); cc.drawImage(img,0,0);
  cc.globalCompositeOperation='source-atop';
  const rnd=mkRng(777);
  for(let i=0;i<9;i++){
    let a=(i/9)*Math.PI*2+(rnd()-0.5)*0.5;
    let x=LOCK_C.x, y=LOCK_C.y;
    cc.beginPath(); cc.moveTo(x,y);
    const segs=4+Math.floor(rnd()*3);
    for(let k=0;k<segs;k++){
      a+=(rnd()-0.5)*0.85;
      const len=LOCK_CRACK_STEP*(0.55+rnd()*0.5);
      x+=Math.cos(a)*len; y+=Math.sin(a)*len;
      cc.lineTo(x,y);
      if(rnd()<0.4){ const bx=x+Math.cos(a+1.1)*len*0.5, by=y+Math.sin(a+1.1)*len*0.5; cc.lineTo(bx,by); cc.lineTo(x,y); }
    }
    cc.strokeStyle='rgba(12,9,4,0.9)'; cc.lineWidth=3.2*LOCK_LW; cc.stroke();
    cc.strokeStyle='rgba(255,240,200,0.35)'; cc.lineWidth=1.1*LOCK_LW; cc.stroke();
  }
  return { lock:lockCv, white:whiteCv, crack:crackCv };
}
function lockMakeSparks(){
  const rnd=mkRng(1234), out=[];
  for(let i=0;i<42;i++){
    const a=rnd()*Math.PI*2, up=rnd()*0.55;
    out.push({ vx:Math.cos(a)*(260+rnd()*480), vy:Math.sin(a)*(200+rnd()*380)-up*260,
               life:0.22+rnd()*0.28, w:1.6+rnd()*1.6 });
  }
  return out;
}
function lockMakeDebris(){
  const rnd=mkRng(4321), out=[];
  for(let i=0;i<30;i++){
    const a=rnd()*Math.PI*2;
    out.push({ vx:Math.cos(a)*(90+rnd()*230), vy:Math.sin(a)*(70+rnd()*170)-60,
               life:0.32+rnd()*0.44, size:3+rnd()*5,
               rot:rnd()*Math.PI, spin:(rnd()-0.5)*9, gold:rnd()<0.5 });
  }
  return out;
}

/* 单帧绘制。t ∈ [0,1]；t<SHATTER 演「锁完好→震颤→裂纹蔓延」，之后演「白闪+碎片+光晕+火花+碎屑」。 */
function lockDrawFrame(ctx, offs, shards, sparks, debris, t){
  const SW=LOCK_IMG_W*LOCK_S, SH=LOCK_IMG_H*LOCK_S;
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,LOCK_CV,LOCK_CV);
  const CX=LOCK_OX+LOCK_C.x*LOCK_S, CY=LOCK_OY+LOCK_C.y*LOCK_S;
  if(t < LOCK_SHATTER){
    const amp=2.5+5.5*(t/LOCK_SHATTER);                   // 越接近破裂抖得越狠
    ctx.save();
    ctx.translate(LOCK_OX+Math.sin(t*149)*amp, LOCK_OY+Math.cos(t*181)*amp*0.7);
    ctx.drawImage(offs.lock, 0,0, SW, SH);
    const preA=0.30*lockClamp01((t-0.05)/(LOCK_SHATTER-0.05));   // 渐亮
    if(preA>0.004){ ctx.globalAlpha=preA; ctx.drawImage(offs.white,0,0,SW,SH); ctx.globalAlpha=1; }
    const crackP=lockClamp01((t-0.09)/(LOCK_SHATTER-0.09));      // 裂纹从锁孔向外蔓延（圆形 clip 控范围）
    if(crackP>0.004){
      ctx.save();
      ctx.beginPath(); ctx.arc(LOCK_C.x*LOCK_S, LOCK_C.y*LOCK_S, 30+crackP*640, 0, Math.PI*2); ctx.clip();
      ctx.globalAlpha=Math.min(1, crackP*1.6);
      ctx.drawImage(offs.crack,0,0,SW,SH);
      ctx.restore();
    }
    ctx.restore();
    return;
  }
  // ① 白闪轮廓（0.16s 内扩散 + 淡出）
  let p=(t-LOCK_SHATTER)/0.16;
  if(p>=0 && p<1){
    ctx.save();
    ctx.globalAlpha=0.85*(1-p);
    ctx.translate(CX,CY);
    const sc=1+0.45*p; ctx.scale(sc,sc);
    ctx.drawImage(offs.white, -LOCK_C.x*LOCK_S, -LOCK_C.y*LOCK_S, SW, SH);
    ctx.restore();
    ctx.globalAlpha=1;
  }
  // ② 碎片飞散（径向缓出 + 轻微重力 + 旋转 + 缩小 + 淡出）
  const fly=t-LOCK_SHATTER;
  const m=1-Math.pow(1-fly, 2.2);
  const fade=1-lockSmooth(0.40,0.95,t);
  if(fade>0.002){
    const scale=1-0.22*fly;
    for(let i=0;i<shards.length;i++){
      const sh=shards[i];
      const a=fade*sh.alphaJ; if(a<=0.004) continue;
      const px=(LOCK_OX+sh.center.x*LOCK_S)+sh.dx*sh.speed*m;
      const py=(LOCK_OY+sh.center.y*LOCK_S)+sh.dy*sh.speed*m+300*fly*fly;
      ctx.save();
      ctx.translate(px,py); ctx.rotate(sh.spin*fly); ctx.scale(scale,scale);
      ctx.globalAlpha=a;
      ctx.beginPath();
      for(let k=0;k<sh.pts.length;k++){
        const lx=(sh.pts[k].x-sh.center.x)*LOCK_S, ly=(sh.pts[k].y-sh.center.y)*LOCK_S;
        if(k===0) ctx.moveTo(lx,ly); else ctx.lineTo(lx,ly);
      }
      ctx.closePath(); ctx.clip();
      ctx.drawImage(offs.lock, -sh.center.x*LOCK_S, -sh.center.y*LOCK_S, SW, SH);
      ctx.restore();
    }
    ctx.globalAlpha=1;
  }
  // ③ 光晕 + 两道冲击环（0.30s / 0.26s）
  p=(t-LOCK_SHATTER)/0.30;
  if(p>=0 && p<1){
    ctx.save();
    ctx.globalCompositeOperation='lighter';
    const r=300*(1+p*0.6);
    const g=ctx.createRadialGradient(CX,CY,0,CX,CY,r);
    g.addColorStop(0,'rgba(255,226,150,'+(0.5*(1-p)).toFixed(3)+')');
    g.addColorStop(1,'rgba(255,180,60,0)');
    ctx.fillStyle=g; ctx.fillRect(CX-r,CY-r,r*2,r*2);
    for(let k=0;k<2;k++){
      const q=lockClamp01((t-LOCK_SHATTER-k*0.045)/0.26);
      if(q<=0||q>=1) continue;
      ctx.beginPath();
      ctx.ellipse(CX,CY, 60+520*q, (60+520*q)*0.82, 0,0,Math.PI*2);
      ctx.strokeStyle='rgba(255,214,120,'+(0.75*(1-q)).toFixed(3)+')';
      ctx.lineWidth=(10*(1-q)+2)*0.5;
      ctx.stroke();
    }
    ctx.restore();
  }
  // ④ 火花（42 条拖尾短线，白→琥珀→橙）
  const te=t-LOCK_SHATTER;
  if(te>0){
    ctx.save();
    ctx.globalCompositeOperation='lighter';
    ctx.lineCap='round';
    for(let i=0;i<sparks.length;i++){
      const s=sparks[i]; if(te>=s.life) continue;
      const q=te/s.life;
      const x=CX+s.vx*te, y=CY+s.vy*te+300*te*te;
      const col= q<0.35 ? '255,244,214' : q<0.7 ? '255,206,110' : '255,140,50';
      ctx.strokeStyle='rgba('+col+','+(1-q).toFixed(3)+')';
      ctx.lineWidth=s.w*(1-q*0.6);
      ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x-s.vx*0.028, y-s.vy*0.028); ctx.stroke();
    }
    ctx.restore();
    // ⑤ 碎屑（30 片金/褐小三角，重力更重 520t²）
    for(let i=0;i<debris.length;i++){
      const d=debris[i]; if(te>=d.life) continue;
      const q=te/d.life;
      ctx.save();
      ctx.translate(CX+d.vx*te, CY+d.vy*te+520*te*te);
      ctx.rotate(d.rot+d.spin*te);
      ctx.globalAlpha=1-q;
      ctx.fillStyle=d.gold?'#d9b25c':'#8a6f36';
      ctx.beginPath();
      ctx.moveTo(0,-d.size); ctx.lineTo(d.size*0.8, d.size*0.6); ctx.lineTo(-d.size*0.8, d.size*0.5);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha=1;
  }
}

/* 对外入口：在 hostEl 里插一块 canvas 演 1.0s 锁破裂，到破裂那一帧调 onReveal(让调用方换图标 + 描边淡入)。
   降级路径（全部都是「不放动画、直接出结果」，绝不卡住流程）：
     · !fx()（流畅模式）· 没有 document/canvas · 图 400ms 内没加载出来（onerror 或超时）。
   opts.px   画布显示边长，默认 120
   opts.top  画布顶边相对 hostEl 的偏移（默认 0；节点图标是 56px、画布 120px，通常传负值让锁居中压在图标上） */
function playLockBreak(hostEl, onReveal, opts){
  const reveal=function(){ if(onReveal){ try{ onReveal(); }catch(e){} } };
  let cv=null;
  try{
    cv=document.createElement('canvas');
    cv.width=LOCK_CV; cv.height=LOCK_CV;
    cv.className='lockbreak-cv';
    const px=(opts&&opts.px)||120, top=(opts&&opts.top)||0;
    cv.style.cssText='position:absolute;left:50%;top:'+top+'px;width:'+px+'px;height:'+px+'px;'+
                     'transform:translateX(-50%);pointer-events:none;z-index:6;';
  }catch(e){ cv=null; }
  if(!hostEl || !hostEl.appendChild || !cv){ reveal(); return; }
  let ctx=null;
  try{ hostEl.appendChild(cv); ctx=cv.getContext && cv.getContext('2d'); }catch(e){ ctx=null; }
  if(!fx() || !ctx){ if(cv.parentNode) cv.parentNode.removeChild(cv); reveal(); return; }
  const drop=function(){ try{ if(cv.parentNode) cv.parentNode.removeChild(cv); }catch(e){} };
  let started=false;
  const giveUp=function(){ if(started) return; started=true; drop(); reveal(); };
  const img=new Image();
  img.onload=function(){
    if(started) return;
    started=true;
    let offs=null;
    try{ offs=lockMakeOffscreens(img); }catch(e){ offs=null; }
    if(!offs){ drop(); reveal(); return; }
    const shards=lockBreakShards(((typeof G!=='undefined' && G && G.mapSeed)||1) ^ 0x9E37);
    const sparks=lockMakeSparks(), debris=lockMakeDebris();
    const t0=(typeof performance!=='undefined' && performance.now) ? performance.now() : Date.now();
    let revealed=false;
    const step=function(){
      const now=(typeof performance!=='undefined' && performance.now) ? performance.now() : Date.now();
      const t=Math.min(LOCK_DUR, (now-t0)/1000);
      try{ lockDrawFrame(ctx, offs, shards, sparks, debris, t); }catch(e){}
      if(!revealed && t>=LOCK_SHATTER){ revealed=true; reveal(); }
      if(t<LOCK_DUR){ lockRaf(step); return; }
      drop();
    };
    lockRaf(step);
  };
  img.onerror=giveUp;
  try{ img.src=assetURL(LOCK_IMG_REL); }catch(e){ giveUp(); return; }
  setTimeout(function(){ if(!started) giveUp(); }, 400);   // 图没来就别卡着，直接出结果
}

