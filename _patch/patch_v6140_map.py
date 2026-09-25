# -*- coding: utf-8 -*-
"""v0.61.40 主体补丁：地图随机化（杀戮尖塔式树状图 + 逐层迷雾）+ 反震/业火补血怒（源码侧）。

铁律：锚点 count==1；**全或无**（任一锚点未命中 → 一个字节都不写）；换行归一。
"""
import io, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
errs = []


def read(p):
    raw = io.open(os.path.join(ROOT, p), encoding='utf-8').read()
    nl = '\r\n' if '\r\n' in raw else '\n'
    return raw.replace('\r\n', '\n'), nl


PENDING = []


def stage(p, body, nl):
    """只登记，不落盘 —— 全部锚点都命中后才统一写。"""
    PENDING.append((p, body, nl))


def flush():
    for p, body, nl in PENDING:
        io.open(os.path.join(ROOT, p), 'w', encoding='utf-8', newline='').write(body.replace('\n', nl))


def sub(body, old, new, label, n=1):
    c = body.count(old)
    if c != n:
        errs.append('%s —— 锚点命中 %d 次（期望 %d）' % (label, c, n))
        return body
    return body.replace(old, new)


def cut(body, start, end, new, label):
    """把 [start 起点, end 终点] 整段（含两端）替换成 new。"""
    i = body.find(start)
    j = body.find(end)
    if i < 0:
        errs.append('%s —— 起点锚点未命中' % label)
        return body
    if j < 0:
        errs.append('%s —— 终点锚点未命中' % label)
        return body
    if j < i:
        errs.append('%s —— 终点在起点之前' % label)
        return body
    return body[:i] + new + body[j + len(end):]


