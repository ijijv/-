/* ============================================================================
 * 志怪塔 · js/55_cloud.js —— TapTap 小游戏云存档适配层
 * ----------------------------------------------------------------------------
 * 目标：把「本局断点续玩档 RUN_KEY」+「局外元数据档 SAVE_KEY」整体同步到
 *       TapTap 云存档，换设备 / 清缓存后能拉回来。
 *       非 TapTap 环境（浏览器 / PWA / 本地双击 / node 冒烟）下整个模块**自动降级
 *       为 no-op**：不写任何 Store 键、不发任何请求，既有 localStorage 体系一字不改。
 *
 * 接口依据（developer.taptap.cn → 小游戏 API → 开放接口 → 云存档，基础库 2.0.0+）：
 *   tap.getCloudSaveManager() → CloudSaveManager（全局单例，多次调用返回同一实例）
 *     · createArchive({archiveMetaData, archiveFilePath, archiveCoverPath?, success, fail, complete})
 *         → res { uuid, fileId }
 *     · updateArchive({archiveUUID, archiveMetaData, archiveFilePath, archiveCoverPath?, ...})
 *         → res { uuid, fileId }（uuid 不变，fileId 会更新）
 *     · getArchiveList({success, fail, complete}) → res.saves[ArchiveDetailData]
 *         ArchiveDetailData: uuid/fileId/name/summary/extra/playtime/saveSize/coverSize/createdTime/modifiedTime
 *     · getArchiveData({archiveUUID, archiveFileId, targetFilePath?, ...}) → res.filePath
 *     · getArchiveCover(...) → res.filePath（本模块不用封面）
 *     · deleteArchive({archiveUUID, ...}) → res.uuid
 *   文件读写：tap.getFileSystemManager()（writeFileSync / readFileSync）+ tap.env.USER_DATA_PATH
 *
 * ⚠️ 硬约束（照官方文档抄下来，改代码时别忘）：
 *   ① createArchive / updateArchive **一分钟之内最多调用一次**（errno 400001）。
 *      所以上传**绝不能**挂在 saveRun 上直发 —— 只 markDirty 排队，由节流器按 60s 放行。
 *      ⚠️ 官方公开文档（云存档功能介绍 / 开发指南 v4）写的是「每分钟最多 60 次、
 *         最多 10 个并发」，比这里的 60s 宽得多；小游戏 H5 那页要登录，原文没核到，
 *         故**保持保守值不动**（宁可慢，不会踩线）。真机冒烟时按实际报错再定。
 *   ② 不允许并发调用（errno 400007）⇒ 全部操作走单飞队列 _busy。
 *   ③ ArchiveMetaData.name ≤60 字节且**不允许汉字**（errno 400009，用 400009 判别）；
 *      summary ≤500 字节（必填，可中文）；extra ≤1000 字节；playtime 为秒。
 *   ④ 存档文件 ≤10MB（本模块只存两个 JSON，几十 KB 量级）。
 *
 * ⚠️ **不往 RUN_KEY / SAVE_KEY 里塞字段**：saveRun 的快照形状被冒烟闸盯着。
 *    云端的「新旧」判据走本模块自己的 Store 键 zhiguaitower_cloudmeta_v1。
 * ============================================================================ */

const CLOUD_NAME = 'zhiguaitower';                  // 云端存档名：ASCII、≤60 字节
const CLOUD_FILE = 'zhiguaitower_cloud.json';       // 云端存档文件名（写在 USER_DATA_PATH 下）
const CLOUD_META_KEY = 'zhiguaitower_cloudmeta_v1'; // 本模块自己的簿记（时间戳 / 云 uuid / 累计时长）
const CLOUD_MIN_GAP = 60 * 1000;                    // 官方频控：createArchive / updateArchive 一分钟一次

/* ===================== 环境探测 ===================== */
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

/* ===================== 本模块簿记（独立 Store 键，不污染两个存档键） ===================== */
function cloudMeta(){
  const d = Store.getJSON(CLOUD_META_KEY);
  return (d && typeof d === 'object') ? d : {};
}
function cloudMetaSave(patch){
  const m = Object.assign(cloudMeta(), patch || {});
  Store.setJSON(CLOUD_META_KEY, m);
  return m;
}

/* ===================== 小工具 ===================== */
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
/* 错误码 → 人话（官方错误码表，createArchive/updateArchive/getArchiveList/getArchiveData/deleteArchive 合并） */
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

/* ===================== 单飞调用（官方不允许并发 400007） ===================== */
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

