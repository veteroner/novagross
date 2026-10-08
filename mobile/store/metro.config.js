// Metro yapılandırması.
// Proje harici diskte (LaCie) — macOS her dosya için "._*" AppleDouble kopyası
// üretiyor; Metro bunları JS sanıp çöker. Bundler'dan dışla.
const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)
config.resolver.blockList = [/(^|[\/\\])\._[^\/\\]*$/]

module.exports = config
