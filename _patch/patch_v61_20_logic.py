# -*- coding: utf-8 -*-
# v0.61.20 批3 —— 第二刀：逻辑层
#   P4 Boss 二阶段转场（复用印章过场做「裂印 + 红目」变体）
#   P8 条件引导气泡：首次遇到 诅咒/格挡/召唤物/尸气 各弹一次
#   P2 前置：地图路径历史 G.mapPath（连线要画「已走」就必须有历史）
import io, sys, subprocess, os

ROOT = r"C:\Users\HP\Desktop\志怪塔"
FILES = ['原型.html', 'js/00_base.js', 'js/20_data.js', 'js/30_engine.js', 'js/40_flow.js', 'js/50_ui.js', 'js/60_boot.js']
buf = {f: io.open(os.path.join(ROOT, f), 'r', encoding='utf-8', newline='').read() for f in FILES}
log = []

def sub(f, old, new, label):
    c = buf[f].count(old)
    if c != 1:
        print('ANCHOR FAIL [%s] %d 次' % (label, c)); sys.exit(1)
    buf[f] = buf[f].replace(old, new, 1); log.append(label)

# ============================================================
# P4 样式：印章变体（裂印 + 红目）—— .boss-seal 本身已有 position:relative
# ============================================================
sub('原型.html',
    '  #boss-intro .bs-sub{font-size:14px; letter-spacing:6px; opacity:.85; margin-top:8px; display:block;}\n',
    '  #boss-intro .bs-sub{font-size:14px; letter-spacing:6px; opacity:.85; margin-top:8px; display:block;}\n'
    '  /* v0.61.20(P4)：二阶段转场 —— 同一枚印章，换成「裂印 + 红目」：印面转暗红、两道裂纹透光、双瞳亮起 */\n'
    '  #boss-intro.phase2 .boss-seal{background:linear-gradient(160deg,#4a1008,#240705); border-color:#c0342a; overflow:hidden;\n'
    '    box-shadow:0 0 64px rgba(220,60,40,.75), inset 0 0 34px rgba(0,0,0,.72); animation:sealCrack .9s cubic-bezier(.2,.9,.3,1.35) forwards;}\n'
    '  #boss-intro.phase2 .boss-seal::after{content:""; position:absolute; inset:0; pointer-events:none; mix-blend-mode:screen;\n'
    '    background:linear-gradient(74deg, transparent 47.2%, rgba(255,130,95,.95) 47.2% 48.1%, transparent 48.1%),\n'
    '               linear-gradient(-57deg, transparent 61.5%, rgba(255,130,95,.62) 61.5% 62.2%, transparent 62.2%);}\n'
    '  #boss-intro.phase2 .bs-eyes{display:block; font-size:26px; letter-spacing:16px; margin-bottom:6px; color:#ff5a34; text-indent:16px;\n'
    '    text-shadow:0 0 16px rgba(255,70,30,.95), 0 0 34px rgba(255,70,30,.6); animation:eyeBlink 2.4s ease-in-out infinite;}\n'
    '  #boss-intro.phase2 .bs-name{color:#ff8a68; text-shadow:0 0 20px rgba(255,80,40,.85), 0 2px 6px rgba(0,0,0,.9);}\n'
    '  #boss-intro.phase2 .bs-sub{color:#ffb08a; opacity:1;}\n'
    '  #boss-intro.phase2 .boss-ink{background:radial-gradient(circle at center, rgba(72,6,0,0) 12%, rgba(72,6,0,.94) 100%);}\n'
    '  @keyframes sealCrack{0%{transform:scale(1.55) rotate(-4deg); filter:blur(7px); opacity:0;} 62%{transform:scale(.97) rotate(1deg); opacity:1;} 100%{transform:scale(1) rotate(0); filter:blur(0); opacity:1;}}\n'
    '  @keyframes eyeBlink{0%,44%,56%,100%{opacity:1;} 50%{opacity:.25;}}\n',
    'P4 二阶段印章样式')

