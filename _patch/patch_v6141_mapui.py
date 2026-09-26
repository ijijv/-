# -*- coding: utf-8 -*-
"""
v0.61.41 补丁：地图视觉改用用户给的素材（图标/背景/道路）+ 未知关卡直入随机
              + 浮字四档全装 + 拖拽预伤害走同一套字形 + 敌人数量随层数走

锚点一律 count==1；任一锚点缺失则**一个字都不写**（全或无）。
"""
import io, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EDITS = []          # [(相对路径, 旧串, 新串, 说明)]


def E(path, old, new, note):
    EDITS.append((path, old, new, note))


# ============================================================ 原型.html
E('原型.html',
  '<title>志怪塔 · 原型 v0.61.40</title>',
  '<title>志怪塔 · 原型 v0.61.41</title>',
  '版本号 title')

E('原型.html',
  '<small>· 玩法原型 v0.61.40</small>',
  '<small>· 玩法原型 v0.61.41</small>',
  '版本号 标题栏')

# —— 地图 CSS：去掉节点边框/底色/圆角，改成「图标 + 小字」；连线改成道路贴图 ——
E('原型.html',
  """  /* v0.61.20(P2)：地图路径连线 —— 行与行之间用 SVG 曲线连起来，已走=金色实线、可达=金色虚线、其余=暗线 */
  .map-wrap{position:relative;}
  .map-lines{position:absolute; left:0; top:0; width:100%; height:100%; pointer-events:none; overflow:visible; z-index:0;}
  .map-lines path{fill:none; stroke-linecap:round;}
  .map-lines path.link-dim{stroke:var(--ink3); stroke-width:2; opacity:.55;}
  .map-lines path.link-reach{stroke:var(--gold); stroke-width:3; opacity:.9; stroke-dasharray:7 5; animation:linkFlow 1.1s linear infinite;}
  .map-lines path.link-past{stroke:var(--gold); stroke-width:3.5; opacity:.95;}
  @keyframes linkFlow{to{stroke-dashoffset:-24;}}
  .map-row{position:relative; z-index:1; display:flex; justify-content:center; gap:12px; margin:10px 0;}
  .map-node{min-width:96px; padding:10px 16px; border-radius:8px; border:1px solid var(--ink3); background:var(--ink); color:var(--text); font-size:14px; letter-spacing:1px; cursor:default; text-align:center;}
  .map-node.empty{visibility:hidden;}
  /* v0.61.40：迷雾四档 —— preview = 上一层连线能到的下一层（只见 ? 剪影）；.empty 仍是隐藏占位 */
  .map-node.preview{border-style:dashed; opacity:.5; color:var(--dim); cursor:default;}
  .map-node .node-ico:empty{display:none;}
  .map-node .node-label{vertical-align:middle;}
  .map-row.current .map-node{background:var(--red); color:#fff; border-color:var(--red); cursor:pointer;}
  .map-row.current .map-node:hover{background:var(--red2);}
  .map-row.current .map-node.blocked{background:var(--ink2); color:var(--dim); border-color:var(--ink3); cursor:not-allowed; opacity:.55;}
  .map-row.past .map-node{opacity:.3;}
  .map-row.future .map-node{opacity:.5;}""",
  """  /* v0.61.41：道路改用用户给的贴图（素材/map/path-left|right.png），不再自绘 SVG 贝塞尔；
     节点也不再是「带边框的按钮」，而是「图标 + 小字」—— 原边框/底色/圆角/内边距**全部去掉**。
     三档线的语义不变：暗线=可选→下一层可见格、金虚线=上一步→现在能走、金实线=已走。 */
  .map-wrap{position:relative;}
  .map-lines{position:absolute; left:0; top:0; width:100%; height:100%; pointer-events:none; overflow:visible; z-index:0;}
  .map-road{position:absolute; object-fit:contain; pointer-events:none;}
  .map-road.link-dim{opacity:.38; filter:grayscale(.75) brightness(.7);}
  .map-road.link-reach{opacity:.95; filter:sepia(1) saturate(2.6) hue-rotate(-12deg) brightness(1.25);}
  .map-road.link-past{opacity:.9; filter:sepia(1) saturate(2.2) hue-rotate(-12deg) brightness(1.1);}
  .map-row{position:relative; z-index:1; display:flex; justify-content:center; align-items:flex-start; gap:14px; margin:6px 0;}
  .map-node{min-width:0; padding:0; border:none; background:none; color:var(--text); font-size:12px; letter-spacing:1px; cursor:default; text-align:center; display:flex; flex-direction:column; align-items:center; gap:1px; line-height:1.25;}
  .map-node.empty{visibility:hidden;}   /* v0.61.41 兜底：当前没有任何档会渲染它（未解锁改挂 locked.png） */
  .map-node .node-ico{width:56px; height:56px; object-fit:contain; display:block; pointer-events:none; transition:transform .15s ease; filter:drop-shadow(0 2px 4px rgba(0,0,0,.85));}
  .map-node .node-label{white-space:nowrap; color:var(--dim);}
  .map-node.locked{opacity:.4;}
  .map-node.locked .node-ico{width:42px; height:42px; filter:grayscale(.55) brightness(.7) drop-shadow(0 2px 4px rgba(0,0,0,.85));}
  .map-node.preview{opacity:.7;}
  .map-node.preview .node-ico{width:46px; height:46px; filter:grayscale(.3) brightness(.9) drop-shadow(0 2px 4px rgba(0,0,0,.85));}
  .map-row.current .map-node{cursor:pointer;}
  .map-row.current .map-node .node-ico{filter:drop-shadow(0 0 10px rgba(224,179,65,.95)) drop-shadow(0 2px 4px rgba(0,0,0,.9));}
  .map-row.current .map-node .node-label{color:var(--gold);}
  .map-row.current .map-node:hover .node-ico{transform:translateY(-3px) scale(1.08);}
  .map-row.past .map-node{opacity:.32;}
  .map-row.future .map-node{opacity:.72;}""",
  '地图 CSS 重做')

