-- Custom SQL migration file for Taiwan Stock Database v2
-- Create simplified Taiwan stock tables according to delivery document v2

-- Create twStocks table
CREATE TABLE IF NOT EXISTS `twStocks` (
  `id` int AUTO_INCREMENT NOT NULL,
  `symbol` varchar(10) NOT NULL,
  `name` varchar(100) NOT NULL,
  `shortName` varchar(50),
  `market` enum('TWSE','TPEx') NOT NULL,
  `industry` varchar(50),
  `isActive` boolean NOT NULL DEFAULT true,
  `listedDate` date,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `twStocks_id` PRIMARY KEY(`id`),
  CONSTRAINT `twStocks_symbol_unique` UNIQUE(`symbol`)
);

CREATE INDEX `symbol_idx` ON `twStocks` (`symbol`);
CREATE INDEX `market_idx` ON `twStocks` (`market`);
CREATE INDEX `industry_idx` ON `twStocks` (`industry`);
CREATE INDEX `isActive_idx` ON `twStocks` (`isActive`);

-- Create twStockPrices table
CREATE TABLE IF NOT EXISTS `twStockPrices` (
  `id` int AUTO_INCREMENT NOT NULL,
  `symbol` varchar(10) NOT NULL,
  `date` date NOT NULL,
  `open` int NOT NULL,
  `high` int NOT NULL,
  `low` int NOT NULL,
  `close` int NOT NULL,
  `volume` bigint NOT NULL,
  `amount` bigint NOT NULL,
  `change` int NOT NULL,
  `changePercent` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `twStockPrices_id` PRIMARY KEY(`id`)
);

CREATE INDEX `symbol_date_idx` ON `twStockPrices` (`symbol`,`date`);
CREATE INDEX `date_idx` ON `twStockPrices` (`date`);
CREATE INDEX `symbol_idx` ON `twStockPrices` (`symbol`);

-- Create twDataSyncStatus table
CREATE TABLE IF NOT EXISTS `twDataSyncStatus` (
  `id` int AUTO_INCREMENT NOT NULL,
  `dataType` varchar(50) NOT NULL,
  `source` varchar(50) NOT NULL,
  `lastSyncAt` timestamp NOT NULL,
  `status` enum('success','partial','failed') NOT NULL,
  `recordCount` int NOT NULL DEFAULT 0,
  `errorMessage` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `twDataSyncStatus_id` PRIMARY KEY(`id`)
);

CREATE INDEX `dataType_idx` ON `twDataSyncStatus` (`dataType`);
CREATE INDEX `lastSyncAt_idx` ON `twDataSyncStatus` (`lastSyncAt`);

-- Create twDataSyncErrors table
CREATE TABLE IF NOT EXISTS `twDataSyncErrors` (
  `id` int AUTO_INCREMENT NOT NULL,
  `dataType` varchar(50) NOT NULL,
  `symbol` varchar(10),
  `errorType` varchar(50) NOT NULL,
  `errorMessage` text NOT NULL,
  `errorStack` text,
  `retryCount` int NOT NULL DEFAULT 0,
  `resolved` boolean NOT NULL DEFAULT false,
  `syncedAt` timestamp NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `twDataSyncErrors_id` PRIMARY KEY(`id`)
);

CREATE INDEX `dataType_idx` ON `twDataSyncErrors` (`dataType`);
CREATE INDEX `symbol_idx` ON `twDataSyncErrors` (`symbol`);
CREATE INDEX `syncedAt_idx` ON `twDataSyncErrors` (`syncedAt`);
