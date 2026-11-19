const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('esbuild');

const frontendDir = path.resolve(__dirname, '..');
const outputDir = path.join(frontendDir, 'dist');
const watch = process.argv.includes('--watch');

const buildOptions = {
  entryPoints: [path.join(frontendDir, 'src', 'main.jsx')],
  bundle: true,
  loader: { '.svg': 'dataurl' },
  outfile: path.join(outputDir, 'app.js'),
  minify: !watch,
  sourcemap: watch
};

async function build() {
  fs.mkdirSync(outputDir, { recursive: true });

  if (watch) {
    const context = await esbuild.context(buildOptions);
    await context.watch();
    console.log('[frontend] Watching React source files.');
    process.once('SIGINT', async () => {
      await context.dispose();
      process.exit(0);
    });
    process.once('SIGTERM', async () => {
      await context.dispose();
      process.exit(0);
    });
    return;
  }

  await esbuild.build(buildOptions);
  fs.copyFileSync(
    path.join(frontendDir, 'index.html'),
    path.join(outputDir, 'index.html')
  );
  console.log('[frontend] React frontend built successfully.');
}

build().catch((error) => {
  console.error('[frontend] Build failed:', error);
  process.exitCode = 1;
});
