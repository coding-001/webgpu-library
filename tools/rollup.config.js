import typescript from 'rollup-plugin-typescript';

export default {
  input: './src/index.ts',
  output: {
    file: 'docs/js/bundle.js',
    format: 'es',
    paths: (id) => {
      if (id.endsWith('dat.gui')) {
        return './vendor/dat.gui.js';
      }
      if (id.endsWith('gl-matrix')) {
        return './vendor/gl-matrix.js';
      }
      if (id.endsWith('glslang')) {
        return './vendor/glslang.js';
      }
      return id;
    },
  },
  plugins: [
    typescript(),
  ],
  external: (id) => /(gl-matrix)|(dat\.gui)|(glslang)/.test(id),
};
