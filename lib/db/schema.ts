import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  boolean,
  jsonb,
  pgEnum,
  varchar,
  decimal,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums
export const userRoleEnum = pgEnum("user_role", ["designer", "founder", "admin"]);
export const leadStatusEnum = pgEnum("lead_status", ["qualified", "rejected", "pending_review"]);
export const callOutcomeEnum = pgEnum("call_outcome", [
  "qualified",
  "rejected_out_of_area",
  "rejected_out_of_scope",
  "rejected_timeline",
  "rejected_budget",
  "rejected_no_decision_maker",
  "escalated",
  "missed",
  "pending_review",
]);
export const meetingStatusEnum = pgEnum("meeting_status", [
  "not_scheduled",
  "booking_sent",
  "confirmed",
  "completed",
  "cancelled",
]);
export const emailStatusEnum = pgEnum("email_status", ["pending", "sent", "failed"]);
export const hubspotSyncStatusEnum = pgEnum("hubspot_sync_status", [
  "pending",
  "synced",
  "failed",
  "skipped",
]);

// Users table
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull().default("designer"),
  avatarUrl: text("avatar_url"),
  calcomUsername: text("calcom_username"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Customers table
export const customers = pgTable(
  "customers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name"),
    phone: varchar("phone", { length: 20 }),
    email: text("email"),
    location: text("location"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("customers_phone_idx").on(t.phone)]
);

// Calls table — core entity
export const calls = pgTable(
  "calls",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    vaaniCallId: text("vaani_call_id").unique(),
    customerId: uuid("customer_id").references(() => customers.id),
    // Call metadata
    callerPhone: varchar("caller_phone", { length: 20 }),
    callerName: text("caller_name"),
    callTimestamp: timestamp("call_timestamp").notNull(),
    durationSeconds: integer("duration_seconds"),
    // Captured info
    projectLocation: text("project_location"),
    projectType: text("project_type"), // residential/commercial
    propertyType: text("property_type"), // 2BHK/3BHK/villa/office etc
    squareFeet: integer("square_feet"),
    projectScope: text("project_scope"), // what rooms/areas
    timeline: text("timeline"),
    isDecisionMaker: boolean("is_decision_maker"),
    decisionMakerNote: text("decision_maker_note"),
    budgetMentioned: text("budget_mentioned"),
    askedAboutPrice: boolean("asked_about_price").notNull().default(false),
    // Qualification
    outcome: callOutcomeEnum("outcome").notNull().default("pending_review"),
    leadStatus: leadStatusEnum("lead_status").notNull().default("pending_review"),
    qualificationNotes: text("qualification_notes"),
    rejectionReason: text("rejection_reason"),
    // AI processing
    aiSummary: text("ai_summary"),
    handoffNote: text("handoff_note"),
    aiCostUsd: decimal("ai_cost_usd", { precision: 8, scale: 4 }),
    qualificationCriteria: jsonb("qualification_criteria"), // {real_project, in_area, timeline, budget, decision_maker}
    // Assignment
    assignedDesignerId: uuid("assigned_designer_id").references(() => users.id),
    // Flags
    isEscalated: boolean("is_escalated").notNull().default(false),
    escalationNote: text("escalation_note"),
    isMissed: boolean("is_missed").notNull().default(false),
    reviewedByFrontDesk: boolean("reviewed_by_front_desk").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("calls_lead_status_idx").on(t.leadStatus),
    index("calls_call_timestamp_idx").on(t.callTimestamp),
    index("calls_customer_id_idx").on(t.customerId),
  ]
);

