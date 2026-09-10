// 混淆器包装：node obf.js <in.js> <out.js> <reservedNamesJSON>
const fs = require('fs');
const Obfuscator = require('javascript-obfuscator');

const [inp, out, reservedJson] = process.argv.slice(2);
const code = fs.readFileSync(inp, 'utf8');
let reserved = [];
try { reserved = JSON.parse(reservedJson || '[]'); } catch (e) { reserved = []; }

const result = Obfuscator.obfuscate(code, {
  compact: true,
  target: 'browser',
  // 关键：游戏大量使用内联 onclick="forgeCard(0)" 这类处理器，全局名必须原样保留
  renameGlobals: false,
  identifierNamesGenerator: 'hexadecimal',
  stringArray: true,
  stringArrayThreshold: 0.75,
  stringArrayEncoding: ['base64'],
  stringArrayWrappersCount: 1,
  stringArrayWrappersType: 'variable',
  rotateStringArray: true,
  selfDefending: false,
  debugProtection: false,
  deadCodeInjection: false,
  controlFlowFlattening: false,
  numbersToExpressions: false,
  splitStrings: false,
  simplify: true,
  unicodeEscapeSequence: false,
  seed: 20260910,
  reservedNames: Array.from(new Set(reserved.concat(['ASSET_MAP', 'assetURL', 'imgFail']))),
});

fs.writeFileSync(out, result.getObfuscatedCode(), 'utf8');
