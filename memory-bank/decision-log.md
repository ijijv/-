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

## TapTap 上传包从单文件改为多文件（拆包产物入 zip），先最小包真机验证
- **Date:** 2026-10-13（项目交接既定做法，待执行）
- **Author:** HP（交接文指定）
- **Context:** 现 `--taptap` 把 84 MB 自包含单文件压成 `game/index.html` 一个文件的 zip；
  多文件模块化可利用 TapTap 容器的分包/缓存，且与网页端 dist/web 口径统一。
  风险点：TapTap H5 容器对包内相对路径（js/、素材/、manifest、sw.js）的支持未经真机证实。
- **Decision:** 分两步。① 先产「最小多文件 zip」：复用 `打包.py` build_split 产出的 `dist/web/`，
  把 `dist/web/*` 整体打进 zip 的 `game/*`，交用户真机试传；
  ② 真机确认相对路径能跑后再做全量打包与脚本正式改造。
  保留既有合规自检：zip 第一级有且仅有一个纯英文/数字文件夹（game）+ 其下 game/index.html。
  改造动手前先 git commit 当前状态作为回退点。
- **Alternatives Considered:**
  - 直接改 build_taptap 全量切换多文件 —— 被否：容器相对路径支持未证实，失败要整轮回退。
  - 另起一套多文件打包逻辑 —— 被否：与 build_split 双份逻辑必然漂；必须复用 dist/web。
- **Consequences:**
  - `打包.py` 将新增多文件 zip 路径（build_split L339 / build_taptap L436 / main L494 为触点），
    单文件口径保持可用、互不覆盖。
  - 注意 split 产物含 PWA 注入（manifest.webmanifest、sw.js、icons/ 均为相对引用），
    TapTap 容器若不支持 SW 则需在最小包验证后决定是否剥离。
  - 最小包试传结果（能跑/不能跑、缺什么）必须回填本日志与 active-context。
- **Status（2026-10-13 接手 agent）：** 步骤①的脚本已就位 —— `打包.py` 新增 `--taptap-split`
  （`build_taptap_split` / `TAPTAP_SPLIT_OUT = dist/志怪塔_TapTap包体_多文件.zip`），
  复用 `build_split` 的 dist/web/，zip 内为 `game/*` 相对路径，保留合规自检。
- **Status（2026-10-13 接手 agent · 更新）：** `--split` 已重打完成、五道闸全绿（verify_dist /
  probe_dist / verify_web / _probe_cloud / run_smoke 1499/0）；`python 打包.py --taptap-split`
  已产出 `dist/志怪塔_TapTap包体_多文件.zip`（62.71 MB / 557 文件），包内自检通过
  （第一级唯一 game / game/index.html / js 相对外链 / ASSET_WEBP=true / 无绝对路径泄漏）。
  **待用户真机试传；试传结果（能跑/不能跑、缺什么）待回填。**
  若容器不认 Service Worker：第一排查方向 = 剥离 PWA 组件（只留 index.html + js/ + 素材/）。

## v1.1.15 多段攻击牌逐段平增减半（SEG_HALVE 结算窗口）
- **Date:** 2026-10-14
- **Author:** HP（Q8/Q9/Q10 口径）+ 接手 agent（实现）
- **Context:** 朱砂笔「攻击 +3」与开天眼/焚身咒/金刚酒的 turnAtkBuff 平增，原先对**每一段**多段伤害
  全额叠加（6 段雷谴符 = +18），过强。用户定口径：Q8 开天眼对多段牌每段增伤减半（升级前后同步减半，
  卡面写减半后数值）；Q9 朱砂笔对多段牌每段只 +1（⌊3/2⌋）；Q10 两条只作用玩家打出的攻击牌，
  敌人多段攻击不受影响。
- **Decision:** 引入全局开关 `SEG_HALVE`（30_engine.js L107）：`calcDamageTo` 在该窗口内把
  attackBuff / turnAtkBuff 各按 ⌊/2⌋ 计入（分别 floor 再相加）。只有三张「一牌多击」攻击牌
  （雷谴符 / 斩妖剑·天师列 / 钟馗镇魂·天师列）的 eff 在结算窗口内置 true（try/finally 兜底复位）。
  预览侧新增 `CARD_SEGS`（与 eff 同式给段数），预览把「每段减半值 × 段数」加进总伤，
  与实战逐段结算精确一致。敌人 multi 走 `dealDamageToPlayer` 不经 calcDamageTo 的玩家 buff 段，
  天然满足 Q10，无需改动。
- **Alternatives Considered:**
  - 给 calcDamageTo 加「当前牌段数」参数 —— 被否：调用点几十处，改动面大且易漏；
    全局开关 + try/finally 窗口只碰三张牌的 eff。
  - 噬魂术（o.segs）/ 咒雨·武僧（point=true）一并纳入 —— 被否：它们本就把加成只在总伤烘焙一次，
    逐字节等价，不动。
- **Consequences:**
  - 数值示例（未升级）：雷谴符 curse3+朱砂笔 15→9；斩妖剑 curse2+朱砂笔 29→23；
    钟馗镇魂 curse3+开天眼+4 41→33。
  - 卡面全文 t() 与短版 ts() 同步写明减半后数值（v0.69.0 数字闸要求逐元素相等 ⇒ 短版必须带数）。
  - 冒烟新增 11 条 v1.1.15 断言（纯函数层 13/17、三张牌实战 hp 掉落、预览×朱砂笔/开天眼、
    eff 源码含 SEG_HALVE 窗口、dealDamageToPlayer 不含 SEG_HALVE）。
