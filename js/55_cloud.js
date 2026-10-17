/* ============================================================================
 * 55_cloud.js：云存档 / 排行榜 / 成就的 TapTap 适配
 * 小游戏接口一分钟只能传一次、还不让并发；非小游戏环境整层降级成空实现
 * ============================================================================ */

const CLOUD_NAME = 'zhiguaitower';                  // 存档名只能用 ASCII
const CLOUD_FILE = 'zhiguaitower_cloud.json';       // 云端存档文件名
const CLOUD_META_KEY = 'zhiguaitower_cloudmeta_v1'; // 本模块自己的簿记，别塞进那两个存档键
const CLOUD_MIN_GAP = 60 * 1000;                    // 官方频控，一分钟一次

/* —— TapTap 账号标识：本机存档按账号隔离 ——
   不取账号标识时进度只按设备存（localStorage），同一台机换号会读到上一个号的进度。
   加载期先同步试一次 getUserInfo，取不到就退回原样，浏览器端行为完全不变。 */
const ACC_MARK_KEY = 'zhiguaitower_acct_v1';        // 记本次「认领」的账号前缀，裸键写，不带头缀
const ACC_ID_FIELDS = ['openId','openid','userId','user_id','uid','unionId','unionid','accountId','account_id','playerId','id'];
let ACC_ID = '', ACC_RAW = '';
function accPickId(o){
  if(!o || typeof o !== 'object') return '';
  for(let i=0;i<ACC_ID_FIELDS.length;i++){
    const v = o[ACC_ID_FIELDS[i]];
    if(v !== undefined && v !== null && String(v) !== '') return String(v);
  }
  if(o.user && typeof o.user === 'object') return accPickId(o.user);
  if(o.data && typeof o.data === 'object') return accPickId(o.data);
  return '';
}
function accRawStr(o){
  try{ return typeof o === 'string' ? o : JSON.stringify(o); }catch(e){ return '（无法序列化）'; }
}
/* 本游戏自己写进 localStorage 的键就这些，逐一点名搬，别去枚举整个 localStorage */
function accLegacyKeys(){
  const ks = ['zhiguaitower_settings_v1', 'zhiguaitower_tutorial_v1', CLOUD_META_KEY];
  try{ if(typeof RUN_SLOTS !== 'undefined') ks.push.apply(ks, RUN_SLOTS); }catch(e){}
  try{ if(typeof SAVE_KEY !== 'undefined') ks.push(SAVE_KEY); }catch(e){}
  try{ if(typeof CLEAR_KEY !== 'undefined') ks.push(CLEAR_KEY); }catch(e){}
  try{ if(typeof SCORE_KEY !== 'undefined') ks.push(SCORE_KEY); }catch(e){}
  return ks;
}
/* 首次改走带前缀的键时，把旧的无前缀存档搬过去，免得老玩家进度看起来「没了」 */
function accMigrate(){
  try{
    const ks = accLegacyKeys();
    for(let i=0;i<ks.length;i++){
      const k = ks[i];
      const v = localStorage.getItem(k);
      if(v === null) continue;
      if(localStorage.getItem(ACC_NS + k) !== null) continue;   // 本案已有，别覆盖
      localStorage.setItem(ACC_NS + k, v);
      localStorage.removeItem(k);
    }
  }catch(e){}
}
function accBind(id, raw){
  if(!id) return false;
  if(ACC_ID === id) return true;
  const safe = String(id).replace(/[^0-9A-Za-z_-]/g, '').slice(0, 40);
  if(!safe) return false;
  ACC_ID = id;
  if(raw !== undefined) ACC_RAW = accRawStr(raw);
  ACC_NS = 'u' + safe + ':';
  let mark = '';
  try{ mark = localStorage.getItem(ACC_MARK_KEY) || ''; }catch(e){}
  /* mark 为空 = 升级后第一次认领：旧的无前缀存档归当前这个号 */
  if(!mark) accMigrate();
  try{ localStorage.setItem(ACC_MARK_KEY, ACC_NS); }catch(e){}
  return true;
}
/* 同步形态：直接回用户对象；同步拿不到就不动，交给回调 / 重试 */
function accTrySync(){
  try{
    if(typeof tap === 'undefined' || !tap || typeof tap.getUserInfo !== 'function') return '';
    const r = tap.getUserInfo();
    if(r && typeof r === 'object' && typeof r.then !== 'function'){
      ACC_RAW = accRawStr(r);
      const id = accPickId(r);
      if(id) return accBind(id, r) ? id : '';
    }
  }catch(e){}
  return '';
}
function accTryAsync(){
  if(ACC_ID) return;
  try{
    if(typeof tap === 'undefined' || !tap || typeof tap.getUserInfo !== 'function') return;
    let settled = false;
    const good = o => {
      if(settled) return; settled = true;
      ACC_RAW = accRawStr(o);
      const id = accPickId(o);
      if(id && accBind(id, o)) accRefresh();
    };
    const r = tap.getUserInfo({ callback:{ onSuccess:good, onFailure:function(){} } });
    if(r && typeof r.then === 'function') r.then(good, function(){});
    else if(r && typeof r === 'object') good(r);
  }catch(e){}
}
/* 换号后主菜单那颗「续」的可用状态跟着变，在菜单上就重画一次 */
function accRefresh(){
  try{
    const ov = document.getElementById('overlay');
    if(!(ov && ov.classList && ov.classList.contains('menu-scene'))) return;
    if(typeof loadSettings === 'function') loadSettings();
    if(typeof showStartScreen === 'function') showStartScreen();
  }catch(e){}
}
function accBoot(){
  if(ACC_ID) return true;
  if(accTrySync()){ accRefresh(); return true; }
  accTryAsync();
  return !!ACC_ID;
}
function accDiag(){
  if(ACC_ID){
    const mask = ACC_ID.length > 6 ? (ACC_ID.slice(0,3) + '***' + ACC_ID.slice(-4)) : ACC_ID;
    return '已绑定账号 ' + mask + '，本机存档按账号分开存';
  }
  if(typeof tap !== 'undefined' && tap && typeof tap.getUserInfo === 'function')
    return '未取到账号标识 · getUserInfo 原始返回：' + (ACC_RAW || '（空）');
  return '宿主没给 getUserInfo（浏览器 / 非 TapTap 容器），进度只存本机';
}
/* tap 可能晚于脚本注入：加载期试一次，DOMContentLoaded 与几个延迟点再补 */
try{
  if(typeof document !== 'undefined' && document.addEventListener)
    document.addEventListener('DOMContentLoaded', function(){ accBoot(); });
}catch(e){}
accBoot();
try{
  if(typeof setTimeout === 'function')
    [600, 1800, 4000].forEach(function(ms){ setTimeout(function(){ accBoot(); }, ms); });
}catch(e){}


