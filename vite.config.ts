import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

const createPiperProxy = () => ({
  '/piper': {
    target: 'http://127.0.0.1:5000',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/piper/, ''),
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  server: { proxy: createPiperProxy() },
  preview: { proxy: createPiperProxy() },
})
