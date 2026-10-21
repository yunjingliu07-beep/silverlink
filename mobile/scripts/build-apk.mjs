import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('..', import.meta.url));
const local = resolve(root, '.local');
mkdirSync(local, { recursive: true });
const windows = process.platform === 'win32';
function run(command, args, cwd = root) {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', shell: windows });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
if (!existsSync(resolve(local, 'debug.keystore'))) {
  const keytool = process.env.JAVA_HOME
    ? resolve(process.env.JAVA_HOME, 'bin', windows ? 'keytool.exe' : 'keytool')
    : 'keytool';
  run(keytool, [
    '-genkeypair', '-keystore', resolve(local, 'debug.keystore'),
    '-storepass', 'android', '-keypass', 'android', '-alias', 'androiddebugkey',
    '-keyalg', 'RSA', '-keysize', '2048', '-validity', '10000',
    '-dname', 'CN=Silver Link Demo, O=Silver Link, C=SG',
  ]);
}
run(windows ? 'gradlew.bat' : './gradlew', ['assembleDebug'], resolve(root, 'android'));
console.log('APK: mobile/android/app/build/outputs/apk/debug/app-debug.apk');
