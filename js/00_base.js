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
/* v1.0.9：写盘失败不再静默。此前所有调用点都 `try{}catch(e){}` 把返回值吞掉 ⇒
   隐私模式 / 站点数据被禁 / 配额满时，本局档根本没落盘而玩家零提示（刷新即失档，
   表现为「继续爬塔」按钮凭空消失，会被当成 Bug）。只在**本局档**的三个键上提示，
   设置 / 成就 / 榜单等其它键保持静默，避免刷屏；提示只发一次（_storeWarned 一次性闩）。 */
let _storeWarned=false;
function _storeIsRunKey(k){
  try{ return typeof RUN_SLOTS!=='undefined' && RUN_SLOTS.indexOf(k)>=0; }catch(e){ return false; }
}
const Store = {
  get(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } },
  set(k,v){
    try{ localStorage.setItem(k,v); return true; }
    catch(e){
      if(!_storeWarned && _storeIsRunKey(k)){
        _storeWarned=true;
        try{ floatMsg('⚠ 存档失败：浏览器存储不可用，本局进度不会保存'); }catch(e2){}
      }
      return false;
    }
  },
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
/* v1.0.7（手机端性能）：LOG_SEQ 是「本局累计写入过多少行」的**单调计数器**。
   为什么需要它：G.log 有 800 行上限，满了以后 push+shift 会让 G.log.length 恒为 800，
   于是「长度没变」既可能是「没有新行」也可能是「进了一行、掉了一行」—— 光凭长度分不开。
   战报抽屉的增量渲染（60_boot.js 的 renderLogBox）靠它判断「这几次 render 之间新增了几行」。
   它对存档/冒烟**零影响**：不入 G、不参与序列化，只是一个加载期就存在、只增不减的全局。 */
let LOG_SEQ=0;
function log(msg){ if(!G) return; G.log.push(msg); if(G.log.length>800) G.log.shift(); LOG_SEQ++; }

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
/* v1.0.7（手机端性能）：格子偏移 → 内层精灵图的 transform。
   background-position 不是合成属性（改一次 = 主线程重光栅化一次）；transform 是，
   所以动画期间只动 transform。**数值与 fxCellPos 完全同号同值**，可见格子逐像素一致。 */
function fxCellTf(p){ return 'translate('+p.x+'px,'+p.y+'px)'; }
/* 四个字符串别名 → 选择器。fxAnchorRect（创建时）与 fxResolveAnchor（重锚时）共用这一张表，
   别各写一份 —— v0.64.0 就是靠改这张表把 'summon' 从「屏幕中心」挪到 #player-panel 的。
   v1.0.2：'player' / 'summon' 从 #player-panel 再往下落到**立绘框**（.hero-art-box）。
   为什么要落立绘而不是整块面板：面板 = 立绘 + 名字 + 机制 + 血条 + 数值，中心落在
   「名字/血条」那一段 —— 手机横屏把立绘抬了一档之后，面板更高、中心更低，
   特效会明显沉到角色腰以下。立绘框的总高就是立绘本身，落它 = 特效跟着立绘走。
   ⚠️ 盒子边长**不变**：fxBoxSize 取锚点的短边，而立绘框与面板等宽（.hero-art-box 是 100% 宽）
      ⇒ 变的只有落点（上移到立绘中心），不是尺寸。尺寸的档差仍由敌人/面板的宽度给。 */
function fxAliasSel(anchor){
  return anchor==='player' ? '#player-panel .hero-art-box'
       : anchor==='field'  ? '#enemy-panel'
       : anchor==='enemy'  ? '#enemy-panel'
       : anchor==='summon' ? '#player-panel .hero-art-box' : null;
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
  const sel=fxAliasSel(anchor);
  if(sel){
    const el=document.querySelector(sel);
    if(el && el.getBoundingClientRect){
      const r=el.getBoundingClientRect();
      if(r && r.width>0 && r.height>0) return r;
    }
  }
  return { left:window.innerWidth*0.5, top:window.innerHeight*0.42, width:0, height:0 };   // 量不到元素才落这里
}
/* ===================== v0.69.0：特效重锚 =====================
   用户报的 bug：三个敌人 / Boss 出场时玩家面板会上下移动，**特效跟不上**。
   根因是 playFx / floatDamage / defenseFx 都只在**调用那一刻**量一次锚点坐标就把
   left/top 写死，之后再没人改过。而 #player-panel 的纵向位置恰恰是由敌人面板高度决定的
   —— `.battle{align-items:flex-end}`（原型.html:92）+ battleHeadroom() 按敌人数写的
   #enemy-panel padding-top（60_boot.js:248：1 敌 2px / 3 敌 44px / 5 敌 62px）。

   修法：锚点**不再存元素引用，改存可重新解析的描述符**（render() 每次整块重写两个面板的
   innerHTML，元素引用必然游离），并在 render() 末尾重锚一次。

   为什么由 render() **直接调用**、而不是靠特效自己的 rAF 回调顺手重算：
   实测 30_engine.js:374（玩家受击）只调 hurtVignette() + floatDamage()，**没有精灵图特效**
   ⇒ 那个窗口里没有任何 rAF 在跑，靠 rAF 驱动会漏掉纯飘字的场景。而 render() 是"面板要变了"
   的唯一汇集点，直接调它覆盖面最全，且不需要引入纪元计数器、不需要碰 rAF、不需要新定时器
   （定时器会让 node 冒烟进程退不出）。代价是每次 render 多一次强制同步布局 ——
   但没事可做时 fxReanchor **在任何 getBoundingClientRect 之前就返回**，零开销。 */
let NUM_LIVE = [];                       // 只飘字/光环类（结构比 FX_LIVE 简单，但走同一个重锚批次）
function fxAnchorSpec(anchor){
  if(typeof anchor==='string') return { kind:'alias', v:anchor };
  if(anchor && anchor.getBoundingClientRect){
    const uid=(anchor.dataset && anchor.dataset.uid) ? anchor.dataset.uid : null;
    if(uid) return { kind:'uid', v:uid };                      // 敌人：render() 重写 innerHTML 后按 uid 找回
    if(anchor.id==='player-panel' || anchor.id==='enemy-panel') return { kind:'sel', v:'#'+anchor.id };
    /* v1.0.2：立绘框与面板一样是 render() 每次重建的，但它在 #player-panel 里唯一且可描述
       ⇒ 存选择器、不存元素引用（存引用会游离 ⇒ 重锚解不到而冻结，特效留在半路）。
       与下面 hpbar 那条同一套口径。 */
    if(anchor.classList && anchor.classList.contains && anchor.classList.contains('hero-art-box') &&
       (typeof anchor.closest!=='function' || anchor.closest('#player-panel'))) return { kind:'sel', v:'#player-panel .hero-art-box' };
    /* 玩家血条（多数飘字的锚点）也是每次 render 重建的，但它永远在 #player-panel 里且唯一。
       closest 在 vm_host 的 dummyEl 上可能不存在 ⇒ 必须守卫。 */
    if(anchor.classList && anchor.classList.contains && anchor.classList.contains('hpbar') &&
       (typeof anchor.closest!=='function' || anchor.closest('#player-panel'))) return { kind:'sel', v:'#player-panel .hpbar' };
    return { kind:'el', v:anchor };
  }
  return { kind:'none', v:null };
}
/* 描述符 → 当前矩形。**解不到一律返回 null（= 冻结）**，绝不回落屏幕中心：
   450ms 的特效播到一半"啪"地跳到屏幕正中，比停在原地难看得多。
   fxAnchorRect 的屏幕中心兜底只在**创建时**量不到才用（那是"无处可贴"的合理选择）。 */
function fxResolveAnchor(spec){
  if(!spec) return null;
  let el=null;
  /* 别名走 fxAliasSel 而**不走 fxAnchorRect**：后者量不到元素时会回落「屏幕中心」，
     那正是重锚最不该做的事（见上）。这里所有分支的解不到一律 null = 冻结。 */
  if(spec.kind==='alias'){ const sel=fxAliasSel(spec.v); if(!sel) return null; el=document.querySelector(sel); }
  else if(spec.kind==='uid') el=document.querySelector('#enemy-panel .enemy[data-uid="'+spec.v+'"]');
  else if(spec.kind==='sel') el=document.querySelector(spec.v);
  else if(spec.kind==='el'){ if(spec.v && spec.v.isConnected===false) return null; el=spec.v; }
  else return null;
  if(!el || !el.getBoundingClientRect) return null;
  const r=el.getBoundingClientRect();
  return (r && r.width>0 && r.height>0) ? r : null;
}
/* 算新坐标。返回 null = 不用写（NaN 或与上次相同）。
   ax/ay 是「锚点矩形内的比例」，bx/by 是「盒子自身的偏移」：
     playFx     中心 0.5/0.5，bx=box/2+ox、by=box/2+oy（ox/oy 见 FX_SHEETS，是内容框修正）
     floatDamage 0.5/0.4（历史值，别改），bx=by=0（.fx-dmg 自带 translate(-50%,-50%) 居中）
     defenseFx  0.5/0.45（历史值），bx=by=0（.fx-halo 同样自带居中）
   lx===l && ly===t 短路 ⇒ 站着的特效**零 style 写入**。 */
