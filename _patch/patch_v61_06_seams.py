# -*- coding: utf-8 -*-
"""
v0.61.06 收口：三个「Cocos 接缝」+ 可播种随机

1) Store    —— 12 处 localStorage 读写全部收进薄封装（键名不变，老存档照常读）
2) rng()    —— 25 处玩法用 Math.random 换成可播种 mulberry32；种子进 RUN_KEY 存档
   （唯一保留 Math.random 的是 js/10_audio.js 的噪声缓冲：纯听感，与对局无关）
3) AdSlot   —— 4 个激励点位的唯一入口（adPlaceholder 变成它的转发壳）

铁律：每个锚点先断言出现次数 == 1；行内替换按行号断言该行确实含目标串。
"""
import io, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JS = os.path.join(ROOT, 'js')
NEWVER = 'v0.61.06'


def rd(p):
    return io.open(p, 'r', encoding='utf-8', newline='').read()


def wr(p, s):
    io.open(p, 'w', encoding='utf-8', newline='').write(s)


def sub1(s, old, new, tag):
    n = s.count(old)
    if n != 1:
        print('FAIL %s: 锚点出现 %d 次（期望 1）\n  %r' % (tag, n, old[:120])); sys.exit(1)
    return s.replace(old, new, 1)


# ---------------------------------------------------------------- 1) 基础设施
INFRA = """/* ===================== 基础设施：存储 / 随机 / 广告位 =====================
 * v0.61.06 收口。三处都是给 Cocos 正式工程预留的**唯一接缝**，
 * HTML 原型的行为与旧版一致（键名、随机分布、奖励内容都没变）。
 * ========================================================================= */

/* 存储 —— 所有 localStorage 读写都走这里。微信/Cocos 阶段只换这一个对象 */
const Store = {
  get(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } },
  set(k,v){ try{ localStorage.setItem(k,v); return true; }catch(e){ return false; } },
  del(k){ try{ localStorage.removeItem(k); }catch(e){} },
  getJSON(k){ const r=Store.get(k); if(r==null) return null; try{ return JSON.parse(r); }catch(e){ return null; } },
  setJSON(k,o){ return Store.set(k, JSON.stringify(o)); }
};

/* 随机 —— 可播种（mulberry32）。开局定种子并随存档落盘，
 * 用来复现玩家报障、以及批2 战斗仿真器的同种子对比。
 * 想复现某一局：在地址后加 ?seed=数字 即可。 */
let _rngSeed = 1, _rngCalls = 0;
function seedRng(seed){ _rngSeed=(seed>>>0)||1; _rngCalls=0; }
function rngSeedNow(){
  const q=(typeof location!=='undefined' && location.search)? /[?&]seed=(\\d+)/.exec(location.search) : null;
  if(q) return (+q[1])>>>0;                 // ?seed=123 → 同一副牌序、同一批奖励
  return (Date.now() ^ Math.floor(Math.random()*0x100000000))>>>0;   // 这里用真随机取种子
}
function rng(){
  _rngSeed = (_rngSeed + 0x6D2B79F5) >>> 0;
  let t = _rngSeed;
  t = Math.imul(t ^ (t>>>15), t | 1);
  t = (t + Math.imul(t ^ (t>>>7), t | 61)) ^ t;
  _rngCalls++;
  return ((t ^ (t>>>14)) >>> 0) / 4294967296;
}
function rngInt(n){ return Math.floor(rng()*n); }
function rngSnapshot(){ return { s:_rngSeed, n:_rngCalls }; }
function rngRestore(snap){
  if(snap && typeof snap.s==='number' && snap.s){ _rngSeed=snap.s>>>0; _rngCalls=snap.n||0; return true; }
  seedRng(rngSeedNow()); return false;      // 旧存档没有随机态：退回新种子（只是不再可复现）
}

/* 广告位 —— 4 个激励点位的唯一入口。HTML 原型直接放行并记埋点；
 * Cocos 版把 request 内部换成 wx.createRewardedVideoAd(id) 即可，调用点不用动。 */
const AD_SLOTS = ['奖励翻倍','复活','签到翻倍','开局重随'];
const AdSlot = {
  request(id, onReward){
    if(AD_SLOTS.indexOf(id)<0) log(`【广告位】未登记的槽位「${id}」，请同步 AD_SLOTS`);
    log(`【广告占位·${id}】模拟观看成功，发放奖励（正式版接抖音/微信激励视频 SDK）`);
    floatMsg('广告 · 已观看');
    track('ad'); track('ad_'+id);
    if(typeof onReward==='function') onReward();
  }
};

"""

