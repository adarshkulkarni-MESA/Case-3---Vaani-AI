-- Aangan Studio — Initial Schema Migration

CREATE TYPE "user_role" AS ENUM ('designer', 'founder', 'admin');
CREATE TYPE "lead_status" AS ENUM ('qualified', 'rejected', 'pending_review');
CREATE TYPE "call_outcome" AS ENUM (
  'qualified',
  'rejected_out_of_area',
  'rejected_out_of_scope',
  'rejected_timeline',
  'rejected_budget',
  'rejected_no_decision_maker',
  'escalated',
  'missed',
  'pending_review'
);
CREATE TYPE "meeting_status" AS ENUM (
  'not_scheduled',
  'booking_sent',
  'confirmed',
  'completed',
  'cancelled'
);
CREATE TYPE "email_status" AS ENUM ('pending', 'sent', 'failed');
CREATE TYPE "hubspot_sync_status" AS ENUM ('pending', 'synced', 'failed', 'skipped');

CREATE TABLE "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "email" text NOT NULL UNIQUE,
  "password_hash" text NOT NULL,
  "role" user_role NOT NULL DEFAULT 'designer',
  "avatar_url" text,
  "calcom_username" text,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE "customers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text,
  "phone" varchar(20),
  "email" text,
  "location" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX "customers_phone_idx" ON "customers" ("phone");

CREATE TABLE "calls" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "vaani_call_id" text UNIQUE,
  "customer_id" uuid REFERENCES "customers"("id"),
  "caller_phone" varchar(20),
  "caller_name" text,
  "call_timestamp" timestamp NOT NULL,
  "duration_seconds" integer,
  "project_location" text,
  "project_type" text,
  "property_type" text,
  "square_feet" integer,
  "project_scope" text,
  "timeline" text,
  "is_decision_maker" boolean,
  "decision_maker_note" text,
  "budget_mentioned" text,
  "asked_about_price" boolean NOT NULL DEFAULT false,
  "outcome" call_outcome NOT NULL DEFAULT 'pending_review',
  "lead_status" lead_status NOT NULL DEFAULT 'pending_review',
  "qualification_notes" text,
  "rejection_reason" text,
  "ai_summary" text,
  "handoff_note" text,
  "ai_cost_usd" decimal(8,4),
  "qualification_criteria" jsonb,
  "assigned_designer_id" uuid REFERENCES "users"("id"),
  "is_escalated" boolean NOT NULL DEFAULT false,
  "escalation_note" text,
  "is_missed" boolean NOT NULL DEFAULT false,
  "reviewed_by_front_desk" boolean NOT NULL DEFAULT false,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX "calls_lead_status_idx" ON "calls" ("lead_status");
CREATE INDEX "calls_call_timestamp_idx" ON "calls" ("call_timestamp");
CREATE INDEX "calls_customer_id_idx" ON "calls" ("customer_id");

CREATE TABLE "transcripts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "call_id" uuid NOT NULL REFERENCES "calls"("id") ON DELETE CASCADE,
  "full_text" text,
  "segments" jsonb,
  "recording_url" text,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE "meetings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "call_id" uuid NOT NULL REFERENCES "calls"("id") ON DELETE CASCADE,
  "designer_id" uuid REFERENCES "users"("id"),
  "calcom_booking_id" text,
  "calcom_booking_uid" text,
  "scheduled_at" timestamp,
  "meeting_status" meeting_status NOT NULL DEFAULT 'not_scheduled',
  "booking_link" text,
  "notes" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE "email_notifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "call_id" uuid REFERENCES "calls"("id"),
  "designer_id" uuid REFERENCES "users"("id"),
  "to_email" text NOT NULL,
  "subject" text NOT NULL,
  "resend_message_id" text,
  "status" email_status NOT NULL DEFAULT 'pending',
  "error_message" text,
  "sent_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE "hubspot_sync" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "call_id" uuid NOT NULL REFERENCES "calls"("id"),
  "customer_id" uuid REFERENCES "customers"("id"),
  "hubspot_contact_id" text,
  "hubspot_deal_id" text,
  "sync_status" hubspot_sync_status NOT NULL DEFAULT 'pending',
  "synced_at" timestamp,
  "error_message" text,
  "retry_count" integer NOT NULL DEFAULT 0,
  "payload" jsonb,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE "audit_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "entity_type" text NOT NULL,
  "entity_id" uuid NOT NULL,
  "action" text NOT NULL,
  "actor_id" uuid REFERENCES "users"("id"),
  "actor_type" text NOT NULL DEFAULT 'system',
  "changes" jsonb,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE "webhook_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "event_id" text NOT NULL UNIQUE,
  "source" text NOT NULL,
  "event_type" text NOT NULL,
  "processed_at" timestamp NOT NULL DEFAULT now(),
  "payload" jsonb
);
