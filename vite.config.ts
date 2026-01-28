import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync, createReadStream } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-wasm',
      configureServer(server) {
        // Serve sql-wasm.wasm from node_modules during dev
        server.middlewares.use((req, res, next) => {
          if (req.url?.includes('sql-wasm.wasm')) {
            const wasmPath = join(__dirname, 'node_modules/sql.js/dist/sql-wasm.wasm')
            res.setHeader('Content-Type', 'application/wasm')
            createReadStream(wasmPath).pipe(res)
            return
          }
          next()
        })
      },
      buildStart() {
        // Copy sql.js WASM file to public for production build
        copyFileSync(
          join(__dirname, 'node_modules/sql.js/dist/sql-wasm.wasm'),
          join(__dirname, 'public/sql-wasm.wasm')
        )
      }
    }
  ],
  optimizeDeps: {
    exclude: ['jeep-sqlite', '@capacitor-community/sqlite']
  }
})
