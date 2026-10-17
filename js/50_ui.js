/* ============================================================================
 * 志怪塔 · js/50_ui.js 界面层
 * ============================================================================ */
/* 爬塔地图 */

/* 图标只能走 assetURL，HTML 里写死 素材/ 打包后会丢图 */
const NODE_LABEL = { fight:'战斗', elite:'精英', unknown:'未知', camp:'篝火', shop:'商店', boss:'Boss' };
const MAP_ICON_DIR = 'map/';

const NODE_ICON  = { fight:'guanqia-logo/combat.png', elite:'guanqia-logo/elite.png', unknown:'guanqia-logo/unknown.png', camp:'guanqia-logo/rest.png', shop:'shop.png', boss:'guanqia-logo/boss.png' };

const NODE_ICON_LOCKED = 'locked.png';


const MAP_SLOT_PCT = [8, 29, 50, 71, 92];
function mapSlotPct(node){
  const i = (node && typeof node.sx==='number') ? node.sx : 2;
  return MAP_SLOT_PCT[Math.max(0, Math.min(MAP_SLOT_PCT.length-1, i))];
}

function mapNodeStyle(node){
  if(!node) return '';
  const left=mapSlotPct(node)+(node.jx||0);
  const top=(node.jy||0);
  return 'left:'+left.toFixed(2)+'%;top:'+top+'px;';
}
const NODE_TIP   = { fight:'普通战斗', elite:'精英战：更强的敌人，更好的奖励', unknown:'未知事件', camp:'篝火：休整或锻造', shop:'鬼市：买卖与删牌', boss:'守关 Boss' };

const MAP_BG = { 1:'map.jpg', 2:'map.jpg', 3:'map.jpg' };
function mapBgName(){ return MAP_BG[G.act]||MAP_BG[1]; }
function nodeLabel(node){ return node ? (NODE_LABEL[node.t] || NODE_LABEL.fight) : ''; }

function nodeIconHTML(file, extra){ return artImg(MAP_ICON_DIR + file, '', 'node-ico' + (extra ? (' ' + extra) : '')); }
function nodeHTML(node){
  return nodeIconHTML(NODE_ICON[node.t] || NODE_ICON.fight) + '<span class="node-label">' + nodeLabel(node) + '</span>';
}
/* 地图查询：迷雾渲染与连线的唯一真相 */
function mapNodeAt(r,c){
  if(r<0 || r>=MAP.length || !MAP[r] || c<0 || c>=MAP[r].length) return null;
  return MAP[r][c] || null;
}
function mapVisited(r,c){ return (G.mapPath||[]).some(function(p){ return p.r===r && p.c===c; }); }

function mapReachable(r,c){
  const node=mapNodeAt(r,c);
  if(!node) return false;
  if(r!==G.mapRow) return false;
  /* 事件/商店返回地图后，刚选中的那格仍要可点 */
  const _p=G.mapPath||[], _last=_p[_p.length-1];
  if(_last && _last.r===r && _last.c===c) return true;
  if(r===0 || G.mapCol<0) return true;
  const up=mapNodeAt(r-1, G.mapCol);
  if(!up) return true;
  return (up.next||[]).indexOf(c)>=0;
}
/* 下一步会亮哪几格 = 可走节点 next 的并集，别和 mapRevealedColsAt 合并 */
function mapPreviewSet(){
  const out=[];
  const r=G.mapRow, nr=r+1;
  if(nr>=MAP.length) return out;
  const cur=MAP[r]||[];
  for(let c=0;c<cur.length;c++){
    if(!mapReachable(r,c)) continue;
    (cur[c].next||[]).forEach(function(j){ if(out.indexOf(j)<0 && mapNodeAt(nr,j)) out.push(j); });
  }
  return out;
}
/* 地图不遗忘：按当时看过什么累积，不是只按当前位置算 */
function mapHistoryCol(row){   // 第 row 层当时站的那一格的列号；查不到返回 -1
  const p=G.mapPath||[];
  for(let i=p.length-1;i>=0;i--) if(p[i] && p[i].r===row) return p[i].c;
  return -1;
}
/* 父链断了或当前层没有唯一父节点时 0..mapRow-1 整层亮，免得图标没线 */
function mapDegraded(){
  if(G.mapRow>0 && (G.mapCol<0 || !mapNodeAt(G.mapRow-1, G.mapCol))) return true;
  for(let r=1;r<=G.mapRow-1;r++){
    const pc=mapHistoryCol(r-1);
    if(pc<0 || !mapNodeAt(r-1,pc)) return true;
  }
  return false;
}
/* row 层亮过真图标的列；未来层一律空 */
function mapRevealedColsAt(row){
  const out=[]; const cur=MAP[row]||[];
  if(row>G.mapRow) return out;
  if(row===G.mapRow){                 // 当前层直接转调 mapReachable，别复制逻辑
    for(let c=0;c<cur.length;c++) if(mapReachable(row,c)) out.push(c);
    return out;
  }
  if(mapDegraded()){                  
    for(let c=0;c<cur.length;c++) out.push(c);
    return out;
  }
  if(row<=0){
    /* 第 0 层没有上一层，非所选格挂不到父节点，只亮走过的 */
    for(let c=0;c<cur.length;c++) if(mapVisited(row,c)) out.push(c);
    return out;
  }
  const up=mapNodeAt(row-1, mapHistoryCol(row-1));
  (up.next||[]).forEach(function(j){ if(out.indexOf(j)<0 && mapNodeAt(row,j)) out.push(j); });
  return out;
}
/* fogTier 四档：past / choice / preview / hidden */
function fogTier(r,c){
  
  if(!mapNodeAt(r,c)) return 'hidden';
  if(mapVisited(r,c)){
    /* 刚从事件/商店返回：这一步选中的格子仍要渲染成可点按钮 */
    const _p=G.mapPath||[], _last=_p[_p.length-1];
    if(r===G.mapRow && _last && _last.r===r && _last.c===c) return 'choice';
    return 'past';                               
  }
  if(r===G.mapRow) return mapReachable(r,c) ? 'choice' : 'hidden';
  if(r<G.mapRow) return mapRevealedColsAt(r).indexOf(c)>=0 ? 'past' : 'hidden';
  if(r===G.mapRow+1) return mapPreviewSet().indexOf(c)>=0 ? 'preview' : 'hidden';
  return 'hidden';
}
function fogVisible(r,c){ return fogTier(r,c)!=='hidden'; }
function runStatusHTML(){
  const relicNames = G.relics.length ? G.relics.map(id=>{const r=relById(id);return `<span class="prelic-chip${relicUsedCls(id)}" data-tip="relic:${id}">${relicIcon(r)}<span class="prelic-name">${r.name}</span></span>`;}).join('') : '无';
  return `<div class="run-status">
    <span>生命 <b>${G.hp}</b>/${G.maxHp}</span>
    <span>金币 <b>${G.gold}</b></span>
    <span>牌库 <b>${G.deck.length}</b> 张</span>
    <span>遗物：${relicNames}</span>
  </div>`;
}

function mapTopbarHTML(){
  const hero=HEROES.find(h=>h.id===G.hero);
  const hpPct=G.maxHp>0 ? Math.max(0, Math.min(100, Math.round(G.hp/G.maxHp*100))) : 0;
  let res='';
  if(G.hero==='ganshiren') res=`<span class="mt-shiqi">尸气 <b>${G.尸气}/${relicMaxShiqi()}</b></span>`;
  else if(G.hero==='yincha') res=`<span class="mt-xuenu">血怒 <b>${G.xuenu||0}/${relicMaxXuenu()}</b></span>`;
  
  
  return `<div class="map-topbar">
    <div class="mt-bar">
      <span class="mt-portrait">${artImg('hero/'+G.hero+'.png','','')}</span>
      <span class="mt-col">
        <span class="mt-row">
          <span class="mt-name">${hero?hero.name:'—'}</span>
          <span class="mt-gold"><i></i><b>${G.gold}</b></span>
          <span>牌库 <b>${G.deck.length}</b> 张</span>
          ${res}
        </span>
        <span class="mt-row">
          <span class="hpbar${G.block>0?' has-block':''} mt-hp"><i class="hpghost" style="width:${hpPct}%"></i><i class="hpfill" style="width:${hpPct}%"></i><span class="hp-label">${G.hp}/${G.maxHp}</span></span>
        </span>
      </span>
      <span class="mt-acts">
        <button class="mt-menu" onclick="openMenu()" title="菜单">☰</button>
      </span>
    </div>
    <div class="map-plaque">${ACT_NAMES[G.act-1]}<small>第 ${G.mapRow+1}/${MAP.length} 层 · 沿连线向上，规划好路线</small></div>
  </div>`;
}


let _mapStepFrom = -1;    // 上一帧相机停在哪一行；-1 = 不放单步动画
let _mapCamBound = false;
function measureRowH(){
  const el=document.querySelector('.map-row');
  const h=el && el.offsetHeight;
  return h ? h : 88;      
}

function mapCamRange(){
  const sheet=document.getElementById('map-sheet');
  const vp=document.getElementById('map-viewport');
  const rowH=measureRowH();
  const sheetH=(sheet && sheet.offsetHeight) || (MAP.length*rowH);
  const vpH=(vp && (vp.clientHeight || vp.offsetHeight)) || 0;
  let maxY=sheetH-vpH; if(!(maxY>0)) maxY=0;
  /* .map-sheet 有 padding，camY 少算会切掉第 1 层，这里实测取 */
  let padTop=0;
  try{
    const cs=(typeof window!=='undefined' && window.getComputedStyle && sheet) ? window.getComputedStyle(sheet) : null;
    if(cs){ const v=parseFloat(cs.paddingTop); if(v>0) padTop=v; }
  }catch(e){ padTop=0; }
  return { rowH:rowH, sheetH:sheetH, vpH:vpH, maxY:maxY, padTop:padTop };
}

function camYForRow(row, rowH, maxY, vpH, padTop){
  if(!(vpH>0)) return maxY;
  let y=(MAP.length-row)*rowH-vpH+(padTop||0);
  if(!(y>0)) y=0;
  if(y>maxY) y=maxY;
  return y;
}
function setMapCam(y, animate, ms){
  const sheet=document.getElementById('map-sheet');
  if(!sheet || !sheet.style) return;
  if(animate) sheet.classList.remove('cam-nofx'); else sheet.classList.add('cam-nofx');
  if(sheet.style.setProperty){
    
    
    sheet.style.setProperty('transition-duration', (animate ? (ms||600) : 0)+'ms');
    sheet.style.setProperty('--camY', y+'px');
  }
}

function mapCamNow(){
  const sheet=document.getElementById('map-sheet');
  if(!sheet || !sheet.style || !sheet.style.getPropertyValue) return 0;
  const v=parseFloat(sheet.style.getPropertyValue('--camY'));
  return v>0 ? v : 0;
}
/* entry=进场动画；stepFrom>=0=单步上移；其它直接落位 */
function mapCamInit(entry, stepFrom){
  const sheet=document.getElementById('map-sheet');
  const vp=document.getElementById('map-viewport');
  if(!sheet || !vp) return;
  const C=mapCamRange();
  const target=camYForRow(G.mapRow, C.rowH, C.maxY, C.vpH, C.padTop);
  if(!fx()){ setMapCam(target, false, 0); return; }
  if(entry){
    setMapCam(0, false, 0);              
    void sheet.offsetHeight;             
    setMapCam(target, true, 2000);       
    return;
  }
  if(stepFrom>=0 && stepFrom!==G.mapRow){
    setMapCam(camYForRow(stepFrom, C.rowH, C.maxY, C.vpH, C.padTop), false, 0);
    void sheet.offsetHeight;
    setMapCam(target, true, 600);
    return;
  }
  setMapCam(target, false, 0);
}

let _mapDragBound=false, _mapDrag=null;
let _mapUserScrolled=false;   // 用户手动滑过；resize 时据此别把镜头拽回当前层
let _mapCamRatio=0;           
let _mapEatClickUntil=0;      // 拖完地图短时间内忽略节点点击

function mapDragCam(startCam, dy, maxY){
  let y=startCam-dy;          // 手指下滑(dy>0)是想看更下层，camY 变小
  if(!(y>0)) y=0;
  if(y>maxY) y=maxY;
  return y;
}

function mapCamFromRatio(ratio, maxY){
  let y=(ratio>0?ratio:0)*maxY;
  if(!(y>0)) y=0;
  if(y>maxY) y=maxY;
  return y;
}

function mapWheelCam(startCam, deltaY, deltaMode, maxY, vpH){
  let d=(typeof deltaY==='number' && isFinite(deltaY)) ? deltaY : 0;
  if(deltaMode===1) d=d*16;                      
  else if(deltaMode===2) d=d*((vpH>0)?vpH:600); 
  let y=(startCam||0)+d;
  if(!(y>0)) y=0;
  if(y>maxY) y=maxY;
  return y;
}
function bindMapDrag(){
  if(_mapDragBound || typeof document==='undefined' || !document.addEventListener) return;
  _mapDragBound=true;
  document.addEventListener('pointerdown', function(ev){
    const vp=document.getElementById('map-viewport');
    if(!vp || !ev || !ev.target) return;
    let inside=false;
    try{ inside = vp.contains ? vp.contains(ev.target) : (ev.target===vp); }catch(e){ inside=false; }
    if(!inside) return;
    const C=mapCamRange();
    if(!(C.maxY>0)) return;        // 一屏装得下就别抢走点击
    _mapDrag={ id:ev.pointerId, sy:ev.clientY, cam:mapCamNow(), maxY:C.maxY, moved:false };
  });
  document.addEventListener('pointermove', function(ev){
    const d=_mapDrag; if(!d) return;
    if(d.id!=null && ev.pointerId!=null && ev.pointerId!==d.id) return;
    const dy=ev.clientY-d.sy;
    if(!d.moved && Math.abs(dy)<7) return;   // 7px 阈值防手抖，与出牌拖拽同一口径
    d.moved=true; _mapUserScrolled=true;
    const y=mapDragCam(d.cam, dy, d.maxY);
    setMapCam(y, false, 0);                  
    _mapCamRatio = d.maxY>0 ? y/d.maxY : 0;
    if(ev.cancelable) ev.preventDefault();
  }, {passive:false});
  const up=function(){
    const d=_mapDrag; if(!d) return;
    _mapDrag=null;
    if(!d.moved) return;                     
    /* 拖过就吃掉紧随的那次 click，否则拖地图会被判成点节点 */
    _mapEatClickUntil=(typeof Date!=='undefined' && Date.now) ? Date.now()+400 : 0;
  };
  document.addEventListener('pointerup', up);
  document.addEventListener('pointercancel', up);
  
  document.addEventListener('wheel', function(ev){
    const vp=document.getElementById('map-viewport');
    if(!vp || !ev || !ev.target) return;
    let inside=false;
    try{ inside = vp.contains ? vp.contains(ev.target) : (ev.target===vp); }catch(e){ inside=false; }
    if(!inside) return;
    const C=mapCamRange();
    if(!(C.maxY>0)) return;                  
    if(ev.cancelable) ev.preventDefault();
    const y=mapWheelCam(mapCamNow(), ev.deltaY, ev.deltaMode, C.maxY, C.vpH);
    setMapCam(y, false, 0);                  
    _mapUserScrolled=true;
    _mapCamRatio = C.maxY>0 ? y/C.maxY : 0;
  }, {passive:false});
  
  document.addEventListener('dragstart', function(ev){
    const vp=document.getElementById('map-viewport');
    if(!vp || !ev || !ev.target) return;
    let inside=false;
    try{ inside = vp.contains ? vp.contains(ev.target) : false; }catch(e){ inside=false; }
    if(inside && ev.cancelable) ev.preventDefault();
  });
}
/* 描边按档位给：按行给会让当前层走不到的锁也拿到淡白描边 */
function nodeOutlineTier(tier){
  if(tier==='past') return 'o-past';
  if(tier==='choice') return 'o-reached';
  return 'o-locked';
}
/* 卷轴素材必须走 assetURL：单文件产物不重写 CSS 里的 url() */
function applyMapTextures(){
  const q=function(sel){ try{ return document.querySelector(sel); }catch(e){ return null; } };
  const set=function(el, v){ if(el && el.style) el.style.backgroundImage=v; };
  
  const u=function(rel){ return 'url("'+assetURL(rel, true)+'")'; };
  set(q('.map-roller.top'), u('map/scroll_top.png'));
  set(q('.map-roller.bot'), u('map/scroll_bottom.png'));
  set(q('#map-sheet'), u('bg/bg_map.jpg')+', '+u('map/scroll_paper.jpg'));
}

var MENU_BGS = ['bg/menu/menu_1.jpg','bg/menu/menu_2.jpg','bg/menu/menu_3.png'];
function menuBgRotate(){
  var n=MENU_BGS.length;
  if(!n) return 0;
  /* 负值和越界都兜住：JS 里 % 对负数返回负值 */
  var i=(((SAVE.menuBgIdx|0) % n) + n) % n;
  SAVE.menuBgIdx=(i+1)%n;
  try{ persistSave(); }catch(e){}
  const q=function(sel){ try{ return document.querySelector(sel); }catch(e){ return null; } };
  const set=function(el,v){ if(el && el.style) el.style.backgroundImage=v; };
  set(q('.menu-bgimg.a'), 'url("'+assetURL(MENU_BGS[i])+'")');
  set(q('.menu-bgimg.b'), '');   
  return i;
}