# —— 触摸/窄屏（@media (pointer:coarse),(max-width:760px)）——
E('原型.html',
  '  .map-node{min-height:48px; display:flex; align-items:center; justify-content:center;}\n',
  '  .map-node{min-height:0;}\n  .map-node .node-ico{width:52px; height:52px;}\n',
  '地图 CSS 触摸端')

# —— 手机端 520 ——
E('原型.html',
  '    .map-row{gap:4px; margin:6px 0;}\n    .map-node{min-width:56px; padding:8px 4px; font-size:11px; letter-spacing:0; min-height:42px; border-radius:6px;}\n',
  '    .map-row{gap:4px; margin:4px 0;}\n'
  '    .map-node{font-size:10px; letter-spacing:0;}\n'
  '    .map-node .node-ico{width:40px; height:40px;}\n'
  '    .map-node.locked .node-ico,.map-node.preview .node-ico{width:32px; height:32px;}\n',
  '地图 CSS 520')

# —— 手机端 360 ——
E('原型.html',
  '    .map-node{min-width:44px; padding:6px 2px; font-size:10px; min-height:36px;}\n    .map-row{gap:2px;}\n',
  '    .map-node{font-size:9px; padding:0; min-width:0;}\n'
  '    .map-node .node-ico{width:34px; height:34px;}\n'
  '    .map-node.locked .node-ico,.map-node.preview .node-ico{width:27px; height:27px;}\n'
  '    .map-row{gap:2px;}\n',
  '地图 CSS 360')

# ============================================================ js/00_base.js
# —— 数字字形渲染抽成共用件 + 预加载 ——
E('js/00_base.js',
  """let PLAYER_HP_PREV = null;""",
  """/* v0.61.41：数字字形渲染的**共用件** —— 伤害飘字与拖拽预伤害（#drag-dmg）都走这里，
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
  if(sp.sign) parent.appendChild(document.createTextNode(sp.sign));
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
let PLAYER_HP_PREV = null;""",
  '00_base 字形共用件 + 预加载')

