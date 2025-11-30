#!/usr/bin/env tsx
/**
 * 台股資料預載入命令行腳本
 * 使用方式：
 *   pnpm tsx scripts/preload-tw-stock-data.ts           # 正常預載入（跳過已有資料）
 *   pnpm tsx scripts/preload-tw-stock-data.ts --force   # 強制重新載入
 *   pnpm tsx scripts/preload-tw-stock-data.ts --light   # 輕量級預載入
 */

import { runDataPreload, runLightweightPreload } from '../server/scheduler/dataPreload';

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const light = args.includes('--light');

  console.log('台股資料預載入腳本');
  console.log('==================');

  if (light) {
    console.log('模式：輕量級預載入');
    await runLightweightPreload();
  } else {
    console.log(`模式：${force ? '強制重新載入' : '正常預載入'}`);
    await runDataPreload(force);
  }

  console.log('==================');
  console.log('預載入完成，程式即將退出');
  process.exit(0);
}

main().catch((error) => {
  console.error('預載入失敗:', error);
  process.exit(1);
});
