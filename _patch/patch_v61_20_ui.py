# -*- coding: utf-8 -*-
# v0.61.20 批3 —— 第三刀：界面层
#   P1 结束回合软提示（renderEndTurnHint + 设置项 endTurnHint）
#   P2 地图路径连线（drawMapLinks：暗线=全部合法连边 / 金虚线=现在可走 / 金实线=已走）
#   P3 拖拽受击预览（showDragPreview/hideDragPreview，接进 onDragMove/onDragUp）
#   P5 战报筛选 chip（logCat 分类 + renderLogBox；顺带修掉「一回合的日志挤成一坨」）
#   P6 长按放大卡面显示「升级后」对比行
import io, sys, subprocess, os

ROOT = r"C:\Users\HP\Desktop\志怪塔"
FILES = ['原型.html', 'js/10_audio.js', 'js/50_ui.js', 'js/60_boot.js']
buf = {f: io.open(os.path.join(ROOT, f), 'r', encoding='utf-8', newline='').read() for f in FILES}
log = []

def sub(f, old, new, label):
    c = buf[f].count(old)
    if c != 1:
        print('ANCHOR FAIL [%s] %d 次' % (label, c)); sys.exit(1)
    buf[f] = buf[f].replace(old, new, 1); log.append(label)

# ============================================================
# 设置项默认值
# ============================================================
sub('js/10_audio.js',
    "let SETTINGS = { sound:true, musicVol:0.32, sfxVol:1, lowSpec:false };",
    "let SETTINGS = { sound:true, musicVol:0.32, sfxVol:1, lowSpec:false, endTurnHint:true }; // v0.61.20(P1)：endTurnHint 结束回合软提示开关",
    'P1 设置项默认值')

sub('原型.html',
    '  #log .log-chip.on{background:var(--gold); border-color:var(--gold); color:#241a10; font-weight:bold;}\n',
    '  #log .log-chip.on{background:var(--gold); border-color:var(--gold); color:#241a10; font-weight:bold;}\n'
    '  #log .log-line{margin:1px 0;}\n',
    'P5 日志行样式')

# ============================================================
# P2 地图路径连线
# ============================================================
sub('js/50_ui.js',
    '  let html=`<h2>${ACT_NAMES[G.act-1]}</h2>${runStatusHTML()}<p style="font-size:13px">第 ${G.mapRow+1}/${MAP.length} 层 · 只能走进相邻列的节点，规划好路线。</p>`;\n',
    '  let html=`<h2>${ACT_NAMES[G.act-1]}</h2>${runStatusHTML()}<p style="font-size:13px">第 ${G.mapRow+1}/${MAP.length} 层 · 只能走进相邻列的节点，规划好路线。</p>`;\n'
    '  // v0.61.20(P2)：路径连线画在这层 svg 里（绝对定位铺满 .map-wrap，行本身仍是普通按钮）\n'
    '  html+=`<div class="map-wrap"><svg class="map-lines" id="map-lines" aria-hidden="true"></svg>`;\n',
    'P2 showMap 开 svg 容器')

