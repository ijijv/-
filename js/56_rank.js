/* ============================================================================
 * 志怪塔 · js/56_rank.js —— 排行榜（本机三榜 + 平台榜适配层）
 * ----------------------------------------------------------------------------
 * 三个榜，各自独立的入榜资格（用户口径）：
 *   · 通关计时榜（普通模式）：**只有完整打通三幕的玩家**进榜，按**用时升序**排（越快越前）。
 *     本机总榜，按用户拍板「不重置」—— 不做周清空，成绩永久累积。
 *   · 无尽关卡榜：**只有无尽模式的玩家**进榜，按**抵达关数降序**排（越高越前）。
 *   · 通关次数榜（三幕通关）：按**完整通关三幕的累计次数降序**排。平台侧提交累计次数
 *     （SAVE.stats.runWin，服务端 better 策略保留最大值 ⇒ 天然累加）；本机侧按**角色**分解
 *     ——本机只有一名玩家，角色是唯一可分解的维度，数据源是 RANK_KEY.clears 的按角色计数。
 * 数据落在独立 Store 键 RANK_KEY，**不往 RUN_KEY / SAVE_KEY 里塞**（那两个键的形状被冒烟闸盯着）。
 *
 * 平台榜（TapTap，全平台玩家同榜）——接口核对自官方仓库 taptap/instant-games-open-mcp
 *   （src/features/leaderboard/docs.ts，对应 https://developer.taptap.cn/minigameapidoc/dev/api/open-api/leaderboard/）：
 *   小游戏 & H5 游戏环境都可用，**普通浏览器没有 tap 对象**；不需要 npm 包 / import，
 *   tap 是运行时提供的全局对象，全部 API 经由 tap.getLeaderboardManager()（全局单例）。
 *     · submitScores({ scores:[{leaderboardId, score}], callback:{onSuccess, onFailure} })
 *         —— 一次最多 5 条；score **必须是整数**；错误码 500001 榜ID不存在 / 500002 参数错 / 500199 超过 5 条
 *     · loadLeaderboardScores({ leaderboardId, collection:'public'|'friends', maxSize:1~200,
 *         nextPage, periodToken, callback }) → res { leaderboard, scores[], nextPage, isTruncated }
 *     · openLeaderboard({ leaderboardId, collection, callback }) —— 打开官方原生排行榜 UI
 *     · loadCurrentPlayerLeaderboardScore / loadPlayerCenteredScores —— 本模块暂未用
 *   榜单要**先在 TapTap 开发者中心创建**（重置周期 / 排序 ascending·descending / 更新策略 better 等
 *   **创建后不可修改**），拿到 leaderboardId 回填到下面的 RANK_BOARD，本模块只负责调用：
 *     · normal  → 通关计时榜：ascending + better（**秒**为单位，越小越前）
 *     · endless → 无尽关卡榜：descending + better（关数，越大越前）
 *     · clear   → 通关次数榜：descending + better（累计次数，越大越前；better = 服务端保留最大值）
 *   基础库低于 1.8.0 时 tap 上没有 getLeaderboardManager ⇒ 自动降级为本机榜，并在面板上明说；
 *   ① window.ZGT_RANK 包装钩子保留为最高优先级，便于宿主 / 发行方接管。
 *   全部调用 try/catch，任何异常都不影响本机榜的读写。
 * ============================================================================ */

const RANK_KEY = 'zhiguaitower_rank_v1';
const RANK_MAX = 20;                 // 每个榜本机保留的前 20 名
/* TapTap 榜单 ID（已回填开发者中心的真实值；榜单的排序/更新策略创建后不可修改）——
 *   normal  → 通关计时榜：排序 ascending（用时越小越前）、更新策略 better（提交值 = 秒）
 *   endless → 无尽关卡榜：排序 descending（关数越大越前）、更新策略 better（后台榜名「无尽层数榜」）
 *   clear   → 通关次数榜：排序 descending（次数越大越前）、更新策略 better
 * 提交失败（榜 ID 不存在 500001 等）会被静默吞掉，本机榜不受影响。 */
const RANK_BOARD = {
  normal:  'a2l3dq2suldmbol41t',
  endless: 'y9y10a2w3atjsdfdkx',
  clear:   'e2zh6p4rugvyinbsp8'
};

