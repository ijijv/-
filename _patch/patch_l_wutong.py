# -*- coding: utf-8 -*-
# v0.50 → v0.51 五通神：现形即结算首回合（当前回合就加格挡/尸气/诅咒）+ 天师加回合限制（2/3 回合，修 indefinite 与设计表不符）
import io, sys, subprocess, tempfile, os, re

P = r"C:\Users\HP\Desktop\志怪塔\原型.html"
s = io.open(P, 'r', encoding='utf-8').read()

EDITS = []

# 1) addSummon 返回召唤物对象（供 eff 立即触发一次「回合开始」效果）
EDITS.append((
"""function addSummon(o){ G.summonsMadeTurn=(G.summonsMadeTurn||0)+1; G.summons.push(o); }""",
"""function addSummon(o){ G.summonsMadeTurn=(G.summonsMadeTurn||0)+1; G.summons.push(o); return o; }
/* 五通神「回合开始」效果（现形当回合立即结算一次，之后每个回合开始再触发；寿命 -1） */
function wutongTick(s){
  gainBlock(3);
  if(G.hero==='ganshiren'){ gainShiqi(1); log('五通神：获得 3 点格挡与 1 点【尸气】'); }
  else if(G.hero==='tianshi'){ const wt=randomAlive(); if(wt) applyCurse(wt,1); log('五通神：获得 3 点格挡并对随机敌人施加 1 层【诅咒】'); }
  else log('五通神：获得 3 点格挡');
  if(!s.indefinite) s.dur--;
}"""))

# 2) 卡面文案：四列全部改为「立即 + 之后每回合开始」；天师（永久）→ 持续 2/3 回合
EDITS.append((
"""    t:(u)=>G.hero==='ganshiren'?`召唤五通神。每回合开始获得 3 点格挡并获得 1 点【尸气】（持续 ${u?3:2} 回合）`
      :G.hero==='wuseng'?`召唤五通神。立即获得 4 点格挡。之后每回合开始获得 3 点格挡（持续 ${u?3:2} 回合）`
      :G.hero==='yincha'?`召唤五通神。立即恢复 4 点生命。之后每回合开始获得 3 点格挡（持续 ${u?3:2} 回合）`
      :`召唤五通神。每回合开始获得 3 点格挡，并对随机敌人施加 1 层【诅咒】（永久）`,
    eff:(u)=>{ if(G.hero==='wuseng'){ gainBlock(4); addSummon({type:'wutong', v:3, dur:u?3:2}); }
      else if(G.hero==='yincha'){ heal(4); addSummon({type:'wutong', v:3, dur:u?3:2}); }
      else if(G.hero==='tianshi'){ addSummon({type:'wutong', v:3, indefinite:true}); }
      else { addSummon({type:'wutong', v:3, dur:u?3:2}); }
      floatMsg('五通神 · 现形'); }},""",
"""    t:(u)=>G.hero==='ganshiren'?`召唤五通神。立即获得 3 点格挡与 1 点【尸气】，之后每回合开始重复一次（持续 ${u?3:2} 回合）`
      :G.hero==='wuseng'?`召唤五通神。立即获得 7 点格挡；之后每回合开始获得 3 点格挡（持续 ${u?3:2} 回合）`
      :G.hero==='yincha'?`召唤五通神。立即恢复 4 点生命并获得 3 点格挡；之后每回合开始获得 3 点格挡（持续 ${u?3:2} 回合）`
      :`召唤五通神。立即获得 3 点格挡并对随机敌人施加 1 层【诅咒】，之后每回合开始重复一次（持续 ${u?3:2} 回合）`,
    eff:(u)=>{ // 现形即结算首回合：第一次「回合开始」效果落在当前回合（武僧 = 立即 4 + 首次 3 = 7 格挡）
      if(G.hero==='wuseng'){ gainBlock(4); }
      else if(G.hero==='yincha'){ heal(4); }
      const s=addSummon({type:'wutong', v:3, dur:u?3:2});
      wutongTick(s);
      floatMsg('五通神 · 现形'); }},"""))

