import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['src/server.ts'],
  bundle: true,
  outfile: 'dist/server.js',
  platform: 'node',
  target: 'node18.12',
  minify: true,
  logLevel: 'info',
  sourcemap: true,
});
