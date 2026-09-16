# -*- coding: utf-8 -*-
# v0.57 赶尸人卡池重写批次 — 第 3 块：尸王常驻手牌 + 死亡才入循环 + 不可删除
#   1. beginBattle（startBattle 内）：洗牌后，若赶尸人且场上无活尸王，把【尸王】强制移入手牌（每关开始都在手牌）
#   2. finishEndTurn 弃牌处：赶尸人手上未打出的【尸王】不清零、不弃（留手）
#   3. 三处删卡入口（篝火 campRemove / 商店 remove / 净坛 unknownRemove）：【尸王】不可删除
#   版本号维持 v0.57（本批次统一）
import io, sys, subprocess, tempfile, os, re

P = r"C:\Users\HP\Desktop\志怪塔\原型.html"
s = io.open(P, 'r', encoding='utf-8').read()

EDITS = []

# 1. beginBattle：尸王每关开始在手牌
EDITS.append((
"""  const beginBattle=()=>{ resetDeck(); if(!tutorialSeen()) startGuidedTutorial(); startTurn(); };""",
"""  const beginBattle=()=>{
    resetDeck();
    // 尸王（赶尸人）：每关开始必然在手牌。洗牌后把它从抽牌堆取回手牌（本关若还没打出召唤，牌在循环里）
    if(G.hero==='ganshiren'){
      const _sw = G.drawPile.find(c=>c.id==='shi_wang');
      if(_sw){ G.drawPile = G.drawPile.filter(c=>c!==_sw); G.hand.push(_sw); log('【尸王】已在手牌，随时可召唤'); }
    }
    if(!tutorialSeen()) startGuidedTutorial(); startTurn();
  };"""))

# 2. finishEndTurn 弃牌：尸王留手
EDITS.append((
"""  const kept=G.hand.filter(c=>c.retain);
  G.discard=G.discard.concat(G.hand.filter(c=>!c.retain));
  kept.forEach(c=>c.retain=false);
  G.hand=kept;""",
"""  // 守一保留 + 尸王（赶尸人）：未打出的【尸王】留手，不弃（打出/死亡后才入循环）
  const kept=G.hand.filter(c=>c.retain || (G.hero==='ganshiren' && c.id==='shi_wang'));
  G.discard=G.discard.concat(G.hand.filter(c=>!c.retain && !(G.hero==='ganshiren' && c.id==='shi_wang')));
  kept.forEach(c=>c.retain=false);
  G.hand=kept;"""))

# 3a. 净坛删牌 guard
EDITS.append((
"""function doUnknownRemove(i){
  const c=G.deck.splice(i,1)[0]; log(`焚符净坛：删除【${c.name}】`);
  hideOverlay(); goNext();
}""",
"""function doUnknownRemove(i){
  const c=G.deck[i];
  if(c && c.id==='shi_wang'){ floatMsg('【尸王】不可删除'); log('【尸王】不可删除'); return; }
  const cc=G.deck.splice(i,1)[0]; log(`焚符净坛：删除【${cc.name}】`);
  hideOverlay(); goNext();
}"""))

# 3b. 篝火删牌 guard
EDITS.append((
"""function doCampRemove(i){
  const c=G.deck.splice(i,1)[0]; log(`删除一张【${c.name}】`); sfx('card');
  G.campRemoved=true; saveRun(); renderCampfire();
}""",
"""function doCampRemove(i){
  const c=G.deck[i];
  if(c && c.id==='shi_wang'){ floatMsg('【尸王】不可删除'); log('【尸王】不可删除'); return; }
  const cc=G.deck.splice(i,1)[0]; log(`删除一张【${cc.name}】`); sfx('card');
  G.campRemoved=true; saveRun(); renderCampfire();
}"""))

# 3c. 商店删牌 guard
EDITS.append((
"""function doRemove(i){
  const p=removeCost();
  if(G.gold<p){ floatMsg(`金币不足（需 ${p}）`); log(`金币不足（需 ${p}）`); return; }
  G.gold-=p; G.deck.splice(i,1); G.removeCount++; log('删除一张牌'); saveRun(); renderRemoveList();
}""",
"""function doRemove(i){
  const p=removeCost();
  const tc=G.deck[i];
  if(tc && tc.id==='shi_wang'){ floatMsg('【尸王】不可删除'); log('【尸王】不可删除'); return; }
  if(G.gold<p){ floatMsg(`金币不足（需 ${p}）`); log(`金币不足（需 ${p}）`); return; }
  G.gold-=p; G.deck.splice(i,1); G.removeCount++; log('删除一张牌'); saveRun(); renderRemoveList();
}"""))

for i, (old, new) in enumerate(EDITS):
    n = s.count(old)
    if n != 1:
        print('EDIT #%d FAIL: 匹配 %d 次（期望 1）' % (i + 1, n)); sys.exit(1)
    s = s.replace(old, new)

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('PATCH v57_block3 DONE: 原型 %d 处' % len(EDITS))

mm = re.search(r'<script>([\s\S]*?)</script>', s)
js = mm.group(1)
fd, tmpp = tempfile.mkstemp(suffix='.js')
os.write(fd, js.encode('utf-8')); os.close(fd)
r = subprocess.run(['node', '--check', tmpp], capture_output=True, text=True)
os.unlink(tmpp)
if r.returncode != 0:
    print('NODE_FAIL:'); print(r.stderr); sys.exit(1)
print('NODE_OK (%d chars)' % len(js))
print('尸王不可删除 guard 数: %d' % s.count("'【尸王】不可删除'"))
