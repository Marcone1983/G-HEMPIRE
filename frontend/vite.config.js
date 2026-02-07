import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, '..'), 'VITE_');

  const supabaseUrl = env.VITE_SUPABASE_URL || '';
  const backendUrl = `${supabaseUrl}/functions/v1/game-api`;

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    esbuild: {
      loader: 'jsx',
      include: /src\/.*\.js$/,
      exclude: [],
    },
    optimizeDeps: {
      esbuildOptions: {
        loader: {
          '.js': 'jsx',
        },
      },
    },
    define: {
      'process.env.REACT_APP_BACKEND_URL': JSON.stringify(backendUrl),
      'process.env.NODE_ENV': JSON.stringify(mode),
      'process.env.PUBLIC_URL': JSON.stringify(''),
    },
  };
});