sub('js/50_ui.js',
    '  html+=`<div style="margin-top:12px"><button class="btn ghost" onclick="openMenu()">菜单（重开 / 退出）</button></div>`;\n  showOverlay(html);\n}',
    '  html+=`</div>`; // 收 .map-wrap\n'
    '  html+=`<div style="margin-top:12px"><button class="btn ghost" onclick="openMenu()">菜单（重开 / 退出）</button></div>`;\n'
    '  showOverlay(html);\n'
    '  // 行布局完成后才有坐标可量，所以推到下一帧再画\n'
    '  try{ requestAnimationFrame(drawMapLinks); }catch(e){ drawMapLinks(); }\n'
    '}\n'
    '/* v0.61.20(P2)：地图路径连线。\n'
    '   三种线：暗线 = 所有合法连边（|列差|≤1，看得见「地图是张网」）；\n'
    '           金虚线 = 现在这一步能走到的；金实线 = 已经走过的。\n'
    '   锚点用 (mapRow-1, mapCol) 而不是只看 mapPath —— 这样**没有 mapPath 的老存档**也画得出「可达」。 */\n'
    'let _mapLinkBound=false;\n'
    'function drawMapLinks(){\n'
    '  const svg=document.getElementById(\'map-lines\');\n'
    '  if(!svg || !svg.parentNode || !svg.parentNode.querySelectorAll) return;\n'
    '  const wrap=svg.parentNode;\n'
    '  const rows=Array.prototype.slice.call(wrap.querySelectorAll(\'.map-row\'));\n'
    '  if(!rows.length || !rows[0].getBoundingClientRect) return;\n'
    '  const wb=wrap.getBoundingClientRect();\n'
    '  svg.setAttribute(\'viewBox\',\'0 0 \'+wb.width+\' \'+wb.height);\n'
    '  svg.setAttribute(\'width\',wb.width); svg.setAttribute(\'height\',wb.height);\n'
    '  while(svg.firstChild) svg.removeChild(svg.firstChild);\n'
    '  // DOM 顺序自上而下 = 层号自高而低，所以第 k 行是 MAP[MAP.length-1-k]\n'
    '  function nodeAt(r,c){\n'
    '    const row=rows[MAP.length-1-r]; if(!row) return null;\n'
    '    const cells=row.querySelectorAll(\'.map-node\');\n'
    '    const el=cells[c]; if(!el || (el.classList && el.classList.contains(\'empty\'))) return null;\n'
    '    const b=el.getBoundingClientRect();\n'
    '    if(!b.width && !b.height) return null;\n'
    '    return { x:b.left-wb.left+b.width/2, y:b.top-wb.top+b.height/2 };\n'
    '  }\n'
    '  function seg(a,b,cls){\n'
    '    if(!a||!b) return;\n'
    '    const my=(a.y+b.y)/2;\n'
    '    const p=document.createElementNS(\'http://www.w3.org/2000/svg\',\'path\');\n'
    '    p.setAttribute(\'d\',`M ${a.x} ${a.y} C ${a.x} ${my}, ${b.x} ${my}, ${b.x} ${b.y}`);\n'
    '    p.setAttribute(\'class\',cls);\n'
    '    svg.appendChild(p);\n'
    '  }\n'
    '  for(let r=0;r<MAP.length-1;r++){\n'
    '    for(let c=0;c<MAP[r].length;c++){\n'
    '      if(!MAP[r][c]) continue;\n'
    '      for(let c2=0;c2<MAP[r+1].length;c2++){\n'
    '        if(!MAP[r+1][c2] || Math.abs(c2-c)>1) continue;\n'
    '        seg(nodeAt(r,c), nodeAt(r+1,c2), \'link-dim\');\n'
    '      }\n'
    '    }\n'
    '  }\n'
    '  const path=G.mapPath||[];\n'
    '  for(let i=0;i<path.length-1;i++) seg(nodeAt(path[i].r,path[i].c), nodeAt(path[i+1].r,path[i+1].c), \'link-past\');\n'
    '  if(G.mapRow>0){\n'
    '    const a=nodeAt(G.mapRow-1, G.mapCol);\n'
    '    for(let c=0;c<MAP[G.mapRow].length;c++){\n'
    '      if(!MAP[G.mapRow][c] || Math.abs(c-G.mapCol)>1) continue;\n'
    '      seg(a, nodeAt(G.mapRow,c), \'link-reach\');\n'
    '    }\n'
    '  }\n'
    '  if(!_mapLinkBound && typeof window!==\'undefined\' && window.addEventListener){\n'
    '    _mapLinkBound=true;\n'
    '    window.addEventListener(\'resize\',()=>{ if(document.getElementById(\'map-lines\')) drawMapLinks(); });\n'
    '  }\n'
    '}',
    'P2 drawMapLinks')

