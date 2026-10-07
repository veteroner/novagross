// iOS 27 sahne (UIScene) yaşam döngüsü — uygulama bunu benimsemezse iOS 27 açılışta
// çöker (UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption).
//
// Expo SDK 57 paketinde ExpoAppSceneDelegate var ama native şablon (bare-minimum 57.0.x)
// onu bağlamıyor. Bu eklenti prebuild sırasında:
//   1. AppDelegate'i ExpoReactNativeFactoryProvider yapar ve pencereyi kendisi oluşturmaz
//      (pencereyi ve React Native'i ExpoAppSceneDelegate başlatır),
//   2. Info.plist'e UIApplicationSceneManifest ekler.
// Expo şablonu sahne desteğini kendisi getirdiğinde bu eklenti kaldırılabilir.
const { withAppDelegate, withInfoPlist } = require('expo/config-plugins')

function patchAppDelegate(src) {
  let out = src
  if (!out.includes('ExpoReactNativeFactoryProvider')) {
    out = out.replace('class AppDelegate: ExpoAppDelegate {', 'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {')
  }
  // Pencere + startReactNative bloğunu kaldır (sahne delegate'i yapar)
  out = out.replace(
    /#if os\(iOS\) \|\| os\(tvOS\)\s*\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\s*\n\s*factory\.startReactNative\([\s\S]*?\)\s*\n#endif\s*\n/,
    '    // Pencere ve React Native ExpoAppSceneDelegate tarafından başlatılır (iOS 27 sahne yaşam döngüsü)\n'
  )
  if (!out.includes('ExpoReactNativeFactoryProvider') || out.includes('UIWindow(frame: UIScreen.main.bounds)')) {
    throw new Error('[with-ios-scene-lifecycle] AppDelegate.swift beklenen şablonda değil — eklentiyi güncelleyin')
  }
  return out
}

module.exports = function withIosSceneLifecycle(config) {
  config = withAppDelegate(config, (c) => {
    if (c.modResults.language !== 'swift') throw new Error('[with-ios-scene-lifecycle] yalnızca Swift AppDelegate desteklenir')
    c.modResults.contents = patchAppDelegate(c.modResults.contents)
    return c
  })
  config = withInfoPlist(config, (c) => {
    c.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: 'EXExpoAppSceneDelegate',
          },
        ],
      },
    }
    return c
  })
  return config
}
