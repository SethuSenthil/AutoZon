/* eslint-disable node/no-unpublished-require */
const esbuild = require('esbuild');
const copyStaticFiles = require('esbuild-copy-static-files');

esbuild.build({
  entryPoints: ['./background.ts'],
  outfile: '../dist/example/background.js',
  bundle: true,
  minify: true,
  sourcemap: false,
  watch: false,
  external: [
    'net',
    'tls',
    'crypto',
    'http',
    'https',
    'stream',
    'zlib',
    'fs',
    'url',
    'events',
  ],
  plugins: [
    copyStaticFiles({
      src: './manifest.json',
      dest: '../dist/example/manifest.json',
    }),
    copyStaticFiles({
      src: './popup.html',
      dest: '../dist/example/popup.html',
    }),
    copyStaticFiles({
      src: './popup.js',
      dest: '../dist/example/popup.js',
    }),
    copyStaticFiles({
      src: './materialize.min.js',
      dest: '../dist/example/materialize.min.js',
    }),
    copyStaticFiles({
      src: './icon.png',
      dest: '../dist/example/icon.png',
    }),
  ],
});
