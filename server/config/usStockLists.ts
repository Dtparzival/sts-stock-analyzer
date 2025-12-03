/**
 * 美股定期同步股票清單配置
 * 
 * 本模組集中管理需要定期同步的美股股票清單,包括:
 * - S&P 500 成分股 (501 支)
 * - 主要 ETF (32 支)
 * 
 * 定期同步策略:
 * - 基本資料:每週日凌晨 06:00 (台北時間)
 * - 歷史價格:每交易日凌晨 06:00 (台北時間)
 * - 資料範圍:最近 30 天
 */

/**
 * S&P 500 成分股清單 (完整版)
 * 
 * 資料來源:https://en.wikipedia.org/wiki/List_of_S%26P_500_companies
 * 更新日期:2025-01-03
 * 
 * 注意:S&P 500 指數包含 503 支股票,因為部分公司有多個股票類別
 */
export const SP500_STOCKS = [
  'A', 'AAPL', 'ABBV', 'ABNB', 'ABT', 'ACGL', 'ACN', 'ADBE', 'ADI', 'ADM',
  'ADP', 'ADSK', 'AEE', 'AEP', 'AES', 'AFL', 'AIG', 'AIZ', 'AJG', 'AKAM',
  'ALB', 'ALGN', 'ALL', 'ALLE', 'AMAT', 'AMCR', 'AMD', 'AME', 'AMGN', 'AMP',
  'AMT', 'AMZN', 'ANET', 'AON', 'AOS', 'APA', 'APD', 'APH', 'APO', 'APP',
  'APTV', 'ARE', 'ATO', 'AVB', 'AVGO', 'AVY', 'AWK', 'AXON', 'AXP', 'AZO',
  'BA', 'BAC', 'BALL', 'BAX', 'BBY', 'BDX', 'BEN', 'BG', 'BIIB', 'BK',
  'BKNG', 'BKR', 'BLDR', 'BLK', 'BMY', 'BR', 'BRO', 'BSX', 'BX', 'BXP',
  'C', 'CAG', 'CAH', 'CARR', 'CAT', 'CB', 'CBOE', 'CBRE', 'CCI', 'CCL',
  'CDNS', 'CDW', 'CEG', 'CF', 'CFG', 'CHD', 'CHRW', 'CHTR', 'CI', 'CINF',
  'CL', 'CLX', 'CMCSA', 'CME', 'CMG', 'CMI', 'CMS', 'CNC', 'CNP', 'COF',
  'COIN', 'COO', 'COP', 'COR', 'COST', 'CPAY', 'CPB', 'CPRT', 'CPT', 'CRL',
  'CRM', 'CRWD', 'CSCO', 'CSGP', 'CSX', 'CTAS', 'CTRA', 'CTSH', 'CTVA', 'CVS',
  'CVX', 'D', 'DAL', 'DASH', 'DAY', 'DD', 'DDOG', 'DE', 'DECK', 'DELL',
  'DG', 'DGX', 'DHI', 'DHR', 'DIS', 'DLR', 'DLTR', 'DOC', 'DOV', 'DOW',
  'DPZ', 'DRI', 'DTE', 'DUK', 'DVA', 'DVN', 'DXCM', 'EA', 'EBAY', 'ECL',
  'ED', 'EFX', 'EG', 'EIX', 'EL', 'ELV', 'EME', 'EMR', 'EOG', 'EPAM',
  'EQIX', 'EQR', 'EQT', 'ERIE', 'ES', 'ESS', 'ETN', 'ETR', 'EVRG', 'EW',
  'EXC', 'EXE', 'EXPD', 'EXPE', 'EXR', 'F', 'FANG', 'FAST', 'FCX', 'FDS',
  'FDX', 'FE', 'FFIV', 'FICO', 'FIS', 'FISV', 'FITB', 'FOX', 'FOXA', 'FRT',
  'FSLR', 'FTNT', 'FTV', 'GD', 'GDDY', 'GE', 'GEHC', 'GEN', 'GEV', 'GILD',
  'GIS', 'GL', 'GLW', 'GM', 'GNRC', 'GOOG', 'GOOGL', 'GPC', 'GPN', 'GRMN',
  'GS', 'GWW', 'HAL', 'HAS', 'HBAN', 'HCA', 'HD', 'HIG', 'HII', 'HLT',
  'HOLX', 'HON', 'HOOD', 'HPE', 'HPQ', 'HRL', 'HSIC', 'HST', 'HSY', 'HUBB',
  'HUM', 'HWM', 'IBKR', 'IBM', 'ICE', 'IDXX', 'IEX', 'IFF', 'INCY', 'INTC',
  'INTU', 'INVH', 'IP', 'IQV', 'IR', 'IRM', 'ISRG', 'IT', 'ITW', 'IVZ',
  'J', 'JBHT', 'JBL', 'JCI', 'JKHY', 'JNJ', 'JPM', 'K', 'KDP', 'KEY',
  'KEYS', 'KHC', 'KIM', 'KKR', 'KLAC', 'KMB', 'KMI', 'KO', 'KR', 'KVUE',
  'L', 'LDOS', 'LEN', 'LH', 'LHX', 'LII', 'LIN', 'LKQ', 'LLY', 'LMT',
  'LNT', 'LOW', 'LRCX', 'LULU', 'LUV', 'LVS', 'LW', 'LYB', 'LYV', 'MA',
  'MAA', 'MAR', 'MAS', 'MCD', 'MCHP', 'MCK', 'MCO', 'MDLZ', 'MDT', 'MET',
  'META', 'MGM', 'MHK', 'MKC', 'MLM', 'MMC', 'MMM', 'MNST', 'MO', 'MOH',
  'MOS', 'MPC', 'MPWR', 'MRK', 'MRNA', 'MS', 'MSCI', 'MSFT', 'MSI', 'MTB',
  'MTCH', 'MTD', 'MU', 'NCLH', 'NDAQ', 'NDSN', 'NEE', 'NEM', 'NFLX', 'NI',
  'NKE', 'NOC', 'NOW', 'NRG', 'NSC', 'NTAP', 'NTRS', 'NUE', 'NVDA', 'NVR',
  'NWS', 'NWSA', 'NXPI', 'O', 'ODFL', 'OKE', 'OMC', 'ON', 'ORCL', 'ORLY',
  'OTIS', 'OXY', 'PANW', 'PAYC', 'PAYX', 'PCAR', 'PCG', 'PEG', 'PEP', 'PFE',
  'PFG', 'PG', 'PGR', 'PH', 'PHM', 'PKG', 'PLD', 'PLTR', 'PM', 'PNC',
  'PNR', 'PNW', 'PODD', 'POOL', 'PPG', 'PPL', 'PRU', 'PSA', 'PSKY', 'PSX',
  'PTC', 'PWR', 'PYPL', 'Q', 'QCOM', 'RCL', 'REG', 'REGN', 'RF', 'RJF',
  'RL', 'RMD', 'ROK', 'ROL', 'ROP', 'ROST', 'RSG', 'RTX', 'RVTY', 'SBAC',
  'SBUX', 'SCHW', 'SHW', 'SJM', 'SLB', 'SMCI', 'SNA', 'SNDK', 'SNPS', 'SO',
  'SOLS', 'SOLV', 'SPG', 'SPGI', 'SRE', 'STE', 'STLD', 'STT', 'STX', 'STZ',
  'SW', 'SWK', 'SWKS', 'SYF', 'SYK', 'SYY', 'T', 'TAP', 'TDG', 'TDY',
  'TECH', 'TEL', 'TER', 'TFC', 'TGT', 'TJX', 'TKO', 'TMO', 'TMUS', 'TPL',
  'TPR', 'TRGP', 'TRMB', 'TROW', 'TRV', 'TSCO', 'TSLA', 'TSN', 'TT', 'TTD',
  'TTWO', 'TXN', 'TXT', 'TYL', 'UAL', 'UBER', 'UDR', 'UHS', 'ULTA', 'UNH',
  'UNP', 'UPS', 'URI', 'USB', 'V', 'VICI', 'VLO', 'VLTO', 'VMC', 'VRSK',
  'VRSN', 'VRTX', 'VST', 'VTR', 'VTRS', 'VZ', 'WAB', 'WAT', 'WBD', 'WDAY',
  'WDC', 'WEC', 'WELL', 'WFC', 'WM', 'WMB', 'WMT', 'WRB', 'WSM', 'WST',
  'WTW', 'WY', 'WYNN', 'XEL', 'XOM', 'XYL', 'XYZ', 'YUM', 'ZBH', 'ZBRA',
  'ZTS',
];

