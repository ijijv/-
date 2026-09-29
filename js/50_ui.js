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
   槽位间距 21%，抖动上限 ±4% / ±7px ⇒ 不会越槽、也不会与相邻列撞在一起。 */
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
/* ⚠ endless 必须显式给，否则 act4 会 404 丢背景图。
   v0.61.41：地图背景改用用户给的 素材/bg/bg_map.jpg（setBg 已支持带扩展名的名字），
   全部幕共用这一张；战斗场景仍走 act1/act2/act3，两者互不影响。 */
const MAP_BG = { 1:'map.jpg', 2:'map.jpg', 3:'map.jpg', endless:'map.jpg' };
function mapBgName(){ return G.endless ? MAP_BG.endless : (MAP_BG[G.act]||MAP_BG[1]); }
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
  if(mapVisited(r,c)) return 'past';            // 走过的格子，**任何层**都是 past（含刚打完的那一层）
  if(r===G.mapRow) return mapReachable(r,c) ? 'choice' : 'hidden';
  if(r<G.mapRow) return mapRevealedColsAt(r).indexOf(c)>=0 ? 'past' : 'hidden';
  if(r===G.mapRow+1) return mapPreviewSet().indexOf(c)>=0 ? 'preview' : 'hidden';
  return 'hidden';
}
function fogVisible(r,c){ return fogTier(r,c)!=='hidden'; }
function runStatusHTML(){
  const relicNames = G.relics.length ? G.relics.map(id=>{const r=relById(id);return `<span class="prelic-chip" data-tip="relic:${id}">${relicIcon(r)}<span class="prelic-name">${r.name}</span></span>`;}).join('') : '无';
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
  if(G.hero==='ganshiren') res=`<span class="mt-shiqi">尸气 <b>${G.尸气}/${G.maxShiQi}</b></span>`;
  else if(G.hero==='yincha') res=`<span class="mt-xuenu">血怒 <b>${G.xuenu||0}/${G.maxXuenu||10}</b></span>`;
  const relics=G.relics.length
    ? `<span class="mt-relics">${G.relics.map(id=>{const r=relById(id); return `<span class="prelic-chip" data-tip="relic:${id}">${relicIcon(r)}<span class="prelic-name">${r.name}</span></span>`;}).join('')}</span>`
    : '<span>无遗物</span>';
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
        ${relics}
      </span>
    </span>
    <button class="mt-menu" onclick="openMenu()" title="菜单">☰</button>
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
  const u=function(rel){ return 'url("'+assetURL(rel)+'")'; };
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
  for(let r=0;r<MAP.length-1;r++){
    const cur=MAP[r]||[];
    for(let c=0;c<cur.length;c++){
      if(!fogVisible(r,c)) continue;
      const nx=(cur[c] && cur[c].next)||[];
      for(let k=0;k<nx.length;k++){
        const j=nx[k], r1=r+1;
        if(!fogVisible(r1,j)) continue;                 // ← 唯一的门禁：两端都要可见
        const key=mapEdgeKey(r,c,r1,j);
        const edge={ a:nodeAt(r,c), b:nodeAt(r1,j), key:key };
        if(walkedKey(r,c,r1,j)) __past.push(edge);
        else if(r1===G.mapRow) __reach.push(edge);
        else __dim.push(edge);
      }
    }
  }
  // 输出顺序＝叠放顺序：先暗线打底，再走过的，最后金虚线压在上面（与三段循环时代一致）
  let i;
  for(i=0;i<__dim.length;i++)   seg(__dim[i].a,   __dim[i].b,   'link-dim',   false, __dim[i].key);
  for(i=0;i<__past.length;i++)  seg(__past[i].a,  __past[i].b,  'link-past',  (__past[i].key===_mapGlowEdge), __past[i].key);
  for(i=0;i<__reach.length;i++) seg(__reach[i].a, __reach[i].b, 'link-reach', false, __reach[i].key);
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
    // v0.61.40：Boss 在**生成期**就定死在 node.e（同一存档续档后不再变）；下面两行只是兜底
    if(node.e && node.e.length) startBattle(node.e);
    else if(G.endless) startBattle([ENDLESS_BOSSES[Math.floor(rng()*ENDLESS_BOSSES.length)]]);
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
  const cards=G.deck.map((c,i)=>`<div class="card has-frame ${RCOLOR[c.rarity]}" onclick="doUnknownRemove(${i})">${cardBody(c)}</div>`).join('');
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
  if(!hasRelic(relic.id)) G.relics.push(relic.id);
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
  if(roll===0){ const h=15; G.hp=Math.min(G.maxHp,G.hp+h); msg=`恢复 ${h} 点生命`; sfx('heal'); }
  else if(roll===1){ G.maxHp+=5; G.hp=Math.min(G.maxHp,G.hp+5); msg='最大生命 +5（并恢复 5 点生命）'; sfx('heal'); }
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
  showOverlay(`<h2>道 观</h2><p>一间废弃道观，香炉尚温。<br>你可以免费锻造升级一张牌。</p><div class="reward-cards">${cards}</div><button class="btn ghost" onclick="hideOverlay(); goNext();">离开</button>`);
}
function unknownEmpty(){
  showOverlay(`<h2>空 坟</h2><p>一座荒坟，墓碑字迹已模糊。<br>什么也没有发生。</p><button class="btn" onclick="hideOverlay(); goNext();">继续前进</button>`);
}

