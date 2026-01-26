import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { visualizer } from 'rollup-plugin-visualizer';
import viteCompression from 'vite-plugin-compression';
import { imagetools } from 'vite-imagetools';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Image optimization
    imagetools({
      defaultDirectives: () => {
        // Apply default optimizations
        return new URLSearchParams({
          format: 'webp',
          quality: '80',
        });
      },
    }),
    // Gzip compression
    viteCompression({
      verbose: true,
      disable: false,
      threshold: 10240, // Only compress files larger than 10kb
      algorithm: 'gzip',
      ext: '.gz',
    }),
    // Brotli compression
    viteCompression({
      verbose: true,
      disable: false,
      threshold: 10240,
      algorithm: 'brotliCompress',
      ext: '.br',
    }),
    // Bundle analyzer - only in build
    visualizer({
      filename: './dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  build: {
    // Enable minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs in production
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info'],
      },
    },
    // Optimize chunk splitting
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor chunks - 순환 의존성 방지를 위해 단순화
          if (id.includes('node_modules')) {
            // Spline은 별도 분리 (매우 큼)
            if (id.includes('@splinetool')) {
              return 'spline';
            }
            // framer-motion 분리
            if (id.includes('framer-motion')) {
              return 'framer-motion';
            }
            // recharts/d3 분리
            if (id.includes('recharts') || id.includes('d3-')) {
              return 'charts';
            }
            // react-icons 분리
            if (id.includes('react-icons')) {
              return 'icons';
            }
            // axios 분리
            if (id.includes('axios')) {
              return 'axios';
            }
            // 나머지 모든 node_modules는 vendor로
            return 'vendor';
          }
          // Split by feature
          if (id.includes('/src/pages/')) {
            const match = id.match(/\/pages\/([^/]+)\//);
            if (match) {
              return `page-${match[1]}`;
            }
          }
          if (id.includes('/src/api/')) {
            return 'api';
          }
          if (id.includes('/src/player/')) {
            return 'player';
          }
        },
      },
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Enable source maps for production debugging (can disable for smaller bundles)
    sourcemap: false,
    commonjsOptions: {
      include: [/recharts/, /node_modules/],
      transformMixedEsModules: true,
    },
  },
  // CSS optimization
  css: {
    devSourcemap: false,
  },
  // Resolve configuration for React 19 compatibility
  resolve: {
    conditions: ['default', 'import', 'module'],
    dedupe: ['react', 'react-dom'],
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'recharts', 'lodash.debounce'],
    exclude: ['@splinetool/react-spline'],
    esbuildOptions: {
      jsx: 'automatic',
      jsxDev: false,
    },
    force: true,
  },
});