E('js/00_base.js',
  """  const inner=document.createElement('i'); inner.className='fx-in';
  // v0.61.33：有数字素材就把字形换成图片（0-9 之外的一律回落文字，符号 +/- 保持文字）
  const __sign=/^[+-]/.test(text) ? text[0] : '';
  const __digits=__sign ? text.slice(1) : text;
  const __k=numKind(kind);
  if(numProbe(kind) && NUM_IMG[__k] && __digits.length && !/[^0-9]/.test(__digits)){
    if(__sign) inner.textContent=__sign;
    for(const ch of __digits){ const im=new Image(); im.className='fx-num'; im.src=NUM_IMG[__k][+ch].src; im.alt=ch; inner.appendChild(im); }
  } else {
    inner.textContent=text;
  }""",
  """  const inner=document.createElement('i'); inner.className='fx-in';
  // v0.61.41：字形渲染改走共用件 numAppend（与 #drag-dmg 的预伤害同一套），返回 false 才回落文字
  if(!numAppend(inner, kind, text)) inner.textContent=text;""",
  '00_base floatDamage 走 numAppend')

# ============================================================ js/10_audio.js
E('js/10_audio.js',
  """function setBg(name){
  var el=document.getElementById('bg'); if(!el) return;
  var path=assetURL('bg/bg_'+name+'.png');""",
  """/* v0.61.41：name 带扩展名（如 'map.jpg'）时按原名去 素材/bg/ 找，否则沿用 bg_<name>.png ——
   用户给的地图背景是 .jpg，不想为了一个后缀去转码重压（转成 PNG 只会更大）。 */
function setBg(name){
  var el=document.getElementById('bg'); if(!el) return;
  var rel=(/\\.[A-Za-z0-9]+$/.test(name)) ? ('bg/'+name) : ('bg/bg_'+name+'.png');
  var path=assetURL(rel);""",
  '10_audio setBg 支持扩展名')

# ============================================================ js/20_data.js
E('js/20_data.js',
  """function pickFightFrom(pool, R){ return mkShuffle(R)(pool.slice()).slice(0, R()<0.65?3:2); }""",
  """/* v0.61.41：敌人数量随「层」走（用户要求）——
   每一幕**前 4 层**最多 2 只（开局不该被 3 只围殴，也留出教学空间）；
   第 9 层起「3 只」的概率从老的 0.65 抬到 0.85（后期加压）；中间层维持老口径。
   下标 = MAP 的层号 r（0 起算）；越界一律回落 0.65。 */
const ENEMY3_P3 = [0, 0, 0, 0, 0.55, 0.6, 0.6, 0.65, 0.65, 0.85, 0.85, 0.85, 0.85, 0.85];
function enemy3Chance(r){
  if(typeof r!=='number' || r<0 || r>=ENEMY3_P3.length) return 0.65;
  return ENEMY3_P3[r];
}
function pickFightFrom(pool, R, row){
  const p3=enemy3Chance(row);
  return mkShuffle(R)(pool.slice()).slice(0, R()<p3?3:2);
}""",
  '20_data 敌人数量随层数')

E('js/20_data.js',
  """    if(r>0 && R()<0.06){ node.t='elite'; node.e=pickElite(); }   // 少量野生精英，保持稀有
    else node.e=pickFightFrom(minionPool, R);""",
  """    if(r>0 && R()<0.06){ node.t='elite'; node.e=pickElite(); }   // 少量野生精英，保持稀有
    else node.e=pickFightFrom(minionPool, R, r);   // v0.61.41：把层号传进去 —— 前几层最多 2 只、后期 3 只概率抬高""",
  '20_data pickFightFrom 传层号')

