/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/recharts')) return 'vendor-recharts';
          if (id.includes('node_modules/@dnd-kit')) return 'vendor-dnd-kit';
          if (id.includes('node_modules/pdfjs-dist') || id.includes('/src/utils/pdfUtils')) return 'vendor-pdfjs';
          if (id.includes('node_modules/jspdf')) return 'vendor-jspdf';
          if (id.includes('node_modules/@supabase/supabase-js')) return 'vendor-supabase';
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
})
