// 志怪塔 · 敌人数据导出（给「敌人总结」文档做机器核对，不参与游戏运行）
//
// 用法：node _patch/dump_enemies.js            → 打印 JSON
//       node _patch/dump_enemies.js --md       → 打印 Markdown 主表
//
// 口径：
//   · base  = ENEMIES 表里的原始 hp / 意图 v
//   · 结算后 = makeEnemy 的倍率算完之后（普通 ×1.25/×1.25、精英 ×1.4/×1.3、Boss ×1.6/×1.4、召唤物 ×1）
//   · 出现幕 = 从 ACT1 骨架出发，按 ACT2_SWAP / ACT3_SWAP 逐幕推导（不是猜的）
const path = require('path');
const { load } = require('./vm_host');

const ROOT = path.join(__dirname, '..');
const GAME = path.join(ROOT, '原型.html');
const AS_MD = process.argv.includes('--md');

const RUNNER = `
;(function(){
  function pf(v){ return typeof v === 'function' ? v() : v; }
  var out = {
    hpMul:  { normal: 1.25, elite: 1.4, boss: 1.6, summon: 1 },
    atkMul: { normal: 1.25, elite: 1.3, boss: 1.4, summon: 1 },
    maxEnemyStrength: MAX_ENEMY_STRENGTH,
    endlessGrowth: ENDLESS_GROWTH,
    affixes: AFFIXES.map(function(a){ return { id:a.id, name:a.name, desc:a.desc }; }),
    swaps: { act2: ACT2_SWAP, act3: ACT3_SWAP },
    pools: { elites: ELITES_BY_ACT, boss: BOSS_POOL, endlessMinions: ENDLESS_MINIONS, endlessElites: ENDLESS_ELITES, endlessBosses: ENDLESS_BOSSES },
    enemies: {}, order: []
  };
  Object.keys(ENEMIES).forEach(function(k){
    var d = ENEMIES[k];
    out.order.push(k);
    var summon = !!d.summon;
    var hpMul  = summon ? 1 : (d.boss ? 1.6 : d.elite ? 1.4 : 1.25);
    var atkMul = summon ? 1 : (d.boss ? 1.4 : d.elite ? 1.3 : 1.25);
    function scale(it){
      var c = {}; for (var kk in it) c[kk] = it[kk];
      if (c.v && (c.type==='attack' || c.type==='multi' || c.type==='attackBlock')) c.v = Math.round(c.v*atkMul);
      return c;
    }
    out.enemies[k] = {
      key: k, name: d.name, kind: d.kind, hp: d.hp,
      elite: !!d.elite, boss: !!d.boss, summon: summon,
      aggressive: !!d.aggressive, lifesteal: d.lifesteal || 0,
      phase: !!d.phase, split: !!d.split, bossAffix: !!d.bossAffix,
      effHp: Math.round(d.hp*hpMul), hpMul: hpMul, atkMul: atkMul,
      intents:  (d.intents  || []).map(scale),
      intents2: d.intents2 ? d.intents2.map(scale) : null
    };
  });
  // —— 按幕推导出现（ACT1 骨架 + 逐幕 swapMap）——
  var actRows = [];
  for (var a = 1; a <= 3; a++){
    var swap = a === 2 ? ACT2_SWAP : a === 3 ? ACT3_SWAP : null;
    var rows = [];
    ACTS[0].forEach(function(row){
      row.forEach(function(node){
        if (!node || node.t !== 'fight') return;
        rows.push(node.e.map(function(k){ return swap && swap[k] ? swap[k] : k; }));
      });
    });
    actRows.push(rows);
  }
  out.actRows = actRows;
  return JSON.stringify(out);
})()
`;

const vm = require('vm');
const { sandbox } = load(GAME, RUNNER);
if (sandbox.__boom) { console.error('载入失败：\n' + sandbox.__boom); process.exit(2); }
// IIFE 的完成值就是它 return 的 JSON 字符串（vm.runInContext 返回脚本的完成值）
const raw = vm.runInContext(RUNNER.replace(/^;/, ''), sandbox);
const D = JSON.parse(raw);

/* 意图 → 一行文字（用结算后的数值） */
function itText(it) {
  switch (it.type) {
    case 'attack': return `攻击 ${it.v}`;
    case 'multi': return `连击 ${it.n}×${it.v}`;
    case 'attackBlock': return `攻击 ${it.v} + 格挡 ${it.block}`;
    case 'block': return `格挡 ${it.v}`;
    case 'heal': return `回血 ${it.v}`;
    case 'charge': return `蓄力 +${it.v}`;
    case 'strength': return `力量 +${it.v}`;
    case 'summon': return `召唤 ${it.n} 只`;
    case 'dormant': return '休眠';
    default: return `${it.type}${it.v ? ' ' + it.v : ''}`;
  }
}
function cycle(list) { return (list || []).map(itText).join(' → '); }

if (!AS_MD) { console.log(JSON.stringify(D, null, 1)); process.exit(0); }

const byKind = { ghost: [], jiangshi: [], yao: [] };
const groups = { normal: [], elite: [], boss: [], summon: [] };
for (const k of D.order) {
  const e = D.enemies[k];
  (byKind[e.kind] = byKind[e.kind] || []).push(e);
  groups[e.summon ? 'summon' : e.boss ? 'boss' : e.elite ? 'elite' : 'normal'].push(e);
}
const W = [22, 14, 10, 9, 9, 8, 46];
function line(a) { return '| ' + a.map((x, i) => String(x).padEnd(W[i])).join(' | ') + ' |'; }
console.log('| key | 名字 | 种类 | baseHP | 结算HP | 倍率 | 意图循环（结算后） |');
console.log('|---|---|---|---|---|---|---|');
for (const g of ['normal', 'elite', 'boss', 'summon']) {
  for (const e of groups[g]) {
    console.log(line([e.key, e.name, e.kind, e.hp, e.effHp, `HP×${e.hpMul}/ATK×${e.atkMul}`, cycle(e.intents)]));
    if (e.intents2) console.log(`| ${' '.repeat(0)}↳ 二阶段 | | | | | | ${cycle(e.intents2)} |`);
  }
}
console.log('\n各幕出现（由 ACT1 骨架 + swapMap 推导）：');
D.actRows.forEach((rows, i) => {
  console.log(`  第${i + 1}幕: ` + rows.map(r => r.join('+')).join(' ｜ '));
});