#!/usr/bin/env bash
# Instala o APK no emulador, abre o app varias vezes (inicio a frio) e coleta logcat.
# Uso (dentro do emulador): bash scripts/emulator-smoke.sh <apk> <saida_dir>
# Termina com codigo 1 se o app cair.
set -u
APK="$1"
OUT="$2"
PKG="br.com.wilson.cobrinha"
mkdir -p "$OUT"

adb wait-for-device
adb install -r "$APK" > "$OUT/install.txt" 2>&1
cat "$OUT/install.txt"

adb logcat -c
alive=0
for i in 1 2 3 4; do
  adb shell am force-stop "$PKG"
  sleep 2
  adb shell monkey -p "$PKG" -c android.intent.category.LAUNCHER 1 > /dev/null 2>&1
  sleep 14
  pid=$(adb shell pidof "$PKG" | tr -d '\r')
  echo "abertura $i: pid=${pid:-NENHUM}" | tee -a "$OUT/pids.txt"
  if [ -n "$pid" ]; then alive=$((alive + 1)); fi
done

adb logcat -d > "$OUT/logcat.txt" 2>&1
adb exec-out screencap -p > "$OUT/screen.png" 2>/dev/null || true

crashes=$(grep -c "Process: $PKG" "$OUT/logcat.txt")
echo "=== resumo: abriu vivo $alive/4, crashes do app: $crashes ==="

if [ "$crashes" -gt 0 ]; then
  echo "=== TRECHO DO CRASH ==="
  grep -n -A30 "FATAL EXCEPTION" "$OUT/logcat.txt" | grep -E "FATAL|Process|Caused by|Exception|Error|at (br\.|com\.(facebook|google|wilson)|androidx\.work)" | head -40
  echo "RESULT: CRASH"
  exit 1
fi
if [ "$alive" -lt 4 ]; then
  echo "RESULT: APP NAO FICOU VIVO"
  exit 1
fi
echo "=== linhas do JS ==="
grep -E "ReactNativeJS" "$OUT/logcat.txt" | head -10
echo "RESULT: OK"
exit 0
