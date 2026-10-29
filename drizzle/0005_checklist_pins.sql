CREATE TABLE `checklist_pin` (
	`checklist_id` integer NOT NULL,
	`user_id` text NOT NULL,
	PRIMARY KEY(`checklist_id`, `user_id`),
	FOREIGN KEY (`checklist_id`) REFERENCES `checklist`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
