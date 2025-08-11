import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/browser.ts',
  ],
  dts: {
    oxc: true,
    resolve: true,
  },
  exports: true,
})
