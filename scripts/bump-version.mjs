#!/usr/bin/env node
/**
 * Markdown Hub 版本号统一工具 —— 一处修改，四处同步 + 一致性校验。
 *
 * 权威来源：src-tauri/tauri.conf.json 的 `version`
 *   · tauri-build 用它写入 exe 的 FileVersion / ProductVersion 资源
 *   · Tauri CLI 用它命名安装包（Markdown Hub_<version>_x64-setup.exe）
 *   由此同步：package.json、package-lock.json、src-tauri/Cargo.toml
 *
 * 用法：
 *   node scripts/bump-version.mjs --check          只校验四个文件是否一致（CI 用，不一致退出码 1）
 *   node scripts/bump-version.mjs patch            1.0.0 -> 1.0.1
 *   node scripts/bump-version.mjs minor | major
 *   node scripts/bump-version.mjs 2.0.0            指定具体版本
 * 可选参数：
 *   --dry-run   只预览，不写入
 *   --git       改完自动 commit 并打 tag vX.Y.Z（只提交本地，不 push）
 *
 * 通过 npm 运行（注意 `--` 分隔符）：
 *   npm.cmd run version:bump -- patch
 *   npm.cmd run version:bump -- 1.0.1 --git
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONF = 'src-tauri/tauri.conf.json';
const PKG = 'package.json';
const LOCK = 'package-lock.json';
const CARGO = 'src-tauri/Cargo.toml';
const abs = (rel) => path.join(root, rel);

const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const die = (msg) => {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
};

/* ---------------- 读取 ---------------- */

function readConfVersion() {
  const conf = JSON.parse(readFileSync(abs(CONF), 'utf8'));
  if (typeof conf.version !== 'string') die(`${CONF} 里没有 version 字段，请先补上`);
  return conf.version;
}

function readPkgVersion() {
  return JSON.parse(readFileSync(abs(PKG), 'utf8')).version ?? '(缺失)';
}

function readLockVersion() {
  const lock = JSON.parse(readFileSync(abs(LOCK), 'utf8'));
  return lock.packages?.['']?.version ?? lock.version ?? '(缺失)';
}

/** 只在 [package] 段里找 version，避免误读依赖的 version = "2" */
function readCargoVersion() {
  let inPackage = false;
  for (const line of readFileSync(abs(CARGO), 'utf8').split('\n')) {
    const t = line.trim();
    if (t.startsWith('[')) {
      inPackage = t === '[package]';
      continue;
    }
    if (inPackage) {
      const m = /^version\s*=\s*"([^"]+)"/.exec(t);
      if (m) return m[1];
    }
  }
  return '(缺失)';
}

/* ---------------- 写入 ---------------- */

/** 严格替换：匹配数不等于 1 就中止，防止正则误伤其他字段 */
function replaceExactlyOnce(text, source, replacement, label) {
  const hits = [...text.matchAll(new RegExp(source, 'g'))].length;
  if (hits !== 1) die(`${label}：期望匹配 1 处，实际 ${hits} 处，已中止以免误改`);
  return text.replace(new RegExp(source), replacement);
}

function buildEdits(current, next) {
  const edits = [];
  const escaped = current.replace(/\./g, '\\.');

  // tauri.conf.json 与 package.json：顶层各只有 1 个 "version" 键
  for (const rel of [CONF, PKG]) {
    const before = readFileSync(abs(rel), 'utf8');
    edits.push([
      rel,
      replaceExactlyOnce(before, `("version"\\s*:\\s*")${escaped}(")`, `$1${next}$2`, rel),
    ]);
  }

  // package-lock.json：只改根包的两处 version；JSON 往返已确认零格式改动
  const lockBefore = readFileSync(abs(LOCK), 'utf8');
  const lock = JSON.parse(lockBefore);
  lock.version = next;
  if (lock.packages?.['']) lock.packages[''].version = next;
  edits.push([LOCK, JSON.stringify(lock, null, 2) + '\n']);

  // Cargo.toml：仅 [package] 段
  const lines = readFileSync(abs(CARGO), 'utf8').split('\n');
  let inPackage = false;
  let replaced = 0;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (t.startsWith('[')) {
      inPackage = t === '[package]';
      continue;
    }
    if (inPackage && /^version\s*=\s*"/.test(t)) {
      lines[i] = lines[i].replace(/version\s*=\s*"[^"]*"/, `version = "${next}"`);
      replaced++;
    }
  }
  if (replaced !== 1) die(`${CARGO}：[package] 段中 version 字段出现 ${replaced} 次，期望 1 次`);
  edits.push([CARGO, lines.join('\n')]);

  return edits;
}