# ============================================================
# P3 拖拽受击预览
# ============================================================
sub('js/60_boot.js',
    '    if(idx>=0){\n'
    '      const eel=document.querySelector(\'#enemy-panel .enemy[data-uid="\'+G.enemies[idx].uid+\'"]\');\n'
    '      setDragTarget(eel);\n',
    '    if(idx>=0){\n'
    '      const eel=document.querySelector(\'#enemy-panel .enemy[data-uid="\'+G.enemies[idx].uid+\'"]\');\n'
    '      setDragTarget(eel);\n'
    '      showDragPreview(idx);   // v0.61.20(P3)：箭头锁定了谁，就把预计伤害浮在谁头上\n',
    'P3 onDragMove 显示预览')

sub('js/60_boot.js',
    '    } else {\n'
    '      setDragTarget(null);\n'
    '      aimAt(d.ox, d.oy, ev.clientX, ev.clientY, false);\n'
    '    }\n',
    '    } else {\n'
    '      setDragTarget(null);\n'
    '      hideDragPreview();\n'
    '      aimAt(d.ox, d.oy, ev.clientX, ev.clientY, false);\n'
    '    }\n',
    'P3 onDragMove 隐藏预览')

sub('js/60_boot.js',
    '  hideDragArrow();\n  ARROW_TIP=null;\n  setDragTarget(null);\n  if(play) playCard(d.i);\n}\n',
    '  hideDragArrow();\n  ARROW_TIP=null;\n  setDragTarget(null);\n  hideDragPreview();\n  if(play) playCard(d.i);\n}\n'
    '/* v0.61.20(P3)：拖拽受击预览 —— 箭头锁定目标时，目标头顶浮出这张牌的预计伤害。\n'
    '   数字直接取自卡面徽章那套 previewDamage()，不另开口径（徽章不显示的「平伤牌」这里也照样给数）。 */\n'
    'function hideDragPreview(){\n'
    '  const el=document.getElementById(\'drag-dmg\');\n'
    '  if(el) el.classList.add(\'off\');\n'
    '}\n'
    'function showDragPreview(idx){\n'
    '  if(!G || !DRAG) return hideDragPreview();\n'
    '  const c=G.hand[DRAG.i]; const e=G.enemies[idx];\n'
    '  if(!c || !e) return hideDragPreview();\n'
    '  const eel=document.querySelector(\'#enemy-panel .enemy[data-uid="\'+e.uid+\'"]\');\n'
    '  const pv=previewDamage(c);\n'
    '  if(!eel || !pv) return hideDragPreview();\n'
    '  let el=document.getElementById(\'drag-dmg\');\n'
    '  if(!el){ el=document.createElement(\'div\'); el.id=\'drag-dmg\'; document.body.appendChild(el); }\n'
    '  if(pv.miss){ el.textContent=\'⚠ \'+pv.miss+\' · 落空\'; el.className=\'weak\'; }\n'
    '  else {\n'
    '    const aoe=(c.id===\'wanjian\'||c.id===\'baigui\')?\' 全体\':\'\';\n'
    '    const per=pv.perTurn?\' 每回合\':\'\';\n'
    '    el.textContent=\'-\'+pv.d+aoe+per;\n'
    '    el.className = pv.weak ? \'weak\' : \'\';\n'
    '  }\n'
    '  const r=eel.getBoundingClientRect();\n'
    '  el.style.left=(r.left+r.width/2)+\'px\';\n'
    '  el.style.top=r.top+\'px\';\n'
    '  el.classList.remove(\'off\');\n'
    '}\n',
    'P3 预览函数 + onDragUp 收尾')

