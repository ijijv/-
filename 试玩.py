# -*- coding: utf-8 -*-
"""
志怪塔 · 本地试玩（起一个本地 http 服务，再用浏览器打开）

为什么需要它：
  直接双击 原型.html，地址栏是 file://，浏览器会拦掉 fetch ——
  游戏取不到 素材/sfx/ 里的外置音效，只能全部走 WebAudio 合成音。
  于是「我明明把 mp3 放进去了却没生效」。用本脚本起个 http 服务再打开就正常了。

  打包产物（dist/志怪塔.html）**不需要**它：音效已经 base64 内联进那一个文件里了。

用法：
    python 试玩.py            # 默认 8181 端口
    python 试玩.py 9000       # 换端口
    python 试玩.py --no-open  # 只起服务，不自动开浏览器

停止：在这个窗口按 Ctrl+C
"""
import os
import sys
import threading

try:
    from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
except ImportError:
    sys.stderr.write('需要 Python 3.7+（本机 python 版本过旧）\n')
    raise

ROOT = os.path.dirname(os.path.abspath(__file__))
PAGE = '原型.html'


class Handler(SimpleHTTPRequestHandler):
    """两个改动，都为试玩服务：
       ① no-store —— 否则换掉一个 mp3 后刷新还是旧声音，会误判成「没生效」
       ② 静音日志 —— 一次加载会对每个键试 4 种扩展名，几百条 404 刷屏没意义
    """

    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        super().end_headers()

    def log_message(self, *a):
        pass


def serve(port):
    for p in range(port, port + 20):          # 端口被占就往后挪
        try:
            return ThreadingHTTPServer(('127.0.0.1', p), Handler), p
        except OSError:
            continue
    return None, None


def main():
    args = [a for a in sys.argv[1:] if a != '--no-open']
    port = int(args[0]) if args and args[0].isdigit() else 8181
    httpd, port = serve(port)
    if not httpd:
        sys.stderr.write('起不来：%d 起的 20 个端口都被占了\n' % port)
        return 1

    try:
        from urllib.parse import quote
    except ImportError:
        quote = lambda s: s
    url = 'http://127.0.0.1:%d/%s' % (port, quote(PAGE))

    n_sfx = 0
    sfxdir = os.path.join(ROOT, '素材', 'sfx')
    if os.path.isdir(sfxdir):
        n_sfx = len([f for f in os.listdir(sfxdir) if not f.startswith('.')])

    print('志怪塔 · 本地试玩')
    print('  页面 : %s' % url)
    print('  根目录: %s' % ROOT)
    if n_sfx:
        print('  音效 : 素材/sfx/ 下 %d 个文件可被加载（换文件后刷新即生效，已关缓存）' % n_sfx)
    else:
        print('  音效 : 素材/sfx/ 下没有文件，全部走合成音')
    print('  提示 : 进游戏后点一下画面（浏览器要求先有手势才解锁音频）')
    print('  停止 : Ctrl+C')
    print()

    if '--no-open' not in sys.argv:
        def openlater():
            try:
                import webbrowser
                webbrowser.open(url)
            except Exception as e:
                print('（没能自动开浏览器，手动打开上面的地址就行：%s）' % e)
        threading.Timer(0.6, openlater).start()

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print('\n已停止。')
    return 0


if __name__ == '__main__':
    sys.exit(main())