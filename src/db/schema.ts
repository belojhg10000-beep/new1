import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export type Department = { name: string; specialties: string[] };

export const settings = pgTable("settings", {
  id: integer("id").primaryKey().default(1),
  competitionName: text("competition_name").notNull(),
  description: text("description").notNull(),
  eventDate: timestamp("event_date", { withTimezone: true }).notNull(),
  registrationStart: timestamp("registration_start", { withTimezone: true }).notNull(),
  registrationEnd: timestamp("registration_end", { withTimezone: true }).notNull(),
  conditions: text("conditions").notNull(),
  maxTeamSize: integer("max_team_size").notNull().default(4),
  departments: jsonb("departments").$type<Department[]>().notNull(),
  registrationOpen: boolean("registration_open").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const admins = pgTable(
  "admins",
  {
    id: serial("id").primaryKey(),
    username: text("username").notNull(),
    displayName: text("display_name").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: text("role").$type<"ADMIN" | "SUPERVISOR">().notNull().default("SUPERVISOR"),
    permissions: jsonb("permissions").$type<string[]>().notNull().default([]),
    active: boolean("active").notNull().default(true),
    sessionVersion: integer("session_version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("admins_username_uq").on(sql`lower(${t.username})`)],
);

export const registrations = pgTable(
  "registrations",
  {
    id: serial("id").primaryKey(),
    regNumber: text("reg_number").notNull(),
    qrToken: text("qr_token").notNull(),
    fullNameAr: text("full_name_ar").notNull(),
    fullNameLat: text("full_name_lat").notNull(),
    birthDate: text("birth_date"),
    faculty: text("faculty").notNull(),
    department: text("department").notNull(),
    specialty: text("specialty").notNull(),
    level: text("level").notNull(),
    phone: text("phone").notNull(),
    phoneNorm: text("phone_norm").notNull(),
    email: text("email").notNull(),
    mode: text("mode").$type<"individual" | "team">().notNull(),
    teamName: text("team_name"),
    teamSize: integer("team_size").notNull().default(1),
    teamMembers: jsonb("team_members").$type<string[]>().notNull().default([]),
    projectName: text("project_name").notNull(),
    projectDescription: text("project_description").notNull(),
    problem: text("problem").notNull(),
    technologies: text("technologies").notNull(),
    status: text("status").notNull().default("new"),
    checkedIn: boolean("checked_in").notNull().default(false),
    checkedInAt: timestamp("checked_in_at", { withTimezone: true }),
    checkedInBy: text("checked_in_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("reg_number_uq").on(t.regNumber),
    uniqueIndex("reg_qr_uq").on(t.qrToken),
    uniqueIndex("reg_email_uq").on(sql`lower(${t.email})`),
    uniqueIndex("reg_phone_uq").on(t.phoneNorm),
    index("reg_status_idx").on(t.status),
    index("reg_created_idx").on(t.createdAt),
  ],
);

export const emailLogs = pgTable(
  "email_logs",
  {
    id: serial("id").primaryKey(),
    registrationId: integer("registration_id"),
    toEmail: text("to_email").notNull(),
    toName: text("to_name"),
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    template: text("template").notNull().default("custom"),
    includeCard: boolean("include_card").notNull().default(false),
    status: text("status").$type<"pending" | "sent" | "failed">().notNull().default("pending"),
    error: text("error"),
    attempts: integer("attempts").notNull().default(0),
    sentBy: text("sent_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
  },
  (t) => [index("email_status_idx").on(t.status), index("email_created_idx").on(t.createdAt)],
);

export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull().defaultNow(),
  blockedUntil: timestamp("blocked_until", { withTimezone: true }),
});
