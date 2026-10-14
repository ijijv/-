/* ============================================================================
 * 志怪塔 · js/60_boot.js —— 启动与局外层
 * 稀有度调试工具 / 开局与起始界面 / 菜单·重开·退出 / 新手引导 / 启动尾块(事件绑定·读档·埋点上线)
 * ----------------------------------------------------------------------------
 * 由 原型.html 的整段内联脚本按原顺序切分而来（v0.61.05 三层重构，纯搬移）。
 * 拼接校验：本文件组去掉各自横幅后，应与切分前的内联脚本正文逐字节一致。
 * 加载：经典外链脚本（非 ES module），双击本地打开即可直接游玩。
 * ============================================================================ */
/* ===================== v1.0.17：UI 皮肤图统一注入 =====================
   用户交付的几张 UI 图（面板旧纸纹 / 头像九宫框 / 名字按钮）用在**CSS 的 background / border-image** 上，
   而单文件产物里 CSS 的 `url(素材/…)` 会 404 —— 打包.py 只把 素材/ 收进 ASSET_MAP（base64），
   并不重写 CSS 里的 url()。所以统一在这里走 assetURL 把真地址写进 :root 的自定义属性，
   CSS 侧一律写成 `var(--ui-xxx, url(素材/…))`（兜底串只服务开发树，与芯片火焰同一套写法）。
   ⚠️ 只写 :root 一次：面板/卡片每次重建都不用再赋值，也不会有节点级样式泄漏。 */
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
      showDragPreview(idx);   // v0.61.20(P3)：箭头锁定了谁，就把预计伤害浮在谁头上
      const r2=eel.getBoundingClientRect();
      aimAt(d.ox, d.oy, r2.left+r2.width/2, r2.top+r2.height/2, true);
    } else {
      setDragTarget(null);
      hideDragPreview();
      hideDragBlock();   // v0.75.0：指向牌走的是箭头分支，头顶的格挡预演必须收掉
      aimAt(d.ox, d.oy, ev.clientX, ev.clientY, false);
    }
  } else {
    d.el.style.pointerEvents='none';
    d.el.style.transform='translate('+dx+'px,'+dy+'px) scale(1.12)';
    /* v0.61.33：打全体 / 不指向的牌虽然不出箭头，但拖过敌人头顶时也照样报预伤（跟随所指目标） */
    const idx2=enemyAtPoint(ev.clientX, ev.clientY);
    if(idx2>=0) showDragPreview(idx2); else hideDragPreview();
    /* v0.75.0：防御牌往上拖够 40px ⇒ 玩家头顶浮出格挡预演。
       ⚠️ 这个 40px 必须与 onDragUp 里 `else if(d.sy-ev.clientY>=40){ play=true; }` 是**同一个阈值**：
          让「出现预演」与「松手会真的打出」严格同刻，否则会看到预演却打不出去。 */
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
  hideDragBlock();   // v0.75.0：松手即隐（与 hideDragPreview 并排）
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
  el.classList.remove('off');
  /* v1.0.10：兜底防出屏（用户 2026-10-03 报「敌人立绘放大后，头顶的预伤浮字溢出屏幕」）。
     本标签的锚点约定是 `top = 锚盒顶` + `translate(-50%,-100%)` ⇒ 整条浮在锚盒**上沿之上**，
     而敌人立绘放大后 elite/boss 的盒顶只剩 ~25px、标签实测高 41px ⇒ 顶边落在 −15px 被裁掉。
     锚点贴顶时把标签整体下压到「标签高 + 2px」以内，任何屏幕尺寸都不再出屏。
     ⚠️ 必须先摘 `.off` 再读 offsetHeight —— `display:none` 时它恒为 0，读出来会算错。 */
  el.style.top=Math.max(r.top, (el.offsetHeight||0)+2)+'px';
}
/* v0.75.0：拖拽防御牌时的**格挡预演** —— 浮在**玩家头部**的蓝色字（用户口径）。
   与 #drag-dmg 是一对并列件：同样零定时器（.off 切换）、同样 translate(-50%,-100%) 的锚点约定。
   数值口径只有 previewBlock() 一套（js/30_engine.js）；算出 0 就不显示（与 previewDamage 的 raw<=0 返 null 同构）。
   ⚠️ 不用 floatDamage（js/00_base.js）—— 它内部有 setTimeout，是「播一下就消失」的飘字；
      预演要的是「跟着指针持续存在、松手即隐」。 */
function hideDragBlock(){
  const el=document.getElementById('drag-block');
  if(el) el.classList.add('off');
}
function showDragBlock(i){
  if(!G || !DRAG) return hideDragBlock();
  const c=G.hand[i];
  if(!c) return hideDragBlock();
  const n=previewBlock(c);
  if(!(n>0)) return hideDragBlock();                 // 反震 / 未升级的佛渡恒 0 ⇒ 什么都不显示
  const anchor=document.querySelector('#player-panel .hero-art-box');
  if(!anchor) return hideDragBlock();
  let el=document.getElementById('drag-block');
  if(!el){ el=document.createElement('div'); el.id='drag-block'; document.body.appendChild(el); }
  /* 字形走 block 档（颜色烤在 PNG 里，与伤害飘字的格挡档同一套）；素材没装/探测中则回落文字 */
  const glyph=numHTML('block', '+'+n);
  if(glyph) el.innerHTML=glyph; else el.textContent='+'+n+' 格挡';
  el.className = DYNAMIC_BLOCK.indexOf(c.id)>=0 ? 'dyn' : '';   // 天师隐神符：抽牌加成算不出 ⇒ 保底值 + 弱化标记
  const r=anchor.getBoundingClientRect();
  el.style.left=(r.left+r.width/2)+'px';
  el.classList.remove('off');
  /* v1.0.10：同 #drag-dmg 的兜底防出屏（同一套 translate(-50%,-100%) 锚点约定）。
     玩家立绘顶实测 51px、标签高 41px ⇒ 目前仍留 10px，但这笔账随立绘 / 屏幕高变动，
     把兜底写在这里，免得下次抬立绘时又冒出一条「格挡浮字出屏」。 */
  el.style.top=Math.max(r.top, (el.offsetHeight||0)+2)+'px';
}
/* 长按卡牌放大查看描述（小屏字小的解决）
   ⚠️ v0.69.0：这里**故意继续读 c.t()（全文）而不是 cardText()/c.ts（牌面短版）** ——
      这是「双层文案」的落点。牌面只有 3 行、34 张牌的机制说明被压成短版，
      但全文一个字都没删，全在这里。**改这行等于把机制说明弄丢**，别顺手统一成 cardText。 */
