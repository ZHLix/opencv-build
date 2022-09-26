import { defineConfig } from 'rollup'
import typescript from 'rollup-plugin-typescript2'
import bin from 'rollup-plugin-shebang-bin'
import json from '@rollup/plugin-json'
// import { terser } from 'rollup-plugin-terser'

export default defineConfig({
  input: {
    OpenCVBuilder: 'src/OpenCVBuilder.ts',
    'run-build': 'src/run-build.ts',
    'clean-useless': 'src/clean-useless.ts',
    'get-version': 'src/get-version.ts',
    index: 'src/index.ts',
    bin: 'src/bin.ts',
  },
  plugins: [
    bin({ include: ['src/bin.ts'], exclude: [] }),
    // terser(),
    json(),
    typescript({ useTsconfigDeclarationDir: true, tsconfigOverride: { compilerOptions: { module: 'ESNext' } } }),
  ],
  output: {
    dir: 'dist',
    format: 'cjs',
    exports: 'auto',
  },
})
