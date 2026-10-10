/* 里程数值模拟（一次性工具，不进产物）。
   目的：用户口径「先设计里程获得的全新规则和数值后计算平均每把的里程数后才能制定（6 档阈值）」。
   做法：按 20_data.js 的**真实地图结构**（3 幕 × 14 层、走廊层 10~12、末层 Boss、配额 TYPE_QUOTA、
        ENEMY3_P3、未知事件 1/8 是拦路恶鬼）跑蒙特卡洛，统计「每把里程」的分布，
        再对几套候选公式各算一遍，挑出一套数值手感合适的。
   跑法：node _patch/_mile_sim.js */
const MAP_ROWS = 14, ACTS = 3;
const CORRIDOR = [10, 11, 12];
const ENEMY3_P3 = [0, 0, 0, 0, 0.55, 0.6, 0.6, 0.65, 0.65, 0.85, 0.85, 0.85, 0.85, 0.85];
const TYPE_QUOTA = { 1:{camp:2,shop:2,elite:1,unknown:5}, 2:{camp:2,shop:2,elite:2,unknown:4}, 3:{camp:2,shop:2,elite:3,unknown:3} };
const UNKNOWN_EVENTS = 8, AMBUSH = 1;                 // 8 选 1 是「拦路恶鬼」（会打一场）

function p3(row, act){ const p = (row>=0 && row<ENEMY3_P3.length) ? ENEMY3_P3[row] : 0.65; return act===1 ? p*0.6 : p; }

/* 一幕的节点序列（与 assignTypes 的落位规则同口径）：
   第 0 层 fight；第 1~9 层 = 特殊节点（camp/shop/unknown 先占满，elite 配额常填不满）；
   第 10~12 层 = 走廊 fight（6% 变异成野生精英）；第 13 层 = boss。 */
function actNodes(act){
  const q = TYPE_QUOTA[act];
  const out = [];
  out.push({ t:'fight', row:0, n:2 });
  /* 第 1~9 层：先按 camp→shop→unknown→elite 的顺序填 9 个槽（pass0 独占一层） */
  const special = [];
  const order = [['camp', q.camp], ['shop', q.shop], ['unknown', q.unknown], ['elite', q.elite]];
  for (const [kind, quota] of order) for (let i=0;i<quota && special.length<9;i++) special.push(kind);
  while (special.length < 9) special.push('fight');
  for (let r=1;r<=9;r++){
    const k = special[r-1];
    if (k === 'fight') out.push({ t:'fight', row:r, n:2 });
    else out.push({ t:k, row:r, n:0 });
  }
  for (const r of CORRIDOR) out.push({ t:'fight', row:r, n:2, wild:true });
  out.push({ t:'boss', row:MAP_ROWS-1, n:1 });
  /* 敌人个数：fight = 2（p3 概率 3 只）；boss = 1；精英 = 1（50% 再带 1 小怪） */
  for (const nd of out){
    if (nd.t === 'fight') nd.n = 2 + (Math.random() < p3(nd.row, act) ? 1 : 0);
    if (nd.t === 'elite') nd.n = 1 + (Math.random() < 0.5 ? 1 : 0);
  }
  /* 野生精英（6%，仅 row>0 的 fight） */
  for (const nd of out){
    if (nd.t === 'fight' && nd.row > 0 && Math.random() < 0.06){ nd.t = 'elite'; nd.n = 1 + (Math.random() < 0.5 ? 1 : 0); }
  }
  return out;
}
/* 单人一局：逐层推进，每场战斗有阵亡概率；幕主处阵亡率更高。死亡即止，不继续下一幕。 */
function playRun(hBattle, hBoss){
  let act = 1, mapRow = 0, kills = 0, finalBoss = false;
  for (act = 1; act <= ACTS; act++){
    const nodes = actNodes(act);
    for (const nd of nodes){
      mapRow = nd.row;
      if (nd.t === 'fight' || nd.t === 'elite' || nd.t === 'boss'){
        const h = (nd.t === 'boss') ? hBoss : hBattle;
        if (Math.random() < h) return { act, mapRow, kills, finalBoss:false, dead:true };
        kills += nd.n;
      } else if (nd.t === 'unknown' && Math.random() < AMBUSH/UNKNOWN_EVENTS){
        if (Math.random() < hBattle) return { act, mapRow, kills, finalBoss:false, dead:true };
        kills += 2 + (Math.random() < p3(nd.row, act) ? 1 : 0);
      }
    }
    if (act === ACTS){ finalBoss = true; }
    mapRow = 0;
  }
  return { act: ACTS, mapRow: MAP_ROWS-1, kills, finalBoss:true, dead:false };
}

