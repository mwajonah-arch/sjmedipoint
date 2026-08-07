import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/sjmedipoint/', // GitHub Pages base path
  server: {
    port: 3000,
    strictPort: true
  },
  optimizeDeps: {
    esbuildOptions: {
      // Esbuild can't handle JSX in .js files we're importing from esm.sh
      // We'll need to exclude those or handle differently
    }
  }
});