# ============================================================
# 00_base：条件引导气泡 + Boss 二阶段转场
# ============================================================
sub('js/00_base.js',
    '/* ===================== 战斗特效（juice：伤害飘字 / 受击震屏 / 敌人抖动） ===================== */\n',
    '''/* ===================== 条件引导气泡（v0.61.20 P8） =====================
 * 首次遇到「诅咒 / 格挡 / 召唤物 / 尸气」各弹一次，讲清它是什么。
 * 和 floatMsg（战斗飘字，1.6s 就散）不同：气泡是**可读的**——停到你看完，点一下收起，7 秒自动收。
 * 看过就记在 Store 里（zhiguaitower_tips_v1），换局不重弹；清掉存档即重置。
 * 只在真正的战斗场景里触发（SCENE==='battle'），免得在菜单/商店/仿真里乱冒。
 * 注意：tipOnce 的返回值与「是否真的画了 DOM」解耦 —— 冒烟环境没有 DOM，仍要能断言触发过。 */
const TIPS_KEY = 'zhiguaitower_tips_v1';
let TIPS_SEEN = null;
function tipsSeen(){ if(!TIPS_SEEN){ TIPS_SEEN = Store.getJSON(TIPS_KEY) || {}; } return TIPS_SEEN; }
function inBattleScene(){
  try{ return typeof SCENE==='string' && SCENE==='battle' && typeof G!=='undefined' && !!G && !G.dead; }catch(e){ return false; }
}
function hideTipBubble(){
  try{
    const el=document.getElementById('tip-bubble');
    if(el){ el.classList.remove('show'); setTimeout(()=>{ if(el.parentNode) el.parentNode.removeChild(el); }, 300); }
  }catch(e){}
}
function showTipBubble(html){
  if(!document || !document.body || !document.createElement) return;
  try{
    hideTipBubble();
    const el=document.createElement('div');
    el.id='tip-bubble';
    el.innerHTML='<span class="tip-tag">提示</span>'+html;
    el.onclick=hideTipBubble;
    document.body.appendChild(el);
    try{ requestAnimationFrame(()=>{ el.classList.add('show'); }); }catch(e){ el.classList.add('show'); }
    setTimeout(()=>{ const x=document.getElementById('tip-bubble'); if(x===el) hideTipBubble(); }, 7000);
  }catch(e){}
}
/* 返回 true 表示「这次真的弹了」（冒烟用它断言，别依赖 DOM） */
function tipOnce(key, html){
  try{
    const s=tipsSeen();
    if(s[key]) return false;
    s[key]=1; Store.setJSON(TIPS_KEY, s);
    if(inBattleScene()) showTipBubble(html);
    return true;
  }catch(e){ return false; }
}

/* ===================== 战斗特效（juice：伤害飘字 / 受击震屏 / 敌人抖动） ===================== */\n''',
    'P8 引导气泡模块')

sub('js/00_base.js',
    '  setTimeout(()=>{ b.classList.remove(\'show\'); b.innerHTML=\'\'; if(onDone) onDone(); }, 1150);\n}\n',
    '  setTimeout(()=>{ b.classList.remove(\'show\'); b.innerHTML=\'\'; if(onDone) onDone(); }, 1150);\n}\n'
    '/* v0.61.20(P4)：Boss 二阶段转场 —— 复用同一枚印章，换成「裂印 + 红目」变体。\n'
    '   与 bossIntro 的关键区别：**不阻塞流程**。二阶段是从「血条打空」的同步路径里触发的，\n'
    '   卡住等动画会把「死亡→复活→回合收尾」的时序搅乱，所以这里只铺 1.4 秒视觉，游戏在背后照常推进。 */\n'
    'function bossPhaseIntro(name){\n'
    '  if(!document || !document.body) return;\n'
    '  try{\n'
    '    let b=document.getElementById(\'boss-intro\');\n'
    '    if(!b){ b=document.createElement(\'div\'); b.id=\'boss-intro\'; document.body.appendChild(b); }\n'
    '    if(b.classList.contains(\'show\')) return;   // 别和战前过场打架\n'
    '    b.classList.add(\'phase2\');\n'
    '    b.innerHTML=(fx()?`<div class="boss-ink"></div>`:\'\')+`<div class="boss-seal"><span class="bs-eyes">◉◉</span><span class="bs-name">${name}</span><span class="bs-sub">轮 回 再 临</span></div>`;\n'
    '    b.classList.remove(\'show\'); void b.offsetWidth; b.classList.add(\'show\');\n'
    '    sfx(\'boss\');\n'
    '    setTimeout(()=>{ b.classList.remove(\'show\',\'phase2\'); b.innerHTML=\'\'; }, 1400);\n'
    '  }catch(e){}\n'
    '}\n',
    'P4 二阶段转场函数')

