# -*- coding: utf-8 -*-
# 【血祭阴差增强 → 设计表同步】卡牌特性整合表.md
# 与 原型.html 的 patch_xuenu_passive.py 对应（2026-09-09 拍板）：
#   ① 规则#3：血怒「跨战斗保留」→ 整局累积（开新局才清零）
#   ② 规则#4：失去生命口径加阴差被动例外（打出扣血牌失血 → +1【血怒】），
#      并顺带清掉已被删除的"小妖"引用
#   ③ #7 铁布衫 C：删「，获得 2 层【血怒】」（改由被动按失血 1:1 提供，避免双算/误导）
#   ④ #17 金光罩 C：同上
# 全用不含弯引号的锚点子串做精确匹配（设计表内原文含全角引号，避免引号歧义）。
import io, sys

P = r"C:\Users\HP\Desktop\新建文件夹\卡牌特性整合表.md"
s = io.open(P, 'r', encoding='utf-8').read()

EDITS = []

# ① 规则#3 尾部
EDITS.append((
"上限 10、跨战斗保留。",
"上限 10、整局累积（开新局才清零）。"))

# ② 规则#4：失去生命口径 + 阴差被动例外
EDITS.append((
"，仅用于卡面计数；不触发血怒 / 小妖被动。",
"，仅用于卡面计数；本身不触发【血怒】。**阴差被动例外**：阴差打出扣血牌时，每失去 1 点生命自动 +1【血怒】（2026-09-09 增补，取代 #7 / #17 卡面自带 +2）；反震 / 洗髓经 / 移形换影等非\"打出扣血牌\"时机的触发按各自卡面产出【血怒】，不受此被动叠加。"))

# ③ #7 铁布衫 C
EDITS.append((
"造成等于当前格挡的伤害。失去 2 点生命，获得 2 层【血怒】",
"造成等于当前格挡的伤害。失去 2 点生命"))

# ④ #17 金光罩 C
EDITS.append((
"获得 10/14 格挡。失去 3 点生命，获得 2 层【血怒】",
"获得 10/14 格挡。失去 3 点生命"))

for i, (old, new) in enumerate(EDITS):
    n = s.count(old)
    if n != 1:
        print('EDIT #%d FAIL: 匹配 %d 次（期望 1）' % (i + 1, n))
        sys.exit(1)
    s = s.replace(old, new)

try:
    io.open(P, 'w', encoding='utf-8', newline='').write(s)
except PermissionError:
    print('FAIL: 文件被占用（可能 Word 打开中），无法覆写'); sys.exit(1)
print('PATCH xuenu_doc_sync DONE: %d 处替换成功' % len(EDITS))
