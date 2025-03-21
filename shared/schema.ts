import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  domain: text("domain").notNull(),
  logo_url: text("logo_url"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const profiles = pgTable("profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  jobTitle: text("job_title").notNull(),
  avatarUrl: text("avatar_url"),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  role: text("role").notNull().default("member"), // 'admin' or 'member'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const invitations = pgTable("invitations", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  email: text("email").notNull(),
  invitedBy: text("invited_by").notNull(),
  autoJoin: boolean("auto_join").default(false).notNull(),
  accepted: boolean("accepted").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").defaultNow().notNull(),
});

export const insertOrganizationSchema = createInsertSchema(organizations).pick({
  name: true,
  domain: true,
  logo_url: true,
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertProfileSchema = createInsertSchema(profiles).pick({
  firstName: true,
  lastName: true,
  email: true,
  jobTitle: true,
  avatarUrl: true,
  role: true,
  organizationId: true,
});

export const insertInvitationSchema = createInsertSchema(invitations).pick({
  email: true,
  organizationId: true,
  invitedBy: true,
  autoJoin: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Organization = typeof organizations.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type InsertInvitation = z.infer<typeof insertInvitationSchema>;
export type Invitation = typeof invitations.$inferSelect;