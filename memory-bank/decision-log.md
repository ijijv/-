# Decision Log

## Decision 1
- **Date:** [Date]
- **Context:** [Context]
- **Decision:** [Decision]
- **Alternatives Considered:** [Alternatives]
- **Consequences:** [Consequences]

## Decision 2
- **Date:** [Date]
- **Context:** [Context]
- **Decision:** [Decision]
- **Alternatives Considered:** [Alternatives]
- **Consequences:** [Consequences]

## CSS 闸必须证「合法性」而非「文本存在」——新增注释结构闸 + 选择器前奏中文闸
- **Date:** 2026-09-28 17:23:09
- **Author:** HP
- **Context:** v0.71.0 一批里连踩三次 CSS 静默失败：.card.selected 是空规则；补样式时说明注释里写出注释起止符 ⇒ 注释提前截断 ⇒ 把紧随其后的规则整个判无效丢弃；v0.69.0 的 .exhaust-tag 修复同样被「解释该修复的注释」吃掉，数月无人发现（「被封印的牌描述看不全」悄悄回来）。当时 verify_dist 已有的「注释开闭数量配平」闸是绿的（正文里恰好先写起始符后写结束符 ⇒ 数量正好配平），同批新写的两条 .card.selected 闸是**子串**匹配、也全绿。即：**所有既有闸都无法发现「规则写在文件里但浏览器丢弃了它」**。
- **Decision:** 新增两条治本闸，且都用浏览器语义：① 注释**结构性**配平——逐字符扫描，但进了注释后起始符只是惰性文本、只有结束符能关掉它（第一版误按「配对括号」建模，把正文里的起始符当嵌套开 ⇒ 深度归位 ⇒ 照样报绿，等于白写）；报游离终止符行号与未闭合注释起始行（换算成整个文件行号）。② **选择器前奏里不许出现中文**——CJK 不可能是合法选择器的一部分，故前奏含中文 ⇔ 某条注释被截断、中文说明裸露成裸 CSS。②是几何上更强的判据：它证的是合法性，不是文本存在性。配套：`_drvclip.js` 新增 `rules=<子串>` 模式，递归扫 document.styleSheets（含 @media 内）找到规则本身 + 造同名元素读 getComputedStyle，两样都打才算证明规则生效。
- **Alternatives Considered:** 
  - 沿用「注释开闭数量配平」——已被证伪：本坑里正文先写起始符后写结束符，数量正好配平
  - 只加子串闸（.card.selected 那种）——已被证伪：真出事的版本上全绿
  - 靠实拍/越界表——CSS 静默失败对它们完全不可见
  - 只在注释里加写作规范（不写出起止符）——治不了本，且该项目已经写过这条规范却仍违反
- **Consequences:** 
  - verify_dist 从 133 增至 141 ok；本类「规则被吞」从此有闸可拦，且能直接报行号，不必再人工二分
  - 代价：闸与 CSS 注释写法强绑定——凡在注释里提「注释起止符」，必须用文字描述而非写出字符本身
  - 同批已按此规范回改 原型.html 与 _drvclip.js 中自己写坏的那段说明
  - JS 块注释同理，但那条路有 node --check 兜住语法错，CSS 没有这层网，故闸必须补在 CSS 侧
