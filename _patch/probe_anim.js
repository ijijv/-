// v0.72.0 步 6 验收：动画地基在无头下必须是**彻底的空操作**，且不留定时器。
// 用法: node _patch/probe_anim.js
const vmh = require('./vm_host');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const extra = `
;(function(){
  const R = { ok:[], bad:[] };
  const t = (cond, label) => (cond ? R.ok : R.bad).push(label);

  // 1. 无头判据
  t(animLive() === false, 'animLive() 在沙箱里为假（window.innerWidth 不存在）');
  t(typeof window.innerWidth !== 'number', '沙箱确实没有 window.innerWidth');

  // 2. push 必须丢弃载荷，而不是攒着
  Anim.push({ items:[{ html:'<div class="card"></div>', from:{cx:1,cy:1,w:10,h:10}, to:{cx:2,cy:2,w:20,h:20} }] });
  t(Anim.pending.length === 0, '无头下 Anim.push() 直接丢弃（pending 恒空）');
  Anim.flush();
  t(Anim.pending.length === 0 && Anim.busy() === false, 'flush() 是空操作，没有在飞的批次');
  Anim.skip();
  t(Anim.flights.length === 0 && Anim.busy() === false, 'skip() 是空操作，不抛错');

  // 3. 不得碰 DOM：#anim-layer 不能被创建
  let made = null;
  const _ce = document.createElement;
  document.createElement = function(tag){ if(String(tag).toLowerCase()==='div') made = made || []; made.push(1); return _ce.call(document, tag); };
  Anim.push({ items:[{ html:'x', from:{cx:0,cy:0,w:1,h:1}, to:{cx:0,cy:0,w:1,h:1} }] });
  Anim.flush();
  Anim.skip();
  document.createElement = _ce;

  // 4. 常量与壳函数形态
  t(typeof flyCardHTML === 'function' && typeof flyFaceHTML === 'function', 'flyCardHTML / flyFaceHTML 已定义');
  const h = flyCardHTML('<i>F</i>', 165, 250);
  t(h.indexOf('width:165px') > 0 && h.indexOf('height:250px') > 0, 'flyCardHTML 把终点尺寸写进内联样式');
  t(h.indexOf('fly-inner') > 0 && h.indexOf('fly-front') > 0 && h.indexOf('fly-back') > 0 && h.indexOf('<i>F</i>') > 0,
    'flyCardHTML 结构与卡面都齐（inner / front / back / 卡面）');
  // 克隆里的牌面：真的走 cardBody，且**不含** onpointerdown 与 --rot
  // （cardText 要读 G.hero，先起一个最小状态）
  G = newState(); G.hero = 'ganshiren'; G.hand = []; G.deck = []; G.drawPile = []; G.discard = [];
  const c = (typeof cardById === 'function') ? cardById('leifu') : null;
  if(c){
    const f = flyFaceHTML(c);
    t(f.indexOf('has-frame') > 0 && f.indexOf('class="cost"') > 0, 'flyFaceHTML 产出真牌面（cardBody 生效）');
    t(f.indexOf('onpointerdown') < 0 && f.indexOf('--rot') < 0, '静态牌面不含 onpointerdown / --rot');
  } else { R.bad.push('cardById 不可用，取不到样本卡'); }
  t(flyFaceHTML(null) === '', 'flyFaceHTML(null) 返回空串，不抛错');

  // 5. 关键：整段地基不得留下任何一个定时器
  //    做法：把 setTimeout 计数清零后再跑一遍所有入口，看有没有新增。
  let timers = 0;
  const _st = window.setTimeout;
  window.setTimeout = function(){ timers++; return _st.apply(this, arguments); };
  Anim.push({ items:[{ html:'x', from:{}, to:{} }] });
  Anim.flush(); Anim.skip(); Anim.stop('k'); Anim.busy();
  flyFaceHTML(c); flyCardHTML('', 132, 200);
  t(timers === 0, '所有动画入口在无头下新增定时器数 = 0（实测 ' + timers + '）');
  window.setTimeout = _st;

  // 6. 跳过监听不得被挂上（无头下 play 根本走不到 animBindSkip）
  t(_animSkipBound === false, '无头下没有绑定 window 的 pointerdown 跳过监听');

  // 7. v0.72.0 步 7：抽牌 / 洗牌两个接入器在无头下同样必须空操作，
  //    且**绝不能污染 NEW_CARDS** —— 一旦写进去，handCardHTML 就会多出 data-new，
  //    冒烟那几条「卡面逐字节」的断言的地基就没了。
  t(typeof animDrawQueued === 'function' && typeof animShuffleQueued === 'function',
    'animDrawQueued / animShuffleQueued 已定义');
  t(typeof animRect === 'function' && typeof animHandEls === 'function', 'animRect / animHandEls 已定义');
  t(typeof animDiscardQueued === 'function', 'animDiscardQueued 已定义');
  t(typeof animExchangeCast === 'function' && typeof animExchangeQueued === 'function' && typeof animHandElAt === 'function',
    '步 9 的易物三件（animExchangeCast / animExchangeQueued / animHandElAt）已定义');
  t(ANIM_DUR && ANIM_DUR.draw > 0 && ANIM_DUR.discard > 0 && ANIM_DUR.shuffle > 0 && ANIM_DUR.exchange > 0 && ANIM_DUR.cast > 0,
    'ANIM_DUR 五个时长齐备');
  t(PULSE_GOLD.indexOf('224,179,65') > 0 && PULSE_CINNABAR.indexOf('214,64,44') > 0,
    '两档光晕配色常量都在（金 / 朱砂）');

  // 直接调两个接入器：既不入队也不碰 DOM
  animDrawQueued([c]);
  animShuffleQueued();
  t(Anim.pending.length === 0, '无头下两个接入器都不入队');
  t(NEW_CARDS.has(c) === false, '无头下 animDrawQueued 不写 NEW_CARDS');
  t(Anim.flights.length === 0, '无头下 animDiscardQueued 也不起批次（它走的是 play 而非 push）');

  // 步 9：易物两段在无头下同样必须空操作。animHandElAt 会碰到沙箱的**桩元素**
  //（没有 children / classList），所以它必须自带守卫而不是靠调用方兜 —— 这条就是钉它的。
  const hEl = animHandElAt(0);
  t(hEl === null, 'animHandElAt 在桩元素上返回 null 而不是抛异常');
  t(animHandElAt(-1) === null, 'animHandElAt(-1) 返回 null');
  animExchangeCast(c, 0);
  animExchangeQueued(c, c, { cx: 1, cy: 1, w: 10, h: 10 });
  t(Anim.pending.length === 0 && Anim.flights.length === 0, '无头下易物两段都不入队、不起批次');
  t(NEW_CARDS.has(c) === false, '无头下 animExchangeQueued 不写 NEW_CARDS');

  // 走一次**真实**的 drawCards（它内部会调 animDrawQueued）：状态变更必须照旧同步
  G.drawPile = [c];
  const before = G.hand.length;
  drawCards(1);
  t(G.hand.length === before + 1, 'drawCards 的状态变更仍然同步（动画不参与）');
  t(NEW_CARDS.has(G.hand[G.hand.length - 1]) === false, '真实抽牌路径下 NEW_CARDS 仍为空');
  const hh = handCardHTML(G.hand[G.hand.length - 1], false, 0, 1);
  t(hh.indexOf('data-new') < 0, 'handCardHTML 无头下不含 data-new（输出与旧版逐字节相同）');
  t(hh.indexOf('class="cost"') > 0 && hh.indexOf('cardPointerDown') > 0 && hh.indexOf('has-frame') > 0,
    'handCardHTML 仍产出既有三个锚点（cost / cardPointerDown / has-frame）');

  // animRect 的兜底：沙箱没有 getComputedStyle ⇒ 必须回落成 bbox 尺寸而不是 NaN
  const rr = animRect(document.createElement('div'));
  t(rr && isFinite(rr.cx) && isFinite(rr.w) && rr.w > 0, 'animRect 在无 getComputedStyle 时回落成 bbox 尺寸');
  t(animRect(null) === null, 'animRect(null) 返回 null');
  t(animHandEls([]).length === 0, 'animHandEls([]) 返回空数组');

  // 8. 这两个接入器同样不得留下定时器
  let timers2 = 0;
  const _st2 = window.setTimeout;
  window.setTimeout = function(){ timers2++; return _st2.apply(this, arguments); };
  animDrawQueued([c]); animShuffleQueued(); Anim.flush(); drawCards(1); animShuffleQueued(); animDiscardQueued(G.hand.slice());
  animExchangeCast(c, 0); animExchangeQueued(c, c, { cx: 0, cy: 0, w: 1, h: 1 }); animHandElAt(0);
  t(timers2 === 0, '抽牌 / 洗牌 / 弃牌 / 易物接入器新增定时器数 = 0（实测 ' + timers2 + '）');
  window.setTimeout = _st2;

  __report = R;
})();
`;

const r = vmh.load(path.join(ROOT, '原型.html'), extra);
if (r.sandbox.__boom) { console.log('BOOM:\n' + r.sandbox.__boom); process.exit(1); }
const R = r.sandbox.__report;
R.ok.forEach(s => console.log('  ok   ' + s));
R.bad.forEach(s => console.log('  FAIL ' + s));
console.log('\n' + R.ok.length + ' ok / ' + R.bad.length + ' fail');
process.exit(R.bad.length ? 1 : 0);