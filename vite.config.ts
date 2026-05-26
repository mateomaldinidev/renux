import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    devtools(),
    nitro({ rollupConfig: { external: [/^@sentry\//] } }),
    tailwindcss(),
    TanStackRouterVite({
      routesDirectory: './app/routes',
      generatedRouteTree: './src/routeTree.gen.ts',
    }),
    tanstackStart({
      srcDirectory: './app',
      router: {
        routesDirectory: './routes',
        entry: '../src/router',
      },
    }),
    viteReact(),
  ],
})

export default config
