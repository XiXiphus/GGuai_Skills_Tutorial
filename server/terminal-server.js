const WebSocket = require('ws');
const os = require('os');
const pty = require('node-pty');

const port = 3456;
const host = '0.0.0.0'; // 明确监听所有网络接口，支持跨设备访问

const wss = new WebSocket.Server({ port, host });

console.log(`Terminal WebSocket server listening on ${host}:${port}`);
console.log(`Local access:   ws://localhost:${port}`);
console.log(`LAN access:     ws://<this-ip>:${port}`);

wss.on('connection', (ws) => {
    console.log('New terminal connection established');
    
    const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
    
    const ptyProcess = pty.spawn(shell, ['-l'], {
        name: 'xterm-color',
        cols: 80,
        rows: 24,
        cwd: process.env.HOME,
        env: process.env
    });
    
    ptyProcess.onData((data) => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'output', data }));
        }
    });
    
    ws.on('message', (msg) => {
        try {
            const parsed = JSON.parse(msg);
            if (parsed.type === 'input') {
                ptyProcess.write(parsed.data);
            } else if (parsed.type === 'resize') {
                ptyProcess.resize(parsed.cols, parsed.rows);
            }
        } catch (e) {
            console.error('Failed to parse message', e);
        }
    });
    
    ws.on('close', () => {
        console.log('Terminal connection closed');
        ptyProcess.kill();
    });
});
