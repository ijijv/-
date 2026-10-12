/* ============================================================================
 * 志怪塔 · js/50_ui.js —— 界面层
 * 爬塔地图 / 奖励与篝火 / 鬼市商店 / 图鉴 / 成就 / 签到·广告占位 / 埋点 / 牌库 / 渲染 render / 拖拽出牌
 * ----------------------------------------------------------------------------
 * 由 原型.html 的整段内联脚本按原顺序切分而来（v0.61.05 三层重构，纯搬移）。
 * 拼接校验：本文件组去掉各自横幅后，应与切分前的内联脚本正文逐字节一致。
 * 加载：经典外链脚本（非 ES module），双击本地打开即可直接游玩。
 * ============================================================================ */
/* ===================== 爬塔地图 ===================== */
/* ===================== 爬塔地图（v0.61.40：随机树状图 + 逐层迷雾） ===================== */
/* 节点文案走表，**去掉了敌人数量与敌人名**（遭遇细节藏起来，路线决策只保留节点类型）。
   v0.61.41：图标由「留空槽」改成**文件名表**（素材/ 下的相对路径，见 NODE_ICON / MAP_ICON_DIR）。
   换图只改这三张表（NODE_ICON / NODE_ICON_LOCKED / MAP_ROAD_ICON），渲染逻辑一个字都不用动。
   ⚠ 图标一律走 assetURL（= artImg/assetURL），**不能**在 HTML 里写死 素材/... —— 那样
     打包.py 的 ASSET_MAP 内联不会生效，单文件产物里会变成丢图。 */
const NODE_LABEL = { fight:'战斗', elite:'精英', unknown:'未知', camp:'篝火', shop:'商店', boss:'Boss' };
const MAP_ICON_DIR = 'map/';
const NODE_ICON  = { fight:'combat.png', elite:'ellite.png', unknown:'unknown.png', camp:'rest.png', shop:'shop.png', boss:'boss.png' };
/* 没解锁的关卡：一律挂锁，**不泄露它的类型**（用户给的 locked.png） */
const NODE_ICON_LOCKED = 'locked.png';
/* 道路贴图（MAP_ROAD_ICON = path-left/right.png）在 v0.61.42 随「路径回到代码自绘」一并**退役**：
   曲线改由 drawMapLinks 用 SVG 二次贝塞尔现画（还要做沿路径延长的光边动画，贴图做不到）。
   v0.62.0：用户明确授权后，这两张图已从 素材/map/ 下**真正删除**（不再有「退役但仍占盘」的状态）。 */
/* v0.61.42：地图落位 —— 5 个槽位（%），每格随机占一个 + 抖动，故而不再整齐排成等距列。
   槽位间距 21%，抖动上限 ±3% / ±7px ⇒ 不会越槽、也不会与相邻列撞在一起。
   v0.76.1：±4% → ±3%（理由见 js/20_data.js 的 assignSlots 头注：96% 处节点贴画心边被裁）。 */
const MAP_SLOT_PCT = [8, 29, 50, 71, 92];
function mapSlotPct(node){
  const i = (node && typeof node.sx==='number') ? node.sx : 2;
  return MAP_SLOT_PCT[Math.max(0, Math.min(MAP_SLOT_PCT.length-1, i))];
}
/* 每格的内联落位（left 用 %、top 用 px 抖动）。生成器保证 sx/jx/jy 一定有值，
   这里仍做兜底：老档（v<=3 的存档只存 mapSeed，地图是重算的）与手造 fixture 可能没有这三个字段。 */
function mapNodeStyle(node){
  if(!node) return '';
  const left=mapSlotPct(node)+(node.jx||0);
  const top=(node.jy||0);
  return 'left:'+left.toFixed(2)+'%;top:'+top+'px;';
}
const NODE_TIP   = { fight:'普通战斗', elite:'精英战：更强的敌人，更好的奖励', unknown:'未知事件', camp:'篝火：休整或锻造', shop:'鬼市：买卖与删牌', boss:'守关 Boss' };
/* v0.61.41：地图背景改用用户给的 素材/bg/bg_map.jpg（setBg 已支持带扩展名的名字），
   全部幕共用这一张；战斗场景仍走 act1/act2/act3，两者互不影响。 */
const MAP_BG = { 1:'map.jpg', 2:'map.jpg', 3:'map.jpg' };
function mapBgName(){ return MAP_BG[G.act]||MAP_BG[1]; }
function nodeLabel(node){ return node ? (NODE_LABEL[node.t] || NODE_LABEL.fight) : ''; }
/* extra：附加到 .node-ico 上的类（v0.62.0 的锁破裂过渡要挂 .o-reveal 把真实图标先藏起来） */
function nodeIconHTML(file, extra){ return artImg(MAP_ICON_DIR + file, '', 'node-ico' + (extra ? (' ' + extra) : '')); }
function nodeHTML(node){
  return nodeIconHTML(NODE_ICON[node.t] || NODE_ICON.fight) + '<span class="node-label">' + nodeLabel(node) + '</span>';
}
/* —— 地图查询：迷雾渲染与连线的唯一真相 —— */
function mapNodeAt(r,c){
  if(r<0 || r>=MAP.length || !MAP[r] || c<0 || c>=MAP[r].length) return null;
  return MAP[r][c] || null;
}
function mapVisited(r,c){ return (G.mapPath||[]).some(function(p){ return p.r===r && p.c===c; }); }
/* 当前层这一格能不能走：
   · 开局/换幕/旧档降级（mapCol<0）→ 整层可选
   · 上一层那格找不到（列越界等）→ 放宽为整层可选（防软锁）
   · 否则必须由上一层的 next 显式连过来 */
function mapReachable(r,c){
  const node=mapNodeAt(r,c);
  if(!node) return false;
  if(r!==G.mapRow) return false;
  /* v1.1.x（用户 2026-10-11）：「从事件关卡或者商店不行动返回地图，就再也打不开关卡了」。
     根因：chooseNode 一进节点就把这格 push 进 G.mapPath（它当场变「已走」），
     而这时 G.mapRow 还没推进（只有 goNext 会 G.mapRow++）。
     事件/商店面板上的「返回地图」回到地图后，这一格被 fogTier 判成 past（渲染成非按钮 div），
     当前层剩下的兄弟格又大多不可达 ⇒ **一格都点不动**，只能从底部菜单退局。
     判据：**当前层 + 正是最后一步选中的那一格** = 「节点还没结算完」⇒ 仍然可达。
     走过之后（goNext 把 mapRow 推上去）last.r < r，这条不再命中，已完成的关卡不会被重新打开。 */
  const _p=G.mapPath||[], _last=_p[_p.length-1];
  if(_last && _last.r===r && _last.c===c) return true;
  if(r===0 || G.mapCol<0) return true;
  const up=mapNodeAt(r-1, G.mapCol);
  if(!up) return true;
  return (up.next||[]).indexOf(c)>=0;
}
/* 下一步会解锁哪几格 = 当前所有可走节点 next 的并集。
   ⚠️ 这是「下一步会亮哪几格」的**现行**语义（冒烟 4410 / 4412 / 4423 钉着它），
   与下面的 mapRevealedColsAt 是两件事 —— **别合并、别删**。 */
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
/* —— v0.63.0：地图不再遗忘 ——
   旧版 fogTier 只按**当前位置**算：你站在第 N 层时那层没走的格子是亮的，走掉一格之后它们就退回
   hidden（变回锁）⇒ 走过的路只剩「一条链 + 当前一层」，满屏互不相连的锁
   —— 用户报的「每个关卡的图标都要有路径相连」没做到，根因就在这。
   现在按**你当时真的看过什么**累积：第 r 层亮过的真图标 = next(你在 r-1 层站的那一格)
   —— 也就是「你当时能走的那几个」，正是 mapReachable 在第 r 层的历史版本。
   三条性质（前两条钉在冒烟里，改坏会红）：
     · 不剧透：未来层一个字都不漏；preview 层照旧挂锁（它的身份从没露过，所以它**不算**看过）；
     · 不孤立：亮出来的每一格都挂得到一个**也亮着**的父节点 ⇒ 图标永远有线（用户那句话本身）；
     · 纯函数：只依赖 MAP / G.mapRow / G.mapPath，不新增存档字段，旧档照读。 */
function mapHistoryCol(row){   // 第 row 层「当时站的那一格」列号；查不到返回 -1
  const p=G.mapPath||[];
  for(let i=p.length-1;i>=0;i--) if(p[i] && p[i].r===row) return p[i].c;
  return -1;
}
/* 父链完不完整 / 当前层是不是「没有唯一父节点」。任一成立 ⇒ 0..mapRow-1 **全部**整层亮。
   两种情况：
     · 当前层没有唯一的父节点（mapCol 越界或 <0）—— 此时当前层整层可选，它每一格的父节点都得亮着；
     · mapPath 的父链断了一环（旧档：40_flow.js:238 老存档没 mapPath → 空数组；或有人手改档）。
   为什么整段一起亮、而不是只亮断的那一层：整层亮的那一层，它自己的格子要挂得上父节点，
   就得**上一层也整层亮**，一环一环往回推就是这个结论。多亮一层的代价，
   远小于「图标孤零零没有线」—— 那正是用户报的那个毛病。 */
function mapDegraded(){
  if(G.mapRow>0 && (G.mapCol<0 || !mapNodeAt(G.mapRow-1, G.mapCol))) return true;
  for(let r=1;r<=G.mapRow-1;r++){
    const pc=mapHistoryCol(r-1);
    if(pc<0 || !mapNodeAt(r-1,pc)) return true;
  }
  return false;
}
/* 第 row 层「亮过真图标」的列。只有 row ≤ G.mapRow 才有意义；未来层一律空（不剧透）。 */
function mapRevealedColsAt(row){
  const out=[]; const cur=MAP[row]||[];
  if(row>G.mapRow) return out;
  if(row===G.mapRow){                 // 当前层：直接转调 mapReachable，绝不复制逻辑（免得两处口径分叉）
    for(let c=0;c<cur.length;c++) if(mapReachable(row,c)) out.push(c);
    return out;
  }
  if(mapDegraded()){                  // 降级：整层亮（理由见 mapDegraded）
    for(let c=0;c<cur.length;c++) out.push(c);
    return out;
  }
  if(row<=0){
    /* 第 0 层是特例：它**没有上一层**，所以它的非所选格永远挂不到任何可见父节点上（永远没线）。
       「每个关卡的图标都要有路径相连」⇒ 挂不上线的图标就不该亮，于是第 0 层只亮走过的那些。
       （其它层不适用这条：那些层的兄弟格会连到你在下一层站的那一格上，线是有的。） */
    for(let c=0;c<cur.length;c++) if(mapVisited(row,c)) out.push(c);
    return out;
  }
  const up=mapNodeAt(row-1, mapHistoryCol(row-1));
  (up.next||[]).forEach(function(j){ if(out.indexOf(j)<0 && mapNodeAt(row,j)) out.push(j); });
  return out;
}
/* 四档：past（走过的 / 当时看过的真图标）/ choice（现在能走）/ preview（下一步会亮，仍是锁）
        / hidden（其余，挂锁但不属于任何「看过的范围」）。 */
function fogTier(r,c){
  // ⚠️ 第一件事必须是「这格不存在 → hidden」：夹具里 fogTier(1,1)/(1,2) 就落在不存在的列上
  if(!mapNodeAt(r,c)) return 'hidden';
  if(mapVisited(r,c)){
    /* v1.1.x：刚从事件/商店「返回地图」时，这一步选中的那格必须仍渲染成**可点按钮**
       （否则 past 是 <div>，玩家一格都点不动 —— 见 mapReachable 里的同一段说明）。 */
    const _p=G.mapPath||[], _last=_p[_p.length-1];
    if(r===G.mapRow && _last && _last.r===r && _last.c===c) return 'choice';
    return 'past';                               // 走过的格子，**任何层**都是 past（含刚打完的那一层）
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
/* —— v0.62.0 地图顶栏（用户说「上方的玩家信息栏你重新设计」，这块交给我）——
   只负责**排版**：取值全部复用现成件 —— 头像 artImg('hero/<id>.png')、血条现成的 .hpbar 三件套 +
   .hp-label 叠数值、金币/幕/层 G.gold/ACT_NAMES/G.mapRow、遗物 relicIcon+relById（同 runStatusHTML 的口径）、
   尸气与血怒的分支判据照抄 renderTopbar（G.hero==='ganshiren' / 'yincha'）。
   ⚠️ 战斗页的 #topbar + renderTopbar **一行没动** —— 这里只用新增的 .mt-* 类，
   绝不改 .stat/.hpbar/.prelic-chip 既有规则，免得波及战斗页。 */
function mapTopbarHTML(){
  const hero=HEROES.find(h=>h.id===G.hero);
  const hpPct=G.maxHp>0 ? Math.max(0, Math.min(100, Math.round(G.hp/G.maxHp*100))) : 0;
  let res='';
  if(G.hero==='ganshiren') res=`<span class="mt-shiqi">尸气 <b>${G.尸气}/${relicMaxShiqi()}</b></span>`;
  else if(G.hero==='yincha') res=`<span class="mt-xuenu">血怒 <b>${G.xuenu||0}/${relicMaxXuenu()}</b></span>`;
  /* v1.1.x：遗物不再排进地图顶栏 —— 与战斗顶栏同一口径，内容统一收进「锦囊」入口（下方那枚按钮）。
     血条独占第二行，空出来的横向空间留给生命条。 */
  return `<div class="map-topbar">
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
      <button class="mt-jinnang" id="mtJinnangBtn" onclick="showJinnang()" title="锦囊" aria-label="锦囊">${iconTag('ui/menu/jinnang-nobg.png','锦囊')}</button>
    </span>
  </div>`;
}

/* —— v0.62.0 地图相机 ——
   行为（用户要求）：选完英雄进场时镜头**由 Boss 层往下缓入、最后缓停在第 1 层**；之后每打完一关，
   镜头**只往上走一行**（600ms ease-out），**不回地图顶部、不重播进场动画**。
   实现：类/内联样式切换驱动 CSS transition（不手写 rAF 插值）—— .map-sheet 默认 600ms，
   进场时把 transition-duration 临时换成 2000ms。
   坐标：行 r 的顶边离画心顶 (MAP.length-1-r)*rowH（DOM 顺序是**从 r 大排到 r 小**，
   所以 Boss 在最上、第 1 层在最下）。要让第 r 层停在窗口底部：
     camY = (MAP.length-r)*rowH - viewportH，夹在 [0, maxY]，maxY = 画心高 - 窗口高。
     ⇒ r=0（第 1 层）camY=maxY 贴底；r=13（Boss）camY≤0 被夹到 0 贴顶。
   ⚠️ rowH 必须**实测**（.map-row 桌面 88px，≤520px 是 68px，≤360px 是 58px），写死 88 会让窄屏错位。
   ⚠️ drawMapLinks **不用改**：它用 getBoundingClientRect() 相减定位，而 SVG 层与 .map-row 同在
   .map-sheet 里、共享同一个 transform，位移在相减时正好抵消（overflow:hidden 也不影响布局测量）。
   —— 这条是本节最省事的地方，别「顺手修坏」。 */
let _mapStepFrom = -1;    // 上一帧相机停在哪一行；-1 = 不放「只上一行」的动画（重开地图/续档/换幕）
let _mapCamBound = false;
function measureRowH(){
  const el=document.querySelector('.map-row');
  const h=el && el.offsetHeight;
  return h ? h : 88;      // 兜底值与 CSS 桌面档一致；窄屏两档靠实测拿到
}
/* 相机几何：行高 / 画心高 / 窗口高 / 最大位移 / 画心上内边距。mapCamInit 与拖拽**共用这一处**，
   免得两处各算一套（拖拽用的是同一个 maxY，夹取才不会和进场动画对不上）。 */
function mapCamRange(){
  const sheet=document.getElementById('map-sheet');
  const vp=document.getElementById('map-viewport');
  const rowH=measureRowH();
  const sheetH=(sheet && sheet.offsetHeight) || (MAP.length*rowH);
  const vpH=(vp && (vp.clientHeight || vp.offsetHeight)) || 0;
  let maxY=sheetH-vpH; if(!(maxY>0)) maxY=0;
  /* v0.63.0 修的一处基准差：.map-sheet 有 padding:30px 0（上下留白，弧线外凸时不被裁），
     而 camYForRow 用的是「层高 × 层数」这一套基准 —— 少了这段 padding，算出来的位置一律
     偏小 30px，第 1 层贴底时会**被切掉一截**。这里实测取它（窄屏是 22 / 18px，写死必错）。 */
  let padTop=0;
  try{
    const cs=(typeof window!=='undefined' && window.getComputedStyle && sheet) ? window.getComputedStyle(sheet) : null;
    if(cs){ const v=parseFloat(cs.paddingTop); if(v>0) padTop=v; }
  }catch(e){ padTop=0; }
  return { rowH:rowH, sheetH:sheetH, vpH:vpH, maxY:maxY, padTop:padTop };
}
/* padTop 是 v0.63.0 新加的**可选**第 5 参（默认 0）—— 不传时行为与 v0.62.0 逐字节一致
   （冒烟 5355/5356 钉着 camYForRow(3,88,900,0)===900）。 */
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
    // transition-duration 显式两边都写：内联样式压得过 .cam-nofx 的 transition:none，
    // 只靠类会给上一次残留的时长留后门
    sheet.style.setProperty('transition-duration', (animate ? (ms||600) : 0)+'ms');
    sheet.style.setProperty('--camY', y+'px');
  }
}
/* 当前相机位置（读回 --camY）。拖动要的是「按下那一刻在哪」，不能每帧从 G 重算 ——
   用户可能已经把画面拖到任意位置了。 */
function mapCamNow(){
  const sheet=document.getElementById('map-sheet');
  if(!sheet || !sheet.style || !sheet.style.getPropertyValue) return 0;
  const v=parseFloat(sheet.style.getPropertyValue('--camY'));
  return v>0 ? v : 0;
}
/* entry=true：进场动画（Boss 层 → 目标层，2000ms）；stepFrom>=0：从上一行的位置单步移动（600ms）；
   其它：直接落位不放动画。!fx()（流畅模式）一律直接落位。 */
