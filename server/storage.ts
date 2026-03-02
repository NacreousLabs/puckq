import { eq } from "drizzle-orm";
import { db } from "./db";
import {
  teams, players, transactions,
  type Team, type InsertTeam,
  type Player, type InsertPlayer,
  type Transaction, type InsertTransaction,
} from "@shared/schema";

export interface IStorage {
  getTeams(): Promise<Team[]>;
  getTeam(id: number): Promise<Team | undefined>;
  createTeam(team: InsertTeam): Promise<Team>;
  updateTeam(id: number, team: Partial<InsertTeam>): Promise<Team | undefined>;
  deleteTeam(id: number): Promise<boolean>;

  getPlayers(): Promise<Player[]>;
  getPlayersByTeam(teamId: number): Promise<Player[]>;
  getPlayer(id: number): Promise<Player | undefined>;
  createPlayer(player: InsertPlayer): Promise<Player>;
  updatePlayer(id: number, player: Partial<InsertPlayer>): Promise<Player | undefined>;
  deletePlayer(id: number): Promise<boolean>;

  getTransactions(): Promise<Transaction[]>;
  createTransaction(tx: InsertTransaction): Promise<Transaction>;
  deleteTransaction(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getTeams(): Promise<Team[]> {
    return db.select().from(teams);
  }

  async getTeam(id: number): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.id, id));
    return team;
  }

  async createTeam(team: InsertTeam): Promise<Team> {
    const [created] = await db.insert(teams).values(team).returning();
    return created;
  }

  async updateTeam(id: number, data: Partial<InsertTeam>): Promise<Team | undefined> {
    const [updated] = await db.update(teams).set(data).where(eq(teams.id, id)).returning();
    return updated;
  }

  async deleteTeam(id: number): Promise<boolean> {
    const result = await db.delete(teams).where(eq(teams.id, id)).returning();
    return result.length > 0;
  }

  async getPlayers(): Promise<Player[]> {
    return db.select().from(players);
  }

  async getPlayersByTeam(teamId: number): Promise<Player[]> {
    return db.select().from(players).where(eq(players.teamId, teamId));
  }

  async getPlayer(id: number): Promise<Player | undefined> {
    const [player] = await db.select().from(players).where(eq(players.id, id));
    return player;
  }

  async createPlayer(player: InsertPlayer): Promise<Player> {
    const [created] = await db.insert(players).values(player).returning();
    return created;
  }

  async updatePlayer(id: number, data: Partial<InsertPlayer>): Promise<Player | undefined> {
    const [updated] = await db.update(players).set(data).where(eq(players.id, id)).returning();
    return updated;
  }

  async deletePlayer(id: number): Promise<boolean> {
    const result = await db.delete(players).where(eq(players.id, id)).returning();
    return result.length > 0;
  }

  async getTransactions(): Promise<Transaction[]> {
    return db.select().from(transactions);
  }

  async createTransaction(tx: InsertTransaction): Promise<Transaction> {
    const [created] = await db.insert(transactions).values(tx).returning();
    return created;
  }

  async deleteTransaction(id: number): Promise<boolean> {
    const result = await db.delete(transactions).where(eq(transactions.id, id)).returning();
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();