# ============================================================
# P8 触发点 ×4
# ============================================================
sub('js/30_engine.js',
    'function gainBlock(n){\n  G.block+=n;\n',
    'function gainBlock(n){\n'
    '  if(n>0) tipOnce(\'block\', \'<b>格挡</b>先替你挨打 —— 敌人打过来时先扣格挡、再扣血。但它在<b>回合结束时清零</b>（苦行武僧除外），所以能挡就这回合挡完。\');\n'
    '  G.block+=n;\n',
    'P8 触发·格挡')

sub('js/30_engine.js',
    'function applyCurse(e, n){\n  let v=n;\n',
    'function applyCurse(e, n){\n'
    '  if(n>0) tipOnce(\'curse\', \'<b>【诅咒】</b>是你在敌人身上累积的印记，本身不掉血 —— 要靠【蚀魂咒】【钟馗镇魂】【百鬼夜行】这类牌去「引爆」它，才变成伤害。符箓天师整套牌都围着它转。\');\n'
    '  let v=n;\n',
    'P8 触发·诅咒')

sub('js/20_data.js',
    'function gainShiqi(n){ if(!n || n<=0) return; G.尸气 = Math.min(G.maxShiQi||12, (G.尸气||0)+n); }',
    'function gainShiqi(n){ if(!n || n<=0) return;\n'
    '  tipOnce(\'shiqi\', \'<b>【尸气】</b>是茅山赶尸人的专属资源：上限 12 点、<b>整局累积不清零</b>。场上每有 1 个召唤物，回合开始就 +1；攒着可以强化【五通神】，或用【咒雨】一次引爆。\');\n'
    '  G.尸气 = Math.min(G.maxShiQi||12, (G.尸气||0)+n); }',
    'P8 触发·尸气')

sub('js/20_data.js',
    'function addSummon(o){ G.summonsMadeTurn=(G.summonsMadeTurn||0)+1;\n'
    '  if(G.hero===\'ganshiren\' && SUMMON_LIFE_TYPES.indexOf(o.type)>=0) o.dur=(o.dur||0)+1;\n'
    '  G.summons.push(o); return o; }',
    'function addSummon(o){ G.summonsMadeTurn=(G.summonsMadeTurn||0)+1;\n'
    '  if(G.hero===\'ganshiren\' && SUMMON_LIFE_TYPES.indexOf(o.type)>=0) o.dur=(o.dur||0)+1;\n'
    '  tipOnce(\'summon\', \'<b>召唤物</b>不算「敌人」—— 它站在你这边，每回合结束自动结算一次自己的效果（打人 / 给你格挡 / 回血），寿命归零就消散。敌人血条下面那排小字就是它们的剩余回合数。\');\n'
    '  G.summons.push(o); return o; }',
    'P8 触发·召唤物')

# ============================================================
# P2 前置：地图路径历史（连线要画「已走」就得先有历史）
# ============================================================
sub('js/30_engine.js',
    'mapRow:0, mapCol:-1, rewardPicks:[],',
    'mapRow:0, mapCol:-1, mapPath:[], rewardPicks:[], // v0.61.20(P2)：mapPath 记走过的 (层,列)，地图连线的「已走」靠它',
    'P2 newState mapPath')

