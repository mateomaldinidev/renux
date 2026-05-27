import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    devtools(),
    nitro({ rollupConfig: { external: [/^@sentry\//] } }),
    tailwindcss(),
    tanstackStart({
      srcDirectory: './app',
      start: {
        entry: '../src/ssr.tsx',
      },
      router: {
        routesDirectory: './routes',
        generatedRouteTree: './src/routeTree.gen.ts',
        entry: '../src/router',
      },
    }),
    viteReact(),
  ],
})

export default config
