const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.sourceExts.push('mjs');

config.server = {
  ...config.server,
  middlewareMode: false,
};

module.exports = config;
