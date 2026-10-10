/* 临时探针：核对「朱砂笔」与「太上咒箓(6层诅咒+25%)」的实战/预览数值。
   跑法： node _patch/_probe_zhusha.js   （cwd = 工程根） */
const { load } = require('./vm_host');
const extra = `
(function(){
  const out=[];
  function line(t){ out.push(t); }
  function mkEnemy(curse){
    return {uid:1,name:'测试鬼',kind:'ghost',key:'guai',curse:curse,hp:500,maxHp:500,block:0,
      strength:0, pendingDamage:0, intent:{type:'attack',v:5}};
  }
  function play(id, relics, curse){
    G = newState(); G.hero='tianshi';
    G.enemies=[mkEnemy(curse)]; G.target=0;
    G.relics=relics.slice();
    G.hand=[Object.assign({}, CARDS.find(c=>c.id===id))];
    G.drawPile=[]; G.discard=[]; G.energy=9; G.block=0; G.weak=0;
    G.turnStats={dealt:0,dmgTaken:0}; G.karmaFire=0; G.summons=[];
    const c=G.hand[0], e=G.enemies[0];
    const pv=previewDamage(c, e);
    const before=e.hp;
    doPlayCard(0);            /* 走真实打出路径（doPlayCard 内部落 G.attackBuff） */
    return { pv:pv&&pv.d, real:before-e.hp, curseAfter:e.curse };
  }
  try{
    [['leifu','雷符'],['jianfu','剑符'],['taomufu','桃木符'],['zhanyaojian','斩妖剑']].forEach(function(p){
      const id=p[0], nm=p[1];
      const r0=play(id, [], 6);
      const r1=play(id, ['zhushabi'], 6);
      const r2=play(id, ['taishangzhou'], 6);
      const r3=play(id, ['zhushabi','taishangzhou'], 6);
      line(nm.padEnd(6,'　')+' 无遗物 预览/实战 '+r0.pv+'/'+r0.real
        +' | 朱砂笔 '+r1.pv+'/'+r1.real
        +' | 太上咒箓 '+r2.pv+'/'+r2.real
        +' | 两者齐 '+r3.pv+'/'+r3.real);
    });
    line('');
    line('期望：两者齐 = floor((无遗物 + 3) * 1.25)');
  }catch(err){ line('ERR '+(err&&err.stack||err)); }
  __probeOut = out.join('\\n');
})();
`;
const r = load(require('path').join(__dirname, '..', '原型.html'), extra);
if (r.sandbox.__boom) console.log('BOOM:\n' + r.sandbox.__boom);
console.log(r.sandbox.__probeOut || '(no output)');