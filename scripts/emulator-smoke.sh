#!/usr/bin/env bash
# Instala o APK no emulador, abre o app e coleta logcat + screenshot.
# Uso (dentro do emulador): bash scripts/emulator-smoke.sh <apk> <saida_dir>
set -u
APK="$1"
OUT="$2"
PKG="br.com.wilson.cobrinha"
mkdir -p "$OUT"

adb wait-for-device
adb install -r "$APK" > "$OUT/install.txt" 2>&1
cat "$OUT/install.txt"

adb logcat -c
for i in 1 2 3; do
  adb shell monkey -p "$PKG" -c android.intent.category.LAUNCHER 1 > /dev/null 2>&1
  sleep 12
  echo "tentativa $i: pid=$(adb shell pidof "$PKG" | tr -d '\r')" | tee -a "$OUT/pids.txt"
done

adb logcat -d > "$OUT/logcat.txt" 2>&1
adb exec-out screencap -p > "$OUT/screen.png" 2>/dev/null || true

echo "=== FATAL / AndroidRuntime ==="
grep -E "FATAL EXCEPTION|AndroidRuntime|Process: $PKG|ReactNativeJS|E/ReactNative|Fatal signal|SIGABRT|SIGSEGV|UnsatisfiedLink|ClassNotFound|NoSuchMethod|Caused by|MobileAds|GoogleMobileAds|ads" "$OUT/logcat.txt" | head -80
exit 0
