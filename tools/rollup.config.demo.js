import typescript from 'rollup-plugin-typescript';
import fs from 'fs';

const banner = `<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <link rel="shortcut icon" href="data:;base64,iVBORw0KGgo=">
  <title>Demo</title>
  <style>
    html,
    body {
      margin: 0px;
      overflow: hidden;
      height: 100%;
    }

    canvas {
      width: 100%;
      height: 100%;
    }
  </style>
</head>

<body>
  <canvas id="canvas"></canvas>
  <script type="module">`;
const footer = `</script>
</body>

</html>`;

export default commandLineArgs => {
  const inputFiles = {};
  const demo = commandLineArgs.configDemo;
  if (demo) {
    inputFiles[demo] = `./src/demo/${demo}.ts`;
  } else {
    const fileNames = fs.readdirSync(`${__dirname}/../src/demo/`);
    fileNames.forEach((fileName) => {
      if (fileName.endsWith('.ts')) {
        const demoName = fileName.substring(0, fileName.length - 3);
        inputFiles[demoName] = `./src/demo/${fileName}`;
      }
    });
  }
  return {
    input: inputFiles,
    output: {
      dir: 'docs',
      entryFileNames: '[name].html',
      format: 'es',
      paths: (id) => {
        if (id.endsWith('index')) {
          return './js/bundle.js';
        }
        if (id.endsWith('dat.gui')) {
          return './js/vendor/dat.gui.js';
        }
        if (id.endsWith('gl-matrix')) {
          return './js/vendor/gl-matrix.js';
        }
        return id;
      },
      banner,
      footer,
    },
    plugins: [
      typescript(),
    ],
    external: id => /(gl-matrix)|(dat\.gui)|(\/index$)/.test(id),
  };
}