# ════════════════════════════════════════════════════════════════════════════
# 一、js/20_data.js —— 删掉写死的 ACT1 字面量 + swapMap/ACT2/ACT3，换成随机生成器
# ════════════════════════════════════════════════════════════════════════════
NEW_MAP_BLOCK = '''/* 节点化 Run：三幕地图（v0.61.40 起为「每次生成」的随机树状图，参考杀戮尖塔）
   —— 结构与敌人一起随机：每层宽度 1~4、连边显式生成，允许分叉/汇合；
     不再有写死的 14×4 字面量表，第二/三幕也不再是它的换皮产物。
   ⚠ 生成器**绝不碰全局 rng**（自带 mkRng 局部流）。三个理由：
     ① ?seed=N 复现要求地图不消耗主随机流；
     ② continueRun 先 rngRestore 再重建地图，若地图吃主随机流，牌序/奖励/词缀会整体错位；
     ③ 冒烟要能对拍「生成前后 rngSnapshot 完全不变」。 */
const MAP_ROWS = 14;   // 层数不变 ⇒ 战斗场次、calcScore 的 act*1000+mapRow*50、顶栏「第 X/14 层」全部不变
/* 每层宽度区间：窄宽交替 → 天然制造分叉点/汇合点；末层恒为 1（Boss） */
const ROW_SHAPE = [[1,2],[2,3],[3,4],[1,2],[2,3],[3,4],[1,2],[3,4],[2,3],[1,2],[3,4],[2,3],[1,2],[1,1]];
/* 每幕特殊节点配额（其余填普通战）。elite 对齐旧图密度（2/3/4），**不要**放大成 3/5/7 —— 那会让精英遭遇翻倍 */
const TYPE_QUOTA = { 1:{camp:2, shop:2, elite:2, unknown:5}, 2:{camp:2, shop:2, elite:3, unknown:4}, 3:{camp:2, shop:2, elite:4, unknown:3} };
const ACT1_MINIONS = ['youhun','zhizharen','huyao','jiangshi','shanxiao','shuigui','mengpo'];
const ACT2_SWAP = {youhun:'wangchuan', zhizharen:'niutou', huyao:'mamian', jiangshi:'panguan', shanxiao:'niutou', shuigui:'wangchuan', mengpo:'wangchuan', baiwuchang:'juhunshi', heiwuchang:'juhunshi', huapigui:'niumamian', yecha:'niumamian'};
const ACT3_SWAP = {youhun:'mingwei', zhizharen:'luosha', huyao:'xiuluo', jiangshi:'yanluo', shanxiao:'xiuluo', shuigui:'mingwei', mengpo:'yanluo', baiwuchang:'xiuluojiang', heiwuchang:'yecha', huapigui:'xiuluojiang', yecha:'yecha'};
/* v0.61.40：从 50_ui.js 顶层**搬移**到这里（**不是复制** —— 同作用域重复 const 同名 = 整脚本 SyntaxError 白屏）。
   原因：genAct 在本文件顶层就被调用，那一刻 50_ui.js 还没执行，留在那边会 TDZ 报错。 */
const ELITES_BY_ACT = { 1:['baiwuchang','heiwuchang','huapigui','yecha'], 2:['juhunshi','niumamian'], 3:['xiuluojiang','yecha'] };
const BOSS_POOL = { 1:['jiangwang','hanba','xueshi'], 2:['xiebian','panguanwang','mengpowang'], 3:['yewang','xiuluowang','yanluotianzi'] };

/* —— 局部随机流（与 00_base.js 的 rng() 同为 mulberry32，但**互不干扰**）—— */
function mkRng(seed){ let s=(seed>>>0)||1; return function(){ s=(s+0x6D2B79F5)|0; let t=Math.imul(s^(s>>>15), 1|s); t=(t+Math.imul(t^(t>>>7), 61|t))^t; return ((t^(t>>>14))>>>0)/4294967296; }; }
function deriveSeed(seed, k){ let h=((((seed>>>0)||1)^Math.imul((k||1), 0x9E3779B1))>>>0); h=Math.imul(h^(h>>>16), 0x85EBCA6B)>>>0; h=Math.imul(h^(h>>>13), 0xC2B2AE35)>>>0; return ((h^(h>>>16))>>>0)||1; }
function mkShuffle(R){ return function(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(R()*(i+1)); const t=a[i]; a[i]=a[j]; a[j]=t; } return a; }; }

/* —— 敌人池：复用既有换幕表，不新增第二份真相 —— */
function actMinionPool(act){
  if(act===2) return ACT1_MINIONS.map(function(k){ return ACT2_SWAP[k]||k; });
  if(act===3) return ACT1_MINIONS.map(function(k){ return ACT3_SWAP[k]||k; });
  return ACT1_MINIONS.slice();
}
function pickFightFrom(pool, R){ return mkShuffle(R)(pool.slice()).slice(0, R()<0.65?3:2); }

/* —— 分带（band partition）：把 total 个下标切成 parts 段**连续非空**区间 —— */
function bandBounds(total, parts){
  parts=Math.max(1, Math.min(parts, total));
  const base=Math.floor(total/parts), extra=total%parts;
  const out=[]; let x=0;
  for(let i=0;i<parts;i++){ const w=base+(i<extra?1:0); out.push([x, x+w-1]); x+=w; }
  return out;
}
/* 相邻两层连边。**不交叉 / 上层无死路 / 下层无孤岛 由构造保证**：
   · loN<=upN：上层切成 loN 段，第 j 段整段挂到下层 j（多个汇到同一个 → 汇合点）
   · loN>upN ：下层切成 upN 段，第 i 段整段挂在 上层 i（一个分出多个 → 分叉点）
   每条边的两端都落在同段内 ⇒ 段号随下标单调 ⇒ i<i' 必有 j<=j'（不交叉）。 */
function linkRows(upN, loN){
  const nextOf=Array.from({length:loN}, function(){ return []; });   // 下标 = **下层**列号，值是能走到的上层列号
  const prevOf=Array.from({length:upN}, function(){ return []; });   // 下标 = **上层**列号，值是能下来的下层列号
  if(loN<=upN){
    const bands=bandBounds(upN, loN);   // 上层切成 loN 段：每段整段挂到下层同段号的格子（多个汇到同一个 → 汇合点）
    for(let j=0;j<loN;j++) for(let i=bands[j][0]; i<=bands[j][1]; i++){ nextOf[j].push(i); prevOf[i].push(j); }
  } else {
    const bands=bandBounds(loN, upN);   // 下层切成 upN 段：每段整段挂到上层同段号的格子（一个分出多个 → 分叉点）
    for(let i=0;i<upN;i++) for(let j=bands[i][0]; j<=bands[i][1]; j++){ prevOf[i].push(j); nextOf[j].push(i); }
  }
  return {nextOf:nextOf, prevOf:prevOf};
}

/* —— 布类型 —— */
function assignTypes(act, R, rows, minionPool, elitePool, bossPool, quotaOverride){
  const q = quotaOverride || TYPE_QUOTA[act] || TYPE_QUOTA[1];
  const shuf = mkShuffle(R);
  for(let r=0;r<MAP_ROWS;r++) for(let c=0;c<rows[r].length;c++) rows[r][c]={t:'fight', e:[], next:[], prev:[]};
  const slots=[];
  for(let r=1;r<MAP_ROWS-1;r++) for(let c=0;c<rows[r].length;c++) slots.push([r,c]);   // 首层与末层不参与特殊节点
  shuf(slots);
  const usedRow={};
  function pick(kind, quota){
    let n=0;
    for(let pass=0; pass<2 && n<quota; pass++){
      for(let i=0;i<slots.length && n<quota;i++){
        const s=slots[i], node=rows[s[0]][s[1]];
        if(node.t!=='fight') continue;
        if(pass===0 && usedRow[s[0]]) continue;   // 第一轮：特殊节点各自独占一层，避免扎堆
        node.t=kind; usedRow[s[0]]=1; n++;
      }
    }
    return n;   // 第二轮无约束兜底 ⇒ 配额一定能填满
  }
  pick('camp', q.camp||0);
  pick('shop', q.shop||0);
  pick('unknown', q.unknown||0);
  pick('elite', q.elite||0);
  // 末层唯一 Boss：**生成期**就定死 key（旧代码是在 chooseNode 里点开才抽 ⇒ 同一存档续档后 Boss 会变）
  rows[MAP_ROWS-1][0] = {t:'boss', e:[bossPool[Math.floor(R()*bossPool.length)]], next:[], prev:[]};
  const pickElite=function(){
    const k=[elitePool[Math.floor(R()*elitePool.length)]];
    if(R()<0.5) k.push(minionPool[Math.floor(R()*minionPool.length)]);   // 旧图精英是「精英+小怪」对，单只会明显变软
    return k;
  };
  for(let r=0;r<MAP_ROWS-1;r++) for(let c=0;c<rows[r].length;c++){
    const node=rows[r][c];
    if(node.t==='elite'){ node.e=pickElite(); continue; }
    if(node.t!=='fight') continue;
    if(r>0 && R()<0.06){ node.t='elite'; node.e=pickElite(); }   // 少量野生精英，保持稀有
    else node.e=pickFightFrom(minionPool, R);
  }
  return q;
}

/* —— 入口：一个种子 → 一整幕树状图 —— */
function genAct(act, seed, opts){
  const O=opts||{};
  const R=mkRng(seed);
  const rows=[];
  for(let r=0;r<MAP_ROWS;r++){
    const sh=ROW_SHAPE[r]||[1,1];
    const lo=sh[0], hi=(r===MAP_ROWS-1) ? 1 : Math.max(lo, sh[1]);
    rows.push(new Array(lo+Math.floor(R()*(hi-lo+1))).fill(null));
  }
  const minionPool=O.minions||actMinionPool(act);
  const elitePool=O.elites||ELITES_BY_ACT[act]||ELITES_BY_ACT[1];
  const bossPool=O.bosses||BOSS_POOL[act]||BOSS_POOL[1];
  assignTypes(act, R, rows, minionPool, elitePool, bossPool, O.quota);
  for(let r=0;r<MAP_ROWS-1;r++){
    const L=linkRows(rows[r+1].length, rows[r].length);
    for(let i=0;i<rows[r].length;i++) rows[r][i].next=L.nextOf[i].slice().sort(function(a,b){ return a-b; });
    for(let j=0;j<rows[r+1].length;j++) rows[r+1][j].prev=L.prevOf[j].slice().sort(function(a,b){ return a-b; });
  }
  rows[MAP_ROWS-1][0].next=[];
  return rows;
}
let ACTS = [genAct(1,101), genAct(2,202), genAct(3,303)];   // 加载即有一张合法地图；ACTS.length **必须恒为 3**（40_flow 用它判通关）
const ACT_NAMES = ['第一幕 · 乱葬岗', '第二幕 · 黄泉路', '第三幕 · 幽冥塔', '镇妖塔 · 无尽'];
let MAP = ACTS[0];
/* 开新局 / 续档 都走它：一个种子 → 三幕地图，MAP 同步指向当前幕 */
function buildActs(seed){
  const sd=(seed>>>0)||1;
  ACTS=[genAct(1,deriveSeed(sd,1)), genAct(2,deriveSeed(sd,2)), genAct(3,deriveSeed(sd,3))];
  MAP=ACTS[((G&&G.act)||1)-1] || ACTS[0];
  return ACTS;
}'''

