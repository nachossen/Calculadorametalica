import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: 'all',
  },
  css: {
    postcss: {
      plugins: [
        tailwindcss({ config: path.join(__dirname, 'tailwind.config.js') }),
        autoprefixer(),
      ],
    },
  },
  test: {
    environment: 'node',
    globals: true,
  },
});
