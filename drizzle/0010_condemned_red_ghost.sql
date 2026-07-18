CREATE TABLE `provider_cost_reservations` (
	`id` text PRIMARY KEY NOT NULL,
	`call_key` text NOT NULL,
	`identity_id` text NOT NULL,
	`research_request_id` text,
	`journey_id` text,
	`turn_id` text,
	`provider` text DEFAULT 'openai' NOT NULL,
	`model_id` text NOT NULL,
	`operation` text NOT NULL,
	`status` text DEFAULT 'reserved' NOT NULL,
	`reserved_microusd` integer NOT NULL,
	`settled_microusd` integer,
	`price_effective_at` text NOT NULL,
	`envelope_json` text NOT NULL,
	`provider_request_id` text,
	`window_started_at` integer NOT NULL,
	`settled_at` integer,
	`released_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`identity_id`) REFERENCES `identities`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`research_request_id`) REFERENCES `research_requests`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`journey_id`) REFERENCES `journeys`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`turn_id`) REFERENCES `turns`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `provider_cost_reservations_call_key_unique` ON `provider_cost_reservations` (`call_key`);--> statement-breakpoint
CREATE INDEX `provider_cost_reservations_window_idx` ON `provider_cost_reservations` (`window_started_at`,`status`);--> statement-breakpoint
CREATE INDEX `provider_cost_reservations_identity_window_idx` ON `provider_cost_reservations` (`identity_id`,`window_started_at`,`status`);--> statement-breakpoint
CREATE INDEX `provider_cost_reservations_request_idx` ON `provider_cost_reservations` (`research_request_id`);