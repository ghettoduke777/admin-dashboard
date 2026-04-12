CREATE TABLE `accountRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requesterId` int NOT NULL,
	`requestedUsername` varchar(255) NOT NULL,
	`requestedEmail` varchar(320) NOT NULL,
	`identityVerified` boolean NOT NULL DEFAULT false,
	`adminApproved` boolean NOT NULL DEFAULT false,
	`approvedBy` int,
	`status` enum('pending','identity_verification','awaiting_approval','approved','denied') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `accountRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `accountUpdateRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`fieldName` varchar(255) NOT NULL,
	`oldValue` text,
	`newValue` text NOT NULL,
	`mfaVerified` boolean NOT NULL DEFAULT false,
	`status` enum('pending','mfa_required','approved','denied') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `accountUpdateRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `adminApprovals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`adminId` int NOT NULL,
	`requestType` enum('account_creation','account_update','ticket_escalation','security_remediation') NOT NULL,
	`requestId` int NOT NULL,
	`status` enum('pending','approved','denied') NOT NULL DEFAULT 'pending',
	`approvedAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `adminApprovals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `auditLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentAction` varchar(255) NOT NULL,
	`toolName` varchar(255),
	`toolInput` json,
	`toolOutput` json,
	`reasoning` text,
	`ticketId` int,
	`userId` int,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `emailNotifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recipientEmail` varchar(320) NOT NULL,
	`recipientId` int,
	`eventType` enum('ticket_created','ticket_updated','ticket_escalated','ticket_resolved','account_creation_requested','account_creation_approved','account_creation_denied','account_update_requested','account_update_approved','account_update_denied') NOT NULL,
	`ticketId` int,
	`accountRequestId` int,
	`content` text NOT NULL,
	`sentAt` timestamp,
	`status` enum('pending','sent','failed') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `emailNotifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `knowledgeBase` (
	`id` int AUTO_INCREMENT NOT NULL,
	`category` varchar(255) NOT NULL,
	`question` text NOT NULL,
	`answer` text NOT NULL,
	`resolution` text,
	`sourceTicketId` int,
	`embedding` text,
	`usageCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `knowledgeBase_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `securityIssues` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`issueType` enum('malware','phishing','network_breach','unauthorized_access','data_leak','other') NOT NULL,
	`description` text NOT NULL,
	`diagnosticData` json,
	`hypotheses` json,
	`resolution` text,
	`status` enum('reported','investigating','resolved','escalated') NOT NULL DEFAULT 'reported',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `securityIssues_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ticketMessages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ticketId` int NOT NULL,
	`senderId` int NOT NULL,
	`senderRole` enum('user','agent','system') NOT NULL,
	`content` text NOT NULL,
	`messageType` enum('text','action','reasoning','tool_call','resolution') NOT NULL DEFAULT 'text',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ticketMessages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tickets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`category` enum('account','network','security','software','hardware','other') NOT NULL,
	`priority` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
	`status` enum('open','in_progress','resolved','escalated','closed') NOT NULL DEFAULT 'open',
	`assignedTo` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`resolvedAt` timestamp,
	CONSTRAINT `tickets_id` PRIMARY KEY(`id`)
);
