#!/usr/bin/env bash
# 在「跑课程的那台 Linux」上执行（SSH 进去后）：看 4173/5173/3456 是否在监听
set -euo pipefail
echo "=== TCP 监听（应有 4173 或 5173，终端功能还需 3456）==="
if command -v ss >/dev/null 2>&1; then
  ss -tlnH | grep -E ':4173|:5173|:3456' || echo "（没有匹配：说明对应服务没起来）"
else
  netstat -tln 2>/dev/null | grep -E '4173|5173|3456' || true
fi
echo ""
echo "=== 本机探测 http://127.0.0.1:4173 ==="
curl -sS -o /dev/null -w "HTTP %{http_code}\n" --connect-timeout 2 http://127.0.0.1:4173/ || echo "连接失败（preview 未启动或端口不对）"
echo "=== 本机探测 http://127.0.0.1:5173 ==="
curl -sS -o /dev/null -w "HTTP %{http_code}\n" --connect-timeout 2 http://127.0.0.1:5173/ || echo "连接失败（dev 未启动）"
