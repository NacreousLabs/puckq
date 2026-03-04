import { eq, like, or, desc } from "drizzle-orm";
import { db } from "./db";
import {
  teams, players, transactions, games,
  type Team, type InsertTeam,
  type Player, type InsertPlayer,
  type Transaction, type InsertTransaction,
  type Game, type InsertGame,
} from "@shared/schema";

export interface IStorage {
  getTeams(): Promise<Team[]>;
  getTeam(id: number): Promise<Team | undefined>;
  getTeamByAbbr(abbr: string): Promise<Team | undefined>;
  createTeam(team: InsertTeam): Promise<Team>;
  updateTeam(id: number, team: Partial<InsertTeam>): Promise<Team | undefined>;
  deleteTeam(id: number): Promise<boolean>;

  getPlayers(): Promise<Player[]>;
  getPlayersByTeam(teamId: number): Promise<Player[]>;
  getPlayer(id: number): Promise<Player | undefined>;
  createPlayer(player: InsertPlayer): Promise<Player>;
  updatePlayer(id: number, player: Partial<InsertPlayer>): Promise<Player | undefined>;
  deletePlayer(id: number): Promise<boolean>;
  upsertPlayersByTeam(teamId: number, newPlayers: InsertPlayer[]): Promise<Player[]>;

  getTransactions(): Promise<Transaction[]>;
  getTransactionsByTeam(abbr: string): Promise<Transaction[]>;
  createTransaction(tx: InsertTransaction): Promise<Transaction>;
  deleteTransaction(id: number): Promise<boolean>;

  getGames(limit?: number): Promise<Game[]>;
  getGame(id: number): Promise<Game | undefined>;
  getGamesByDate(date: string): Promise<Game[]>;
  getGamesByTeam(abbr: string, limit?: number): Promise<Game[]>;
  upsertGame(game: InsertGame): Promise<Game>;
  upsertGames(games: InsertGame[]): Promise<Game[]>;
}

export class DatabaseStorage implements IStorage {
  async getTeams(): Promise<Team[]> {
    return db.select().from(teams);
  }

  async getTeam(id: number): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.id, id));
    return team;
  }

  async getTeamByAbbr(abbr: string): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.abbreviation, abbr));
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

  async upsertPlayersByTeam(teamId: number, newPlayers: InsertPlayer[]): Promise<Player[]> {
    const existing = await this.getPlayersByTeam(teamId);
    const existingNames = new Set(existing.map((p) => p.name));
    const toInsert = newPlayers.filter((p) => !existingNames.has(p.name));
    if (toInsert.length === 0) return [];
    return db.insert(players).values(toInsert).returning();
  }

  async getTransactions(): Promise<Transaction[]> {
    return db.select().from(transactions);
  }

  async getTransactionsByTeam(abbr: string): Promise<Transaction[]> {
    return db.select().from(transactions).where(like(transactions.team, `%${abbr}%`));
  }

  async createTransaction(tx: InsertTransaction): Promise<Transaction> {
    const [created] = await db.insert(transactions).values(tx).returning();
    return created;
  }

  async deleteTransaction(id: number): Promise<boolean> {
    const result = await db.delete(transactions).where(eq(transactions.id, id)).returning();
    return result.length > 0;
  }

  async getGames(limit = 50): Promise<Game[]> {
    return db.select().from(games).orderBy(desc(games.date)).limit(limit);
  }

  async getGame(id: number): Promise<Game | undefined> {
    const [game] = await db.select().from(games).where(eq(games.id, id));
    return game;
  }

  async getGamesByDate(date: string): Promise<Game[]> {
    return db.select().from(games).where(eq(games.date, date));
  }

  async getGamesByTeam(abbr: string, limit = 20): Promise<Game[]> {
    return db
      .select()
      .from(games)
      .where(or(eq(games.homeTeamAbbr, abbr), eq(games.awayTeamAbbr, abbr)))
      .orderBy(desc(games.date))
      .limit(limit);
  }

  async upsertGame(game: InsertGame): Promise<Game> {
    if (game.nhlGameId) {
      const [row] = await db
        .insert(games)
        .values(game)
        .onConflictDoUpdate({ target: games.nhlGameId, set: game })
        .returning();
      return row;
    }
    const [row] = await db.insert(games).values(game).returning();
    return row;
  }

  async upsertGames(rows: InsertGame[]): Promise<Game[]> {
    return Promise.all(rows.map((g) => this.upsertGame(g)));
  }
}

export const storage = new DatabaseStorage();
