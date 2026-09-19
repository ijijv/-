/* ============================================================================
 * 志怪塔 · js/10_audio.js —— 音频与素材层
 * Web Audio 音效合成 sfx() / BGM（外置优先·合成兜底）/ 素材映射与图片回退
 * ----------------------------------------------------------------------------
 * 由 原型.html 的整段内联脚本按原顺序切分而来（v0.61.05 三层重构，纯搬移）。
 * 拼接校验：本文件组去掉各自横幅后，应与切分前的内联脚本正文逐字节一致。
 * 加载：经典外链脚本（非 ES module），双击本地打开即可直接游玩。
 * ============================================================================ */
/* ===================== 音效（Web Audio，无外部资源） ===================== */
let SETTINGS = { sound:true, musicVol:0.32, sfxVol:1, lowSpec:false };
function loadSettings(){ try{ const r=localStorage.getItem('zhiguaitower_settings_v1'); if(r) SETTINGS=Object.assign(SETTINGS, JSON.parse(r)); }catch(e){} }
function persistSettings(){ try{ localStorage.setItem('zhiguaitower_settings_v1', JSON.stringify(SETTINGS)); }catch(e){} }
function fx(){ return !SETTINGS.lowSpec; }   // 流畅模式：关闭震屏/抖动/飘字等重特效
function applyLowSpec(){ document.body.classList.toggle('low-spec', !!SETTINGS.lowSpec); }
let AC=null, NOISE=null;
function ensureAudio(){ if(!AC){ try{ AC=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } if(AC && AC.state==='suspended') AC.resume(); return AC; }
function tone(freq, dur, type, vol, when, slideTo){
  const ac=ensureAudio(); if(!ac) return;
  const t=ac.currentTime+(when||0);
  const o=ac.createOscillator(), g=ac.createGain();
  o.type=type||'sine'; o.frequency.setValueAtTime(freq, t);
  if(slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t+dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime((vol||0.16)*(SETTINGS.sfxVol||1), t+0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t+dur);
  o.connect(g); g.connect(ac.destination);
  o.start(t); o.stop(t+dur+0.02);
}
function noiseBuffer(){
  if(NOISE) return NOISE;
  const ac=ensureAudio(); if(!ac) return null;
  NOISE=ac.createBuffer(1, ac.sampleRate*0.5, ac.sampleRate);
  const d=NOISE.getChannelData(0);
  for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
  return NOISE;
}
/* 打击层：白噪声 + 低通下扫，模拟"砰"的冲击感 */
function boom(dur, vol, from, to, when){
  const ac=ensureAudio(); if(!ac) return;
  const t=ac.currentTime+(when||0);
  const src=ac.createBufferSource(); src.buffer=noiseBuffer();
  const f=ac.createBiquadFilter(); f.type='lowpass';
  f.frequency.setValueAtTime(from||1800, t);
  f.frequency.exponentialRampToValueAtTime(to||180, t+dur);
  const g=ac.createGain();
  g.gain.setValueAtTime((vol||0.5)*(SETTINGS.sfxVol||1), t);
  g.gain.exponentialRampToValueAtTime(0.0001, t+dur);
  src.connect(f); f.connect(g); g.connect(ac.destination);
  src.start(t); src.stop(t+dur);
}
function sfx(name){
  if(!SETTINGS.sound) return;
  switch(name){
    case 'card': tone(360,.06,'triangle',.18); boom(.04,.12,4000,800); break;
    case 'error': tone(200,.12,'square',.18,0,120); break;
    case 'block': tone(300,.09,'triangle',.16,0,500); break;
    case 'death': boom(.3,.4,1200,100); tone(160,.18,'sawtooth',.18,0,60); break;
    case 'hit': boom(.14,.5,2000,160); tone(150,.12,'square',.2,0,70); break;
    case 'hurt': boom(.22,.6,1400,110); tone(110,.2,'sawtooth',.25,0,55); break;
    case 'heal': tone(520,.16,'sine',.14,0,760); break;
    case 'gold': tone(880,.1,'sine',.16); tone(1320,.12,'sine',.14,.06); break;
    case 'relic': tone(660,.12,'sine',.18); tone(990,.16,'sine',.14,.08); break;
    case 'win': boom(.3,.4,2000,300); [523,659,784,1047].forEach((f,i)=>tone(f,.16,'triangle',.16,i*.1)); break;
    case 'lose': boom(.4,.45,1500,120); [400,300,220,150].forEach((f,i)=>tone(f,.2,'sawtooth',.14,i*.13)); break;
    case 'boss': boom(.42,.5,800,110); tone(120,.34,'sawtooth',.22,0,58); break;
  }
}

/* ===================== 外置素材（有则增强，无则优雅回退） ===================== */
const ASSET_BASE = '素材/';
/* 单文件打包：打包.py 把下面这行的 null 换成 { '相对路径': 'data:...' }；开发时保持 null，照常读本地 素材/ */
var ASSET_MAP = null;
function assetURL(rel){ return (ASSET_MAP && ASSET_MAP[rel]) ? ASSET_MAP[rel] : ASSET_BASE + rel; }
function imgFail(el){ el.outerHTML = el.dataset.fallback || ''; }
function artImg(src, fallback, cls){
  return `<img class="${cls||''}" src="${assetURL(src)}" data-fallback="${(fallback||'').replace(/"/g,'&quot;')}" onerror="imgFail(this)" alt="">`;
}
function cardArt(c){ return `<div class="cart-wrap">${artImg('card/'+c.id+'.png', '', 'cart')}</div>`; }
function relicIcon(r){ return artImg('relic/'+r.id+'.png', '', 'ricon'); }
function setBg(name){
  var el=document.getElementById('bg'); if(!el) return;
  var path=assetURL('bg/bg_'+name+'.png');
  el.onload=function(){ document.body.classList.add('has-bg'); };
  el.onerror=function(){ el.style.display='none'; document.body.classList.remove('has-bg'); };
  el.src=path;
  el.style.display='block';
}
/* —— 背景音乐：优先 素材/music，缺失回退合成氛围音 —— */
let BGM=null, BGM_TRACK=null, MUSIC_OK=null, CUR_BGM='menu';
function clearSynthBGM(){ if(SYNTH_BGM_TIMER){ clearInterval(SYNTH_BGM_TIMER); SYNTH_BGM_TIMER=null; } }
function stopBGM(){ if(BGM){ try{ BGM.pause(); }catch(e){} BGM=null; } BGM_TRACK=null; clearSynthBGM(); }
let SYNTH_BGM_TIMER=null;
function startSynthBGM(track){
  if(SYNTH_BGM_TIMER) return;
  ensureAudio();
  const scale = track==='battle' ? [220,262,294,330,392] : [196,220,262,294,330];
  let step=0;
  SYNTH_BGM_TIMER=setInterval(()=>{
    if(!SETTINGS.sound){ clearSynthBGM(); return; }
    if(!AC) return;
    const f=scale[step%scale.length];
    tone(f, 2.2, 'sine', 0.05, 0);
    if(track==='battle' && step%2===0) tone(f*2, .5, 'triangle', .03, .1);
    step++;
  }, 2600);
}
function startBGM(track){
  if(!SETTINGS.sound){ stopBGM(); return; }
  if(BGM_TRACK===track) return;
  stopBGM();
  BGM_TRACK=track; MUSIC_OK=null;
  let exts=['.ogg','.mp3','.wav'];
  if(ASSET_MAP){ const _av=exts.filter(e=>ASSET_MAP['music/bgm_'+track+e]); if(_av.length) exts=_av; }
  let idx=0, active=true;
  function tryNext(){
    if(!active) return;
    if(idx>=exts.length){ BGM=null; startSynthBGM(track); return; }
    const a=new Audio(assetURL('music/bgm_'+track+exts[idx++]));
    a.loop=true; a.volume=(SETTINGS.musicVol==null?0.32:SETTINGS.musicVol);
    let resolved=false;
    const resolve=(ok)=>{
      if(resolved) return; resolved=true;
      if(!active) return;
      if(ok){ active=false; MUSIC_OK=true; clearSynthBGM(); a.play().catch(()=>{}); }
      else { tryNext(); }
    };
    a.onerror=()=>resolve(false);
    a.oncanplaythrough=()=>resolve(true);
    a.load(); BGM=a;
    a.play().catch(()=>{}); // 同步尝试播放：处于用户手势内即可绕过自动播放限制
    setTimeout(()=>resolve(false), 1500);
  }
  tryNext();
}
function setBGM(track){ CUR_BGM=track; startBGM(track); }
/* 首次交互解锁音频（浏览器禁止自动播放，需一次用户手势） */
function unlockAudio(){ ensureAudio(); if(BGM && SETTINGS.sound){ try{ BGM.play().catch(()=>{}); }catch(e){} } }
document.addEventListener('pointerdown', unlockAudio, {once:true});
document.addEventListener('keydown', unlockAudio, {once:true});

