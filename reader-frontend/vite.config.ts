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
        alias: {
            '@boot': resolve(__dirname, 'src/boot'),
            '@core': resolve(__dirname, 'src/core'),
            '@di': resolve(__dirname, 'src/di'),
            '@domain': resolve(__dirname, 'src/domain'),
            '@lib': resolve(__dirname, 'src/lib'),
            '@modules': resolve(__dirname, 'src/modules'),
            '@styles': resolve(__dirname, 'src/styles'),
            '@reader/md-ast': resolve(__dirname, '../packages/md-ast/src/index.ts'),
            '@reader/md-view': resolve(__dirname, '../packages/md-view/src/index.ts'),
            '@reader/md-view/md-view.css': resolve(__dirname, '../packages/md-view/src/md-view.css'),
            '@reader/md-view/md-view-hljs.css': resolve(__dirname, '../packages/md-view/src/md-view-hljs.css'),
        },
    },
})
