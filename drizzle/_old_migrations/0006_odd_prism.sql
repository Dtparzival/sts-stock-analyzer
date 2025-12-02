CREATE TABLE `analysisHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`symbol` varchar(20) NOT NULL,
	`analysisType` varchar(50) NOT NULL,
	`content` text NOT NULL,
	`recommendation` varchar(20),
	`priceAtAnalysis` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `analysisHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `symbol_idx` ON `analysisHistory` (`symbol`);--> statement-breakpoint
CREATE INDEX `createdAt_idx` ON `analysisHistory` (`createdAt`);--> statement-breakpoint
CREATE INDEX `symbol_type_idx` ON `analysisHistory` (`symbol`,`analysisType`);