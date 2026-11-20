// ينسخ أيقونات التطبيق الجاهزة إلى مشروعي أندرويد وآيفون بعد إنشائهما
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), res = path.join(root, 'resources');
const which = process.argv[2];

function cp(a, b) { fs.mkdirSync(path.dirname(b), { recursive: true }); fs.copyFileSync(a, b); console.log('✔', path.relative(root, b)); }

if (which === 'android') {
  const base = path.join(root, 'android/app/src/main/res');
  for (const d of fs.readdirSync(path.join(res, 'android'))) {
    for (const f of fs.readdirSync(path.join(res, 'android', d))) cp(path.join(res, 'android', d, f), path.join(base, d, f));
  }
  const bg = path.join(base, 'values/ic_launcher_background.xml');
  fs.mkdirSync(path.dirname(bg), { recursive: true });
  fs.writeFileSync(bg, '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#001506</color>\n</resources>\n');
  // أيقونة الإشعارات
  for (const d of fs.readdirSync(path.join(res, 'notify'))) cp(path.join(res, 'notify', d, 'ic_stat_notify.png'), path.join(base, d, 'ic_stat_notify.png'));
  // صلاحية الموقع (لزر "موقعي" بالفاتحة)
  const man = path.join(root, 'android/app/src/main/AndroidManifest.xml');
  if (fs.existsSync(man)) {
    let m = fs.readFileSync(man, 'utf8');
    if (!m.includes('ACCESS_FINE_LOCATION'))
      m = m.replace('</manifest>', '    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />\n    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />\n    <uses-feature android:name="android.hardware.location.gps" android:required="false" />\n    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />\n</manifest>');
    fs.writeFileSync(man, m);
  }
  // اسم التطبيق بالعربي
  const strings = path.join(base, 'values/strings.xml');
  if (fs.existsSync(strings)) {
    let s = fs.readFileSync(strings, 'utf8');
    s = s.replace(/<string name="app_name">.*?<\/string>/, '<string name="app_name">فواتح ومناسبات</string>')
         .replace(/<string name="title_activity_main">.*?<\/string>/, '<string name="title_activity_main">فواتح ومناسبات</string>');
    fs.writeFileSync(strings, s);
  }
}

if (which === 'ios') {
  const set = path.join(root, 'ios/App/App/Assets.xcassets/AppIcon.appiconset');
  cp(path.join(res, 'ios/AppIcon-512@2x.png'), path.join(set, 'AppIcon-512@2x.png'));
  fs.writeFileSync(path.join(set, 'Contents.json'), JSON.stringify({
    images: [{ filename: 'AppIcon-512@2x.png', idiom: 'universal', platform: 'ios', size: '1024x1024' }],
    info: { author: 'xcode', version: 1 }
  }, null, 2));
  const plist = path.join(root, 'ios/App/App/Info.plist');
  if (fs.existsSync(plist)) {
    let p = fs.readFileSync(plist, 'utf8');
    p = p.replace(/(<key>CFBundleDisplayName<\/key>\s*<string>)[^<]*(<\/string>)/, '$1فواتح ومناسبات$2');
    if (!p.includes('UIFileSharingEnabled'))
      p = p.replace('<dict>', '<dict>\n\t<key>UIFileSharingEnabled</key>\n\t<true/>\n\t<key>LSSupportsOpeningDocumentsInPlace</key>\n\t<true/>');
    if (!p.includes('NSLocationWhenInUseUsageDescription'))
      p = p.replace('<dict>', '<dict>\n\t<key>NSLocationWhenInUseUsageDescription</key>\n\t<string>لتحديد لوكيشن مكان الفاتحة ومشاركته</string>\n\t<key>NSPhotoLibraryAddUsageDescription</key>\n\t<string>لحفظ بطاقة الفاتحة بالصور</string>');
    fs.writeFileSync(plist, p);
  }
}
