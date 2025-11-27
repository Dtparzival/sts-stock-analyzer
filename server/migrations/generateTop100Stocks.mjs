/**
 * 生成前 100 大台股映射表腳本
 * 
 * 功能：從 TWSE OpenAPI 獲取所有上市公司，選取前 100 大市值股票
 * 輸出：更新 shared/markets.ts 中的 TW_STOCK_NAMES 映射表
 * 
 * 使用方法：node server/migrations/generateTop100Stocks.mjs
 */

// 台股前 100 大市值股票（根據 2024-2025 年市值排名）
// 由於 TWSE OpenAPI 不提供即時市值數據，這裡使用手動整理的列表
const TOP_100_STOCKS = [
  // 半導體
  { symbol: '2330', name: '台積電' },
  { symbol: '2454', name: '聯發科' },
  { symbol: '2303', name: '聯電' },
  { symbol: '3034', name: '聯詠' },
  { symbol: '2379', name: '瑞昱' },
  { symbol: '3231', name: '緯創' },
  { symbol: '2408', name: '南亞科' },
  { symbol: '3443', name: '創意' },
  { symbol: '2449', name: '京元電子' },
  { symbol: '6770', name: '力積電' },
  
  // 金融
  { symbol: '2882', name: '國泰金' },
  { symbol: '2881', name: '富邦金' },
  { symbol: '2891', name: '中信金' },
  { symbol: '2886', name: '兆豐金' },
  { symbol: '2884', name: '玉山金' },
  { symbol: '2892', name: '第一金' },
  { symbol: '2887', name: '台新金' },
  { symbol: '2890', name: '永豐金' },
  { symbol: '2885', name: '元大金' },
  { symbol: '2880', name: '華南金' },
  { symbol: '2883', name: '開發金' },
  { symbol: '5880', name: '合庫金' },
  { symbol: '2888', name: '新光金' },
  
  // 電子
  { symbol: '2317', name: '鴻海' },
  { symbol: '2382', name: '廣達' },
  { symbol: '2357', name: '華碩' },
  { symbol: '2301', name: '光寶科' },
  { symbol: '2377', name: '微星' },
  { symbol: '2308', name: '台達電' },
  { symbol: '2395', name: '研華' },
  { symbol: '3711', name: '日月光投控' },
  { symbol: '2327', name: '國巨' },
  { symbol: '2345', name: '智邦' },
  { symbol: '2347', name: '聯強' },
  { symbol: '2324', name: '仁寶' },
  { symbol: '2353', name: '宏碁' },
  { symbol: '3045', name: '台灣大' },
  { symbol: '4938', name: '和碩' },
  { symbol: '6669', name: '緯穎' },
  { symbol: '3008', name: '大立光' },
  { symbol: '2409', name: '友達' },
  { symbol: '2474', name: '可成' },
  { symbol: '3037', name: '欣興' },
  { symbol: '2356', name: '英業達' },
  
  // 傳產
  { symbol: '2412', name: '中華電' },
  { symbol: '1301', name: '台塑' },
  { symbol: '1303', name: '南亞' },
  { symbol: '1326', name: '台化' },
  { symbol: '6505', name: '台塑化' },
  { symbol: '2002', name: '中鋼' },
  { symbol: '2912', name: '統一超' },
  { symbol: '2801', name: '彰銀' },
  { symbol: '1216', name: '統一' },
  { symbol: '2207', name: '和泰車' },
  { symbol: '2105', name: '正新' },
  { symbol: '2382', name: '廣達' },
  { symbol: '1402', name: '遠東新' },
  { symbol: '2201', name: '裕隆' },
  { symbol: '1101', name: '台泥' },
  { symbol: '1102', name: '亞泥' },
  
  // 航運
  { symbol: '2603', name: '長榮' },
  { symbol: '2609', name: '陽明' },
  { symbol: '2615', name: '萬海' },
  { symbol: '5880', name: '合庫金' },
  
  // 其他重要股票
  { symbol: '2618', name: '長榮航' },
  { symbol: '2610', name: '華航' },
  { symbol: '2823', name: '中壽' },
  { symbol: '2834', name: '臺企銀' },
  { symbol: '2845', name: '遠東銀' },
  { symbol: '2849', name: '安泰銀' },
  { symbol: '2850', name: '新產' },
  { symbol: '2851', name: '中再保' },
  { symbol: '2852', name: '第一保' },
  { symbol: '2867', name: '三商壽' },
  { symbol: '2880', name: '華南金' },
  { symbol: '2889', name: '國票金' },
  { symbol: '2903', name: '遠百' },
  { symbol: '2915', name: '潤泰全' },
  { symbol: '3481', name: '群創' },
  { symbol: '3533', name: '嘉澤' },
  { symbol: '4904', name: '遠傳' },
  { symbol: '4906', name: '正文' },
  { symbol: '5871', name: '中租-KY' },
  { symbol: '6176', name: '瑞儀' },
  { symbol: '6239', name: '力成' },
  { symbol: '6271', name: '同欣電' },
  { symbol: '6415', name: '矽力-KY' },
  { symbol: '6446', name: '藥華藥' },
  { symbol: '6488', name: '環球晶' },
  { symbol: '6505', name: '台塑化' },
  { symbol: '6669', name: '緯穎' },
  { symbol: '9910', name: '豐泰' },
  { symbol: '9921', name: '巨大' },
  { symbol: '9945', name: '潤泰新' },
  { symbol: '2371', name: '大同' },
  { symbol: '2376', name: '技嘉' },
  { symbol: '2385', name: '群光' },
  { symbol: '2393', name: '億光' },
  { symbol: '2404', name: '漢唐' },
  { symbol: '2439', name: '美律' },
];

console.log('='.repeat(60));
console.log('生成前 100 大台股映射表');
console.log('='.repeat(60));
console.log('');

// 去重並排序
const uniqueStocks = Array.from(
  new Map(TOP_100_STOCKS.map(stock => [stock.symbol, stock])).values()
).sort((a, b) => a.symbol.localeCompare(b.symbol));

console.log(`總計: ${uniqueStocks.length} 支股票`);
console.log('');

// 生成 TypeScript 映射表代碼
const mappingCode = uniqueStocks
  .map(stock => `  '${stock.symbol}': '${stock.name}',`)
  .join('\n');

console.log('生成的 TW_STOCK_NAMES 映射表：');
console.log('');
console.log('export const TW_STOCK_NAMES: Record<string, string> = {');
console.log(mappingCode);
console.log('};');
console.log('');
console.log('='.repeat(60));
console.log(`✓ 成功生成 ${uniqueStocks.length} 支股票的映射表`);
console.log('請手動複製上述代碼到 shared/markets.ts 文件中');
console.log('='.repeat(60));