# 3) startTurn 里改为复用 wutongTick（避免两处逻辑分叉）
EDITS.append((
"""    else if(s.type==='wutong'){
      gainBlock(3);
      if(G.hero==='ganshiren'){ gainShiqi(1); log('五通神：获得 3 点格挡与 1 点【尸气】'); }
      else if(G.hero==='tianshi'){ const wt=randomAlive(); if(wt) applyCurse(wt,1); log('五通神：获得 3 点格挡并对随机敌人施加 1 层【诅咒】'); }
      else log('五通神：获得 3 点格挡');
      if(!s.indefinite) s.dur--;
    }""",
"""    else if(s.type==='wutong'){ wutongTick(s); }"""))

for i, (old, new) in enumerate(EDITS):
    n = s.count(old)
    if n != 1:
        print('EDIT #%d FAIL: 匹配 %d 次（期望 1）' % (i+1, n)); sys.exit(1)
    s = s.replace(old, new)

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('PATCH l_wutong DONE: %d 处替换成功' % len(EDITS))

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

# ---- 版本号 v0.50 → v0.51 ----
n = s.count('0.50')
if n != 3:
    print('VER FAIL: 0.50 匹配 %d 次（期望 3）' % n); sys.exit(1)
s = s.replace('0.50', '0.51')
io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('PATCH l_version DONE: v0.50 → v0.51（%d 处）' % n)

# ---- 设计表同步（#45 五通神；顺带补 #12/#33 —— 若文件被占用则跳过并提示） ----
T = r"C:\Users\HP\Desktop\新建文件夹\卡牌特性整合表.md"
try:
    t = io.open(T, 'r', encoding='utf-8').read()
    tbl = []

    old45 = '| 45 | 五通神 | 2 | 召唤五通神。每回合开始时获得 3 格挡，并获得 1 点【尸气】（持续 2/3 回合） | 召唤五通神。立即获得 4 点格挡。之后每回合开始获得 3 格挡（持续 2/3 回合） | 召唤五通神。立即恢复 4 点生命。之后每回合开始获得 3 格挡（持续 2/3 回合） | 召唤五通神。每回合开始时获得 3 格挡，并对随机敌人施加 1 层【诅咒】（持续 2/3 回合） |'
    new45 = '| 45 | 五通神 | 2 | 召唤五通神。立即获得 3 格挡与 1 点【尸气】，之后每回合开始重复一次（持续 2/3 回合） | 召唤五通神。立即获得 7 点格挡（4 点基础 + 首次触发 3 点）；之后每回合开始获得 3 格挡（持续 2/3 回合） | 召唤五通神。立即恢复 4 点生命并获得 3 格挡；之后每回合开始获得 3 格挡（持续 2/3 回合） | 召唤五通神。立即获得 3 格挡并对随机敌人施加 1 层【诅咒】，之后每回合开始重复一次（持续 2/3 回合） |'
    tbl.append(('45五通神', old45, new45))

    # v0.50 遗留（上一批被文件占用未写入）
    tbl.append(('12嗜血', '造成 6/8 伤害。目标每有 1 层【诅咒】，此牌伤害 +1（上限 +6）', '造成 6/8 伤害。回复等于造成伤害的 50% 的生命'))
    tbl.append(('33渡魂', '| 33 | 渡魂归己 | 1 | 对敌人造成伤害的 30%/50% 转化为生命 | 对敌人造成伤害的 30%/50% 转化为生命 | 对敌人造成伤害的 30%/50% 转化为生命 | 对敌人造成伤害的 30%/50% 转化为生命 |',
                '| 33 | 渡魂归己 | 1 | 消耗。接下来 5 回合，对敌人造成伤害的 30%/50% 转化为生命 | 消耗。接下来 5 回合，对敌人造成伤害的 30%/50% 转化为生命 | 消耗。接下来 5 回合，对敌人造成伤害的 30%/50% 转化为生命 | 消耗。接下来 5 回合，对敌人造成伤害的 30%/50% 转化为生命 |'))

    for tag, o, nw in tbl:
        c = t.count(o)
        if c != 1:
            print('TABLE %s 跳过：匹配 %d 次（可能已同步）' % (tag, c)); continue
        t = t.replace(o, nw)
        print('TABLE %s 已同步' % tag)

    io.open(T, 'w', encoding='utf-8', newline='').write(t)
    print('PATCH l_table DONE')
except PermissionError:
    print('PATCH l_table SKIPPED: 设计表被占用（PermissionError），请关闭后重跑')