/* ===================== 组装云端存档内容 ===================== */
/* 存档文件本体：两个本地存档 JSON 原样打包，不做二次加工 —— 恢复时直接回写 Store，
   这样「续档 / 局外解锁」两条既有路径完全不用改。 */
function cloudPayload(){
  return {
    app: 'zhiguaitower',
    v: 2,                                   // v1.0.1：多存档 —— 多带一个 runs 数组（3 槽）
    ts: Math.floor(Date.now() / 1000),
    runs: RUN_SLOTS.map(function(k){ return Store.getJSON(k); }),
    run: Store.getJSON(RUN_KEY),            // 兼容：旧版读取方只看 run（= 1 号槽）
    save: Store.getJSON(SAVE_KEY)
  };
}
/* 云端摘要用「第一个非空的存档槽」——多存档后不能再假定 1 号槽就是进行中的那局。 */
function cloudPrimaryRun(){
  for(let i=0;i<RUN_SLOTS.length;i++){ const d=Store.getJSON(RUN_SLOTS[i]); if(d) return d; }
  return null;
}
/* ArchiveMetaData：name 必须 ASCII；summary / extra 有字节上限，超了要截 */
function cloudMetadata(){
  const run = cloudPrimaryRun();
  const hs = (typeof SAVE !== 'undefined' && SAVE && SAVE.highScores && SAVE.highScores[0]) ? SAVE.highScores[0].score : 0;
  const now = cloudTimeStr(Math.floor(Date.now() / 1000));
  let summary = run
    ? ('第' + run.act + '幕 第' + ((run.mapRow || 0) + 1) + '层 · 得分' + (run.score || 0) +
       ' · 生命' + (run.hp || 0) + '/' + (run.maxHp || 0) + ' · 金币' + (run.gold || 0) + ' · ' + now)
    : ('无进行中的爬塔 · 历史最高 ' + hs + ' 分 · ' + now);
  if(summary.length > 400) summary = summary.slice(0, 400);   // 中文字符 ≤3 字节，留足 500 字节余量
  const extra = JSON.stringify({
    act: run ? run.act : 0, row: run ? (run.mapRow || 0) : 0, score: run ? (run.score || 0) : 0,
    hp: run ? run.hp : 0, maxHp: run ? run.maxHp : 0, gold: run ? run.gold : 0,
    hero: run ? run.hero : null, endless: !!(run && run.endless), high: hs, ts: Math.floor(Date.now() / 1000)
  });
  return { name: CLOUD_NAME, summary: summary, extra: extra.slice(0, 990), playtime: cloudPlaytime() };
}

/* ===================== 文件系统适配 ===================== */
/* 为什么不能直接写 fs.writeFileSync：真机（TapTap H5，2026-10-01）上传直接报
   「_0x13bd35[...] is not a function」，报错变量就是 tap.getFileSystemManager() 的返回值
   ⇒ 宿主给的 FileSystemManager **没有 writeFileSync**。小游戏宿主的这套接口与微信小程序
   **不完全同构**（官方 H5 文档页要登录，原文核不到），所以这里不猜具体名字：
   运行时按候选清单探测同步 / 异步两套写法，都挑不到就把**真实可用的方法名清单**塞进错误信息，
   下次真机报错即可自报家门，不用再靠猜。 */
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

