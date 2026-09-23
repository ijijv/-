# -*- coding: utf-8 -*-
"""v0.61.33 · C：伤害浮字的「数字素材」接缝（只做准备，不替换现有效果）

用户会自己收集 0-9 共 10 张数字图片来替换代码生成的伤害数字。本批把**接缝**做好：
把图片按规范丢进 `素材/num/0.png … 9.png`，代码自动启用图片浮字；没有图片则原样走文字。

设计要点（为什么这么做）：
  · 一次性探测：首次画伤害数字时创建 10 个 Image() 试探加载，全部成功才把 NUM_STATE 翻成 1。
    **探测期间与探测失败都继续用文字渲染**，所以「没有素材」= 现状，零风险。
  · 只换字形，不换动画：位置 / 时长 / 颜色 class（.fx-dmg / .heal / .to-player / .weak）
    / 上浮淡出全部沿用现有 CSS，图片只是塞进 span 里的 <img>。
    → 抖动与闪烁特效按用户要求**等图片到位后再做**（已在 CSS 里留好 .fx-num 挂钩）。
  · 支持正负号：`+12` 的回血、`-8` 的伤害都在数字前用文字渲染符号（用户只交付 0-9）。
  · 打包兼容：走 assetURL()，打包.py 会把 素材/num/* 收进 ASSET_MAP，dev 走 `素材/num/N.png`。
  · VM 冒烟兼容：无 Image / 无 assetURL 时直接判定「不可用」，不抛错。
"""
import io, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = os.path.join(ROOT, 'js', '00_base.js')
HTML = os.path.join(ROOT, '原型.html')

files = {}
for p in (BASE, HTML):
    raw = io.open(p, encoding='utf-8').read()
    files[p] = {'nl': '\r\n' if '\r\n' in raw else '\n', 'body': raw.replace('\r\n', '\n')}

errs = []


def rep(path, old, new, tag=''):
    b = files[path]['body']
    n = b.count(old)
    if n != 1:
        errs.append('[%s] %s：命中 %d 次，期望 1 次' % (os.path.basename(path), tag or old[:44], n))
        return
    files[path]['body'] = b.replace(old, new, 1)


# ═══════════════════ 1. 探测 + 渲染（00_base.js） ═══════════════════
rep(BASE,
    "let HITFX = { enemies: new Set() };\n",
    "let HITFX = { enemies: new Set() };\n"
    "/* v0.61.33 · 伤害浮字的数字素材接缝（素材/num/0.png … 9.png）\n"
    "   NUM_STATE：0=还没探测 1=图片可用 -1=不可用（含探测中，先按不可用渲染，加载完自动切换） */\n"
    "let NUM_IMG=null, NUM_STATE=0;\n"
    "function numProbe(){\n"
    "  if(NUM_STATE) return NUM_STATE===1;\n"
    "  if(typeof Image==='undefined' || typeof assetURL!=='function'){ NUM_STATE=-1; return false; }\n"
    "  NUM_STATE=-1; // 先假定不可用：本次仍用文字，等 10 张全部加载成功再把 NUM_STATE 翻成 1\n"
    "  try{\n"
    "    const arr=[]; let left=10, done=false;\n"
    "    for(let i=0;i<10;i++){\n"
    "      const im=new Image();\n"
    "      im.onload=()=>{ if(done) return; if(--left===0){ NUM_IMG=arr; NUM_STATE=1; } };\n"
    "      im.onerror=()=>{ if(done) return; done=true; NUM_STATE=-1; NUM_IMG=null; };\n"
    "      im.src=assetURL('num/'+i+'.png');\n"
    "      arr.push(im);\n"
    "    }\n"
    "  }catch(e){ NUM_STATE=-1; NUM_IMG=null; }\n"
    "  return false;\n"
    "}\n",
    tag='numProbe')