/* ---------------- 主流程 ---------------- */

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const withGit = args.includes('--git');
const checkOnly = args.includes('--check');
const target = args.find((a) => !a.startsWith('--'));

const current = readConfVersion();
const actual = {
  [CONF]: current,
  [PKG]: readPkgVersion(),
  [LOCK]: readLockVersion(),
  [CARGO]: readCargoVersion(),
};

if (checkOnly) {
  const bad = Object.entries(actual).filter(([, v]) => v !== current);
  if (bad.length) {
    console.error(`\n✖ 版本号不一致（以 ${CONF} 的 ${current} 为准）：`);
    for (const [f, v] of Object.entries(actual)) console.error(`   ${v === current ? '✓' : '✖'} ${f}  ${v}`);
    console.error(`\n修复：npm.cmd run version:bump -- ${current}\n`);
    process.exit(1);
  }
  console.log(`✓ 四处版本号一致：${current}`);
  process.exit(0);
}

if (!target) die('缺少版本参数：patch / minor / major / 1.2.3（用法见 scripts/bump-version.mjs 顶部注释）');

const next = SEMVER.test(target)
  ? target
  : (() => {
      const [maj, min, pat] = current.split('.').map(Number);
      if (target === 'major') return `${maj + 1}.0.0`;
      if (target === 'minor') return `${maj}.${min + 1}.0`;
      if (target === 'patch') return `${maj}.${min}.${pat + 1}`;
      die(`无法识别的版本参数：${target}`);
    })();

if (next === current) die(`新版本与当前版本相同（${current}），无需修改`);

const drifted = Object.entries(actual).filter(([, v]) => v !== current);
if (drifted.length)
  console.log(
    `注意：以下文件此前与 ${CONF} 不一致，本次一并纠正：\n  ${drifted.map(([f, v]) => `${f} (${v})`).join('\n  ')}\n`,
  );

const edits = buildEdits(current, next);
if (!dryRun) for (const [rel, after] of edits) writeFileSync(abs(rel), after);

console.log(`${dryRun ? '[预览，未写入] ' : ''}版本号 ${current} → ${next}\n`);
for (const [rel] of edits) console.log(`  ${dryRun ? '·' : '✓'} ${rel}`);

if (withGit && !dryRun) {
  try {
    execFileSync('git', ['rev-parse', '--git-dir'], { cwd: root, stdio: 'ignore' });
  } catch {
    console.log('\n！当前目录不是 git 仓库，已跳过 commit / tag（上面四个文件已改好）');
    console.log(`\n手动提交：\n  git init -b main && git add -A && git commit -m "chore(release): v${next}"`);
    process.exit(0);
  }
  const git = (...a) => execFileSync('git', a, { cwd: root, stdio: 'inherit' });
  git('add', ...edits.map(([rel]) => rel));
  git('commit', '-m', `chore(release): v${next}`);
  git('tag', '-a', `v${next}`, '-m', `Markdown Hub v${next}`);
  console.log(`\n已创建提交与 tag v${next}。推送到 GitHub 即可触发 release.yml 自动构建：\n  git push && git push --tags`);
} else {
  console.log(
    `\n下一步：\n  npm.cmd run tauri build --bundles nsis     # 本地出安装包（配了 CI 则可跳过）\n  git add -A && git commit -m "chore(release): v${next}"\n  git tag v${next} && git push --tags        # 推 tag 触发自动构建发布`,
  );
}
