import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // Use relative paths for built assets
  server: {
    host: true, // 0.0.0.0：内网其它设备可用 http://本机IP:5173 访问
    port: 5173,
  },
  // 默认只监听 127.0.0.1 时，局域网访问本机 IP 会得到 ERR_CONNECTION_REFUSED
  preview: {
    host: true,
    port: 4173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  }
});