# ============================================================ js/50_ui.js
E('js/50_ui.js',
  """/* 节点文案走表，**去掉了敌人数量与敌人名**（遭遇细节藏起来，路线决策只保留节点类型）。
   NODE_ICON 是**留空槽** —— 用户给图后只填这一张表，渲染逻辑一个字都不用动。 */
const NODE_LABEL = { fight:'⚔ 战斗', elite:'☠ 精英', unknown:'⚠ 未知', camp:'篝火', shop:'商店', boss:'👹 Boss' };
const NODE_ICON  = { fight:'', elite:'', unknown:'', camp:'', shop:'', boss:'' };
const NODE_TIP   = { fight:'普通战斗', elite:'精英战：更强的敌人，更好的奖励', unknown:'未知事件', camp:'篝火：休整或锻造', shop:'鬼市：买卖与删牌', boss:'守关 Boss' };
const MAP_BG = { 1:'act1', 2:'act2', 3:'act3', endless:'act3' };   // ⚠ endless 必须显式给，否则 act4 会 404 丢背景图
function mapBgName(){ return G.endless ? MAP_BG.endless : (MAP_BG[G.act]||'act1'); }
function nodeLabel(node){ return node ? (NODE_LABEL[node.t] || NODE_LABEL.fight) : ''; }
function nodeHTML(node){
  const icon = NODE_ICON[node.t] || '';
  return '<span class="node-ico">' + icon + '</span><span class="node-label">' + nodeLabel(node) + '</span>';
}""",
  """/* 节点文案走表，**去掉了敌人数量与敌人名**（遭遇细节藏起来，路线决策只保留节点类型）。
   v0.61.41：图标由「留空槽」改成**文件名表**（素材/ 下的相对路径，见 NODE_ICON / MAP_ICON_DIR）。
   换图只改这三张表（NODE_ICON / NODE_ICON_LOCKED / MAP_ROAD_ICON），渲染逻辑一个字都不用动。
   ⚠ 图标一律走 assetURL（= artImg/assetURL），**不能**在 HTML 里写死 素材/... —— 那样
     打包.py 的 ASSET_MAP 内联不会生效，单文件产物里会变成丢图。 */
const NODE_LABEL = { fight:'战斗', elite:'精英', unknown:'未知', camp:'篝火', shop:'商店', boss:'Boss' };
const MAP_ICON_DIR = 'map/';
const NODE_ICON  = { fight:'combat.png', elite:'ellite.png', unknown:'unknown.png', camp:'rest.png', shop:'shop.png', boss:'boss.png' };
/* 没解锁的关卡：一律挂锁，**不泄露它的类型**（用户给的 locked.png） */
const NODE_ICON_LOCKED = 'locked.png';
/* 道路贴图：两张图各是一条 45° 斜路，走左用 path-left、走右用 path-right */
const MAP_ROAD_ICON = { left:'map/path-left.png', right:'map/path-right.png' };
const NODE_TIP   = { fight:'普通战斗', elite:'精英战：更强的敌人，更好的奖励', unknown:'未知事件', camp:'篝火：休整或锻造', shop:'鬼市：买卖与删牌', boss:'守关 Boss' };
/* ⚠ endless 必须显式给，否则 act4 会 404 丢背景图。
   v0.61.41：地图背景改用用户给的 素材/bg/bg_map.jpg（setBg 已支持带扩展名的名字），
   全部幕共用这一张；战斗场景仍走 act1/act2/act3，两者互不影响。 */
const MAP_BG = { 1:'map.jpg', 2:'map.jpg', 3:'map.jpg', endless:'map.jpg' };
function mapBgName(){ return G.endless ? MAP_BG.endless : (MAP_BG[G.act]||MAP_BG[1]); }
function nodeLabel(node){ return node ? (NODE_LABEL[node.t] || NODE_LABEL.fight) : ''; }
function nodeIconHTML(file){ return artImg(MAP_ICON_DIR + file, '', 'node-ico'); }
function nodeHTML(node){
  return nodeIconHTML(NODE_ICON[node.t] || NODE_ICON.fight) + '<span class="node-label">' + nodeLabel(node) + '</span>';
}""",
  '50_ui 图标/背景表填实')

