/* ============================================================================
 * 志怪塔 · js/10_audio.js —— 音频与素材层
 * Web Audio 音效合成 sfx() / BGM（外置优先·合成兜底）/ 素材映射与图片回退
 * ----------------------------------------------------------------------------
 * 由 原型.html 的整段内联脚本按原顺序切分而来（v0.61.05 三层重构，纯搬移）。
 * 拼接校验：本文件组去掉各自横幅后，应与切分前的内联脚本正文逐字节一致。
 * 加载：经典外链脚本（非 ES module），双击本地打开即可直接游玩。
 * ============================================================================ */
/* ===================== 音效（Web Audio 合成 + 外置采样可选） ===================== */
let SETTINGS = { sound:true, musicVol:0.32, sfxVol:1, lowSpec:false, endTurnHint:true, perfReadout:false }; // v0.61.20(P1)：endTurnHint 结束回合软提示开关；v1.0.5：perfReadout 真机性能读数（默认关）
function loadSettings(){ try{ const r=Store.getJSON('zhiguaitower_settings_v1'); if(r) SETTINGS=Object.assign(SETTINGS, r); }catch(e){} }
function persistSettings(){ try{ Store.setJSON('zhiguaitower_settings_v1', SETTINGS); }catch(e){} }
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

/* ——— 音效分发表（v0.61.25 从 12 键 switch 扩成 70 键） ———
   键名表就是外包/素材站的交付文件名，见项目根目录 素材清单.md 第一节（69 条复用组 + 遗留键 hit）。
   表里三种写法：
     ['t', freq, dur, type, vol, when, slideTo]   —— 单个振荡器
     ['b', dur, vol, from, to, when]              —— 白噪 + 低通下扫
     ['n', [f1,f2,…], dur, type, vol, step]       —— 一串音（琶音/音阶），相邻间隔 step 秒
   转发一律用 .apply 原样透传，**绝不补默认值**：旧代码里 tone 有 4/5/6 参三种叫法，
   补默认值会改变听感（冒烟里的 golden 快照会红）。顺序即听感，别随手重排。 */
const SFX_TABLE = {
  /* A 组 · 打击层（8） */
  hit_light:      [['b',.10,.32,2600,500],['t',300,.06,'triangle',.14]],
  hit_heavy:      [['b',.28,.55,1600,140],['t',120,.18,'square',.20,0,60]],
  hit_crit:       [['b',.34,.60,2400,200],['t',900,.10,'square',.16],['t',1400,.14,'triangle',.12,.05,700]],
  hit_guard:      [['b',.16,.34,900,180],['t',220,.10,'triangle',.12,0,180]],
  hurt:           [['b',.22,.6,1400,110],['t',110,.2,'sawtooth',.25,0,55]],
  block:          [['t',300,.09,'triangle',.16,0,500]],
  death:          [['b',.3,.4,1200,100],['t',160,.18,'sawtooth',.18,0,60]],
  thorns:         [['t',1200,.08,'square',.16,0,2400],['b',.10,.22,3200,900]],
  /* B 组 · 玩家输出细分（6） */
  atk_slash:      [['b',.14,.28,3600,900],['t',700,.10,'triangle',.10,0,1800]],
  atk_talisman:   [['t',300,.30,'sine',.12,0,900],['b',.12,.16,2200,700]],
  atk_blunt:      [['b',.30,.45,1100,180],['t',160,.16,'sine',.16,0,120]],
  atk_aoe:        [['b',.48,.50,2600,120],['t',180,.30,'sawtooth',.14,0,80]],
  atk_multi_each: [['b',.07,.24,3000,900]],
  atk_true:       [['t',420,.34,'sine',.16,0,90],['b',.24,.20,700,180]],
  /* C 组 · 敌人出招（11）—— 锚在 intents[].type 上 */
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
  /* D 组 · 卡牌机制（13） */
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
  /* E 组 · 关键词与状态（10） */
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
  /* F 组 · 敌人词缀通用触发（1） */
  affix_proc:     [['t',300,.16,'triangle',.13,0,420],['b',.12,.20,1600,400]],
  /* G 组 · Boss 招牌机制（5） */
  boss:           [['b',.42,.5,800,110],['t',120,.34,'sawtooth',.22,0,58]],
  boss_phase2:    [['b',.50,.55,900,110],['t',110,.44,'sawtooth',.22,0,55],['t',330,.30,'square',.12,.18,660]],
  boss_split:     [['b',.34,.50,1600,180],['t',520,.20,'triangle',.16,0,260],['t',520,.20,'triangle',.14,.16,260]],
  boss_ledger:    [['t',600,.14,'triangle',.14],['b',.16,.30,1200,300]],
  boss_yehuo:     [['b',.46,.46,1200,150],['t',130,.36,'sawtooth',.20,0,50]],
  /* H 组 · 系统与 UI（12） */
  ui_click:       [['t',720,.05,'triangle',.10]],
  error:          [['t',200,.12,'square',.18,0,120]],
  ui_panel:       [['t',380,.10,'sine',.10,0,520]],
  ui_map:         [['t',520,.12,'triangle',.13,0,700]],
  ui_reward:      [['t',660,.12,'triangle',.14,0,880],['t',990,.14,'sine',.11,.08,1100]],
  ui_levelup:     [['t',523,.14,'triangle',.14],['t',784,.16,'triangle',.12,.10,1046]],
  ui_unlock:      [['t',600,.14,'sine',.13,0,900],['t',900,.16,'sine',.11,.10,1200]],
  gold:           [['t',880,.1,'sine',.16],['t',1320,.12,'sine',.14,.06]],
  relic:          [['t',660,.12,'sine',.18],['t',990,.16,'sine',.14,.08]],
  win:            [['b',.3,.4,2000,300],['n',[523,659,784,1047],.16,'triangle',.16,.1]],
  lose:           [['b',.4,.45,1500,120],['n',[400,300,220,150],.2,'sawtooth',.14,.13]],
  ui_endless:     [['b',.36,.40,1600,160],['t',200,.30,'sine',.14,0,600]],
  /* I 组 · 遗物分化（3） */
  relic_bell:     [['t',880,.40,'sine',.16],['t',1320,.36,'sine',.11,.10,1320]],
  relic_fu:       [['t',400,.20,'triangle',.14,0,760],['b',.12,.16,1800,500]],
  relic_mirror:   [['t',1100,.24,'sine',.12,0,1600]],
  /* 遗留键：新代码一律走 hit_light / hit_heavy / hit_crit 按伤害量分级，此键仅为兼容保留 */
  hit:            [['b',.14,.5,2000,160],['t',150,.12,'square',.2,0,70]]
};
const SFX_KEYS = Object.keys(SFX_TABLE);   // 70 个键名（＝素材清单.md 第一节的 69 条复用组 + 遗留键 hit）
const _sfxWarned = {};
function sfxWarnUnknown(name){
  if(_sfxWarned[name]) return; _sfxWarned[name]=1;
  try{ console.warn('[sfx] 未知键名（已忽略）:', name); }catch(e){}
}
/* 同一键的最小间隔节流：给「一帧内会被连调很多次」的键用（如回合开始逐个召唤物加尸气），
   免得同一个音叠成和弦。**不全局生效** —— 连击那种 60ms 一发是故意要密的。 */
