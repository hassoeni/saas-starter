-- Migration: User-based subscriptions and hybrid pricing model
-- This migration adds subscription fields to users table and updates teams for seat-based billing

-- Add subscription fields to users table (only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='stripe_customer_id') THEN
        ALTER TABLE "users" ADD COLUMN "stripe_customer_id" text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='stripe_subscription_id') THEN
        ALTER TABLE "users" ADD COLUMN "stripe_subscription_id" text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='stripe_product_id') THEN
        ALTER TABLE "users" ADD COLUMN "stripe_product_id" text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='plan_type') THEN
        ALTER TABLE "users" ADD COLUMN "plan_type" varchar(50);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='subscription_status') THEN
        ALTER TABLE "users" ADD COLUMN "subscription_status" varchar(20);
    END IF;
END $$;

-- Add unique constraints for Stripe IDs on users (only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_stripe_customer_id_unique') THEN
        ALTER TABLE "users" ADD CONSTRAINT "users_stripe_customer_id_unique" UNIQUE("stripe_customer_id");
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_stripe_subscription_id_unique') THEN
        ALTER TABLE "users" ADD CONSTRAINT "users_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id");
    END IF;
END $$;

-- Update teams table for team/enterprise plans (only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='teams' AND column_name='plan_type') THEN
        ALTER TABLE "teams" ADD COLUMN "plan_type" varchar(50);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='teams' AND column_name='seat_count') THEN
        ALTER TABLE "teams" ADD COLUMN "seat_count" integer DEFAULT 1;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='teams' AND column_name='owner_id') THEN
        ALTER TABLE "teams" ADD COLUMN "owner_id" integer REFERENCES "users"("id");
    END IF;
END $$;

-- Copy existing plan_name to plan_type for teams (data migration)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='teams' AND column_name='plan_name') THEN
        UPDATE "teams" SET "plan_type" = "plan_name" WHERE "plan_name" IS NOT NULL AND "plan_type" IS NULL;
        ALTER TABLE "teams" DROP COLUMN "plan_name";
    END IF;
END $$;

-- Make teamId optional in token_usage (since it's now user-based)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='token_usage'
        AND column_name='team_id'
        AND is_nullable='NO'
    ) THEN
        ALTER TABLE "token_usage" ALTER COLUMN "team_id" DROP NOT NULL;
    END IF;
END $$;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS "idx_token_usage_user_date" ON "token_usage"("user_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_users_stripe_customer" ON "users"("stripe_customer_id") WHERE "stripe_customer_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_users_plan_type" ON "users"("plan_type") WHERE "plan_type" IS NOT NULL;
