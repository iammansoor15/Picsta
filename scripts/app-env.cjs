const path = require('node:path');
const vm = require('node:vm');

function dotenvOptions() {
  return {
    moduleName: '@env',
    path: path.resolve(__dirname, '..', process.env.ENVFILE || '.env'),
    allowlist: ['BASE_URL'],
    allowUndefined: false,
  };
}

// Use the same dotenv plugin as Metro, including its file and CI overrides.
function readAppEnvironment() {
  const { transformSync } = require('@babel/core');
  const { code } = transformSync(
    "import { BASE_URL } from '@env'; module.exports = BASE_URL;",
    {
      configFile: false,
      babelrc: false,
      plugins: [[require.resolve('react-native-dotenv'), dotenvOptions()]],
    },
  );
  const context = { module: { exports: undefined } };
  vm.runInNewContext(code, context);
  const value = context.module.exports;
  let url;
  try {
    url = new URL(typeof value === 'string' ? value.trim() : '');
  } catch {
    throw new Error('Set BASE_URL to a valid HTTP(S) origin in the app .env or build environment.');
  }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password ||
      url.search || url.hash || !/^\/*$/.test(url.pathname)) {
    throw new Error('BASE_URL must be an HTTP(S) origin without credentials, a path, query, or fragment.');
  }
  return { baseUrl: url.origin, host: url.hostname, scheme: url.protocol.slice(0, -1) };
}

module.exports = { dotenvOptions, readAppEnvironment };

if (require.main === module) {
  try {
    const modeIndex = process.argv.indexOf('--mode');
    if (modeIndex !== -1) {
      process.env.NODE_ENV = process.argv[modeIndex + 1];
      process.env.BABEL_ENV = process.argv[modeIndex + 1];
    }
    process.stdout.write(JSON.stringify(readAppEnvironment()));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