const _sfxGate = {};
function sfxOnce(name, ms){
  const now = (typeof performance!=='undefined' && performance.now) ? performance.now() : Date.now();
  if(_sfxGate[name] && now-_sfxGate[name] < (ms||80)) return false;
  _sfxGate[name]=now; sfx(name); return true;
}

/* ——— 外置音效采样：有 素材/sfx/<键名>_<变体号>.<ext> 就用它，没有就回退合成 ——— */
const SFX_SAMPLE_DIR = 'sfx/';
const SFX_VARIANTS_MAX = 3;      // 每个键最多几个变体（_1 _2 _3）
const SFX_SAMPLE_MAX = 96;       // 最多预解码多少个键，防内存失控
const SFX_LOAD_TIMEOUT = 8000;   // 单个键的解码总超时（ms），超了就当没有
const SFX_RATE_MIN = 0.94, SFX_RATE_MAX = 1.22;   // 变调下限/上限（伤害越大音越亮）
/* 采样不走单独的注入表：打包.py 的素材遍历本来就按相对路径收 AUD_MIME 文件，
   所以 sfx/hit_light_1.mp3 这类 key 已在 ASSET_MAP 里。再注入一张重复表只会把 base64 翻倍。 */
var SFX_BUF = {};                // 键名 -> [AudioBuffer,…]（预解码结果）
var SFX_LOADED = false, SFX_LOADING = false, _sfxHinted = false;
var _sfxLastVariant = {};
let sfxMode = 'auto';            // auto | synth（强制合成）| sample（强制采样，调试用）
try{ if(typeof SFX_SAMPLE_MODE==='string') sfxMode=SFX_SAMPLE_MODE; }catch(e){}
var SFX_PROTO = (typeof location!=='undefined' && location && location.protocol) ? location.protocol : '';
var SFX_FETCH_OK = (typeof fetch==='function') && SFX_PROTO!=='file:';  // file:// 下 fetch 会被浏览器拦，别白试

