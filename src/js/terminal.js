import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import 'xterm/css/xterm.css';

let term = null;
let fitAddon = null;
let ws = null;
let isTerminalOpen = false;
let reconnectTimer = null;
let termDataDisposable = null;
let connectionPromise = null;
let pendingTerminalInputs = [];
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
let hasShownConnectionError = false;
let shouldMaintainConnection = false;
let hasBoundWindowResize = false;

export function initTerminal() {
    const container = document.getElementById('terminal-container');
    if (!container) return;
    
    // 重置连接状态
    reconnectAttempts = 0;
    hasShownConnectionError = false;

    term = new Terminal({
        cursorBlink: true,
        fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace',
        fontSize: 14,
        theme: {
            background: '#1e1e1e',
            foreground: '#d4d4d4'
        }
    });

    fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());

    term.open(container);

    if (!termDataDisposable) {
        termDataDisposable = term.onData((data) => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'input', data }));
            }
        });
    }

    // Handle resize
    if (!hasBoundWindowResize) {
        window.addEventListener('resize', () => {
            if (isTerminalOpen && fitAddon) {
                fitAddon.fit();
                sendResize();
            }
        });
        hasBoundWindowResize = true;
    }
    
    // Handle drag resize for terminal panel
    setupDragResize();
}

function getTerminalWsUrl() {
    const host = window.location.hostname || 'localhost';
    const isSecure = window.location.protocol === 'https:';
    const scheme = isSecure ? 'wss' : 'ws';
    return `${scheme}://${host}:3456`;
}

function connectWebSocket() {
    if (connectionPromise) {
        return connectionPromise;
    }

    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }

    // 限制重连次数，避免无限刷屏
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        if (!hasShownConnectionError) {
            term.write('\r\n*** 无法连接到终端服务器 ***\r\n');
            term.write('\r\n可能的原因：\r\n');
            term.write('1. 服务器未启动（请运行 npm run teach）\r\n');
            term.write('2. 防火墙阻挡了 3456 端口\r\n');
            term.write('3. 跨设备访问时，请确保服务器 IP 可访问\r\n');
            term.write('\r\n请刷新页面重试，或联系管理员。\r\n');
            hasShownConnectionError = true;
        }
        pendingTerminalInputs = [];
        return Promise.reject(new Error('Terminal server unavailable'));
    }

    reconnectAttempts++;
    const wsUrl = getTerminalWsUrl();

    connectionPromise = new Promise((resolve, reject) => {
        let opened = false;

        try {
            ws = new WebSocket(wsUrl);
        } catch (e) {
            console.error('Failed to create WebSocket:', e);
            term.write(`\r\n*** WebSocket 创建失败: ${e.message} ***\r\n`);
            connectionPromise = null;
            reject(e);
            return;
        }

        ws.onopen = () => {
            opened = true;
            reconnectAttempts = 0;
            hasShownConnectionError = false;
            term.write('\r\n*** Connected to terminal server ***\r\n');
            if (fitAddon) {
                fitAddon.fit();
            }
            sendResize();
            flushPendingTerminalInputs();
            connectionPromise = null;
            resolve();
        };

        ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                if (msg.type === 'output') {
                    term.write(msg.data);
                }
            } catch (e) {
                console.error('Failed to parse terminal message', e);
            }
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            // 只在前几次显示错误，避免刷屏
            if (reconnectAttempts <= 2) {
                term.write(`\r\n*** Connection error (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}) ***\r\n`);
            }
        };

        ws.onclose = () => {
            const wasConnected = opened;
            connectionPromise = null;
            ws = null;

            if (wasConnected) {
                term.write('\r\n*** Disconnected from terminal server ***\r\n');
            } else {
                reject(new Error('Terminal connection closed before ready'));
            }

            if (!shouldMaintainConnection) {
                return;
            }

            if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                reconnectTimer = setTimeout(() => {
                    connectWebSocket().catch(() => {});
                }, 3000);
            } else {
                connectWebSocket().catch(() => {});
            }
        };
    });

    return connectionPromise;
}

function sendResize() {
    if (ws && ws.readyState === WebSocket.OPEN && term) {
        ws.send(JSON.stringify({
            type: 'resize',
            cols: term.cols,
            rows: term.rows
        }));
    }
}

function ensureTerminalConnection() {
    shouldMaintainConnection = true;
    if (ws && ws.readyState === WebSocket.OPEN) {
        return Promise.resolve();
    }

    return connectWebSocket();
}

