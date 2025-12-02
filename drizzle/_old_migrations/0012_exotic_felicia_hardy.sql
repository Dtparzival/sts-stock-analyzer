CREATE TABLE `userBehavior` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`symbol` varchar(20) NOT NULL,
	`viewCount` int NOT NULL DEFAULT 0,
	`searchCount` int NOT NULL DEFAULT 0,
	`totalViewTime` int NOT NULL DEFAULT 0,
	`lastViewedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userBehavior_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `userId_idx` ON `userBehavior` (`userId`);--> statement-breakpoint
CREATE INDEX `symbol_idx` ON `userBehavior` (`symbol`);--> statement-breakpoint
CREATE INDEX `user_symbol_idx` ON `userBehavior` (`userId`,`symbol`);--> statement-breakpoint
CREATE INDEX `lastViewedAt_idx` ON `userBehavior` (`lastViewedAt`);