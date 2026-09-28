/* v0.65.0 一次性探针：只回答一个问题 ——
   `#overlay.ov-enter.map-scene #overlayWrap{animation:none}` 这条守卫**真的算得出 none 吗**？
   （选错、写错、被后写的规则盖掉，都会让地图叠上一层 overlayIn。
     但它在地图路径上其实碰不到 —— 主菜单→选角色→地图全程 overlay 一直开着，ov-enter 根本不挂。
     所以这是一条**防御性**规则，必须单独验，不能靠"路径上没出现"来蒙。）
   用法：python _patch/shot.py --drv _patch/_drvguard.js --widths 430 --dump */
(function () {
  var errs = [];
  window.onerror = function (m, u, l) { errs.push(m + ' @' + l); };

  function an(el) { try { return getComputedStyle(el).animationName; } catch (e) { return 'ERR'; } }

  function go() {
    try {
      // 先造出 .menu-tier（否则 F 行取不到元素）
      if (typeof hideOverlay === 'function') hideOverlay();
      if (typeof showStartScreen === 'function') showStartScreen();

      var ov = document.getElementById('overlay');
      var wrap = document.getElementById('overlayWrap');
      var tier = document.querySelector('.menu-tier');
      var st = ['=== v0.65.0 守卫探针 ==='];
      st.push('A ov=' + (!!ov) + ' wrap=' + (!!wrap) + ' tier=' + (!!tier));

      // ① 参照系：普通面板（只 ov-enter）⇒ 必须拿到 overlayIn，否则整个推入动画是假的
      ov.classList.add('ov-enter');
      st.push('B 普通面板 wrap an=[' + an(wrap) + ']  期望 overlayIn');

      // ② 地图组合：ov-enter + map-scene ⇒ 必须被守卫掐成 none
      ov.classList.add('map-scene');
      st.push('C 地图组合 wrap an=[' + an(wrap) + ']  期望 none  ← 本探针的主题');

      // ③ 反向对照：只 map-scene（无 ov-enter）也应是 none（本就不会匹配动画）
      ov.classList.remove('ov-enter');
      st.push('D 仅map-scene wrap an=[' + an(wrap) + ']  期望 none');

      // ④ 菜单错峰：ov-enter + menu-scene ⇒ tier 该有 menuRise
      ov.classList.remove('map-scene'); ov.classList.add('menu-scene');
      st.push('E 无ov-enter菜单 tier an=[' + an(tier) + ']  期望 none（=刷新不重播闸）');
      ov.classList.add('ov-enter');
      st.push('F 有ov-enter菜单 tier an=[' + an(tier) + ']  期望 menuRise');

      // ⑤ 场景类不该泄漏：摘干净后普通面板不能还带着场景底
      ov.classList.remove('menu-scene', 'map-scene');
      st.push('G 摘净后 ov class=[' + ov.className + ']  期望只有 ov-enter');

      st.push('H errs=' + (errs.length ? errs.join(' | ') : '0'));

      var box = document.createElement('div');
      box.id = '__dbg';
      box.style.cssText = 'position:fixed;left:0;top:0;z-index:9999;background:#000c;color:#0f0;'
        + 'font:11px/1.4 monospace;padding:4px 6px;white-space:pre-wrap';
      box.textContent = st.join('\n');
      document.body.appendChild(box);
    } catch (e) {
      var b = document.createElement('div');
      b.id = '__dbg';
      b.textContent = 'THROW ' + e.message;
      document.body.appendChild(b);
    }
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(go, 0);
  else window.addEventListener('DOMContentLoaded', function () { setTimeout(go, 0); });
})();