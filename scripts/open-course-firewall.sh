#!/usr/bin/env bash
# 放行技能课程本地授课端口：4173（Vite preview）、3456（终端 WebSocket）
# 用法：bash scripts/open-course-firewall.sh
# 若未以 root 运行，会尝试 sudo（需输入密码）

set -euo pipefail

SUDO=""
if [[ "$(id -u)" -ne 0 ]]; then
  SUDO="sudo"
fi

if command -v ufw >/dev/null 2>&1; then
  echo "使用 ufw 放行 TCP 4173、3456 …"
  $SUDO ufw allow 4173/tcp comment 'skills-course vite preview' || true
  $SUDO ufw allow 3456/tcp comment 'skills-course terminal ws' || true
  $SUDO ufw reload
  echo ""
  echo "当前 ufw 中与课程相关的规则："
  $SUDO ufw status numbered | grep -E '4173|3456' || $SUDO ufw status
elif command -v firewall-cmd >/dev/null 2>&1; then
  echo "使用 firewalld 放行 TCP 4173、3456 …"
  $SUDO firewall-cmd --permanent --add-port=4173/tcp
  $SUDO firewall-cmd --permanent --add-port=3456/tcp
  $SUDO firewall-cmd --reload
  $SUDO firewall-cmd --list-ports
else
  echo "未找到 ufw 或 firewalld。请手动放行 TCP 4173 与 3456，或安装 ufw："
  echo "  sudo apt install ufw"
  echo "  sudo ufw allow 4173/tcp"
  echo "  sudo ufw allow 3456/tcp"
  exit 1
fi

echo ""
echo "完成。"