/* ===================== 存取 ===================== */
function rankStore(){
  let d = null;
  try{ d = Store.getJSON(RANK_KEY); }catch(e){ d = null; }
  if(!d || typeof d !== 'object') d = {};
  if(!Array.isArray(d.normal)) d.normal = [];
  if(!Array.isArray(d.endless)) d.endless = [];
  /* 通关次数榜的**无上限**分角色计数。不能直接拿 d.normal 汇总 —— 那个数组被 RANK_MAX 截到 20 条，
     通关 20 次以后次数就不再增长了，而榜头写的是累计值，两者会对不上。 */
  if(!d.clears || typeof d.clears !== 'object') d.clears = {};
  return d;
}
function rankPersist(d){
  try{ Store.setJSON(RANK_KEY, d || rankStore()); }catch(e){}
  if(typeof cloudMarkDirty === 'function'){ try{ cloudMarkDirty(); }catch(e){} }
}
/* 用时 → 「12:34」/「1:02:03」 */
function rankFmtTime(ms){
  const t = Math.max(0, Math.floor((ms || 0) / 1000));
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  const p = n => (n < 10 ? '0' : '') + n;
  return h > 0 ? (h + ':' + p(m) + ':' + p(s)) : (m + ':' + p(s));
}
function rankFmtDate(ts){
  const d = new Date(ts || Date.now());
  const p = n => (n < 10 ? '0' : '') + n;
  return (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + p(d.getHours()) + ':' + p(d.getMinutes());
}
function rankHeroName(id){
  if(typeof HEROES === 'undefined' || !id) return '';
  const h = HEROES.find(x => x.id === id);
  return h ? h.name : '';
}

/* ===================== 入榜（本机） ===================== */
/* 通关计时榜：只有 showVictory（完整通关三幕）会调到这里。升序 ⇒ ms 越小越前。 */
function rankSubmitNormal(ms, hero){
  if(!(ms > 0)) return;
  const d = rankStore();
  const key = hero || '';
  d.normal.push({ ms: ms, hero: key, ts: Date.now() });
  d.normal.sort((a, b) => a.ms - b.ms);
  d.normal = d.normal.slice(0, RANK_MAX);
  d.clears[key] = (d.clears[key] || 0) + 1;   // 通关次数榜（按角色累计，不受 RANK_MAX 截断）
  rankPersist(d);
  /* 平台侧提交**毫秒**：TapTap 原生榜 UI 的「时间格式」按毫秒解析成绩值
     （1760 秒那次被打成了「1.76秒」= 把 1760 当毫秒渲染 ⇒ 单位对不上）。
     score 只要求整数，毫秒天然是整数；本机记录与面板格式化照旧不受影响。 */
  rankTapSubmit('normal', Math.round(ms));
}
/* 无尽关卡榜：只有无尽模式会调到这里。降序 ⇒ 关数越大越前。 */
function rankSubmitEndless(floor, hero){
  if(!(floor > 0)) return;
  const d = rankStore();
  d.endless.push({ floor: floor, hero: hero || '', ts: Date.now() });
  d.endless.sort((a, b) => b.floor - a.floor);
  d.endless = d.endless.slice(0, RANK_MAX);
  rankPersist(d);
  rankTapSubmit('endless', floor);
}
/* 通关次数榜：累计值取自 SAVE.stats.runWin —— 它由 showVictory 里的 track('runWin') 记，
 * 与通关计时榜是**同一个入口**（两条只在三幕通关时才走）。平台侧每次通关都提交这个累计数，
 * 服务端 better 策略保留最大值 ⇒ 天然累加，重复提交无副作用。 */
function rankClearCount(){
  try{ return (typeof SAVE !== 'undefined' && SAVE && SAVE.stats && SAVE.stats.runWin) ? (SAVE.stats.runWin | 0) : 0; }
  catch(e){ return 0; }
}
function rankSubmitClear(){
  const n = rankClearCount();
  if(!(n > 0)) return false;
  return rankTapSubmit('clear', n);
}
/* 本机侧：按**角色**分解（本机只有一名玩家，角色是唯一可分解的维度）。数据源是 clears 计数，
   与榜头的累计值同源 —— 「本机累计」永远等于各行之和，不会出现对不上的两套数字。 */
function rankClearTally(){
  const by = rankStore().clears;
  return Object.keys(by).map(k => ({ hero: k, n: by[k] || 0 })).filter(x => x.n > 0).sort((a, b) => b.n - a.n);
}

/* ===================== 平台榜适配层（全程可选，失败即降级） ===================== */
let _rankAdapter = null, _rankProbed = false;
/* 最近一次平台接口失败的可读描述。**为什么要这个**：TapTap 容器原生提示只有一句「排行榜获取异常」、
   不给错误码，而码才是能定位的分歧点 —— openLeaderboard 的码只有三种含义
   （500001 榜 ID 不存在 / 103·104 隐私授权 / 1025 好友权限未声明，见官方 docs.ts）。
   真机没有 devtools、console 看不到，所以把它露到面板提示行上，截图即可取证。 */
let _rankLastErr = '';
/* 各榜最近一次「读取平台榜」失败的可读描述。**为什么不复用 _rankLastErr**：rankTapFail 会在
   排行榜面板开着时重画面板，而「读平台榜」正是面板重画时发起的 ⇒ 复用会变成
   「读取失败 → 重画 → 再读取 → 再失败」的死循环。所以读取这条链只记账、不触发重画。 */
let _rankListErr = {};
function rankTapFail(stage, kind, code, msg){
  _rankLastErr = stage + ' · ' + kind + ' · 错误码 ' + code + (msg ? '（' + msg + '）' : '');
  try{ console.error('[排行榜] ' + _rankLastErr); }catch(e){}
  try{ floatMsg('排行榜报错 ' + code); }catch(e){}
  /* 面板开着就重画一次，把码写到提示行上；战斗中（#overlay 藏起来）跳过，别平白弹面板 */
  try{
    const ov = document.getElementById('overlay');
    if(ov && !ov.classList.contains('hidden')) showRankPanel();
  }catch(e){}
}
/* 榜单 ID：kind ∈ 'normal'（计时/秒）| 'endless'（关数）| 'clear'（次数） */
function rankBoardId(kind){ return RANK_BOARD[kind] || null; }
/* 官方回调式 API → 包一层，保证 Promise 化后不会因为回调里抛异常而卡住 */
function _rankCb(ok, no){
  const c = {};
  if(ok) c.onSuccess = function(res){ try{ ok(res); }catch(e){} };
  if(no) c.onFailure = function(code, msg){ try{ no(code, msg); }catch(e){} };
  return c;
}
function rankTapAdapter(){
  if(_rankProbed) return _rankAdapter;
  _rankProbed = true;
  /* ① 宿主包装层主动挂上来的钩子（最高优先级，便于宿主 / 发行方接管） */
  try{
    if(typeof window !== 'undefined' && window.ZGT_RANK && typeof window.ZGT_RANK.submit === 'function'){
      _rankAdapter = { name: '平台排行榜', submit: window.ZGT_RANK.submit, list: (typeof window.ZGT_RANK.list === 'function' ? window.ZGT_RANK.list : null) };
      return _rankAdapter;
    }
  }catch(e){}
  /* ② TapTap 官方排行榜管理器（基础库 1.8.0+ 才有 getLeaderboardManager） */
  try{
    if(typeof tap !== 'undefined' && tap && typeof tap.getLeaderboardManager === 'function'){
      const m = tap.getLeaderboardManager();
      if(m && typeof m.submitScores === 'function'){
        _rankAdapter = {
          name: 'TapTap 排行榜',
          mgr: m,
          /* 提交成绩：官方口径是 scores 数组 + **整数**分值；失败走 rankTapFail 露码，本机榜照旧不受影响 */
          submit: function(kind, value){
            const id = rankBoardId(kind);
            if(!id) return;
            m.submitScores({ scores: [{ leaderboardId: id, score: Math.round(value) }], callback: _rankCb(null, function(code, msg){ rankTapFail('提交成绩', kind, code, msg); }) });
          },
          /* 拉平台榜：官方是回调式，这里包成 Promise；拿不到 / 报错一律 resolve(null) 交给面板降级 */
          list: (typeof m.loadLeaderboardScores === 'function' ? function(kind){
            const id = rankBoardId(kind);
            if(!id) return Promise.resolve(null);
            return new Promise(function(resolve){
              try{
                m.loadLeaderboardScores({
                  leaderboardId: id, collection: 'public', maxSize: RANK_MAX,
                  nextPage: undefined, periodToken: undefined,
                  callback: _rankCb(function(res){ resolve(Array.isArray(res && res.scores) ? res.scores : null); },
                                    function(code, msg){ _rankListErr[kind] = code + (msg ? '（' + msg + '）' : ''); resolve(null); })
                });
              }catch(e){ resolve(null); }
            });
          } : null),
          /* 打开官方原生榜 UI（有就给面板挂一个入口） */
          open: (typeof m.openLeaderboard === 'function' ? function(kind){
            const id = rankBoardId(kind);
            if(!id) return false;
            m.openLeaderboard({ leaderboardId: id, collection: 'public',
              callback: _rankCb(null, function(code, msg){ rankTapFail('打开原生榜', kind, code, msg); }) });
            return true;
          } : null)
        };
        return _rankAdapter;
      }
    }
  }catch(e){}
  _rankAdapter = null;
  return null;
}
function rankTapAvailable(){ return !!rankTapAdapter(); }
function rankTapSubmit(kind, value){
  const a = rankTapAdapter();
  if(!a) return false;
  try{ a.submit(kind, value); return true; }
  catch(e){ return false; }
}
/* 打开 TapTap 原生榜（无平台榜 / 无 openLeaderboard 时返回 false，面板不显示入口） */
function rankTapOpenable(){ const a = rankTapAdapter(); return !!(a && a.open); }
function rankTapOpen(kind){
  const a = rankTapAdapter();
  if(!a || !a.open) return false;
  try{
    const ok = !!a.open(kind);
    /* v1.0.8：成功唤起了宿主原生榜 ⇒ 武装「回到前台恢复」探针（见下）。 */
    if(ok) rankArmResume();
    return ok;
  }catch(e){ return false; }
}
/* ===================== 回到前台恢复（v1.0.8） =====================
 * 用户真机报障：打开 TapTap 原生排行榜、退出之后只剩一张主菜单底图（版本号在、
 * 菜单本体没画出来）⇒ 回不到主界面。
 * 官方 openLeaderboard **只提供 onFailure**，没有任何「关闭 / 恢复」回调（见文件头的
 * docs.ts 核对结论）⇒ 只能在成功唤起之后自己武装探针，等页面回到前台时把界面补回来：
 *   · 排行榜面板还在（#overlay 未 hidden）⇒ 原位重画一遍（清掉宿主造成的空白）；
 *   · 面板没了且**没有进行中的局**（G 为空）⇒ 回主菜单（正是用户要的那一步）；
 *   · 面板没了但局还在（战斗中）⇒ 什么都不做 —— 那时画面本来就是 #app，overlay 本就该藏。
 * 信号源取三个：document 的 visibilitychange、window 的 pageshow / focus，
 * 以及 TapTap 的 tap.onShow（H5 版不一定有；基础库没有该方法时跳过）。
 * ⚠️ 只挂一次监听、只在**武装状态**下响应 ⇒ 平时每个渲染帧都不会多跑任何东西；
 *    非 TapTap 环境根本走不到这里（rankTapOpen 在没适配器时就 return false）。 */
let _rankResumeArmed = false, _rankResumeHooked = false;
function rankResumeRecover(){
  if(!_rankResumeArmed) return;
  _rankResumeArmed = false;                       // 一次性：触发后自动解除
  try{
    const ov = document.getElementById('overlay');
    if(ov && !ov.classList.contains('hidden')){ showRankPanel(); return; }
    if(typeof G === 'undefined' || !G) showStartScreen();
  }catch(e){}
}
function rankResumeProbe(){
  if(!_rankResumeArmed) return;
  /* 还在后台（宿主原生界面盖着）就先不动，等真正回到前台那一次。 */
  try{ if(typeof document !== 'undefined' && document.visibilityState === 'hidden') return; }catch(e){}
  rankResumeRecover();
}
function rankArmResume(){
  _rankResumeArmed = true;
  if(_rankResumeHooked) return;
  _rankResumeHooked = true;
  try{
    document.addEventListener('visibilitychange', rankResumeProbe);
    window.addEventListener('pageshow', rankResumeProbe);
    window.addEventListener('focus', rankResumeProbe);
  }catch(e){}
  try{
    if(typeof tap !== 'undefined' && tap && typeof tap.onShow === 'function'){ tap.onShow(rankResumeProbe); }
  }catch(e){}
}
function rankTapNotice(){
  const a = rankTapAdapter();
  const tail = _rankLastErr ? '<br><b style="color:var(--red2)">最近一次失败：' + _rankLastErr + '</b>' : '';
  if(a) return '已接入<b style="color:var(--green)">' + a.name + '</b>：成绩会同步到全平台榜单。' + tail;
  try{
    if(typeof tap !== 'undefined' && tap)
      return '当前 TapTap 容器<b style="color:var(--gold)">未提供排行榜接口</b>（基础库需 1.8.0+），成绩已记入本机榜单；接口开放后自动同步。' + tail;
  }catch(e){}
  return '当前为网页 / 本地环境，只有本机榜单；在 TapTap 小游戏端可参与全平台榜单。' + tail;
}
/* 平台榜列表：无平台榜 ⇒ 同步返回 null（面板降级）；有则返回 Promise<Array|null> */
function rankTapList(kind){
  const a = rankTapAdapter();
  if(!a || !a.list) return null;
  try{ return a.list(kind) || null; }catch(e){ return null; }
}
/* 平台榜读数（面板内）：把**全平台**前若干名画进面板。为什么要它 —— 提交是静默的，
   失败只写 _rankLastErr，而 `openLeaderboard` 打开的是宿主原生 UI，玩家回到游戏后
   看不到任何「接口通不通 / 榜上有没有人」的证据。这里把平台返回的名单或错误码
   直接摊在面板上，一眼可辨；不画图、不接点击，纯读数。 */
function rankTapRowsHTML(kind, list){
  const err = _rankListErr[kind];
  if(!list) return '<p style="color:var(--red2)">读取失败' + (err ? ' · 错误码 ' + err : '（无返回）') + '</p>';
  if(!list.length) return '<p>平台榜暂无成绩 —— 只有完整通关三幕、或结束过一局无尽模式的玩家才会入榜。</p>';
  return list.slice(0, 10).map((s, i) => {
    /* ⚠️ 官方文档只承诺 `scores[]`，没给条目字段名 ⇒ 取分 / 取名都做多重回落，
       取不到就留空，绝不抛异常（这段跑在面板里，抛了会把整个面板打断）。 */
    const raw = s ? (s.score !== undefined ? s.score : s.value) : undefined;
    const n = typeof raw === 'number' ? raw : parseFloat(raw);
    const shown = isFinite(n) ? ((kind === 'normal') ? rankFmtTime(n * 1000) : n) : '—';
    const pl = (s && (s.player || s.user)) || {};
    const nm = (s && (s.name || s.playerName || s.nickname)) || pl.name || pl.nickname || ('玩家' + (i + 1));
    return `<p>${i + 1}. <b style="color:var(--gold)">${shown}</b>　${nm}</p>`;
  }).join('');
}
/* 面板挂上后异步把三个平台榜灌进去。⚠️ 前面不再调 rankTapFail —— 读失败只记账，
   否则「读取失败 → 重画面板 → 又发起读取」会打转（见 _rankListErr 的注释）。 */
function rankFillTapLists(){
  if(!rankTapAvailable()) return;
  ['normal', 'clear', 'endless'].forEach(kind => {
    const box = document.getElementById('rankpad-' + kind);
    if(!box) return;
    let p = null;
    try{ p = rankTapList(kind); }catch(e){ p = null; }
    if(Array.isArray(p)){ box.innerHTML = rankTapRowsHTML(kind, p); return; }
    if(!p || typeof p.then !== 'function'){ box.innerHTML = '<p>该榜暂不支持读取</p>'; return; }
    p.then(list => {
      const el = document.getElementById('rankpad-' + kind);
      if(el) el.innerHTML = rankTapRowsHTML(kind, list);   // 面板已关 / 已重画 ⇒ 元素没了就丢
    });
  });
}

/* ===================== 面板 ===================== */
function rankBoardHTML(){
  const d = rankStore();
  const norm = d.normal.map((h, i) => `<p>${i + 1}. <b style="color:var(--gold)">${rankFmtTime(h.ms)}</b>　${rankHeroName(h.hero) || '通关'} · ${rankFmtDate(h.ts)}</p>`).join('')
    || '<p style="color:var(--dim)">暂无记录 —— 完整通关三幕（击败第三幕幕主）即入榜。</p>';
  const endl = d.endless.map((h, i) => `<p>${i + 1}. <b style="color:var(--gold)">第 ${h.floor} 关</b>　${rankHeroName(h.hero) || '无尽'} · ${rankFmtDate(h.ts)}</p>`).join('')
    || '<p style="color:var(--dim)">暂无记录 —— 在镇妖塔无尽模式打到第 1 关即入榜。</p>';
  const wk = (typeof weekKey === 'function') ? weekKey() : '';
  const week = ((typeof SAVE !== 'undefined' && SAVE && SAVE.highScores) ? SAVE.highScores : [])
    .filter(h => h.week === wk).slice(0, 10)
    .map((h, i) => {
      const where = h.mode === 'endless' ? `镇妖塔 · 第 ${h.floor} 关` : `第 ${h.act} 幕`;
      return `<p>${i + 1}. <b style="color:var(--gold)">${h.score}</b> 分　${where} · ${h.date}</p>`;
    }).join('') || '<p style="color:var(--dim)">本周暂无记录</p>';
  const tally = rankClearTally();
  const clrTotal = tally.reduce((s, x) => s + x.n, 0);
  const clr = tally.map((h, i) => `<p>${i + 1}. <b style="color:var(--gold)">${h.n} 次</b>　${rankHeroName(h.hero) || '通关'}</p>`).join('')
    || '<p style="color:var(--dim)">暂无记录 —— 完整通关三幕即计入，按角色分别统计。</p>';
  /* 有平台榜且支持打开原生 UI 时，给三个榜各挂一个入口（本机面板只列本机成绩） */
  const tapBtn = rankTapOpenable()
    ? `<div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:6px">
        <button class="btn ghost" onclick="rankTapOpen('normal')">TapTap · 通关计时榜</button>
        <button class="btn ghost" onclick="rankTapOpen('clear')">TapTap · 通关次数榜</button>
        <button class="btn ghost" onclick="rankTapOpen('endless')">TapTap · 无尽关卡榜</button></div>`
    : '';
  /* 每个榜下面挂一块「平台读数」占位，由 showRankPanel → rankFillTapLists 异步灌入。
     没有平台时整个不出现，面板与旧版逐字一致。 */
  const tappad = k => rankTapAvailable()
    ? `<p style="color:var(--gold);font-weight:bold;margin-top:6px">— TapTap 全平台榜 —</p>
       <div id="rankpad-${k}" style="font-size:12px;color:var(--dim)">读取中…</div>`
    : '';
  return `<p style="font-size:12px;color:var(--dim);margin-top:10px">${rankTapNotice()}</p>${tapBtn}
    <div class="kwlist" style="margin-top:6px">
      <p style="color:var(--gold);font-weight:bold">通关计时榜（普通模式 · 用时升序 · 仅三幕通关）</p>
      ${norm}
      ${tappad('normal')}
    </div>
    <div class="kwlist" style="margin-top:10px">
      <p style="color:var(--gold);font-weight:bold">通关次数榜（三幕通关 · 按角色分解 · 次数降序）</p>
      <p style="font-size:12px;color:var(--dim)">本机累计通关 <b style="color:var(--gold)">${clrTotal}</b> 次</p>
      ${clr}
      ${tappad('clear')}
    </div>
    <div class="kwlist" style="margin-top:10px">
      <p style="color:var(--gold);font-weight:bold">无尽关卡榜（镇妖塔 · 关数降序）</p>
      ${endl}
      ${tappad('endless')}
    </div>
    <div class="kwlist" style="margin-top:10px">
      <p style="color:var(--gold);font-weight:bold">本周得分榜（每周一重置 · ${wk}）</p>
      ${week}
    </div>`;
}
function showRankPanel(){
  showOverlay('<h2>排 行 榜</h2><p style="font-size:12px;color:var(--dim)">本机各榜保留前 ' + RANK_MAX + ' 名</p>' + rankBoardHTML(), true, 'scroll-scene');
  /* showOverlay 是**同步**写 innerHTML ⇒ 紧接着灌平台榜是安全的（元素一定在）。
     平台榜读数是「网上拉」，不阻塞面板先画出来。 */
  rankFillTapLists();
}
/* 无尽局结束时的入榜点（放弃 / 退出到主菜单），由 40_flow 的两个出口调用。 */
function rankNoteEndlessRun(){
  if(!G || !G.endless) return;
  rankSubmitEndless(G.endlessFloor || 0, G.hero || '');
}