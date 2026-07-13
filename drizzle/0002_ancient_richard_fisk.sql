CREATE TABLE `research_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`identity_id` text NOT NULL,
	`kind` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`payload_hash` text NOT NULL,
	`request_json` text NOT NULL,
	`status` text DEFAULT 'reserved' NOT NULL,
	`provider_response_id` text,
	`result_journey_id` text,
	`result_turn_id` text,
	`error_code` text,
	`error_message` text,
	`input_tokens` integer DEFAULT 0 NOT NULL,
	`output_tokens` integer DEFAULT 0 NOT NULL,
	`reasoning_tokens` integer DEFAULT 0 NOT NULL,
	`total_tokens` integer DEFAULT 0 NOT NULL,
	`web_search_calls` integer DEFAULT 0 NOT NULL,
	`started_at` integer,
	`completed_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`identity_id`) REFERENCES `identities`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`result_journey_id`) REFERENCES `journeys`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`result_turn_id`) REFERENCES `turns`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `research_requests_identity_key_unique` ON `research_requests` (`identity_id`,`idempotency_key`);--> statement-breakpoint
CREATE INDEX `research_requests_identity_created_idx` ON `research_requests` (`identity_id`,`created_at`);--> statement-breakpoint
ALTER TABLE `research_runs` ADD `provider_response_id` text;--> statement-breakpoint
ALTER TABLE `research_runs` ADD `input_tokens` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `research_runs` ADD `output_tokens` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `research_runs` ADD `reasoning_tokens` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `research_runs` ADD `total_tokens` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `research_runs` ADD `web_search_calls` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `research_runs` ADD `latency_ms` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `research_runs` ADD `error_code` text;--> statement-breakpoint
ALTER TABLE `research_runs` ADD `error_message` text;