# -*- coding: utf-8 -*-
# v0.52 → v0.53：消耗牌 ①「一局一次」→「一关一次」 ②卡面加显著提示
import io, sys, subprocess, tempfile, os, re

P = r"C:\Users\HP\Desktop\志怪塔\原型.html"
s = io.open(P, 'r', encoding='utf-8').read()

EDITS = []

# ============ 一、关键词文案：改成一关一次 ============
EDITS.append((
"""  ['消耗','一次性牌：打出后从本局牌组中移除，本局不再循环出现。'],""",
"""  ['消耗','每场战斗限用一次：打出后本关不再出现，战斗结束后回到牌库，下场战斗可以再用。'],"""))

# ============ 二、CSS：消耗牌卡面标记 ============
EDITS.append((
"""  .exhaust-tag{display:inline-block; font-size:10px; color:#fff; background:var(--red2); border-radius:4px; padding:1px 6px; margin:4px 0 2px; letter-spacing:1px;}""",
"""  .exhaust-tag{display:inline-block; font-size:10px; color:#fff; background:var(--red2); border-radius:4px; padding:1px 6px; margin:4px 0 2px; letter-spacing:1px;}
  /* 消耗牌标记：左侧红条（扇形手牌只露左缘，靠它一眼认出）+ 右上角「消耗」角标 */
  .card .oneuse-bar{position:absolute; left:0; top:0; bottom:0; width:4px; background:var(--red2); z-index:3;}
  .card .oneuse{position:absolute; top:5px; right:5px; z-index:3; font-size:9px; line-height:1.35; color:#fff; background:var(--red2); border-radius:4px; padding:1px 5px; letter-spacing:1px; box-shadow:0 1px 3px rgba(0,0,0,.55); cursor:help;}"""))

# ============ 三、卡面标记生成器（放在 cardBody 之前） ============
EDITS.append((
"""function cardBody(c){
  return `${cardArt(c)}<div class="cost">${cardCost(c)}</div><div class="cname">${c.name}${c.up?' <span style="color:var(--green)" title="已升级">↑</span>':''}</div><div class="cdesc">${wrapKw(c.t(c.up))}</div><div class="ctype">${TNAME[c.type]} · ${RNAME[c.rarity]}</div>`;
}""",
"""/* 消耗牌判定：牌自带 exhaust，或该英雄专属消耗（如噬魂术仅天师） */
function isOneUse(c){ return !!(c && (c.exhaust || (c.heroExhaust && c.heroExhaust===G.hero))); }
/* 卡面标记（图形式卡） */
function exhaustMark(c){
  if(!isOneUse(c)) return '';
  return `<div class="oneuse-bar"></div><div class="oneuse" data-tip="kw:消耗">消耗</div>`;
}
/* 文字列表用的小标签（牌库 / 放大镜等） */
function exhaustChip(c){
  if(!isOneUse(c)) return '';
  return ` <span data-tip="kw:消耗" style="cursor:help;color:#fff;background:var(--red2);border-radius:4px;padding:0 5px;font-size:11px;letter-spacing:1px">消耗</span>`;
}
function cardBody(c){
  return `${cardArt(c)}${exhaustMark(c)}<div class="cost">${cardCost(c)}</div><div class="cname">${c.name}${c.up?' <span style="color:var(--green)" title="已升级">↑</span>':''}</div><div class="cdesc">${wrapKw(c.t(c.up))}</div><div class="ctype">${TNAME[c.type]} · ${RNAME[c.rarity]}</div>`;
}"""))

EDITS.append((
"""  return `<div class="card ${RCOLOR[c.rarity]}${lock?' locked':''}" onclick="forgeCard(${i})">
    ${cardArt(c)}
    <div class="cost">${cardCost(c)}</div>""",
"""  return `<div class="card ${RCOLOR[c.rarity]}${lock?' locked':''}" onclick="forgeCard(${i})">
    ${cardArt(c)}${exhaustMark(c)}
    <div class="cost">${cardCost(c)}</div>"""))

EDITS.append((
"""  return `<div class="card ${RCOLOR[c.rarity]} ${(disabled||sealed)?'disabled':''}" style="--rot:${rot}deg" onpointerdown="cardPointerDown(event, ${i})">${cardArt(c)}${costHtml}""",
"""  return `<div class="card ${RCOLOR[c.rarity]} ${(disabled||sealed)?'disabled':''}" style="--rot:${rot}deg" onpointerdown="cardPointerDown(event, ${i})">${cardArt(c)}${exhaustMark(c)}${costHtml}"""))

# 牌库列表加标签
EDITS.append((
"""<b>${card.name}</b> ×${total}${up>0?""",
"""<b>${card.name}</b>${exhaustChip(card)} ×${total}${up>0?"""))

