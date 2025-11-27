CREATE TABLE `stockDataCache` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cacheKey` varchar(255) NOT NULL,
	`apiEndpoint` varchar(100) NOT NULL,
	`data` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp NOT NULL,
	CONSTRAINT `stockDataCache_id` PRIMARY KEY(`id`),
	CONSTRAINT `stockDataCache_cacheKey_unique` UNIQUE(`cacheKey`)
);
--> statement-breakpoint
CREATE INDEX `cacheKey_idx` ON `stockDataCache` (`cacheKey`);--> statement-breakpoint
CREATE INDEX `expiresAt_idx` ON `stockDataCache` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `apiEndpoint_idx` ON `stockDataCache` (`apiEndpoint`);