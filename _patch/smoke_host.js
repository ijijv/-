// 志怪塔 · Task#13 VM 冒烟宿主
// 把 页面里的 <script> 正文与 smoke_runner.js 拼接后在 node:vm 沙箱中执行，
// 结果写入沙箱 __report 并打印。退出码：0=通过，1=有失败，2=宿主错误。
// （沙箱搭建已抽到 _patch/vm_host.js，与 _patch/sim.js 共用）
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const { load } = require('./vm_host');

// 默认跑开发源 原型.html；传入路径则跑该文件（用于验证单文件打包产物）
const P = path.resolve(process.argv[2] || path.join(__dirname, '..', '原型.html'));
const runner = fs.readFileSync(path.join(__dirname, 'smoke_runner.js'), 'utf8');

// 注意：runner 追加进全部脚本之后，与 CARDS/G/CURSE_THIS_TURN 同一声明作用域
const { sandbox } = load(P, runner);

// 调试用：SMOKE_DUMP="表达式" 时在游戏作用域里求值并打印（用于打包校验取 id 清单）
if (process.env.SMOKE_DUMP) {
  try {
    const v = vm.runInContext(process.env.SMOKE_DUMP, sandbox, { timeout: 15000 });
    console.log('__DUMP__' + JSON.stringify(v));
  } catch (e) { console.log('__DUMPERR__' + (e && e.message)); }
  process.exit(0);
}
const rep = sandbox.__report || {};
if (sandbox.__boom) { rep.ok = false; rep.bootError = sandbox.__boom; }
console.log(JSON.stringify(rep, null, 1));
process.exit(rep && rep.ok ? 0 : 1);