p = os.path.join(JS, '00_base.js')
s = rd(p)
s = sub1(s, '/* ===================== 工具 ===================== */\n',
         INFRA + '/* ===================== 工具 ===================== */\n', '00_base 插入基础设施')
s = sub1(s, 'const j=Math.floor(Math.random()*(i+1));', 'const j=rngInt(i+1);', '00_base shuffle')
wr(p, s)

# ------------------------------------------------- 2) Math.random → rng（按行号）
RNG_SITES = {
    '20_data.js': [480, 613, 614, 670, 878, 937, 938, 1029],
    '30_engine.js': [43, 331, 334, 844],
    '50_ui.js': [62, 63, 118, 129, 157, 165, 169, 315, 317, 319],
}
for fn, lns in RNG_SITES.items():
    p = os.path.join(JS, fn)
    s = rd(p)
    lines = s.split('\n')
    for ln in lns:
        i = ln - 1
        if 'Math.random()' not in lines[i]:
            print('FAIL %s:%d 该行不含 Math.random()\n  %r' % (fn, ln, lines[i][:120])); sys.exit(1)
        lines[i] = lines[i].replace('Math.random()', 'rng()')
    s = '\n'.join(lines)
    if 'Math.random' in s:
        print('FAIL %s 仍残留 Math.random' % fn); sys.exit(1)
    wr(p, s)

# ------------------------------------------------------------- 3) Store 收口
STORE_EDITS = [
    ('10_audio.js',
     "try{ const r=localStorage.getItem('zhiguaitower_settings_v1'); if(r) SETTINGS=Object.assign(SETTINGS, JSON.parse(r)); }catch(e){}",
     "try{ const r=Store.getJSON('zhiguaitower_settings_v1'); if(r) SETTINGS=Object.assign(SETTINGS, r); }catch(e){}"),
    ('10_audio.js',
     "try{ localStorage.setItem('zhiguaitower_settings_v1', JSON.stringify(SETTINGS)); }catch(e){}",
     "try{ Store.setJSON('zhiguaitower_settings_v1', SETTINGS); }catch(e){}"),
    ('40_flow.js',
     "try{ localStorage.setItem(RUN_KEY, JSON.stringify(data)); }catch(e){}",
     "try{ Store.setJSON(RUN_KEY, data); }catch(e){}"),
    ('40_flow.js',
     "function hasRunSave(){ try{ return !!localStorage.getItem(RUN_KEY); }catch(e){ return false; } }",
     "function hasRunSave(){ try{ return !!Store.get(RUN_KEY); }catch(e){ return false; } }"),
    ('40_flow.js',
     "function readRun(){ try{ return JSON.parse(localStorage.getItem(RUN_KEY)); }catch(e){ return null; } }",
     "function readRun(){ try{ return Store.getJSON(RUN_KEY); }catch(e){ return null; } }"),
    ('40_flow.js',
     "function clearRunSave(){ try{ localStorage.removeItem(RUN_KEY); }catch(e){} }",
     "function clearRunSave(){ try{ Store.del(RUN_KEY); }catch(e){} }"),
    ('40_flow.js',
     "  let d; try{ d=JSON.parse(localStorage.getItem(RUN_KEY)); }catch(e){}",
     "  let d; try{ d=Store.getJSON(RUN_KEY); }catch(e){}"),
    ('50_ui.js',
     "try{ const raw=localStorage.getItem(SAVE_KEY); if(raw){ const d=JSON.parse(raw); if(d && Array.isArray(d.unlocked)) SAVE=d; } }",
     "try{ const d=Store.getJSON(SAVE_KEY); if(d && Array.isArray(d.unlocked)) SAVE=d; }"),
    ('50_ui.js',
     "try{ localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); }catch(e){}",
     "try{ Store.setJSON(SAVE_KEY, SAVE); }catch(e){}"),
    ('60_boot.js',
     "function tutorialSeen(){ try{ return localStorage.getItem('zhiguaitower_tutorial_v1')==='1'; }catch(e){ return false; } }",
     "function tutorialSeen(){ try{ return Store.get('zhiguaitower_tutorial_v1')==='1'; }catch(e){ return false; } }"),
    ('60_boot.js',
     "function markTutorialSeen(){ try{ localStorage.setItem('zhiguaitower_tutorial_v1','1'); }catch(e){} }",
     "function markTutorialSeen(){ try{ Store.set('zhiguaitower_tutorial_v1','1'); }catch(e){} }"),
]
for fn, old, new in STORE_EDITS:
    p = os.path.join(JS, fn)
    s = sub1(rd(p), old, new, 'Store ' + fn)
    wr(p, s)

