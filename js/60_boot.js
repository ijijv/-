/* ============================================================================
 * 志怪塔 · js/60_boot.js —— 启动与局外层
 * 稀有度调试工具 / 开局与起始界面 / 菜单·重开·退出 / 新手引导 / 启动尾块(事件绑定·读档·埋点上线)
 * ----------------------------------------------------------------------------
 * 由 原型.html 的整段内联脚本按原顺序切分而来（v0.61.05 三层重构，纯搬移）。
 * 拼接校验：本文件组去掉各自横幅后，应与切分前的内联脚本正文逐字节一致。
 * 加载：经典外链脚本（非 ES module），双击本地打开即可直接游玩。
 * ============================================================================ */
/* ===================== 稀有度系统调试工具 ===================== */
/**
 * 在控制台显示当前金卡补偿值
 */
function showGoldCompensation(){
  console.log(`当前金卡补偿值: ${(goldCompensation * 100).toFixed(2)}%`);
  console.log(`基础金卡概率 (正常战): ${(RARITY_BASE_PROBABILITIES.normal.gold * 100).toFixed(2)}%`);
  console.log(`基础金卡概率 (精英战): ${(RARITY_BASE_PROBABILITIES.elite.gold * 100).toFixed(2)}%`);
  console.log(`基础金卡概率 (商店): ${(RARITY_BASE_PROBABILITIES.shop.gold * 100).toFixed(2)}%`);
  console.log(`调整后金卡概率 (正常战): ${getAdjustedGoldProbability('normal').toFixed(4)} (${(getAdjustedGoldProbability('normal') * 100).toFixed(2)}%)`);
  console.log(`调整后金卡概率 (精英战): ${getAdjustedGoldProbability('elite').toFixed(4)} (${(getAdjustedGoldProbability('elite') * 100).toFixed(2)}%)`);
  console.log(`调整后金卡概率 (商店): ${getAdjustedGoldProbability('shop').toFixed(4)} (${(getAdjustedGoldProbability('shop') * 100).toFixed(2)}%)`);
}

/**
 * 重置金卡补偿值为初始值
 */
function resetGoldCompensation(){
  goldCompensation = -0.05;
  console.log(`金卡补偿值已重置为 ${(goldCompensation * 100).toFixed(2)}%`);
}

/**
 * 手动设置金卡补偿值（用于测试）
 * @param {number} value - 设置的值 (-0.05 to 0.30)
 */
function setGoldCompensation(value){
  goldCompensation = Math.max(-0.05, Math.min(0.30, value));
  console.log(`金卡补偿值已设置为 ${(goldCompensation * 100).toFixed(2)}%`);
}
function cardPointerDown(ev, i){
  const c=G.hand[i]; if(!c) return;
  if(c.sealed>0 || G.energy<effectiveCost(c)){ playCard(i); return; }
  const targetable=needsTarget(c);
  DRAG={ i, el:ev.currentTarget, sx:ev.clientX, sy:ev.clientY, moved:false, targetable };
  DRAG.longPressTimer=setTimeout(()=>{ if(DRAG && !DRAG.moved) showCardZoom(i); }, 500);
  ARROW_TIP=null;
  ev.currentTarget.classList.add('dragging');
  if(targetable){
    ev.currentTarget.classList.add('lift');
    ev.currentTarget.style.pointerEvents='none';
    const r=ev.currentTarget.getBoundingClientRect();
    DRAG.ox=r.left+r.width/2;
    DRAG.oy=r.top+r.height/2;
  } else {
    ev.currentTarget.classList.add('pressed');
  }
  ev.preventDefault();
}
function onDragMove(ev){
  if(!DRAG) return;
  const d=DRAG;
  const dx=ev.clientX-d.sx, dy=ev.clientY-d.sy;
  if(!d.moved && Math.hypot(dx,dy)<7) return;
  d.moved=true;
  if(d.longPressTimer){ clearTimeout(d.longPressTimer); d.longPressTimer=null; }
  if(d.targetable){
    const idx=enemyAtPoint(ev.clientX, ev.clientY);
    if(idx>=0){
      const eel=document.querySelector('#enemy-panel .enemy[data-uid="'+G.enemies[idx].uid+'"]');
      setDragTarget(eel);
      showDragPreview(idx);   // v0.61.20(P3)：箭头锁定了谁，就把预计伤害浮在谁头上
      const r2=eel.getBoundingClientRect();
      aimAt(d.ox, d.oy, r2.left+r2.width/2, r2.top+r2.height/2, true);
    } else {
      setDragTarget(null);
      hideDragPreview();
      aimAt(d.ox, d.oy, ev.clientX, ev.clientY, false);
    }
  } else {
    d.el.style.pointerEvents='none';
    d.el.style.transform='translate('+dx+'px,'+dy+'px) scale(1.12)';
    /* v0.61.33：打全体 / 不指向的牌虽然不出箭头，但拖过敌人头顶时也照样报预伤（跟随所指目标） */
    const idx2=enemyAtPoint(ev.clientX, ev.clientY);
    if(idx2>=0) showDragPreview(idx2); else hideDragPreview();
  }
}
function onDragUp(ev){
  if(!DRAG) return;
  const d=DRAG; DRAG=null;
  if(d.longPressTimer){ clearTimeout(d.longPressTimer); d.longPressTimer=null; }
  const c=G.hand[d.i];
  let play=false;
  if(c){
    if(!d.moved){
      /* v0.61.33：需要指向敌人的牌不能靠「点一下」打出 —— 那会打到 G.target 残留的那只（正是用户遇到的错伤害来源），
         必须拖到敌人身上。非指向牌（防御/技能/全体）点一下照旧可出。 */
      if(d.targetable){ floatMsg('把这张牌拖到敌人身上打出'); sfx('error'); }
      else play=true;
    }
    else if(d.targetable){
      const idx=enemyAtPoint(ev.clientX, ev.clientY);
      if(idx>=0){ G.target=idx; play=true; if(TUT && TUT.step===2) advanceTut(); } // v0.61.33：引导第2步改由「拖到敌人身上」推进（原由 selectTarget 推进）
    } else if(d.sy-ev.clientY>=40){ play=true; }
  }
  d.el.classList.remove('dragging','lift','pressed');
  d.el.style.transform='';
  d.el.style.pointerEvents='';
  hideDragArrow();
  ARROW_TIP=null;
  setDragTarget(null);
  hideDragPreview();
  if(play) playCard(d.i);
}
/* v0.61.20(P3)：拖拽受击预览 —— 目标头顶浮出这张牌的预计伤害。
   v0.61.33：卡面徽章已删，这里是预伤的**唯一**显示处；口径仍只有 previewDamage() 一套，
   但按「拖拽所指的那只敌人」算（previewDamage(c, e)），所以数字会跟着目标变；
   打全体 / 不指向的牌也照样显示（只是不出箭头）。 */
