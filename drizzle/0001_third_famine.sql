CREATE TABLE `analysisCache` (
	`id` int AUTO_INCREMENT NOT NULL,
	`symbol` varchar(20) NOT NULL,
	`analysisType` varchar(50) NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp NOT NULL,
	CONSTRAINT `analysisCache_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `portfolio` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`symbol` varchar(20) NOT NULL,
	`companyName` text,
	`shares` int NOT NULL,
	`purchasePrice` int NOT NULL,
	`purchaseDate` timestamp NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `portfolio_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `searchHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`symbol` varchar(20) NOT NULL,
	`companyName` text,
	`searchedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `searchHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `watchlist` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`symbol` varchar(20) NOT NULL,
	`companyName` text,
	`addedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `watchlist_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `symbol_idx` ON `analysisCache` (`symbol`);--> statement-breakpoint
CREATE INDEX `expiresAt_idx` ON `analysisCache` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `userId_idx` ON `portfolio` (`userId`);--> statement-breakpoint
CREATE INDEX `symbol_idx` ON `portfolio` (`symbol`);--> statement-breakpoint
CREATE INDEX `userId_idx` ON `searchHistory` (`userId`);--> statement-breakpoint
CREATE INDEX `searchedAt_idx` ON `searchHistory` (`searchedAt`);--> statement-breakpoint
CREATE INDEX `userId_idx` ON `watchlist` (`userId`);--> statement-breakpoint
CREATE INDEX `symbol_idx` ON `watchlist` (`symbol`);