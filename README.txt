《志怪塔》—— 中式志怪 Roguelike 卡牌爬塔小游戏
================================================

这是项目的文件夹，所有文件都在这里。

📄 文件说明
  · 立项文档.md  → 游戏核心设定（玩法 / 变现 / 技术栈 / 下一步）
  · 数值表.md    → 卡牌 / 敌人 / Boss / 遗物的数值
  · 卡牌敌人图鉴.md → 全部卡牌（含升级）+ 敌人（含意图）的整理图鉴
  · 原型.html    → 可玩原型（双击用浏览器打开；但想让 素材/sfx/ 里的音效生效，用 python 试玩.py 起本地服务再开）
  · 试玩.py      → 起本地 http 服务并打开原型（外置音效/素材探测需要 http，file:// 下浏览器会拦）
                   ⚠️ 只有**开发树**（原型.html + js/ + 素材/）需要它。打包产物不需要，见下面「发给别人试玩」
  · 打包.py      → 把 原型.html + js/ + 素材/ 打成**一个自包含的离线 HTML**（图片转 WebP + 全部 base64
                   内联 + JS 混淆），产物在 dist/。这就是发给别人试玩的那一个文件
  · 素材清单.md  → 音效/BGM/角色动画/背景的素材平台 + 搜索关键词
                   （音效不用读全篇：直接跳 §1.6「按文件平铺交付单」，一文件一行、带提示词）
  · 9大Boss设计表.md → 三幕 9 个 Boss（现有 3 + 新设计 6）机制与数值，待调
  · 敌人词缀总结.md → 后期敌人 8 大词缀总结，供设计 Boss 机制参考
  · README.txt   → 本说明文件

📦 发给别人试玩（**只要一个文件，对方什么都不用装**）
  发这个：dist/志怪塔.html（也可以先复制成 dist/志怪塔·试玩版 vX.YZ.html 再发，内容一样）
  · 对方**双击就能玩**。不需要 Python、不需要 素材/ 文件夹、不需要 js/ —— 图片/BGM/音效
    全部 base64 内联在这一个文件里，总共 489 个素材（图 360 / 音 129）、约 33 MB。
    · 手机端性能：30 张特效精灵图（3840×2880 整图）在这里被**按排切成 170 张小图**
      （键 fx/<名>_r<行>.png，逐像素不变）—— 整图一次要解 11 Mpx ≈ 42 MB，手机图片缓存留不住，
      每次出牌都重解一遍（真机 100~200ms，就是「打出手牌那一瞬间卡」）。按排只解 1.8 Mpx。 
      所以「图」的个数里有 170 个是这 30 张拆出来的；拆包产物与开发树**不拆**，仍用整图。
  · 手机也能玩：把这个文件拷进手机（微信传给自己 → 保存 → 用浏览器打开）即可。
  · 想自己重新生成：在本文件夹里跑 `python 打包.py`（约半小时，图片要重新压一遍；
    `--quality 60` 更小、`--no-obfuscate` 跳过混淆）。产物覆盖 dist/志怪塔.html。
  · **为什么不需要 试玩.py**：那个 .py 唯一的作用是「起个本地 http 服务」，好让开发树能按
    `素材/sfx/xxx.mp3` 这样的**相对路径**取到音效 —— file:// 下浏览器会拦这种 fetch。
    打包把同一批文件内联进了 ASSET_MAP，取的是 `data:` URI，而 data: URI 在 file:// 下
    fetch 是通的（已实测：真取到字节并解出 AudioBuffer）。所以产物双击就有音效，
    那道「file:// 就跳过外置音效」的闸对产物不成立（它只在**没有** ASSET_MAP 的开发树上生效）。
  · 测出来没问题的是这些：dist 里 ASSET_MAP 489 键（含 sfx/ 123 个、music/ 6 个，值全是
    data:audio/…）、地图卷轴三张纹理被 assetURL 覆盖成内联、存档读写不抛异常 ——
    都有常驻闸（`python _patch/probe_dist.py`）。

📱 手机上试玩（电脑和手机连同一个 Wi-Fi）
  1. 在电脑上、本文件夹里起服务：python -m http.server 8000 --bind 0.0.0.0
     ⚠️ 必须绑 0.0.0.0，不能省 —— http.server 默认只绑 127.0.0.1（仅回环），
        那样电脑上一切正常、手机却永远打不开，是最容易踩的一个坑。
  2. 查电脑的局域网 IP：ipconfig → 「无线局域网适配器 WLAN」的 IPv4 地址（如 10.16.81.48）。
  3. 手机连同一个 Wi-Fi，浏览器开 http://<那个IP>:8000/
     根目录的 index.html 会自动跳进游戏，所以敲 IP 就行，不用带文件名。
  4. 改了代码手机上看到的还是旧版时，先**下拉刷新**破缓存。
  打不开就在这个顺序上排：① 服务还在不在跑（关掉那个命令行窗口服务就没了，
  这是最常见的原因）② IP 是不是变了（DHCP 会换）③ 电脑防火墙有没有放行 python.exe
  ④ 路由器是不是开了 AP / 客户端隔离。