function hideDragPreview(){
  const el=document.getElementById('drag-dmg');
  if(el) el.classList.add('off');
}
function showDragPreview(idx){
  if(!G || !DRAG) return hideDragPreview();
  const c=G.hand[DRAG.i]; const e=G.enemies[idx];
  if(!c || !e) return hideDragPreview();
  const eel=document.querySelector('#enemy-panel .enemy[data-uid="'+e.uid+'"]');
  const pv=previewDamage(c, e);   // v0.61.33：按「拖拽正指向的这只」算，跟着目标变（原来是不带目标 → 用上次锁定的那只）
  if(!eel || !pv) return hideDragPreview();
  let el=document.getElementById('drag-dmg');
  if(!el){ el=document.createElement('div'); el.id='drag-dmg'; document.body.appendChild(el); }
  if(pv.miss){ el.textContent='⚠ '+pv.miss+' · 落空'; el.className='weak'; }
  else {
    const aoe=AOE_CARDS.includes(c.id)?' 全体':'';   // v0.61.33：与 needsTarget 的全体名单同一处真相
    const per=pv.perTurn?' 每回合':'';
    /* v0.61.41：预伤害的数字也走素材字形 —— numHTML 与伤害飘字共用一套（档位取 dmg）。
       素材没装/文本不是纯数字时返回 null ⇒ 原样回落文字，与改动前的表现完全一致。 */
    const glyph=numHTML('', '-'+pv.d);
    if(glyph) el.innerHTML=glyph+aoe+per; else el.textContent='-'+pv.d+aoe+per;
    el.className = pv.weak ? 'weak' : '';
  }
  const r=eel.getBoundingClientRect();
  el.style.left=(r.left+r.width/2)+'px';
  el.style.top=r.top+'px';
  el.classList.remove('off');
}
/* 长按卡牌放大查看描述（小屏字小的解决）
   ⚠️ v0.69.0：这里**故意继续读 c.t()（全文）而不是 cardText()/c.ts（牌面短版）** ——
      这是「双层文案」的落点。牌面只有 3 行、34 张牌的机制说明被压成短版，
      但全文一个字都没删，全在这里。**改这行等于把机制说明弄丢**，别顺手统一成 cardText。 */