NEW_ENDLESS = '''function genEndlessMap(){
  // v0.61.40：每 lap 都是**新结构**（不再复用 ACT1 骨架）。种子由 mapSeed+层数派生 → 同一层可复现，
  // 不至于每次进无尽都是同一张图。敌人仍走无尽专用池，难度靠 endlessFloor 成长。
  const sd=deriveSeed((G&&G.mapSeed)||1, 97+((G&&G.endlessFloor)||0));
  return genAct(1, sd, {
    minions: ENDLESS_MINIONS, elites: ENDLESS_ELITES, bosses: ENDLESS_BOSSES,
    quota: {camp:2, shop:2, elite:3, unknown:4}
  });
}'''

# ════════════════════════════════════════════════════════════════════════════
# 二、js/50_ui.js —— 迷雾渲染 + 表驱动节点文案 + chooseNode 二次校验
# ════════════════════════════════════════════════════════════════════════════
NEW_UI_MAP_HEAD = '''/* ===================== 爬塔地图（v0.61.40：随机树状图 + 逐层迷雾） ===================== */
/* 节点文案走表，**去掉了敌人数量与敌人名**（遭遇细节藏起来，路线决策只保留节点类型）。
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
/* 下一步会解锁哪几格 = 当前所有可走节点 next 的并集 */
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
/* 四档：past（走过的）/ choice（现在能走）/ preview（下一步会亮）/ hidden（其余，占位不显示） */
function fogTier(r,c){
  if(r<G.mapRow) return mapVisited(r,c) ? 'past' : 'hidden';
  if(r===G.mapRow) return mapReachable(r,c) ? 'choice' : 'hidden';
  if(r===G.mapRow+1) return (mapPreviewSet().indexOf(c)>=0) ? 'preview' : 'hidden';
  return 'hidden';
}
function fogVisible(r,c){ return fogTier(r,c)!=='hidden'; }'''

