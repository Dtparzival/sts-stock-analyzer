-- 美股基本資料表
CREATE TABLE IF NOT EXISTS `usStocks` (
  `id` int AUTO_INCREMENT NOT NULL,
  `symbol` varchar(20) NOT NULL,
  `name` varchar(200) NOT NULL,
  `shortName` varchar(100),
  `exchange` varchar(20),
  `currency` varchar(10),
  `country` varchar(50),
  `sector` varchar(100),
  `industry` varchar(100),
  `isActive` boolean NOT NULL DEFAULT true,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `usStocks_id` PRIMARY KEY(`id`),
  CONSTRAINT `usStocks_symbol_unique` UNIQUE(`symbol`)
);

CREATE INDEX `us_symbol_idx` ON `usStocks` (`symbol`);
CREATE INDEX `us_exchange_idx` ON `usStocks` (`exchange`);
CREATE INDEX `us_sector_idx` ON `usStocks` (`sector`);
CREATE INDEX `us_isActive_idx` ON `usStocks` (`isActive`);

-- 美股歷史價格表
CREATE TABLE IF NOT EXISTS `usStockPrices` (
  `id` int AUTO_INCREMENT NOT NULL,
  `symbol` varchar(20) NOT NULL,
  `date` date NOT NULL,
  `open` int NOT NULL,
  `high` int NOT NULL,
  `low` int NOT NULL,
  `close` int NOT NULL,
  `volume` bigint NOT NULL,
  `change` int NOT NULL,
  `changePercent` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `usStockPrices_id` PRIMARY KEY(`id`)
);

CREATE INDEX `us_symbol_date_idx` ON `usStockPrices` (`symbol`,`date`);
CREATE INDEX `us_date_idx` ON `usStockPrices` (`date`);
CREATE INDEX `us_symbol_idx` ON `usStockPrices` (`symbol`);

-- 美股資料同步狀態表
CREATE TABLE IF NOT EXISTS `usDataSyncStatus` (
  `id` int AUTO_INCREMENT NOT NULL,
  `dataType` varchar(50) NOT NULL,
  `source` varchar(50) NOT NULL,
  `lastSyncAt` timestamp NOT NULL,
  `status` enum('success','partial','failed') NOT NULL,
  `recordCount` int NOT NULL DEFAULT 0,
  `errorMessage` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `usDataSyncStatus_id` PRIMARY KEY(`id`)
);

CREATE INDEX `us_dataType_idx` ON `usDataSyncStatus` (`dataType`);
CREATE INDEX `us_lastSyncAt_idx` ON `usDataSyncStatus` (`lastSyncAt`);

-- 美股資料同步錯誤記錄表
CREATE TABLE IF NOT EXISTS `usDataSyncErrors` (
  `id` int AUTO_INCREMENT NOT NULL,
  `dataType` varchar(50) NOT NULL,
  `symbol` varchar(20),
  `errorType` varchar(50) NOT NULL,
  `errorMessage` text NOT NULL,
  `errorStack` text,
  `retryCount` int NOT NULL DEFAULT 0,
  `resolved` boolean NOT NULL DEFAULT false,
  `syncedAt` timestamp NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `usDataSyncErrors_id` PRIMARY KEY(`id`)
);

CREATE INDEX `us_dataType_idx` ON `usDataSyncErrors` (`dataType`);
CREATE INDEX `us_symbol_idx` ON `usDataSyncErrors` (`symbol`);
CREATE INDEX `us_syncedAt_idx` ON `usDataSyncErrors` (`syncedAt`);

-- 股票資料快取表
CREATE TABLE IF NOT EXISTS `stockDataCache` (
  `id` int AUTO_INCREMENT NOT NULL,
  `cacheKey` varchar(200) NOT NULL,
  `market` varchar(10) NOT NULL,
  `symbol` varchar(20) NOT NULL,
  `dataType` varchar(50) NOT NULL,
  `data` text NOT NULL,
  `expiresAt` timestamp NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `stockDataCache_id` PRIMARY KEY(`id`),
  CONSTRAINT `stockDataCache_cacheKey_unique` UNIQUE(`cacheKey`)
);

CREATE INDEX `cacheKey_idx` ON `stockDataCache` (`cacheKey`);
CREATE INDEX `market_symbol_idx` ON `stockDataCache` (`market`,`symbol`);
CREATE INDEX `expiresAt_idx` ON `stockDataCache` (`expiresAt`);
