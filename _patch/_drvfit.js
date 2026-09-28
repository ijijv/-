/* v0.69.0 专用驱动：量「卡面描述到底能吃多少字」。
   用途：§D 文案重写把 384 条全压到 ≤30 字之前，先实测 132x200 默认档下
   .cdesc 的**每行字数**与**行数**上限 —— 光算不量会在边界上翻车
   （0.27px 余量，一个全角逗号就能把 30 字顶到第 4 行）。

   输出三块：
     A 逐字数扫描：渲染「N 个汉字」的合成文案，报 scrollHeight/clientHeight
     B 真实牌库扫描：现有全部卡（4 英雄 × 未升级/升级）的溢出张数与所需行数
     C 边界探针：30 字里塞最宽的标点组合（，。、；：）看会不会多折一行

   用法：python _patch/shot.py --direct --drv _patch/_drvfit.js --widths 1280 --h 720 --dump
*/
(function () {
  var errs = [];
  window.onerror = function (m, u, l) { errs.push(m + ' @' + l); };
  var out = [];
  function log(s) { out.push(s); }

  function probeHost() {
    var h = document.createElement('div');
    h.style.cssText = 'position:fixed;left:-99999px;top:0;width:132px';
    document.body.appendChild(h);
    return h;
  }
  var HOST = probeHost();

  /* 造一张真卡（走 handCardHTML 才能拿到完整的 .has-frame 版面链），只替换描述文字。
     直接手写 HTML 会漏掉 CSS 继承链，量出来的行高不是玩家的行高。 */
  /* 造一张真卡。text 给定时是「合成文案」（A/C 两段用）；传 realCard 时走真卡对象，
     **连 ts 一起带上** —— 这是关键：牌面渲染走 cardText()，只有带上 ts 才量的是
     玩家真正看到的那串（v0.69.0 之前这里量的是 t()，所以改了短版后数字纹丝不动）。 */
  function cardWith(text) {
    var fake = { id: '__probe', name: '探针牌', type: 'attack', rarity: 'white', up: false,
                 cost: 1, t: function () { return text; } };
    return handCardHTML(fake, false, 0, 1);
  }
  function faceOf(realCard, up) {
    var probe = { id: '__probe', name: '探针牌', type: 'attack', rarity: 'white',
                  cost: 1, up: !!up, t: realCard.t, ts: realCard.ts };
    return handCardHTML(probe, false, 0, 1);
  }
  function faceText(realCard, up) { return cardText(realCard, up); }
  function measure(html) {
    HOST.innerHTML = html;
    var el = HOST.querySelector('.cdesc');
    if (!el) return null;
    return { need: el.scrollHeight, have: el.clientHeight,
             line: parseFloat(getComputedStyle(el).lineHeight) };
  }

  function go() {
    try {
      confirmNewGame();
      pickHero('tianshi');
      skipOpening();
    } catch (e) { log('初始化失败 ' + e.message); }

    /* 先把 CSS 变量/字体状态稳定下来：字体没加载完量出来的行高偏小 */
    log('A 逐字数扫描（纯汉字，无标点）');
    var lineH = null;
    for (var n = 8; n <= 48; n += 2) {
      var m = measure(cardWith(new Array(n + 1).join('字')));
      if (!m) { log('   ' + n + ' 字 量不到 .cdesc'); continue; }
      if (lineH === null) lineH = m.line;
      var lines = Math.round(m.need / m.line);
      log('   ' + (n < 10 ? ' ' : '') + n + ' 字 → 需要 ' + lines + ' 行'
        + (m.need > m.have + 1 ? '  ✗溢出(' + m.need + '>' + m.have + ')' : '  ✓'));
    }
    log('   行高=' + lineH + 'px');

    /* 每行到底几个字：拿「不溢出」的最大 N 反推。
       ⚠️ 不能用 need/line 的商判行数：.cdesc 是 flex:1，盒子恒定 34px 高，
          **scrollHeight 永远 ≥ clientHeight** ⇒ 8 个字和 30 个字算出来都是「3 行」，
          按商判会在 k=1 处就 break（v0.69.0 实测打出「单行最多 0 个汉字」）。
          唯一可靠的判据是 need > have（真的多出了一行才会溢出）。 */
    var perLine = 0;
    for (var k = 1; k <= 20; k++) {
      var mm = measure(cardWith(new Array(k + 1).join('字')));
      if (mm.need > mm.have + 1) break;
      perLine = k;
    }
    log('   单行最多 ' + perLine + ' 个汉字（纯汉字、无标点）');

    /* B 真实牌库：4 英雄 × {未升级,升级} 全量扫 */
    log('B 真实牌库全量扫描（48 卡 × 4 英雄 × 2 态 = 384 条）');
    var heroes = ['ganshiren', 'wuseng', 'yincha', 'tianshi'];
    var rows = [];
    var saved = G.hero;
    heroes.forEach(function (h) {
      G.hero = h;
      CARDS.forEach(function (c) {
        [false, true].forEach(function (up) {
          var t = '', face = '';
          try { t = String(c.t(up) || ''); face = String(cardText(c, up) || ''); }
          catch (e) { t = ''; face = ''; }
          var m2 = measure(faceOf(c, up));
          if (!m2) return;
          rows.push({ hero: h, name: c.name, up: up, len: face.length, t: face, full: t,
                      fullCols: 0, need: m2.need, have: m2.have,
                      lines: Math.round(m2.need / m2.line) });
        });
      });
    });
    G.hero = saved;

    var over = rows.filter(function (r) { return r.need > r.have + 1; });
    function cols2(t) {
      var w = 0;
      for (var i = 0; i < t.length; i++) {
        var c = t.charCodeAt(i);
        w += (c >= 0x20 && c <= 0x7e) ? 0.5 : 1;
      }
      return w;
    }
    log('   —— 溢出明细（牌面实际渲染的那串）——');
    over.forEach(function (r) {
      log('     ' + r.hero + ' ' + r.name + (r.up ? '↑' : '') + '  ' + cols2(r.t).toFixed(1)
        + ' 列 / ' + r.lines + ' 行' + (r.full !== r.t ? ' [短版]' : ' [全文，无 ts]'));
      log('        ' + r.t);
    });
    log('   总 ' + rows.length + ' 条，溢出 ' + over.length + ' 条');
    var byLen = {};
    over.forEach(function (r) { byLen[r.len] = (byLen[r.len] || 0) + 1; });
    var keys = Object.keys(byLen).map(Number).sort(function (a, b) { return a - b; });
    log('   溢出条目的字长分布：' + keys.map(function (k) { return k + '字×' + byLen[k]; }).join(' '));
    var nover = rows.filter(function (r) { return r.need <= r.have + 1; });
    var maxOk = 0, maxOkTxt = '';
    nover.forEach(function (r) { if (r.len > maxOk) { maxOk = r.len; maxOkTxt = r.name; } });
    log('   不溢出的最长：' + maxOk + ' 字（' + maxOkTxt + '）');
    var hasTs = 0;
    rows.forEach(function (r) { if (r.full !== r.t) hasTs++; });
    log('   其中牌面走了短版 ts 的：' + hasTs + ' 条（全=384 说明双层没生效）');
    log('   溢出最多的 8 条：' + over.sort(function (a, b) { return b.len - a.len; })
      .slice(0, 8).map(function (r) { return r.name + (r.up ? '↑' : '') + '(' + r.len + '字/' + r.lines + '行)'; }).join(' '));

    /* C 边界探针：30 字 + 最宽标点组合 */
    log('C 边界探针（30 字预算下最坏的标点组合）');
    var probes = [
      ['30 纯汉字', new Array(31).join('字')],
      ['30 字 每 5 字一逗号', '甲乙丙丁戊，己庚辛壬癸，子丑寅卯辰，巳午未申酉，戌亥天地玄，黄宇宙洪荒'],
      ['30 字 每 3 字一逗号', '甲甲乙，乙乙丙，丙丙丁，丁丁戊，戊戊己，己己庚，庚庚辛，辛辛壬，壬壬癸，癸癸子'],
      ['30 字 全角括号【】×2', '造成 4 点伤害【尸气】并获得 2 点【格挡】，目标带【诅咒】时消耗 1 层'],
      ['30 字 混半角数字', '造成 12 点伤害，获得 3 点格挡，抽 2 张牌，失去 1 点生命，本回合 +5']
    ];
    probes.forEach(function (p) {
      var txt = p[1];
      var m3 = measure(cardWith(txt));
      log('   ' + p[0] + '（' + txt.length + ' 字）→ ' + Math.round(m3.need / m3.line) + ' 行'
        + (m3.need > m3.have + 1 ? '  ✗溢出 ' + m3.need + '>' + m3.have : '  ✓'));
    });

    /* E 标定「列宽模型」：冒烟里没有浏览器、量不了字宽，闸门只能用一个静态模型。
       候选：ASCII(0x20-0x7E) 计 0.5 列，其余（汉字/全角标点/【】）计 1 列。
       这里用实拍结果反查这个模型对不对 —— 若「不溢出的最大列数」远大于
       「溢出的最小列数」，说明模型有系统性偏差，闸门就会放行会截断的文案。 */
    function cols(t) {
      var w = 0;
      for (var i = 0; i < t.length; i++) {
        var c = t.charCodeAt(i);
        w += (c >= 0x20 && c <= 0x7e) ? 0.5 : 1;
      }
      return w;
    }
    rows.forEach(function (r) { r.cols = cols(r.t); });
    var okRows = rows.filter(function (r) { return r.need <= r.have + 1; });
    var badRows = rows.filter(function (r) { return r.need > r.have + 1; });
    var maxOkCols = 0, minBadCols = 1e9;
    okRows.forEach(function (r) { if (r.cols > maxOkCols) maxOkCols = r.cols; });
    badRows.forEach(function (r) { if (r.cols < minBadCols) minBadCols = r.cols; });
    log('E 列宽模型标定（ASCII=0.5 列，其余=1 列）');
    log('   不溢出的最大列数 = ' + maxOkCols.toFixed(1) + '（' + okRows.filter(function (r) { return r.cols === maxOkCols; })[0].name + '）');
    /* ⚠️ 溢出数为 0 是**期望的终态**（§D 全绿），此时 badRows 是空数组，
       下面两行的 [0] 会 undefined.name 直接抛 —— 驱动一抛，shot.py 只会打
       「没找到 __dbg」，看着像驱动没跑。所以两处都要留空态分支。 */
    if (!badRows.length) {
      log('   溢出的最小列数   = 无（牌库 384 条全不溢出，正是 §D 的目标）');
      log('   ⇒ 实测安全线 ≥ ' + maxOkCols.toFixed(1) + ' 列；冒烟闸门取 30 列（纯汉字实测安全值）');
    } else {
      log('   溢出的最小列数   = ' + minBadCols.toFixed(1) + '（' + badRows.filter(function (r) { return r.cols === minBadCols; })[0].name + '）');
      log('   ⇒ 安全阈值应取 ' + Math.floor(maxOkCols) + ' 列；两值之间的条目是模型盲区');
      log('   模型判「≤' + Math.floor(maxOkCols) + ' 列安全」但实际溢出的条目：'
        + badRows.filter(function (r) { return r.cols <= maxOkCols; }).length + ' 条');
    }

    log('D errs=' + (errs.length ? errs.join(' | ') : 'none'));

    }

  /* ⚠️ 出图与「出数」是两件事：go() 里任何一句抛异常，角标就永远不出现，
     而 shot.py 只会打一句「没找到 __dbg」—— 完全看不出是驱动炸了还是没跑起来。
     v0.69.0 真踩过（box 原本写在 go() 末尾，一次早期异常就让整套量测变成哑巴）。
     所以 emit() 独立出来，并把 go() 包在 try/catch 里：**抛异常也照样把错误印在第一行**。 */
  function emit() {
    var box = document.createElement('div');
    box.id = '__dbg';
    box.style.cssText = 'position:fixed;left:0;top:0;right:0;bottom:0;z-index:99999;background:#000e;'
      + 'color:#0f0;font:11px/1.35 monospace;padding:6px;white-space:pre-wrap;overflow:auto';
    box.textContent = out.join('\n');
    document.body.appendChild(box);
    document.title = 'FIT';
  }
  function run() {
    try { go(); }
    catch (e) { out.unshift('GO 抛出：' + (e && e.message) + '\n' + ((e && e.stack) || '')); }
    emit();
  }

  if (document.readyState === 'complete') run();
  else window.addEventListener('load', run);
})();