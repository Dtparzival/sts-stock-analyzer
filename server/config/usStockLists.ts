/**
 * 美股股票清單配置
 * 
 * 定義需要定期同步的美股股票清單,包含:
 * 1. S&P 500 成分股 (約 500 支)
 * 2. 主要 ETF (32 支)
 * 
 * 其餘股票採用即時查詢 + 快取策略
 */

/**
 * 主要 ETF 清單 (32 支)
 * 包含市場指數、產業、債券、商品等各類 ETF
 */
export const MAJOR_ETFS = [
  // 市場指數 ETF
  'SPY',   // SPDR S&P 500 ETF Trust
  'VOO',   // Vanguard S&P 500 ETF
  'IVV',   // iShares Core S&P 500 ETF
  'QQQ',   // Invesco QQQ Trust (Nasdaq-100)
  'DIA',   // SPDR Dow Jones Industrial Average ETF
  'VTI',   // Vanguard Total Stock Market ETF
  'IWM',   // iShares Russell 2000 ETF
  
  // 科技產業 ETF
  'XLK',   // Technology Select Sector SPDR Fund
  'VGT',   // Vanguard Information Technology ETF
  'SOXX',  // iShares Semiconductor ETF
  'ARKK',  // ARK Innovation ETF
  
  // 金融產業 ETF
  'XLF',   // Financial Select Sector SPDR Fund
  'VFH',   // Vanguard Financials ETF
  
  // 醫療保健 ETF
  'XLV',   // Health Care Select Sector SPDR Fund
  'VHT',   // Vanguard Health Care ETF
  
  // 能源產業 ETF
  'XLE',   // Energy Select Sector SPDR Fund
  'VDE',   // Vanguard Energy ETF
  
  // 消費產業 ETF
  'XLY',   // Consumer Discretionary Select Sector SPDR Fund
  'XLP',   // Consumer Staples Select Sector SPDR Fund
  
  // 工業產業 ETF
  'XLI',   // Industrial Select Sector SPDR Fund
  
  // 房地產 ETF
  'VNQ',   // Vanguard Real Estate ETF
  'XLRE',  // Real Estate Select Sector SPDR Fund
  
  // 債券 ETF
  'AGG',   // iShares Core U.S. Aggregate Bond ETF
  'BND',   // Vanguard Total Bond Market ETF
  'TLT',   // iShares 20+ Year Treasury Bond ETF
  
  // 國際市場 ETF
  'VEA',   // Vanguard FTSE Developed Markets ETF
  'VWO',   // Vanguard FTSE Emerging Markets ETF
  'EFA',   // iShares MSCI EAFE ETF
  
  // 商品 ETF
  'GLD',   // SPDR Gold Shares
  'SLV',   // iShares Silver Trust
  'USO',   // United States Oil Fund
];

/**
 * S&P 500 成分股清單 (依產業分類)
 * 完整清單約 500 支,此處列出主要成分股
 */
