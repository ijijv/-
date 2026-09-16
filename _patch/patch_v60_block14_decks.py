# -*- coding: utf-8 -*-
# v0.60 Block14：天师 / 赶尸人 起始牌组互换修正
#   用户澄清：之前两次把两人的名单发反了。正确为——
#     天师 D   ：雷符×3 金刚符×1 佛渡×1 聚灵×1 渡魂归己×1 咒印×1 画皮×1 守一×1（10 张）
#     赶尸人 A ：雷符×2 金刚符×2 佛渡×1 舍身×1 血契×1 纸人×1 尸王×1 守一×1 小鬼×1（9 张）
#   注：尸王回到 A 起始牌组后，原型.html 里那套「开局必在手 / 存活期不进弃牌堆 /
#       消散才回堆 / 不可删除」的 ganshiren 专属机制才真正被激活。
import io, sys, subprocess, tempfile, os, re

P = r"C:\Users\HP\Desktop\志怪塔\原型.html"
s = io.open(P, 'r', encoding='utf-8').read()
EDITS = []

# —— 天师 D：换成原本错挂在赶尸人名下的那 10 张 ——
EDITS.append((
"""   deck:[['leifu',5],['jingang',4],['fodu',1],['zhouyin',1]]},""",
"""   deck:[['leifu',3],['jingang',1],['fodu',1],['juling',1],['duhunguiji',1],['zhouyin',1],['huapi',1],['shouyi',1]]},  // v0.60.02 天师初始卡池：雷符×3 金刚符×1 佛渡×1 聚灵×1 渡魂归己×1 咒印×1 画皮×1 守一×1（共 10 张）"""))

# —— 赶尸人 A：换回含尸王的 9 张 ——
EDITS.append((
"""   deck:[['leifu',3],['jingang',1],['fodu',1],['juling',1],['duhunguiji',1],['zhouyin',1],['huapi',1],['shouyi',1]]},  // v0.60 赶尸人初始卡池：雷符×3 金刚符×1 佛渡×1 聚灵×1 渡魂归己×1 咒印×1 画皮×1 守一×1（共 10 张）""",
"""   deck:[['leifu',2],['jingang',2],['fodu',1],['sheshen',1],['xueqi',1],['zhiren',1],['shi_wang',1],['shouyi',1],['xiaogui',1]]},  // v0.60.02 赶尸人初始卡池：雷符×2 金刚符×2 佛渡×1 舍身×1 血契×1 纸人×1 尸王×1 守一×1 小鬼×1（共 9 张）"""))

for i, (old, new) in enumerate(EDITS):
    n = s.count(old)
    if n != 1:
        print('EDIT #%d FAIL: 匹配 %d 次（期望 1）\n---%s---' % (i + 1, n, old[:120])); sys.exit(1)
    s = s.replace(old, new)

# 自检：4 个牌组里用到的 id 必须都真实存在于 CARDS
ids = set(re.findall(r"\[['\"]([a-z_]+)['\"],\s*\d+\]", s[s.index('const HEROES'):s.index('const HEROES') + 2000]))
missing = [i for i in ids if ("id:'%s'" % i) not in s]
if missing:
    print('FAIL: 牌组里出现不存在的卡 id: %s' % missing); sys.exit(1)
print('牌组 id 全部存在: %s' % ' '.join(sorted(ids)))

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('PATCH v60_block14_decks DONE: %d 处' % len(EDITS))
mm = re.search(r'<script>([\s\S]*?)</script>', s)
fd, tmpp = tempfile.mkstemp(suffix='.js')
os.write(fd, mm.group(1).encode('utf-8')); os.close(fd)
r = subprocess.run(['node', '--check', tmpp], capture_output=True, text=True)
os.unlink(tmpp)
if r.returncode != 0:
    print('NODE_FAIL:'); print(r.stderr); sys.exit(1)
print('NODE_OK')
