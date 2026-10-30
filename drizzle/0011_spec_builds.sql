CREATE TABLE `spec_build` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`game_id` text NOT NULL,
	`spec_entry_id` integer NOT NULL,
	`title` text NOT NULL,
	`url` text NOT NULL,
	`notes` text,
	`updated_by` text,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `game`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`spec_entry_id`) REFERENCES `game_catalog_entry`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `spec_build_spec` ON `spec_build` (`spec_entry_id`);