CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`githubUrl` text,
	`imageUrl` text,
	`cachedReadme` text,
	`readmeUpdatedAt` integer,
	`authorId` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`createdAt` integer,
	`updatedAt` integer,
	FOREIGN KEY (`authorId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `projects_slug_unique` ON `projects` (`slug`);
