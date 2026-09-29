import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({plugins:[react()],base:process.env.VITE_BASE_PATH||'./',build:{target:'es2022',sourcemap:false,rollupOptions:{output:{manualChunks(id){if(id.includes('node_modules/react')||id.includes('node_modules/@radix-ui'))return 'ui-vendor';if(id.includes('node_modules/decimal.js')||id.includes('node_modules/zod'))return 'domain-vendor';}}}},test:{include:['tests/**/*.test.ts']}});