// Transcripts table
export const transcripts = pgTable("transcripts", {
  id: uuid("id").defaultRandom().primaryKey(),
  callId: uuid("call_id")
    .notNull()
    .references(() => calls.id, { onDelete: "cascade" }),
  fullText: text("full_text"),
  segments: jsonb("segments"), // [{speaker, text, startMs, endMs}]
  recordingUrl: text("recording_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Meeting bookings
export const meetings = pgTable("meetings", {
  id: uuid("id").defaultRandom().primaryKey(),
  callId: uuid("call_id")
    .notNull()
    .references(() => calls.id, { onDelete: "cascade" }),
  designerId: uuid("designer_id").references(() => users.id),
  calcomBookingId: text("calcom_booking_id"),
  calcomBookingUid: text("calcom_booking_uid"),
  scheduledAt: timestamp("scheduled_at"),
  meetingStatus: meetingStatusEnum("meeting_status").notNull().default("not_scheduled"),
  bookingLink: text("booking_link"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Email notifications
export const emailNotifications = pgTable("email_notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  callId: uuid("call_id").references(() => calls.id),
  designerId: uuid("designer_id").references(() => users.id),
  toEmail: text("to_email").notNull(),
  subject: text("subject").notNull(),
  resendMessageId: text("resend_message_id"),
  status: emailStatusEnum("status").notNull().default("pending"),
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// HubSpot sync records
export const hubspotSync = pgTable("hubspot_sync", {
  id: uuid("id").defaultRandom().primaryKey(),
  callId: uuid("call_id")
    .notNull()
    .references(() => calls.id),
  customerId: uuid("customer_id").references(() => customers.id),
  hubspotContactId: text("hubspot_contact_id"),
  hubspotDealId: text("hubspot_deal_id"),
  syncStatus: hubspotSyncStatusEnum("sync_status").notNull().default("pending"),
  syncedAt: timestamp("synced_at"),
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").notNull().default(0),
  payload: jsonb("payload"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Audit log
export const auditLog = pgTable("audit_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  entityType: text("entity_type").notNull(), // call, customer, meeting, etc
  entityId: uuid("entity_id").notNull(),
  action: text("action").notNull(),
  actorId: uuid("actor_id").references(() => users.id),
  actorType: text("actor_type").notNull().default("system"), // system, user
  changes: jsonb("changes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Webhook idempotency
export const webhookEvents = pgTable("webhook_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: text("event_id").notNull().unique(),
  source: text("source").notNull(), // vaani, calcom
  eventType: text("event_type").notNull(),
  processedAt: timestamp("processed_at").notNull().defaultNow(),
  payload: jsonb("payload"),
});

// Relations
export const callsRelations = relations(calls, ({ one, many }) => ({
  customer: one(customers, { fields: [calls.customerId], references: [customers.id] }),
  assignedDesigner: one(users, { fields: [calls.assignedDesignerId], references: [users.id] }),
  transcript: one(transcripts, { fields: [calls.id], references: [transcripts.callId] }),
  meeting: one(meetings, { fields: [calls.id], references: [meetings.callId] }),
  emailNotifications: many(emailNotifications),
  hubspotSync: one(hubspotSync, { fields: [calls.id], references: [hubspotSync.callId] }),
}));

export const customersRelations = relations(customers, ({ many }) => ({
  calls: many(calls),
}));

export const usersRelations = relations(users, ({ many }) => ({
  assignedCalls: many(calls),
  emailNotifications: many(emailNotifications),
  meetings: many(meetings),
}));

export const transcriptsRelations = relations(transcripts, ({ one }) => ({
  call: one(calls, { fields: [transcripts.callId], references: [calls.id] }),
}));

export const meetingsRelations = relations(meetings, ({ one }) => ({
  call: one(calls, { fields: [meetings.callId], references: [calls.id] }),
  designer: one(users, { fields: [meetings.designerId], references: [users.id] }),
}));

export type User = typeof users.$inferSelect;
export type Call = typeof calls.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type Transcript = typeof transcripts.$inferSelect;
export type Meeting = typeof meetings.$inferSelect;
export type EmailNotification = typeof emailNotifications.$inferSelect;
export type HubspotSync = typeof hubspotSync.$inferSelect;
