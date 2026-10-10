// 志怪塔 · 新增遗物逐件生效探针（v1.0.13）
// 用户口径：「新加的遗物我刚刚玩了几件，似乎没有生效……你去检查一下，以及所有。」
// 做法：载入开发源（原型.html + js/*）到 vm_host 沙箱，把探针体**追加进同一段脚本**，
//   于是它能直接读到脚本作用域的 G / hasRelic / dealDamageTo（顶层 function 是全局，但 let G 不是）。
//   结果经 window.__report 带出沙箱。
const path = require('path');
const { load } = require('./vm_host.js');

const BODY = `
var R = [];
function ok(n, cond, got){ R.push((cond ? 'PASS  ' : 'FAIL  ') + n + (cond ? '' : '  (got ' + got + ')')); return cond; }
function info(n, v){ R.push('INFO  ' + n + '  ' + v); }
function fresh(hero, relics){
  G = newState(); G.hero = hero; G.relics = relics || []; G.hp = 50; G.maxHp = 50; return G;
}
function mkEnemy(o){
  var base = { uid:'u1', key:'test', name:'试', kind:'ghost', hp:100, maxHp:100, block:0, pingbi:0,
    curse:0, charm:0, strength:0, affixes:[], boss:false, elite:false };
  if(o) for(var k in o) base[k]=o[k];
  return base;
}
function boot(hero, relics){ fresh(hero, relics); try{ startBattle(['youhun']); }catch(e){ info('startBattle 抛错 ' + hero, e.message); } }

/* 1. 太上咒箓[金·天师]：诅咒满 6 层时其受到伤害 +25% */
(function(){
  var e = mkEnemy({ curse:6 });
  fresh('tianshi', []); dealDamageTo(e, 10); var no = 100 - e.hp;
  var e2 = mkEnemy({ curse:6 });
  fresh('tianshi', ['taishangzhou']); dealDamageTo(e2, 10); var yes = 100 - e2.hp;
  ok('太上咒箓 · 6层 10伤→12', no === 10 && yes === 12, '无遗物扣' + no + ' / 有遗物扣' + yes);
  var e3 = mkEnemy({ curse:5 });
  fresh('tianshi', ['taishangzhou']); dealDamageTo(e3, 10);
  ok('太上咒箓 · 5层不加成', e3.hp === 90, '扣' + (100 - e3.hp));
})();
/* 2. 血魔刀[金·阴差]：血量 <30% 攻击牌 +25% */
(function(){
  var e = mkEnemy({}); fresh('yincha', ['xuemodao']); G.hp = 10; dealDamageTo(e, 10);
  ok('血魔刀 · 血低于30% → 12', e.hp === 88, '扣' + (100 - e.hp));
  var e2 = mkEnemy({}); fresh('yincha', ['xuemodao']); G.hp = 40; dealDamageTo(e2, 10);
  ok('血魔刀 · 血高于30% → 10', e2.hp === 90, '扣' + (100 - e2.hp));
  var e3 = mkEnemy({}); fresh('yincha', []); G.hp = 10; dealDamageTo(e3, 10);
  ok('血魔刀 · 无遗物不加成', e3.hp === 90, '扣' + (100 - e3.hp));
})();
/* 3. 派生数值 */
(function(){
  fresh('ganshiren', []); var a = relicMaxShiqi(); fresh('ganshiren', ['shiyu']); var b = relicMaxShiqi();
  ok('尸玉 · 尸气上限 12→15', a === 12 && b === 15, a + '→' + b);
  fresh('yincha', []); var c = relicMaxXuenu(); fresh('yincha', ['xueyu']); var d = relicMaxXuenu();
  ok('血玉 · 血怒上限 10→14', c === 10 && d === 14, c + '→' + d);
  fresh('wuseng', []); var f = relicBlockKeep(); fresh('wuseng', ['jingangjing']); var g = relicBlockKeep();
  ok('金刚经残页 · 保留格挡 3→6', f === 3 && g === 6, f + '→' + g);
  fresh('wuseng', []); var h = relicThorns(); fresh('wuseng', ['luohanquan']); var i = relicThorns();
  ok('罗汉拳套 · 反伤 0→1', h === 0 && i === 1, h + '→' + i);
  fresh('tianshi', []); var j = relicCurseOverflowBlock(); fresh('tianshi', ['zhenmoyin']); var k = relicCurseOverflowBlock();
  ok('镇魔印 · 溢出格挡系数 2→3（v1.0.18 基线 1→2、镇魔印再 +1）', j === 2 && k === 3, j + '→' + k);
})();
/* 4. 雷法心诀[紫·天师]：诅咒跃迁到 6 层 → 4 点雷击 */
(function(){
  var e = mkEnemy({ curse:5 });
  fresh('tianshi', ['leifaxinjue']); applyCurse(e, 1);
  ok('雷法心诀 · 满6层受4点雷击', e.hp === 96, 'hp=' + e.hp);
  var e2 = mkEnemy({ curse:5 });
  fresh('tianshi', []); applyCurse(e2, 1);
  ok('雷法心诀 · 无遗物不掉血', e2.hp === 100, 'hp=' + e2.hp);
  var e3 = mkEnemy({ curse:6 });
  fresh('tianshi', ['leifaxinjue']); applyCurse(e3, 3);
  ok('雷法心诀 · 已在6层不重复触发', e3.hp === 100, 'hp=' + e3.hp);
})();
/* 5. 镇魔印 · 溢出转格挡（真值 = overflow × 系数） */
(function(){
  var e = mkEnemy({ curse:5 });
  fresh('tianshi', ['zhenmoyin']); G.block = 0; applyCurse(e, 4);
  ok('镇魔印 · 3层溢出转 9 格挡（系数 3）', G.block === 9, 'block=' + G.block);
  var e2 = mkEnemy({ curse:5 });
  fresh('tianshi', []); G.block = 0; applyCurse(e2, 4);
  ok('镇魔印 · 无遗物 3 层溢出转 6 格挡（基线 2）', G.block === 6, 'block=' + G.block);
})();
/* 6. 开局类 */
(function(){
  boot('ganshiren', ['shiyu']);
  ok('尸玉 · 开局得 3 尸气', (G.尸气 || 0) === 3, '尸气=' + G.尸气);
  boot('ganshiren', ['yinhundeng']);
  ok('引魂灯 · 开局不再自带阴兵（v1.0.20 改为发牌进牌库）', !(G.summons || []).some(function(x){ return x.type === 'yinbing'; }), JSON.stringify(G.summons));
  fresh('ganshiren', []);
  var yb0 = G.deck.filter(function(c){ return c.id === 'yinbing'; }).length;
  grantRelic(relById('yinhundeng'));
  var yb1 = G.deck.filter(function(c){ return c.id === 'yinbing'; }).length;
  ok('引魂灯 · 获得即发一张 0 费阴兵进牌库', yb1 === yb0 + 1 && cardById('yinbing').cost === 0, yb0 + '→' + yb1 + ' cost=' + cardById('yinbing').cost);
  boot('wuseng', ['budongmingwang']);
  ok('不动明王像 · 开局 +5 格挡', G.block >= 5, 'block=' + G.block);
  boot('yincha', ['ranxueling']);
  ok('燃血令 · 开局累积从 0 起', (G.rageAccum || 0) === 0, 'accum=' + G.rageAccum);
})();
/* 7. 铜铃[白]：战斗开始（= 第 1 回合）额外抽 2 张
   —— 钩子在 startTurn 里（不是 drawCards），所以直接跑一回合的起手：
      不走 startBattle，因为开局的发牌挂在动画层里异步，探针量不到手牌。 */
(function(){
  function handAfter(relics, turnBefore){
    fresh('tianshi', relics);   // newState() 不填牌库（牌库由开局流程装），这里手动塞 8 张
    var ids = []; for(var i=0;i<8;i++) ids.push(cardById('leifu'));
    G.deck = ids; resetDeck(); G.hand = []; G.turn = turnBefore;
    try{ startTurn(); }catch(e){ info('startTurn 抛错', e.message); }
    return G.hand.length;
  }
  var n0 = handAfter([], 0), n1 = handAfter(['tongling'], 0);
  ok('铜铃 · 第1回合（战斗开始）多抽 2 张', n1 === n0 + 2, n0 + '→' + n1);
  var m1 = handAfter(['tongling'], 2);
  ok('铜铃 · 非第1回合不多抽', m1 === n0, '第3回合抽到 ' + m1);
})();
/* 8. 骨铃[紫]：召唤物死亡按其「持续过的回合数」回血（v1.0.20 口径，取 addSummon 落定的 dur0） */
(function(){
  fresh('ganshiren', []); G.hp = 40; var s1 = { type:'yinbing', v:4, dur:0, dur0:3, healV:2, uid:'s1' }; G.summons = [s1];
  try{ onSummonDeath(s1); }catch(e){ info('onSummonDeath 抛错', e.message); }
  var no = G.hp - 40;
  fresh('ganshiren', ['guling']); G.hp = 40; var s2 = { type:'yinbing', v:4, dur:0, dur0:3, healV:2, uid:'s2' }; G.summons = [s2];
  try{ onSummonDeath(s2); }catch(e){}
  var yes = G.hp - 40;
  ok('骨铃 · 死亡按持续回合数回血（阴兵 dur0=3 → 3）', no === 0 && yes === 3, '无遗物+' + no + ' / 有遗物+' + yes);
  fresh('ganshiren', ['guling']); G.hp = 40; var s3 = { type:'wutong', v:6, dur:0, dur0:2, uid:'s3' }; G.summons = [s3];
  try{ onSummonDeath(s3); }catch(e){}
  var w2 = G.hp - 40;
  fresh('ganshiren', ['guling']); G.hp = 40; var s4 = { type:'shi_wang', v:10, dur:0, dur0:5, uid:'s4' }; G.summons = [s4];
  try{ onSummonDeath(s4); }catch(e){}
  var w5 = G.hp - 40;
  ok('骨铃 · 五通神 dur0=2 → 2 / 尸王 dur0=5 → 5', w2 === 2 && w5 === 5, '五通神+' + w2 + ' / 尸王+' + w5);
})();
/* 9. 阴阳鱼[蓝]：受负面效果回 2 血 */
(function(){
  fresh('tianshi', []); G.hp = 30; playerDebuffReceived();
  var no = G.hp - 30;
  fresh('tianshi', ['yinyangyu']); G.hp = 30; playerDebuffReceived();
  var yes = G.hp - 30;
  ok('阴阳鱼 · 受负面效果回 2 血', no === 0 && yes === 2, '无遗物+' + no + ' / 有遗物+' + yes);
})();
/* 10. 断刃[金]：获得即发一张断刃雷符 */
(function(){
  fresh('tianshi', []);
  var before = G.deck.filter(function(c){ return c.id === 'duanren_leifu'; }).length;
  grantRelic(relById('duanren'));
  var after = G.deck.filter(function(c){ return c.id === 'duanren_leifu'; }).length;
  ok('断刃 · 获得即发断刃雷符', after === before + 1, before + '→' + after);
})();
/* 11. 池子 / 专属过滤 */
(function(){
  var seen = {}; var dup = [];
  RELICS.forEach(function(r){ if(seen[r.id]) dup.push(r.id); seen[r.id] = 1; });
  ok('遗物 id 无重复', dup.length === 0, dup.join(','));
  fresh('tianshi', []);
  var p1 = RELICS.filter(function(r){ return (!r.hero || r.hero === 'tianshi') && !hasRelic(r.id); }).map(function(r){ return r.id; });
  ok('天师池含太上咒箓', p1.indexOf('taishangzhou') >= 0, '');
  fresh('yincha', []);
  var p2 = RELICS.filter(function(r){ return (!r.hero || r.hero === 'yincha') && !hasRelic(r.id); }).map(function(r){ return r.id; });
  ok('阴差池不含太上咒箓', p2.indexOf('taishangzhou') < 0, '');
  info('天师可选池', p1.length + ' 件');
})();
/* 12. 太上咒箓 · **诅咒消耗型卡牌**（v1.0.13 修的根因：
   原先这些牌在 dealDamageTo 之前就把诅咒扣掉 ⇒ 满 6 层时扣完只剩 5/3/0 层，
   太上咒箓的判据 (e.curse||0)>=6 当场为假 ⇒ 用户实测「叠满 6 层伤害 +25% 没生效」）。 */
(function(){
  function cast(cid, relics){
    fresh('tianshi', relics); var e = mkEnemy({ curse:6 }); G.enemies = [e]; G.target = 0;
    cardById(cid).eff(false);
    return { dmg: 100 - e.hp, curse: e.curse };
  }
  var a0 = cast('leifu', []), a1 = cast('leifu', ['taishangzhou']);
  ok('太上咒箓 · 雷符(消耗1层) 6层：9 → 11', a0.dmg === 9 && a1.dmg === 11, '无遗物' + a0.dmg + ' / 有遗物' + a1.dmg);
  ok('太上咒箓 · 雷符 消耗后剩 5 层', a1.curse === 5, 'curse=' + a1.curse);
  var b0 = cast('shihun', []), b1 = cast('shihun', ['taishangzhou']);
  ok('太上咒箓 · 噬魂术(引爆全部) 6层：30 → 37', b0.dmg === 30 && b1.dmg === 37, '无遗物' + b0.dmg + ' / 有遗物' + b1.dmg);
  ok('太上咒箓 · 噬魂术 引爆后归 0 层', b1.curse === 0, 'curse=' + b1.curse);
})();
window.__report = R;
`;

const { sandbox } = load(path.join(__dirname, '..', '原型.html'), BODY);
if (sandbox.__boom) { console.log('BOOM\\n' + sandbox.__boom); process.exit(1); }
const R = sandbox.__report || ['（探针未产出结果）'];
console.log(R.join('\n'));
const fails = R.filter(l => l.indexOf('FAIL') === 0);
console.log('\n== ' + R.filter(l => l.indexOf('PASS') === 0).length + ' pass / ' + fails.length + ' fail ==');
process.exit(fails.length ? 1 : 0);