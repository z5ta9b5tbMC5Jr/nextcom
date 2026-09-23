import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: { proxy: { '/api': 'http://127.0.0.1:3001' } },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'motion', test: /node_modules[\\/](motion|framer-motion|motion-dom|motion-utils)[\\/]/ },
            {
              name: 'charts',
              test: /node_modules[\\/](recharts|@reduxjs|redux|react-redux|immer|reselect|d3-(array|color|format|interpolate|path|scale|shape|time|time-format|timer))/,
            },
            { name: 'geography', test: /node_modules[\\/](world-atlas|topojson-client|d3-geo)/ },
          ],
        },
      },
    },
  },
})
