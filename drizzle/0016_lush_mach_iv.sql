CREATE TABLE `recommendationCache` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`symbol` varchar(20) NOT NULL,
	`market` enum('US','TW') NOT NULL,
	`score` int NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `recommendationCache_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `searchHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`symbol` varchar(20) NOT NULL,
	`shortName` text,
	`companyName` text,
	`searchedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `searchHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `userInteractions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`symbol` varchar(20) NOT NULL,
	`interactionType` enum('click','swipe_left','swipe_right','long_press','favorite','unfavorite') NOT NULL,
	`context` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `userInteractions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `watchlist` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`symbol` varchar(20) NOT NULL,
	`name` text,
	`addedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `watchlist_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `userId_idx` ON `recommendationCache` (`userId`);--> statement-breakpoint
CREATE INDEX `market_idx` ON `recommendationCache` (`market`);--> statement-breakpoint
CREATE INDEX `expiresAt_idx` ON `recommendationCache` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `score_idx` ON `recommendationCache` (`score`);--> statement-breakpoint
CREATE INDEX `userId_idx` ON `searchHistory` (`userId`);--> statement-breakpoint
CREATE INDEX `symbol_idx` ON `searchHistory` (`symbol`);--> statement-breakpoint
CREATE INDEX `userId_idx` ON `userInteractions` (`userId`);--> statement-breakpoint
CREATE INDEX `symbol_idx` ON `userInteractions` (`symbol`);--> statement-breakpoint
CREATE INDEX `type_idx` ON `userInteractions` (`interactionType`);--> statement-breakpoint
CREATE INDEX `createdAt_idx` ON `userInteractions` (`createdAt`);--> statement-breakpoint
CREATE INDEX `userId_idx` ON `watchlist` (`userId`);--> statement-breakpoint
CREATE INDEX `symbol_idx` ON `watchlist` (`symbol`);