NEW_SHOWMAP = '''function showMap(){
  SCENE='map'; saveRun();
  setBg(mapBgName()); setBGM('map');
  let html=`<h2>${ACT_NAMES[G.act-1]}</h2>${runStatusHTML()}<p style="font-size:13px">第 ${G.mapRow+1}/${MAP.length} 层 · 沿连线向上，规划好路线。</p>`;
  // v0.61.20(P2)：路径连线画在这层 svg 里（绝对定位铺满 .map-wrap，行本身仍是普通按钮）
  html+=`<div class="map-wrap"><svg class="map-lines" id="map-lines" aria-hidden="true"></svg>`;
  for(let r=MAP.length-1;r>=0;r--){
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
  }
  html+=`</div>`; // 收 .map-wrap
  html+=`<div style="margin-top:12px"><button class="btn ghost" onclick="openMenu()">菜单（重开 / 退出）</button></div>`;
  showOverlay(html);
  // 行布局完成后才有坐标可量，所以推到下一帧再画
  try{ requestAnimationFrame(drawMapLinks); }catch(e){ drawMapLinks(); }
}'''

NEW_LINKS_AND_CHOOSE = '''/* v0.61.20(P2) / v0.61.40：地图路径连线。
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
  }
  // ① 暗线：当前可走的每一格 → 它连到的下一层可见格
  const __cur=MAP[G.mapRow]||[];
  for(let c=0;c<__cur.length;c++){
    if(!mapReachable(G.mapRow,c)) continue;
    const nx=(__cur[c] && __cur[c].next)||[];
    for(let k=0;k<nx.length;k++){
      const j=nx[k];
      if(!fogVisible(G.mapRow+1,j)) continue;
      seg(nodeAt(G.mapRow,c), nodeAt(G.mapRow+1,j), 'link-dim');
    }
  }
  // ② 金色实线：已经走过的路径
  const path=G.mapPath||[];
  for(let i=0;i<path.length-1;i++) seg(nodeAt(path[i].r,path[i].c), nodeAt(path[i+1].r,path[i+1].c), 'link-past');
  // ③ 金色虚线：上一步站的那格 → 现在能走的每一格
  if(G.mapRow>0 && G.mapCol>=0){
    const a=nodeAt(G.mapRow-1, G.mapCol);
    for(let c=0;c<__cur.length;c++){
      if(!mapReachable(G.mapRow,c)) continue;
      seg(a, nodeAt(G.mapRow,c), 'link-reach');
    }
  }
  if(!_mapLinkBound && typeof window!=='undefined' && window.addEventListener){
    _mapLinkBound=true;
    window.addEventListener('resize',()=>{ if(document.getElementById('map-lines')) drawMapLinks(); });
  }
}
function chooseNode(c){
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
'''


