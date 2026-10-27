CREATE TABLE `allowlist_entry` (
	`discord_id` text PRIMARY KEY NOT NULL,
	`added_by` text,
	`added_at` integer NOT NULL,
	`source` text NOT NULL,
	FOREIGN KEY (`added_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`actor_user_id` text,
	`action` text NOT NULL,
	`target` text,
	`details` text,
	`at` integer NOT NULL,
	FOREIGN KEY (`actor_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `build` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`character_id` integer NOT NULL,
	`title` text NOT NULL,
	`url` text,
	`source` text,
	`status` text DEFAULT 'current' NOT NULL,
	`target_class_entry_id` integer,
	`notes` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`character_id`) REFERENCES `character`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`target_class_entry_id`) REFERENCES `game_catalog_entry`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `build_character` ON `build` (`character_id`);--> statement-breakpoint
CREATE TABLE `character_profession` (
	`character_id` integer NOT NULL,
	`profession_entry_id` integer NOT NULL,
	`skill_level` integer,
	`specialization` text,
	`notes` text,
	PRIMARY KEY(`character_id`, `profession_entry_id`),
	FOREIGN KEY (`character_id`) REFERENCES `character`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`profession_entry_id`) REFERENCES `game_catalog_entry`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `character` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`game_id` text NOT NULL,
	`name` text NOT NULL,
	`server_key` text,
	`server_name` text,
	`faction_entry_id` integer,
	`race_entry_id` integer,
	`class_entry_id` integer,
	`spec` text,
	`level` integer,
	`is_main` integer DEFAULT false NOT NULL,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`game_id`) REFERENCES `game`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`faction_entry_id`) REFERENCES `game_catalog_entry`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`race_entry_id`) REFERENCES `game_catalog_entry`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`class_entry_id`) REFERENCES `game_catalog_entry`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `character_user` ON `character` (`user_id`);--> statement-breakpoint
CREATE INDEX `character_game` ON `character` (`game_id`);--> statement-breakpoint
CREATE TABLE `game_catalog_entry` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`game_id` text NOT NULL,
	`kind` text NOT NULL,
	`key` text NOT NULL,
	`name` text NOT NULL,
	`data` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`last_seen_pack_version` text NOT NULL,
	`todo` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `game`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `game_catalog_entry_game_kind_key` ON `game_catalog_entry` (`game_id`,`kind`,`key`);--> statement-breakpoint
CREATE TABLE `game` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`meta` text NOT NULL,
	`pack_version` text NOT NULL,
	`pack_hash` text NOT NULL,
	`last_sync_at` integer,
	`last_sync_error` text
);
--> statement-breakpoint
CREATE TABLE `guild_game` (
	`guild_id` integer NOT NULL,
	`game_id` text NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`region_id` text,
	PRIMARY KEY(`guild_id`, `game_id`),
	FOREIGN KEY (`guild_id`) REFERENCES `guild`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`game_id`) REFERENCES `game`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `guild_member` (
	`guild_id` integer NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`disabled_at` integer,
	`joined_at` integer NOT NULL,
	PRIMARY KEY(`guild_id`, `user_id`),
	FOREIGN KEY (`guild_id`) REFERENCES `guild`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `guild` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`discord_guild_id` text,
	`default_timezone` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sync_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`game_id` text NOT NULL,
	`started_at` integer NOT NULL,
	`finished_at` integer NOT NULL,
	`status` text NOT NULL,
	`from_version` text,
	`to_version` text,
	`summary` text,
	`error` text
);
