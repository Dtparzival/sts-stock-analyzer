#!/usr/bin/env node
/**
 * 自動化執行 drizzle-kit push，自動回答所有互動式問題
 * 所有新資料表都選擇「建立新資料表」選項
 */

import { spawn } from 'child_process';

const child = spawn('pnpm', ['drizzle-kit', 'push'], {
  cwd: '/home/ubuntu/us-stock-analyzer',
  stdio: ['pipe', 'inherit', 'inherit']
});

// 監聽 stdout 輸出，當出現互動式問題時自動按 Enter
let buffer = '';
child.stdout?.on('data', (data) => {
  buffer += data.toString();
  
  // 檢測到互動式問題（包含 "created or renamed" 關鍵字）
  if (buffer.includes('created or renamed')) {
    // 自動選擇第一個選項（建立新資料表）並按 Enter
    child.stdin?.write('\n');
    buffer = ''; // 清空 buffer
  }
  
  // 檢測到需要確認的問題（包含 "will be created" 關鍵字）
  if (buffer.includes('will be created')) {
    buffer = ''; // 清空 buffer，準備下一個問題
  }
});

child.on('close', (code) => {
  console.log(`\ndrizzle-kit push 執行完成，退出碼: ${code}`);
  process.exit(code || 0);
});

child.on('error', (err) => {
  console.error('執行錯誤:', err);
  process.exit(1);
});
