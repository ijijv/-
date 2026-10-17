/* ============================================================================
 * 志怪塔 音频层：音效合成 / BGM / 素材映射与图片回退
 * ============================================================================ */
/* 音效：合成 + 可选外置采样 */
let SETTINGS = { sound:true, musicVol:0.32, sfxVol:1, lowSpec:false, endTurnHint:true, perfReadout:false };
function loadSettings(){ try{ const r=Store.getJSON('zhiguaitower_settings_v1'); if(r) SETTINGS=Object.assign(SETTINGS, r); }catch(e){} }
function persistSettings(){ try{ Store.setJSON('zhiguaitower_settings_v1', SETTINGS); }catch(e){} }
function fx(){ return !SETTINGS.lowSpec; }   // 流畅模式：关重特效
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
/* 打击层：白噪下扫，砰一下 */
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

/* 音效分发表。三种写法：['t',freq,dur,type,vol,when,slide] 单个振荡器 / ['b',dur,vol,from,to,when] 白噪下扫 /
   ['n',[...],dur,type,vol,step] 一串音。转发一律 .apply 原样透传，别补默认值，顺序就是听感别重排 */
const SFX_TABLE = {
  hit_light:      [['b',.10,.32,2600,500],['t',300,.06,'triangle',.14]],
  hit_heavy:      [['b',.28,.55,1600,140],['t',120,.18,'square',.20,0,60]],
  hit_crit:       [['b',.34,.60,2400,200],['t',900,.10,'square',.16],['t',1400,.14,'triangle',.12,.05,700]],
  hit_guard:      [['b',.16,.34,900,180],['t',220,.10,'triangle',.12,0,180]],
  hurt:           [['b',.22,.6,1400,110],['t',110,.2,'sawtooth',.25,0,55]],
  block:          [['t',300,.09,'triangle',.16,0,500]],
  death:          [['b',.3,.4,1200,100],['t',160,.18,'sawtooth',.18,0,60]],
  thorns:         [['t',1200,.08,'square',.16,0,2400],['b',.10,.22,3200,900]],
  atk_slash:      [['b',.14,.28,3600,900],['t',700,.10,'triangle',.10,0,1800]],
  atk_talisman:   [['t',300,.30,'sine',.12,0,900],['b',.12,.16,2200,700]],
  atk_blunt:      [['b',.30,.45,1100,180],['t',160,.16,'sine',.16,0,120]],
  atk_aoe:        [['b',.48,.50,2600,120],['t',180,.30,'sawtooth',.14,0,80]],
  atk_multi_each: [['b',.07,.24,3000,900]],
  atk_true:       [['t',420,.34,'sine',.16,0,90],['b',.24,.20,700,180]],
  enemy_attack:   [['b',.16,.42,1800,220],['t',200,.10,'square',.16,0,90]],
  enemy_multi:    [['b',.10,.34,2200,400],['t',260,.06,'square',.13,0,140]],
  enemy_charge:   [['t',160,.42,'sawtooth',.16,0,420]],
  enemy_block:    [['b',.14,.30,800,200],['t',260,.12,'triangle',.14,0,360]],
  enemy_heal:     [['t',380,.20,'sine',.14,0,600],['t',570,.18,'sine',.12,.10,760]],
  enemy_strength: [['t',200,.24,'sawtooth',.16,0,340],['t',300,.20,'square',.12,.08,420]],
  enemy_summon:   [['t',300,.30,'triangle',.14,0,760],['t',150,.26,'sine',.14,.12,90]],
  enemy_debuff:   [['t',260,.26,'square',.16,0,110],['b',.14,.20,900,220]],
  enemy_buff_self:[['t',180,.30,'triangle',.16,0,360],['t',270,.24,'sine',.12,.10,520]],
  enemy_qingsuan: [['b',.40,.55,1500,120],['t',140,.30,'sawtooth',.22,0,70],['t',900,.12,'square',.10,.10,400]],
  enemy_dormant:  [['t',300,.34,'sine',.10,0,180]],
  card:           [['t',360,.06,'triangle',.18],['b',.04,.12,4000,800]],
  card_draw:      [['t',640,.09,'triangle',.14,0,900]],
  card_discard:   [['t',420,.12,'triangle',.13,0,180]],
  card_exhaust:   [['b',.20,.30,1800,300],['t',260,.18,'sine',.12,0,120]],
  card_curse:     [['t',240,.26,'sawtooth',.15,0,150],['t',150,.20,'square',.11,.06,90]],
  card_zhenhun:   [['b',.34,.44,700,140],['t',220,.28,'sine',.18,0,110]],
  card_charm:     [['t',520,.22,'sine',.14,0,760],['t',780,.20,'triangle',.10,.10,980]],
  card_defense:   [['b',.10,.20,1200,400],['t',340,.12,'triangle',.14,0,560]],
  card_buff:      [['t',440,.14,'sine',.14,0,640],['t',660,.16,'sine',.12,.08,880]],
  heal:           [['t',520,.16,'sine',.14,0,760]],
  card_summon:    [['t',260,.26,'triangle',.14,0,620],['b',.16,.22,1000,260]],
  card_shiji:     [['b',.26,.28,600,160],['t',180,.24,'sawtooth',.12,0,240]],
  card_xuenu:     [['t',160,.24,'sawtooth',.18,0,300],['b',.18,.26,900,200]],
  kw_burn:        [['b',.30,.30,900,200],['t',200,.24,'sawtooth',.13,0,120]],
  kw_curse:       [['t',210,.24,'square',.14,0,130]],
  kw_weak:        [['t',320,.26,'triangle',.13,0,150]],
  kw_gouhun:      [['t',420,.30,'sine',.15,0,130],['b',.20,.24,1300,300]],
  kw_wangyou:     [['t',480,.34,'sine',.13,0,300],['t',360,.30,'sine',.11,.12,220]],
  kw_yehuo:       [['b',.42,.40,1400,180],['t',150,.32,'sawtooth',.18,0,60]],
  kw_shield_break:[['b',.24,.46,3000,300],['t',700,.14,'square',.14,0,180]],
  kw_regen:       [['t',460,.20,'sine',.13,0,700],['t',330,.18,'sine',.11,.10,520]],
  kw_linghua:     [['t',760,.26,'sine',.13,0,1100]],
  kw_junk:        [['t',220,.20,'square',.13,0,140],['b',.12,.18,800,260]],
  affix_proc:     [['t',300,.16,'triangle',.13,0,420],['b',.12,.20,1600,400]],
  boss:           [['b',.42,.5,800,110],['t',120,.34,'sawtooth',.22,0,58]],
  boss_phase2:    [['b',.50,.55,900,110],['t',110,.44,'sawtooth',.22,0,55],['t',330,.30,'square',.12,.18,660]],
  boss_split:     [['b',.34,.50,1600,180],['t',520,.20,'triangle',.16,0,260],['t',520,.20,'triangle',.14,.16,260]],
  boss_ledger:    [['t',600,.14,'triangle',.14],['b',.16,.30,1200,300]],
  boss_yehuo:     [['b',.46,.46,1200,150],['t',130,.36,'sawtooth',.20,0,50]],
  ui_click:       [['t',720,.05,'triangle',.10]],
  error:          [['t',200,.12,'square',.18,0,120]],
  ui_panel:       [['t',380,.10,'sine',.10,0,520]],
  ui_map:         [['t',520,.12,'triangle',.13,0,700]],
  ui_reward:      [['t',660,.12,'triangle',.14,0,880],['t',990,.14,'sine',.11,.08,1100]],
  ui_flip:        [['t',520,.09,'triangle',.12,0,900],['b',.10,.14,2200,700]],
  ui_levelup:     [['t',523,.14,'triangle',.14],['t',784,.16,'triangle',.12,.10,1046]],
  ui_unlock:      [['t',600,.14,'sine',.13,0,900],['t',900,.16,'sine',.11,.10,1200]],
  gold:           [['t',880,.1,'sine',.16],['t',1320,.12,'sine',.14,.06]],
  relic:          [['t',660,.12,'sine',.18],['t',990,.16,'sine',.14,.08]],
  win:            [['b',.3,.4,2000,300],['n',[523,659,784,1047],.16,'triangle',.16,.1]],
  lose:           [['b',.4,.45,1500,120],['n',[400,300,220,150],.2,'sawtooth',.14,.13]],
  relic_bell:     [['t',880,.40,'sine',.16],['t',1320,.36,'sine',.11,.10,1320]],
  relic_fu:       [['t',400,.20,'triangle',.14,0,760],['b',.12,.16,1800,500]],
  relic_mirror:   [['t',1100,.24,'sine',.12,0,1600]],
  glass_break:    [['b',.16,.34,3200,900],['t',2600,.09,'triangle',.15,0,1400],['t',1900,.11,'triangle',.12,.05,1000],['t',1200,.14,'triangle',.10,.11,600]],
  ui_stele:       [['b',.26,.55,1500,240],['t',150,.16,'square',.20,0,80],
                   ['t',430,.10,'triangle',.13,.07,320],['t',880,.08,'triangle',.10,.14,560]],
  ui_curtain:     [['b',.34,.30,2400,900],['t',620,.22,'sine',.10,0,1500],['t',1250,.14,'triangle',.08,.06,900]],
  ui_poster:      [['b',.13,.42,900,170],['t',250,.12,'triangle',.16,0,430],['t',430,.10,'sine',.10,.05,560]],
  number:         [['t',1180,.03,'triangle',.08]],
  stone_broken:   [['b',.30,.55,1700,220],['t',150,.16,'square',.20,0,80],['t',430,.10,'triangle',.13,.07,320]],
  rank:           [['t',660,.12,'triangle',.14,0,980],['t',990,.14,'sine',.12,.09,1320]],
  boom:           [['b',.30,.50,1400,120],['t',120,.24,'sawtooth',.20,0,60]],
  energy:         [['t',420,.26,'sine',.13,0,900],['t',640,.22,'sine',.11,.10,1200]],
  spark:          [['b',.12,.34,3600,1200],['t',2400,.10,'triangle',.14,0,900]],
  slash:          [['b',.10,.30,4000,1100],['t',1600,.09,'sawtooth',.12,0,1400]],
  lightning:      [['b',.30,.46,2600,300],['t',120,.28,'sawtooth',.20,0,70],['t',1800,.14,'square',.12,.06,600]]
};
const BOSS_VFX_SFX_KEYS = [
  'b1_jiangwang_attack_claw','b1_jiangwang_drain_feed','b1_jiangwang_summon_minion',
  'b2_hanba_attack_flame_claw','b2_hanba_burn_apply','b2_hanba_burn_tick',
  'b3_xueshi_attack_claw','b3_xueshi_charge','b3_xueshi_heavy_smash','b3_xueshi_lifesteal',
  'b4_xiebian_attack_staff','b4_xiebian_soul_hook','b4_xiebian_split',
  'b5_judge_attack_gavel','b5_judge_record','b5_judge_settle',
  'b6_mengpo_attack_ladle','b6_mengpo_forget','b6_mengpo_heal',
  'b7_yewang_attack_blade','b7_yewang_pressure',
  'b8_xiuluo_attack_slash','b8_xiuluo_backlash','b8_xiuluo_karma_fire',
  'b9_yanluo_affix','b9_yanluo_attack_smash','b9_yanluo_revive','b9_yanluo_summon_yinchai'
];
const _BOSS_SFX_FALLBACK = [['b',.18,.42,2200,320],['t',420,.12,'triangle',.10,.05,300]];
BOSS_VFX_SFX_KEYS.forEach(function(k){ if(!SFX_TABLE[k]) SFX_TABLE[k]=_BOSS_SFX_FALLBACK; });
SFX_TABLE.fx_forge = [['b',.22,.32,2600,700],['b',.16,.22,500,2400]];
SFX_TABLE.fx_burn  = [['b',.42,.34,2200,300],['t',180,.28,'sawtooth',.10,0,70]];
SFX_TABLE.talisman_click     = [['t',560,.06,'triangle',.16,0,320],['b',.05,.14,3000,900]];
SFX_TABLE.talisman_slide     = [['b',.14,.22,1800,500],['t',420,.10,'sine',.08,0,760]];
SFX_TABLE.key_press          = [['t',520,.07,'triangle',.14,0,660],['t',780,.06,'sine',.10,.03,980]];
SFX_TABLE.poster_bounce_land = [['b',.20,.42,1200,180],['t',180,.12,'triangle',.14,.06,90]];
SFX_TABLE.wanjian = [['b',.16,.30,3400,900],['t',700,.10,'triangle',.12,0,1600]];
SFX_TABLE.gouhun  = [['t',420,.30,'sine',.15,0,130],['b',.20,.24,1300,300]];
SFX_TABLE.tianlei     = [['b',.30,.46,2600,300],['t',180,.22,'sawtooth',.18,0,90]];
SFX_TABLE.lei         = [['b',.20,.34,2400,400],['t',300,.12,'square',.16,0,120]];
SFX_TABLE.zhenyaoling = [['t',880,.24,'sine',.16,0,520],['t',1320,.20,'triangle',.10,.10,760]];
SFX_TABLE.relic_proc = [['b',.18,.40,1900,320],['t',880,.20,'triangle',.11,.05,520]];
SFX_TABLE.jinzhong = [['t',640,.30,'sine',.16,0,420],['b',.22,.30,1500,400]];
SFX_TABLE.wangyou  = [['t',300,.34,'sine',.14,0,160],['b',.24,.28,1100,260]];
const SFX_KEYS = Object.keys(SFX_TABLE);
const _sfxWarned = {};
function sfxWarnUnknown(name){
  if(_sfxWarned[name]) return; _sfxWarned[name]=1;
  try{ console.warn('[sfx] 未知键名（已忽略）:', name); }catch(e){}
}
/* 同一键的最小间隔节流：只给帧内会连调很多次的键，不是全局 */
const _sfxGate = {};
function sfxOnce(name, ms){
  const now = (typeof performance!=='undefined' && performance.now) ? performance.now() : Date.now();
  if(_sfxGate[name] && now-_sfxGate[name] < (ms||80)) return false;
  _sfxGate[name]=now; sfx(name); return true;
}

