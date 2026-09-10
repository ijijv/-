# -*- coding: utf-8 -*-
"""
志怪塔 · 一键提交

用法：
    python 提交.py "简述这次改了什么"
    python 提交.py -m "第一行" -m "第二行细节"
    python 提交.py --push "改完了，顺便推到 GitHub"
    python 提交.py --log            # 只看最近 15 条版本记录，不提交
    python 提交.py --status         # 只看当前有哪些改动没提交

特点：
    · 版本号自动从 原型.html 读取（<title> 里的 vX.YZ），不用手写
    · 提交信息统一格式：v0.52 简述这次改了什么
    · 提交后自动显示：改了哪些文件 + 增删行数
"""
import io, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
PROTO = os.path.join(ROOT, '原型.html')


def git(*args):
    """执行 git，返回 (returncode, stdout+stderr 合并)"""
    p = subprocess.run(['git'] + list(args), cwd=ROOT, capture_output=True,
                       text=True, encoding='utf-8', errors='replace')
    return p.returncode, ((p.stdout or '') + (p.stderr or '')).strip()


def read_version():
    """从 原型.html 的 <title> 里抠出版本号，如 v0.52"""
    try:
        s = io.open(PROTO, 'r', encoding='utf-8').read()
    except Exception as e:
        return None, '读不到 原型.html：%s' % e
    m = re.search(r'v(\d+\.\d+(?:\.\d+)?)', s[:2000])
    if not m:
        return None, '在 原型.html 开头没找到 vX.YZ 形式的版本号'
    return 'v' + m.group(1), None


def show_status():
    rc, out = git('-c', 'core.quotepath=false', 'status', '--short')
    print('===== 未提交的改动 =====')
    print(out if out else '(工作区干净，没有未提交改动)')


def show_log(n=15):
    rc, out = git('-c', 'core.quotepath=false', 'log', '-%d' % n,
                  '--format=%h  %ad  %s', '--date=format:%Y-%m-%d %H:%M')
    print('===== 最近 %d 次改动记录 =====' % n)
    print(out if out else '(还没有提交记录)')


def main():
    msgs, do_push, rest = [], False, []
    i = 1
    while i < len(sys.argv):
        a = sys.argv[i]
        if a in ('--push', '-p'):
            do_push = True
        elif a in ('-m', '--message') and i + 1 < len(sys.argv):
            i += 1
            msgs.append(sys.argv[i])
        elif a in ('--log', '-l'):
            show_log(); return 0
        elif a in ('--status', '-s'):
            show_status(); return 0
        elif a in ('-h', '--help'):
            print(__doc__); return 0
        else:
            rest.append(a)
        i += 1

    # 位置参数拼成第一行
    if rest:
        msgs.insert(0, ' '.join(rest))

    if not msgs:
        print('没给改动说明。用法：python 提交.py "简述这次改了什么"')
        print('（想先看看改了什么：python 提交.py --status）')
        return 1

    # 有东西可提交吗
    rc, dirty = git('status', '--porcelain')
    if not dirty:
        print('工作区干净，没有需要提交的改动。')
        show_log(5)
        return 0

    ver, err = read_version()
    if err:
        print('警告：%s —— 提交信息里将不带版本号。' % err)
        subject = msgs[0]
    else:
        subject = '%s %s' % (ver, msgs[0])

    body = '\n'.join(msgs[1:])
    full = subject + ('\n\n' + body if body else '')

    rc, out = git('add', '-A')
    if rc != 0:
        print('git add 失败：\n' + out); return 1

    # 用临时文件传多行信息，避免各平台 stdin 差异
    tmp = os.path.join(ROOT, '.git', 'COMMIT_MSG_TMP')
    io.open(tmp, 'w', encoding='utf-8', newline='\n').write(full + '\n')
    p = subprocess.run(['git', 'commit', '-q', '-F', tmp], cwd=ROOT,
                       capture_output=True, text=True, encoding='utf-8', errors='replace')
    os.remove(tmp)
    if p.returncode != 0:
        print('git commit 失败：\n' + ((p.stdout or '') + (p.stderr or '')).strip())
        return 1

    print('已提交：%s' % subject)
    print()
    rc, stat = git('-c', 'core.quotepath=false', 'log', '-1', '--stat',
                   '--format=%h  %ad', '--date=format:%Y-%m-%d %H:%M')
    print(stat)

    if do_push:
        print()
        print('正在推送到 GitHub…')
        rc, out = git('push', 'origin', 'HEAD')
        print(out)
        return 0 if rc == 0 else 1

    rc, ahead = git('rev-list', '--count', 'origin/main..HEAD')
    if rc == 0 and ahead.strip().isdigit() and int(ahead) > 0:
        print()
        print('（本地领先 GitHub %s 个提交；想同步时执行：python 提交.py --push）' % ahead.strip())
    return 0


if __name__ == '__main__':
    sys.exit(main())
