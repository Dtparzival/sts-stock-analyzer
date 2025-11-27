CREATE TABLE `recommendationCache` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`market` varchar(10) NOT NULL,
	`recommendations` text NOT NULL,
	`score` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp NOT NULL,
	CONSTRAINT `recommendationCache_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `userInteractions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`symbol` varchar(20) NOT NULL,
	`interactionType` enum('click','swipe_left','swipe_right','long_press','favorite','unfavorite') NOT NULL,
	`context` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `userInteractions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `userId_idx` ON `recommendationCache` (`userId`);--> statement-breakpoint
CREATE INDEX `market_idx` ON `recommendationCache` (`market`);--> statement-breakpoint
CREATE INDEX `expiresAt_idx` ON `recommendationCache` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `user_market_idx` ON `recommendationCache` (`userId`,`market`);--> statement-breakpoint
CREATE INDEX `userId_idx` ON `userInteractions` (`userId`);--> statement-breakpoint
CREATE INDEX `symbol_idx` ON `userInteractions` (`symbol`);--> statement-breakpoint
CREATE INDEX `interactionType_idx` ON `userInteractions` (`interactionType`);--> statement-breakpoint
CREATE INDEX `createdAt_idx` ON `userInteractions` (`createdAt`);