sub('js/40_flow.js',
    '    act:G.act, mapRow:G.mapRow, mapCol:G.mapCol,\n',
    '    act:G.act, mapRow:G.mapRow, mapCol:G.mapCol, mapPath:(G.mapPath||[]).slice(),\n',
    'P2 存档带 mapPath')

sub('js/40_flow.js',
    '  G.act=d.act; G.mapRow=d.mapRow; G.mapCol=d.mapCol; G.hero=d.hero;',
    '  G.act=d.act; G.mapRow=d.mapRow; G.mapCol=d.mapCol; G.mapPath=Array.isArray(d.mapPath)?d.mapPath:[]; G.hero=d.hero; // 老存档没 mapPath → 空数组，连线退化成只有「可达」',
    'P2 续档恢复 mapPath')

c = buf['js/40_flow.js'].count('  G.mapRow=0; G.mapCol=-1; G.shopWares=null;')
if c != 2:
    print('ANCHOR FAIL [P2 清 mapPath·40_flow] %d 次（期望 2）' % c); sys.exit(1)
buf['js/40_flow.js'] = buf['js/40_flow.js'].replace(
    '  G.mapRow=0; G.mapCol=-1; G.shopWares=null;',
    '  G.mapRow=0; G.mapCol=-1; G.mapPath=[]; G.shopWares=null;')
log.append('P2 新局/换幕清 mapPath ×2')

sub('js/60_boot.js',
    '  G.mapRow=0; G.mapCol=-1;\n',
    '  G.mapRow=0; G.mapCol=-1; G.mapPath=[];\n',
    'P2 无尽起点清 mapPath')

sub('js/50_ui.js',
    'function chooseNode(c){\n  const node=MAP[G.mapRow][c];\n  G.mapCol=c;\n',
    'function chooseNode(c){\n'
    '  const node=MAP[G.mapRow][c];\n'
    '  (G.mapPath=G.mapPath||[]).push({r:G.mapRow, c:c}); // v0.61.20(P2)：记下这一步，地图连线据此画「已走」\n'
    '  G.mapCol=c;\n',
    'P2 chooseNode 记路径')

# ============================================================
# P4 触发点
# ============================================================
sub('js/30_engine.js',
    "  sfx('relic');\n  floatMsg('轮回 · 第二阶段');\n  log('阎罗天子堕入轮回，阴气更盛——进入第二阶段！');",
    "  sfx('relic');\n  floatMsg('轮回 · 第二阶段');\n"
    "  bossPhaseIntro(e.name||'阎罗天子'); // v0.61.20(P4)：裂印 + 红目的二阶段转场（非阻塞，见该函数注释）\n"
    "  log('阎罗天子堕入轮回，阴气更盛——进入第二阶段！');",
    'P4 enterPhase2 接过场')

# ---------- 写盘 ----------
print('--- 待写文件 ---')
for f in FILES:
    p = os.path.join(ROOT, f)
    now = io.open(p, 'r', encoding='utf-8', newline='').read()
    if buf[f] == now:
        continue
    if not p.endswith('.js'):
        io.open(p, 'w', encoding='utf-8', newline='').write(buf[f]); print('OK  %s' % f); continue
    tmp = p + '.check.js'
    io.open(tmp, 'w', encoding='utf-8', newline='').write(buf[f])
    r = subprocess.run(['node', '--check', tmp], capture_output=True, text=True)
    if r.returncode != 0:
        os.remove(tmp); print('NODE CHECK FAIL', f); print(r.stdout, r.stderr); sys.exit(1)
    os.replace(tmp, p)
    print('OK  %s' % f)

print('\n--- %d 处改动 ---' % len(log))
for i, x in enumerate(log, 1): print('%2d. %s' % (i, x))
