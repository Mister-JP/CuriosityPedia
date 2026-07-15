ALTER TABLE `journeys` ADD `output_locale` text DEFAULT 'en' NOT NULL;--> statement-breakpoint
ALTER TABLE `preferences` ADD `interface_locale` text DEFAULT 'en' NOT NULL;--> statement-breakpoint
ALTER TABLE `preferences` ADD `default_output_locale` text DEFAULT 'en' NOT NULL;--> statement-breakpoint
ALTER TABLE `turns` ADD `output_locale` text DEFAULT 'en' NOT NULL;