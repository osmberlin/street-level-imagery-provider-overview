/// <reference types="vitest/config" />

import { realpathSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import browserslistToEsbuild from 'browserslist-to-esbuild'
import { defineConfig, type Plugin } from 'vite'

const rootDir = path.dirname(fileURLToPath(import.meta.url))
// Bun often symlinks packages into ~/.bun/install/cache; Vite must serve those assets in dev.
const bunInstallCache = path.join(os.homedir(), '.bun', 'install', 'cache')
const allowedFsRoots = [rootDir, bunInstallCache]
try {
  allowedFsRoots.push(realpathSync(path.join(rootDir, 'node_modules')))
} catch {
  // node_modules may be absent during config-only checks
}

const PANORAMAX_VIEWER = `${path.sep}@panoramax${path.sep}web-viewer${path.sep}`
const PANORAMAX_CSS_SUFFIX = '\0panoramax-constructable-css'
const PBF_SHIM_ID = '\0panoramax-pbf-default'

function panoramaxPbfDefaultExportPlugin(): Plugin {
  const pbfPath = path.resolve(rootDir, 'node_modules/pbf/index.js')
  return {
    name: 'panoramax-pbf-default-export',
    enforce: 'pre',
    resolveId(source, importer) {
      if (source !== 'pbf' || !importer?.includes(PANORAMAX_VIEWER)) {
        return null
      }
      return PBF_SHIM_ID
    },
    load(id) {
      if (id !== PBF_SHIM_ID) {
        return null
      }
      return `export { PbfReader as default } from ${JSON.stringify(pbfPath)};\n`
    },
  }
}

function panoramaxConstructableCssPlugin(): Plugin {
  return {
    name: 'panoramax-constructable-css',
    enforce: 'pre',
    transform(code, id) {
      if (!id.includes(PANORAMAX_VIEWER) || !id.endsWith('.js')) {
        return null
      }
      const stripped = code.replace(
        /(\bfrom\s+["'][^"']+\.css["'])\s+with\s+\{\s*type:\s*["']css["']\s*\}/g,
        '$1',
      )
      return stripped === code ? null : { code: stripped, map: null }
    },
    async resolveId(source, importer) {
      if (!importer?.includes(PANORAMAX_VIEWER) || !source.endsWith('.css')) {
        return null
      }
      const resolved = await this.resolve(source, importer, { skipSelf: true })
      if (!resolved) {
        return null
      }
      return resolved.id + PANORAMAX_CSS_SUFFIX
    },
    async load(id) {
      if (!id.endsWith(PANORAMAX_CSS_SUFFIX)) {
        return null
      }
      const cssPath = id.slice(0, -PANORAMAX_CSS_SUFFIX.length)
      const css = await readFile(cssPath, 'utf-8')
      return `const sheet = new CSSStyleSheet();\nsheet.replaceSync(${JSON.stringify(css)});\nexport default sheet;\n`
    },
  }
}

export default defineConfig({
  base: '/street-level-imagery-provider-overview/',
  resolve: {
    // Bun may resolve PSV deps from ~/.bun/install/cache; pin three to the project install.
    dedupe: ['three'],
    alias: {
      '@': path.resolve(rootDir, 'src'),
      '@panoramax/web-viewer': path.resolve(
        rootDir,
        'node_modules/@panoramax/web-viewer/build/esm/index_photoviewer.js',
      ),
      three: path.resolve(rootDir, 'node_modules/three'),
    },
  },
  plugins: [
    panoramaxConstructableCssPlugin(),
    panoramaxPbfDefaultExportPlugin(),
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler', {}]],
      },
    }),
    tailwindcss(),
  ],
  optimizeDeps: {
    exclude: ['@panoramax/web-viewer'],
    include: ['three', '@panoramax/web-viewer > json5'],
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
