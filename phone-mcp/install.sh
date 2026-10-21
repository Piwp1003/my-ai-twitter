#!/data/data/com.termux/files/usr/bin/bash
# 谷雨 · 手机 MCP 一键安装（在 Termux 里跑）
#   curl -fsSL https://cdn.jsdelivr.net/gh/Piwp1003/my-ai-twitter@main/phone-mcp/install.sh | bash
set -e
SRC1=https://cdn.jsdelivr.net/gh/Piwp1003/my-ai-twitter@main/phone-mcp/guyu_phone_mcp.py
SRC2=https://raw.githubusercontent.com/Piwp1003/my-ai-twitter/main/phone-mcp/guyu_phone_mcp.py
echo "📦 装 python 和 termux-api……"
pkg install -y python termux-api
mkdir -p ~/guyu
echo "⬇️  下载手机 MCP……"
curl -fsSL "$SRC1" -o ~/guyu/guyu_phone_mcp.py || curl -fsSL "$SRC2" -o ~/guyu/guyu_phone_mcp.py
# 以后只要敲 guyu-phone 就能开
cat > "$PREFIX/bin/guyu-phone" <<'X'
#!/data/data/com.termux/files/usr/bin/bash
termux-wake-lock 2>/dev/null || true
exec python ~/guyu/guyu_phone_mcp.py "$@"
X
chmod +x "$PREFIX/bin/guyu-phone"
# 装了 Termux:Boot 的话，开机自己起
mkdir -p ~/.termux/boot
cat > ~/.termux/boot/guyu-phone.sh <<'X'
#!/data/data/com.termux/files/usr/bin/bash
termux-wake-lock
python ~/guyu/guyu_phone_mcp.py >> ~/guyu/log.txt 2>&1
X
chmod +x ~/.termux/boot/guyu-phone.sh
echo
echo "✅ 装好了。现在敲：guyu-phone"
echo "   （要让 TA 能发短信 / 打电话：guyu-phone --danger）"