def patch_20():
    p = 'js/20_data.js'
    b, nl = read(p)
    b = cut(b, '/* 节点化 Run：三幕地图（Boss 不同，敌人靠幕间系数增强） */',
            'let MAP = ACTS[0];', NEW_MAP_BLOCK, '20_data 地图段整段替换')
    b = sub(b, '''function genEndlessMap(){
  // 复用 ACT1 节点骨架（保证节奏 + 可达性），敌人随机化，难度靠 endlessFloor 成长
  return ACT1.map(row=>row.map(node=>{
    if(!node) return null;
    if(node.t==='fight') return {t:'fight', e:randEndlessFight()};
    return {...node};
  }));
}''', NEW_ENDLESS, '20_data genEndlessMap 重写')
    stage(p, b, nl)


def patch_30():
    p = 'js/30_engine.js'
    b, nl = read(p)
    b = sub(b, 'endless:false, endlessFloor:0, forgeFrom:null,',
            'endless:false, endlessFloor:0, forgeFrom:null, mapSeed:0,',
            '30_engine newState 加 mapSeed')
    # 反震：保持直写 G.hp（不做 Math.max 之外的改动），只补一句阴差等额血怒
    b = sub(b,
            'log(`${e.name} 反震：反弹 ${r} 点伤害`); } }',
            'log(`${e.name} 反震：反弹 ${r} 点伤害`); if(G.hero===\'yincha\' && r>0) gainRage(r); } }',
            '30_engine 反震补血怒')
    # 业火：同理
    b = sub(b,
            "log('业火反噬：你对修罗王造成伤害，损失 1 点生命'); }",
            "log('业火反噬：你对修罗王造成伤害，损失 1 点生命'); if(G.hero==='yincha') gainRage(1); }",
            '30_engine 业火补血怒')
    stage(p, b, nl)


