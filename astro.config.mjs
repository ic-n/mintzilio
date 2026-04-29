import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill';
import { NodeModulesPolyfillPlugin } from '@esbuild-plugins/node-modules-polyfill';

export default defineConfig({
  integrations: [react()],

  vite: {
    plugins: [tailwindcss()],

    define: {
      global: 'globalThis',
    },

    resolve: {
      alias: {
        buffer: 'buffer',
        stream: 'stream-browserify',
      },
    },

    optimizeDeps: {
      include: [
        '@solana/web3.js',
        '@metaplex-foundation/umi-bundle-defaults',
        'buffer',
        'stream-browserify',
      ],
      esbuildOptions: {
        define: {
          global: 'globalThis',
        },
        plugins: [
          NodeGlobalsPolyfillPlugin({ buffer: true, process: true }),
          NodeModulesPolyfillPlugin(),
        ],
      },
    },
  },
});