/* ===================== 上传 ===================== */
function cloudUpload(force){
  const env = cloudEnv();
  if(!env.ok) return Promise.reject(new Error(env.why));
  const now = Date.now();
  if(!force && now - (cloudMeta().lastUploadTs || 0) < CLOUD_MIN_GAP)
    return Promise.reject(new Error('距上次上传不足 1 分钟（官方频控），请稍后再试'));
  return cloudGuard(() => {
    const path = tap.env.USER_DATA_PATH + '/' + CLOUD_FILE;
    /* 先把存档内容落成本地文件 —— createArchive / updateArchive 传的是**文件路径**，不是内容。
       ⚠️ 写文件放在**发请求之前**：写不了就立刻失败，别白烧掉「一分钟一次」的配额。 */
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

/* ===================== 下载 / 恢复 ===================== */
function cloudApplyToStore(data){
  if(!data || data.app !== 'zhiguaitower') throw new Error('云端存档不是本游戏的数据');
  if(Array.isArray(data.runs)){
    /* v1.0.1 多存档：按槽位整体覆盖（空槽要删掉本地残留，否则云端的「空」恢复不回来） */
    RUN_SLOTS.forEach(function(k, i){
      const d = data.runs[i];
      if(d) Store.setJSON(k, d); else Store.del(k);
    });
  } else if(data.run){
    /* 旧版云档（v1：只有单档 run）⇒ 落进 1 号槽 */
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

/* ===================== 脏标记 + 节流队列 ===================== */
/* 调用点只有两个：saveRun()（本局存档）与 persistSave()（局外元数据）。
   它们只是「记一笔」，真正的上传由这里按 60s 节流放行。 */
let _cloudDirty = false, _cloudTimer = null, _cloudUploading = false, _cloudFails = 0;
function cloudMarkDirty(){
  if(!cloudEnv().ok) return;                     // 非 TapTap 环境：一个字节都不写
  cloudHookHide();                               // 确认 tap 在之后再挂退出兜底（模块加载时可能还没注入）
  cloudMetaSave({ lastLocalTs: Date.now() });
  _cloudDirty = true;
  _cloudFails = 0;                               // 玩家又存档了 ⇒ 重新给三次机会
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
      /* 连败 3 次就不再自动重试（比如名不合法这类永久错），免得每分钟白打一次请求；
         玩家下一次存档会重置计数，也可以去设置面板手动「立即上传」。 */
      if(_cloudFails >= 3){ _cloudDirty = false; return; }
      _cloudDirty = true;
      if(typeof setTimeout === 'function') setTimeout(() => cloudPump(), CLOUD_MIN_GAP);
    }
  );
}
/* ===================== 退出 / 切后台兜底 ===================== */
/* 为什么非有不可：脏标记只在**下一次存档**时才重排（cloudPump 的节流窗口最长 60s），
   玩家存档后 60s 内退出游戏，那一笔进度就永远没机会上传 —— 换设备拉回来的是旧档。
   所以隐藏时若有未同步的改动，**绕过 60s 节流**直发一次。
   仍受官方频控兜底：真撞上频控会返回 400001，此时把 dirty 丢回 true，
   等下一次存档或下一轮节流再补，不会把这一笔吞掉。 */
function cloudFlush(){
  if(!cloudEnv().ok || !_cloudDirty || _cloudUploading) return;
  _cloudDirty = false; _cloudUploading = true;
  cloudUpload(true).then(
    () => { _cloudUploading = false; },
    e => {
      _cloudUploading = false;
      _cloudDirty = true;                        // 没传成 ⇒ 还原脏标记，别丢这一笔
      cloudMetaSave({ lastError: String((e && e.message) || e), lastErrorTs: Date.now() });
    }
  );
}
/* 两个钩子分开记 —— 模块加载时 tap 可能还没注入，那时只挂得上 visibilitychange；
   等第一次真的同步（cloudMarkDirty）再补上 tap.onHide。 */
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

/* ===================== 开屏比对（云端更新 ⇒ 提示拉回） ===================== */
function cloudBootCheck(){
  if(!cloudEnv().ok) return;
  if(typeof setTimeout !== 'function') return;
  setTimeout(() => {
    cloudList().then(list => {
      const mine = cloudFind(list);
      if(!mine) return;
      const localTs = Math.floor((cloudMeta().lastLocalTs || 0) / 1000);
      /* 判据：云端 modifiedTime 比「本地最近一次落档」还新 60 秒以上 ⇒ 疑似换了设备/清了缓存 */
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
  /* ⚠️ 「稍后再说」必须走 showStartScreen 而不是 hideOverlay：showOverlay 不带第三实参时
     会把 menu-scene 摘掉（换成通用墨底 panel），直接藏掉会留下一块空屏。 */
}

/* ===================== 界面 ===================== */
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
      /* 手动上传的失败也要落进簿记 —— 面板底部那行红字读的就是它，
         否则修好之后仍然挂着上一次的旧报错（用户看到的"上传失败"就是这么残留的）。 */
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
/* 恢复之后：内存里的 G 已经过期，必须先丢开、重读局外档，再回主菜单（「续」按钮会自己亮起来） */
function cloudAcceptRestoreAfterRestore(){
  try{ loadSave(); }catch(e){}
  try{ G = null; }catch(e){}
  try{ SCENE = 'menu'; }catch(e){}
  showOverlay(`<h2>已恢复云端存档</h2>
    <p>本机进度已替换为云端版本。</p>
    <button class="btn" onclick="showStartScreen()">回到主菜单</button>`);
}

/* 模块加载即挂一次：这一步能挂上的只有 visibilitychange（tap 往往还没注入），
   补上 tap.onHide 的那次在 cloudMarkDirty 里。非 TapTap 环境两个钩子都是死的
   （cloudFlush 开头就判环境），不会白跑请求。 */
try{ cloudHookHide(); }catch(e){}