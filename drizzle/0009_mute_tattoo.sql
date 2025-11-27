CREATE TABLE `portfolioTransactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`symbol` varchar(20) NOT NULL,
	`companyName` text,
	`transactionType` enum('buy','sell') NOT NULL,
	`shares` int NOT NULL,
	`price` int NOT NULL,
	`totalAmount` int NOT NULL,
	`transactionDate` timestamp NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `portfolioTransactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `userId_idx` ON `portfolioTransactions` (`userId`);--> statement-breakpoint
CREATE INDEX `symbol_idx` ON `portfolioTransactions` (`symbol`);--> statement-breakpoint
CREATE INDEX `transactionDate_idx` ON `portfolioTransactions` (`transactionDate`);--> statement-breakpoint
CREATE INDEX `user_date_idx` ON `portfolioTransactions` (`userId`,`transactionDate`);