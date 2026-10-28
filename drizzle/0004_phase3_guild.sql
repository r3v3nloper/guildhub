CREATE TABLE `craft_request` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`game_id` text NOT NULL,
	`profession_entry_id` integer NOT NULL,
	`item` text NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`notes` text,
	`requester_id` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`crafter_id` text,
	`accepted_at` integer,
	`done_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `game`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`profession_entry_id`) REFERENCES `game_catalog_entry`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`requester_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`crafter_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `craft_request_game` ON `craft_request` (`game_id`);--> statement-breakpoint
CREATE TABLE `recipe_entry` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`character_id` integer NOT NULL,
	`profession_entry_id` integer NOT NULL,
	`name` text NOT NULL,
	`notes` text,
	FOREIGN KEY (`character_id`) REFERENCES `character`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`profession_entry_id`) REFERENCES `game_catalog_entry`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `recipe_entry_character` ON `recipe_entry` (`character_id`,`profession_entry_id`);--> statement-breakpoint
CREATE TABLE `stat_priority` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`game_id` text NOT NULL,
	`class_entry_id` integer NOT NULL,
	`title` text NOT NULL,
	`stats` text NOT NULL,
	`notes` text,
	`source` text,
	`updated_by` text,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `game`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`class_entry_id`) REFERENCES `game_catalog_entry`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `stat_priority_class` ON `stat_priority` (`class_entry_id`);