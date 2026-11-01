const reactNativePreset = require('react-native/jest-preset');

module.exports = {
  preset: 'react-native',
  transform: {
    ...reactNativePreset.transform,
    '^.+\\.jsx$': 'babel-jest',
  },
};
