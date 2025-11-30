-- 台股基本資料表
CREATE TABLE IF NOT EXISTS `twStocks` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `symbol` VARCHAR(10) NOT NULL UNIQUE,
  `name` TEXT NOT NULL,
  `shortName` TEXT,
  `market` ENUM('上市', '上櫃', '興櫃') NOT NULL,
  `industry` VARCHAR(100),
  `type` ENUM('股票', 'ETF') NOT NULL DEFAULT '股票',
  `listedDate` TIMESTAMP NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT TRUE,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `symbol_idx` (`symbol`),
  INDEX `market_idx` (`market`),
  INDEX `industry_idx` (`industry`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 台股歷史價格表
CREATE TABLE IF NOT EXISTS `twStockPrices` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `symbol` VARCHAR(10) NOT NULL,
  `date` TIMESTAMP NOT NULL,
  `open` INT NOT NULL,
  `high` INT NOT NULL,
  `low` INT NOT NULL,
  `close` INT NOT NULL,
  `volume` INT NOT NULL,
  `amount` INT NOT NULL,
  `change` INT NOT NULL,
  `changePercent` INT NOT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `symbol_idx` (`symbol`),
  INDEX `date_idx` (`date`),
  INDEX `symbol_date_idx` (`symbol`, `date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 台股技術指標表
CREATE TABLE IF NOT EXISTS `twStockIndicators` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `symbol` VARCHAR(10) NOT NULL,
  `date` TIMESTAMP NOT NULL,
  `ma5` INT,
  `ma10` INT,
  `ma20` INT,
  `ma60` INT,
  `rsi14` INT,
  `macd` INT,
  `macdSignal` INT,
  `macdHistogram` INT,
  `kValue` INT,
  `dValue` INT,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `symbol_idx` (`symbol`),
  INDEX `date_idx` (`date`),
  INDEX `symbol_date_idx` (`symbol`, `date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 台股基本面資料表
CREATE TABLE IF NOT EXISTS `twStockFundamentals` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `symbol` VARCHAR(10) NOT NULL,
  `year` INT NOT NULL,
  `quarter` INT NOT NULL,
  `eps` INT,
  `pe` INT,
  `pb` INT,
  `roe` INT,
  `dividend` INT,
  `yieldRate` INT,
  `revenue` INT,
  `netIncome` INT,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `symbol_idx` (`symbol`),
  INDEX `year_quarter_idx` (`year`, `quarter`),
  INDEX `symbol_year_quarter_idx` (`symbol`, `year`, `quarter`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 資料同步狀態表
CREATE TABLE IF NOT EXISTS `twDataSyncStatus` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `dataType` VARCHAR(50) NOT NULL,
  `source` ENUM('TWSE', 'TPEx', 'FinMind') NOT NULL,
  `lastSyncAt` TIMESTAMP NOT NULL,
  `status` ENUM('success', 'failed', 'in_progress') NOT NULL,
  `recordCount` INT NOT NULL DEFAULT 0,
  `errorMessage` TEXT,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `dataType_idx` (`dataType`),
  INDEX `source_idx` (`source`),
  INDEX `lastSyncAt_idx` (`lastSyncAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
