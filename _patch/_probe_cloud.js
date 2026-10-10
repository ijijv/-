// 志怪塔 · 云存档适配层 VM 断言
// 跑法: node _patch/_probe_cloud.js
//
// 为什么要它：云存档的真机链路（TapTap 小游戏容器）本地没有，但**适配层自己的逻辑**
//   完全可以离线验：往沙箱里注入一个假的 tap（CloudSaveManager + FileSystemManager + env），
//   然后跑「自动上传 → 一分钟频控 → 下载恢复 → 删除」四条路径。
//   ⚠️ 它验的是 js/55_cloud.js，不是 TapTap 的 SDK —— 真机仍要做一次冒烟。
const fs = require('fs');
const path = require('path');
const { load } = require('./vm_host');

const ROOT = path.join(__dirname, '..');

/* 追加到全部游戏脚本之后：此时 Store / RUN_KEY / SAVE_KEY / cloudXxx 都在同一作用域里 */
const RUNNER = `
(function(){
  var R = { ok:false, steps:[], fails:[] };
  function chk(c, m){ R.steps.push((c?'ok   ':'FAIL ')+m); if(!c) R.fails.push(m); }

  var FILES = new Map(), SEQ = 0, LIST = [], UD = '/userdata';
  var fakeFs = {
    writeFileSync: function(p, d){ FILES.set(p, String(d)); },
    readFileSync: function(p){
      if(!FILES.has(p)){ var e = new Error('no such file'); e.errno = 1300002; throw e; }
      return FILES.get(p);
    }
  };
  function nowS(){ return Math.floor(Date.now()/1000); }
  var mgr = {
    createArchive: function(o){
      SEQ++;
      LIST.push({ uuid:'uuid-'+SEQ, fileId:'f'+SEQ, name:o.archiveMetaData.name,
                  summary:o.archiveMetaData.summary, extra:o.archiveMetaData.extra,
                  playtime:o.archiveMetaData.playtime, saveSize:String(FILES.get(o.archiveFilePath)||'').length,
                  coverSize:0, createdTime:nowS(), modifiedTime:nowS() });
      o.success({ uuid:'uuid-'+SEQ, fileId:'f'+SEQ });
    },
    updateArchive: function(o){
      var a = null; for(var i=0;i<LIST.length;i++) if(LIST[i].uuid===o.archiveUUID) a = LIST[i];
      if(!a) return o.fail({ errno:400002, errMsg:'no such archive' });
      SEQ++; a.fileId = 'f'+SEQ; a.summary = o.archiveMetaData.summary;
      a.extra = o.archiveMetaData.extra; a.playtime = o.archiveMetaData.playtime;
      a.saveSize = String(FILES.get(o.archiveFilePath)||'').length; a.modifiedTime = nowS();
      o.success({ uuid:a.uuid, fileId:a.fileId });
    },
    getArchiveList: function(o){ o.success({ saves: LIST.slice() }); },
    getArchiveData: function(o){
      var a = null; for(var i=0;i<LIST.length;i++) if(LIST[i].uuid===o.archiveUUID) a = LIST[i];
      if(!a) return o.fail({ errno:400002, errMsg:'no such archive' });
      FILES.set(o.targetFilePath, FILES.get(UD + '/zhiguaitower_cloud.json'));
      o.success({ filePath: o.targetFilePath });
    },
    deleteArchive: function(o){
      var i = -1; for(var k=0;k<LIST.length;k++) if(LIST[k].uuid===o.archiveUUID) i = k;
      if(i<0) return o.fail({ errno:400002, errMsg:'no such archive' });
      LIST.splice(i,1); o.success({ uuid:o.archiveUUID });
    }
  };
  var curFs = fakeFs;
  /* 真机形态（2026-10-01 实测）：宿主**没有** writeFileSync，只有异步的 writeFile/readFile。
     下面 ④b 专门换用这套接口再跑一遍「上传 + 恢复」——本地没有 TapTap 容器，
     但接口形状可以照真机报错复原，回归这条路径就能防住同名事故再犯。 */
  var asyncFs = {
    writeFile: function(o){ FILES.set(o.filePath, String(o.data)); if(o.success) o.success({}); },
    readFile: function(o){
      if(!FILES.has(o.filePath)){ if(o.fail) o.fail({ errno:1300002, errMsg:'no such file' }); return; }
      if(o.success) o.success({ data: FILES.get(o.filePath) });
    }
  };
  var noFs = { mkdirSync: function(){}, statSync: function(){} };   // 一个 IO 方法都没有的宿主
  var tapHide = null;
  globalThis.tap = {
    env: { USER_DATA_PATH: UD },
    getFileSystemManager: function(){ return curFs; },
    getCloudSaveManager: function(){ return mgr; },
    onHide: function(cb){ tapHide = cb; }
  };

  function wait(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }

  (async function(){
    try{
      chk(cloudEnv().ok, '注入假 tap 后环境探测通过');

      // 造一份本地进度
      Store.setJSON(RUN_KEY, { v:3, scene:'map', act:2, mapRow:3, hp:40, maxHp:80, gold:120, score:1500, hero:'tianshi' });
      Store.setJSON(SAVE_KEY, { unlocked:['a','b'] });

      // ① 自动上传：存档动作只 markDirty，由节流器放行（首次没有 lastUploadTs ⇒ 立刻传）
      cloudMarkDirty();
      await wait(80);
      var list = await cloudList();
      chk(list.length === 1, 'markDirty 后自动创建了一份云档（拿到 ' + list.length + ' 份）');
      if(list.length !== 1){ R.ok = false; sandboxReport(R); return; }
      chk(list[0].name === 'zhiguaitower', '存档名是 ASCII 的 zhiguaitower（官方不允许汉字）');
      chk(list[0].summary.indexOf('第2幕') === 0, 'summary 带上了本地进度:「' + list[0].summary + '」');
      chk(list[0].extra.indexOf('"act":2') >= 0, 'extra 里带了结构化进度');
      var uuid = list[0].uuid, fid = list[0].fileId;
      chk(typeof tapHide === 'function', '确认 tap 在之后补挂上了 tap.onHide（退出/切后台兜底）');

      // ② 一分钟频控：第二次上传必须被挡（官方 errno 400001）
      var blocked = '';
      try{ await cloudUpload(false); }catch(e){ blocked = e.message; }
      chk(/频控|频率|分钟/.test(blocked), '一分钟内的第二次上传被挡下:「' + blocked + '」');

      // ③ 下载恢复：把本地改成第 9 幕，再从云端拉回来
      Store.setJSON(RUN_KEY, { v:3, scene:'map', act:9, mapRow:9, hp:1, maxHp:80, gold:0, score:1 });
      await cloudRestore(uuid, fid);
      var back = Store.getJSON(RUN_KEY);
      chk(back && back.act === 2 && back.mapRow === 3, '恢复后本局进度回到云端那份（act=2 / row=3）');
      var sv = Store.getJSON(SAVE_KEY);
      chk(sv && sv.unlocked && sv.unlocked.length === 2 && sv.unlocked[1] === 'b', '局外元数据（unlocked）一并恢复');
      chk(back && back.score === 1500, '得分字段也在');

      // ③b 退出兜底：改进度 → markDirty（节流窗口内不自动传）→ 模拟切后台 → 必须补上
      Store.setJSON(RUN_KEY, { v:3, scene:'map', act:7, mapRow:1, hp:9, maxHp:80, gold:5, score:777 });
      cloudMarkDirty();
      await wait(80);
      list = await cloudList();
      chk(list[0].summary.indexOf('第7幕') < 0, '节流窗口内的改动不会立刻上传（云端仍是旧 summary）');
      cloudFlush();
      await wait(80);
      list = await cloudList();
      chk(list.length === 1, '兜底上传走的是 update，没有另建一份（拿到 ' + list.length + ' 份）');
      chk(list[0].summary.indexOf('第7幕') === 0, '切后台兜底把这一笔传上去了:「' + list[0].summary + '」');

      // ④ 删除
      await cloudRemove(uuid);
      list = await cloudList();
      chk(list.length === 0, '删除云档后列表为空');

      // ④b 真机形态：宿主只给**异步** writeFile / readFile（没有 *Sync 版）
      curFs = asyncFs;
      Store.setJSON(RUN_KEY, { v:3, scene:'map', act:5, mapRow:2, hp:30, maxHp:80, gold:9, score:4321, hero:'tianshi' });
      var res2 = await cloudUpload(true);
      chk(!!(res2 && res2.uuid), '异步-only 宿主：上传走 writeFile 成功（uuid=' + (res2 && res2.uuid) + '）');
      Store.setJSON(RUN_KEY, { v:3, scene:'map', act:1, mapRow:0, hp:1, maxHp:80, gold:0, score:0 });
      var d2 = await cloudRestore(res2.uuid, res2.fileId);
      chk(!!(d2 && d2.run && d2.run.act === 5), '异步-only 宿主：恢复走 readFile 成功（act=' + (d2 && d2.run && d2.run.act) + '）');

      // ④c 连一个 IO 方法都没有 ⇒ 报错必须**自报家门**（列出真实可用方法名），
      //     不能只丢一句「is not a function」让下一轮无从下手
      curFs = noFs;
      var msg = '';
      try{ await cloudUpload(true); }catch(e){ msg = e.message; }
      chk(/没有可用的写文件接口/.test(msg) && /mkdirSync/.test(msg),
          '无可用 IO 的宿主：报错自报了可用方法清单:「' + msg + '」');
      curFs = fakeFs;

      // ⑤ 非 TapTap 环境必须完全静默（把 tap 摘掉，再走一遍 markDirty）
      var before = Store.get('zhiguaitower_cloudmeta_v1');
      delete globalThis.tap;
      chk(!cloudEnv().ok, '摘掉 tap 后环境探测判定为不可用');
      cloudMarkDirty();
      chk(Store.get('zhiguaitower_cloudmeta_v1') === before, '非 TapTap 环境下 markDirty 一个字节都不写');
    }catch(e){
      R.fails.push('异常: ' + ((e && e.stack) || e));
    }
    R.ok = R.fails.length === 0;
    sandboxReport(R);
  })();

  function sandboxReport(R){ globalThis.__cloud = R; }
})();
`;

const { sandbox } = load(path.join(ROOT, '原型.html'), RUNNER);

let waited = 0;
const timer = setInterval(() => {
  waited += 200;
  if (sandbox.__cloud || waited > 10000) {
    clearInterval(timer);
    const r = sandbox.__cloud;
    if (!r) {
      console.log('!! 云存档探针超时（沙箱里没有回执）');
      if (sandbox.__boom) console.log(sandbox.__boom);
      process.exit(2);
    }
    r.steps.forEach(s => console.log('  ' + s));
    if (sandbox.__boom) console.log('!! bootError:\n' + sandbox.__boom);
    console.log(r.ok ? '云存档探针：全部通过' : ('云存档探针：失败 ' + r.fails.length + ' 条'));
    process.exit(r.ok ? 0 : 1);
  }
}, 200);