E('js/50_ui.js',
  """  for(let r=MAP.length-1;r>=0;r--){
    const rowCls = r<G.mapRow ? 'past' : r===G.mapRow ? 'current' : 'future';
    html+=`<div class="map-row ${rowCls}">`;
    for(let c=0;c<MAP[r].length;c++){
      const node=MAP[r][c], tier=fogTier(r,c), dc=`data-r="${r}" data-c="${c}"`;
      // v0.61.40：不可见的格子**仍然占位**（.empty 是 visibility:hidden，仍有尺寸）
      // → 地图总高度恒定，解锁进度变化时坐标不抖动
      if(tier==='hidden'){ html+=`<div class="map-node empty" ${dc}>&nbsp;</div>`; continue; }
      const tip=NODE_TIP[node.t]||'';
      if(tier==='choice'){ html+=`<button class="map-node" ${dc} title="${tip}" onclick="chooseNode(${c})">${nodeHTML(node)}</button>`; continue; }
      if(tier==='preview'){ html+=`<div class="map-node preview" ${dc} title="未知的前路">?</div>`; continue; }
      html+=`<div class="map-node" ${dc} title="${tip}">${nodeHTML(node)}</div>`;
    }
    html+=`</div>`;
  }""",
  """  for(let r=MAP.length-1;r>=0;r--){
    const rowCls = r<G.mapRow ? 'past' : r===G.mapRow ? 'current' : 'future';
    html+=`<div class="map-row ${rowCls}">`;
    for(let c=0;c<MAP[r].length;c++){
      const node=MAP[r][c], tier=fogTier(r,c), dc=`data-r="${r}" data-c="${c}"`;
      // v0.61.41：未解锁的格子不再留白，改挂 NODE_ICON_LOCKED（用户给的 locked.png）——
      // 每格都有内容 ⇒ 行高与坐标仍然恒定，解锁进度变化时不抖动；
      // preview（下一步会亮）与 hidden（更远/同层走不到）都挂锁，只有 past/choice 才露出真实图标。
      if(tier==='hidden'){ html+=`<div class="map-node locked" ${dc} title="尚未解锁">${nodeIconHTML(NODE_ICON_LOCKED)}</div>`; continue; }
      const tip=NODE_TIP[node.t]||'';
      if(tier==='choice'){ html+=`<button class="map-node" ${dc} title="${tip}" onclick="chooseNode(${c})">${nodeHTML(node)}</button>`; continue; }
      if(tier==='preview'){ html+=`<div class="map-node preview" ${dc} title="下一步可以走到这里（尚未解锁）">${nodeIconHTML(NODE_ICON_LOCKED)}</div>`; continue; }
      html+=`<div class="map-node" ${dc} title="${tip}">${nodeHTML(node)}</div>`;
    }
    html+=`</div>`;
  }""",
  '50_ui showMap 挂锁渲染')

E('js/50_ui.js',
  """  html+=`<div class="map-wrap"><svg class="map-lines" id="map-lines" aria-hidden="true"></svg>`;""",
  """  html+=`<div class="map-wrap"><div class="map-lines" id="map-lines" aria-hidden="true"></div>`;""",
  '50_ui map-lines 改 div')