function mapCamInit(entry, stepFrom){
  const sheet=document.getElementById('map-sheet');
  const vp=document.getElementById('map-viewport');
  if(!sheet || !vp) return;
  const C=mapCamRange();
  const target=camYForRow(G.mapRow, C.rowH, C.maxY, C.vpH, C.padTop);
  if(!fx()){ setMapCam(target, false, 0); return; }
  if(entry){
    setMapCam(0, false, 0);              // ① 无动画地钉在 Boss 层
    void sheet.offsetHeight;             // ② 强制一次重排，让 --camY:0 真的生效
    setMapCam(target, true, 2000);       // ③ 再缓入到目标层并缓停
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
/* —— v0.63.0：地图自由滑动（用户选的：「纯自由滑动，不吸附」）——
   旧版地图页**零个**滚轮/触摸/指针处理，--camY 全项目只有 setMapCam 一个写点 ⇒
   画心只能靠进场动画与「打完一关自动上一行」移动，手指根本拖不动（用户报的「地图无法滑动」）。
   手感：跟手（每次 pointermove 直接落位、无过渡、无惯性）、松手**停在哪儿就是哪儿**（不吸附到整行），
        只把位移夹在 [0, maxY]（**夹取不是吸附** —— 它只防拖出纸外，不会把画面拉回某一行）。
   手法照抄 js/60_boot.js 的出牌拖拽：pointerdown 挂视口、move/up/cancel 挂 document、
   不用 setPointerCapture（它在 file:// 与部分国产浏览器上不顶用）。 */
let _mapDragBound=false, _mapDrag=null;
let _mapUserScrolled=false;   // 用户手动滑过 —— resize 时据此决定「别把镜头拽回当前层」
let _mapCamRatio=0;           // 上次拖动结束时 camY/maxY，resize 换尺寸后按这个比例保位
let _mapEatClickUntil=0;      // 拖完地图后的一小段窗口内忽略节点点击（见 chooseNode）
/* 拖动位移 → 相机位置。**纯函数**（抽出来是为了冒烟能直接对拍 —— 指针手势在 VM 里测不了）。 */
function mapDragCam(startCam, dy, maxY){
  let y=startCam-dy;          // 手指下滑(dy>0) = 想看更下面的层 ⇒ camY 变小
  if(!(y>0)) y=0;
  if(y>maxY) y=maxY;
  return y;
}
/* 按比例换算相机位置（resize 保位用）。同样是纯函数。 */
function mapCamFromRatio(ratio, maxY){
  let y=(ratio>0?ratio:0)*maxY;
  if(!(y>0)) y=0;
  if(y>maxY) y=maxY;
  return y;
}
/* v0.64.1：滚轮位移 → 相机位置。**纯函数**（与 mapDragCam 同理，滚轮事件在 VM 里测不了）。
   方向与拖动一致：往下滚(deltaY>0) = 想看更**下**面的层（第 1 层在画心底端、Boss 在顶端）
   ⇒ camY 变大（camY 越大画心越往上走）。与普通文档「往下滚 = 看下面」的直觉一致。
   deltaMode：0=像素、1=行、2=页 —— Firefox 常见**行模式**，不换算的话滚一格几乎不动（值只有 3）。
   仍是 [0, maxY] 夹取，与拖动共用同一套边界，不吸附、不越界。 */
function mapWheelCam(startCam, deltaY, deltaMode, maxY, vpH){
  let d=(typeof deltaY==='number' && isFinite(deltaY)) ? deltaY : 0;
  if(deltaMode===1) d=d*16;                      // 行 → 像素（16 与浏览器默认行高同量级）
  else if(deltaMode===2) d=d*((vpH>0)?vpH:600); // 页 → 像素
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
    if(!(C.maxY>0)) return;        // 一屏就装得下：没有可滑的余地，别抢走点击
    _mapDrag={ id:ev.pointerId, sy:ev.clientY, cam:mapCamNow(), maxY:C.maxY, moved:false };
  });
  document.addEventListener('pointermove', function(ev){
    const d=_mapDrag; if(!d) return;
    if(d.id!=null && ev.pointerId!=null && ev.pointerId!==d.id) return;
    const dy=ev.clientY-d.sy;
    if(!d.moved && Math.abs(dy)<7) return;   // 7px 阈值：与出牌拖拽同一口径，防手抖/防「点一下」被当成拖动
    d.moved=true; _mapUserScrolled=true;
    const y=mapDragCam(d.cam, dy, d.maxY);
    setMapCam(y, false, 0);                  // 直接落位：transition-duration 被写成 0ms，跟手不飘
    _mapCamRatio = d.maxY>0 ? y/d.maxY : 0;
    if(ev.cancelable) ev.preventDefault();
  }, {passive:false});
  const up=function(){
    const d=_mapDrag; if(!d) return;
    _mapDrag=null;
    if(!d.moved) return;                     // 没动 = 就是一次点击，交给节点自己的 onclick
    /* 拖过就吃掉紧随其后的那一次 click —— 手指从节点图标上起拖也会走到这里，
       不拦的话「拖地图」会被判成「点了那个节点」（对应出牌拖拽里的 if(!d.moved)）。 */
    _mapEatClickUntil=(typeof Date!=='undefined' && Date.now) ? Date.now()+400 : 0;
  };
  document.addEventListener('pointerup', up);
  document.addEventListener('pointercancel', up);
  /* —— v0.64.1：滚轮 ——
     地图是**变换驱动**的（画心靠 --camY 位移、窗口 overflow:hidden），里面没有任何可原生滚动的
     内容 ⇒ 不接管的话滚轮**完全没反应**（用户报的「鼠标滚轮无法滚动地图，必须按住中键」）。
     passive:false 是必须的：默认 passive 下 preventDefault() 无效，页面会跟着一起滚。
     每次从 mapCamNow() 读当前值再累加，不用「一格 = 一行」那种量化步进 —— 与拖动同为自由滑动。 */
  document.addEventListener('wheel', function(ev){
    const vp=document.getElementById('map-viewport');
    if(!vp || !ev || !ev.target) return;
    let inside=false;
    try{ inside = vp.contains ? vp.contains(ev.target) : (ev.target===vp); }catch(e){ inside=false; }
    if(!inside) return;
    const C=mapCamRange();
    if(!(C.maxY>0)) return;                  // 一屏装得下：没有可滚的余地，让页面自己滚
    if(ev.cancelable) ev.preventDefault();
    const y=mapWheelCam(mapCamNow(), ev.deltaY, ev.deltaMode, C.maxY, C.vpH);
    setMapCam(y, false, 0);                  // 与拖动同一条落位路径：无过渡、跟手
    _mapUserScrolled=true;
    _mapCamRatio = C.maxY>0 ? y/C.maxY : 0;
  }, {passive:false});
  /* 兜底护栏：画心窗口内一律掐掉原生拖拽。CSS 的 -webkit-user-drag:none 与 artImg 的
     draggable="false" 已经各拦一道，这里再拦一道 —— 将来谁往地图里加个可拖元素也不会复发。 */
  document.addEventListener('dragstart', function(ev){
    const vp=document.getElementById('map-viewport');
    if(!vp || !ev || !ev.target) return;
    let inside=false;
    try{ inside = vp.contains ? vp.contains(ev.target) : false; }catch(e){ inside=false; }
    if(inside && ev.cancelable) ev.preventDefault();
  });
}
/* 描边分档（用户要求：「达到的关卡的图标要有淡白色的描边，过去的关卡白色描边消失」）：
   past → 描边消失；choice → 淡白描边（当前层再叠暗金发光）；preview/hidden → 还是锁，无描边。
   ⚠️ v0.63.0 由「按行给」改成「按档位给」：按行给会让**当前层里那些走不到的锁**也拿到 o-reached
   （淡白描边），看起来像能走的关卡 —— 而它们底下连一条线都没有，正是用户报的
   「每个关卡的图标都要有路径相连」看见的那批假图标。 */
function nodeOutlineTier(tier){
  if(tier==='past') return 'o-past';
  if(tier==='choice') return 'o-reached';
  return 'o-locked';
}
/* v0.62.0：把卷轴三张素材（上/下木轴 + 画心）的地址从 CSS 的**相对路径**换成 assetURL() 的结果。
   为什么必须有这一步：原型.html 里的 `url(素材/map/scroll_top.png)` 在开发期能解析（两者同级），
   但 dist/志怪塔.html 是**单文件产物** —— 打包.py 只把 素材/ 收进 ASSET_MAP（base64），
   **不重写 CSS 里的 url()**（它只特判了 <img src="素材/rune.png">）。所以产物里那三条相对路径会 404，
   木轴与画心会整片消失；靠这里写内联 background-image 覆盖掉。
   ⚠️ 只覆盖 background-image —— size / position / repeat 三个长手仍由 CSS 给（画心是两层背景，
      顺序必须与 CSS 一致：先「画」后「纸」）。querySelector 取不到（老浏览器 / 冒烟桩）就整体跳过，
      退回 CSS 那条相对路径，等于开发期的行为。 */
function applyMapTextures(){
  const q=function(sel){ try{ return document.querySelector(sel); }catch(e){ return null; } };
  const set=function(el, v){ if(el && el.style) el.style.backgroundImage=v; };
  /* v1.0.8（手机端性能）：带 wantBlob=true —— 这三张都是大图（含 bg_map.jpg），
     单文件产物里是几百 KB 的 base64，而每次进地图场景都要重新塞进 CSS。 */
  const u=function(rel){ return 'url("'+assetURL(rel, true)+'")'; };
  set(q('.map-roller.top'), u('map/scroll_top.png'));
  set(q('.map-roller.bot'), u('map/scroll_bottom.png'));
  set(q('#map-sheet'), u('bg/bg_map.jpg')+', '+u('map/scroll_paper.jpg'));
}
/* v0.66.0：主菜单三张背景轮换。**每次进主界面**前进一格 —— 开游戏 / 死亡回菜单 /
   从设置重开回菜单，三条路径都走 showStartScreen()，所以在那里调用就天然全覆盖。
   索引存 SAVE（跨启动续上；老存档没有这个字段 ⇒ `undefined|0` = 0，从第一张开始）。
   ⚠️ 必须走 assetURL() 内联 background-image（同 v0.65.0 的约定）：打包.py 只把 素材/ 收进
      ASSET_MAP（base64），**不重写 CSS 里的 url()** —— 在 原型.html 写
      url(素材/bg/menu/menu_1.jpg) 在 dist 里会 404，且 _patch/verify_dist.py 的 [5] 结构门禁会 FAIL
      （判据：url() 里的相对路径须在产物 <script> 段里找得到**字面量**）。
   ⚠️ 也不能用 bgRel() —— 它固定拼 'bg/bg_' + name + '.png'，套不进 bg/menu/ 这个子目录。
   取不到 .menu-bgimg（非主菜单场景 / 冒烟桩）就整体跳过，退回 CSS 的渐变兜底，观感不塌。 */
var MENU_BGS = ['bg/menu/menu_1.jpg','bg/menu/menu_2.jpg','bg/menu/menu_3.png'];
function menuBgRotate(){
  var n=MENU_BGS.length;
  if(!n) return 0;
  /* 负值与越界都兜住：`%` 在 JS 里对负数返回负值，只做一次 % 会让下标变负、取到 undefined */
  var i=(((SAVE.menuBgIdx|0) % n) + n) % n;
  SAVE.menuBgIdx=(i+1)%n;
  try{ persistSave(); }catch(e){}
  const q=function(sel){ try{ return document.querySelector(sel); }catch(e){ return null; } };
  const set=function(el,v){ if(el && el.style) el.style.backgroundImage=v; };
  set(q('.menu-bgimg.a'), 'url("'+assetURL(MENU_BGS[i])+'")');
  set(q('.menu-bgimg.b'), '');   // 双缓冲的另一片：本批只做硬切，留空备用（见 CSS 的 .menu-bgimg 注释）
  return i;
}
/* 演出是否该被跳过：低配模式或系统「减弱动态效果」。CSS 会把那几条 keyframes 全置 none，
   此时再等满 1 秒就是纯粹的干等 ⇒ 缩短到几乎立刻切场景（但**不能**不等，见 steleBreak 的注释）。 */
