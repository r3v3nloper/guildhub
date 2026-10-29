CREATE TABLE `boss_loot` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`boss_id` integer NOT NULL,
	`name` text NOT NULL,
	`link` text,
	`notes` text,
	`sort_order` integer NOT NULL,
	FOREIGN KEY (`boss_id`) REFERENCES `checklist_boss`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `boss_loot_boss` ON `boss_loot` (`boss_id`);--> statement-breakpoint
CREATE TABLE `checklist_boss` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`checklist_id` integer NOT NULL,
	`name` text NOT NULL,
	`mechanics` text,
	`sort_order` integer NOT NULL,
	FOREIGN KEY (`checklist_id`) REFERENCES `checklist`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `checklist_boss_checklist` ON `checklist_boss` (`checklist_id`);--> statement-breakpoint
ALTER TABLE `checklist` ADD `notes` text;