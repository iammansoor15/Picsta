const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, writeFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const compileConfig = `
  const { transformFileSync } = require('@babel/core');
  const vm = require('node:vm');
  const { code } = transformFileSync('src/config/AppConfig.js');
  const result = { exports: {} };
  vm.runInNewContext(code, { module: result, exports: result.exports });
  console.log(JSON.stringify(result.exports.default));
`;

function fixture(t, content) {
  const dir = mkdtempSync(path.join(tmpdir(), 'winter-env-test-'));
  const file = path.join(dir, '.env');
  writeFileSync(file, content);
  t.after(() => {
    assert.equal(path.dirname(dir), tmpdir());
    rmSync(dir, { recursive: true, force: true });
  });
  return file;
}

function run(file, args, extraEnv = {}) {
  return spawnSync(process.execPath, args, {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      ENVFILE: file,
      BASE_URL: '',
      APP_ENV: '',
      NODE_ENV: 'development',
      BABEL_ENV: 'development',
      ...extraEnv,
    },
  });
}

function parse(result) {
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

test('Metro and Android read the same URL from the selected env file', t => {
  const file = fixture(t, 'BASE_URL=https://first.example.test///\n');
  const native = parse(run(file, ['scripts/app-env.cjs', '--mode', 'development']));
  const app = parse(run(file, ['-e', compileConfig]));
  assert.equal(app.BASE_URL, 'https://first.example.test');
  assert.equal(app.PRODUCTION_SERVER_URL, native.baseUrl);
  assert.equal(app.PRODUCTION_AUTH_SERVER_URL, native.baseUrl);
  assert.equal(app.DEVELOPMENT.DEV_SERVER_URL, native.baseUrl);
  assert.equal(native.host, 'first.example.test');
  assert.equal(native.scheme, 'https');
});

test('changing the env file changes the bundle without changing source', t => {
  const file = fixture(t, 'BASE_URL=https://first.example.test\n');
  assert.equal(parse(run(file, ['-e', compileConfig])).BASE_URL, 'https://first.example.test');
  writeFileSync(file, 'BASE_URL=http://localhost:12000\n');
  assert.equal(parse(run(file, ['-e', compileConfig])).BASE_URL, 'http://localhost:12000');
});

test('CI overrides and production env files match between JS and Android', t => {
  const file = fixture(t, 'BASE_URL=https://default.example.test\n');
  writeFileSync(`${file}.production`, 'BASE_URL=https://release.example.test\n');
  const native = parse(run(file, ['scripts/app-env.cjs', '--mode', 'production']));
  const app = parse(run(file, ['-e', compileConfig], { NODE_ENV: 'production', BABEL_ENV: 'production' }));
  assert.equal(native.baseUrl, 'https://release.example.test');
  assert.equal(app.BASE_URL, native.baseUrl);
  const override = { BASE_URL: 'https://ci.example.test' };
  assert.equal(parse(run(file, ['scripts/app-env.cjs'], override)).baseUrl, override.BASE_URL);
  assert.equal(parse(run(file, ['-e', compileConfig], override)).BASE_URL, override.BASE_URL);
});

test('missing or invalid BASE_URL stops both builds instead of choosing a fallback', t => {
  const file = fixture(t, '');
  for (const value of ['', 'not-a-url', 'ftp://files.example.test', 'https://example.test/api']) {
    writeFileSync(file, `BASE_URL=${value}\n`);
    for (const args of [['scripts/app-env.cjs'], ['-e', compileConfig]]) {
      const result = run(file, args);
      assert.notEqual(result.status, 0, `${value} was accepted`);
      assert.match(result.stderr, /BASE_URL/);
    }
  }
});
