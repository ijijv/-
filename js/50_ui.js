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
function showMap(){
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
}
/* v0.61.20(P2) / v0.61.40：地图路径连线。
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

function showUnknown(){
  const pool=['well','blackmarket','temple','ambush','forge','empty','potion','remove'];
  const evs=shuffle(pool).slice(0,3);
  const labels={well:'古井许愿', blackmarket:'鬼市黑商', temple:'无头古庙', ambush:'拦路恶鬼', forge:'废弃道观', empty:'荒坟', potion:'灵泉', remove:'净坛'};
  const descs={well:'以 8 点生命许愿，换一件遗物', blackmarket:'神秘黑商塞给你一张牌', temple:'无头神像赐下随机祝福', ambush:'有恶鬼拦路（精英战）', forge:'免费锻造升级一张牌', empty:'什么也没有', potion:'饮一口灵泉，获得一瓶灵汁', remove:'焚符净坛，删掉牌组中的一张牌'};
  const html=evs.map(ev=>`<div class="relic" onclick="doUnknown('${ev}')"><div class="cname">${labels[ev]}</div><div class="cdesc">${descs[ev]}</div></div>`).join('');
  SCENE='unknown'; saveRun();
  setBGM('shop'); // v0.61.31：事件节点是非战斗场景，与商店/营地共用同一条轨
  showOverlay(`<h2>⚠ 未知之地</h2><p>前方雾气弥漫，你隐约察觉有三条路可走，各有机缘或凶险。选一条吧。</p><div class="reward-cards">${html}</div>`);
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
  const cards=G.deck.map((c,i)=>`<div class="card ${RCOLOR[c.rarity]}" onclick="doUnknownRemove(${i})">${cardBody(c)}</div>`).join('');
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
  showOverlay(`<h2>灵 泉</h2><p>一泓清泉自石缝渗出，隐隐有灵光。<br>你取一瓢饮下，得了一瓶【${p.name}】。</p><div class="reward-cards"><div class="relic r-blue"><div class="cname">${p.name}</div><div class="cdesc">${p.desc}</div></div></div><button class="btn" onclick="hideOverlay(); goNext();">继续</button>`);
}
function unknownWell(){
  G.hp=Math.max(1,G.hp-8); sfx('hurt'); log('古井许愿：以 8 点生命为代价，换取一件遗物');
  const relic=weightedRelic();
  if(!hasRelic(relic.id)) G.relics.push(relic.id);
  sfx(relicSfxFor(relic)); log(`获得遗物【${relic.name}】`);   // v0.61.32：铃/幡·符/笔/剑·镜/录 三类分化
  showOverlay(`<h2>古井许愿</h2><p>你俯身探井，井底有微光浮动。<br>你以 <b style="color:var(--red)">8 点生命</b>为代价，换取了一件遗物：</p>
    <div class="reward-cards"><div class="relic ${RCOLOR[relic.rarity]}"><div class="cname">${relic.name}</div><div class="cdesc">${relic.desc}</div><div class="ctype">遗物</div></div></div>
    <button class="btn" onclick="hideOverlay(); goNext();">继续</button>`);
}
function unknownBlackMarket(){
  const c=weightedCard(); G.deck.push(c); log(`黑商塞给你一张【${c.name}】`);
  showOverlay(`<h2>鬼市黑商</h2><p>蒙面黑商打量你一番，塞来一张牌：</p><div class="reward-cards"><div class="card ${RCOLOR[c.rarity]}">${cardBody(c)}</div></div><button class="btn" onclick="hideOverlay(); goNext();">收下并继续</button>`);
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
    .map(({c,i})=>`<div class="card ${RCOLOR[c.rarity]}" onclick="pickReward(${i})">${cardBody(c)}</div>`).join('');
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
  const cards=G.deck.map((c,i)=>`<div class="card ${RCOLOR[c.rarity]}" onclick="doCampRemove(${i})">${cardBody(c)}</div>`).join('');
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
  const cards=G.shopWares.map((c,i)=>{ const p=priceFor(c); const ok=G.gold>=p; return `<div class="card ${RCOLOR[c.rarity]} ${ok?'':'disabled'}" onclick="buyCard(${i})">${cardBody(c)}<div class="ctype" style="color:${ok?'var(--gold)':'var(--red)'};font-weight:bold">${p} 金币${ok?'':' · 金币不足'}</div></div>`; }).join('') || '<p style="color:var(--dim)">货已售罄</p>';
  const potions=(G.shopPotions||[]).map((p,i)=>{ const price=potionPrice(); const ok=G.gold>=price; return `<div class="relic r-blue ${ok?'':'disabled'}" onclick="buyPotion(${i})"><div class="cname">${p.name}</div><div class="cdesc">${p.desc}</div><div class="ctype" style="color:${ok?'var(--gold)':'var(--red)'}">${price} 金币</div></div>`; }).join('');
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
  const cards=G.deck.map((c,i)=>`<div class="card ${RCOLOR[c.rarity]}" onclick="doRemove(${i})">${cardBody(c)}</div>`).join('');
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
  showOverlay(`<h2>志 怪 图 鉴</h2><p style="font-size:13px;color:var(--dim)">已收录 <b style="color:var(--gold)">${got}</b> / ${total} · 击败妖怪，把它们的志怪故事收进你的百鬼谱。</p><div id="bestiary-grid">${cards}</div>`, true);
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
function showOverlay(html, closable){ overlaySfx();   // v0.61.32：面板开合（设置/图鉴/成就/牌库/结算）
  document.getElementById('overlayContent').innerHTML=html; document.getElementById('overlay').classList.remove('hidden'); const x=document.getElementById('overlayCloseX'); if(x) x.style.display = closable ? '' : 'none'; }
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
  return `${cardArt(c)}${exhaustMark(c)}<div class="cost">${cardCost(c)}</div><div class="cname">${c.name}${c.up?' <span style="color:var(--green)" title="已升级">↑</span>':''}</div><div class="cdesc">${wrapKw(c.t(c.up))}</div><div class="ctype">${TNAME[c.type]} · ${RNAME[c.rarity]}</div>`;
}
function forgeCardHTML(c,i){
  const lock = !c.up && !canUpgrade(c);   // 升级无变化的牌：置灰、不可锻造
  const body = (c.up || lock)
    ? `<div class="cdesc">${wrapKw(c.t(c.up))}</div>`
    : `<div class="cdesc">${wrapKw(c.t(false))}<div class="upgrade-preview">升级 → ${wrapKw(c.t(true))}</div></div>`;
  return `<div class="card ${RCOLOR[c.rarity]}${lock?' locked':''}" onclick="forgeCard(${i})">
    ${cardArt(c)}${exhaustMark(c)}
    <div class="cost">${cardCost(c)}</div>
    <div class="cname">${c.name}${c.up?' <span style="color:var(--green)" title="已升级">↑</span>':''}${lock?'<span class="noup">不可升级</span>':''}</div>
    ${body}
    <div class="ctype">${TNAME[c.type]} · ${RNAME[c.rarity]}</div>
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
  const sealTag = sealed ? `<div class="exhaust-tag">忘忧封印 ${c.sealed} 回合</div>` : '';
  const rot=((i-(n-1)/2)*3).toFixed(1);
  return `<div class="card ${RCOLOR[c.rarity]} ${(disabled||sealed)?'disabled':''}" style="--rot:${rot}deg" onpointerdown="cardPointerDown(event, ${i})">${cardArt(c)}${exhaustMark(c)}${costHtml}<div class="cname">${c.name}${c.up?' <span style="color:var(--green)" title="已升级">↑</span>':''}</div><div class="cdesc">${wrapKw(c.t(c.up))}</div>${sealTag}<div class="ctype">${TNAME[c.type]} · ${RNAME[c.rarity]}</div></div>`;
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
// 纵深错落：idx 0 最低(0)、右→左逐级抬高；liftY 越大越靠后（见 enemyPanelHTML）
const RISE_LIFT=[0,42,20,60,30];
// 当前场上「后排上抬」的最大幅度 —— 用作 #enemy-panel 的 padding-top，
// 保证被抬起的后排敌人不会越过 .battle 上沿去盖住 #topbar（v0.60 修）
function battleHeadroom(){
  let mx=0;
  (G.enemies||[]).forEach((e,i)=>{ if(alive(e)||e.dying) mx=Math.max(mx, RISE_LIFT[i%RISE_LIFT.length]); });
  return mx;
}
function enemyPanelHTML(e, idx){
  const ehp=Math.max(0,e.hp/e.maxHp*100);
  const ehPrev=(ENEMY_HP_PREV[e.uid]===undefined)?ehp:ENEMY_HP_PREV[e.uid];
  ENEMY_HP_PREV[e.uid]=ehp;
  /* v0.61.33：删除「点击锁定」后不再有选中态 —— 目标只由拖拽落点决定（拖拽中的高亮是 .drag-target） */
  const liftY=(idx>=0?RISE_LIFT[idx%RISE_LIFT.length]:0); // 纵深错落（振幅见 RISE_LIFT）
  const edef=ENEMIES[e.key];
  const eSize=e.boss?'e-boss':e.elite?'e-elite':(edef&&edef.summon)?'e-summon':'e-normal';
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
  return `<div class="enemy ${eSize} ${liftY>0?'edepth':''} ${e.dying?'dying':''} ${HITFX.enemies.has(e)?'hit':''}" data-uid="${e.uid}" style="z-index:${2000-liftY}; transform:translateY(-${liftY}px)">
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