function fxSpot(st, r){
  const l=Math.round(r.left + r.width*st.ax - st.bx);
  const t=Math.round(r.top  + r.height*st.ay - st.by);
  if(!isFinite(l) || !isFinite(t)) return null;   // vm_host 的 sandbox 没有 innerWidth ⇒ 兜底会算出 NaN
  if(l===st.lx && t===st.ly) return null;
  return { l:l, t:t };
}
/* 重锚全部活体。**读一遍 → 写一遍，中间不读**：阶段①里所有 getBoundingClientRect 之间
   零 style 写入 ⇒ 浏览器最多付一次强制同步布局；不分批则 N 个特效 = N 次。 */
function fxReanchor(){
  const jobs=[];
  const k=Object.keys(FX_LIVE);
  for(let i=0;i<k.length;i++){ const st=FX_LIVE[k[i]]; if(st && !st.dead && st.spec) jobs.push(st); }
  for(let i=0;i<NUM_LIVE.length;i++){ const st=NUM_LIVE[i]; if(st && st.spec) jobs.push(st); }
  if(!jobs.length) return;                        // ← 无事可做时在这里就返回，一个 rect 都不量
  for(let i=0;i<jobs.length;i++){
    const st=jobs[i], r=fxResolveAnchor(st.spec);
    st.pend = r ? fxSpot(st, r) : null;           // r=null ⇒ 冻结（保留 lx/ly，不跳屏幕中心）
  }
  for(let i=0;i<jobs.length;i++){
    const st=jobs[i], p=st.pend; st.pend=null;
    if(!p) continue;
    st.lx=p.l; st.ly=p.t;
    st.el.style.left=p.l+'px'; st.el.style.top=p.t+'px';
  }
}
function fxUntrack(st){ const i=NUM_LIVE.indexOf(st); if(i>=0) NUM_LIVE.splice(i,1); }
/* resize 也重锚一次（视口变了 ⇒ 相对定位的锚点位移）。
   `typeof window!=='undefined' && window.addEventListener` 是**仓库既有惯例**（见 50_ui.js:586/730），
   不是多余的防御：_patch/vm_host.js 的沙箱**没有顶层 addEventListener**（只有 document 上有，:76），
   裸写 window.addEventListener('resize',…) 会让冒烟在**加载期**就 TypeError 崩掉。
   本文件是经典脚本、只执行一次，所以不需要 50_ui.js 那种 _xxxBound once 标志。 */