/* 外置音效采样：有 素材/sfx/<键名>_<变体号>.<ext> 就用它，没有回退合成 */
const SFX_SAMPLE_DIR = 'sfx/';
const SFX_VARIANTS_MAX = 3;
const SFX_SAMPLE_MAX = 120;
const SFX_LOAD_TIMEOUT = 8000;
const SFX_RATE_MIN = 0.94, SFX_RATE_MAX = 1.22;
var SFX_BUF = {};
var SFX_LOADED = false, SFX_LOADING = false, _sfxHinted = false;
var _sfxLastVariant = {};
let sfxMode = 'auto';
try{ if(typeof SFX_SAMPLE_MODE==='string') sfxMode=SFX_SAMPLE_MODE; }catch(e){}
var SFX_PROTO = (typeof location!=='undefined' && location && location.protocol) ? location.protocol : '';
var SFX_FETCH_OK = (typeof fetch==='function') && SFX_PROTO!=='file:';  // file:// 下 fetch 会被浏览器拦，别白试

function sfxCandidates(name){
  const out=[];
  for(let e=0;e<AUD_EXTS.length;e++){
    out.push(SFX_SAMPLE_DIR+name+AUD_EXTS[e], SFX_SAMPLE_DIR+name+'_1'+AUD_EXTS[e]);
  }
  for(let v=2;v<=SFX_VARIANTS_MAX;v++)
    for(let e=0;e<AUD_EXTS.length;e++) out.push(SFX_SAMPLE_DIR+name+'_'+v+AUD_EXTS[e]);
  return out;
}
function sampleURL(rel){
  if(ASSET_MAP) return ASSET_MAP[rel] || null;
  if(!SFX_FETCH_OK) return null;
  return ASSET_BASE + rel;
}
function sfxRate(opt){
  if(!opt) return 1;
  const r = (typeof opt==='number') ? opt : opt.rate;
  if(!(r>0)) return 1;
  return Math.max(SFX_RATE_MIN, Math.min(SFX_RATE_MAX, r));
}
function sfxDamageRate(dmg){
  const d = +dmg || 0;
  return Math.max(SFX_RATE_MIN, Math.min(SFX_RATE_MAX, 0.94 + d/60));
}
function pickVariant(name, n){
  let v = Math.floor(Math.random()*n);           // 这里故意用 Math.random，别扰动可复现的 rng 流
  if(n>1 && v===_sfxLastVariant[name]-1) v=(v+1)%n;
  _sfxLastVariant[name]=v+1;
  return v;
}
function playSample(name, rate, frac){
  if(sfxMode==='synth') return false;
  const list=SFX_BUF[name]; if(!list || !list.length) return false;
  const ac=ensureAudio(); if(!ac || !ac.createBufferSource || !ac.createGain) return false;
  try{
    const src=ac.createBufferSource();
    const buf = list.length>1 ? list[pickVariant(name, list.length)] : list[0];
    src.buffer = buf;
    if(src.playbackRate) src.playbackRate.value = rate||1;
    const g=ac.createGain(); g.gain.value = (SETTINGS.sfxVol==null?1:SETTINGS.sfxVol);
    src.connect(g); g.connect(ac.destination);
    if(frac>0 && frac<1 && buf && buf.duration) src.start(0, 0, buf.duration*frac);
    else src.start(0);
    return true;
  }catch(e){ return false; }
}
function loadOneSample(ac, name, cb){
  const cands=sfxCandidates(name);
  let waiting=cands.length, got=0, finished=false, to=null;
  function close(){ if(finished) return; finished=true; if(to) clearTimeout(to); cb(got); }
  function settle(buf){ waiting--; if(buf){ (SFX_BUF[name]=SFX_BUF[name]||[]).push(buf); got++; } if(waiting<=0) close(); }
  if(!waiting) return close();
  to=setTimeout(close, SFX_LOAD_TIMEOUT);
  for(let i=0;i<cands.length;i++)(function(rel){
    const url=sampleURL(rel); if(!url) return settle(null);
    try{
      fetch(url).then(r=>r.ok===false?null:r.arrayBuffer())
        .then(ab=>{ if(!ab) return settle(null);
          ac.decodeAudioData(ab, b=>settle(b||null), ()=>settle(null)); })
        .catch(()=>settle(null));
    }catch(e){ settle(null); }
  })(cands[i]);
}
function loadSfxSamples(){
  if(SFX_LOADED || SFX_LOADING || sfxMode==='synth') return;
  if(sfxMode==='auto' && !ASSET_MAP && !SFX_FETCH_OK){
    if(!_sfxHinted){ _sfxHinted=true;
      try{ console.info('[音效] 当前是 file:// 双击打开，浏览器会拦 fetch，'+
        '素材/sfx/ 下的外置音效探测已跳过，全部走 WebAudio 合成音。'+
        '想听到自己放进去的音效：用 `python 试玩.py` 起本地 http 服务再打开，'+
        '或 `python 打包.py` 用产物（音效已内联）。随时可用 sfxSamples() 查采样状态。'); }catch(e){}
    }
    return;
  }
  const ac=ensureAudio();
  if(!ac || typeof ac.decodeAudioData!=='function' || typeof ac.createBufferSource!=='function') return;
  SFX_LOADING=true;
  const keys=SFX_KEYS.slice(0, SFX_SAMPLE_MAX);
  let i=0;
  (function next(){
    if(i>=keys.length){ SFX_LOADED=true; SFX_LOADING=false; return; }
    loadOneSample(ac, keys[i++], ()=>{ try{ next(); }catch(e){ SFX_LOADING=false; } });
  })();
}
function sfxSamples(){
  let files=0; for(const k in SFX_BUF) files+=SFX_BUF[k].length;
  return { mode:sfxMode, keys:Object.keys(SFX_BUF).length, files:files, loaded:SFX_LOADED, loading:SFX_LOADING, fetchOk:SFX_FETCH_OK };
}
function sfxStep(s, rate){
  let i, arr;
  if(s[0]==='t'){
    if(rate===1){ tone.apply(null, s.slice(1)); return; }
    return tone(s[1]*rate, s[2]/rate, s[3], s[4], s[5], s[6]!=null ? s[6]*rate : void 0);
  }
  if(s[0]==='b'){
    if(rate===1){ boom.apply(null, s.slice(1)); return; }
    return boom(s[1]/rate, s[2], s[3]*rate, s[4]*rate, s[5]);
  }
  if(s[0]==='n'){
    arr=s[1];
    for(i=0;i<arr.length;i++){
      if(rate===1) tone(arr[i], s[2], s[3], s[4], i*s[5]);
      else tone(arr[i]*rate, s[2]/rate, s[3], s[4], i*s[5]);
    }
    return;
  }
}
const SFX_FRAC = {
};
function sfx(name, opt){
  if(!SETTINGS.sound) return;
  let mul=SETTINGS.sfxVol; if(mul==null) mul=1;
  // 0 是合法值，别写成 (sfxVol||1)
  if(!(mul>0)) return;
  const rate=sfxRate(opt);
  if(playSample(name, rate, SFX_FRAC[name])) return;
  const steps=SFX_TABLE[name];
  if(!steps){ sfxWarnUnknown(name); return; }
  for(let i=0;i<steps.length;i++) sfxStep(steps[i], rate);
}
const HIT_HEAVY_DMG = 10, HIT_CRIT_DMG = 20;
function isCritHit(dmg, killed){ return !!killed || dmg>=HIT_CRIT_DMG; }
function pickHitSfx(dmg, blockedAll, killed){
  if(blockedAll) return 'hit_guard';
  if(isCritHit(dmg, killed)) return 'hit_crit';
  if(dmg>=HIT_HEAVY_DMG) return 'hit_heavy';
  return 'hit_light';
}