def patch_40():
    p = 'js/40_flow.js'
    b, nl = read(p)
    b = sub(b, '''    v:2, scene:s,
    act:G.act, mapRow:G.mapRow, mapCol:G.mapCol, mapPath:(G.mapPath||[]).slice(),''',
            '''    v:3, scene:s,               // v3：新增 mapSeed（地图随机化的复现依据）
    act:G.act, mapRow:G.mapRow, mapCol:G.mapCol, mapPath:(G.mapPath||[]).slice(),
    mapSeed:G.mapSeed||0,''',
            '40_flow saveRun v3 + mapSeed')
    b = sub(b, '''  G.energy=d.energy!=null?d.energy:3; G.block=d.block||0;
  MAP=ACTS[G.act-1];''',
            '''  G.energy=d.energy!=null?d.energy:3; G.block=d.block||0;
  // v0.61.40：地图改为随机树状图 → 由存档里的 mapSeed 复现整张三幕图（MAP 一律不落盘）。
  // 旧档（v<=2）没有种子：铸一个，并把「上一层列号 / 已走路径」降级清空 —— 旧图的列号对新图毫无意义，
  // 清空后 mapReachable 走「整层可选」分支 ⇒ 不丢进度、不软锁、不崩，只失去路径装饰线与上一层列语义。
  var __isNewSave = (d.v>=3);
  if(__isNewSave){ G.mapSeed=(d.mapSeed>>>0)||1; }
  else { G.mapSeed=((((d.rng&&d.rng.s)||0)>>>0) || (rngSeedNow()>>>0) || 1); G.mapCol=-1; G.mapPath=[]; }
  buildActs(G.mapSeed);
  if(!(G.mapRow>=0 && G.mapRow<MAP.length)) G.mapRow=Math.max(0, Math.min(G.mapRow||0, MAP.length-1));''',
            '40_flow continueRun 地图迁移')
    stage(p, b, nl)


def patch_50():
    p = 'js/50_ui.js'
    b, nl = read(p)
    b = sub(b, '''function nodeLabel(node){
  if(node.t==='camp') return '篝火';
  if(node.t==='shop') return '商店';
  if(node.t==='unknown') return '⚠ 未知';
  if(node.t==='boss') return '👹 Boss';
  const boss=node.e.some(k=>ENEMIES[k].boss);
  const elite=node.e.some(k=>ENEMIES[k].elite);
  if(boss) return '👹 Boss';
  if(elite) return '☠ 精英';
  return node.e.length>1 ? `⚔ 战斗×${node.e.length}` : '⚔ 战斗';
}''', NEW_UI_MAP_HEAD, '50_ui 节点文案表 + 地图查询')
    b = sub(b, '''function showMap(){
  SCENE='map'; saveRun();
  setBg(G.endless?'act3':'act'+G.act); setBGM('map');
  let html=`<h2>${ACT_NAMES[G.act-1]}</h2>${runStatusHTML()}<p style="font-size:13px">第 ${G.mapRow+1}/${MAP.length} 层 · 只能走进相邻列的节点，规划好路线。</p>`;
  // v0.61.20(P2)：路径连线画在这层 svg 里（绝对定位铺满 .map-wrap，行本身仍是普通按钮）
  html+=`<div class="map-wrap"><svg class="map-lines" id="map-lines" aria-hidden="true"></svg>`;
  for(let r=MAP.length-1;r>=0;r--){
    const cls = r<G.mapRow ? 'past' : r===G.mapRow ? 'current' : 'future';
    html+=`<div class="map-row ${cls}">`;
    for(let c=0;c<MAP[r].length;c++){
      const node=MAP[r][c];
      if(!node){ html+=`<div class="map-node empty">&nbsp;</div>`; continue; }
      const label=nodeLabel(node);
      if(r===G.mapRow){
        const reachable = G.mapRow===0 || Math.abs(c-G.mapCol)<=1;
        html += reachable ? `<button class="map-node" onclick="chooseNode(${c})">${label}</button>` : `<div class="map-node blocked">${label}</div>`;
      } else {
        html+=`<div class="map-node">${label}</div>`;
      }
    }
    html+=`</div>`;
  }
  html+=`</div>`; // 收 .map-wrap
  html+=`<div style="margin-top:12px"><button class="btn ghost" onclick="openMenu()">菜单（重开 / 退出）</button></div>`;
  showOverlay(html);
  // 行布局完成后才有坐标可量，所以推到下一帧再画
  try{ requestAnimationFrame(drawMapLinks); }catch(e){ drawMapLinks(); }
}''', NEW_SHOWMAP, '50_ui showMap 迷雾重写')
    b = cut(b, '/* v0.61.20(P2)：地图路径连线。',
            "const BOSS_POOL = { 1:['jiangwang','hanba','xueshi'], 2:['xiebian','panguanwang','mengpowang'], 3:['yewang','xiuluowang','yanluotianzi'] };",
            NEW_LINKS_AND_CHOOSE, '50_ui 连线 + chooseNode 重写（ELITES/BOSS_POOL 已搬走）')
    stage(p, b, nl)