if(typeof window!=='undefined' && window.addEventListener){
  window.addEventListener('resize', function(){ fxReanchor(); });
}
/* 挂进重锚表并**立刻摆一次**（创建时的首次定位，与后续重锚共用 fxSpot 同一套公式）。 */
function fxTrack(el, anchor, ax, ay, bx, by){
  const st={ el:el, spec:fxAnchorSpec(anchor), ax:ax, ay:ay, bx:bx||0, by:by||0, lx:null, ly:null, pend:null };
  if(st.spec.kind!=='none'){
    const r=fxResolveAnchor(st.spec);
    const p=r ? fxSpot(st, r) : null;
    if(p){ st.lx=p.l; st.ly=p.t; el.style.left=p.l+'px'; el.style.top=p.t+'px'; }
  }
  NUM_LIVE.push(st);
  return st;
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
  /* v0.69.0：首次定位算成局部量 lft/tp —— 既写进 style，也存进 st.lx/ly。
     st 在下面才建，所以先算好；lx/ly 留空的话重锚的短路就失效，每个 render 都要白写一次 style。
     isFinite 守卫：fxAnchorRect 的兜底在 vm_host 的 sandbox 里是 NaN（那边没有 innerWidth），
     NaN 写进 style.left 会被浏览器丢弃，且 NaN===st.lx 恒假 ⇒ 每个 render 都白写。 */
  const lft=Math.round(r.left+r.width/2-box/2-ox);
  const tp =Math.round(r.top+r.height/2-box/2-oy);
  if(isFinite(lft)) el.style.left=lft+'px';
  if(isFinite(tp))  el.style.top =tp+'px';
  /* v1.0.7（手机端性能）：整张精灵图挂**内层**，靠 transform 平移切格；外层只当裁切窗（overflow:hidden）。
     为什么要动它：旧写法把整张图当外层的 background、每帧改 background-position —— 那不是合成属性，
     每改一次都要主线程重新光栅化整块，而这张图 3840px 宽、盒子最大到数百 px。手机上实测每帧几十 ms、
     整段动画把帧率压到 15~31（longtask 273~313ms，录屏读数）。transform 在合成器上跑，
     几十帧只光栅化一次。可见区域仍是第 i 格，与非合成版逐像素一致。
     rows 用素材真实排数 S.rows；缺字段时按「最大要播到的帧」回推，免得内层不够高把末帧裁掉。 */
  const c0=Math.max(1, S.c||8);
  const rows=S.rows || (Math.floor(((S.i0||0)+Math.max(1,S.f||1)-1)/c0)+1);
  /* v1.0.9（手机端性能）：**按排拆分**的精灵图 —— 手机端「打出手牌那一瞬间卡」的正解。
     单文件 / TapTap 产物里，打包.py 把每张 3840×2880 的整图按排切成 rows 张 3840×480 的小图
     （键 fx/<name>_r<行>.png；只是横着切一刀，逐像素不变）。为什么要切：整图当 CSS background
     挂上去时，浏览器要一次**解码 11.06 Mpx ≈ 42 MB** 的位图，30 张合计 1195 MB，手机图片缓存
     根本留不住 ⇒ 每次出牌都重解一遍（真机 100~200ms），录屏里那串 100~276ms 的尖峰正是它。
     按排只解 1.8 Mpx（≈7 MB），内层合成层也从 4248×3717 缩到 4248×540，尖峰随之落到十几毫秒。
     拆包产物 / 开发树没有按排键（ASSET_MAP 为空或 ASSET_MAP=null）⇒ strip=false ⇒ 走整图原逻辑，
     像素与行为完全不变（冒烟宿主里 ASSET_MAP 就是 null，走的正是这条老路）。 */
  const stripRel=function(r){ return 'fx/'+name+'_r'+r+'.png'; };
  const strip=!!(typeof ASSET_MAP!=='undefined' && ASSET_MAP && ASSET_MAP[stripRel(0)]);
  const inner=document.createElement('div');
  inner.className='fx-sheet-in';
  inner.style.width=(c0*box)+'px';
  inner.style.height=((strip?1:rows)*box)+'px';
  /* v1.0.8（手机端性能）：这里必须带 wantBlob=true。单文件产物（TapTap 包）里不带第二参时，
     assetURL 会返回**整张精灵图的 base64 字串**（3840px 宽，几百 KB），而它被塞进 CSS 的
     background-image，且**每次出牌都新建一个**：浏览器要逐字解析并保存这串值，真机上就是
     「每次释放卡牌卡一下」。拆包产物（ASSET_MAP=null）本来就返回短相对路径，带不带都一样。 */
  const i0=S.i0||0;
  const row0=Math.floor(i0/c0);
  /* v1.0.9：**提前把下一排解好**。换排那一刻才挂上去的话，浏览器会有一两帧画不出这一排
     （background 还没解码完 ⇒ 该帧背景透明，肉眼就是「特效闪一下」）。提前一排（换排间隔
     8 帧 ≈ 333ms，够解 1.8 Mpx）+ 同 URL 命中图片缓存（assetURL 的 blob 地址按 rel 缓存
     ⇒ 两次取到同一个 URL）⇒ 换排那一帧直接出画。只在按排模式下跑：冒烟里 strip=false，
     整个函数一次都不进（vm 沙箱没有 Image）。 */
  const preloaded={};
  const preRow=function(r){
    if(!strip || r<0 || r>=rows || preloaded[r]) return;
    preloaded[r]=1;
    const im=new Image();
    im.src=assetURL(stripRel(r), true);
    if(im.decode){ try{ im.decode().catch(function(){}); }catch(e){} }
  };
  inner.style.backgroundImage='url("'+assetURL(strip?stripRel(row0):('fx/'+name+'.png'), true)+'")';
  inner.style.backgroundSize=(c0*box)+'px auto';
  /* v0.64.0：i0 = 起始帧。素材每张图的两端都有整格的**全透明**帧（实测最长首空 6 帧、尾空 9 帧），
     是出图时留的余量，不是动作的一部分。照原始帧数从第 0 格播的后果：
     开头 0.2 秒画面上什么都没有（像点了没反应），结尾又挂着一个透明元素不删。
     裁剪边界由 _patch/fx_tune.py 用 PIL 逐帧量覆盖率算得，写进 FX_SHEETS。
     v1.0.9：按排图只有**一排**高，纵偏移恒 0（横偏移仍是格内列号），起点落在 (i0%8, 0)。 */
  const p0 = strip ? { x:-(i0%c0)*box, y:0 } : fxCellPos(i0, c0, box);
  inner.style.transform=fxCellTf(p0);
  preRow(row0+1);                             // 一进场就把下一排排上队（见 preRow 注释）
  el.appendChild(inner);
  fxLayer().appendChild(el);
  if(opts.still) return el;                   // 钉帧：不进 FX_LIVE、不排 rAF（只给截图夹具用）
  const st={ el:el, inner:inner, key:key, i:0, S:S, i0:i0, box:box, dead:false, pend:null,
             /* v1.0.9：按排模式的两个游标 —— c0 是列数（算行号），row 是当前挂着的那一排（换排才改
                backgroundImage；同一排内只动 transform）。非按排模式下 strip=false，两字段闲置。 */
             strip:strip, c0:c0, row:row0, preRow:preRow,
             /* v0.69.0 重锚字段：spec 是可重新解析的锚点描述符（不存元素引用 —— render() 每次
                整块重写面板 innerHTML，引用必然游离）；ax/ay 是锚点矩形内的比例（精灵图取中心）；
                bx/by 是盒子自身偏移（半个格子 + ox/oy 内容框修正）；lx/ly 是上次写入值，用于短路。 */
             spec:fxAnchorSpec(anchor), ax:0.5, ay:0.5, bx:box/2+ox, by:box/2+oy,
             lx:isFinite(lft)?lft:null, ly:isFinite(tp)?tp:null,
             dur:1000/(24*(opts.rate||1)),    // 源速 24fps
             t0:(window.performance&&performance.now?performance.now():Date.now()), raf:0 };
  FX_LIVE[key]=st;
  st.raf=requestAnimationFrame(function step(){
    if(st.dead) return;
    const now=(window.performance&&performance.now?performance.now():Date.now());
    const i=Math.floor((now-st.t0)/st.dur);
    if(i>=S.f){ fxStop(key); return; }
    if(i!==st.i){
      st.i=i;
      const k=st.i0+i;
      if(st.strip){
        /* v1.0.9：按排 —— 帧只在**当前那一排**里横向平移（transform 是合成属性，几乎零成本）；
           跨排时才换 backgroundImage（那一下要解一排小图 ≈7MB，而不是整图 42MB）。
           换排间隔 = 8 帧 ≈ 333ms（24fps），有足够余量让浏览器在后台把下一排解好。 */
        const r=Math.floor(k/st.c0);
        if(r!==st.row){
          st.row=r; st.preRow(r+1);      // 先排下一排的解码，再换当前排（顺序反了换排仍会闪）
          st.inner.style.backgroundImage='url("'+assetURL(stripRel(r), true)+'")';
        }
        st.inner.style.transform=fxCellTf({ x:-(k%st.c0)*box, y:0 });
      } else {
        st.inner.style.transform=fxCellTf(fxCellPos(k, st.c0, box));
      }
    }
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
  const c0=Math.max(1, S.c||8);
  const k=Math.max(0, Math.min(i0+S.f-1, i0+(i|0)));
  /* v1.0.9：与 playFx 同一套「按排 or 整图」判据（这里重算而不是读 el 上的字段：fxSeek 只给截图夹具用，
     多一处状态反而多一处漂点）。按排时先把 backgroundImage 换到 k 所在那一排，再横向平移。 */
  const inEl=el.firstChild;
  if(inEl){
    if(typeof ASSET_MAP!=='undefined' && ASSET_MAP && ASSET_MAP['fx/'+name+'_r0.png']){
      const r=Math.floor(k/c0);
      inEl.style.backgroundImage='url("'+assetURL('fx/'+name+'_r'+r+'.png', true)+'")';
      inEl.style.transform=fxCellTf({ x:-(k%c0)*box, y:0 });
    } else {
      inEl.style.transform=fxCellTf(fxCellPos(k, c0, box));
    }
  }
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
  /* v0.69.0：飘字也进重锚表。ax/ay 取 0.5/0.4（**0.4 是历史值，不是 0.5，别顺手"修正"**）；
     bx/by 恒 0 —— .fx-dmg 自带 `transform:translate(-50%,-50%)`（原型.html:769），left/top 就是中心。
     无锚点时走百分比定位（50%/28%）并**不登记**：那种情况下它本就贴着视口，没有可漂的锚。 */
  const st = anchor ? fxTrack(span, anchor, 0.5, 0.4, 0, 0) : null;
  if(!anchor){ span.style.left='50%'; span.style.top='28%'; }
  setTimeout(()=>{ span.remove(); if(st) fxUntrack(st); }, 950);
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
    if(state==='hit') setTimeout(function(){ box.classList.remove('hero-hit'); },360);
    if(state==='attack') setTimeout(function(){ box.classList.remove('hero-attack'); },400);
  }
}
/* v1.0.11：敌人「出手」动作 —— 向玩家方向（左下）冲一下。
   为什么不用 HITFX 那套「登记集合 + render 时写进 HTML」：那是给**受击**用的，
   因为受击发生在 render 之前、类要能活过一次重建；而敌人出手发生在 enemyAct 里，
   整个敌人回合内不跑 render（弧线 --ex/--ey 在回合开始前就已写好）⇒
   直接挂到当前那个 DOM 元素上就行，不需要任何集合、也不需要改渲染函数。
   ⚠️ 类必须在 300ms 后摘掉：留着的话元素会一直挂着那个 animation 声明，
     下一次 render 重建的元素倒无所谓，但若中途没 render（例如敌方回合是最后一段），
     这类会一直留在 DOM 上，将来任何一次重排都可能让它重播一次。
   ⚠️ 降级走 CSS（`.low-spec .enemy.e-atk{animation:none}`），与 `.enemy.hit` 同一口径，
     所以这里**不判 fx()** —— 与 heroAnim 保持一致，别让两条腿的开关长在不同地方。 */
function enemyAttackAnim(e, times, delayMs){
  var el=enemyEl(e); if(!el) return;
  var t=(times|0)>1?(times|0):1;
  var dl=(delayMs|0)>0?(delayMs|0):0;
  /* v1.0.12：① 连击按**段**重播（multi 的 n 段）；② 依次行动按**屏幕左→右**错峰（delay）。
     两个值都以内联 CSS 变量下发给 keyframes（原型.html 的 .enemy.e-atk 用 animation-delay /
     animation-iteration-count 读它们）。**伤害本体仍然同步结算**，错峰的只是动作，
     所以 enemyAct 不必改成异步。 */
  el.style.setProperty('--atk-delay', dl+'ms');
  el.style.setProperty('--atk-times', String(t));
  el.classList.remove('e-atk'); void el.offsetWidth; el.classList.add('e-atk');
  setTimeout(function(){ el.classList.remove('e-atk'); }, dl + t*300 + 260);
}
/* —— v1.0.13：**非攻击类行动的身体动作** ——
   用户口径：「我要给每个敌人攻击都加上行为效果……格挡回血也加上血条边框变成玻璃质感和血条慢慢涨的
   动画效果（玩家的效果也要这样改动），等等」。攻击族（attack/multi/attackBlock/aoe）走上面那条
   enemyAttackAnim（前冲抽动）；其余六种行动各有自己的姿势：
     guard  格挡 —— 重心下沉、微后坐（抱臂护体）
     mend   回血 —— 轻轻上浮（吸纳）
     gather 蓄力 —— 后仰收势、缩小（攒劲）
     cast   施法 —— 前倾侧身（施咒 / 施加负面）
     call   召唤 —— 先顿地后微弹（呼喝）
     rite   记账 —— 轻微颔首（判官提笔）
   与攻击族共用同一条 --atk-delay 错峰变量 ⇒「从左到右依次行动」对**每一种**行动都成立，不只是攻击。 */
function enemyActAnim(e, kind, delayMs){
  var el=enemyEl(e); if(!el || !kind) return;
  var dl=(delayMs|0)>0?(delayMs|0):0;
  el.style.setProperty('--atk-delay', dl+'ms');
  var cls='e-act-'+kind;
  el.classList.remove('e-act', cls); void el.offsetWidth; el.classList.add('e-act', cls);
  setTimeout(function(){ el.classList.remove('e-act', cls); }, dl + 700);
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
  /* v1.0.2：锚点从 #player-panel 改到**立绘框**（与 fxAliasSel 的 'player' 同一处口径），
     盾环因此罩住角色本体而不是面板中心（面板中心落在名字/血条那一段）。
     立绘框量不到时退回面板 —— 别再往下掉到百分比兜底（那会跑到屏幕左上角）。 */
  const p=document.getElementById('player-panel');
  const a=(p && p.querySelector) ? (p.querySelector('.hero-art-box') || p) : p;
  const r=a?a.getBoundingClientRect():null;
  const s=Math.max(130, (r?r.width:180)*1.25);
  const d=document.createElement('div'); d.className='fx-halo';
  d.style.width=s+'px'; d.style.height=s+'px';
  /* v0.69.0：锚的正是 #player-panel —— **就是那个随敌人数上下移动的面板**，
     而 .fx-halo 是 `left:0;top:0` + `transform:translate(-50%,-50%)`（原型.html:885），
     所以 left/top 就是中心点。ax/ay 取 0.5/0.45（历史值）。 */
  const st = a ? fxTrack(d, a, 0.5, 0.45, 0, 0) : null;
  if(!a){ d.style.left=(window.innerWidth*0.28)+'px'; d.style.top=(window.innerHeight*0.3)+'px'; }
  fxLayer().appendChild(d);
  setTimeout(()=>{ d.remove(); if(st) fxUntrack(st); }, 650);
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

/* ===================== v0.76.0：敌人台词气泡（精英 / Boss 四档） =====================
   剧本与形态约定在 `敌人台词剧本.md`；这里只讲**为什么这么写**。

   ⚠️ **决策与渲染必须分开**：`sayPick` 是纯函数（可无头断言、不建节点、不建定时器），
      `pumpSay` 才碰 DOM。本仓的冒烟跑在 vm 沙箱里，**任何漏进去的定时器都会让 node 进程
      多等一轮**；漏成自续的（rAF 轮询）就永远退不出去。
   ⚠️ 所以 `pumpSay` 的**第一句**就是无头 / 低配 / 减弱动态的早返回 —— 这是本项
      「冒烟照常打印并退出」的唯一保障。
   ⚠️ 锚点必须用 `enemyEl(e)`（按 `data-uid` 找），**绝不能按 DOM 下标**：
      `js/60_boot.js` 渲染的是 `G.enemies.filter(e=>alive(e)||e.dying)`（下标 ≠ 数组下标）。
   ⚠️ 气泡挂 `document.body`，**不能**挂进 `#enemy-panel`：它的 `isolation:isolate`
      会把内部 z-index 夹到 0 层 ⇒ 气泡被手牌与浮层盖住。 */
const SAY_TIER_FIELD={in:'sayIn', hit:'sayHit', low:'sayLow', out:'sayOut'};
const SAY_TIER_MS={in:2600, hit:1800, low:2200, out:1800, mid:2200};
const SAY_QUEUE=[];
let SAY_BUSY=false;
/* 每一枚气泡领一个号；`clearSay` 把号推一格 ⇒ 在飞的那两个收尾定时器当场作废。
   ⚠️ 没有这个号的话：玩家点掉气泡（clearSay 把 SAY_BUSY 置回 false）之后立刻又有新台词
      上屏（SAY_BUSY=true），**旧的那个收尾定时器**随后到点，会把 SAY_BUSY 抹成 false 并
      再 pump 一次 ⇒ 两个气泡同屏。 */
let SAY_TOK=0;

/* 纯函数：给定敌人与档位，返回该念的那句并记一次性标记；没有 / 已经念过 ⇒ null。
   可无头调用：不建节点、不建定时器。
   ⚠️ 两句判空的**顺序是刻意的** —— 「这个敌人根本没有这一档」必须在**建 `_said` 之前**
      返回，否则普通敌人过一遍就凭空长出 `_said`（冒烟里有一条专门钉这个）。 */
function sayPick(e, tier){
  if(!e) return null;
  const f=SAY_TIER_FIELD[tier];
  if(!f || !e[f]) return null;
  const seen=(e._said=e._said||{});
  if(seen[tier]) return null;
  seen[tier]=1;
  return e[f];
}
/* 中段那两条（谢必安分化 / 阎罗天子二阶段）不走四档的记名：它们绑的是 Boss 的
   **独有机制分支**，一个 Boss 只会经历一次，而分支自己已经有幂等旗标（splitDone / phase2）。 */
function sayMidPick(key){
  const m=(typeof ENEMY_SAY_MID!=='undefined') ? ENEMY_SAY_MID[key] : null;
  return (m && m.text) ? m.text : null;
}
function enemySay(e, tier){
  const line=sayPick(e, tier);
  if(!line) return;
  SAY_QUEUE.push({e:e, line:line, tier:tier});
  pumpSay();
}
/* `speaker` 与 `anchor` 分开：谢必安分化那一条是**谢必安**说的，可说出口的那一刻它已经被
   两只必安顶掉了 —— 锚在它身上必然落空。锚到先手那只必安（`splice` 之后它正占着原来那
   一格，位置逐像素对得上），话还是谢必安的。 */
function enemySayMid(speaker, anchor){
  const line=sayMidPick(speaker && speaker.key);
  if(!line) return;
  SAY_QUEUE.push({e:anchor||speaker, line:line, tier:'mid'});
  pumpSay();
}
/* 玩家任何一次点击 / 出牌立即收掉。**捕获相**：抢在卡牌自己的 pointerdown 之前 ——
   气泡正压在敌人头顶，而敌人就是拖拽落点，不能挡操作。
   常驻一个监听、不做配对：与 `animBindSkip` 同一条理由（配对在交叠时会互相摘掉对方）。 */
let _saySkipBound=false;
function bindSaySkip(){
  if(_saySkipBound) return;
  if(typeof window==='undefined' || !window.addEventListener) return;
  _saySkipBound=true;
  window.addEventListener('pointerdown', function(){ clearSay(); }, true);
}
function clearSay(){
  SAY_TOK++;                 // 作废在飞的收尾定时器（见 SAY_TOK 的注释）
  SAY_QUEUE.length=0;
  SAY_BUSY=false;
  const el=document.getElementById('enemy-say');
  if(el) el.remove();
}
/* 渲染侧。**第一句必须是无头早返回**（见本块开头）。 */
function pumpSay(){
  if(SAY_BUSY || !SAY_QUEUE.length) return;
  if(!animLive() || menuFxOff()){ SAY_QUEUE.length=0; return; }
  let it=null, eel=null;
  /* 用循环不用递归：递归看着更短，但栈深 = 被丢弃的条数，而且读的人得自己推「它一定会终止」。 */
  while(SAY_QUEUE.length){
    const head=SAY_QUEUE.shift();
    eel=enemyEl(head.e);
    if(eel){ it=head; break; }
    /* 锚点还没上屏 ⇒ **放回队首**，等下一次 `render()` 收尾那一拍再试。
       真会发生的窗口只有一个：谢必安分化出来的两只必安，从 `splice` 到下一次 render 之间。
       ⚠️ 但**已经不在 `G.enemies` 里的**就是真没了（被打死 / 被换下）⇒ 丢掉，
          否则堵在队首的那一条会把后面全卡住。 */
    if(G && G.enemies && G.enemies.indexOf(head.e)>=0){ SAY_QUEUE.unshift(head); return; }
  }
  if(!it) return;
  const old=document.getElementById('enemy-say'); if(old) old.remove();
  const el=document.createElement('div');
  el.id='enemy-say'; el.className='tier-'+it.tier;
  el.textContent=it.line;
  document.body.appendChild(el);
  /* 坐标照抄 `#drag-dmg`（`js/60_boot.js` 同一个约定）：锚在敌人立绘**头顶正中**。
     不新创坐标口径 —— 换皮之后立绘位置会变，两处用同一套取法才能一起对。 */
  const r=eel.getBoundingClientRect();
  el.style.left=(r.left+r.width/2)+'px';
  el.style.top=r.top+'px';
  void el.offsetWidth;   // 先把「未展开」态刷一帧，否则紧接着加 .on 不触发过渡
  el.classList.add('on');
  SAY_BUSY=true;
  const tok=++SAY_TOK;
  setTimeout(function(){
    if(tok!==SAY_TOK) return;
    el.classList.remove('on');
    setTimeout(function(){
      if(tok!==SAY_TOK) return;
      if(el.parentNode) el.remove();
      SAY_BUSY=false;
      pumpSay();
    }, 260);
  }, SAY_TIER_MS[it.tier] || 1800);
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

/* ===================== v0.72.0：卡牌飞行动画（抽 / 弃 / 洗 + 易物） =====================
   为什么长这样（四条都是踩过或算过的，不是审美）：

   1. **用 WAAPI（el.animate）而不是 CSS transition + setTimeout。**
      Animation 的 onfinish 是「收尾到终态」的**唯一**来源（skip 与自然播完走同一条路），
      而且**不创建任何定时器** —— 无头冒烟里有 9 处同步断言（8 处 finishEndTurn + 1 处
      drawCards）会**直接**读结算结果，漏一个 setTimeout 就意味着 node 进程退不出去。

   2. **动画必须等 render() 之后才开播。** drawCards 自己**不调 render()**（它的 11 个
      调用点里只有 1 处紧随 render），所以「手牌终位」在 drawCards 内部根本量不到。
      ⇒ 入口只负责 push() 载荷，真正的 play() 统一由 render() 尾部的 Anim.flush() 触发。

   3. **pending 是数组、只追加不覆盖。** G.lastDrawnCards 是整体覆盖的，连续两次
      drawCards 会把前一次吞掉；所以载荷里存的是 cards 引用，不是 lastDrawnCards。

   4. **飞的是克隆，挂 #anim-layer，绝不挂进 #hand**（理由见 原型.html 里 #anim-layer
      那段注释）。

   无头判据是 window.innerWidth（`animLive()`），**不是** rect 尺寸、也不是 offsetWidth：
     · 沙箱的 dummyEl().getBoundingClientRect() 恒返 **10×10（不是 0）** ⇒ rect 判据会把
       它误判成真实浏览器，于是真去排 rAF（沙箱里 requestAnimationFrame = setTimeout(cb,0)）
       ⇒ 定时器漏网、node 退不出。方向正好反了。
     · offsetWidth===0 在浏览器里对任何 display:none 元素也成立 ⇒ **假阳性**：真实浏览器
       被当成无头、动画整体失效。
     · innerWidth 是唯一「只在真实浏览器里存在且为正」的信号，也正是本文件 :307/:382 既有的
       无头兜底依据。 */
/* 正在「飞进来」的牌，按**对象身份**记，不是手牌下标。
   ⚠️ 必须按对象找：groupHand() 会在 render() 里重排 G.hand，「最后一张」随时会串位。
   声明在这一侧（视觉层）而不是 50_ui.js：生成 data-new 的是 handCardHTML，
   摘掉 opacity 的是 Anim 的收尾，分处两个文件 —— 放这儿谁都不用去依赖另一边。 */
const NEW_CARDS = new WeakSet();
/* v1.0.1（手机端重影）：**此刻真正在本层飞行**的牌 —— 开播时登记、settle 收尾时摘掉。
   handCardHTML 拿它决定「终态那张要不要隐身」。比「NEW_CARDS + 有 pending 批次」精确得多：
   只在飞行窗口内隐形，万一 NEW_CARDS 有残留（build 早退没来得及清）也不会把牌永久藏住。 */
const FLYING_CARDS = new WeakSet();
function animLive(){
  try{ return typeof window!=='undefined' && typeof window.innerWidth==='number' && window.innerWidth>0; }
  catch(e){ return false; }
}
function animLayer(){
  let el=document.getElementById('anim-layer');
  if(!el){ el=document.createElement('div'); el.id='anim-layer'; document.body.appendChild(el); }
  return el;
}
/* 克隆牌面的壳：外层 .fly-card 管**位移与缩放**，内层 .fly-inner 管**翻转**，两面一正一背。
   w/h 传**终点**尺寸 —— 起点尺寸由飞行自己的 scale 承担（FLIP）。
   为什么按终点建：牌面内部全是百分比/绝对定位，只有 132:200 这个比例才不拉歪；
   按终点尺寸建 ⇒ 克隆与手牌**逐像素同构**。 */
function flyCardHTML(frontHtml, w, h){
  return '<div class="fly-card" style="width:'+w+'px;height:'+h+'px">'
       +   '<div class="fly-inner">'
       +     '<div class="fly-face fly-front">'+frontHtml+'</div>'
       +     '<div class="fly-face fly-back"></div>'
       +   '</div>'
       + '</div>';
}
/* 静态牌面：与 handCardHTML 同构，但**去掉 --rot 与 onpointerdown**
   （克隆只做视觉，不该响应点击，也不该被手牌的扇形角度带歪）。
   cardBody 与 RCOLOR 都定义在后面的脚本里 —— 函数声明与全局作用域在**调用时**解析，
   这里只声明不调用，所以加载顺序无所谓。 */
function flyFaceHTML(c){
  if(!c || typeof cardBody!=='function') return '';
  const rc=(typeof RCOLOR!=='undefined' && RCOLOR) ? (RCOLOR[c.rarity]||'') : '';
  return '<div class="card has-frame '+rc+'">'+cardBody(c)+'</div>';
}
let _animSkipBound=false;
/* 跳过监听挂**冒泡相**，不挂捕获相 —— 捕获相会抢在卡牌自己的 cardPointerDown 之前
   把这一下吞掉，用户的拖拽当场就废了。冒泡相下点击照常生效，同时把在飞的动画收尾到终态。
   常驻一个监听即可（空闲时 skip() 是空操作）：不做 play / removeEventListener 配对，
   配对在多批动画交叠时会互相摘掉对方的监听。 */
function animBindSkip(){
  if(_animSkipBound) return;
  if(typeof window==='undefined' || !window.addEventListener) return;
  _animSkipBound=true;
  window.addEventListener('pointerdown', function(){ Anim.skip(); }, false);
}
/* 载荷形状：
   { key, dur, hide:[{el,card}], onDone, items:[ … ] }
   每个 item 二选一：
     · 飞牌：{ html, from:{cx,cy,w,h}, to:{cx,cy,w,h}, flip:'front'|'back', delay }
     · 光晕：{ pulse:{cx,cy,r}, delay }
   from/to 的 cx,cy 是**视口坐标的中心点**（不是左上角）—— 中心点对「两端尺寸不同」
   的飞行才是唯一无歧义的锚。 */
const Anim = {
  flights: [],        // 当前在飞的批次（可交叠：抽牌与弃牌能同时在飞）
  pending: [],        // 待 render() 后开播的载荷；只追加不覆盖
  busy(){ return this.flights.length>0; },
  /* 载荷入队。**必须在 render() 之前调用**（见文件头第 2 条）。无头下直接丢弃。 */
  push(payload){
    if(!payload || !animLive()) return;
    this.pending.push(payload);
  },
  /* render() 尾部调用：把攒下的载荷逐个**串行**开播。
     v0.74.0：从「全部同拍」改成「按队列顺序错开」。每个载荷可以声明 hold = 它要独占的
     时长，后续载荷整体延后这么多（base 是**累计**的，所以任意多段都能排成一条时间线）。
     为什么必须串行：洗牌那 2 条动画只有单边 2.5px（堆只有 55×76px），与 6 条整卡大小的
     抽牌克隆同拍时被完全吃掉 —— 拆开才看得见。见 ANIM_SHUFFLE_HOLD 那段。
     ⚠️ base 只加在**真正开播了**的载荷上：play() 在「没有 items」等情况下会早退，
     那时没有任何东西要看，不该白等 hold（否则洗牌没内容也照样卡 340ms）。 */
  flush(){
    if(!animLive() || !this.pending.length) return;
    const q=this.pending; this.pending=[];
    let base=0;
    for(let i=0;i<q.length;i++){ try{ base += this.play(q[i], base) || 0; }catch(e){} }
  },
  /* 收尾到终态。点屏幕任意位置触发（监听见 animBindSkip）。
     注意**不需要先 finish()**：克隆本来就要整个消失，「终态」= 真实 DOM（render 之后的
     手牌位 + 不透明的牌），所以直接 cancel + 摘克隆就是终态，且立刻生效。 */
  skip(){
    const fs=this.flights.slice();
    for(let i=0;i<fs.length;i++){ try{ fs[i].settle(); }catch(e){} }
  },
  /* 同名重播：先把上一遍收尾，不是叠加（沿用 playFx 的 fxStop(key) 惯例）。
     匿名批次（key 为空）不自动收尾 —— 抽牌与弃牌本来就该能同时在飞。 */
  stop(key){
    if(!key) return;
    const fs=this.flights.slice();
    for(let i=0;i<fs.length;i++){ if(fs[i].key===key) fs[i].settle(); }
  },
  /* base：本条载荷整体延后多少毫秒（由 flush 的串行游标给出）。
     返回值：本条载荷要独占的时长（p.hold），供 flush 累计。早退一律返回 0。 */
  play(p, base){
    if(!animLive()) return 0;
    if(!fx()) return 0;                     // 流畅模式：与震屏/抖动/飘字同档，一并关掉
    /* build()：载荷延迟构造。
       为什么必须有这一层：动画的终点是「render() **之后**的手牌位」，而 drawCards 自己
       不调 render()（见文件头第 2 条）⇒ 入队那一刻根本量不到终点。所以入口只 push 一个
       build 闭包，真正的 DOM 量测全部推到 flush()（= render 尾部）之后再发生 ——
       整个 render 因此只有**一次**读几何的时机，不会在中间插进第二个强制同步布局。 */
    if(p && typeof p.build==='function'){
      let b=null; try{ b=p.build(); }catch(e){ b=null; }
      if(!b) return 0;
      /* hold 要**跟着载荷走**（它由入口声明，build 只管 items/hide）—— 上面这个新建对象
         顺手把 hold 漏掉的话，洗牌那一拍就静默消失、退回同拍，而且没有任何闸会响。 */
      p={ key:p.key, dur:p.dur||b.dur, items:b.items, hide:b.hide, onDone:b.onDone,
          hold:p.hold };
    }
    const items=(p && p.items) || [];
    if(!items.length) return 0;
    if(p.key) this.stop(p.key);
    const layer=animLayer();
    const nodes=[], anims=[];
    const dur=Math.max(0, (p && p.dur) || 320);
    const off=Math.max(0, base || 0);
    for(let i=0;i<items.length;i++){
      /* 串行游标：本条载荷的每个 item 整体延后 off。
         ⚠️ 必须**浅拷贝**再改 delay，不能就地改 —— items 是调用方（build 闭包）刚造出来的，
         但同一份载荷在 skip 之后若被重播，就地改会让 delay 被累加两次。
         ⚠️ `it.el` / `it.pulse` 两种 item 都读 it.delay（见 _animItem），所以这里统一加，
         不要按类型分支。 */
      const src=items[i];
      const it=(off && src) ? _animShift(src, off) : src;
      try{ const nd=_animItem(layer, it, dur, anims); if(nd) nodes.push(nd); }catch(e){}
    }
    if(!anims.length) return 0;
    const hide=(p.hide||[]).slice();
    for(let i=0;i<hide.length;i++){ try{ hide[i].el.style.opacity='0'; if(hide[i].card) FLYING_CARDS.add(hide[i].card); }catch(e){} }
    const self=this;
    let left=anims.length, settled=false, guard=0;
    const settle=function(){
      if(settled) return; settled=true;
      if(guard){ try{ clearTimeout(guard); }catch(e){} guard=0; }
      /* cancel 而不是 finish：克隆马上要删，没有「停在末帧」的必要；
         cancel 触发的是 oncancel 不是 onfinish ⇒ 不会绕回 tick、不会递归。 */
      for(let i=0;i<anims.length;i++){ try{ anims[i].cancel(); }catch(e){} }
      for(let i=0;i<nodes.length;i++){ try{ if(nodes[i].parentNode) nodes[i].parentNode.removeChild(nodes[i]); }catch(e){} }
      let live=null;
      for(let i=0;i<hide.length;i++){
        /* keep:true（弃牌用）= **不还原**透明度。理由：弃掉的那张牌此刻已经不在 G.hand 里了，
           还原只会让它在手牌里「先飞走再弹回来」，一直亮到下一次 render 重写 innerHTML 才消失。
           它的手牌元素是**陈旧 DOM**（render 会整块覆盖），留着隐形正好。
           NEW_CARDS 的清理不能跟着一起跳过 —— 两件事本来就没关系。 */
        if(!hide[i].keep){ try{ hide[i].el.style.opacity=''; }catch(e){} }
        try{ if(hide[i].card){ NEW_CARDS.delete(hide[i].card); FLYING_CARDS.delete(hide[i].card); if(!hide[i].keep) (live||(live=[])).push(hide[i].card); } }catch(e){}
      }
      /* v1.0.1（手机端重影）：上面恢复的是**开播那一刻记下的元素**，而这一拍里 render() 很可能
         又跑过一次、把 #hand 整块重写 ⇒ 那个元素已经游离，真正在屏上的新元素还带着隐身
         （handCardHTML 会把「正在飞」的牌直接写成 opacity:0，见 50_ui.js）。
         按下标（#hand 的子节点顺序 = G.hand 顺序）找回**当前 DOM 里**那张牌并恢复。
         keep（弃牌）不进 live：那张牌已经不在 G.hand 里，找不到也不该找。 */
      if(live){
        try{
          const hand=document.getElementById('hand');
          if(hand && hand.children && typeof G!=='undefined' && G && G.hand){
            const n=Math.min(hand.children.length, G.hand.length);
            for(let i=0;i<n;i++){
              const c=G.hand[i], el=hand.children[i];
              if(c && el && el.style && live.indexOf(c)>=0) el.style.opacity='';
            }
          }
        }catch(e){}
      }
      for(let i=0;i<self.flights.length;i++){
        if(self.flights[i].settle===settle){ self.flights.splice(i,1); break; }
      }
      if(p && p.onDone){ try{ p.onDone(); }catch(e){} }
    };
    const tick=function(){ if(--left>0) return; settle(); };
    for(let i=0;i<anims.length;i++){ anims[i].onfinish=tick; }
    /* v1.0.1（手机端兜底）：onfinish 是收尾的唯一来源，但部分安卓 WebView（X5 / 系统 WebView）
       在 preserve-3d + backface-visibility 的组合下会漏发 finish 事件 —— 那样克隆会**永远停在
       手牌位上**：看起来就是「手牌区停着一张不动的牌」（重影），而每一拍都留下一个游离克隆，
       Anim.flights 也永不落地 ⇒ 越打越卡。这里按「本条载荷最晚结束时刻 + 200ms」兜一次，
       settle 幂等，真收到 onfinish 时它只是空跑。headless 下 play() 早在 animLive() 就返回，
       不会排任何定时器（冒烟看的「零定时器」约定不受影响）。 */
    let maxDelay=0;
    for(let i=0;i<items.length;i++){ const d=(items[i] && items[i].delay)||0; if(d>maxDelay) maxDelay=d; }
    try{ guard=setTimeout(function(){ try{ settle(); }catch(e){} }, dur+off+maxDelay+200); }catch(e){}
    animBindSkip();
    this.flights.push({ key:(p && p.key)||'', settle:settle });
    return (p && p.hold) || 0;
  }
};
/* 浅拷贝一个动画 item 并把它的 delay 整体后移 off。只为串行游标服务，不改调用方的对象。 */
function _animShift(it, off){
  const c={};
  for(const k in it){ if(Object.prototype.hasOwnProperty.call(it,k)) c[k]=it[k]; }
  c.delay=((it && it.delay) || 0) + off;
  return c;
}
/* 光晕的两档色：金（洗牌）/ 朱砂（易物亮相）。
   写死成常量而不是让调用方塞整段 gradient —— 载荷里只留 tone 这个名字，配色改动集中在此处。 */
const PULSE_GOLD='radial-gradient(circle at center, rgba(224,179,65,0) 34%, rgba(224,179,65,.42) 62%, rgba(224,179,65,0) 80%)';
const PULSE_CINNABAR='radial-gradient(circle at center, rgba(196,54,38,0) 30%, rgba(214,64,44,.5) 60%, rgba(196,54,38,0) 82%)';
/* 建一个飞行单元并起播，把 Animation 收进 anims。
   返回**要挂上层的节点**；返回 null 表示这条 item 不产生新节点（`el` 震动那条直接
   驱动既有元素本身，settle 时**绝不能**把它从 DOM 里摘掉）。 */
function _animItem(layer, it, dur, anims){
  const delay=(it && it.delay) || 0;
  if(it && it.el){
    /* 洗牌的「两堆震动」：直接驱动既有的堆元素。
       ⚠️ `.pile` 是 `.hand-area` 的**子元素**，给它挂 transform 只会让**它自己**成为
       其 fixed 后代的包含块 —— `#fx-layer` 挂在 body 上，坐标系不受影响（红线管的是
       `.hand-area` / `#hand` **自身**的规则体，这里既不是规则体、也不在那两个元素上）。
       fill:'none' ⇒ 播完自动回到无 transform，不留下任何痕迹。 */
    anims.push(it.el.animate(
      [ {transform:'scale(1)'},
        {transform:'scale(1.09)', offset:.32},
        {transform:'scale(1)'} ],
      {duration:Math.max(80, dur*0.55), delay:delay, easing:'ease-out', fill:'none'}));
    return null;
  }
  if(it && it.pulse){
    /* 光晕：同 inkBurst 的径向渐变，但走 WAAPI（不留定时器）。
       tone 默认 'gold'（洗牌的两堆震动），'cinnabar' = 朱砂（易物亮相那一圈）。 */
    const d=document.createElement('div');
    d.className='fx-pulse';
    const R=Math.max(40, it.pulse.r||120);
    d.style.left=(it.pulse.cx-R)+'px'; d.style.top=(it.pulse.cy-R)+'px';
    d.style.width=(R*2)+'px'; d.style.height=(R*2)+'px';
    d.style.background=(it.pulse.tone==='cinnabar')?PULSE_CINNABAR:PULSE_GOLD;
    anims.push(d.animate(
      [ {opacity:0, transform:'scale(.45)'},
        {opacity:1, transform:'scale(1)', offset:.42},
        {opacity:0, transform:'scale(1.32)'} ],
      {duration:dur, delay:delay, easing:'ease-out', fill:'both'}));
    layer.appendChild(d);
    return d;
  }
  const from=it.from||{}, to=it.to||{};
  /* ⚠️ 尺寸**不要取整**（只压到两位小数）。窄档 5 张牌时 #hand 装不下，`.card` 作为
     flex 项会被 flex-shrink 压成**小数宽**（实测 960×540 是 103.5px），而 offsetWidth
     把使用值四舍五入成整数 ⇒ 克隆按整数建，内部百分比定位的 .cart-wrap / .cplate
     会整整差 1px（`_patch/_drvfly.js` 第一次跑就是这么抓出来的）。
     调用方给尺寸时同理：请给 getComputedStyle().width/height，不要给 offsetWidth。 */
  const tw=Math.max(1, Math.round((to.w||from.w||132)*100)/100);
  const th=Math.max(1, Math.round((to.h||from.h||200)*100)/100);
  const wrap=document.createElement('div');
  wrap.innerHTML=flyCardHTML(it.html||'', tw, th);
  const node=wrap.firstChild, inner=node.firstChild;
  const cx0=(from.cx===undefined? to.cx : from.cx), cy0=(from.cy===undefined? to.cy : from.cy);
  const cx1=(to.cx===undefined? from.cx : to.cx), cy1=(to.cy===undefined? from.cy : to.cy);
  /* .fly-card 的原点在左上角（left:0/top:0），transform-origin 是 50% 50%
     ⇒ 未变换时的中心在 (tw/2, th/2)，translate 直接就是「中心要去的左上角坐标」。 */
  const s0=Math.max(.02, (from.w||tw)/tw);
  const tx0=cx0-tw/2, ty0=cy0-th/2, tx1=cx1-tw/2, ty1=cy1-th/2;
  const t0='translate('+tx0+'px,'+ty0+'px) scale('+s0+')';
  const t1='translate('+tx1+'px,'+ty1+'px) scale(1)';
  /* it.fade：『打出易物 · 亮相』要的那个**收**势 —— 飞抵中点（放大已经由 s0→1 承担）→
     停住 → 微涨 → 缩小淡出。不加 fade 时**逐字**保持原来的两帧，抽/弃/洗的观感因此不变。 */
  const kfs = it.fade
    ? [ {transform:t0, opacity:1},
        {transform:t1, opacity:1, offset:.46},
        {transform:'translate('+tx1+'px,'+ty1+'px) scale(1.06)', opacity:1, offset:.7},
        {transform:'translate('+tx1+'px,'+ty1+'px) scale(.86)', opacity:0} ]
    : [ {transform:t0}, {transform:t1} ];
  anims.push(node.animate(kfs,
    {duration:dur, delay:delay, easing:'cubic-bezier(.22,.61,.36,1)', fill:'both'}));
  if(it.flip){
    /* 翻转走 .fly-inner —— 与位移分属两个元素，两条 WAAPI 互不覆盖。
       'back'  = 牌面起、翻背落（弃出 / 换出）；其余 = 露牌背起、翻正落（抽入 / 换入）。 */
    const a=(it.flip==='back') ? 0 : 180, b=(it.flip==='back') ? 180 : 0;
    anims.push(inner.animate(
      [ {transform:'rotateY('+a+'deg)'}, {transform:'rotateY('+b+'deg)'} ],
      {duration:dur, delay:delay, easing:'ease-in-out', fill:'both'}));
  }
  layer.appendChild(node);
  return node;
}

/* ===================== 接入点的载荷构造器 =====================
   一律「入口 push 一个 build 闭包」：入口那一刻 DOM 还是旧的（render 还没跑），
   真正量终点要等 render 之后（见 Anim.play 里 build 的注释）。
   ⚠️ 两个例外，都是「源位只在**这一拍**量得到」的场合，故直接 play 而不是 push：
     · 弃牌：源是**即将消失**的手位（finishEndTurn 之后整段没有 render），
       详见 animDiscardQueued；
     · 易物亮相：源是**刚被打出**的那张牌的手位（doPlayCard 先 splice 再调 eff），
       详见 animExchangeCast。
   五个时长集中在这儿，改节奏只改这一处。 */
const ANIM_DUR = { draw: 340, discard: 300, shuffle: 520, exchange: 300, cast: 520 };
/* v0.74.0：洗牌**独占**的一拍。实测（2026-09-29）洗牌那 2 条动画一直看得见地"没发生"，
   根因是它和抽牌克隆**同拍**：牌堆真实盒子 55×76px，scale 1.09 ⇒ 单边只长 2.5px，
   而同一刻有 6 条**整张牌大小**的克隆从同一个堆上飞出去，2.5px 被完全吃掉。
   ⇒ 拆成两拍：洗牌先占满 ANIM_DUR.shuffleHold，抽牌克隆延后这么多再起飞。
   ⚠️ 单独一个常量、**不复用 ANIM_DUR.shuffle**：那个 520 还兼着「震动时长 = dur×0.55
   = 286ms」和「金晕时长」两个职责（见 _animItem）。若把载荷的 dur 改成 340，
   震动会掉到 187ms —— 更短更弱，方向正好反了。所以 dur 保持 520（震动 286ms、金晕 520ms），
   只在载荷上另挂一个 hold=340 当「下一拍从什么时候开始」；金晕的尾巴(340→520)
   正好与克隆起飞重叠，观感是「光晕还没散、牌已经在飞」，不是硬切。 */
const ANIM_SHUFFLE_HOLD = 340;

/* 取一个元素「不带旋转」的盒子。
   · 中心：用 getBoundingClientRect 的中心。**矩形绕任意点旋转后，它的 AABB 中心恰好
     等于旋转后的形心**（矩形关于自身中心是中心对称的，旋转保这个对称性，而中心对称凸集的
     AABB 必然以对称中心为中心）⇒ 扇形手牌那种 `transform-origin:bottom center` 的旋转卡，
     bbox 中心**就是**它的视觉中心，可以直接当锚点，不用去反解 matrix。
   · 尺寸：必须走 getComputedStyle 的**使用值**，不能用 offsetWidth —— 窄档里手牌被
     flex-shrink 压成小数宽（960×540 实测 103.5px），offsetWidth 会四舍五入成整数，
     克隆按整数建会让牌面内部的百分比定位整整差 1px（详见 _animItem 里的注释）。
     `display:none` 时 computed width 是 "auto" ⇒ NaN ⇒ 回落成 bbox 尺寸。 */
function animRect(el){
  if(!el || typeof el.getBoundingClientRect!=='function') return null;
  let r=null;
  try{ r=el.getBoundingClientRect(); }catch(e){ return null; }
  if(!r) return null;
  let w=NaN, h=NaN;
  try{
    const c=window.getComputedStyle(el);
    w=parseFloat(c.width); h=parseFloat(c.height);
  }catch(e){}
  return { cx:r.left+r.width/2, cy:r.top+r.height/2,
           w:(isFinite(w)&&w>0)? w : r.width,
           h:(isFinite(h)&&h>0)? h : r.height };
}
/* 这**几张牌**此刻落在手牌里的哪些元素上。
   判据是「成员资格」而不是 data-new：data-new 只说明「是本次新抽的」，而 G.hand 里可能
   同时躺着上一次抽进来、动画还没播完的牌。DOM 顺序 = G.hand 顺序
   （render 里 `hand.innerHTML = G.hand.map(handCardHTML)`），所以按下标对齐。
   ⚠️ 手牌为空时那个位置是一个占位 div（「（无手牌）」）⇒ 数量对不上就整体放弃，
   宁可不动画也不要把克隆飞到占位符上。
   ⚠️ **调用时机决定含义**，两处用法正好相反：
     · 抽牌：在 build() 里调（= render 之后）⇒ 拿到的是**新落位**的手牌元素；
     · 弃牌：在入队那一刻调（= render 之前）⇒ 拿到的是**即将消失**的旧手牌元素。 */
function animHandEls(cards){
  const hand=document.getElementById('hand');
  if(!hand || !cards || !cards.length) return [];
  if(typeof G==='undefined' || !G || !G.hand) return [];
  if(hand.children.length !== G.hand.length) return [];
  const want=new Set(cards), out=[];
  for(let i=0;i<G.hand.length;i++){
    if(!want.has(G.hand[i])) continue;
    const el=hand.children[i];
    if(el) out.push({ el:el, card:G.hand[i] });
  }
  return out;
}
/* 抽牌：卡背在抽牌堆**翻正**，飞向各自的手位，依次错开 45ms 起手。
   调用点：drawCards 里 `G.lastDrawnCards=objs` 之后（**必须在那里** —— objs 就是本次抽到的牌，
   粒度天然正确；等到了 render 就没法把「本次抽的」和「本来就有的」分开了）。 */
function animDrawQueued(cards){
  if(!animLive() || !fx()) return;          // 无头下**连 NEW_CARDS 都不写** ⇒ handCardHTML 输出逐字节不变
  if(!cards || !cards.length) return;
  for(let i=0;i<cards.length;i++) NEW_CARDS.add(cards[i]);
  Anim.push({ dur:ANIM_DUR.draw, build:function(){
    const els=animHandEls(cards);
    if(!els.length) return null;
    const from=animRect(document.querySelector('#pile-draw .pile-face'));
    const items=[], hide=[];
    for(let i=0;i<els.length;i++){
      const to=animRect(els[i].el);
      if(!to) continue;
      hide.push(els[i]);
      items.push({ html:flyFaceHTML(els[i].card), flip:'front',
                   from: from || { cx:to.cx, cy:to.cy, w:to.w, h:to.h }, to:to,
                   delay: i*45 });
    }
    return { items:items, hide:hide, dur:ANIM_DUR.draw };
  }});
}
/* 洗牌：两堆各震一下 + 一圈金晕，张数徽章在同一拍归并。
   调用点：drawCards 里 `log('弃牌堆洗回抽牌堆')` **之后**（日志顺序零变化）。
   它在 for 循环里、drawCards(12) 会触发多次 ⇒ 用 key 去重：同名重播是**收尾重来**，不是叠加。

   v0.74.0：这个载荷声明 `hold`（见 Anim.flush），让**同一次抽牌**的飞牌克隆整体延后
   ANIM_SHUFFLE_HOLD 再起飞。原先两者同拍，而洗牌只有单边 2.5px（堆 55×76px），
   被 6 条整卡大小的克隆盖得一点都看不见。dur 保持 520 不动（震动 286ms + 金晕 520ms）；
   hold 只决定「下一拍何时开始」，金晕尾巴与克隆起飞重叠是有意为之。 */
function animShuffleQueued(){
  if(!animLive() || !fx()) return;
  Anim.push({ key:'shuffle', dur:ANIM_DUR.shuffle, hold:ANIM_SHUFFLE_HOLD, build:function(){
    const items=[];
    ['pile-draw','pile-discard'].forEach(function(id,i){
      const el=document.getElementById(id);
      const r=animRect(el);
      if(!r) return;
      items.push({ el:el, delay:i*40 });
      items.push({ pulse:{ cx:r.cx, cy:r.cy, r:Math.max(r.w,r.h)*0.95 }, delay:i*40 });
    });
    if(!items.length) return null;
    return { items:items, hide:[], dur:ANIM_DUR.shuffle };
  }});
}
/* 弃牌：从各自的手位**翻背**飞向弃牌堆，依次错开 45ms。
   调用点：finishEndTurn 里 `refreshPileCounts()` 之后（与徽章 +1 同一拍）。

   ⚠️ 它与 animDrawQueued 的唯一结构差别是**什么时候量、由谁量**：
     · 抽牌：源在**牌堆**（永远在 DOM 里）⇒ 入队时只记牌，终点等 render 之后在 build() 里量；
     · 弃牌：源在**手位**，而 finishEndTurn 接下来是 triggerSummons → enemyAct，**全程没有
       render()**（#hand 要到下一次 startTurn 才重排）⇒ 源矩形只能在**此刻**同步量下来；
       终点在**牌堆**，随时量得到 ⇒ 两个端点都齐了，**根本不需要等 render**，
       于是这里直接 play()，不走 pending。
   顺带把「同一拍」这件事做对：徽章在 refreshPileCounts() 就 +1 了。若改成 push 等下一次
   render 才播，画面上会变成「徽章先 +1、敌人打完一轮之后牌才飞走」，而且那时量到的手位
   已经是被重排过的新版面 —— 飞机会从一个那些牌**从来不曾待过**的位置起飞。

   这里多付一次强制同步布局（量手位 + 量弃牌堆面）。它落在 refreshPileCounts 之后、
   enemyAct 的 playFx 之前，是这一段里唯一的读点 ⇒ 仍然「读一遍 → 写一遍」。 */
function animDiscardQueued(cards){
  if(!animLive() || !fx()) return;
  if(!cards || !cards.length) return;
  const els=animHandEls(cards);                 // ← 此刻 = 弃牌前的手牌 DOM
  if(!els.length) return;
  const items=[], hide=[];
  const to=animRect(document.querySelector('#pile-discard .pile-face'));
  for(let i=0;i<els.length;i++){
    const from=animRect(els[i].el);
    if(!from || !to) continue;
    /* hide 带 keep：弃掉的牌现在就从手里「消失」，**且收尾不还原** —— 它的手牌元素是陈旧 DOM
       （下一次 render 会整块覆盖），还原只会让它先飞走再弹回来。理由详见 settle 里那段注释。 */
    hide.push({ el:els[i].el, card:els[i].card, keep:true });
    items.push({ html:flyFaceHTML(els[i].card), flip:'back', from:from, to:to, delay:i*45 });
  }
  if(!items.length) return;
  Anim.play({ dur:ANIM_DUR.discard, items:items, hide:hide });
}
/* 手牌里**下标 i** 的那个元素。
   与 animHandEls 的分工：那个按**对象身份**在 G.hand 里找（要求 #hand 与 G.hand 同步），
   这个按下标直接取 —— 因为「刚打出的那一张」恰恰处在**不同步**的一拍：
   doPlayCard 先 `G.hand.splice(i,1)` 才调 eff（30_engine.js:1049 → :1073），
   而 render() 远在那之后 ⇒ #hand 还是打出之前的旧 DOM，下标 i 正是那张牌本身。
   越界 / 那个位置是「（无手牌）」占位符时返回 null，调用方自行回落。 */
function animHandElAt(i){
  const hand=document.getElementById('hand');
  /* 三道守卫都必要：无头沙箱里 getElementById 会返回一个**桩元素**（没有 children、
     也没有 classList），少任何一道都会在冒烟里当场抛异常 —— 而这条路径（pickExchangeNew）
     正是冒烟会走的。 */
  if(!hand || !hand.children || !(i>=0)) return null;
  const el=hand.children[i];
  if(!el || !el.classList || !el.classList.contains('card')) return null;
  return el;
}
/* ===================== 易物（两段） =====================
   用户拍板「两个都做」：
     ① 打出易物时牌体在**战场中央**亮相：飞过去（放大由飞行本身承担）→ 朱砂光晕 → 收；
     ② 成交瞬间「一出一进」交错：换出的牌翻背飞向弃牌堆、换入的牌翻正飞回手位。
   入口分别在 20_data.js 的 eff（①）与 30_engine.js 的 pickExchangeNew（②）。 */

/* ① 亮相。**直接 play 而不是 push**，理由与弃牌同源：源是「刚被打出的那张牌的手位」，
   而 doPlayCard 早在调 eff 之前就把它 splice 出手牌了（#hand 里只留下陈旧 DOM）——
   这个源位**过了这一拍就再也量不到**，所以不能等 render。
   终点取 .battle 的中心（战场中央），尺寸 ×1.35 ⇒ 放大由 from→to 的尺寸差直接承担。
   为什么这个克隆必须看得见：#overlay(z-index 10) 会被 startExchangeSelect → showOverlay
   紧接着盖上来，本层取 z-index 12 正是为了压过它（见原型.html 里 #anim-layer 的注释）。 */
function animExchangeCast(c,i){
  if(!animLive() || !fx()) return;
  if(!c) return;
  const from=animRect(animHandElAt(i) || document.getElementById('hand'));
  const bat=animRect(document.querySelector('.battle'));
  if(!from || !bat) return;
  const to={ cx:bat.cx, cy:bat.cy, w:from.w*1.35, h:from.h*1.35 };
  Anim.play({ dur:ANIM_DUR.cast, items:[
    { html:flyFaceHTML(c), from:from, to:to, fade:true, delay:0 },
    { pulse:{ cx:bat.cx, cy:bat.cy, r:Math.max(from.w,from.h)*0.95, tone:'cinnabar' }, delay:90 }
  ]});
}
/* ② 成交交错。入队等 render（终点=换入那张牌**落位**之后的手位，只能 render 之后量）。
   · oldSlot：换出那张牌**成交前**的手位（调用方在 splice 之前量好传进来）；
   · cNew：换入的牌（30_engine.js 里那个副本对象，与 G.hand 里躺的是同一个引用）。
   两条飞行的 delay 差 90ms 才是「交错」——同拍出发就只是「换了一下」。
   ⚠️ 换入那张牌必须**先隐形**：本函数在 render **之前**被调，所以在这里就往 NEW_CARDS
     里登记，render 时 handCardHTML 才会给它 data-new，build()（= render 尾部）才按身份
     找得到它的落位。找不到（比如 times>0 那条分支根本不 render）就把登记撤掉，
     免得留一个永远不被消费的标记。 */
function animExchangeQueued(old,cNew,oldSlot){
  if(!animLive() || !fx()) return;
  if(!old || !cNew || !oldSlot) return;
  NEW_CARDS.add(cNew);
  Anim.push({ dur:ANIM_DUR.exchange, build:function(){
    const dest=animHandEls([cNew]);
    const items=[], hide=[];
    const pile=animRect(document.querySelector('#pile-discard .pile-face'));
    /* 换出的是**消耗掉**的杂物牌时不飞 —— 它没有进弃牌堆（30_engine.js 里那句
       `if(old.type!=='junk')`），画一条飞向弃牌堆的轨迹是撒谎。 */
    if(pile && old.type!=='junk')
      items.push({ html:flyFaceHTML(old), flip:'back', from:oldSlot, to:pile, delay:0 });
    const to=dest.length ? animRect(dest[0].el) : oldSlot;
    if(!to) return null;
    items.push({ html:flyFaceHTML(cNew), flip:'front',
                 from:(pile || oldSlot), to:to, delay:90 });
    if(dest.length) hide.push({ el:dest[0].el, card:cNew });
    else NEW_CARDS.delete(cNew);                // 没有落位可用 ⇒ 撤登记（见文件头注释）
    return { items:items, hide:hide, dur:ANIM_DUR.exchange };
  }});
}