function showCardZoom(i){
  const c=G.hand[i]; if(!c) return;
  if(DRAG){ DRAG.el.classList.remove('dragging','lift','pressed'); DRAG.el.style.transform=''; DRAG.el.style.pointerEvents=''; DRAG=null; hideDragArrow(); ARROW_TIP=null; setDragTarget(null); }
  document.getElementById('overlayContent').innerHTML=`
    <h2>${c.name}${c.up?' <span style="color:var(--green)">↑</span>':''} <small style="color:var(--dim);font-size:13px">${TNAME[c.type]} · ${RNAME[c.rarity]}</small></h2>
    <div style="font-size:17px;line-height:1.9;text-align:left;padding:14px 20px;color:#e8dcc0;background:rgba(0,0,0,.22);border-radius:8px;margin:12px 0">${wrapKw(c.t(c.up))}${(!c.up && canUpgrade(c))?`<div class="upgrade-preview">升级后 → ${wrapKw(c.t(true))}</div>`:''}</div>
    ${effectiveCost(c)>0?`<p style="color:var(--gold)">符文费用：${effectiveCost(c)}</p>`:''}
    ${isOneUse(c)?`<p style="color:var(--red2);font-weight:bold">消耗 · 每场战斗限用一次，战斗结束后回到牌库</p>`:''}
    <button class="btn ghost" onclick="hideOverlay()">收起</button>`;
  /* v0.65.0：这条是**第二条开面板路径**（绕过 showOverlay 直接写 innerHTML）。
     场景类必须在这里也摘（v0.68.2 补上 .scroll-scene）—— 否则在 #overlay 还带着
     .menu-scene / .map-scene 时长按放大，
     会继承那套「整屏不透明底 + .panel 去掉底色」的样式，卡牌详情变成一张铺满屏幕的裸字。
     今天进战斗必经 showHeroSelect→showOverlay（已会摘），所以现在碰不到；
     但把不变量补在两个入口上是这一处的既定口径（showOverlay 里那条 v0.61.42 注释同理）。 */
  const __ov=document.getElementById('overlay');
  if(__ov && __ov.classList){ __ov.classList.remove('map-scene'); __ov.classList.remove('menu-scene'); __ov.classList.remove('scroll-scene'); }
  __ov.classList.remove('hidden');
  const x=document.getElementById('overlayCloseX'); if(x) x.style.display='';
}
document.addEventListener('pointermove', onDragMove);
document.addEventListener('pointerup', onDragUp);
document.addEventListener('pointercancel', onDragUp);
function animateHpBars(){
  document.querySelectorAll('.hpbar i[data-w], .enemyhpbar i[data-w]').forEach(i=>{
    const w=i.getAttribute('data-w');
    requestAnimationFrame(()=>requestAnimationFrame(()=>{ i.style.width=w+'%'; }));
  });
}
function playerBuffHTML(){
  let s='';
  if(G.thorns>0) s+=`<span class="badge thorns" data-tip="kw:荆棘">🌵荆棘 ${G.thorns}</span>`;
  if((G.xisuiTurns||0)>0) s+=`<span class="badge" style="color:#7fb0d8" data-tip="kw:洗髓经">🔮洗髓经 ${G.xisuiTurns}回合</span>`;
  if(G.karmaFire>0) s+=`<span class="badge" style="color:#e06b3a" data-tip="kw:业火">🔥业火 ${G.karmaFire}回合</span>`;
  if(G.weak>0) s+=`<span class="badge" style="color:#8ab0d8" data-tip="kw:虚弱">🥀虚弱 ${G.weak}回合</span>`;
  if(G.gouhun>0) s+=`<span class="badge" style="color:#c86bd8" data-tip="kw:勾魂">👻勾魂</span>`;
  if(G.burn>0) s+=`<span class="badge" style="color:#e06b3a" data-tip="kw:灼烧">🌡️灼烧 ${G.burn}层</span>`;
  if(G.turnAtkBuff>0) s+=`<span class="badge" style="color:#c86b1a" data-tip="kw:开天眼">👁️开天眼 +${G.turnAtkBuff}</span>`;
  if(G.dodge>0) s+=`<span class="badge" style="color:#8ab0d8" data-tip="kw:闪避">💨闪避 ${G.dodge}层</span>`;
  if(G.debuffImmune>0) s+=`<span class="badge" style="color:#3ac0c0" data-tip="kw:佛渡">🧘佛渡免疫${G.debuffImmune>1?' '+G.debuffImmune+'回合':''}</span>`;
  if(G.xuejiBonus>0) s+=`<span class="badge" style="color:#c86bd8" data-tip="kw:血祭">🩸血祭 +${G.xuejiBonus}摸</span>`;
  if(G.duhun && G.duhun.turns>0) s+=`<span class="badge" style="color:#3fa060" data-tip="kw:渡魂">☯️渡魂 ${G.duhun.turns}回合</span>`;
  if(G.xiejia>0) s+=`<span class="badge" style="color:#7fb0d8" data-tip="kw:卸甲">🛡️卸甲 ${G.xiejia}回合</span>`;
  return s;
}
/* —— 顶栏折叠：默认展开 buff/遗物详情，点击收起 —— */
let TOPBAR_OPEN = true; // 顶栏详情默认展开（buff/遗物直接可见）
function toggleTopbar(){ TOPBAR_OPEN=!TOPBAR_OPEN; renderTopbar(); }
function renderTopbar(){
  const el=document.getElementById('topbar');
  if(!el) return;
  let html=`
    <span class="stat stat-gold"><i></i><b>${G.gold}</b></span>
    <span class="stat stat-level">${G.endless?`镇妖塔 · 第 <b>${G.endlessFloor}</b> 层`:`第 <b>${G.act}</b> 幕 · <b>${G.mapRow+1}</b>/${MAP.length} 层`}</span>
    <span class="stat stat-deck">牌堆 <b>${G.drawPile.length}</b> / 弃牌 <b>${G.discard.length}</b></span>

`;
  // 预尸气：下一回合召唤物将带来的【尸气】进账（仅茅山赶尸人；0 就不显示）
  const preShiqi=preShiqiNextTurn();
  // 如果当前角色是茅山赶尸人，显示尸气
  if(G.hero === 'ganshiren') {
    html += `<span class="stat stat-shiqi">尸气: <b>${G.尸气}/${G.maxShiQi}</b>${preShiqi>0?`<span class="stat-preshiqi" data-tip="kw:预尸气">预+${preShiqi}</span>`:''}</span>`;
  }
  // 如果当前角色是血祭阴差，显示血怒（整局累积资源）
  if(G.hero === 'yincha') {
    html += `<span class="stat stat-xuenu">血怒: <b>${G.xuenu||0}/${G.maxXuenu||10}</b></span>`;
  }
  html += `<button class="tb-toggle" onclick="event.stopPropagation();toggleTopbar()">${TOPBAR_OPEN?'▴ 收起详情':'▾ 详情'}</button>`;
  if(TOPBAR_OPEN){
    const buffs=playerBuffHTML();
    // 遗物：详情页内带插图（图标 + 名称）——不再显示在玩家面板下方
    const relics=G.relics.length?`<div class="player-relics">${G.relics.map(id=>{const r=relById(id);return `<span class="prelic-chip" data-tip="relic:${id}">${relicIcon(r)}<span class="prelic-name">${r.name}</span></span>`;}).join('')}</div>`:'';
    // 召唤物：入详情页；只在战斗中显示（召唤物在 startBattle 时清空）
    const summons=(SCENE==='battle' && G.summons && G.summons.length)?`<div class="tb-summons">${G.summons.map(s=>summonHTML(s)).join('')}</div>`:'';
    const potion=potionBagHTML();
    html+=`<div class="tb-detail">
      ${potion}
      ${buffs?`<div class="badges">${buffs}</div>`:''}
      ${summons}
      ${relics}
    </div>`;
  }
  el.innerHTML=html;
}
function render(){
  if(!G) return;
  /* v0.70.0：读一次 --rise-unit（后排敌人上抬幅度的倍率，基准档=1、矮屏档压小）。
     为什么必须放在这里：每个敌人读一次 getComputedStyle 会付 N 次强制样式重算，
     违反「读一遍→写一遍，中间不读」；render() 开头是唯一合规的位置。 */
  refreshRiseK();
  const hpPct=Math.max(0,G.hp/G.maxHp*100);
  const hpPrev=(PLAYER_HP_PREV===null)?hpPct:PLAYER_HP_PREV;
  PLAYER_HP_PREV=hpPct;
  const heroObj=(HEROES.find(h=>h.id===G.hero)||{});
  const heroName=heroObj.name||'';
  const heroMech=heroObj.mech||'';
  const preBlock=preBlockNextTurn(); // 预格挡：下回合召唤物预计带来的格挡
  document.getElementById('player-panel').innerHTML=`
    <div class="hero-art-box">${artImg('hero/'+G.hero+'.png', `<div class="hero-emoji">🀄</div>`, 'hero-art')}</div>
    <div class="pname" data-tip="hero:${G.hero}">${heroName}</div>
    ${heroMech?`<div class="pmech" data-tip="hero:${G.hero}">⚙ ${heroMech}</div>`:''}
    <span class="hpbar${G.block>0?' has-block':''}"><i class="hpghost" data-w="${hpPct}" style="width:${hpPrev}%"></i><i class="hpfill" data-w="${hpPct}" style="width:${hpPrev}%"></i></span>
    <div class="pstats"><span class="pstat-hp"><i></i>${G.hp}/${G.maxHp}</span>${(G.block>0||preBlock>0)?`<span class="pstat-block"><i></i>${G.block}</span>`:''}${preBlock>0?`<span class="pstat-preblock" data-tip="kw:预格挡"><svg viewBox="0 0 10 12" aria-hidden="true"><path d="M5 0 L10 6.5 H6.8 V12 H3.2 V6.5 H0 Z" fill="#4aa8ff"/></svg>${preBlock}</span>`:''}</div>`;
  renderTopbar();
  const _epEl=document.getElementById('enemy-panel');
  _epEl.innerHTML=G.enemies.filter(e=>alive(e)||e.dying).map(e=>enemyPanelHTML(e, G.enemies.indexOf(e))).join('') || '<div style="color:var(--dim)">（敌人已清）</div>';
  /* v0.60：给后排错落留出净空，别顶到顶部栏。
     v0.70.0：从**内联 paddingTop** 改成写 CSS 变量。内联样式 CSS 打不过（除非 !important），
     矮屏档没法把它归零，5 敌时这 62px 会白吃掉矮屏预算的两成。走变量后，
     矮屏档写一条同特异度、书写更后的 `#enemy-panel{padding-top:2px}` 就盖掉了，
     **JS 完全不需要知道当前是哪个档**。 */
  _epEl.style.setProperty('--headroom', (2+battleHeadroom())+'px');
  document.getElementById('turn-summary').innerHTML=G.turnSummary || '';
  if(!G.discardSelect && !G.exchange && !G.retainSelect) groupHand();
  document.getElementById('hand').innerHTML=G.hand.map((c,i)=>handCardHTML(c, G.energy<effectiveCost(c), i, G.hand.length)).join('') || '<div style="color:var(--dim)">（无手牌）</div>';
  const runeCount=document.getElementById('rune-count'); if(runeCount) runeCount.textContent=G.energy;
  refreshPileCounts();   // v0.69.0：抽牌堆/弃牌堆的计数徽章（startBattle 里补的那次 render 是它们的首次填充点）
  renderLogBox();   // v0.61.20(P5)：筛选 chip + 每行独立成块（原先各行直接 join('') 会挤成一坨）
  renderEndTurnHint(); // v0.61.20(P1)
  HITFX.enemies.clear();
  animateHpBars();
  /* v0.69.0：面板位置**刚刚**变过 —— #enemy-panel 的 padding-top 按敌人数重排（上面那行），
     而 .battle 是 align-items:flex-end（原型.html:92），敌人变多会把 #player-panel 顶上去。
     所有还活着的特效必须在这一刻重新量一次锚点，否则就是用户报的
     「三个敌人/Boss 出场，玩家面板挪了，特效留在原地」。
     放在**最后一行**：上面全是写操作，这里才读 rect ⇒ 整个 render 只付一次强制同步布局。
     没事可做时 fxReanchor 在任何 getBoundingClientRect 之前就返回（见 00_base.js）。 */
  if(typeof fxReanchor==='function') fxReanchor();
}

