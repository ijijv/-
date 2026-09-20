# -*- coding: utf-8 -*-
"""
v0.61.25 步骤 4 —— 冒烟断言 + 点击委托抽成可测函数

① js/20_data.js：把全局点击委托的正文抽成具名函数 onDocClick(e)，
   这样冒烟能直接喂一个假事件验证 ui_click 真的响（匿名 handler 测不到）。
② _patch/smoke_runner.js：追加 v0.61.25 的断言块（分发表完整性 / 采样通路 /
   bug A·B 回归 / 结算分级 / 26 个键的接线在位）。

锚点唯一性各校验 count==1。
"""
import io
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..')
DAT = os.path.join(ROOT, 'js', '20_data.js')
RUNNER = os.path.join(HERE, 'smoke_runner.js')

A_DAT_OLD = (
    "document.addEventListener('click', function(e){\n"
    "  /* v0.61.25：全局按钮点击音 —— 原来全项目零按钮音。只对可点元素出声，\n"
    "     免得拖卡、点空白也响；40ms 节流防抖。 */\n"
    "  try{\n"
    "    const bt=e.target && e.target.closest ? e.target.closest('button,.btn,[onclick],.map-node,[role=\"button\"]') : null;\n"
    "    if(bt) sfxOnce('ui_click', 40);\n"
    "  }catch(err){}\n"
    "  if(!(e.target && e.target.closest && e.target.closest('[data-tip]'))) hideTip();\n"
    "});\n"
)
A_DAT_NEW = (
    "/* v0.61.25：全局按钮点击音 —— 原来全项目零按钮音。只对可点元素出声，\n"
    "   免得拖卡、点空白也响；40ms 节流防抖。抽成具名函数是为了冒烟能直接喂假事件验它。 */\n"
    "function onDocClick(e){\n"
    "  try{\n"
    "    const bt=e.target && e.target.closest ? e.target.closest('button,.btn,[onclick],.map-node,[role=\"button\"]') : null;\n"
    "    if(bt) sfxOnce('ui_click', 40);\n"
    "  }catch(err){}\n"
    "  if(!(e.target && e.target.closest && e.target.closest('[data-tip]'))) hideTip();\n"
    "}\n"
    "document.addEventListener('click', onDocClick);\n"
)

A_END = "  rep.pass = _p; rep.fail = _f;\n"

