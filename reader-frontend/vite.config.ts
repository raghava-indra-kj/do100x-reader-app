import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
    plugins: [react(), tailwindcss()],
    server: {
        proxy: {
            '/backend-api': 'http://localhost:3000',
        },
    },
    resolve: {
        alias: [
            { find: '@boot',    replacement: resolve(__dirname, 'src/boot') },
            { find: '@core',    replacement: resolve(__dirname, 'src/core') },
            { find: '@di',      replacement: resolve(__dirname, 'src/di') },
            { find: '@domain',  replacement: resolve(__dirname, 'src/domain') },
            { find: '@lib',     replacement: resolve(__dirname, 'src/lib') },
            { find: '@modules', replacement: resolve(__dirname, 'src/modules') },
            { find: '@styles',  replacement: resolve(__dirname, 'src/styles') },
            { find: '@reader/md-ast', replacement: resolve(__dirname, '../packages/md-ast/src/index.ts') },
            { find: '@reader/md-view/md-view.css',      replacement: resolve(__dirname, '../packages/md-view/src/md-view.css') },
            { find: '@reader/md-view/md-view-hljs.css', replacement: resolve(__dirname, '../packages/md-view/src/md-view-hljs.css') },
            { find: /^@reader\/md-view$/, replacement: resolve(__dirname, '../packages/md-view/src/index.ts') },
        ],
    },
})
