import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { existsSync } from 'node:fs';

/** Relative `.js` imports resolve to co-located `.tsx`/`.ts` when present (stale emit files in src). */
function preferTypeScriptSources(): Plugin {
  return {
    name: 'prefer-typescript-sources',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      if (!importer || !source.endsWith('.js') || !source.startsWith('.')) return null;
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
      if (!resolved?.id.endsWith('.js')) return null;
      for (const ext of ['.tsx', '.ts']) {
        const tsPath = resolved.id.slice(0, -3) + ext;
        if (existsSync(tsPath)) return tsPath;
      }
      return null;
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '../../', '');
  const isElectron = env.VITE_ELECTRON === '1' || process.env.VITE_ELECTRON === '1';
  const skipBrowserOpen = process.env.NIHA_SKIP_BROWSER_OPEN === '1';

  return {
    plugins: [preferTypeScriptSources(), react()],
    base: isElectron ? './' : '/',
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
      open: !isElectron && !skipBrowserOpen ? '/' : false,
    },
    preview: {
      host: '0.0.0.0',
      port: 4173,
    },
    envDir: '../../',
  };
});
