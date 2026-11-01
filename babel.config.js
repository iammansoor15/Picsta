const { dotenvOptions, readAppEnvironment } = require('./scripts/app-env.cjs');

module.exports = function (api) {
  api.cache(false);
  readAppEnvironment();
  return {
    presets: ['module:@react-native/babel-preset'],
    plugins: [
      ['module:react-native-dotenv', dotenvOptions()],
      [
        'react-native-worklets/plugin',
        {
          relativeSourceLocation: true,
          globals: ['__reanimatedWorkletInit'],
        },
      ],
    ],
  };
};
