ALTER TABLE `todo_item` ADD `created_by` text REFERENCES user(id) ON DELETE set null;--> statement-breakpoint
ALTER TABLE `todo_item` ADD `done_by` text REFERENCES user(id) ON DELETE set null;--> statement-breakpoint
ALTER TABLE `todo_list` ADD `visibility` text DEFAULT 'private' NOT NULL;