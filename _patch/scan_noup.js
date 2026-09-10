// 扫描：哪些卡 t(false) === t(true)（升级文案完全不变的卡）
const fs = require('fs'), vm = require('vm'), path = require('path');
const P = path.resolve(__dirname, '..', '原型.html');
const html = fs.readFileSync(P, 'utf8');
const m = html.match(/<script>([\s\S]*?)<\/script>/);
const scan = `
;(function(){
  var HS = ['ganshiren','wuseng','yincha','tianshi'];
  var out = {};
  HS.forEach(function(h){
    G = newState(); G.hero = h;
    G.enemies = [makeEnemy(ENEMIES['youhun'],'youhun')];
    G.target = 0; G.summons = []; G.尸气 = 0;
    var same = [];
    CARDS.forEach(function(c){
      try { if (String(c.t(false)) === String(c.t(true))) same.push(c.id); }
      catch(e) { same.push(c.id + '!ERR:' + e.message); }
    });
    out[h] = same;
  });
  __report = { ok: true, noUpgrade: out };
})();
`;
const dummy = () => ({ style:{}, dataset:{}, classList:{add(){},remove(){},toggle(){},contains(){return false}},
  setAttribute(){},removeAttribute(){},appendChild(){},removeChild(){},insertBefore(){},remove(){},
  addEventListener(){},removeEventListener(){}, innerHTML:'', textContent:'', src:'',
  getBoundingClientRect(){return {left:0,top:0,right:10,bottom:10,width:10,height:10}},
  querySelector(){return null},querySelectorAll(){return []},click(){},contains(){return false},offsetWidth:0 });
const store = new Map();
const ls = { getItem:k=>store.has(k)?store.get(k):null, setItem:(k,v)=>store.set(k,String(v)), removeItem:k=>store.delete(k), clear:()=>store.clear() };
class A { constructor(){this.loop=false;this.volume=.5} set src(v){} get src(){return ''} play(){return Promise.resolve()} pause(){} addEventListener(){} removeEventListener(){} }
const sandbox = { console, setTimeout, clearTimeout, setInterval, clearInterval,
  requestAnimationFrame:cb=>setTimeout(()=>cb(Date.now()),0), cancelAnimationFrame:clearTimeout, performance,
  Audio:A, Image:function(){return dummy()}, navigator:{userAgent:'scan'}, location:{href:'about:blank'},
  history:{pushState(){},replaceState(){}}, localStorage:ls, sessionStorage:ls,
  document:{ addEventListener(){}, removeEventListener(){}, getElementById(){return dummy()}, querySelector(){return null},
    querySelectorAll(){return []}, createElement(){return dummy()}, createTextNode(){return {}}, body:dummy(), documentElement:dummy(), head:dummy(), title:'' },
  alert(){}, confirm(){return true}, prompt(){return null}, screen:{width:1280,height:800},
  TextEncoder, TextDecoder, URL, URLSearchParams, __report:null, __boom:null };
sandbox.window = sandbox; sandbox.self = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);
try { vm.runInContext(m[1] + scan, sandbox, { timeout: 90000 }); }
catch (e) { sandbox.__boom = e && e.stack ? e.stack : String(e); }
console.log(JSON.stringify({ boom: sandbox.__boom, rep: sandbox.__report }, null, 1));
