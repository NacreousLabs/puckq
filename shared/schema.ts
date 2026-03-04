import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, serial, numeric, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  abbreviation: varchar("abbreviation", { length: 5 }).notNull().unique(),
  logo: text("logo").notNull(),
  capHit: integer("cap_hit").notNull().default(0),
  capSpace: integer("cap_space").notNull().default(0),
  projectedCapSpace: integer("projected_cap_space").notNull().default(0),
  ltir: integer("ltir").notNull().default(0),
  contracts: integer("contracts").notNull().default(0),
  color: varchar("color", { length: 10 }).notNull().default("#000000"),
});

export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  teamId: integer("team_id").notNull(),
  position: varchar("position", { length: 5 }).notNull(),
  age: integer("age").notNull(),
  capHit: integer("cap_hit").notNull().default(0),
  capPercentage: numeric("cap_percentage", { precision: 5, scale: 1 }).notNull().default("0"),
  contractLength: integer("contract_length").notNull().default(1),
  expiryYear: integer("expiry_year").notNull(),
  draftYear: integer("draft_year"),
  draftRound: integer("draft_round"),
  draftOverall: integer("draft_overall"),
  status: varchar("status", { length: 20 }).notNull().default("Signed"),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  type: varchar("type", { length: 30 }).notNull(),
  player: text("player").notNull(),
  team: text("team").notNull(),
  details: text("details").notNull(),
  date: varchar("date", { length: 10 }).notNull(),
});

export const games = pgTable("games", {
  id: serial("id").primaryKey(),
  nhlGameId: integer("nhl_game_id").unique(),
  date: varchar("date", { length: 10 }).notNull(),
  startTimeUtc: text("start_time_utc"),
  homeTeamAbbr: varchar("home_team_abbr", { length: 5 }).notNull(),
  awayTeamAbbr: varchar("away_team_abbr", { length: 5 }).notNull(),
  homeScore: integer("home_score"),
  awayScore: integer("away_score"),
  status: varchar("status", { length: 10 }).notNull().default("FUT"), // FUT PRE LIVE FINAL OFF
  venue: text("venue"),
  season: varchar("season", { length: 8 }),
  periodNumber: integer("period_number"),
  periodType: varchar("period_type", { length: 5 }),
  isFinal: boolean("is_final").notNull().default(false),
});

export const insertTeamSchema = createInsertSchema(teams).omit({ id: true });
export const insertPlayerSchema = createInsertSchema(players).omit({ id: true });
export const insertTransactionSchema = createInsertSchema(transactions).omit({ id: true });
export const insertGameSchema = createInsertSchema(games).omit({ id: true });

export type Team = typeof teams.$inferSelect;
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type Player = typeof players.$inferSelect;
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Game = typeof games.$inferSelect;
export type InsertGame = z.infer<typeof insertGameSchema>;
