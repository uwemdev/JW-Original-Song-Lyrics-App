const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add mjs extension to resolve lucide-react-native correctly
config.resolver.sourceExts.push('mjs');

module.exports = config;