/* 一个键的候选路径：变体 1 允许写成 <键名>.mp3 或 <键名>_1.mp3，2/3 必须带后缀 */
function sfxCandidates(name){
  const out=[];
  for(let e=0;e<AUD_EXTS.length;e++){
    out.push(SFX_SAMPLE_DIR+name+AUD_EXTS[e], SFX_SAMPLE_DIR+name+'_1'+AUD_EXTS[e]);
  }
  for(let v=2;v<=SFX_VARIANTS_MAX;v++)
    for(let e=0;e<AUD_EXTS.length;e++) out.push(SFX_SAMPLE_DIR+name+'_'+v+AUD_EXTS[e]);
  return out;
}
/* 候选路径 -> 可取的 URL：打包产物查注入表；开发期直接取相对路径（需 http 服务，见 更新日志.md） */
function sampleURL(rel){
  if(ASSET_MAP) return ASSET_MAP[rel] || null;   // 打包产物：没登记就是没有，不去试
  if(!SFX_FETCH_OK) return null;
  return ASSET_BASE + rel;
}
function sfxRate(opt){
  if(!opt) return 1;
  const r = (typeof opt==='number') ? opt : opt.rate;
  if(!(r>0)) return 1;
  return Math.max(SFX_RATE_MIN, Math.min(SFX_RATE_MAX, r));
}
/* 伤害越大音越亮：16.8 点以上到顶（1.22），0 点略闷（0.94） */
function sfxDamageRate(dmg){
  const d = +dmg || 0;
  return Math.max(SFX_RATE_MIN, Math.min(SFX_RATE_MAX, 0.94 + d/60));
}
function pickVariant(name, n){
  let v = Math.floor(Math.random()*n);           // 故意用 Math.random：音效随机不能扰动可复现的 rng() 流
  if(n>1 && v===_sfxLastVariant[name]-1) v=(v+1)%n;
  _sfxLastVariant[name]=v+1;
  return v;
}
function playSample(name, rate){
  if(sfxMode==='synth') return false;
  const list=SFX_BUF[name]; if(!list || !list.length) return false;
  const ac=ensureAudio(); if(!ac || !ac.createBufferSource || !ac.createGain) return false;
  try{
    const src=ac.createBufferSource();
    src.buffer = list.length>1 ? list[pickVariant(name, list.length)] : list[0];
    if(src.playbackRate) src.playbackRate.value = rate||1;
    const g=ac.createGain(); g.gain.value = (SETTINGS.sfxVol==null?1:SETTINGS.sfxVol);
    src.connect(g); g.connect(ac.destination);
    src.start(0); return true;
  }catch(e){ return false; }
}
/* 单个键：并行试完所有候选（含 2/3 变体），成功的进 SFX_BUF[name] */
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
/* 预解码全部键（最多 SFX_SAMPLE_MAX 个）：挂在 iOS 的一次性手势解锁点 unlockAudio 上，非阻塞 */
function loadSfxSamples(){
  if(SFX_LOADED || SFX_LOADING || sfxMode==='synth') return;
  if(sfxMode==='auto' && !ASSET_MAP && !SFX_FETCH_OK){
    /* 开发期双击本地打开：无注入表且取不到文件。这是**有意为之**（file:// 下 fetch 会被拦，试也是白试），
       但以前完全静默 —— 玩家会以为「素材放进 素材/sfx/ 了却没生效」。这里说明一次。 */
    if(!_sfxHinted){ _sfxHinted=true;
      try{ console.info('[音效] 当前是 file:// 双击打开，浏览器会拦 fetch，'+
        '素材/sfx/ 下的外置音效探测已跳过，全部走 WebAudio 合成音。'+
        '想听到自己放进去的音效：用 `python 试玩.py` 起本地 http 服务再打开，'+
        '或 `python 打包.py` 用产物（音效已内联）。随时可用 sfxSamples() 查采样状态。'); }catch(e){}
    }
    return;
  }
  const ac=ensureAudio();
  /* 冒烟宿主/老浏览器没有 WebAudio（无 decodeAudioData）—— 直接跳过，不抛错 */
  if(!ac || typeof ac.decodeAudioData!=='function' || typeof ac.createBufferSource!=='function') return;
  SFX_LOADING=true;
  const keys=SFX_KEYS.slice(0, SFX_SAMPLE_MAX);
  let i=0;
  (function next(){
    if(i>=keys.length){ SFX_LOADED=true; SFX_LOADING=false; return; }
    loadOneSample(ac, keys[i++], ()=>{ try{ next(); }catch(e){ SFX_LOADING=false; } });
  })();
}
/* 调试用：当前采样状态（控制台 / 冒烟查状态） */
function sfxSamples(){
  let files=0; for(const k in SFX_BUF) files+=SFX_BUF[k].length;
  return { mode:sfxMode, keys:Object.keys(SFX_BUF).length, files:files, loaded:SFX_LOADED, loading:SFX_LOADING, fetchOk:SFX_FETCH_OK };
}
/* 一步合成动作：rate===1 时原样透传（参数个数与旧实现逐字一致），仅变调时才改音高 */
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
/* sfx(键名, 可选参数)：opt 可传 { rate:1.2 } 或直接传数字（播放速率）。
   未知键名静默忽略（战斗中不能因拼错键名炸结算），开发期只 warn 一次。 */
function sfx(name, opt){
  if(!SETTINGS.sound) return;
  let mul=SETTINGS.sfxVol; if(mul==null) mul=1;
  // 0 是合法值（静音），必须真的静音；旧写法 (sfxVol||1) 会把 0 拉回 100%
  if(!(mul>0)) return;
  const rate=sfxRate(opt);
  if(playSample(name, rate)) return;      // 有外置采样就用采样
  const steps=SFX_TABLE[name];
  if(!steps){ sfxWarnUnknown(name); return; }
  for(let i=0;i<steps.length;i++) sfxStep(steps[i], rate);
}
/* 打击分级阈值（**单一来源**）：音效与浮字视觉共用，免得两处阈值日后各漂各的 */
const HIT_HEAVY_DMG = 10, HIT_CRIT_DMG = 20;
function isCritHit(dmg, killed){ return !!killed || dmg>=HIT_CRIT_DMG; }
/* 按「打在什么上 / 打了多少 / 有没有打死」挑打击层 —— 让听感跟着数值走 */
function pickHitSfx(dmg, blockedAll, killed){
  if(blockedAll) return 'hit_guard';
  if(isCritHit(dmg, killed)) return 'hit_crit';
  if(dmg>=HIT_HEAVY_DMG) return 'hit_heavy';
  return 'hit_light';
}

