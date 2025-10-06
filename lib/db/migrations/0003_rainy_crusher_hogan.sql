CREATE TABLE "usage_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"alert_type" varchar(20) NOT NULL,
	"usage_percentage" integer NOT NULL,
	"tokens_used" integer NOT NULL,
	"tokens_limit" integer NOT NULL,
	"notification_sent" timestamp,
	"email_sent" timestamp,
	"acknowledged" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "usage_alerts" ADD CONSTRAINT "usage_alerts_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;