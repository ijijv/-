// v0.61.39 一次性探针：三类「扣血却可能不给血怒」的例外，逐条实测
//  A 反震(敌人词缀) / 业火(修罗王)  —— 30_engine.js:91-92 直写 G.hp，绕过 loseHp
//  B 怨气(废牌) 回合结束自动打出   —— 走 doPlayCard → 开 cardPlayWindow
//  C 反震/业火是否仍喂 totalHpLost（即喂嗜血/天雷正法）—— 与 A 对照，证明是「有意只断血怒」
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
  var R = {};

  function setup(hero) {
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
    G.enemies = ['youhun','jiangshi'].map(function(k){ return makeEnemy(ENEMIES[k], k); });
    G.target=0;
    return G;
  }

  // ── A：反震 —— 给敌人挂 fanzhen 词缀，然后打它 ──
  (function () {
    var out = [];
    [0, 1, 2].forEach(function (heroIdx) {
      var hero = ['ganshiren','yincha'][heroIdx === 1 ? 1 : 0];
      setup(hero);
      G.enemies[0].affixes = [{ id:'fanzhen', tier: 1 }];
      var hp0=G.hp, rg0=rageLayers(), tl0=G.totalHpLost||0;
      // 打进打出窗口：用一张纯攻击牌（雷符）
      var cc = Object.assign({}, CARDS.find(function(c){return c.id==='leifu';}));
      G.hand=[cc]; G.drawPile=[]; G.discard=[]; G.exhausted=[];
      try { doPlayCard(0); } catch(e) {}
      out.push({ hero:hero, hpLost: hp0-G.hp, rage: rageLayers()-rg0, totalHpLost: (G.totalHpLost||0)-tl0 });
    });
    R.fanzhen = out;
  })();

  // ── B：业火 —— 修罗王 + karmaFire>0 ──
  (function () {
    var out = [];
    ['ganshiren','yincha'].forEach(function (hero) {
      setup(hero);
      G.enemies[0] = makeEnemy(ENEMIES['xiuluowang'], 'xiuluowang');
      G.enemies = [G.enemies[0]]; G.target = 0;
      G.karmaFire = 1;
      var hp0=G.hp, rg0=rageLayers(), tl0=G.totalHpLost||0;
      var cc = Object.assign({}, CARDS.find(function(c){return c.id==='leifu';}));
      G.hand=[cc]; G.drawPile=[]; G.discard=[]; G.exhausted=[];
      try { doPlayCard(0); } catch(e) {}
      out.push({ hero:hero, hpLost: hp0-G.hp, rage: rageLayers()-rg0, totalHpLost: (G.totalHpLost||0)-tl0 });
    });
    R.yehuo = out;
  })();

  // ── C：怨气 —— 回合结束自动打出的废牌 ──
  (function () {
    var out = [];
    ['ganshiren','yincha'].forEach(function (hero) {
      setup(hero);
      G.hand = [junkCard()];
      var hp0=G.hp, rg0=rageLayers(), tl0=G.totalHpLost||0;
      G.endTurnQueued = false;
      try {
        // 怨气自动打出就在 endTurn() 开头（30_engine.js:838-852），直接调它
        // （finishEndTurn() 在它之后，跳过整段废牌逻辑）
        endTurn();
      } catch(e) { out.push({ hero:hero, err:String(e&&e.message) }); return; }
      // 回合末敌人也会动手，血量差会被污染 → 主看血怒与 junkPlayedThisTurn 计数
      out.push({ hero:hero, hpLost: hp0-G.hp, rage: rageLayers()-rg0,
                 totalHpLost: (G.totalHpLost||0)-tl0,
                 junkPlayed: G.junkPlayedThisTurn||0 });
    });
    R.yuanqi = out;
  })();

  // ── D：对照 —— 直接在打出窗口外调 loseHp(3)，应当 0 血怒 ──
  (function () {
    var out = [];
    setup('yincha');
    var rg0=rageLayers(), hp0=G.hp;
    loseHp(3);
    out.push({ where:'窗口外', hpLost: hp0-G.hp, rage: rageLayers()-rg0 });
    setup('yincha');
    var w=function(){ loseHp(3); };
    cardPlayWindow = true; var r1=rageLayers(), h1=G.hp; w(); cardPlayWindow = false;
    out.push({ where:'窗口内', hpLost: h1-G.hp, rage: rageLayers()-r1 });
    R.window = out;
  })();

  __PROBE = R;
})();
`;

const { sandbox } = vmh.load(path.join(__dirname, '..', '原型.html'), APPENDED);
if (sandbox.__boom) { console.error('BOOM\n' + sandbox.__boom); process.exit(1); }
console.log(JSON.stringify(sandbox.__PROBE, null, 1));