"""Verify that the installable APK contains every prepared website asset, intact."""
from pathlib import Path
from zipfile import ZipFile
import sys

web = Path(__file__).resolve().parents[1] / "www"
required = ["index.html", "manage/index.html", "manage/app.js", "manage/i18n-zh.js",
            "shared-header.js", "shared-layout.css", "mobile.js", "reader.js"]
assert all((web / name).is_file() for name in required), "Incomplete prepared website"
assert '../mobile.js' in (web / 'manage/index.html').read_text()
assert './manage/index.html#' in (web / 'app.js').read_text()
with ZipFile(sys.argv[1]) as apk:
    assert apk.testzip() is None, "APK ZIP is corrupt"
    count = 0
    for source in web.rglob("*"):
        if source.is_file():
            name = "assets/public/" + source.relative_to(web).as_posix()
            assert apk.read(name) == source.read_bytes(), f"APK asset differs: {name}"
            count += 1
    assert apk.read("classes.dex"), "Native Android application is missing"
print(f"PASS: all {count} website assets, including both entry points, match the APK.")