E('js/50_ui.js',
  """/* v0.61.20(P2) / v0.61.40：地图路径连线。
   三种线：暗线 = 当前可走节点 → 它连到的**下一层可见**格；
           金虚线 = 现在这一步能走到的； 金实线 = 已经走过的。
   v0.61.40 起连边来自节点自带的 next（显式拓扑），不再用「列差≤1」猜；
   且**两端都必须可见** —— 否则一条暗线就出卖了未解锁层的拓扑。 */
let _mapLinkBound=false;
function drawMapLinks(){
  const svg=document.getElementById('map-lines');
  if(!svg || !svg.parentNode || !svg.parentNode.querySelectorAll) return;
  const wrap=svg.parentNode;
  const rows=Array.prototype.slice.call(wrap.querySelectorAll('.map-row'));
  if(!rows.length || !rows[0].getBoundingClientRect) return;
  const wb=wrap.getBoundingClientRect();
  svg.setAttribute('viewBox','0 0 '+wb.width+' '+wb.height);
  svg.setAttribute('width',wb.width); svg.setAttribute('height',wb.height);
  while(svg.firstChild) svg.removeChild(svg.firstChild);
  // DOM 顺序自上而下 = 层号自高而低，所以第 k 行是 MAP[MAP.length-1-k]
  // v0.61.40：行宽可变 + 隐藏格占位 → 不能再用 cells[c] 按**位置**取，改用 data-r/data-c 属性查询
  function nodeAt(r,c){
    const row=rows[MAP.length-1-r]; if(!row) return null;
    const el=row.querySelector('.map-node[data-r="'+r+'"][data-c="'+c+'"]');
    // .empty 是 visibility:hidden —— **仍有尺寸**，必须显式排除，否则连线会画到看不见的格子上
    if(!el || (el.classList && el.classList.contains('empty'))) return null;
    const b=el.getBoundingClientRect();
    if(!b.width && !b.height) return null;
    return { x:b.left-wb.left+b.width/2, y:b.top-wb.top+b.height/2 };
  }
  function seg(a,b,cls){
    if(!a||!b) return;
    const my=(a.y+b.y)/2;
    const p=document.createElementNS('http://www.w3.org/2000/svg','path');
    p.setAttribute('d',`M ${a.x} ${a.y} C ${a.x} ${my}, ${b.x} ${my}, ${b.x} ${b.y}`);
    p.setAttribute('class',cls);
    svg.appendChild(p);
  }""",
  """/* v0.61.20(P2) / v0.61.40 / v0.61.41：地图路径连线。
   三种线：暗线 = 当前可走节点 → 它连到的**下一层可见**格；
           金虚线 = 现在这一步能走到的； 金实线 = 已经走过的。
   v0.61.40 起连边来自节点自带的 next（显式拓扑），不再用「列差≤1」猜；
   且**两端都必须可见** —— 否则一条暗线就出卖了未解锁层的拓扑。
   v0.61.41：画法由「自绘 SVG 贝塞尔」换成**用户给的道路贴图**（MAP_ROAD_ICON）。
   贴图是一条 45° 斜路，所以按「起点→终点」的夹角旋转对齐；走左走右各一张。 */
let _mapLinkBound=false;
function drawMapLinks(){
  const layer=document.getElementById('map-lines');
  if(!layer || !layer.parentNode || !layer.parentNode.querySelectorAll) return;
  const wrap=layer.parentNode;
  const rows=Array.prototype.slice.call(wrap.querySelectorAll('.map-row'));
  if(!rows.length || !rows[0].getBoundingClientRect) return;
  const wb=wrap.getBoundingClientRect();
  while(layer.firstChild) layer.removeChild(layer.firstChild);
  // DOM 顺序自上而下 = 层号自高而低，所以第 k 行是 MAP[MAP.length-1-k]
  // v0.61.40：行宽可变 → 不能再用 cells[c] 按**位置**取，改用 data-r/data-c 属性查询
  function nodeAt(r,c){
    const row=rows[MAP.length-1-r]; if(!row) return null;
    const el=row.querySelector('.map-node[data-r="'+r+'"][data-c="'+c+'"]');
    // .empty 是 visibility:hidden —— **仍有尺寸**，必须显式排除，否则连线会画到看不见的格子上
    // （v0.61.41 起没有档会渲染它，这是兜底）
    if(!el || (el.classList && el.classList.contains('empty'))) return null;
    const b=el.getBoundingClientRect();
    if(!b.width && !b.height) return null;
    return { x:b.left-wb.left+b.width/2, y:b.top-wb.top+b.height/2 };
  }
  /* 道路贴图：中心对齐两点中点，尺寸按两点距离取（贴图对角线 = 边长 ⇒ 显示边长 = 距离/√2），
     再旋转到两点连线方向（贴图本身是 ±45°，所以补一个 ±45°）。 */
  function seg(a,b,cls){
    if(!a||!b) return;
    const dx=b.x-a.x, dy=b.y-a.y;
    const dist=Math.hypot(dx,dy);
    if(dist<4) return;
    const im=document.createElement('img');
    im.className='map-road '+cls;
    im.src=assetURL(MAP_ROAD_ICON[dx<0 ? 'left' : 'right']);
    im.alt='';
    im.style.left=((a.x+b.x)/2)+'px';
    im.style.top=((a.y+b.y)/2)+'px';
    const size=Math.max(42, Math.min(200, Math.round(dist*0.72)));
    im.style.width=size+'px'; im.style.height=size+'px';
    const ang=Math.atan2(dy,dx)*180/Math.PI;
    im.style.transform='translate(-50%,-50%) rotate('+((dx<0 ? ang-45 : ang+45))+'deg)';
    layer.appendChild(im);
  }""",
  '50_ui drawMapLinks 改道路贴图')