# 放大镜弹窗加说明
EDITS.append((
"""    ${effectiveCost(c)>0?`<p style="color:var(--gold)">符文费用：${effectiveCost(c)}</p>`:''}
    <button class="btn ghost" onclick="hideOverlay()">收起</button>`;""",
"""    ${effectiveCost(c)>0?`<p style="color:var(--gold)">符文费用：${effectiveCost(c)}</p>`:''}
    ${isOneUse(c)?`<p style="color:var(--red2);font-weight:bold">消耗 · 每场战斗限用一次，战斗结束后回到牌库</p>`:''}
    <button class="btn ghost" onclick="hideOverlay()">收起</button>`;"""))

# ============ 四、机制：一局一次 → 一关一次 ============
# 4.1 newState 增加字段
EDITS.append((
"""    shiWangCard:null, ranhunType:null, ranhunSelf:null, endBlockKind:null };""",
"""    shiWangCard:null, ranhunType:null, ranhunSelf:null, endBlockKind:null,
    exhausted:[] };   // 本关已消耗的牌（战斗结束清空回牌库）"""))

# 4.2 startBattle 每场战斗重置
EDITS.append((
"""G.duhun=null; G.xiejia=0; G.zhouyuA=false; G.尸气=0;""",
"""G.duhun=null; G.xiejia=0; G.zhouyuA=false; G.尸气=0; G.exhausted=[];"""))

# 4.3 doPlayCard：改为存入本关消耗区，不动 G.deck
EDITS.append((
"""  const exNow = c.exhaust || (c.heroExhaust && c.heroExhaust===G.hero);
  const deckIndex = (c.type!=='junk' && exNow) ? G.deck.indexOf(c) : -1;
  const wasSkill = (c.type==='skill');""",
"""  const exNow = isOneUse(c);
  const wasSkill = (c.type==='skill');"""))

EDITS.append((
"""    if(exNow){ if(deckIndex>=0){ G.deck.splice(deckIndex,1); } log(`【${c.name}】已消耗（本局不再出现）`); }""",
"""    if(exNow){ (G.exhausted=G.exhausted||[]).push(c); log(`【${c.name}】已消耗（本关不再出现，战斗结束后回归牌库）`); }"""))

EDITS.append((
"""      if(exNow){
        if(deckIndex>=0 && !G.deck.includes(c)) G.deck.splice(Math.min(deckIndex, G.deck.length), 0, c);
      } else {""",
"""      if(exNow){
        const ei=(G.exhausted||[]).lastIndexOf(c); if(ei>=0) G.exhausted.splice(ei,1);
      } else {"""))

# 4.4 战斗结束：消耗牌回归牌库
EDITS.append((
"""  if(G.shiWangCard) returnShiWangCard(); // 尸王：战斗结束消散，牌回到弃牌堆""",
"""  if(G.shiWangCard) returnShiWangCard(); // 尸王：战斗结束消散，牌回到弃牌堆
  if(G.exhausted && G.exhausted.length){ const _n=G.exhausted.length; G.exhausted=[]; log(`本关结束，${_n} 张消耗牌回归牌库`); }"""))

# 4.5 存档：记录本关已消耗的牌（按下标，读档后映射回 G.deck）
EDITS.append((
"""    shiWangOut: !!G.shiWangCard,""",
"""    shiWangOut: !!G.shiWangCard,
    exhaustedIdx:(G.exhausted||[]).map(c=>G.deck.indexOf(c)).filter(i=>i>=0),"""))

EDITS.append((
"""    if(sw) G.shiWangCard = sw;
  }""",
"""    if(sw) G.shiWangCard = sw;
  }
  // 消耗牌：读档后按存档下标重新挂回本关消耗区
  G.exhausted=(d.exhaustedIdx||[]).map(i=>G.deck[i]).filter(Boolean);"""))

for i, (old, new) in enumerate(EDITS):
    n = s.count(old)
    if n != 1:
        print('EDIT #%d FAIL: 匹配 %d 次（期望 1）' % (i+1, n)); sys.exit(1)
    s = s.replace(old, new)

# 版本号 v0.52 → v0.53（锚 v0.52，全库应恰好 3 处）
nv = s.count('v0.52')
if nv != 3:
    print('VER FAIL: v0.52 匹配 %d 次（期望 3）' % nv); sys.exit(1)
s = s.replace('v0.52', 'v0.53')

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('PATCH o_oneuse DONE: %d 处替换 + 版本号 v0.53' % len(EDITS))

mm = re.search(r'<script>([\s\S]*?)</script>', s)
if not mm:
    print('FAIL: 找不到 <script>'); sys.exit(1)
js = mm.group(1)
fd, tmpp = tempfile.mkstemp(suffix='.js')
os.write(fd, js.encode('utf-8')); os.close(fd)
r = subprocess.run(['node', '--check', tmpp], capture_output=True, text=True)
os.unlink(tmpp)
if r.returncode != 0:
    print('NODE_FAIL:'); print(r.stderr); sys.exit(1)
print('NODE_OK (%d chars)' % len(js))
print('残留 G.deck.splice 消耗逻辑: %d' % s.count('本局不再出现'))