function menuFxOff(){
  try{ if(SETTINGS.lowSpec) return true; }catch(e){}
  try{ return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  catch(e){ return false; }
}
/* —— 按键演出 ——
   ⚠️ MENU_BUSY 是**必须的**：没有它，1 秒演出窗口里连点会调两次 startGame()（冒烟有专门断言）。
      除了这个闸，.menu-stage.is-busy 还会把整块舞台的 pointer-events 关掉。
   ⚠️ 收尾一律用**定时器**而不是 animationend：碎片是 5 片 × 1 条 keyframes，animationend 会触发
      5 次；而且 low-spec / prefers-reduced-motion 下动画被 CSS 关掉时 animationend **永远不来**，
      靠它收尾会当场卡死 —— 定时器在这两种情况下照跑。 */
var MENU_BUSY=false;
function menuBusy(on){
  MENU_BUSY=!!on;
  const st=(function(){ try{ return document.querySelector('.menu-stage'); }catch(e){ return null; } })();
  if(st && st.classList) st.classList.toggle('is-busy', !!on);
}
/* 石碑按下：裂 → 崩碎 → 全屏闪，峰值处切场景。
   时间轴：0 挂 .is-breaking（碎片 keyframes 自身包含「裂 0~53%」与「崩 53%~100%」两段，
   5 片各错 0/.04/.08/.12/.16s，最晚一片 1.01s 收尾）→ 800ms 起闪（0.26s，峰值在 +130ms）
   → 930ms 调 fn()，正好落在全屏最黑那一刻。 */
function steleBreak(btn, fn){
  if(MENU_BUSY || !btn || btn.disabled) return;
  menuBusy(true);
  sfx('stone_broken');   // v1.1.x：用户交付真采样「击碎石头」，与碎片动画同时起（素材缺则走合成兜底）
  if(btn.classList) btn.classList.add('is-breaking');
  const off=menuFxOff();
  const tFlash=off?0:800, tGo=off?60:930;   // off 时闪被 CSS 关掉 ⇒ 不留 800ms 干等，直接 60ms 切
  setTimeout(function(){
    const f=(function(){ try{ return document.querySelector('.menu-flash'); }catch(e){ return null; } })();
    if(f && f.classList) f.classList.add('on');
    setTimeout(function(){ menuBusy(false); if(typeof fn==='function') fn(); }, tGo-tFlash);
  }, tFlash);
}
/* 符纸按下：纸下拉 3px 弹回（.tug，150ms）→ 面板以「卷轴从顶落下·带回弹」展开。
   卷轴那半边由 showOverlay 的第 3 参 scene='scroll-scene' 驱动（见 CSS 的 scrollDrop），
   三个调用点各补一个参数。 */
function talisOpen(btn, fn){
  if(MENU_BUSY) return;
  menuBusy(true);
  sfx('ui_curtain');   // v1.0.23：用户口径「其他 3 张符纸要有拖拽窗帘般的音效」
  if(btn && btn.classList) btn.classList.add('tug');
  const off=menuFxOff();
  /* v0.68.1：150ms → 420ms。符纸按下从「下沉 3px 一闪」改成「向下拉然后回弹」（用户原话），
     menuTug 的 keyframes 也拉长到 .42s。
     ⚠️ 这个数必须与 CSS 的 `animation:menuTug .42s` 对齐：短了会在回弹途中切走场景（纸卡半途），
        长了就是白等一个已经静止的动画。两处一起改。 */
  setTimeout(function(){
    if(btn && btn.classList) btn.classList.remove('tug');
    menuBusy(false);
    if(typeof fn==='function') fn();
  }, off?0:420);
}
/* 石碑崩碎的 5 片。**同一个 src** ⇒ 浏览器复用解码结果，零额外体积（素材没多一张）。
   位置与大小由 CSS 给：.menu-shards{inset:0} 铺满 .menu-artbox（与图等大的紧贴盒），
   .menu-shard{width/height:100%} 让 5 片都按原尺寸拉伸到画布 —— 5 条 clip-path 精确拼满，
   所以裂开前重建出的图与原图逐像素一致，不会闪接缝。
   ⚠️ 必须包在 .menu-artbox 里而不是直接铺在 <button> 上：按钮有 min-width:48px 补热区，
      会比图宽，clip-path 的百分比就对不上石头本体了。 */
function menuShardsHTML(src){
  let h='<span class="menu-shards" aria-hidden="true">';
  for(let i=1;i<=5;i++) h+=artImg(src,'','menu-shard s'+i);
  return h+'</span>';
}
/* opts.entry=true：进场动画（选完英雄 / 换幕 / 续档进地图）。
   不带则不会播进场动画（goNext 走的是「只上一行」，见 goNext 里写的 _mapStepFrom）。 */
function showMap(opts){
  SCENE='map'; saveRun();
  setBg(mapBgName()); setBGM('map');
  const entry=!!(opts && opts.entry), stepFrom=_mapStepFrom;
  _mapStepFrom=-1;    // 一次性：用过就清 —— 重开地图 / 续档 / resize 都不会误放动画
  /* 本次要播「锁破裂」的格：刚从 goNext 上来时，当前层里**现在能走**的那些格
     （它们在上一帧还是锁 ⇒ 现在解锁，正是用户要的那个过渡）。 */
  const breakSet={};
  if(stepFrom>=0 && MAP[G.mapRow]){
    for(let c=0;c<MAP[G.mapRow].length;c++) if(mapReachable(G.mapRow,c)) breakSet[G.mapRow+','+c]=true;
  }
  let html=`<div class="map-root">${mapTopbarHTML()}`;
  html+=`<div class="map-plaque">${ACT_NAMES[G.act-1]}<small>第 ${G.mapRow+1}/${MAP.length} 层 · 沿连线向上，规划好路线</small></div>`;
  /* v0.63.0：卷轴收成一根**居中**的卷轴（用户：「木轴只比画心宽一点点，不要横跨屏幕」）。
     .map-scroll 是那一列（桌面 792 = 画心上限 760 + 两侧各 16），.map-frame 只给左右 16px 内边距 ⇒
     木轴恰好比画心宽 32px；窄屏列宽退化成 100%，木轴仍是「屏幕宽 - 32」，**不用负 margin**（那会溢出）。
     ⚠️ .map-lines 与 .map-row 必须继续留在 .map-sheet 里 —— drawMapLinks 的坐标相消靠这个。 */
  html+=`<div class="map-scroll">`;
  html+=`<div class="map-roller top" aria-hidden="true"></div>`;
  html+=`<div class="map-frame">`;
  html+=`<div class="map-viewport" id="map-viewport"><div class="map-wrap map-sheet" id="map-sheet"><div class="map-lines" id="map-lines" aria-hidden="true"></div>`;
  for(let r=MAP.length-1;r>=0;r--){
    const rowCls = r<G.mapRow ? 'past' : r===G.mapRow ? 'current' : 'future';
    html+=`<div class="map-row ${rowCls}">`;
    for(let c=0;c<MAP[r].length;c++){
      const node=MAP[r][c], tier=fogTier(r,c), dc=`data-r="${r}" data-c="${c}"`;
      // v0.61.41：未解锁的格子不再留白，改挂 NODE_ICON_LOCKED（用户给的 locked.png）——
      // 每格都有内容 ⇒ 行高与坐标仍然恒定，解锁进度变化时不抖动；
      // preview（下一步会亮）与 hidden（更远/同层走不到）都挂锁，只有 past/choice 才露出真实图标。
      // v0.63.0：描边改成**跟着档位走**（nodeOutlineTier(tier)），所以 ocls 从「每行算一次」挪进格子循环
      // —— 否则当前层里那些走不到的锁会拿到 o-reached，看着像能走却没有一条线。
      const tip=NODE_TIP[node.t]||'', ocls=' '+nodeOutlineTier(tier);
      if(breakSet[r+','+c]){
        // v0.62.0：刚解锁的格 —— 真实图标先挂上但**藏着**（.o-reveal），锁由 playLockBreak 的
        // canvas 画在上面；碎片飞散那一帧（t≈0.20）再让图标显形 + 描边淡入
        // = 用户要的「锁破裂后展示相连的下面关卡的对应图标」。
        html+=`<button class="map-node breaking${ocls}" ${dc} style="${mapNodeStyle(node)}" title="${tip}" onclick="chooseNode(${c})">${nodeIconHTML(NODE_ICON[node.t]||NODE_ICON_LOCKED,'o-reveal')}<span class="node-label">${nodeLabel(node)}</span></button>`;
        continue;
      }
      if(tier==='hidden'){ html+=`<div class="map-node locked${ocls}" ${dc} style="${mapNodeStyle(node)}" title="尚未解锁">${nodeIconHTML(NODE_ICON_LOCKED)}</div>`; continue; }
      if(tier==='choice'){ html+=`<button class="map-node${ocls}" ${dc} style="${mapNodeStyle(node)}" title="${tip}" onclick="chooseNode(${c})">${nodeHTML(node)}</button>`; continue; }
      if(tier==='preview'){ html+=`<div class="map-node preview${ocls}" ${dc} style="${mapNodeStyle(node)}" title="下一步可以走到这里（尚未解锁）">${nodeIconHTML(NODE_ICON_LOCKED)}</div>`; continue; }
      // past：走过的 + **当时看过的兄弟格**（v0.63.0 起不再退回锁）—— 真图标、暗化、描边消失
      html+=`<div class="map-node past${ocls}" ${dc} style="${mapNodeStyle(node)}" title="${tip}">${nodeHTML(node)}</div>`;
    }
    html+=`</div>`;
  }
  html+=`</div></div>`;   // 收 .map-sheet / .map-viewport
  html+=`</div>`;         // 收 .map-frame
  html+=`<div class="map-roller bot" aria-hidden="true"></div>`;
  html+=`</div>`;         // 收 .map-scroll
  html+=`<div class="map-bottombar"><button class="btn ghost" onclick="openMenu()">菜单（重开 / 退出）</button></div>`;
  html+=`</div>`;         // 收 .map-root
  showOverlay(html);
  /* v0.61.42 起的 .map-scene 在 v0.62.0 换了语义：不再是「半透明黑幕 + 半透明面板」，
     而是「**完全不透明**的整屏场景」（详见 原型.html 里 .map-scene 的注释）。
     **必须在 showOverlay 之后加**：showOverlay 自己会摘掉 .map-scene，
     其它所有面板（奖励/商店/图鉴/结算）因此保持原来的深色卡片底。 */
  const __ov=document.getElementById('overlay');
  if(__ov && __ov.classList) __ov.classList.add('map-scene');
  applyMapTextures();     // 见上：把三张卷轴素材换成 ASSET_MAP 的 data URI（产物里 CSS 相对路径会 404）
  bindMapDrag();          // v0.63.0：自由滑动（幂等，见 _mapDragBound）
  // v0.63.0：新的一场地图场景，手动滑动状态归零 —— 否则上一场的 camY 比例会被 resize 带过来
  _mapUserScrolled=false; _mapCamRatio=0;
  // 行布局完成后才有坐标可量，所以推到下一帧：先画连线，再落相机，最后放锁破裂
  const __step=stepFrom, __break=breakSet;
  const kick=function(){
    drawMapLinks();
    _mapGlowEdge=null;      // 见下面 drawMapLinks 前的说明：量不到坐标时它会在清标记之前 return
    mapCamInit(entry, __step);
    const keys=Object.keys(__break);
    for(let i=0;i<keys.length;i++){
      const p=keys[i].split(','), r=p[0], c=p[1];
      const el=document.querySelector('.map-node[data-r="'+r+'"][data-c="'+c+'"]');
      if(!el) continue;
      // 画布 120px、节点图标 56px ⇒ top=-32px 让锁正好压在图标上
      playLockBreak(el, function(){
        el.classList.remove('breaking');
        el.classList.remove('o-locked'); el.classList.add('o-reached');
        const ic=el.querySelector('.node-ico');
        if(ic) ic.classList.remove('o-reveal');
      }, { px:120, top:-32 });
    }
  };
  try{ requestAnimationFrame(kick); } catch(e){ kick(); }
  /* resize 时重算相机（**不带动画**），否则窄屏换成宽屏后相机停在错的层。
     v0.63.0：用户手动滑过之后**不能**再这么干 —— mapCamInit 会把镜头拽回当前层，
     正好是「拖到一半窗口一变就跳回去」的来源。那时改成「按 camY/maxY 比例保位 + 夹取」。 */
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
/* v0.61.20(P2) / v0.61.40 / v0.61.41 / v0.61.42：地图路径连线。
   三种线：暗线 = 当前可走节点 → 它连到的**下一层可见**格；
           金虚线 = 现在这一步能走到的； 淡黄浅光边 = 已经走过的。
   v0.61.40 起连边来自节点自带的 next（显式拓扑），不再用「列差≤1」猜；
   且**两端都必须可见** —— 否则一条暗线就出卖了未解锁层的拓扑。
   v0.61.41 曾换成用户给的道路贴图；v0.61.42 按用户要求**回到代码自绘** —— 因为要做
   「打通一关后，淡黄色浅浅的光边沿着路径延长过去」的动画，贴图做不到「沿路径生长」。
   现在每条边是一条 **SVG 二次贝塞尔弧**（控制点沿垂直方向偏移，所以永不画直线），
   贝塞尔弯曲方向由两端坐标哈希决定 ⇒ 同一张地图每次画都一样，不会闪。

   ⚠️ v0.62.0：地图改成「木轴固定 + 画心滑动」之后，`.map-viewport` 加了 overflow:hidden、
   `.map-sheet` 带了 `translateY(--camY)` —— **这里一行都不用改**，别顺手「修」。
   原因：端点坐标是用下面 nodeAt() 的 `b.left-wb.left` / `b.top-wb.top` 算的，
   而 SVG 层与 .map-row **同在一个 .map-sheet 里** ⇒ 画心的位移在相减时自己抵消，
   量到的永远是「画心坐标系」里的稳定坐标。overflow:hidden 也不影响布局测量。
   唯一的前提是**别把 .map-lines 或 .map-row 挪到 .map-sheet 外面** —— 那样两端的位移就不再相等，
   连线会跟着地图一起上下滑，看起来像「线粘在了视口上」。 */
/* 一次性标记：刚打通的那条边（由 goNext 写入，drawMapLinks 消费一次后清空）。
   只在「打完一关往上走」时动画；重开地图 / 续档 / 换幕 / 窗口 resize 都不动画。 */
let _mapGlowEdge = null;
function mapEdgeKey(r0,c0,r1,c1){ return r0+','+c0+'>'+r1+','+c1; }
/* 端点坐标 → 弯曲量。返回 [-1,1]，且**远离 0**（保证任何一条边都看得出弧，不是直线）。 */
function mapArcBow(key){
  let h=2166136261;
  for(let i=0;i<key.length;i++){ h^=key.charCodeAt(i); h=Math.imul(h,16777619); }
  const u=((h>>>0)%2000)/1000-1;                 // -1..1
  const mag=0.45+0.55*Math.abs(u);               // 0.45..1.00，绝不接近 0
  return (u<0 ? -mag : mag);
}
/* 纯函数：给定两端坐标与边的 key，给出 SVG 的 d。抽出来是为了冒烟能直接对拍（不用真 DOM）。 */
function mapArcD(a, b, key){
  const dx=b.x-a.x, dy=b.y-a.y;
  const dist=Math.hypot(dx,dy);
  if(dist<4) return '';
  const nx=-dy/dist, ny=dx/dist;                 // 连线方向的垂直单位向量
  const bow=Math.min(dist*0.14, 42)*mapArcBow(key);   // 夹住外凸量，别让弧线窜出面板
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
  /* 一条边 = 一条 <path>。newest=true 时额外做「光边沿路径延长」：
     取路径真实长度喂给 CSS 变量 --len，由 @keyframes mapGlowGrow 把 stroke-dashoffset 从 len 收到 0。
     取不到长度（老浏览器 / 没有 getTotalLength）就**不加 link-new** —— 只有 .link-past 的淡黄浅光边，
     降级后依然是对的观感，不会变成一条虚线或干脆看不见。 */
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
  /* —— v0.63.0：三段 ad-hoc 循环合成**一段** ——
     根因：v0.62.0 及以前「画线」只认三种特定的边（当前可走→下一层 preview、走过的、上一步→现在能走），
     而 v0.63.0 起「当时看过的兄弟格」也会亮成真图标 —— 它们不落在那三类里，会**光秃秃地没有线**
     （用户那句「每个关卡的图标都要有路径相连」说的就是它）。
     现在改成一条通则：**两个相邻层、两端都可见，就画一条**。线的档位按边的性质给：
       · 两端都在 mapPath 里连着 → link-past（走过的路，淡黄光边；刚打通的那条再加生长动画）
       · 子节点在本层（即 G.mapRow）→ link-reach（上一步那格 → 现在能走的每一格）
       · 其余 → link-dim（当时摆在你面前、你没走的那条；语义与「当前可走 → 下一层」完全一致）
     三个类名一个不删（verify_dist 的结构闸与冒烟 4751-4754 都钉着它们）；
     门禁仍然只有 fogVisible 一个（冒烟 4755/4756）—— 两端任一不可见，这条边就不存在。 */
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
  /* v1.1.6（用户口径「地图中往上爬的道路只要亮起玩家所走的那一条，**不是一行全亮**」）：
     旧写法把**所有进入当前层**的边都算成 link-reach（金虚线 + 外发光，最后画、最抢眼），
     于是玩家头顶那一整排边全部一起亮；反倒是自己真正走过的那条只有淡黄浅光边 —— 亮暗正好反了。
     现在 link-reach 只留给**路径的最后一段**（= 刚走过的那一条），其余进入当前层的边一律降为暗线。
     「道路不隐藏」（v1.1.5）的口径一个字不动：边照样**全画**，只是不给亮。 */
  const __n=(__path||[]).length;
  const __lastA=(__n>=2)?__path[__n-2]:null, __lastB=(__n>=2)?__path[__n-1]:null;
  function isLastSeg(r0,c0,r1,c1){
    return !!__lastA && !!__lastB &&
           __lastA.r===r0 && __lastA.c===c0 && __lastB.r===r1 && __lastB.c===c1;
  }
  /* v1.1.5（用户口径「地图道路要明确标注、不得隐藏」）：**整张图的路全部画出来**。
     此前门禁是「两端都 fogVisible」，于是通往未解锁格子（挂锁）的路一条都不画 ——
     玩家只看到一排排孤立的锁，读不出「这一格能连到哪」，没法判断与抉择。
     现在改成「两个端点在图上存在就画」，用档位给线的权重（fogVisible 仍参与判档）：
       两端都没解锁 → link-fog（远景路，压暗，不喧宾夺主）/ 至少一端解锁 → link-dim。 */
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
  // 输出顺序＝叠放顺序：先远景暗线打底，再暗线，再走过的，最后「刚走过的那一条」压在上面
  let i;
  for(i=0;i<__dim.length;i++)   seg(__dim[i].a,   __dim[i].b,   __dim[i].fog?'link-fog':'link-dim',   false, __dim[i].key);
  for(i=0;i<__past.length;i++)  seg(__past[i].a,  __past[i].b,  'link-past',  false, __past[i].key);
  for(i=0;i<__reach.length;i++) seg(__reach[i].a, __reach[i].b, 'link-reach', (__reach[i].key===_mapGlowEdge), __reach[i].key);
  // 动画是**一次性**的：这一次画完就消费掉，重开地图 / resize 重画都不会再放一遍
  _mapGlowEdge=null;
  if(!_mapLinkBound && typeof window!=='undefined' && window.addEventListener){
    _mapLinkBound=true;
    window.addEventListener('resize',()=>{ if(document.getElementById('map-lines')) drawMapLinks(); });
  }
}
function chooseNode(c){
  /* v0.63.0：刚刚拖过地图，这一下是「滑动」而不是「选点」—— 手指从节点图标上起拖也会走到这里。
     与出牌拖拽的 if(!d.moved) 同一个意思，只是地图没有统一的 up 收口，用时间戳守（见 bindMapDrag）。 */
  if(Date.now && Date.now() < _mapEatClickUntil) return;
  // v0.61.40：旧代码靠「只把可达节点渲染成 button」隐式限制，这里补显式二次校验（同时兜住 c 越界）
  if(!mapReachable(G.mapRow,c)){ sfx('error'); floatMsg('这条连线走不通'); return; }
  sfx('ui_map');   // v0.61.25：地图选点音
  const node=MAP[G.mapRow][c];
  (G.mapPath=G.mapPath||[]).push({r:G.mapRow, c:c}); // v0.61.20(P2)：记下这一步，地图连线据此画「已走」
  G.mapCol=c;
  hideOverlay();
  if(node.t==='fight'||node.t==='elite') startBattle(node.e);   // v0.61.40：精英升为独立节点类型，e 与普通战同构
  else if(node.t==='camp') showCampfire();
  else if(node.t==='shop') showShop();
  else if(node.t==='unknown') showUnknown();
  else if(node.t==='boss'){
    // v0.61.40：Boss 在**生成期**就定死在 node.e（同一存档续档后不再变）；下面一行只是兜底
    if(node.e && node.e.length) startBattle(node.e);
    else { const pool=BOSS_POOL[G.act]||['yewang']; startBattle([pool[Math.floor(rng()*pool.length)]]); }
  }
}

/* v0.73.0：八个未知/事件房 ↔ 八张专用背景（素材/bg/bg_evt_*.jpg，2026-09-29 交付）。
   这两张表**提到模块作用域**（原来是 showUnknown 里的局部 const），不是为了别的：
   产物自检要在**游戏作用域里求值**出这八条路径（verify_dist.py 的 dump_ids → evtBg），
   而 python 侧一个字都不镜像 —— 镜像必漂（见该文件 v0.61.41 那段旧账：
   镜像把 bg_map.jpg 算成了 bg/map.jpg）。表在局部就求值不到，只能回去硬拼字符串。 */
const UNKNOWN_EVENTS = ['well','blackmarket','temple','ambush','forge','empty','potion','remove'];
/* 值带扩展名 ⇒ bgRel 只补 bg_ 前缀、不补 .png（v0.61.41 的两条规则之一）。
   这八张是 .jpg，写成 'evt_well' 会被拼成 bg_evt_well.png 而全 404。 */
const EVT_BG = { well:'evt_well.jpg', blackmarket:'evt_blackmarket.jpg',
                 temple:'evt_temple.jpg', ambush:'evt_ambush.jpg',
                 forge:'evt_forge.jpg', empty:'evt_empty.jpg',
                 potion:'evt_potion.jpg', remove:'evt_remove.jpg' };
/* v0.61.41：**不再让玩家三选一** —— 踩到未知节点直接随机抽一个事件并立刻进入
   （用户要求：「未知关卡不要由玩家选择的环节，玩家直接进入随机环节」）。
   抽到什么用 floatMsg 报一声：原先靠三张卡面预告，现在没有预告了，总得让玩家知道发生了什么。 */
function showUnknown(){
  const pool=UNKNOWN_EVENTS;
  const labels={well:'古井许愿', blackmarket:'鬼市黑商', temple:'无头古庙', ambush:'拦路恶鬼', forge:'废弃道观', empty:'荒坟', potion:'灵泉', remove:'净坛'};
  const ev=pool[Math.floor(rng()*pool.length)];
  SCENE='unknown'; saveRun();
  /* v0.73.0：换事件房专用背景。**恢复不用单独写** —— 事件的每一个出口都会经过
     goNext()（→ showMap → setBg(mapBgName())）或 startBattle()（→ setBg('act'+N)），
     这两条本来就会把背景换回去；中途退到主菜单则由 showStartScreen 的 setBg('menu') 接管。
     ⚠️ 兜底给 'map.jpg'：万一表里漏了某个事件的键，宁可铺地图背景，也别让背景卡在上一个场景。 */
  setBg(EVT_BG[ev] || 'map.jpg');
  setBGM('shop'); // v0.61.31：事件节点是非战斗场景，与商店/营地共用同一条轨
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
  const cards=G.deck.map((c,i)=>`<div class="card has-frame ${RCOLOR[c.rarity]}" onclick="askUnknownRemove(${i})">${cardBody(c)}</div>`).join('');
  showOverlay(`<h2>净 坛</h2><p>一座祭坛，香火缭绕。你可以焚掉一张牌，净化牌组。</p><div class="reward-cards">${cards}</div><button class="btn ghost" onclick="hideOverlay(); goNext();">离开</button>`);
}
function doUnknownRemove(i){
  const c=G.deck[i];
  if(c && c.id==='shi_wang'){ floatMsg('【尸王】不可删除'); log('【尸王】不可删除'); return; }
  const cc=G.deck.splice(i,1)[0]; log(`焚符净坛：删除【${cc.name}】`);
  hideOverlay(); goNext();
}
function unknownPotion(){
  const p=randomPotion(); G.potions.push(p);
  showOverlay(`<h2>灵 泉</h2><p>一泓清泉自石缝渗出，隐隐有灵光。<br>你取一瓢饮下，得了一瓶【${p.name}】。</p><div class="reward-cards"><div class="relic r-blue">${potionIcon(p)}<div class="cname">${p.name}</div><div class="cdesc">${p.desc}</div></div></div><button class="btn" onclick="hideOverlay(); goNext();">继续</button>`);
}
/* v0.68.1：古井许愿**先问后扣**（用户报「他要你八点生命换一个遗物，你又不想要换，
   但没有设置取消或者路过的选项，让玩家无可奈何」）。
   ⚠️ 这不违反 v0.61.41 的「未知关卡不要三选一」—— 那条说的是**不要让玩家挑事件**，
   随机抽事件这件事原样保留；改的是抽到之后玩家对**代价**有没有说「不」的权利。
   同类一并补：鬼市黑商（强塞一张牌，牌组里多一张废牌同样是代价）。 */
function unknownWell(){
  showOverlay(`<h2>古井许愿</h2><p>你俯身探井，井底有微光浮动。<br>井灵低语：留下 <b style="color:var(--red)">8 点生命</b>，便赐你一件遗物。</p>
    <button class="btn" onclick="doWellOffer()">献祭 8 点生命</button>
    <button class="btn ghost" onclick="hideOverlay(); log('古井许愿：你按下井沿的微光，转身离开'); goNext();">转身离开</button>`);
}
function doWellOffer(){
  G.hp=Math.max(1,G.hp-8); sfx('hurt'); log('古井许愿：以 8 点生命为代价，换取一件遗物');
  const relic=weightedRelic();
  grantRelic(relic);
  sfx(relicSfxFor(relic)); log(`获得遗物【${relic.name}】`);   // v0.61.32：铃/幡·符/笔/剑·镜/录 三类分化
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
  // 无头古庙：随机赐福（恢复生命 / 最大生命 / 金币 / 卡牌）
  const roll=Math.floor(rng()*4);
  let msg='';
  /* ⚠️ 回血一律走 heal() —— 它内部已含 playFx('heal','player') + sfx('heal') + 飘字，
     用户定稿要求「每次触发的回血效果都要触发特效」（含遗物类回血）。此处不再手写 sfx/直接改 G.hp。 */
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

/* ===================== 奖励与篝火 ===================== */
function weightedCard(){
  /* duanren_leifu / yinbing 与 shi_wang 同理：**只能由遗物/卡牌自身生成，不进任何奖励池**，
     否则玩家会在三选一里白嫖到断刃/引魂灯的专属卡。 */
  /* v1.0.15：门禁过滤（紫/金卡需里程碑；白/蓝恒开）—— 这是三选一/商店/黑商/古庙等
     所有「卡牌奖励池」的**唯一**出口。兜底：门禁把池子筛空时退回「只过滤专属卡」的旧口径，绝不留空池。 */
  const _baseOK=c=> (!c.hero || c.hero===G.hero) && (!c.mile || mileClaimed(c.mile)) && c.id!=='shi_wang' && c.id!=='duanren_leifu' && c.id!=='yinbing' && (!c.needs || deckHasMechanic(c.needs));
  let eligible=CARDS.filter(c=> _baseOK(c) && mileOn('card',c));
  if(!eligible.length) eligible=CARDS.filter(_baseOK);
  const poolAll=eligible.length? eligible : CARDS;
  const tier=G.rewardTier||'normal';

  // 获取当前角色专属的卡牌池（根据角色流派增加相应卡牌的出现概率）
  const heroSpecificPool = getHeroSpecificCardPool(poolAll, tier);

  for(let attempt=0; attempt<6; attempt++){
    const rarity=rollCardRarity(tier);

    // 优先从角色专属池中筛选对应稀有度的卡牌
    const pool=heroSpecificPool.filter(c=>c.rarity===rarity);
    if(pool.length) {
      const card = cardById(pool[Math.floor(rng()*pool.length)].id);
      return card;
    }
  }

  // 如果角色专属池中没有合适的卡牌，则从全池中选择
  const fallbackPool=poolAll.filter(c=>c.rarity===rollCardRarity(tier));
  if(fallbackPool.length) {
    return cardById(fallbackPool[Math.floor(rng()*fallbackPool.length)].id);
  }

  // 如果6次尝试都没有找到合适稀有度的卡牌，使用备选方案
  return cardById(poolAll[Math.floor(rng()*poolAll.length)].id);
}

/**
 * 【角色专属系统】获取特定角色的卡牌池（根据角色流派增加相应卡牌的出现概率）
 * @param {Array} originalPool - 原始卡牌池
 * @param {string} tier - 奖励类型 ('normal', 'elite', 'boss', 'shop', 'starter')
 * @returns {Array} 考虑角色特性的卡牌池（某些卡牌会重复以增加出现概率）
 */
function getHeroSpecificCardPool(originalPool, tier = 'normal') {
  if (!G.hero) return originalPool; // 如果没有角色设定，返回原池

  let enhancedPool = [...originalPool];

  // 根据不同角色添加其流派相关的卡牌副本以提高出现概率
  switch(G.hero) {
    case 'tianshi': // 符箓天师 - 诅咒流
      // 增加诅咒相关卡牌的权重
      const tianshiCards = ['zhouyin', 'leifu', 'jingang', 'fodu']; // 诅咒/防御相关
      for(const cardId of tianshiCards) {
        const card = originalPool.find(c => c.id === cardId);
        if(card) {
          // 根据奖励类型决定增加多少副本
          let copiesToAdd = 2; // 默认增加2个副本（使出现率×3）

          // 商店中略微降低角色卡牌权重，保持多样性
          if(tier === 'shop') {
            copiesToAdd = 1; // 商店中只增加1个副本（使出现率×2）
          }

          for(let i = 0; i < copiesToAdd; i++) {
            enhancedPool.push(card);
          }
        }
      }
      break;

    case 'ganshiren': // 茅山赶尸人 - 召唤流
      // 增加通用基础卡牌，因为他的特色在于玩法而非特定卡牌
      const ganshirenCards = ['leifu', 'jingang', 'fodu', 'juling']; // 通用强力卡
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

    case 'wuseng': // 苦行武僧 - 格挡流
      // 增加格挡和防御相关卡牌的权重
      const wusengCards = ['tiebushan', 'jingji', 'fodu', 'jingang', 'jinguang']; // 格挡/防御相关
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

    case 'yincha': // 血祭阴差 - 卖血流
      // 增加卖血和攻击相关卡牌的权重
      const yinchaCards = ['sheshen', 'xueqi', 'fodu', 'leifu', 'ranxue']; // 卖血/攻击相关
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
function showReward(){
  /* v0.74.0：战斗胜利三选一的整屏背景。出口 pickReward/skipReward → afterReward()
     → goNext() → showMap() → setBg(mapBgName())，本来就会换回去，不用单独恢复。 */
  setBg('victory_reward.jpg');
  // 生成三张奖励卡牌（不在此处更新补偿值）
  const picks=[];
  while(picks.length<3){
    const c=weightedCard();
    if(!picks.some(p=>p.id===c.id)) picks.push(c);
  }
  G.rewardPicks=picks;

  // 检查这一轮奖励中是否有金卡
  const hasGoldInReward = picks.some(card => card.rarity === 'gold');

  // 存储补偿值更新信息供后续使用
  G.lastRewardHadGold = hasGoldInReward;

  const _TYPE_ORD={attack:0,defense:1,skill:2,spirit:3,junk:4};
  /* v1.0.14（P3-15）：三选一改「翻牌」——卡背自下升起（加速→急停），点一下翻面看内容，再点一次选走。
     · 排序与取牌语义不变：pickReward(i) 仍按**原始下标**取牌（i 同时写进 data-ri 与 onclick 闭包）。
     · `.flip-cards` 让翻面与选牌**永远生效**；只有「升起」动画要 fx() 为真才挂 `.reward-flip`
       ⇒ 流畅模式只是不播动画，翻开 / 选走的交互一字不少。 */
  const cards=picks.map((c,i)=>({c,i})).sort((a,b)=>(_TYPE_ORD[a.c.type]??9)-(_TYPE_ORD[b.c.type]??9)||a.i-b.i)
    .map(({c,i},k)=>`<div class="rcard" data-ri="${i}" style="--rd:${k}" onclick="flipReward(this,${i})"><div class="rcard-inner"><div class="rcard-face rcard-front"><div class="card has-frame ${RCOLOR[c.rarity]}">${cardBody(c)}</div></div><div class="rcard-face rcard-back"></div></div></div>`).join('');
  const cls='reward-cards flip-cards'+(fx()?' reward-flip':'');
  showOverlay(`<h2>战斗胜利 · 三选一</h2><p>点击卡牌翻开查看，再点一次加入牌组（或跳过）</p><div class="${cls}">${cards}</div><button class="btn ghost" onclick="skipReward()">跳过</button>`);
}
/* v1.0.14（P3-15）：翻牌交互 —— 第一次点=翻开看内容（不改动 G.rewardPicks），第二次点=选中带进牌组。
   v1.0.17：翻开走**专用音** ui_flip（素材/sfx/ui_flip.mp3），与选走的 ui_reward 分开。 */
function flipReward(el, i){
  if(!el || !el.classList) return;
  if(!el.classList.contains('revealed')){ el.classList.add('revealed'); sfx('ui_flip'); return; }
  pickReward(i);
}
function pickReward(i){
  sfx('ui_reward');   // v0.61.25：三选一翻牌音
  const c=G.rewardPicks[i];
  G.deck.push(c);
  log(`获得卡牌【${c.name}】`);

  // 根据本轮奖励是否有金卡来更新补偿值（非Boss战才更新）
  const tier = G.rewardTier || 'normal';
  if(tier !== 'boss' && G.hasOwnProperty('lastRewardHadGold')) {
    updateGoldCompensation(G.lastRewardHadGold);
  }

  hideOverlay();
  afterReward();
}
function skipReward(){
  // 根据本轮奖励是否有金卡来更新补偿值（非Boss战才更新）
  const tier = G.rewardTier || 'normal';
  if(tier !== 'boss' && G.hasOwnProperty('lastRewardHadGold')) {
    updateGoldCompensation(G.lastRewardHadGold);
  }

  hideOverlay();
  afterReward();
}
function afterReward(){
  if(G.pendingRelic){ G.pendingRelic=false; showRelicReward(); }
  else goNext();
}
function weightedRelic(){
  /* 专属遗物过滤：带 hero 的只进该英雄池；通用（无 hero）四人共用。
     本函数是 Boss 战利品（40_flow.js）与古井许愿（doWellOffer）的入口 ⇒ 只改这一处即可覆盖两处。 */
  /* v1.0.15：门禁过滤（紫/金遗物需里程碑；白/蓝恒开）。兜底：门禁筛空则退回「专属过滤」的旧口径。 */
  /* v1.0.26：带 mile 的专属遗物未领取前**连兜底池都不进**（避免门禁筛空后从兜底白嫖）。 */
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
  /* 同上：精英三选一也要过专属过滤 */
  /* v1.0.15：同上过门禁；门禁筛空则退回旧口径，两者都空才跳过。 */
  /* v1.0.26：带 mile 的专属遗物未领取前**连兜底池都不进**（避免门禁筛空后从兜底白嫖）。 */
  const _heroOK=r=>(!r.hero || r.hero===G.hero) && (!r.mile || mileClaimed(r.mile));
  let unowned = RELICS.filter(r=>_heroOK(r) && !hasRelic(r.id) && mileOn('relic',r));
  if(!unowned.length) unowned = RELICS.filter(r=>_heroOK(r) && !hasRelic(r.id));
  if(!unowned.length){ goNext(); return; }
  const picks = shuffle([...unowned]).slice(0,3);
  G.relicPicks=picks;
  const html=picks.map((r,i)=>`<div class="relic ${RCOLOR[r.rarity]}" onclick="pickRelic(${i})">${relicIcon(r)}<div class="cname" data-tip="relic:${r.id}">${r.name}</div><div class="cdesc">${r.desc}</div><div class="ctype">遗物 · ${RNAME[r.rarity]}</div></div>`).join('');
  showOverlay(`<h2>获得遗物 · 三选一</h2><p>遗物本局永久生效，点击获得（或跳过）</p><div class="reward-cards">${html}</div><button class="btn ghost" onclick="skipRelic()">跳过</button>`);
}
/* v0.61.32：遗物音按法器类别分化（同古井许愿那一处） */
function pickRelic(i){ const r=G.relicPicks[i]; grantRelic(r); sfx(relicSfxFor(r)); log(`获得遗物【${r.name}】`); hideOverlay(); goNext(); }
function skipRelic(){ hideOverlay(); goNext(); }

function showCampfire(){
  G.campRemoved=false; G.campActed=false;
  SCENE='camp'; saveRun();
  setBGM('shop'); // v0.61.31：营地为非战斗场景，与商店共用同一条轨
  renderCampfire();
}
function renderCampfire(){
  /* v0.74.0：整屏营地背景。**必须写在 render 里而不是 showCampfire 里** ——
     续档那条路径（js/40_flow.js 的 d.scene==='camp' 分支）直呼 renderCampfire()，
     不经过 showCampfire() ⇒ 写在入口函数里的话，从主菜单续档落进营地会铺着上一张背景。 */
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
  showOverlay(`<h2>休息 · 恢复 20 生命</h2><p>当前生命 ${G.hp}/${G.maxHp}。确定休息恢复 20 点生命吗？（与锻造二选一）</p>
    <button class="btn" onclick="restAtCamp()">确定 · 休息</button>
    <button class="btn ghost" onclick="renderCampfire()">返回</button>`);
}
function campRemoveCard(){
  if(G.deck.length<=1){ floatMsg('牌组只剩一张了'); return; }
  const cards=G.deck.map((c,i)=>`<div class="card has-frame ${RCOLOR[c.rarity]}" onclick="doCampRemove(${i})">${cardBody(c)}</div>`).join('');
  showOverlay(`<h2>篝火 · 删牌</h2><p>选择一张牌从牌组移除（仅限一张，免费）</p><div class="reward-cards">${cards}</div><button class="btn ghost" onclick="renderCampfire()">返回</button>`);
}
function doCampRemove(i){
  const c=G.deck[i];
  if(c && c.id==='shi_wang'){ floatMsg('【尸王】不可删除'); log('【尸王】不可删除'); return; }
  const cc=G.deck.splice(i,1)[0]; log(`删除一张【${cc.name}】`); sfx('card');
  G.campRemoved=true; saveRun(); renderCampfire();
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
/* 该牌是否存在可升级的变化（升级前后文案一致、且无费用减免 => 不可升级） */
function canUpgrade(c){
  try{
    if(String(c.t(false))!==String(c.t(true))) return true;
    const _u=_costPick(c.costU);
    return _u!=null && _u!==_costPick(c.cost);
  }catch(e){ return true; }
}
function forgeCard(i){
  const c=G.deck[i];
  if(c.up){ floatMsg('这张牌已升级过'); log('这张牌已经升级过了'); return; }
  if(!canUpgrade(c)){ floatMsg('不可升级'); log(`【${c.name}】没有可升级的变化，无法锻造`); return; }
  c.up=true; log(`锻造升级【${c.name}】`); sfx('ui_levelup');   // v0.61.32：升级从蹭遗物音改成专属音
  if(G.forgeFrom==='camp'){ G.campActed=true; G.forgeFrom=null; saveRun(); renderCampfire(); }
  else { G.forgeFrom=null; hideOverlay(); goNext(); }
}

/* ===================== 鬼市商店 ===================== */
function priceFor(c){ return {white:4, blue:8, purple:12, gold:12}[c.rarity] + (G.shopMarkup||0); }
function removeCost(){ return 4 + 4*G.removeCount; }
function showShop(){
  if(G.shopWares==null){ G.shopWares=[]; while(G.shopWares.length<6){ G.shopWares.push(weightedCard()); } G.shopPotions=[randomPotion(), randomPotion()]; }
  SCENE='shop'; saveRun();
  setBGM('shop'); // v0.61.31
  renderShop();
}
function renderShop(){
  /* v0.74.0：整屏鬼市背景。理由同上 —— 续档的 d.scene==='shop' 分支直呼 renderShop()。 */
  setBg('shop.jpg');
  const cards=G.shopWares.map((c,i)=>{ const p=priceFor(c); const ok=G.gold>=p; return `<div class="card has-frame ${RCOLOR[c.rarity]} ${ok?'':'disabled'}" onclick="askBuyCard(${i})">${cardBody(c)}<div class="card-extra" style="color:${ok?'var(--gold)':'var(--red)'};font-weight:bold">${p} 金币${ok?'':' · 金币不足'}</div></div>`; }).join('') || '<p style="color:var(--dim)">货已售罄</p>';
  /* 聚宝盆（蓝）：灵汁 7 折 —— 界面把**原价划掉**、新价加亮，让折扣「看得见」（用户定稿要求）。 */
  const potions=(G.shopPotions||[]).map((p,i)=>{ const price=potionPrice(); const base=potionPriceBase(); const ok=G.gold>=price; const priceTxt=(price!==base)?`<s class="price-old">${base}</s> <b class="price-new">${price}</b>`:`${price}`; return `<div class="relic r-blue ${ok?'':'disabled'}" onclick="askBuyPotion(${i})">${potionIcon(p)}<div class="cname">${p.name}</div><div class="cdesc">${p.desc}</div><div class="ctype" style="color:${ok?'var(--gold)':'var(--red)'}">${priceTxt} 金币</div></div>`; }).join('');
  showOverlay(`<h2>鬼 市</h2>${runStatusHTML()}<p>你带着 <b style="color:var(--gold)">${G.gold}</b> 金币。<br>买卡价格随购买递增，跨商店延续；灵汁每买一瓶更贵。</p>
    <div class="reward-cards">${cards}</div>
    <div style="color:var(--gold);margin:8px 0 2px">— 灵汁 —</div>
    <div class="reward-cards">${potions}</div>
    <button class="btn ghost" onclick="removeCard()">删一张牌（${removeCost()} 金币${G.gold<removeCost()?' · <span style="color:var(--red)">金币不足</span>':''}）</button>
    <button class="btn ghost" onclick="hideOverlay(); showMap();">返回地图</button>
    <button class="btn" onclick="hideOverlay(); goNext();">继续前进</button>`);
}
function buyCard(i){
  const c=G.shopWares[i]; const p=priceFor(c);
  if(G.gold<p){ floatMsg(`金币不足（需 ${p}）`); log(`金币不足（需 ${p}）`); return; }
  G.gold-=p; G.deck.push(c); G.shopWares.splice(i,1); G.shopMarkup=(G.shopMarkup||0)+3; sfx('gold'); log(`购买【${c.name}】，商店剩余卡牌价格 +3`);

  // 购买商店卡牌后更新补偿值（商店属于shop类型）
  updateGoldCompensation(c.rarity === 'gold');

  saveRun(); renderShop();
}
/* 灵汁原价（未打折）。界面上要在聚宝盆在场时把它「划掉」再展示新价，所以必须留一个原价出口。 */
function potionPriceBase(){ return 30 + 5*(G.potionBought||0); }
/* 聚宝盆：商店灵汁打 7 折（向下取整，保底 1 金币）。buyPotion 走这里 ⇒ 只能按折后价扣钱。 */
function potionPrice(){ const b=potionPriceBase(); return hasRelic('jubaopen') ? Math.max(1, Math.floor(b*0.7)) : b; }
function buyPotion(i){
  const price=potionPrice();
  if(G.gold<price){ floatMsg(`金币不足（需 ${price}）`); return; }
  const p=G.shopPotions[i]; if(!p) return;
  G.gold-=price; G.potionBought=(G.potionBought||0)+1; G.potions.push(p); G.shopPotions.splice(i,1);
  sfx('gold'); log(`花费 ${price} 金币购买灵汁【${p.name}】`); saveRun(); renderShop();
}
function removeCard(){
  if(G.deck.length<=1){ log('牌组只剩一张了'); return; }
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

/* ===================== 志怪图鉴（收集 + 局外存档） ===================== */
const KIND_LABEL = { ghost:'鬼', yao:'妖', jiangshi:'僵尸' };
const KIND_ICON = { ghost:'👻', yao:'🦊', jiangshi:'🧟' };
/* v1.0.16：iconTag 里**运行时拼串**取用的素材路径（唯一真相源）。
   intent / kind / 词缀这几族的路径是拼出来的，打包闸按 id 规则扫不到 ⇒ 在这里显式列全，
   verify_dist 取它进 want，免得这些「真在用」的图被误报成「从未被游戏请求 / 可考虑删掉」。 */
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
  /* v1.0.15：在**读取处一次性归一化** —— 老档没有 progress / mile 字段时补默认值，
     此后全仓读 SAVE.progress.pts / SAVE.mile 都不必再到处判空（沿用旧版「无 unlocked 视为新档」的宽口径）。 */
  try{
    const d=Store.getJSON(SAVE_KEY);
    SAVE = (d && typeof d==='object' && !Array.isArray(d)) ? d : {};
    if(!Array.isArray(SAVE.unlocked)) SAVE.unlocked=[];
    if(!SAVE.progress || typeof SAVE.progress!=='object') SAVE.progress={};
    const p=SAVE.progress;
    p.pts=p.pts|0; p.runs=p.runs|0; p.wins=p.wins|0; p.bestAct=p.bestAct|0; p.kills=p.kills|0;
    /* v1.0.24：里程**按角色分账**（用户口径「每角色肯定独立累积」）—— p.heroes[heroId]={pts,runs,wins}。
       ⚠️ 本轮改动：删掉「老档全局点数归天师」的迁移 —— 用户报障旧测试期累积的 7000+ 里程
          被并进天师轨，直接点亮 2400 全档。改为下面的一次性清零。 */
    if(!p.heroes || typeof p.heroes!=='object' || Array.isArray(p.heroes)) p.heroes={};
    const hs=p.heroes;
    Object.keys(hs).forEach(k=>{
      const h=hs[k];
      if(!h || typeof h!=='object'){ hs[k]={pts:0,runs:0,wins:0}; return; }
      h.pts=h.pts|0; h.runs=h.runs|0; h.wins=h.wins|0;
    });
    /* v1.1.x（用户口径「里程重置」）：一次性旗标 —— 旧测试期里程全部作废：
       全局点数、分角色点数、已解锁档位、已领取奖励全清，此后从 0 重新累积。
       mileResetV2 落盘后永不再触发，新档（本来全 0）不受影响。 */
    if(!SAVE.mileResetV2){
      p.pts=0; p.heroes={};
      SAVE.mile=[]; SAVE.mileClaimed=[];
      SAVE.mileResetV2=true;
      persistSave();
    }
    if(!Array.isArray(SAVE.mile)) SAVE.mile=[];
    /* v1.0.26：里程碑奖励的**领取位**（永久解锁）落盘 —— 未领取前专属牌/遗物不进任何池。 */
    if(!Array.isArray(SAVE.mileClaimed)) SAVE.mileClaimed=[];
  }
  catch(e){ SAVE={unlocked:[], progress:{pts:0,runs:0,wins:0,bestAct:0,kills:0,heroes:{}}, mile:[], mileClaimed:[], mileResetV2:true}; }
}
function persistSave(){
  try{ Store.setJSON(SAVE_KEY, SAVE); }catch(e){}
  if(typeof cloudMarkDirty === 'function'){ try{ cloudMarkDirty(); }catch(e){} }   // v0.76.2 云存档：同上
}
/* ===================== 里程碑判定（渐进门禁制 · v1.0.15） =====================
   真相源表在 js/20_data.js 的 MILESTONES；点数公式在 20_data.js 的 milePointsFor()。
   本段与 SAVE 同侧（同文件、紧挨存档读写），四类内容入口统一调 mileOn() 过滤。 */
/* 里程点数。**v1.0.24 起按角色分账**：milePts(heroId) 取该角色自己累积的里程；
   不传参 = 全局累计 p.pts（老档 / 结算面板沿用，语义不变）。 */
function milePts(heroId){
  const p=(SAVE && SAVE.progress) || {};
  if(heroId){
    const h=(p.heroes||{})[heroId];
    return (h && (h.pts|0)) || 0;
  }
  return p.pts|0;
}
/* 某里程碑是否已永久解锁 */
function mileDone(id){ return !!(SAVE && SAVE.mile && SAVE.mile.indexOf(id) >= 0); }
/* v1.0.26：里程碑奖励**是否已领取**（领取后才真正解锁对应牌/遗物，见 MILE_CLAIMED → SAVE.mileClaimed）。
   与 mileDone（按里程达标自动置位）不同：这里要玩家在里程界面点一次「领取」才落盘。 */
function mileClaimed(id){ return !!(SAVE && SAVE.mileClaimed && SAVE.mileClaimed.indexOf(id) >= 0); }
/* 依稀有度取卡/遗物的对象（key 可以是 id 字符串，也可以是对象本身） */
function _mileObj(kind,key){
  const list = kind==='card' ? CARDS : RELICS;
  if(key && typeof key==='object') return key;
  return list.find(x=>x.id===key) || null;
}
/* 门禁核心：kind ∈ hero|card|relic|potion，返回该内容当前是否**可用**。
   查不到条目 ⇒ 一律放行（绝不允许把内容静默蒸发）；老 4 瓶灵汁 / tianshi / 白·蓝卡遗物恒开。 */
function mileOn(kind,key){
  /* v1.0.26：里程碑**专属内容**（带 mile 字段的牌/遗物）走独立硬门禁 —— 未在里程界面「领取」前
     不进任何池，**且不受测试期总开关影响**（否则测试期会白嫖到这些专属内容）。 */
  if(kind==='card' || kind==='relic'){
    const o=_mileObj(kind,key);
    if(o && o.mile && !mileClaimed(o.mile)) return false;
  }
  if(!MILE_GATE_ON) return true;                            // v1.0.16：总开关关掉 ⇒ 一律放行（测试期，见 20_data.js）
  if(kind==='hero'){
    if(key==='tianshi') return true;                        // 初始角色恒开
    const m=MILESTONES.find(x=>x.heroes && x.heroes.indexOf(key)>=0);
    return !m || mileDone(m.id);
  }
  if(kind==='card' || kind==='relic'){
    const o=_mileObj(kind,key);
    if(!o) return true;
    if(o.rarity==='white' || o.rarity==='blue') return true;  // 基础内容恒开
    const m=MILESTONES.find(x=> kind==='card' ? x.advCards : x.advRelics);   // 紫/金看进阶里程碑
    return !m || mileDone(m.id);
  }
  if(kind==='potion'){
    if(MILE_BASE_POTIONS.indexOf(key)>=0) return true;          // 老 4 瓶恒开
    const m=MILESTONES.find(x=>x.potions && x.potions.indexOf(key)>=0);
    return !m || mileDone(m.id);
  }
  return true;
}
const MILE_BASE_POTIONS=['huanyanglu','huangquanjiu','zhenhunshui','mengpotang'];
/* 一局结束结算：把 milePointsFor(G) 累加进 SAVE.progress，并按阈值解锁新里程碑。
   返回**本次新解锁的里程碑数组**。幂等：一局只发一次（G._mileGiven；newState 里重置）。 */
function grantRunMilestones(){
  if(!G) return [];
  if(G._mileGiven) return [];                               // 一局只给一次（loseGame/showVictory 都会调）
  G._mileGiven=true;
  if(!SAVE.progress || typeof SAVE.progress!=='object') SAVE.progress={};
  const p=SAVE.progress;
  const pts=milePointsFor(G);
  G._mileGain=pts;                                          // 记录**实际发放额**：结算面板读它，别重算（幂等返回时重算会显示一个没真发的数）
  p.pts=(p.pts|0)+pts;
  p.runs=(p.runs|0)+1;
  const won=!!G.finalBoss;                                  // finalBoss 只在打穿最后一幕幕主时置真 ⇒ 通关
  if(won) p.wins=(p.wins|0)+1;
  p.bestAct=Math.max(p.bestAct|0, G.act|0);
  p.kills=(p.kills|0)+(G.totalKills|0);
  /* v1.0.24：里程**按角色分账** —— 同一局同时累加全局 p.pts（结算面板 / 老口径）与该角色自己的 p.heroes[id]。
     v1.0.25：达标判定改由**该角色自己的 6 档轨**（MILE_TRACKS）驱动 —— 新体系取代旧的全局 MILESTONES 进度。 */
  const heroId=(G.hero && typeof HEROES!=='undefined' && HEROES.some(h=>h.id===G.hero)) ? G.hero : 'tianshi';
  if(!p.heroes || typeof p.heroes!=='object' || Array.isArray(p.heroes)) p.heroes={};
  const hp=p.heroes[heroId] || (p.heroes[heroId]={pts:0,runs:0,wins:0});
  hp.pts=(hp.pts|0)+pts; hp.runs=(hp.runs|0)+1; if(won) hp.wins=(hp.wins|0)+1;
  const fresh=[];
  if(!SAVE.mile) SAVE.mile=[];
  mileNodesFor(heroId).forEach(n=>{                         // 只判**这个角色**的轨
    if(n.need!=null && (hp.pts|0)>=n.need && SAVE.mile.indexOf(n.id)<0){
      SAVE.mile.push(n.id); fresh.push(n);
    }
  });
  /* v1.1.x（门禁总开关打开后的配套）：mileOn() 查的仍是**旧 MILESTONES 表**的 id
     （hero_ganshiren / adv_card / potion_new / adv_relic / hero_yincha），而新体系只推
     每角色轨的 <hero>_t<N> ⇒ 不补这一段的话角色/紫·金内容永久锁死。
     旧表按**全局累计 pts** 判定（与 v1.0.15 的原始语义一致）。 */
  MILESTONES.forEach(m=>{
    if((p.pts|0)>=m.need && SAVE.mile.indexOf(m.id)<0){
      SAVE.mile.push(m.id); fresh.push(m);
    }
  });
  persistSave();
  if(fresh.length) unlockSfx();                             // 新里程碑解锁音（与图鉴/成就同款）
  return fresh;
}
/* 结算面板里的里程碑区块：本局 +N 点 · 累计 M 点，并列出本次新解锁条目；
   全部解锁后加一句「全部里程碑已解锁」。 */
function mileSettleHTML(gain, just){
  const pts=milePts();
  /* v1.0.25：结算面板的「全部达成」按**本局角色的那条轨**判定（新体系；不再看全局 MILESTONES）。 */
  const heroId=(G && G.hero) ? G.hero : 'tianshi';
  const tierTotal=(typeof MILE_TRACKS!=='undefined' && MILE_TRACKS[heroId])
    ? MILE_TRACKS[heroId].nodes.length : MILE_TIER_COUNT;
  const gone=(SAVE.mile||[]).filter(id=>id.indexOf(heroId+'_t')===0).length >= tierTotal;
  const rows=(just&&just.length)
    ? just.map(m=>`<div style="margin-top:4px"><b style="color:var(--gold)">${m.name}</b><br><span style="color:var(--dim);font-size:13px">${m.desc}</span></div>`).join('')
    : '';
  const tail=gone ? ` · <span style="color:var(--green)">全部里程碑已解锁</span>` : '';
  return `<div style="margin:10px 0;padding:10px 12px;border:1px solid var(--ink3);border-radius:8px;background:rgba(0,0,0,.25);text-align:left;font-size:14px">`
    + `<div>本局里程碑 <b style="color:var(--gold)">+${gain}</b> 点 · 累计 <b style="color:var(--gold)">${pts}</b> 点${tail}</div>`
    + rows + `</div>`;
}
/* ===================== 独立的「解锁」界面（v1.0.16） =====================
   主菜单的「解锁」入口调它。展示全部里程碑：阈值 / 累计点数 / 进度条 / 已解锁态。
   ⚠️ 这是**独立的解锁 UI**（用户口径），不是只靠在选角页置灰——以后要加卡牌 / 遗物 /
      成就等更多可解锁奖励，直接往 MILESTONES 表加行，这里自动多一条，不用改。 */
/* v1.0.23（用户草图 · 整屏重做）/ v1.0.24（用户定稿口径）：
   左列 = **4 张角色海报 + 1 张「神秘人」海报**（`素材/hero/<id>_poster.jpg`，3:1）：未选中只露
   **左边 2/3**（右缘压一道暗渐变暗示还剩 1/3），点中展开全幅 + 厚边立体框；每张海报**下面挂一行
   该角色自己的里程**（`.ml-hinfo`）—— 用户口径「里程可以显示在海报下面」，顶栏那块整块撤掉。
   右侧 = **该角色自己的**横向里程轨：**6 档 + 1 个「敬请期待」尾节点**，节点**等距分布**，
   里程数只作节点下方标注。轨可横向拖动（鼠标拖 / 触屏滑，拖动中响布料摩擦音）。
   音效：点海报 ui_poster / 领奖励 ui_reward / 拖轨 ui_drag（进界面那一层由 talisOpen 的 ui_curtain 负责）。
   ⚠️ 6 档里**前 5 档的真实奖励内容与里程数、以及里程增长规则**都**待与用户定稿**（用户口径：
      「先设计里程获得的全新规则和数值后计算平均每把的里程数后才能制定」）⇒ 现在渲染成**虚线待定框**，
     「领取」是**占位交互、不落盘**。定稿后填 20_data.js 的 MILE_TRACKS 即可，这里一行都不用动。 */
let MILE_HERO='';                       // 当前查看的角色（模块级：切换重渲染不丢）
let MILE_NODES=[];                      // 当前轨上渲染的节点（给 mileClaim 用）
/* v1.0.26：领取记录改**落盘** SAVE.mileClaimed（永久解锁位）—— 旧的模块级 MILE_CLAIMED 已废弃。 */
/* 节点定位：**等距槽位**百分比。i = 槽位序号，slots = 总槽数（6 档 + 尾节点 = 7）。
   ⚠️ 旧版按 `need/总里程` 线性映射 ⇒ 前几档挤成一团、白框互相重叠（用户报的 bug），故改等距。 */
function mileSlotPct(i, slots){ return slots>0 ? ((i + .5) / slots * 100) : 0; }
/* 该角色的档位骨架（定稿前的兜底）：
   · 神秘人 ⇒ 6 个「未知」节点（黑色系 ? 图标盖住，不透露任何内容）
   · 其余角色 ⇒ 6 档：前 5 档「奖励待定」（内容与里程数待定稿），第 6 档【入门符纸】（任选一名角色解锁） */
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
/* 填充进度：走到**最后一个已达标**的真实档位（need 未定的档位不参与）。 */
function mileFillPct(nodes, pts){
  const slots=nodes.length+1;
  let idx=-1;
  nodes.forEach((n,i)=>{ if(n.need!=null && pts>=n.need) idx=i; });
  return idx<0 ? 0 : mileSlotPct(idx, slots);
}
/* 点奖励白框 = 领取。到点（pts>=need）且未领 ⇒ 记一次 + 领取音；未到点 ⇒ 报错音。
   待定 / 未知 / 尾节点一律不可领（还没定稿，也没有里程数可比）。
   ⚠️ 真奖励（牌 / 遗物 / 被动 / 新角色）等定稿后再在这里发放，现在只演示交互。 */
function mileClaim(nodeId){
  const n=MILE_NODES.filter(x=>x.id===nodeId)[0];
  if(!n || n.pending || n.unknown || n.tail) return;
  const pts=milePts(MILE_HERO);
  if(pts<n.need){ sfx('error'); floatMsg('里程不足：还差 '+(n.need-pts)+' 点'); return; }
  /* v1.0.26：领取落盘（永久解锁位）—— 带 mile 标记的牌/遗物此刻才真正进该角色的奖励池。 */
  if(mileClaimed(nodeId)) return;
  if(!Array.isArray(SAVE.mileClaimed)) SAVE.mileClaimed=[];
  SAVE.mileClaimed.push(nodeId);
  persistSave();
  sfx('ui_reward'); sfx('ui_unlock');
  floatMsg('已领取 · '+(n.name||'里程奖励'));
  const el=document.querySelector('.ml-node[data-mid="'+nodeId+'"]');
  if(el&&el.classList){
    el.classList.remove('can'); el.classList.add('claimed','claiming');
    /* v1.1.1：领取特效 —— 白框弹一下 + 节点处扩散一圈金色光环，动画完自行撤掉（不常驻）。
       只在 DOM 存在时挂（headless / 无该节点时自动跳过，不影响落盘与门禁）。 */
    const fx=document.createElement('span'); fx.className='ml-claimfx'; el.appendChild(fx);
    setTimeout(function(){ el.classList.remove('claiming'); if(fx.parentNode) fx.parentNode.removeChild(fx); }, 900);
  }
}
/* 里程轨横向拖动（鼠标；触屏走原生 overflow 滚动）。拖动中节流响「布面摩擦」。 */
const _mlDrag={on:false,x:0,sl:0,el:null,last:0};
function mileDragStart(e){
  if(e&&e.pointerType&&e.pointerType!=='mouse') return;      // 触屏交给原生滚动，别抢手势
  const sc=e&&e.currentTarget; if(!sc) return;
  if(e.target&&e.target.closest&&e.target.closest('.ml-box')) return;   // 点奖励白框不算拖动
  _mlDrag.on=true; _mlDrag.x=e.clientX; _mlDrag.sl=sc.scrollLeft; _mlDrag.el=sc;
  if(sc.classList) sc.classList.add('grabbing');
  try{ if(sc.setPointerCapture) sc.setPointerCapture(e.pointerId); }catch(err){}
}
function mileDragSfx(){
  const now=(typeof performance!=='undefined'&&performance.now)?performance.now():Date.now();
  if(now-_mlDrag.last<110) return; _mlDrag.last=now; sfx('ui_drag');
}
function mileDragMove(e){
  if(!_mlDrag.on||!_mlDrag.el) return;
  const dx=e.clientX-_mlDrag.x;
  _mlDrag.el.scrollLeft=_mlDrag.sl-dx;
  if(Math.abs(dx)>4) mileDragSfx();
  if(e.preventDefault) e.preventDefault();
}
function mileDragEnd(){
  if(_mlDrag.el&&_mlDrag.el.classList) _mlDrag.el.classList.remove('grabbing');
  _mlDrag.on=false; _mlDrag.el=null;
}
function viewMilestones(heroId){
  const heroes=(typeof HEROES!=='undefined'?HEROES:[]).filter(h=>h&&h.id);
  const cards=heroes.slice();
  if(typeof MILE_MYSTERY!=='undefined') cards.push(MILE_MYSTERY);   // 第 5 张：神秘人 · 敬请期待
  /* 用户口径「点击右上角符纸进入该界面默认海报展示天师」⇒ 不带参数进入时一律回到首位角色。 */
  MILE_HERO=(heroId && cards.some(h=>h.id===heroId)) ? heroId : (heroes[0]?heroes[0].id:'');
  const cur=MILE_HERO;
  const myst=(typeof MILE_MYSTERY!=='undefined') && cur===MILE_MYSTERY.id;
  const nodes=mileNodesFor(cur);
  MILE_NODES=nodes;
  const pts=milePts(cur);
  const slots=nodes.length+1;                                // +1 = 轨尾「敬请期待」占位节点
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
    let cls='ml-node';
    if(n.unknown) cls+=' unknown'; else if(n.pending) cls+=' pending';
    if(done) cls+=' done';
    if(!n.unknown && !n.pending) cls+= got?' claimed':(done?' can':'');
    const needTxt=(n.need!=null) ? n.need : '?';
    const state=n.unknown ? '未来角色'
      : n.pending ? (n.ticket ? '解锁角色' : '待定稿')
      : (got ? '已领取' : (done ? '点击领取' : '未达成'));
    const click=(n.unknown||n.pending) ? '' : ` onclick="mileClaim('${n.id}')"`;
    return `<div class="${cls}" data-mid="${n.id}" style="left:${pct}%">`
      + `<div class="ml-box"${click}><b>${n.name}</b><span>${n.desc||''}</span>`
      + `<em class="ml-state">${state}</em></div>`
      + `<div class="ml-stem"></div><div class="ml-dot"></div>`
      + `<div class="ml-need">${needTxt}</div></div>`;
  }).join('');
  /* 轨尾「敬请期待」：里程不设上限（用户口径），后续版本继续加档 ⇒ 虚线占位、不可领。 */
  const tailMark=`<div class="ml-node ml-end" style="left:${mileSlotPct(nodes.length, slots)}%">`
    + `<div class="ml-box"><b>敬请期待</b><span>里程不设上限，后续版本继续加档。</span></div>`
    + `<div class="ml-stem"></div><div class="ml-dot"></div>`
    + `<div class="ml-need">∞</div></div>`;
  const fillPct=mileFillPct(nodes, pts);
  /* 轨宽 = 槽数 × 间距（桌面 200 / 窄屏 158），**比白框宽**（130）⇒ 相邻档位不再重叠；
     又比旧值（235/185）紧一些，让一屏里能多看一档（用户口径「占比整齐均衡」）。 */
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
             onpointerup="mileDragEnd()" onpointercancel="mileDragEnd()" onscroll="mileDragSfx()">
          <div class="ml-track" style="min-width:${trackW}px">
            <div class="ml-line"><i style="width:${fillPct}%"></i></div>
            ${marks}${tailMark}
          </div>
        </div>
      </div>
    </div>
  </div>`, true, 'mile-scene');
}
/* v0.61.32：解锁音单独成函数 —— 冒烟里 unlockBestiary/unlockAchievement 都被换成空函数，
   写在它们体内验不到（同 overlaySfx 的理由）。两个调用点各一行转发。 */
function unlockSfx(){ sfx('ui_unlock'); }
function unlockBestiary(key){
  if(!key || !ENEMIES[key]) return;
  if(SAVE.unlocked.includes(key)) return;
  SAVE.unlocked.push(key); persistSave();
  unlockSfx();   // v0.61.32：图鉴新条目
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
    /* v1.0.19：用户口径「图鉴要有敌人立绘，你自己布局好」—— 复用战斗里那张 `素材/enemy/<key>.png`
       （34 张立绘的命名与敌人 key 完全一致）。未收录的用同一张图压暗成剪影，留白预告而不剧透。 */
    const art=artImg('enemy/'+k+'.png','','bportrait');
    if(!have){
      return `<div class="bcard locked">${art}<div class="bbody"><div class="bname">？？？</div><div class="bmeta">${tag||'未收录'}</div><div class="bstory">尚未收录——在战斗中击败它，即可解锁它的志怪故事。</div></div></div>`;
    }
    return `<div class="bcard">${art}<div class="bbody"><div class="bname">${e.name}${tag?` <span style="font-size:12px;color:var(--red)">${tag}</span>`:''}</div><div class="bmeta">${e.kind&&KIND_ICON[e.kind]?iconTag('ui/kind_'+e.kind+'.png', KIND_ICON[e.kind]):''}${KIND_LABEL[e.kind]||'怪'} · 生命 ${e.hp}</div><div class="bstory">${STORIES[k]||''}</div></div></div>`;
  }).join('');
  showOverlay(`<h2>志 怪 图 鉴</h2><p style="font-size:13px;color:var(--dim)">已收录 <b style="color:var(--gold)">${got}</b> / ${total} · 击败妖怪，把它们的志怪故事收进你的百鬼谱。</p><div id="bestiary-grid">${cards}</div>`, true, 'scroll-scene');
}
/* ===================== 成就 & 收集（卡背 / 头像框） ===================== */
const COSMETICS = {
  cb_jinsha:{name:'金沙卡背', type:'cardback'},
  cb_moqi:{name:'墨气卡背', type:'cardback'},
  cb_yanmo:{name:'阎魔卡背', type:'cardback'},
  af_zijin:{name:'紫金头像框', type:'frame'},
  af_chijin:{name:'赤金头像框', type:'frame'}
};
const ACHIEVEMENTS = [
  {id:'wushang', name:'无伤之战', icon:'🕊', desc:'一场战斗 0 伤害获胜', reward:'cb_jinsha'},
  {id:'lingfu',  name:'零符斩杀', icon:'🈳', desc:'以 0 点符文结束一场战斗', reward:'cb_moqi'},
  {id:'zuzhou',  name:'诅咒满盈', icon:'🔮', desc:'让一名敌人叠满 6 层【诅咒】', reward:'af_zijin'},
  {id:'tushen',  name:'屠神证道', icon:'👹', desc:'击败一名幕主 Boss', reward:'af_chijin'},
  {id:'baizhan', name:'百战不殆', icon:'🗡', desc:'累计击败 100 个敌人', reward:'cb_yanmo'}
];
function hasAchievement(id){ return SAVE.achievements && SAVE.achievements.includes(id); }
function showAchievementToast(title, sub){
  let t=document.getElementById('achieve-toast');
  if(!t) return;
  t.innerHTML=`<div class="at-icon">🏆</div><div class="at-title">${title}</div>${sub?`<div class="at-sub">${sub}</div>`:''}`;
  t.classList.remove('show'); void t.offsetWidth; t.classList.add('show');
  clearTimeout(showAchievementToast._t);
  showAchievementToast._t=setTimeout(()=>t.classList.remove('show'), 2600);
}
function unlockAchievement(id){
  if(!id || hasAchievement(id)) return;
  if(!SAVE.achievements) SAVE.achievements=[];
  SAVE.achievements.push(id); persistSave();
  const a=ACHIEVEMENTS.find(x=>x.id===id);
  if(a){
    unlockSfx();   // v0.61.32：成就从蹭金币音改成专属解锁音
    const cos=COSMETICS[a.reward];
    showAchievementToast(`成就解锁 · ${a.name}`, cos?`奖励：${cos.name}（收藏页可装备）`:'');
    log(`【成就】${a.name} 已解锁${cos?`，获得${cos.name}`:''}`);
  }
}
function applyCosmetics(){
  document.body.dataset.cardback = (SAVE && SAVE.cardBack) || '';
  document.body.dataset.frame = (SAVE && SAVE.avatarFrame) || '';
}
function equipCosmetic(id){
  const cos=COSMETICS[id]; if(!cos) return;
  if(cos.type==='cardback') SAVE.cardBack = (SAVE.cardBack===id?'':id);
  else SAVE.avatarFrame = (SAVE.avatarFrame===id?'':id);
  persistSave(); applyCosmetics(); sfx('relic');
  viewAchievements();
}
function viewAchievements(){
  const got=(SAVE.achievements||[]).length;
  const rows=ACHIEVEMENTS.map(a=>{
    const have=hasAchievement(a.id);
    const cos=COSMETICS[a.reward];
    const equipped=(cos.type==='cardback' && SAVE.cardBack===cos.id) || (cos.type==='frame' && SAVE.avatarFrame===cos.id);
    const right=have
      ? `<button class="btn ghost" style="padding:4px 12px;font-size:12px;margin:0" onclick="equipCosmetic('${cos.id}')">${equipped?'✓ 已装备':'装备 · '+cos.name}</button>`
      : `<span style="color:var(--dim);font-size:11px">奖励：${cos.name}</span>`;
    return `<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 0;border-bottom:1px solid var(--ink3);${have?'':'opacity:.45'}">
      <div style="flex:1"><span style="font-size:20px">${have?a.icon:'🔒'}</span> <b>${a.name}</b> <span style="color:var(--dim);font-size:12px">· ${a.desc}</span></div>
      ${right}
    </div>`;
  }).join('');
  showOverlay(`<h2>成 就 · 收 藏</h2>
    <p style="font-size:13px;color:var(--dim)">解锁成就获得卡背 / 头像框，点击奖励即可装备（局外生效，切换后立即在卡面/头像上看效果）。已达成 <b style="color:var(--gold)">${got}</b> / ${ACHIEVEMENTS.length}。</p>
    <div class="kwlist">${rows}</div>`, true);
}

/* ===================== 每日签到 + 广告占位（局外留存） ===================== */
function todayStr(){
  const d=new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function weekKey(){
  const d=new Date();
  const day=(d.getDay()+6)%7; // 周一为 0
  d.setDate(d.getDate()-day);
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function signedToday(){ return SAVE.lastSignIn===todayStr(); }
function adPlaceholder(name, reward){ AdSlot.request(name, reward); } // v0.61.06：转发到统一入口
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
function signInPanelHTML(){
  let html=`<div class="menu-panel">`;
  if(signedToday()){
    html+=`<p style="color:var(--green);margin-bottom:8px">✓ 今日已签到 · 连续 <b>${SAVE.streak||0}</b> 天</p>`;
    /* v1.0.1：广告入口隐藏（未接广告）—— doAdDouble / adPlaceholder 本体保留，接广告后还原这一行。 */
    if(SAVE.signInBonus>0) html+=`<p style="color:var(--gold);margin-top:8px;font-size:13px">开局将额外携带 +${SAVE.signInBonus} 金币</p>`;
  } else {
    html+=`<button class="btn" onclick="doSignIn()">每日签到 · 领取 +5 开局金币</button>`;
  }
  html+=`</div>`;
  return html;
}

/* ===================== 数据埋点（局外统计，正式版接统计 SDK） ===================== */
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
/* ===================== 牌库 & 关键词 ===================== */
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
/* —— v1.1.x 锦囊（用户口径「顶部栏不再显示灵汁和遗物，相关内容移入锦囊」）——
   几乎整屏、左右均分：左=灵汁（图标+数量+信息，点击即用）、右=遗物（图标+信息，可滑动）。
   ⚠️ 两块都挂 `touch-action:pan-y`（.pouch-item / .pouch-scroll）——
      否则手机上「点一下用灵汁」与「滑动看更多」互相打架（商店/锻造那几处同一处理）。
   ⚠️ 灵汁走 usePotionByName（**保留既有调用链**，与旧顶栏芯片同一个口），用掉后就地重开本面板刷新数量。 */
function showJinnang(){
  if(!G) return;
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
/* v1.1.x（用户报障「地图进锦囊后返回，卡进战斗界面」）——
   地图本身就渲染在 #overlay 里（showMap→showOverlay+map-scene），而锦囊返回原先写死
   hideOverlay() ⇒ 摘掉 overlay 露出背后的 #app 战斗版面。按 SCENE 分流：在地图上就重画地图。 */
function jinnangBack(){
  if(SCENE==='map'){ showMap(); return; }
  hideOverlay();
}
function viewDeck(){
  if(!G){ floatMsg('开局后可查看牌库'); return; } // v0.61 B11：原本静默无反应
  if(!G.deck.length){ floatMsg('牌库为空'); return; }
  const m={}; const order=[];
  G.deck.forEach(c=>{ if(!m[c.id]){ m[c.id]={card:c,total:0,up:0}; order.push(c.id); } m[c.id].total++; if(c.up) m[c.id].up++; });
  const groups={attack:'攻击',defense:'防御',skill:'技能',spirit:'鬼怪'};
  let html=`<h2>我的牌库（共 ${G.deck.length} 张）</h2><div class="kwlist">`;
  for(const [type,label] of Object.entries(groups)){
    const rows=order.filter(id=>m[id].card.type===type);
    if(!rows.length) continue;
    html+=`<div style="color:var(--gold);margin:8px 0 2px">— ${label} —</div>`;
    html+=rows.map(id=>{ const {card,total,up}=m[id];
      return `<div><span style="color:var(--dim)">${cardCost(card)}符文</span> <b>${card.name}</b>${exhaustChip(card)} ×${total}${up>0?` <span style="color:var(--green)">（升级 ${up}）</span>`:''} <span style="color:var(--dim)">· ${wrapKw(card.t(false))}</span>${up>0?`<div style="color:var(--green);font-size:12px;margin-left:12px">↳ 升级后：${wrapKw(card.t(true))}</div>`:''}</div>`;
    }).join('');
  }
  html+=`</div>`;
  showOverlay(html, true);
}

/* v0.76.0：点抽牌堆 / 弃牌堆看牌堆内容。
   形态照用户口径：「显示界面参考锻造界面，只是不要显示升级情况」——
   ⇒ 复用锻造页的**容器与排列**（加宽的 #overlayWrap + 同一个 grid，CSS 里与 forge-scene
      共用分组选择器），卡是**单张**（不是锻造那个 .forge-pair 左右对照），
      因此没有 .upgrade-preview、没有箭头、没有红色升级描述。
   ⚠️ 两个堆的**信息口径刻意不同**（这是本项的设计决定，不是随手写的）：
      抽牌堆**乱序**展示 —— 否则等于把「下一张是什么」白送给玩家；
      弃牌堆**保序、堆顶在前** —— 它本来就是公开信息（刚打出的牌就在第一格）。
   ⚠️ `shuffle(src.slice())` 里那个 `.slice()` 是硬要求：shuffle 就地打乱。
      少了它就是「点开看一眼，抽牌堆顺序就变了」—— 与易物候选池那个坑同源。
   ⚠️ 卡片**不带 onclick**：这一层不需要点击，带上反而会与长按放大（showCardZoom）抢事件。 */
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
  showOverlay(`${head}<div class="reward-cards">${cards}</div>`, true, 'pile-scene');
}

/* ===================== 覆盖层 ===================== */
/* v0.61.32：面板开合音单独成函数 —— 冒烟里 showOverlay/hideOverlay 会被整体换成空函数
   （与 startBGM 同一个处境），写在这两个函数体里就永远验不到。拆出来才验得到，
   两个调用点只剩一行转发（那两行不可达，已如实记在更新日志里）。 */
function overlaySfx(){ sfx('ui_panel'); }
/* v0.65.0：新增可选第 3 参 scene（'menu-scene'），并加 .ov-enter 入场门闩。
   ⚠️ 「同类场景内刷新不重播入场」只能靠**移除类**实现，不能靠「加一次就留着」——
      因为下面这行 innerHTML= 每次都重建 DOM，**新元素一定会跑匹配到的 CSS 动画**。
   ⚠️ wasOpen 必须在摘 'hidden' 之前读，否则永远是 false。 */
/* v0.68.2 —— `.ov-enter` 门闩补「**换场景**也算新进场」这一条。
   ⚠️ 起因：用户要的「拉下鬼录 → 卷轴从屏幕上方坠落」在**真实路径上根本没播**。
      图鉴/排行榜/设置的唯一入口是主菜单，而点它们时 overlay **本来就开着**（就是主菜单）
      ⇒ wasOpen=true ⇒ ov-enter 被摘 ⇒ `#overlay.scroll-scene.ov-enter #overlayWrap`
      这条选择器永远匹配不上。冒烟测不到（它看不见 CSS 与 classList 的实际取值），
      `_drvmenu3.js --q &pull=1` 一量就露：class=scroll-scene 但 `wrap an=none`。
   ⚠️ 不能图省事把选择器里的 `.ov-enter` 删掉：那样「设置面板里拨一下音量开关」会重跑
      showOverlay ⇒ 面板再掉一次，比不播更烦人。**判据必须是"换了场景"而不是"开了面板"**。 */
function showOverlay(html, closable, scene){ overlaySfx();   // v0.61.32：面板开合（设置/图鉴/成就/牌库/结算）
  document.getElementById('overlayContent').innerHTML=html;
  const ov=document.getElementById('overlay');
  const wasOpen = !!(ov && !ov.classList.contains('hidden'));
  // v0.68.2：摘之前先记下"原来挂的是哪个场景" —— 下一行的 remove 之后就问不出来了。
  // v0.71.0：+ hero-scene（选英雄屏专属的 700px 放宽限宽）。
  // v0.72.0：+ pick-scene（战斗里的**选牌小窗**：去掉纯色底、卡牌 1.25 倍，只桌面档）。
  //   六处调用（忘忧 / 焚符 / 火符 / 易物·选出手牌 / 易物·选入牌 / 守一）**都必须显式传第三实参**
  //   —— sceneChanged 是拿它比出来的：不传就没有场景类，从火符直接进易物也不会重播进场动画。
  // v0.75.0：+ forge-scene（锻造页：面板加宽到满屏 + 六列对照。**保留纯色底** —— 与 pick-scene
  //   刻意相反：锻造页里是整屏卡牌与说明文字，那层底是可读性的依托）。
  //   两处调用（道观 unknownForge / 篝火·营地 showForgePicker）**都必须显式传第三实参**。
  // v0.76.0：+ pile-scene（点抽牌堆/弃牌堆看牌堆内容）。**与 forge-scene 共用同一份 grid 与加宽规则**
  //   —— CSS 里那三条已经改成分组选择器，不复制第二份（复制出来的必然漂）。
  //   两处调用（`showPile('draw')` / `showPile('discard')`）**都必须显式传第三实参**：
  //   否则从「抽牌堆」切到「弃牌堆」时 sceneChanged 判不出来，进场动画不重播。
  // v0.76.0：+ result-scene（胜负结算面板「自下升起」的那一套 keyframe）。
  //   三条结算路径（showBattleResult / loseGame / showVictory）**都必须显式传第三实参**；
  //   漏传不会报错，只会让面板退回通用的 overlayIn（10px 下滑），而这一条没有任何闸看得见。
  // v1.0.23：+ mile-scene（里程碑「里程轨」整屏界面：4 张角色海报 + 蓝色里程轨）。
  // v1.1.x：+ rank-scene（风云榜「皇榜卷轴」整屏界面：左六类导航 + 前三甲 + 十名榜单 + 我的战绩）。
  const SCENES=['map-scene','menu-scene','scroll-scene','hero-scene','pick-scene','forge-scene','pile-scene','result-scene','mile-scene','pouch-scene','rank-scene'];
  const wasScene = (ov && ov.classList) ? (SCENES.filter(c=>ov.classList.contains(c))[0]||'') : '';
  // v0.61.42：任何面板开之前先摘掉 .map-scene（地图专属的半透明底）——
  // 否则 showMap 之后直接 showOverlay 的奖励/商店面板会继承半透明底，白白透出背景。
  // v0.65.0：.menu-scene 同理（主菜单整屏场景）。
  // v0.66.0：.scroll-scene 同理（图鉴/排行榜/设置的卷轴落下）—— 漏摘的话，从主菜单看完图鉴
  // 再回战斗，奖励面板也会带着卷轴动画从顶上掉下来。
  if(ov && ov.classList){ ov.classList.remove('map-scene'); ov.classList.remove('menu-scene');
    ov.classList.remove('scroll-scene'); ov.classList.remove('hero-scene'); ov.classList.remove('pick-scene');
    ov.classList.remove('forge-scene'); ov.classList.remove('pile-scene'); ov.classList.remove('result-scene');
    ov.classList.remove('mile-scene'); ov.classList.remove('pouch-scene'); ov.classList.remove('rank-scene'); }
  ov.classList.remove('hidden');
  // 主菜单→图鉴（menu-scene→scroll-scene）算换场景 ⇒ 补 ov-enter ⇒ 卷轴真的落下来；
  // 图鉴里翻页/设置里拨开关（scroll-scene→scroll-scene）不算 ⇒ 不重播。
  // 无场景的普通面板（战斗奖励/商店）行为与 v0.65.0 完全一致（只有 !wasOpen 才播）。
  const sceneChanged = !!scene && scene !== wasScene;
  if(ov && ov.classList) ov.classList.toggle('ov-enter', !wasOpen || sceneChanged);
  if(scene && ov.classList) ov.classList.add(scene);
  const x=document.getElementById('overlayCloseX'); if(x) x.style.display = closable ? '' : 'none';
  ovMarkCornerBtns(); }
/* v1.0.12（用户 2026-10-05：「所有界面的返回/确认按钮放到左上角跟右上角，方便按」）——
   小屏横屏时，把面板**末尾**那一串直接子级行动按钮钉到屏幕两上角（拇指区）：
     · 文本以 返回/放弃/跳过 开头 → 左上；其余（继续/离开/确定…）→ 右上（close-x 左边）。
   门槛（三条同时成立才打标，防误伤）：
     ① 末尾存在连续的直接子级 button.btn（反应面板「看完内容点底部按钮」的结构）；
     ② 面板**全部**直接子级按钮都在这串里 —— 设置菜单（7 枚按钮被 <p> 隔断）、
        篝火选项屏（锻造/休息按钮在中段）整体是按钮流，钉走一枚边角会割烂布局 ⇒ 跳过；
     ③ 主菜单壳（body.at-menu）整体跳过 —— menu-root / 存档面板有自己的排版。
   打标只加类：桌面与冒烟档 CSS 不理会 ⇒ 逐像素不变；手机横屏档由 CSS 接管（见 原型.html）。 */
function ovMarkCornerBtns(){
  const oc=document.getElementById('overlayContent'); if(!oc || !oc.children) return;
  /* v1.1.x：每次重判前先摘掉上一块面板留下的 padding 标记（oc 元素常驻，类会粘住）。 */
  if(oc.classList) oc.classList.remove('ov-corner');
  const kids=oc.children; let i=kids.length-1; const run=[];
  while(i>=0 && kids[i].tagName==='BUTTON' && kids[i].classList.contains('btn')){ run.unshift(kids[i]); i--; }
  if(!run.length) return;
  for(let j=0;j<kids.length;j++){
    if(kids[j].tagName==='BUTTON' && kids[j].classList.contains('btn') && run.indexOf(kids[j])<0) return;
  }
  if(document.body && document.body.classList && document.body.classList.contains('at-menu')) return;
  /* v1.1.x：真的钉了角按钮 ⇒ 给 #overlayContent 打 ov-corner，矮屏档靠它补顶部留白
     （取代旧的逐场景字面量规则，见 原型.html 的 @media(max-height:560px)）。 */
  if(oc.classList) oc.classList.add('ov-corner');
  run.forEach(b=>{
    const t=(b.textContent||'').trim();
    b.classList.add(/^(返回|放弃|跳过)/.test(t) ? 'ov-act-l' : 'ov-act-r');
  });
}
function hideOverlay(){ overlaySfx();   // v0.61.32：与 showOverlay 成对
  if(typeof settleVidDrop==='function') settleVidDrop();   // v1.1.x：结局视频停在末帧，收面板时一并摘掉
  document.getElementById('overlay').classList.add('hidden'); }
/* v1.0.20（用户 2026-10-08：「有时候从图鉴或者排行榜等界面回到主界面会卡住」）——
   旧判据只有 `if(!G)`，但 G 退局后**并不清空**（quitToMenu / showVictory / loseGame 都只调
   showStartScreen，没把 G 置空）。于是「本会话玩过一局 → 回主菜单 → 开图鉴/榜单/引导 → 返回」时
   `!G` 为假 ⇒ 只摘掉 #overlay，而 `body.at-menu` 仍把 `#app{display:none}` ⇒ 整屏全黑，表现为卡死。
   正确判据是「屏幕背后不是战局」，该状态由 setBg 挂的 `body.at-menu` 唯一 owning。
   ⚠️ 不要再加「场景类必须是 menu-scene/scroll-scene」之类的守卫：新手引导、卡牌详情等面板
      **不带场景类**（showOverlay 不传第三参），加了守卫它们就漏网（用户 2026-10-08 报的
      「查看新手引导后返回卡住」正是这条漏网路径）。at-menu 本身就足以判定。 */
function closeOverlay(){
  const atMenu=!!(document.body && document.body.classList && document.body.classList.contains('at-menu'));
  /* v1.1.x（用户 2026-10-11「手机端从图鉴 / 排行榜 / 设置回主界面会卡住」）：
     旧顺序是「先 hideOverlay() 摘掉 #overlay，再 showStartScreen()」。一旦 showStartScreen
     中途出岔子（如音频 I/O 抛异常），就停在「#overlay 已收 + body.at-menu 仍在 ⇒ #app 也不渲染」
     —— 整屏只剩 #bg 底图，正是用户截图里那一屏。showOverlay 自己会 remove('hidden')，
     所以回主菜单这一支**直接交给 showStartScreen 收口**：异常时最坏也只是留着上一块面板，
     不会掉进全空状态。 */
  if(atMenu || !G){ showStartScreen(); return; }
  /* 地图本身渲染在 #overlay 里 ⇒ SCENE==='map' 时摘掉 #overlay 会露出背后的 #app 战斗版面，必须重画地图。
     ⚠️ 这一支**必须**排在 atMenu 判定**之后**：showStartScreen 不复位 SCENE，打完一局回主菜单后 SCENE 仍是 'map'，
        若先判 SCENE，点里程碑的 ✕ 就会拿一局已废的存档 showMap() 直接进地图
        （用户 2026-10-12 报的「里程碑 ✕ 返回 → 直接进地图、没角色、没手牌」正是这条顺序错误）。 */
  if(SCENE==='map'){ showMap(); return; }
  hideOverlay();
}
/* v1.0.20：设置/榜单等卷轴页的「返回菜单」不能写死 openMenu()（那是**局内**菜单）——
   从主菜单进来的话会被绕进局内菜单（继续游戏/退出到主菜单），玩家以为卡住了。
   按 at-menu 判定来处：在主菜单体系内就回主菜单，否则回局内菜单。 */
function menuBack(){
  const atMenu=!!(document.body && document.body.classList && document.body.classList.contains('at-menu'));
  if(atMenu) showStartScreen(); else openMenu();
}

/* ===================== 选择确认条（是 / 否 图标） =====================
   v1.1.2（用户口径）：「商店 / 锻造 / 净坛 / 开局抉择」四处**点选之后**要先过一道「是 / 否」图标抉择才生效。
   ⚠️ 只在**渲染出来的 onclick 包装层**（askBuyCard / askForgeCard / …）里问，原函数
      （buyCard / forgeCard / doRemove / doUnknownRemove / pickOpening）的语义一个字都不动 ——
      冒烟测试直接调它们（smoke_runner.js:153/157/1178/4029），改了当场变红。
   ⚠️ 落地条 #ovConfirm 挂 document.body（见 原型.html），与 #overlay 并列、z-index 更高。 */
let CONFIRM_CB=null;
function askConfirm(msg, cb){
  CONFIRM_CB=(typeof cb==='function')?cb:null;
  const el=document.getElementById('ovConfirm');
  if(!el){ if(CONFIRM_CB){ const f=CONFIRM_CB; CONFIRM_CB=null; f(); } return; }   // 无头/异常兜底：直接生效
  const m=el.querySelector ? el.querySelector('.ovc-msg') : null; if(m) m.innerHTML=msg;
  el.classList.remove('hidden');
  sfx('ui_flip');
}
function resolveConfirm(ok){
  const el=document.getElementById('ovConfirm'); if(el) el.classList.add('hidden');
  const cb=CONFIRM_CB; CONFIRM_CB=null;
  if(ok && cb){ sfx('ui_unlock'); try{ cb(); }catch(e){} }
  else sfx('ui_flip');
}
/* —— 六处 onclick 包装：前置校验不通过就直接飘字，通过才问「是/否」 —— */
function askUnknownRemove(i){
  const c=G.deck[i]; if(!c) return;
  if(c.id==='shi_wang'){ floatMsg('【尸王】不可删除'); log('【尸王】不可删除'); return; }
  askConfirm(`焚掉【${c.name}】？<br>它将离开你的牌组。`, ()=>doUnknownRemove(i));
}
function askForgeCard(i){
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

/* ===================== 渲染 ===================== */
/* 消耗牌判定：牌自带 exhaust，或 heroExhaust 指定的英雄专属消耗 */
function isOneUse(c){
  if(!c) return false;
  if(c.exhaustOnly) return c.exhaustOnly.indexOf(G.hero)>=0; // 仅指定英雄视为消耗牌（如附灵术：只有赶尸人是消耗牌）
  return !!(c.exhaust || (c.heroExhaust && c.heroExhaust===G.hero));
}
/* 卡面标记（图形式卡） */
function exhaustMark(c){
  if(!isOneUse(c)) return '';
  return `<div class="oneuse-bar"></div><div class="oneuse" data-tip="kw:消耗">消耗</div>`;
}
/* 文字列表用的小标签（牌库 / 放大镜等） */
function exhaustChip(c){
  if(!isOneUse(c)) return '';
  return ` <span data-tip="kw:消耗" style="cursor:help;color:#fff;background:var(--red2);border-radius:4px;padding:0 5px;font-size:11px;letter-spacing:1px">消耗</span>`;
}
/* 阴司牒[金·赶尸人 里程碑 t5]：持有它时【尸王】自动进入「强化态」——
   卡面加绿色升级箭头，并追加其专属效果（额外附加，仍打 10 伤 + 顺带 5 格挡）。
   ⚠️ 只改**渲染层**：尸王本体不可升级（canUpgrade 恒 false），t()/ts() 一个字不动 ⇒
      卡面短文案硬闸、canUpgrade、存档口径全不受影响；无阴司牒时输出与改前逐字节相同。 */
function shiWangBoosted(c){ return !!(c && c.id==='shi_wang' && typeof hasRelic==='function' && hasRelic('yinsidie')); }
function shiWangBoostTag(c){ return shiWangBoosted(c) ? '<div style="color:var(--green);margin-top:2px">阴司牒 · 每次尸王攻击后获得 5 点格挡</div>' : ''; }
/* v1.1.x（用户交付 4 张属性图标 素材/ui/ct_*.png）：卡面左下角的分类标
   （`.ct-corner`，手机横屏档显示）由「攻击／防御／技能／鬼怪」文字改成对应图标。
   ⚠️ 走 iconTag：图没到时回落串仍是 TNAME[c.type]（与改动前逐字节相同），
      探到图才变 <img>，每个路径只探一次（不每帧刷 404）。四个属主的图标是白色线稿、
      透明底 ⇒ 正好压在 `.ct-corner` 那块深色小墨牌上（见 原型.html 的 .ct-corner .ct-icon）。 */
const CT_ICON={ attack:'ui/ct_attack.png', defense:'ui/ct_defense.png', skill:'ui/ct_skill.png', spirit:'ui/ct_spirit.png' };
function ctCorner(type){
  const rel=CT_ICON[type];
  return rel ? iconTag(rel, TNAME[type], 'ct-icon') : (TNAME[type]||'');
}
function cardBody(c){
  /* v0.69.0：`.ctype` 从 `.cplate` **里面**移到闭标签**之后**。
     原因见 原型.html 里 .card.has-frame .ctype 的注释：它现在是相对 .card 绝对定位的，
     留在 .cplate 里会按 .cplate 的高度解析 top:48.02%（差 4 倍以上），且被 .cplate 的
     overflow:hidden 裁掉。这三个模板（cardBody / forgeCardHTML / handCardHTML）必须一起改。
     v1.0.6：再改一次版式 —— 卡名（.cname）也从 `.cplate` 里**挪到牌面顶部**（图窗上沿那条
     标题带，见 原型.html `.card.has-frame .cname` 的推导）。铭牌窗因此**整块归描述**，
     描述可用高度从约 34px（3 行）涨到约 49px（4 行），v0.69.0 那套「≤30 列」的长文案
     不再擦着截断边缘。⚠️ 同样三个模板必须一起改，漏一处那张卡就还是旧版面。 */
  /* v1.0.11：铭牌带的文字也拆成 type / 分隔符 / rarity 三个 span，并补上左下角的 `.ct-corner`。
     为什么 —— 手牌（handCardHTML）早就是「三 span + 左下角小墨牌」，而**面板**里的卡
     （锻造 / 易物 / 弃牌 / 商店 / 牌堆 / 奖励三选一 …）一直只有那条铭牌带：
     手机横屏档把 `.ct-type/.ct-sep` 藏掉之后，手牌左下角有「攻击／防御」可辨，
     面板里却什么都没有 ⇒ 玩家没法靠类型筛牌（用户 2026-10-05 报障）。
     三个 span 连起来的文本与原来的 `${TNAME} · ${RNAME}` **逐字相同** ⇒ 桌面逐像素不变。 */
  return `${cardFrame()}<div class="cname">${c.name}${(c.up||shiWangBoosted(c))?'<span class="up-mark" title="已升级">↑</span>':''}</div>${cardArt(c)}${exhaustMark(c)}<div class="cost"${c.id==='duanren_leifu'?' style="background:var(--green);color:#fff"':''}>${cardCost(c)}</div><div class="cplate" data-cardid="${c.id}" data-cardup="${c.up?1:0}"><div class="cdesc">${wrapKw(cardText(c,c.up))}${shiWangBoostTag(c)}</div></div><div class="ctype"><span class="ct-type">${TNAME[c.type]}</span><span class="ct-sep"> · </span><span class="ct-rar">${RNAME[c.rarity]}</span></div><span class="ct-corner">${ctCorner(c.type)}</span>`;
}
function forgeCardHTML(c,i){
  /* v0.75.0：锻造卡面从「一张卡 + 卡内一行红字预览」改成**一组两列对照** ——
     左「当前」▸ 箭头 ▸ 右「升级后」。用户口径：「每两列展示一种卡牌，左边是初始状态
     右边是升级状态，中间有个箭头来指示升级」。
     ⚠️ 本函数必须**继续自包含**：冒烟 `String(forgeCardHTML).indexOf('cardText')` 查的是
        **函数源码**（smoke_runner.js:6744-6746），把卡面拼装抽成模块级 helper 会让
        cardText 从本函数源码里消失 ⇒ 当场变红。所以两张卡的模板字面量直接内联在下面
        （cardBody / handCardHTML 也一直是各自自包含的）。下面的 face() 是**函数内**的
        临时箭头函数，它仍在本函数的源码文本里，闸认。
     ⚠️ `upgrade-preview` 必须落在**升级后那张**的 `.cdesc` 上（不是整张卡上）：
        * 冒烟用子串钉「燃血术无预览 / 雷符有预览」（smoke_runner.js:878/881）；
        * 原型.html 里 .upgrade-preview 的既有语汇就是**卡内红字**（红色 = 升级后的效果），
          挂到 .cdesc 上正好复用那条语汇；挂到 .card 上会把它的边框/外边距也一起吃掉。
        * ⚠️ 但 `.card .cdesc`（0,2,0）的 color **压得过** `.upgrade-preview`（0,1,0），
          所以红色必须由 `#overlay.forge-scene .reward-cards .cdesc.upgrade-preview` 那条
          高特异度规则给（见 原型.html 锻造段），不是自动生效的。 */
  const lock = !c.up && !canUpgrade(c);   // 升级无变化的牌：置灰、不可锻造
  /* 一张卡面。cls / badge / descCls 三个都是给「左」「右」两张卡分身的差异入口。 */
  const face = (cc, cls, badge, descCls) => `<div class="card has-frame ${RCOLOR[cc.rarity]}${cls}" onclick="askForgeCard(${i})">
    ${cardFrame()}<div class="cname">${cc.name}${cc.up?'<span class="up-mark" title="已升级">↑</span>':''}${badge}</div>
    ${cardArt(cc)}${exhaustMark(cc)}
    <div class="cost"${cc.id==='duanren_leifu'?' style="background:var(--green);color:#fff"':''}>${cardCost(cc)}</div>
    <div class="cplate" data-cardid="${cc.id}" data-cardup="${cc.up?1:0}">
    <div class="cdesc${descCls}">${wrapKw(cardText(cc,cc.up))}</div>
    </div><div class="ctype"><span class="ct-type">${TNAME[cc.type]}</span><span class="ct-sep"> · </span><span class="ct-rar">${RNAME[cc.rarity]}</span></div><span class="ct-corner">${ctCorner(cc.type)}</span>
  </div>`;
  /* 已升级 / 不可升级：本来就**没有「升级后」可看**（前者已经是终态、后者升了也不变），
     维持单张卡的原样，不配箭头也不配右卡。 */
  if(c.up || lock) return face(c, lock?' locked':'', lock?'<span class="noup">不可升级</span>':'', '');
  /* 内联 SVG 箭头：不引外部资源、不赌字体有没有「▸」字形（与 .pstat-preblock 的内联
     SVG 同一手法）。aria-hidden —— 它是纯装饰，读屏念「箭头」没意义。
     ⚠️ 描边/填充色写在 CSS 里（原型.html 的 .forge-arrow path），**不写在这里的属性上**：
        SVG 的表现属性（presentation attribute）**不吃 var()** —— 写 stroke="var(--gold)"
        会被当成非法值丢掉，实拍出来是一支暗红色的箭头（不是金）。 */
  const arrow = `<div class="forge-arrow" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22"><path d="M3 12h13M11 6l6 6-6 6"/></svg></div>`;
  /* ⚠️ onclick **只留在两张卡上，不放到 .forge-pair 容器上**：放容器上会与内层卡的 onclick
     一起冒泡 ⇒ forgeCard(i) 被调两次，第二次读到 c.up 已真，弹「这张牌已升级过」。 */
  const up = Object.assign({}, c, {up:true});
  return `<div class="forge-pair">${face(c,'','','')}${arrow}${face(up,'','',' upgrade-preview')}</div>`;
}
function groupHand(){
  // 相同牌相邻摆放（按首次出现的顺序稳定分组）
  const order={};
  for(const c of G.hand){ if(!(c.id in order)) order[c.id]=Object.keys(order).length; }
  G.hand.sort((a,b)=>order[a.id]-order[b.id]);
}
function handCardHTML(c, disabled, i, n){
  const eff=effectiveCost(c);
  const costHtml = (eff<cardCost(c) || c.id==='duanren_leifu') ? `<div class="cost" style="background:var(--green);color:#fff">${eff}</div>` : `<div class="cost">${eff}</div>`;
  /* v0.61.33：删除卡面「预伤徽章」（含数值 / 落空 / 诅咒×N 等标签）。
     原因：徽章按「上次锁定的敌人」算，拖动改指向另一只时数字不跟着变，会显示错伤害。
     预伤改为只在拖拽时浮在**目标敌人头顶**（60_boot.js showDragPreview），并跟随所指目标变化。 */
  const sealed = c.sealed>0;
  /* v0.69.0：文案缩到「封印 N」（封条只有 16px 高、横跨图窗，放不下「忘忧封印 N 回合」）。
     完整语义在长按放大弹窗与关键词说明里，牌面只留一眼可辨的记号。 */
  const sealTag = sealed ? `<div class="exhaust-tag">封印 ${c.sealed}</div>` : '';
  const rot=((i-(n-1)/2)*3).toFixed(1);
  /* v0.72.0：这张牌正被抽牌动画「飞进来」⇒ 终态那张先隐形（透明度由动画层收尾时还原）。
     判据是**对象身份**（NEW_CARDS 是 WeakSet），不是「手牌最后一张」—— groupHand() 会重排 G.hand，
     按下标找必然找错。无头下 animDrawQueued 早退、根本不往 NEW_CARDS 里写 ⇒ 这里恒为空串，
     输出与今天**逐字节相同**（冒烟只查 class="cost" / card/leifu.png / cardPointerDown，本就安全）。 */
  const newAttr = NEW_CARDS.has(c) ? ' data-new' : '';
  /* v1.0.1（手机端重影）：正在「飞进来」的牌，并把隐身**写进 HTML 本身**（`;opacity:0`）。
     原先只由动画层在开播那一刻给**当前那个元素**写内联 opacity —— 而 render() 会把 #hand
     整块重写：手机上 340ms 的飞行窗口里一旦再跑一次 render，旧元素连同它的 opacity:0 一起被丢掉、
     新元素正常显形 ⇒ 画面里同时有飞行的克隆与已落位的手牌，就是用户报的「重影」。
     写进 HTML 后，无论中途重渲染几次，终态那张都是隐形的；收尾由 Anim 的 settle 恢复
     （它同时会去找**当前 DOM 里**那张牌，不是只恢复它记下的旧元素）。
     判据是 FLYING_CARDS（**真正在本层飞**的牌，开播登记 / 收尾摘掉），不是 NEW_CARDS ——
     后者是「本次抽到的」，settle 前一直挂着，拿它判断万一有残留就会把牌永久藏住。
     ⚠️ 首抽那一刻本集合还是空的（play 在 render 尾部才登记），所以**首抽不靠这行**隐身 ——
        那一路仍是动画层自己写 opacity，与今天完全一致。无头下集合恒空 ⇒ 输出**逐字节相同**。 */
  const flying = (typeof FLYING_CARDS!=='undefined') && FLYING_CARDS.has(c);
  /* v1.0.14（P3-7）：血魔刀·攻击牌火环 —— 阴差持有血魔刀且生命低于 30%（= +25% 真正生效中）时，
     手牌里的攻击牌边框挂 .xue-fire（CSS 画一圈渐变橙红火线，微微波动）。
     摆在 handCardHTML（手牌）而不是 cardBody（全站共用）：这一圈是「该牌此刻吃加成」的战斗信号，
     只对手里要打出去的牌有意义。门槛带 fx()：流畅模式不挂 ⇒ 无头冒烟里恒为空串，输出逐字节不变。 */
  const xueFire = (fx() && G && G.hero==='yincha' && hasRelic('xuemodao') && G.hp < G.maxHp*0.3 && c.type==='attack') ? ' xue-fire' : '';
  /* sealTag 与 ctype 都在 .cplate **之后**（两者都是相对 .card 绝对定位的）——
     .exhaust-tag 改绝对定位后不再吃 ~16px 行高，这才是「被封印的牌描述看不全」的根因。 */
  /* v1.0.3：铭牌窗那条木带的文字拆成三个 span（type / 分隔符 / rarity）。
     桌面档三个 span 连起来的文本与原来的 `${TNAME} · ${RNAME}` **逐字相同** ⇒ 逐像素不变；
     手机横屏档（原型.html 的 ⑦ 块）藏掉 type 与分隔符、只留稀有度，
     类型改由卡片左下角的 `.ct-corner` 小墨牌显示（同样是 TNAME[c.type]）。 */
  return `<div class="card has-frame ${RCOLOR[c.rarity]} ${(disabled||sealed)?'disabled':''}${xueFire}"${newAttr} style="--rot:${rot}deg${flying?';opacity:0':''}" onpointerdown="cardPointerDown(event, ${i})">${cardFrame()}<div class="cname">${c.name}${(c.up||shiWangBoosted(c))?'<span class="up-mark" title="已升级">↑</span>':''}</div>${cardArt(c)}${exhaustMark(c)}${costHtml}<div class="cplate"><div class="cdesc">${wrapKw(cardText(c,c.up))}${shiWangBoostTag(c)}</div></div>${sealTag}<div class="ctype"><span class="ct-type">${TNAME[c.type]}</span><span class="ct-sep"> · </span><span class="ct-rar">${RNAME[c.rarity]}</span></div><span class="ct-corner">${ctCorner(c.type)}</span></div>`;
}
function intentText(e){
  const st=(e.strength||0); // v0.61 C2：力量每点 +1
  const atkPlain=e.intent.v+st; // v0.61.01：不吃蓄力的意图（连击 / 群体 / 攻击并格挡）
  const atk=e.intent.v+(e.pendingDamage||0)+st; // v0.61.01：只有单体「攻击」会消费蓄力
  switch(e.intent.type){
    case 'attack': return `⚔️ 攻击 ${atk}`;
    case 'charge': return `⏳ 蓄力（下回合单体攻击 +${e.intent.v}）`;
    case 'block': return `🛡️ 格挡 ${e.intent.v}`;
    case 'heal': return `❤️ 回血 ${e.intent.v}`;
    case 'weak': return '🥀 施加虚弱';
    case 'gouhun': return '🔗 勾魂（少抽1张）';
    case 'burn': return `🔥 灼烧 +${e.intent.v}（每回合 -${e.intent.v*2} 生命）`;
    case 'strength': return e.intent.weak ? `💪 力量 +${e.intent.v} · 施加虚弱` : e.intent.sealHeal ? `💪 力量 +${e.intent.v} · 回血` : `💪 力量 +${e.intent.v}`;
    case 'multi': return `⚔️ 连击 ${e.intent.n}×${atkPlain}`; // v0.61 C2/C2.01：连击不吃蓄力加值（与实际结算一致，原先预览偏高）
    case 'discard': return '🗑️ 下回合随机弃你 1 张牌';
    case 'attackBlock': return `⚔️ 攻击 ${atkPlain} · 🛡️ 格挡 ${e.intent.block}`; // v0.61.01：该意图既不叠加也不消耗蓄力（原预览虚高）
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
/* v1.0.14：敌人意图改「图标 + 数字」。
   原来立绘下那一行是整句中文（`⚠ 意图：攻击 12 · 施加虚弱`），窄屏会折行、占地大；
   现在只留一枚图标 + 必要的数字，完整释义挪进 `.intent` 的 title（悬停可看）。
   ⚠️ `intentText()` **一个字都不能改**：冒烟 :2803/:2805/:2855/:2857/:2860 按中文整句断言。
   ⚠️ 图标走 `iconTag`：`ui/intent_*.png` 到了自动换图，没图逐字节回落成原 emoji。
      能复用的直接借用 `buff/` 已交付的那几张（格挡/虚弱/蓄力/灼烧/勾魂/力量/记名/业火）。 */
function intentChip(e){
  const st=(e.strength||0);
  const atkPlain=e.intent.v+st;
  const atk=e.intent.v+(e.pendingDamage||0)+st;
  const I=(n,fb)=>iconTag('ui/intent_'+n+'.png', fb);
  const B=(n,fb)=>iconTag('buff/'+n+'.png', fb);
  switch(e.intent.type){
    case 'attack': return I('attack','⚔️')+atk;
    case 'charge': return B('charge','⏳')+'+'+e.intent.v;
    case 'block': return B('block','🛡️')+e.intent.v;
    case 'heal': return I('heal','❤️')+e.intent.v;
    case 'weak': return B('weak','🥀');
    case 'gouhun': return B('gouhun','🔗');
    case 'burn': return B('burn','🔥')+e.intent.v;
    case 'strength': return B('strength','💪')+e.intent.v+(e.intent.weak?B('weak','🥀'):'')+(e.intent.sealHeal?I('heal','❤️'):'');
    case 'multi': return I('multi','⚔️')+e.intent.n+'×'+atkPlain;
    case 'discard': return I('discard','🗑️');
    case 'attackBlock': return I('attack','⚔️')+atkPlain+B('block','🛡️')+e.intent.block;
    case 'summon': return I('summon','👥')+e.intent.n;
    case 'jiming': return B('ledger','📜');
    case 'qingsuan': return I('qingsuan','⚖️');
    case 'yehuo': return B('karmafire','🔥');
    case 'wangyou': return I('wangyou','🍵');
    case 'aoe': return I('aoe','💥')+atk;
    case 'dormant': return I('dormant','💤');
    default: return '…';
  }
}
// v0.60 的纵深错落表。v0.72.0 起它**不再决定敌人抬多高**（纵向改由 SLOT_SHAPE 的弧线
// 主导），但仍以「净空下限」的身份活着：battleHeadroom() 拿它算 --headroom 的下界。
// ⚠️ 这个数组与 battleHeadroom() 本身一个字都不能改（冒烟逐条钉死）。
const RISE_LIFT=[0,42,20,60,30];
// 当前场上「后排上抬」的最大幅度 —— 用作 #enemy-panel 的 padding-top，
// 保证被抬起的后排敌人不会越过 .battle 上沿去盖住 #topbar（v0.60 修）
function battleHeadroom(){
  let mx=0;
  (G.enemies||[]).forEach((e,i)=>{ if(alive(e)||e.dying) mx=Math.max(mx, RISE_LIFT[i%RISE_LIFT.length]); });
  return mx;
}
/* v0.70.0：后排上抬幅度的**倍率**。基准档 =1（与 v0.69.0 逐像素相同），
   矮屏档由 CSS 的 --rise-unit 压小 —— 390px 高的屏上抬 60px 会把后排顶进顶栏。
   ⚠️ RISE_LIFT 与 battleHeadroom() 本身**一个字都不能改**：冒烟逐条钉死了
      0/42/60/20 与 max(RISE_LIFT[i%len]) —— 倍率只能加在调用点。
   ⚠️ 必须带 window.getComputedStyle 守卫（照 mapCamRange 的写法）：冒烟宿主里
      既没有它也没有 innerWidth，漏了守卫会算出 NaN，而 NaN 会一路写进
      内联 transform 与 z-index。 */
/* v0.72.0：弧线振幅的**横纵两个倍率**。
   `--rise-unit` 管纵向（敌人往上抬多少），`--slot-dx-k` 管横向（向左拉向玩家多远）。
   `--rise-unit` 是 v0.70.0 就有的旋钮，那时它乘的是 RISE_LIFT（后排上抬幅度）；
   v0.72.0 起纵向改由 SLOT_SHAPE 的 dy 主导，它乘的就是 dy —— 语义一个字没变
   （「敌人往上抬多少」），换的只是被乘的那张表。所以名字不改成 --slot-dy-k：
   两个名字一起看反而对不上，而它本来就是这个意思。
   为什么做成 CSS 变量：矮屏档只要写一条同特异度、书写更后的同名变量就能压小，
   **JS 完全不需要知道当前是哪个档**（所以也不需要 innerWidth，无头宿主里照样安全）。
   ⚠️ 两个都必须容忍 0：窄屏档（≤520 / ≤360）要把弧线**整个归零**（那两档
      .battle 是 flex-direction:column ⇒ 玩家在上、敌人在下，「玩家左下」本来就失效）。
      所以判据是「有限且 ≥0」—— v0.70.0 写的是 `>0`，它会把 0 误判成非法而回落成 1，
      窄屏当场长出弧线（v0.70.0 时 `--rise-unit` 的合法值域只有 >0，没有 0 这一档，
      所以那时写 >0 是对的，现在不是了）。
   ⚠️ isFinite 同样是硬要求：变量写空 ⇒ NaN ⇒ 一路写进 --ex/--ey ⇒
      浏览器**丢弃整条 transform**（不是退回 0）⇒ 所有敌人塌回原点，静默无报错。
   无头宿主里没有 getComputedStyle ⇒ 早退 ⇒ 两个倍率恒为 1。 */
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
/* v0.72.0：弧线槽位表。下标 = 纵深秩 r，**r=0 是最前排（最浅 / 最低 / 最靠玩家）**。
   秩由 enemyPanelHTML 里的 `rank = 存活数-1-pos` 算出（pos = filter 之后的位置）：
   `#enemy-panel` 是 row-reverse ⇒ G.enemies[0] 落在**最右**，配 rank=n-1-pos 正好让
   「数组首元素 = 最深 = 最高 = 最右」⇒ 斜向从右上（远）降到左下（贴近玩家），
   就是用户要的「包围玩家 + 集中在右上角」。**不要动 G.enemies 的顺序** ——
   30_engine.js 的 summon / boss 分裂都依赖数组序，秩只在 enemyPanelHTML 内部算。
   dx ≤ 0：只向左（向玩家）拉，**不取正值**。为什么不能取正：row-reverse 下最右那只
     **已经**贴着右缘，再给它正 dx 就会顶出 #enemy-panel 右缘，只能靠加大 padding-right
     兜，而 padding-right 会直接吃掉可用宽（1280×720 下只有 818px），把 3 敌从一行挤成两行。
     取负则只会把它从右缘往内收 —— 正好就是用户要的「不贴角」。
   dx 的形状：**最浅那只恒为 0（不动），越深拉得越多**。
     ⇒ 整组「压在右上方、朝玩家俯下」：越靠后的越往左下收，最前排那只留在原地
       站在地平线上 = 「包围玩家」+「集中右上角」。
     ⚠️ 反过来（浅的拉最多、深的归 0）试过，**实测撞车**：960×540 五敌（2 elite+3 normal）
        那一行正好塞满面板（786/790），最前排那只的 flex 左边只余 4px，再往左拉 29px
        就压进 #player-panel（左沿 131 vs 玩家面板右沿 146）。而「浅的归 0」把最前排
        **钉死在 flex 位上**（它按定义就在面板内）⇒ 与玩家面板相交这条风险**由构造排除**，
        不靠实拍撞出来。这一条是本表唯一不能随便调头的方向。
     dy ≥ 0：只向上抬。抬高量由 #enemy-panel 的 padding-top（--headroom）兜住。
   两个位移都**不参与 flex 布局**（transform 是纯绘制层）⇒ 弧线完全不改变换行判定。
   ⚠️ dy 的振幅是本批的**预算命门**，它是照 --headroom 的封套定的、不是照参考图定的：
     62 就是 v0.71.0 已有的净空上限（RISE_LIFT 最大值 60 + 2），所以基档高度零变化。
     往上调只会让 .battle 变高、把竖滚放回来（见 slotHeadroom 那条注释）。 */
const SLOT_SHAPE = [
  {dx:  0, dy: 0},   // ① 最前排：站在地平线上，与玩家同高（**横向钉在 flex 位上，不动**）
  {dx:-14, dy:14},
  {dx:-28, dy:28},
  {dx:-42, dy:42},
  {dx:-54, dy:54},   // 越深越往左下收 ⇒ 整组朝玩家俯下
  {dx:-64, dy:62},   // ⑥ 满场（boss 分裂 / 召唤）
];
/* 场上存活（含正在播死亡动画）的敌人数 —— 与 enemyPanelHTML 收到的 filter 同一口径。 */
function slotCount(){
  let n=0;
  (G.enemies||[]).forEach(e=>{ if(alive(e)||e.dying) n++; });
  return n;
}
function slotShift(r){
  const last=SLOT_SHAPE.length-1;
  const i=Math.max(0, Math.min(last, r|0));   // `r|0` 顺手把 NaN / undefined / 越界一并收进 [0,last]
  const s=SLOT_SHAPE[i];
  return { dx:Math.round(s.dx*_slotDxK), dy:Math.round(s.dy*_riseK) };
}
/* 弧线自身的最大上抬量 —— 与 battleHeadroom() 同构，由调用点取两者的 max 当 --headroom。
   ⚠️ 必须**按当前敌人数**取最大，不能扫全表：单敌时 rank 只可能是 0 ⇒ 实际抬升 0，
      扫全表却会返回 62 ⇒ --headroom=64 ⇒ 单敌也白吃 62px，`.battle` 从 290 涨到 345、
      整页多 55px。表在 dy 上是单调的，所以「前 n 项取 max」正好等于实际会用到的最大 dy。 */
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
  /* v1.0.12：与玩家血条同一套 —— 这一帧比上一帧涨了（敌人 heal / 再生 / 僵王吸血）就走「慢慢涨」慢档。 */
  const ehGain=ehp>ehPrev+0.001;
  ENEMY_HP_PREV[e.uid]=ehp;
  /* v0.61.33：删除「点击锁定」后不再有选中态 —— 目标只由拖拽落点决定（拖拽中的高亮是 .drag-target） */
  // 纵深错落：纵向位移改由弧线槽位表主导（见 SLOT_SHAPE）。
  // ⚠️ RISE_LIFT 不再决定这只敌人抬多高 —— 它是**非单调**的（0/42/20/60/30），
  //    当斜向纵深的基线会让中间那只反而比最深的那只高。RISE_LIFT 与 battleHeadroom()
  //    本身一个字没改，它们以「净空下限」的身份继续被 60_boot.js 调用（--headroom 取 max）。
  const rank=(idx>=0 ? slotCount()-1-idx : 0);
  const edef=ENEMIES[e.key];
  const eSize=e.boss?'e-boss':e.elite?'e-elite':(edef&&edef.summon)?'e-summon':'e-normal';
  /* v0.72.0：弧线位移。纵向与横向都由槽位表给（sh.dy / sh.dx），已经乘过矮屏倍率。
     z-index 仍是 `2000-上抬量`：dy 在秩上是单调的 ⇒ 「越深越高 ⇒ 越深越靠后」，
     也就是前排永远压住后排（命中的 z-index 决胜依赖这一条）。
     内联 `--ex/--ey` 而不是内联 transform：见 原型.html 里 `.enemy` 那条注释。 */
  const sh=slotShift(rank);
  const ex=sh.dx;
  const ey=sh.dy;
  /* v1.0.13：徽章前那枚 emoji 走 iconTag —— 图到了（素材/buff/<id>.png）自动换图，没到逐字节输出原 emoji。
     id 表见《美术设计要求.md》§4.3；词缀（AFFIXES 的 9 个 id）本来就是纯文字，图到了才多一枚图标。 */
  let badges='';
  if(e.curse>0){ const max=e.curse>=6 && (hasRelic('leifaxinjue') || hasRelic('taishangzhou')); badges+=`<span class="badge curse${max?' curse-max':''}" data-tip="kw:诅咒" style="cursor:help">${iconTag(max?'buff/curse_6.png':'buff/curse_1_5.png','☠️')}诅咒 ×${e.curse}</span>`; }   // v1.0.18：用户口径 —— 【雷法心诀】或【太上咒箓】**只要有任意一个**在身，叠满 6 层就换 curse_6.png，否则一律 curse_1_5.png
  /* v1.0.14：腐骨散施加的【腐毒】（每回合开始按层数掉血、随后 -1 层）。 */
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
  // 尸王在场时其他召唤单位伤害 +1（与 summonAct 结算一致：尸王自身不吃、无尸王不加）
  // v1.0.21：补上群鬼乱舞[阴差]的「本回合每失 2 血 +N」增伤 —— 此前总伤提示变了、每个召唤物的显示却没跟着变（用户报）。
  const sw = (s.type!=='shi_wang' && G.summons.some(x=>x.type==='shi_wang' && x.dur>0)) ? 1 : 0;
  const bleed = G.bleedSummons ? Math.floor((G.hpLostTurn||0)/2)*(G.bleedSummonsBonus||1) : 0;
  /* v1.1.5：增伤只给「有攻击力」的召唤物（纸人/小鬼/阴兵）。尸王走 s.v 原值；
     五通神不打人（只给格挡/回血），**绝不能**被群鬼乱舞的失血增伤或尸王加成抬到回复量上
     —— 与 wutongTick 的 `const b=s.v||3;` 严格同口径（用户报：五通神回血量被多算了）。 */
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
  /* v1.0.3：筹码条形式 —— 正文只留「短名 数值 · 剩 N」，完整机制描述进 title 与 .sb-long。
     ⚠️ 完整描述**一个字都没删**：它同时出现在 title 与 .sb-long 里 ——
        桌面档（含顶栏详情）显示 .sb-long 原文，与改动前逐字相同；
        手机横屏档才换成 .sb-short（原型.html 的 ⑥ 块）。
        冒烟 :506-513 / :1021-1023 / :2076-2078 都是按 indexOf 断言标签全文仍在 ⇒ 必须保留。
     短名从 label 的「X：…」前半段取（下面每个分支的格式统一是「类型名：描述」）⇒ 不需要新名字表。 */
  const name = label.slice(0, label.indexOf('：')) || label;
  /* v1.0.21：名字前加一枚对应召唤物颜色的小圆点（纸人白 / 小鬼黑 / 五通神紫 / 阴兵金 / 尸王红）。 */
  const dot = `<i class="summon-dot" style="background:${SUMMON_DOT[s.type]||'#a06be0'}"></i>`;
  return `<span class="summon" title="${label}"><span class="sb-long">${dot}${label} · 剩 ${s.dur} 回合</span><span class="sb-short">${dot}${name} ${v} · 剩 ${s.dur}</span></span>`;
}

/* ===================== 拖拽出牌（阶段② 骨架） ===================== */
const AOE_CARDS = ['wanjian', 'baigui', 'leiqianfu'];   // 打全体：不需要拖拽箭头（咒雨不在此列 —— 它按机制随机分配，不是「全体」，见 P3；雷谴符 v1.1.0 改为群伤）
/* v0.61.33：是否需要「拖出箭头指向单个敌人」改为**按机制**判定，不再只看 type==='attack'。
   原先的判定漏掉 4 张真正要指定目标的牌，删掉「点击锁定」后它们会永远选不了目标：
     · 钟馗镇魂 / 镇妖铃 —— type 是 spirit，但走 curEnemy() 打单体（镇妖铃还对带诅咒目标加伤）
     · 画皮 —— 定向施加【魅惑】；咒印 —— 定向施加【诅咒】
   攻击牌里 万剑归宗 / 百鬼夜行 打全体、无需箭头（已由 AOE_CARDS 排除）。 */
const TARGETED_CARDS = ['leifu','huofu','jianfu','zhanyaojian','tianlei','tiebushan','shihun','qungui',
  'taomufu','shihunzhou','shixue','zhongkui','zhenyaoling','huapi',
  /* 断刃雷符：断刃遗物发的 0 费攻击牌，eff 走 curEnemy() ⇒ 同样要箭头（否则只能打最右那只） */
  'duanren_leifu',
  /* 罗汉伏虎（武僧里程碑 t1）：eff 走 curEnemy()，按指定敌人结算 ⇒ 要箭头 */
  'luohanfuhu',
  /* 饮血刃（阴差里程碑 t1）：eff 走 curEnemy() 打单体 ⇒ 要箭头 */
  'yinxueren'];
function needsTarget(c){
  // 咒印：目标随角色变 —— 赶尸人=拿尸气、武僧=给自己挂吸血，都不指向敌人；天师/阴差才定向施咒
  if(c.id==='zhouyin') return G.hero!=='ganshiren' && G.hero!=='wuseng';
  /* v0.75.0：舍身 —— 天师列是「失去 4 血 + 抽牌 + 对目标施加 N 层【诅咒】」，
     有对敌人施加效果却不带箭头。赶尸人（尸气）/ 武僧（格挡）/ 阴差（纯抽牌）三列
     对敌人**零作用** ⇒ 只有天师列出箭头。同 zhouyin 的「按角色条件定向」先例。 */
  if(c.id==='sheshen') return G.hero==='tianshi';
  /* v1.0.21：群鬼乱舞按角色条件定向 —— 用户报「阴差里对敌人没有伤害，却有指向性箭头」。
     核实 eff：赶尸人=消耗尸气触发召唤、阴差=失血+挂「召唤增伤」buff，**两列对敌人零直接作用**
     ⇒ 拖出箭头指不到任何东西，必须去掉；只有真正打向指定敌人的天师（诅咒增伤）/ 武僧（召唤数增伤）保留箭头。 */
  if(c.id==='qungui') return G.hero==='tianshi' || G.hero==='wuseng';
  /* v0.75.0 复查结论（用户点名要复查「应该加上指示性的卡牌」）——
     全仓把 curEnemy() / randomAlive() 逐点映射过一遍后的判定，**故意不加箭头**的四张：
       · 附灵术：天师列「每触发 1 个召唤物，对随机敌人施咒」×N。文案明写「随机」，
         且 N 取决于当场触发的召唤数、打出时算不出来；改成指定 = N 层全砸一只，是远大于舍身的加强。
         （用户 2026-09-30 明确确认：说明写「随机」的就不要指向性。）
       · 纸人 / 五通神：召唤物的**回合末**随机施咒 —— 不是出牌时点，无从指向。
       · 洗髓经：持续被动，每回合随机施咒 —— 同上。
       · 焚符：每弃 1 张的**副效应**随机施咒，且它是多步选牌弹窗 —— 副效应不是主目标。
     攻击侧本来就完整：除 wanjian / baigui 外每张 type==='attack' 都在名单里，
     那两张是 AoE、由 AOE_CARDS 明确豁免（冒烟有钉子）。**名单本身不动。** */
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
  if(py<0){ px=-px; py=-py; }                 // 弓形朝下（抛物线轨迹）
  const bow=len*0.24;                          // 弧度大小
  const mx=(x1+x2)/2+px*bow, my=(y1+y2)/2+py*bow;
  const wT=2.2, wH=12;                         // 尾部细、箭头粗
  const t1x=x1+px*wT, t1y=y1+py*wT, t2x=x1-px*wT, t2y=y1-py*wT;
  const h1x=x2+px*wH, h1y=y2+py*wH, h2x=x2-px*wH, h2y=y2-py*wH;
  const wM=(wT+wH)/2;
  const c1x=mx+px*wM, c1y=my+py*wM, c2x=mx-px*wM, c2y=my-py*wM;
  const hs=Math.max(16, Math.min(28, len*0.10));   // 箭头长度
  const hh=wH*1.6;                                  // 箭头半宽（明显宽于箭身）
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

