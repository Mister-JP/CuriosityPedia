ALTER TABLE `research_requests` ADD `lease_token` text;--> statement-breakpoint
ALTER TABLE `research_requests` ADD `lease_expires_at` integer;--> statement-breakpoint
UPDATE `research_requests`
SET `status` = 'failed',
    `error_code` = 'LEASE_EXPIRED',
    `error_message` = 'This foreground research lease expired during the fencing migration.',
    `completed_at` = CAST(unixepoch() * 1000 AS INTEGER)
WHERE `status` IN ('reserved', 'researching');--> statement-breakpoint
CREATE INDEX `research_requests_identity_status_lease_idx` ON `research_requests` (`identity_id`,`status`,`lease_expires_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `research_requests_identity_active_unique` ON `research_requests` (`identity_id`) WHERE "research_requests"."status" IN ('reserved', 'researching');
