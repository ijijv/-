# -*- coding: utf-8 -*-
# v0.57 赶尸人卡池重写批次 — 第 2 块：卸甲生元 A 列（赶尸人）回合结束自动转化
#   - 卡面 t（#23 A）：改为「回合结束自动将剩余格挡换算为【尸气】：每保留 2 点，获得 1/2 点（无论敌人是否攻击）」
#   - eff（#23 A）：登记 G.xiejiaUp=!!u（升级态）+ floatMsg 同步
#   - newState：加 xiejiaUp:false
#   - finishEndTurn 末尾（enemyAct 之前）：A 列回合结束自动换算剩余格挡
#   版本号维持 v0.57（本批次统一，不再逐块升号）
import io, sys, subprocess, tempfile, os, re

P = r"C:\Users\HP\Desktop\志怪塔\原型.html"
s = io.open(P, 'r', encoding='utf-8').read()

EDITS = []

# 2.1 卡面 t：A 列文案 -> 回合结束自动换算（升级每 2 格挡 2 尸气）
EDITS.append((
"""    t:(u)=>G.hero==='ganshiren'?`获得 ${u?7:5} 点格挡。敌人攻击后若还有剩余格挡，每保留 2 点，获得 1 点【尸气】`""",
"""    t:(u)=>G.hero==='ganshiren'?`获得 ${u?7:5} 点格挡。回合结束自动将剩余格挡换算为【尸气】：每保留 2 点，获得 ${u?2:1} 点（无论敌人是否攻击）`"""))

# 2.2 eff：A 列记升级态 + floatMsg
EDITS.append((
"""    eff:(u)=>{ if(G.hero==='ganshiren'){ gainBlock(u?7:5); G.endBlockKind='A'; floatMsg('敌人攻击后格挡将转为尸气'); }""",
"""    eff:(u)=>{ if(G.hero==='ganshiren'){ gainBlock(u?7:5); G.endBlockKind='A'; G.xiejiaUp=!!u; floatMsg('回合结束格挡将自动转为尸气'); }"""))

# 2.3 newState 加 xiejiaUp:false
EDITS.append((
"""    shiWangCard:null, ranhunType:null, ranhunSelf:null, endBlockKind:null,""",
"""    shiWangCard:null, ranhunType:null, ranhunSelf:null, endBlockKind:null, xiejiaUp:false,"""))

# 2.4 finishEndTurn 末尾（enemyAct 前）：A 列回合结束自动换算
EDITS.append((
"""  if(G.weak>0) G.weak--;
  enemyAct();
}""",
"""  if(G.weak>0) G.weak--;
  // 卸甲生元 A 列（赶尸人）：回合结束自动把剩余格挡换算成【尸气】，无论敌人是否攻击
  if(G.endBlockKind==='A' && G.block>0){
    const _bk=G.block; const _q=Math.floor(_bk/2)*(G.xiejiaUp?2:1);
    G.block=0; G.endBlockKind=null; G.xiejiaUp=false;
    if(_q>0){ gainShiqi(_q); log(`卸甲生元：${_bk} 点格挡转为 ${_q} 点【尸气】`); floatMsg(`尸气 +${_q}`); }
  }
  enemyAct();
}"""))

for i, (old, new) in enumerate(EDITS):
    n = s.count(old)
    if n != 1:
        print('EDIT #%d FAIL: 匹配 %d 次（期望 1）' % (i + 1, n)); sys.exit(1)
    s = s.replace(old, new)

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('PATCH v57_block2 DONE: 原型 %d 处' % len(EDITS))

mm = re.search(r'<script>([\s\S]*?)</script>', s)
js = mm.group(1)
fd, tmpp = tempfile.mkstemp(suffix='.js')
os.write(fd, js.encode('utf-8')); os.close(fd)
r = subprocess.run(['node', '--check', tmpp], capture_output=True, text=True)
os.unlink(tmpp)
if r.returncode != 0:
    print('NODE_FAIL:'); print(r.stderr); sys.exit(1)
print('NODE_OK (%d chars)' % len(js))
print('残留旧A文案(敌人攻击后每保留2得1): %d   新A文案(回合结束自动): %d' % (
    s.count('敌人攻击后若还有剩余格挡，每保留 2 点，获得 1 点'), s.count('回合结束自动将剩余格挡换算为【尸气】')))
print('xiejiaUp 引用总数: %d' % s.count('xiejiaUp'))