# ============================================================
# P6 长按放大：补「升级后」对比行
# ============================================================
sub('js/60_boot.js',
    '    <div style="font-size:17px;line-height:1.9;text-align:left;padding:14px 20px;color:#e8dcc0;background:rgba(0,0,0,.22);border-radius:8px;margin:12px 0">${wrapKw(c.t(c.up))}</div>\n',
    '    <div style="font-size:17px;line-height:1.9;text-align:left;padding:14px 20px;color:#e8dcc0;background:rgba(0,0,0,.22);border-radius:8px;margin:12px 0">${wrapKw(c.t(c.up))}'
    '${(!c.up && canUpgrade(c))?`<div class="upgrade-preview">升级后 → ${wrapKw(c.t(true))}</div>`:\'\'}</div>\n',
    'P6 长按放大·升级后对比')

# ============================================================
# P5 战报筛选 chip + P1 结束回合软提示
# ============================================================
sub('js/60_boot.js',
    "  const _logBox=document.getElementById('log');\n"
    "  if(_logBox){ _logBox.innerHTML='<div class=\"log-head\">⚔ 战报</div>'+G.log.slice(-600).map(x=>x.indexOf('——')===0?('<div class=\"log-sep\">'+x+'</div>'):x).join(''); _logBox.scrollTop=_logBox.scrollHeight; }\n",
    "  renderLogBox();   // v0.61.20(P5)：筛选 chip + 每行独立成块（原先各行直接 join('') 会挤成一坨）\n"
    "  renderEndTurnHint(); // v0.61.20(P1)\n",
    'P5/P1 接进 render')

sub('js/60_boot.js',
    'function showHeroSelect(){',
    '''/* ===================== 战报筛选（v0.61.20 P5） =====================
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

function showHeroSelect(){''',
    'P5/P1 模块')

sub('js/60_boot.js',
    '    <button class="btn ghost" onclick="toggleLowSpec()">${SETTINGS.lowSpec?\'关闭流畅模式\':\'开启流畅模式\'}</button>\n',
    '    <button class="btn ghost" onclick="toggleLowSpec()">${SETTINGS.lowSpec?\'关闭流畅模式\':\'开启流畅模式\'}</button>\n'
    '    <p style="margin-top:16px">结束回合软提示：<b style="color:${SETTINGS.endTurnHint!==false?\'var(--green)\':\'var(--red)\'}">${SETTINGS.endTurnHint!==false?\'开\':\'关\'}</b></p>\n'
    '    <button class="btn ghost" onclick="toggleEndTurnHint()">${SETTINGS.endTurnHint!==false?\'关闭软提示\':\'开启软提示\'}</button>\n',
    'P1 设置页开关')

sub('js/60_boot.js',
    'function toggleLowSpec(){\n  SETTINGS.lowSpec=!SETTINGS.lowSpec; persistSettings(); applyLowSpec(); showSettings();\n}\n',
    'function toggleLowSpec(){\n  SETTINGS.lowSpec=!SETTINGS.lowSpec; persistSettings(); applyLowSpec(); showSettings();\n}\n'
    'function toggleEndTurnHint(){ // v0.61.20(P1)\n'
    '  SETTINGS.endTurnHint = (SETTINGS.endTurnHint===false); persistSettings(); renderEndTurnHint(); showSettings();\n'
    '}\n',
    'P1 开关函数')

# ---------- 写盘 ----------
print('--- 待写文件 ---')
for f in FILES:
    p = os.path.join(ROOT, f)
    now = io.open(p, 'r', encoding='utf-8', newline='').read()
    if buf[f] == now:
        continue
    if not p.endswith('.js'):
        io.open(p, 'w', encoding='utf-8', newline='').write(buf[f]); print('OK  %s' % f); continue
    tmp = p + '.check.js'
    io.open(tmp, 'w', encoding='utf-8', newline='').write(buf[f])
    r = subprocess.run(['node', '--check', tmp], capture_output=True, text=True)
    if r.returncode != 0:
        os.remove(tmp); print('NODE CHECK FAIL', f); print(r.stdout, r.stderr); sys.exit(1)
    os.replace(tmp, p)
    print('OK  %s' % f)

print('\n--- %d 处改动 ---' % len(log))
for i, x in enumerate(log, 1): print('%2d. %s' % (i, x))
