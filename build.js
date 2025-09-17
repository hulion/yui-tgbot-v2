import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

async function buildWorker() {
  try {
    console.log('🔨 開始建置 Cloudflare Worker...');

    const result = await build({
      entryPoints: ['src/bot/index.ts'],
      bundle: true,
      outfile: 'dist/index.js',
      format: 'esm',
      target: 'es2022',
      platform: 'neutral',
      conditions: ['worker', 'browser'],
      mainFields: ['browser', 'module', 'main'],
      resolve: {
        alias: {
          '@': resolve('src'),
        },
      },
      external: [],
      minify: process.env.NODE_ENV === 'production',
      sourcemap: process.env.NODE_ENV !== 'production',
      define: {
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
      },
    });

    console.log('✅ Worker 建置完成');

    // 複製 wrangler.toml 到 dist 目錄
    const wranglerConfig = readFileSync('wrangler.toml', 'utf8');
    writeFileSync('dist/wrangler.toml', wranglerConfig);

    console.log('📄 設定檔案已複製');
    console.log('🎉 建置程序完成！');

  } catch (error) {
    console.error('❌ 建置失敗:', error);
    process.exit(1);
  }
}

buildWorker();