function flushPendingTerminalInputs() {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        return;
    }

    while (pendingTerminalInputs.length > 0) {
        const nextInput = pendingTerminalInputs.shift();
        ws.send(JSON.stringify({ type: 'input', data: nextInput }));
    }
}

function queueTerminalInput(input) {
    pendingTerminalInputs.push(input);
    ensureTerminalConnection().catch(() => {
        pendingTerminalInputs = [];
    });
}

function focusTerminalPanel() {
    if (!fitAddon) {
        return;
    }

    setTimeout(() => {
        fitAddon.fit();
        sendResize();
        term.focus();
    }, 300);
}

export function toggleTerminal() {
    const panel = document.getElementById('terminal-panel');
    if (!panel) return;
    
    if (isTerminalOpen) {
        panel.classList.remove('open');
        isTerminalOpen = false;
        shouldMaintainConnection = false;
        pendingTerminalInputs = [];
        if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
        }
        if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
            ws.close();
        }
    } else {
        panel.classList.add('open');
        isTerminalOpen = true;
        ensureTerminalConnection().catch(() => {});
        focusTerminalPanel();
    }
}

/**
 * 安全地转义 shell 命令中的参数
 * 处理单引号、反斜杠等特殊字符
 */
function escapeShellArg(arg) {
    // 使用 $'...' 语法来处理转义序列
    // 先处理反斜杠，再处理单引号
    return arg
        .replace(/\\/g, '\\\\')  // 先转义反斜杠
        .replace(/'/g, "'\\''");   // 再转义单引号
}

/**
 * 验证技能命令格式是否合法
 * 只允许字母、数字、连字符和下划线
 */
function isValidSkillName(name) {
    return /^[a-zA-Z0-9_-]+$/.test(name);
}

function buildSkillCommand(command) {
    const prompt = command.substring(1);
    const parts = prompt.split(' ');
    const skillName = parts[0];
    
    // 验证技能名格式
    if (!isValidSkillName(skillName)) {
        term.writeln(`\r\n❌ 无效的技能名: ${skillName}`);
        return null;
    }
    
    // 获取参数部分（如果有的话）
    const args = parts.slice(1).join(' ');
    const escapedArgs = args ? escapeShellArg(args) : '';
    const fullPrompt = escapedArgs ? `${skillName} ${escapedArgs}` : skillName;
    
    return [
        'clear',
        `echo -e '\\033[36m⏳ 正在调用技能 ${skillName}，请稍候（通常需要 30-90 秒）...\\033[0m'`,
        `echo ''`,
        `rm -rf ~/Documents/notes/* 2>/dev/null`,
        `claude --dangerously-skip-permissions -p '${fullPrompt}' < /dev/null`,
        `echo ''`,
        `echo -e '\\033[32m✅ 执行完毕。\\033[0m'`
    ].join(' && ');
}

function buildTerminalCommand(command) {
    if (command.startsWith('/')) {
        return buildSkillCommand(command);
    }

    if (command === 'claude') {
        return `clear && echo -e '\\033[36m⏳ 正在启动智能体...\\033[0m\\n' && claude --dangerously-skip-permissions`;
    }

    // 对于非 / 开头的命令，进行基础验证
    if (/[;&|`$]/.test(command)) {
        term.writeln(`\r\n❌ 命令包含非法字符`);
        return null;
    }

    return command;
}

export function openTerminalWith(command) {
    const panel = document.getElementById('terminal-panel');
    if (!panel) return;
    
    if (!isTerminalOpen) {
        toggleTerminal();
    } else {
        ensureTerminalConnection().catch(() => {});
        focusTerminalPanel();
    }

    const terminalCommand = buildTerminalCommand(command);
    if (!terminalCommand) {
        return;
    }

    queueTerminalInput(`${terminalCommand}\r`);
    term.focus();
}

function setupDragResize() {
    const panel = document.getElementById('terminal-panel');
    const resizer = document.getElementById('terminal-resizer');
    if (!panel || !resizer) return;

    let isDragging = false;
    let startY, startHeight;

    resizer.addEventListener('mousedown', (e) => {
        isDragging = true;
        startY = e.clientY;
        startHeight = parseInt(document.defaultView.getComputedStyle(panel).height, 10);
        document.body.style.cursor = 'ns-resize';
        // Prevent text selection while dragging
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const newHeight = startHeight - (e.clientY - startY);
        // Min height 100px, max height 80vh
        if (newHeight > 100 && newHeight < window.innerHeight * 0.8) {
            panel.style.height = newHeight + 'px';
            if (fitAddon) fitAddon.fit();
        }
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            document.body.style.cursor = '';
            sendResize();
        }
    });
}