rep(BASE,
    "  const span=document.createElement('span');\n  span.className='fx-dmg '+kind;\n  span.textContent=text;\n",
    "  const span=document.createElement('span');\n  span.className='fx-dmg '+kind;\n"
    "  // v0.61.33：有数字素材就把字形换成图片（0-9 之外的一律回落文字，符号 +/- 保持文字）\n"
    "  const __sign=/^[+-]/.test(text) ? text[0] : '';\n"
    "  const __digits=__sign ? text.slice(1) : text;\n"
    "  if(numProbe() && __digits.length && !/[^0-9]/.test(__digits)){\n"
    "    if(__sign) span.textContent=__sign;\n"
    "    for(const ch of __digits){ const im=new Image(); im.className='fx-num'; im.src=NUM_IMG[+ch].src; im.alt=ch; span.appendChild(im); }\n"
    "  } else {\n    span.textContent=text;\n  }\n",
    tag='floatDamage 数字图')

# ═══════════════════ 2. CSS（原型.html） ═══════════════════
rep(HTML,
    "  .fx-dmg.block{color:#7fb0d8;}\n",
    "  .fx-dmg.block{color:#7fb0d8;}\n"
    "  /* v0.61.33：数字素材字形（素材/num/0.png…9.png）。高度按 1.15em 等比缩放，与既有 22px 字号对齐；\n"
    "     抖动/闪烁特效等图片到位后再补（挂在本类上即可，见待办）。 */\n"
    "  .fx-num{height:1.15em; width:auto; vertical-align:-.18em; margin:0 -.03em; pointer-events:none;}\n",
    tag='.fx-num CSS')

# ═══════════════════ 3. 清理随机制一起死掉的 CSS（原型.html） ═══════════════════
rep(HTML,
    "  .dmg-buff{margin-top:5px; font-size:13px; color:#c86b1a; font-weight:bold;}\n"
    "  .dmg-nerf{margin-top:5px; font-size:12px; color:#3a6ea0; font-weight:bold;}\n"
    "  .dmg-plain{margin-top:5px; font-size:13px; color:#4a3f2f; font-weight:bold;}\n"
    "  .dmg-miss{margin-top:5px; font-size:12px; color:#8c2b21; font-weight:bold;}\n"
    "  .dmg-tag{font-size:10px; font-weight:normal; color:#8c2b21;}\n"
    "  .dmg-aoe{font-size:10px; color:#2b6ba0;}\n"
    "  .dmg-flash{animation:dmgFlash .5s ease-out;}\n"
    "  @keyframes dmgFlash{0%{background:rgba(224,179,65,.4); border-radius:3px;}100%{background:transparent;}}\n",
    "  /* v0.61.33：卡面预伤徽章样式（.dmg-buff/.dmg-nerf/.dmg-plain/.dmg-miss/.dmg-tag/.dmg-aoe）\n"
    "     与「点击锁定目标」时的闪烁（.dmg-flash / @keyframes dmgFlash）随机制一并删除 ——\n"
    "     预伤现在只浮在**目标敌人头顶**，样式见下面的 #drag-dmg。 */\n",
    tag='死 CSS .dmg-*')

rep(HTML,
    "  /* v0.61.20(P3)：拖拽指向敌人时，目标头顶的受击预览（与卡面徽章同源的 previewDamage） */\n",
    "  /* v0.61.20(P3)：拖拽指向敌人时，目标头顶的受击预览。\n"
    "     v0.61.33：卡面徽章已删，这里成为预伤的**唯一**显示处，且按「拖拽所见目标」实时算（previewDamage(c, e)）。 */\n",
    tag='#drag-dmg 注释')

# ═══════════════════ 4. 版本号（第 1、2 处） ═══════════════════
rep(HTML, "<title>志怪塔 · 原型 v0.61.32</title>", "<title>志怪塔 · 原型 v0.61.33</title>", tag='版本号 title')
rep(HTML, "· 玩法原型 v0.61.32</small>", "· 玩法原型 v0.61.33</small>", tag='版本号 h1')

if errs:
    print('=== 锚点校验失败，未写入任何文件 ===')
    for e in errs:
        print(' ✗', e)
    sys.exit(1)

for p, d in files.items():
    body = d['body']
    if ',,' in body and p != HTML:   # HTML 里 ,, 可能出现在样式/数据里，JS 里必须是笔误
        print('=== JS 出现连续逗号 ,, 未写入 ===', p)
        sys.exit(1)
    io.open(p, 'w', encoding='utf-8', newline='').write(body.replace('\n', d['nl']))
    print('OK %-14s %d 字符' % (os.path.basename(p), len(body)))