/* 教程旁白配音：素材/voice/<id>.mp3，文件名就是 id。人声固定不变调，单开一条路，不走 SFX_TABLE */
const VOICE_DIR='voice/';
const VOICE_EXT='.mp3';
var VOICE_BUF={};
var VOICE_LOADING={};
var VOICE_SRC=null;
var VOICE_WANT=null;
function _voiceKill(){ if(VOICE_SRC){ try{ VOICE_SRC.stop(); }catch(e){} VOICE_SRC=null; } }
function stopVoice(){ VOICE_WANT=null; _voiceKill(); }
function voiceLoad(id, cb){
  if(VOICE_BUF[id]){ if(cb){ try{ cb(VOICE_BUF[id]); }catch(e){} } return; }
  if(VOICE_LOADING[id]){ if(cb) VOICE_LOADING[id].push(cb); return; }
  VOICE_LOADING[id] = cb ? [cb] : [];
  const done=function(buf){
    if(buf) VOICE_BUF[id]=buf;
    const q=VOICE_LOADING[id]||[]; VOICE_LOADING[id]=null;
    for(let i=0;i<q.length;i++){ try{ q[i](buf); }catch(e){} }
  };
  const ac=ensureAudio();
  const url=(typeof assetURL==='function') ? assetURL(VOICE_DIR+id+VOICE_EXT) : null;
  if(!url || typeof fetch!=='function' || !ac || typeof ac.decodeAudioData!=='function'){ done(null); return; }
  try{
    fetch(url).then(function(r){ return (r && r.ok===false) ? null : r.arrayBuffer(); })
      .then(function(ab){ if(!ab) return done(null);
        ac.decodeAudioData(ab, function(b){ done(b||null); }, function(){ done(null); }); })
      .catch(function(){ done(null); });
  }catch(e){ done(null); }
}
function playVoiceBuffer(buf){
  const ac=ensureAudio(); if(!ac || !buf || typeof ac.createBufferSource!=='function') return;
  _voiceKill();
  try{
    const src=ac.createBufferSource(); src.buffer=buf;
    const g=ac.createGain(); g.gain.value=(SETTINGS.sfxVol==null?1:SETTINGS.sfxVol);
    src.connect(g); g.connect(ac.destination);
    src.onended=function(){ if(VOICE_SRC===src) VOICE_SRC=null; };
    src.start(0); VOICE_SRC=src;
  }catch(e){}
}
function playVoice(id){
  if(!id){ stopVoice(); return; }
  const vol=(SETTINGS.sfxVol==null?1:SETTINGS.sfxVol);
  if(!SETTINGS.sound || !(vol>0)){ stopVoice(); return; }
  VOICE_WANT=id;
  if(VOICE_BUF[id]) playVoiceBuffer(VOICE_BUF[id]);
  else voiceLoad(id, function(b){ if(b && VOICE_WANT===id) playVoiceBuffer(b); });
}

