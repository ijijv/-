// 打印 _cards_dump.json 摘要：node _patch/_show.js [起始序号] [结束序号]
const fs = require('fs');
const path = require('path');
const o = JSON.parse(fs.readFileSync(process.argv[2] && /^\d+$/.test(process.argv[2]) ? path.join(__dirname, '_cards_dump.json') : (process.argv[2] || path.join(__dirname, '_cards_dump.json')), 'utf8'));
const a = parseInt(process.argv[3] || '1', 10), b = parseInt(process.argv[4] || '99', 10);
const cost = c => (typeof c.cost === 'object' && c.cost) ? JSON.stringify(c.cost) : c.cost;
o.cards.forEach((c, i) => {
  const n = i + 1;
  if (n < a || n > b) return;
  console.log('#' + n + ' [' + c.id + '] ' + c.name + '  费=' + cost(c) + (c.exhaust ? ' 消耗' : '') + (c.dmg === 'Y' ? ' DMG' : ''));
  console.log('   0:' + c.t0);
  console.log('   1:' + c.t1);
});