function cloudEnv(){
  try{
    if(typeof tap === 'undefined' || !tap) return { ok:false, why:'非 TapTap 小游戏环境' };
    if(typeof tap.getCloudSaveManager !== 'function') return { ok:false, why:'基础库低于 2.0.0，不支持云存档' };
    if(typeof tap.getFileSystemManager !== 'function' || !tap.env || !tap.env.USER_DATA_PATH)
      return { ok:false, why:'缺少文件系统接口，无法读写存档文件' };
    return { ok:true, why:'' };
  }catch(e){ return { ok:false, why:'云存档探测失败：' + ((e && e.message) || e) }; }
}
let _cloudMgr = null;
function cloudMgr(){
  if(!cloudEnv().ok) return null;
  if(!_cloudMgr){ try{ _cloudMgr = tap.getCloudSaveManager(); }catch(e){ _cloudMgr = null; } }
  return _cloudMgr;
}

// 云端的“新旧”判据走这里，别往那俩存档键里塞字段
function cloudMeta(){
  const d = Store.getJSON(CLOUD_META_KEY);
  return (d && typeof d === 'object') ? d : {};
}
function cloudMetaSave(patch){
  const m = Object.assign(cloudMeta(), patch || {});
  Store.setJSON(CLOUD_META_KEY, m);
  return m;
}


