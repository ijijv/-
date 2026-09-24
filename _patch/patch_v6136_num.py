# -*- coding: utf-8 -*-
"""v0.61.36 · ② 数字图接缝改四档 + ③ 浮字抖动/闪烁/暴击档

② 素材/num 从「单目录 10 张」改成「四档各 10 张」（共 40 张）：
   num/{dmg,hurt,block,heal}/0-9.png —— 颜色和描边必须画进图里（CSS 的 color/text-shadow 对 <img> 无效）。
   每档**独立探测**：某一档没画完只退那一档，不牵连其他档（40 张全或无的失败面是单档的 4 倍）。

③ 浮字加一层内层 .fx-in：外层 .fx-dmg 继续管位移（fxDmg 的 translate/scale），
   内层管抖动（translateX）与闪烁（filter:brightness）—— transform 不能被两条动画同时抢。
   大伤害档 .crit 与已有暴击音效**同阈值**：抽成 isCritHit() 单一来源，pickHitSfx 与新浮字共用。

图片一张都还没有，改完是「优雅退化」：全程走文字浮字（含抖动，文字一样会抖）。
"""
import io, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
errs = []
_files = {}


def load(rel):
    if rel not in _files:
        raw = io.open(os.path.join(ROOT, rel), encoding='utf-8').read()
        _files[rel] = {'nl': '\r\n' if '\r\n' in raw else '\n', 'body': raw.replace('\r\n', '\n')}
    return _files[rel]


def rep(rel, old, new, tag):
    body = load(rel)['body']
    n = body.count(old)
    if n != 1:
        errs.append('[%s] %s 命中 %d 次，期望 1 次' % (rel, tag, n))
        return
    load(rel)['body'] = body.replace(old, new, 1)


# ═══════════ 1. js/00_base.js：numProbe 分档 + floatDamage 内层 .fx-in / crit ═══════════
B = 'js/00_base.js'

OLD_NUM = """/* v0.61.33 · 伤害浮字的数字素材接缝（素材/num/0.png … 9.png）
   NUM_STATE：0=还没探测 1=图片可用 -1=不可用（含探测中，先按不可用渲染，加载完自动切换） */
let NUM_IMG=null, NUM_STATE=0;
function numProbe(){
  if(NUM_STATE) return NUM_STATE===1;
  if(typeof Image==='undefined' || typeof assetURL!=='function'){ NUM_STATE=-1; return false; }
  NUM_STATE=-1; // 先假定不可用：本次仍用文字，等 10 张全部加载成功再把 NUM_STATE 翻成 1
  try{
    const arr=[]; let left=10, done=false;
    for(let i=0;i<10;i++){
      const im=new Image();
      im.onload=()=>{ if(done) return; if(--left===0){ NUM_IMG=arr; NUM_STATE=1; } };
      im.onerror=()=>{ if(done) return; done=true; NUM_STATE=-1; NUM_IMG=null; };
      im.src=assetURL('num/'+i+'.png');
      arr.push(im);
    }
  }catch(e){ NUM_STATE=-1; NUM_IMG=null; }
  return false;
}
"""

