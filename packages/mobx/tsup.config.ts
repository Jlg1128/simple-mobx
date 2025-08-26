import { defineConfig } from 'tsup'

export default defineConfig({
    entry: ['src/index.ts'],
    format: ["cjs", "esm"],
    dts: true,
    clean: true,
    sourcemap: false,
    outExtension({ format, options }) {
        return {
            js: `.${format}.js`
        }
    },
    minify: false,
    target: 'esnext'
})