E('js/50_ui.js',
  """function showUnknown(){
  const pool=['well','blackmarket','temple','ambush','forge','empty','potion','remove'];
  const evs=shuffle(pool).slice(0,3);
  const labels={well:'古井许愿', blackmarket:'鬼市黑商', temple:'无头古庙', ambush:'拦路恶鬼', forge:'废弃道观', empty:'荒坟', potion:'灵泉', remove:'净坛'};
  const descs={well:'以 8 点生命许愿，换一件遗物', blackmarket:'神秘黑商塞给你一张牌', temple:'无头神像赐下随机祝福', ambush:'有恶鬼拦路（精英战）', forge:'免费锻造升级一张牌', empty:'什么也没有', potion:'饮一口灵泉，获得一瓶灵汁', remove:'焚符净坛，删掉牌组中的一张牌'};
  const html=evs.map(ev=>`<div class="relic" onclick="doUnknown('${ev}')"><div class="cname">${labels[ev]}</div><div class="cdesc">${descs[ev]}</div></div>`).join('');
  SCENE='unknown'; saveRun();
  setBGM('shop'); // v0.61.31：事件节点是非战斗场景，与商店/营地共用同一条轨
  showOverlay(`<h2>⚠ 未知之地</h2><p>前方雾气弥漫，你隐约察觉有三条路可走，各有机缘或凶险。选一条吧。</p><div class="reward-cards">${html}</div>`);
}""",
  """/* v0.61.41：**不再让玩家三选一** —— 踩到未知节点直接随机抽一个事件并立刻进入
   （用户要求：「未知关卡不要由玩家选择的环节，玩家直接进入随机环节」）。
   抽到什么用 floatMsg 报一声：原先靠三张卡面预告，现在没有预告了，总得让玩家知道发生了什么。 */
function showUnknown(){
  const pool=['well','blackmarket','temple','ambush','forge','empty','potion','remove'];
  const labels={well:'古井许愿', blackmarket:'鬼市黑商', temple:'无头古庙', ambush:'拦路恶鬼', forge:'废弃道观', empty:'荒坟', potion:'灵泉', remove:'净坛'};
  const ev=pool[Math.floor(rng()*pool.length)];
  SCENE='unknown'; saveRun();
  setBGM('shop'); // v0.61.31：事件节点是非战斗场景，与商店/营地共用同一条轨
  floatMsg('未知之地 · ' + (labels[ev]||''));
  doUnknown(ev);
}""",
  '50_ui showUnknown 直入随机')

# ============================================================ js/60_boot.js
E('js/60_boot.js',
  """  if(pv.miss){ el.textContent='⚠ '+pv.miss+' · 落空'; el.className='weak'; }
  else {
    const aoe=AOE_CARDS.includes(c.id)?' 全体':'';   // v0.61.33：与 needsTarget 的全体名单同一处真相
    const per=pv.perTurn?' 每回合':'';
    el.textContent='-'+pv.d+aoe+per;
    el.className = pv.weak ? 'weak' : '';
  }""",
  """  if(pv.miss){ el.textContent='⚠ '+pv.miss+' · 落空'; el.className='weak'; }
  else {
    const aoe=AOE_CARDS.includes(c.id)?' 全体':'';   // v0.61.33：与 needsTarget 的全体名单同一处真相
    const per=pv.perTurn?' 每回合':'';
    /* v0.61.41：预伤害的数字也走素材字形 —— numHTML 与伤害飘字共用一套（档位取 dmg）。
       素材没装/文本不是纯数字时返回 null ⇒ 原样回落文字，与改动前的表现完全一致。 */
    const glyph=numHTML('', '-'+pv.d);
    if(glyph) el.innerHTML=glyph+aoe+per; else el.textContent='-'+pv.d+aoe+per;
    el.className = pv.weak ? 'weak' : '';
  }""",
  '60_boot 预伤害走字形')

