/* _drvsfx.js —— 一次性探针：产物在 **file://**（双击打开）下到底能不能用它的内联音效。

为什么要单独跑这一只：`js/10_audio.js` 里有一道 `SFX_FETCH_OK = … && SFX_PROTO!=='file:'`
的闸（注释写「file:// 下 fetch 会被浏览器拦，别白试」）。看起来像是「双击产物就没音效」。
但 `sampleURL()` 是**先查 ASSET_MAP 再回落到相对路径**的，而 `loadSfxSamples()` 的早退条件
是 `!ASSET_MAP && !SFX_FETCH_OK` —— 产物有 ASSET_MAP ⇒ 早退不成立 ⇒ 走的是 `fetch(data:…)`。
所以真问题只剩一个：**file:// 下 fetch 一个 data: URI 会不会被拦**。这一条只能实测。

读回方式与 `_drvdist.js` 同源（外层页 + iframe + eval），但本文件要**等异步**，
所以自己往 #__out 里补写，最后一行仍是 `bad=N`（供 probe_sfx.py 取退出码）。
本文件是**一次性取证用**的，不是常驻闸。
*/
(function () {
  var box = document.getElementById('__out');
  var L = [], bad = 0, done = false;
  function t(c, label, detail) { L.push((c ? '  ok   ' : '  FAIL ') + label + (detail ? '   ' + detail : '')); if (!c) bad++; }
  function flush(tag) { done = true; box.textContent = L.join('\n') + '\n' + (tag || '') + '\nbad=' + bad; document.title = 'SFX'; }
  window.onerror = function (m, u, l) { L.push('外层异常 ' + m + ' @' + l); flush('(异常)'); };
  /* 兜底：真跑不完也要留下已经取到的结论（虚时钟会把这个 setTimeout 快进掉，
     所以用 done 挡住，正常路径先 flush 就赢了） */
  setTimeout(function () { if (!done) flush('(超时兜底 —— 上面是超时前取到的)'); }, 200000);

  var f = document.createElement('iframe');
  f.width = 1280; f.height = 720;
  f.src = '../dist/%E5%BF%97%E6%80%AA%E5%A1%94.html';
  f.onload = function () {
    var W = f.contentWindow;
    function E(s) { return W.eval(s); }

    var amap = null;
    try { amap = E('ASSET_MAP'); } catch (e) { L.push('!! eval ASSET_MAP 抛出 ' + e.message); }
    t(!!amap, '产物里 ASSET_MAP 已注入（不是 null）', amap ? Object.keys(amap).length + ' 个键' : String(amap));

    var sfxk = [], mus = [];
    if (amap) {
      var keys = Object.keys(amap);
      sfxk = keys.filter(function (k) { return k.indexOf('sfx/') === 0; });
      mus = keys.filter(function (k) { return k.indexOf('music/') === 0; });
      t(sfxk.length > 0, 'ASSET_MAP 里有 sfx/ 采样键', sfxk.length + ' 个');
      var badp = sfxk.filter(function (k) { return String(amap[k]).indexOf('data:audio/') !== 0; });
      t(badp.length === 0, 'sfx 键全部是 data:audio/ 内联 URI',
        badp.length ? ('坏的：' + badp.slice(0, 3).join(',')) : '');
      t(mus.length > 0, 'ASSET_MAP 里有 music/ 键（BGM 也内联了）', mus.length + ' 个');
      if (sfxk.length) {
        try {
          var u = E('sampleURL')(sfxk[0]);
          t(u === amap[sfxk[0]], 'sampleURL 直接返回内联 data URI（不看 file:// 那道闸）',
            String(u).slice(0, 48) + '…');
        } catch (e) { t(false, 'sampleURL 取不到', String(e && e.message)); }
      }
    }
    try {
      t(E('sfxSamples')().fetchOk === false, 'file:// 下 SFX_FETCH_OK 确实是 false（那道闸还在）',
        JSON.stringify(E('sfxSamples')()));
    } catch (e) { t(false, 'sfxSamples 取不到', String(e && e.message)); }

    if (!sfxk.length) { flush('(没有 sfx 键，无法实测)'); return; }

    /* ⚠️ 关键实测：真去 fetch 一个 data: URI —— 这就是那道闸要防的那件事 */
    var url = amap[sfxk[0]];
    fetch(url)
      .then(function (r) { return r.ok === false ? null : r.arrayBuffer(); })
      .then(function (ab) {
        t(!!ab && ab.byteLength > 0, 'file:// 下 fetch(data:audio) 真的取到字节（浏览器没拦）',
          'bytes=' + (ab ? ab.byteLength : 0) + '  ← ' + sfxk[0]);
        var ac = null;
        try { ac = E('ensureAudio')(); } catch (e) { }
        if (!ac || typeof ac.decodeAudioData !== 'function') {
          flush('(无 AudioContext，跳过解码)'); return;
        }
        return new Promise(function (res) {
          ac.decodeAudioData(ab, function (b) { res(b); }, function () { res(null); });
        }).then(function (buf) {
          t(!!buf && buf.duration > 0, '无头里真的解码出了 AudioBuffer（采样路径可用）',
            buf ? ('duration=' + buf.duration.toFixed(3) + 's  rate=' + buf.sampleRate) : 'null');
          /* 顺带把整条生产路径跑一次：loadSfxSamples 是挂在首次 pointerdown 的 unlockAudio 上的 */
          try {
            E("sfxMode='sample'");
            E('loadSfxSamples()');
            var tries = 0;
            var iv = setInterval(function () {
              var st = E('sfxSamples')();
              tries++;
              if (st.loaded || tries > 60) {
                clearInterval(iv);
                t(st.keys > 0, 'loadSfxSamples() 在 file:// 产物里真的装进了采样', JSON.stringify(st));
                flush('(实测完成)');
              }
            }, 250);
            return;
          } catch (e) { t(false, 'loadSfxSamples 调用抛出', String(e && e.message)); }
          flush('(实测完成)');
        });
      })
      .catch(function (e) { t(false, 'file:// 下 fetch(data:audio) 失败', String((e && e.message) || e)); flush('(fetch 失败)'); });
  };
  document.body.appendChild(f);
})();