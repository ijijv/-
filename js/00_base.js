/* ============================================================================
 * 志怪塔 · js/00_base.js —— 公共基础层
 * 工具 / 飘字提示 / 战斗特效(juce) / 出卡动效 / 受击分层 / Boss 战前过场
 * ----------------------------------------------------------------------------
 * 由 原型.html 的整段内联脚本按原顺序切分而来（v0.61.05 三层重构，纯搬移）。
 * 拼接校验：本文件组去掉各自横幅后，应与切分前的内联脚本正文逐字节一致。
 * 加载：经典外链脚本（非 ES module），双击本地打开即可直接游玩。
 * ============================================================================ */
/* ===================== 工具 ===================== */
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function log(msg){ if(!G) return; G.log.push(msg); if(G.log.length>800) G.log.shift(); }

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

/* ===================== 战斗特效（juice：伤害飘字 / 受击震屏 / 敌人抖动） ===================== */
let HITFX = { enemies: new Set() };
let PLAYER_HP_PREV = null;
let ENEMY_HP_PREV = {};
function fxLayer(){
  let el=document.getElementById('fx-layer');
  if(!el){ el=document.createElement('div'); el.id='fx-layer'; document.body.appendChild(el); }
  return el;
}
function floatDamage(text, kind, anchor){
  if(!fx()) return;
  const span=document.createElement('span');
  span.className='fx-dmg '+kind;
  span.textContent=text;
  fxLayer().appendChild(span);
  if(anchor){
    const r=anchor.getBoundingClientRect();
    span.style.left=(r.left+r.width/2)+'px';
    span.style.top=(r.top+r.height*0.4)+'px';
  } else {
    span.style.left='50%'; span.style.top='28%';
  }
  setTimeout(()=>span.remove(), 950);
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
    if(state==='hit'||state==='attack') setTimeout(function(){ box.classList.remove('hero-'+state); },350);
  }
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
  if(c.type==='attack'){
    let targetEl=null;
    if(!needsTarget(c)){ targetEl=document.getElementById('enemy-panel'); }
    else { const t=curEnemy(); if(t) targetEl=document.querySelector('#enemy-panel .enemy[data-uid="'+t.uid+'"]'); }
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
  const r=p?p.getBoundingClientRect():null;
  const x=r?r.left+r.width/2:window.innerWidth*0.28;
  const y=r?r.top+r.height*0.45:window.innerHeight*0.3;
  const s=Math.max(130, (r?r.width:180)*1.25);
  const d=document.createElement('div'); d.className='fx-halo';
  d.style.left=x+'px'; d.style.top=y+'px'; d.style.width=s+'px'; d.style.height=s+'px';
  fxLayer().appendChild(d);
  setTimeout(()=>d.remove(), 650);
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