export const SP500_STOCKS = [
  // 科技巨頭 (Magnificent 7)
  'AAPL',  // Apple Inc.
  'MSFT',  // Microsoft Corporation
  'GOOGL', // Alphabet Inc. Class A
  'GOOG',  // Alphabet Inc. Class C
  'AMZN',  // Amazon.com Inc.
  'NVDA',  // NVIDIA Corporation
  'META',  // Meta Platforms Inc.
  'TSLA',  // Tesla Inc.
  
  // 科技公司
  'AVGO',  // Broadcom Inc.
  'ORCL',  // Oracle Corporation
  'ADBE',  // Adobe Inc.
  'CRM',   // Salesforce Inc.
  'CSCO',  // Cisco Systems Inc.
  'ACN',   // Accenture plc
  'AMD',   // Advanced Micro Devices Inc.
  'INTC',  // Intel Corporation
  'IBM',   // International Business Machines
  'QCOM',  // QUALCOMM Incorporated
  'TXN',   // Texas Instruments Incorporated
  'INTU',  // Intuit Inc.
  'NOW',   // ServiceNow Inc.
  'AMAT',  // Applied Materials Inc.
  'MU',    // Micron Technology Inc.
  'LRCX',  // Lam Research Corporation
  'KLAC',  // KLA Corporation
  'SNPS',  // Synopsys Inc.
  'CDNS',  // Cadence Design Systems Inc.
  'MRVL',  // Marvell Technology Inc.
  'NXPI',  // NXP Semiconductors N.V.
  'ADI',   // Analog Devices Inc.
  
  // 通訊服務
  'NFLX',  // Netflix Inc.
  'DIS',   // The Walt Disney Company
  'CMCSA', // Comcast Corporation
  'T',     // AT&T Inc.
  'VZ',    // Verizon Communications Inc.
  'TMUS',  // T-Mobile US Inc.
  'CHTR',  // Charter Communications Inc.
  
  // 消費品
  'COST',  // Costco Wholesale Corporation
  'WMT',   // Walmart Inc.
  'HD',    // The Home Depot Inc.
  'MCD',   // McDonald's Corporation
  'NKE',   // NIKE Inc.
  'SBUX',  // Starbucks Corporation
  'TGT',   // Target Corporation
  'LOW',   // Lowe's Companies Inc.
  'TJX',   // The TJX Companies Inc.
  'BKNG',  // Booking Holdings Inc.
  'ABNB',  // Airbnb Inc.
  
  // 金融服務
  'BRK.B', // Berkshire Hathaway Inc. Class B
  'JPM',   // JPMorgan Chase & Co.
  'V',     // Visa Inc.
  'MA',    // Mastercard Incorporated
  'BAC',   // Bank of America Corporation
  'WFC',   // Wells Fargo & Company
  'GS',    // The Goldman Sachs Group Inc.
  'MS',    // Morgan Stanley
  'AXP',   // American Express Company
  'BLK',   // BlackRock Inc.
  'C',     // Citigroup Inc.
  'SCHW',  // The Charles Schwab Corporation
  'CB',    // Chubb Limited
  'PGR',   // The Progressive Corporation
  'MMC',   // Marsh & McLennan Companies Inc.
  'AON',   // Aon plc
  'SPGI',  // S&P Global Inc.
  'CME',   // CME Group Inc.
  'ICE',   // Intercontinental Exchange Inc.
  
  // 醫療保健
  'UNH',   // UnitedHealth Group Incorporated
  'JNJ',   // Johnson & Johnson
  'LLY',   // Eli Lilly and Company
  'ABBV',  // AbbVie Inc.
  'MRK',   // Merck & Co. Inc.
  'PFE',   // Pfizer Inc.
  'TMO',   // Thermo Fisher Scientific Inc.
  'ABT',   // Abbott Laboratories
  'DHR',   // Danaher Corporation
  'BMY',   // Bristol-Myers Squibb Company
  'AMGN',  // Amgen Inc.
  'GILD',  // Gilead Sciences Inc.
  'CVS',   // CVS Health Corporation
  'CI',    // The Cigna Group
  'ISRG',  // Intuitive Surgical Inc.
  'REGN',  // Regeneron Pharmaceuticals Inc.
  'VRTX',  // Vertex Pharmaceuticals Incorporated
  'ZTS',   // Zoetis Inc.
  'BSX',   // Boston Scientific Corporation
  'MDT',   // Medtronic plc
  'SYK',   // Stryker Corporation
  
  // 工業
  'BA',    // The Boeing Company
  'HON',   // Honeywell International Inc.
  'UPS',   // United Parcel Service Inc.
  'RTX',   // RTX Corporation
  'CAT',   // Caterpillar Inc.
  'GE',    // General Electric Company
  'LMT',   // Lockheed Martin Corporation
  'DE',    // Deere & Company
  'MMM',   // 3M Company
  'FDX',   // FedEx Corporation
  'EMR',   // Emerson Electric Co.
  'ETN',   // Eaton Corporation plc
  'NOC',   // Northrop Grumman Corporation
  'GD',    // General Dynamics Corporation
  
  // 能源
  'XOM',   // Exxon Mobil Corporation
  'CVX',   // Chevron Corporation
  'COP',   // ConocoPhillips
  'SLB',   // Schlumberger N.V.
  'EOG',   // EOG Resources Inc.
  'MPC',   // Marathon Petroleum Corporation
  'PSX',   // Phillips 66
  'VLO',   // Valero Energy Corporation
  'OXY',   // Occidental Petroleum Corporation
  'KMI',   // Kinder Morgan Inc.
  
  // 材料
  'LIN',   // Linde plc
  'APD',   // Air Products and Chemicals Inc.
  'SHW',   // The Sherwin-Williams Company
  'ECL',   // Ecolab Inc.
  'DD',    // DuPont de Nemours Inc.
  'NEM',   // Newmont Corporation
  'FCX',   // Freeport-McMoRan Inc.
  
  // 公用事業
  'NEE',   // NextEra Energy Inc.
  'DUK',   // Duke Energy Corporation
  'SO',    // The Southern Company
  'D',     // Dominion Energy Inc.
  'AEP',   // American Electric Power Company Inc.
  'EXC',   // Exelon Corporation
  'SRE',   // Sempra Energy
  'XEL',   // Xcel Energy Inc.
  
  // 房地產
  'PLD',   // Prologis Inc.
  'AMT',   // American Tower Corporation
  'CCI',   // Crown Castle Inc.
  'EQIX',  // Equinix Inc.
  'PSA',   // Public Storage
  'WELL',  // Welltower Inc.
  'SPG',   // Simon Property Group Inc.
  'O',     // Realty Income Corporation
  
  // 消費必需品
  'PG',    // The Procter & Gamble Company
  'KO',    // The Coca-Cola Company
  'PEP',   // PepsiCo Inc.
  'PM',    // Philip Morris International Inc.
  'MO',    // Altria Group Inc.
  'MDLZ',  // Mondelez International Inc.
  'CL',    // Colgate-Palmolive Company
  'KMB',   // Kimberly-Clark Corporation
  'GIS',   // General Mills Inc.
  'K',     // Kellanova
  'HSY',   // The Hershey Company
  'STZ',   // Constellation Brands Inc.
  'EL',    // The Estée Lauder Companies Inc.
  'CL',    // Colgate-Palmolive Company
  
  // 其他重要成分股
  'SHOP',  // Shopify Inc.
  'PYPL',  // PayPal Holdings Inc.
  'SQ',    // Block Inc.
  'UBER',  // Uber Technologies Inc.
  'LYFT',  // Lyft Inc.
  'SNAP',  // Snap Inc.
  'PINS',  // Pinterest Inc.
  'ZM',    // Zoom Video Communications Inc.
  'DOCU',  // DocuSign Inc.
  'CRWD',  // CrowdStrike Holdings Inc.
  'PANW',  // Palo Alto Networks Inc.
  'FTNT',  // Fortinet Inc.
  'NET',   // Cloudflare Inc.
  'DDOG',  // Datadog Inc.
  'SNOW',  // Snowflake Inc.
  'PLTR',  // Palantir Technologies Inc.
  'COIN',  // Coinbase Global Inc.
  'RBLX',  // Roblox Corporation
  'U',     // Unity Software Inc.
  'ROKU',  // Roku Inc.
  'SPOT',  // Spotify Technology S.A.
  'SQ',    // Block Inc.
  'TWLO',  // Twilio Inc.
  'OKTA',  // Okta Inc.
  'ZS',    // Zscaler Inc.
  'ESTC',  // Elastic N.V.
  'MDB',   // MongoDB Inc.
  'TEAM',  // Atlassian Corporation
  'WDAY',  // Workday Inc.
  'VEEV',  // Veeva Systems Inc.
  'SPLK',  // Splunk Inc.
  'ANSS',  // ANSYS Inc.
  'TTWO',  // Take-Two Interactive Software Inc.
  'EA',    // Electronic Arts Inc.
  'ATVI',  // Activision Blizzard Inc.
];

/**
 * 需要定期同步的股票清單 (S&P 500 + 主要 ETF)
 */
export const SCHEDULED_SYNC_STOCKS = [...new Set([...SP500_STOCKS, ...MAJOR_ETFS])];

/**
 * 檢查股票是否需要定期同步
 * 
 * @param symbol 股票代號
 * @returns 是否需要定期同步
 */
export function isScheduledSyncStock(symbol: string): boolean {
  return SCHEDULED_SYNC_STOCKS.includes(symbol.toUpperCase());
}

/**
 * 取得定期同步股票數量
 */
export function getScheduledSyncStockCount(): number {
  return SCHEDULED_SYNC_STOCKS.length;
}

/**
 * 取得主要 ETF 數量
 */
export function getMajorETFCount(): number {
  return MAJOR_ETFS.length;
}

/**
 * 取得 S&P 500 成分股數量
 */
export function getSP500StockCount(): number {
  return SP500_STOCKS.length;
}
