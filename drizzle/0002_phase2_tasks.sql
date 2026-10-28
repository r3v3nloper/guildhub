CREATE TABLE `checklist_item` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`checklist_id` integer NOT NULL,
	`label` text NOT NULL,
	`sort_order` integer NOT NULL,
	FOREIGN KEY (`checklist_id`) REFERENCES `checklist`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `checklist_item_checklist` ON `checklist_item` (`checklist_id`);--> statement-breakpoint
CREATE TABLE `checklist_tick` (
	`item_id` integer NOT NULL,
	`user_id` text NOT NULL,
	PRIMARY KEY(`item_id`, `user_id`),
	FOREIGN KEY (`item_id`) REFERENCES `checklist_item`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `checklist` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_id` text NOT NULL,
	`game_id` text NOT NULL,
	`name` text NOT NULL,
	`visibility` text DEFAULT 'private' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`game_id`) REFERENCES `game`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `farm_spot` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_id` text NOT NULL,
	`game_id` text NOT NULL,
	`profession_entry_id` integer,
	`resource` text NOT NULL,
	`zone` text NOT NULL,
	`coordinates` text,
	`link` text,
	`notes` text,
	`visibility` text DEFAULT 'guild' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`game_id`) REFERENCES `game`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`profession_entry_id`) REFERENCES `game_catalog_entry`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `farm_spot_game` ON `farm_spot` (`game_id`);--> statement-breakpoint
CREATE TABLE `resource_state` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`task_id` integer NOT NULL,
	`scope_key` text NOT NULL,
	`value` integer NOT NULL,
	`value_at` integer NOT NULL,
	`updated_by` text,
	FOREIGN KEY (`task_id`) REFERENCES `task_definition`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `resource_state_task_scope` ON `resource_state` (`task_id`,`scope_key`);--> statement-breakpoint
CREATE TABLE `task_definition` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`game_id` text,
	`source` text NOT NULL,
	`key` text,
	`owner_id` text,
	`title` text NOT NULL,
	`description` text,
	`kind` text NOT NULL,
	`category` text,
	`scope` text NOT NULL,
	`reset_rule_entry_id` integer,
	`custom_reset_rule` text,
	`cap` integer,
	`regen_amount` integer,
	`regen_interval_minutes` integer,
	`regen_alignment` text,
	`timezone` text,
	`per_period_gain` integer,
	`alert_at` integer,
	`bosses` text,
	`priority` text DEFAULT 'medium' NOT NULL,
	`sort_order` integer,
	`tags` text NOT NULL,
	`link` text,
	`active` integer DEFAULT true NOT NULL,
	`todo` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `game`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reset_rule_entry_id`) REFERENCES `game_catalog_entry`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `task_definition_game_key` ON `task_definition` (`game_id`,`key`);--> statement-breakpoint
CREATE INDEX `task_definition_owner` ON `task_definition` (`owner_id`);--> statement-breakpoint
CREATE TABLE `task_progress` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`task_id` integer NOT NULL,
	`scope_key` text NOT NULL,
	`period_key` text NOT NULL,
	`value` integer DEFAULT 0 NOT NULL,
	`data` text,
	`completed_at` integer,
	`updated_at` integer NOT NULL,
	`updated_by` text,
	FOREIGN KEY (`task_id`) REFERENCES `task_definition`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `task_progress_task_scope_period` ON `task_progress` (`task_id`,`scope_key`,`period_key`);--> statement-breakpoint
CREATE INDEX `task_progress_scope` ON `task_progress` (`scope_key`);--> statement-breakpoint
CREATE TABLE `todo_item` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`list_id` integer NOT NULL,
	`text` text NOT NULL,
	`done_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`list_id`) REFERENCES `todo_list`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `todo_item_list` ON `todo_item` (`list_id`);--> statement-breakpoint
CREATE TABLE `todo_list` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