/* 外置素材：有则增强，无则回退 */
const ASSET_BASE = '素材/';
/* 音效用 mp3 优先、BGM 用 ogg 优先，顺序别动，同名多格式时选中的曲子会变 */
const AUD_EXTS = ['.mp3','.ogg','.wav','.m4a'];
const BGM_EXTS = ['.ogg','.mp3','.wav','.m4a'];
var ASSET_MAP = null;
/* 这条正则只认图片扩展名，BGM 的 .ogg/.mp3 也走 assetURL，别把后缀换没了 */
var ASSET_WEBP = false;
/* 单文件产物素材是 base64，热路径图片转成 blob 短地址再拼 HTML；音频/一次性背景照旧 data URI */
const ASSET_OBJ_URLS = {};
function dataURItoBlobURL(uri){
  try{
    if(typeof Blob==='undefined' || typeof URL==='undefined' || !URL.createObjectURL) return null;
    const comma=uri.indexOf(',');
    if(comma<0) return null;
    const head=uri.slice(5, comma);
    if(head.indexOf('base64')<0) return null;
    const bin=atob(uri.slice(comma+1));
    const n=bin.length, bytes=new Uint8Array(n);
    for(let i=0;i<n;i++) bytes[i]=bin.charCodeAt(i);
    return URL.createObjectURL(new Blob([bytes], {type:head.split(';')[0]||'application/octet-stream'}));
  }catch(e){ return null; }
}
function assetURL(rel, wantBlob){
  if(ASSET_MAP && ASSET_MAP[rel]){
    const v=ASSET_MAP[rel];
    if(v.slice(0,5)!=='data:') return v;
    if(!wantBlob) return v;
    const c=ASSET_OBJ_URLS[rel];
    if(c) return c;
    const u=dataURItoBlobURL(v);
    if(!u) return v;
    ASSET_OBJ_URLS[rel]=u;
    return u;
  }
  return ASSET_BASE + (ASSET_WEBP ? rel.replace(/\.(png|jpe?g|bmp)$/i, '.webp') : rel);
}
function imgFail(el){ el.outerHTML = el.dataset.fallback || ''; }
/* draggable="false" 是修 bug 的，别删。
   <img> 默认可拖，左键一拖就抛 pointercancel，把地图滑动/出牌当场掐断 */