📊 版本里程碑
  本节**每次发版重写一份**：一行一个版本，只写这一版做了什么；改了什么、为什么这么改、
  踩过哪些坑、哪些是明确挂账，全在 更新日志.md 里，**不在这里堆平铺清单**。
  版本号只有**一个落点**：原型.html 的 <title>（提交.py 从这里读；v1.1.x 起常驻页面左上角的
  `#ver-tag` 也作为开发者痕迹摘除 —— 进游戏就看不见的那枚水印不算给玩家看的版本号）。

  v1.1.20  音效接线批（用户 2026-10-15 txt「先把挂账的音效做了」）+ 预览页重做：
             ① 腐毒跳伤音 boom→atk_aoe（txt 16）；僵王 / 阎罗天子「召唤」槽 `_self` 音效一度改用
                通用 enemy_summon（txt 29/52）—— **⑨ 已按用户口径改回各自采样**；【嗜血】卡音效 atk_slash→thorns
                （音效库口径「thorns 用于嗜血」，thorns 由孤儿文件转正）
             ② 「音效保留前 N 分之 1」四条落地（txt 35/36/47/50）：新增 `SFX_FRAC` per-key 截断表，
                `playSample` 支持 `frac` —— 真采样按 `buf.duration*frac` 截断、合成兜底不截
                （血尸蓄力重击 1/2、孟婆忘忧 2/3、修罗王业火附体 1/2）；txt 14「敌人蓄力音长了」暂取 0.6
             ③ `b2_hanba_burn_tick` 一度标「弃用」（勘误：它从来没有发射点，灼烧跳伤播的是 kw_burn）
                —— 键位保留不动，零引用；**⑨ 已按用户后续口径改回「引用到游戏中」，本条旧口径作废**
             ④ 特效音效预览.html 重做：FX 参数表**逐条照抄** `js/20_data.js` 的 `FX_SHEETS`
                （消灭手抄漂移，此前停在 v1.1.18）、渲染支持 `op` 字段、`playSfx` 认 `.wav`
                （修掉「damage_reflect / lightning 没有音效」的**假报障** —— 这两个键只有 .wav，
                旧预览只试 .mp3 故静音，游戏内一直正常）、Boss `_hit`/`_link` 段不另出声
             ⑤ 挂账项（**⑧ 已按用户拍板逐条落地**）：4 条「换个音效」已换真采样、其余 10 条继续保留观望；
                8 条「改挂点 / 锚点」已落地；「删掉这个」五处 + lifesteal_link 共 6 条特效已删（键位与素材一并删）；
                `damage_reflect` 保留 spark 不动（见下 ⑧）
             ⑥ 当天复核补丁：boss 九条 `_cast` 的「上移量」由半个单帧宽（oy 0.5）调低到四分之一
                （oy 0.25，用户反馈 0.5 移得太高）；预览页 `_hit` 静音规则放宽为「Boss 三件套才静」
                —— 旧规则 `/_hit$|_link$/` 一刀切，把独立的 fudu_hit（腐毒跳伤 → atk_aoe）也静了，
                预览里点它没声（实机接线本就正常：atk_aoe 已注册、素材存在）
             ⑦ 同日追加（用户跨轮口径）：**帧截断与音效截断全部回调** —— 骨铃吸血 / 浅显荆棘回全长
                （f 48，荆棘同时撤销降透明度）、金钟罩 24→41、9 条 boss `_cast` 回 32 帧（蓄力重击
                16→32）、`SFX_FRAC` 四条清空；保留 oy 0.25（上移量）与各处 scale（大小修正）不动。
                另：万剑归宗 / 勾魂「换个特效」换 8 列 6 行新精灵图（scale / ox 按 PIL alpha 含量实测量）；
                两者音效改用用户指定采样，新增 `SFX_TABLE` 键 `wanjian` / `gouhun`（SFX_KEYS 117→119，
                勾魂非 Boss 分支 kw_gouhun→gouhun，词缀勾魂仍走 kw_gouhun）
             ⑧ 同日第二轮（用户跨轮口径「先改这 4 个音效，剩余 10 个保留；那 5 条特效可以删去，改挂点 /
                锚点 8 条也进行去」）：**4 个音效换真采样** —— 天雷正法 `tianlei`、雷符·断刃雷符 `lei`、
                镇妖铃 `zhenyaoling`、嗜血 `thorns`（旧 thorns_1/2.mp3 已删，确保单一变体不随机串播）；
                **删特效 6 条**（4 条 `_link` 连接段 + b2_hanba_burn_apply_hit + b3_xueshi_charge_self +
                b3_xueshi_lifesteal_link）：FX_SHEETS 键 85→79（39 基础 + 40 boss）、素材 png 删除、
                20_data 的 BOSS_DEF 对应槽去掉、`bossLinkFx` 平铺播放器整体摘除、打包.py 对应项删去；
                **改挂点 8 条** —— 手牌 4 条（尸王 / 纸人 / 小鬼 / 阴兵）改锚「刚打出的那张手牌」中部
                （新增 `handcard` 锚点，位置复用 `notePlayRect` 量下的 `LAST_PLAY_RECT`，牌飞走后特效留在原位播完）、
                僵尸 / 忘忧落「底部坐标」（新增 `bottomAnchor` / `playerBottomAnchor`，矩形尺寸不变故特效大小不缩水）、
                僵王吸食挂小僵尸身上、阎罗召唤挂新阴差底部；`damage_reflect` 音效保持 spark 不变；
                `relic_proc` 补上真采样
             ⑨ 三条旧采样「引用到游戏中」：`b2_hanba_burn_tick`（灼烧跳伤由 kw_burn 改播它）、
                `b1_jiangwang_summon_minion` / `b9_yanluo_summon_yinchai`（召唤槽改回各自采样，
                `bossSelfFx` 去掉音效覆盖参数）；另补 relic_proc / ui_stele / ui_curtain / ui_poster / ui_drag
                五条真采样（ui_stele 因实机该点已走 stone_broken，暂列「有素材·无引用」）
             ⑩ 删遗留键 `hit`（新代码按伤害分级走 hit_light/hit_heavy/hit_crit，hit 仅供兼容、实际不再触发）：
    SFX_TABLE −1 +4（tianlei / lei / zhenyaoling / relic_proc）⇒ 119→122。
    `relic_proc` 此前既无采样也不在表内（命中 sfxWarnUnknown 静默吞掉，30_engine.js:666 金刚杵），
    用户补采样后必须**同时补登记** —— verify_dist [2b] 要求 176 个音效文件「键键登记在表」，
    否则磁盘上这个 wav 会被判成「未知键名」（本轮首跑即在此处报红）。
    冒烟基线 1534→1533（金快照少 1 键；`leifu` 点名音由 atk_talisman 改判 lei）
             ⑪ 同日第三轮（用户跨轮口径，仍归 v1.1.20 不升版）：**万剑归宗逐敌落点** —— 新增锚点语义
                `a:'enemies'`（CARD_FX.wanjian 由 `field` 改 `enemies`），cardPlayFx 遍历 aliveEnemies()
                对每只存活敌人各播一份（key 带 uid 后缀避免同名互掐），全死则退回战场中心；
                **「立绘底部」改指脚部** —— bottomAnchor 优先解析敌人 `.eportrait`（立绘框，其下缘=脚部；
                原先传整个 `.enemy` 下缘是**名字标签**，故特效落在脚下面一段距离）；**弃牌接勾魂特效** ——
                敌人【缠绕 discard】意图补 `playFx('gouhun','player')`（原只有 sfx）。冒烟基线不变 1533/0。
             ⑫ 同日第四轮（用户跨轮口径，仍归 v1.1.20 不升版）：**两条新音效接入** ——
                `wangyou.wav`（忘忧 / 词缀 debuff：30_engine 非 Boss 分支由 `enemy_debuff` 改播 `wangyou`）、
                `jinzhong.mp3`（获得格挡的收口点 `gainBlock`，靠新增 `G._playCardId` 只认本张金钟罩，
                免得别的牌加格挡时也响）；**咒雨特效** `purple_rain`（8 列 6 行新素材、`a:'enemies'` 逐敌落点，
                接咒雨牌）；**10 条 boss `_cast` 起手换 8 列 6 行新图** —— 只换起手这一套（同一技能挂角色 /
                挂 Boss 的两份特效里 `_hit` 那套逐字节未动），f 32→48、rows 4→6；
                **全量 fx 精灵图合成格 480→240**（81 张里 80 张 ×0.5 等比重采样，
                整张插图的 `daoxin_full` 除外 —— playFx 的屏上尺寸由锚点盒决定、与源图格尺寸无关
                ⇒ 观感不变；单文件产物「按排」后的解码量随之减到约 1/4）。冒烟基线不变 1533/0。
             ⑬ v1.1.20r2（用户真机复核两处）：**撤掉 10 条 `_cast` 的 oy 0.25** —— v1.1.19 ③ 加的
                「上移半个单帧宽」（v1.1.20 ⑥ 收到 0.25）实机观感仍偏上，用户要求「改回正常水平」
                ⇒ oy 不写 = 0（内容框中心落回锚点中心），scale 原样不动；
                **咒雨音效改走连击音效** —— CARD_SFX.zhouyu `atk_aoe`→`atk_multi_each`（＝苦僧咒雨那套
                逐点连击每段响的音），且 CARD_FX.zhouyu 加 `stg:120` ⇒ 咒雨特效**逐敌逐个叠加**
                （每个敌人各一份、隔 120ms 落一个、key 带 uid 各自独立叠加）以搭配连击节奏；
                咒雨是 4 个角色（天师/苦僧/赶尸人/阴差）共用的同一张牌 ⇒ 一改全部角色生效。
             ⑭ v1.1.20r3（用户真机复核两处，仍归 v1.1.20 不升版）：
                **锦囊 / 牌堆 的战局外 HUD 图标一直没用用户素材** —— 根因不是素材没进包
                （素材/ui/menu/jinnang-nobg.png、素材/ui/deck_back.png 都在），
                而是 outHudSync() 把 iconTag() 的两句赋值锁在 `if(!OUT_HUD_BUILT)` 里（false→true 只走一次），
                而 iconTag 的探图是**异步**的（首帧必回落占位；图 onload 之后只重跑 render()、
                不会重建 out-HUD）⇒ 那次写进去的永远是占位。改成每帧比对最新结果、变了才写
                （与 syncJinnangIcons() 同一套口径），并删掉 OUT_HUD_BUILT。
                回落串按用户口径**不再用 emoji**（那几个占位字形在真机上会渲染成彩色方块 / 空框，
                根本认不出是锦囊还是牌堆）—— outHudSync 的两枚图标与商店「飞向牌堆」的牌背
                一律改文字「锦囊」「牌堆」（原型.html 里写死的 emoji 占位也同时清空），
                并新增 hudIconPrewarm() 开局预热（用 iconAvail 先探一遍，免得进地图第一帧先闪回落文字）。
                **排行榜「整局得分 / 留名日期」看着像没数据** —— 其实一直在渲染（把截图放大能看到
                5,095 / 10,288 / 10,948 与 10.14 / 10.13 / 10.12），但本机榜每一行都是「我」
                ⇒ 整表套 .rk-tr.me 深色底纹（实测像素 ≈ #8c7d55），而这两列的 #8a6a3c 与该底纹几乎同色
                ⇒ 对比度趋零、字看着糊掉。按用户口径把这两列改成与「通关用时」同一种红 #7c2118
                （三列同色、深浅底都读得清；上一轮试过的「只给 .me 行加浅金」已撤销）。
                冒烟基线 1533→1534（新增 1 条「不再有 OUT_HUD_BUILT 一次性闩」的回归断言）。
             ⑮ v1.1.20r4（用户跨轮口径「A」，仍归 v1.1.20 不升版）：**拆包档（dist/web）也按排拆 fx 精灵图**。
                背景：单文件 / TapTap 单文件产物早就按排拆（fx/<名>_r<行>.png，出牌只解一排），
                但网页 / PWA 用的**拆包产物一直挂整图** —— v1.1.20r 起合成格 480→240 后整图仍是
                1920×1440、2.76 Mpx ≈ 10.5 MB（81 张合计约 704 MB），手机图片缓存留不住 ⇒ 每次出牌重解。
                做法（用户拍板「保合成格 240、拆包也按排拆」）：打包.py 的 build_split 命中 fx/<键>.png
                且非整张插画（FX_WHOLE_SKIP）时，按排切成 素材/fx/<键>_r<i>.webp 落盘（整图 .webp 不再落盘），
                几何判定与单文件共用同一处 fx_row_crops（不抄第二份）；并把 00_base.js 的
                `var FX_ROW_KEYS = null;` 桩注入成 {"<键>": <排数>, …}（与 ASSET_WEBP 同一套注入手法）。
                运行时把「是否按排拆」的判据**统一**到 fxRowKeyed()（playFx / fxSeek / fxStripURL /
                fxPreheatKeyRow0 / fxPreheatBattle 五处，不再各处裸判 ASSET_MAP）—— 单文件看 ASSET_MAP、
                拆包看注入的 FX_ROW_KEYS，两者皆无（开发树 / 冒烟宿主）走整图老路，行为逐字节不变。
                闸与回归：verify_web 的 [2] 加「恰有一个 js 注入 FX_ROW_KEYS」、[3] 改成承认按排键
                （源 fx 整图 ↔ 产物 _r0.._r(n-1)）并加 [3b] 几何互核（行数 == FX_SHEETS.rows、宽 == 源宽、
                行高 == 源高/排数）；冒烟基线 1534→1536（新增 2 条按排判据回归断言）。
  v1.1.25  教程试玩反馈批（用户 2026-10-16 真机试玩 v1.1.24 后报障，4 类）：
             ① **教程卡死根因**：强制出牌（「执一道雷符」）期间「结束回合」没有锁 —— 玩家可直接过回合，
                下一回合手上没那张符，打不出也过不去 ⇒ 死锁。修法：`endTurn()` 顶上补 force 守卫
                （与 playCard 同源锁：`sfx('error') + floatMsg('先听师父的话') + return`），键盘空格同路被拦。
             ② **旁白气泡**：旧版队列抽干时 `narrateNext()` 直接 return ⇒ 气泡永久挂屏、挡手牌区 / 抽牌堆；
                `box.onclick` 只在泡内可点。修法：队列空即 `narrateDrop()` 收泡；改用**全局捕获相 pointerdown**
                收**非强制泡**（用户口径「非提示的旁白点一下就该过」，与 bindSaySkip 同一条常驻监听的理由）；
                位置从**左下**移到**玩家与敌人之间**（居中，不再压左下「符」字图标与手牌区）；
                **去掉「符」字头像**（用户原话）—— 改以名字行标识说话人，妖物（TUT_WHO 登记）加 `.foe` 鬼气边框；
                容器 `pointer-events:none`、只 `.bubble` 可点 ⇒ 透明区绝不吃手牌拖拽落点。
             ③ **待机呼吸 / 阵亡动画**（用户跨轮口径：先要「角色没有左右轻摆，敌人也是」，
                真机复核后又「角度有点大…一致统一的频率和同步的摇摆十分奇怪，像是一起舞蹈…
                你能做成呼吸式的吗？幅度依旧不要太多」）：改为**只给精英与 boss** ——
                新增 `@keyframes idleBreath` 挂**子立绘**（`.enemy.e-elite / .enemy.e-boss` 的 `.eportrait`，
                带 `:not(.dying)` 免得消散时叠加；`.enemy` 自身用 transform 定位 --ex/--ey 绝不可动），
                origin 底、纵向 2.2% / 横向 0.4% 极轻起伏，boss 慢一档（4.6s）且错相 1.1s；
                **normal / 召唤物 / 玩家立绘一律不挂**（上一版全员 3.8s 同频同相左右摆已撤）。
                新增 `@keyframes heroDie`（倾倒 + 淡出）挂父盒 `.hero-art-box.hero-dead`（`heroDeath(on)` 加/摘类，
                loseGame / tutOnDeath 加、startBattle / revive 摘）；`enemyDie` 补 rotate 让「死」更像死
                （450ms 时长不动）。矮屏 / prefers-reduced-motion 尊重。
             ④ **玩家↔妖物互动对话** 13 条（`教程对话脚本.md` 为设计档，id 纯 ASCII）：3 关共 13 句
                （游魂 3 / 天师 3 / 白无常 2 / 僵王 3 / 天师 2 …按关编排），说话人由 `TUT_WHO` 区分；
                教程中妖物自带四档气泡**整体让位**（`enemySay` 教程早返回），避免同屏双泡。
                **本批先出文本**；mp3 由用户随后交付，见 ⑤。
             ⑤ **教程配音接线**（用户 2026-10-16「我把对话的mp3都准备好了，你检查一下，然后用起来」）：
                用户按 `TUT_NARR` 的 id 逐条交付 mp3（`素材/voice/<id>.mp3`，纯 ASCII、一律 .mp3、无变体）。
                新增**专用配音通路**（10_audio.js 的 `playVoice` / `stopVoice` / `voiceLoad`，取址走
                `assetURL`，**绝不经 sfx 的合成音回落** —— 没人声宁可静音，也不要程序化合成的假念白；
                不塞 SFX_TABLE 是因为音效要变调、随机变体，且 SFX_KEYS 有预解码上限，而人声是逐条唯一的固定念白）。
                挂点：`narrateShow` 出泡即发声、`narrateDrop`/`narrateClear` 收泡即掐声；另三处整屏面板
                单独挂 —— `showTutIntro`(tut_00) / `tutGraduate`(tut_6e) / `tutOnDeath`(tut_die)，
                `tutFinish`/`tutRetry` 收尾掐声。未就绪的缓冲先取回再补播，且**只认「此刻仍是这条」**
                （玩家点得快、旁白已翻页 ⇒ 过期那条不再出声，避免两句叠音）。
                正面断言「TUT_NARR 每条都有配音打进产物」「voice/ 下都是 TUT_NARR 的 id」
                （`tutNarr`/`tutVoice` 经 dump_ids，路径由**游戏作用域**的 VOICE_DIR/VOICE_EXT 现拼，python 侧不镜像）。
                另：磁盘上曾有的 `素材/voice/tut_3h.mp3`（「腐毒」那条）**本批按用户口径删除**
                （用户原文「tut_3h.mp3 删了，不要这个」）：verify_dist 原先为它保留的「已知孤儿」登记随之一并拆除，
                `voice/` 下现在每一条都必须对应 `TUT_NARR` 的一个 id（多一条散件即报红）。
             ⑥ **切后台停 / 回前台自动续轨**（用户口径「页面切到后台或隐藏时自动 stopBGM（两条链一起停）…
                在 Trae 内置浏览器里切走就静音；对移动端 / 小游戏也更规范」，随后补「bgm 肯定是退了要断、
                进了要续哇」）：10_audio.js 新增 `audioHiddenStop()`（＝ 先记下切走那一刻 `BGM_TRACK`
                再 `stopVoice()` + `stopBGM()` —— 采样 BGM 对象、合成氛围音两条链连同正在念的旁白配音一起停）
                与 `audioHiddenResume()`（消费 `BGM_RESUME`；认 `SETTINGS.sound`、`visibilityState` 与
                `BGM_TRACK` 已在播则不起曲，否则 `ensureAudio()` + `startBGM(bgmTrackFor(t))` 续回切走时那条轨），
                `audioHookHidden()` 挂三钩子：`visibilitychange`（hidden→停 / 否则→续）、`pagehide`→停、
                `pageshow`→续。**只在切走那刻真在演（`BGM_TRACK` 有值）时记轨** —— 过场 stopBGM / 声音关着
                的静默段回前台不凭空起曲。55_cloud.js 原本就挂在同一个 `visibilitychange` 上（那条只管存云），互不影响。
             闸与回归：verify_dist 的 `G._settlePlayed=false` 计数断言 2→3（`tutRetry` 重开本关合法第三处）；
                verify_dist 新增 [2] 尾部教程配音三条（清单非空 / 一条不缺 / 无散件）；
                冒烟新增 5 条（结束回合锁 / 旁白收泡族 / 13 条对话 + TUT_WHO / enemySay 让位 / heroDeath 接线）
                + 配音 3 条（通道就位 / id 纯 ASCII 且不接腐毒 / 四处挂点）
                + 切后台静音 1 条（audioHiddenStop 调 stopBGM+stopVoice、audioHookHidden 含两钩子）
                + 回前台续轨 1 条（audioHiddenResume 认 BGM_TRACK / SETTINGS.sound / startBGM、钩子含 pageshow）；冒烟基线 1555→1560。
             ⑦ **v1.1.25r 收尾批**（用户 2026-10-17 报障 3 类：反复回归 + 锦囊返回跳地图 + 旁白误跳 + 呼吸没做）：
                ① **教程旁白只在「点旁白框」时推进**（用户「不是点哪里都可以，不然一触屏幕就会跳过教程会话」）：
                   旧 `bindNarrTap` 把收泡监听挂在 **window 捕获相** ⇒ 屏幕任意一处 pointerdown 都收掉**非强制**泡。
                   改为只绑 `#tut-narr` 框的 `onpointerdown`（容器 `pointer-events:none`、只有 `.bubble` 可点
                   ⇒ 事件自 .bubble 冒泡到框），`narrateShow` 取到 box 后调 `bindNarrTap(box)`。
                ② **「战斗里点锦囊返回跳地图」根治**：旧 `outPanelSnap()` 只在 overlay **非 hidden** 时才快照，
                   而战斗中 overlay 本就是 hidden ⇒ 一个字不记，返回时只能靠 `jinnangBack` / `closeOverlay` 的
                   `SCENE==='map'` 去**猜**来处（读档过渡 / 结算前后 / 云同步任一刻就会误判 ⇒ `showMap()`）。
                   现改为**无论 overlay 显不显都记来处**（hidden 记 `{hidden:true}`＝来处是 #app 战斗层），
                   `outPanelRestore()` 按来处分流：战斗层 → 只收面板（绝不 showMap）、地图 → 重画（保 bindMapDrag）、
                   其它面板 → 贴回 HTML；`jinnangBack` 删掉 `SCENE==='map'` 兜底猜，`closeOverlay` 把
                   `outPanelRestore()` 提到 SCENE 判定**之前**。
                ③ **玩家立绘补待机呼吸**（用户「（角色）的待机呼吸你一点没做」）：原设计只给精英/boss 挂 `idleBreath`，
                   normal / 召唤物 / **玩家立绘一律不挂**。新增 `.hero-art-box:not(.hero-dead)` 挂 `idleBreath`
                   （4.0s，与敌人 3.4s / 4.6s 错频，避免同屏同频）；挂**父盒**，子立绘 `.hero-art` 的
                   heroAttack / heroHit 通道不受影响，`:not(.hero-dead)` 保证阵亡动画独占。
                ④ **总分规则改数**（用户 2026-10-17 定稿）：层数推进 ×40→**×50**；击杀**三档** 6/8/10 →
                   **40 / 140 / 300**（普通/精英/首领）；**删去「召唤物击杀」×7 与「剩余生命」×1 两条**；
                   灵汁剩余 ×40→**×240**；剩余金币 ×8 **不变**；用时 / 通关加成仍**仅通关**计入。
                ⑤ **里程改为「像分数一样」**（用户口径「复活后要继承，之后一起算」）：旧版靠 `_mileGiven` 一局只发一次 ⇒
                   先败拿一份小的、复活后爬到更远再败，多出来的里程**永远发不出去**（结算画面还只显示第一次那份快照）。
                   现拆两段：**点数**按 milePointsFor(G) 算全量、减去 `_mileGranted` 只补**增量**（一局走完合计恰等于全量）；
                   **计数**（局数/胜场/击杀/最高幕/成就上报）改用 `_mileCounted` 一局只记一次，免得复活后重复累加。
                   结算面板里程分项同步改**实时重算**（不再用 v1.1.8 的发放快照 —— 改增量后不会再有「+700 只到账 500」错位）。
                ⑥ **撤回里程开发者开关 + 教程结尾奖试玩符纸**（用户 2026-10-17 续作口径「撤回开发者权限／
                   里程数恢复正常值」「将新手教程的最后打完 boss 的锻造换成获得 3 张试玩符纸的奖励界面，
                   这个奖励就是之前新玩家登录送的，只是放到这里领取，只能领取一次，避免到设置里重玩教程刷」）：
                   · v1.1.16 的「里程碑调试拉满」开关（`DEBUG_MAX_MILE` / `DEBUG_MAX_MILE_PTS` / `debugMaxMile`
                     及 60_boot 里的调用）**整块删除**；旧开关每次加载都把 pts 写死哨兵值 999999 并落盘 ⇒
                     新增 `mileCleanupDebugSentinel()` + `MILE_DEBUG_SENTINEL=999999`，在 `loadSave` 里由
                     `mileResetV3` 守卫**只跑一次**：命中哨兵的点数归零，已解锁档位 / 已领奖励 / 符纸原样不动。
                   · 教程最后一关（山门·僵王）打完 **不再进锻造**（「都结束了锻造没有实际意义」）：`afterReward`
                     里教程 boss 分叉到新的 `showTutTrialReward()`（3 张【试玩符纸】奖励界面，
                     沿用素材 `ui/shiwanfuzhi.png`）；点「收下」走 `claimTutTrial()` → `grantTutTrialOnce()`。
                   · v1.1.21 的「首启自动发 3 张试玩符纸」已从 `loadSave` **撤走**，改到教程结尾领；发放仍由
                     **同一个 `trialGiftV1` 旗标**守卫「只能领一次」⇒ 到设置里重玩教程再走到这一步，`afterReward`
                     直接 `goNext()` 出师、不重看奖励页，杜绝刷符纸。
                闸：node --check 八段全绿；冒烟新增 3 条（教程奖励改 grantTutTrialOnce + loadSave 已撤首启赠送 /
                   只能领一次不叠加 / 调试拉满开关已移除 + 里程定向清理只归零哨兵值），冒烟基线 1564→1565。
  v1.1.24  新手教程批（用户 2026-10-16 口径「开新局吧，先进入选角界面。需要的常驻跳过。斩妖剑也行。
             按照你的 md 开始吧，之前的旧的教程可以删了」）：**6 关固定路线教学局**（普通-商店-精英-篝火-
             未知-boss）整体替换旧交互引导；教程结束直接 confirmNewGame 开新局、先落选角界面
             ① 旧教程全族删除：TUTORIAL_STEPS / showTutorial / startGuidedTutorial / renderTutHint /
                advanceTut / TUT（60_boot.js）、tipOnce 全家（00_base.js 的 TIPS_KEY/tipsSeen/
                showTipBubble/hideTipBubble 与 20_data/30_engine 共 4 处调用）、#tut-hint 与
                #tip-bubble 的 CSS（原型.html 基档两族 + 矮屏档两行 + 居中规则 + 字体栈引用）
             ② 教程数据（20_data.js 末尾）：TUT_NODES 6 关（foes / 敌人覆写 foeOv / 固定抽牌 draw）、
                TUT_NARR 39 条天师口吻旁白；教学用天师现行初始卡组，抽牌序由 resetDeck 教程分支
                **反转写入**（drawCards 从末位 pop）⇒ 首回合必摸 雷符×2·金光咒·聚灵·咒引；
                僵王覆写 72 血四意图循环、白无常覆写 40 血多段+「再生」词缀（演示词缀用）
             ③ 引擎钩子（30_engine.js）：startBattle 在意图偏移行**之后**做敌人覆写并重置
                intentIndex=0；tutOn('battleStart'/'turnStart'/'endTurn'/'playerHit'/'battleWin'/
                'playedForce') 事件机；playCard 强制锁（非指定牌 floatMsg「先听师父的话」），
                doPlayCard 命中指定牌放锁并收旁白
             ④ 流程（40_flow.js）：startTutorial 复刻 confirmNewGame 建局序列（固定符箓天师、
                60 血）→ tutEnterNode 6 关线性推进（goNext 顶部拦截）；死亡 loseGame 拦截走
                tutOnDeath → tutRetry 重开本关；毕业 tutGraduate → tutFinish → confirmNewGame
                正式开新局；**saveRun 教程空转**（全程不产存档 ⇒ 重玩教程不冲玩家旧档）、
                recordScoreRun 拦截（教程局不入榜，其余统计照常）
             ⑤ UI（50_ui.js）：narrate 旁白队列播放器（尖角气泡 + 毛笔体 + 天师头像，
                a-slide/a-fade/a-brush 三动画按关轮换，force 泡金框点不掉）、#tut-skip 常驻右上
                「跳过教程」**单击即跳免确认**、showTutIntro 首启插图过场（intro/tutorial.png
                缺图 onerror 回落墨底不阻塞）、商店关专属三符+法宝货位（斩妖剑 12 冥钱 /
                招魂幡 30 冥钱，未买齐不给前进、不给删符）、篝火关锁锻造【雷符】、未知关固定灵液事件
             ⑥ 门禁（60_boot.js）：DOMContentLoaded 判 tutorialSeen() —— 未见 → showTutIntro，
                已见 → showStartScreen（新玩家首启自动拉入、老玩家只走设置页重玩）；
                设置页「查看新手引导」按钮改「重玩新手教程」(tutReplayAsk)
             ⑦ 闸：node --check 八段全绿；冒烟删 P8 tipOnce 断言块与尸气 tipOnce 子块、新增
                v1.1.24 教程断言组，基线 1551→1549（另摘掉 runner 顶部 startGuidedTutorial 静音桩 ——
                函数已删，空桩赋值反而凭空造全局；saveRun 类拦截断言一律改扫 __realSaveRun 真身）；旁白配音预留 id=素材/voice/<id>.mp3
                （用户暂不配音；接入时走专用探放，勿走 sfx 的合成音回落）
             ⑧ 地图精英图正名：用户把 素材/map/guanqia-logo/ellite.png 改名为 elite.png（同批 5 张关卡图
                与 shop.png 也换了新图），NODE_ICON.elite 与冒烟 v1.1.14 断言同步改指新名
                （旧拼法在 _patch 历史补丁脚本里保留为考古记录，不改）
  v1.1.23  修障 + 规则批（用户 2026-10-16 口径，7 条）：
             ① 战局外子面板返回跳战斗（v1.1.16 的锦囊快照只覆盖锦囊一处，「✕」出口也不认快照）——
                抽成共用对 outPanelSnap / outPanelRestore（50_ui.js）：showJinnang / viewDeck（我的牌库）/
                showPile（牌堆）打开前各快照一次；jinnangBack 与 closeOverlay（含 ✕ 与 ESC 两个出口）先试还原、
                还原不了才回落 hideOverlay；SCENES 名单补 'deck-scene'。⇒ 篝火 / 商店 / 事件房等处进锦囊·
                牌库·牌堆再返回，落回原场景，不再掉进战斗骨架
             ② 结算画面停留一会儿后黑屏：settleTransition 的 heavy 档是「结局视频缺席 / 解码失败」的唯一回落
                出口，而 v1.1.x 为让视频末帧当背景撤掉了整屏图 ⇒ 视频一旦没播成就落在 #overlay 的 88% 黑幕上。
                修：heavy 分支先 setBg(defeat.jpg / victory.jpg) 铺回整屏背景（两张都在 SCENE_BG 表内 ⇒
                黑幕放松到 55%），观感与视频末帧同档；视频成功播放时这条不走，原口径不变
             ③ BGM 多轨重叠（boss 关 / 复活等）：startBGM 的 active 原是局部闭包，stopBGM 只能暂停当前 Audio
                元素，已派出的候选与 1500ms 看门狗不知情 ⇒ 切轨 / 掐曲后旧链仍会 play() 或兜底合成。
                修：全局代计数 BGM_GEN —— stopBGM++，startBGM 取 gen=++BGM_GEN，tryNext/resolve 先判
                gen!==BGM_GEN 即静默退出，失败候选显式掐掉自己；clearSynthBGM 统一收口合成兜底定时器
             ④ 删里程轨滑动音：ui_drag 键位与素材（素材/sfx/ui_drag.wav）**一并移除**（SFX_TABLE 124→123，
                冒烟对应断言同步改数）—— 手感（惯性 / 缓出）原样不动，滑动全程无音
             ⑤ 总分口径（用户定稿）：击杀四档 10/20/30/5 → 普通 ×6 / 精英 ×8 / 首领 ×10 / 召唤物 ×7；
                剩余生命 ×10 → ×1（层数 ×40 / 金币 ×8 / 灵汁 ×40 / 通关 +1000 不变）。
                里程口径（mileParts 同步改数）：层数 ×15→×22 · 击杀 ×5→×7 · 通关 +600→+300（幕数 ×200 不变），
                加权后平均每把仍 ≈570 点 ⇒ 6 档阈值无需重标；被钉着数值的 7 条冒烟断言已同步改数
             ⑥ 里程碑奖励卡补预伤害：罗汉伏虎（luohanfuhu，武僧 mile 奖励）此前 CARD_DMG 无登记 ⇒ 拖拽不显预伤，
                补一行（5 + 格挡/2，升级 7 + 上限 15）
             ⑦ 尸王牌面同步：阴司牒（yinsidie）到手后，尸王卡牌信息追加「阴司牒 · 每次尸王攻击后获得 5 点格挡」
                并在名字旁给 ↑ 标记（shiWangBoostTag / shiWangBoosted，卡牌信息与手牌渲染都走）
             ⑧ TapTap 成就改用后台已建 6 条：原自拟 5 条（wushang / lingfu / zuzhou / tushen / baizhan）作废、
                上报点整条移除；TAP_ACHIEVEMENTS 换成 Beginning / Hard-three / All-unlocked / No-matter-Who /
                Get-all / Nice-encounter。触发点（v1.1.23r 用户 2026-10-16 澄清两处）：
                新局 → 登塔、推进第三幕 → 初入第三幕、**图鉴收录满 34 条 → All-unlocked**（改自「累计击杀」）、
                局末按已通关角色数 → No-matter-Who(4)、解锁角色 → Get-all(4)、
                **6 榜任一提交成功 → Nice-encounter**（上移到 rankSubmit 成功回调内，不再只认总分榜）；
                累计型走 tapAchieveProgress（达标才上报）
             ⑨ 终局慢镜（用户口径）：「终结游戏的最后一个行为要加入行为 + 音效 + 特效的**慢动作**，再衔接结算
                动画」—— 用户口中的「纯动画增量」就是既有 heroAnim / enemyActAnim 那套行为效果（非帧序列）。
                新增 finaleBlow(mode, then)：挂一个 body 级 class body.finale-slow（原型.html），把 hero-hit /
                hero-attack / e-atk / dying 四条 keyframes 的 animation-duration 拉长 + #app 压灰度与暗角 ⇒
                **纯动画增量，不动判定**。落点两处（loseGame 被击败 / showVictory 通关）各包一层，约 1.6s 后
                由 clean() 统一摘类再推结算；无头 / 关特效 ⇒ 同刻 then()（冒烟在 loseGame 后立刻读 DOM 不受影响）
             ⑩ 闸：node --check 八段全绿；冒烟基线 1547→1551（新增 BGM 代计数 / 终局慢镜 / 结算背景 3 条断言）；
                verify_dist 与 verify_web 的版本号一致性靠重打包复位
  v1.1.22  成就重定位批（用户 2026-10-16 口径「『成就/卡背头像框』删了，然后连接 taptap 成就」）：
             ① 游戏内成就系统**整块删除**：COSMETICS / ACHIEVEMENTS / hasAchievement / showAchievementToast /
                unlockAchievement / applyCosmetics / equipCosmetic / viewAchievements 八个函数与数据一处不留；
                主菜单「成就 · 收藏」入口摘掉（v0.66.0 那批注释里「函数本体一律保留」至此只对
                viewStats / showTutorial 成立）；卡背 / 头像框外观 CSS（body[data-cardback] / [data-frame]）
                与 #achieve-toast 全族（主规则 / .show / .at-icon / .at-title / .at-sub / 矮屏档 /
                字体栈里的一处引用 / DOM 那个空 div）一并清掉；SAVE 的 achievements / cardBack / avatarFrame
                三个键自此**零读写**（不迁不删 —— 老档里的残留数据留着无害）
             ② **接入 TapTap 平台成就**（55_cloud.js 新增成就适配层）：局内那 5 个触发点（无伤之战 /
                零符斩杀 / 诅咒满盈 / 屠神证道 / 百战不殆）不再自持，改为 tapAchieve() **上报 TapTap**，
                玩家在 TapTap 游戏页看到点亮。与小游戏排行榜同源同一份文档域
                （minigameapidoc/dev/api/open-api/），但文档页**要登录**、接口名原文核不到 ⇒ 沿用排行榜那套
                best-effort 多点探测：① 优先 tap.getAchievementManager()（与 getCloudSaveManager /
                getLeaderboardManager 同构，方法沿原型链收）；② 拿不到管理器就退回 tap 自身；
                ③ `callback:{onSuccess,onFailure}` 与 `{success,fail}` 两套回调形状一起下发；
                ④ 载荷键多套一起给 —— 官方 *服务端* API 用的键是 achievement_open_id，故
                achievementOpenId / openId / achievement_open_id / achievementId / id 全给，累计型成就
                （百战不殆，传累计击杀数）再加 steps / progress / completed_step；
                候选方法名按序试（unlockAchievement / unlock / completeAchievement / submitAchievement …，
                **只试确实存在的 4 个**、每个 4 秒超时 ⇒ 最坏 16 秒，正常第一个即中）；每会话按 openId 去重。
                非 TapTap 环境 / 拿不到对象 / 候选全失败 ⇒ **整层 no-op**（浏览器 / PWA / 本地双击 /
                node 冒烟逐字节不受影响），失败只写返回值、**不弹窗**（成就上报绝不该打断局内节奏）；
                设置面板补一行「成就上报（TapTap 平台）：已接入 / 未接入」+ 真机诊断串 tapAchieveDiag
                （把真机上真实可用的方法名亮出来，一次真机回报即可定位）
                ⚠️ **后台前置（CLI 做不了）**：需在 TapTap 开发者中心「游戏服务 / 成就」里建成这 5 条成就，
                open id 用 wushang / lingfu / zuzhou / tushen / baizhan（与表内 openId 同名，否则上报的 id
                平台上不存在）；成就服务未开通时按官方「成就系统功能介绍 → 接入准备」先提工单申请。
                taptap-cli（已核 2026.10.14 版命令表）**没有**成就相关命令 —— 这部分只能走网页后台
             ③ 闸：node --check 五段全绿；冒烟基线 1542→1547（新增 5 条：八字全消失（const 声明不走
                globalThis，故用裸 typeof）/ 三个 SAVE 键零读写 / 适配层就位（5 条成就、openId 与 id 同名）/
                非 TapTap 环境 no-op 且返回 Promise / 5 个触发点接线）；verify_dist 里 #achieve-toast 的
                两条旧断言改成**反向钉子**（产物里不得再出现 #achieve-toast / 金沙卡背 / 紫金头像框）
  v1.1.21  试玩符纸批（用户 2026-10-16 口径「首启自动发 3 张试玩符纸」）：**新增【试玩符纸】游戏道具** ——
             一张 = 「某个未解锁角色试玩一次」：只在**本局**临时放行（G.trialHero，局末 / 回选角即失效），
             **不写 SAVE.unlockedHeroes**，故该角色在选角页照旧显示上锁；试玩局的进度 / 成就 / 图鉴 /
             排行榜**照常计入**（结算按 G.hero 记账，与正式局无差别）⇒ 之后再用【入门符纸】永久解锁，
             试玩攒下的里程就直接续上了。
             ① 数据：SAVE.trialTickets（张数，loadSave 归一化）+ SAVE.trialGiftV1（一次性赠送标记）。
                首启自动发 3 张（TRIAL_GIFT_N）——新档 / 老档 / 坏档一律在首次 loadSave 时补，落盘后不再发
             ② 选角页（heroSelectStart）：未解锁角色 + 手上有试玩符纸 ⇒ 先弹**毛笔风确认窗**
                「是否要用【试玩符纸】获得【XX】试玩一次的权力？」。askConfirm 增可选第三参 opt：
                `.ovc-brush` 切毛笔字、圆钮改文字（「试玩一次 / 取消」）、显露第三出口 `#ovc-alt`
                「永久解锁」（= 同时还有入门符纸时一并给出，窗内明示故不再二次确认）；
                没试玩符纸才回落到原来的「消耗 1 张入门符纸解锁」。**不传 opt 的旧弹窗逐条不变**
             ③ 图标：素材/ui/shiwanfuzhi.png —— 入门符纸**复制改字**（用户授权「复制即可、把「入门」改「试玩」」），
                用华文行楷 STXINGKA 重新描「试玩」二字、原字墨迹按包围盒等比定位；用户若自绘可原地替换同名文件。
                选角页顶部存量条改成**两名并排**（入门符纸 | 试玩符纸，.hs-ticket-sep 分隔），
                hsTicketInner / hsApplyHero / hsRefreshTicket 一起改成整条重渲
             ④ 闸：node --check 三段全绿；冒烟基线 1536→1542（新增 6 条：0 张拒绝 / 消耗 1 张只写
                G.trialHero、不写 unlockedHeroes / tianshi 与非法 id 拒绝 / showHeroSelect 清 G.trialHero /
                首启赠 3 张 / 弹窗与存量条接线）
  v1.1.19  修障 + 特效反馈批（用户 2026-10-15 txt，特效 52 条 / 音效 8 条）：
             ① 观感批全部并入本版：全量文案改毛笔字（MaShanZheng 子集，≤13px 小字回落楷体栈）
                + 顶栏内容居中、左右安全区统一取 max(safe-left,safe-right)（修「整屏偏右」）
                + 伤害浮字「炸花」档 2（字号 ×0.85、时长 0.9→1.06s，多段牌主伤+引爆同刻散成扇形：
                  ±38°/半径 24~40px/错峰 85ms/起点抖动 ±6px/随机旋转 ±7°，单段仍朝正上方）
                + 里程碑横向滑动加鼠标松手惯性（rAF 衰减 + 停稳缓出）
             ② 三个报障（2 真机 + 1 潜伏）：获得格挡时玩家面板宽度跟着变（血条变长 + 立绘位移）—— 格挡芯片改「常驻占位」
                （0 时 .is-empty 隐藏但占同样的宽 + min-width 兜三位数）⇒ 行宽恒定、面板不再撑开；
                锻造界面手速快可连锻多张 —— 锻造/焚符加同步一次性锁（CARD_ACT_BUSY，演出结束复位）；
                毛笔字**其实一直没生效** —— `:root` 那段注释里写出了注释起止符，而浏览器「注释不嵌套」
                （遇第一个起止符即闭合）⇒ `--font-brush` 的声明被并进注释当垃圾声明吞掉、body 的
                `font-family:var(--font-brush)` 变无效值回落衬线体；连带 gen_rank_font.py 的「标记必须唯一」
                守卫与 verify_dist 的「注释结构性配平」一起报错 —— 改成「只写标记名、不写出字符本身」
             ③ 特效反馈落地（本轮不需新素材的部分）：尺寸统一按 txt 调整（太小放大 / 太大缩小，反伤按
                「缩小为原来的 5 分之 3」2.0→1.2）；「特效长了」截帧（骨铃吸血 / 浅显荆棘取前 1/3、
                金钟罩 41→24）；boss 九个 `_cast` 保留前 5 分之 3 帧（蓄力重击保一半）并上移半个单帧宽度；
                骨铃吸血 / 浅显荆棘按口径降透明度（FX_SHEETS 新增 `op` 字段）；血玉石芯片火焰缩小
                （44px→32px，图宽 352→256px）
             ④ 明确挂账（等用户统一提需求再动）：所有「换个音效 / 音效截断」（需新音频素材，本仓不自行生成）、
                「换个特效」（万剑归宗 / 勾魂，需新素材）、需新增「底部锚点 / 手牌中部锚点」的项
                （尸王手牌、判官王忘忧、阴差召唤位、小僵尸挂点）、五处「删掉这个」（涉及资产清单与
                打包闸口径，单独确认后处理）
  v1.1.18  观感批（用户 2026-10-14 定稿）：全量文案改毛笔字（MaShanZheng 子集，≤13px 小字
             回落楷体栈）+ 顶栏内容居中、左右安全区统一取 max(safe-left,safe-right)（修「整屏偏右」）
           + 伤害浮字「炸花」档 2（字号 ×0.85、时长 0.9→1.06s，多段牌主伤+引爆同刻散成扇形：
             ±38°/半径 24~40px/错峰 85ms/起点抖动 ±6px/随机旋转 ±7°，单段仍朝正上方）
           + 里程碑横向滑动加鼠标松手惯性（rAF 衰减 + 停稳缓出）
  v1.1.17  手机端出牌/召唤卡顿优化：本场卡组特效「预热解码」（只预解第 0 排，
             不做全量以免挤爆手机图片缓存）+ 流畅模式并发上限 14→8（普通档不动）
           + 性能读数 HUD 节流（0.5s 刷新、文本没变不写 DOM；读数本身有开销，查完关掉）
  v1.1.16  真机报障批：五雷法印置换掉的原牌进弃牌堆 + 置换出的 0 费雷符挂绿底费用芯片
           + 初始牌库单行居中/所有牌库 6 列留隙内缩 + 牌库图标改 deck_back.png 并放大 1.5×
           + 锦囊返回按场景快照还原（锻造两入口 + 商店等）+ 选角界面隐藏锦囊/牌库图标
           + boss_vfx 那批与反伤系特效 scale 2.47→2.0 + 里程碑调试拉满 pts 开关（发版前移除）
  v1.1.15  存档单档化（「续」直接续档 / 新开局覆盖旧档弹确认、败局结算只有「返回」）
           + 朱砂笔/开天眼类平增对多段攻击牌逐段减半（卡面写明减半后数值）
           + boss_vfx 全 46 段换 3840×1920 新规格精灵图
  v1.0.0   真机试玩反馈批：云存档上传失败改为运行时探测宿主文件接口（同步/异步两套，
             都挑不到就把真实方法名写进报错）+ 战报抽屉关不掉（✕ 挪到标题行最左 + 委托
             pointerdown + Esc + 点抽屉外收起）+ 战报收窄到 min(258px,46vw) + 战斗界面
             （手牌下移、引导条提到屏幕中央、敌我立绘放大、角色右移 18px、敌人词条字号收一档）
             + 主菜单右上角三符纸右移 + 版本号重置 V1.0.0 放左上角迷你字号
  v0.76.0  易物改成「只从抽牌堆取」（不足 3 张时把弃牌堆洗回）+ 点抽牌堆/弃牌堆查看牌堆
           + 敌人四档台词（出场/受击/濒死/被击败）+ 胜负结算的墨色洇入褪去过场（分级）
           + 844×390 锻造页美观收口 + 删 素材/bg/bg_menu.png + README 补历史
  v0.75.0  一次性万剑归宗 + 指向箭头复查 + 格挡预演（玩家头顶蓝字）+ 锻造六列对照
  v0.74.0  洗牌改成「先洗牌、后抽牌」+ 六张整屏场景背景全部接线
  v0.73.0  八个未知事件房接上专用背景 + 洗牌动画「到底看不看得见」的实测结论
  v0.72.0  敌人弧线构图（玩家左下 / 敌人右上）+ 抽弃洗翻转流 + 易物两段动画
           + 桌面选牌小窗去底与 1.25 倍 + 修「手机打不开局域网游戏」
  v0.71.0  实机试玩后的版面收口：整页锁死 + 战报栏全档抽屉 + 敌人尺寸一条 vh 连续公式
  v0.69.0  特效重锚 + 抽牌堆·弃牌堆立牌 + 卡面底部版面 + 384 条卡面文案压到 ≤30 字
  v0.68.2  修「卷轴坠落动画在唯一真实路径上根本没播」+ 修「主菜单背后透出战斗 HUD」
  v0.68.1  主菜单五项调整 + 两个报障
  v0.68.0  真美术卡牌牌框
  v0.67.0  道具图标接入（3 遗物改走灵石图 / 2 灵汁首获图标 / 图标框由横板改方框）
  v0.66.0  主菜单全屏横屏重做 · 真美术接入 + 三背景轮换 + 石碑崩碎/符纸卷轴演出
  v0.65.0  主菜单整屏重做 + 小窗开合过渡 + 按钮交互态
  v0.64.2  全界面 UI / 背景图清单（62 界面盘点）
  v0.64.1  修「滚轮不能滚地图、得按住中键」
  v0.64.0  30 个特效接入（尺寸是量出来的，不是估的）
  v0.63.0  地图不再遗忘（曾见永久保留）+ 自由滑动 + 卷轴收窄 + 【引爆】关键词
  v0.62.0  地图界面重做 + 每路线特殊节点配额 + 重复音效与无用贴图清理 + 四份陈旧文档全面重核
  v0.61.42 地图路径回到代码自绘 + 图标随机落位 / 2~3 条初始路线 + 浮字正负号配色对齐数字
  v0.61.41 地图换用新素材（图标/背景/道路）+ 未知关卡直入随机 + 浮字四档全装
  v0.61.40 地图随机化（杀戮尖塔式树状图 + 逐层迷雾）+ hpCost 自动对拍
  v0.61.39 阴差（C 列）卡池重做 26 张 + 修 3 个 bug
  v0.61.38 更正 v0.61.37 的两条错误挂账 + 修掉「尸气整局累积不清零」的撒谎文案
  v0.61.37 赶尸人（A 列）卡池重做 18 条 + 被动换「消耗回血」+ 新初始牌库
  v0.61.36 武僧（B 列）卡池重做 8 条 + 数字图接缝改四档 + 浮字抖动/闪烁/暴击档
  v0.61.35 天师（D 列）卡池重做 + 新初始卡组 + 守一改「减费」
  v0.61.34 BGM 六轨接线核实 + 轨名真相源（防「文件拼错」静默失效）
  v0.61.33 显示口径与指向机制整改 + 洗髓经跨关 + 渡魂按真实总伤
  v0.61.32 音效接线收尾：⏳ 那 32 条全部接上
  v0.61.31 BGM 三轨接线：精英战 / Boss 战 / 商店·营地·事件
  v0.61.30 文档补「按文件平铺交付单」+ 修「复活后打死最后一个敌人，战斗永远不结算」
  v0.61.25 批4 前置：音效规格文档 69 组 + 采样通路 + 26 键高频接线
  v0.61.20 批3 手机端 / UI：9 项落地
  v0.61.10 批2 平衡：按勾选表落地 8 条
  v0.61.06 三个接缝收口：存储 / 随机 / 广告位
  v0.61.05 批1.5 · 单文件拆成三层（纯搬移，零行为变更）
  v0.61.01 蓄力口径落定：只惠及单体攻击
  v0.61     评审整改·批1（P0 缺陷 12 项 + 报障 3 项）
  v0.60.02 天师/赶尸人起始牌组对调 + 咒印「咒魂」修正
  v0.60.01 战斗区下移修复「大敌人遮挡顶部栏」
  v0.60     天师 D 列整体重做 + 诅咒衰减提速
  v0.59     阴差 C 列整体重做
  v0.58     苦行武僧 B 列整体重做
  v0.57.10 附灵术「按列取费」修正
  v0.57.9  逐块复核 + 4 处按文档补齐
  v0.57.8  全局 UI 改造
  v0.57    赶尸人卡池重写①：尸气上限 12 + 新初始卡池
  v0.57.2~7 赶尸人卡池重写②~④：卸甲生元 A / 尸王常驻手牌+死亡才入循环 / 攻击·防御·功能·召唤四批对齐设计文档
  v0.56     噬魂术武僧版同步为 5/6
  v0.55     噬魂术：取消消耗牌 + 天师版降为 5/6
  v0.54     单文件打包：一键生成可发给朋友试玩的离线 HTML
  v0.53     消耗牌改为「一关一次」+ 卡面显著提示
  v0.52     锻造置灰 + 详情页承载遗物/召唤物
  v0.51     五通神
  v0.50     九项反馈批
  v0.49     八项反馈批
  v0.48     血祭阴差增强
  v0.47     （更新日志.md 最早的一节 —— 这份文件的记录从这里开始）

  ⚠️ v0.31–v0.46 这一段**没有小节记录**（更新日志.md 从 v0.47 起才有），当时的提交标题多是
     「V33」「V35加入BGM」这类一行标签 ⇒ **不编造回填**；要查那一段用 `git log --oneline`。
     本文件早先在「当前进度」里堆过一份 v0.20→v0.31 的 100 条平铺清单，现已按上面的规矩
     收成里程碑（那批内容仍能从 `git log` 里翻到）。

  ⏳ 下一步：真人试玩 → 进 Cocos Creator（广告接真 SDK、美术音效落地、软著备案提审）
     ⚠️ 进 Cocos 意味着**换引擎重写**：Cocos Creator 不做 HTML 转换，原型里的 CSS/JS
        一条都搬不过去。能搬过去的是**设计决定**（数值、机制、交互口径、验收矩阵），
        这正是「原型当设计规格书」的意思。

🧠 关于记忆
  项目信息已存入持久化记忆。下次和 Claude 对话时，
  说一句「继续志怪塔」即可接着上次的进度继续。
