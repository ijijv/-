// 志怪塔 · 战斗仿真器（批2 平衡的尺子）
//
// 用法：
//   node _patch/sim.js                                   # 四英雄 × 第一幕普通遭遇，各 200 场
//   node _patch/sim.js --hero all --fights 300
//   node _patch/sim.js --hero tianshi --scene act1-elite
//   node _patch/sim.js --hero wuseng --enemies huyao,jiangshi --fights 500
//   node _patch/sim.js --up 1 --relics zhushabi          # 全升级牌组 + 指定遗物
//   node _patch/sim.js --json                            # 出 JSON（给改前/改后 diff 用）
//
// 口径见 _patch/sim_runner.js 顶部。这是「贪心 AI 的下限」，不是人类水平，
// 只用于同一场景下的**改前/改后对照**。
const vm = require('vm');
const path = require('path');
const { load } = require('./vm_host');

function arg(name, dflt) {
  const i = process.argv.indexOf('--' + name);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : dflt;
}
const flag = (name) => process.argv.includes('--' + name);

const ROOT = path.join(__dirname, '..');
const GAME = path.resolve(arg('game', path.join(ROOT, '原型.html')));
const FIGHTS = parseInt(arg('fights', '200'), 10);
const UP = parseInt(arg('up', '0'), 10);
const SEED0 = parseInt(arg('seed', '1'), 10);
const MAXT = parseInt(arg('max-turns', '40'), 10);
const RELICS = (arg('relics', '') || '').split(',').filter(Boolean);
const AS_JSON = flag('json');

const runner = require('fs').readFileSync(path.join(__dirname, 'sim_runner.js'), 'utf8');
const { sandbox } = load(GAME, runner);

function die(msg) { console.error(msg); process.exit(2); }
if (sandbox.__boom) die('载入失败：\n' + sandbox.__boom);
if (!sandbox.__sim || !sandbox.__sim.ok) die('sim_runner 没挂上（__sim 缺失）');

const SIM = sandbox.__sim;
const HEROES = SIM.heroes;

function runBatch(list) {
  const expr = '(function(){var L=' + JSON.stringify(list) + ';var o=[];' +
    'for(var i=0;i<L.length;i++){o.push(__sim.fight(L[i].keys,L[i].opts));}return JSON.stringify(o);})()';
  return JSON.parse(vm.runInContext(expr, sandbox, { timeout: 300000 }));
}

/* ---------- 场景表 ---------- */
// 注意：keysList 的元素必须是**数组**（startBattle 要 keys.map）
function poolFromAct(act) {
  const seen = new Map();
  const rows = JSON.parse(vm.runInContext('JSON.stringify(ACTS[' + (act - 1) + '])', sandbox));
  rows.forEach(row => row.forEach(node => {
    if (node && node.t === 'fight') seen.set(node.e.join(','), node.e.slice());
  }));
  return [...seen.values()];
}
function bossPool(act) {
  return JSON.parse(vm.runInContext('JSON.stringify(BOSS_POOL[' + act + '])', sandbox));
}
function elitePool(act) {
  return JSON.parse(vm.runInContext('JSON.stringify(ELITES_BY_ACT[' + act + '])', sandbox));
}

function buildScenes(want) {
  const scenes = [];
  const push = (name, keysList) => scenes.push({ name, keysList });
  for (const act of [1, 2, 3]) {
    if (!want || want === 'all' || want === `act${act}-normal`) push(`act${act}-普通遭遇`, poolFromAct(act));
    if (!want || want === 'all' || want === `act${act}-elite`) elitePool(act).forEach(k => push(`act${act}-精英·${k}`, [[k]]));
    if (!want || want === 'all' || want === `act${act}-boss`) bossPool(act).forEach(k => push(`act${act}-Boss·${k}`, [[k]]));
  }
  return scenes;
}

const heroes = arg('hero', 'all') === 'all' ? HEROES.map(h => h.id) : [arg('hero')];
for (const h of heroes) if (!HEROES.some(x => x.id === h)) die('未知英雄：' + h);
for (const h of heroes) {
  if (!HEROES.find(x => x.id === h).deck) die('英雄缺初始牌组：' + h);
}

/* ---------- 跑 ---------- */
const rows = [];
for (const hid of heroes) {
  const hdef = HEROES.find(x => x.id === hid);
  const deck = [];
  hdef.deck.forEach(([cid, n]) => { for (let i = 0; i < n; i++) deck.push(cid); });

  const explicit = arg('enemies', '') ? [arg('enemies').split(',').filter(Boolean)] : null;
  const scenes = explicit ? [{ name: '自定义·' + arg('enemies'), keysList: explicit }] : buildScenes(arg('scene', null));

  for (const sc of scenes) {
    let win = 0, lose = 0, stall = 0, err = 0, turns = 0, taken = 0, n = 0;
    const list = [];
    for (let i = 0; i < FIGHTS; i++) {
      for (const keys of sc.keysList) {
        list.push({
          keys,
          opts: { hero: hid, deck, up: UP, relics: RELICS, seed: SEED0 + i, maxTurns: MAXT, act: 1 },
        });
      }
    }
    // 分块，免得一次 runInContext 太久
    for (let i = 0; i < list.length; i += 200) {
      for (const r of runBatch(list.slice(i, i + 200))) {
        n++;
        if (r.error) { err++; continue; }
        if (r.win) win++; else if (r.lose) lose++; else stall++;
        turns += r.turns; taken += r.taken;
      }
    }
    rows.push({
      hero: hdef.name, hero_id: hid, scene: sc.name, n,
      win, lose, stall, err,
      winRate: n ? win / n : 0,
      avgTurns: n ? turns / n : 0,
      avgTaken: n ? taken / n : 0,
    });
  }
}

if (AS_JSON) {
  console.log(JSON.stringify({ up: UP, relics: RELICS, fights: FIGHTS, seed0: SEED0, rows }, null, 1));
} else {
  console.log(`英雄牌组：${UP ? '全升级' : '未升级'}　遗物：${RELICS.length ? RELICS.join(',') : '无'}　` +
    `每格 ${FIGHTS} 场起（种子 ${SEED0}…）  游戏：${path.relative(ROOT, GAME) || GAME}`);
  console.log('');
  const w = [12, 22, 7, 8, 10, 12, 8];
  const line = (a) => a.map((x, i) => String(x).padEnd(w[i])).join('');
  console.log(line(['英雄', '场景', '场次', '胜率', '平均回合', '平均掉血', '异常']));
  console.log('-'.repeat(w.reduce((a, b) => a + b, 0)));
  let last = '';
  for (const r of rows) {
    if (last && r.hero !== last) console.log('');
    last = r.hero;
    console.log(line([
      r.hero, r.scene, r.n,
      (r.winRate * 100).toFixed(1) + '%',
      r.avgTurns.toFixed(1), r.avgTaken.toFixed(1),
      r.err ? 'ERR×' + r.err : (r.stall ? 'stall×' + r.stall : ''),
    ]));
  }
  const tot = rows.reduce((a, r) => a + r.n, 0);
  const totW = rows.reduce((a, r) => a + r.win, 0);
  const totE = rows.reduce((a, r) => a + r.err, 0);
  console.log('-'.repeat(w.reduce((a, b) => a + b, 0)));
  console.log(`合计 ${tot} 场，胜率 ${tot ? (totW / tot * 100).toFixed(1) : '0'}%` +
    (totE ? `，异常 ${totE} 场（看 --json 里的 error 字段）` : ''));
  if (totE) process.exitCode = 1;
}
