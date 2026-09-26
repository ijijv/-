/* ============================================================================
 * 志怪塔 · js/10_audio.js —— 音频与素材层
 * Web Audio 音效合成 sfx() / BGM（外置优先·合成兜底）/ 素材映射与图片回退
 * ----------------------------------------------------------------------------
 * 由 原型.html 的整段内联脚本按原顺序切分而来（v0.61.05 三层重构，纯搬移）。
 * 拼接校验：本文件组去掉各自横幅后，应与切分前的内联脚本正文逐字节一致。
 * 加载：经典外链脚本（非 ES module），双击本地打开即可直接游玩。
 * ============================================================================ */
/* ===================== 音效（Web Audio 合成 + 外置采样可选） ===================== */
let SETTINGS = { sound:true, musicVol:0.32, sfxVol:1, lowSpec:false, endTurnHint:true }; // v0.61.20(P1)：endTurnHint 结束回合软提示开关
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
function assetURL(rel){ return (ASSET_MAP && ASSET_MAP[rel]) ? ASSET_MAP[rel] : ASSET_BASE + rel; }
function imgFail(el){ el.outerHTML = el.dataset.fallback || ''; }
function artImg(src, fallback, cls){
  return `<img class="${cls||''}" src="${assetURL(src)}" data-fallback="${(fallback||'').replace(/"/g,'&quot;')}" onerror="imgFail(this)" alt="">`;
}
function cardArt(c){ return `<div class="cart-wrap">${artImg('card/'+c.id+'.png', '', 'cart')}</div>`; }
function relicIcon(r){ return artImg('relic/'+r.id+'.png', '', 'ricon'); }
/* v0.61.41：name 带扩展名（如 'map.jpg'）时只补 bg_ 前缀、**不再补 .png**，否则沿用 bg_<name>.png ——
   用户给的地图背景是 .jpg，不想为了一个后缀去转码重压（转成 PNG 只会更大）。
   路径拼法单独抽成 bgRel 是为了能被冒烟直接对拍（setBg 本体要真 DOM，沙箱里量不到）。 */
function bgRel(name){ return (/\.[A-Za-z0-9]+$/.test(name)) ? ('bg/bg_'+name) : ('bg/bg_'+name+'.png'); }
function setBg(name){
  var el=document.getElementById('bg'); if(!el) return;
  var path=assetURL(bgRel(name));
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

