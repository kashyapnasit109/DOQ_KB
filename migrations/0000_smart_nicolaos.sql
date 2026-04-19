CREATE TABLE `conversations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`question` text NOT NULL,
	`answer` text NOT NULL,
	`source_docs` text DEFAULT '[]' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `daily_reports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`document_id` integer NOT NULL,
	`site_id` integer NOT NULL,
	`report_date` text NOT NULL,
	`reported_by` text,
	`structured_data` text NOT NULL,
	`raw_extraction` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`page_count` integer DEFAULT 0 NOT NULL,
	`extracted_text` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'processing' NOT NULL,
	`error_message` text,
	`uploaded_at` text NOT NULL,
	`site_id` integer,
	`report_date` text,
	`file_type` text DEFAULT 'pdf',
	`uploaded_by` text
);
--> statement-breakpoint
CREATE TABLE `equipment_usage` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`report_id` integer NOT NULL,
	`equipment` text NOT NULL,
	`working_hours` real,
	`diesel_used` text,
	`remarks` text
);
--> statement-breakpoint
CREATE TABLE `labour_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`report_id` integer NOT NULL,
	`category` text NOT NULL,
	`work_description` text,
	`location` text,
	`mistri_count` integer DEFAULT 0,
	`helper_count` integer DEFAULT 0,
	`total_labour` integer DEFAULT 0,
	`remarks` text
);
--> statement-breakpoint
CREATE TABLE `material_usage` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`report_id` integer NOT NULL,
	`material` text NOT NULL,
	`quantity_used` real,
	`unit` text,
	`balance` real,
	`remarks` text
);
--> statement-breakpoint
CREATE TABLE `payment_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`report_id` integer NOT NULL,
	`category` text NOT NULL,
	`description` text,
	`person` text,
	`amount` real,
	`payment_date` text,
	`remarks` text
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `settings_key_unique` ON `settings` (`key`);--> statement-breakpoint
CREATE TABLE `sites` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`location` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sites_code_unique` ON `sites` (`code`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`display_name` text NOT NULL,
	`role` text DEFAULT 'engineer' NOT NULL,
	`pin` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);