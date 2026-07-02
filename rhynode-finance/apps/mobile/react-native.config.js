const path = require('path');

module.exports = {
  root: path.resolve(__dirname),
  project: {
    ios: {
      sourceDir: path.resolve(__dirname, 'ios'),
    },
    android: {
      sourceDir: path.resolve(__dirname, 'android'),
    },
  },
};