function menuFxOff(){
  try{ if(SETTINGS.lowSpec) return true; }catch(e){}
  try{ return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  catch(e){ return false; }
}
/* 收尾用定时器不用 animationend：动画被 CSS 关掉时它永远不来 */
var MENU_BUSY=false;
function menuBusy(on){
  MENU_BUSY=!!on;
  const st=(function(){ try{ return document.querySelector('.menu-stage'); }catch(e){ return null; } })();
  if(st && st.classList) st.classList.toggle('is-busy', !!on);
}

function steleBreak(btn, fn){
  if(MENU_BUSY || !btn || btn.disabled) return;
  menuBusy(true);
  sfx('stone_broken');   
  if(btn.classList) btn.classList.add('is-breaking');
  const off=menuFxOff();
  const tFlash=off?0:800, tGo=off?60:930;   
  setTimeout(function(){
    const f=(function(){ try{ return document.querySelector('.menu-flash'); }catch(e){ return null; } })();
    if(f && f.classList) f.classList.add('on');
    setTimeout(function(){ menuBusy(false); if(typeof fn==='function') fn(); }, tGo-tFlash);
  }, tFlash);
}

function talisOpen(btn, fn){
  if(MENU_BUSY) return;
  menuBusy(true);
  sfx('ui_curtain');   
  if(btn && btn.classList) btn.classList.add('tug');
  const off=menuFxOff();
  
  setTimeout(function(){
    if(btn && btn.classList) btn.classList.remove('tug');
    menuBusy(false);
    if(typeof fn==='function') fn();
  }, off?0:420);
}

function menuShardsHTML(src){
  let h='<span class="menu-shards" aria-hidden="true">';
  for(let i=1;i<=5;i++) h+=artImg(src,'','menu-shard s'+i);
  return h+'</span>';
}

function showMap(opts){
  SCENE='map'; saveRun();
  setBg(mapBgName()); setBGM('map');
  const entry=!!(opts && opts.entry), stepFrom=_mapStepFrom;
  _mapStepFrom=-1;    
  
  const breakSet={};
  if(stepFrom>=0 && MAP[G.mapRow]){
    for(let c=0;c<MAP[G.mapRow].length;c++) if(mapReachable(G.mapRow,c)) breakSet[G.mapRow+','+c]=true;
  }
  
  let html=`<div class="map-root">${mapTopbarHTML()}`;
  
  html+=`<div class="map-scroll">`;
  html+=`<div class="map-roller top" aria-hidden="true"></div>`;
  html+=`<div class="map-frame">`;
  html+=`<div class="map-viewport" id="map-viewport"><div class="map-wrap map-sheet" id="map-sheet"><div class="map-lines" id="map-lines" aria-hidden="true"></div>`;
  for(let r=MAP.length-1;r>=0;r--){
    const rowCls = r<G.mapRow ? 'past' : r===G.mapRow ? 'current' : 'future';
    html+=`<div class="map-row ${rowCls}">`;
    for(let c=0;c<MAP[r].length;c++){
      const node=MAP[r][c], tier=fogTier(r,c), dc=`data-r="${r}" data-c="${c}"`;
      
      
      
      const tip=NODE_TIP[node.t]||'', ocls=' '+nodeOutlineTier(tier);
      if(breakSet[r+','+c]){
        // 刚解锁的格：真图标先藏着，锁碎那帧再显形
        
        
        html+=`<button class="map-node breaking${ocls}" ${dc} style="${mapNodeStyle(node)}" title="${tip}" onclick="chooseNode(${c})">${nodeIconHTML(NODE_ICON[node.t]||NODE_ICON.fight,'o-reveal')}<span class="node-label">${nodeLabel(node)}</span></button>`;
        continue;
      }
      if(tier==='hidden'){ html+=`<div class="map-node locked${ocls}" ${dc} style="${mapNodeStyle(node)}" title="${tip}（尚未解锁）">${nodeHTML(node)}</div>`; continue; }
      if(tier==='choice'){ html+=`<button class="map-node${ocls}" ${dc} style="${mapNodeStyle(node)}" title="${tip}" onclick="chooseNode(${c})">${nodeHTML(node)}</button>`; continue; }
      if(tier==='preview'){ html+=`<div class="map-node preview${ocls}" ${dc} style="${mapNodeStyle(node)}" title="下一步可以走到这里（尚未解锁）">${nodeHTML(node)}</div>`; continue; }
      
      html+=`<div class="map-node past${ocls}" ${dc} style="${mapNodeStyle(node)}" title="${tip}">${nodeHTML(node)}</div>`;
    }
    html+=`</div>`;
  }
  html+=`</div></div>`;   
  html+=`</div>`;         
  html+=`<div class="map-roller bot" aria-hidden="true"></div>`;
  html+=`</div>`;         
  html+=`</div>`;         
  showOverlay(html);
  /* map-scene 必须加在 showOverlay 之后，否则别的面板也继承整屏底 */
  const __ov=document.getElementById('overlay');
  if(__ov && __ov.classList) __ov.classList.add('map-scene');
  applyMapTextures();     
  bindMapDrag();          // 自由滑动（幂等）
  
  _mapUserScrolled=false; _mapCamRatio=0;
  // 行布局完才有坐标：先画连线，再落相机，最后放锁破裂
  const __step=stepFrom, __break=breakSet;
  const kick=function(){
    drawMapLinks();
    _mapGlowEdge=null;      
    mapCamInit(entry, __step);
    const keys=Object.keys(__break);
    for(let i=0;i<keys.length;i++){
      const p=keys[i].split(','), r=p[0], c=p[1];
      const el=document.querySelector('.map-node[data-r="'+r+'"][data-c="'+c+'"]');
      if(!el) continue;
      
      playLockBreak(el, function(){
        el.classList.remove('breaking');
        el.classList.remove('o-locked'); el.classList.add('o-reached');
        const ic=el.querySelector('.node-ico');
        if(ic) ic.classList.remove('o-reveal');
      }, { px:120, top:-32 });
    }
  };
  try{ requestAnimationFrame(kick); } catch(e){ kick(); }
  /* resize 重算相机不动画；但用户手动滑过后改按比例保位 */
  if(!_mapCamBound && typeof window!=='undefined' && window.addEventListener){
    _mapCamBound=true;
    window.addEventListener('resize', function(){
      if(!document.getElementById('map-sheet')) return;
      if(!_mapUserScrolled){ mapCamInit(false, -1); return; }
      const C=mapCamRange();
      setMapCam(mapCamFromRatio(_mapCamRatio, C.maxY), false, 0);
    });
  }
}
/* 连线靠坐标相减定位，.map-lines 与 .map-row 必须留在 .map-sheet 内 */
/* 刚打通的那条边，消费一次后清空 */
let _mapGlowEdge = null;
function mapEdgeKey(r0,c0,r1,c1){ return r0+','+c0+'>'+r1+','+c1; }

function mapArcBow(key){
  let h=2166136261;
  for(let i=0;i<key.length;i++){ h^=key.charCodeAt(i); h=Math.imul(h,16777619); }
  const u=((h>>>0)%2000)/1000-1;                 
  const mag=0.45+0.55*Math.abs(u);               
  return (u<0 ? -mag : mag);
}

function mapArcD(a, b, key){
  const dx=b.x-a.x, dy=b.y-a.y;
  const dist=Math.hypot(dx,dy);
  if(dist<4) return '';
  const nx=-dy/dist, ny=dx/dist;                 
  const bow=Math.min(dist*0.14, 42)*mapArcBow(key);   
  const cx=(a.x+b.x)/2+nx*bow, cy=(a.y+b.y)/2+ny*bow;
  const R=function(v){ return Math.round(v*10)/10; };
  return 'M'+R(a.x)+','+R(a.y)+' Q'+R(cx)+','+R(cy)+' '+R(b.x)+','+R(b.y);
}
let _mapLinkBound=false;
function drawMapLinks(){
  const layer=document.getElementById('map-lines');
  if(!layer || !layer.parentNode || !layer.parentNode.querySelectorAll) return;
  const wrap=layer.parentNode;
  const rows=Array.prototype.slice.call(wrap.querySelectorAll('.map-row'));
  if(!rows.length || !rows[0].getBoundingClientRect) return;
  const wb=wrap.getBoundingClientRect();
  while(layer.firstChild) layer.removeChild(layer.firstChild);
  // DOM 顺序自上而下 = 层号从高到低
  
  function nodeAt(r,c){
    const row=rows[MAP.length-1-r]; if(!row) return null;
    const el=row.querySelector('.map-node[data-r="'+r+'"][data-c="'+c+'"]');
    // .empty 是 visibility:hidden 仍有尺寸，必须排除
    
    if(!el || (el.classList && el.classList.contains('empty'))) return null;
    const b=el.getBoundingClientRect();
    if(!b.width && !b.height) return null;
    return { x:b.left-wb.left+b.width/2, y:b.top-wb.top+b.height/2 };
  }
  const NS='http://www.w3.org/2000/svg';
  let svg=null;
  try{
    svg=document.createElementNS(NS,'svg');
    svg.setAttribute('class','map-svg');
    svg.setAttribute('width', Math.max(1, Math.round(wb.width)));
    svg.setAttribute('height', Math.max(1, Math.round(wb.height)));
    svg.setAttribute('viewBox','0 0 '+Math.max(1,Math.round(wb.width))+' '+Math.max(1,Math.round(wb.height)));
    layer.appendChild(svg);
  }catch(e){ return; }
  
  function seg(a,b,cls,newest,key){
    if(!a||!b) return;
    const d=mapArcD(a,b,key);
    if(!d) return;
    const p=document.createElementNS(NS,'path');
    p.setAttribute('d', d);
    p.setAttribute('class', 'map-path '+cls);
    svg.appendChild(p);
    if(!newest) return;
    let L=0;
    try{ L=(typeof p.getTotalLength==='function') ? p.getTotalLength() : 0; }catch(e){ L=0; }
    if(L>1 && p.style && p.style.setProperty){
      p.style.setProperty('--len', String(Math.round(L*10)/10));
      p.setAttribute('class', 'map-path '+cls+' link-new');
    }
  }
  
  const __cur=MAP[G.mapRow]||[];
  const __path=G.mapPath||[];
  function walkedKey(r0,c0,r1,c1){
    for(let i=0;i<__path.length-1;i++){
      const p0=__path[i], p1=__path[i+1];
      if(p0&&p1 && p0.r===r0 && p0.c===c0 && p1.r===r1 && p1.c===c1) return true;
    }
    return false;
  }
  const __dim=[], __past=[], __reach=[];
  
  const __n=(__path||[]).length;
  const __lastA=(__n>=2)?__path[__n-2]:null, __lastB=(__n>=2)?__path[__n-1]:null;
  function isLastSeg(r0,c0,r1,c1){
    return !!__lastA && !!__lastB &&
           __lastA.r===r0 && __lastA.c===c0 && __lastB.r===r1 && __lastB.c===c1;
  }
  
  for(let r=0;r<MAP.length-1;r++){
    const cur=MAP[r]||[];
    for(let c=0;c<cur.length;c++){
      if(!mapNodeAt(r,c)) continue;
      const nx=(cur[c] && cur[c].next)||[];
      for(let k=0;k<nx.length;k++){
        const j=nx[k], r1=r+1;
        if(!mapNodeAt(r1,j)) continue;
        const key=mapEdgeKey(r,c,r1,j);
        const edge={ a:nodeAt(r,c), b:nodeAt(r1,j), key:key };
        if(isLastSeg(r,c,r1,j)) __reach.push(edge);
        else if(walkedKey(r,c,r1,j)) __past.push(edge);
        else { edge.fog=!(fogVisible(r,c)||fogVisible(r1,j)); __dim.push(edge); }
      }
    }
  }
  
  let i;
  for(i=0;i<__dim.length;i++)   seg(__dim[i].a,   __dim[i].b,   __dim[i].fog?'link-fog':'link-dim',   false, __dim[i].key);
  for(i=0;i<__past.length;i++)  seg(__past[i].a,  __past[i].b,  'link-past',  false, __past[i].key);
  for(i=0;i<__reach.length;i++) seg(__reach[i].a, __reach[i].b, 'link-reach', (__reach[i].key===_mapGlowEdge), __reach[i].key);
  
  _mapGlowEdge=null;
  if(!_mapLinkBound && typeof window!=='undefined' && window.addEventListener){
    _mapLinkBound=true;
    window.addEventListener('resize',()=>{ if(document.getElementById('map-lines')) drawMapLinks(); });
  }
}
function chooseNode(c){
  /* 刚拖过地图，这一下算滑动不算选点 */
  if(Date.now && Date.now() < _mapEatClickUntil) return;
  
  if(!mapReachable(G.mapRow,c)){ sfx('error'); floatMsg('这条连线走不通'); return; }
  sfx('ui_map');   
  const node=MAP[G.mapRow][c];
  (G.mapPath=G.mapPath||[]).push({r:G.mapRow, c:c}); // 记下这一步，地图连线据此画已走
  G.mapCol=c;
  hideOverlay();
  if(node.t==='fight'||node.t==='elite') startBattle(node.e);   
  else if(node.t==='camp') showCampfire();
  else if(node.t==='shop') showShop();
  else if(node.t==='unknown') showUnknown();
  else if(node.t==='boss'){
    
    if(node.e && node.e.length) startBattle(node.e);
    else { const pool=BOSS_POOL[G.act]||['yewang']; startBattle([pool[Math.floor(rng()*pool.length)]]); }
  }
}


const UNKNOWN_EVENTS = ['well','blackmarket','temple','ambush','forge','empty','potion','remove'];

const EVT_BG = { well:'evt_well.jpg', blackmarket:'evt_blackmarket.jpg',
                 temple:'evt_temple.jpg', ambush:'evt_ambush.jpg',
                 forge:'evt_forge.jpg', empty:'evt_empty.jpg',
                 potion:'evt_potion.jpg', remove:'evt_remove.jpg' };
/* 踩到未知节点直接随机抽一个事件，不让玩家选 */
/* 新手教程旁白播放器 */
const NARR_Q=[];
let NARR_CUR=null;   
function narrate(){
  if(!G||!G.tutorial||!G.tutorial.on) return;
  for(let i=0;i<arguments.length;i++){ const it=arguments[i]; if(it!=null) NARR_Q.push(it); }
  narrateNext();
}
function narrateNext(){
  if(NARR_CUR) return;                 
  const it=NARR_Q.shift();
  if(it==null){ narrateDrop(); return; }   // 队列抽干即收气泡，旧版 return 会永久挂屏
  if(typeof it==='function'){ try{ it(); }catch(e){} narrateNext(); return; }
  narrateShow(it, false);
}

function narrateWho(id){ return (typeof TUT_WHO!=='undefined') ? (TUT_WHO[id]||null) : null; }
function narrateShow(id, force){
  const txt=(typeof TUT_NARR!=='undefined')?TUT_NARR[id]:null;
  if(txt==null){ narrateNext(); return; }
  NARR_CUR={ id:id, force:!!force };
  if(typeof document==='undefined'||!document.body) return;
  let box=document.getElementById('tut-narr');
  if(!box){ box=document.createElement('div'); box.id='tut-narr'; document.body.appendChild(box); }
  bindNarrTap(box);                          // 点按收泡只绑在旁白框上（幂等）
  const who=narrateWho(id);
  const anim=['a-slide','a-fade','a-brush'][((G&&G.tutorial&&G.tutorial.node)||0)%3];
  box.className='narr '+anim+(force?' force':'')+(who?' foe':'');
  box.innerHTML='<div class="bubble">'
    +(who?'<div class="who">'+who+'</div>':'')
    +'<div class="text">'+txt+'</div>'
    +(force?'':'<div class="more">▼ 点按继续</div>')+'</div>';
  void box.offsetWidth;                      
  box.classList.add('show');
  
  if(typeof playVoice==='function') playVoice(id);
}
function narrateDrop(){
  NARR_CUR=null;
  if(typeof stopVoice==='function') stopVoice();   
  if(typeof document==='undefined') return;
  const box=document.getElementById('tut-narr');
  if(box){ box.classList.remove('show'); box.innerHTML=''; }
}

function narrateAdvance(){
  if(NARR_CUR && NARR_CUR.force) return;
  narrateDrop();
  narrateNext();
}

function narrateHide(){ narrateDrop(); narrateNext(); }
/* 旁白未放完时 playCard/endTurn 上锁，否则强制符先被打掉会卡死 */
function narrBusy(){ return !!(NARR_CUR || NARR_Q.length); }
function narrateClear(){
  NARR_Q.length=0; NARR_CUR=null;
  if(typeof stopVoice==='function') stopVoice();
  if(typeof document==='undefined') return;
  const box=document.getElementById('tut-narr');
  if(box){ box.classList.remove('show'); box.innerHTML=''; }
}
/* 旁白只认点旁白框本身推进，用 onpointerdown 幂等绑定 */
let _narrTapBound=false;
function bindNarrTap(box){
  if(box && box.addEventListener){
    _narrTapBound=true;
    box.onpointerdown=function(ev){ if(ev && ev.stopPropagation) ev.stopPropagation();
      if(NARR_CUR && !NARR_CUR.force) narrateAdvance(); };
    return;
  }
  
  if(typeof document==='undefined') return;
  const el=document.getElementById('tut-narr');
  if(el) bindNarrTap(el);
}

function tutSkipShow(on){
  if(typeof document==='undefined'||!document.body) return;
  let b=document.getElementById('tut-skip');
  if(on){
    if(!b){ b=document.createElement('button'); b.id='tut-skip'; b.textContent='跳过教程'; document.body.appendChild(b); }
    b.onclick=function(){ tutSkip(); };
    b.style.display='';
  } else if(b){ b.style.display='none'; }
}

function showTutIntro(){
  if(typeof document==='undefined'||!document.body){ startTutorial(); return; }
  let el=document.getElementById('tut-intro');
  if(el) el.remove();
  el=document.createElement('div'); el.id='tut-intro';
  el.innerHTML='<img class="ti-img" alt=""><div class="ti-text">'+(TUT_NARR.tut_00||'')+'</div><button class="btn ti-go">入 塔</button>';
  document.body.appendChild(el);
  const img=el.querySelector('.ti-img');
  img.src=assetURL('intro/tutorial.png', true);
  img.onerror=function(){ img.style.display='none'; };
  el.querySelector('.ti-go').onclick=function(){ if(typeof stopVoice==='function') stopVoice(); el.remove(); startTutorial(); };
  
  if(typeof playVoice==='function') playVoice('tut_00');
}

function tutReplayAsk(){ hideOverlay(); showTutIntro(); }
function showUnknown(){
  const pool=UNKNOWN_EVENTS;
  const labels={well:'古井许愿', blackmarket:'鬼市黑商', temple:'无头古庙', ambush:'拦路恶鬼', forge:'废弃道观', empty:'荒坟', potion:'灵泉', remove:'净坛'};
  
  const ev=(G.tutorial&&G.tutorial.on)?'potion':pool[Math.floor(rng()*pool.length)];
  SCENE='unknown'; saveRun();
  
  setBg(EVT_BG[ev] || 'map.jpg');
  setBGM('shop'); 
  floatMsg('未知之地 · ' + (labels[ev]||''));
  doUnknown(ev);
}
function doUnknown(ev){
  hideOverlay();
  if(ev==='well') unknownWell();
  else if(ev==='blackmarket') unknownBlackMarket();
  else if(ev==='temple') unknownTemple();
  else if(ev==='ambush') unknownAmbush();
  else if(ev==='forge') unknownForge();
  else if(ev==='potion') unknownPotion();
  else if(ev==='remove') unknownRemove();
  else unknownEmpty();
}
function unknownRemove(){
  if(G.deck.length<=1){ unknownEmpty(); return; }
  const cards=G.deck.map((c,i)=>`<div class="card has-frame ${RCOLOR[c.rarity]}" data-fi="${i}" onclick="askUnknownRemove(${i})">${cardBody(c)}</div>`).join('');
  
  showOverlay(`<h2>净 坛</h2><p>一座祭坛，香火缭绕。你可以焚掉一张牌，净化牌组。</p><div class="reward-cards">${cards}</div><button class="btn ghost" onclick="hideOverlay(); goNext();">离开</button>`, undefined, 'pile-scene');
}
/* 同一时间只允许一张牌在演出中（同步一次性锁），防手速连锻多张 */
let CARD_ACT_BUSY=false;
function doUnknownRemove(i){
  if(CARD_ACT_BUSY) return;                       
  const c=G.deck[i];
  if(c && c.id==='shi_wang'){ floatMsg('【尸王】不可删除'); log('【尸王】不可删除'); return; }
  
  let el=null; try{ el=document.querySelector('#overlay.pile-scene .reward-cards [data-fi="'+i+'"]'); }catch(e){}
  CARD_ACT_BUSY=true;
  cardFxAnim(el, 'pile', ()=>{
    CARD_ACT_BUSY=false;
    const cc=G.deck.splice(i,1)[0]; log(`焚符净坛：删除【${cc.name}】`);
    hideOverlay(); goNext();
  });
}
function unknownPotion(){
  const p=randomPotion(); gainPotion(p);
  if(G.tutorial && G.tutorial.on && typeof tutOn==='function'){ try{ tutOn('unknownPotion'); }catch(e){} }   
  showOverlay(`<h2>灵 泉</h2><p>一泓清泉自石缝渗出，隐隐有灵光。<br>你取一瓢饮下，得了一瓶【${p.name}】。</p><div class="reward-cards"><div class="relic r-blue">${potionIcon(p)}<div class="cname">${p.name}</div><div class="cdesc">${p.desc}</div></div></div><button class="btn" onclick="hideOverlay(); goNext();">继续</button>`);
}

function unknownWell(){
  showOverlay(`<h2>古井许愿</h2><p>你俯身探井，井底有微光浮动。<br>井灵低语：留下 <b style="color:var(--red)">8 点生命</b>，便赐你一件遗物。</p>
    <button class="btn" onclick="doWellOffer()">献祭 8 点生命</button>
    <button class="btn ghost" onclick="hideOverlay(); log('古井许愿：你按下井沿的微光，转身离开'); goNext();">转身离开</button>`);
}
function doWellOffer(){
  G.hp=Math.max(1,G.hp-8); sfx('hurt'); log('古井许愿：以 8 点生命为代价，换取一件遗物');
  const relic=weightedRelic();
  grantRelic(relic);
  sfx(relicSfxFor(relic)); log(`获得遗物【${relic.name}】`);   
  showOverlay(`<h2>古井许愿</h2><p>井水翻涌，一件旧物浮上水面：</p>
    <div class="reward-cards"><div class="relic ${RCOLOR[relic.rarity]}">${relicIcon(relic)}<div class="cname">${relic.name}</div><div class="cdesc">${relic.desc}</div><div class="ctype">遗物</div></div></div>
    <button class="btn" onclick="hideOverlay(); goNext();">继续</button>`);
}
function unknownBlackMarket(){
  const c=weightedCard();
  showOverlay(`<h2>鬼市黑商</h2><p>蒙面黑商打量你一番，从袖中摸出一张牌递来。<br>他说不要钱 —— 但牌进了牌组，就再也甩不掉了。</p>
    <div class="reward-cards"><div class="card has-frame ${RCOLOR[c.rarity]}">${cardBody(c)}</div></div>
    <button class="btn" onclick="doBlackMarketTake('${c.id}')">收下</button>
    <button class="btn ghost" onclick="hideOverlay(); log('鬼市黑商：你摆手谢绝，黑商耸耸肩隐入阴影'); goNext();">摆手谢绝</button>`);
}
function doBlackMarketTake(id){
  const c=cardById(id)||weightedCard(); G.deck.push(c); log(`黑商塞给你一张【${c.name}】`);
  showOverlay(`<h2>鬼市黑商</h2><p>黑商把牌按进你掌心，转身没入人群。</p><div class="reward-cards"><div class="card has-frame ${RCOLOR[c.rarity]}">${cardBody(c)}</div></div><button class="btn" onclick="hideOverlay(); goNext();">继续</button>`);
}
function unknownTemple(){
  
  const roll=Math.floor(rng()*4);
  let msg='';
  /* 回血一律走 heal()，它自带特效/音效/飘字 */
  if(roll===0){ heal(15); msg='恢复 15 点生命'; }
  else if(roll===1){ G.maxHp+=5; heal(5); msg='最大生命 +5（并恢复 5 点生命）'; }
  else if(roll===2){ G.gold+=20; msg='获得 20 金币'; sfx('gold'); }
  else { const c=weightedCard(); G.deck.push(c); msg=`获得卡牌【${c.name}】`; sfx('card'); }
  log('无头古庙赐福：'+msg);
  showOverlay(`<h2>无头古庙</h2><p>你推开古庙大门，一尊无头神像静立。<br>一道金光落下——</p><p style="color:var(--green)">${msg}</p><button class="btn" onclick="hideOverlay(); goNext();">继续</button>`);
}
function unknownAmbush(){
  const pool=ELITES_BY_ACT[G.act]||['yecha'];
  const key=pool[Math.floor(rng()*pool.length)];
  showOverlay(`<h2>拦路恶鬼</h2><p>黑影从暗处扑出——是 <b>${ENEMIES[key].name}</b>！</p><button class="btn" onclick="hideOverlay(); startBattle(['${key}']);">迎战</button>`);
}
function unknownForge(){
  if(!G.deck.length){ unknownEmpty(); return; }
  const _fo=G.deck.map((c,i)=>({c,i})).sort((a,b)=>{ const ra=(a.c.up||!canUpgrade(a.c))?1:0, rb=(b.c.up||!canUpgrade(b.c))?1:0; return ra-rb||a.i-b.i; });
  const cards=_fo.map(({c,i})=>forgeCardHTML(c,i)).join('');
  showOverlay(`<h2>道 观</h2><p>一间废弃道观，香炉尚温。<br>你可以免费锻造升级一张牌。</p><div class="reward-cards">${cards}</div><button class="btn ghost" onclick="hideOverlay(); goNext();">离开</button>`, undefined, 'forge-scene');
}
function unknownEmpty(){
  showOverlay(`<h2>空 坟</h2><p>一座荒坟，墓碑字迹已模糊。<br>什么也没有发生。</p><button class="btn" onclick="hideOverlay(); goNext();">继续前进</button>`);
}

/* 奖励与篝火 */
function weightedCard(){
  /* 断刃雷符/引魂灯等专属卡只能由遗物/卡牌自身生成，不进奖励池 */
  /* 卡牌奖励池的唯一出口：门禁筛空时退回只过滤专属卡，绝不留空池 */
  const _baseOK=c=> (!c.hero || c.hero===G.hero) && (!c.mile || mileClaimed(c.mile)) && c.id!=='shi_wang' && c.id!=='duanren_leifu' && c.id!=='yinbing' && (!c.needs || deckHasMechanic(c.needs));
  let eligible=CARDS.filter(c=> _baseOK(c) && mileOn('card',c));
  if(!eligible.length) eligible=CARDS.filter(_baseOK);
  const poolAll=eligible.length? eligible : CARDS;
  const tier=G.rewardTier||'normal';

  
  const heroSpecificPool = getHeroSpecificCardPool(poolAll, tier);

  for(let attempt=0; attempt<6; attempt++){
    const rarity=rollCardRarity(tier);

    
    const pool=heroSpecificPool.filter(c=>c.rarity===rarity);
    if(pool.length) {
      const card = cardById(pool[Math.floor(rng()*pool.length)].id);
      return card;
    }
  }

  
  const fallbackPool=poolAll.filter(c=>c.rarity===rollCardRarity(tier));
  if(fallbackPool.length) {
    return cardById(fallbackPool[Math.floor(rng()*fallbackPool.length)].id);
  }

  
  return cardById(poolAll[Math.floor(rng()*poolAll.length)].id);
}


function getHeroSpecificCardPool(originalPool, tier = 'normal') {
  if (!G.hero) return originalPool; 

  let enhancedPool = [...originalPool];

  
  switch(G.hero) {
    case 'tianshi': 
      
      const tianshiCards = ['zhouyin', 'leifu', 'jingang', 'fodu']; 
      for(const cardId of tianshiCards) {
        const card = originalPool.find(c => c.id === cardId);
        if(card) {
          
          let copiesToAdd = 2; 

          
          if(tier === 'shop') {
            copiesToAdd = 1; 
          }

          for(let i = 0; i < copiesToAdd; i++) {
            enhancedPool.push(card);
          }
        }
      }
      break;

    case 'ganshiren': 
      
      const ganshirenCards = ['leifu', 'jingang', 'fodu', 'juling']; 
      for(const cardId of ganshirenCards) {
        const card = originalPool.find(c => c.id === cardId);
        if(card) {
          let copiesToAdd = 2;
          if(tier === 'shop') {
            copiesToAdd = 1;
          }

          for(let i = 0; i < copiesToAdd; i++) {
            enhancedPool.push(card);
          }
        }
      }
      break;

    case 'wuseng': 
      
      const wusengCards = ['tiebushan', 'jingji', 'fodu', 'jingang', 'jinguang']; 
      for(const cardId of wusengCards) {
        const card = originalPool.find(c => c.id === cardId);
        if(card) {
          let copiesToAdd = 2;
          if(tier === 'shop') {
            copiesToAdd = 1;
          }

          for(let i = 0; i < copiesToAdd; i++) {
            enhancedPool.push(card);
          }
        }
      }
      break;

    case 'yincha': 
      
      const yinchaCards = ['sheshen', 'xueqi', 'fodu', 'leifu', 'ranxue']; 
      for(const cardId of yinchaCards) {
        const card = originalPool.find(c => c.id === cardId);
        if(card) {
          let copiesToAdd = 2;
          if(tier === 'shop') {
            copiesToAdd = 1;
          }

          for(let i = 0; i < copiesToAdd; i++) {
            enhancedPool.push(card);
          }
        }
      }
      break;
  }

  return enhancedPool;
}
/* 掉落浮层 */
function dropUI(html){
  try{
    let el=document.getElementById('dropUI');
    if(!el){
      if(!document.body || !document.createElement) return;
      el=document.createElement('div'); el.id='dropUI'; el.className='drop-ui';
      document.body.appendChild(el);
    }
    el.innerHTML=html;
    if(el.classList) el.classList.remove('hidden');
    alignRewardPile();
  }catch(e){}
}
function dropUIHide(){
  try{ const el=document.getElementById('dropUI'); if(!el) return;
    if(el.classList) el.classList.add('hidden'); el.innerHTML=''; }catch(e){}
}

function alignRewardPile(){
  try{
    const pile=document.getElementById('rewardPile'); if(!pile || !pile.style) return;
    let tgt=document.getElementById('pile-draw');
    if(!tgt){ const op=document.getElementById('outPile'); if(op) tgt=op; }
    const r=(tgt && tgt.getBoundingClientRect) ? tgt.getBoundingClientRect() : null;
    if(!r || (!r.width && !r.height)) return;
    pile.style.right='auto'; pile.style.bottom='auto';
    pile.style.left=(r.left+r.width/2)+'px';
    pile.style.top=(r.top+r.height/2)+'px';
    pile.style.transform='translate(-50%,-50%)';
  }catch(e){}
}
/* 战局外常驻 HUD */
function outHudSync(){
  try{
    const hud=document.getElementById('outHud'); if(!hud || !hud.style) return;
    /* 选角屏不改 SCENE，判显隐必须显式排除 hero-scene */
    const ov=document.getElementById('overlay');
    const heroOn = !!(ov && ov.classList && ov.classList.contains('hero-scene'));
    /* 退回主菜单不改 SCENE，得看 body.at-menu（= 当前是局外背景）才收得住；
       只看 SCENE 的话战局外的锦囊 / 牌堆会一直挂在菜单左下、右下角 */
    const atMenu = !!(document.body && document.body.classList && document.body.classList.contains('at-menu'));
    const menuOn = atMenu || !!(ov && ov.classList && ov.classList.contains('menu-scene'));
    const show = (typeof G!=='undefined') && !!G && SCENE!=='menu' && SCENE!=='battle' && !heroOn && !menuOn;
    hud.style.display = show ? 'flex' : 'none';
    if(!show) return;
    /* HUD 图标每帧比对最新结果、变了才写；一次性闩锁会让回落串永远升不上来 */
    const pp=document.getElementById('outPouch'), pl=document.getElementById('outPile');
    const pi=(pp && pp.querySelector) ? pp.querySelector('.out-ico') : null;
    if(pi){ const h=iconTag('ui/menu/jinnang-nobg.png','锦囊'); if(pi.innerHTML!==h) pi.innerHTML=h; }
    const ci=(pl && pl.querySelector) ? pl.querySelector('.out-ico') : null;
    if(ci){ const h=iconTag('ui/deck_back.png','牌堆'); if(ci.innerHTML!==h) ci.innerHTML=h; }
    const pn=document.getElementById('outPileN'); if(pn) pn.textContent=(G.deck||[]).length;
  }catch(e){}
}

function hudIconPrewarm(){
  try{ iconAvail('ui/menu/jinnang-nobg.png'); iconAvail('ui/deck_back.png'); }catch(e){}
}

function pileButtonEl(){
  try{
    if(SCENE!=='battle'){ const o=document.getElementById('outPile'); if(o) return o; }
    return document.getElementById('pile-draw') || document.getElementById('outPile') || null;
  }catch(e){ return null; }
}

function flyToPile(srcEl, iconHTML, done){
  const finish=()=>{ if(done) done(); };
  try{
    const pile=pileButtonEl();
    const r=(pile && pile.getBoundingClientRect) ? pile.getBoundingClientRect() : null;
    const ok=!!(pile && r && (r.width||r.height) && document.body && document.createElement && window.requestAnimationFrame);
    if(!(typeof fx==='function' && fx()) || !ok) return finish();
    let src=null;
    if(srcEl && srcEl.getBoundingClientRect){ const a=srcEl.getBoundingClientRect(); if(a && (a.width||a.height)) src=a; }
    const x=src?(src.left+src.width/2):window.innerWidth/2;
    const y=src?(src.top+src.height/2):window.innerHeight*0.45;
    const tX=r.left+r.width/2, tY=r.top+r.height/2;
    const fly=document.createElement('div');
    fly.className='fly-ico'; fly.innerHTML=iconHTML||'';
    fly.style.left=x+'px'; fly.style.top=y+'px';
    document.body.appendChild(fly);
    requestAnimationFrame(()=>{
      fly.style.transform=`translate(calc(-50% + ${tX-x}px), calc(-50% + ${tY-y}px)) scale(.45)`;
      fly.style.opacity='.2';
    });
    setTimeout(()=>{ try{ fly.remove(); }catch(e){} finish(); }, 560);
  }catch(e){ finish(); }
}
function showReward(){
  
  setBg('victory_reward.jpg');
  
  const picks=[];
  while(picks.length<3){
    const c=weightedCard();
    if(!picks.some(p=>p.id===c.id)) picks.push(c);
  }
  G.rewardPicks=picks;

  
  const hasGoldInReward = picks.some(card => card.rarity === 'gold');

  
  G.lastRewardHadGold = hasGoldInReward;

  const _TYPE_ORD={attack:0,defense:1,skill:2,spirit:3,junk:4};
  
  const cards=picks.map((c,i)=>({c,i})).sort((a,b)=>(_TYPE_ORD[a.c.type]??9)-(_TYPE_ORD[b.c.type]??9)||a.i-b.i)
    .map(({c,i},k)=>`<div class="rcard" data-ri="${i}" style="--rd:${k}" onclick="flipReward(this,${i})"><div class="rcard-inner"><div class="rcard-face rcard-front"><div class="card has-frame ${RCOLOR[c.rarity]}">${cardBody(c)}</div></div><div class="rcard-face rcard-back"></div></div></div>`).join('');
  const cls='reward-cards flip-cards'+(fx()?' reward-flip':'');
  
  const pileUI=`<div class="reward-pile" id="rewardPile"><div class="rp-stack"><div class="rp-card"></div><div class="rp-card"></div><div class="rp-card"></div></div><div class="rp-meta"><span class="rp-label">牌库</span><span class="rp-n" id="rewardPileN">${(G.deck||[]).length}</span></div></div>`;
  
  dropUI(`<div class="drop-head"><h2>请选择你中意的手牌</h2><p>点击卡牌翻开查看，再点一次加入牌组</p></div><div class="${cls}">${cards}</div>${pileUI}<button class="btn ghost drop-skip" onclick="skipReward()">无视</button>`);
}

function playDropSequence(){
  let host=null; try{ host=document.getElementById('enemy-panel'); }catch(e){}
  const canAnim = (typeof fx==='function' && fx()) && host && document.createElement && document.body && window.requestAnimationFrame;
  if(!canAnim){ showReward(); return; }
  try{
    const rect=lastKillRect();
    const cx=rect?rect.cx:window.innerWidth/2, cy=rect?rect.cy:window.innerHeight*0.42;
    const layer=document.createElement('div'); layer.className='drop-layer';
    const els=[];
    for(let k=0;k<3;k++){
      const d=document.createElement('div');
      d.className='drop-card drop-fall'; d.style.setProperty('--dd',String(k));
      d.style.left=(cx+(k-1)*20)+'px'; d.style.top=(cy-8)+'px';
      layer.appendChild(d); els.push(d);
    }
    document.body.appendChild(layer);
    const midX=window.innerWidth/2, midY=window.innerHeight*0.44;
    setTimeout(()=>{
      els.forEach((d,k)=>{
        const dx=(midX+(k-1)*56)-(cx+(k-1)*20), dy=midY-(cy-8);
        d.style.transition='none'; d.classList.remove('drop-fall');
        d.style.transform='translate(-50%,0) scale(1)'; d.style.opacity='1';
        void d.offsetWidth;
        d.style.transition='transform .44s cubic-bezier(.35,.1,.25,1), opacity .44s ease';
        requestAnimationFrame(()=>{ d.style.transform=`translate(calc(-50% + ${dx}px), ${dy}px) scale(1.7)`; d.style.opacity='.15'; });
      });
    }, 440);
    setTimeout(()=>{ try{ layer.remove(); }catch(e){} showReward(); }, 950);
  }catch(e){ try{ const l=document.querySelector('.drop-layer'); if(l) l.remove(); }catch(_){} showReward(); }
}

function lastKillRect(){
  try{
    const arr=(G&&G.enemies)||[]; let el=null;
    for(let i=arr.length-1;i>=0;i--){ const x=enemyEl(arr[i]); if(x){ el=x; break; } }
    if(!el){ const p=document.getElementById('enemy-panel'); if(p) el=p; }
    if(!el || !el.getBoundingClientRect) return null;
    const r=el.getBoundingClientRect(); if(!r || (!r.width && !r.height)) return null;
    return { cx:r.left+r.width/2, cy:r.top+r.height*0.62 };
  }catch(e){ return null; }
}

function flyCardToPile(el, done){
  const finish=()=>{ if(done) done(); };
  try{
    const pile=document.getElementById('rewardPile');
    if(!el || !el.getBoundingClientRect || !pile || !document.body || !document.createElement || (typeof fx==='function' && !fx())) return finish();
    
    const card=(el.querySelector && el.querySelector('.card')) || el;
    const a=card.getBoundingClientRect ? card.getBoundingClientRect() : null;
    if(!a || (!a.width && !a.height)) return finish();
    const stack=(pile.querySelector && pile.querySelector('.rp-stack')) || pile;
    const b=stack.getBoundingClientRect ? stack.getBoundingClientRect() : null;
    if(!b) return finish();
    const tx=(b.left+b.width/2)-(a.left+a.width/2), ty=(b.top+b.height/2)-(a.top+a.height/2);
    const fly=card.cloneNode(true);
    fly.classList.add('fly-card');
    fly.style.left=a.left+'px'; fly.style.top=a.top+'px'; fly.style.width=a.width+'px'; fly.style.height=a.height+'px';
    fly.style.zIndex='30'; fly.style.transformOrigin='50% 50%';
    fly.style.transition='transform .52s cubic-bezier(.4,.05,.3,1), opacity .52s ease';
    document.body.appendChild(fly); el.style.visibility='hidden';
    void fly.offsetWidth;
    requestAnimationFrame(()=>{ fly.style.transform=`translate(${tx}px, ${ty}px) scale(.1)`; fly.style.opacity='.18'; });
    setTimeout(()=>{ try{ fly.remove(); }catch(e){} finish(); }, 560);
  }catch(e){ finish(); }
}

function flipReward(el, i){
  if(!el || !el.classList) return;
  if(!el.classList.contains('revealed')){ el.classList.add('revealed'); sfx('ui_flip'); return; }
  pickReward(i);
}
function pickReward(i){
  /* 推进必须无条件发生：抽成幂等 go() 兜异常，否则会停在抽牌面板 */
  let advanced=false;
  const go=()=>{ if(advanced) return; advanced=true; dropUIHide(); afterReward(); };
  let el=null;
  try{
    sfx('ui_reward');   
    const c=G.rewardPicks[i];
    G.deck.push(c);
    log(`获得卡牌【${c.name}】`);
    
    try{ const n=document.getElementById('rewardPileN'); if(n) n.textContent=G.deck.length; }catch(e){}

    
    const tier = G.rewardTier || 'normal';
    if(tier !== 'boss' && G.hasOwnProperty('lastRewardHadGold')) {
      updateGoldCompensation(G.lastRewardHadGold);
    }

    
    try{ el=document.querySelector('.reward-cards .rcard[data-ri="'+i+'"]'); }catch(e){}
  }catch(e){}
  try{ flyCardToPile(el, go); }catch(e){ go(); }
}
function skipReward(){
  
  const tier = G.rewardTier || 'normal';
  if(tier !== 'boss' && G.hasOwnProperty('lastRewardHadGold')) {
    updateGoldCompensation(G.lastRewardHadGold);
  }

  dropUIHide();
  afterReward();
}
function afterReward(){
  
  
  if(G.battleResult && G.battleResult.isBoss){
    G.pendingRelic=false; sfx('ui_map');
    if(G.tutorial && G.tutorial.on){
      if(SAVE && !SAVE.trialGiftV1){ showTutTrialReward(); return; }
      goNext(); return;
    }
    showForgePicker('boss'); return;
  }
  if(G.pendingRelic){ G.pendingRelic=false; showRelicReward(); return; }
  goNext();
}

/* 掉落 / 飞行 / 锦囊 */
/* 锦囊按钮：战斗内 #jinnangBtn，战局外 #outPouch */
function pouchButtonEl(){
  try{
    if(SCENE!=='battle'){ const o=document.getElementById('outPouch'); if(o) return o; }
    return document.getElementById('jinnangBtn') || document.getElementById('outPouch') || null;
  }catch(e){ return null; }
}

function dropSourceEl(){
  try{
    const arr=(G&&G.enemies)||[];
    for(let i=arr.length-1;i>=0;i--){ const x=enemyEl(arr[i]); if(x) return x; }
  }catch(e){}
  return null;
}

function pouchFlash(){
  try{
    const b=pouchButtonEl(); if(!b || !b.classList) return;
    b.classList.remove('pouch-flash'); void b.offsetWidth; b.classList.add('pouch-flash');
    setTimeout(()=>{ try{ b.classList.remove('pouch-flash'); }catch(e){} }, 760);
  }catch(e){}
}

function flyToPouch(srcEl, iconHTML, done){
  const finish=()=>{ if(done) done(); };
  try{
    const pouch=pouchButtonEl();
    const r=pouch && pouch.getBoundingClientRect ? pouch.getBoundingClientRect() : null;
    const ok=!!(pouch && r && (r.width||r.height) && document.body && document.createElement && window.requestAnimationFrame);
    if(!(typeof fx==='function' && fx()) || !ok){ pouchFlash(); return finish(); }
    let src=null;
    if(srcEl && srcEl.getBoundingClientRect){ const a=srcEl.getBoundingClientRect(); if(a && (a.width||a.height)) src=a; }
    const x=src?(src.left+src.width/2):window.innerWidth/2;
    const y=src?(src.top+src.height/2):window.innerHeight*0.45;
    const tX=r.left+r.width/2, tY=r.top+r.height/2;
    const fly=document.createElement('div');
    fly.className='fly-ico'; fly.innerHTML=iconHTML||'';
    fly.style.left=x+'px'; fly.style.top=y+'px';
    document.body.appendChild(fly);
    requestAnimationFrame(()=>{
      fly.style.transform=`translate(calc(-50% + ${tX-x}px), calc(-50% + ${tY-y}px)) scale(.5)`;
      fly.style.opacity='.2';
    });
    setTimeout(()=>{ try{ fly.remove(); }catch(e){} pouchFlash(); finish(); }, 560);
  }catch(e){ pouchFlash(); finish(); }
}

function gainPotion(p, srcEl){
  if(!p) return;
  G.potions.push(p);
  flyToPouch(srcEl || dropSourceEl(), potionIcon(p));
}
function weightedRelic(){
  
  
  
  const _heroOK=r=>(!r.hero || r.hero===G.hero) && (!r.mile || mileClaimed(r.mile));
  let avail=RELICS.filter(r=>_heroOK(r) && !hasRelic(r.id) && mileOn('relic',r));
  if(!avail.length) avail=RELICS.filter(r=>_heroOK(r) && !hasRelic(r.id));
  const pool=avail.length? avail : RELICS.filter(_heroOK);
  for(let attempt=0; attempt<6; attempt++){
    const r=rng()*100; const rarity=r<55?'white':r<85?'blue':r<97?'purple':'gold';
    const p=pool.filter(x=>x.rarity===rarity);
    if(p.length) return p[Math.floor(rng()*p.length)];
  }
  return pool[Math.floor(rng()*pool.length)];
}
function showRelicReward(){
  
  
  
  const _heroOK=r=>(!r.hero || r.hero===G.hero) && (!r.mile || mileClaimed(r.mile));
  let unowned = RELICS.filter(r=>_heroOK(r) && !hasRelic(r.id) && mileOn('relic',r));
  if(!unowned.length) unowned = RELICS.filter(r=>_heroOK(r) && !hasRelic(r.id));
  if(!unowned.length){ goNext(); return; }
  const picks = shuffle([...unowned]).slice(0,3);
  G.relicPicks=picks;
  const html=picks.map((r,i)=>`<div class="relic ${RCOLOR[r.rarity]}" data-ri="${i}" onclick="pickRelic(${i})">${relicIcon(r)}<div class="cname" data-tip="relic:${r.id}">${r.name}</div><div class="cdesc">${r.desc}</div><div class="ctype">遗物 · ${RNAME[r.rarity]}</div></div>`).join('');
  
  dropUI(`<div class="drop-head"><h2>获得遗物 · 三选一</h2><p>遗物本局永久生效，点击获得</p></div><div class="reward-cards">${html}</div><button class="btn ghost drop-skip" onclick="skipRelic()">跳过</button>`);
}

function pickRelic(i){
  const r=G.relicPicks[i];
  /* 推进必须无条件发生，异常时宁可丢动画也要进地图 */
  let advanced=false;
  const go=()=>{ if(advanced) return; advanced=true; dropUIHide(); goNext(); };
  try{ sfx(relicSfxFor(r)); log(`获得遗物【${r.name}】`); }catch(e){}
  
  let el=null; try{ el=document.querySelector('.reward-cards .relic[data-ri="'+i+'"] .ricon'); }catch(e){}
  try{ grantRelic(r, el, go); }catch(e){ go(); }
}
function skipRelic(){ dropUIHide(); goNext(); }

function showCampfire(){
  G.campRemoved=false; G.campActed=false;
  SCENE='camp'; saveRun();
  setBGM('shop'); 
  renderCampfire();
}
function renderCampfire(){
  /* 营地整屏背景写在 render 里：续档直呼 renderCampfire 不走入口 */
  setBg('campfire.jpg');
  if(G.deck.length<=1 && !G.campRemoved){ G.campRemoved=true; }
  const removeBtn = G.campRemoved
    ? `<p style="color:var(--green)">✓ 已删牌</p>`
    : `<button class="btn ghost" onclick="campRemoveCard()">删牌 · 调整牌组（可选）</button>`;
  const actionBtns = G.campActed
    ? `<p style="color:var(--green)">✓ 已从锻造/休息中二选一</p>`
    : `<button class="btn" onclick="showForgePicker()">锻造（升级一张牌）</button>
       <button class="btn ghost" onclick="showRestConfirm()">休息（恢复 20 生命）</button>`;
  const leaveBtn = G.campActed
    ? `<button class="btn" onclick="hideOverlay(); goNext();">离开篝火</button>`
    : `<p style="color:var(--dim)">完成「锻造」或「休息」即可离开。</p>`;
  showOverlay(`<h2>篝 火</h2>${runStatusHTML()}<p>火光驱散寒意。<br>删牌可选；锻造与休息二选一。</p>
    ${removeBtn}
    ${actionBtns}
    ${leaveBtn}`);
}
function restAtCamp(){ heal(20); log('在篝火旁休息，恢复 20 生命'); G.campActed=true; saveRun(); renderCampfire(); }
function showRestConfirm(){
  
  if(G.tutorial && G.tutorial.on && !G.campActed){ floatMsg('先听师父的话，锻造一道符'); return; }
  showOverlay(`<h2>休息 · 恢复 20 生命</h2><p>当前生命 ${G.hp}/${G.maxHp}。确定休息恢复 20 点生命吗？（与锻造二选一）</p>
    <button class="btn" onclick="restAtCamp()">确定 · 休息</button>
    <button class="btn ghost" onclick="renderCampfire()">返回</button>`);
}
function campRemoveCard(){
  if(G.deck.length<=1){ floatMsg('牌组只剩一张了'); return; }
  
  const cards=G.deck.map((c,i)=>`<div class="card has-frame ${RCOLOR[c.rarity]}" data-fi="${i}" onclick="doCampRemove(${i})">${cardBody(c)}</div>`).join('');
  showOverlay(`<h2>篝火 · 删牌</h2><p>选择一张牌从牌组移除（仅限一张，免费）</p><div class="reward-cards">${cards}</div><button class="btn ghost" onclick="renderCampfire()">返回</button>`);
}
function doCampRemove(i){
  const c=G.deck[i];
  if(c && c.id==='shi_wang'){ floatMsg('【尸王】不可删除'); log('【尸王】不可删除'); return; }
  
  let el=null; try{ el=document.querySelector('.reward-cards [data-fi="'+i+'"]'); }catch(e){}
  cardFxAnim(el, 'pile', ()=>{
    const cc=G.deck.splice(i,1)[0]; log(`删除一张【${cc.name}】`);
    G.campRemoved=true; saveRun(); renderCampfire();
  });
}
function showForgePicker(from){
  if(!G.deck.length){ floatMsg('牌组已空'); return; }
  G.forgeFrom=from||'camp';
  const _fo=G.deck.map((c,i)=>({c,i})).sort((a,b)=>{ const ra=(a.c.up||!canUpgrade(a.c))?1:0, rb=(b.c.up||!canUpgrade(b.c))?1:0; return ra-rb||a.i-b.i; });
  const cards=_fo.map(({c,i})=>forgeCardHTML(c,i)).join('');
  const hint = G.forgeFrom==='camp' ? '与休息二选一。' : '';
  const back = G.forgeFrom==='camp'
    ? `<button class="btn ghost" onclick="G.forgeFrom=null; renderCampfire();">返回</button>`
    : `<button class="btn ghost" onclick="G.forgeFrom=null; hideOverlay(); goNext();">继续前进</button>`;
  showOverlay(`<h2>锻造 · 点击一张牌升级</h2><p>左边是当前效果，右边是升级后的效果（整局有效）。${hint}</p><div class="reward-cards">${cards}</div>${back}`, undefined, 'forge-scene');
}

function canUpgrade(c){
  try{
    if(String(c.t(false))!==String(c.t(true))) return true;
    const _u=_costPick(c.costU);
    return _u!=null && _u!==_costPick(c.cost);
  }catch(e){ return true; }
}
function forgeCard(i){
  if(CARD_ACT_BUSY) return;                        
  const c=G.deck[i];
  
  if(G.tutorial && G.tutorial.on && G.tutorial.node===3 && !G.campActed && c.id!=='leifu'){ floatMsg('先听师父的话，拣那道【雷符】'); return; }
  if(c.up){ floatMsg('这张牌已升级过'); log('这张牌已经升级过了'); return; }
  if(!canUpgrade(c)){ floatMsg('不可升级'); log(`【${c.name}】没有可升级的变化，无法锻造`); return; }
  sfx('ui_levelup');   
  
  let el=null; try{ el=document.querySelector('.reward-cards [data-fi="'+i+'"]'); }catch(e){}
  CARD_ACT_BUSY=true;
  cardFxAnim(el, 'forge', ()=>{
    CARD_ACT_BUSY=false;                           
    c.up=true; log(`锻造升级【${c.name}】`);
    if(G.forgeFrom==='camp'){
      G.campActed=true; G.forgeFrom=null; saveRun(); renderCampfire();
      if(G.tutorial && G.tutorial.on && typeof tutOn==='function'){ try{ tutOn('forged'); }catch(e){} }   
    }
    else { G.forgeFrom=null; hideOverlay(); goNext(); }
  });
}

function cardFxAnim(el, kind, done){
  const finish=()=>{ if(done) done(); };
  try{
    const canAnim = el && el.classList && document.body && (typeof fx==='function' && fx());
    if(!canAnim) return finish();
    
    if(kind==='forge'){ try{ sfx('fx_forge'); }catch(e){} }
    else { try{ sfx('fx_burn'); }catch(e){} }
    if(kind==='forge'){
      el.classList.add('is-forging');
      setTimeout(()=>{
        el.classList.add('is-blown');
        setTimeout(()=>{ try{ el.classList.remove('is-forging','is-blown'); }catch(e){} finish(); }, 470);
      }, 650);
    } else {
      el.classList.add('is-burning');
      setTimeout(()=>{
        el.classList.add('is-ash');
        setTimeout(()=>{ try{ el.classList.remove('is-burning','is-ash'); }catch(e){} finish(); }, 370);
      }, 800);
    }
  }catch(e){ finish(); }
}

/* 鬼市商店 */
function priceFor(c){ return {white:4, blue:8, purple:12, gold:12}[c.rarity] + (G.shopMarkup||0); }
function removeCost(){ return 4 + 4*G.removeCount; }
function showShop(){
  if(G.shopWares==null){ G.shopWares=[]; while(G.shopWares.length<6){ G.shopWares.push(weightedCard()); } G.shopPotions=[randomPotion(), randomPotion()]; }
  SCENE='shop'; saveRun();
  setBGM('shop'); 
  renderShop();
}
function renderShop(){
  
  setBg('shop.jpg');
  
  if(G.tutorial && G.tutorial.on){ renderTutShop(); return; }
  const cards=G.shopWares.map((c,i)=>{ const p=priceFor(c); const ok=G.gold>=p; return `<div class="card has-frame ${RCOLOR[c.rarity]} ${ok?'':'disabled'}" data-ri="${i}" onclick="askBuyCard(${i})">${cardBody(c)}<div class="card-extra" style="color:${ok?'var(--gold)':'var(--red)'};font-weight:bold">${p} 金币${ok?'':' · 金币不足'}</div></div>`; }).join('') || '<p style="color:var(--dim)">货已售罄</p>';
  
  const potions=(G.shopPotions||[]).map((p,i)=>{ const price=potionPrice(); const base=potionPriceBase(); const ok=G.gold>=price; const priceTxt=(price!==base)?`<s class="price-old">${base}</s> <b class="price-new">${price}</b>`:`${price}`; return `<div class="relic r-blue ${ok?'':'disabled'}" data-ri="${i}" onclick="askBuyPotion(${i})">${potionIcon(p)}<div class="cname">${p.name}</div><div class="cdesc">${p.desc}</div><div class="ctype" style="color:${ok?'var(--gold)':'var(--red)'}">${priceTxt} 金币</div></div>`; }).join('');
  showOverlay(`<h2>鬼 市</h2>${runStatusHTML()}<p>你带着 <b style="color:var(--gold)">${G.gold}</b> 金币。<br>买卡价格随购买递增，跨商店延续；灵汁每买一瓶更贵。</p>
    <div class="reward-cards">${cards}</div>
    <div style="color:var(--gold);margin:8px 0 2px">— 灵汁 —</div>
    <div class="reward-cards">${potions}</div>
    <button class="btn ghost" onclick="removeCard()">删一张牌（${removeCost()} 金币${G.gold<removeCost()?' · <span style="color:var(--red)">金币不足</span>':''}）</button>
    <button class="btn ghost" onclick="hideOverlay(); showMap();">返回地图</button>
    <button class="btn" onclick="hideOverlay(); goNext();">继续前进</button>`);
}
/* 教程鬼市专属版 */
function renderTutShop(){
  const N=TUT_NODES[G.tutorial.node];
  const F=G.tutorial.flags;
  const cards=G.shopWares.map((c,i)=>{ const p=priceFor(c); const ok=G.gold>=p; return `<div class="card has-frame ${RCOLOR[c.rarity]} ${ok?'':'disabled'}" data-ri="${i}" onclick="askBuyCard(${i})">${cardBody(c)}<div class="card-extra" style="color:${ok?'var(--gold)':'var(--red)'};font-weight:bold">${p} 冥钱${ok?'':' · 不足'}</div></div>`; }).join('') || '<p style="color:var(--dim)">符已卖完</p>';
  let relicSlot;
  if(F.relicBought){ relicSlot='<p style="color:var(--green)">✓ 法宝已请</p>'; }
  else {
    const r=RELICS.find(x=>x.id===N.relic);
    const ok=G.gold>=N.relicPrice;
    relicSlot=`<div class="relic ${RCOLOR[r.rarity]} ${ok?'':'disabled'}" onclick="tutBuyRelic()">${relicIcon(r)}<div class="cname">${r.name}</div><div class="cdesc">${r.desc}</div><div class="ctype" style="color:${ok?'var(--gold)':'var(--red)'}">${N.relicPrice} 冥钱 · 法宝</div></div>`;
  }
  const done=F.swordBought && F.relicBought;
  showOverlay(`<h2>鬼 市</h2>${runStatusHTML()}<p>你带着 <b style="color:var(--gold)">${G.gold}</b> 冥钱。</p>
    <div class="reward-cards">${cards}</div>
    <div style="color:var(--gold);margin:8px 0 2px">— 法宝 —</div>
    <div class="reward-cards">${relicSlot}</div>
    <button class="btn ghost" onclick="removeCard()">删一张牌（${removeCost()} 冥钱）</button>
    ${done?'<button class="btn" onclick="hideOverlay(); goNext();">继续前进</button>':'<p style="color:var(--dim)">先听师父的话：买下【斩妖剑】与【招魂幡】。</p>'}`);
}
function tutBuyRelic(){
  if(!G||!G.tutorial||!G.tutorial.on) return;
  const N=TUT_NODES[G.tutorial.node]; const F=G.tutorial.flags;
  if(F.relicBought) return;
  const r=RELICS.find(x=>x.id===N.relic); if(!r) return;
  if(G.gold<N.relicPrice){ floatMsg('冥钱不足'); return; }
  G.gold-=N.relicPrice; F.relicBought=true;
  grantRelic(r); sfx('gold'); log(`请得法宝【${r.name}】`);
  if(typeof narrate==='function') narrate('tut_2e','tut_2f');
  renderShop();
}
/* 教程结尾试玩符纸奖励 */
function showTutTrialReward(){
  const n=TRIAL_GIFT_N;
  const cards=Array.from({length:n}).map(()=>`<div class="relic r-gold">${artImg('ui/shiwanfuzhi.png','','')}<div class="cname">试玩符纸</div><div class="cdesc">选角页对一名未解锁角色试玩一局</div><div class="ctype">符纸</div></div>`).join('');
  showOverlay(`<h2>试 玩 符 纸</h2>`
    +`<p>破了僵王，为师赏你 <b style="color:var(--gold)">${n}</b> 张【试玩符纸】：<br>`
    +`往后在选角页，可对一名未解锁的角色<b>试玩一局</b>（进度 / 图鉴 / 排行榜照常计入）。</p>`
    +`<div class="reward-cards">${cards}</div>`
    +`<button class="btn" onclick="claimTutTrial()">收下 · 正式入塔</button>`);
}

function grantTutTrialOnce(){
  if(!SAVE || SAVE.trialGiftV1) return 0;
  SAVE.trialTickets=trialTickets()+TRIAL_GIFT_N;
  SAVE.trialGiftV1=true;
  persistSave();
  return TRIAL_GIFT_N;
}

function claimTutTrial(){
  const got=grantTutTrialOnce();
  if(got>0){ sfx('ui_reward'); floatMsg(`获得 ${got} 张【试玩符纸】 · 共 ${trialTickets()} 张`); log(`教程奖励：获得 ${got} 张试玩符纸`); }
  hideOverlay();
  goNext();   
}
function buyCard(i){
  const c=G.shopWares[i]; const p=priceFor(c);
  if(G.gold<p){ floatMsg(`金币不足（需 ${p}）`); log(`金币不足（需 ${p}）`); return; }
  G.gold-=p; G.deck.push(c); G.shopWares.splice(i,1); G.shopMarkup=(G.shopMarkup||0)+3; sfx('gold'); log(`购买【${c.name}】，商店剩余卡牌价格 +3`);
  
  if(G.tutorial && G.tutorial.on && c.id==='zhanyaojian' && !G.tutorial.flags.swordBought){
    G.tutorial.flags.swordBought=true;
    if(typeof narrate==='function') narrate('tut_2c','tut_2d');
  }

  
  updateGoldCompensation(c.rarity === 'gold');

  
  let el=null; try{ el=document.querySelector('.reward-cards .card[data-ri="'+i+'"]'); }catch(e){}
  
  flyToPile(el, iconTag('ui/card/back.png','牌堆'));

  saveRun(); renderShop();
}

function potionPriceBase(){ return 30 + 5*(G.potionBought||0); }

function potionPrice(){ const b=potionPriceBase(); return hasRelic('jubaopen') ? Math.max(1, Math.floor(b*0.7)) : b; }
function buyPotion(i){
  const price=potionPrice();
  if(G.gold<price){ floatMsg(`金币不足（需 ${price}）`); return; }
  const p=G.shopPotions[i]; if(!p) return;
  G.gold-=price; G.potionBought=(G.potionBought||0)+1;
  
  let pel=null; try{ pel=document.querySelector('.reward-cards .relic[data-ri="'+i+'"]'); }catch(e){}
  gainPotion(p, pel); G.shopPotions.splice(i,1);
  sfx('gold'); log(`花费 ${price} 金币购买灵汁【${p.name}】`); saveRun(); renderShop();
}
function removeCard(){
  if(G.deck.length<=1){ log('牌组只剩一张了'); return; }
  
  if(G.tutorial && G.tutorial.on){ const F=G.tutorial.flags; if(!(F.swordBought&&F.relicBought)){ floatMsg('先听师父的话'); return; } }
  renderRemoveList();
}
function renderRemoveList(){
  if(G.deck.length<=1){ log('牌组只剩一张了'); renderShop(); return; }
  const cost=removeCost();
  const cards=G.deck.map((c,i)=>`<div class="card has-frame ${RCOLOR[c.rarity]}" onclick="askDoRemove(${i})">${cardBody(c)}</div>`).join('');
  showOverlay(`<h2>删除牌组（${cost} 金币/张）</h2><p style="font-size:13px;color:var(--dim)">可连续删多张，费用随删除次数递增。当前金币 <b style="color:var(--gold)">${G.gold}</b>${G.gold<cost?'　<span style="color:var(--red)">金币不足</span>':''}</p><div class="reward-cards">${cards}</div><button class="btn ghost" onclick="renderShop()">完成 · 返回商店</button>`);
}
function doRemove(i){
  const p=removeCost();
  const tc=G.deck[i];
  if(tc && tc.id==='shi_wang'){ floatMsg('【尸王】不可删除'); log('【尸王】不可删除'); return; }
  if(G.gold<p){ floatMsg(`金币不足（需 ${p}）`); log(`金币不足（需 ${p}）`); return; }
  G.gold-=p; G.deck.splice(i,1); G.removeCount++; log('删除一张牌'); saveRun(); renderRemoveList();
}

/* 志怪图鉴 */
const KIND_LABEL = { ghost:'鬼', yao:'妖', jiangshi:'僵尸' };
const KIND_ICON = { ghost:'👻', yao:'🦊', jiangshi:'🧟' };
/* 拼串取用的素材路径在这里显式列全，否则打包闸会误报未使用 */
const TAG_ICON_PATHS = []
  .concat(['attack','heal','multi','discard','summon','qingsuan','wangyou','aoe','dormant'].map(n=>'ui/intent_'+n+'.png'))
  .concat(Object.keys(KIND_ICON).map(k=>'ui/kind_'+k+'.png'))
  .concat(AFFIXES.map(a=>'buff/'+a.id+'.png'));
const BESTIARY_ORDER = [
  'youhun','zhizharen','huyao','jiangshi','shanxiao','shuigui','mengpo',
  'baiwuchang','heiwuchang','huapigui','yecha',
  'niutou','mamian','wangchuan','panguan','juhunshi','niumamian',
  'xiuluo','luosha','mingwei','yanluo','xiuluojiang',
  'jiangwang','hanba','xueshi','xiebian','bian','yewang','xiaojianshi',
  'panguanwang','mengpowang','xiuluowang','yanluotianzi','yinchai'
];
const STORIES = {
  youhun:'乱葬岗上飘荡的无名之魂，执念未消，见人便索命。生前是谁，早已无人记得。',
  zhizharen:'纸糊的童子，点上朱砂便有了灵。它替人守丧，也替人害命——只看扎它的人，安的是什么心。',
  huyao:'修行成精的狐狸，最喜化作美人。它不吃人，只勾魂，谈笑间便摄走你的心魄。',
  jiangshi:'尸身不腐，怨气所结。僵而不死，跳而不走，见活物便扑，唯惧符咒与日光。',
  shanxiao:'独脚多毛的山精，力大无穷。它爱与樵夫角力，输了的人，被拖进深山再无声息。',
  shuigui:'溺水而亡者的怨魂，潜伏水底，专寻替死之人。你走近水边，它便来拽你的脚。',
  mengpo:'奈何桥边熬汤的鬼，替孟婆守着汤锅。它舀一勺汤泼来，你便忘了自己要出什么牌。',
  baiwuchang:'谢必安，勾魂使者。白衣白帽，笑脸勾魂，一索下去，三魂七魄跟着走。',
  heiwuchang:'范无救，与白无常同巡阴阳。黑衣铁索，专收阳寿已尽之人。',
  huapigui:'恶鬼披人皮，昼则如常人，夜则剥皮为鬼。皮囊之下，不知何等狰狞。',
  yecha:'佛经中的凶神，青面獠牙，力能拔山。既护法，也噬人，只看你落在哪一边。',
  jiangwang:'百年老僵，僵中称王。它已不惧符咒，反能号令群僵，最嗜生人血气。',
  xiebian:'白无常本尊，幽冥第一勾魂使。它亲自来收你，你的名字，早已上了生死簿。',
  bian:'谢必安分出的化身，一分为二，勾魂索命。看似势弱，联手却更难缠。',
  yewang:'幽冥塔顶之主，黑夜的化身。它不勾魂，不索命——它让黑暗本身，来吞没你。',
  hanba:'旱魃，僵尸修成的大凶。所过之处赤地千里，天不雨，地生烟，被它缠上，如堕火窟。',
  xueshi:'以血为食的尸魔，越饮越强。它的伤口会自己愈合，你的血，是它最爱的补品。',
  xiaojianshi:'僵王随手点化的仆从，僵而不死，源源不绝。单只不足惧，成片便要命。',
  niutou:'阴司的牛头差役，力大无穷，手持钢叉，专拿阳寿未尽却私逃的魂魄。',
  mamian:'马面与牛头同列阴差，奔走阴阳，踏雾而行，追魂索命，闻风丧胆。',
  wangchuan:'忘川河畔徘徊的幽魂，忘了自己是谁，只记得要拉过河的人下水。',
  panguan:'冥府判官，执笔定生死。他翻看你的一生，朱笔一勾，便是结局。',
  juhunshi:'手持锁魂链的阴差，链上缠着无数不肯离去的魂魄，叮当作响。',
  niumamian:'牛头马面联手，阴差中最凶的一对。一个撞，一个踏，魂魄难逃。',
  xiuluo:'六道中的阿修罗，好勇斗狠，越战越强，天生为厮杀而生。',
  luosha:'罗刹夜叉，嗜血好杀，越是受伤越是凶暴，唯有符咒能镇。',
  mingwei:'幽冥塔的守卫，无面无口，只知持戟而立，挡在生者面前。',
  yanluo:'十殿阎罗之一，掌生死轮回。他问你一句，你便答不上来。',
  xiuluojiang:'修罗军中的悍将，三头六臂，专食生人血气。它为王前驱，冲杀在前。',
  panguanwang:'冥府判官之首，执掌生死簿。朱笔一勾，你的阳寿便尽了；它要你三更死，谁敢留人到五更。',
  mengpowang:'守着奈何桥的孟婆本尊。她熬的汤能让人忘了前世今生——她若亲自喂你，你连自己是谁都会忘。',
  xiuluowang:'修罗之王，业火缠身。它端坐幽冥塔高层，凡与它为敌者，未近其身，先受业火焚心之刑。',
  yanluotianzi:'幽冥之主，掌轮回生灭。你以为杀死了它，它却堕入轮回，浴火重生，阴气更盛。',
  yinchai:'阴司最普通的差役，锁链一甩，专拿生魂。它记不住你的脸，只记得你的名字。'
};
const SAVE_KEY = 'zhiguaitower_save_v1';
let SAVE = { unlocked:[] };
function loadSave(){
  
  try{
    const d=Store.getJSON(SAVE_KEY);
    SAVE = (d && typeof d==='object' && !Array.isArray(d)) ? d : {};
    if(!Array.isArray(SAVE.unlocked)) SAVE.unlocked=[];
    if(!SAVE.progress || typeof SAVE.progress!=='object') SAVE.progress={};
    const p=SAVE.progress;
    p.pts=p.pts|0; p.runs=p.runs|0; p.wins=p.wins|0; p.bestAct=p.bestAct|0; p.kills=p.kills|0;
    
    if(!p.heroes || typeof p.heroes!=='object' || Array.isArray(p.heroes)) p.heroes={};
    const hs=p.heroes;
    Object.keys(hs).forEach(k=>{
      const h=hs[k];
      if(!h || typeof h!=='object'){ hs[k]={pts:0,runs:0,wins:0}; return; }
      h.pts=h.pts|0; h.runs=h.runs|0; h.wins=h.wins|0;
    });
    
    if(!SAVE.mileResetV2){
      p.pts=0; p.heroes={};
      SAVE.mile=[]; SAVE.mileClaimed=[];
      SAVE.mileResetV2=true;
      persistSave();
    }
    if(!Array.isArray(SAVE.mile)) SAVE.mile=[];
    
    if(!Array.isArray(SAVE.mileClaimed)) SAVE.mileClaimed=[];
    
    if(!Array.isArray(SAVE.unlockedHeroes)) SAVE.unlockedHeroes=[];
    SAVE.mileTickets = Math.max(0, SAVE.mileTickets|0);
    
    SAVE.trialTickets = Math.max(0, SAVE.trialTickets|0);
    
    if(!Array.isArray(SAVE.redeemedCodes)) SAVE.redeemedCodes=[];
  }
  catch(e){ SAVE={unlocked:[], progress:{pts:0,runs:0,wins:0,bestAct:0,kills:0,heroes:{}}, mile:[], mileClaimed:[], unlockedHeroes:[], mileTickets:0, trialTickets:0, trialGiftV1:false, redeemedCodes:[], mileResetV2:true}; }
  /* 旧调试开关把 pts 写死哨兵值：这里只归零点数，已解锁的不动 */
  if(!SAVE.mileResetV3){ mileCleanupDebugSentinel(); SAVE.mileResetV3=true; persistSave(); }
  
  SAVE.trialGiftV1 = !!SAVE.trialGiftV1;
}
function persistSave(){
  try{ Store.setJSON(SAVE_KEY, SAVE); }catch(e){}
  if(typeof cloudMarkDirty === 'function'){ try{ cloudMarkDirty(); }catch(e){} }   
}

const MILE_DEBUG_SENTINEL = 999999;
function mileCleanupDebugSentinel(){
  if(!SAVE || typeof SAVE!=='object') return;
  const p=SAVE.progress;
  if(!p || typeof p!=='object') return;
  if(!p.heroes || typeof p.heroes!=='object' || Array.isArray(p.heroes)) p.heroes={};
  
  if((p.pts|0)>=MILE_DEBUG_SENTINEL) p.pts=0;
  Object.keys(p.heroes).forEach(k=>{ const h=p.heroes[k]; if(h && (h.pts|0)>=MILE_DEBUG_SENTINEL) h.pts=0; });
}
/* 里程碑判定 */

function milePts(heroId){
  const p=(SAVE && SAVE.progress) || {};
  if(heroId){
    const h=(p.heroes||{})[heroId];
    return (h && (h.pts|0)) || 0;
  }
  return p.pts|0;
}

function mileDone(id){ return !!(SAVE && SAVE.mile && SAVE.mile.indexOf(id) >= 0); }

function mileClaimed(id){ return !!(SAVE && SAVE.mileClaimed && SAVE.mileClaimed.indexOf(id) >= 0); }

function mileTickets(){ return Math.max(0, (SAVE && SAVE.mileTickets)|0); }

const TRIAL_GIFT_N = 3;
function trialTickets(){ return Math.max(0, (SAVE && SAVE.trialTickets)|0); }
/* 兑换码 */
const REDEEM_CODES = {
  'hijjust666': { label:'入门符纸', kind:'mileTicket', n:1,
                  desc:'选角页解锁一名未解锁角色' },
};
function redeemedCodes(){
  if(!SAVE) return [];
  if(!Array.isArray(SAVE.redeemedCodes)) SAVE.redeemedCodes=[];
  return SAVE.redeemedCodes;
}
function codeRedeemed(code){ return redeemedCodes().indexOf(code)>=0; }

function redeemCode(raw){
  const code=String(raw==null?'':raw).trim().toLowerCase();
  if(!code) return 'empty';
  const def=REDEEM_CODES[code];
  if(!def) return 'invalid';
  if(codeRedeemed(code)) return 'used';
  if(def.kind==='mileTicket') SAVE.mileTickets = mileTickets() + (def.n|0);
  redeemedCodes().push(code);
  persistSave();
  log(`兑换码 ${code} 生效：+${def.n|0} 张【${def.label}】`);
  return 'ok';
}

function showRedeemPanel(){
  showOverlay(`<h2>兑 换 码</h2>
    <p>输入兑换码，领取奖励：<br><small style="color:var(--dim);font-size:12px">每个码只能兑换一次</small></p>
    <input id="redeemInput" type="text" placeholder="在此输入兑换码" autocapitalize="off" autocomplete="off"
           style="width:100%;box-sizing:border-box;padding:10px;border-radius:8px;border:1px solid var(--gold);background:rgba(0,0,0,.35);color:var(--fg);font-size:16px;text-align:center;letter-spacing:2px"
           onkeydown="if(event.key==='Enter')submitRedeem()">
    <button class="btn" onclick="submitRedeem()">兑 换</button>
    <button class="btn ghost" onclick="showSettings()">返回设置</button>`, undefined, 'scroll-scene');
  const el=document.getElementById('redeemInput');
  if(el){ try{ el.focus(); }catch(e){} }
}
function submitRedeem(){
  const el=document.getElementById('redeemInput');
  const code=String((el&&el.value)||'').trim().toLowerCase();
  const def=REDEEM_CODES[code];
  const r=redeemCode(el?el.value:'');
  if(r==='ok'){
    sfx('ui_reward');
    floatMsg(`兑换成功 · +${def.n|0} 张【${def.label}】`);
    showOverlay(`<h2>兑 换 成 功</h2>
      <p>获得 <b style="color:var(--gold)">${def.n|0}</b> 张【${def.label}】：<br><small style="color:var(--dim);font-size:12px">${def.desc}；共 ${mileTickets()} 张</small></p>
      <div class="reward-cards"><div class="relic r-gold">${artImg('ui/rumenfuzhi.png','','')}<div class="cname">${def.label}</div><div class="cdesc">${def.desc}</div><div class="ctype">符纸</div></div></div>
      <button class="btn" onclick="showSettings()">收 下</button>`);
    return;
  }
  if(r==='empty'){ floatMsg('请输入兑换码'); return; }
  if(r==='used'){ floatMsg('该兑换码已兑换过'); return; }
  floatMsg('兑换码无效');
}

function trialHeroOn(id){ return !!(G && G.trialHero && id && G.trialHero===id); }

function heroUnlocked(id){ return !!(SAVE && SAVE.unlockedHeroes && SAVE.unlockedHeroes.indexOf(id)>=0); }

function unlockHeroWithTicket(id){
  if(!id || id==='tianshi' || heroUnlocked(id)) return false;
  if(typeof HEROES!=='undefined' && !HEROES.some(h=>h && h.id===id)) return false;
  if(mileTickets() < 1) return false;
  SAVE.mileTickets = mileTickets() - 1;
  if(!Array.isArray(SAVE.unlockedHeroes)) SAVE.unlockedHeroes=[];
  SAVE.unlockedHeroes.push(id);
  persistSave();
  
  tapAchieveProgress('Get-all', 1 + ((SAVE.unlockedHeroes||[]).length));
  return true;
}

function unlockHeroWithTrialTicket(id){
  if(!id || id==='tianshi' || heroUnlocked(id)) return false;
  if(typeof HEROES!=='undefined' && !HEROES.some(h=>h && h.id===id)) return false;
  if(trialTickets() < 1) return false;
  SAVE.trialTickets = trialTickets() - 1;
  if(!G) return false;
  G.trialHero = id;                 
  persistSave();
  return true;
}

function _mileObj(kind,key){
  const list = kind==='card' ? CARDS : RELICS;
  if(key && typeof key==='object') return key;
  return list.find(x=>x.id===key) || null;
}

function mileRewardOf(nodeId){
  if(!nodeId) return null;
  if(typeof CARDS!=='undefined' && CARDS && CARDS.length){
    const c=CARDS.find(x=>x && x.mile===nodeId);
    if(c) return { rel:'card/'+c.id+'.png', name:c.name||'', desc:c.desc||'' };
  }
  if(typeof RELICS!=='undefined' && RELICS && RELICS.length){
    const r=RELICS.find(x=>x && x.mile===nodeId);
    if(r) return { rel:'relic/'+r.id+'.png', name:r.name||'', desc:r.desc||'' };
  }
  return null;
}
/* 门禁核心：查不到条目一律放行，绝不静默蒸发内容 */
function mileOn(kind,key){
  
  if(kind==='card' || kind==='relic'){
    const o=_mileObj(kind,key);
    if(o && o.mile && !mileClaimed(o.mile)) return false;
  }
  if(!MILE_GATE_ON) return true;                            
  if(kind==='hero'){
    if(key==='tianshi') return true;                        
    
    if(trialHeroOn(key)) return true;
    
    if(typeof HEROES!=='undefined' && !HEROES.some(h=>h && h.id===key)) return true;
    return !!(SAVE && SAVE.unlockedHeroes && SAVE.unlockedHeroes.indexOf(key)>=0);
  }
  if(kind==='card' || kind==='relic'){
    const o=_mileObj(kind,key);
    if(!o) return true;
    if(o.rarity==='white' || o.rarity==='blue') return true;  
    const m=MILESTONES.find(x=> kind==='card' ? x.advCards : x.advRelics);   
    return !m || mileDone(m.id);
  }
  if(kind==='potion'){
    if(MILE_BASE_POTIONS.indexOf(key)>=0) return true;          
    const m=MILESTONES.find(x=>x.potions && x.potions.indexOf(key)>=0);
    return !m || mileDone(m.id);
  }
  return true;
}
const MILE_BASE_POTIONS=['huanyanglu','huangquanjiu','zhenhunshui','mengpotang'];
/* 每次结算只补增量；复活后多出来的里程下次结清 */
function grantRunMilestones(){
  if(!G) return [];
  if(!SAVE.progress || typeof SAVE.progress!=='object') SAVE.progress={};
  const p=SAVE.progress;
  const full=milePointsFor(G);                              
  const prev=(G._mileGranted|0);
  const pts=Math.max(0, full-prev);                         
  G._mileGranted=full;
  G._mileGain=(G._mileGain|0)+pts;                          
  G._mileParts=mileParts(G);                                
  p.pts=(p.pts|0)+pts;
  
  const heroId=(G.hero && typeof HEROES!=='undefined' && HEROES.some(h=>h.id===G.hero)) ? G.hero : 'tianshi';
  if(!p.heroes || typeof p.heroes!=='object' || Array.isArray(p.heroes)) p.heroes={};
  const hp=p.heroes[heroId] || (p.heroes[heroId]={pts:0,runs:0,wins:0});
  hp.pts=(hp.pts|0)+pts;
  if(!G._mileCounted){                                       
    G._mileCounted=true;
    const won=!!G.finalBoss;                                
    p.runs=(p.runs|0)+1; if(won) p.wins=(p.wins|0)+1;
    p.bestAct=Math.max(p.bestAct|0, G.act|0);
    p.kills=(p.kills|0)+(G.totalKills|0);
    hp.runs=(hp.runs|0)+1; if(won) hp.wins=(hp.wins|0)+1;
    
    tapAchieveProgress('No-matter-Who', Object.keys(p.heroes).filter(k => p.heroes[k] && (p.heroes[k].wins|0) > 0).length);
  }
  const fresh=[];
  if(!SAVE.mile) SAVE.mile=[];
  mileNodesFor(heroId).forEach(n=>{                         
    if(n.need!=null && (hp.pts|0)>=n.need && SAVE.mile.indexOf(n.id)<0){
      SAVE.mile.push(n.id); fresh.push(n);
    }
  });
  /* 角色不再按里程自动放行（旧的 heroes 字段会让一局就解锁下个角色） */
  MILESTONES.forEach(m=>{
    if((p.pts|0)>=m.need && SAVE.mile.indexOf(m.id)<0){
      SAVE.mile.push(m.id); fresh.push(m);
    }
  });
  persistSave();
  if(fresh.length) unlockSfx();                             
  return fresh;
}
/* 解锁界面 */

let MILE_HERO='';                       
let MILE_NODES=[];                      

/* 节点按等距槽位定位：线性映射会让前几档挤成一团 */
function mileSlotPct(i, slots){ return slots>0 ? ((i + .5) / slots * 100) : 0; }

function mileNodesFor(heroId){
  const t=(typeof MILE_TRACKS!=='undefined') ? MILE_TRACKS[heroId] : null;
  if(t && t.nodes && t.nodes.length) return t.nodes.slice();
  const mystery=(typeof MILE_MYSTERY!=='undefined') && heroId===MILE_MYSTERY.id;
  const out=[];
  for(let i=0;i<MILE_TIER_COUNT;i++){
    const tier=i+1, last=(tier===MILE_TIER_COUNT);
    if(mystery){
      out.push({ id:heroId+'_t'+tier, tier:tier, need:null, unknown:true,
        name:'?', desc:'新角色的里程碑将在后续版本揭晓。' });
    }else{
      out.push({ id:heroId+'_t'+tier, tier:tier, need:null, pending:true, ticket:last,
        name: last ? '入门符纸' : '奖励待定',
        desc: last ? '可任选一名角色解锁。' : '档位奖励与里程数待定稿。' });
    }
  }
  return out;
}

function mileFillPct(nodes, pts){
  const slots=nodes.length+1;
  const p0=Math.max(0, pts|0);
  if(p0<=0) return 0;
  const anchors=[{p:0, x:0}];
  nodes.forEach((n,i)=>{ if(n.need!=null) anchors.push({p:n.need, x:mileSlotPct(i, slots)}); });
  if(anchors.length<2) return 0;                    
  for(let k=0;k<anchors.length;k++){
    const a=anchors[k], b=anchors[k+1];
    if(!b) return a.x;                              
    if(p0 < b.p){
      const span=(b.p-a.p)||1;
      const t=Math.max(0, Math.min(1, (p0-a.p)/span));
      return a.x + (b.x-a.x)*t;
    }
  }
  return anchors[anchors.length-1].x;
}

function mileClaim(nodeId){
  if(_mlPressFired){ _mlPressFired=false; return; }   
  const n=MILE_NODES.filter(x=>x.id===nodeId)[0];
  if(!n || n.pending || n.unknown || n.tail) return;
  const pts=milePts(MILE_HERO);
  if(pts<n.need){ sfx('error'); floatMsg('里程不足：还差 '+(n.need-pts)+' 点'); return; }
  
  if(mileClaimed(nodeId)) return;
  if(!Array.isArray(SAVE.mileClaimed)) SAVE.mileClaimed=[];
  SAVE.mileClaimed.push(nodeId);
  
  if(n.ticket){ SAVE.mileTickets = mileTickets() + 1; }
  persistSave();
  sfx('ui_reward'); sfx('ui_unlock');
  floatMsg(n.ticket ? `获得 1 张【入门符纸】 · 共 ${mileTickets()} 张` : ('已领取 · '+(n.name||'里程奖励')));
  const el=document.querySelector('.ml-node[data-mid="'+nodeId+'"]');
  if(el&&el.classList){
    el.classList.remove('can'); el.classList.add('claimed','claiming');
    
    const fx=document.createElement('span'); fx.className='ml-claimfx'; el.appendChild(fx);
    setTimeout(function(){ el.classList.remove('claiming'); if(fx.parentNode) fx.parentNode.removeChild(fx); }, 900);
    
    mileFlyOff(el);
  }
}

function mileFlyOff(el){
  try{
    if(!el || !el.getBoundingClientRect) return;
    const host=document.querySelector('.ml-root');
    if(!host || !host.getBoundingClientRect) return;
    const r0=el.getBoundingClientRect(), h0=host.getBoundingClientRect();
    if(!r0 || !h0) return;
    const img=el.querySelector ? el.querySelector('.ml-rwimg') : null;
    const fly=document.createElement('div');
    fly.className='ml-flyimg';
    fly.innerHTML = img ? img.outerHTML : '<span class="ml-flyemoji">🎫</span>';
    fly.style.left=Math.round(r0.left-h0.left+(r0.width/2)-26)+'px';
    fly.style.top =Math.round(r0.top -h0.top-16)+'px';
    host.appendChild(fly);
    setTimeout(function(){ if(fly.parentNode) fly.parentNode.removeChild(fly); }, 1250);
  }catch(e){}
}

let _mlPress=null, _mlPressFired=false;
function milePressStart(e,nodeId){
  milePressEnd();
  const el=(e && e.currentTarget) || null;
  _mlPress={ t:setTimeout(function(){ _mlPress=null; _mlPressFired=true; mileDetail(nodeId); }, 550) };
}
function milePressEnd(){
  if(_mlPress){ clearTimeout(_mlPress.t); _mlPress=null; }
}
function mileDetail(nodeId){
  const n=(MILE_NODES||[]).filter(x=>x.id===nodeId)[0];
  if(!n) return;
  const host=document.querySelector('.ml-root');
  if(!host || !host.querySelector) return;                 
  const old=host.querySelector('.ml-detail');
  if(old && old.parentNode) old.parentNode.removeChild(old);
  const rw=mileRewardOf(nodeId);
  const pts=milePts(MILE_HERO);
  const need=(n.need!=null) ? n.need : '待定';
  const got=mileClaimed(nodeId);
  const state=got ? '已领取' : ((n.need!=null && pts>=n.need) ? '可领取' : '未达成');
  const d=document.createElement('div');
  d.className='ml-detail';
  d.innerHTML=`<div class="ml-dtbox">`
    + (rw ? `<div class="ml-dtart">${artImg(rw.rel,'','ml-dtimg')}</div>` : '')
    + `<b class="ml-dtname">${rw?rw.name:(n.name||'')}</b>`
    + `<p class="ml-dtdesc">${(rw?rw.desc:(n.desc||''))||'—'}</p>`
    + `<div class="ml-dtmeta">里程 <b>${need}</b> · 当前 <b>${pts}</b> · ${state}</div>`
    + `<div class="ml-dthint">点击任意处关闭</div></div>`;
  host.appendChild(d);
  sfx('ui_poster');
  const close=function(){
    if(d.parentNode) d.parentNode.removeChild(d);
    try{ host.removeEventListener('pointerdown', close, true); }catch(e){}
  };
  
  setTimeout(function(){ try{ host.addEventListener('pointerdown', close, true); }catch(e){} }, 80);
}

const _mlDrag={on:false,x:0,sl:0,el:null,v:0,raf:0,pt:0,px:0};
function _mlNow(){ return (typeof performance!=='undefined'&&performance.now)?performance.now():Date.now(); }
function _mlStopInertia(){
  if(_mlDrag.raf){ try{ cancelAnimationFrame(_mlDrag.raf); }catch(err){} _mlDrag.raf=0; }
  _mlDrag.v=0;
}

function _mlInertia(){
  _mlDrag.raf=0;
  let last=_mlNow();
  const step=function(now){
    const dt=Math.max(1, now-last); last=now;
    const el=_mlDrag.el;
    if(!el||!_mlDrag.v){ _mlDrag.raf=0; return; }
    const before=el.scrollLeft;
    el.scrollLeft=before + _mlDrag.v*dt/1000;
    if(el.scrollLeft===before){ _mlDrag.v=0; _mlDrag.raf=0; return; }   
    const k=Math.abs(_mlDrag.v)<30 ? 0.00002 : 0.02;                    
    _mlDrag.v*=Math.pow(k, dt/1000);
    if(Math.abs(_mlDrag.v)<1.2) _mlDrag.v=0;
    _mlDrag.raf=Math.abs(_mlDrag.v)?requestAnimationFrame(step):0;
  };
  _mlDrag.raf=requestAnimationFrame(step);
}
function mileDragStart(e){
  if(e&&e.pointerType&&e.pointerType!=='mouse') return;      
  const sc=e&&e.currentTarget; if(!sc) return;
  if(e.target&&e.target.closest&&e.target.closest('.ml-box')) return;   
  _mlStopInertia();                                          
  _mlDrag.on=true; _mlDrag.x=e.clientX; _mlDrag.sl=sc.scrollLeft; _mlDrag.el=sc;
  _mlDrag.pt=_mlNow(); _mlDrag.px=sc.scrollLeft;
  if(sc.classList) sc.classList.add('grabbing');
  try{ if(sc.setPointerCapture) sc.setPointerCapture(e.pointerId); }catch(err){}
}
function mileDragMove(e){
  if(!_mlDrag.on||!_mlDrag.el) return;
  const dx=e.clientX-_mlDrag.x;
  _mlDrag.el.scrollLeft=_mlDrag.sl-dx;
  
  const now=_mlNow(), dt=now-_mlDrag.pt;
  if(dt>=12){ _mlDrag.v=(_mlDrag.el.scrollLeft-_mlDrag.px)/dt*1000; _mlDrag.pt=now; _mlDrag.px=_mlDrag.el.scrollLeft; }
  if(e.preventDefault) e.preventDefault();
}
function mileDragEnd(){
  if(_mlDrag.el&&_mlDrag.el.classList) _mlDrag.el.classList.remove('grabbing');
  _mlDrag.on=false;
  
  if(_mlDrag.v && Math.abs(_mlDrag.v)>=30 && typeof requestAnimationFrame==='function') _mlInertia();
  else { _mlDrag.v=0; _mlDrag.el=null; }
}
function viewMilestones(heroId){
  const heroes=(typeof HEROES!=='undefined'?HEROES:[]).filter(h=>h&&h.id);
  const cards=heroes.slice();
  if(typeof MILE_MYSTERY!=='undefined') cards.push(MILE_MYSTERY);   
  
  MILE_HERO=(heroId && cards.some(h=>h.id===heroId)) ? heroId : (heroes[0]?heroes[0].id:'');
  const cur=MILE_HERO;
  const myst=(typeof MILE_MYSTERY!=='undefined') && cur===MILE_MYSTERY.id;
  const nodes=mileNodesFor(cur);
  MILE_NODES=nodes;
  const pts=milePts(cur);
  const slots=nodes.length+1;                                
  const rail=cards.map(h=>{
    const on=h.id===cur;
    const isM=!!h.teaser;
    const nm=h.name||h.id;
    const hp=milePts(h.id);
    const hn=mileNodesFor(h.id);
    const hGot=hn.filter(n=>n.need!=null && hp>=n.need).length;
    const label=isM ? '? ? ?' : nm;
    const info=isM
      ? `<span class="ml-hinfo"><b>???</b><em>敬请期待</em></span>`
      : `<span class="ml-hinfo">里程<b>${hp}</b><em>${hGot}/${hn.length} 档</em></span>`;
    const fall=`<span class="ml-em">${isM?'?':nm.slice(0,1)}</span>`;
    return `<button class="ml-hcard${on?' on':''}${isM?' is-mystery':''}" aria-pressed="${on?'true':'false'}"`
      + ` aria-label="${isM?'敬请期待的新角色':nm}的里程碑"`
      + ` onclick="sfx('ui_poster');viewMilestones('${h.id}')">`
      + `<span class="ml-shotwrap">`
      + artImg('hero/'+h.id+'_poster.jpg', fall, 'ml-shot')
      + `<span class="ml-badge">${h.mech||''}</span><span class="ml-hnm">${label}</span></span>`
      + info + `</button>`;
  }).join('');
  const marks=nodes.map((n,i)=>{
    const pct=mileSlotPct(i, slots);
    const done=(n.need!=null && pts>=n.need);
    const got=mileClaimed(n.id);
    const rw=mileRewardOf(n.id);                          
    let cls='ml-node';
    if(n.unknown) cls+=' unknown'; else if(n.pending) cls+=' pending';
    if(done) cls+=' done';
    if(rw) cls+=' has-rw';                                
    if(!n.unknown && !n.pending) cls+= got?' claimed':(done?' can':'');
    const needTxt=(n.need!=null) ? n.need : '?';
    const state=n.unknown ? '未来角色'
      : n.pending ? (n.ticket ? '解锁角色' : '待定稿')
      : (got ? '已领取' : (done ? (n.ticket ? '点击领取符纸' : '点击领取') : '未达成'));
    const click=(n.unknown||n.pending) ? '' : ` onclick="mileClaim('${n.id}')"`;
    
    const press=` onpointerdown="milePressStart(event,'${n.id}')" onpointerup="milePressEnd()"`
      + ` onpointerleave="milePressEnd()" onpointercancel="milePressEnd()"`;
    
    const thumb=rw ? `<div class="ml-rw">${artImg(rw.rel,'','ml-rwimg')}</div>` : '';
    return `<div class="${cls}" data-mid="${n.id}" style="left:${pct}%">`
      + `<div class="ml-box"${click}${press}><b>${n.name}</b><span>${n.desc||''}</span>`
      + `<em class="ml-state">${state}</em></div>`
      + `<div class="ml-stem"></div><div class="ml-dot"></div>`
      + `<div class="ml-need">${needTxt}</div>${thumb}</div>`;
  }).join('');
  
  const tailMark=`<div class="ml-node ml-end" style="left:${mileSlotPct(nodes.length, slots)}%">`
    + `<div class="ml-box"><b>敬请期待</b><span>里程不设上限，后续版本继续加档。</span></div>`
    + `<div class="ml-stem"></div><div class="ml-dot"></div>`
    + `<div class="ml-need">∞</div></div>`;
  const fillPct=mileFillPct(nodes, pts);
  
  const narrow=((window.innerWidth||0)<=520 || (window.innerHeight||0)<=560);
  const spacing=narrow?158:200;
  const trackW=Math.max(560, Math.round(slots*spacing));
  const hint=MILE_GATE_ON
    ? '每局结束按此角色的战绩累积里程，达标即<b>永久解锁</b>。'
    : '<span style="color:var(--green)">测试期：门禁已关闭，全部内容可直接取用；里程仍会正常累积。</span>';
  showOverlay(`<div class="ml-root">
    <div class="ml-top">
      <span class="ml-title">里 程 碑</span>
      <span class="ml-sub">${myst?'敬请期待的新角色':heroName(cur)} · ${hint}</span>
    </div>
    <div class="ml-main">
      <div class="ml-heroes">${rail}</div>
      <div class="ml-stage">
        <div class="ml-scroll" onpointerdown="mileDragStart(event)" onpointermove="mileDragMove(event)"
             onpointerup="mileDragEnd()" onpointercancel="mileDragEnd()">
          <div class="ml-track" style="min-width:${trackW}px">
            <div class="ml-line"><i style="width:${fillPct}%"></i></div>
            ${marks}${tailMark}
          </div>
        </div>
      </div>
    </div>
    <div class="ml-ticket" aria-label="入门符纸存量">
      <span class="ml-ticket-ico">${iconTag('ui/rumenfuzhi.png','🎫')}</span><span class="ml-ticket-num">${mileTickets()}</span>
    </div>
  </div>`, true, 'mile-scene');
}

function unlockSfx(){ sfx('ui_unlock'); }
function unlockBestiary(key){
  if(!key || !ENEMIES[key]) return;
  if(SAVE.unlocked.includes(key)) return;
  SAVE.unlocked.push(key); persistSave();
  unlockSfx();   
  floatMsg('图鉴 · ' + ENEMIES[key].name);
  log(`【图鉴】收录「${ENEMIES[key].name}」`);
}
function viewBestiary(){
  const total=BESTIARY_ORDER.length;
  const got=BESTIARY_ORDER.filter(k=>SAVE.unlocked.includes(k)).length;
  const cards=BESTIARY_ORDER.map(k=>{
    const e=ENEMIES[k];
    const have=SAVE.unlocked.includes(k);
    const tag=e.boss?'👹 Boss':(e.elite?'☠ 精英':'');
    
    const art=artImg('enemy/'+k+'.png','','bportrait');
    if(!have){
      return `<div class="bcard locked">${art}<div class="bbody"><div class="bname">？？？</div><div class="bmeta">${tag||'未收录'}</div><div class="bstory">尚未收录——在战斗中击败它，即可解锁它的志怪故事。</div></div></div>`;
    }
    return `<div class="bcard">${art}<div class="bbody"><div class="bname">${e.name}${tag?` <span style="font-size:12px;color:var(--red)">${tag}</span>`:''}</div><div class="bmeta">${e.kind&&KIND_ICON[e.kind]?iconTag('ui/kind_'+e.kind+'.png', KIND_ICON[e.kind]):''}${KIND_LABEL[e.kind]||'怪'} · 生命 ${e.hp}</div><div class="bstory">${STORIES[k]||''}</div></div></div>`;
  }).join('');
  showOverlay(`<h2>志 怪 图 鉴</h2><p style="font-size:13px;color:var(--dim)">已收录 <b style="color:var(--gold)">${got}</b> / ${total} · 击败妖怪，把它们的志怪故事收进你的百鬼谱。</p><div id="bestiary-grid">${cards}</div>`, true, 'scroll-scene');
}


/* 每日签到 / 广告占位 */
function todayStr(){
  const d=new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function signedToday(){ return SAVE.lastSignIn===todayStr(); }
function adPlaceholder(name, reward){ AdSlot.request(name, reward); } 
function doSignIn(){
  if(signedToday()){ floatMsg('今日已签到'); return; }
  const y=new Date(); y.setDate(y.getDate()-1);
  const ystr=y.getFullYear()+'-'+String(y.getMonth()+1).padStart(2,'0')+'-'+String(y.getDate()).padStart(2,'0');
  SAVE.streak=(SAVE.lastSignIn===ystr)?(SAVE.streak||0)+1:1;
  SAVE.lastSignIn=todayStr();
  SAVE.signInBonus=(SAVE.signInBonus||0)+5;
  persistSave(); track('signIn');
  sfx('gold'); floatMsg(`签到成功 · 连续 ${SAVE.streak} 天 · +5 金币`);
  showStartScreen();
}
function doAdDouble(){
  if(!signedToday()){ floatMsg('请先签到'); return; }
  adPlaceholder('签到翻倍', ()=>{ SAVE.signInBonus=(SAVE.signInBonus||0)+5; persistSave(); });
  showStartScreen();
}
/* 埋点 */
function track(event){
  if(!SAVE.stats) SAVE.stats = {};
  const s = SAVE.stats;
  s[event] = (s[event]||0) + 1;
  persistSave();
}
function trackLaunch(){
  if(!SAVE.stats) SAVE.stats = {};
  const s = SAVE.stats;
  if(!s.days) s.days = {};
  const d = todayStr();
  s.days[d] = (s.days[d]||0) + 1;
  if(!s.firstSeen) s.firstSeen = d;
  s.lastSeen = d;
  persistSave();
}
/* 牌库 / 关键词 */
function viewKeywords(){
  const html=`<h2>关键词说明</h2><div class="kwlist">${KEYWORDS.map(([k,d])=>`<p style="margin-bottom:10px"><b>${k}</b>　<span>${d}</span></p>`).join('')}</div>`;
  showOverlay(html, true);
}
function viewRelics(){
  if(!G) return;
  const owned=G.relics;
  let html=`<h2>遗物图鉴</h2><p style="font-size:13px;color:var(--dim)">击败精英可三选一获得遗物，本局永久生效。</p><div class="kwlist">`;
  html+=RELICS.map(r=>{
    const have=owned.includes(r.id);
    return `<p style="margin-bottom:10px;${have?'':'opacity:.4'}"><b style="color:${have?'var(--gold)':'var(--dim)'}">${r.name}</b>${have?' <span style="color:var(--green)">✓已获得</span>':''}　<span>${r.desc}</span></p>`;
  }).join('');
  html+=`</div>`;
  showOverlay(html, true);
}
/* 锦囊两块都挂 touch-action:pan-y，否则点灵汁与滑动看更多会打架 */
/* 开锦囊前整份快照 overlay 的 class 与内容，返回原样贴回 */
let JINNANG_SNAP=null;
/* 子面板自身不快照，免得把自己顶成快照 */
const OUT_SUB_SCENES=['pouch-scene','pile-scene','deck-scene'];
function outPanelSnap(){
  const ov=document.getElementById('overlay'), oc=document.getElementById('overlayContent');
  if(!(ov && oc && ov.classList)) return;
  /* 无论 overlay 显不显示都记一笔来处，返回时按来处还原，别猜 SCENE */
  if(ov.classList.contains('hidden')){ JINNANG_SNAP={ hidden:true }; return; }
  for(let i=0;i<OUT_SUB_SCENES.length;i++) if(ov.classList.contains(OUT_SUB_SCENES[i])) return;
  const x=document.getElementById('overlayCloseX');
  JINNANG_SNAP={ hidden:false, cls:ov.className, html:oc.innerHTML, xd:(x?x.style.display:'') };
}
function outPanelRestore(){
  const snap=JINNANG_SNAP; JINNANG_SNAP=null;
  if(!snap) return false;
  /* 来处是战斗层（overlay hidden）：只收面板，不碰 SCENE 不 showMap */
  if(snap.hidden){ hideOverlay(); return true; }
  /* 来处是地图要重画：贴回 innerHTML 会得到一张拖不动的死图 */
  if(/map-scene/.test(snap.cls||'')){ showMap(); return true; }
  const ov=document.getElementById('overlay'), oc=document.getElementById('overlayContent');
  if(!(ov && oc)) return false;
  try{
    ov.className=snap.cls; oc.innerHTML=snap.html;
    ov.classList.remove('hidden');
    const x=document.getElementById('overlayCloseX'); if(x) x.style.display=(snap.xd==null?'':snap.xd);
    if(typeof ovMarkCornerBtns==='function') ovMarkCornerBtns();
    if(typeof outHudSync==='function') outHudSync();
    return true;
  }catch(e){ return false; }
}
function showJinnang(){
  if(!G) return;
  outPanelSnap();
  const pm={}; const porder=[];
  (G.potions||[]).forEach(p=>{ if(!pm[p.name]){ pm[p.name]=1; porder.push(p.name); } else pm[p.name]++; });
  const potionHTML = porder.length
    ? porder.map(name=>{
        const p=G.potions.find(x=>x.name===name);
        return `<div class="pouch-item" data-tip="potionname:${name}" onclick="usePotionByName('${name}');showJinnang()">`
          + `${potionIcon(p)}<span class="pouch-info"><span class="pouch-name">${name}</span>`
          + `<span class="pouch-desc">${p?p.desc:''}</span></span><span class="pouch-cnt">×${pm[name]}</span></div>`;
      }).join('')
    : '<div class="pouch-empty">锦囊中暂无灵汁</div>';
  const relicHTML = (G.relics&&G.relics.length)
    ? G.relics.map(id=>{ const r=relById(id);
        return `<div class="pouch-item${relicUsedCls(id)}" data-tip="relic:${id}">`
          + `${relicIcon(r)}<span class="pouch-info"><span class="pouch-name">${r.name}</span>`
          + `<span class="pouch-desc">${r.desc}</span></span></div>`;
      }).join('')
    : '<div class="pouch-empty">尚未获得遗物</div>';
  showOverlay(`<h2>锦 囊</h2>
    <div class="pouch-root">
      <div class="pouch-col pouch-potions"><h3>灵 汁</h3><div class="pouch-scroll">${potionHTML}</div></div>
      <div class="pouch-col pouch-relics"><h3>遗 物</h3><div class="pouch-scroll">${relicHTML}</div></div>
    </div>
    <button class="btn ghost" onclick="jinnangBack()">返回</button>`, true, 'pouch-scene');
}

function jinnangBack(){
  /* 锦囊返回的来处完全交给快照，不再按 SCENE 分流兜底 */
  if(outPanelRestore()) return;
  hideOverlay();
}
function viewDeck(){
  if(!G){ floatMsg('开局后可查看牌库'); return; } 
  if(!G.deck.length){ floatMsg('牌库为空'); return; }
  
  const cards=G.deck.map(c=>`<div class="card has-frame ${RCOLOR[c.rarity]}">${cardBody(c)}</div>`).join('');
  outPanelSnap();   
  showOverlay(`<h2>我的牌库（共 ${G.deck.length} 张）</h2><div class="deck-grid">${cards}</div>`, true, 'deck-scene');
}

/* 抽牌堆乱序展示（shuffle 前先 slice），弃牌堆保序顶在前 */
function showPile(kind){
  if(!G){ floatMsg('开局后可查看牌堆'); return; }
  const isDraw=(kind==='draw');
  const src=isDraw?G.drawPile:G.discard;
  if(!src.length){ floatMsg(isDraw?'抽牌堆是空的':'弃牌堆是空的'); return; }
  const list=isDraw?shuffle(src.slice()):src.slice().reverse();
  const cards=list.map(c=>`<div class="card has-frame ${RCOLOR[c.rarity]}">${cardBody(c)}</div>`).join('');
  const head=isDraw
    ? `<h2>抽牌堆 · ${src.length} 张</h2><p>顺序已打乱（不泄露下一张）。</p>`
    : `<h2>弃牌堆 · ${src.length} 张</h2><p>堆顶在前 —— 最近打出的牌在第一格。</p>`;
  outPanelSnap();   
  showOverlay(`${head}<div class="reward-cards">${cards}</div>`, true, 'pile-scene');
}

/* 覆盖层 */

function overlaySfx(){ sfx('ui_panel'); }
/* ov-enter 门闩靠移除类实现；wasOpen 要在摘 hidden 之前读 */
/* 门闩判据是换了场景而不是开了面板，否则拨个开关就重播 */
function showOverlay(html, closable, scene){ overlaySfx();   // 面板场景类靠第三实参判出来，各调用点必须显式传
  document.getElementById('overlayContent').innerHTML=html;
  const ov=document.getElementById('overlay');
  const wasOpen = !!(ov && !ov.classList.contains('hidden'));
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  const SCENES=['map-scene','menu-scene','scroll-scene','hero-scene','pick-scene','forge-scene','pile-scene','deck-scene','result-scene','mile-scene','pouch-scene','rank-scene'];
  const wasScene = (ov && ov.classList) ? (SCENES.filter(c=>ov.classList.contains(c))[0]||'') : '';
  
  
  
  
  
  if(ov && ov.classList){ ov.classList.remove('map-scene'); ov.classList.remove('menu-scene');
    ov.classList.remove('scroll-scene'); ov.classList.remove('hero-scene'); ov.classList.remove('pick-scene');
    ov.classList.remove('forge-scene'); ov.classList.remove('pile-scene'); ov.classList.remove('result-scene');
    ov.classList.remove('mile-scene'); ov.classList.remove('pouch-scene'); ov.classList.remove('rank-scene'); ov.classList.remove('deck-scene'); }
  ov.classList.remove('hidden');
  
  
  
  const sceneChanged = !!scene && scene !== wasScene;
  if(ov && ov.classList) ov.classList.toggle('ov-enter', !wasOpen || sceneChanged);
  if(scene && ov.classList) ov.classList.add(scene);
  const x=document.getElementById('overlayCloseX'); if(x) x.style.display = closable ? '' : 'none';
  ovMarkCornerBtns();
  
  if(typeof outHudSync==='function') outHudSync(); }

function ovMarkCornerBtns(){
  const oc=document.getElementById('overlayContent'); if(!oc || !oc.children) return;
  
  if(oc.classList) oc.classList.remove('ov-corner');
  const kids=oc.children; let i=kids.length-1; const run=[];
  while(i>=0 && kids[i].tagName==='BUTTON' && kids[i].classList.contains('btn')){ run.unshift(kids[i]); i--; }
  if(!run.length) return;
  for(let j=0;j<kids.length;j++){
    if(kids[j].tagName==='BUTTON' && kids[j].classList.contains('btn') && run.indexOf(kids[j])<0) return;
  }
  if(document.body && document.body.classList && document.body.classList.contains('at-menu')) return;
  
  if(oc.classList) oc.classList.add('ov-corner');
  run.forEach(b=>{
    const t=(b.textContent||'').trim();
    b.classList.add(/^(返回|放弃|跳过)/.test(t) ? 'ov-act-l' : 'ov-act-r');
  });
}
function hideOverlay(){ overlaySfx();   
  if(typeof settleVidDrop==='function') settleVidDrop();   
  document.getElementById('overlay').classList.add('hidden');
  if(typeof outHudSync==='function') outHudSync(); }
/* 回主菜单判据是 body.at-menu（背后不是战局），别再叠场景类守卫 */
function closeOverlay(){
  const atMenu=!!(document.body && document.body.classList && document.body.classList.contains('at-menu'));
  /* 回主菜单交给 showStartScreen 收口，别先 hideOverlay 免得异常时全空 */
  if(atMenu || !G){ showStartScreen(); return; }
  /* 右上 ✕ 与 ESC 走这里：先认快照贴回，且必须排在 atMenu 判定之后 */
  if(outPanelRestore()) return;
  if(SCENE==='map'){ showMap(); return; }
  hideOverlay();
}
/* 卷轴页返回菜单按 at-menu 判断，不能写死 openMenu（那是局内菜单） */
function menuBack(){
  const atMenu=!!(document.body && document.body.classList && document.body.classList.contains('at-menu'));
  if(atMenu) showStartScreen(); else openMenu();
}

/* 是/否 确认条 */
let CONFIRM_CB=null, CONFIRM_ALT=null;
/* 是/否只在渲染出的 onclick 包装层问，原函数语义一个字不动 */
function askConfirm(msg, cb, opt){
  CONFIRM_CB=(typeof cb==='function')?cb:null;
  CONFIRM_ALT=(opt && typeof opt.cb==='function')?opt.cb:null;
  const el=document.getElementById('ovConfirm');
  if(!el){ const f=CONFIRM_CB; CONFIRM_CB=null; CONFIRM_ALT=null; if(f) f(); return; }   
  const q=(sel)=>el.querySelector ? el.querySelector(sel) : null;
  const m=q('.ovc-msg'); if(m) m.innerHTML=msg;
  const box=q('.ovc-box'); if(box && box.classList) box.classList.toggle('ovc-brush', !!(opt && opt.brush));
  const yb=q('.ovc-yes'); if(yb) yb.textContent=(opt && opt.yesLabel) ? opt.yesLabel : '✓';
  const nb=q('.ovc-no');  if(nb) nb.textContent=(opt && opt.noLabel)  ? opt.noLabel  : '✗';
  const ab=document.getElementById('ovc-alt');
  if(ab){
    if(opt && opt.label){ ab.textContent=opt.label; ab.classList.remove('hidden'); }
    else ab.classList.add('hidden');
  }
  el.classList.remove('hidden');
  sfx('ui_flip');
}
function resolveConfirm(ok){
  const el=document.getElementById('ovConfirm'); if(el) el.classList.add('hidden');
  const cb=CONFIRM_CB; CONFIRM_CB=null; CONFIRM_ALT=null;
  if(ok && cb){ sfx('ui_unlock'); try{ cb(); }catch(e){} }
  else sfx('ui_flip');
}

function resolveConfirmAlt(){
  const el=document.getElementById('ovConfirm'); if(el) el.classList.add('hidden');
  const cb=CONFIRM_ALT; CONFIRM_ALT=null; CONFIRM_CB=null;
  if(cb){ sfx('ui_unlock'); try{ cb(); }catch(e){} }
  else sfx('ui_flip');
}

function askUnknownRemove(i){
  if(CARD_ACT_BUSY) return;                        
  const c=G.deck[i]; if(!c) return;
  if(c.id==='shi_wang'){ floatMsg('【尸王】不可删除'); log('【尸王】不可删除'); return; }
  askConfirm(`焚掉【${c.name}】？<br>它将离开你的牌组。`, ()=>doUnknownRemove(i));
}
function askForgeCard(i){
  if(CARD_ACT_BUSY) return;                        
  const c=G.deck[i]; if(!c) return;
  if(c.up){ floatMsg('这张牌已升级过'); log('这张牌已经升级过了'); return; }
  if(!canUpgrade(c)){ floatMsg('不可升级'); log(`【${c.name}】没有可升级的变化，无法锻造`); return; }
  askConfirm(`将【${c.name}】升级为升级版？`, ()=>forgeCard(i));
}
function askBuyCard(i){
  const c=G.shopWares && G.shopWares[i]; if(!c) return;
  const p=priceFor(c);
  if(G.gold<p){ floatMsg(`金币不足（需 ${p}）`); log(`金币不足（需 ${p}）`); return; }
  askConfirm(`花 <b>${p}</b> 金币购买【${c.name}】？`, ()=>buyCard(i));
}
function askBuyPotion(i){
  const p=G.shopPotions && G.shopPotions[i]; if(!p) return;
  const price=potionPrice();
  if(G.gold<price){ floatMsg(`金币不足（需 ${price}）`); return; }
  askConfirm(`花 <b>${price}</b> 金币购买灵汁【${p.name}】？`, ()=>buyPotion(i));
}
function askDoRemove(i){
  const c=G.deck[i]; if(!c) return;
  if(c.id==='shi_wang'){ floatMsg('【尸王】不可删除'); log('【尸王】不可删除'); return; }
  const p=removeCost();
  if(G.gold<p){ floatMsg(`金币不足（需 ${p}）`); log(`金币不足（需 ${p}）`); return; }
  askConfirm(`花 <b>${p}</b> 金币删除【${c.name}】？`, ()=>doRemove(i));
}
function askPickOpening(i){
  const c=G.openingPicks && G.openingPicks[i]; if(!c) return;
  askConfirm(`将【${c.name}】加入起始牌组？`, ()=>pickOpening(i));
}

/* 渲染 */

function isOneUse(c){
  if(!c) return false;
  if(c.exhaustOnly) return c.exhaustOnly.indexOf(G.hero)>=0; 
  return !!(c.exhaust || (c.heroExhaust && c.heroExhaust===G.hero));
}

function exhaustMark(c){
  if(!isOneUse(c)) return '';
  return `<div class="oneuse-bar"></div><div class="oneuse" data-tip="kw:消耗">消耗</div>`;
}

function exhaustChip(c){
  if(!isOneUse(c)) return '';
  return ` <span data-tip="kw:消耗" style="cursor:help;color:#fff;background:var(--red2);border-radius:4px;padding:0 5px;font-size:11px;letter-spacing:1px">消耗</span>`;
}

function shiWangBoosted(c){ return !!(c && c.id==='shi_wang' && typeof hasRelic==='function' && hasRelic('yinsidie')); }
function shiWangBoostTag(c){ return shiWangBoosted(c) ? '<div style="color:var(--green);margin-top:2px">阴司牒 · 每次尸王攻击后获得 5 点格挡</div>' : ''; }

const CT_ICON={ attack:'ui/ct_attack.png', defense:'ui/ct_defense.png', skill:'ui/ct_skill.png', spirit:'ui/ct_spirit.png' };
function ctCorner(type){
  const rel=CT_ICON[type];
  return rel ? iconTag(rel, TNAME[type], 'ct-icon') : (TNAME[type]||'');
}
function cardBody(c){
  
  
  
  return `${cardFrame()}<div class="cname">${c.name}${(c.up||shiWangBoosted(c))?'<span class="up-mark" title="已升级">↑</span>':''}</div>${cardArt(c)}${exhaustMark(c)}<div class="cost"${(c.id==='duanren_leifu'||(c.oneShot&&c.id==='leifu'))?' style="background:var(--green);color:#fff"':''}>${cardCost(c)}</div><div class="cplate" data-cardid="${c.id}" data-cardup="${c.up?1:0}"><div class="cdesc">${wrapKw(cardText(c,c.up))}${shiWangBoostTag(c)}</div></div><div class="ctype"><span class="ct-type">${TNAME[c.type]}</span><span class="ct-sep"> · </span><span class="ct-rar">${RNAME[c.rarity]}</span></div><span class="ct-corner">${ctCorner(c.type)}</span>`;
}
function forgeCardHTML(c,i){
  
  const lock = !c.up && !canUpgrade(c);   
  
  const face = (cc, cls, badge, descCls) => `<div class="card has-frame ${RCOLOR[cc.rarity]}${cls}" data-fi="${i}" onclick="askForgeCard(${i})">
    ${cardFrame()}<div class="cname">${cc.name}${cc.up?'<span class="up-mark" title="已升级">↑</span>':''}${badge}</div>
    ${cardArt(cc)}${exhaustMark(cc)}
    <div class="cost"${(cc.id==='duanren_leifu'||(cc.oneShot&&cc.id==='leifu'))?' style="background:var(--green);color:#fff"':''}>${cardCost(cc)}</div>
    <div class="cplate" data-cardid="${cc.id}" data-cardup="${cc.up?1:0}">
    <div class="cdesc${descCls}">${wrapKw(cardText(cc,cc.up))}</div>
    </div><div class="ctype"><span class="ct-type">${TNAME[cc.type]}</span><span class="ct-sep"> · </span><span class="ct-rar">${RNAME[cc.rarity]}</span></div><span class="ct-corner">${ctCorner(cc.type)}</span>
  </div>`;
  
  if(c.up || lock) return face(c, lock?' locked':'', lock?'<span class="noup">不可升级</span>':'', '');
  /* 箭头颜色的 var() 要写在 CSS 里：SVG 表现属性不吃 var() */
  const arrow = `<div class="forge-arrow" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22"><path d="M3 12h13M11 6l6 6-6 6"/></svg></div>`;
  /* onclick 只留两张卡上，放容器上会冒泡调两次 forgeCard */
  const up = Object.assign({}, c, {up:true});
  return `<div class="forge-pair">${face(c,'','','')}${arrow}${face(up,'','',' upgrade-preview')}</div>`;
}
function groupHand(){
  
  const order={};
  for(const c of G.hand){ if(!(c.id in order)) order[c.id]=Object.keys(order).length; }
  G.hand.sort((a,b)=>order[a.id]-order[b.id]);
}
function handCardHTML(c, disabled, i, n){
  const eff=effectiveCost(c);
  const costHtml = (eff<cardCost(c) || c.id==='duanren_leifu' || (c.oneShot&&c.id==='leifu')) ? `<div class="cost" style="background:var(--green);color:#fff">${eff}</div>` : `<div class="cost">${eff}</div>`;
  
  const sealed = c.sealed>0;
  
  const sealTag = sealed ? `<div class="exhaust-tag">封印 ${c.sealed}</div>` : '';
  const rot=((i-(n-1)/2)*3).toFixed(1);
  
  const newAttr = NEW_CARDS.has(c) ? ' data-new' : '';
  
  const flying = (typeof FLYING_CARDS!=='undefined') && FLYING_CARDS.has(c);
  
  const xueFire = (fx() && G && G.hero==='yincha' && hasRelic('xuemodao') && G.hp < G.maxHp*0.3 && c.type==='attack') ? ' xue-fire' : '';
  
  
  return `<div class="card has-frame ${RCOLOR[c.rarity]} ${(disabled||sealed)?'disabled':''}${xueFire}"${newAttr} style="--rot:${rot}deg${flying?';opacity:0':''}" onpointerdown="cardPointerDown(event, ${i})">${cardFrame()}<div class="cname">${c.name}${(c.up||shiWangBoosted(c))?'<span class="up-mark" title="已升级">↑</span>':''}</div>${cardArt(c)}${exhaustMark(c)}${costHtml}<div class="cplate"><div class="cdesc">${wrapKw(cardText(c,c.up))}${shiWangBoostTag(c)}</div></div>${sealTag}<div class="ctype"><span class="ct-type">${TNAME[c.type]}</span><span class="ct-sep"> · </span><span class="ct-rar">${RNAME[c.rarity]}</span></div><span class="ct-corner">${ctCorner(c.type)}</span></div>`;
}
function intentText(e){
  const st=(e.strength||0); 
  const atkPlain=e.intent.v+st; 
  const atk=e.intent.v+(e.pendingDamage||0)+st; 
  switch(e.intent.type){
    case 'attack': return `⚔️ 攻击 ${atk}`;
    case 'charge': return `⏳ 蓄力（下回合单体攻击 +${e.intent.v}）`;
    case 'block': return `🛡️ 格挡 ${e.intent.v}`;
    case 'heal': return `❤️ 回血 ${e.intent.v}`;
    case 'weak': return '🥀 施加虚弱';
    case 'gouhun': return '🔗 勾魂（少抽1张）';
    case 'burn': return `🔥 灼烧 +${e.intent.v}（每回合 -${e.intent.v*2} 生命）`;
    case 'strength': return e.intent.weak ? `💪 力量 +${e.intent.v} · 施加虚弱` : e.intent.sealHeal ? `💪 力量 +${e.intent.v} · 回血` : `💪 力量 +${e.intent.v}`;
    case 'multi': return `⚔️ 连击 ${e.intent.n}×${atkPlain}`; 
    case 'discard': return '🗑️ 下回合随机弃你 1 张牌';
    case 'attackBlock': return `⚔️ 攻击 ${atkPlain} · 🛡️ 格挡 ${e.intent.block}`; 
    case 'summon': return `👥 召唤 ${e.intent.n} 只${ENEMIES[e.intent.unit||'xiaojianshi'].name}`;
    case 'jiming': { const la=e.ledgerAffix; const lan=la?AFFIXES.find(a=>a.id===la.id).name:''; return lan?`📜 记名（记录伤害 · 词缀「${lan}」）`:'📜 记名（记录你打出的伤害）'; }
    case 'qingsuan': { const la=e.ledgerAffix; const lan=la?AFFIXES.find(a=>a.id===la.id).name:''; return `⚖️ 清算（反弹 ${Math.min(24, Math.floor((e.ledgerDmg||0)*0.3))}${lan?` · 打出「${lan}」`:''}）`; }
    case 'yehuo': return '🔥 业火附体（你伤害 -30% · 反噬 1 血 · 诅咒翻倍）';
    case 'wangyou': return '🍵 忘忧（两回合各饮 1 张或受 8 伤）';
    case 'aoe': return `💥 群体攻击 ${atk}（驱散召唤）`;
    case 'dormant': return '💤 休眠（观望）';
    default: return '…';
  }
}

function intentChip(e){
  const st=(e.strength||0);
  const atkPlain=e.intent.v+st;
  const atk=e.intent.v+(e.pendingDamage||0)+st;
  const I=(n,fb)=>iconTag('ui/intent_'+n+'.png', fb);
  const B=(n,fb)=>iconTag('buff/'+n+'.png', fb);
  
  const affixChips=(function(){
    let s='';
    if(e && e.affixes){
      if(e.affixes.some(a=>a.id==='gouhun')) s+=B('gouhun','🔗');
      if(e.affixes.some(a=>a.id==='judu'))   s+=B('judu','☠️');
      if(e.affixes.some(a=>a.id==='shixue')) s+=B('shixue','🩸');
      if(e.affixes.some(a=>a.id==='feipai')) s+=B('feipai','🃏');
    }
    return s;
  })();
  switch(e.intent.type){
    case 'attack': return I('attack','⚔️')+atk+affixChips;
    case 'charge': return B('charge','⏳')+'+'+e.intent.v;
    case 'block': return B('block','🛡️')+e.intent.v;
    case 'heal': return I('heal','❤️')+e.intent.v;
    case 'weak': return B('weak','🥀');
    case 'gouhun': return B('gouhun','🔗');
    case 'burn': return B('burn','🔥')+e.intent.v;
    case 'strength': return B('strength','💪')+e.intent.v+(e.intent.weak?B('weak','🥀'):'')+(e.intent.sealHeal?I('heal','❤️'):'');
    case 'multi': return I('multi','⚔️')+e.intent.n+'×'+atkPlain+affixChips;
    case 'discard': return I('discard','🗑️');
    case 'attackBlock': return I('attack','⚔️')+atkPlain+B('block','🛡️')+e.intent.block+affixChips;
    case 'summon': return I('summon','👥')+e.intent.n;
    case 'jiming': return B('ledger','📜');
    case 'qingsuan': return I('qingsuan','⚖️');
    case 'yehuo': return B('karmafire','🔥');
    case 'wangyou': return I('wangyou','🍵');
    case 'aoe': return I('aoe','💥')+atk+affixChips;
    case 'dormant': return I('dormant','💤');
    default: return '…';
  }
}
// RISE_LIFT 与 battleHeadroom 一个字都不能改（冒烟逐条钉死）


const RISE_LIFT=[0,42,20,60,30];


function battleHeadroom(){
  let mx=0;
  (G.enemies||[]).forEach((e,i)=>{ if(alive(e)||e.dying) mx=Math.max(mx, RISE_LIFT[i%RISE_LIFT.length]); });
  return mx;
}
/* 倍率只能加在调用点；必须带 getComputedStyle 守卫，否则算出 NaN */
/* 两个倍率必须容忍 0 且要求 isFinite：NaN 会让浏览器丢弃整条 transform */
let _riseK=1;
let _slotDxK=1;
function refreshRiseK(){
  try{
    const cs=(typeof window!=='undefined' && window.getComputedStyle) ? window.getComputedStyle(document.documentElement) : null;
    if(!cs) return;
    const v=parseFloat(cs.getPropertyValue('--rise-unit'));
    _riseK=(isFinite(v) && v>=0) ? v : 1;
    const dxk=parseFloat(cs.getPropertyValue('--slot-dx-k'));
    _slotDxK=(isFinite(dxk) && dxk>=0) ? dxk : 1;
  }catch(e){ _riseK=1; _slotDxK=1; }
}
/* 别动 G.enemies 顺序：召唤/分裂依赖数组序，秩只在 enemyPanelHTML 内算 */
const SLOT_SHAPE = [
  {dx:  0, dy: 0},   
  {dx:-14, dy:14},
  {dx:-28, dy:28},
  {dx:-42, dy:42},
  {dx:-54, dy:54},   
  {dx:-64, dy:62},   
];

function slotCount(){
  let n=0;
  (G.enemies||[]).forEach(e=>{ if(alive(e)||e.dying) n++; });
  return n;
}
function slotShift(r){
  const last=SLOT_SHAPE.length-1;
  const i=Math.max(0, Math.min(last, r|0));   
  const s=SLOT_SHAPE[i];
  return { dx:Math.round(s.dx*_slotDxK), dy:Math.round(s.dy*_riseK) };
}

function slotHeadroom(){
  const n=slotCount();
  if(n<=0) return 0;
  let mx=0;
  for(let r=0;r<n;r++){ const y=slotShift(r).dy; if(isFinite(y)) mx=Math.max(mx,y); }
  return mx;
}
function enemyPanelHTML(e, idx){
  const ehp=Math.max(0,e.hp/e.maxHp*100);
  const ehPrev=(ENEMY_HP_PREV[e.uid]===undefined)?ehp:ENEMY_HP_PREV[e.uid];
  
  const ehGain=ehp>ehPrev+0.001;
  ENEMY_HP_PREV[e.uid]=ehp;
  
  
  
  
  
  const rank=(idx>=0 ? slotCount()-1-idx : 0);
  const edef=ENEMIES[e.key];
  const eSize=e.boss?'e-boss':e.elite?'e-elite':(edef&&edef.summon)?'e-summon':'e-normal';
  /* z-index = 2000 - 上抬量：越深越高越靠后，前排压住后排 */
  const sh=slotShift(rank);
  const ex=sh.dx;
  const ey=sh.dy;
  
  let badges='';
  if(e.curse>0){ const max=e.curse>=6 && (hasRelic('leifaxinjue') || hasRelic('taishangzhou')); badges+=`<span class="badge curse${max?' curse-max':''}" data-tip="kw:诅咒" style="cursor:help">${iconTag(max?'buff/curse_6.png':'buff/curse_1_5.png','☠️')}诅咒 ×${e.curse}</span>`; }   
  
  if(e.poison>0) badges+=`<span class="badge affix" data-tip="kw:腐毒" style="cursor:help">${iconTag('buff/fudu_badge.png','☠️')}腐毒 ×${e.poison}</span>`;
  if(e.charm>0) badges+=`<span class="badge charm" data-tip="kw:魅惑" style="cursor:help">${iconTag('buff/charm.png','💘')}魅惑 ×${e.charm}</span>`;
  if(e.strength>0) badges+=`<span class="badge strength" data-tip="kw:力量" style="cursor:help">${iconTag('buff/strength.png','💪')}力量 ×${e.strength}</span>`;
  if(e.pendingDamage>0) badges+=`<span class="badge strength" data-tip="kw:蓄力" style="cursor:help">${iconTag('buff/charge.png','⚡')}蓄力 +${e.pendingDamage}</span>`;
  if(e.seal) badges+=`<span class="badge seal" data-tip="kw:镇魂" style="cursor:help">${iconTag('buff/seal.png','🔒')}镇魂</span>`;
  if(e.ledgerActive){ const la=e.ledgerAffix; const lan=la?AFFIXES.find(a=>a.id===la.id).name:''; badges+=`<span class="badge affix" ${la?`data-tip="affix:${la.id}" style="cursor:help"`:''}>${iconTag('buff/ledger.png','📖')}生死簿·记名${lan?`·${lan}`:''}${e.ledgerDmg?`（${e.ledgerDmg}）`:''}</span>`; }
  if(e.phase2) badges+=`<span class="badge affix" data-tip="kw:轮回" style="cursor:help">${iconTag('buff/reincarn.png','🔄')}轮回·二阶段</span>`;
  if(e.affixes && e.affixes.length) e.affixes.forEach(a=>{ const af=AFFIXES.find(x=>x.id===a.id); badges+=`<span class="badge affix" data-tip="affix:${a.id}" style="cursor:help">${iconTag('buff/'+a.id+'.png','')}${af?af.name:a.id}${a.tier>1?'·'+a.tier:''}</span>`; });
  if(G.hero==='tianshi' && G.ybTarget===e.uid && G.summons.some(x=>x.type==='yinbing' && x.dur>0)) badges+=`<span class="badge ybtarget" data-tip="kw:阴兵目标" style="cursor:help">${iconTag('buff/ybtarget.png','🎯')}阴兵目标</span>`;
  return `<div class="enemy ${eSize} ${ey>0?'edepth':''} ${e.dying?'dying':''} ${HITFX.enemies.has(e)?'hit':''}" data-uid="${e.uid}" style="z-index:${2000-ey}; --ex:${ex}px; --ey:${-ey}px">
    ${artImg('enemy/'+e.key+'.png', '', 'eportrait '+eSize)}
    <div class="ename" data-tip="enemy:${e.key}">${e.kind&&KIND_ICON[e.kind]?iconTag('ui/kind_'+e.kind+'.png', KIND_ICON[e.kind]):''}${e.name}${e.boss?iconTag('ui/tier_boss.png','👹'):e.elite?iconTag('ui/tier_elite.png','☠'):''}</div>
    <span class="stat">生命 <b>${Math.max(0,e.hp)}</b>/${e.maxHp}</span>
    <span class="enemyhpbar${ehGain?' hp-gain':''}"><i class="hpghost" data-w="${ehp}" style="width:${ehPrev}%"></i><i class="hpfill" data-w="${ehp}" style="width:${ehPrev}%"></i></span>
    ${e.block>0?`<span class="stat">${iconTag('buff/block.png','')}格挡 <b>${e.block}</b></span>`:''}
    <div class="badges">${badges}</div>
    <div class="intent" title="${intentText(e)}">${intentChip(e)}</div>
  </div>`;
}
function summonHTML(s){
  
  
  const sw = (s.type!=='shi_wang' && G.summons.some(x=>x.type==='shi_wang' && x.dur>0)) ? 1 : 0;
  const bleed = G.bleedSummons ? Math.floor((G.hpLostTurn||0)/2)*(G.bleedSummonsBonus||1) : 0;
  
  const v = (s.type==='shi_wang' || s.type==='wutong') ? s.v : (s.v + sw + bleed);
  const label = s.type==='zhiren'?(G.hero==='ganshiren'?`纸人：每回合末对随机敌人造成 ${v} 点伤害`
      :G.hero==='wuseng'?`纸人：每回合末造成 ${v} 点伤害；存活时每回合开始 +${s.up?3:2} 格挡`
      :G.hero==='yincha'?`纸人：每回合末造成 ${v} 点伤害；攻击时为你恢复 ${s.healV||2} 点生命`
      :`纸人：每回合末对随机敌人造成 ${v} 点伤害并施加 ${s.up?2:1} 层【诅咒】`)
    : s.type==='xiaogui'?(G.hero==='yincha'?`小鬼：每回合末造成 ${v} 点伤害并 +1【血怒】；死亡时恢复 ${s.up?4:2} 点生命`
      :G.hero==='tianshi'?`小鬼：每回合末对随机敌人造成 ${v} 点伤害；若该敌带【诅咒】再 +${s.up?3:2}`
      :`小鬼：每回合末对随机敌人造成 ${v} 点伤害`)
    : s.type==='yinbing'?`阴兵：每回合末${G.hero==='tianshi'?'优先攻击🎯标记敌（上一次施咒的敌人）':'对随机敌人'}造成 ${v} 点伤害${G.hero==='wuseng'?`；存活时每回合开始 +${s.up?4:3} 格挡`:''}${G.hero==='yincha'?'；攻击时为你恢复 2 点生命':''}`
    : s.type==='shi_wang'?`尸王：每回合末对全体敌人造成 ${v} 点伤害`
    : (G.hero==='yincha'?`五通神：每回合开始你 +${v} 生命`:`五通神：每回合开始你 +${v} 格挡`);
  
  const name = label.slice(0, label.indexOf('：')) || label;
  
  const dot = `<i class="summon-dot" style="background:${SUMMON_DOT[s.type]||'#a06be0'}"></i>`;
  return `<span class="summon" title="${label}"><span class="sb-long">${dot}${label} · 剩 ${s.dur} 回合</span><span class="sb-short">${dot}${name} ${v} · 剩 ${s.dur}</span></span>`;
}

/* 拖拽出牌 */
const AOE_CARDS = ['wanjian', 'baigui', 'leiqianfu'];   
/* 是否需要拖箭头按机制判，不看 type：钟馗/镇妖铃/画皮/咒印也要 */
const TARGETED_CARDS = ['leifu','huofu','jianfu','zhanyaojian','tianlei','tiebushan','shihun','qungui',
  'taomufu','shihunzhou','shixue','zhongkui','zhenyaoling','huapi',
  
  'duanren_leifu',
  
  'luohanfuhu',
  
  'yinxueren'];
function needsTarget(c){
  
  if(c.id==='zhouyin') return G.hero!=='ganshiren' && G.hero!=='wuseng';
  
  if(c.id==='sheshen') return G.hero==='tianshi';
  
  if(c.id==='qungui') return G.hero==='tianshi' || G.hero==='wuseng';
  
  return TARGETED_CARDS.includes(c.id);
}
let DRAG = null;
let ARROW_TIP = null;
function dragArrow(){
  let svg=document.getElementById('drag-arrow');
  if(!svg){
    const NS='http://www.w3.org/2000/svg';
    svg=document.createElementNS(NS,'svg');
    svg.setAttribute('id','drag-arrow');
    svg.setAttribute('style','position:fixed;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:49;');
    const path=document.createElementNS(NS,'path');
    path.setAttribute('id','drag-arrow-path');
    path.setAttribute('fill','#ffb84d');
    path.setAttribute('stroke','rgba(255,110,45,.5)');
    path.setAttribute('stroke-width','1.5');
    path.setAttribute('stroke-linejoin','round');
    path.setAttribute('style','filter:drop-shadow(0 0 7px rgba(255,150,60,.55));');
    svg.appendChild(path);
    document.body.appendChild(svg);
  }
  return document.getElementById('drag-arrow-path');
}
function drawArrow(x1,y1,x2,y2){
  const path=dragArrow();
  const dx=x2-x1, dy=y2-y1, len=Math.hypot(dx,dy);
  if(len<8){ path.setAttribute('d',''); return; }
  const ux=dx/len, uy=dy/len;
  let px=-uy, py=ux;
  if(py<0){ px=-px; py=-py; }                 
  const bow=len*0.24;                          
  const mx=(x1+x2)/2+px*bow, my=(y1+y2)/2+py*bow;
  const wT=2.2, wH=12;                         
  const t1x=x1+px*wT, t1y=y1+py*wT, t2x=x1-px*wT, t2y=y1-py*wT;
  const h1x=x2+px*wH, h1y=y2+py*wH, h2x=x2-px*wH, h2y=y2-py*wH;
  const wM=(wT+wH)/2;
  const c1x=mx+px*wM, c1y=my+py*wM, c2x=mx-px*wM, c2y=my-py*wM;
  const hs=Math.max(16, Math.min(28, len*0.10));   
  const hh=wH*1.6;                                  
  const bx=x2-ux*hs, by=y2-uy*hs;
  const a1x=bx+px*hh, a1y=by+py*hh, a2x=bx-px*hh, a2y=by-py*hh;
  const d='M '+t1x+' '+t1y+' Q '+c1x+' '+c1y+' '+h1x+' '+h1y+' L '+a1x+' '+a1y+' L '+x2+' '+y2+' L '+a2x+' '+a2y+' L '+h2x+' '+h2y+' Q '+c2x+' '+c2y+' '+t2x+' '+t2y+' Z';
  path.setAttribute('d', d);
}
function hideDragArrow(){ const p=document.getElementById('drag-arrow-path'); if(p) p.setAttribute('d',''); }
function aimAt(ox,oy,tx,ty,ease){
  if(!ARROW_TIP || !ease){ ARROW_TIP={x:tx,y:ty}; }
  else { ARROW_TIP.x+=(tx-ARROW_TIP.x)*0.28; ARROW_TIP.y+=(ty-ARROW_TIP.y)*0.28; }
  drawArrow(ox,oy,ARROW_TIP.x,ARROW_TIP.y);
}
function enemyAtPoint(x,y){
  const el=document.elementFromPoint(x,y);
  const eel=el && el.closest ? el.closest('#enemy-panel .enemy') : null;
  if(!eel) return -1;
  const uid=eel.getAttribute('data-uid');
  return G.enemies.findIndex(e=>String(e.uid)===String(uid));
}
function setDragTarget(on){
  const prev=document.querySelector('#enemy-panel .enemy.drag-target');
  if(prev) prev.classList.remove('drag-target');
  if(on) on.classList.add('drag-target');
}