E('js/60_boot.js',
  """function toggleLowSpec(){
  SETTINGS.lowSpec=!SETTINGS.lowSpec; persistSettings(); applyLowSpec(); showSettings();
}""",
  """function toggleLowSpec(){
  SETTINGS.lowSpec=!SETTINGS.lowSpec; persistSettings(); applyLowSpec(); showSettings();
}
/* v0.61.41：浮字自检 —— 四档各放一次，并把 NUM_STATE 摊开显示。
   存在的理由：飘字到底是在走素材（图片）还是回落文字、以及**是不是被「流畅模式」整段关掉了**，
   光靠肉眼在快节奏战斗里分不清（流畅模式只影响两处 CSS 动画，很不容易被察觉）。 */
function numSelfTest(){
  numPrewarm();
  [['', '伤害'], ['to-player', '受伤'], ['block', '格挡'], ['heal', '治疗']].forEach(function(kv,i){
    setTimeout(function(){ floatDamage('-12', kv[0], null, {}); }, i*260);
  });
  const st=['dmg','hurt','block','heal'].map(function(k){
    const v=NUM_STATE[k];
    return k+'='+(v===1?'图片':v===-1?'回落文字':'未探测');
  }).join('　');
  const lbl=document.getElementById('numStateLbl'); if(lbl) lbl.textContent=st;
  floatMsg((fx() ? '飘字：开　' : '飘字被「流畅模式」整段关掉了　') + st);
}""",
  '60_boot 浮字自检函数')

E('js/60_boot.js',
  """    <p style="margin-top:16px">流畅模式（低配机）：<b style="color:${SETTINGS.lowSpec?'var(--green)':'var(--red)'}">${SETTINGS.lowSpec?'开':'关'}</b></p>
    <button class="btn ghost" onclick="toggleLowSpec()">${SETTINGS.lowSpec?'关闭流畅模式':'开启流畅模式'}</button>""",
  """    <p style="margin-top:16px">流畅模式（低配机）：<b style="color:${SETTINGS.lowSpec?'var(--green)':'var(--red)'}">${SETTINGS.lowSpec?'开':'关'}</b><br><small style="color:var(--dim);font-size:12px">开启后会关掉震屏 / 抖动 / <b>伤害飘字</b></small></p>
    <button class="btn ghost" onclick="toggleLowSpec()">${SETTINGS.lowSpec?'关闭流畅模式':'开启流畅模式'}</button>
    <p style="margin-top:16px">伤害飘字：<b style="color:${fx()?'var(--green)':'var(--red)'}">${fx()?'开':'关（流畅模式）'}</b> <span id="numStateLbl" style="font-size:12px;color:var(--dim)"></span></p>
    <button class="btn ghost" onclick="numSelfTest()">浮字自检（四档各放一次）</button>""",
  '60_boot 设置面板浮字自检')

E('js/60_boot.js',
  """loadSave();
loadSettings();
applyLowSpec();""",
  """loadSave();
loadSettings();
applyLowSpec();
numPrewarm();   // v0.61.41：四档字形开局就预加载 —— 否则本局第一次飘字必然回落文字""",
  '60_boot 开局预加载字形')

E('js/60_boot.js',
  '<h2>志 怪 塔 · v0.61.40</h2>',
  '<h2>志 怪 塔 · v0.61.41</h2>',
  '版本号 开屏')


def apply_all():
    ns = {}
    for path, old, new, note in EDITS:
        full = os.path.join(ROOT, path)
        if full not in ns:
            raw = io.open(full, 'r', encoding='utf-8', newline='').read()
            nl = '\r\n' if '\r\n' in raw else '\n'
            ns[full] = {'nl': nl, 'body': raw.replace('\r\n', '\n'), 'raw': raw}
        st = ns[full]
        cnt = st['body'].count(old)
        if cnt != 1:
            print('[FAIL] %-16s 锚点命中 %d 次（期望 1）: %s' % (path, cnt, note))
            return False
        st['body'] = st['body'].replace(old, new)
        print('[ok]   %-16s %s' % (path, note))
    for full, st in ns.items():
        out = st['body'] if st['nl'] == '\n' else st['body'].replace('\n', '\r\n')
        if out == st['raw']:
            print('[warn] %s 内容未变，跳过写入' % full)
            continue
        io.open(full, 'w', encoding='utf-8', newline='').write(out)
        print('[write] %s' % os.path.relpath(full, ROOT))
    return True


if __name__ == '__main__':
    sys.exit(0 if apply_all() else 1)