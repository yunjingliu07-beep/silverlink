# Silver Link 银龄连线 · 安卓演示版

将现有 `../dist/` 网站资源随 APK 一起安装，使用 Capacitor 8。
页面、四种演示角色、匹配、预约、签到、评分、积分、机构批量录入和双语逻辑沿用网站。
网站发布目录未修改；安卓适配只在 `mobile/` 内生效。

## 安装和使用

- 下载：[GitHub Actions](https://github.com/yunjingliu07-beep/silverlink/actions/workflows/check.yml)
  最新成功构建中的 `Silver-Link-Android-Demo` 附件，解压后得到 APK。
- 安装包名称：`Silver-Link-Demo-1.0.apk`。
- 应用名：Silver Link 银龄连线；应用包名：`sg.silverlink.demo`。
- 最低 Android 7.0（API 24）；建议更新 Android System WebView / Chrome 后使用。
- 这是使用开发证书签名的演示 APK，可直接安装，不是 Google Play 发布包。
- 将 APK 下载到安卓手机后打开，按系统提示允许当前下载应用安装此 APK。
- 页面、图片、中英界面和主要演示流程可离线使用。
- 资料、预约和积分仅保存在本 App 中，不与网站、其他手机共享；清除应用数据或卸载会丢失记录。
- 安装后可在顶部切换志愿者、老人、机构和管理员，体验完整服务流程。

## 安卓适配

- 返回键优先关闭弹窗，然后返回首页；在首页再次返回退出。
- 系统状态栏、导航栏和软键盘由 Capacitor 原生边距处理。
- JSON 数据和 HTML 演示证书通过系统文件保存窗口导出，不申请广泛存储权限。
- 电话链接只打开系统拨号界面，不自动拨号。
- 语音输入保留确认步骤，调用设备已有的语音识别服务。是否支持离线识别取决于该服务；不可用时继续文字输入。App 不保存录音。
- 固定中英界面和本地词库继续工作；没有额外接入自由文本云翻译服务。
- 图标和启动界面使用项目原有的绿色／金色连线标志。

## 构建

需要 Node.js 22+、JDK 21、Android SDK platform 36、Build Tools 35.0.0 / 36.0.0。
通过 Android Studio SDK Manager 安装 SDK 并接受相关 SDK 许可。
设置 `JAVA_HOME` 和 `ANDROID_HOME`，或在 `android/local.properties` 中填写 `sdk.dir`。

```bash
cd mobile
npm ci
npm run apk
```

输出：`android/app/build/outputs/apk/debug/app-debug.apk`。
Gradle Wrapper 固定版本和下载校验值；npm 依赖版本由 lockfile 固定。
构建脚本首次运行会在 `.local/debug.keystore` 生成演示签名密钥。
密钥、构建产物和 SDK 路径不会提交到 Git。保留同一密钥才能覆盖升级已安装的版本；更换密钥需先卸载旧版本。
GitHub Actions 每次构建使用临时演示密钥，因此安装下一次构建前可能需要卸载旧版本。
构建附件保留 30 天，过期后可以重新运行工作流生成。

## 验证

根目录：

```bash
npm test
npm run build
```

安卓网页和桥接接口回归（需要 Python Playwright 和 Chromium）：

```bash
cd mobile
npm run prepare:web
python3 -m http.server 5173 --directory www
# 另一个终端
python3 scripts/check-mobile.py
```

该检查覆盖移动布局、语言和角色保存、Blob 文件导出、返回键优先级、语音成功和失败回退、拨号接口。
安卓接口在此检查中使用模拟实现；它不是安卓真机或模拟器测试。

本次构建已通过根目录测试和静态检查、上述移动桥接检查、中英文完整服务流程浏览器回归，
以及 APK v2 签名、ZIP 对齐和离线资源一致性检查。未运行安卓真机或模拟器测试。

当前演示仍没有真实身份认证、跨设备任务同步、生产数据库或消息推送。