/* ===================== 奖励与篝火 ===================== */
function weightedCard(){
  const eligible=CARDS.filter(c=> (c.id!=='shi_wang' || G.hero==='ganshiren') && (!c.needs || deckHasMechanic(c.needs)));
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
  const cards=picks.map((c,i)=>({c,i})).sort((a,b)=>(_TYPE_ORD[a.c.type]??9)-(_TYPE_ORD[b.c.type]??9)||a.i-b.i)
    .map(({c,i})=>`<div class="card has-frame ${RCOLOR[c.rarity]}" onclick="pickReward(${i})">${cardBody(c)}</div>`).join('');
  showOverlay(`<h2>战斗胜利 · 三选一</h2><p>点击一张卡牌加入你的牌组（或跳过）</p><div class="reward-cards">${cards}</div><button class="btn ghost" onclick="skipReward()">跳过</button>`);
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
  const avail=RELICS.filter(r=>!hasRelic(r.id));
  const pool=avail.length? avail : RELICS;
  for(let attempt=0; attempt<6; attempt++){
    const r=rng()*100; const rarity=r<55?'white':r<85?'blue':r<97?'purple':'gold';
    const p=pool.filter(x=>x.rarity===rarity);
    if(p.length) return p[Math.floor(rng()*p.length)];
  }
  return pool[Math.floor(rng()*pool.length)];
}
function showRelicReward(){
  const unowned = RELICS.filter(r=>!hasRelic(r.id));
  if(!unowned.length){ goNext(); return; }
  const picks = shuffle([...unowned]).slice(0,3);
  G.relicPicks=picks;
  const html=picks.map((r,i)=>`<div class="relic ${RCOLOR[r.rarity]}" onclick="pickRelic(${i})">${relicIcon(r)}<div class="cname" data-tip="relic:${r.id}">${r.name}</div><div class="cdesc">${r.desc}</div><div class="ctype">遗物 · ${RNAME[r.rarity]}</div></div>`).join('');
  showOverlay(`<h2>获得遗物 · 三选一</h2><p>遗物本局永久生效，点击获得（或跳过）</p><div class="reward-cards">${html}</div><button class="btn ghost" onclick="skipRelic()">跳过</button>`);
}
/* v0.61.32：遗物音按法器类别分化（同古井许愿那一处） */
function pickRelic(i){ const r=G.relicPicks[i]; if(!hasRelic(r.id)) G.relics.push(r.id); sfx(relicSfxFor(r)); log(`获得遗物【${r.name}】`); hideOverlay(); goNext(); }
function skipRelic(){ hideOverlay(); goNext(); }