/* ===================== 开局 ===================== */
/* ===================== 战报筛选（v0.61.20 P5） =====================
 * 三类 chip：伤害 / 获得 / 状态。一个都不选 = 全部。
 * 分类是**按文本启发式**判的 —— log() 有两百多个调用点，逐点打标签太重且容易漏改；
 * 代价是「一句话里既造成伤害又施加诅咒」只会归到伤害。**认不出的行永远显示**：
 * 宁可多留一条，也不要把关键信息藏掉。 */
let LOG_FILTER = {};
const LOG_CATS = [['dmg','伤害'],['gain','获得'],['buff','状态']];
function logCat(x){
  if(x.indexOf('——')===0) return 'sep';
  if(/伤害|受到|扣血|流血|业火|反噬|引爆|阵亡|倒下|击杀/.test(x)) return 'dmg';
  if(/诅咒|中毒|虚弱|灼烧|咒印|尸气|召唤|力量|缠绕|僵直|封印|标记/.test(x)) return 'buff';
  if(/获得|回复|回血|格挡|金币|遗物|抽到|弃掉|灵气|痊愈|升级/.test(x)) return 'gain';
  return '';
}
function toggleLogFilter(k){ LOG_FILTER[k]=!LOG_FILTER[k]; renderLogBox(); }
function renderLogBox(){
  const el=document.getElementById('log'); if(!el || !G) return;
  const keys=LOG_CATS.map(p=>p[0]).filter(k=>LOG_FILTER[k]);
  const chips=`<div class="log-chips">${LOG_CATS.map(p=>`<span class="log-chip${LOG_FILTER[p[0]]?' on':''}" onclick="toggleLogFilter('${p[0]}')">${p[1]}</span>`).join('')}</div>`;
  el.innerHTML='<div class="log-head">⚔ 战报'+chips+'</div>'+G.log.slice(-600).map(x=>{
    if(x.indexOf('——')===0) return '<div class="log-sep">'+x+'</div>';
    const cat=logCat(x);
    const hide = keys.length>0 && cat!=='' && keys.indexOf(cat)<0;
    return '<div class="log-line'+(cat?' log-'+cat:'')+'"'+(hide?' style="display:none"':'')+'>'+x+'</div>';
  }).join('');
  el.scrollTop=el.scrollHeight;
}