function artImg(src, fallback, cls){
  return `<img class="${cls||''}" src="${assetURL(src, true)}" draggable="false" data-fallback="${(fallback||'').replace(/"/g,'&quot;')}" onerror="imgFail(this)" alt="">`;
}
const ICON_PROBE = {};
let ICON_RERENDER = false;
function iconPokeRender(){
  if(ICON_RERENDER) return;
  ICON_RERENDER = true;
  setTimeout(function(){ ICON_RERENDER = false; try{ render(); }catch(e){} }, 0);
}
function iconAvail(rel){
  const st = ICON_PROBE[rel];
  if(st === 'yes') return true;
  if(st === undefined){
    ICON_PROBE[rel] = 'no';
    try{
      const im = new Image();
      im.onload = function(){ ICON_PROBE[rel] = 'yes'; iconPokeRender(); };
      im.onerror = function(){ ICON_PROBE[rel] = 'no'; };
      im.src = assetURL(rel, true);
    }catch(e){}
  }
  return false;
}
function iconTag(rel, fallback, cls){
  if(!iconAvail(rel)) return fallback || '';
  return `<img class="${cls||'bicon'}" src="${assetURL(rel, true)}" draggable="false" alt="">`;
}
function cardArt(c){ return `<div class="cart-wrap">${artImg('card/'+c.id+'.png', '', 'cart')}</div>`; }
/* 加载失败要连 .has-frame 一起摘，只摘 <img> 卡面会散架 */
function cardFrameFail(el){
  var p = el && el.parentNode;
  if(p && p.classList) p.classList.remove('has-frame');
  imgFail(el);
}
function cardFrame(){
  return `<img class="cframe" src="${assetURL('ui/card/front.png', true)}" draggable="false" onerror="cardFrameFail(this)" alt="">`;
}
function pileInit(){
  try{
    var r = document.documentElement && document.documentElement.style;
    if(!r || !r.setProperty) return;
    r.setProperty('--pile-back-img', 'url("'+assetURL('ui/card/back.png')+'")');
    r.setProperty('--pile-side-img', 'url("'+assetURL('ui/card/side.png')+'")');
  }catch(e){}
}
function refreshPileCounts(){
  try{
    const dn=document.getElementById('pile-draw-n');    if(dn) dn.textContent=G.drawPile.length;
    const cn=document.getElementById('pile-discard-n'); if(cn) cn.textContent=G.discard.length;
  }catch(e){}
}
function relicIcon(r){
  const o = r || {};
  const src = lingshiSrc(o.id) || ('relic/'+o.id+'.png');
  const fb = (typeof ART_PENDING !== 'undefined' && ART_PENDING.indexOf(src) >= 0) ? String(o.name || '').slice(-1) : '';
  return artImg(src, fb ? `<div class="ricon ricon-fb">${fb}</div>` : '', 'ricon');
}
function potionIcon(p){
  var o = p || {};
  var s = lingshiSrc(o.id);
  if(s) return artImg(s, '', 'ricon');
  var ch = String(o.name || '').slice(-1);
  return ch ? '<div class="ricon ricon-fb">' + ch + '</div>' : '';
}
function bgRel(name){
  if(name==='menu') return 'bg/menu/menu_3.png';
  return (/\.[A-Za-z0-9]+$/.test(name)) ? ('bg/bg_'+name) : ('bg/bg_'+name+'.png');
}
const SCENE_BG = { 'shop.jpg':1, 'campfire.jpg':1, 'victory.jpg':1, 'defeat.jpg':1,
                   'hero_select.jpg':1, 'victory_reward.jpg':1 };
