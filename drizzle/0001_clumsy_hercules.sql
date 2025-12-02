CREATE TABLE `stockDataCache` (
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
--> statement-breakpoint
CREATE TABLE `twDataSyncErrors` (
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
--> statement-breakpoint
CREATE TABLE `twDataSyncStatus` (
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
--> statement-breakpoint
CREATE TABLE `twStockPrices` (
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
--> statement-breakpoint
CREATE TABLE `twStocks` (
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
--> statement-breakpoint
CREATE TABLE `usDataSyncErrors` (
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
--> statement-breakpoint
CREATE TABLE `usDataSyncStatus` (
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
--> statement-breakpoint
CREATE TABLE `usStockPrices` (
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
--> statement-breakpoint
CREATE TABLE `usStocks` (
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
--> statement-breakpoint
DROP TABLE `recommendationCache`;--> statement-breakpoint
DROP TABLE `searchHistory`;--> statement-breakpoint
DROP TABLE `userInteractions`;--> statement-breakpoint
DROP TABLE `watchlist`;--> statement-breakpoint
CREATE INDEX `cacheKey_idx` ON `stockDataCache` (`cacheKey`);--> statement-breakpoint
CREATE INDEX `market_symbol_idx` ON `stockDataCache` (`market`,`symbol`);--> statement-breakpoint
CREATE INDEX `expiresAt_idx` ON `stockDataCache` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `dataType_idx` ON `twDataSyncErrors` (`dataType`);--> statement-breakpoint
CREATE INDEX `symbol_idx` ON `twDataSyncErrors` (`symbol`);--> statement-breakpoint
CREATE INDEX `syncedAt_idx` ON `twDataSyncErrors` (`syncedAt`);--> statement-breakpoint
CREATE INDEX `dataType_idx` ON `twDataSyncStatus` (`dataType`);--> statement-breakpoint
CREATE INDEX `lastSyncAt_idx` ON `twDataSyncStatus` (`lastSyncAt`);--> statement-breakpoint
CREATE INDEX `symbol_date_idx` ON `twStockPrices` (`symbol`,`date`);--> statement-breakpoint
CREATE INDEX `date_idx` ON `twStockPrices` (`date`);--> statement-breakpoint
CREATE INDEX `symbol_idx` ON `twStockPrices` (`symbol`);--> statement-breakpoint
CREATE INDEX `symbol_idx` ON `twStocks` (`symbol`);--> statement-breakpoint
CREATE INDEX `market_idx` ON `twStocks` (`market`);--> statement-breakpoint
CREATE INDEX `industry_idx` ON `twStocks` (`industry`);--> statement-breakpoint
CREATE INDEX `isActive_idx` ON `twStocks` (`isActive`);--> statement-breakpoint
CREATE INDEX `us_dataType_idx` ON `usDataSyncErrors` (`dataType`);--> statement-breakpoint
CREATE INDEX `us_symbol_idx` ON `usDataSyncErrors` (`symbol`);--> statement-breakpoint
CREATE INDEX `us_syncedAt_idx` ON `usDataSyncErrors` (`syncedAt`);--> statement-breakpoint
CREATE INDEX `us_dataType_idx` ON `usDataSyncStatus` (`dataType`);--> statement-breakpoint
CREATE INDEX `us_lastSyncAt_idx` ON `usDataSyncStatus` (`lastSyncAt`);--> statement-breakpoint
CREATE INDEX `us_symbol_date_idx` ON `usStockPrices` (`symbol`,`date`);--> statement-breakpoint
CREATE INDEX `us_date_idx` ON `usStockPrices` (`date`);--> statement-breakpoint
CREATE INDEX `us_symbol_idx` ON `usStockPrices` (`symbol`);--> statement-breakpoint
CREATE INDEX `us_symbol_idx` ON `usStocks` (`symbol`);--> statement-breakpoint
CREATE INDEX `us_exchange_idx` ON `usStocks` (`exchange`);--> statement-breakpoint
CREATE INDEX `us_sector_idx` ON `usStocks` (`sector`);--> statement-breakpoint
CREATE INDEX `us_isActive_idx` ON `usStocks` (`isActive`);