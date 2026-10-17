/* ============================================================================
 * 志怪塔 · 00_base：工具、飘字、战斗特效、出卡动效、过场
 * ============================================================================ */

/* 存档写不进去（隐私模式/配额满）时只提示一次，且只提示本局档那三个键 */
let _storeWarned=false;
function _storeIsRunKey(k){
  try{ return typeof RUN_SLOTS!=='undefined' && RUN_SLOTS.indexOf(k)>=0; }catch(e){ return false; }
}
/* 本机存档按 TapTap 账号隔离：ACC_NS 是账号前缀，由 55_cloud 解析出账号标识后写入。
   浏览器 / 未接入环境恒为空串，键名与从前一模一样，行为不变 */
let ACC_NS='';
function storeKey(k){ return ACC_NS ? (ACC_NS+k) : k; }

const Store = {
  get(k){ try{ return localStorage.getItem(storeKey(k)); }catch(e){ return null; } },
  set(k,v){
    try{ localStorage.setItem(storeKey(k),v); return true; }
    catch(e){
      if(!_storeWarned && _storeIsRunKey(k)){
        _storeWarned=true;
        try{ floatMsg('⚠ 存档失败：浏览器存储不可用，本局进度不会保存'); }catch(e2){}
      }
      return false;
    }
  },
  del(k){ try{ localStorage.removeItem(storeKey(k)); }catch(e){} },
  getJSON(k){ const r=Store.get(k); if(r==null) return null; try{ return JSON.parse(r); }catch(e){ return null; } },
  setJSON(k,o){ return Store.set(k, JSON.stringify(o)); }
};

/* 随机可播种，种子随存档落盘，能复现报障；地址加 ?seed=数字 复现某一局 */
let _rngSeed = 1, _rngCalls = 0;
function seedRng(seed){ _rngSeed=(seed>>>0)||1; _rngCalls=0; }
function rngSeedNow(){
  const q=(typeof location!=='undefined' && location.search)? /[?&]seed=(\d+)/.exec(location.search) : null;
  if(q) return (+q[1])>>>0;
  return (Date.now() ^ Math.floor(Math.random()*0x100000000))>>>0;
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
  seedRng(rngSeedNow()); return false;
}

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

function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=rngInt(i+1); [a[i],a[j]]=[a[j],a[i]]; } return a; }
/* LOG_SEQ：本局累计写过多少行日志，只增不减。战报增量渲染靠它（G.log 满了以后长度分不出增减） */
let LOG_SEQ=0;
function log(msg){ if(!G) return; G.log.push(msg); if(G.log.length>800) G.log.shift(); LOG_SEQ++; }

function floatMsg(msg){
  const el=document.getElementById('float-msg');
  if(!el) return;
  const item=document.createElement('div');
  item.className='fm'; item.textContent=msg;
  el.appendChild(item);
  while(el.children && el.children.length>3) el.removeChild(el.children[0]);
  setTimeout(()=>{ if(item.parentNode && item.parentNode.removeChild) item.parentNode.removeChild(item); }, 1700);
}