/**
 * 主要 ETF 清單
 * 
 * 分類:
 * - 市場指數 ETF (7 支)
 * - 產業 ETF (13 支)
 * - 債券 ETF (3 支)
 * - 國際市場 ETF (3 支)
 * - 商品 ETF (3 支)
 * - 其他主題 ETF (3 支)
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
  
  // 產業 ETF
  'XLK',   // Technology Select Sector SPDR Fund
  'VGT',   // Vanguard Information Technology ETF
  'SOXX',  // iShares Semiconductor ETF
  'ARKK',  // ARK Innovation ETF
  'XLF',   // Financial Select Sector SPDR Fund
  'VFH',   // Vanguard Financials ETF
  'XLV',   // Health Care Select Sector SPDR Fund
  'VHT',   // Vanguard Health Care ETF
  'XLE',   // Energy Select Sector SPDR Fund
  'VDE',   // Vanguard Energy ETF
  'XLY',   // Consumer Discretionary Select Sector SPDR Fund
  'XLP',   // Consumer Staples Select Sector SPDR Fund
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
 * 需要定期同步的所有股票清單
 * 包含 S&P 500 成分股與主要 ETF
 */
export const SCHEDULED_SYNC_STOCKS = [
  ...new Set([...SP500_STOCKS, ...MAJOR_ETFS])
];

/**
 * 判斷股票是否需要定期同步
 * 
 * @param symbol - 股票代號
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

/**
 * 取得股票分類資訊
 * 
 * @param symbol - 股票代號
 * @returns 股票分類 ('sp500' | 'etf' | 'other')
 */
export function getStockCategory(symbol: string): 'sp500' | 'etf' | 'other' {
  const upperSymbol = symbol.toUpperCase();
  
  if (SP500_STOCKS.includes(upperSymbol)) {
    return 'sp500';
  }
  
  if (MAJOR_ETFS.includes(upperSymbol)) {
    return 'etf';
  }
  
  return 'other';
}
