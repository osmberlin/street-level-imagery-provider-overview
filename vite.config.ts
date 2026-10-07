/// <reference types="vitest/config" />

import { realpathSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import browserslistToEsbuild from 'browserslist-to-esbuild'
import { defineConfig } from 'vite'

const rootDir = path.dirname(fileURLToPath(import.meta.url))
// Bun often symlinks packages into ~/.bun/install/cache; Vite must serve those assets in dev.
const bunInstallCache = path.join(os.homedir(), '.bun', 'install', 'cache')
const allowedFsRoots = [rootDir, bunInstallCache]
try {
  allowedFsRoots.push(realpathSync(path.join(rootDir, 'node_modules')))
} catch {
  // node_modules may be absent during config-only checks
}

export default defineConfig({
  base: '/street-level-imagery-provider-overview/',
  resolve: {
    // Bun may resolve PSV deps from ~/.bun/install/cache; pin three to the project install.
    dedupe: ['three'],
    alias: {
      '@': path.resolve(rootDir, 'src'),
      three: path.resolve(rootDir, 'node_modules/three'),
    },
  },
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: false,
    }),
    react({ compiler: true }),
    tailwindcss(),
  ],
  // MapLibre 6 worker must not land in Vite's optimize-deps cache; loaded via `setWorkerUrl` +
  // `?worker&url` (src/features/map/maplibre-worker.ts), same as knotenpunkte.
  optimizeDeps: {
    exclude: ['maplibre-gl/dist/maplibre-gl-worker.mjs'],
    include: ['three'],
  },
  server: {
    fs: {
      allow: allowedFsRoots,
    },
  },
  build: {
    target: browserslistToEsbuild(),
    sourcemap: true,
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
})
