// 运行时冒烟测试 v2：暴露脚本作用域内的 G / 关键函数，跑完整开局→战斗流程
const fs = require('fs');

function makeEl(tag){
  const el = {
    tag: tag||'div',
    style: {},
    dataset: {},
    classList: { add(){}, remove(){}, toggle(){}, contains(){ return false; } },
    children: [],
    attributes: {},
    appendChild(c){ this.children.push(c); return c; },
    removeChild(c){ return c; },
    remove(){},
    setAttribute(k,v){ this.attributes[k]=v; },
    getAttribute(k){ return this.attributes[k]!=null?this.attributes[k]:null; },
    addEventListener(){}, removeEventListener(){},
    querySelector(){ return null; },
    querySelectorAll(){ return []; },
    getBoundingClientRect(){ return {left:0,top:0,width:100,height:100,right:100,bottom:100}; },
    innerHTML:'', outerHTML:'', textContent:'',
    offsetWidth:0, offsetHeight:0,
    value:'', checked:false, src:'', display:'',
  };
  return el;
}
const elCache = {};
function getEl(id){ if(!elCache[id]) elCache[id]=makeEl('#'+id); return elCache[id]; }

const document = {
  body: makeEl('body'), documentElement: makeEl('html'),
  getElementById(id){ return getEl(id); },
  createElement(tag){ return makeEl(tag); },
  querySelector(sel){ return null; },
  querySelectorAll(sel){ return []; },
  addEventListener(){}, removeEventListener(){},
};
const _store = {};
const localStorage = {
  getItem(k){ return (k in _store)?_store[k]:null; },
  setItem(k,v){ _store[k]=String(v); },
  removeItem(k){ delete _store[k]; },
};
function FakeAudio(src){ this.src=src; this.loop=false; this.volume=0.3; }
FakeAudio.prototype.play=function(){ return Promise.resolve(); };
FakeAudio.prototype.pause=function(){};
FakeAudio.prototype.load=function(){};
FakeAudio.prototype.addEventListener=function(){};

const window = { innerWidth:800, innerHeight:600, AudioContext:null, webkitAudioContext:null, addEventListener(){} };
global.window = window; global.document = document; global.localStorage = localStorage;
global.navigator = {}; global.Audio = FakeAudio;
global.requestAnimationFrame = (fn)=>setTimeout(fn,0);
global.Image = function(){ return makeEl('img'); };

const html = fs.readFileSync('原型.html','utf8');
const m = html.match(/<script>([\s\S]*?)<\/script>/);
let js = m[1];
// 暴露脚本作用域内的关键符号供测试驱动
js += '\n;globalThis.__G=()=>G; globalThis.__HEROES=HEROES; globalThis.__ENEMIES=ENEMIES;'
   + ' globalThis.__render=render; globalThis.__startBattle=startBattle;'
   + ' globalThis.__pickHero=pickHero; globalThis.__skipOpening=skipOpening;'
   + ' globalThis.__showMap=showMap; globalThis.__startTurn=startTurn;'
   + ' globalThis.__renderTopbar=renderTopbar; globalThis.__endTurn=endTurn;';

try { (0, eval)(js); } catch(e){ console.log('LOAD ERROR:', e.stack||e.message); process.exit(1); }
console.log('LOAD OK');

function step(name, fn){ try { fn(); console.log('STEP OK:', name); } catch(e){ console.log('STEP ERROR ['+name+']:', e.stack||e.message); process.exit(1); } }

step('showStartScreen', ()=> showStartScreen());
step('confirmNewGame', ()=> confirmNewGame());
step('pickHero', ()=> __pickHero(__HEROES[0].id));
step('skipOpening->showMap', ()=> __skipOpening());
step('render', ()=> __render());
step('startBattle(yinchai)', ()=> __startBattle(['yinchai']));
step('startTurn', ()=> __startTurn());
step('endTurn', ()=> __endTurn());
console.log('ALL STEPS OK — 开局→战斗完整流程无崩溃');
