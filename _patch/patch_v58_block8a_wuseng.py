# -*- coding: utf-8 -*-
# v0.58 Block8a：武僧（苦僧 B 列）第 1、3 条
#   ① 修 bug：格挡结算顺序——先由敌人攻击消耗格挡，再算「回合结束存留最多 3 点」
#      （原代码把 G.block=Math.min(3,G.block) 放在 enemyAct() 之前，导致本回合攒的格挡
#        还没挡伤害就先被压成 3）
#   ③ 初始卡池改为 10 张：雷符×2 金刚符×2 金钟罩×1 铁布衫×1 血契×1 反震×1 咒雨×1 守一×1
import io, sys, subprocess, tempfile, os, re

P = r"C:\Users\HP\Desktop\志怪塔\原型.html"
s = io.open(P, 'r', encoding='utf-8').read()
EDITS = []

# ---------- 1) 移除「敌人攻击之前」的存留压制 ----------
EDITS.append((
"""  // 苦行武僧：回合结束时保留最多 3 点格挡（卸甲生元[武僧#23B]持续期间不清零）
  // 卸甲生元(#23 A/C/D)的转化移到敌人攻击之后：格挡先挡伤害，剩余余量再结算（见 enemyAct 内 resolveEndBlock）
  if(G.hero === 'wuseng' && !(G.xiejia>0)) {
    G.block = Math.min(3, G.block);
  }
  if(G.weak>0) G.weak--;""",
"""  // 苦行武僧的「格挡存留最多 3 点」**不在这里**做——必须在敌人攻击消耗完格挡之后（见 enemyAct 末尾），
  // 否则本回合攒的格挡还没挡伤害就先被压成 3（v0.58 修复）。
  if(G.weak>0) G.weak--;"""))

# ---------- 2) 在敌人攻击全部结算完、回合开始之前做存留压制 ----------
EDITS.append((
"""  if(G.xiejia>0){ G.xiejia--; if(G.xiejia===0 && G.block>0){ const h=G.block; G.block=0; G.hp=Math.min(G.maxHp, G.hp+h); sfx('heal'); floatMsg(`卸甲生元 · 格挡化血 +${h}`); log(`卸甲生元：${h} 点格挡转化为生命`); } }
  resolveEndBlock();""",
"""  // 苦行武僧：敌人攻击全部结算完（格挡已按需消耗）之后，才算「格挡存留」——未用完的保留最多 3 点。
  // 卸甲生元[#23B]持续期间不清零（改为到期时整体转生命，见下一行）。
  if(G.hero==='wuseng' && !(G.xiejia>0)) G.block = Math.min(3, G.block);
  if(G.xiejia>0){ G.xiejia--; if(G.xiejia===0 && G.block>0){ const h=G.block; G.block=0; G.hp=Math.min(G.maxHp, G.hp+h); sfx('heal'); floatMsg(`卸甲生元 · 格挡化血 +${h}`); log(`卸甲生元：${h} 点格挡转化为生命`); } }
  resolveEndBlock();"""))

# ---------- 3) 武僧初始卡池 ----------
EDITS.append((
"""   deck:[['leifu',4],['jingang',4],['fodu',1],['tiebushan',1],['jingji',1]]},""",
"""   deck:[['leifu',2],['jingang',2],['jinzhong',1],['tiebushan',1],['xueqi',1],['fanzhen',1],['zhouyu',1],['shouyi',1]]},"""))

for i, (old, new) in enumerate(EDITS):
    n = s.count(old)
    if n != 1:
        print('EDIT #%d FAIL: 匹配 %d 次（期望 1）' % (i + 1, n)); sys.exit(1)
    s = s.replace(old, new)

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('PATCH v58_block8a_wuseng DONE: %d 处' % len(EDITS))
mm = re.search(r'<script>([\s\S]*?)</script>', s)
fd, tmpp = tempfile.mkstemp(suffix='.js')
os.write(fd, mm.group(1).encode('utf-8')); os.close(fd)
r = subprocess.run(['node', '--check', tmpp], capture_output=True, text=True)
os.unlink(tmpp)
if r.returncode != 0:
    print('NODE_FAIL:'); print(r.stderr); sys.exit(1)
print('NODE_OK')