def patch_60():
    p = 'js/60_boot.js'
    b, nl = read(p)
    b = sub(b, '''    G=newState(); G.mapRow=0;
    seedRng(rngSeedNow());      // v0.61.06：本局种子（可用 ?seed=N 复现）''',
            '''    G=newState(); G.mapRow=0;
    const __sd=rngSeedNow(); seedRng(__sd);      // v0.61.06：本局种子（可用 ?seed=N 复现）
    G.mapSeed=__sd; buildActs(__sd); G.mapRow=0; // v0.61.40：按种子生成本局三幕随机地图''',
            '60_boot confirmNewGame 生成本局地图')
    b = sub(b, '''  G=newState();
  seedRng(rngSeedNow());      // v0.61.06：本局种子
  G.endless=true; G.endlessFloor=0; G.act=4;''',
            '''  G=newState();
  const __sd=rngSeedNow(); seedRng(__sd);      // v0.61.06：本局种子
  G.mapSeed=__sd;                              // v0.61.40：无尽地图按 mapSeed + 层数派生
  G.endless=true; G.endlessFloor=0; G.act=4;''',
            '60_boot startEndless 设 mapSeed')
    b = sub(b, 'v0.61.39', 'v0.61.40', '60_boot 版本号')
    stage(p, b, nl)


def patch_html():
    p = '原型.html'
    b, nl = read(p)
    b = sub(b, '<title>志怪塔 · 原型 v0.61.39</title>', '<title>志怪塔 · 原型 v0.61.40</title>', '原型 title 版本号')
    b = sub(b, '<small>· 玩法原型 v0.61.39</small>', '<small>· 玩法原型 v0.61.40</small>', '原型 small 版本号')
    b = sub(b, '  .map-node.empty{visibility:hidden;}',
            '''  .map-node.empty{visibility:hidden;}
  /* v0.61.40：迷雾四档 —— preview = 上一层连线能到的下一层（只见 ? 剪影）；.empty 仍是隐藏占位 */
  .map-node.preview{border-style:dashed; opacity:.5; color:var(--dim); cursor:default;}
  .map-node .node-ico:empty{display:none;}
  .map-node .node-label{vertical-align:middle;}''',
            '原型 CSS 地图迷雾样式')
    stage(p, b, nl)


patch_20()
patch_30()
patch_40()
patch_50()
patch_60()
patch_html()

if errs:
    print('!! 有锚点未命中，一个字节都不写（本轮已中止；请检查上面列出的锚点）：')
    for m in errs:
        print('   -', m)
    sys.exit(1)
flush()
print('OK v0.61.40 源码补丁已落地（20_data / 30_engine / 40_flow / 50_ui / 60_boot / 原型.html）')