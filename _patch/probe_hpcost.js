// v0.61.39 一次性探针（不入库、不参与冒烟）：实测「扣血牌」的三方对拍
//   decl = c.hpCost(u)           —— 30_engine.js:976 只拿它做「以命相搏」弹窗，不实扣
//   lost = 真实 G.hp 下降         —— 由 eff 里的 loseHp(n) 产生
//   rage = 阴差 【血怒】增量       —— 被动「每失去 1 点生命 +1 血怒」（cardPlayWindow 内才生效）
// 三路探法：
//   A 有敌人 + doPlayCard  → 量 lost / rage（① 声明漂移、② 等额转血怒）
//   B 无敌人 + 直接调 eff  → 量 lost（③ curEnemy() 为 null 时卡面的「失去 N 点生命」是否落空）
//     （B 不能走 doPlayCard：场上无敌会被当场判胜并回 8 血，量到的是 -8 而不是 0）
const vmh = require('./vm_host.js');
const path = require('path');

const APPENDED = `
(function () {
  try { render=function(){}; } catch(e){}
  try { sfx=function(){}; } catch(e){}
  try { saveRun=function(){}; } catch(e){}
  try { showOverlay=function(){}; } catch(e){}
  try { hideOverlay=function(){}; } catch(e){}
  try { hurtVignette=function(){}; } catch(e){}
  try { floatDamage=function(){}; } catch(e){}
  try { floatMsg=function(){}; } catch(e){}
  try { log=function(){}; } catch(e){}
  try { enemyAct=function(){}; } catch(e){}
  try { bossIntro=function(cb){ if(typeof cb==='function') cb(); }; } catch(e){}

  function setup(hero, withEnemies) {
    G = newState();
    G.hero=hero; G.act=1; G.endless=false; G.relics=[];
    G.hp=60; G.maxHp=80; G.block=0; G.energy=9; G.gold=0;
    G.deck=[]; G.drawPile=[]; G.hand=[]; G.discard=[]; G.summons=[];
    G.lastDrawnCards=[]; G.尸气=0; G.xuenu=0;
    CURSE_THIS_TURN=0;
    G.hpLostTurn=0; G.blockGainedTurn=0; G.summonsMadeTurn=0;
    G.xuejiArmed=false; G.endBlockKind=null; G.xiejia=0; G.thorns=0;
    G.hitHeal=0; G.hitCurse=0; G.hitShiqi=0; G.hitRage=0; G.hitBlock=0; G.nextBlock=0;
    G.dodge=0; G.dodgeShiqi=0; G.dodgeNextBlock=0; G.dodgeHealRage=0; G.dodgeCurse=0;
    G.ranhunType=null; G.ranhunSelf=null; G.bloodPact=0; G.retain=0;
    G.zhouyuA=false; G.turnAtkBuff=0; G.karmaFire=0; G.burn=0; G.weak=0; G.gouhun=0;
    G.enemies = withEnemies
      ? ['youhun','jiangshi'].map(function(k){ return makeEnemy(ENEMIES[k], k); })
      : [];
    G.target = G.enemies.length ? 0 : -1;
    return G;
  }

  var HEROES = ['ganshiren','wuseng','yincha','tianshi'];
  var rows = [];
  HEROES.forEach(function (hero) {
    CARDS.forEach(function (c) {
      [false, true].forEach(function (u) {
        var decl = c.hpCost ? c.hpCost(u) : 0;

        // ── A：有敌人，走正常出牌 ──
        var aLost=null, aRage=null, aErr=null;
        try {
          setup(hero, true);
          var cc = Object.assign({}, c); cc.up = u;
          G.hand=[cc]; G.drawPile=[]; G.discard=[]; G.exhausted=[];
          var hp0=G.hp, rg0=rageLayers();
          try { doPlayCard(0); } catch(e) { aErr = String(e && e.message); }
          aLost = hp0 - G.hp;
          aRage = rageLayers() - rg0;      // 必须紧跟在本段内取，setup() 会把 G 整个换掉
        } catch (e) { aErr = 'setup:' + String(e && e.message); }

        // ── B：无敌人，直接调 eff（只量血量，cardPlayWindow 不成立故不量血怒）──
        var bLost=null, bErr=null;
        try {
          setup(hero, false);
          var c2 = Object.assign({}, c); c2.up = u;
          var h2=G.hp;
          try { c2.eff(u, c2); } catch(e) { bErr = String(e && e.message); }
          bLost = h2 - G.hp;
        } catch (e) { bErr = 'setup:' + String(e && e.message); }

        if (decl > 0 || aLost > 0 || bLost > 0) {
          rows.push({ hero:hero, id:c.id, name:c.name, up:u,
            decl:decl, lostA:aLost, rageA:aRage, lostB:bLost, err:aErr||bErr||null });
        }
      });
    });
  });
  __PROBE_ROWS = rows;
})();
`;

const { sandbox } = vmh.load(path.join(__dirname, '..', '原型.html'), APPENDED);
if (sandbox.__boom) { console.error('BOOM\n' + sandbox.__boom); process.exit(1); }
const rows = sandbox.__PROBE_ROWS || [];

const mism   = rows.filter(r => r.decl > 0 && r.lostA !== r.decl);
const norage = rows.filter(r => r.hero === 'yincha' && r.lostA > 0 && r.rageA !== r.lostA);
const early  = rows.filter(r => r.decl > 0 && r.lostB !== null && r.lostB < r.decl);
const pad = (s, n) => String(s) + ' '.repeat(Math.max(0, n - String(s).length));

console.log('rows=' + rows.length + '（含任一扣血迹象的条目）');
console.log('\n== ① hpCost 声明 vs 实扣（decl>0）==');
const d1 = rows.filter(r => r.decl > 0);
console.log('  共 ' + d1.length + ' 条，不一致 ' + mism.length + ' 条');
mism.forEach(r => console.log('  ✗ ' + r.hero + '/' + r.id + (r.up ? '(升)' : '') + ' decl=' + r.decl + ' 实扣=' + r.lostA));

console.log('\n== ② 阴差：扣血 == 血怒？（实扣>0）==');
const y1 = rows.filter(r => r.hero === 'yincha' && r.lostA > 0);
console.log('  共 ' + y1.length + ' 条，不等额 ' + norage.length + ' 条');
norage.forEach(r => console.log('  ✗ ' + r.id + (r.up ? '(升)' : '') + ' 扣血=' + r.lostA + ' 血怒+' + r.rageA));

console.log('\n== ③ curEnemy() 为 null 时，卡面「失去 N 点生命」是否落空 ==');
console.log('  共 ' + early.length + ' 条（decl=' + '声明值，lostB=无敌时实扣）');
early.forEach(r => console.log('  ! ' + r.hero + '/' + r.id + (r.up ? '(升)' : '') + ' decl=' + r.decl + ' 无敌时=' + r.lostB));

console.log('\n== ④ 全表 ==');
console.log('  ' + pad('hero',11) + pad('id',16) + pad('u',4) + pad('decl',6) + pad('实扣',6) + pad('血怒',6) + pad('无敌',6) + 'err');
rows.forEach(r => console.log('  ' + pad(r.hero,11) + pad(r.id,16) + pad(r.up?'T':'-',4) +
  pad(r.decl,6) + pad(r.lostA,6) + pad(r.rageA,6) + pad(r.lostB,6) + (r.err||'')));