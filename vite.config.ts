/// <reference types="vitest/config" />

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import browserslistToEsbuild from 'browserslist-to-esbuild'
import { defineConfig, type Plugin } from 'vite'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

const PANORAMAX_VIEWER = `${path.sep}@panoramax${path.sep}web-viewer${path.sep}`
const PANORAMAX_CSS_SUFFIX = '\0panoramax-constructable-css'
const PBF_SHIM_ID = '\0panoramax-pbf-default'

/** pbf v5 dropped the default export; panoramax ESM still uses `import Protobuf from "pbf"`. */
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

/** Rolldown/Vite 8 lacks `import … with { type: "css" }`; emit a CSSStyleSheet default export. */
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

const MAPILIO_GEO_ORIGIN = 'https://geo.mapilio.com'
const MAPILIO_GEO_PATH_MARKER = '/mapilio-geo'

/** Dev/preview proxy: geo.mapilio.com WMTS has no CORS headers for browser fetch. */
function mapilioGeoProxyPlugin(): Plugin {
  const proxyRequest = (
    req: import('node:http').IncomingMessage,
    res: import('node:http').ServerResponse,
    next: () => void,
  ) => {
    const url = req.url ?? ''
    const markerIndex = url.indexOf(MAPILIO_GEO_PATH_MARKER)
    if (markerIndex === -1) {
      next()
      return
    }

    const targetPath = url.slice(markerIndex + MAPILIO_GEO_PATH_MARKER.length)
    const targetUrl = `${MAPILIO_GEO_ORIGIN}${targetPath}`

    fetch(targetUrl)
      .then(async (response) => {
        res.statusCode = response.status
        response.headers.forEach((value, key) => {
          if (key.toLowerCase() !== 'transfer-encoding') {
            res.setHeader(key, value)
          }
        })
        const body = Buffer.from(await response.arrayBuffer())
        res.end(body)
      })
      .catch((error: unknown) => {
        res.statusCode = 502
        res.end(`Mapilio proxy error: ${String(error)}`)
      })
  }

  return {
    name: 'mapilio-geo-proxy',
    configureServer(server) {
      server.middlewares.use(proxyRequest)
    },
    configurePreviewServer(server) {
      server.middlewares.use(proxyRequest)
    },
  }
}

export default defineConfig({
  base: '/street-level-imagery-provider-overview/',
  resolve: {
    alias: {
      '@': path.resolve(rootDir, 'src'),
      // The package root pulls in its full map UI, which relies on a maplibregl UMD global
      // and crashes when bundled; the photo-only entry avoids it but is not in `exports`.
      '@panoramax/web-viewer': path.resolve(
        rootDir,
        'node_modules/@panoramax/web-viewer/build/esm/index_photoviewer.js',
      ),
    },
  },
  plugins: [
    mapilioGeoProxyPlugin(),
    panoramaxConstructableCssPlugin(),
    panoramaxPbfDefaultExportPlugin(),
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler', {}]],
      },
    }),
    tailwindcss(),
  ],
  // The dev-only dependency optimizer bypasses the shims above; serve the package unbundled
  // but still prebundle its CJS deps so their default imports work.
  optimizeDeps: {
    exclude: ['@panoramax/web-viewer'],
    include: ['@panoramax/web-viewer > json5'],
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
