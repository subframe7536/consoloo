import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/browser.ts',
    'src/core.ts',
  ],
  clean: true,
  format: ['cjs', 'esm'],
  dts: {
    isolatedDeclarations: true,
  },
  treeshake: true,
})
