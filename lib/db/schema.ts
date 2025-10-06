import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: varchar('role', { length: 20 }).notNull().default('member'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
  // User-based subscription fields
  stripeCustomerId: text('stripe_customer_id').unique(),
  stripeSubscriptionId: text('stripe_subscription_id').unique(),
  stripeProductId: text('stripe_product_id'),
  planType: varchar('plan_type', { length: 50 }), // 'pay_as_you_go', 'pro_unlimited', 'team', 'enterprise'
  subscriptionStatus: varchar('subscription_status', { length: 20 }),
});

export const teams = pgTable('teams', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  // Team subscription fields (for team/enterprise plans)
  stripeCustomerId: text('stripe_customer_id').unique(),
  stripeSubscriptionId: text('stripe_subscription_id').unique(),
  stripeProductId: text('stripe_product_id'),
  planType: varchar('plan_type', { length: 50 }), // 'team', 'enterprise'
  subscriptionStatus: varchar('subscription_status', { length: 20 }),
  seatCount: integer('seat_count').default(1), // Number of seats for team plan
  ownerId: integer('owner_id').references(() => users.id), // Who owns/pays for the team
});

export const teamMembers = pgTable('team_members', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
  role: varchar('role', { length: 50 }).notNull(),
  joinedAt: timestamp('joined_at').notNull().defaultNow(),
});

export const activityLogs = pgTable('activity_logs', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
  userId: integer('user_id').references(() => users.id),
  action: text('action').notNull(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  ipAddress: varchar('ip_address', { length: 45 }),
});

export const invitations = pgTable('invitations', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
  email: varchar('email', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull(),
  invitedBy: integer('invited_by')
    .notNull()
    .references(() => users.id),
  invitedAt: timestamp('invited_at').notNull().defaultNow(),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
});

export const tokenUsage = pgTable('token_usage', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  teamId: integer('team_id')
    .references(() => teams.id), // Optional: for team context
  tokens: integer('tokens').notNull(),
  action: varchar('action', { length: 100 }).notNull(),
  stripeMeterEventId: text('stripe_meter_event_id'),
  metadata: text('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const stripeEvents = pgTable('stripe_events', {
  id: serial('id').primaryKey(),
  eventId: varchar('event_id', { length: 255 }).notNull().unique(),
  eventType: varchar('event_type', { length: 100 }).notNull(),
  processed: timestamp('processed'),
  payload: text('payload').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const webhookEventQueue = pgTable('webhook_event_queue', {
  id: serial('id').primaryKey(),
  eventId: varchar('event_id', { length: 255 }).notNull(),
  eventType: varchar('event_type', { length: 100 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, processing, completed, failed
  retryCount: integer('retry_count').notNull().default(0),
  nextRetryAt: timestamp('next_retry_at'),
  error: text('error'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const subscriptionItems = pgTable('subscription_items', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
  stripeSubscriptionId: text('stripe_subscription_id').notNull(),
  stripeSubscriptionItemId: text('stripe_subscription_item_id').notNull().unique(),
  stripeProductId: text('stripe_product_id').notNull(),
  stripePriceId: text('stripe_price_id').notNull(),
  quantity: integer('quantity'),
  isMetered: varchar('is_metered', { length: 10 }).notNull().default('false'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const usageAlerts = pgTable('usage_alerts', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
  alertType: varchar('alert_type', { length: 20 }).notNull(), // 'info_50', 'warning_80', 'urgent_95', 'blocked_100'
  usagePercentage: integer('usage_percentage').notNull(),
  tokensUsed: integer('tokens_used').notNull(),
  tokensLimit: integer('tokens_limit').notNull(),
  notificationSent: timestamp('notification_sent'),
  emailSent: timestamp('email_sent'),
  acknowledged: timestamp('acknowledged'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const teamsRelations = relations(teams, ({ many }) => ({
  teamMembers: many(teamMembers),
  activityLogs: many(activityLogs),
  invitations: many(invitations),
  tokenUsage: many(tokenUsage),
  subscriptionItems: many(subscriptionItems),
  usageAlerts: many(usageAlerts),
}));

export const usersRelations = relations(users, ({ many }) => ({
  teamMembers: many(teamMembers),
  invitationsSent: many(invitations),
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
  team: one(teams, {
    fields: [invitations.teamId],
    references: [teams.id],
  }),
  invitedBy: one(users, {
    fields: [invitations.invitedBy],
    references: [users.id],
  }),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
  }),
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
  }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  team: one(teams, {
    fields: [activityLogs.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
}));

export const tokenUsageRelations = relations(tokenUsage, ({ one }) => ({
  team: one(teams, {
    fields: [tokenUsage.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [tokenUsage.userId],
    references: [users.id],
  }),
}));

export const subscriptionItemsRelations = relations(subscriptionItems, ({ one }) => ({
  team: one(teams, {
    fields: [subscriptionItems.teamId],
    references: [teams.id],
  }),
}));

export const usageAlertsRelations = relations(usageAlerts, ({ one }) => ({
  team: one(teams, {
    fields: [usageAlerts.teamId],
    references: [teams.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
export type TeamMember = typeof teamMembers.$inferSelect;
export type NewTeamMember = typeof teamMembers.$inferInsert;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type NewActivityLog = typeof activityLogs.$inferInsert;
export type Invitation = typeof invitations.$inferSelect;
export type NewInvitation = typeof invitations.$inferInsert;
export type TokenUsage = typeof tokenUsage.$inferSelect;
export type NewTokenUsage = typeof tokenUsage.$inferInsert;
export type StripeEvent = typeof stripeEvents.$inferSelect;
export type NewStripeEvent = typeof stripeEvents.$inferInsert;
export type WebhookEventQueue = typeof webhookEventQueue.$inferSelect;
export type NewWebhookEventQueue = typeof webhookEventQueue.$inferInsert;
export type SubscriptionItem = typeof subscriptionItems.$inferSelect;
export type NewSubscriptionItem = typeof subscriptionItems.$inferInsert;
export type UsageAlert = typeof usageAlerts.$inferSelect;
export type NewUsageAlert = typeof usageAlerts.$inferInsert;
export type TeamDataWithMembers = Team & {
  teamMembers: (TeamMember & {
    user: Pick<User, 'id' | 'name' | 'email'>;
  })[];
};

export enum ActivityType {
  SIGN_UP = 'SIGN_UP',
  SIGN_IN = 'SIGN_IN',
  SIGN_OUT = 'SIGN_OUT',
  UPDATE_PASSWORD = 'UPDATE_PASSWORD',
  DELETE_ACCOUNT = 'DELETE_ACCOUNT',
  UPDATE_ACCOUNT = 'UPDATE_ACCOUNT',
  CREATE_TEAM = 'CREATE_TEAM',
  REMOVE_TEAM_MEMBER = 'REMOVE_TEAM_MEMBER',
  INVITE_TEAM_MEMBER = 'INVITE_TEAM_MEMBER',
  ACCEPT_INVITATION = 'ACCEPT_INVITATION',
}
