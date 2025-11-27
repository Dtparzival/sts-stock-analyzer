CREATE TABLE `improvementPlans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`problemType` varchar(50) NOT NULL,
	`problemTarget` varchar(50),
	`problemDescription` text NOT NULL,
	`baselineAccuracy` int NOT NULL,
	`targetAccuracy` int NOT NULL,
	`improvementMeasures` text NOT NULL,
	`status` enum('pending','in_progress','completed','cancelled') NOT NULL DEFAULT 'pending',
	`startDate` timestamp,
	`endDate` timestamp,
	`currentAccuracy` int,
	`improvementRate` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `improvementPlans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `userId_idx` ON `improvementPlans` (`userId`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `improvementPlans` (`status`);--> statement-breakpoint
CREATE INDEX `problemType_idx` ON `improvementPlans` (`problemType`);--> statement-breakpoint
CREATE INDEX `createdAt_idx` ON `improvementPlans` (`createdAt`);