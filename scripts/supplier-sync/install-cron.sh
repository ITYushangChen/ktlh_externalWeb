#!/usr/bin/env bash
# 安装 launchd 定时任务：每天凌晨 1:00 同步
# 用法: ./install-cron.sh
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLIST="$HOME/Library/LaunchAgents/com.ktlh.supplier-sync.plist"
LOG_DIR="${HOME}/Library/Logs/ktlh"
LOG_FILE="${LOG_DIR}/supplier-sync.log"

mkdir -p "$LOG_DIR"

cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.ktlh.supplier-sync</string>
  <key>ProgramArguments</key>
  <array>
    <string>${DIR}/run.sh</string>
  </array>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key>
    <integer>1</integer>
    <key>Minute</key>
    <integer>0</integer>
  </dict>
  <key>StandardOutPath</key>
  <string>${LOG_FILE}</string>
  <key>StandardErrorPath</key>
  <string>${LOG_FILE}</string>
  <key>RunAtLoad</key>
  <false/>
</dict>
</plist>
EOF

launchctl unload "$PLIST" 2>/dev/null || true
launchctl load "$PLIST"

echo "已安装定时任务: 每天 01:00 执行"
echo "日志: $LOG_FILE"
echo "手动执行: ${DIR}/run.sh"
echo "卸载: launchctl unload $PLIST && rm $PLIST"
