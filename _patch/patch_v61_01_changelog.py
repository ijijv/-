# -*- coding: utf-8 -*-
# v0.61.01 更新日志条目
import io, sys

P = r"C:\Users\HP\Desktop\志怪塔\更新日志.md"
s = io.open(P, 'r', encoding='utf-8').read()

ANCHOR = """> 每条对应一次 git 提交。查看方式：`git log --oneline`，或 `python 提交.py --log`。

"""
NEW = ANCHOR + """## v0.61.01 蓄力口径落定：只惠及单体攻击（2026-09-19）
> 你拍板：「不要让连击也吃蓄力加值」。这条原先只是**代码事实**（`enemyAct` 里只有 `case 'attack'` 消费 `pendingDamage`），但文案与预览都在说反话，现全部对齐。

- **文案**：关键词「蓄力」改为「敌人本回合不攻击，下回合的**单体「攻击」**额外加伤。连击/群体攻击不吃这份加值」；蓄力行动日志与意图预览同步改为「下回合单体攻击 +N」
- **预览修正（补掉最后一处口径不一致）**：`intentText` 拆出 `atkPlain`（不含蓄力）—— **连击**原本已排除蓄力，但**「攻击并格挡」**仍在预览里把蓄力算进去，而它实际结算既不叠加也不消耗蓄力。现三者（连击/群体/攻击并格挡）预览一律不含蓄力
- **代码注释**：`case 'charge'` / `case 'multi'` / `intentText` 三处标注口径来源，防止后续误改
- 冒烟 570 → **582 项全绿**（新增 12 条：multi/aoe 分支不读 `pendingDamage`、attack 既叠加又清零、charge 只累加不消费、三种意图的动态结算（单体 15 / 连击 12 保留蓄力 5 / 群体 7 保留蓄力 5）、三种预览、关键词与日志文案）
- 版本号 v0.61 → **v0.61.01**（本地提交，未 push）

"""
if s.count(ANCHOR) != 1:
    print('ANCHOR FAIL: %d 次' % s.count(ANCHOR)); sys.exit(1)
io.open(P, 'w', encoding='utf-8', newline='').write(s.replace(ANCHOR, NEW, 1))
print('CHANGELOG v0.61.01 DONE')