/* ===================== 结束回合软提示（v0.61.20 P1） =====================
 * 能量没用完、手里还有打得出的牌时，结束回合按钮左侧浮一枚小气泡。不是弹窗、不挡手牌。
 * 「打得出」= 没被忘忧封印 且 当前能量够。设置里可关。 */
function playableCount(){
  if(!G || SCENE!=='battle' || G.dead) return 0;
  return G.hand.filter(c=>c && !(c.sealed>0) && G.energy>=effectiveCost(c)).length;
}
function renderEndTurnHint(){
  const el=document.getElementById('end-turn-hint'); if(!el) return;
  const n = SETTINGS.endTurnHint===false ? 0 : playableCount();
  if(n>0){ el.innerHTML=`还有 <b>${n}</b> 张可打`; el.classList.remove('off'); }
  else el.classList.add('off');
}

function showHeroSelect(){
  const cards=HEROES.map(h=>`<div class="relic" onclick="pickHero('${h.id}')"><div class="cname" data-tip="hero:${h.id}">${h.name}</div><div class="cdesc">${h.desc}</div><div class="cdesc" style="color:var(--gold);margin-top:6px">被动 · ${h.passive}</div><div class="ctype">选择英雄</div></div>`).join('');
  showOverlay(`<h2>选 择 英 雄</h2><p>不同英雄有不同特性，与不同流派卡组联动。</p><div class="reward-cards">${cards}</div>`, false, 'hero-scene');
}
function pickHero(id){
  G.hero=id;
  const h=HEROES.find(x=>x.id===id);
  G.deck=heroDeck(id);
  log(`选择英雄【${h.name}】`);
  showOpeningChoice();
}
function heroDeck(id){
  const h=HEROES.find(x=>x.id===id);
  const d=[]; h.deck.forEach(([cid,n])=>{ for(let i=0;i<n;i++) d.push(cardById(cid)); });
  return d;
}
function startGame(){
  ensureAudio();
  const d=readRun();
  if(d){
    if(!confirm('有未完成的存档（第 '+d.act+' 幕 第 '+((d.mapRow||0)+1)+' 层，得分 '+(d.score||0)+'）。\n\n开始新游戏将覆盖该存档并记入排行榜，确定吗？')) return;
  }
  confirmNewGame();
}
function confirmNewGame(){
  try {
    const d=readRun();
    if(d){ submitScore(d.score||0, d.act); clearRunSave(); }
    G=newState(); G.mapRow=0;
    const __sd=rngSeedNow(); seedRng(__sd);      // v0.61.06：本局种子（可用 ?seed=N 复现）
    G.mapSeed=__sd; buildActs(__sd); G.mapRow=0; // v0.61.40：按种子生成本局三幕随机地图
    track('runStart');
    if(SAVE.signInBonus>0){ G.gold=SAVE.signInBonus; SAVE.signInBonus=0; persistSave(); log('开局携带签到奖励 '+G.gold+' 金币'); }
    showHeroSelect();
  } catch(e){ console.error('confirmNewGame error:', e); showStartScreen(); }
}
function startEndless(){
  ensureAudio();
  G=newState();
  const __sd=rngSeedNow(); seedRng(__sd);      // v0.61.06：本局种子
  G.mapSeed=__sd;                              // v0.61.40：无尽地图按 mapSeed + 层数派生
  G.endless=true; G.endlessFloor=0; G.act=4;
  MAP=genEndlessMap();
  G.mapRow=0; G.mapCol=-1; G.mapPath=[];
  track('endlessStart');
  showHeroSelect();
}
function showOpeningChoice(){
  // 临时设置奖励层级为starter，以便使用正确的权重
  const originalRewardTier = G.rewardTier;
  G.rewardTier = 'starter';

  const picks=[];
  while(picks.length<3){
    const c=weightedCard();
    if(!picks.some(p=>p.id===c.id)) picks.push(c);
  }
  G.openingPicks=picks;

  // 检查这一轮奖励中是否有金卡
  const hasGoldInReward = picks.some(card => card.rarity === 'gold');

  // 存储补偿值更新信息供后续使用
  G.lastOpeningRewardHadGold = hasGoldInReward;

  // 恢复原来的奖励层级设置
  G.rewardTier = originalRewardTier;

  const cards=picks.map((c,i)=>`<div class="card has-frame ${RCOLOR[c.rarity]}" onclick="pickOpening(${i})">${cardBody(c)}</div>`).join('');
  showOverlay(`<h2>开 局 抉 择</h2><p>天师赠你一道符，挑一张加入起始牌组（或跳过）。</p><div class="reward-cards">${cards}</div>
    <button class="btn ghost" onclick="rerollOpening()">看广告 · 重随一次</button>
    <button class="btn ghost" onclick="skipOpening()">跳过</button>`);
}
function pickOpening(i){
  const c=G.openingPicks[i];
  G.deck.push(c);
  log(`获得卡牌【${c.name}】`);

  // 根据本次奖励是否有金卡来更新补偿值
  if(G.hasOwnProperty('lastOpeningRewardHadGold')) {
    updateGoldCompensation(G.lastOpeningRewardHadGold);
  }

  // v0.62.0：开局选完牌才第一次进地图 —— 相机由 Boss 层往下缓入、缓停在第 1 层（entry:true）
  showMap({entry:true});
}
function rerollOpening(){ adPlaceholder('开局重随', showOpeningChoice); }
function skipOpening(){
  // 根据本次奖励是否有金卡来更新补偿值
  if(G.hasOwnProperty('lastOpeningRewardHadGold')) {
    updateGoldCompensation(G.lastOpeningRewardHadGold);
  }

  // v0.62.0：跳过开局选牌也走同一条进场动画（与 pickOpening 口径一致）
  showMap({entry:true});
}
/* v0.66.0：主菜单重做为**全屏横屏**版 —— 真美术接入 + 三背景轮换 + 点击演出。
   v0.65.0 已把它做成整屏场景，但按钮仍是 CSS 画的、挤在中央一列，用户给的美术一张没用上；
   且整机此前是按**竖屏**调的适配（前提就是错的）。本批只动主菜单，全局横屏返工另立批次。
   布局权威 = 志怪塔UI重设计\主菜单demo.html：顶标题 / 左石碑列 / 右符纸行 / 全屏背景。
   入口 9 → 5：删 startEndless(无尽) / viewAchievements(成就) / viewStats(统计) / showTutorial(引导)
   —— 用户原话『真实的9个按键只要是那5个入口没提的，就默认删去』。**函数本体一律保留**，只摘入口。
   签到整块取消（用户：『没有实际意义』）。
   ⚠️ 版本号字符串必须留在 <h2> 里（提交.py 的 read_version() 读 原型.html，但三处保持一致是项目惯例）。
   ⚠️ 「续」不再按 hasRunSave() 条件渲染，而是**总是渲染、无存档则 disabled** —— 石碑忽隐忽现会破构图。 */