function showCardZoom(i){
  const c=G.hand[i]; if(!c) return;
  if(DRAG){ DRAG.el.classList.remove('dragging','lift','pressed'); DRAG.el.style.transform=''; DRAG.el.style.pointerEvents=''; DRAG=null; hideDragArrow(); ARROW_TIP=null; setDragTarget(null); }
  document.getElementById('overlayContent').innerHTML=`
    <h2>${c.name}${(c.up||shiWangBoosted(c))?' <span style="color:var(--green)">↑</span>':''} <small style="color:var(--dim);font-size:13px">${TNAME[c.type]} · ${RNAME[c.rarity]}</small></h2>
    <div style="font-size:17px;line-height:1.9;text-align:left;padding:14px 20px;color:#e8dcc0;background:rgba(0,0,0,.22);border-radius:8px;margin:12px 0">${wrapKw(c.t(c.up))}${shiWangBoostTag(c)}${(!c.up && canUpgrade(c))?`<div class="upgrade-preview">升级后 → ${wrapKw(c.t(true))}</div>`:''}</div>
    ${effectiveCost(c)>0?`<p style="color:var(--gold)">符文费用：${effectiveCost(c)}</p>`:''}
    ${isOneUse(c)?`<p style="color:var(--red2);font-weight:bold">消耗 · 每场战斗限用一次，战斗结束后回到牌库</p>`:''}
    <button class="btn ghost" onclick="hideOverlay()">收起</button>`;
  /* v0.65.0：这条是**第二条开面板路径**（绕过 showOverlay 直接写 innerHTML）。
     场景类必须在这里也摘（v0.68.2 补上 .scroll-scene）—— 否则在 #overlay 还带着
     .menu-scene / .map-scene 时长按放大，
     会继承那套「整屏不透明底 + .panel 去掉底色」的样式，卡牌详情变成一张铺满屏幕的裸字。
     今天进战斗必经 showHeroSelect→showOverlay（已会摘），所以现在碰不到；
     但把不变量补在两个入口上是这一处的既定口径（showOverlay 里那条 v0.61.42 注释同理）。
     v0.72.0：顺带补上这里一直漏掉的 .hero-scene，并加上新的 .pick-scene —— 不摘的话，
     从易物选牌小窗长按手牌放大，卡牌详情会变成一张"没有底、字叠在战场立绘上"的裸字。
     v0.75.0：再补上 .forge-scene —— 不摘的话，从锻造页长按牌放大，详情会变成满屏宽、
     描述吃锻造那条红色（.cdesc.upgrade-preview），等于把「红色 = 升级后的效果」这条
     语汇用错地方。
     v0.76.0：再补上 .pile-scene（牌堆列表面板）—— 它和 forge-scene 共用同一条加宽 + grid
     规则，不摘的话从牌堆面板长按牌放大，详情会变成满屏宽的一列。
     同批补上 .result-scene —— 结算页的 `#overlay.result-scene.ov-enter #overlayWrap` 挂着
     `resultRise`（自下升起）。不摘的话，从结算页长按牌放大，详情会带着那套入场位移。 */
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
/* v1.0.13：每个状态前的那枚 emoji 走 iconTag —— 图到了（素材/buff/<id>.png）自动换图，没到逐字节输出原 emoji。
   图标 id 表 = 《美术设计要求.md》§4.1；改名要**两处一起改**（这里 + 文档），否则图取不到。 */
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
/* v1.0.13：玩家立绘**右侧**的极简状态芯片（手机横屏档常显）。
   用户口径（2026-10-05）：「所有负面/增益效果写在角色立绘右边一点；文字可以删掉只保留层数」。
   ⚠️ 只输出层数/数值，颜色区分增/减益，全名与机制进 data-tip 的 kw 提示（沿用仓内 tooltip 约定，
      文字不丢）。顶栏「详情」里的 playerBuffHTML（完整文字）保持不动。
   ⚠️ 基档 .pbuffs{display:none}（原型.html）⇒ 桌面档零改动。 */
function playerBuffChips(){
  /* v1.0.13：第 4 个参数是 buff 图标 id（与 playerBuffHTML 同一张表）。
     没图时 iconTag 返 '' ⇒ 输出与改动前**逐字节相同**，手机档观感不变。 */
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
/* —— 顶栏折叠：默认展开 buff/遗物详情，点击收起 —— */
/* v0.76.1：矮屏（≤560 高，含用户报障的 1016×471）**默认收起**详情 —— 遗物 / 道具 / 召唤物
   一多，那一块会一路长高把战场挤扁（用户报「顶部蓝框高度过高，挤压游戏画面」）。
   桌面档（>560）仍是展开，与改动前一致。
   ⚠️ 这只是「开局那一刻的初值」；用户点过「▾ 详情」之后 toggleTopbar 照旧自由开关。
   ⚠️ 配合 CSS 的 .tb-detail{max-height:22vh/15vh; overflow-y:auto}，详情最高只占视口的一小块。 */
/* v0.76.1：矮屏（高 ≤560，原型.html 的 T-short 档）默认把顶栏详情收起来 ——
   遗物 / 道具 / 召唤物一多，那块蓝框能长到 100px+，把 471px 高的战场挤没
   （用户口径：「顶部蓝框高度过高，挤压游戏画面，缩小信息面板自适应高度」）。
   配套：`.tb-detail{max-height:22vh}`（矮屏 15vh）在展开时也不许无限长。
   ⚠️ 读不到视口高时（Node 冒烟桩的 window.innerHeight 不是正数）**必须回落到 true**：
      否则基准档行为被改掉，冒烟 ③「顶栏默认展开(TOPBAR_OPEN)」与后面 4 条
      详情页断言（遗物 chip / 遗物名 / 召唤物 / 地图场景仍在详情页）会一起红。 */
let TOPBAR_OPEN = (typeof window === 'undefined' || !(window.innerHeight > 0)) ? true : (window.innerHeight > 560);
function toggleTopbar(){ TOPBAR_OPEN=!TOPBAR_OPEN; renderTopbar(); }
/* v1.0.4：召唤物筹码条**全档默认收起**（用户口径），点玩家立绘右下角的折叠键才展开。
   状态必须是模块级 let：render() 每次都重建 #player-panel 的 innerHTML，
   状态留在 DOM 上会「一点就没」（与 TOPBAR_OPEN 同一手法）。
   ⚠️ 桌面档看不到折叠键（基档 `.ps-fold{display:none}`），但筹码条**桌面常驻**（v1.1.x 起，
      用户报障「电脑端看不到召唤物」）⇒ 桌面靠 PSUMMONS_OPEN 之外的那条 `!__narrowSummon` 恒展开。 */
let PSUMMONS_OPEN=false;
function toggleSummonBar(){ PSUMMONS_OPEN=!PSUMMONS_OPEN; render(); }
/* 折叠键上的预读：召 N · 伤 X · 挡 Y · 回 Z（数值为 0 的项不写，键才不会撑宽）。
   伤 = 下一回合末场上召唤物预计总伤害（preSummonDamage，排除五通神）；
   挡 = 下回合开始的预计格挡（preBlockNextTurn，仅苦行武僧非 0）；
   回 = 这回合之后召唤物预计带来的总回复（preSummonHeal，全角色，含吸血/五通神/小鬼/骨铃/渡魂归己）。 */
function summonFoldLabel(list){
  const dmg=preSummonDamage(), blk=preBlockNextTurn(), healN=preSummonHeal();
  return `召 ${list.length}${dmg>0?' · 伤 '+dmg:''}${blk>0?' · 挡 '+blk:''}${healN>0?' · 回 '+healN:''}`;
}
function renderTopbar(){
  const el=document.getElementById('topbar');
  if(!el) return;
  /* v1.0.3：手机横屏档顶栏只留**短写**，完整文字挪进详情（用户口径「状态 chip 长描述收进详情」）。
     ⚠️ `.sb-long` 里必须**逐字**保留改动前的文本（连 `<b>` 的位置也照旧）⇒ 桌面档顶栏逐像素不变；
        `.sb-short` 默认 `display:none`（原型.html 的基档），只有 T-short 档才打开。 */
  const levelLong=`第 <b>${G.act}</b> 幕 · <b>${G.mapRow+1}</b>/${MAP.length} 层`;
  const levelShort=`<b>${G.act}</b>幕 <b>${G.mapRow+1}</b>/${MAP.length}`;
  const deckLong=`牌堆 <b>${G.drawPile.length}</b> / 弃牌 <b>${G.discard.length}</b>`;
  const deckShort=`牌 <b>${G.drawPile.length}</b>/<b>${G.discard.length}</b>`;
  /* 详情里那一行「完整信息」的固定部分（英雄资源那两段要等 preShiqi 算完，放在下面拼）。 */
  const statsFull=`第 ${G.act} 幕 · ${G.mapRow+1}/${MAP.length} 层 · 牌堆 ${G.drawPile.length} / 弃牌 ${G.discard.length}`;
  let html=`
    <span class="stat stat-gold">${iconTag(STAT_ICONS.gold,'<i></i>')}<b>${G.gold}</b></span>
    <span class="stat stat-level"><span class="sb-long">${levelLong}</span><span class="sb-short">${levelShort}</span></span>
    <span class="stat stat-deck"><span class="sb-long">${deckLong}</span><span class="sb-short">${deckShort}</span></span>

`;
  // 预尸气：下一回合召唤物将带来的【尸气】进账（仅茅山赶尸人；0 就不显示）
  const preShiqi=preShiqiNextTurn();
  // 预血怒：下回合末场上小鬼将带来的【血怒】进账（仅血祭阴差；0 就不显示）
  const preXuenu=preXuenuNextTurn();
  // 如果当前角色是茅山赶尸人，显示尸气
  const maxShiQiNow=relicMaxShiqi();   // 尸玉：12 → 15
  const maxXuenuNow=relicMaxXuenu();   // 血玉：10 → 14
  if(G.hero === 'ganshiren') {
    // 尸玉在场：芯片加「蓝色火焰包围」进阶态（.relic-flame-blue，见原型.html）。
    // ⚠️ 火焰精灵图的地址必须内联成 `--chip-flame`（伪元素吃不到 inline style，只有自定义属性继承得进去）；
    //    地址走 fxStripURL()：单文件产物里整键已被按排切走，只有 _r0 存在；它内部再 assetURL(..,true)
    //    把 base64 换成 blob 短地址，顶栏每帧重建也不会重复解析。
    const flameStyle = hasRelic('shiyu') ? ` style="--chip-flame:url('${fxStripURL('fx/shiqi_flame.png')}')"` : '';
    /* v1.0.19：用户口径「预尸气显示在外面，不要折叠起来」—— 原先这段小标写在 `.sb-long` 里，
       手机横屏档 `.stat .sb-long{display:none}` 会把它一起折掉；挪到两个 span 之外即可常显。 */
    const preShiqiTag=preShiqi>0?`<span class="stat-preshiqi" data-tip="kw:预尸气">预+${preShiqi}</span>`:'';
    html += `<span class="stat stat-shiqi${hasRelic('shiyu')?' relic-flame-blue':''}"${flameStyle}>${iconTag('buff/shiqi.png','')}<span class="sb-long">尸气: <b>${G.尸气}/${maxShiQiNow}</b></span><span class="sb-short">尸气 <b>${G.尸气}/${maxShiQiNow}</b></span>${preShiqiTag}</span>`;
  }
  // 如果当前角色是血祭阴差，显示血怒（整局累积资源）
  if(G.hero === 'yincha') {
    // 燃血令：血怒标识旁挂「累积读数」（每满 20 换 1 符文）
    const rageAcc=(hasRelic('ranxueling')?`<span class="stat-rageaccum" data-tip="relic:ranxueling">+${G.rageAccum||0}/20</span>`:'');
    /* v1.0.19：用户口径「预血怒显示在外面，不要折叠起来」—— 与「预尸气」同一做法：
       小标写在 `.sb-long` / `.sb-short` **之外**，手机横屏档 `.stat .sb-long{display:none}` 折不掉它。 */
    const preXuenuTag=preXuenu>0?`<span class="stat-prexuenu" data-tip="kw:预血怒">预+${preXuenu}</span>`:'';
    // 血玉在场：芯片加「紫色火焰包围」进阶态（.relic-flame-purple），同上一段的内联理由
    const flameStyle = hasRelic('xueyu') ? ` style="--chip-flame:url('${fxStripURL('fx/xuenu_flame.png')}')"` : '';
    html += `<span class="stat stat-xuenu${hasRelic('xueyu')?' relic-flame-purple':''}"${flameStyle}>${iconTag('buff/xuenu.png','')}<span class="sb-long">血怒: <b>${G.xuenu||0}/${maxXuenuNow}</b></span><span class="sb-short">血怒 <b>${G.xuenu||0}/${maxXuenuNow}</b></span>${preXuenuTag}${rageAcc}</span>`;
  }
  /* 金刚杵[紫·武僧·t4]：本场战斗累计获得过的格挡读数，照燃血令的「累积 x/20」挂在顶栏（无该遗物不显示，
     不占桌面档版面）。数值满 50 会清零重算，见 30_engine 的 gainBlock 收口点。 */
  if(G.hero === 'wuseng' && hasRelic('jingangchu')) {
    html += `<span class="stat stat-blockaccum" data-tip="relic:jingangchu">${iconTag('buff/block.png','🛡️')}<span class="sb-long">格挡累积: <b>${G.blockAccum||0}/50</b></span><span class="sb-short">累 <b>${G.blockAccum||0}/50</b></span></span>`;
  }
  html += `<button class="tb-toggle" onclick="toggleTopbar()">${TOPBAR_OPEN?'▴ 收起详情':'▾ 详情'}</button>`;
  if(TOPBAR_OPEN){
    const buffs=playerBuffHTML();
    /* v1.1.x（用户口径「顶部栏不再显示灵汁和遗物，相关内容移入锦囊面板」）：
       遗物与灵汁**都不再排进顶栏详情** —— 统一收进「锦囊」入口（题头右侧那枚按钮，
       手机横屏档就在「菜单」正下方）。详情页只留状态徽章与召唤物。 */
    // 召唤物：入详情页；只在战斗中显示（召唤物在 startBattle 时清空）
    const summons=(SCENE==='battle' && G.summons && G.summons.length)?`<div class="tb-summons">${G.summons.map(s=>summonHTML(s)).join('')}</div>`:'';
    /* v1.0.3：顶栏芯片的**完整写法**。这一行只在手机横屏档显示（基档 display:none，
       选择器 `.tb-detail .stat.stat-detail-full` 是为了压过 :1262 的 `.tb-detail .stat`），
       桌面档的四个芯片本来就写着全文 ⇒ 详情里再来一行是重复的，所以基档不给看。 */
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
/* v1.1.x：锦囊入口按钮的图标（图到了自动变 <img>，图没到回落「锦囊」两字）。
   战斗内只有题头竖栏的 #jinnangBtn 一枚；战局外的锦囊是 #outPouch（由 outHudSync 换图）。
   ⚠️ 必须写在 renderTopbar 里逐帧核对：iconTag 的探图是**异步**的（Image.onload 才翻 yes），
      而 #jinnangBtn 是静态 HTML、不会自己重渲染 —— 只在 renderTopbar 里对一次，探到后才会换图。 */
function syncJinnangIcons(){
  const h=iconTag('ui/menu/jinnang-nobg.png','锦囊');
  const b=document.getElementById('jinnangBtn');
  if(b && b.innerHTML!==h) b.innerHTML=h;
}
/* —— 符文图标按英雄换皮（用户口径「每个角色的符文样式」）——
   静态 <img src="素材/rune.png"> 保留为**默认 + 兜底**：打包.py 只内联这一处静态 src，
   单文件产物离线也能出图。运行时按 G.hero 换成 素材/rune_<hero>.png；
   新图缺失时 onerror 回落默认图 —— 绝不出现空白符文。
   ⚠️ 新素材没生成前本函数是**零副作用**的（找不到图就回落，与改动前逐像素相同）。 */
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
/* v1.0.7（手机端性能）：三个面板的 innerHTML 按**内容去重**（写一次、没变就不写）。
   线上取证：修好战报抽屉之后 render() 桌面中位仍有 ~4ms，全部落在三处 innerHTML 赋值上
   （10 张手牌那份 HTML 约 6.7KB，占 ~3ms），其它阶段合计 <1ms。
   而 render() 在敌人回合的每一拍、每次抽牌、每次进场景都会被调用 —— 那些调用里手牌面板
   **逐字节没变**的占大多数，却照样重建一整棵 DOM 树（解析 + 布局 + 该块重绘；手机上还要
   重新解码里面的 <img>，那才是真机掉帧的大头）。
   ⚠️ 输出**逐字节不变**：比较的就是要写进去的那同一个字符串，只是省掉那次赋值。
      字符串变了（手牌增减 / 费用变化 / 血量变化 / 飞行隐身位）照旧整块重建，
      所以不存在「该更新的没更新」。 */
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
  /* v0.70.0：读一次 --rise-unit（敌人上抬幅度的倍率，基准档=1、矮屏档压小）。
     v0.72.0：同一个元素、同一个 computedStyle 对象上再多读一个 --slot-dx-k（横向幅度），
     所以**不产生额外的强制样式重算**；弧线的纵向幅度复用 --rise-unit。
     为什么必须放在这里：每个敌人读一次 getComputedStyle 会付 N 次强制样式重算，
     违反「读一遍→写一遍，中间不读」；render() 开头是唯一合规的位置。 */
  refreshRiseK();
  const hpPct=Math.max(0,G.hp/G.maxHp*100);
  const hpPrev=(PLAYER_HP_PREV===null)?hpPct:PLAYER_HP_PREV;
  /* v1.0.12：这一帧血量比上一帧**涨了** ⇒ 血条走「慢慢涨」慢档 + 玻璃质感（见 原型.html 的 .hpbar.hp-gain）。
     判据用 0.001 的容差而不是严格 >：百分比是浮点，1 点血在 90 上限下是 1.11%，取整误差会误触发。 */
  const hpGain=hpPct>hpPrev+0.001;
  PLAYER_HP_PREV=hpPct;
  const heroObj=(HEROES.find(h=>h.id===G.hero)||{});
  const heroName=heroObj.name||'';
  const heroMech=heroObj.mech||'';
  const preBlock=preBlockNextTurn(); // 预格挡：下回合召唤物预计带来的格挡
  const preHeal=preSummonHeal();     // v1.0.21 预恢复：这回合之后召唤物预计带来的总回复（全角色）
  /* v1.0.3：召唤物筹码条（贴玩家立绘右侧，只显示「短名 数值 · 剩 N」）。
     为什么不放顶栏：v0.76.1 起 vh≤560 的顶栏详情**默认收起**（TOPBAR_OPEN=false），
     详情里的 `.tb-summons` 在手机上永远看不见 —— 这是功能缺口，不是样式问题。
     基档 `display:none`（原型.html）⇒ 桌面档零改动，桌面仍看详情里那一条。 */
  /* v1.0.4：筹码条改「默认收起」，折叠键挂**玩家立绘右下角**（`.hero-art-box` 是 position:relative）。
     ⚠️ 键与筹码条不是二选一：键上**恒有**预读（召 N · 伤 X · 挡 Y），点它才展开/收起筹码条
        —— 用户口径是「不论是否收起，增加召唤物的预伤害和预格挡的提示数值」。 */
  const psList=(G.summons||[]).filter(s=>(s.dur||0)>0);
  const summonFold=(SCENE==='battle' && psList.length)?`<button class="ps-fold" type="button" onclick="toggleSummonBar()">${summonFoldLabel(psList)}</button>`:'';
  /* v1.1.x：筹码条**桌面常驻**（用户报障「电脑端看不到召唤物」）——
     非手机横屏档（即桌面）恒渲染，手机横屏档才由 .ps-fold 的 PSUMMONS_OPEN 控制展开/收起。 */
  const __narrowSummon=(typeof matchMedia==='function') && matchMedia('(max-height:560px) and (min-width:521px)').matches;
  const summonBar=(SCENE==='battle' && psList.length && (PSUMMONS_OPEN || !__narrowSummon))?`<div class="psummons">${psList.map(s=>summonHTML(s)).join('')}</div>`:'';
  /* v1.0.13：玩家立绘右侧的极简状态芯片（只留层数；见 playerBuffChips）。基档不显示 ⇒ 桌面零改动。 */
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
  /* v0.72.0：第二个实参从 `G.enemies.indexOf(e)`（**未过滤**的下标）改成 filter 后的位置。
     弧线的秩是 `存活数-1-pos`，它要求 pos 密集地铺满 0..存活数-1 —— 一旦数组里躺着阵亡的
     敌人（finishEndTurn 之后、render 之前就有这个窗口），未过滤下标会跳号，秩当场错位。
     v0.70.0 用的是 RISE_LIFT[未过滤下标%5]，跳号只影响错落的小数级观感，所以那时无害。 */
  const _shown=G.enemies.filter(e=>alive(e)||e.dying);
  writePanel('enemy', 'enemy-panel', _shown.map((e,i)=>enemyPanelHTML(e, i)).join('') || '<div style="color:var(--dim)">（敌人已清）</div>');
  /* v1.0.4：矮屏「僵王 + 4 小僵尸」共 5 敌在横向装不下 ⇒ 切**网格两行**版式（boss 独占最右一列、
     召唤小怪在它左侧排 2×2）。判据是**算出来的**，不是死阈值：
       可用宽 = innerWidth − #app 左右内边距(6+6) − .battle 的 gap(8) − #player-panel 宽(T-short: clamp(96px,26vh,140px))
       需要宽 = boss 218 + N×84 + N×14（N=召唤小怪数）
     装不下才切：844×390 上可用 728 ≥ 需要 610 ⇒ 仍是一行，那里的版面逐像素不变；
     640×360 上可用只有 484 ⇒ flex 会折成两行、行高被 boss 的 172px 撑住，.battle 涨到 300px、
     .hand-area 底落到 459（越视口底 99px，被 #app{overflow:hidden} 裁掉、手牌点不到）。
     ⚠️ 只有「恰 1 只 boss + 其余**全是** summon 小怪 + 小怪 ≤4」才切：其它组成（如 4 只小怪无 boss）
        列宽对不上，网格帮不上忙，继续走原来的 flex。
     ⚠️ 小怪上限是 4 而不是任意多：版式是「boss 占第 3 列 (第 1~2 行) + 小怪在 1~2 列排 2×2」，
        3 列 × 2 行正好 4 格 —— 第 5 只小怪会被自动放置挤到**第 3 行**，boss 的 span 2 兜不住、
        纵向预算当场破（640×360 下越视口底）。僵王一次召 4 只 ⇒ 5 敌，正好是设计上限。 */
  const _bossN=_shown.filter(e=>e.boss).length;
  const _minionN=_shown.filter(e=>!e.boss && ENEMIES[e.key] && ENEMIES[e.key].summon).length;
  const _ppW=Math.min(140, Math.max(96, window.innerHeight*0.26));
  const _epNeed=218+_minionN*84+_minionN*14;
  _epEl.classList.toggle('ep-grid',
    _bossN===1 && _minionN>=3 && _minionN<=4 && _minionN===_shown.length-_bossN &&
    window.innerHeight<=560 && window.innerWidth>=521 &&
    _epNeed > window.innerWidth-12-8-_ppW);
  /* v0.60：给后排错落留出净空，别顶到顶部栏。
     v0.70.0：从**内联 paddingTop** 改成写 CSS 变量。内联样式 CSS 打不过（除非 !important），
     矮屏档没法把它归零，5 敌时这 62px 会白吃掉矮屏预算的两成。走变量后，
     矮屏档写一条同特异度、书写更后的 `#enemy-panel{padding-top:2px}` 就盖掉了，
     **JS 完全不需要知道当前是哪个档**。
     v0.72.0：弧线位移也要净空，取两者的 max。为什么必须取 max 而不是让弧线自己报：
     这个不变量是「净空 ≥ 实际上抬的最大值」，取 max **由构造保证**它成立
     （RISE_LIFT 与 SLOT_SHAPE 谁大听谁的），漏一个就会让深秩敌人顶进 #topbar。
     battleHeadroom() 仍然被调用（不是死代码），它的返回值本身没变。 */
  _epEl.style.setProperty('--headroom', (2+Math.max(battleHeadroom(), slotHeadroom()))+'px');
  document.getElementById('turn-summary').innerHTML=G.turnSummary || '';
  if(!G.discardSelect && !G.exchange && !G.retainSelect) groupHand();
  writePanel('hand', 'hand', G.hand.map((c,i)=>handCardHTML(c, G.energy<effectiveCost(c), i, G.hand.length)).join('') || '<div style="color:var(--dim)">（无手牌）</div>');
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
  /* v0.72.0：动画开播点。选在 fxReanchor **之前**、render 的收尾处，理由有两条：
     ① 手牌终位只有到这里才存在（开播要量终点），所以它必须在上面所有写操作之后；
     ② 它自己不制造第二次强制布局 —— flush 先读几何、再往**固定定位**的 #anim-layer 里插克隆，
        固定元素不参与主文档流，隐藏终态新卡写的是 opacity（不触发重排）⇒ 紧随的 fxReanchor
        读到的仍是同一份布局。两边谁先谁后对结果无差别，放这里只是让「读几何」都聚在尾部。
     pending 为空时 flush 直接早退，没动画的那些 render（绝大多数）零成本。 */
  Anim.flush();
  /* v0.76.0：台词队列的**第二拍**。分化出来的两只必安在 `splice` 那一刻还没上屏，
     `pumpSay` 会把它们的台词放回队首，等这里再试一次 —— 不用轮询、不用定时器。
     队列空时只是一句判断（绝大多数 render 零成本）。 */
  if(typeof pumpSay==='function') pumpSay();
  if(typeof fxReanchor==='function') fxReanchor();
  /* v1.1.8：战局外常驻 HUD（牌堆 / 锦囊）随场景切换同步显隐 + 牌数刷新。 */
  if(typeof outHudSync==='function') outHudSync();
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
/* v0.76.1：战报抽屉的关闭入口（用户报「打开战报后无法关闭」）。
   在收起抽屉之前，抽屉唯一的开关是顶栏那枚 `#logToggle`；而抽屉铺满整高、盖住右半屏，
   在手机上那枚按钮又被宿主胶囊压着 ⇒ 等于关不掉。
   现在把 ✕ 直接放进抽屉标题行（renderLogBox 里拼），点它 = 收起抽屉 + 复位按钮文案。 */
function closeLogDrawer(){
  document.body.classList.remove('log-open');
  const b=document.getElementById('logToggle'); if(b) b.textContent='战报';
}
/* v1.0.0：关闭件的**事件绑定**不再走 HTML 内联 onclick，改在 `#log` 上做委托 + pointerdown。
   ⚠️ 这是「战报点开就关不上」的真凶之一：renderLogBox 每次都整块换 `el.innerHTML`，
   而战斗里 render() 会被反复调用（敌人回合的每一拍都 render）——手指按下 ✕ 之后、
   抬起之前若恰好来一拍 render，**按钮元素已被换掉**，click 事件根本不会派发到它身上。
   pointerdown 在触屏按下那一刻就派发（元素必然还在），且监听挂在外层 `#log`（它不参与
   innerHTML 替换）⇒ 无论中间重绘多少次都关得掉。 */
(function(){
  const el=document.getElementById('log'); if(!el || !el.addEventListener) return;
  el.addEventListener('pointerdown', function(e){
    const t=e.target;
    if(t && t.closest && t.closest('.log-close')) closeLogDrawer();
  });
})();
/* v1.0.7（手机端性能）：战报抽屉改为**增量拼接**。
   线上取证（2026-10-03，桌面 558×855 / 305 行日志，逐次计时非平均）：render() 中位 6.9ms，
   其中 renderLogBox 独占 5.5ms（≈80%），其余所有阶段加起来 <1ms；日志越长越糟（上限 600 行）。
   而 render() 在敌人回合的每一拍、每次抽牌、每次进场景都会被调用 —— 折算到手机上，
   每次 render 光是重建这 600 行（字符串 + innerHTML 解析 + 强制布局 + 该块重绘）就是
   100~200ms，一帧里跑两三次正好是用户报的「最长帧 297ms / 264ms / longtask 196ms」。
   现在三条路：
     · 内容与筛选项都没变 ⇒ 直接早退，连 scrollTop 都不写（省掉一次强制同步布局）；
     · 只是尾部新增了几行 ⇒ 只把那几行 insertAdjacentHTML 到末尾，并裁掉超出 600 行的最老行；
     · 筛选项变了 / 首次 / 无法增量（一次新增超上限、日志被重置）⇒ 整块重建（老路径）。
   ⚠️ 增量判据必须靠 LOG_SEQ（00_base.js 的 log() 每写一行 ++）：G.log 满 800 后
      push+shift 让它长度恒为 800，「长度没变」分不清「没有新行」和「进一行掉一行」。
   ⚠️ 无头沙箱的 DOM 桩**没有** insertAdjacentHTML ⇒ canAppend 恒假 ⇒ 走整块重建的老路，
      输出与改动前**逐字节相同**（冒烟里那些逐字断言不受影响）。 */
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
  /* v1.0.0：✕ 挪到标题行**最左**。原先它在行末、紧贴视口右沿，而那正是宿主原生胶囊
     （TapTap/微信的退出钮，画在 WebView 之上、z-index 压不过去）的地盘 —— 手机上等于被压着。
     放左端就彻底不依赖 --sys-cap-r 探测成不成功。 */
  const fk=keys.join(',');
  const seq=(typeof LOG_SEQ==='number')?LOG_SEQ:0;
  /* 内容与筛选都没动 ⇒ 什么都不做（绝大多数 render 走这一条：敌人回合的每一拍都 render，
     但一次只写一两行日志，而 #log 那一块的布局/重绘是最贵的一项）。 */
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
  /* v1.0.8：标题行右侧那三枚筛选 chip（伤害 / 获得 / 状态）**取消渲染**（用户口径
     「伤害、获得以及状态的三个栏目可以取消」）。它们在手机上本来就贴视口右沿、
     正落在宿主原生胶囊的地盘上（等于被压着看不见），留着还白占标题行的宽度。
     ⚠️ logCat / LOG_CATS / LOG_FILTER / toggleLogFilter **一个都不删**：
        冒烟有逐条断言（:3300-3311）；而且 LOG_FILTER 现在恒为空 ⇒ keys 恒为空数组
        ⇒ logRowHTML 的 hide 判据永假 ⇒ **每条日志都照常显示**，行为与「空选=全部」完全一致。 */
  el.innerHTML='<div class="log-head">'
    +'<button class="log-close" type="button" title="收起战报" aria-label="收起战报">✕</button>'
    +'⚔ 战报</div>'
    +G.log.slice(-LOG_MAX_ROWS).map(x=>logRowHTML(x,keys)).join('');
  LOG_RENDER={ seq:seq, filterKey:fk, domRows:Math.min(LOG_MAX_ROWS, G.log.length) };
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

/* ===================== 选角界面重构（v1.1.13 · 用户 2026-10-13 定稿） =====================
   整屏：立绘背景（contain 完整放入、缝隙纯黑）+ 底部中央 4 张符纸波浪错落
   + 左上角色文案 + 顶部中央【入门符纸】数量 + 右上初始牌组图标
   + 左下「返回主菜单」/ 右下「开始游戏」（大号红色毛笔纯字）。
   ⚠️ 结构与样式在 原型.html 的 `.hs-*` 段；这里只管状态与拼 HTML。
   ⚠️ 只沿用 `hero-scene` 一个场景类（verify_dist.py §三-11 钉死「CSS 放宽 + JS 摘除」成对；
      `#overlay.hero-scene #overlayWrap{max-width:700px}` 基档那条仍在，别删）。 */
const HS_ORDER=['tianshi','wuseng','ganshiren','yincha'];   // 符纸左→右：天师·苦僧(武僧)·赶尸人·阴差
const HS_BG={ 'tianshi':'hero_sel/tianshi-s.jpg', 'wuseng':'hero_sel/wuseng-s.jpg',
              'ganshiren':'hero_sel/ganshiren-s.jpg', 'yincha':'hero_sel/yincha-s.jpg' };
const HS_LOGO={ 'tianshi':'logo/tianshi-logo.png', 'wuseng':'logo/wuseng-logo.png',
                'ganshiren':'logo/ganshiren-logo.png', 'yincha':'logo/yincha-logo.png' };
const HS_EMOJI={ 'tianshi':'🀄', 'wuseng':'🧘', 'ganshiren':'👻', 'yincha':'🩸' };
const HS_WAVE=[10,4,16,7];   // 每张符纸基准起伏位移 px（错落但不互相遮挡）
const HS_RISE=[8,12,6,10];   // 未选中时上抬的"不等的短距离" px（选中则下沉）
/* 特殊名词配色（用户口径「血祭用红色」等）。长词在前，避免「血」吞掉「血怒」。 */
const HS_TERMS=[['召唤单位','#f0b07f'],['诅咒','#c9a0ff'],['咒印','#c9a0ff'],['血怒','#ff6b6b'],
  ['血祭','#ff6b6b'],['尸气','#7fe0b0'],['尸骸','#7fe0b0'],['尸王','#ffcf6a'],['尸傀','#f0b07f'],
  ['召唤','#f0b07f'],['格挡','#7fc8f0']];
let HS_SEL=null, HS_LP=null;   // HS_SEL=当前选中角色；HS_LP=牌组图标长按定时器
function hsEscape(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
/* 术语着色：按最长优先建一条交替正则，一次 replace 完事（避免反复 replace 叠成嵌套 span）。 */
function hsTermHTML(s){
  const esc=hsEscape(s||'');
  const terms=HS_TERMS.slice().sort((a,b)=>b[0].length-a[0].length);
  const pat=new RegExp('('+terms.map(t=>t[0]).join('|')+')','g');
  return esc.replace(pat, m=>{ const t=terms.find(x=>x[0]===m); return t?`<span style="color:${t[1]}">${m}</span>`:m; });
}
function hsHero(id){ return HEROES.find(x=>x.id===id) || HEROES[0]; }
function hsLocked(id){ return !mileOn('hero', id); }
function hsDeckChoice(){ return (SAVE && SAVE.starterDeck===1) ? 1 : 0; }
/* 该角色该组的初始牌组：仅阴差第 2 组走备用表，其余一律原初始卡组。 */
function hsDeckListFor(id, which){ return (id==='yincha' && which===1) ? starterDeckList(1) : heroDeck(id); }
function hsInfoInner(h){
  return `<div class="hs-name">${hsEscape(h.name)}</div>`
    + `<div class="hs-mech">${hsTermHTML(h.mech||'')}</div>`
    + `<div class="hs-passive">${hsTermHTML(h.passive||h.desc||'')}</div>`;
}
function hsTicketInner(){ return artImg('ui/rumenfuzhi.png','','') + `<b>${mileTickets()}</b>`; }
function hsBgImg(id, drop){
  return `<img class="hs-bg${drop?' hs-bgdrop':''}" src="${assetURL(HS_BG[id], true)}" draggable="false" alt="" onerror="this.style.display='none'">`;
}
function hsTalismanImg(id){ return artImg(HS_LOGO[id], `<div class="hs-tl-emoji">${HS_EMOJI[id]||'🀄'}</div>`, ''); }
/* 右上牌组图标：阴差已领 t4 ⇒ card1/card2 一对可点切换；其余角色一张 back.png（点击无效、长按展开）。 */
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
  /* setBg 会按 PRE_RUN_BG 表**保留** body.at-menu ⇒ `#app` 仍不渲染（此刻 run 还没开始）：
     这条是 v0.68.2 修掉的空骨架 bug，别放它回来。 */
  setBg('hero_select.jpg');
  HS_SEL=(G && G.hero && HS_ORDER.indexOf(G.hero)>=0) ? G.hero : 'tianshi';
  showOverlay(hsRootHTML(), false, 'hero-scene');
}
/* 点符纸 = 选中：旧符纸上抬、新符纸下沉（就地切 .sel 触发 CSS transition），背景从顶降落并弹跳。 */
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
  const tkb=document.querySelector('#hs-ticket b'); if(tkb) tkb.textContent=mileTickets();
  root.classList.toggle('hs-locked', hsLocked(id));
}
/* 解锁 / 符纸数变化后的轻量刷新（不重播背景降落）。 */
function hsRefreshTicket(){
  const root=document.getElementById('hs-root'); if(!root) return;
  root.classList.toggle('hs-locked', hsLocked(HS_SEL));
  const tkb=document.querySelector('#hs-ticket b'); if(tkb) tkb.textContent=mileTickets();
  const deck=document.getElementById('hs-deck'); if(deck) deck.innerHTML=hsDeckHTML(hsHero(HS_SEL));
}
/* —— 右上牌组图标：长按 250ms 展开预览；短按=切换（仅阴差 t4 可切）。 —— */
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
/* 长按展开：阴差 t4 = 两层（上 card1 / 下 card2）；其余角色 = 一层。缩略图复用 starterDeckThumbs。 */
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
/* 右下「开始游戏」：已解锁直接进；未解锁弹「消耗 1 张入门符纸解锁」，无符纸则不可进。 */
function heroSelectStart(){
  const h=hsHero(HS_SEL); if(!h) return;
  sfx('key_press');
  if(mileOn('hero', HS_SEL)){
    /* v1.1.15：已有存档 ⇒ 先弹覆盖提示（继续=为旧档补败局结算并删档；返回=回选角）。 */
    if(hasRunSave()){ askOverwriteSave(HS_SEL); return; }
    pickHero(HS_SEL); return;
  }
  if(mileTickets()<1){ sfx('error'); floatMsg('没有【入门符纸】'); return; }
  askConfirm(`消耗 1 张【入门符纸】解锁【${hsEscape(h.name)}】？<br>当前持有 ${mileTickets()} 张。`, ()=>{
    if(unlockHeroWithTicket(HS_SEL)){
      log(`使用入门符纸解锁角色【${h.name}】`);
      floatMsg(`已解锁【${h.name}】 · 剩 ${mileTickets()} 张`);
      hsRefreshTicket();
    } else { sfx('error'); floatMsg('解锁失败'); }
  });
}
function pickHero(id){
  G.hero=id;
  const h=HEROES.find(x=>x.id===id);
  /* v1.1.13（用户 2026-10-13）：初始牌组改在选角界面右上角选定（见 hsDeck*）；
     这里按 SAVE.starterDeck 取组 —— 非阴差 / 未领 t4 一律取原初始卡组。 */
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
/* ===================== 阴差 t4「血怒流」初始牌组（v1.1.5；v1.1.13 改由选角界面右上角选定） =====================
   备用组：饮血刃×3/金刚符×2/焚身咒×1/佛渡×1/噬魂术×1/血契×1/守一×1/渡魂归己×1。
   缩略卡图直接复用 cardBody（唯一牌面渲染器），靠 CSS `.sd-thumb .card{transform:scale}` 缩放。 */
const YINCHA_STARTER_ALT=[['yinxueren',3],['jingang',2],['fenshenzhou',1],['fodu',1],['shihun',1],['xueqi',1],['shouyi',1],['duhunguiji',1]];
function starterDeckList(which){
  if(which!==1) return heroDeck('yincha');
  const d=[]; YINCHA_STARTER_ALT.forEach(([cid,n])=>{ for(let i=0;i<n;i++) d.push(cardById(cid)); });
  return d;
}
function starterDeckThumbs(list){
  return list.map(c=>`<div class="sd-thumb"><div class="card has-frame ${RCOLOR[c.rarity]}">${cardBody(c)}</div></div>`).join('');
}
/* —— 「返回上一步」（显式 rollback，不只是重渲染）—— */
function heroSelectToMenu(){                 // 选角 → 主菜单
  G.hero=null; G.deck=[]; G.openingPicks=null;
  showStartScreen();
}
function backToHeroSelect(){                 // 开局抉择 → 选角
  G.hero=null; G.deck=[]; G.openingPicks=null;
  showHeroSelect();
}
/* v1.1.15：存档**单档化** —— 不再挑槽、不再有存档管理面板。
   「入塔」直接开新局态并保留旧档（供选角后的覆盖提示）；「续」由 resumeRun 直进续档。 */
function startGame(){
  ensureAudio();
  confirmNewGame();
}
/* v1.1.15：主菜单「续」—— 直进续档（单档 ⇒ 永远是 0 号槽），不再开面板。 */
function resumeRun(){ ensureAudio(); continueRun(); }
function confirmNewGame(opts){
  try {
    /* v1.1.15：默认**保留旧档**（heroSelectStart 的覆盖提示要读它）；
       仅「重新开始」显式传 {clear:true} 时才清档。 */
    if(opts && opts.clear) clearRunSave(0);
    setRunSlot(0);
    RUN_FINISHED=false;                // v1.0.17b：新局开工 ⇒ 解除「已终结」拒写（见 40_flow.js saveRun 守卫）
    G=newState(); G.mapRow=0;
    G.startTs=Date.now();                        // v1.0.1：本局开局时刻（结算时算本局用时，随存档往返）
    G.accMs=0; G.t0=Date.now();                  // v1.1.x：计时两段式复位（新局从 0 起算，锚点=此刻）
    const __sd=rngSeedNow(); seedRng(__sd);      // v0.61.06：本局种子（可用 ?seed=N 复现）
    G.mapSeed=__sd; buildActs(__sd); G.mapRow=0; // v0.61.40：按种子生成本局三幕随机地图
    track('runStart');
    if(SAVE.signInBonus>0){ G.gold=SAVE.signInBonus; SAVE.signInBonus=0; persistSave(); log('开局携带签到奖励 '+G.gold+' 金币'); }
    showHeroSelect();
  } catch(e){ console.error('confirmNewGame error:', e); showStartScreen(); }
}
/* ===================== v1.1.15：覆盖存档提示（单档化） =====================
   选角点「开始游戏」且已有存档时弹出：大号毛笔红主提示 + 中号毛笔红警告 +
   小号毛笔白旧档三段信息（角色/进度/血量），左下绿「继续」、右下红「返回」。
   全部纯文字、无边框无纯色底板（样式见 原型.html #overlay.overwrite-scene）。 */
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
  // 临时设置奖励层级为starter，以便使用正确的权重
  const originalRewardTier = G.rewardTier;
  G.rewardTier = 'starter';

  /* v1.1.1（t3 · 天师真传）：领取该档后，开局抉择改为**本角色全部牌库自由挑选一张**
     （未领取前仍是 3 张 starter 权重随机三选一）。带 mile 的专属牌同样要已领取才进池。
     v1.1.3（t4 · 尸王真传）：茅山赶尸人同一套机制（ganshiren_t4），只是**不能选【尸王】**
     —— 尸王这张牌在游戏里既不遇也不抽（weightedCard 已恒排），此处同样排除。 */
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

  // 检查这一轮奖励中是否有金卡
  const hasGoldInReward = picks.some(card => card.rarity === 'gold');

  // 存储补偿值更新信息供后续使用
  G.lastOpeningRewardHadGold = hasGoldInReward;

  // 恢复原来的奖励层级设置
  G.rewardTier = originalRewardTier;

  const cards=picks.map((c,i)=>`<div class="card has-frame ${RCOLOR[c.rarity]}" onclick="askPickOpening(${i})">${cardBody(c)}</div>`).join('');
  const poolCls='reward-cards'+(freePick?' free-pool':'');
  const tip = freePick
    ? (G.hero==='ganshiren'
        ? '尸王真传：从本角色全部牌库中自由挑选一张加入起始牌组（不能选尸王，或跳过）。'
        : '天师真传：从本角色全部牌库中自由挑选一张加入起始牌组（或跳过）。')
    : '天师赠你一道符，挑一张加入起始牌组（或跳过）。';
  /* v1.0.1：广告入口隐藏 —— 摘掉「看广告 · 重随一次」。rerollOpening / adPlaceholder 本体保留。 */
  /* v1.1.13：初始牌组已在选角界面选定 ⇒ 开局抉择的上一步恒为「选角」。 */
  const backFn='backToHeroSelect()';
  showOverlay(`<h2>开 局 抉 择</h2><p>${tip}</p><div class="${poolCls}">${cards}</div>
    <button class="btn ghost" onclick="${backFn}">返回上一步</button>
    <button class="btn ghost" onclick="skipOpening()">跳过</button>`);
}
function pickOpening(i){
  const c=G.openingPicks[i];
  /* v1.1.2（用户报「上把升级的五雷法印，下把开局抉择里也是升级的」）：
     天师真传(freePick)的备选池是 `CARDS.filter(...)` 的**引用**，直接 push 进牌组后
     forgeCard 写的 `c.up=true` 会落回卡表本体 ⇒ 下一局这张牌一进池就带升级态。
     入池一律换成副本（cardById 已是浅拷贝且 up 置 false），与 weightedCard 的其它入池口同口径。 */
  G.deck.push(c ? cardById(c.id) : c);
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
   v1.0.14：排行榜入口（is-leaderboard）连同 js/56_rank.js 一并删除 ⇒ 符纸行只剩「图鉴」「设置」。
   签到整块取消（用户：『没有实际意义』）。
   ⚠️ 版本号字符串必须留在 <h2> 里（提交.py 的 read_version() 读 原型.html，但三处保持一致是项目惯例）。
   ⚠️ 「续」不再按 hasRunSave() 条件渲染，而是**总是渲染、无存档则 disabled** —— 石碑忽隐忽现会破构图。 */
function showStartScreen(){
  if(typeof settleVidDrop==='function') settleVidDrop();   // v1.1.x：结局视频末帧会透进菜单黑幕 12%，进菜单必摘
  setBg('menu');
  /* v1.1.x：setBGM 会真的去 new Audio()/load()/play()（真机上的音频 I/O），
     它若抛异常会**截断整个函数** ⇒ 下面的 showOverlay 不执行 ⇒ 只剩 #bg（menu 底图）+ at-menu，
     整屏空白（用户 2026-10-11 报的「回主界面卡住」）。背景音乐本来就不该拖垮界面渲染。 */
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
    <button class="btn ghost" onclick="viewAchievements()">成就 · 收藏</button>
    <button class="btn ghost" onclick="viewMilestones()">里程碑 · 解锁</button>`);
}
function manualSave(){
  saveRun(); sfx('gold'); floatMsg('已存档');
}
/* ===================== v1.0.5：性能读数（诊断用 HUD） =====================
   用途：真机（手机）上排查卡顿 —— USB 远程调试走不通时的替代方案。
   屏幕**右上角**显示（与左上角的 #ver-tag 对称的角落位）：FPS、本窗口最长帧、longtask 次数/最长。
   ⚠️ 四条硬约束：
     1) **默认关**（SETTINGS.perfReadout=false）⇒ 桌面档、冒烟宿主行为完全不变；
     2) 加载期不得无条件调用 requestAnimationFrame / PerformanceObserver（冒烟宿主是 DOM 桩），
        全部收进 perfStart()，仅开关打开时才执行，且 PerformanceObserver 走 typeof 保护；
     3) 只加新全局、**不碰任何既有函数体**（尤其 render 一字未动）；
     4) HUD 是 position:fixed + pointer-events:none ⇒ 完全不进布局流，不会挤动任何面板。 */
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
         lastText:'', lastCls:'' };   // v1.1.17：记住上次写到屏上的文本/类名，没变就不碰 DOM
  /* longtask：一次超过 50ms 的主线程任务（浏览器默认阈值），与「卡一下」的主观感受最贴合 */
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
  /* FPS 就取 rAF 的实际帧间隔 —— 掉帧/长帧天然体现在间隔里，不必包装 render 去测耗时。 */
  PERF.tick=function(){
    if(!PERF) return;
    const now=perfNow(), gap=now-PERF.last; PERF.last=now; PERF.frames++;
    if(gap>PERF.maxGap) PERF.maxGap=gap;
    if(now-PERF.lastPaint>=500){                 // v1.1.17：0.5 秒最多刷 1 次（原 250ms → 更省）
      PERF.lastPaint=now;
      const span=Math.max(1, now-PERF.t0);
      const fps=PERF.frames*1000/span;
      if(PERF.el){
        const txt='FPS '+fps.toFixed(0)+' · 最长帧 '+PERF.maxGap.toFixed(0)+'ms · longtask '+PERF.longN
          +(PERF.longMax?('(峰'+PERF.longMax.toFixed(0)+'ms)'):'');
        /* v1.1.17：文本/类名与上次相同就不写 —— 少了 4Hz 的无谓 DOM 变更与重排。 */
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
    <button class="btn ghost" onclick="showTutorial(1)">查看新手引导</button>
    <button class="btn ghost" onclick="showCloudPanel()">云存档</button>
    <button class="btn ghost" onclick="menuBack()">返回菜单</button>`, undefined, 'scroll-scene');
}
/* 榜 单（v1.0.19 · v1.1.x 换皮为「风云榜」）—— 6 个榜：通关计时总榜 + 4 个角色分榜 + 整局总分榜。
   数据源**一个字未改**：本机榜在 40_flow.js（readClearTimes / readScores），
   全平台榜在 55_cloud.js（RANK_BOARDS / rankFetch / rankSubmit / rankOpenThis）。
   入口两处：主界面右下角皇榜卷轴（rankOpen）与设置页的「榜单」按钮（showClearTimes）。
   设计换皮依据：Design Chinese Fantasy Leaderboard / GAME_MIGRATION.md §5。 */
let RANK_VIEW='clear_total';
let RANK_SRC='online';     // 'online' = 天下榜（TapTap 全平台） | 'local' = 本机记录
let RANK_PERIOD='week';    // 'week' = 本周 | 'all' = 历来（本机榜按 ts 过滤；全平台榜由后台定周期）
/* v1.1.x：本机榜「我的最佳战绩」用的真名真头像（rankSelf 探测到的 TapTap 昵称/头像，异步回填）。 */
let RANK_SELF_CACHE={name:'', avatar:''};
const RANK_CAT={clear_total:'通关总榜', clear_tianshi:'符箓天师', clear_ganshiren:'赶尸人',
                clear_wuseng:'武僧', clear_yincha:'阴差', total_score:'整局总分'};
/* 角色印章：符 / 尸 / 禅 / 冥（替换现代奖牌，见 GAME_MIGRATION.md §1）。 */
function rankSeal(hero){
  return ({tianshi:'符', ganshiren:'尸', wuseng:'禅', yincha:'冥'})[hero] || '◇';
}
function rankInt(n){ return String(Math.round(n||0)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
function rankDateStr(ts){
  if(!ts) return '—';
  const d=new Date(ts);
  return (d.getMonth()+1)+'.'+(d.getDate()<10?'0':'')+d.getDate();
}
/* v1.1.x：榜单的返回按钮原先写死 showSettings()，从主界面直接进榜时会绕回设置页。
   按 at-menu 判来处：主菜单体系回主界面，否则回设置。 */
function rankBack(){
  const atMenu=!!(document.body && document.body.classList && document.body.classList.contains('at-menu'));
  if(atMenu) showStartScreen(); else showSettings();
}
/* 主界面右下角皇榜入口：先闪一圈金光（.is-lighting → rankEntryGlow），再切进风云榜。
   ⚠️ 光必须先放完 —— showOverlay 会把 overlayContent.innerHTML 整块换掉，菜单那颗按钮当场不存在，
      所以这里用定时器等光散尽（与 CCS 的 .42s 同拍），而不是让 showClearTimes 立刻接管。 */
function rankOpen(btn){
  if(MENU_BUSY) return;
  menuBusy(true);
  sfx('rank');                            // v1.1.x：皇榜展开换成用户交付的 rank 采样（素材缺则合成兜底）
  if(btn && btn.classList) btn.classList.add('is-lighting');
  const off=menuFxOff();
  setTimeout(function(){ menuBusy(false); showClearTimes(); }, off?40:340);
}
/* 本机记录：按当前榜的角色 + 周期过滤（排序沿用 readClearTimes 的用时升序 / readScores 的得分降序）。 */
function rankLocalList(b){
  const lim=Date.now()-7*24*3600*1000;
  const src=(b.kind==='score')?readScores():readClearTimes();
  return src.filter(r=>!b.hero||r.hero===b.hero)
            .filter(r=>RANK_PERIOD!=='week'||(r.ts||0)>=lim);
}
/* 行数据统一形状（本机 / 全平台两路归一）。
   v1.1.x 两处改动：
     ① **真名真头像**：全平台行直接用 TapTap 返回的 nickname/avatar；本机行用 rankSelf 探测到的
        当前玩家昵称/头像（拿不到回落「我」），不再写「道友」「无名道人」。
     ② **「1 秒通关」脏数据**：早期版本按「秒」提交过一批成绩，全平台 clear 榜里会混入 1~59 秒的
        假记录（本游戏不可能 60 秒内通关）⇒ 展示时按用时榜口径过滤掉 < 60s 的条目。
   self = { name, avatar, rank, score }（rankSelf + loadCurrentPlayerLeaderboardScore 合体，可缺省）。 */
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
/* 风云榜整屏场景（'rank-scene'）。两处入口共用；切榜 / 切来源 / 切周期都重走这里。 */
function showClearTimes(view){
  if(view) RANK_VIEW=view;
  const b=(typeof rankBoardById==='function')?rankBoardById(RANK_VIEW)
        :{id:'clear_total', name:'通关计时 · 总榜', kind:'clear', hero:''};
  const online=(typeof rankAvailable==='function') && rankAvailable();
  /* 非 TapTap 环境（浏览器 / PWA / 本地双击）拿不到全平台榜 ⇒ 默认落在「本机记录」，
     不让玩家一进来就看到一屏诊断串（真机上 online 为真，两页都能看）。 */
  if(!online) RANK_SRC='local';
  const boards=(typeof RANK_BOARDS!=='undefined'?RANK_BOARDS:[]);
  const cats=boards.map(x=>`<button class="rk-cat${x.id===b.id?' on':''}" onclick="showClearTimes('${x.id}')">
      <span class="sym">${rankSeal(x.hero)}</span>${RANK_CAT[x.id]||x.name}${x.id==='clear_total'?'<span class="tag">总</span>':''}</button>`).join('');
  const best=rankLocalBest(b);
  /* v1.1.x：本机榜的「我」用 TapTap 真实昵称 + 头像（rankSelf 异步回填，见 rankSelfFill）；
     拿不到就回落「我」，不再写「无名道人」。 */
  const myName=(RANK_SELF_CACHE.name||'我');
  const myAv=RANK_SELF_CACHE.avatar;
  const mineTxt = best
    ? `<span class="rk-myrank">我的<small>最佳战绩</small></span>
       <span class="rk-seal${myAv?' rk-av':''}" id="rk-myav">${myAv?`<img src="${myAv}" alt="">`:rankSeal(best.hero)}</span>
       <span class="rk-mynm"><b id="rk-mynm">${myName}</b><small>${heroName(best.hero)}</small></span>
       <span class="rk-num">${b.kind==='score'?rankInt(best.score):fmtMMSS(best.ms)}<small>${b.kind==='score'?'整局得分':'通关用时'}</small></span>
       <span class="rk-num">${b.kind==='score'?((best.win)?'通关':'第'+((best.act)||1)+'幕止步'):rankInt(best.score)}<small>${b.kind==='score'?'结果':'整局得分'}</small></span>`
    : `<span class="rk-mynm" style="margin-left:2px">本机暂无战绩 —— 打上塔顶，用时就会记在这里。</span>`;
  /* v1.1.x：已按用户要求去掉「上传最佳成绩」按钮 —— 通关 / 结算时自动提交（见 recordClearTime / recordScoreRun）。 */
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
  /* v1.1.13：切榜 / 切来源 / 切周期都会整屏重排（innerHTML 全换），左侧大类导航的滚动位置会被
     复位到顶 ⇒ 手机横屏档「整局总分榜」压在导航底部，每次点一下都得重新下滑才看得到。
     重排前先记下当前 nav 的 scrollTop，重排后回填到同一个位置。 */
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
/* 角色名（图鉴 / 榜单 / 结算多处引用，保留）。 */
function heroName(id){ return (HEROES.find(x=>x.id===id)||{}).name||id||'—'; }
/* 当前榜的「本机最好成绩」：clear 榜按角色过滤取最快；score 榜取最高分。 */
function rankLocalBest(b){
  if(b.kind==='score') return readScores()[0]||null;
  return readClearTimes().filter(r=>!b.hero||r.hero===b.hero)[0]||null;
}
/* v1.1.x：异步回填「我的」真名 / 头像（rankSelf 探测结果）——
   榜单是先 showOverlay 再填，所以这里只改现存 DOM 节点（节点不在就安静返回），不重排整屏。 */
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
    /* v1.1.8：tap 上没有取用户信息的方法时（真机回报：仍显示「道友」+ 无头像），
       退一步用**官方排行榜接口**取「我在本榜的名次」—— loadCurrentPlayerLeaderboardScore
       按官方口径会带回当前玩家的 nickname/avatar，且不走「好友关系」隐私授权。
       这一路只需基础库 ≥1.8.0（排行榜本来就要求），比猜 tap 上的取用户方法确定性高得多。 */
    if((RANK_SELF_CACHE.name && RANK_SELF_CACHE.avatar) || typeof rankSelfScore!=='function') return;
    rankSelfScore(RANK_VIEW).then(mine=>{
      if(!mine) return;
      RANK_SELF_CACHE.name=RANK_SELF_CACHE.name||String(mine.nickname||mine.name||'');
      RANK_SELF_CACHE.avatar=RANK_SELF_CACHE.avatar||String(mine.avatar||mine.avatarUrl||'');
      paint();
    }, ()=>{});
  }, ()=>{});
}
/* 全平台榜那一块：有接口 ⇒ 拉前排填进新面板的 #rk-table / #rk-pod；
   没接口 ⇒ 把探测到的真实方法名亮出来（真机回报一次就能定接口）。
   ⚠️ 面板是「先 showOverlay 再填」——因为 rankFetch 是异步的，
      所以这里只读 DOM、不做布局假设（元素不在就安静返回）。
   v1.1.x：并发取「我」的真实昵称 / 头像（rankSelf）与「我在此榜的名次」（rankSelfScore），
           合体成 self 交给 rankRows ⇒ 真名真头像 + 标出本账号那一行。 */
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
    /* 把「我的名次/头像」并进去：rankSelf 的昵称优先，缺项用 loadCurrentPlayerLeaderboardScore 补齐。 */
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
/* 打开 TapTap 自带的排行榜页面（官方 UI）。失败只浮字提示，不影响本机榜。 */
function rankOpenThis(boardId){
  const b=rankBoardById(boardId||RANK_VIEW);
  rankOpenBoard(b.id).then(()=>{}, e=>floatMsg(String((e&&e.message)||e)));
}
/* v1.1.x：「上传最佳成绩」按钮已按用户要求移除（成绩在通关 / 结算时自动提交）。 */
/* 清空本机记录的入口已按用户要求移除（不再提供「删除本地数据」按钮）。 */
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
    ? `<button class="btn" onclick="markTutorialSeen(); closeOverlay();">完成</button>`
    : `<button class="btn" onclick="showTutorial(${i+1})">下一步</button>`;
  const back = i>1 ? `<button class="btn ghost" onclick="showTutorial(${i-1})">上一步</button>` : '';
  /* v1.0.20：**必须走 closeOverlay() 而不是 hideOverlay()** —— 引导可以从「主菜单 → 设置」里打开，
     那一刻 body.at-menu 还在，只 hideOverlay 会把 #app 留在隐藏态 ⇒ 全黑卡死（用户 2026-10-08 报）。 */
  const skip = `<button class="btn ghost" onclick="markTutorialSeen(); closeOverlay();">跳过引导</button>`;
  showOverlay(`<h2>入门引导 · ${i}/${TUTORIAL_STEPS.length} · ${s.t}</h2><p style="text-align:left;line-height:2">${s.html}</p>${btn}${back}${skip}`);
}
function resumeGame(){
  if(aliveEnemies().length>0) hideOverlay();
  // v0.62.0：从菜单/结算回到地图页也算「重新进入」，走进场动画（缓停在本局当前那一层）
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
/* v0.76.0：点两个牌堆看内容。
   ⚠️ 用 addEventListener 而不是 HTML 内联 onclick：内联的全局函数名要靠 打包.py 的
      「内联 onclick 全局名保护」才不被混淆改名，addEventListener 走闭包直引、零依赖。
   ⚠️ 不会干扰出牌拖拽：pointermove/pointerup/pointercancel 是绑在 document 上的，
      onDragUp 在 !DRAG 时早返回 —— 给 .pile 加 click 不改变这条路径。 */
document.getElementById('pile-draw').addEventListener('click', ()=>showPile('draw'));
document.getElementById('pile-discard').addEventListener('click', ()=>showPile('discard'));
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
/* v1.0.0：抽屉开着时，点抽屉**外面**任何地方也收起它 —— 手机上的抽屉惯例，
   也是「关不掉」的最后一道保险（哪怕 ✕ 被宿主控件挡住也走得掉）。
   ⚠️ 必须排除 #logToggle：否则「点开关打开抽屉」会被这条立刻关回去（开关自己那一拍在冒泡时先跑，
      这里再关一次就等于永远打不开）。用捕获阶段是为了先于其它 pointerdown 逻辑生效，
      但它只是切一个 class，与出牌拖拽、地图拖拽互不干扰（它们各自判自己的目标）。 */
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
    else if(document.body.classList.contains('log-open')) closeLogDrawer();   // v1.0.0：Esc 也收抽屉
    else if(aliveEnemies().length>0) openMenu();
    return;
  }
  if(overlayOpen) return;
  if(aliveEnemies().length===0) return;
  if(e.key===' '){ e.preventDefault(); endTurn(); return; }
  const idx=parseInt(e.key,10);
  if(idx>=1 && idx<=9 && G.hand[idx-1]) playCard(idx-1);
});
/* ===================== v0.76.1 系统胶囊避让（TapTap/抖音/微信小游戏） =====================
   宿主小游戏在右上角画一枚**原生胶囊**（退出/更多），它是画在 WebView 之上的一层原生控件，
   网页里的 z-index 压不过去 —— 主菜单那三枚法器、战斗页顶栏右侧的按钮组会被它实实在在挡住。
   只能把自家控件往左让：读宿主 API 拿胶囊的 left，换算成「距右边缘多少 px」写进 CSS 变量
   `--sys-cap-r`（原型.html 里三条规则靠它右移：.title-actions / .menu-row-talis / #log 头部）。

   ⚠️ 平台探测顺序 tt(TapTap) → wx(微信) → dd(抖音) → qq，任意一家有 getMenuButtonBoundingClientRect 就用它；
      纯浏览器（四个都不存在）直接 return，`--sys-cap-r` 保持 CSS 里的默认 0px ⇒ 网页端版面零变化。
   ⚠️ 尺寸变化（横竖屏切换、TapTap 侧边栏收起）会改胶囊位置，resize / orientationchange 都要重算。
   ⚠️ 不 try 兜底就拿不到 rect 时**不要**瞎写一个值：宁可保持 0px（最多被挡），也不要把版面推歪。 */
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
    const gap = window.innerWidth - rect.left + 8;   // +8：留一点呼吸，别贴着胶囊沿
    if(gap>0) document.documentElement.style.setProperty('--sys-cap-r', gap+'px');
  };
  apply();
  window.addEventListener('resize', apply);
  window.addEventListener('orientationchange', apply);
}
sysSafeInit();
loadSave();
debugMaxMile();   // v1.1.16：里程碑调试拉满（临时调试开关，正式发版移除；无头沙箱里自跳过）
loadSettings();
applyLowSpec();
applyPerfReadout();   // v1.0.5：恢复上次的性能读数开关（默认关，桌面零变化）
numPrewarm();   // v0.61.41：四档字形开局就预加载 —— 否则本局第一次飘字必然回落文字
applyCosmetics();
pileInit();     // v0.69.0：把 back.png / side.png 的地址写进 CSS 变量（抽牌堆·弃牌堆）
trackLaunch();
normalizeSingleRunSave();   // v1.1.15：单档化收敛 —— 旧多档只留最新那份，搬进 0 号槽
document.addEventListener('DOMContentLoaded', showStartScreen);
/* v0.76.2 云存档：非 TapTap 环境直接 return；TapTap 端延迟 2s 拉一次云端列表，
   若云端比本机新（换设备 / 清缓存），弹一次「恢复云端存档」。 */
if(typeof cloudBootCheck === 'function'){ try{ cloudBootCheck(); }catch(e){} }