const PRE_RUN_BG = { 'menu':1, 'hero_select.jpg':1 };
function setBg(name){
  var _bgName=String(name||'');
  if(document.body && document.body.classList)
    document.body.classList.toggle('at-menu', !!PRE_RUN_BG[_bgName]);
  /* 类名还叫 evt-bg，其实语义比名字宽，是故意没改的（被夹具钉着），别被名字骗 */
  if(document.body && document.body.classList)
    document.body.classList.toggle('evt-bg', /^evt_/.test(_bgName) || !!SCENE_BG[_bgName]);
  var el=document.getElementById('bg'); if(!el) return;
  var path=assetURL(bgRel(name), true);
  el.onload=function(){ document.body.classList.add('has-bg'); };
  el.onerror=function(){ el.style.display='none'; document.body.classList.remove('has-bg'); };
  el.src=path;
  el.style.display='block';
}
/* BGM：优先素材，缺失回退合成 */
let BGM=null, BGM_TRACK=null, MUSIC_OK=null, CUR_BGM='menu';
/* BGM_GEN：给每条 startBGM 探测链编号，stopBGM 时 ++ 让在途的旧链静默退出。
   不然旧轨道稍后照样 play()，新旧两首叠在一起 */
let BGM_GEN=0;
function clearSynthBGM(){ if(SYNTH_BGM_TIMER){ clearInterval(SYNTH_BGM_TIMER); SYNTH_BGM_TIMER=null; } }
function stopBGM(){ BGM_GEN++; if(BGM){ try{ BGM.pause(); }catch(e){} BGM=null; } BGM_TRACK=null; clearSynthBGM(); }
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
const BGM_KNOWN_TRACKS = ['menu','map','battle','battle_elite','battle_boss','shop'];
const BGM_FALLBACK = { battle_elite:'battle', battle_boss:'battle', shop:'map' };
function bgmTrackFor(track){
  if(!ASSET_MAP) return track;
  return BGM_EXTS.some(e=>ASSET_MAP['music/bgm_'+track+e]) ? track : (BGM_FALLBACK[track]||track);
}
function bgmFallbackFor(track){
  const fb=BGM_FALLBACK[track];
  return (fb && fb!==track) ? fb : null;   // fb===track 返回 null，否则会自我递归
}
function battleBgmFor(enemies){
  const l=enemies||[];
  if(l.some(e=>e&&e.boss)) return 'battle_boss';
  if(l.some(e=>e&&e.elite)) return 'battle_elite';
  return 'battle';
}
function startBGM(track){
  if(!SETTINGS.sound){ stopBGM(); return; }
  if(BGM_TRACK===track) return;
  stopBGM();
  const gen=++BGM_GEN;
  BGM_TRACK=track; MUSIC_OK=null;
  let exts=BGM_EXTS.slice();
  if(ASSET_MAP){ const _av=exts.filter(e=>ASSET_MAP['music/bgm_'+track+e]); if(_av.length) exts=_av; }
  let idx=0;
  function tryNext(){
    if(gen!==BGM_GEN) return;
    if(idx>=exts.length){
      const __fb=bgmFallbackFor(track);
      if(__fb) return startBGM(__fb);
      BGM=null; startSynthBGM(track); return;
    }
    const a=new Audio(assetURL('music/bgm_'+track+exts[idx++]));
    a.loop=true; a.volume=(SETTINGS.musicVol==null?0.32:SETTINGS.musicVol);
    let resolved=false;
    const resolve=(ok)=>{
      if(gen!==BGM_GEN) return;
      if(resolved) return; resolved=true;
      if(ok){ MUSIC_OK=true; clearSynthBGM(); a.play().catch(()=>{}); }
      else { try{ a.pause(); a.src=''; }catch(e){} tryNext(); }
    };
    a.onerror=()=>resolve(false);
    a.oncanplaythrough=()=>resolve(true);
    a.load(); BGM=a;
    a.play().catch(()=>{}); // 手势里同步试播，绕过自动播放限制
    setTimeout(()=>resolve(false), 1500);
  }
  tryNext();
}
let BGM_WARNED = {};
function setBGM(track){
  if(BGM_KNOWN_TRACKS.indexOf(track)<0 && !BGM_WARNED[track]){
    BGM_WARNED[track]=1;
    if(typeof console!=='undefined' && console.warn)
      console.warn('未登记的 BGM 轨名：'+track+'（素材/music/bgm_'+track+'.* 不会被请求到）');
  }
  CUR_BGM=track; startBGM(bgmTrackFor(track));
}
/* 首次交互解锁音频：浏览器禁止自动播放，得等一次用户手势 */
function unlockAudio(){ ensureAudio(); loadSfxSamples(); if(BGM && SETTINGS.sound){ try{ BGM.play().catch(()=>{}); }catch(e){} } }
document.addEventListener('pointerdown', unlockAudio, {once:true});
document.addEventListener('keydown', unlockAudio, {once:true});
/* 切后台停声、回前台续轨：记住切走那刻实际在放的轨 */
let BGM_RESUME=null;
function audioHiddenStop(){
  if(BGM_TRACK) BGM_RESUME=BGM_TRACK;
  try{ stopVoice(); }catch(e){}
  try{ stopBGM(); }catch(e){}
}
function audioHiddenResume(){
  const t=BGM_RESUME; BGM_RESUME=null;
  if(!t) return;
  if(typeof document!=='undefined' && document.visibilityState==='hidden') return;
  if(!SETTINGS.sound || BGM_TRACK) return;
  try{ ensureAudio(); startBGM(bgmTrackFor(t)); }catch(e){}
}
function audioHookHidden(){
  if(typeof document!=='undefined' && document.addEventListener){
    document.addEventListener('visibilitychange', function(){
      if(document.visibilityState==='hidden') audioHiddenStop(); else audioHiddenResume();
    });
  }
  if(typeof window!=='undefined' && window.addEventListener){
    window.addEventListener('pagehide', audioHiddenStop);
    window.addEventListener('pageshow', audioHiddenResume);
  }
}
audioHookHidden();