/* ===================== 外置素材（有则增强，无则优雅回退） ===================== */
const ASSET_BASE = '素材/';
/* 音频扩展名的唯一真相源：打包.py 的 AUD_MIME 必须与此集合一致（漂移由 verify_dist 断言拦住）。
   音效探测顺序 mp3 优先；BGM 沿用历史优先级 ogg 优先 —— 避免同名多格式并存时被选中的曲子变了。 */
const AUD_EXTS = ['.mp3','.ogg','.wav','.m4a'];
const BGM_EXTS = ['.ogg','.mp3','.wav','.m4a'];
/* 单文件打包：打包.py 把下面这行的 null 换成 { '相对路径': 'data:...' }；开发时保持 null，照常读本地 素材/ */
var ASSET_MAP = null;
/* 拆包（多文件、走 http 发布，见 打包.py --split）：图片已转成 WebP 落盘，打包.py 会把下面这行改成
   true，assetURL 据此把 .png/.jpg 换名成 .webp。三种口径互不干扰：
     单文件产物 —— 走 ASSET_MAP（键仍是原始 .png 名），根本走不到这一行；
     拆包产物   —— ASSET_MAP=null + 本行 true ⇒ 取 素材/xxx.webp；
     开发树     —— ASSET_MAP=null + 本行 false ⇒ 照常读原图。
   ⚠️ 正则只认图片扩展名：BGM 的 .ogg/.mp3 也走 assetURL（见 startBGM），换名会把它们换没。 */
var ASSET_WEBP = false;
/* v1.0.1（手机端性能）：单文件产物的素材是 base64 data URI（单张卡图 10~72KB、立绘 84~118KB、
   牌框 front.png 更是一张手牌一份）。而 render() 每次都把 #hand / #enemy-panel / #player-panel
   整块 innerHTML 重建 ⇒ 一次操作要拼**上兆**的 base64 字符串再交给 HTML 解析器，
   手机上就是「每点一下卡半拍、有延迟」。抽牌克隆更狠：每条克隆内嵌一整张卡图。
   这里给**会被反复拼进 HTML 的图片**（artImg / cardFrame 这两条渲染热路径）提供一条短地址：
   把 data URI 转成 blob: 对象地址并缓存（同一素材只转一次），拼进 HTML 的只剩几十字节，
   浏览器还按地址复用已解码的图，不再反复解析同一串 base64。
   ⚠️ 只对**热路径**开（`assetURL(rel, true)`）：音频与菜单背景这两条是**一次性赋值**、不进
      render 循环，照旧拿 data URI —— 不为它们改变既有机制（那是「file:// 下也能拿到」的依据）。
   v1.0.8（手机端性能）：**特效精灵图（playFx）、战斗背景（setBg）、地图卷轴（applyMapTextures）**
      也改判为热路径。它们虽「每次只赋一次值」，但**每次出牌 / 每换一次场景就赋一次**，而单文件
      产物（TapTap 包）里那些值都是几百 KB 的 base64 大字串 —— 塞进 CSS url() / `<img src>` 时，
      浏览器要先逐字解析这串、再 base64 解码、再解图，真机上就是每次出牌 / 进关卡一次的
      100~300ms 尖峰（录屏读数）。blob 已在卡面（artImg）/ 牌框（cardFrame）上跑了很久、
      且 TapTap 容器里显示正常，所以扩用是安全的。
   ⚠️ 不写回 ASSET_MAP：它仍是**内联表本身**（data URI 字面量），probe_dist/verify_dist 的
      「值全是 data:」断言查的就是它，回填会把那种直读路径（sampleURL 等）一起改掉。
   拆包产物（ASSET_MAP=null）与开发树根本走不到这一层；转换不可用（无 Blob/createObjectURL）
   或不是 base64 时**原样返回 data URI**，行为与改动前逐字相同。 */