function showStartScreen(){
  setBg('menu'); setBGM('menu');
  showOverlay(`<div class="menu-root">
    <div class="menu-bgwrap"><div class="menu-bgimg a"></div><div class="menu-bgimg b"></div></div>
    <div class="menu-veil"></div>

    <div class="menu-stage">
      <div class="menu-titlebar menu-tier" style="--i:0">
        <h2 class="menu-title">${artImg('ui/menu/topic.png','<span class="menu-fb">志怪塔</span>','menu-art')}
          <small>· v0.69.0</small></h2>
      </div>

      <div class="menu-col-stele menu-tier is-main" style="--i:1">
        <button class="menu-hit is-start" aria-label="开始爬塔"
                onclick="steleBreak(this,startGame)"><span class="menu-artbox">${artImg('ui/menu/start.png','<span class="menu-fb">入塔</span>','menu-art')}${menuShardsHTML('ui/menu/start.png')}</span></button>
        <button class="menu-hit is-continue" aria-label="继续上次爬塔"${hasRunSave()?'':' disabled'}
                onclick="steleBreak(this,continueRun)"><span class="menu-artbox">${artImg('ui/menu/continue.png','<span class="menu-fb">续</span>','menu-art')}${menuShardsHTML('ui/menu/continue.png')}</span></button>
      </div>

      <div class="menu-row-talis menu-tier is-list" style="--i:2">
        <button class="menu-hit is-collection" aria-label="志怪图鉴"
                onclick="talisOpen(this,viewBestiary)"><span class="menu-artbox">${artImg('ui/menu/collection.png','<span class="menu-fb">图鉴</span>','menu-art')}</span></button>
        <button class="menu-hit is-leaderboard" aria-label="排行榜"
                onclick="talisOpen(this,viewLeaderboard)"><span class="menu-artbox">${artImg('ui/menu/leaderboard.png','<span class="menu-fb">排行</span>','menu-art')}</span></button>
        <button class="menu-hit is-setting" aria-label="设置"
                onclick="talisOpen(this,showSettings)"><span class="menu-artbox">${artImg('ui/menu/setting.png','<span class="menu-fb">设置</span>','menu-art')}</span></button>
      </div>
    </div>

    <div class="menu-flash"></div>
  </div>`, false, 'menu-scene');
  /* ⚠️ 轮换必须在 showOverlay **之后**：showOverlay 会把 overlayContent.innerHTML 整个换掉，
     先调的话 menuBgRotate 写的是**上一帧那个已被丢弃的** .menu-bgimg.a —— 索引照样前进（所以
     看起来"在轮换"），但屏幕上永远是空的，背景直接消失。实测症状：bgimg 的 computed
     background-image 恒为 none，而单独调一次 menuBgRotate() 却立刻正常。 */
  menuBgRotate();   // 每次进主界面前进一格背景：开游戏 / 死亡回菜单 / 设置重开都走这里
}
/* ===================== 菜单 / 重开 / 退出 ===================== */
function openMenu(){
  showOverlay(`<h2>菜 单</h2>
    <button class="btn" onclick="resumeGame()">继续游戏</button>
    <button class="btn ghost" onclick="manualSave()">存档</button>
    <button class="btn ghost" onclick="showSettings()">设置</button>
    <button class="btn ghost" onclick="confirmRestart()">重新开始本局</button>
    <button class="btn ghost" onclick="confirmQuit()">退出到主菜单</button>
    <p style="margin-top:16px;color:var(--dim);font-size:12px">—— 图 鉴 ——</p>
    <button class="btn ghost" onclick="viewKeywords()">关键词说明</button>
    <button class="btn ghost" onclick="viewRelics()">遗物图鉴</button>
    <button class="btn ghost" onclick="viewBestiary()">志怪图鉴</button>
    <button class="btn ghost" onclick="viewAchievements()">成就 · 收藏</button>`);
}
function manualSave(){
  if(G && G.endless){ floatMsg('无尽模式不存档'); return; }
  saveRun(); sfx('gold'); floatMsg('已存档');
}
function showSettings(){
  const on=SETTINGS.sound;
  const mv=Math.round(SETTINGS.musicVol*100), sv=Math.round(SETTINGS.sfxVol*100);
  showOverlay(`<h2>设 置</h2>
    <p>音效：<b style="color:${on?'var(--green)':'var(--red)'}">${on?'开':'关'}</b></p>
    <button class="btn" onclick="toggleSound()">${on?'关闭音效':'开启音效'}</button>
    <p style="margin-top:16px">音乐音量：<b id="musicVolLbl" style="color:var(--green)">${mv}%</b></p>
    <input type="range" min="0" max="100" step="1" value="${mv}" oninput="setMusicVol(this.value)" style="width:100%">
    <p>音效音量：<b id="sfxVolLbl" style="color:var(--green)">${sv}%</b></p>
    <input type="range" min="0" max="100" step="1" value="${sv}" oninput="setSfxVol(this.value)" onchange="sfx('relic')" style="width:100%">
    <p style="margin-top:16px">流畅模式（低配机）：<b style="color:${SETTINGS.lowSpec?'var(--green)':'var(--red)'}">${SETTINGS.lowSpec?'开':'关'}</b><br><small style="color:var(--dim);font-size:12px">开启后会关掉震屏 / 抖动 / <b>伤害飘字</b></small></p>
    <button class="btn ghost" onclick="toggleLowSpec()">${SETTINGS.lowSpec?'关闭流畅模式':'开启流畅模式'}</button>
    <p style="margin-top:16px">伤害飘字：<b style="color:${fx()?'var(--green)':'var(--red)'}">${fx()?'开':'关（流畅模式）'}</b> <span id="numStateLbl" style="font-size:12px;color:var(--dim)"></span></p>
    <button class="btn ghost" onclick="numSelfTest()">浮字自检（四档各放一次）</button>
    <p style="margin-top:16px">结束回合软提示：<b style="color:${SETTINGS.endTurnHint!==false?'var(--green)':'var(--red)'}">${SETTINGS.endTurnHint!==false?'开':'关'}</b></p>
    <button class="btn ghost" onclick="toggleEndTurnHint()">${SETTINGS.endTurnHint!==false?'关闭软提示':'开启软提示'}</button>
    <button class="btn ghost" onclick="showTutorial(1)">查看新手引导</button>
    <button class="btn ghost" onclick="openMenu()">返回菜单</button>`, undefined, 'scroll-scene');
}
function setMusicVol(v){
  SETTINGS.musicVol=+v/100; persistSettings();
  if(BGM){ try{ BGM.volume=SETTINGS.musicVol; }catch(e){} }
  const l=document.getElementById('musicVolLbl'); if(l) l.textContent=(+v)+'%';
}
function setSfxVol(v){
  SETTINGS.sfxVol=+v/100; persistSettings();
  const l=document.getElementById('sfxVolLbl'); if(l) l.textContent=(+v)+'%';
}
function toggleSound(){
  SETTINGS.sound=!SETTINGS.sound; persistSettings();
  if(SETTINGS.sound){ sfx('relic'); startBGM(CUR_BGM); }
  else { stopBGM(); }
  showSettings();
}
function toggleLowSpec(){
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
}
function toggleEndTurnHint(){ // v0.61.20(P1)
  SETTINGS.endTurnHint = (SETTINGS.endTurnHint===false); persistSettings(); renderEndTurnHint(); showSettings();
}
/* ===================== 新手引导 ===================== */
function tutorialSeen(){ try{ return Store.get('zhiguaitower_tutorial_v1')==='1'; }catch(e){ return false; } }
function markTutorialSeen(){ try{ Store.set('zhiguaitower_tutorial_v1','1'); }catch(e){} }
/* —— 交互式新手引导（强制分步：出牌→拖拽指向敌人→结束回合） —— */
let TUT=null;
function startGuidedTutorial(){ TUT={step:1}; renderTutHint(); }
function renderTutHint(){
  let el=document.getElementById('tut-hint');
  if(!TUT){ if(el) el.remove(); return; }
  if(!el){ el=document.createElement('div'); el.id='tut-hint'; document.body.appendChild(el); }
  const msgs={1:'第一步 · 把<b>攻击牌拖到敌人身上</b>打出（左上角是符文费用）',2:'第二步 · 箭头指向谁，谁的头顶就会浮出<b>预计伤害</b>（非指向牌点一下即可打出）',3:'第三步 · 点手牌右侧<b>「结束回合」</b>结束本回合'};
  el.innerHTML='<span class="tut-tag">引导</span>'+msgs[TUT.step];
  el.classList.add('show');
}
function advanceTut(){
  if(!TUT) return;
  if(TUT.step>=3){ TUT=null; markTutorialSeen(); renderTutHint(); return; }
  TUT.step++; renderTutHint();
}
const TUTORIAL_STEPS = [
  {t:'出牌', html:'点<b>手牌</b>打出，左上角数字是<b>符文费用</b>（出不起会提示「符文不足」）。<br>每回合 3 点符文，用完就点「结束回合」。'},
  {t:'目标与意图', html:'把 <b>攻击牌拖到敌人身上</b>打出 —— 箭头指到谁就打谁，落点会高亮，同时浮出<b>预计伤害</b>（已算上遗物/诅咒/格挡/虚弱）。<br>敌人头顶 <b>⚠ 意图</b> 预告它下回合要做什么，先看清再决定。'},
  {t:'关键词与状态', html:'文字里的<b>金色关键词</b>（如【诅咒】【虚弱】）悬停可看解释。<br>敌人身上的状态徽章（诅咒/力量等）也可悬停查看。'},
  {t:'遗物与灵汁', html:'顶栏 <b>🧪灵汁</b> 点击直接使用；<b>遗物</b> 本局永久生效。<br>战斗外可点「菜单」存档、改设置。祝你好运，打上塔顶。'}
];
function showTutorial(i){
  if(i>TUTORIAL_STEPS.length){ markTutorialSeen(); hideOverlay(); render(); return; }
  const s=TUTORIAL_STEPS[i-1];
  const last = i===TUTORIAL_STEPS.length;
  const btn = last
    ? `<button class="btn" onclick="markTutorialSeen(); hideOverlay();">完成</button>`
    : `<button class="btn" onclick="showTutorial(${i+1})">下一步</button>`;
  const back = i>1 ? `<button class="btn ghost" onclick="showTutorial(${i-1})">上一步</button>` : '';
  const skip = `<button class="btn ghost" onclick="markTutorialSeen(); hideOverlay();">跳过引导</button>`;
  showOverlay(`<h2>入门引导 · ${i}/${TUTORIAL_STEPS.length} · ${s.t}</h2><p style="text-align:left;line-height:2">${s.html}</p>${btn}${back}${skip}`);
}
function resumeGame(){
  if(aliveEnemies().length>0) hideOverlay();
  // v0.62.0：从菜单/结算回到地图页也算「重新进入」，走进场动画（缓停在本局当前那一层）
  else showMap({entry:true});
}
function confirmRestart(){
  showOverlay(`<h2>重新开始？</h2><p>重新开始本局，当前进度将记入排行榜（若有存档）。</p>
    <button class="btn" onclick="confirmNewGame()">确定 · 重新开始</button>
    <button class="btn ghost" onclick="openMenu()">返回</button>`);
}
function confirmQuit(){
  showOverlay(`<h2>退出本局？</h2><p>退出到主菜单，本局进度会<b style="color:var(--green)">自动保存</b>，可随时继续爬塔。</p>
    <button class="btn" onclick="quitToMenu()">确定 · 退出</button>
    <button class="btn ghost" onclick="openMenu()">返回</button>`);
}
function quitToMenu(){ saveRun(); showStartScreen(); }
document.getElementById('endTurn').addEventListener('click', endTurn);
document.getElementById('menuBtn').addEventListener('click', openMenu);
document.getElementById('viewDeck').addEventListener('click', viewDeck);
/* 战报栏开关 —— 关 ⇄ 右侧抽屉。
   v0.70.0 试玩期这里是三态循环（关 → 抽屉 → 底部条），用来拿真机比手感；
   v0.71.0 用户定稿为抽屉，底部条那套 CSS 已删（见原型.html 矮屏档）。
   按钮只在矮屏档显示（基准档的 #log 是常驻左栏，不需要它）。 */
