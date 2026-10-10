# -*- coding: utf-8 -*-
"""用 Chrome DevTools Protocol 驱动游戏，抓取界面截图（供软著《软件说明书》用）。

用法：
  python _capture_shots.py probe   # 只列出页面全局函数，便于挑选场景入口
  python _capture_shots.py shots   # 按预设场景序列抓图到 _out_软著/shots/
"""
import base64
import json
import os
import subprocess
import sys
import time
import urllib.request

import websocket  # websocket-client

CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
PORT = 9223
URL = "http://localhost:8137/"
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '_out_软著', 'shots')
PROFILE = os.path.join(os.environ.get('TEMP', '.'), 'cshot_cdp')


class CDP:
    def __init__(self):
        self._id = 0
        self.ws = None

    def launch(self, url=URL):
        subprocess.Popen([
            CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars',
            '--no-first-run', '--no-default-browser-check', '--mute-audio',
            f'--remote-debugging-port={PORT}', '--remote-allow-origins=*',
            f'--user-data-dir={PROFILE}',
            '--window-size=1280,720', url,
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        ws_url = None
        for _ in range(80):
            try:
                tabs = json.load(urllib.request.urlopen(f'http://127.0.0.1:{PORT}/json', timeout=2))
                pages = [t for t in tabs if t.get('type') == 'page' and 'localhost' in t.get('url', '')]
                if not pages:
                    pages = [t for t in tabs if t.get('type') == 'page']
                if pages:
                    ws_url = pages[0]['webSocketDebuggerUrl']
                    break
            except Exception:
                pass
            time.sleep(0.3)
        if not ws_url:
            raise RuntimeError('未拿到调试目标')
        self.ws = websocket.create_connection(ws_url, timeout=60)
        self.call('Page.enable')
        self.call('Runtime.enable')

    def call(self, method, **params):
        self._id += 1
        mid = self._id
        self.ws.send(json.dumps({'id': mid, 'method': method, 'params': params}))
        while True:
            msg = json.loads(self.ws.recv())
            if msg.get('id') == mid:
                if 'error' in msg:
                    raise RuntimeError(f'{method}: {msg["error"]}')
                return msg.get('result', {})

    def js(self, expr, wait=True):
        r = self.call('Runtime.evaluate', expression=expr, returnByValue=True,
                      awaitPromise=wait, userGesture=True)
        return r.get('result', {}).get('value')

    def shot(self, name):
        os.makedirs(OUT, exist_ok=True)
        r = self.call('Page.captureScreenshot', format='png')
        path = os.path.join(OUT, name)
        with open(path, 'wb') as f:
            f.write(base64.b64decode(r['data']))
        print(f'  截图 → {name} ({os.path.getsize(path)} bytes)')
        return path

    def wait(self, ms):
        time.sleep(ms / 1000.0)


def probe(c):
    c.wait(4000)
    print('URL:', c.js('location.href'))
    print('标题:', c.js('document.title'))
    funcs = c.js("Object.keys(window).filter(k=>typeof window[k]==='function' && !/^(_|webkit|on)/.test(k)).join(', ')")
    print('全局函数:', funcs)
    print('body.class:', c.js('document.body.className'))
    print('overlay 存在:', c.js("!!document.getElementById('overlay')"))


def shots(c):
    c.wait(4500)
    c.shot('01_menu.png')

    # 开始爬塔（建局）→ 角色选择
    c.js('startGame()')
    c.wait(1500)
    c.shot('02_hero_select.png')

    # 选符箓天师 → 开局三选一
    r = c.js("(function(){try{pickHero('tianshi');return 'ok';}catch(e){return 'err:'+e.message;}})()")
    print('  pickHero:', r)
    c.wait(1500)
    c.shot('03_opening.png')

    # 拿第一张 → 进入地图
    r = c.js("(function(){try{pickOpening(0);return 'ok';}catch(e){return 'err:'+e.message;}})()")
    print('  pickOpening:', r)
    c.wait(3200)
    c.shot('04_map.png')

    # 找地图上可点的节点
    r = c.js("""(function(){
      var all=document.querySelectorAll('[onclick]');
      var hits=[];
      for(var i=0;i<all.length;i++){
        var oc=all[i].getAttribute('onclick')||'';
        if(/chooseNode|mapNodeAt/.test(oc)) hits.push(all[i]);
      }
      for(var j=0;j<hits.length;j++){
        var b=hits[j].getBoundingClientRect();
        if(b.width>0&&b.height>0&&!/disabled/.test(hits[j].className)){ hits[j].click(); return 'clicked node '+j+'/'+hits.length+' oc='+(hits[j].getAttribute('onclick')||'').slice(0,40); }
      }
      return 'no-node (matched='+hits.length+')';
    })()""")
    print('  node:', r)
    c.wait(3200)
    c.shot('05_battle.png')

    # 结束回合，让敌人行动一轮
    c.js("(function(){var b=document.getElementById('endTurn');if(b){b.click();return 'endTurn';}return 'no-btn';})()")
    c.wait(3000)
    c.shot('06_battle_enemy.png')

    # 志怪图鉴
    c.js("hideOverlay()"); c.wait(400)
    c.js("viewBestiary()")
    c.wait(1800)
    c.shot('07_bestiary.png')

    # 遗物图鉴
    c.js("hideOverlay()"); c.wait(400)
    c.js("viewRelics()")
    c.wait(1400)
    c.shot('08_relics.png')

    # 设置
    c.js("hideOverlay()"); c.wait(400)
    c.js("showSettings()")
    c.wait(1200)
    c.shot('09_settings.png')

    # 里程碑解锁
    c.js("hideOverlay()"); c.wait(400)
    c.js("viewMilestones()")
    c.wait(1200)
    c.shot('10_milestones.png')


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else 'probe'
    c = CDP()
    try:
        c.launch()
        if mode == 'probe':
            probe(c)
        else:
            shots(c)
    finally:
        try:
            c.call('Browser.close')
        except Exception:
            pass


if __name__ == '__main__':
    main()