NEW_NUM = """/* v0.61.33 · 伤害浮字的数字素材接缝（素材/num/{dmg,hurt,block,heal}/0.png … 9.png）
   v0.61.36：由「单目录 10 张」改成**四档各 10 张**（共 40 张）——
   颜色和描边必须画进图里（CSS 的 color / text-shadow 对 <img> 无效），所以每档一套。
   每档**独立探测**：某一档没画完只退那一档，不牵连其他档。
   NUM_STATE[k]：0=还没探测 1=图片可用 -1=不可用（含探测中，先按不可用渲染，加载完自动切换） */
/* ⚠️ kind ↔ 目录名的**唯一**映射处（floatDamage 的 kind 取值：'' / 'to-player' / 'block' / 'heal'） */
const NUM_KIND_DIR = { '': 'dmg', 'to-player': 'hurt', 'block': 'block', 'heal': 'heal' };
let NUM_IMG = {}, NUM_STATE = {};
function numKind(kind){ return NUM_KIND_DIR[kind] || 'dmg'; }
function numProbe(kind){
  const k = numKind(kind);
  if(NUM_STATE[k]) return NUM_STATE[k]===1;
  if(typeof Image==='undefined' || typeof assetURL!=='function'){ NUM_STATE[k]=-1; return false; }
  NUM_STATE[k]=-1; // 先假定不可用：本次仍用文字，等这一档 10 张全部加载成功再把 NUM_STATE[k] 翻成 1
  try{
    const arr=[]; let left=10, done=false;
    for(let i=0;i<10;i++){
      const im=new Image();
      im.onload=()=>{ if(done) return; if(--left===0){ NUM_IMG[k]=arr; NUM_STATE[k]=1; } };
      im.onerror=()=>{ if(done) return; done=true; NUM_STATE[k]=-1; NUM_IMG[k]=null; };
      im.src=assetURL('num/'+k+'/'+i+'.png');
      arr.push(im);
    }
  }catch(e){ NUM_STATE[k]=-1; NUM_IMG[k]=null; }
  return false;
}
"""
rep(B, OLD_NUM, NEW_NUM, 'numProbe 分档')

OLD_FD = """function floatDamage(text, kind, anchor){
  if(!fx()) return;
  const span=document.createElement('span');
  span.className='fx-dmg '+kind;
  // v0.61.33：有数字素材就把字形换成图片（0-9 之外的一律回落文字，符号 +/- 保持文字）
  const __sign=/^[+-]/.test(text) ? text[0] : '';
  const __digits=__sign ? text.slice(1) : text;
  if(numProbe() && __digits.length && !/[^0-9]/.test(__digits)){
    if(__sign) span.textContent=__sign;
    for(const ch of __digits){ const im=new Image(); im.className='fx-num'; im.src=NUM_IMG[+ch].src; im.alt=ch; span.appendChild(im); }
  } else {
    span.textContent=text;
  }
  fxLayer().appendChild(span);
"""

NEW_FD = """/* opts.crit：大伤害档（阈值与打击音效同源，见 10_audio.js 的 isCritHit） */
function floatDamage(text, kind, anchor, opts){
  if(!fx()) return;
  const span=document.createElement('span');
  span.className='fx-dmg '+kind+((opts && opts.crit) ? ' crit' : '');
  // v0.61.36：字形统一包一层 .fx-in —— 外层管位移（fxDmg 的 translate/scale），
  // 内层管抖动（translateX）与闪烁（filter），两条动画不抢同一个属性
  const inner=document.createElement('i'); inner.className='fx-in';
  // v0.61.33：有数字素材就把字形换成图片（0-9 之外的一律回落文字，符号 +/- 保持文字）
  const __sign=/^[+-]/.test(text) ? text[0] : '';
  const __digits=__sign ? text.slice(1) : text;
  const __k=numKind(kind);
  if(numProbe(kind) && NUM_IMG[__k] && __digits.length && !/[^0-9]/.test(__digits)){
    if(__sign) inner.textContent=__sign;
    for(const ch of __digits){ const im=new Image(); im.className='fx-num'; im.src=NUM_IMG[__k][+ch].src; im.alt=ch; inner.appendChild(im); }
  } else {
    inner.textContent=text;
  }
  span.appendChild(inner);
  fxLayer().appendChild(span);
"""
rep(B, OLD_FD, NEW_FD, 'floatDamage 内层/crit')

