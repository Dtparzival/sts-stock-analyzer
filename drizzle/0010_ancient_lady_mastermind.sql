CREATE TABLE `quickQuestionUsage` (
	`id` int AUTO_INCREMENT NOT NULL,
	`questionText` varchar(255) NOT NULL,
	`usageCount` int NOT NULL DEFAULT 0,
	`lastUsedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `quickQuestionUsage_id` PRIMARY KEY(`id`),
	CONSTRAINT `quickQuestionUsage_questionText_unique` UNIQUE(`questionText`)
);
--> statement-breakpoint
CREATE INDEX `usageCount_idx` ON `quickQuestionUsage` (`usageCount`);--> statement-breakpoint
CREATE INDEX `lastUsedAt_idx` ON `quickQuestionUsage` (`lastUsedAt`);