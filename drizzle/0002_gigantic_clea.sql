CREATE TABLE `portfolioHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`totalValue` int NOT NULL,
	`totalCost` int NOT NULL,
	`totalGainLoss` int NOT NULL,
	`gainLossPercent` int NOT NULL,
	`recordDate` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `portfolioHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `userId_idx` ON `portfolioHistory` (`userId`);--> statement-breakpoint
CREATE INDEX `recordDate_idx` ON `portfolioHistory` (`recordDate`);--> statement-breakpoint
CREATE INDEX `user_date_idx` ON `portfolioHistory` (`userId`,`recordDate`);