function showCampfire(){
  G.campRemoved=false; G.campActed=false;
  SCENE='camp'; saveRun();
  setBGM('shop'); // v0.61.31：营地为非战斗场景，与商店共用同一条轨
  renderCampfire();
}
function renderCampfire(){
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
function restAtCamp(){ G.hp=Math.min(G.maxHp,G.hp+20); log('在篝火旁休息，恢复 20 生命'); G.campActed=true; saveRun(); renderCampfire(); }
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
  showOverlay(`<h2>锻造 · 点击一张牌升级</h2><p>红色字是升级后的效果（整局有效）。${hint}</p><div class="reward-cards">${cards}</div>${back}`);
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
  const cards=G.shopWares.map((c,i)=>{ const p=priceFor(c); const ok=G.gold>=p; return `<div class="card has-frame ${RCOLOR[c.rarity]} ${ok?'':'disabled'}" onclick="buyCard(${i})">${cardBody(c)}<div class="card-extra" style="color:${ok?'var(--gold)':'var(--red)'};font-weight:bold">${p} 金币${ok?'':' · 金币不足'}</div></div>`; }).join('') || '<p style="color:var(--dim)">货已售罄</p>';
  const potions=(G.shopPotions||[]).map((p,i)=>{ const price=potionPrice(); const ok=G.gold>=price; return `<div class="relic r-blue ${ok?'':'disabled'}" onclick="buyPotion(${i})">${potionIcon(p)}<div class="cname">${p.name}</div><div class="cdesc">${p.desc}</div><div class="ctype" style="color:${ok?'var(--gold)':'var(--red)'}">${price} 金币</div></div>`; }).join('');
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
function potionPrice(){ return 30 + 5*(G.potionBought||0); }
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
  const cards=G.deck.map((c,i)=>`<div class="card has-frame ${RCOLOR[c.rarity]}" onclick="doRemove(${i})">${cardBody(c)}</div>`).join('');
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
  try{ const d=Store.getJSON(SAVE_KEY); if(d && Array.isArray(d.unlocked)) SAVE=d; }
  catch(e){ SAVE={unlocked:[]}; }
}
function persistSave(){
  try{ Store.setJSON(SAVE_KEY, SAVE); }catch(e){}
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
    if(!have){
      return `<div class="bcard locked"><div class="bname">？？？</div><div class="bmeta">${tag||'未收录'}</div><div class="bstory">尚未收录——在战斗中击败它，即可解锁它的志怪故事。</div></div>`;
    }
    return `<div class="bcard"><div class="bname">${e.name}${tag?` <span style="font-size:12px;color:var(--red)">${tag}</span>`:''}</div><div class="bmeta">${KIND_ICON[e.kind]||''}${KIND_LABEL[e.kind]||'怪'} · 生命 ${e.hp}</div><div class="bstory">${STORIES[k]||''}</div></div>`;
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
    html+=`<button class="btn ghost" onclick="doAdDouble()">看广告 · 签到奖励翻倍（再 +5 金币）</button>`;
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
function viewStats(){
  const s = SAVE.stats || {};
  const days = s.days ? Object.keys(s.days).length : 0;
  const runs = s.runStart||0;
  const ads = s.ad||0;
  const avgAds = runs>0 ? (ads/runs).toFixed(2) : '0';
  const winRate = runs>0 ? Math.round(((s.runWin||0)/runs)*100) : 0;
  showOverlay(`<h2>数 据 统 计</h2>
    <div class="kwlist">
      <p><b>活跃天数</b>　${days} 天（首日 ${s.firstSeen||'—'} · 最近 ${s.lastSeen||'—'}）</p>
      <p><b>累计开局</b>　${runs} 次 · 通关 ${s.runWin||0} 次（胜率 ${winRate}%）</p>
      <p><b>死亡</b>　${s.death||0} 次 · 复活 ${s.revive||0} 次</p>
      <p><b>广告观看</b>　${ads} 次（人均 ${avgAds} 次/局）</p>
      <p><b>签到</b>　${s.signIn||0} 次</p>
    </div>
    <p style="font-size:12px;color:var(--dim)">正式版这些数据接入抖音/微信统计 SDK，本原型用 localStorage 存。</p>`, true);
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
  const SCENES=['map-scene','menu-scene','scroll-scene','hero-scene','pick-scene'];
  const wasScene = (ov && ov.classList) ? (SCENES.filter(c=>ov.classList.contains(c))[0]||'') : '';
  // v0.61.42：任何面板开之前先摘掉 .map-scene（地图专属的半透明底）——
  // 否则 showMap 之后直接 showOverlay 的奖励/商店面板会继承半透明底，白白透出背景。
  // v0.65.0：.menu-scene 同理（主菜单整屏场景）。
  // v0.66.0：.scroll-scene 同理（图鉴/排行榜/设置的卷轴落下）—— 漏摘的话，从主菜单看完图鉴
  // 再回战斗，奖励面板也会带着卷轴动画从顶上掉下来。
  if(ov && ov.classList){ ov.classList.remove('map-scene'); ov.classList.remove('menu-scene');
    ov.classList.remove('scroll-scene'); ov.classList.remove('hero-scene'); ov.classList.remove('pick-scene'); }
  ov.classList.remove('hidden');
  // 主菜单→图鉴（menu-scene→scroll-scene）算换场景 ⇒ 补 ov-enter ⇒ 卷轴真的落下来；
  // 图鉴里翻页/设置里拨开关（scroll-scene→scroll-scene）不算 ⇒ 不重播。
  // 无场景的普通面板（战斗奖励/商店）行为与 v0.65.0 完全一致（只有 !wasOpen 才播）。
  const sceneChanged = !!scene && scene !== wasScene;
  if(ov && ov.classList) ov.classList.toggle('ov-enter', !wasOpen || sceneChanged);
  if(scene && ov.classList) ov.classList.add(scene);
  const x=document.getElementById('overlayCloseX'); if(x) x.style.display = closable ? '' : 'none'; }
function hideOverlay(){ overlaySfx();   // v0.61.32：与 showOverlay 成对
  document.getElementById('overlay').classList.add('hidden'); }
function closeOverlay(){ hideOverlay(); if(!G) showStartScreen(); }

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
function cardBody(c){
  /* v0.69.0：`.ctype` 从 `.cplate` **里面**移到闭标签**之后**。
     原因见 原型.html 里 .card.has-frame .ctype 的注释：它现在是相对 .card 绝对定位的，
     留在 .cplate 里会按 .cplate 的高度解析 top:48.02%（差 4 倍以上），且被 .cplate 的
     overflow:hidden 裁掉。这三个模板（cardBody / forgeCardHTML / handCardHTML）必须一起改。 */
  return `${cardFrame()}${cardArt(c)}${exhaustMark(c)}<div class="cost">${cardCost(c)}</div><div class="cplate"><div class="cname">${c.name}${c.up?' <span style="color:var(--green)" title="已升级">↑</span>':''}</div><div class="cdesc">${wrapKw(cardText(c,c.up))}</div></div><div class="ctype">${TNAME[c.type]} · ${RNAME[c.rarity]}</div>`;
}
function forgeCardHTML(c,i){
  const lock = !c.up && !canUpgrade(c);   // 升级无变化的牌：置灰、不可锻造
  const body = (c.up || lock)
    ? `<div class="cdesc">${wrapKw(cardText(c,c.up))}</div>`
    : `<div class="cdesc">${wrapKw(cardText(c,false))}<div class="upgrade-preview">升级 → ${wrapKw(cardText(c,true))}</div></div>`;
  return `<div class="card has-frame ${RCOLOR[c.rarity]}${lock?' locked':''}" onclick="forgeCard(${i})">
    ${cardFrame()}${cardArt(c)}${exhaustMark(c)}
    <div class="cost">${cardCost(c)}</div>
    <div class="cplate"><div class="cname">${c.name}${c.up?' <span style="color:var(--green)" title="已升级">↑</span>':''}${lock?'<span class="noup">不可升级</span>':''}</div>
    ${body}
    </div><div class="ctype">${TNAME[c.type]} · ${RNAME[c.rarity]}</div>
  </div>`;
}
function groupHand(){
  // 相同牌相邻摆放（按首次出现的顺序稳定分组）
  const order={};
  for(const c of G.hand){ if(!(c.id in order)) order[c.id]=Object.keys(order).length; }
  G.hand.sort((a,b)=>order[a.id]-order[b.id]);
}
function handCardHTML(c, disabled, i, n){
  const eff=effectiveCost(c);
  const costHtml = eff<cardCost(c) ? `<div class="cost" style="background:var(--green);color:#fff">${eff}</div>` : `<div class="cost">${eff}</div>`;
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
  /* sealTag 与 ctype 都在 .cplate **之后**（两者都是相对 .card 绝对定位的）——
     .exhaust-tag 改绝对定位后不再吃 ~16px 行高，这才是「被封印的牌描述看不全」的根因。 */
  return `<div class="card has-frame ${RCOLOR[c.rarity]} ${(disabled||sealed)?'disabled':''}"${newAttr} style="--rot:${rot}deg" onpointerdown="cardPointerDown(event, ${i})">${cardFrame()}${cardArt(c)}${exhaustMark(c)}${costHtml}<div class="cplate"><div class="cname">${c.name}${c.up?' <span style="color:var(--green)" title="已升级">↑</span>':''}</div><div class="cdesc">${wrapKw(cardText(c,c.up))}</div></div>${sealTag}<div class="ctype">${TNAME[c.type]} · ${RNAME[c.rarity]}</div></div>`;
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
  let badges='';
  if(e.curse>0) badges+=`<span class="badge curse" data-tip="kw:诅咒" style="cursor:help">☠️诅咒 ×${e.curse}</span>`;
  if(e.charm>0) badges+=`<span class="badge charm" data-tip="kw:魅惑" style="cursor:help">💘魅惑 ×${e.charm}</span>`;
  if(e.strength>0) badges+=`<span class="badge strength" data-tip="kw:力量" style="cursor:help">💪力量 ×${e.strength}</span>`;
  if(e.pendingDamage>0) badges+=`<span class="badge strength" data-tip="kw:蓄力" style="cursor:help">⚡蓄力 +${e.pendingDamage}</span>`;
  if(e.seal) badges+=`<span class="badge seal" data-tip="kw:镇魂" style="cursor:help">🔒镇魂</span>`;
  if(e.ledgerActive){ const la=e.ledgerAffix; const lan=la?AFFIXES.find(a=>a.id===la.id).name:''; badges+=`<span class="badge affix" ${la?`data-tip="affix:${la.id}" style="cursor:help"`:''}>📖生死簿·记名${lan?`·${lan}`:''}${e.ledgerDmg?`（${e.ledgerDmg}）`:''}</span>`; }
  if(e.phase2) badges+=`<span class="badge affix" data-tip="kw:轮回" style="cursor:help">🔄轮回·二阶段</span>`;
  if(e.affixes && e.affixes.length) e.affixes.forEach(a=>{ const af=AFFIXES.find(x=>x.id===a.id); badges+=`<span class="badge affix" data-tip="affix:${a.id}" style="cursor:help">${af?af.name:a.id}${a.tier>1?'·'+a.tier:''}</span>`; });
  if(G.hero==='tianshi' && G.ybTarget===e.uid && G.summons.some(x=>x.type==='yinbing' && x.dur>0)) badges+=`<span class="badge ybtarget" data-tip="kw:阴兵目标" style="cursor:help">🎯阴兵目标</span>`;
  return `<div class="enemy ${eSize} ${ey>0?'edepth':''} ${e.dying?'dying':''} ${HITFX.enemies.has(e)?'hit':''}" data-uid="${e.uid}" style="z-index:${2000-ey}; --ex:${ex}px; --ey:${-ey}px">
    ${artImg('enemy/'+e.key+'.png', '', 'eportrait '+eSize)}
    <div class="ename" data-tip="enemy:${e.key}">${KIND_ICON[e.kind]||''}${e.name} ${e.boss?'👹':e.elite?'☠':''}</div>
    <span class="stat">生命 <b>${e.hp}</b>/${e.maxHp}</span>
    <span class="enemyhpbar"><i class="hpghost" data-w="${ehp}" style="width:${ehPrev}%"></i><i class="hpfill" data-w="${ehp}" style="width:${ehPrev}%"></i></span>
    ${e.block>0?`<span class="stat">格挡 <b>${e.block}</b></span>`:''}
    <div class="badges">${badges}</div>
    <div class="intent">${intentText(e)}</div>
  </div>`;
}
function summonHTML(s){
  // 尸王在场时其他召唤单位伤害 +1（与 summonAct 结算一致：尸王自身不吃、无尸王不加）
  const v = s.v + ((s.type!=='shi_wang' && G.summons.some(x=>x.type==='shi_wang' && x.dur>0)) ? 1 : 0);
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
  return `<span class="summon">${label} · 剩 ${s.dur} 回合</span>`;
}

/* ===================== 拖拽出牌（阶段② 骨架） ===================== */
const AOE_CARDS = ['wanjian', 'baigui'];   // 打全体：不需要拖拽箭头（咒雨不在此列 —— 它按机制随机分配，不是「全体」，见 P3）
/* v0.61.33：是否需要「拖出箭头指向单个敌人」改为**按机制**判定，不再只看 type==='attack'。
   原先的判定漏掉 4 张真正要指定目标的牌，删掉「点击锁定」后它们会永远选不了目标：
     · 钟馗镇魂 / 镇妖铃 —— type 是 spirit，但走 curEnemy() 打单体（镇妖铃还对带诅咒目标加伤）
     · 画皮 —— 定向施加【魅惑】；咒印 —— 定向施加【诅咒】
   攻击牌里 万剑归宗 / 百鬼夜行 打全体、无需箭头（已由 AOE_CARDS 排除）。 */
const TARGETED_CARDS = ['leifu','huofu','jianfu','zhanyaojian','tianlei','tiebushan','shihun','qungui',
  'taomufu','shihunzhou','shixue','zhongkui','zhenyaoling','huapi'];
function needsTarget(c){
  // 咒印：目标随角色变 —— 赶尸人=拿尸气、武僧=给自己挂吸血，都不指向敌人；天师/阴差才定向施咒
  if(c.id==='zhouyin') return G.hero!=='ganshiren' && G.hero!=='wuseng';
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