BLOCK = r'''    /* ===== v0.61.25 音效包：分发表 / 采样通路 / 高频接线 ===== */
    (function () {
      var i, j, k, s, ok, got, missing, bad, steps;

      /* ① 分发表完整性：70 键，每步参数都齐 */
      __ok('v0.61.25 音效表 70 键', SFX_KEYS.length === 70, 'n=' + SFX_KEYS.length);
      bad = [];
      for (i = 0; i < SFX_KEYS.length; i++) {
        k = SFX_KEYS[i]; steps = SFX_TABLE[k];
        if (!steps || !steps.length) { bad.push(k + ':空'); continue; }
        for (j = 0; j < steps.length; j++) {
          s = steps[j];
          if (s[0] === 't') { if (typeof s[1] !== 'number' || typeof s[2] !== 'number' || s[3] == null || typeof s[4] !== 'number') bad.push(k + ':t参'); }
          else if (s[0] === 'b') { if (typeof s[1] !== 'number' || typeof s[2] !== 'number' || typeof s[3] !== 'number' || typeof s[4] !== 'number') bad.push(k + ':b参'); }
          else if (s[0] === 'n') { if (!(s[1] && s[1].length) || typeof s[2] !== 'number' || typeof s[4] !== 'number' || typeof s[5] !== 'number') bad.push(k + ':n参'); }
          else bad.push(k + ':未知步型' + s[0]);
        }
      }
      __ok('v0.61.25 音效表每步参数完整（无 undefined / 无未知步型）', bad.length === 0, bad.slice(0, 6).join(','));

      /* ② 70 键逐个调用不抛错、且都真的产出声音（探针空序列 = 哑键） */
      var threw = [], gp;
      for (i = 0; i < SFX_KEYS.length; i++) { try { __realSfx(SFX_KEYS[i]); } catch (e) { threw.push(SFX_KEYS[i]); } }
      __ok('v0.61.25 70 键在无 WebAudio 下逐个调用不抛错', threw.length === 0, threw.join(','));
      gp = globalThis.__probeSfx(SFX_KEYS);
      var silent = [];
      for (i = 0; i < SFX_KEYS.length; i++) if (!(gp[SFX_KEYS[i]] || []).length) silent.push(SFX_KEYS[i]);
      __ok('v0.61.25 70 键全部有声音（无哑键）', silent.length === 0, silent.join(','));

      /* ③ 未知键名：静默忽略 + 只记一次 */
      __ok('v0.61.25 未知键名静默忽略不抛错',
        (function () { try { __realSfx('__no_such_key__'); return true; } catch (e) { return false; } })());
      __ok('v0.61.25 未知键名被记录（只 warn 一次）', _sfxWarned['__no_such_key__'] === 1);

      /* ④ bug A 回归：sfxVol=0 必须真静音 */
      var _sv = SETTINGS.sfxVol, _sn = SETTINGS.sound;
      SETTINGS.sound = true; SETTINGS.sfxVol = 0;
      var q = globalThis.__probeSfx(['hit', 'card', 'win']);
      SETTINGS.sfxVol = _sv; SETTINGS.sound = _sn;
      __ok('v0.61.25 bugA：sfxVol=0 时 tone/boom 零调用（旧写法会 100% 播放）',
        !q.hit.length && !q.card.length && !q.win.length,
        'hit=' + q.hit.length + ' card=' + q.card.length + ' win=' + q.win.length);

      /* ⑤ bug B 回归：扩展名真相源含 .m4a，音效/BGM 同集合 */
      __ok('v0.61.25 bugB：AUD_EXTS 含 .m4a', AUD_EXTS.indexOf('.m4a') >= 0, AUD_EXTS.join(','));
      __ok('v0.61.25 bugB：BGM_EXTS 与 AUD_EXTS 同集合（只差顺序）',
        AUD_EXTS.slice().sort().join(',') === BGM_EXTS.slice().sort().join(','),
        AUD_EXTS.join(',') + ' vs ' + BGM_EXTS.join(','));

      /* ⑥ 第二参数缺省 → rate 1（40 个旧调用点未破坏）；clamp 边界 */
      __ok('v0.61.25 sfxRate 缺省=1', sfxRate() === 1 && sfxRate(null) === 1 && sfxRate({}) === 1 && sfxRate(0) === 1);
      __ok('v0.61.25 sfxRate 直接传数字也认', sfxRate(1.1) === 1.1);
      __ok('v0.61.25 sfxDamageRate 下限（0 伤）', sfxDamageRate(0) === SFX_RATE_MIN);
      __ok('v0.61.25 sfxDamageRate 上限（999 伤）', sfxDamageRate(999) === SFX_RATE_MAX);
      __ok('v0.61.25 sfxDamageRate 单调不减', sfxDamageRate(1) <= sfxDamageRate(5) && sfxDamageRate(5) <= sfxDamageRate(12));

      /* ⑦ 打击层分级 */
      __ok('v0.61.25 pickHitSfx 分级（轻/重/暴击/斩杀/格挡）',
        pickHitSfx(3, false, false) === 'hit_light' && pickHitSfx(12, false, false) === 'hit_heavy'
        && pickHitSfx(30, false, false) === 'hit_crit' && pickHitSfx(3, false, true) === 'hit_crit'
        && pickHitSfx(0, true, false) === 'hit_guard');

      /* ⑧ 采样通路：无 WebAudio 时安全跳过；无 buffer 不假装播了 */
      __ok('v0.61.25 采集状态结构正确',
        (function () { var r = sfxSamples(); return !!r && r.mode === 'auto' && r.keys === 0 && r.loaded === false && r.loading === false; })());
      __ok('v0.61.25 无 AudioContext 时 loadSfxSamples 安全返回',
        (function () { var old = sfxMode; sfxMode = 'sample'; try { loadSfxSamples(); return sfxSamples().keys === 0 && SFX_LOADING === false; } catch (e) { return false; } finally { sfxMode = old; } })());
      __ok('v0.61.25 playSample 无采样时返回 false（优雅回退合成）', playSample('hit_light', 1) === false);

      /* ⑨ 命名与路径：键名_变体号，mp3 优先，且不会串到别的键 */
      var cands = sfxCandidates('hit_light');
      __ok('v0.61.25 采样路径命名符合规范',
        cands.indexOf('sfx/hit_light.mp3') >= 0 && cands.indexOf('sfx/hit_light_1.mp3') >= 0
        && cands.indexOf('sfx/hit_light_2.mp3') >= 0 && cands.indexOf('sfx/hit_light_3.mp3') >= 0,
        cands.slice(0, 8).join(' '));
      __ok('v0.61.25 sfxCandidates 不越界到别的键',
        cands.filter(function (p) { return p.indexOf('hit_light') < 0; }).length === 0);
      __ok('v0.61.25 file:// 下 sampleURL 不做无谓请求',
        (SFX_PROTO === 'file:') ? sampleURL('sfx/hit_light.mp3') === null : true, 'proto=' + SFX_PROTO);

      /* ⑩ 节流：同键间隔内第二次不出声 */
      _sfxGate['__gate__'] = 0;
      __ok('v0.61.25 sfxOnce 首次出声', sfxOnce('__gate__', 80) === true);
      __ok('v0.61.25 sfxOnce 同帧第二次被节流', sfxOnce('__gate__', 80) === false);

      /* ⑪ 高频接线：打桩 sfx 记录键名，验证真的接在调用点上 */
      function __rec(fn) {
        var list = [], _s = sfx;
        sfx = function (n) { list.push(n); };
        try { fn(); } finally { sfx = _s; }
        return list;
      }
      __ok('v0.61.25 接线·抽牌 → card_draw',
        __rec(function () { G = __base('ganshiren'); G.drawPile = [__card('leifu')]; drawCards(1); }).indexOf('card_draw') >= 0);
      __ok('v0.61.25 接线·施咒 → card_curse',
        __rec(function () { G = __base('tianshi'); applyCurse(G.enemies[0], 2); }).indexOf('card_curse') >= 0);
      __ok('v0.61.25 接线·尸气 → card_shiji',
        __rec(function () { G = __base('ganshiren'); gainShiqi(2); }).indexOf('card_shiji') >= 0);
      __ok('v0.61.25 接线·真伤 → atk_true',
        __rec(function () { G = __base('tianshi'); G.hp = 60; directDamage(8, '真伤'); }).indexOf('atk_true') >= 0);
      __ok('v0.61.25 接线·全局点击音 → ui_click',
        (function () {
          var list = __rec(function () { onDocClick({ target: { closest: function () { return {}; } } }); });
          return list.indexOf('ui_click') >= 0;
        })(), 'ok');
      __ok('v0.61.25 接线·点空白不出点击音',
        (function () {
          var list = __rec(function () { onDocClick({ target: { closest: function () { return null; } } }); });
          return list.indexOf('ui_click') < 0;
        })());

      /* 打击层分级接线（轻/重/暴击/格挡/连击段） */
      function __hitKey(dmg, block, point) {
        return __rec(function () {
          G = __base('tianshi');
          var e = G.enemies[0]; e.hp = 500; e.maxHp = 500; e.block = block || 0; e.kind = 'ghost';
          dealDamageTo(e, dmg, false, 0, !!point);
        });
      }
      got = __hitKey(3, 0);    __ok('v0.61.25 接线·轻击 → hit_light', got.indexOf('hit_light') >= 0, got.join(','));
      got = __hitKey(12, 0);   __ok('v0.61.25 接线·重击 → hit_heavy', got.indexOf('hit_heavy') >= 0, got.join(','));
      got = __hitKey(40, 0);   __ok('v0.61.25 接线·高伤 → hit_crit', got.indexOf('hit_crit') >= 0, got.join(','));
      got = __hitKey(3, 99);   __ok('v0.61.25 接线·全被格挡 → hit_guard', got.indexOf('hit_guard') >= 0, got.join(','));
      got = __hitKey(1, 0, 1); __ok('v0.61.25 接线·连击逐段 → atk_multi_each', got.indexOf('atk_multi_each') >= 0, got.join(','));

      /* 反伤 / 受击 / 格挡吃满的连击段 */
      got = __rec(function () { G = __base('wuseng'); G.thorns = 3; G.enemies[0].hp = 99; dealDamageToPlayer(5, G.enemies[0]); });
      __ok('v0.61.25 接线·反震 → thorns', got.indexOf('thorns') >= 0, got.join(','));
      __ok('v0.61.25 接线·玩家受击 → hurt', got.indexOf('hurt') >= 0, got.join(','));
      got = __rec(function () { G = __base('wuseng'); G.hp = 60; G.block = 99; dealDamageToPlayer(4, G.enemies[0], 0, { multi: true }); });
      __ok('v0.61.25 接线·格挡吃满的连击段仍出 enemy_multi', got.indexOf('enemy_multi') >= 0, got.join(','));

      /* 敌人出招：逐意图类型验声 */
      function __intentKey(type, extra) {
        return __rec(function () {
          G = __base('ganshiren'); G.hp = 200;
          var e = G.enemies[0]; e.hp = 200; e.maxHp = 200; e.block = 0;
          var it = { type: type, v: 3, n: 1 };
          for (var kk in (extra || {})) it[kk] = extra[kk];
          e.intents = [it]; e.intents2 = null; e.intentIndex = 0; e.intent = it;
          enemyAct();
        });
      }
      var IMAP = { attack: 'enemy_attack', multi: 'enemy_multi', charge: 'enemy_charge', block: 'enemy_block',
                   heal: 'enemy_heal', strength: 'enemy_strength', summon: 'enemy_summon', weak: 'enemy_debuff',
                   gouhun: 'enemy_debuff', discard: 'enemy_debuff', burn: 'enemy_debuff', wangyou: 'enemy_debuff',
                   yehuo: 'enemy_buff_self', qingsuan: 'enemy_qingsuan', dormant: 'enemy_dormant' };
      missing = [];
      for (k in IMAP) {
        got = __intentKey(k);
        if (got.indexOf(IMAP[k]) < 0) missing.push(k + '→' + IMAP[k]);
      }
      __ok('v0.61.25 接线·15 种敌人出招各有其声', missing.length === 0, missing.join(' '));
      got = __intentKey('attackBlock', { v: 6, block: 5 });
      __ok('v0.61.25 接线·攻击+格挡 → enemy_attack 与 enemy_block 各一次',
        got.indexOf('enemy_attack') >= 0 && got.indexOf('enemy_block') >= 0, got.join(','));

      /* 二阶段 / 消耗 / 三选一·地图选点（后者无 DOM，只验调用点在位） */
      got = __rec(function () { G = __base('tianshi'); var e = G.enemies[0]; e.intents2 = e.intents; enterPhase2(e); });
      __ok('v0.61.25 接线·Boss 二阶段 → boss_phase2（不再蹭 relic）',
        got.indexOf('boss_phase2') >= 0 && got.indexOf('relic') < 0, got.join(','));
      got = __rec(function () { G = __base('tianshi'); G.hand = [__card('fodu')]; G.energy = 5; doPlayCard(0); });
      __ok('v0.61.25 接线·消耗牌 → card_exhaust', got.indexOf('card_exhaust') >= 0, got.join(','));
      __ok('v0.61.25 接线·三选一 → ui_reward 调用点在位', String(pickReward).indexOf("sfx('ui_reward')") >= 0);
      __ok('v0.61.25 接线·地图选点 → ui_map 调用点在位', String(chooseNode).indexOf("sfx('ui_map')") >= 0);
    })();

'''


def main():
    doc = io.open(DAT, encoding='utf-8', newline='').read()
    runner = io.open(RUNNER, encoding='utf-8', newline='').read()

    if 'function onDocClick' not in doc:
        n = doc.count(A_DAT_OLD)
        if n != 1:
            print('FAIL A_DAT_OLD count=%d (expect 1)' % n)
            return 1
        doc = doc.replace(A_DAT_OLD, A_DAT_NEW, 1)
        io.open(DAT, 'w', encoding='utf-8', newline='').write(doc)
        print('OK js/20_data.js 点击委托已抽成 onDocClick')
    else:
        print('SKIP onDocClick 已存在')

    if 'v0.61.25 音效表 70 键' in runner:
        print('SKIP 断言块已存在')
        return 0
    n = runner.count(A_END)
    if n != 1:
        print('FAIL A_END count=%d (expect 1)' % n)
        return 1
    runner = runner.replace(A_END, BLOCK + A_END, 1)
    io.open(RUNNER, 'w', encoding='utf-8', newline='').write(runner)
    print('OK 断言块已插入')
    return 0


if __name__ == '__main__':
    sys.exit(main())