let _cloudSessionStart = Date.now();
function cloudTimeStr(sec){
  const d = new Date((sec || 0) * 1000);
  const p = n => (n < 10 ? '0' : '') + n;
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
}
function cloudPlaytime(){
  const base = cloudMeta().playtime || 0;
  return base + Math.max(0, Math.floor((Date.now() - _cloudSessionStart) / 1000));
}
function cloudSizeStr(n){
  n = n || 0;
  if(n < 1024) return n + ' B';
  if(n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  return (n / 1024 / 1024).toFixed(2) + ' MB';
}

const CLOUD_ERR = {
  400000:'非法的存档文件/封面大小', 400001:'上传频率超限（一分钟只能传一次）', 400002:'指定的存档不存在',
  400003:'单应用下存档数量超限', 400005:'总存储空间超限', 400006:'操作令牌非法（网络卡顿）',
  400007:'不允许并发调用', 400008:'找不到可用的 OSS 供应商', 400009:'存档名称不合法',
  400100:'云存档 SDK 初始化失败', 400101:'存档路径对应的文件不存在', 400200:'archiveFilePath 为空',
  400201:'archiveUUID 为空', 400202:'archiveFileId 为空'
};
function cloudErrText(e){
  const no = e && e.errno;
  const word = CLOUD_ERR[no];
  const raw = (e && (e.errMsg || e.message)) || '未知错误';
  return word ? (word + '（errno ' + no + '）') : (raw + (no ? '（errno ' + no + '）' : ''));
}

// 官方不让并发(400007)，所有调用走单飞
let _cloudBusy = false;
function cloudGuard(fn){
  if(_cloudBusy) return Promise.reject(new Error('云存档正在忙，请稍候'));
  _cloudBusy = true;
  return Promise.resolve().then(fn).then(
    v => { _cloudBusy = false; return v; },
    e => { _cloudBusy = false; throw e; }
  );
}
function _cloudCall(fn){
  return new Promise((ok, no) => {
    const mgr = cloudMgr();
    if(!mgr) return no(new Error(cloudEnv().why));
    try{ fn(mgr, ok, e => no(new Error(cloudErrText(e)))); }
    catch(e){ no(new Error('云存档调用异常：' + ((e && e.message) || e))); }
  });
}
function _cloudListRaw(){
  return _cloudCall((mgr, ok, no) => mgr.getArchiveList({ success: r => ok((r && r.saves) || []), fail: no }));
}
function cloudFind(list){
  return (list || []).filter(a => a && a.name === CLOUD_NAME)
                     .sort((x, y) => (y.modifiedTime || 0) - (x.modifiedTime || 0))[0] || null;
}

// 两个本地存档原样打包，恢复时直接回写 Store
function cloudPayload(){
  return {
    app: 'zhiguaitower',
    v: 2,                                   // 多存档：多带一个 runs 数组（3 槽）
    ts: Math.floor(Date.now() / 1000),
    runs: RUN_SLOTS.map(function(k){ return Store.getJSON(k); }),
    run: Store.getJSON(RUN_KEY),            // 兼容：旧版读取方只看 run（= 1 号槽）
    save: Store.getJSON(SAVE_KEY)
  };
}
// 取第一个非空的槽；多存档后不能假定 1 号槽就是进行中那局
function cloudPrimaryRun(){
  for(let i=0;i<RUN_SLOTS.length;i++){ const d=Store.getJSON(RUN_SLOTS[i]); if(d) return d; }
  return null;
}
// summary 有字节上限，超了要截
function cloudMetadata(){
  const run = cloudPrimaryRun();
  const now = cloudTimeStr(Math.floor(Date.now() / 1000));
  let summary = run
    ? ('第' + run.act + '幕 第' + ((run.mapRow || 0) + 1) + '层 · 得分' + (run.score || 0) +
       ' · 生命' + (run.hp || 0) + '/' + (run.maxHp || 0) + ' · 金币' + (run.gold || 0) + ' · ' + now)
    : ('无进行中的爬塔 · ' + now);
  if(summary.length > 400) summary = summary.slice(0, 400);   // 中文字符 ≤3 字节，留足 500 字节余量
  const extra = JSON.stringify({
    act: run ? run.act : 0, row: run ? (run.mapRow || 0) : 0, score: run ? (run.score || 0) : 0,
    hp: run ? run.hp : 0, maxHp: run ? run.maxHp : 0, gold: run ? run.gold : 0,
    hero: run ? run.hero : null, ts: Math.floor(Date.now() / 1000)
  });
  return { name: CLOUD_NAME, summary: summary, extra: extra.slice(0, 990), playtime: cloudPlaytime() };
}


// 真机的 FileSystemManager 不一定有 writeFileSync（报过 is not a function）
// 所以按候选名单探测，挑不到就把可用方法名塞进错误里，让真机自己报
function cloudFsMethods(fs){
  const out = [];
  try{ for(const k in fs){ try{ if(typeof fs[k] === 'function') out.push(k); }catch(e){} } }catch(e){}
  if(!out.length){
    try{
      Object.getOwnPropertyNames(fs).forEach(k => { try{ if(typeof fs[k] === 'function') out.push(k); }catch(e){} });
    }catch(e){}
  }
  return out;
}
function cloudFsApi(){
  let fs = null;
  try{ fs = tap.getFileSystemManager(); }catch(e){ fs = null; }
  if(!fs) throw new Error('tap.getFileSystemManager() 返回空对象');
  const has = n => { try{ return typeof fs[n] === 'function'; }catch(e){ return false; } };
  return {
    fs: fs,
    writeSync: ['writeFileSync'].filter(has)[0] || '',
    writeAsync: ['writeFile'].filter(has)[0] || '',
    readSync: ['readFileSync'].filter(has)[0] || '',
    readAsync: ['readFile'].filter(has)[0] || '',
    names: cloudFsMethods(fs)
  };
}
function cloudFsNoApi(verb, a){
  return new Error('宿主文件系统没有可用的' + verb + '文件接口（可用方法：' +
                   (a.names.join(' / ') || '一个都没有') + '）');
}
function cloudWriteText(path, text){
  const a = cloudFsApi();
  if(a.writeSync){
    a.fs[a.writeSync](path, text, 'utf8');   // 同步版：写完即返回
    return Promise.resolve();
  }
  if(a.writeAsync){                          // 异步版：小程序系一律是「对象参数 + success/fail」
    return new Promise((ok, no) => {
      try{
        a.fs[a.writeAsync]({ filePath: path, data: text, encoding: 'utf8',
          success: () => ok(), fail: e => no(new Error('写存档文件失败：' + cloudErrText(e))) });
      }catch(e){ no(new Error('写存档文件异常：' + ((e && e.message) || e))); }
    });
  }
  throw cloudFsNoApi('写', a);
}
function cloudReadText(path){
  const a = cloudFsApi();
  if(a.readSync){
    const raw = a.fs[a.readSync](path, 'utf8');
    return Promise.resolve(typeof raw === 'string' ? raw : String(raw));
  }
  if(a.readAsync){
    return new Promise((ok, no) => {
      try{
        a.fs[a.readAsync]({ filePath: path, encoding: 'utf8',
          success: r => ok((r && r.data) || ''), fail: e => no(new Error('读存档文件失败：' + cloudErrText(e))) });
      }catch(e){ no(new Error('读存档文件异常：' + ((e && e.message) || e))); }
    });
  }
  throw cloudFsNoApi('读', a);
}


function cloudUpload(force){
  const env = cloudEnv();
  if(!env.ok) return Promise.reject(new Error(env.why));
  const now = Date.now();
  if(!force && now - (cloudMeta().lastUploadTs || 0) < CLOUD_MIN_GAP)
    return Promise.reject(new Error('距上次上传不足 1 分钟（官方频控），请稍后再试'));
  return cloudGuard(() => {
    const path = tap.env.USER_DATA_PATH + '/' + CLOUD_FILE;
    // 先把内容落成本地文件再发请求，写不了就立刻失败，别白烧一分钟一次的配额
    return cloudWriteText(path, JSON.stringify(cloudPayload()))
      .then(() => _cloudListRaw())
      .then(list => {
        const mine = cloudFind(list);
        const meta = cloudMetadata();
        return _cloudCall((mgr, ok, no) => {
          const base = { archiveMetaData: meta, archiveFilePath: path, success: ok, fail: no };
          if(mine) mgr.updateArchive(Object.assign({ archiveUUID: mine.uuid }, base));
          else     mgr.createArchive(base);
        });
      })
      .then(res => {
        cloudMetaSave({
          lastUploadTs: Date.now(), lastLocalTs: Date.now(),
          uuid: (res && res.uuid) || '', fileId: (res && res.fileId) || '',
          playtime: cloudPlaytime(), lastError: ''
        });
        return res || {};
      });
  });
}


function cloudApplyToStore(data){
  if(!data || data.app !== 'zhiguaitower') throw new Error('云端存档不是本游戏的数据');
  if(Array.isArray(data.runs)){
    // 空槽要删本地残留，不然云端恢复不出“空”
    RUN_SLOTS.forEach(function(k, i){
      const d = data.runs[i];
      if(d) Store.setJSON(k, d); else Store.del(k);
    });
  } else if(data.run){
    // 旧云档只有一个 run，落进 1 号槽
    Store.setJSON(RUN_KEY, data.run);
  }
  if(data.save) Store.setJSON(SAVE_KEY, data.save);
}
function cloudRestore(uuid, fileId){
  const env = cloudEnv();
  if(!env.ok) return Promise.reject(new Error(env.why));
  return cloudGuard(() => {
    const path = tap.env.USER_DATA_PATH + '/' + CLOUD_FILE;
    return _cloudCall((mgr, ok, no) => mgr.getArchiveData({
      archiveUUID: uuid, archiveFileId: fileId, targetFilePath: path, success: ok, fail: no
    })).then(res => cloudReadText(res && res.filePath ? res.filePath : path).then(raw => {
      const data = JSON.parse(raw);
      cloudApplyToStore(data);
      cloudMetaSave({ lastLocalTs: Date.now(), lastError: '' });
      return data;
    }));
  });
}
function cloudRemove(uuid){
  const env = cloudEnv();
  if(!env.ok) return Promise.reject(new Error(env.why));
  return cloudGuard(() => _cloudCall((mgr, ok, no) => mgr.deleteArchive({ archiveUUID: uuid, success: ok, fail: no })));
}
function cloudList(){ return cloudGuard(_cloudListRaw); }


// saveRun / persistSave 只管记一笔，真正上传在这里按 60s 节流
let _cloudDirty = false, _cloudTimer = null, _cloudUploading = false, _cloudFails = 0;
function cloudMarkDirty(){
  if(!cloudEnv().ok) return;                     // 非 TapTap 环境：一个字节都不写
  cloudHookHide();                               // 确认 tap 在之后再挂退出兜底（模块加载时可能还没注入）
  cloudMetaSave({ lastLocalTs: Date.now() });
  _cloudDirty = true;
  _cloudFails = 0;                               // 又存档了，重新给三次机会
  cloudPump();
}
function cloudPump(){
  if(!_cloudDirty || _cloudUploading) return;
  const wait = CLOUD_MIN_GAP - (Date.now() - (cloudMeta().lastUploadTs || 0));
  if(wait > 0){
    if(!_cloudTimer && typeof setTimeout === 'function'){
      _cloudTimer = setTimeout(() => { _cloudTimer = null; cloudPump(); }, wait + 800);
    }
    return;
  }
  _cloudDirty = false; _cloudUploading = true;
  cloudUpload(true).then(
    () => { _cloudUploading = false; if(_cloudDirty) cloudPump(); },
    e => {
      _cloudUploading = false;
      _cloudFails++;
      cloudMetaSave({ lastError: String((e && e.message) || e), lastErrorTs: Date.now() });
      // 连败三次就停自动重试，免得每分钟白打一次
      if(_cloudFails >= 3){ _cloudDirty = false; return; }
      _cloudDirty = true;
      if(typeof setTimeout === 'function') setTimeout(() => cloudPump(), CLOUD_MIN_GAP);
    }
  );
}
// 存档后 60s 内退出，这笔进度就没机会传，所以隐藏时绕过节流直发一次
// 真撞上频控(400001)就把 dirty 丢回去，等下次存档再补，别吞这一笔
function cloudFlush(){
  if(!cloudEnv().ok || !_cloudDirty || _cloudUploading) return;
  _cloudDirty = false; _cloudUploading = true;
  cloudUpload(true).then(
    () => { _cloudUploading = false; },
    e => {
      _cloudUploading = false;
      _cloudDirty = true;                        // 没传成，还原脏标记，别丢这一笔
      cloudMetaSave({ lastError: String((e && e.message) || e), lastErrorTs: Date.now() });
    }
  );
}
// 两个钩子分开挂：加载时 tap 可能还没注入，只挂得上 visibilitychange
let _cloudTapHideHooked = false, _cloudVisHooked = false;
function cloudHookHide(){
  try{
    if(!_cloudTapHideHooked && typeof tap !== 'undefined' && tap && typeof tap.onHide === 'function'){
      tap.onHide(() => cloudFlush()); _cloudTapHideHooked = true;
    }
  }catch(e){}
  if(_cloudVisHooked) return;
  _cloudVisHooked = true;
  try{
    if(typeof document !== 'undefined' && document.addEventListener)
      document.addEventListener('visibilitychange', () => {
        if(document.visibilityState === 'hidden') cloudFlush();
      });
  }catch(e){}
}

function cloudStatus(){
  const env = cloudEnv(), m = cloudMeta();
  return {
    supported: env.ok, why: env.why,
    lastUploadTs: m.lastUploadTs || 0, lastError: m.lastError || '',
    dirty: _cloudDirty, uploading: _cloudUploading,
    uuid: m.uuid || ''
  };
}


function cloudBootCheck(){
  if(!cloudEnv().ok) return;
  if(typeof setTimeout !== 'function') return;
  setTimeout(() => {
    cloudList().then(list => {
      const mine = cloudFind(list);
      if(!mine) return;
      const localTs = Math.floor((cloudMeta().lastLocalTs || 0) / 1000);
      // 云端比本地最近落档还新 60 秒以上，疑似换设备或清了缓存
      if((mine.modifiedTime || 0) > localTs + 60) cloudPromptRestore(mine);
    }).catch(() => {});
  }, 2000);
}
function cloudPromptRestore(a){
  showOverlay(`<h2>发现云端存档</h2>
    <p>云端有一份比本机更新的存档：<br><b style="color:var(--gold)">${a.summary || a.name}</b></p>
    <p style="color:var(--dim);font-size:12px">上传时间 ${cloudTimeStr(a.modifiedTime)} · 游戏时长 ${Math.floor((a.playtime || 0) / 60)} 分钟</p>
    <p style="color:var(--dim);font-size:12px">恢复后本机进度会被云端覆盖。</p>
    <button class="btn" onclick="cloudAcceptRestore('${a.uuid}','${a.fileId}')">恢复云端存档</button>
    <button class="btn ghost" onclick="showStartScreen()">稍后再说</button>`);
  // “稍后再说”走 showStartScreen，直接 hideOverlay 会留下一块空屏
}


function showCloudPanel(){
  const env = cloudEnv();
  if(!env.ok){
    showOverlay(`<h2>云 存 档</h2>
      <p>当前环境不支持云存档：<b style="color:var(--red)">${env.why}</b></p>
      <p style="color:var(--dim);font-size:12px">云存档只在 TapTap 小游戏端（基础库 2.0.0 及以上）可用。<br>浏览器 / PWA / 本地打开时，进度照常存在本机，不受影响。</p>
      <button class="btn ghost" onclick="showSettings()">返回设置</button>`);
    return;
  }
  const st = cloudStatus();
  showOverlay(`<h2>云 存 档</h2>
    <p id="cloudStateLbl">正在读取云端存档…</p>
    <div id="cloudBody" style="text-align:left;font-size:13px;color:var(--dim);min-height:52px;margin:8px 0"></div>
    <button class="btn" id="cloudUpBtn" onclick="cloudPanelUpload()">立即上传到云端</button>
    <button class="btn ghost" onclick="cloudPanelRefresh()">刷新云端列表</button>
    <button class="btn ghost" onclick="showSettings()">返回设置</button>
    <p style="color:var(--dim);font-size:12px;margin-top:10px">${st.lastError ? '上次上传失败：<b style="color:var(--red)">' + st.lastError + '</b><br>' : ''}
      官方频控：云存档每分钟只能上传一次。</p>`);
  cloudPanelRefresh();
}
function cloudPanelRefresh(){
  const lbl = document.getElementById('cloudStateLbl');
  const body = document.getElementById('cloudBody');
  if(!body) return;
  if(lbl) lbl.textContent = '正在读取云端存档…';
  cloudList().then(list => {
    const mine = cloudFind(list);
    if(lbl) lbl.textContent = mine ? '云端已有存档' : '云端暂无存档（首次上传会新建）';
    if(!mine){ body.innerHTML = '<span>还没有上传过。点「立即上传到云端」创建第一份云存档。</span>'; return; }
    const st = cloudStatus();
    body.innerHTML =
      '<div><b style="color:var(--gold)">' + (mine.summary || mine.name) + '</b></div>' +
      '<div>存档名 ' + mine.name + '</div>' +
      '<div>上传时间 ' + cloudTimeStr(mine.modifiedTime) + ' · 创建 ' + cloudTimeStr(mine.createdTime) + '</div>' +
      '<div>游戏时长 ' + Math.floor((mine.playtime || 0) / 60) + ' 分钟 · 文件 ' + cloudSizeStr(mine.saveSize) + '</div>' +
      '<div style="margin-top:8px">' +
        '<button class="btn ghost" onclick="cloudPanelRestore(\'' + mine.uuid + '\',\'' + mine.fileId + '\')">用这份覆盖本机</button> ' +
        '<button class="btn ghost" onclick="cloudPanelDelete(\'' + mine.uuid + '\')">删除云存档</button>' +
      '</div>' + (st.lastError ? '<div style="color:var(--red)">上次失败：' + st.lastError + '</div>' : '');
  }).catch(e => {
    if(lbl) lbl.textContent = '读取失败';
    body.innerHTML = '<span style="color:var(--red)">' + ((e && e.message) || e) + '</span>';
  });
}
function cloudPanelUpload(){
  const btn = document.getElementById('cloudUpBtn');
  if(btn){ btn.disabled = true; btn.textContent = '上传中…'; }
  cloudUpload(false).then(
    res => { cloudMetaSave({ lastError: '' }); floatMsg('已上传到云端'); if(btn){ btn.disabled = false; btn.textContent = '立即上传到云端'; } cloudPanelRefresh(); },
    e => {
      // 手动上传失败也得写进簿记，不然面板底部一直挂着上次的旧报错
      const msg = String((e && e.message) || e);
      cloudMetaSave({ lastError: msg, lastErrorTs: Date.now() });
      floatMsg(msg);
      if(btn){ btn.disabled = false; btn.textContent = '立即上传到云端'; }
      cloudPanelRefresh();
    }
  );
}
function cloudPanelRestore(uuid, fileId){
  cloudRestore(uuid, fileId).then(
    () => cloudAcceptRestoreAfterRestore(),
    e => floatMsg(String((e && e.message) || e))
  );
}
function cloudPanelDelete(uuid){
  cloudRemove(uuid).then(
    () => { floatMsg('云存档已删除'); cloudPanelRefresh(); },
    e => floatMsg(String((e && e.message) || e))
  );
}
function cloudAcceptRestore(uuid, fileId){
  cloudRestore(uuid, fileId).then(
    () => cloudAcceptRestoreAfterRestore(),
    e => floatMsg(String((e && e.message) || e))
  );
}
// 恢复后内存里的 G 已过期，先丢开、重读存档，再回主菜单
function cloudAcceptRestoreAfterRestore(){
  try{ loadSave(); }catch(e){}
  try{ G = null; }catch(e){}
  try{ SCENE = 'menu'; }catch(e){}
  showOverlay(`<h2>已恢复云端存档</h2>
    <p>本机进度已替换为云端版本。</p>
    <button class="btn" onclick="showStartScreen()">回到主菜单</button>`);
}

// 模块加载先挂一次（一般只挂得上 visibilitychange），tap.onHide 等首次同步再补
try{ cloudHookHide(); }catch(e){}

/* 通关计时榜：TapTap 全平台排行榜适配
 * 用时按毫秒提交；回调是 callback:{onSuccess,onFailure}，不是 {success,fail} */
// 6 个榜：通关总榜 + 4 个角色分榜 + 1 个总分榜；排序口径在后台建榜时定
const RANK_IDS = {
  clear_total:     'dgakiqz3gn7lb847ss',
  clear_tianshi:   'xc3t2r13go0t8ykcma',
  clear_ganshiren: 'kxb793ucsscio9ol1l',
  clear_wuseng:    'u45n8mhpyr8eyvzop2',
  clear_yincha:    'n0uxtpk2vde3xt4mc1',
  total_score:     'k74rffqopia2pn6tsb'
};
const RANK_ID = RANK_IDS.clear_total;              // 兼容旧引用（默认榜 = 通关计时总榜）
// 榜单元数据，UI 和提交共用；hero 非空就只算该角色
const RANK_BOARDS = [
  {id:'clear_total',     name:'通关计时 · 总榜',  kind:'clear', hero:''},
  {id:'clear_tianshi',   name:'通关计时 · 天师',  kind:'clear', hero:'tianshi'},
  {id:'clear_ganshiren', name:'通关计时 · 赶尸人',kind:'clear', hero:'ganshiren'},
  {id:'clear_wuseng',    name:'通关计时 · 武僧',  kind:'clear', hero:'wuseng'},
  {id:'clear_yincha',    name:'通关计时 · 阴差',  kind:'clear', hero:'yincha'},
  {id:'total_score',     name:'整局总分榜',       kind:'score', hero:''}
];
function rankBoardById(id){ return RANK_BOARDS.find(b => b.id === id) || RANK_BOARDS[0]; }
function rankBoardId(id){ return RANK_IDS[id] || RANK_ID; }
const RANK_CAND_RE = /rank|leaderboard|score/i;    // 候选方法名的判据
let _rankProbe = null;

function rankEnv(){
  try{
    if(typeof tap === 'undefined' || !tap) return { ok:false, why:'非 TapTap 小游戏环境' };
    return { ok:true, why:'' };
  }catch(e){ return { ok:false, why:'排行榜探测失败：' + ((e && e.message) || e) }; }
}
// 方法名要连原型链一起收：旧的只看自身，收出来是空的，才一直报「未发现排行榜接口」
// 逐层 getPrototypeOf，跳过 constructor，收到 Object.prototype 为止
function rankMethodNames(obj){
  const out = [], seen = Object.create(null);
  try{
    for(let o = obj; o && o !== Object.prototype; o = Object.getPrototypeOf(o)){
      Object.getOwnPropertyNames(o).forEach(k => {
        if(k === 'constructor' || seen[k]) return;
        seen[k] = 1;
        try{ if(typeof obj[k] === 'function') out.push(k); }catch(e){}
      });
    }
  }catch(e){}
  return out;
}

function rankProbe(){
  if(_rankProbe) return _rankProbe;
  const env = rankEnv();
  if(!env.ok) return (_rankProbe = { ok:false, why:env.why, names:[], cands:[] });
  const names = rankMethodNames(tap);
  return (_rankProbe = { ok:true, why:'', names:names, cands:names.filter(n => RANK_CAND_RE.test(n)) });
}
// 判据：真拿到管理器、且管理器上有这套方法
function rankAvailable(){
  const m = rankManager();
  if(!m || m.via !== 'manager') return false;
  return typeof m.ctx.loadLeaderboardScores === 'function' || typeof m.ctx.submitScores === 'function';
}
// 诊断串，真机回报时直接发出来
function rankDiag(){
  const p = rankProbe();
  if(!p.ok) return p.why;
  let s = 'TapTap 可用方法：' + (p.names.join(' / ') || '一个都没有')
        + '；排行榜候选：' + (p.cands.join(' / ') || '无');
  const m = rankManager();
  if(m && m.via === 'manager') s += '；排行榜管理器方法：' + (m.all.join(' / ') || '（管理器在，但方法名收不到）');
  return s;
}
// 管理器优先 getLeaderboardManager()，退回 tap 自身；候选全没命中就退回全量硬试
function rankManager(){
  try{
    if(typeof tap.getLeaderboardManager === 'function'){
      const m = tap.getLeaderboardManager();
      if(m){
        const all = rankMethodNames(m);
        const hit = all.filter(n => RANK_CAND_RE.test(n));
        return { ctx:m, cands:(hit.length ? hit : all), all:all, via:'manager' };
      }
    }
  }catch(e){}
  const p = rankProbe();
  return p.ok ? { ctx:tap, cands:p.cands, all:p.names, via:'tap' } : null;
}
// 回调是 callback:{onSuccess,onFailure}；早先猜的 {success,fail} 永远失败
function rankCall(ctx, name, payload, what, timeoutMs){
  what = what || '排行榜';
  const T = timeoutMs || 15000;
  return new Promise((ok, no) => {
    let done = false, timer = null;
    const good = v => { if(!done){ done = true; if(timer) clearTimeout(timer); ok(v); } };
    const bad  = e => { if(!done){ done = true; if(timer) clearTimeout(timer); no(e); } };
    try{
      const fn = ctx[name];
      if(typeof fn !== 'function') return bad(new Error('管理器没有 ' + name + ' 方法'));
      const onFail = (code, message) => bad(new Error((message || what + '调用失败') + (code != null ? ('（code ' + code + '）') : '')));
      fn.call(ctx, Object.assign({
        callback: { onSuccess: good, onFailure: onFail },
        // 两套回调形状一起下发，SDK 认哪套用哪套；done 闸保证只结算一次
        success: good,
        fail: e => bad(new Error((e && (e.errMsg || e.message)) || what + '调用失败'))
      }, payload));
      // 超时兜底，别把界面钉在“读取中”；成就层要试多个方法名，超时得短
      if(typeof setTimeout === 'function') timer = setTimeout(() => bad(new Error(what + '接口无响应（' + Math.round(T/1000) + ' 秒）')), T);
    }catch(e){ bad(e); }
  });
}

function rankCtx(){
  const m = rankManager();
  return (m && m.via === 'manager') ? m.ctx : null;
}
// 提交该榜的统计值：clear 榜传毫秒，总分榜传得分
function rankSubmit(value, boardId){
  const ctx = rankCtx();
  if(!ctx || typeof ctx.submitScores !== 'function') return Promise.reject(new Error('未发现排行榜接口。' + rankDiag()));
  const bid = rankBoardId(boardId);
  const v = Math.max(0, Math.round(value || 0));
  return rankCall(ctx, 'submitScores', { scores: [{ leaderboardId: bid, score: v }] }).then(
    // 提交成功就报 Nice-encounter 成就；_tapAchSent 去重
    () => { tapAchieve('Nice-encounter'); return { ok:true, value:v, board:bid, via:'submitScores' }; },
    e => { throw new Error('排行榜提交失败（' + ((e && e.message) || e) + '）。' + rankDiag()); }
  );
}
// 拉前排数据，返回 rank/score/nickname/avatar
function rankFetch(limit, boardId){
  const ctx = rankCtx();
  if(!ctx || typeof ctx.loadLeaderboardScores !== 'function') return Promise.reject(new Error('未发现排行榜接口。' + rankDiag()));
  const bid = rankBoardId(boardId);
  return rankCall(ctx, 'loadLeaderboardScores', {
    leaderboardId: bid, maxSize: limit || 10, nextPage: undefined, periodToken: undefined
  }).then(
    res => (res && res.scores) || res,
    e => { throw new Error('排行榜读取失败（' + ((e && e.message) || e) + '）。' + rankDiag()); }
  );
}
// 打开 TapTap 自带榜页，只认排行榜 ID
function rankOpenBoard(boardId){
  const ctx = rankCtx();
  if(!ctx || typeof ctx.openLeaderboard !== 'function') return Promise.reject(new Error('未发现排行榜接口。' + rankDiag()));
  return rankCall(ctx, 'openLeaderboard', { leaderboardId: rankBoardId(boardId) });
}
// 取当前玩家真实昵称/头像：没有公开的接口名，只好挨个方法名试
// 兼容同步 return 和 callback 两种形态，3 秒拿不到就落空；结果缓存一次
const RANK_SELF_METHODS = ['getUserInfo','getUserProfile','getUser','getPlayerInfo','getAccountInfo','getLoginInfo','getMyInfo'];
let _rankSelf = null;
function rankSelfShape(o){
  if(!o || typeof o !== 'object') return null;
  const name = o.nickname || o.nickName || o.name || o.userName || o.displayName || o.screenName;
  const avatar = o.avatar || o.avatarUrl || o.headImg || o.headUrl || o.icon || o.portrait;
  if(!name && !avatar) return null;
  return { name: name ? String(name).slice(0,12) : '', avatar: avatar ? String(avatar) : '' };
}
function rankSelf(){
  if(_rankSelf) return Promise.resolve(_rankSelf);
  return new Promise(ok => {
    let settled = false;
    const done = o => { if(!settled){ settled = true; _rankSelf = rankSelfShape(o) || {}; ok(_rankSelf); } };
    const tryCtx = ctx => {
      if(!ctx) return;
      for(let i=0; i<RANK_SELF_METHODS.length; i++){
        const nm = RANK_SELF_METHODS[i], fn = ctx[nm];
        if(typeof fn !== 'function') continue;
        try{
          const r = fn.call(ctx, { callback: {
            onSuccess: o => done(o), onFailure: () => {}
          }});
          if(r && typeof r.then === 'function') r.then(done, () => {});
          else { const s = rankSelfShape(r); if(s) done(s); }
        }catch(e){}
        if(settled) return;
      }
    };
    try{ if(typeof tap !== 'undefined' && tap) tryCtx(tap); }catch(e){}
    if(!settled){ try{ tryCtx(rankCtx()); }catch(e){} }
    if(settled) return;
    if(typeof setTimeout === 'function') setTimeout(() => done(null), 3000); else done(null);
  });
}
// 取我在某榜的名次，拿不到昵称时也用它补真名
function rankSelfScore(boardId){
  const ctx = rankCtx();
  if(!ctx || typeof ctx.loadCurrentPlayerLeaderboardScore !== 'function')
    return Promise.reject(new Error('未发现 loadCurrentPlayerLeaderboardScore 接口'));
  return rankCall(ctx, 'loadCurrentPlayerLeaderboardScore', { leaderboardId: rankBoardId(boardId) });
}

/* 成就：TapTap 平台成就适配
 * 内容全部交给平台侧点亮，游戏内不再自持成就系统 */
const TAP_ACHIEVEMENTS = [
  {id:'Beginning',      openId:'Beginning',      name:'登塔！！！',        desc:'开始一局爬塔（进入第一幕）',            steps:1},
  {id:'Hard-three',     openId:'Hard-three',     name:'初入第三幕',        desc:'爬塔推进到第三幕',                      steps:1},
  {id:'All-unlocked',   openId:'All-unlocked',   name:'百鬼全录',          desc:'集齐全 34 条志怪图鉴（累计型）',        steps:34},
  {id:'No-matter-Who',  openId:'No-matter-Who',  name:'全能降魔者',        desc:'用 4 名角色各通关一次（累计型）',        steps:4},
  {id:'Get-all',        openId:'Get-all',        name:'解锁并拥有所有角色', desc:'解锁全部 4 名角色（累计型）',            steps:4},
  {id:'Nice-encounter', openId:'Nice-encounter', name:'风云榜相聚',        desc:'6 个榜单中任意一榜入围',                steps:1}
];
// 候选方法名按最可能命中排序，只试前 4 个，每个 4 秒
const TAP_ACH_METHODS = ['unlockAchievement','unlock','completeAchievement','submitAchievement',
                         'achieve','addAchievement','growSteps','addSteps','updateAchievement','setAchievement'];
const TAP_ACH_TRY = 4;
let _tapAchSent = null;         // 已上报过的 openId，免重复打平台
function tapAchById(id){ return TAP_ACHIEVEMENTS.find(a => a.id === id || a.openId === id) || null; }
function tapAchieveEnv(){
  try{
    if(typeof tap === 'undefined' || !tap) return { ok:false, why:'非 TapTap 小游戏环境' };
    return { ok:true, why:'' };
  }catch(e){ return { ok:false, why:'成就环境探测失败：' + ((e && e.message) || e) }; }
}

function tapAchievementManager(){
  try{
    if(typeof tap.getAchievementManager === 'function'){
      const m = tap.getAchievementManager();
      if(m) return { ctx:m, all:rankMethodNames(m), via:'manager' };
    }
  }catch(e){}
  return tapAchieveEnv().ok ? { ctx:tap, all:rankMethodNames(tap), via:'tap' } : null;
}
// 诊断串，把真机真实可用的方法名亮出来
function tapAchieveDiag(){
  const env = tapAchieveEnv();
  if(!env.ok) return env.why;
  const p = tapAchievementManager();
  if(!p) return 'TapTap 可用，但拿不到成就对象';
  return '成就对象（' + p.via + '）可用方法：' + (p.all.join(' / ') || '一个都收不到')
       + '；候选：' + TAP_ACH_METHODS.join(' / ');
}

function tapAchieve(id, steps){
  const env = tapAchieveEnv();
  if(!env.ok) return Promise.resolve({ ok:false, why:env.why });
  const a = tapAchById(id);
  const openId = a ? a.openId : id;
  const p = tapAchievementManager();
  if(!p) return Promise.resolve({ ok:false, why:'拿不到成就对象', diag:tapAchieveDiag() });
  if(!_tapAchSent) _tapAchSent = Object.create(null);
  if(_tapAchSent[openId]) return Promise.resolve({ ok:true, cached:true, openId:openId });
  const payload = {
    achievementOpenId:openId, openId:openId, achievement_open_id:openId,
    achievementId:openId, achievement_id:openId, id:openId
  };
  if(steps != null){
    const n = Math.max(0, Math.round(steps || 0));
    payload.steps = n; payload.step = n; payload.progress = n;
    payload.completedStep = n; payload.completed_step = n;
  }
  const cands = TAP_ACH_METHODS.filter(n => typeof p.ctx[n] === 'function').slice(0, TAP_ACH_TRY);
  if(!cands.length) return Promise.resolve({ ok:false, why:'成就对象上没有候选方法', diag:tapAchieveDiag() });
  // 挨个候选试，名字对了键名不对也会失败，换下一个
  let chain = Promise.reject(new Error('（未尝试）'));
  cands.forEach(n => { chain = chain.catch(() => rankCall(p.ctx, n, payload, '成就', 4000)); });
  return chain.then(
    res => { _tapAchSent[openId] = 1; return { ok:true, openId:openId, via:cands[0], res:res }; },
    e => ({ ok:false, openId:openId, why:(e && e.message) || String(e), diag:tapAchieveDiag() })
  );
}
// 累计型成就达标才上报，steps 传目标值，别每次击杀都打平台
function tapAchieveProgress(id, cur){
  const a = tapAchById(id);
  const need = (a && a.steps) || 1;
  if((cur|0) < need) return Promise.resolve({ ok:false, why:'未达标（' + (cur|0) + '/' + need + '）' });
  return tapAchieve(id, need);
}