let HITFX = { enemies: new Set() };
/* 数字素材分四档各10张，颜色必须烤进图里（CSS 管不了 <img>）；NUM_STATE：0未测 1可用 -1不可用 */
const NUM_KIND_DIR = { '': 'dmg', 'to-player': 'hurt', 'block': 'block', 'heal': 'heal' };
let NUM_IMG = {}, NUM_STATE = {};
function numKind(kind){ return NUM_KIND_DIR[kind] || 'dmg'; }
function numProbe(kind){
  const k = numKind(kind);
  if(NUM_STATE[k]) return NUM_STATE[k]===1;
  if(typeof Image==='undefined' || typeof assetURL!=='function'){ NUM_STATE[k]=-1; return false; }
  NUM_STATE[k]=-1; // 先假定不可用，加载完再翻成1
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
function numPrewarm(){ ['', 'to-player', 'block', 'heal'].forEach(function(k){ try{ numProbe(k); }catch(e){} }); }
let PLAYER_HP_PREV = null;
let ENEMY_HP_PREV = {};
function fxLayer(){
  let el=document.getElementById('fx-layer');
  if(!el){ el=document.createElement('div'); el.id='fx-layer'; document.body.appendChild(el); }
  return el;
}
function enemyEl(e){ return (e && document.querySelector) ? document.querySelector('#enemy-panel .enemy[data-uid="'+e.uid+'"]') : null; }

let FX_LIVE = {};
/* 精灵图并发上限 14，超了淘汰最老的（召唤物多的时候会卡） */
const FX_MAX_LIVE = 14;
function fxMaxLive(){ return (typeof SETTINGS!=='undefined' && SETTINGS && SETTINGS.lowSpec) ? 8 : FX_MAX_LIVE; }
function fxEvictOldest(){
  const k=Object.keys(FX_LIVE);
  if(k.length < fxMaxLive()) return;
  let old=null;
  for(let i=0;i<k.length;i++){
    const st=FX_LIVE[k[i]];
    if(!st || st.dead) continue;
    if(!old || st.t0 < old.t0) old=st;
  }
  if(old) fxStop(old.key);
}
function fxSheet(name){
  return (typeof FX_SHEETS!=='undefined' && FX_SHEETS) ? (FX_SHEETS[name] || null) : null;
}
/* FX_ROW_KEYS：拆包时打包.py 注入的按排清单；判据要同步，异步会先白解整图 */
var FX_ROW_KEYS = null;
function fxRowKeyed(name){
  if(typeof ASSET_MAP!=='undefined' && ASSET_MAP && ASSET_MAP['fx/'+name+'_r0.png']) return true;
  return !!(typeof FX_ROW_KEYS!=='undefined' && FX_ROW_KEYS && FX_ROW_KEYS[name]);
}
/* 盒子边长=锚点短边×1.15，夹在 96 和 min(vw,vh)×0.9 之间 */
function fxBoxSize(anchorShort, vw, vh){
  let s=(anchorShort||0)*1.15;
  const cap=Math.min(vw||0, vh||0)*0.9;
  if(!(s>96)) s=96;
  if(cap>0 && s>cap) s=cap;
  return Math.round(s);
}
/* 第 i 帧左上角偏移；ch=单帧高宽比，非方形格（如 lightning）必须传，不然第2格起错位 */
function fxCellPos(i, cols, box, ch){
  const c=Math.max(1, cols||8), h=box*(ch||1);
  return { x:-(i%c)*box, y:-Math.floor(i/c)*h };
}
/* 用 transform 而非 background-position（后者不是合成属性）；数值与 fxCellPos 同号同值 */
function fxCellTf(p){ return 'translate('+p.x+'px,'+p.y+'px)'; }
function fxAliasSel(anchor){
  return anchor==='player' ? '#player-panel .hero-art-box'
       : anchor==='field'  ? '#enemy-panel'
       : anchor==='enemy'  ? '#enemy-panel'
       : anchor==='summon' ? '#player-panel .hero-art-box' : null;
}
function fxAnchorRect(anchor){
  if(anchor && anchor.getBoundingClientRect){
    const r=anchor.getBoundingClientRect();
    if(r && r.width>0 && r.height>0) return r;
  }
  const sel=fxAliasSel(anchor);
  if(sel){
    const el=document.querySelector(sel);
    if(el && el.getBoundingClientRect){
      const r=el.getBoundingClientRect();
      if(r && r.width>0 && r.height>0) return r;
    }
  }
  return { left:window.innerWidth*0.5, top:window.innerHeight*0.42, width:0, height:0 };
}
function bottomAnchor(el){
  if(!el || typeof el.getBoundingClientRect!=='function') return null;
  return { getBoundingClientRect:function(){
    const p=(el.querySelector && el.querySelector('.eportrait')) || el;
    const r=p.getBoundingClientRect();
    return { left:r.left, top:(r.bottom - r.height/2), width:r.width, height:r.height };
  } };
}
function playerBottomAnchor(){
  const p=document.getElementById('player-panel');
  const a=(p && p.querySelector) ? (p.querySelector('.hero-art-box') || p) : p;
  return a ? bottomAnchor(a) : null;
}
/* 重锚：面板会上下动、特效跟不上；锚点改存描述符（不存元素引用，render 会重写 innerHTML），render 尾部重锚一次 */
let NUM_LIVE = [];
function fxAnchorSpec(anchor){
  if(typeof anchor==='string') return { kind:'alias', v:anchor };
  if(anchor && anchor.getBoundingClientRect){
    const uid=(anchor.dataset && anchor.dataset.uid) ? anchor.dataset.uid : null;
    if(uid) return { kind:'uid', v:uid };
    if(anchor.id==='player-panel' || anchor.id==='enemy-panel') return { kind:'sel', v:'#'+anchor.id };
    if(anchor.classList && anchor.classList.contains && anchor.classList.contains('hero-art-box') &&
       (typeof anchor.closest!=='function' || anchor.closest('#player-panel'))) return { kind:'sel', v:'#player-panel .hero-art-box' };
    if(anchor.classList && anchor.classList.contains && anchor.classList.contains('hpbar') &&
       (typeof anchor.closest!=='function' || anchor.closest('#player-panel'))) return { kind:'sel', v:'#player-panel .hpbar' };
    return { kind:'el', v:anchor };
  }
  return { kind:'none', v:null };
}
/* 解不到一律 null（冻结），别回落屏幕中心，播到一半跳屏更难看 */
function fxResolveAnchor(spec){
  if(!spec) return null;
  let el=null;
  if(spec.kind==='alias'){ const sel=fxAliasSel(spec.v); if(!sel) return null; el=document.querySelector(sel); }
  else if(spec.kind==='uid') el=document.querySelector('#enemy-panel .enemy[data-uid="'+spec.v+'"]');
  else if(spec.kind==='sel') el=document.querySelector(spec.v);
  else if(spec.kind==='el'){ if(spec.v && spec.v.isConnected===false) return null; el=spec.v; }
  else return null;
  if(!el || !el.getBoundingClientRect) return null;
  const r=el.getBoundingClientRect();
  return (r && r.width>0 && r.height>0) ? r : null;
}
/* 算新坐标；返回 null=不用写（NaN 或没变）。floatDamage 的 0.4、defenseFx 的 0.45 是历史值，别改 */
function fxSpot(st, r){
  const l=Math.round(r.left + r.width*st.ax - st.bx);
  const t=Math.round(r.top  + r.height*st.ay - st.by);
  if(!isFinite(l) || !isFinite(t)) return null;
  if(l===st.lx && t===st.ly) return null;
  return { l:l, t:t };
}
/* 重锚全部活体：先读完所有 rect 再写 style，只付一次强制布局 */
function fxReanchor(){
  const jobs=[];
  const k=Object.keys(FX_LIVE);
  for(let i=0;i<k.length;i++){ const st=FX_LIVE[k[i]]; if(st && !st.dead && st.spec) jobs.push(st); }
  for(let i=0;i<NUM_LIVE.length;i++){ const st=NUM_LIVE[i]; if(st && st.spec) jobs.push(st); }
  if(!jobs.length) return;
  for(let i=0;i<jobs.length;i++){
    const st=jobs[i], r=fxResolveAnchor(st.spec);
    st.pend = r ? fxSpot(st, r) : null;
  }
  for(let i=0;i<jobs.length;i++){
    const st=jobs[i], p=st.pend; st.pend=null;
    if(!p) continue;
    st.lx=p.l; st.ly=p.t;
    st.el.style.left=p.l+'px'; st.el.style.top=p.t+'px';
  }
}
function fxUntrack(st){ const i=NUM_LIVE.indexOf(st); if(i>=0) NUM_LIVE.splice(i,1); }
/* resize 也重锚；window.addEventListener 得守卫，沙箱没顶层 addEventListener，裸写加载期就崩 */
if(typeof window!=='undefined' && window.addEventListener){
  window.addEventListener('resize', function(){ fxReanchor(); });
}
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
function playFx(name, anchor, opts){
  if(!fx()) return null;
  const S=fxSheet(name); if(!S) return null;
  opts=opts||{};
  const key=opts.key||name;
  const r=fxAnchorRect(anchor);
  const cap=Math.round(Math.min(window.innerWidth||0, window.innerHeight||0)*0.9);
  let box=Math.round(fxBoxSize(Math.min(r.width||0, r.height||0), window.innerWidth, window.innerHeight)
                     * (opts.scale||S.scale||1));
  if(cap>0 && box>cap) box=cap;
  const ch=S.ch||1;
  fxStop(key);                                // 同名正在播就重播，不叠加
  fxEvictOldest();                            // 超上限先淘汰最老的
  const el=document.createElement('div');
  el.className='fx-sheet';
  el.style.width=box+'px'; el.style.height=(box*ch)+'px';
  if(S.op!=null && S.op<1) el.style.opacity=String(S.op);
/* mirror：翻要在外层，内层管切格 translate，翻内层会把格序也翻反 */
  if(opts.mirror) el.style.transform='scaleX(-1)';
/* ox/oy 是内容框中心相对格子中心的偏移比例（fx_tune.py 扫 alpha 算的）；不补的话烟这类会沉到单位脚底下 */
  const ox=(S.ox||0)*box, oy=(S.oy||0)*box*ch;
  const lft=Math.round(r.left+r.width/2-box/2-ox);
  const tp =Math.round(r.top+r.height/2-box*ch/2-oy);
  if(isFinite(lft)) el.style.left=lft+'px';
  if(isFinite(tp))  el.style.top =tp+'px';
  const c0=Math.max(1, S.c||8);
  const rows=S.rows || (Math.floor(((S.i0||0)+Math.max(1,S.f||1)-1)/c0)+1);
  /* 按排拆图：整图一次要解上百 MB、手机缓存留不住，每次出牌都重解（尖峰 100~200ms）；按排只解 1/rows。
     判据必须同步，异步探 _r0 会让首播先白解一遍整图。 */
  const stripRel=function(r){ return 'fx/'+name+'_r'+r+'.png'; };
  const strip=fxRowKeyed(name);
  const inner=document.createElement('div');
  inner.className='fx-sheet-in';
  inner.style.width=(c0*box)+'px';
  inner.style.height=((strip?1:rows)*box*ch)+'px';
  /* 必须带 wantBlob=true：单文件产物不带会返回整张图的 base64，每次出牌都新建，卡 */
  const i0=(opts.i0!=null ? opts.i0 : (S.i0||0));
  const row0=Math.floor(i0/c0);
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
  /* i0=起始帧。图首尾都留了整格全透明的空格，从第 0 格播开头会空 0.2 秒、结尾还挂个透明元素；只有一排高，纵偏移恒 0 */
  const p0 = strip ? { x:-(i0%c0)*box, y:0 } : fxCellPos(i0, c0, box, ch);
  inner.style.transform=fxCellTf(p0);
  preRow(row0+1);
  el.appendChild(inner);
  fxLayer().appendChild(el);
  if(opts.still) return el;
  const st={ el:el, inner:inner, key:key, i:0, S:S, i0:i0, box:box, ch:ch, dead:false, pend:null,
             strip:strip, c0:c0, row:row0, preRow:preRow,
             spec:fxAnchorSpec(anchor), ax:0.5, ay:0.5, bx:box/2+ox, by:box*ch/2+oy,
             lx:isFinite(lft)?lft:null, ly:isFinite(tp)?tp:null,
             dur:1000/((S.fps||24)*(opts.rate||1)),    // 源速 24fps，可被 S.fps 覆写
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
        const r=Math.floor(k/st.c0);
        if(r!==st.row){
          st.row=r; st.preRow(r+1);      // 先排下一排再换当前排，反了会闪
          st.inner.style.backgroundImage='url("'+assetURL(stripRel(r), true)+'")';
        }
        st.inner.style.transform=fxCellTf({ x:-(k%st.c0)*box, y:0 });
      } else {
        st.inner.style.transform=fxCellTf(fxCellPos(k, st.c0, box, st.ch));
      }
    }
    st.raf=requestAnimationFrame(step);
  });
  return el;
}
const FX_PREHEAT={};
function fxPreheatKeyRow0(name){
  const S=fxSheet(name); if(!S) return;
  if(!fxRowKeyed(name)) return;
  const rel='fx/'+name+'_r0.png';
  const u=assetURL(rel, true); if(!u || FX_PREHEAT[u]) return;
  FX_PREHEAT[u]=1;
  try{ const im=new Image(); im.src=u; if(im.decode){ im.decode().catch(function(){}); } }catch(e){}
}
function fxPreheatBattle(){
  try{
    if(typeof CARD_FX==='undefined' || !CARD_FX) return;
    if(typeof fx!=='function' || !fx()) return;
    const _keyedMode=((typeof ASSET_MAP!=='undefined' && ASSET_MAP) || (typeof FX_ROW_KEYS!=='undefined' && FX_ROW_KEYS));
    if(!_keyedMode) return;
    const cards=(typeof G!=='undefined' && G) ? (G.deck||[]).concat(G.hand||[]).concat(G.discard||[]) : [];
    const seen={};
    for(let i=0;i<cards.length;i++){
      const c=cards[i]; const e=(c && c.id) ? CARD_FX[c.id] : null;
      if(!e || !e.n || seen[e.n]) continue;
      seen[e.n]=1; fxPreheatKeyRow0(e.n);
    }
    /* 卡组之外但每场都出现的几张（受击/多段斩/诅咒/灼烧/反伤/腐毒）：不在卡组 CARD_FX 里，不预热照样顿 */
    ['hurt','multi_slash','curse','burn','damage_reflect','thorns','fudu_hit'].forEach(function(n){ fxPreheatKeyRow0(n); });
  }catch(e){}
}
function fxSeek(name, i, anchor, opts){
  const S=fxSheet(name); if(!S) return null;
  const o=Object.assign({}, opts||{}, { still:true });
  const el=playFx(name, anchor, o);
  if(!el) return null;
  const box=parseFloat(el.style.width)||0;
  const i0=S.i0||0;
  const c0=Math.max(1, S.c||8);
  const k=Math.max(0, Math.min(i0+S.f-1, i0+(i|0)));
  const inEl=el.firstChild;
  if(inEl){
    if(fxRowKeyed(name)){
      const r=Math.floor(k/c0);
      inEl.style.backgroundImage='url("'+assetURL('fx/'+name+'_r'+r+'.png', true)+'")';
      inEl.style.transform=fxCellTf({ x:-(k%c0)*box, y:0 });
    } else {
      inEl.style.transform=fxCellTf(fxCellPos(k, c0, box));
    }
  }
  return el;
}
/* 多段伤害浮字散成扇形；参数与 样式预览.html 的 BURST[2] 逐值一致，改了要两边同步 */
const FXBURST = { spread:38, rMin:24, rMax:40, stagger:85, jitter:6, rot:7 };
let FLOAT_GROUP = null;
function floatGroupStart(n, kind){ FLOAT_GROUP = (n>=2) ? { n:n, i:0, kind:(kind||'') } : null; }
function floatGroupEnd(){ FLOAT_GROUP = null; }
function floatDamage(text, kind, anchor, opts){
  if(!fx()) return;
  const g = (FLOAT_GROUP && (kind||'')===FLOAT_GROUP.kind) ? FLOAT_GROUP : null;
  const seg = g ? g.i++ : -1;
  const multi = !!(g && g.n>=2);
  const span=document.createElement('span');
  span.className='fx-dmg '+kind+((opts && opts.crit) ? ' crit' : '')+(multi ? ' burst' : '');
  const inner=document.createElement('i'); inner.className='fx-in';
  if(!numAppend(inner, kind, text)) inner.textContent=text;
  span.appendChild(inner);
  fxLayer().appendChild(span);
  let delay=0, jx=0, jy=0;
  if(multi){
    const t=(seg/(g.n-1)-0.5)*2;
    const ang=(-90 + t*FXBURST.spread)*Math.PI/180;
    const r=FXBURST.rMin + Math.random()*(FXBURST.rMax-FXBURST.rMin);
    span.style.setProperty('--dx', (Math.cos(ang)*r).toFixed(1)+'px');
    span.style.setProperty('--dy', (Math.sin(ang)*r*0.55).toFixed(1)+'px');
    span.style.setProperty('--rot', ((Math.random()*2-1)*FXBURST.rot).toFixed(1)+'deg');
    delay=seg*FXBURST.stagger;
    span.style.animation='fxDmgBurst 1.06s cubic-bezier(.16,.7,.35,1) '+delay+'ms forwards';
    jx=(Math.random()*2-1)*FXBURST.jitter;
    jy=(Math.random()*2-1)*FXBURST.jitter;
  }
  const st = anchor ? fxTrack(span, anchor, 0.5, 0.4, jx, jy) : null;
  if(!anchor){ span.style.left='50%'; span.style.top='28%'; }
  /* 收尾时间要算上炸花错峰，不然会提前摘掉后几段 */
  const life = multi ? (delay + 1060 + 400) : 950;
  setTimeout(()=>{ span.remove(); if(st) fxUntrack(st); }, life);
}
function hurtVignette(){
  if(!fx()) return;
  let v=document.getElementById('hurt-vignette');
  if(!v){ v=document.createElement('div'); v.id='hurt-vignette'; document.body.appendChild(v); }
  v.classList.remove('flash'); void v.offsetWidth; v.classList.add('flash');
}
/* 道心破碎：致命伤被道心挡下时九片虚影炸开。收尾只用 CSS+setTimeout，安卓 WebView 在 preserve-3d 下漏发 onfinish */
/* FX_WHOLE：fx/ 里不是精灵图的整张插画要登记在这，否则 _patch/verify_dist.py 的 [2d] 会红。素材没到位时逐片回落到 relic/daoxin.png */
const FX_WHOLE = { daoxin_full: 'fx/daoxin_full.png' };
const DAOXIN_PIECES=[
  {c:'inset(0 66.6% 66.6% 0)',        tx:-0.34, ty:-0.34, rot:-16},
  {c:'inset(0 33.3% 66.6% 33.3%)',    tx: 0.02, ty:-0.42, rot:  9},
  {c:'inset(0 0 66.6% 66.6%)',        tx: 0.36, ty:-0.30, rot: 18},
  {c:'inset(33.3% 66.6% 33.3% 0)',    tx:-0.42, ty: 0.02, rot: 11},
  {c:'inset(33.3% 33.3% 33.3% 33.3%)',tx: 0.00, ty: 0.04, rot: -7},
  {c:'inset(33.3% 0 33.3% 66.6%)',    tx: 0.44, ty: 0.03, rot:-13},
  {c:'inset(66.6% 66.6% 0 0)',        tx:-0.30, ty: 0.36, rot: 14},
  {c:'inset(66.6% 33.3% 0 33.3%)',    tx: 0.03, ty: 0.44, rot: -9},
  {c:'inset(66.6% 0 0 66.6%)',        tx: 0.34, ty: 0.33, rot: 16}
];
/* fx 精灵图地址解析：按排产物整键不存在，命中按排就取 _r0，否则回落整键 */
function fxStripURL(rel){
  const base=rel.replace(/^.*\//,'').replace(/\.png$/i,'');
  const hit=fxRowKeyed(base) ? rel.replace(/\.png$/i,'_r0.png') : rel;
  return assetURL(hit, true);
}
function daoxinBurst(){
  /* 自守闸：没有【道心】遗物就一声不响（图音战报都不出），不管将来谁调它 */
  if(typeof hasRelic !== 'function' || !hasRelic('daoxin')) return;
  sfx('glass_break');   // 放 fx() 闸之前，流畅模式省画面但音该听见
  if(!fx()) return;
  try{
    const old=document.getElementById('daoxin-burst');
    if(old && old.parentNode) old.parentNode.removeChild(old);
    const vw=window.innerWidth||0, vh=window.innerHeight||0;
    const size=Math.round(Math.min(vw,vh)*0.95);
    if(size<=0) return;
    const el=document.createElement('div'); el.id='daoxin-burst';
    const wrap=document.createElement('div'); wrap.className='dx-wrap';
    wrap.style.width=size+'px'; wrap.style.height=size+'px';
    const srcHi=assetURL(FX_WHOLE.daoxin_full, true);
    const srcLo=assetURL('relic/daoxin.png', true);
    DAOXIN_PIECES.forEach(function(f){
      const p=document.createElement('div'); p.className='dx-piece';
      p.style.clipPath=f.c; p.style.webkitClipPath=f.c;
      p.style.setProperty('--tx', Math.round(f.tx*size)+'px');
      p.style.setProperty('--ty', Math.round(f.ty*size)+'px');
      p.style.setProperty('--rot', f.rot+'deg');
      const im=document.createElement('img'); im.draggable=false; im.alt='';
      let tried=false;
      im.onerror=function(){ if(tried) return; tried=true; this.src=srcLo; };
      im.src=srcHi;
      p.appendChild(im); wrap.appendChild(p);
    });
    el.appendChild(wrap); document.body.appendChild(el);
    // 兜底定时器要跟着动画时长走，不然会在动画播一半时把节点摘掉
    setTimeout(function(){ if(el.parentNode) el.parentNode.removeChild(el); }, 2500);
  }catch(e){}
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
function heroDeath(on){
  if(typeof document==='undefined') return;
  const box=document.querySelector('.hero-art-box');
  if(!box) return;
  if(on){ box.classList.remove('hero-attack','hero-hit','hero-cast'); void box.offsetWidth; box.classList.add('hero-dead'); }
  else box.classList.remove('hero-dead');
}
function enemyAttackAnim(e, times, delayMs){
  var el=enemyEl(e); if(!el) return;
  var t=(times|0)>1?(times|0):1;
  var dl=(delayMs|0)>0?(delayMs|0):0;
  el.style.setProperty('--atk-delay', dl+'ms');
  el.style.setProperty('--atk-times', String(t));
  el.classList.remove('e-atk'); void el.offsetWidth; el.classList.add('e-atk');
  setTimeout(function(){ el.classList.remove('e-atk'); }, dl + t*300 + 260);
}
function enemyActAnim(e, kind, delayMs){
  var el=enemyEl(e); if(!el || !kind) return;
  var dl=(delayMs|0)>0?(delayMs|0):0;
  el.style.setProperty('--atk-delay', dl+'ms');
  var cls='e-act-'+kind;
  el.classList.remove('e-act', cls); void el.offsetWidth; el.classList.add('e-act', cls);
  setTimeout(function(){ el.classList.remove('e-act', cls); }, dl + 700);
}
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

function cardPlayFx(c){
  if(!fx()) return;
  const E=(typeof CARD_FX!=='undefined' && c) ? CARD_FX[c.id] : null;
  if(E && E.n){
    let anchor;
    if(E.a==='enemy'){ anchor=enemyEl(curEnemy()) || 'field'; }
    else if(E.a==='field') anchor='field';
    else if(E.a==='summon') anchor='summon';
    /* 全体特效：逐只存活敌人各播一份；key 必须带 uid 后缀，不然同名会被 playFx 掐掉、循环里只剩最后一个 */
    else if(E.a==='enemies'){
      const es=(typeof aliveEnemies==='function') ? aliveEnemies() : [];
      if(es.length){
        /* E.stg>0 时逐个叠加落特效，对上连击音效；key 带 uid 后缀，定时器里现取元素 */
        const stg=(E.stg|0)>0?(E.stg|0):0;
        for(let i=0;i<es.length;i++){
          if(stg && i>0){
            const e=es[i];
            setTimeout(function(){ playFx(E.n, enemyEl(e) || 'field', { scale:E.s, key:E.n+'@'+e.uid }); }, i*stg);
          } else playFx(E.n, enemyEl(es[i]) || 'field', { scale:E.s, key:E.n+'@'+es[i].uid });
        }
      }
      else playFx(E.n, 'field', { scale:E.s });
      return;
    }
    else if(E.a==='handcard') anchor=handCardAnchor() || 'summon';
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
  const a=(p && p.querySelector) ? (p.querySelector('.hero-art-box') || p) : p;
  const r=a?a.getBoundingClientRect():null;
  const s=Math.max(130, (r?r.width:180)*1.25);
  const d=document.createElement('div'); d.className='fx-halo';
  d.style.width=s+'px'; d.style.height=s+'px';
  /* 锚在 #player-panel；.fx-halo 自带 translate(-50%,-50%)，left/top 就是中心；0.5/0.45 是历史值 */
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
/* 召唤演出：黑雾从打出的鬼怪牌冒出、带拖尾加速飞到右下角召唤位。起点必须在 doPlayCard 那一拍量（过了这拍 #hand 已重排） */
let LAST_PLAY_RECT=null;
function notePlayRect(i){
  try{ LAST_PLAY_RECT=animRect(animHandElAt(i) || document.getElementById('hand')); }
  catch(e){ LAST_PLAY_RECT=null; }
}
function handCardAnchor(){
  const r=LAST_PLAY_RECT; if(!r || !(r.w>0) || !(r.h>0)) return null;
  const cx=r.cx, cy=r.cy, w=r.w, h=r.h;
  return { getBoundingClientRect:function(){ return { left:cx-w/2, top:cy-h/2, width:w, height:h }; } };
}
const SUMMON_MIST = {
  zhiren:  ['rgba(255,255,255,.95)','rgba(196,203,216,.86)','rgba(255,255,255,.62)'],
  xiaogui: ['rgba(96,94,110,.92)','rgba(10,8,14,.90)','rgba(146,146,162,.52)'],
  wutong:  ['rgba(88,42,140,.92)','rgba(30,10,52,.88)','rgba(158,104,226,.55)'],
  yinbing: ['rgba(224,179,65,.95)','rgba(118,84,18,.90)','rgba(255,222,140,.62)'],
  shi_wang:['rgba(190,45,40,.95)','rgba(78,14,16,.90)','rgba(255,120,100,.62)']
};
const SUMMON_DOT = { zhiren:'#f2f4f8', xiaogui:'#15151b', wutong:'#a06be0', yinbing:'#e0b341', shi_wang:'#d0403a' };
let MIST_SEQ={t:'', n:0, ts:0};
function nextMistSeq(type){
  const now=(typeof performance!=='undefined' && performance.now) ? performance.now() : Date.now();
  if(MIST_SEQ.t===type && (now-MIST_SEQ.ts)<400) MIST_SEQ.n++;
  else { MIST_SEQ.t=type; MIST_SEQ.n=0; }
  MIST_SEQ.ts=now;
  return MIST_SEQ.n;
}
function summonMistFx(type, seq){
  if(!fx() || !animLive()) return;
  const layer=animLayer(); if(!layer) return;
  const col=SUMMON_MIST[type] || SUMMON_MIST.wutong;
  const so=seq||0;
  const boxEl=document.querySelector('#player-panel .hero-art-box') || document.getElementById('player-panel');
  const dr=boxEl ? boxEl.getBoundingClientRect() : null;
  const sr=LAST_PLAY_RECT;
  const sx=sr ? sr.cx : window.innerWidth*0.5;
  const sy=sr ? sr.cy : window.innerHeight*0.72;
  /* 终点=召唤物面板右下角；元素缺失时退到视口右下 */
  const tx=(dr && dr.width) ? (dr.right-10) : (window.innerWidth-88);
  const ty=((dr && dr.height) ? (dr.bottom-10) : (window.innerHeight*0.80)) + so*14;
  /* 雾团数按同批序号递减：第0只6团、第1只4团、之后3团，省合成器开销 */
  const N=(so<=0)?6:(so===1?4:3);
  for(let k=0;k<N;k++){
    const size=Math.round(54-k*5);
    const d=document.createElement('div');
    d.className='fx-summon-mist';
    d.style.width=size+'px'; d.style.height=size+'px'; d.style.opacity='0';
    d.style.setProperty('--mist-1', col[0]);
    d.style.setProperty('--mist-2', col[1]);
    d.style.setProperty('--mist-3', col[2]);
    layer.appendChild(d);
    const t0=k*46 + so*170, dur=540;
    const mx=sx+(tx-sx)*0.22, my=sy+(ty-sy)*0.06-30;
    const qx=(tx+mx)/2, qy=(ty+my)/2;
    let an=null;
    try{
      an=d.animate([
        { transform:'translate('+(sx-size/2)+'px,'+(sy-size/2)+'px) scale(.5)',    opacity:0 },
        { transform:'translate('+(mx-size/2)+'px,'+(my-size/2)+'px) scale(1.25)',  opacity:.92, offset:.28 },
        { transform:'translate('+(qx-size/2)+'px,'+(qy-size/2)+'px) scale(.98)',   opacity:.85, offset:.64 },
        { transform:'translate('+(tx-size/2)+'px,'+(ty-size/2)+'px) scale(.32)',   opacity:0 }
      ], { duration:dur, delay:t0, easing:'cubic-bezier(.5,0,.82,.35)', fill:'both' });
    }catch(e){}
    const kill=function(){ try{ d.remove(); }catch(e){} };
    /* 安卓 WebView 的 finished 可能漏发，必须带兜底定时器 */
    if(an && an.finished && an.finished.then) an.finished.then(kill).catch(kill);
    setTimeout(kill, t0+dur+160);
  }
}
function skillFx(){
  const d=document.createElement('div'); d.className='fx-skill';
  d.style.left=(window.innerWidth*0.5)+'px'; d.style.top=(window.innerHeight*0.5)+'px';
  d.style.width='96px'; d.style.height='96px';
  fxLayer().appendChild(d);
  setTimeout(()=>d.remove(), 500);
}
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
/* Boss 二阶段转场：不阻塞流程，只铺 1.4 秒视觉，后面照常推进 */
function bossPhaseIntro(name){
  if(!document || !document.body) return;
  try{
    let b=document.getElementById('boss-intro');
    if(!b){ b=document.createElement('div'); b.id='boss-intro'; document.body.appendChild(b); }
    if(b.classList.contains('show')) return;
    b.classList.add('phase2');
    b.innerHTML=(fx()?`<div class="boss-ink"></div>`:'')+`<div class="boss-seal"><span class="bs-eyes">◉◉</span><span class="bs-name">${name}</span><span class="bs-sub">轮 回 再 临</span></div>`;
    b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
    sfx('boss');
    setTimeout(()=>{ b.classList.remove('show','phase2'); b.innerHTML=''; }, 1400);
  }catch(e){}
}

/* 敌人台词气泡：决策(sayPick)与渲染(pumpSay)分开；pumpSay 第一句必须无头早返回，不然 node 冒烟退不出 */
const SAY_TIER_FIELD={in:'sayIn', hit:'sayHit', low:'sayLow', out:'sayOut'};
const SAY_TIER_MS={in:2600, hit:1800, low:2200, out:1800, mid:2200};
const SAY_QUEUE=[];
let SAY_BUSY=false;
/* 气泡领号；clearSay 推一格作废在飞的收尾定时器，不然会两个气泡同屏 */
let SAY_TOK=0;

/* 纯函数：取该念的台词并记一次性标记；"没这一档"要在建 _said 之前返回，不然普通敌人会凭空长出 _said */
function sayPick(e, tier){
  if(!e) return null;
  const f=SAY_TIER_FIELD[tier];
  if(!f || !e[f]) return null;
  const seen=(e._said=e._said||{});
  if(seen[tier]) return null;
  seen[tier]=1;
  return e[f];
}
function sayMidPick(key){
  const m=(typeof ENEMY_SAY_MID!=='undefined') ? ENEMY_SAY_MID[key] : null;
  return (m && m.text) ? m.text : null;
}
function enemySay(e, tier){
  if(G && G.tutorial && G.tutorial.on) return;
  const line=sayPick(e, tier);
  if(!line) return;
  SAY_QUEUE.push({e:e, line:line, tier:tier});
  pumpSay();
}
/* speaker 与 anchor 分开：谢必安分化时它已被顶掉，锚要先手那只必安 */
function enemySayMid(speaker, anchor){
  const line=sayMidPick(speaker && speaker.key);
  if(!line) return;
  SAY_QUEUE.push({e:anchor||speaker, line:line, tier:'mid'});
  pumpSay();
}
/* 点屏幕收气泡走捕获相（不能挡拖拽）；常驻监听不配对 */
let _saySkipBound=false;
function bindSaySkip(){
  if(_saySkipBound) return;
  if(typeof window==='undefined' || !window.addEventListener) return;
  _saySkipBound=true;
  window.addEventListener('pointerdown', function(){ clearSay(); }, true);
}
function clearSay(){
  SAY_TOK++;                 // 作废在飞的收尾定时器
  SAY_QUEUE.length=0;
  SAY_BUSY=false;
  const el=document.getElementById('enemy-say');
  if(el) el.remove();
}
function pumpSay(){
  if(SAY_BUSY || !SAY_QUEUE.length) return;
  if(!animLive() || menuFxOff()){ SAY_QUEUE.length=0; return; }
  let it=null, eel=null;
  while(SAY_QUEUE.length){
    const head=SAY_QUEUE.shift();
    eel=enemyEl(head.e);
    if(eel){ it=head; break; }
    /* 锚点没上屏就放回队首等下次 render（只会发生在谢必安分化那一拍）；已经不在 G.enemies 里的直接丢掉 */
    if(G && G.enemies && G.enemies.indexOf(head.e)>=0){ SAY_QUEUE.unshift(head); return; }
  }
  if(!it) return;
  const old=document.getElementById('enemy-say'); if(old) old.remove();
  const el=document.createElement('div');
  el.id='enemy-say'; el.className='tier-'+it.tier;
  el.textContent=it.line;
  document.body.appendChild(el);
  const r=eel.getBoundingClientRect();
  el.style.left=(r.left+r.width/2)+'px';
  el.style.top=r.top+'px';
  void el.offsetWidth;   // 先刷一帧未展开态，否则加 .on 不触发过渡
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

/* 锁破裂解锁过渡：那个 mp4 没 alpha、贴上去是黑方块，干脆移植渲染器的 canvas 代码，零外部素材。
   几何按素材 256×256 从原 870×637 换算。canvas 冒烟测不了，碎片生成拆成纯函数 lockBreakShards 供断言 */
const LOCK_IMG_REL = 'map/locked.png';
const LOCK_CV = 960;                             // 画布逻辑边长 960，CSS 缩到 ~120px
const LOCK_IMG_W = 256, LOCK_IMG_H = 256;        // 素材像素尺寸
const LOCK_S = 3.62;                             // ≈922/255
const LOCK_OX = 19, LOCK_OY = 12.2;              // 图片左上角在画布上的落点
const LOCK_C = { x:149.5, y:130.0 };             // 破裂中心（图片坐标）
const LOCK_RING_R = [0, 16, 35, 59, 88, 126];    // 碎片环半径（图片坐标）
const LOCK_RING_N = [10, 12, 14, 16, 18];        // 每环块数，共 70 块
const LOCK_DUR = 1.0, LOCK_SHATTER = 0.20;       // 时长 1.0s，破裂 0.20s
const LOCK_LW = 1 / LOCK_S;
const LOCK_CRACK_STEP = 33.9;                    // 裂纹单段长（图片坐标）

function lockClamp01(v){ return v<0 ? 0 : v>1 ? 1 : v; }
function lockSmooth(a,b,v){ const p=lockClamp01((v-a)/(b-a)); return p*p*(3-2*p); }
function lockRaf(cb){
  try{ if(typeof requestAnimationFrame==='function'){ requestAnimationFrame(cb); return; } }catch(e){}
  setTimeout(cb, 40);
}

/* 纯函数：seed 生成 70 块碎片（图片坐标多边形+画布飞散参数），冒烟断言确定性与块数 */
function lockBreakShards(seed){
  const rnd = mkRng((seed>>>0)||1);
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

function lockDrawFrame(ctx, offs, shards, sparks, debris, t){
  const SW=LOCK_IMG_W*LOCK_S, SH=LOCK_IMG_H*LOCK_S;
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,LOCK_CV,LOCK_CV);
  const CX=LOCK_OX+LOCK_C.x*LOCK_S, CY=LOCK_OY+LOCK_C.y*LOCK_S;
  if(t < LOCK_SHATTER){
    const amp=2.5+5.5*(t/LOCK_SHATTER);
    ctx.save();
    ctx.translate(LOCK_OX+Math.sin(t*149)*amp, LOCK_OY+Math.cos(t*181)*amp*0.7);
    ctx.drawImage(offs.lock, 0,0, SW, SH);
    const preA=0.30*lockClamp01((t-0.05)/(LOCK_SHATTER-0.05));
    if(preA>0.004){ ctx.globalAlpha=preA; ctx.drawImage(offs.white,0,0,SW,SH); ctx.globalAlpha=1; }
    const crackP=lockClamp01((t-0.09)/(LOCK_SHATTER-0.09));
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

/* 在 hostEl 插 canvas 演 1s 锁破裂，破裂那帧调 onReveal；降级就直接出结果不卡流程。
   opts.px=画布显示边长(默认120)、opts.top=顶边偏移 */
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
  setTimeout(function(){ if(!started) giveUp(); }, 400);
}

/* 卡牌飞行动画。用 WAAPI 不排定时器（无头冒烟里 9 处同步断言直接读结算结果，漏一个 setTimeout 进程就退不出去）。
   动画必须等 render() 之后开播（drawCards 自己不调 render，手牌终位量不到）；pending 只追加不覆盖（lastDrawnCards 连续两次会把前一次吞掉）。
   飞的是克隆、挂 #anim-layer，不挂进 #hand。无头判据用 window.innerWidth，不是 rect/offsetWidth（dummyEl 恒返 10×10，会被误判） */
/* 正在飞进来的牌按对象记，不按下标，groupHand 会重排 G.hand */
const NEW_CARDS = new WeakSet();
/* 此刻真在本层飞的牌：开播登记、settle 摘掉，比 NEW_CARDS 精确，不会把牌永久藏住 */
const FLYING_CARDS = new WeakSet();
function yuanqiStrike(anchor){
  try{
    if(typeof fx!=='function' || !fx()) return;
    if(typeof animLive!=='function' || !animLive()) return;
    if(typeof menuFxOff==='function' && menuFxOff()) return;
    const tgt=fxAnchorRect(anchor) || {left:0,top:0,width:0,height:0};
    const src=document.querySelector('#player-panel .pstat-block') || document.querySelector('#player-panel');
    const sr=(src && src.getBoundingClientRect) ? src.getBoundingClientRect() : null;
    const x0=Math.round(sr && sr.width ? sr.left+sr.width/2 : tgt.left+tgt.width/2);
    const y0=Math.round(sr && sr.height ? sr.top+sr.height/2 : tgt.top+tgt.height/2);
    const x1=Math.round(tgt.left+tgt.width/2), y1=Math.round(tgt.top+tgt.height/2);
    const layer=document.createElement('div'); layer.className='fx-yuanqi';
    for(let i=1;i<=3;i++){
      const b=document.createElement('div'); b.className='fx-yuanqi-band i'+i;
      b.style.setProperty('--x0', x0+'px'); b.style.setProperty('--y0', y0+'px');
      b.style.setProperty('--x1', x1+'px'); b.style.setProperty('--y1', y1+'px');
      layer.appendChild(b);
    }
    const burst=document.createElement('div'); burst.className='fx-yuanqi-burst';
    burst.style.left=x1+'px'; burst.style.top=y1+'px'; burst.style.animationDelay='.42s';
    layer.appendChild(burst);
    document.body.appendChild(layer);
    setTimeout(function(){ try{ if(layer.parentNode) layer.parentNode.removeChild(layer); }catch(e){} }, 950);
  }catch(e){}
}
function jingangchuFx(){
  try{
    if(typeof fx!=='function' || !fx()) return;
    if(typeof animLive!=='function' || !animLive()) return;
    if(typeof menuFxOff==='function' && menuFxOff()) return;
    const src=document.querySelector('.stat-blockaccum') || document.querySelector('#player-panel .pstat-block') || document.querySelector('#player-panel');
    const dst=document.querySelector('#hand') || document.querySelector('#col-main');
    const sr=(src && src.getBoundingClientRect) ? src.getBoundingClientRect() : null;
    const dr=(dst && dst.getBoundingClientRect) ? dst.getBoundingClientRect() : null;
    const x0=Math.round(sr && sr.width ? sr.left+sr.width/2 : (window.innerWidth||0)*0.5);
    const y0=Math.round(sr && sr.height ? sr.top+sr.height/2 : (window.innerHeight||0)*0.08);
    const x1=Math.round(dr && dr.width ? dr.left+dr.width/2 : (window.innerWidth||0)*0.5);
    const y1=Math.round(dr && dr.height ? dr.top+dr.height*0.55 : (window.innerHeight||0)*0.7);
    const stuck=document.querySelector('.fx-jgc'); if(stuck && stuck.parentNode) stuck.parentNode.removeChild(stuck);   // 同帧连触发不叠层
    const layer=document.createElement('div'); layer.className='fx-jgc';
    for(let i=1;i<=3;i++){
      const p=document.createElement('div'); p.className='fx-jgc-puff p'+i;
      p.style.left=x0+'px'; p.style.top=y0+'px';
      layer.appendChild(p);
    }
    const smoke=document.createElement('div'); smoke.className='fx-jgc-smoke';
    smoke.style.setProperty('--x0', x0+'px'); smoke.style.setProperty('--y0', y0+'px');
    smoke.style.setProperty('--x1', x1+'px'); smoke.style.setProperty('--y1', y1+'px');
    layer.appendChild(smoke);
    const card=document.createElement('div'); card.className='fx-jgc-card';
    card.innerHTML=(typeof artImg==='function') ? artImg('card/tiebushan.png','','fx-jgc-art') : '';
    card.style.left=x1+'px'; card.style.top=y1+'px';
    layer.appendChild(card);
    document.body.appendChild(layer);
    setTimeout(function(){ try{ if(layer.parentNode) layer.parentNode.removeChild(layer); }catch(e){} }, 760);
  }catch(e){}
}
function ranxuelingFx(){
  try{
    if(typeof fx!=='function' || !fx()) return;
    if(typeof animLive!=='function' || !animLive()) return;
    if(typeof menuFxOff==='function' && menuFxOff()) return;
    const src=document.querySelector('.stat-rageaccum') || document.querySelector('#player-panel');
    const dst=document.querySelector('#rune-display .rune-icon') || document.querySelector('#rune-display');
    const sr=(src && src.getBoundingClientRect) ? src.getBoundingClientRect() : null;
    const dr=(dst && dst.getBoundingClientRect) ? dst.getBoundingClientRect() : null;
    const x0=Math.round(sr && sr.width ? sr.left+sr.width/2 : (window.innerWidth||0)*0.5);
    const y0=Math.round(sr && sr.height ? sr.top+sr.height/2 : (window.innerHeight||0)*0.08);
    const x1=Math.round(dr && dr.width ? dr.left+dr.width/2 : (window.innerWidth||0)*0.88);
    const y1=Math.round(dr && dr.height ? dr.top+dr.height/2 : (window.innerHeight||0)*0.12);
    const stuck=document.querySelector('.fx-rxl'); if(stuck && stuck.parentNode) stuck.parentNode.removeChild(stuck);   // 同帧连触发不叠层
    const layer=document.createElement('div'); layer.className='fx-rxl';
    for(let i=1;i<=3;i++){
      const d=document.createElement('div'); d.className='fx-rxl-drop d'+i;
      d.style.left=x0+'px'; d.style.top=y0+'px';
      layer.appendChild(d);
    }
    const ribbon=document.createElement('div'); ribbon.className='fx-rxl-ribbon';
    ribbon.style.setProperty('--x0', x0+'px'); ribbon.style.setProperty('--y0', y0+'px');
    ribbon.style.setProperty('--x1', x1+'px'); ribbon.style.setProperty('--y1', y1+'px');
    layer.appendChild(ribbon);
    const rune=document.createElement('div'); rune.className='fx-rxl-rune';
    rune.style.left=x1+'px'; rune.style.top=y1+'px';
    layer.appendChild(rune);
    document.body.appendChild(layer);
    setTimeout(function(){ try{ if(layer.parentNode) layer.parentNode.removeChild(layer); }catch(e){} }, 720);
  }catch(e){}
}
function animLive(){
  try{ return typeof window!=='undefined' && typeof window.innerWidth==='number' && window.innerWidth>0; }
  catch(e){ return false; }
}
function animLayer(){
  let el=document.getElementById('anim-layer');
  if(!el){ el=document.createElement('div'); el.id='anim-layer'; document.body.appendChild(el); }
  return el;
}
function flyCardHTML(frontHtml, w, h){
  return '<div class="fly-card" style="width:'+w+'px;height:'+h+'px">'
       +   '<div class="fly-inner">'
       +     '<div class="fly-face fly-front">'+frontHtml+'</div>'
       +     '<div class="fly-face fly-back"></div>'
       +   '</div>'
       + '</div>';
}
function flyFaceHTML(c){
  if(!c || typeof cardBody!=='function') return '';
  const rc=(typeof RCOLOR!=='undefined' && RCOLOR) ? (RCOLOR[c.rarity]||'') : '';
  return '<div class="card has-frame '+rc+'">'+cardBody(c)+'</div>';
}
let _animSkipBound=false;
/* 跳过监听挂冒泡相，捕获相会吞掉卡牌 pointerdown、拖拽就废了；常驻一个不配对 */
function animBindSkip(){
  if(_animSkipBound) return;
  if(typeof window==='undefined' || !window.addEventListener) return;
  _animSkipBound=true;
  window.addEventListener('pointerdown', function(){ Anim.skip(); }, false);
}
const Anim = {
  flights: [],
  pending: [],
  busy(){ return this.flights.length>0; },
  push(payload){
    if(!payload || !animLive()) return;
    this.pending.push(payload);
  },
  flush(){
    if(!animLive() || !this.pending.length) return;
    const q=this.pending; this.pending=[];
    let base=0;
    for(let i=0;i<q.length;i++){ try{ base += this.play(q[i], base) || 0; }catch(e){} }
  },
  skip(){
    const fs=this.flights.slice();
    for(let i=0;i<fs.length;i++){ try{ fs[i].settle(); }catch(e){} }
  },
  stop(key){
    if(!key) return;
    const fs=this.flights.slice();
    for(let i=0;i<fs.length;i++){ if(fs[i].key===key) fs[i].settle(); }
  },
  play(p, base){
    if(!animLive()) return 0;
    if(!fx()) return 0;
    if(p && typeof p.build==='function'){
      let b=null; try{ b=p.build(); }catch(e){ b=null; }
      if(!b) return 0;
      /* 新建对象别漏 hold，漏了洗牌那一拍会静默消失 */
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
      /* cancel 不是 finish：克隆马上删，且 cancel 走 oncancel 不绕回 tick */
      for(let i=0;i<anims.length;i++){ try{ anims[i].cancel(); }catch(e){} }
      for(let i=0;i<nodes.length;i++){ try{ if(nodes[i].parentNode) nodes[i].parentNode.removeChild(nodes[i]); }catch(e){} }
      let live=null;
      for(let i=0;i<hide.length;i++){
        if(!hide[i].keep){ try{ hide[i].el.style.opacity=''; }catch(e){} }
        try{ if(hide[i].card){ NEW_CARDS.delete(hide[i].card); FLYING_CARDS.delete(hide[i].card); if(!hide[i].keep) (live||(live=[])).push(hide[i].card); } }catch(e){}
      }
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
    /* 兜底：安卓 WebView 会漏发 onfinish，克隆会永远停在手牌位。settle 幂等，真收到 finish 时空跑 */
    let maxDelay=0;
    for(let i=0;i<items.length;i++){ const d=(items[i] && items[i].delay)||0; if(d>maxDelay) maxDelay=d; }
    try{ guard=setTimeout(function(){ try{ settle(); }catch(e){} }, dur+off+maxDelay+200); }catch(e){}
    animBindSkip();
    this.flights.push({ key:(p && p.key)||'', settle:settle });
    return (p && p.hold) || 0;
  }
};
function _animShift(it, off){
  const c={};
  for(const k in it){ if(Object.prototype.hasOwnProperty.call(it,k)) c[k]=it[k]; }
  c.delay=((it && it.delay) || 0) + off;
  return c;
}
const PULSE_GOLD='radial-gradient(circle at center, rgba(224,179,65,0) 34%, rgba(224,179,65,.42) 62%, rgba(224,179,65,0) 80%)';
const PULSE_CINNABAR='radial-gradient(circle at center, rgba(196,54,38,0) 30%, rgba(214,64,44,.5) 60%, rgba(196,54,38,0) 82%)';
function _animItem(layer, it, dur, anims){
  const delay=(it && it.delay) || 0;
  if(it && it.el){
    anims.push(it.el.animate(
      [ {transform:'scale(1)'},
        {transform:'scale(1.09)', offset:.32},
        {transform:'scale(1)'} ],
      {duration:Math.max(80, dur*0.55), delay:delay, easing:'ease-out', fill:'none'}));
    return null;
  }
  if(it && it.pulse){
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
  /* 尺寸不要取整，只压两位小数：窄档手牌被 flex-shrink 压成小数宽，取整会让内部百分比定位差 1px */
  const tw=Math.max(1, Math.round((to.w||from.w||132)*100)/100);
  const th=Math.max(1, Math.round((to.h||from.h||200)*100)/100);
  const wrap=document.createElement('div');
  wrap.innerHTML=flyCardHTML(it.html||'', tw, th);
  const node=wrap.firstChild, inner=node.firstChild;
  const cx0=(from.cx===undefined? to.cx : from.cx), cy0=(from.cy===undefined? to.cy : from.cy);
  const cx1=(to.cx===undefined? from.cx : to.cx), cy1=(to.cy===undefined? from.cy : to.cy);
  const s0=Math.max(.02, (from.w||tw)/tw);
  const tx0=cx0-tw/2, ty0=cy0-th/2, tx1=cx1-tw/2, ty1=cy1-th/2;
  const t0='translate('+tx0+'px,'+ty0+'px) scale('+s0+')';
  const t1='translate('+tx1+'px,'+ty1+'px) scale(1)';
  const kfs = it.fade
    ? [ {transform:t0, opacity:1},
        {transform:t1, opacity:1, offset:.46},
        {transform:'translate('+tx1+'px,'+ty1+'px) scale(1.06)', opacity:1, offset:.7},
        {transform:'translate('+tx1+'px,'+ty1+'px) scale(.86)', opacity:0} ]
    : [ {transform:t0}, {transform:t1} ];
  anims.push(node.animate(kfs,
    {duration:dur, delay:delay, easing:'cubic-bezier(.22,.61,.36,1)', fill:'both'}));
  if(it.flip){
    const a=(it.flip==='back') ? 0 : 180, b=(it.flip==='back') ? 180 : 0;
    anims.push(inner.animate(
      [ {transform:'rotateY('+a+'deg)'}, {transform:'rotateY('+b+'deg)'} ],
      {duration:dur, delay:delay, easing:'ease-in-out', fill:'both'}));
  }
  layer.appendChild(node);
  return node;
}

const ANIM_DUR = { draw: 340, discard: 300, shuffle: 520, exchange: 300, cast: 520 };
/* 洗牌独占 340ms，克隆延后：单边 2.5px 会被 6 条整卡同拍吃掉。shuffle 的 dur 别动，它还兼着震动 286ms 和金晕 */
const ANIM_SHUFFLE_HOLD = 340;

/* 取元素不带旋转的盒子：中心用 rect 的（旋转后 AABB 中心=形心）；尺寸走 getComputedStyle 使用值，不用 offsetWidth（窄档会被四舍五入） */
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
function animDrawQueued(cards){
  if(!animLive() || !fx()) return;
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
/* 洗牌：两堆各震一下+金晕，徽章同拍归并。在 for 里会触发多次，用 key 去重；声明 hold 让克隆延后 ANIM_SHUFFLE_HOLD */
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
function animDiscardQueued(cards){
  if(!animLive() || !fx()) return;
  if(!cards || !cards.length) return;
  const els=animHandEls(cards);
  if(!els.length) return;
  const items=[], hide=[];
  const to=animRect(document.querySelector('#pile-discard .pile-face'));
  for(let i=0;i<els.length;i++){
    const from=animRect(els[i].el);
    if(!from || !to) continue;
    hide.push({ el:els[i].el, card:els[i].card, keep:true });
    items.push({ html:flyFaceHTML(els[i].card), flip:'back', from:from, to:to, delay:i*45 });
  }
  if(!items.length) return;
  Anim.play({ dur:ANIM_DUR.discard, items:items, hide:hide });
}
function animHandElAt(i){
  const hand=document.getElementById('hand');
  /* 三道守卫都必要：沙箱里 getElementById 返回桩元素，少一道就在冒烟里抛异常 */
  if(!hand || !hand.children || !(i>=0)) return null;
  const el=hand.children[i];
  if(!el || !el.classList || !el.classList.contains('card')) return null;
  return el;
}

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
function animExchangeQueued(old,cNew,oldSlot){
  if(!animLive() || !fx()) return;
  if(!old || !cNew || !oldSlot) return;
  NEW_CARDS.add(cNew);
  Anim.push({ dur:ANIM_DUR.exchange, build:function(){
    const dest=animHandEls([cNew]);
    const items=[], hide=[];
    const pile=animRect(document.querySelector('#pile-discard .pile-face'));
    if(pile && old.type!=='junk')
      items.push({ html:flyFaceHTML(old), flip:'back', from:oldSlot, to:pile, delay:0 });
    const to=dest.length ? animRect(dest[0].el) : oldSlot;
    if(!to) return null;
    items.push({ html:flyFaceHTML(cNew), flip:'front',
                 from:(pile || oldSlot), to:to, delay:90 });
    if(dest.length) hide.push({ el:dest[0].el, card:cNew });
    else NEW_CARDS.delete(cNew);                // 没落位就撤登记
    return { items:items, hide:hide, dur:ANIM_DUR.exchange };
  }});
}

