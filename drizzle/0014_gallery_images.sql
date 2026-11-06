CREATE TABLE `gallery_image` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uploaded_by` text NOT NULL,
	`checklist_id` integer,
	`caption` text,
	`taken_on` text NOT NULL,
	`file` text NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`uploaded_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`checklist_id`) REFERENCES `checklist`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `gallery_image_file_unique` ON `gallery_image` (`file`);--> statement-breakpoint
CREATE INDEX `gallery_image_checklist` ON `gallery_image` (`checklist_id`);--> statement-breakpoint
CREATE INDEX `gallery_image_taken_on` ON `gallery_image` (`taken_on`);