(function(){
  const b=document.getElementById('logToggle'); if(!b) return;
  b.addEventListener('click', function(){
    const cls=document.body.classList;
    if(cls.contains('log-open')){ cls.remove('log-open'); b.textContent='战报'; }
    else { cls.add('log-open'); b.textContent='战报·抽屉'; }
  });
})();
document.addEventListener('keydown', function(e){
  if(!G) return;
  const overlay=document.getElementById('overlay');
  const overlayOpen = overlay && !overlay.classList.contains('hidden');
  if(e.key==='Escape'){
    if(overlayOpen){ const x=document.getElementById('overlayCloseX'); if(x && x.style.display!=='none') closeOverlay(); }
    else if(aliveEnemies().length>0) openMenu();
    return;
  }
  if(overlayOpen) return;
  if(aliveEnemies().length===0) return;
  if(e.key===' '){ e.preventDefault(); endTurn(); return; }
  const idx=parseInt(e.key,10);
  if(idx>=1 && idx<=9 && G.hand[idx-1]) playCard(idx-1);
});
loadSave();
loadSettings();
applyLowSpec();
numPrewarm();   // v0.61.41：四档字形开局就预加载 —— 否则本局第一次飘字必然回落文字
applyCosmetics();
pileInit();     // v0.69.0：把 back.png / side.png 的地址写进 CSS 变量（抽牌堆·弃牌堆）
trackLaunch();
document.addEventListener('DOMContentLoaded', showStartScreen);
