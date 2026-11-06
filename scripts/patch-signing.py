"""Troca a assinatura debug do release pela chave de envio (usado no workflow do AAB)."""
import re

p = 'android/app/build.gradle'
s = open(p).read()

upload = (
    "upload {\n"
    "            storeFile file(MYAPP_UPLOAD_STORE_FILE)\n"
    "            storePassword MYAPP_UPLOAD_STORE_PASSWORD\n"
    "            keyAlias MYAPP_UPLOAD_KEY_ALIAS\n"
    "            keyPassword MYAPP_UPLOAD_KEY_PASSWORD\n"
    "        }\n        "
)
s, n1 = re.subn(r"(signingConfigs\s*\{\s*)", lambda m: m.group(1) + upload, s, count=1)
s, n2 = re.subn(
    r"(buildTypes\s*\{.*?release\s*\{[^}]*?)signingConfig signingConfigs\.debug",
    r"\1signingConfig signingConfigs.upload",
    s, count=1, flags=re.S,
)
assert n1 == 1 and n2 == 1, 'build.gradle fora do formato esperado'
open(p, 'w').write(s)
