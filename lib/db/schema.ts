import {
  pgTable, text, integer, real, boolean,
  timestamp, date, primaryKey, serial, index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { AdapterAccount } from "@auth/core/adapters";

// ── Auth.js required tables ──────────────────────────────────────────────────

export const users = pgTable("users", {
  id:            text("id").notNull().primaryKey().default(sql`gen_random_uuid()`),
  name:          text("name"),
  email:         text("email").notNull(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image:         text("image"),
  password:      text("password"),
});

export const accounts = pgTable("accounts", {
  userId:            text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type:              text("type").$type<AdapterAccount["type"]>().notNull(),
  provider:          text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  refresh_token:     text("refresh_token"),
  access_token:      text("access_token"),
  expires_at:        integer("expires_at"),
  token_type:        text("token_type"),
  scope:             text("scope"),
  id_token:          text("id_token"),
  session_state:     text("session_state"),
}, (t) => ({
  pk: primaryKey({ columns: [t.provider, t.providerAccountId] }),
}));

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").notNull().primaryKey(),
  userId:       text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires:      timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable("verification_tokens", {
  identifier: text("identifier").notNull(),
  token:      text("token").notNull(),
  expires:    timestamp("expires", { mode: "date" }).notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.identifier, t.token] }),
}));

// ── App tables ───────────────────────────────────────────────────────────────

export const userSettings = pgTable("user_settings", {
  userId:            text("user_id").notNull().primaryKey().references(() => users.id, { onDelete: "cascade" }),
  defaultSavingsPct: integer("default_savings_pct").notNull().default(20),
  defaultWantsPct:   integer("default_wants_pct").notNull().default(10),
  defaultBillsPct:   integer("default_bills_pct").notNull().default(70),
});

export const months = pgTable("months", {
  id:             serial("id").primaryKey(),
  userId:         text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  year:           integer("year").notNull(),
  month:          integer("month").notNull(),
  income:         real("income").notNull().default(0),
  openingBalance: real("opening_balance").notNull().default(0),
  savingsPct:     integer("savings_pct").notNull().default(20),
  wantsPct:       integer("wants_pct").notNull().default(10),
  billsPct:       integer("bills_pct").notNull().default(70),
}, (t) => ({
  uniq: uniqueIndex("months_user_year_month_idx").on(t.userId, t.year, t.month),
}));

export const tags = pgTable("tags", {
  id:            serial("id").primaryKey(),
  userId:        text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name:          text("name").notNull(),
  emoji:         text("emoji"),  // nullable — null = render auto lucide icon from name
  color:         text("color").notNull().default("#a78bfa"),
  defaultBucket: text("default_bucket").$type<"savings" | "bills" | "wants">().notNull().default("wants"),
});

export const trips = pgTable("trips", {
  id:              serial("id").primaryKey(),
  userId:          text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name:            text("name").notNull(),
  destination:     text("destination").notNull(),
  startDate:       date("start_date").notNull(),
  endDate:         date("end_date"),   // nullable — ongoing trips have no end date
  budgetUsd:       real("budget_usd"),   // nullable — plan-as-you-go trips have no budget
  primaryCurrency: text("primary_currency").notNull().default("USD"),
});

export const expenses = pgTable("expenses", {
  id:            serial("id").primaryKey(),
  userId:        text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  monthId:       integer("month_id").notNull().references(() => months.id, { onDelete: "cascade" }),
  amount:        real("amount").notNull(),
  currency:      text("currency").notNull().default("USD"),
  amountUsd:     real("amount_usd").notNull(),
  exchangeRate:  real("exchange_rate").notNull().default(1),
  description:   text("description").notNull(),
  date:          date("date").notNull(),
  paymentMethod:   text("payment_method").$type<"cash" | "debit" | "credit_card">().notNull(),
  paymentMethodId: integer("payment_method_id").references(() => creditCards.id, { onDelete: "set null" }),
  bucket:          text("bucket").$type<"savings" | "bills" | "wants">().notNull(),
  tagId:         integer("tag_id").references(() => tags.id, { onDelete: "set null" }),
  tripId:        integer("trip_id").references(() => trips.id, { onDelete: "set null" }),
  createdAt:     timestamp("created_at").notNull().defaultNow(),
});

// NEW: credit cards owned by user
export const creditCards = pgTable("credit_cards", {
  id:     serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name:   text("name").notNull(),
  type:   text("type").$type<"credit" | "debit" | "ath_movil">().notNull().default("credit"),
  dueDay: integer("due_day"),   // nullable — only required for credit cards
});

export const bills = pgTable("bills", {
  id:                 serial("id").primaryKey(),
  userId:             text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name:               text("name").notNull(),
  amount:             real("amount").notNull(),
  dueDay:             integer("due_day").notNull().default(1),
  frequency:          text("frequency").$type<"monthly" | "yearly" | "quarterly">().notNull().default("monthly"),
  renewalMonth:       integer("renewal_month"),   // 1–12, yearly only
  renewalDay:         integer("renewal_day"),     // 1–31, yearly only
  quarterlyDates:     text("quarterly_dates"),    // JSON: [{month,day},{month,day},{month,day},{month,day}]
  description:        text("description"),
  type:               text("type").$type<"utility" | "subscription" | "credit_card" | "loan" | "other">().notNull(),
  creditCardId:       integer("credit_card_id").references(() => creditCards.id, { onDelete: "set null" }),
  reminderDaysBefore: integer("reminder_days_before").notNull().default(3),
  active:             boolean("active").notNull().default(true),
});

// NEW: recurring income templates
export const incomeSources = pgTable("income_sources", {
  id:        serial("id").primaryKey(),
  userId:    text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name:      text("name").notNull(),
  amount:    real("amount").notNull(),
  frequency: text("frequency").$type<"biweekly" | "monthly" | "one_time">().notNull(),
  active:    boolean("active").notNull().default(true),
});

// NEW: per-month income occurrences
export const incomeEntries = pgTable("income_entries", {
  id:           serial("id").primaryKey(),
  userId:       text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sourceId:     integer("source_id").references(() => incomeSources.id, { onDelete: "set null" }),
  monthId:      integer("month_id").notNull().references(() => months.id, { onDelete: "cascade" }),
  name:         text("name").notNull(),
  amount:       real("amount").notNull(),
  status:       text("status").$type<"expected" | "might_arrive" | "arrived">().notNull().default("expected"),
  expectedDate: date("expected_date").notNull(),
  arrivedDate:  date("arrived_date"),
});

// NEW: savings allocation destinations
export const savingsAllocations = pgTable("savings_allocations", {
  id:         serial("id").primaryKey(),
  userId:     text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name:       text("name").notNull(),
  percentage: integer("percentage").notNull(),
  sortOrder:  integer("sort_order").notNull().default(0),
});