const ASSET_OBJ_URLS = {};
function dataURItoBlobURL(uri){
  try{
    if(typeof Blob==='undefined' || typeof URL==='undefined' || !URL.createObjectURL) return null;
    const comma=uri.indexOf(',');
    if(comma<0) return null;
    const head=uri.slice(5, comma);
    if(head.indexOf('base64')<0) return null;      // 百分比编码的 data URI：本项目没有，不冒险
    const bin=atob(uri.slice(comma+1));
    const n=bin.length, bytes=new Uint8Array(n);
    for(let i=0;i<n;i++) bytes[i]=bin.charCodeAt(i);
    return URL.createObjectURL(new Blob([bytes], {type:head.split(';')[0]||'application/octet-stream'}));
  }catch(e){ return null; }
}
function assetURL(rel, wantBlob){
  if(ASSET_MAP && ASSET_MAP[rel]){
    const v=ASSET_MAP[rel];
    if(v.slice(0,5)!=='data:') return v;           // 本就是普通地址（拆包相对路径）⇒ 透传
    if(!wantBlob) return v;                        // 音频 / 一次性背景：保持 data URI 原样
    const c=ASSET_OBJ_URLS[rel];
    if(c) return c;                                // 同一素材只转一次
    const u=dataURItoBlobURL(v);
    if(!u) return v;
    ASSET_OBJ_URLS[rel]=u;
    return u;
  }
  return ASSET_BASE + (ASSET_WEBP ? rel.replace(/\.(png|jpe?g|bmp)$/i, '.webp') : rel);
}
function imgFail(el){ el.outerHTML = el.dataset.fallback || ''; }
/* ⚠️ v0.64.1：`draggable="false"` 是修 bug 的，别删 —— <img> **默认就是可拖的**，左键按住一移，
   浏览器会开始原生拖图并抛 pointercancel，把所有自绘的指针拖拽（地图滑动、出牌）**当场掐断**。
   症状是「左键拖不动 / 一拖就断」，而中键反而正常（中键不触发原生拖拽）—— 这是最难联想到的一类。
   全项目图片都从这里出，所以在这一处掐掉最省事；CSS 侧另有一道 -webkit-user-drag:none 兜底。 */
function artImg(src, fallback, cls){
  return `<img class="${cls||''}" src="${assetURL(src, true)}" draggable="false" data-fallback="${(fallback||'').replace(/"/g,'&quot;')}" onerror="imgFail(this)" alt="">`;
}
/* —— v1.0.13：图标换皮总接口（用户口径「所有图标的重做都由我来设计，你只要给我统筹」）——
   同一个渲染点，**图没到就原样输出旧内容（emoji / 空），图到了自动变 <img>**，代码零改动接新素材。

   ⚠️ 为什么不是直接 artImg：artImg 每次渲染都写一次 <img>，缺图时<每帧>都要发一次 404 请求 ——
      手机端 24 个 buff 徽章 × 每拍 render 会变成请求风暴。这里改成**每个路径只探一次**：
      首个用到它的 render 触发一次探测；探到就 render() 一次换成图，探不到就永久回落。
   ⚠️ 回落串**必须与改动前逐字节相同**（fallback 参数原样返回）—— 五道闸与冒烟断言都靠这一条。
   ⚠️ 冒烟沙箱（vm_host.js）里没有 Image 构造器 ⇒ 这里必然抛，被 try 吞掉 ⇒ 永久回落，闸不受影响。 */
const ICON_PROBE = {};
let ICON_RERENDER = false;
/* 探到图之后**合并成一次 render**：34 枚图标各自 onload 都调一次 render 的话，
   开机那一下会连着重排 34 遍手牌/敌阵（手机端白白卡一次）。 */
