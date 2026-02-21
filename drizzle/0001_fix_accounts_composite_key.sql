-- Drop old accounts table (has incorrect single `id` primary key)
DROP TABLE IF EXISTS `accounts`;

--> statement-breakpoint
-- Recreate with Auth.js-compliant composite primary key (provider, providerAccountId)
CREATE TABLE `accounts`(
    `userId` text NOT NULL,
    `type` text NOT NULL,
    `provider` text NOT NULL,
    `providerAccountId` text NOT NULL,
    `refresh_token` text,
    `access_token` text,
    `expires_at` integer,
    `token_type` text,
    `scope` text,
    `id_token` text,
    `session_state` text,
    PRIMARY KEY (`provider`, `providerAccountId`),
    FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE NO action ON DELETE CASCADE
);

