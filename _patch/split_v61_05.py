# -*- coding: utf-8 -*-
"""
志怪塔 · 批1.5 三层重构：把 原型.html 的整段 <script> 切成 js/ 下 7 个经典脚本。

为什么是「保序连续切分」而不是「按层重排」：
  原文件是**按功能段落顺序**写的（基础→音频→数据→引擎→流程→界面→启动），
  不是按层排的：CARDS 与 tooltip 相邻、卡牌打出与回合流程相邻。
  真按层重排要动 3800 行、跨 300 个顶层单元，属于高风险重写；
  而本批的验收门是「纯搬移零行为变更」，故按原顺序在**段落接缝**处切分，
  文件名前的数字表示**加载顺序**（拼接后必须与原始正文逐字节一致），
  正文中的 `/* ===== 段落 ===== */` 注释保留，按段落检索即可。

校验（VERIFY）：
  cat js/*.js 去掉每文件头部的横幅后，必须 == 切分前的 <script> 正文 + 一个换行。
  校验失败则整批不落盘。
"""
import io, os, sys, hashlib, subprocess, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = os.path.join(ROOT, '原型.html')
JSD = os.path.join(ROOT, 'js')
REF = os.path.join(ROOT, '_patch', '_orig_script_body.js')

# (相对路径, 起始行, 结束行(不含), 层名, 内容概述)
FILES = [
    ('js/00_base.js', 421, 572, '公共基础层',
     '工具 / 飘字提示 / 战斗特效(juce) / 出卡动效 / 受击分层 / Boss 战前过场'),
    ('js/10_audio.js', 572, 704, '音频与素材层',
     'Web Audio 音效合成 sfx() / BGM（外置优先·合成兜底）/ 素材映射与图片回退'),
    ('js/20_data.js', 704, 1737, '数据层',
     '关键词 / CARDS / HEROES / 资源·召唤·状态助手 / RELICS / POTIONS / ENEMIES / 词缀 / 地图表 / 无尽 / 稀有度概率'),
    ('js/30_engine.js', 1737, 2701, '战斗引擎层',
     '全局状态 newState / 敌人辅助 / 伤害结算 / 诅咒·召唤·封印·魅惑 / 回合流程 startTurn·enemyAct / 卡牌打出 doPlayCard'),
    ('js/40_flow.js', 2701, 2957, '局内流程层',
     '胜负结算 winFight·loseGame / startBattle / 节点推进 / 本局存档 / 排行榜'),
    ('js/50_ui.js', 2957, 3874, '界面层',
     '爬塔地图 / 奖励与篝火 / 鬼市商店 / 图鉴 / 成就 / 签到·广告占位 / 埋点 / 牌库 / 渲染 render / 拖拽出牌'),
    ('js/60_boot.js', 3874, 4304, '启动与局外层',
     '稀有度调试工具 / 开局与起始界面 / 菜单·重开·退出 / 新手引导 / 启动尾块(事件绑定·读档·埋点上线)'),
]
BANNER_LINES = 8


def banner(rel, title, desc):
    return '\n'.join([
        '/* ============================================================================',
        ' * 志怪塔 · %s —— %s' % (rel, title),
        ' * %s' % desc,
        ' * ----------------------------------------------------------------------------',
        ' * 由 原型.html 的整段 <script> 按原顺序切分而来（v0.61.05 三层重构，纯搬移）。',
        ' * 拼接校验：cat js/*.js 去掉本横幅后，应与切分前正文 + 末尾一个换行 逐字节一致。',
        ' * 加载：经典 <script src>（非 ES module）—— 双击 file:// 亦可直接游玩。',
        ' * ============================================================================ */',
    ]) + '\n'


def main():
    raw = io.open(P, 'r', encoding='utf-8', newline='').read()
    if '\r' in raw:
        print('ABORT: 源码里含 CR（期望纯 LF）'); return 1
    parts = raw.split('\n')

    if parts[419].strip() != '<script>':
        print('ABORT: 第 420 行不是 <script>：%r' % parts[419]); return 1
    if parts[4303].strip() != '</script>':
        print('ABORT: 第 4304 行不是 </script>：%r' % parts[4303]); return 1

    body = '\n'.join(parts[420:4303])          # 原始 <script> 正文（不含首尾标签）
    chunks = []
    for rel, a, b, title, desc in FILES:
        chunks.append((rel, banner(rel, title, desc), '\n'.join(parts[a - 1:b - 1])))

    # ---- 先校验，再落盘 ----
    joined = ''.join(chunk + '\n' for _rel, _ban, chunk in chunks)   # 去掉横幅后的拼接结果
    if joined != body + '\n':
        print('VERIFY FAIL: 拼接结果与原始正文不一致')
        print('  原始长度 %d / 拼接长度 %d' % (len(body) + 1, len(joined)))
        # 定位第一个差异
        for i in range(min(len(joined), len(body))):
            if joined[i] != body[i]:
                print('  首个差异 @ %d: 原 %r  拼 %r' % (i, body[i:i + 60], joined[i:i + 60]))
                break
        return 1
    print('VERIFY_OK  拼接 %d 字符 == 原始正文 + 末尾换行' % len(joined))

    # ---- 逐文件语法检查 ----
    for rel, ban, chunk in chunks:
        fd, tmp = tempfile.mkstemp(suffix='.js'); os.close(fd)
        io.open(tmp, 'w', encoding='utf-8', newline='').write(ban + chunk + '\n')
        r = subprocess.run(['node', '--check', tmp], capture_output=True, text=True)
        os.unlink(tmp)
        if r.returncode != 0:
            print('NODE_FAIL %s:\n%s' % (rel, r.stderr)); return 1
    print('NODE_OK   7 个文件均通过语法检查')

    # ---- 落盘 ----
    if not os.path.isdir(JSD):
        os.makedirs(JSD)
    for rel, ban, chunk in chunks:
        io.open(os.path.join(ROOT, rel.replace('/', os.sep)), 'w',
                encoding='utf-8', newline='').write(ban + chunk + '\n')
    io.open(REF, 'w', encoding='utf-8', newline='').write(body + '\n')

    # ---- HTML：把单个 <script>…</script> 换成 7 个 <script src> ----
    tags = '\n'.join('<script src="%s"></script>' % rel for rel, _b, _c in chunks)
    new_parts = parts[:419] + tags.split('\n') + parts[4304:]
    io.open(P, 'w', encoding='utf-8', newline='').write('\n'.join(new_parts))

    total = sum(len(c) for _r, _b, c in chunks)
    print('SPLIT DONE: %d 文件 / %d 字符 → js/' % (len(chunks), total))
    for rel, ban, chunk in chunks:
        print('  %-16s %5d 行' % (rel, chunk.count('\n') + 1))
    print('原始正文快照: _patch/_orig_script_body.js (sha256 %s)'
          % hashlib.sha256((body + '\n').encode('utf-8')).hexdigest()[:16])
    return 0


if __name__ == '__main__':
    sys.exit(main())
