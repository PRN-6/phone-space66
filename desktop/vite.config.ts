import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { spawn } from 'child_process';
import net from 'net';

function usbBridgeAutoStart(): Plugin {
  return {
    name: 'usb-bridge-autostart',
    configureServer() {
      const client = new net.Socket();
      client.setTimeout(600);
      client.on('connect', () => {
        client.destroy();
        console.log('[PHONE SPACE66] USB MTP Hardware Bridge already active on port 6655.');
      });
      client.on('error', () => {
        const bridgePath = path.resolve(__dirname, '../scripts/usb_mtp_bridge.cjs');
        console.log('[PHONE SPACE66] Launching background USB MTP Hardware Bridge...');
        const cp = spawn('node', [bridgePath], {
          stdio: 'inherit',
          detached: false,
          shell: false,
        });
        process.on('exit', () => {
          try { cp.kill(); } catch {}
        });
      });
      client.connect(6655, '127.0.0.1');
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), usbBridgeAutoStart()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: '0.0.0.0',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});


