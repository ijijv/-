/* ============================================================================
 * 启动与局外层
 * ============================================================================ */
/* UI 皮肤图的地址就写这一次 :root，CSS 那边用 var 兜底 */
try{
  const _skin=document.documentElement.style;
  _skin.setProperty('--ui-panel-bg', `url('${assetURL('ui/hero_panel_bg.png', true)}')`);
  _skin.setProperty('--ui-hero-frame', `url('${assetURL('ui/panel_nine.png', true)}')`);
  _skin.setProperty('--ui-hero-name', `url('${assetURL('ui/btn_primary.png', true)}')`);
  _skin.setProperty('--ui-hero-name-on', `url('${assetURL('ui/btn_primary_press.png', true)}')`);
}catch(e){}
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
      showDragPreview(idx);   // 箭头锁了谁就把预伤浮在谁头上
      const r2=eel.getBoundingClientRect();
      aimAt(d.ox, d.oy, r2.left+r2.width/2, r2.top+r2.height/2, true);
    } else {
      setDragTarget(null);
      hideDragPreview();
      hideDragBlock();
      aimAt(d.ox, d.oy, ev.clientX, ev.clientY, false);
    }
  } else {
    d.el.style.pointerEvents='none';
    d.el.style.transform='translate('+dx+'px,'+dy+'px) scale(1.12)';
    const idx2=enemyAtPoint(ev.clientX, ev.clientY);
    if(idx2>=0) showDragPreview(idx2); else hideDragPreview();
    /* 这个 40px 得和 onDragUp 里那个一样，不然会出现预演却打不出去 */
    const bc=G.hand[d.i];
    if(d.moved && d.sy-ev.clientY>=40 && previewBlock(bc)>0) showDragBlock(d.i); else hideDragBlock();
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
      // 指向敌人的牌只能拖到敌人身上再打，点一下会打到 G.target 残留的那只
      if(d.targetable){ floatMsg('把这张牌拖到敌人身上打出'); sfx('error'); }
      else play=true;
    }
    else if(d.targetable){
      const idx=enemyAtPoint(ev.clientX, ev.clientY);
      if(idx>=0){ G.target=idx; play=true; }
    } else if(d.sy-ev.clientY>=40){ play=true; }
  }
  d.el.classList.remove('dragging','lift','pressed');
  d.el.style.transform='';
  d.el.style.pointerEvents='';
  hideDragArrow();
  ARROW_TIP=null;
  setDragTarget(null);
  hideDragPreview();
  hideDragBlock();
  if(play) playCard(d.i);
}
function hideDragPreview(){
  const el=document.getElementById('drag-dmg');
  if(el) el.classList.add('off');
}
function showDragPreview(idx){
  if(!G || !DRAG) return hideDragPreview();
  const c=G.hand[DRAG.i]; const e=G.enemies[idx];
  if(!c || !e) return hideDragPreview();
  const eel=document.querySelector('#enemy-panel .enemy[data-uid="'+e.uid+'"]');
  const pv=previewDamage(c, e);
  if(!eel || !pv) return hideDragPreview();
  let el=document.getElementById('drag-dmg');
  if(!el){ el=document.createElement('div'); el.id='drag-dmg'; document.body.appendChild(el); }
  if(pv.miss){ el.textContent='⚠ '+pv.miss+' · 落空'; el.className='weak'; }
  else {
    const aoe=AOE_CARDS.includes(c.id)?' 全体':'';
    const per=pv.perTurn?' 每回合':'';
    const glyph=numHTML('', '-'+pv.d);
    if(glyph) el.innerHTML=glyph+aoe+per; else el.textContent='-'+pv.d+aoe+per;
    el.className = pv.weak ? 'weak' : '';
  }
  const r=eel.getBoundingClientRect();
  el.style.left=(r.left+r.width/2)+'px';
  el.classList.remove('off');
  /* 贴顶就往下压一点防出屏；读 offsetHeight 前必须先摘 .off，display:none 时它恒 0 */
  el.style.top=Math.max(r.top, (el.offsetHeight||0)+2)+'px';
}
function hideDragBlock(){
  const el=document.getElementById('drag-block');
  if(el) el.classList.add('off');
}
function showDragBlock(i){
  if(!G || !DRAG) return hideDragBlock();
  const c=G.hand[i];
  if(!c) return hideDragBlock();
  const n=previewBlock(c);
  if(!(n>0)) return hideDragBlock();
  const anchor=document.querySelector('#player-panel .hero-art-box');
  if(!anchor) return hideDragBlock();
  let el=document.getElementById('drag-block');
  if(!el){ el=document.createElement('div'); el.id='drag-block'; document.body.appendChild(el); }
  const glyph=numHTML('block', '+'+n);
  if(glyph) el.innerHTML=glyph; else el.textContent='+'+n+' 格挡';
  el.className = DYNAMIC_BLOCK.indexOf(c.id)>=0 ? 'dyn' : '';
  const r=anchor.getBoundingClientRect();
  el.style.left=(r.left+r.width/2)+'px';
  el.classList.remove('off');
  el.style.top=Math.max(r.top, (el.offsetHeight||0)+2)+'px';
}
/* 长按放大故意读全文 c.t()，不是牌面短版，别顺手改成 cardText */
function showCardZoom(i){
  const c=G.hand[i]; if(!c) return;
  if(DRAG){ DRAG.el.classList.remove('dragging','lift','pressed'); DRAG.el.style.transform=''; DRAG.el.style.pointerEvents=''; DRAG=null; hideDragArrow(); ARROW_TIP=null; setDragTarget(null); }
  document.getElementById('overlayContent').innerHTML=`
    <h2>${c.name}${(c.up||shiWangBoosted(c))?' <span style="color:var(--green)">↑</span>':''} <small style="color:var(--dim);font-size:13px">${TNAME[c.type]} · ${RNAME[c.rarity]}</small></h2>
    <div style="font-size:17px;line-height:1.9;text-align:left;padding:14px 20px;color:#e8dcc0;background:rgba(0,0,0,.22);border-radius:8px;margin:12px 0">${wrapKw(c.t(c.up))}${shiWangBoostTag(c)}${(!c.up && canUpgrade(c))?`<div class="upgrade-preview">升级后 → ${wrapKw(c.t(true))}</div>`:''}</div>
    ${effectiveCost(c)>0?`<p style="color:var(--gold)">符文费用：${effectiveCost(c)}</p>`:''}
    ${isOneUse(c)?`<p style="color:var(--red2);font-weight:bold">消耗 · 每场战斗限用一次，战斗结束后回到牌库</p>`:''}
    <button class="btn ghost" onclick="hideOverlay()">收起</button>`;
  // 这条绕开 showOverlay 直接写 innerHTML，那堆场景类得在这也摘一遍
  const __ov=document.getElementById('overlay');
  if(__ov && __ov.classList){ __ov.classList.remove('map-scene'); __ov.classList.remove('menu-scene'); __ov.classList.remove('scroll-scene'); __ov.classList.remove('hero-scene'); __ov.classList.remove('pick-scene'); __ov.classList.remove('forge-scene'); __ov.classList.remove('pile-scene'); __ov.classList.remove('result-scene'); }
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
/* 状态前那枚 emoji 走 iconTag，图到了自动换；图标 id 表在美术文档，改名要两处一起改 */
function playerBuffHTML(){
  let s='';
  if(G.thorns>0) s+=`<span class="badge thorns" data-tip="kw:荆棘">${iconTag('buff/thorns.png','🌵')}荆棘 ${G.thorns}</span>`;
  if((G.xisuiTurns||0)>0) s+=`<span class="badge" style="color:#7fb0d8" data-tip="kw:洗髓经">${iconTag('buff/xisui.png','🔮')}洗髓经 ${G.xisuiTurns}回合</span>`;
  if(G.karmaFire>0) s+=`<span class="badge" style="color:#e06b3a" data-tip="kw:业火">${iconTag('buff/karmafire.png','🔥')}业火 ${G.karmaFire}回合</span>`;
  if(G.weak>0) s+=`<span class="badge" style="color:#8ab0d8" data-tip="kw:虚弱">${iconTag('buff/weak.png','🥀')}虚弱 ${G.weak}回合</span>`;
  if(G.gouhun>0) s+=`<span class="badge" style="color:#c86bd8" data-tip="kw:勾魂">${iconTag('buff/gouhun.png','👻')}勾魂</span>`;
  if(G.burn>0) s+=`<span class="badge" style="color:#e06b3a" data-tip="kw:灼烧">${iconTag('buff/burn.png','🌡️')}灼烧 ${G.burn}层</span>`;
  if(G.turnAtkBuff>0) s+=`<span class="badge" style="color:#c86b1a" data-tip="kw:开天眼">${iconTag('buff/kaitianyan.png','👁️')}开天眼 +${G.turnAtkBuff}</span>`;
  if(G.dodge>0) s+=`<span class="badge" style="color:#8ab0d8" data-tip="kw:闪避">${iconTag('buff/dodge.png','💨')}闪避 ${G.dodge}层</span>`;
  if(G.debuffImmune>0) s+=`<span class="badge" style="color:#3ac0c0" data-tip="kw:佛渡">${iconTag('buff/fodu.png','🧘')}佛渡免疫${G.debuffImmune>1?' '+G.debuffImmune+'回合':''}</span>`;
  if(G.xuejiBonus>0) s+=`<span class="badge" style="color:#c86bd8" data-tip="kw:血祭">${iconTag('buff/xueji.png','🩸')}血祭 +${G.xuejiBonus}摸</span>`;
  if(G.duhun && G.duhun.turns>0) s+=`<span class="badge" style="color:#3fa060" data-tip="kw:渡魂">${iconTag('buff/duhun.png','☯️')}渡魂 ${G.duhun.turns}回合</span>`;
  if(G.xiejia>0) s+=`<span class="badge" style="color:#7fb0d8" data-tip="kw:卸甲">${iconTag('buff/xiejia.png','🛡️')}卸甲 ${G.xiejia}回合</span>`;
  return s;
}
/* 立绘右边只写层数，全名和机制塞进 data-tip；基档不显示，桌面零改动 */
function playerBuffChips(){
  const chip=(val,col,tip,icon)=>`<span class="pbuff" style="--c:${col}" data-tip="kw:${tip}">${icon?iconTag('buff/'+icon+'.png',''):''}${val}</span>`;
  let s='';
  if(G.thorns>0) s+=chip(G.thorns,'#9ec06a','荆棘','thorns');
  if((G.xisuiTurns||0)>0) s+=chip(G.xisuiTurns,'#7fb0d8','洗髓经','xisui');
  if(G.karmaFire>0) s+=chip(G.karmaFire,'#e06b3a','业火','karmafire');
  if(G.weak>0) s+=chip(G.weak,'#8ab0d8','虚弱','weak');
  if(G.gouhun>0) s+=chip('●','#c86bd8','勾魂','gouhun');
  if(G.burn>0) s+=chip(G.burn,'#e06b3a','灼烧','burn');
  if(G.turnAtkBuff>0) s+=chip('+'+G.turnAtkBuff,'#c86b1a','开天眼','kaitianyan');
  if(G.dodge>0) s+=chip(G.dodge,'#8ab0d8','闪避','dodge');
  if(G.debuffImmune>0) s+=chip('●','#3ac0c0','佛渡','fodu');
  if(G.xuejiBonus>0) s+=chip('+'+G.xuejiBonus,'#c86bd8','血祭','xueji');
  if(G.duhun && G.duhun.turns>0) s+=chip(G.duhun.turns,'#3fa060','渡魂','duhun');
  if(G.xiejia>0) s+=chip(G.xiejia,'#7fb0d8','卸甲','xiejia');
  return s;
}
/* 矮屏(≤560)顶栏详情默认收起，桌面展开；读不到视口高时必须回落到 true */
let TOPBAR_OPEN = (typeof window === 'undefined' || !(window.innerHeight > 0)) ? true : (window.innerHeight > 560);
function toggleTopbar(){ TOPBAR_OPEN=!TOPBAR_OPEN; renderTopbar(); }
let PSUMMONS_OPEN=false;
function toggleSummonBar(){ PSUMMONS_OPEN=!PSUMMONS_OPEN; render(); }
function summonFoldLabel(list){
  const dmg=preSummonDamage(), blk=preBlockNextTurn(), healN=preSummonHeal();
  return `召 ${list.length}${dmg>0?' · 伤 '+dmg:''}${blk>0?' · 挡 '+blk:''}${healN>0?' · 回 '+healN:''}`;
}
function renderTopbar(){
  const el=document.getElementById('topbar');
  if(!el) return;

  const levelLong=`第 <b>${G.act}</b> 幕 · <b>${G.mapRow+1}</b>/${MAP.length} 层`;
  const levelShort=`<b>${G.act}</b>幕 <b>${G.mapRow+1}</b>/${MAP.length}`;
  const deckLong=`牌堆 <b>${G.drawPile.length}</b> / 弃牌 <b>${G.discard.length}</b>`;
  const deckShort=`牌 <b>${G.drawPile.length}</b>/<b>${G.discard.length}</b>`;

  const statsFull=`第 ${G.act} 幕 · ${G.mapRow+1}/${MAP.length} 层 · 牌堆 ${G.drawPile.length} / 弃牌 ${G.discard.length}`;
  let html=`
    <span class="stat stat-gold">${iconTag(STAT_ICONS.gold,'<i></i>')}<b>${G.gold}</b></span>
    <span class="stat stat-level"><span class="sb-long">${levelLong}</span><span class="sb-short">${levelShort}</span></span>
    <span class="stat stat-deck"><span class="sb-long">${deckLong}</span><span class="sb-short">${deckShort}</span></span>

`;
  const preShiqi=preShiqiNextTurn();
  const preXuenu=preXuenuNextTurn();
  const maxShiQiNow=relicMaxShiqi();
  const maxXuenuNow=relicMaxXuenu();
  if(G.hero === 'ganshiren') {

    const flameStyle = hasRelic('shiyu') ? ` style="--chip-flame:url('${fxStripURL('fx/shiqi_flame.png')}')"` : '';

    const preShiqiTag=preShiqi>0?`<span class="stat-preshiqi" data-tip="kw:预尸气">预+${preShiqi}</span>`:'';
    html += `<span class="stat stat-shiqi${hasRelic('shiyu')?' relic-flame-blue':''}"${flameStyle}>${iconTag('buff/shiqi.png','')}<span class="sb-long">尸气: <b>${G.尸气}/${maxShiQiNow}</b></span><span class="sb-short">尸气 <b>${G.尸气}/${maxShiQiNow}</b></span>${preShiqiTag}</span>`;
  }

  if(G.hero === 'yincha') {

    const rageAcc=(hasRelic('ranxueling')?`<span class="stat-rageaccum" data-tip="relic:ranxueling">+${G.rageAccum||0}/20</span>`:'');

    const preXuenuTag=preXuenu>0?`<span class="stat-prexuenu" data-tip="kw:预血怒">预+${preXuenu}</span>`:'';
    const flameStyle = hasRelic('xueyu') ? ` style="--chip-flame:url('${fxStripURL('fx/xuenu_flame.png')}')"` : '';
    html += `<span class="stat stat-xuenu${hasRelic('xueyu')?' relic-flame-purple':''}"${flameStyle}>${iconTag('buff/xuenu.png','')}<span class="sb-long">血怒: <b>${G.xuenu||0}/${maxXuenuNow}</b></span><span class="sb-short">血怒 <b>${G.xuenu||0}/${maxXuenuNow}</b></span>${preXuenuTag}${rageAcc}</span>`;
  }
  if(G.hero === 'wuseng' && hasRelic('jingangchu')) {
    html += `<span class="stat stat-blockaccum" data-tip="relic:jingangchu">${iconTag('buff/block.png','🛡️')}<span class="sb-long">格挡累积: <b>${G.blockAccum||0}/50</b></span><span class="sb-short">累 <b>${G.blockAccum||0}/50</b></span></span>`;
  }
  html += `<button class="tb-toggle" onclick="toggleTopbar()">${TOPBAR_OPEN?'▴ 收起详情':'▾ 详情'}</button>`;
  if(TOPBAR_OPEN){
    const buffs=playerBuffHTML();
    const summons=(SCENE==='battle' && G.summons && G.summons.length)?`<div class="tb-summons">${G.summons.map(s=>summonHTML(s)).join('')}</div>`:'';
    const statsDetail=`<span class="stat stat-detail-full">${statsFull}${G.hero==='ganshiren'?` · 尸气 ${G.尸气}/${maxShiQiNow}${preShiqi>0?`（下回合预+${preShiqi}）`:''}`:''}${G.hero==='yincha'?` · 血怒 ${G.xuenu||0}/${maxXuenuNow}${preXuenu>0?`（下回合预+${preXuenu}）`:''}${hasRelic('ranxueling')?`（累积 ${G.rageAccum||0}/20）`:''}`:''}${G.hero==='wuseng'&&hasRelic('jingangchu')?` · 格挡累积 ${G.blockAccum||0}/50`:''}</span>`;
    html+=`<div class="tb-detail">
      ${statsDetail}
      ${buffs?`<div class="badges">${buffs}</div>`:''}
      ${summons}
    </div>`;
  }
  el.innerHTML=html;
  syncJinnangIcons();
}
/* #jinnangBtn 是静态 HTML，iconTag 探图又是异步的，只能在 renderTopbar 里逐帧对 */
function syncJinnangIcons(){
  const h=iconTag('ui/menu/jinnang-nobg.png','锦囊');
  const b=document.getElementById('jinnangBtn');
  if(b && b.innerHTML!==h) b.innerHTML=h;
}
const RUNE_HERO = { tianshi:'rune_tianshi.png', ganshiren:'rune_ganshiren.png', wuseng:'rune_wuseng.png', yincha:'rune_yincha.png' };
let RUNE_CUR='';
function syncRuneIcon(){
  const img=document.querySelector('#rune-display .rune-icon');
  if(!img || !G) return;
  if(!img.dataset.def) img.dataset.def=img.getAttribute('src')||'';
  const rel=RUNE_HERO[G.hero]||'rune.png';
  if(RUNE_CUR===rel) return;
  RUNE_CUR=rel;
  img.onerror=()=>{ img.onerror=null; img.src=img.dataset.def; };
  img.src=assetURL(rel, true);
}
/* 三个面板的 innerHTML 按内容去重，字符串一样就不写 DOM */
const PANEL_HTML={ player:'\u0000', enemy:'\u0000', hand:'\u0000' };
function writePanel(slot, id, html){
  if(PANEL_HTML[slot]===html) return;
  const el=document.getElementById(id);
  if(!el) return;
  PANEL_HTML[slot]=html;
  el.innerHTML=html;
}
function render(){
  if(!G) return;
/* --rise-unit / --slot-dx-k 只能在这读一次，敌人循环里读会付 N 次强制样式重算 */
  refreshRiseK();
  const hpPct=Math.max(0,G.hp/G.maxHp*100);
  const hpPrev=(PLAYER_HP_PREV===null)?hpPct:PLAYER_HP_PREV;
  const hpGain=hpPct>hpPrev+0.001;
  PLAYER_HP_PREV=hpPct;
  const heroObj=(HEROES.find(h=>h.id===G.hero)||{});
  const heroName=heroObj.name||'';
  const heroMech=heroObj.mech||'';
  const preBlock=preBlockNextTurn();
  const preHeal=preSummonHeal();
  const psList=(G.summons||[]).filter(s=>(s.dur||0)>0);
  const summonFold=(SCENE==='battle' && psList.length)?`<button class="ps-fold" type="button" onclick="toggleSummonBar()">${summonFoldLabel(psList)}</button>`:'';
  const __narrowSummon=(typeof matchMedia==='function') && matchMedia('(max-height:560px) and (min-width:521px)').matches;
  const summonBar=(SCENE==='battle' && psList.length && (PSUMMONS_OPEN || !__narrowSummon))?`<div class="psummons">${psList.map(s=>summonHTML(s)).join('')}</div>`:'';
  const pbuffs=(SCENE==='battle')?playerBuffChips():'';
  writePanel('player', 'player-panel', `
    <div class="hero-art-box">${artImg('hero/'+G.hero+'.png', `<div class="hero-emoji">🀄</div>`, 'hero-art')}${summonFold}${summonBar}</div>
    <div class="pname" data-tip="hero:${G.hero}">${heroName}</div>
    ${heroMech?`<div class="pmech" data-tip="hero:${G.hero}">⚙ ${heroMech}</div>`:''}
    <span class="hpbar${hpGain?' hp-gain':''}${G.block>0?' has-block':''}${hasRelic('xuemodao')?' xuemodao':''}${(hasRelic('xuemodao')&&G.hp<G.maxHp*0.3)?' xue-active':''}">${hasRelic('xuemodao')?'<i class="hpmark" data-tip="relic:xuemodao"></i>':''}<i class="hpghost" data-w="${hpPct}" style="width:${hpPrev}%"></i><i class="hpfill" data-w="${hpPct}" style="width:${hpPrev}%"></i></span>
    <div class="pstats"><span class="pstat-hp">${iconTag(STAT_ICONS.hp,'<i></i>')}<span class="hpnum">${G.hp}/${G.maxHp}</span></span><span class="pstat-block${(G.block>0||preBlock>0)?'':' is-empty'}">${iconTag('buff/block.png','<i></i>')}${G.block}</span>${preBlock>0?`<span class="pstat-preblock" data-tip="kw:预格挡"><svg viewBox="0 0 10 12" aria-hidden="true"><path d="M5 0 L10 6.5 H6.8 V12 H3.2 V6.5 H0 Z" fill="#4aa8ff"/></svg>${preBlock}</span>`:''}${preHeal>0?`<span class="pstat-preheal" data-tip="kw:预恢复"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M4.6 0 H7.4 V4.6 H12 V7.4 H7.4 V12 H4.6 V7.4 H0 V4.6 H4.6 Z" fill="#5adc8c"/></svg>${preHeal}</span>`:''}</div>${pbuffs?'<div class="pbuffs">'+pbuffs+'</div>':''}`);
  renderTopbar();
  syncRuneIcon();
  const _epEl=document.getElementById('enemy-panel');
  const _shown=G.enemies.filter(e=>alive(e)||e.dying);
  writePanel('enemy', 'enemy-panel', _shown.map((e,i)=>enemyPanelHTML(e, i)).join('') || '<div style="color:var(--dim)">（敌人已清）</div>');
  /* 恰 1 只 boss + 其余全是 summon 小怪且 ≤4 时，矮屏横排放不下才切两行网格，判据是算出来的 */
  const _bossN=_shown.filter(e=>e.boss).length;
  const _minionN=_shown.filter(e=>!e.boss && ENEMIES[e.key] && ENEMIES[e.key].summon).length;
  const _ppW=Math.min(140, Math.max(96, window.innerHeight*0.26));
  const _epNeed=218+_minionN*84+_minionN*14;
  _epEl.classList.toggle('ep-grid',
    _bossN===1 && _minionN>=3 && _minionN<=4 && _minionN===_shown.length-_bossN &&
    window.innerHeight<=560 && window.innerWidth>=521 &&
    _epNeed > window.innerWidth-12-8-_ppW);
  _epEl.style.setProperty('--headroom', (2+Math.max(battleHeadroom(), slotHeadroom()))+'px');
  document.getElementById('turn-summary').innerHTML=G.turnSummary || '';
  if(!G.discardSelect && !G.exchange && !G.retainSelect) groupHand();
  writePanel('hand', 'hand', G.hand.map((c,i)=>handCardHTML(c, G.energy<effectiveCost(c), i, G.hand.length)).join('') || '<div style="color:var(--dim)">（无手牌）</div>');
  const runeCount=document.getElementById('rune-count'); if(runeCount) runeCount.textContent=G.energy;
  refreshPileCounts();
  renderLogBox();
  renderEndTurnHint();
  HITFX.enemies.clear();
  animateHpBars();
  /* 面板刚按敌人数挪过位置，活着的特效得在这重新量一次锚点，放最后只付一次强制同步布局 */
  Anim.flush();
  if(typeof pumpSay==='function') pumpSay();
  if(typeof fxReanchor==='function') fxReanchor();
  if(typeof outHudSync==='function') outHudSync();
}

/* 战报筛选：按文本启发式分类，认不出的行永远显示 */
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
function closeLogDrawer(){
  document.body.classList.remove('log-open');
  const b=document.getElementById('logToggle'); if(b) b.textContent='战报';
}
/* 关闭件走 #log 上的 pointerdown 委托：render 会整块换 innerHTML，click 派发不到按钮 */
(function(){
  const el=document.getElementById('log'); if(!el || !el.addEventListener) return;
  el.addEventListener('pointerdown', function(e){
    const t=e.target;
    if(t && t.closest && t.closest('.log-close')) closeLogDrawer();
  });
})();
/* 战报增量拼接：内容和筛选没变就早退，只尾部新增就 insertAdjacentHTML */
const LOG_MAX_ROWS=600;
let LOG_RENDER={ seq:-1, filterKey:'\u0000', domRows:0 };
function logRowHTML(x, keys){
  if(x.indexOf('——')===0) return '<div class="log-sep">'+x+'</div>';
  const cat=logCat(x);
  const hide = keys.length>0 && cat!=='' && keys.indexOf(cat)<0;
  return '<div class="log-line'+(cat?' log-'+cat:'')+'"'+(hide?' style="display:none"':'')+'>'+x+'</div>';
}
function renderLogBox(){
  const el=document.getElementById('log'); if(!el || !G) return;
  const keys=LOG_CATS.map(p=>p[0]).filter(k=>LOG_FILTER[k]);
  const fk=keys.join(',');
  const seq=(typeof LOG_SEQ==='number')?LOG_SEQ:0;
  if(LOG_RENDER.seq>=0 && seq===LOG_RENDER.seq && fk===LOG_RENDER.filterKey) return;
  const added=seq-LOG_RENDER.seq;
  const canAppend = typeof el.insertAdjacentHTML==='function' && el.children
    && LOG_RENDER.seq>=0 && fk===LOG_RENDER.filterKey
    && added>0 && added<=LOG_MAX_ROWS && added<=G.log.length
    && G.log.length>=LOG_RENDER.domRows;
  if(canAppend){
    const fresh=G.log.slice(-added);
    el.insertAdjacentHTML('beforeend', fresh.map(x=>logRowHTML(x,keys)).join(''));
    LOG_RENDER.seq=seq; LOG_RENDER.domRows+=added;
    if(LOG_RENDER.domRows>LOG_MAX_ROWS){
      const over=LOG_RENDER.domRows-LOG_MAX_ROWS;
      const rows=el.querySelectorAll('.log-line,.log-sep');
      for(let i=0;i<over && i<rows.length;i++){ try{ rows[i].parentNode.removeChild(rows[i]); }catch(e){} }
      LOG_RENDER.domRows=LOG_MAX_ROWS;
    }
    el.scrollTop=el.scrollHeight;
    return;
  }
  /* 三枚筛选 chip 不再渲染，但 logCat/LOG_FILTER 都留着，空选=全都显示 */
  el.innerHTML='<div class="log-head">'
    +'<button class="log-close" type="button" title="收起战报" aria-label="收起战报">✕</button>'
    +'⚔ 战报</div>'
    +G.log.slice(-LOG_MAX_ROWS).map(x=>logRowHTML(x,keys)).join('');
  LOG_RENDER={ seq:seq, filterKey:fk, domRows:Math.min(LOG_MAX_ROWS, G.log.length) };
  el.scrollTop=el.scrollHeight;
}

/* 结束回合软提示：能量没用完、还有牌可打时，按钮旁浮一枚小气泡 */
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

/* 选角界面：整屏立绘背景 + 4 张符纸波浪错落，只沿用 hero-scene 一个场景类 */
const HS_ORDER=['tianshi','wuseng','ganshiren','yincha'];
const HS_BG={ 'tianshi':'hero_sel/tianshi-s.jpg', 'wuseng':'hero_sel/wuseng-s.jpg',
              'ganshiren':'hero_sel/ganshiren-s.jpg', 'yincha':'hero_sel/yincha-s.jpg' };
const HS_LOGO={ 'tianshi':'logo/tianshi-logo.png', 'wuseng':'logo/wuseng-logo.png',
                'ganshiren':'logo/ganshiren-logo.png', 'yincha':'logo/yincha-logo.png' };
const HS_EMOJI={ 'tianshi':'🀄', 'wuseng':'🧘', 'ganshiren':'👻', 'yincha':'🩸' };
const HS_WAVE=[10,4,16,7];
const HS_RISE=[8,12,6,10];
const HS_TERMS=[['召唤单位','#f0b07f'],['诅咒','#c9a0ff'],['咒印','#c9a0ff'],['血怒','#ff6b6b'],
  ['血祭','#ff6b6b'],['尸气','#7fe0b0'],['尸骸','#7fe0b0'],['尸王','#ffcf6a'],['尸傀','#f0b07f'],
  ['召唤','#f0b07f'],['格挡','#7fc8f0']];
let HS_SEL=null, HS_LP=null;
function hsEscape(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function hsTermHTML(s){
  const esc=hsEscape(s||'');
  const terms=HS_TERMS.slice().sort((a,b)=>b[0].length-a[0].length);
  const pat=new RegExp('('+terms.map(t=>t[0]).join('|')+')','g');
  return esc.replace(pat, m=>{ const t=terms.find(x=>x[0]===m); return t?`<span style="color:${t[1]}">${m}</span>`:m; });
}
function hsHero(id){ return HEROES.find(x=>x.id===id) || HEROES[0]; }
function hsLocked(id){ return !mileOn('hero', id); }
function hsDeckChoice(){ return (SAVE && SAVE.starterDeck===1) ? 1 : 0; }
function hsDeckListFor(id, which){ return (id==='yincha' && which===1) ? starterDeckList(1) : heroDeck(id); }
function hsInfoInner(h){
  return `<div class="hs-name">${hsEscape(h.name)}</div>`
    + `<div class="hs-mech">${hsTermHTML(h.mech||'')}</div>`
    + `<div class="hs-passive">${hsTermHTML(h.passive||h.desc||'')}</div>`;
}
function hsTicketInner(){
  return artImg('ui/rumenfuzhi.png','','') + `<b>${mileTickets()}</b>`
    + `<span class="hs-ticket-sep"></span>`
    + artImg('ui/shiwanfuzhi.png','','') + `<b>${trialTickets()}</b>`;
}
function hsBgImg(id, drop){
  return `<img class="hs-bg${drop?' hs-bgdrop':''}" src="${assetURL(HS_BG[id], true)}" draggable="false" alt="" onerror="this.style.display='none'">`;
}
function hsTalismanImg(id){ return artImg(HS_LOGO[id], `<div class="hs-tl-emoji">${HS_EMOJI[id]||'🀄'}</div>`, ''); }
function hsDeckHTML(h){
  const canSwitch=(h.id==='yincha' && mileClaimed('yincha_t4'));
  if(canSwitch){
    const cur=hsDeckChoice();
    const one=n=>{
      const icon=(n===0)?'ui/deck_card1.png':'ui/deck_card2.png';
      return `<button class="hs-deckbtn${cur===n?' on':''}" data-deck="${n}"`
        + ` onpointerdown="hsDeckDown(event,${n})" onpointerup="hsDeckUp(event,${n})"`
        + ` onpointerleave="hsDeckUp(event,${n})" onpointercancel="hsDeckUp(event,${n})">`
        + artImg(icon,'','') + `</button>`;
    };
    return `<div class="hs-deckrow">${one(0)}${one(1)}</div>`
      + `<div class="hs-deck-cap">点击切换初始牌组</div>`;
  }
  return `<button class="hs-deckbtn" data-deck="0"`
    + ` onpointerdown="hsDeckDown(event,0)" onpointerup="hsDeckUp(event,0)"`
    + ` onpointerleave="hsDeckUp(event,0)" onpointercancel="hsDeckUp(event,0)">`
    + artImg('ui/deck_back.png','','') + `</button>`;
}
function hsTalismansHTML(){
  return HS_ORDER.map((hid,i)=>{
    const sel=(hid===HS_SEL);
    return `<button class="hs-tl${sel?' sel':''}" style="--wave:${HS_WAVE[i]}px;--rise:${HS_RISE[i]}px"`
      + ` onclick="hsPickTalisman('${hid}')">${hsTalismanImg(hid)}</button>`;
  }).join('');
}
function hsRootHTML(){
  const h=hsHero(HS_SEL), locked=hsLocked(HS_SEL);
  return `<div class="hs-root${locked?' hs-locked':''}" id="hs-root">`
    + `<div class="hs-bgwrap" id="hs-bgwrap">${hsBgImg(HS_SEL, true)}</div>`
    + `<div class="hs-info" id="hs-info">${hsInfoInner(h)}</div>`
    + `<div class="hs-ticket" id="hs-ticket">${hsTicketInner()}</div>`
    + `<div class="hs-deck" id="hs-deck">${hsDeckHTML(h)}</div>`
    + `<div class="hs-talismans">${hsTalismansHTML()}</div>`
    + `<button class="hs-back" onclick="heroSelectToMenu()">返回主菜单</button>`
    + `<button class="hs-start" onclick="heroSelectStart()">开始游戏</button>`
    + `</div>`;
}
function showHeroSelect(){
  if(typeof settleVidDrop==='function') settleVidDrop();
  if(G) G.trialHero=null;
  setBg('hero_select.jpg');
  HS_SEL=(G && G.hero && HS_ORDER.indexOf(G.hero)>=0) ? G.hero : 'tianshi';
  showOverlay(hsRootHTML(), false, 'hero-scene');
}
function hsPickTalisman(id){
  if(!id || HS_ORDER.indexOf(id)<0) return;
  if(id===HS_SEL){ sfx('talisman_click'); return; }
  sfx('talisman_click');
  setTimeout(()=>{ sfx('talisman_slide'); }, 50);
  hsApplyHero(id, true);
}
function hsApplyHero(id, animate){
  const root=document.getElementById('hs-root'); if(!root) return;
  HS_SEL=id; if(G) G.hero=id;
  const btns=root.querySelectorAll('.hs-tl');
  HS_ORDER.forEach((hid,i)=>{ if(btns[i]) btns[i].classList.toggle('sel', hid===id); });
  const wrap=document.getElementById('hs-bgwrap');
  if(wrap){
    if(animate){
      const img=document.createElement('img');
      img.className='hs-bg hs-bgdrop'; img.setAttribute('draggable','false'); img.alt='';
      img.onerror=function(){ img.style.display='none'; };
      img.src=assetURL(HS_BG[id], true);
      wrap.appendChild(img);
      setTimeout(()=>{ if(img.parentNode===wrap && wrap.children.length>1) wrap.removeChild(wrap.firstChild); }, 720);
      sfx('poster_bounce_land');
    } else { wrap.innerHTML=hsBgImg(id, false); }
  }
  const h=hsHero(id);
  const info=document.getElementById('hs-info'); if(info) info.innerHTML=hsInfoInner(h);
  const deck=document.getElementById('hs-deck'); if(deck) deck.innerHTML=hsDeckHTML(h);
  const tk=document.getElementById('hs-ticket'); if(tk) tk.innerHTML=hsTicketInner();
  root.classList.toggle('hs-locked', hsLocked(id));
}
function hsRefreshTicket(){
  const root=document.getElementById('hs-root'); if(!root) return;
  root.classList.toggle('hs-locked', hsLocked(HS_SEL));
  const tk=document.getElementById('hs-ticket'); if(tk) tk.innerHTML=hsTicketInner();
  const deck=document.getElementById('hs-deck'); if(deck) deck.innerHTML=hsDeckHTML(hsHero(HS_SEL));
}
function hsDeckDown(ev, which){
  if(ev && ev.preventDefault) ev.preventDefault();
  if(HS_LP){ clearTimeout(HS_LP); HS_LP=null; }
  HS_LP=setTimeout(()=>{ HS_LP=null; hsDeckPreview(); }, 250);
}
function hsDeckUp(ev, which){
  if(HS_LP){ clearTimeout(HS_LP); HS_LP=null; hsDeckTap(which); }
}
function hsDeckTap(which){
  const h=hsHero(HS_SEL);
  if(h.id==='yincha' && mileClaimed('yincha_t4')){ hsSetDeckChoice(which); sfx('talisman_click'); }
  else sfx('ui_click');
}
function hsSetDeckChoice(n){
  if(!SAVE) return;
  SAVE.starterDeck=(n===1)?1:0; persistSave();
  const cur=hsDeckChoice();
  const root=document.getElementById('hs-root'); if(root){
    root.querySelectorAll('.hs-deckbtn').forEach(b=>{ b.classList.toggle('on', Number(b.dataset.deck)===cur); });
  }
}
function hsDeckPreview(){
  const root=document.getElementById('hs-root'); if(!root) return;
  const old=document.getElementById('hs-prev'); if(old && old.parentNode) old.parentNode.removeChild(old);
  const h=hsHero(HS_SEL);
  const layers=[];
  if(h.id==='yincha' && mileClaimed('yincha_t4')){
    layers.push({t:'现有阴差牌组', n:0}); layers.push({t:'血怒流牌组', n:1});
  } else { layers.push({t:h.name+' 初始牌组', n:0}); }
  const body=layers.map(L=>{
    const list=hsDeckListFor(h.id, L.n);
    return `<div class="hs-prev-layer"><div class="hs-prev-title">${hsEscape(L.t)}<small>共 ${list.length} 张</small></div>`
      + `<div class="hs-prev-row" style="grid-template-columns:repeat(${list.length},minmax(0,1fr))">${starterDeckThumbs(list)}</div></div>`;
  }).join('');
  const div=document.createElement('div');
  div.className='hs-prev'; div.id='hs-prev';
  div.innerHTML=body + `<button class="btn ghost" style="margin:0" onclick="hsDeckPreviewClose()">返回</button>`;
  root.appendChild(div);
  sfx('ui_click');
}
function hsDeckPreviewClose(){
  const p=document.getElementById('hs-prev'); if(p && p.parentNode) p.parentNode.removeChild(p);
  sfx('key_press');
}
/* 未解锁时：有试玩符纸先弹试玩窗，没有才回落消耗 1 张入门符纸解锁 */
function heroSelectStart(){
  const h=hsHero(HS_SEL); if(!h) return;
  sfx('key_press');
  if(mileOn('hero', HS_SEL)){
    if(hasRunSave()){ askOverwriteSave(HS_SEL); return; }
    pickHero(HS_SEL); return;
  }
  if(trialTickets()>=1){
    const canPerm=(mileTickets()>=1);
    askConfirm(`是否要用【试玩符纸】获得【${hsEscape(h.name)}】试玩一次的权力？`
      + `<br>试玩一次 = 本局可用该角色，进度 / 图鉴 / 排行榜照常计入；`
      + `试玩中若再用【入门符纸】即可续成永久解锁。`
      + `<br>试玩符纸 ${trialTickets()} 张${canPerm?` · 入门符纸 ${mileTickets()} 张`:''}。`,
      ()=>startTrialRun(HS_SEL),
      { brush:true, yesLabel:'试玩一次', noLabel:'取消',
        label: canPerm?'永久解锁':null,
        cb: canPerm ? ()=>{
          if(unlockHeroWithTicket(HS_SEL)){
            log(`使用入门符纸解锁角色【${h.name}】`);
            floatMsg(`已解锁【${h.name}】 · 剩 ${mileTickets()} 张`);
            hsRefreshTicket();
          } else { sfx('error'); floatMsg('解锁失败'); }
        } : null });
    return;
  }
  if(mileTickets()<1){ sfx('error'); floatMsg('没有【入门符纸】也没有【试玩符纸】'); return; }
  askConfirm(`消耗 1 张【入门符纸】解锁【${hsEscape(h.name)}】？<br>当前持有 ${mileTickets()} 张。`, ()=>{
    if(unlockHeroWithTicket(HS_SEL)){
      log(`使用入门符纸解锁角色【${h.name}】`);
      floatMsg(`已解锁【${h.name}】 · 剩 ${mileTickets()} 张`);
      hsRefreshTicket();
    } else { sfx('error'); floatMsg('解锁失败'); }
  });
}
function startTrialRun(id){
  const h=hsHero(id); if(!h) return;
  if(!unlockHeroWithTrialTicket(id)){ sfx('error'); floatMsg('【试玩符纸】不足'); return; }
  log(`使用试玩符纸试玩角色【${h.name}】`);
  floatMsg(`试玩【${h.name}】 · 剩 ${trialTickets()} 张`);
  hsRefreshTicket();
  if(hasRunSave()){ askOverwriteSave(id); return; }
  pickHero(id);
}
function pickHero(id){
  G.hero=id;
  const h=HEROES.find(x=>x.id===id);
  const which=(id==='yincha' && mileClaimed('yincha_t4'))?hsDeckChoice():0;
  G.deck=hsDeckListFor(id, which);
  log(`选择英雄【${h.name}】`);
  showOpeningChoice();
}
function heroDeck(id){
  const h=HEROES.find(x=>x.id===id);
  const d=[]; h.deck.forEach(([cid,n])=>{ for(let i=0;i<n;i++) d.push(cardById(cid)); });
  return d;
}
/* 阴差 t4 备用牌组 */
const YINCHA_STARTER_ALT=[['yinxueren',3],['jingang',2],['fenshenzhou',1],['fodu',1],['shihun',1],['xueqi',1],['shouyi',1],['duhunguiji',1]];
function starterDeckList(which){
  if(which!==1) return heroDeck('yincha');
  const d=[]; YINCHA_STARTER_ALT.forEach(([cid,n])=>{ for(let i=0;i<n;i++) d.push(cardById(cid)); });
  return d;
}
function starterDeckThumbs(list){
  return list.map(c=>`<div class="sd-thumb"><div class="card has-frame ${RCOLOR[c.rarity]}">${cardBody(c)}</div></div>`).join('');
}
function heroSelectToMenu(){
  G.hero=null; G.deck=[]; G.openingPicks=null;
  showStartScreen();
}
function backToHeroSelect(){
  G.hero=null; G.deck=[]; G.openingPicks=null;
  showHeroSelect();
}
function startGame(){
  ensureAudio();
  confirmNewGame();
}
function resumeRun(){ ensureAudio(); continueRun(); }
function confirmNewGame(opts){
  try {
    if(opts && opts.clear) clearRunSave(0);
    setRunSlot(0);
    RUN_FINISHED=false;
    G=newState(); G.mapRow=0;
    G.startTs=Date.now();
    G.accMs=0; G.t0=Date.now();
    const __sd=rngSeedNow(); seedRng(__sd);
    G.mapSeed=__sd; buildActs(__sd); G.mapRow=0;
    track('runStart');
    tapAchieve('Beginning');
    if(SAVE.signInBonus>0){ G.gold=SAVE.signInBonus; SAVE.signInBonus=0; persistSave(); log('开局携带签到奖励 '+G.gold+' 金币'); }
    showHeroSelect();
  } catch(e){ console.error('confirmNewGame error:', e); showStartScreen(); }
}
/* 选角点开始游戏且已有存档时的覆盖提示，样式在 原型.html 的 overwrite-scene */
function askOverwriteSave(heroId){
  const d=readRun(0);
  if(!d){ pickHero(heroId||HS_SEL); return; }
  const _h=HEROES.find(x=>x.id===d.hero);
  const heroName=_h?_h.name:'未知角色';
  const progress=`第 ${d.act||1} 幕 第 ${(d.mapRow||0)+1} 层`;
  const hp=`生命 ${d.hp||0}/${d.maxHp||0}`;
  showOverlay(
    '<div class="ow-box">'
    +'<div class="ow-title">目前有一个存档，是否继续</div>'
    +'<div class="ow-warn">【继续】会掩盖之前的【存档】</div>'
    +'<div class="ow-info"><span>'+heroName+'</span><span>'+progress+'</span><span>'+hp+'</span></div>'
    +'<div class="ow-actions">'
    +'<button class="ow-btn ow-go" onclick="overwriteAndStart(\''+(heroId||HS_SEL||'')+'\')">继续</button>'
    +'<button class="ow-btn ow-back" onclick="overwriteBack()">返回</button>'
    +'</div></div>', undefined, 'overwrite-scene');
}
function overwriteBack(){ if(G) G.hero=HS_SEL; showHeroSelect(); }
function overwriteAndStart(heroId){
  const d=readRun(0);
  if(!d){ showHeroSelect(); return; }
  settleOverwrittenRun(d);   // 40_flow.js：为旧档角色补一场败局结算（算分+里程+入榜+删档）
}
function showOpeningChoice(){
  const originalRewardTier = G.rewardTier;
  G.rewardTier = 'starter';

  /* 领了 t3/t4 真传后开局改成全牌库任选一张，尸王这张直接排除 */
  const freePick = (G.hero==='tianshi' && mileClaimed('tianshi_t3')) ||
                   (G.hero==='ganshiren' && mileClaimed('ganshiren_t4'));
  let picks;
  if(freePick){
    const _ok=c=>(!c.hero || c.hero===G.hero) && (!c.mile || mileClaimed(c.mile)) &&
      c.id!=='duanren_leifu' && c.id!=='yinbing' && c.id!=='shi_wang' &&
      (!c.needs || deckHasMechanic(c.needs)) && mileOn('card', c);
    picks=CARDS.filter(_ok);
    if(!picks.length) picks=CARDS.filter(c=> !c.hero || c.hero===G.hero);
  }else{
    picks=[];
    while(picks.length<3){
      const c=weightedCard();
      if(!picks.some(p=>p.id===c.id)) picks.push(c);
    }
  }
  G.openingPicks=picks;

  const hasGoldInReward = picks.some(card => card.rarity === 'gold');

  G.lastOpeningRewardHadGold = hasGoldInReward;

  G.rewardTier = originalRewardTier;

  const cards=picks.map((c,i)=>`<div class="card has-frame ${RCOLOR[c.rarity]}" onclick="askPickOpening(${i})">${cardBody(c)}</div>`).join('');
  const poolCls='reward-cards'+(freePick?' free-pool':'');
  const tip = freePick
    ? (G.hero==='ganshiren'
        ? '尸王真传：从本角色全部牌库中自由挑选一张加入起始牌组（不能选尸王，或跳过）。'
        : '天师真传：从本角色全部牌库中自由挑选一张加入起始牌组（或跳过）。')
    : '天师赠你一道符，挑一张加入起始牌组（或跳过）。';
  const backFn='backToHeroSelect()';
  showOverlay(`<h2>开 局 抉 择</h2><p>${tip}</p><div class="${poolCls}">${cards}</div>
    <button class="btn ghost" onclick="${backFn}">返回上一步</button>
    <button class="btn ghost" onclick="skipOpening()">跳过</button>`);
}
function pickOpening(i){
  const c=G.openingPicks[i];
  /* 天师真传的池子是 CARDS 引用，入牌组得换副本，不然 forgeCard 的 up 会写回卡表 */
  G.deck.push(c ? cardById(c.id) : c);
  log(`获得卡牌【${c.name}】`);

  if(G.hasOwnProperty('lastOpeningRewardHadGold')) {
    updateGoldCompensation(G.lastOpeningRewardHadGold);
  }

  showMap({entry:true});
}
function rerollOpening(){ adPlaceholder('开局重随', showOpeningChoice); }
function skipOpening(){
  if(G.hasOwnProperty('lastOpeningRewardHadGold')) {
    updateGoldCompensation(G.lastOpeningRewardHadGold);
  }

  showMap({entry:true});
}
/* 主菜单全屏横屏版，入口砍到 5 个，函数本体只摘入口不删 */
function showStartScreen(){
  if(typeof settleVidDrop==='function') settleVidDrop();
  setBg('menu');
  /* setBGM 会真去 load/play，抛异常会截断整个函数，得 try 住 */
  try{ setBGM('menu'); }catch(e){}
  showOverlay(`<div class="menu-root">
    <div class="menu-bgwrap"><div class="menu-bgimg a"></div><div class="menu-bgimg b"></div></div>
    <div class="menu-veil"></div>

    <div class="menu-stage">
      <div class="menu-titlebar menu-tier" style="--i:0">
        <h2 class="menu-title">${artImg('ui/menu/topic.png','<span class="menu-fb">志怪塔</span>','menu-art')}</h2>
      </div>

      <div class="menu-col-stele menu-tier is-main" style="--i:1">
        <button class="menu-hit is-start" aria-label="开始爬塔"
                onclick="steleBreak(this,startGame)"><span class="menu-artbox">${artImg('ui/menu/start.png','<span class="menu-fb">入塔</span>','menu-art')}${menuShardsHTML('ui/menu/start.png')}</span></button>
        <button class="menu-hit is-continue" aria-label="继续上次爬塔"${hasRunSave()?'':' disabled'}
                onclick="steleBreak(this,resumeRun)"><span class="menu-artbox">${artImg('ui/menu/continue.png','<span class="menu-fb">续</span>','menu-art')}${menuShardsHTML('ui/menu/continue.png')}</span></button>
      </div>

      <div class="menu-row-talis menu-tier is-list" style="--i:2">
        <button class="menu-hit is-collection" aria-label="志怪图鉴"
                onclick="talisOpen(this,viewBestiary)"><span class="menu-artbox">${artImg('ui/menu/collection.png','<span class="menu-fb">图鉴</span>','menu-art')}</span></button>
        <button class="menu-hit is-setting" aria-label="设置"
                onclick="talisOpen(this,showSettings)"><span class="menu-artbox">${artImg('ui/menu/setting.png','<span class="menu-fb">设置</span>','menu-art')}</span></button>
        <button class="menu-hit is-mileage" aria-label="里程碑解锁进度"
                onclick="talisOpen(this,viewMilestones)"><span class="menu-artbox">${artImg('ui/menu/leaderboard.png','<span class="menu-fb">解锁</span>','menu-art')}</span></button>
      </div>

      <!-- v1.1.x（用户口径「排行榜入口放到主界面右下角」）：原右上角那枚「排行榜」符纸已删，
           改为右下角一张**皇榜卷轴**（ui/huangbang.png），点击时入口周边闪一圈金光
           （rankOpen → .is-lighting → rankEntryGlow），再切进「风云榜」整屏场景。
           ⚠️ 注释里**不写**裸 assets 目录字面量（冒烟有一条「主菜单模板不得出现原始素材目录名」的闸）。 -->
      <div class="menu-col-rank menu-tier" style="--i:3">
        <button class="menu-hit is-rank" aria-label="风云榜"
                onclick="rankOpen(this)"><span class="menu-artbox">${artImg('ui/huangbang.png','<span class="menu-fb">风云榜</span>','menu-art')}<span class="menu-rank-label">风 云 榜</span></span></button>
      </div>
    </div>

    <div class="menu-flash"></div>
  </div>`, false, 'menu-scene');
  menuBgRotate();   // 必须放 showOverlay 之后，先调写的是已被丢弃的旧节点，屏幕上看不到
}
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
    <button class="btn ghost" onclick="viewMilestones()">里程碑 · 解锁</button>`);
}
function manualSave(){
  saveRun(); sfx('gold'); floatMsg('已存档');
}
/* 性能读数（诊断用 HUD）：右上角 FPS / 最长帧，默认关，只在 perfStart 里起，别碰 render */
let PERF = null;
function perfNow(){ return (typeof performance!=='undefined' && performance.now) ? performance.now() : Date.now(); }
function applyPerfReadout(){
  if(SETTINGS.perfReadout){ if(!PERF) perfStart(); }
  else { if(PERF) perfStop(); }
}
function perfStart(){
  if(PERF) return;
  let el=null;
  try{ el=document.getElementById('perf-hud'); }catch(e){}
  if(!el){ try{ el=document.createElement('div'); el.id='perf-hud'; document.body.appendChild(el); }catch(e){ el=null; } }
  PERF={ el, t0:perfNow(), last:perfNow(), lastPaint:0, frames:0, maxGap:0, longN:0, longMax:0, obs:null, raf:0,
         lastText:'', lastCls:'' };
  if(typeof PerformanceObserver!=='undefined'){
    try{
      PERF.obs=new PerformanceObserver(function(list){
        if(!PERF) return;
        const es=list.getEntries();
        for(let i=0;i<es.length;i++){ PERF.longN++; if(es[i].duration>PERF.longMax) PERF.longMax=es[i].duration; }
      });
      PERF.obs.observe({ entryTypes:['longtask'] });
    }catch(e){ PERF.obs=null; }
  }
  PERF.tick=function(){
    if(!PERF) return;
    const now=perfNow(), gap=now-PERF.last; PERF.last=now; PERF.frames++;
    if(gap>PERF.maxGap) PERF.maxGap=gap;
    if(now-PERF.lastPaint>=500){
      PERF.lastPaint=now;
      const span=Math.max(1, now-PERF.t0);
      const fps=PERF.frames*1000/span;
      if(PERF.el){
        const txt='FPS '+fps.toFixed(0)+' · 最长帧 '+PERF.maxGap.toFixed(0)+'ms · longtask '+PERF.longN
          +(PERF.longMax?('(峰'+PERF.longMax.toFixed(0)+'ms)'):'');
        if(txt!==PERF.lastText){ PERF.el.textContent=txt; PERF.lastText=txt; }
        const cls=(fps<45||PERF.maxGap>200)?'bad':'';
        if(cls!==PERF.lastCls){ PERF.el.className=cls; PERF.lastCls=cls; }
      }
      PERF.t0=now; PERF.frames=0; PERF.maxGap=0; PERF.longN=0; PERF.longMax=0;
    }
    PERF.raf=requestAnimationFrame(PERF.tick);
  };
  PERF.raf=requestAnimationFrame(PERF.tick);
}
function perfStop(){
  if(!PERF) return;
  try{ if(PERF.raf) cancelAnimationFrame(PERF.raf); }catch(e){}
  try{ if(PERF.obs) PERF.obs.disconnect(); }catch(e){}
  try{ if(PERF.el && PERF.el.remove) PERF.el.remove(); }catch(e){}
  PERF=null;
}
function togglePerfReadout(){
  SETTINGS.perfReadout=!SETTINGS.perfReadout; persistSettings(); applyPerfReadout(); showSettings();
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
    <p style="margin-top:16px">性能读数（诊断用）：<b style="color:${SETTINGS.perfReadout?'var(--green)':'var(--red)'}">${SETTINGS.perfReadout?'开':'关'}</b><br><small style="color:var(--dim);font-size:12px">开启后屏幕右上角显示 FPS / 最长帧 / longtask，用来查卡顿。⚠️ 读数本身有开销（常驻帧循环 + 刷新文本）⇒ 开着会比关掉略卡，属正常现象，查完请关掉</small></p>
    <button class="btn ghost" onclick="togglePerfReadout()">${SETTINGS.perfReadout?'关闭性能读数':'开启性能读数'}</button>
    <p style="margin-top:16px">伤害飘字：<b style="color:${fx()?'var(--green)':'var(--red)'}">${fx()?'开':'关（流畅模式）'}</b></p>
    <p style="margin-top:16px">结束回合软提示：<b style="color:${SETTINGS.endTurnHint!==false?'var(--green)':'var(--red)'}">${SETTINGS.endTurnHint!==false?'开':'关'}</b></p>
    <button class="btn ghost" onclick="toggleEndTurnHint()">${SETTINGS.endTurnHint!==false?'关闭软提示':'开启软提示'}</button>
    <button class="btn ghost" onclick="showClearTimes()">榜 单</button>
    <button class="btn ghost" onclick="tutReplayAsk()">重玩新手教程</button>
    <button class="btn ghost" onclick="showCloudPanel()">云存档</button>
    <button class="btn ghost" onclick="showRedeemPanel()">兑换码</button>
    <p style="margin-top:16px">登录账号（本机存档隔离）：<b style="color:${ACC_ID?'var(--green)':'var(--red)'}">${ACC_ID?'已绑定':'未绑定'}</b><br><small style="color:var(--dim);font-size:12px">${accDiag()}</small></p>
    <p style="margin-top:16px">成就上报（TapTap 平台）：<b style="color:${tapAchieveEnv().ok?'var(--green)':'var(--red)'}">${tapAchieveEnv().ok?'已接入':'未接入'}</b><br><small style="color:var(--dim);font-size:12px">v1.1.23：游戏内成就 / 卡背 / 头像框已删除；6 条成就（登塔！！！/ 初入第三幕 / 身经百战 / 全能降魔者 / 解锁并拥有所有角色 / 风云榜相聚）只上报到 TapTap 平台（玩家在 TapTap 游戏页看到点亮）。<br>${tapAchieveDiag()}</small></p>
    <button class="btn ghost" onclick="menuBack()">返回菜单</button>`, undefined, 'scroll-scene');
}
/* 六大榜：本机榜在 40_flow，全平台榜在 55_cloud，入口是主界面皇榜和设置里的榜单按钮 */
let RANK_VIEW='clear_total';
let RANK_SRC='online';
let RANK_PERIOD='week';
let RANK_SELF_CACHE={name:'', avatar:''};
const RANK_CAT={clear_total:'通关总榜', clear_tianshi:'符箓天师', clear_ganshiren:'赶尸人',
                clear_wuseng:'武僧', clear_yincha:'阴差', total_score:'整局总分'};
function rankSeal(hero){
  return ({tianshi:'符', ganshiren:'尸', wuseng:'禅', yincha:'冥'})[hero] || '◇';
}
function rankInt(n){ return String(Math.round(n||0)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
function rankDateStr(ts){
  if(!ts) return '—';
  const d=new Date(ts);
  return (d.getMonth()+1)+'.'+(d.getDate()<10?'0':'')+d.getDate();
}
/* 从主界面直接进榜的返回键别绕回设置页，按 at-menu 判来处 */
function rankBack(){
  const atMenu=!!(document.body && document.body.classList && document.body.classList.contains('at-menu'));
  if(atMenu) showStartScreen(); else showSettings();
}
/* 皇榜入口先闪完金光再切，showOverlay 一换 innerHTML 菜单那颗按钮就没了 */
function rankOpen(btn){
  if(MENU_BUSY) return;
  menuBusy(true);
  sfx('rank');
  if(btn && btn.classList) btn.classList.add('is-lighting');
  const off=menuFxOff();
  setTimeout(function(){ menuBusy(false); showClearTimes(); }, off?40:340);
}
function rankLocalList(b){
  const lim=Date.now()-7*24*3600*1000;
  const src=(b.kind==='score')?readScores():readClearTimes();
  return src.filter(r=>!b.hero||r.hero===b.hero)
            .filter(r=>RANK_PERIOD!=='week'||(r.ts||0)>=lim);
}
/* 行数据本机/全平台归一：本机行真名真头像；全平台 clear 榜掉 <60s 的旧脏数据 */
function rankRows(b, list, online, self){
  self = self || {};
  const arr = (list||[]);
  const msOf = r => (r&&r.ms!=null) ? r.ms
    : ((r&&r.score!=null) ? r.score
      : (r&&r.statisticValue!=null ? r.statisticValue : (r&&r.value)));
  const clean = (online && b.kind==='clear')
    ? arr.filter(r=>{ const v=msOf(r); return !(v!=null && v>0 && v<60000); })
    : arr;
  return clean.map((r,i)=>{
    const v = msOf(r);
    const rank = (r&&r.rank)||(i+1);
    const nm = online ? String((r&&(r.nickname||r.name||r.rankName||r.userName))||'').slice(0,12)
                      : String(self.name||'我').slice(0,12);
    const av = online ? String((r&&(r.avatar||r.avatarUrl||r.headImg||r.headUrl||r.icon))||'')
                      : String(self.avatar||'');
    const me = online ? ((!!self.name && !!nm && nm===self.name)
                         || (self.rank!=null && rank===self.rank
                             && (self.score==null || v===self.score)))
                      : true;
    return {
      i:i, rank:rank, me:me,
      seal:rankSeal((r&&r.hero)||b.hero),
      name:nm||'道友', avatar:av,
      role:online?(b.hero?heroName(b.hero):'天下道友'):heroName(r&&r.hero),
      a:(b.kind==='score')?rankInt(v):(v==null?'—':fmtMMSS(v)),
      b:(b.kind==='score')?(online?'—':((r&&r.win)?'通关':'第'+((r&&r.act)||1)+'幕止步')):rankInt(r&&r.score),
      date:online?'—':rankDateStr(r&&r.ts)
    };
  });
}
function rankTableHTML(b, rows){
  const head=`<div class="rk-tr head"><span>名次</span><span>道友</span>
    <span style="text-align:right">${b.kind==='score'?'整局得分':'通关用时'}</span>
    <span style="text-align:right">${b.kind==='score'?'结果':'整局得分'}</span>
    <span style="text-align:right">留名日期</span></div>`;
  if(!rows.length) return head+`<div class="rk-empty">此榜尚无留名，静候道友一展神通。</div>`;
  return head+rows.map(r=>{
    const rk=r.rank||(r.i+1);
    return `<div class="rk-tr${rk<=3?' r'+(rk-1):''}${r.me?' me':''}">
    <span class="rk-rn">${String(rk).padStart(2,'0')}</span>
    <span class="rk-pl">${r.avatar
      ? `<span class="ms rk-av"><img src="${r.avatar}" alt=""></span>`
      : `<span class="ms">${r.seal}</span>`}<b>${r.name}</b></span>
    <span class="rk-tm">${r.a}</span>
    <span class="rk-sc">${r.b}</span>
    <span class="rk-dt">${r.date}</span></div>`;
  }).join('');
}
function rankPodiumHTML(rows){
  if(rows.length<3) return '';
  const order=[1,0,2], deco=['榜 眼','魁 首','探 花'], yin=['贰','壹','叁'];
  return `<div class="rk-podium">`+order.map((k,j)=>{
    const r=rows[k]; if(!r) return '';
    return `<div class="rk-champ${k===0?' p1':''}${r.me?' me':''}">
      <div class="rk-deco">${deco[j]}</div>
      <div class="rk-seal${r.avatar?' rk-av':''}">${r.avatar?`<img src="${r.avatar}" alt="">`:r.seal}</div>
      <div class="rk-nm">${r.name}</div>
      <div class="rk-role">${r.role}${k===0?' · 魁首':''}</div>
      <div class="rk-time">${r.a}</div></div>`;
  }).join('')+`</div>`;
}
function showClearTimes(view){
  if(view) RANK_VIEW=view;
  const b=(typeof rankBoardById==='function')?rankBoardById(RANK_VIEW)
        :{id:'clear_total', name:'通关计时 · 总榜', kind:'clear', hero:''};
  const online=(typeof rankAvailable==='function') && rankAvailable();
  if(!online) RANK_SRC='local';
  const boards=(typeof RANK_BOARDS!=='undefined'?RANK_BOARDS:[]);
  const cats=boards.map(x=>`<button class="rk-cat${x.id===b.id?' on':''}" onclick="showClearTimes('${x.id}')">
      <span class="sym">${rankSeal(x.hero)}</span>${RANK_CAT[x.id]||x.name}${x.id==='clear_total'?'<span class="tag">总</span>':''}</button>`).join('');
  const best=rankLocalBest(b);
  const myName=(RANK_SELF_CACHE.name||'我');
  const myAv=RANK_SELF_CACHE.avatar;
  const mineTxt = best
    ? `<span class="rk-myrank">我的<small>最佳战绩</small></span>
       <span class="rk-seal${myAv?' rk-av':''}" id="rk-myav">${myAv?`<img src="${myAv}" alt="">`:rankSeal(best.hero)}</span>
       <span class="rk-mynm"><b id="rk-mynm">${myName}</b><small>${heroName(best.hero)}</small></span>
       <span class="rk-num">${b.kind==='score'?rankInt(best.score):fmtMMSS(best.ms)}<small>${b.kind==='score'?'整局得分':'通关用时'}</small></span>
       <span class="rk-num">${b.kind==='score'?((best.win)?'通关':'第'+((best.act)||1)+'幕止步'):rankInt(best.score)}<small>${b.kind==='score'?'结果':'整局得分'}</small></span>`
    : `<span class="rk-mynm" style="margin-left:2px">本机暂无战绩 —— 打上塔顶，用时就会记在这里。</span>`;
  const tapBtn=online?`<button class="rk-btn ghost" onclick="rankOpenThis('${b.id}')">TapTap 榜单 ›</button>`:'';
  const periodHTML=(RANK_SRC==='local')
    ? `<div class="rk-period"><button class="${RANK_PERIOD==='week'?'on':''}" onclick="rankSetPeriod('week')">本周</button><button class="${RANK_PERIOD==='all'?'on':''}" onclick="rankSetPeriod('all')">历来</button></div>` : '';
  const tabs=`<div class="rk-tabs">
      <button class="rk-tab${RANK_SRC==='online'?' on':''}" onclick="rankSetSrc('online')">天下榜</button>
      <button class="rk-tab${RANK_SRC==='local'?' on':''}" onclick="rankSetSrc('local')">本机记录<em>${rankLocalBest(b)?'1':''}</em></button>
    </div>`;
  const caption=(b.kind==='score')
    ? '整局得分，越高越靠前（通关 / 失败 / 放弃都记录）'
    : '仅记录通关成绩，用时越短，名次越高';
  const near=(b.kind==='score')?'历代侠士 · 累计记录':'每日子时更新';
  let bodyHTML;
  if(RANK_SRC==='online'){
    bodyHTML=`<div class="rk-podium" id="rk-pod"></div><div class="rk-table" id="rk-table">
        <div class="rk-empty">全平台榜读取中…</div></div>`;
  }else{
    const rows=rankRows(b, rankLocalList(b), false, RANK_SELF_CACHE);
    bodyHTML=rankPodiumHTML(rows)+`<div class="rk-table">${rankTableHTML(b,rows)}</div>`;
  }
  /* 切榜会整屏重排，左侧导航的 scrollTop 会被复位到顶，重排前先记下再回填 */
  const _navTop = (()=>{ const n=document.getElementById('rk-nav'); return n?n.scrollTop:0; })();
  showOverlay(`<div class="rk-root"><div class="rk-scroll">
    ${artImg('ui/huangbang.png','','rk-scrollbg')}
    <div class="rk-body">
      <div class="rk-top">
        <button class="rk-back" onclick="rankBack()">‹ 返回山门</button>
        <div class="rk-title">风云榜<small>群英留名 · 万古流芳</small></div>
        <div class="rk-topr">${RANK_SRC==='online'?'TapTap 全平台':'本机记录'}</div>
      </div>
      <div class="rk-cols">
        <aside class="rk-side">
          <div class="rk-side-title"><span class="big">榜</span><div>天下英杰<br><small>各显神通</small></div></div>
          <div class="rk-side-label">通 关 计 时</div>
          <nav class="rk-nav" id="rk-nav">${cats}</nav>
          <div class="rk-side-foot"><span class="rk-seal">敕</span><span class="rk-poem">山海有灵 · 来者留名</span></div>
        </aside>
        <section class="rk-main">
          <div class="rk-toolbar">${tabs}${periodHTML}</div>
          <div class="rk-cap"><span>◇ ${caption}</span><span>${RANK_SRC==='online'?'全平台 · 实时读取':near}</span></div>
          ${bodyHTML}
          <div class="rk-foot"><span>前三甲 · 十强 · 天下道友</span><span>名次有先后，道心无高下</span></div>
          <div class="rk-mine">${mineTxt}${tapBtn}</div>
        </section>
      </div>
    </div>
  </div></div>`, false, 'rank-scene');
  { const n=document.getElementById('rk-nav'); if(n && _navTop>0) n.scrollTop=_navTop; }
  if(RANK_SRC==='online') rankFillOnline(b);
  rankSelfFill();
}
function rankSetSrc(s){ RANK_SRC=s; showClearTimes(); }
function rankSetPeriod(p){ RANK_PERIOD=p; showClearTimes(); }
function heroName(id){ return (HEROES.find(x=>x.id===id)||{}).name||id||'—'; }
function rankLocalBest(b){
  if(b.kind==='score') return readScores()[0]||null;
  return readClearTimes().filter(r=>!b.hero||r.hero===b.hero)[0]||null;
}
/* 榜单先 showOverlay 再异步填，这里只改现存节点不重排 */
function rankSelfFill(){
  if(typeof rankSelf!=='function') return;
  const paint=()=>{
    const nm=document.getElementById('rk-mynm');
    if(nm && RANK_SELF_CACHE.name) nm.textContent=RANK_SELF_CACHE.name;
    const av=document.getElementById('rk-myav');
    if(av && RANK_SELF_CACHE.avatar){
      av.classList.add('rk-av');
      av.innerHTML='<img src="'+RANK_SELF_CACHE.avatar+'" alt="">';
    }
  };
  rankSelf().then(s=>{
    RANK_SELF_CACHE.name=(s&&s.name)||RANK_SELF_CACHE.name||'';
    RANK_SELF_CACHE.avatar=(s&&s.avatar)||RANK_SELF_CACHE.avatar||'';
    paint();
    /* tap 取不到用户信息时，退一步用官方排行榜接口取「我的名次」，那一带会回 nickname/avatar */
    if((RANK_SELF_CACHE.name && RANK_SELF_CACHE.avatar) || typeof rankSelfScore!=='function') return;
    rankSelfScore(RANK_VIEW).then(mine=>{
      if(!mine) return;
      RANK_SELF_CACHE.name=RANK_SELF_CACHE.name||String(mine.nickname||mine.name||'');
      RANK_SELF_CACHE.avatar=RANK_SELF_CACHE.avatar||String(mine.avatar||mine.avatarUrl||'');
      paint();
    }, ()=>{});
  }, ()=>{});
}
/* 全平台榜那块：有接口就拉前排填表，没接口把探测到的方法名亮出来 */
function rankFillOnline(b){
  b=b||rankBoardById(RANK_VIEW);
  const table=document.getElementById('rk-table');
  if(!table) return;
  const pod=document.getElementById('rk-pod');
  if(!rankAvailable()){
    table.innerHTML=`<div class="rk-empty">全平台榜：未接入 —— ${rankDiag()}</div>`;
    return;
  }
  const selfP=(typeof rankSelf==='function')?rankSelf():Promise.resolve({});
  const mineP=(typeof rankSelfScore==='function')?rankSelfScore(b.id).catch(()=>null):Promise.resolve(null);
  Promise.all([selfP, rankFetch(CLEAR_MAX, b.id), mineP]).then(([self, res, mine])=>{
    const raw=res&&(res.scores||res.data||res.list||res.ranks||res.results);
    const arr=Array.isArray(raw)?raw:(Array.isArray(res)?res:null);
    if(!arr){
      table.innerHTML=`<div class="rk-empty">全平台榜：返回格式待确认（${JSON.stringify(res).slice(0,120)}）</div>`;
      return;
    }
    if(!arr.length){ table.innerHTML=rankTableHTML(b, []); return; }
    const s=(self||{});
    const selfInfo={ name:s.name||(mine&&(mine.nickname||mine.name))||'',
                     avatar:s.avatar||(mine&&(mine.avatar||mine.avatarUrl))||'',
                     rank:(mine&&mine.rank!=null)?mine.rank:null,
                     score:(mine&&mine.score!=null)?mine.score:null };
    const rows=rankRows(b, arr, true, selfInfo);
    if(pod) pod.outerHTML=rankPodiumHTML(rows)||'<div class="rk-podium"></div>';
    table.innerHTML=rankTableHTML(b, rows);
  }, e=>{
    table.innerHTML=`<div class="rk-empty">全平台榜读取失败：${(e&&e.message)||e}</div>`;
  });
}
function rankOpenThis(boardId){
  const b=rankBoardById(boardId||RANK_VIEW);
  rankOpenBoard(b.id).then(()=>{}, e=>floatMsg(String((e&&e.message)||e)));
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
function toggleEndTurnHint(){
  SETTINGS.endTurnHint = (SETTINGS.endTurnHint===false); persistSettings(); renderEndTurnHint(); showSettings();
}
function tutorialSeen(){ try{ return Store.get('zhiguaitower_tutorial_v1')==='1'; }catch(e){ return false; } }
function markTutorialSeen(){ try{ Store.set('zhiguaitower_tutorial_v1','1'); }catch(e){} }
function resumeGame(){
  if(aliveEnemies().length>0) hideOverlay();
  else showMap({entry:true});
}
function confirmRestart(){
  showOverlay(`<h2>重新开始？</h2><p>重新开始本局，当前进度将被覆盖。</p>
    <button class="btn" onclick="confirmNewGame({clear:true})">确定 · 重新开始</button>
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
/* 牌堆点击走 addEventListener 不走内联 onclick，免得被混淆改名 */
document.getElementById('pile-draw').addEventListener('click', ()=>showPile('draw'));
document.getElementById('pile-discard').addEventListener('click', ()=>showPile('discard'));
/* 战报开关：关 ⇄ 右侧抽屉，按钮只在矮屏档显示（基准档 #log 是常驻左栏） */
(function(){
  const b=document.getElementById('logToggle'); if(!b) return;
  b.addEventListener('click', function(){
    const cls=document.body.classList;
    if(cls.contains('log-open')){ cls.remove('log-open'); b.textContent='战报'; }
    else { cls.add('log-open'); b.textContent='战报·抽屉'; }
  });
})();
/* 抽屉开着时点外面也收起，但要排除 #logToggle，否则一开就被这条关回去 */
document.addEventListener('pointerdown', function(e){
  if(!document.body.classList.contains('log-open')) return;
  const t=e.target;
  if(!t || !t.closest) return;
  if(t.closest('#log') || t.closest('#logToggle')) return;
  closeLogDrawer();
}, true);
document.addEventListener('keydown', function(e){
  if(!G) return;
  const overlay=document.getElementById('overlay');
  const overlayOpen = overlay && !overlay.classList.contains('hidden');
  if(e.key==='Escape'){
    if(overlayOpen){ const x=document.getElementById('overlayCloseX'); if(x && x.style.display!=='none') closeOverlay(); }
    else if(document.body.classList.contains('log-open')) closeLogDrawer();
    else if(aliveEnemies().length>0) openMenu();
    return;
  }
  if(overlayOpen) return;
  if(aliveEnemies().length===0) return;
  if(e.key===' '){ e.preventDefault(); endTurn(); return; }
  const idx=parseInt(e.key,10);
  if(idx>=1 && idx<=9 && G.hand[idx-1]) playCard(idx-1);
});
/* 宿主原生胶囊画在 WebView 之上，z-index 压不过，只能读 API 把自家控件左让 */
function sysSafeInit(){
  const probe = (typeof tt!=='undefined' && tt && tt.getMenuButtonBoundingClientRect) ? tt
              : (typeof wx!=='undefined' && wx && wx.getMenuButtonBoundingClientRect) ? wx
              : (typeof dd!=='undefined' && dd && dd.getMenuButtonBoundingClientRect) ? dd
              : (typeof qq!=='undefined' && qq && qq.getMenuButtonBoundingClientRect) ? qq : null;
  if(!probe) return;
  const apply=function(){
    let rect=null;
    try{ rect=probe.getMenuButtonBoundingClientRect(); }catch(e){ rect=null; }
    if(!rect || typeof rect.left!=='number') return;
    const gap = window.innerWidth - rect.left + 8;
    if(gap>0) document.documentElement.style.setProperty('--sys-cap-r', gap+'px');
  };
  apply();
  window.addEventListener('resize', apply);
  window.addEventListener('orientationchange', apply);
}
sysSafeInit();
loadSave();
loadSettings();
applyLowSpec();
applyPerfReadout();
numPrewarm();
hudIconPrewarm();
pileInit();
trackLaunch();
normalizeSingleRunSave();
/* 首启没见过教程就先走插图过场，老玩家照旧进主菜单 */
document.addEventListener('DOMContentLoaded', function(){ if(!tutorialSeen()) showTutIntro(); else showStartScreen(); });
if(typeof cloudBootCheck === 'function'){ try{ cloudBootCheck(); }catch(e){} }