/* —— 候选公式（全部只用 G 上**已经有的**字段：act / mapRow / totalKills / finalBoss） —— */
const FORMS = {
  '现行：(act-1)*120 + row*15 + kills*3 + 通关500': r => (r.act-1)*120 + r.mapRow*15 + r.kills*3 + (r.finalBoss?500:0),
  'A：(act-1)*200 + row*20 + kills*6 + 通关600':     r => (r.act-1)*200 + r.mapRow*20 + r.kills*6 + (r.finalBoss?600:0),
  'B：(act-1)*180 + row*18 + kills*5 + 通关800':     r => (r.act-1)*180 + r.mapRow*18 + r.kills*5 + (r.finalBoss?800:0),
  'C：act*150 + row*22 + kills*6 + 通关900':         r => r.act*150 + r.mapRow*22 + r.kills*6 + (r.finalBoss?900:0),
  'D：基础100 + (act-1)*220 + row*18 + kills*7 + 通关700': r => 100 + (r.act-1)*220 + r.mapRow*18 + r.kills*7 + (r.finalBoss?700:0),
  'E：(act-1)*200 + row*15 + kills*5 + 通关600':       r => (r.act-1)*200 + r.mapRow*15 + r.kills*5 + (r.finalBoss?600:0),
  'F：(act-1)*180 + row*12 + kills*4 + 通关500':       r => (r.act-1)*180 + r.mapRow*12 + r.kills*4 + (r.finalBoss?500:0),
};

const N = 200000;
const HB = 0.07, HBOSS = 0.12;
const runs = [];
let wins = 0, sumKills = 0;
for (let i=0;i<N;i++){ const r = playRun(HB, HBOSS); runs.push(r); if (r.finalBoss) wins++; sumKills += r.kills; }
const pct = (arr, p) => { const a = arr.slice().sort((x,y)=>x-y); return a[Math.min(a.length-1, Math.floor(p*a.length))]; };

console.log('=== 蒙特卡洛：' + N + ' 局（每场战斗阵亡率 ' + HB + '，幕主 ' + HBOSS + '） ===');
console.log('通关率 = ' + (100*wins/N).toFixed(1) + '%   平均击杀 = ' + (sumKills/N).toFixed(1));
const winsOnly = runs.filter(r=>r.finalBoss).length;
console.log('失败局平均推进：幕 ' + (runs.filter(r=>!r.finalBoss).reduce((s,r)=>s+r.act,0)/(N-winsOnly)).toFixed(2)
  + ' · 层 ' + (runs.filter(r=>!r.finalBoss).reduce((s,r)=>s+r.mapRow,0)/(N-winsOnly)).toFixed(1)
  + ' · 击杀 ' + (runs.filter(r=>!r.finalBoss).reduce((s,r)=>s+r.kills,0)/(N-winsOnly)).toFixed(1));
console.log('');
for (const [name, f] of Object.entries(FORMS)){
  const vals = runs.map(f);
  const avg = vals.reduce((a,b)=>a+b,0)/N;
  const wavg = runs.filter(r=>r.finalBoss).map(f).reduce((a,b)=>a+b,0)/Math.max(1,winsOnly);
  const lavg = runs.filter(r=>!r.finalBoss).map(f).reduce((a,b)=>a+b,0)/Math.max(1,N-winsOnly);
  console.log(name.padEnd(46) + ' 平均 ' + avg.toFixed(0).padStart(5)
    + ' | 通关 ' + wavg.toFixed(0).padStart(5) + ' | 失败 ' + lavg.toFixed(0).padStart(5)
    + ' | p10 ' + pct(vals,0.10) + ' p50 ' + pct(vals,0.50) + ' p90 ' + pct(vals,0.90));
}
console.log('');
/* 用选定的公式反推「6 档阈值」：按目标把数 [1, 2.5, 5, 8, 13, 20] 取整成好看的数字。 */
const SCHEDULE = [1, 2.5, 5, 8, 13, 20];
function nice(x){
  if (x < 1000) return Math.round(x/50)*50;
  if (x < 3000) return Math.round(x/100)*100;
  if (x < 10000) return Math.round(x/500)*500;
  return Math.round(x/1000)*1000;
}
for (const [name, f] of Object.entries(FORMS)){
  const vals = runs.map(f);
  const avg = vals.reduce((a,b)=>a+b,0)/N;
  console.log(name.padEnd(46) + ' 平均 ' + avg.toFixed(0).padStart(5)
    + ' ⇒ 6 档 ' + SCHEDULE.map(k=>nice(k*avg)).join(' / '));
}
console.log('');
/* 用选定的公式反推「6 档需要打多少把」 */
const PICK = FORMS['E：(act-1)*200 + row*15 + kills*5 + 通关600'];
const vals = runs.map(PICK);
const avg = vals.reduce((a,b)=>a+b,0)/N;
const THS = SCHEDULE.map(k=>nice(k*avg));
console.log('=== 选定公式 E：每把平均 ' + avg.toFixed(0) + ' 里程 ===');
console.log('  6 档阈值 = ' + THS.join(' / '));
THS.forEach((th,i)=>{
  console.log('  第 ' + (i+1) + ' 档 ' + String(th).padStart(5)
    + ' ⇒ 期望 ' + (th/avg).toFixed(1) + ' 把（比上一档多 '
    + (th - (i?THS[i-1]:0) > 0 ? ((th-(i?THS[i-1]:0))/avg).toFixed(1) : '0') + ' 把）');
});