# ------------------------------------------------------- 4) 广告位唯一入口
p = os.path.join(JS, '50_ui.js')
s = rd(p)
s = sub1(s,
         """function adPlaceholder(name, reward){
  log(`【广告占位·${name}】模拟观看成功，发放奖励（正式版接抖音/微信激励视频 SDK）`);
  floatMsg('广告 · 已观看');
  track('ad'); track('ad_'+name);
  reward();
}""",
         """function adPlaceholder(name, reward){ AdSlot.request(name, reward); } // v0.61.06：转发到统一入口""",
         '50_ui adPlaceholder')
wr(p, s)

# --------------------------------------------------------- 5) 种子生命周期
p = os.path.join(JS, '40_flow.js')
s = rd(p)
s = sub1(s,
         "    log:G.log||[]\n  };",
         "    log:G.log||[],\n    rng:rngSnapshot()            // v0.61.06：随机态随存档落盘，续档后牌序/掉落可复现\n  };",
         '40_flow saveRun 存 rng')
s = sub1(s, "  G=newState();\n  G.act=d.act;",
         "  G=newState();\n  rngRestore(d.rng);          // v0.61.06：先恢复随机态，再重放后续判定\n  G.act=d.act;",
         '40_flow continueRun 恢复 rng')
wr(p, s)

p = os.path.join(JS, '60_boot.js')
s = rd(p)
s = sub1(s, "    G=newState(); G.mapRow=0;\n",
         "    G=newState(); G.mapRow=0;\n    seedRng(rngSeedNow());      // v0.61.06：本局种子（可用 ?seed=N 复现）\n",
         '60_boot confirmNewGame 播种')
s = sub1(s, "  G=newState();\n  G.endless=true;",
         "  G=newState();\n  seedRng(rngSeedNow());      // v0.61.06：本局种子\n  G.endless=true;",
         '60_boot startEndless 播种')
wr(p, s)

# ------------------------------------------------------------- 6) 版本号 3 处
p = os.path.join(ROOT, '原型.html')
s = rd(p)
s = sub1(s, '<title>志怪塔 · 原型 v0.61.05</title>',
         '<title>志怪塔 · 原型 %s</title>' % NEWVER, '版本 title')
s = sub1(s, '<small>· 玩法原型 v0.61.05</small>',
         '<small>· 玩法原型 %s</small>' % NEWVER, '版本 h1')
wr(p, s)

p = os.path.join(JS, '60_boot.js')
s = sub1(rd(p), '<h2>志 怪 塔 · v0.61.05</h2>',
         '<h2>志 怪 塔 · %s</h2>' % NEWVER, '版本 h2')
wr(p, s)

print('PATCH v0.61.06 OK')