function iconPokeRender(){
  if(ICON_RERENDER) return;
  ICON_RERENDER = true;
  setTimeout(function(){ ICON_RERENDER = false; try{ render(); }catch(e){} }, 0);
}
function iconAvail(rel){
  const st = ICON_PROBE[rel];
  if(st === 'yes') return true;
  if(st === undefined){
    ICON_PROBE[rel] = 'no';                       // 先按「没图」渲染，探到再升级
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
/* v0.68.0：真美术牌框（ui/card/front.png = 385x583 木框 + 上「图窗」下「铭牌窗」）。
   三处独立渲染（cardBody / forgeCardHTML / handCardHTML）都从这里取，免得各写一份飘掉。

   ⚠️ 加载失败必须**连 .has-frame 一起摘**。只摘 <img>（imgFail 的老行为）的话，
   `.card.has-frame` 那套绝对定位还挂着，但底图没了 —— 卡面会散架：
   图窗/铭牌窗都还在原位，却没有框兜住它们，文字和卡图会浮在纸底上错位。
   摘掉类之后卡片原样退回 v0.67 的纯 CSS 版面（旧规则一条没删）。 */
function cardFrameFail(el){
  var p = el && el.parentNode;
  if(p && p.classList) p.classList.remove('has-frame');
  imgFail(el);
}
function cardFrame(){
  return `<img class="cframe" src="${assetURL('ui/card/front.png', true)}" draggable="false" onerror="cardFrameFail(this)" alt="">`;
}
/* v0.69.0：抽牌堆 / 弃牌堆的两张图（back.png 顶面、side.png 侧棱）。
   走的是和 cardFrame() **同一条** assetURL 的路：把地址写进 CSS 变量，
   由 .pile-face / .pile-slab 用 var() 取。

   ⚠️ 为什么不在 原型.html 里直接写：那两张是 CSS 背景（不是 <img>），
      在页内 CSS 写 `url(素材/ui/card/back.png)` 会被 verify_dist.py 的 _css_urls 闸判红
      （打包后 素材/ 全变成 data: URI，页内写死的老路径会 404 成一片空白）。

   ⚠️ 整个 try/catch 不是摆设：vm_host.js 的 DOM 桩里 `documentElement.style` 是个**纯对象**，
      没有 setProperty ⇒ 冒烟沙箱里这行必然抛 TypeError。
      吞掉它，冒烟才不红；浏览器里正常写进变量。 */
function pileInit(){
  try{
    var r = document.documentElement && document.documentElement.style;
    if(!r || !r.setProperty) return;
    r.setProperty('--pile-back-img', 'url("'+assetURL('ui/card/back.png')+'")');
    r.setProperty('--pile-side-img', 'url("'+assetURL('ui/card/side.png')+'")');
  }catch(e){}
}
/* v0.69.0：抽牌堆 / 弃牌堆的计数徽章。
   单独成一个函数是为了能在**不止 render()** 的地方刷新 —— 见 30_engine.js 的
   finishEndTurn()：那里批量 concat 进弃牌堆之后紧接着就是 enemyAct()，
   中间**没有 render()**，徽章会整整滞后一段敌人行动。 */
function refreshPileCounts(){
  try{
    const dn=document.getElementById('pile-draw-n');    if(dn) dn.textContent=G.drawPile.length;
    const cn=document.getElementById('pile-discard-n'); if(cn) cn.textContent=G.discard.length;
  }catch(e){}
}
/* v0.67.0：有灵石图的 id 走 lingshi/（朱砂笔/护身符/返魂香），其余遗物照旧 relic/。
   尺寸不另立类，**原样复用 .ricon** —— 它 `object-fit:contain` + 是 flex 列的子项，
   「超出边框」和「压住文字」在结构上就不可能发生；与既有 9 个遗物卡也是同一套观感。 */
/* v1.0.x：新遗物的图还没交付时不再「静默空白」—— 回落成写着名字末字的字牌（同 potionIcon 口径）。
   ⚠️ **只给 ART_PENDING 名单里的**补兜底。已交付的图一律不带（裂了照旧走 imgFail）——
      否则每条 relicIcon 的返回值里都会带上一段没用的 data-fallback，
      「遗物图标没有被字牌化」那条冒烟钉子（v0.67.0）会被误伤。 */
function relicIcon(r){
  const o = r || {};
  const src = lingshiSrc(o.id) || ('relic/'+o.id+'.png');
  const fb = (typeof ART_PENDING !== 'undefined' && ART_PENDING.indexOf(src) >= 0) ? String(o.name || '').slice(-1) : '';
  return artImg(src, fb ? `<div class="ricon ricon-fb">${fb}</div>` : '', 'ricon');
}
/* v0.67.0：灵汁图标。有贴图的出 <img>；**没贴图的出「字牌」占位**（.ricon-fb，写名字末字）。
   为什么不是空串也不是空底框：
     · 空串 —— 同排的 .reward-cards 是 `align-items:stretch`，一排放 4 张卡时，
       有图的会把整行撑高，无图那张就只剩顶部两行字 + 一大片空白，像「图裂了」。
     · 空底框（照常输出 <img> 但 onerror 后 outerHTML=''）—— 只剩 .ricon 那层
       background:rgba(0,0,0,.2) 的暗底，读起来就是个空格子，比不出图更糟。
   字牌把这块填满，四张卡等高且都有内容；用户哪天补上贴图，这里自动走 <img> 分支，
   占位不再生成 —— 不必回来删代码。（`p` 为空时 name 取不到 ⇒ 末字为空 ⇒ 返回空串，不抛错。） */
function potionIcon(p){
  var o = p || {};
  var s = lingshiSrc(o.id);
  if(s) return artImg(s, '', 'ricon');
  var ch = String(o.name || '').slice(-1);
  return ch ? '<div class="ricon ricon-fb">' + ch + '</div>' : '';
}
/* v0.61.41：name 带扩展名（如 'map.jpg'）时只补 bg_ 前缀、**不再补 .png**，否则沿用 bg_<name>.png ——
   用户给的地图背景是 .jpg，不想为了一个后缀去转码重压（转成 PNG 只会更大）。
   路径拼法单独抽成 bgRel 是为了能被冒烟直接对拍（setBg 本体要真 DOM，沙箱里量不到）。
   v0.76.0：主菜单那格改指 bg/menu/menu_3.png —— 它与原来的素材/bg/bg_menu.png **逐字节相同**
   （同为 400323 字节、同一个 md5），而 menu_3.png 本来就是主菜单轮换背景 MENU_BGS 的第三张
   ⇒ 同图挪位，零内容损失、零观感变化、少一份 400KB 重复体。
   ⚠️ **不能**走下面 'bg/bg_'+name 那条通配：它拼出来的正是本批删掉的那个文件。 */
function bgRel(name){
  if(name==='menu') return 'bg/menu/menu_3.png';
  return (/\.[A-Za-z0-9]+$/.test(name)) ? ('bg/bg_'+name) : ('bg/bg_'+name+'.png');
}
/* v0.74.0：**整屏专用背景**一览 —— 背景是这六张之一时，背后一定是一个「盖着面板的
  独立场景」（商店/篝火/胜利/失败/选英雄/胜利奖励），与事件房同理 ⇒ #overlay 的黑幕要放松。
  键取 setBg 的**入参原样**（带扩展名）：bgRel 对带扩展名的只补 bg_ 前缀。
   ⚠️ 这张表与 js/50_ui.js 的 EVT_BG 是**两个方向的同一件事**，别合并：
      EVT_BG 是「事件 id → 文件名」（由事件驱动），这张是「文件名 → 是不是整屏场景」
      （由背景驱动）；存的是**判据**不是映射，方向反了就没法当判据用。
   ⚠️ 只列**整屏**背景。地图/幕背景（map.jpg、act1..3）与 'menu' 不进来 ——
      它们背后是真正的战局 HUD，`.88` 那层黑幕压的是面板自身，放松了反而让战场透上来。 */
const SCENE_BG = { 'shop.jpg':1, 'campfire.jpg':1, 'victory.jpg':1, 'defeat.jpg':1,
                   'hero_select.jpg':1, 'victory_reward.jpg':1 };
/* v0.74.0：**此刻还没进战局**的背景一览 —— at-menu 的正判据。
   语义仍是 v0.68.2 那句「屏幕背后不是战局」⇒ `#app` 整块不渲染，只是从"只有主菜单"
   扩到"主菜单 + 选英雄"。
   ⚠️ 选英雄必须进来：v0.74.0 给它接了 bg_hero_select.jpg，而 setBg 一被调用就会按
      老判据（name==='menu'）把 at-menu 摘掉 ⇒ `#app` 立刻显形。那一刻 run 还**没开始**
      （G 刚 newState，从没 render 过），#app 里是空骨架/上一次的残影，
      在 .55 的黑幕下正好透出来 —— 这就是 v0.68.2 花力气修掉的那个 bug，别放它回来。
   ⚠️ 反过来**不能**把六张整屏背景一股脑放进来：胜负/商店/篝火/奖励都在战局**之内**，
      背后本来就该是战场（与事件房同一处理）。 */
const PRE_RUN_BG = { 'menu':1, 'hero_select.jpg':1 };
function setBg(name){
  /* v0.68.2：`body.at-menu` 的**唯一**开关（CSS: `body.at-menu #app{display:none}`）。
     语义 = "屏幕背后不是战局"。setBg 本来就是「背后该铺什么」的 owner：只有主菜单与
     选英雄这两张是在战局之外，其余每一张背景都意味着战局已经接管 ⇒ 清掉。
     v0.74.0：判据由 `name==='menu'` 改成查 PRE_RUN_BG 表（上一条注释讲了为什么选英雄要进来）。
     ⚠️ 别把这条挪进 showStartScreen：那样「图鉴/排行榜/设置」摘掉 .menu-scene 之后
        战斗 HUD 又会透出来（它们只摘场景类，不重进主菜单）。挂在 setBg 上才与面板解耦。 */
  var _bgName=String(name||'');
  if(document.body && document.body.classList)
    document.body.classList.toggle('at-menu', !!PRE_RUN_BG[_bgName]);
  /* v0.73.0：事件房背景（bg_evt_*.jpg）要**真的看得见**，光换图不够 ——
     #overlay 常驻一层 88% 黑幕，任何深色场景图铺上去都只剩 12% 可见度，等于白铺。
     这里只挂一个 body 类当开关（与上一行 .at-menu 同一范式，setBg 仍是「背后该铺什么」的
     唯一 owner），黑幕的具体取值写在 原型.html 的 CSS 里。
     v0.73.0 的判据是「名字以 evt_ 开头」，因为那时只有事件房有专用整屏图；
     v0.74.0 把商店/篝火/胜利/失败/选英雄/胜利奖励六张也接上了 ⇒ 判据扩成「evt_ 前缀 或
     在 SCENE_BG 表内」。**六张图全是 1920×1080，与事件房同一形态，道理完全一样**。
     ⚠️ 类名仍叫 evt-bg —— 它现在的语义比名字宽一档，**改名是故意没做的**：
        这个标识被四处无头夹具（含 8×8 事件房矩阵的 416 条断言）与更新日志逐字钉着，
        为一个纯装饰性的名字去动已验收的产物与历史记录，风险大过收益。
        **看代码时别被名字骗：挂在鬼市/通关屏上的 evt-bg 是正常的，不是串场。** */
  if(document.body && document.body.classList)
    document.body.classList.toggle('evt-bg', /^evt_/.test(_bgName) || !!SCENE_BG[_bgName]);
  var el=document.getElementById('bg'); if(!el) return;
  /* v1.0.8（手机端性能）：带 wantBlob=true —— 战斗背景**每换一次场景就重新赋值一次**，
     而单文件产物里这是往 <img src> 塞一整串几百 KB 的 base64（要解析 + base64 解码 + 解图），
     真机上就是「进关卡卡一下」。拆包产物返回短相对路径，带不带第二参都一样。 */
  var path=assetURL(bgRel(name), true);
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
/* v0.61.31：精英 / Boss / 商店三轨是「可选升级轨」—— 素材没交付就退回基础轨。
   不退的后果很实在：Boss 房切 battle_boss 而文件不存在 → tryNext 耗尽扩展名 →
   掉进 startSynthBGM('battle_boss')，**反而比普通战少了音乐**（合成器只给 'battle' 叠鼓）。
   基础轨 menu/map/battle 不设回退项（它们没有可退的上级）。 */
/* 已知轨名的**唯一真相源**：素材/music/ 下的每个文件都该是 bgm_<轨>.<ext>，
   且 <轨> 落在这张表里。为什么值得单列一张表：BGM 文件是**人工按名交付**的，
   拼错（bgm_elite.mp3 / bgm_battle_Elite.mp3）不会报任何错 —— 代码探不到文件就静默
   走回退轨，你听到的是普通战斗曲，还以为「没接上」。_patch/verify_dist.py 的 [2c] 段
   拿这张表逐文件核对磁盘（与 AUD_EXTS 同一套「真相源 + 断言」惯例）。 */
const BGM_KNOWN_TRACKS = ['menu','map','battle','battle_elite','battle_boss','shop'];
const BGM_FALLBACK = { battle_elite:'battle', battle_boss:'battle', shop:'map' };
/* 打包产物里 ASSET_MAP 是权威清单：查得到就直接用，查不到当场退回（同步、可测、零空转）。
   开发期（file:// 双击，打包.py 没注入 ASSET_MAP）无法预知磁盘上有什么，
   返回原轨交给 tryNext 逐扩展名探测，探测耗尽后由 startBGM 内部兜底。 */
function bgmTrackFor(track){
  if(!ASSET_MAP) return track;
  return BGM_EXTS.some(e=>ASSET_MAP['music/bgm_'+track+e]) ? track : (BGM_FALLBACK[track]||track);
}
/* startBGM 逐扩展名探测全部失败后，该退到哪条基础轨；返回 null = 没有可退的上级（照原轨走合成器）。
   单独抽成纯函数是为了**可测**：冒烟宿主开头会把 startBGM 换成静音桩（见 smoke_runner.js 顶部），
   startBGM 的函数体在沙箱里不可达，这条决策只能直接验函数本身。 */
function bgmFallbackFor(track){
  const fb=BGM_FALLBACK[track];
  return (fb && fb!==track) ? fb : null;   // fb===track 时返回 null，否则 startBGM 会自我递归
}
/* 从敌人列表判定该用哪条战斗轨：Boss > 精英 > 普通。
   入参是数组而非直接读 G —— 这样读档续战（40_flow.js）和开局（30_engine.js）能共用，
   也便于冒烟里直接喂假数据验证。 */
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
  BGM_TRACK=track; MUSIC_OK=null;
  let exts=BGM_EXTS.slice();
  if(ASSET_MAP){ const _av=exts.filter(e=>ASSET_MAP['music/bgm_'+track+e]); if(_av.length) exts=_av; }
  let idx=0, active=true;
  function tryNext(){
    if(!active) return;
    if(idx>=exts.length){
      /* v0.61.31：升级轨探测全 miss → 退回基础轨（否则 Boss 房比普通战还安静）。
         兜底放在 startBGM 内部而不是加第二参数：这样所有直接调用点
         （如 60_boot.js 声音开关重开时的 startBGM(CUR_BGM)）自动获得回退能力。
         「退到哪条」的决策在 bgmFallbackFor 里（纯函数、冒烟可验），这一行只负责转发。 */
      const __fb=bgmFallbackFor(track);
      if(__fb) return startBGM(__fb);
      BGM=null; startSynthBGM(track); return;
    }
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
/* CUR_BGM 记的是**逻辑轨**（设置页/存档看到的是「该在哪首曲子」），
   实际播放哪条由 bgmTrackFor 决定 —— 素材到货后无需改任何调用点，自动切回升级轨。 */
let BGM_WARNED = {};   // 未登记的轨名只提醒一次，不刷屏
function setBGM(track){
  /* 轨名没登记 → 素材/music/bgm_<轨>.* 就算躺在磁盘上也不会被请求到（拼错 = 静默无声）。
     战斗中不能因为一个轨名拼错就抛异常，所以只警告一次、照旧往下走（探测/合成兜底）。 */
  if(BGM_KNOWN_TRACKS.indexOf(track)<0 && !BGM_WARNED[track]){
    BGM_WARNED[track]=1;
    if(typeof console!=='undefined' && console.warn)
      console.warn('未登记的 BGM 轨名：'+track+'（素材/music/bgm_'+track+'.* 不会被请求到）');
  }
  CUR_BGM=track; startBGM(bgmTrackFor(track));
}
/* 首次交互解锁音频（浏览器禁止自动播放，需一次用户手势） */
function unlockAudio(){ ensureAudio(); loadSfxSamples(); if(BGM && SETTINGS.sound){ try{ BGM.play().catch(()=>{}); }catch(e){} } }
document.addEventListener('pointerdown', unlockAudio, {once:true});
document.addEventListener('keydown', unlockAudio, {once:true});

