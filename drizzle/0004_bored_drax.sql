CREATE TABLE `twseStockList` (
	`id` int AUTO_INCREMENT NOT NULL,
	`symbol` varchar(10) NOT NULL,
	`name` text NOT NULL,
	`shortName` text,
	`industry` varchar(100),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `twseStockList_id` PRIMARY KEY(`id`),
	CONSTRAINT `twseStockList_symbol_unique` UNIQUE(`symbol`)
);
--> statement-breakpoint
CREATE INDEX `symbol_idx` ON `twseStockList` (`symbol`);--> statement-breakpoint
CREATE INDEX `updatedAt_idx` ON `twseStockList` (`updatedAt`);