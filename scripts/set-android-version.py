import os
import re
from pathlib import Path

path = Path("android/app/build.gradle")
source = path.read_text(encoding="utf-8")
version_code = os.environ.get("ANDROID_VERSION_CODE", "1")
version_name = os.environ.get("ANDROID_VERSION_NAME", "1.0.0")\nif version_name.startswith("v"):\n    version_name = version_name[1:]
match = re.search(r"defaultConfig\s*\{", source)
if not match:
    raise SystemExit("Could not find defaultConfig in android/app/build.gradle")
start = match.end()
end = source.find("\n    }", start)
if end < 0:
    raise SystemExit("Could not find end of Android defaultConfig block")
block = source[start:end]
block, code_count = re.subn(r"versionCode\s+\d+", f"versionCode {version_code}", block, count=1)
block, name_count = re.subn(r'versionName\s+"[^"]+"', f'versionName "{version_name}"', block, count=1)
if not code_count or not name_count:
    raise SystemExit("Could not update Android versionCode/versionName")
path.write_text(source[:start] + block + source[end:], encoding="utf-8")
print(f"Android version configured: code={version_code}, name={version_name}")
