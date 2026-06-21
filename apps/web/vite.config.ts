import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '../../', '');
  const isElectron = env.VITE_ELECTRON === '1' || process.env.VITE_ELECTRON === '1';

  return {
    plugins: [react()],
    base: isElectron ? './' : '/',
    server: {
      host: '0.0.0.0',
      port: 5173,
    },
    preview: {
      host: '0.0.0.0',
      port: 4173,
    },
    envDir: '../../',
  };
});