# ═══════════ 2. js/10_audio.js：阈值单一来源 + isCritHit ═══════════
A = 'js/10_audio.js'
rep(A, """/* 按「打在什么上 / 打了多少 / 有没有打死」挑打击层 —— 让听感跟着数值走 */
function pickHitSfx(dmg, blockedAll, killed){
  if(blockedAll) return 'hit_guard';
  if(killed || dmg>=20) return 'hit_crit';
  if(dmg>=10) return 'hit_heavy';
  return 'hit_light';
}
""",
    """/* 打击分级阈值（**单一来源**）：音效与浮字视觉共用，免得两处阈值日后各漂各的 */
const HIT_HEAVY_DMG = 10, HIT_CRIT_DMG = 20;
function isCritHit(dmg, killed){ return !!killed || dmg>=HIT_CRIT_DMG; }
/* 按「打在什么上 / 打了多少 / 有没有打死」挑打击层 —— 让听感跟着数值走 */
function pickHitSfx(dmg, blockedAll, killed){
  if(blockedAll) return 'hit_guard';
  if(isCritHit(dmg, killed)) return 'hit_crit';
  if(dmg>=HIT_HEAVY_DMG) return 'hit_heavy';
  return 'hit_light';
}
""",
    'pickHitSfx 阈值抽取')

# ═══════════ 3. js/30_engine.js：对敌伤害传 crit（唯一新增的 crit 调用点，与音效同址） ═══════════
E = 'js/30_engine.js'
rep(E, """    floatDamage('-'+d, '', el);
""",
    """    // v0.61.36：大伤害浮字档 —— 与上一行 __hk 用的是同一套判据（blockedAll / point / killed 都对齐音效）
    floatDamage('-'+d, '', el, { crit: !__blockedAll && !point && isCritHit(actual, __killed) });
""",
    '对敌伤害 crit')

# ═══════════ 4. 原型.html：CSS 抖动/闪烁/暴击档 ═══════════
H = '原型.html'
rep(H, """  /* v0.61.33：数字素材字形（素材/num/0.png…9.png）。高度按 1.15em 等比缩放，与既有 22px 字号对齐；
     抖动/闪烁特效等图片到位后再补（挂在本类上即可，见待办）。 */
  .fx-num{height:1.15em; width:auto; vertical-align:-.18em; margin:0 -.03em; pointer-events:none;}
""",
    """  /* v0.61.33/36：数字素材字形（素材/num/{dmg,hurt,block,heal}/0.png…9.png，四档共 40 张）。
     高度按 1.15em 等比缩放 → 一套尺寸覆盖全部字号档（含下面的 .crit 28px），文字与图片都用同一套尺寸。 */
  .fx-num{height:1.15em; width:auto; vertical-align:-.18em; margin:0 -.03em; pointer-events:none;}
  /* v0.61.36 · 浮字抖动 + 闪烁（纯 CSS，图片到位前文字一样抖）
     分工：外层 .fx-dmg 管位移（fxDmg 的 translate/scale），内层 .fx-in 管抖动/闪烁 —— 不抢 transform */
  .fx-in{display:inline-block; animation:fxJitter .16s ease-in-out 2;}
  @keyframes fxJitter{0%,100%{transform:translateX(0)}25%{transform:translateX(-2px)}75%{transform:translateX(2px)}}
  /* 大伤害档：与打击音效 hit_crit 同阈值（isCritHit：击杀 或 ≥20）。抖动幅度 ×2 + 闪一下 + 字号抬到 28px；
     数字图随 em 自动缩放，**不需要美术多交一套尺寸**。 */
  .fx-dmg.crit{font-size:28px;}
  .fx-dmg.crit .fx-in{animation:fxJitterBig .18s ease-in-out 3, fxFlash .22s ease-out 1;}
  @keyframes fxJitterBig{0%,100%{transform:translateX(0)}25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}
  @keyframes fxFlash{0%{filter:brightness(2.4)}100%{filter:brightness(1)}}
""",
    'fx CSS 抖动/闪烁')

# ═══════════ 落盘（全或无） ═══════════
if errs:
    print('=== 锚点校验失败，未写入任何文件 ===')
    for e in errs:
        print('  ✗', e)
    sys.exit(1)

for rel, d in _files.items():
    io.open(os.path.join(ROOT, rel), 'w', encoding='utf-8', newline='').write(d['body'].replace('\n', d['nl']))
    print('OK 写入 %s（%d 字符）' % (rel, len(d['body'])))