# -*- coding: utf-8 -*-
"""「减弱动态效果」到底关掉动画没有 —— 一条能**失败**的探针。

为什么需要它：`prefers-reduced-motion` 的失效方式是**静默**的 —— 选择器特异度不够时
CSS 不报错、不警告，规则就那么被压掉了，「减弱动态效果」开了等于没开。而冒烟读不到 CSS
（DOM 桩里 getComputedStyle 是空壳），`verify_dist.py` 只能钉字符串、钉不出行为。

做法：把 `原型.html` 的**整段 <style> 原样搬过来**（不手抄，避免抄漂），配一个最小 DOM，
在真 Chrome 里读 getComputedStyle().animationName。跑三种条件：

  A 当前 CSS + 不开 flag         → 期望动画**在**（证明探针不是恒说 "none" 的废物）
  B 当前 CSS + --force-prefers-reduced-motion → 期望全 **none**（这是要验的结论）
  C 把 `#overlay .menu-hit .menu-art` 改回 `.menu-hit .menu-art`（旧写法）+ flag
                                 → 期望呼吸/飘动**仍在**（复现 bug，证明探针抓得住）

⚠️ C 是这套探针的价值所在：没有 C，B 全绿也可能只是「探针本来就测不出东西」。
⚠️ Chrome 支持 `--force-prefers-reduced-motion`（实测：无 flag 时
   matchMedia('(prefers-reduced-motion: reduce)').matches === false，带 flag === true）。
用法： python _patch/_rmprobe.py
"""
import io
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHROME = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
PROBE = os.path.join(ROOT, '_rmprobe.html')

# 要读 animationName 的目标：选择器 → 在探针 DOM 里对应什么
TARGETS = [
    ('.menu-bgimg.a',                          '背景呼吸（22s）'),
    ('.menu-hit.is-start .menu-art',           '入塔石碑呼吸'),
    ('.menu-hit.is-collection .menu-art',      '符纸飘动'),
    ('.menu-hit.is-breaking .menu-shard',      '崩碎碎片'),
    ('.menu-flash.on',                         '全屏闪'),
]

# 探针 DOM：类名与 showStartScreen 产出的结构一致（只保留与动画相关的层级）
DOM = '''<div id="overlay" class="ov-enter menu-scene">
 <div id="overlayWrap"><div class="panel"><div class="menu-root">
  <div class="menu-bgwrap"><div class="menu-bgimg a"></div></div>
  <div class="menu-stage">
   <button class="menu-hit is-start"><span class="menu-artbox"><img class="menu-art"></span></button>
   <button class="menu-hit is-collection"><span class="menu-artbox"><img class="menu-art"></span></button>
   <button class="menu-hit is-breaking"><span class="menu-artbox"><span class="menu-shard"></span></span></button>
  </div>
  <div class="menu-flash on"></div>
 </div></div></div>
</div>'''


def extract_css():
    s = io.open(os.path.join(ROOT, '原型.html'), encoding='utf-8').read()
    m = re.search(r'<style>([\s\S]*?)</style>', s)
    if not m:
        print('FAIL: 原型.html 里找不到 <style>'); sys.exit(2)
    return m.group(1)


def build(css, out):
    script = '''
<script>
var T = %s;
var out = [];
for (var i = 0; i < T.length; i++) {
  var el = document.querySelector(T[i][0]);
  var an = el ? getComputedStyle(el).animationName : 'NO-ELEMENT';
  out.push(T[i][0] + ' = ' + an + '   (' + T[i][1] + ')');
}
document.title = 'RMDONE';
// ⚠️ 标记串必须**在源码里拆开拼**：直接写 '<pre id="__rm">' 的话，--dump-dom 回来的
// 整篇文档里**脚本源码自己也含这个串**，取第一处就取到了脚本文本（实测就是这么翻车的）。
document.body.insertAdjacentHTML('beforeend',
  '<pre id="__r' + 'm">' + out.join('\\n') + '</pre>');
</script>''' % (repr([[s, d] for s, d in TARGETS]).replace("'", '"'),)
    io.open(out, 'w', encoding='utf-8').write(
        '<!doctype html><meta charset="utf-8"><style>' + css + '</style>' + DOM + script)


def run(out, force_rm):
    cmd = [CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars',
           '--virtual-time-budget=2500', '--dump-dom']
    if force_rm:
        cmd.append('--force-prefers-reduced-motion')
    cmd.append('file:///' + out.replace('\\', '/'))
    r = subprocess.run(cmd, capture_output=True, text=True)
    # 取**最后一处**：脚本源码里的那个串排在真实元素之前（见上面那条注释）
    ms = re.findall(r'<pre id="__r(?:m|" \+ "m)">(.*?)</pre>', r.stdout, re.S)
    ms += re.findall(r'<pre id="__rm">(.*?)</pre>', r.stdout, re.S)
    if not ms:
        return ['(没拿到结果 —— Chrome 没跑起来或脚本抛错)'] + (r.stdout or r.stderr).splitlines()[:4]
    return ms[-1].replace('&lt;', '<').replace('&gt;', '>').replace('&amp;', '&').splitlines()


def main():
    css = extract_css()
    buggy = css.replace('#overlay .menu-hit .menu-art', '.menu-hit .menu-art')
    if buggy == css:
        print('⚠️ 没找到 `#overlay .menu-hit .menu-art` —— 条件 C（复现旧 bug）跑不了。')
        print('   若这条选择器又被改回不带前缀的写法，说明修复被回退了，[B] 就会红。')

    cases = [
        ('A 当前 CSS · 不开 flag（对照组：动画应当在）', css, False),
        ('B 当前 CSS · 开「减弱动态效果」（结论：应当全 none）', css, True),
        ('C 旧写法(`.menu-hit .menu-art` 无 #overlay) · 开 flag（复现 bug：应当仍在）', buggy, True),
    ]
    results = []
    for name, c, f in cases:
        build(c, PROBE)
        lines = run(PROBE, f)
        print('\n=== %s ===' % name)
        for l in lines:
            print('   ' + l)
        results.append((name, lines))
    try:
        os.remove(PROBE)
    except OSError:
        pass
    print('\n（探针 HTML 已删除）')
    return results


if __name__ == '__main__':
    main()