import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTeamSchema, insertPlayerSchema, insertTransactionSchema } from "@shared/schema";
import { ZodError } from "zod";
import {
  fetchStandings,
  fetchRoster,
  fetchSchedule,
  fetchScores,
  fetchTeamSchedule,
  fetchTeamWeekSchedule,
  fetchTeamStats,
  type NhlGame,
} from "./nhl-api";

function handleZodError(error: unknown) {
  if (error instanceof ZodError) {
    return { status: 400, body: { message: "Validation error", errors: error.errors } };
  }
  throw error;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ── Teams ──────────────────────────────────────────────
  app.get("/api/teams", async (_req, res) => {
    const teams = await storage.getTeams();
    res.json(teams);
  });

  app.get("/api/teams/:id", async (req, res) => {
    const team = await storage.getTeam(Number(req.params.id));
    if (!team) return res.status(404).json({ message: "Team not found" });
    res.json(team);
  });

  app.post("/api/teams", async (req, res) => {
    try {
      const data = insertTeamSchema.parse(req.body);
      const team = await storage.createTeam(data);
      res.status(201).json(team);
    } catch (error) {
      const zodErr = handleZodError(error);
      res.status(zodErr.status).json(zodErr.body);
    }
  });

  app.patch("/api/teams/:id", async (req, res) => {
    try {
      const data = insertTeamSchema.partial().parse(req.body);
      const team = await storage.updateTeam(Number(req.params.id), data);
      if (!team) return res.status(404).json({ message: "Team not found" });
      res.json(team);
    } catch (error) {
      const zodErr = handleZodError(error);
      res.status(zodErr.status).json(zodErr.body);
    }
  });

  app.delete("/api/teams/:id", async (req, res) => {
    const deleted = await storage.deleteTeam(Number(req.params.id));
    if (!deleted) return res.status(404).json({ message: "Team not found" });
    res.status(204).send();
  });

  app.get("/api/teams/:id/players", async (req, res) => {
    const team = await storage.getTeam(Number(req.params.id));
    if (!team) return res.status(404).json({ message: "Team not found" });
    const players = await storage.getPlayersByTeam(Number(req.params.id));
    res.json(players);
  });

  app.get("/api/teams/:id/transactions", async (req, res) => {
    const team = await storage.getTeam(Number(req.params.id));
    if (!team) return res.status(404).json({ message: "Team not found" });
    const txs = await storage.getTransactionsByTeam(team.abbreviation);
    res.json(txs);
  });

  // ── Players ────────────────────────────────────────────
  app.get("/api/players", async (_req, res) => {
    const players = await storage.getPlayers();
    res.json(players);
  });

  app.get("/api/players/:id", async (req, res) => {
    const player = await storage.getPlayer(Number(req.params.id));
    if (!player) return res.status(404).json({ message: "Player not found" });
    res.json(player);
  });

  app.post("/api/players", async (req, res) => {
    try {
      const data = insertPlayerSchema.parse(req.body);
      const player = await storage.createPlayer(data);
      res.status(201).json(player);
    } catch (error) {
      const zodErr = handleZodError(error);
      res.status(zodErr.status).json(zodErr.body);
    }
  });

  app.patch("/api/players/:id", async (req, res) => {
    try {
      const data = insertPlayerSchema.partial().parse(req.body);
      const player = await storage.updatePlayer(Number(req.params.id), data);
      if (!player) return res.status(404).json({ message: "Player not found" });
      res.json(player);
    } catch (error) {
      const zodErr = handleZodError(error);
      res.status(zodErr.status).json(zodErr.body);
    }
  });

  app.delete("/api/players/:id", async (req, res) => {
    const deleted = await storage.deletePlayer(Number(req.params.id));
    if (!deleted) return res.status(404).json({ message: "Player not found" });
    res.status(204).send();
  });

  // ── Transactions ───────────────────────────────────────
  app.get("/api/transactions", async (_req, res) => {
    const txs = await storage.getTransactions();
    res.json(txs);
  });

  app.post("/api/transactions", async (req, res) => {
    try {
      const data = insertTransactionSchema.parse(req.body);
      const tx = await storage.createTransaction(data);
      res.status(201).json(tx);
    } catch (error) {
      const zodErr = handleZodError(error);
      res.status(zodErr.status).json(zodErr.body);
    }
  });

  app.delete("/api/transactions/:id", async (req, res) => {
    const deleted = await storage.deleteTransaction(Number(req.params.id));
    if (!deleted) return res.status(404).json({ message: "Transaction not found" });
    res.status(204).send();
  });

  // ── Games (stored) ─────────────────────────────────────
  app.get("/api/games", async (req, res) => {
    const limit = Number(req.query.limit) || 50;
    const date = req.query.date as string | undefined;
    const games = date
      ? await storage.getGamesByDate(date)
      : await storage.getGames(limit);
    res.json(games);
  });

  app.get("/api/games/:id", async (req, res) => {
    const game = await storage.getGame(Number(req.params.id));
    if (!game) return res.status(404).json({ message: "Game not found" });
    res.json(game);
  });

  app.get("/api/teams/:id/games", async (req, res) => {
    const team = await storage.getTeam(Number(req.params.id));
    if (!team) return res.status(404).json({ message: "Team not found" });
    const limit = Number(req.query.limit) || 20;
    const games = await storage.getGamesByTeam(team.abbreviation, limit);
    res.json(games);
  });

  // ── NHL Live API (proxy + sync) ────────────────────────

  /** Current standings from NHL API */
  app.get("/api/nhl/standings", async (_req, res) => {
    try {
      const standings = await fetchStandings();
      res.json(standings);
    } catch (err: any) {
      res.status(502).json({ message: err.message });
    }
  });

  /** Current roster for a team from NHL API */
  app.get("/api/nhl/roster/:abbr", async (req, res) => {
    try {
      const roster = await fetchRoster(req.params.abbr.toUpperCase());
      res.json(roster);
    } catch (err: any) {
      res.status(502).json({ message: err.message });
    }
  });

  /** Schedule for a date (YYYY-MM-DD) or today */
  app.get("/api/nhl/schedule/:date", async (req, res) => {
    try {
      const schedule = await fetchSchedule(req.params.date);
      res.json(schedule);
    } catch (err: any) {
      res.status(502).json({ message: err.message });
    }
  });
  app.get("/api/nhl/schedule", async (req, res) => {
    try {
      const schedule = await fetchSchedule(undefined);
      res.json(schedule);
    } catch (err: any) {
      res.status(502).json({ message: err.message });
    }
  });

  /** Live scores for a date (YYYY-MM-DD) or today */
  app.get("/api/nhl/scores/:date", async (req, res) => {
    try {
      const scores = await fetchScores(req.params.date);
      res.json(scores);
    } catch (err: any) {
      res.status(502).json({ message: err.message });
    }
  });
  app.get("/api/nhl/scores", async (req, res) => {
    try {
      const scores = await fetchScores(undefined);
      res.json(scores);
    } catch (err: any) {
      res.status(502).json({ message: err.message });
    }
  });

  /** Full season schedule for a team */
  app.get("/api/nhl/team-schedule/:abbr", async (req, res) => {
    try {
      const season = (req.query.season as string) || "20242025";
      const games = await fetchTeamSchedule(req.params.abbr.toUpperCase(), season);
      res.json(games);
    } catch (err: any) {
      res.status(502).json({ message: err.message });
    }
  });

  /** Current week's games for a team */
  app.get("/api/nhl/team-schedule/:abbr/week", async (req, res) => {
    try {
      const games = await fetchTeamWeekSchedule(req.params.abbr.toUpperCase());
      res.json(games);
    } catch (err: any) {
      res.status(502).json({ message: err.message });
    }
  });

  /** Team-level stats for the current season */
  app.get("/api/nhl/team-stats", async (_req, res) => {
    try {
      const stats = await fetchTeamStats();
      res.json(stats);
    } catch (err: any) {
      res.status(502).json({ message: err.message });
    }
  });

  /** Sync roster for one team (by abbreviation) into the local players table */
  app.post("/api/nhl/sync/roster/:abbr", async (req, res) => {
    try {
      const abbr = req.params.abbr.toUpperCase();
      const team = await storage.getTeamByAbbr(abbr);
      if (!team) return res.status(404).json({ message: `Team ${abbr} not found in database` });

      const nhlRoster = await fetchRoster(abbr);
      const allNhlPlayers = [...nhlRoster.forwards, ...nhlRoster.defensemen, ...nhlRoster.goalies];

      const positionMap: Record<string, string> = { C: "C", L: "LW", R: "RW", D: "D", G: "G" };
      const currentYear = new Date().getFullYear();

      const toInsert = allNhlPlayers.map((p) => ({
        name: `${p.firstName.default} ${p.lastName.default}`,
        teamId: team.id,
        position: positionMap[p.positionCode] ?? p.positionCode,
        age: p.birthDate ? currentYear - new Date(p.birthDate).getFullYear() : 25,
        capHit: 0,
        capPercentage: "0",
        contractLength: 1,
        expiryYear: currentYear + 1,
        status: "Active",
      }));

      const inserted = await storage.upsertPlayersByTeam(team.id, toInsert);
      res.json({ synced: inserted.length, total: toInsert.length, team: abbr });
    } catch (err: any) {
      res.status(502).json({ message: err.message });
    }
  });

  /** Sync rosters for all teams in the local database */
  app.post("/api/nhl/sync/all-rosters", async (_req, res) => {
    try {
      const allTeams = await storage.getTeams();
      const results: { team: string; synced: number; total: number }[] = [];

      for (const team of allTeams) {
        try {
          const nhlRoster = await fetchRoster(team.abbreviation);
          const allNhlPlayers = [...nhlRoster.forwards, ...nhlRoster.defensemen, ...nhlRoster.goalies];
          const positionMap: Record<string, string> = { C: "C", L: "LW", R: "RW", D: "D", G: "G" };
          const currentYear = new Date().getFullYear();

          const toInsert = allNhlPlayers.map((p) => ({
            name: `${p.firstName.default} ${p.lastName.default}`,
            teamId: team.id,
            position: positionMap[p.positionCode] ?? p.positionCode,
            age: p.birthDate ? currentYear - new Date(p.birthDate).getFullYear() : 25,
            capHit: 0,
            capPercentage: "0",
            contractLength: 1,
            expiryYear: currentYear + 1,
            status: "Active",
          }));

          const inserted = await storage.upsertPlayersByTeam(team.id, toInsert);
          results.push({ team: team.abbreviation, synced: inserted.length, total: toInsert.length });
        } catch {
          results.push({ team: team.abbreviation, synced: 0, total: 0 });
        }
      }

      res.json({ results, totalSynced: results.reduce((s, r) => s + r.synced, 0) });
    } catch (err: any) {
      res.status(502).json({ message: err.message });
    }
  });

  /**
   * Sync games from the NHL API into the local database.
   * Query params:
   *   date  – "YYYY-MM-DD" (defaults to today)
   *   abbr  – team abbreviation to sync a team's weekly schedule instead
   */
  app.post("/api/nhl/sync/games", async (req, res) => {
    try {
      let nhlGames: NhlGame[];

      if (req.body?.abbr) {
        nhlGames = await fetchTeamWeekSchedule((req.body.abbr as string).toUpperCase());
      } else {
        const scores = await fetchScores(req.body?.date as string | undefined);
        nhlGames = scores.games;
      }

      const toInsert = nhlGames.map((g) => ({
        nhlGameId: g.id,
        date: g.startTimeUTC ? g.startTimeUTC.slice(0, 10) : req.body?.date ?? new Date().toISOString().slice(0, 10),
        startTimeUtc: g.startTimeUTC ?? null,
        homeTeamAbbr: g.homeTeam.abbrev,
        awayTeamAbbr: g.awayTeam.abbrev,
        homeScore: g.homeTeam.score ?? null,
        awayScore: g.awayTeam.score ?? null,
        status: g.gameState,
        venue: g.venue?.default ?? null,
        season: String(g.season),
        periodNumber: g.periodDescriptor?.number ?? null,
        periodType: g.periodDescriptor?.periodType ?? null,
        isFinal: g.gameState === "OFF" || g.gameState === "FINAL",
      }));

      const saved = await storage.upsertGames(toInsert);
      res.json({ synced: saved.length, games: saved });
    } catch (err: any) {
      res.status(502).json({ message: err.message });
    }
  });

  // ── Seed (convenience endpoint to populate initial data) ─
  app.post("/api/seed", async (_req, res) => {
    const existingTeams = await storage.getTeams();
    if (existingTeams.length > 0) {
      return res.json({ message: "Data already seeded", seeded: false });
    }

    const nhlLogo = (abbr: string) => `https://assets.nhle.com/logos/nhl/svg/${abbr}_light.svg`;

    const seedTeams = [
      { name: "Anaheim Ducks", abbreviation: "ANA", logo: nhlLogo("ANA"), capHit: 69800000, capSpace: 18200000, projectedCapSpace: 19500000, ltir: 0, contracts: 44, color: "#F47A38" },
      { name: "Arizona Coyotes", abbreviation: "ARI", logo: nhlLogo("ARI"), capHit: 66500000, capSpace: 21500000, projectedCapSpace: 22000000, ltir: 0, contracts: 40, color: "#8C2633" },
      { name: "Boston Bruins", abbreviation: "BOS", logo: nhlLogo("BOS"), capHit: 86200000, capSpace: 1800000, projectedCapSpace: 2300000, ltir: 0, contracts: 45, color: "#FFB81C" },
      { name: "Buffalo Sabres", abbreviation: "BUF", logo: nhlLogo("BUF"), capHit: 78500000, capSpace: 9500000, projectedCapSpace: 10200000, ltir: 0, contracts: 43, color: "#002654" },
      { name: "Calgary Flames", abbreviation: "CGY", logo: nhlLogo("CGY"), capHit: 79200000, capSpace: 8800000, projectedCapSpace: 9100000, ltir: 0, contracts: 46, color: "#D2001C" },
      { name: "Carolina Hurricanes", abbreviation: "CAR", logo: nhlLogo("CAR"), capHit: 85800000, capSpace: 2200000, projectedCapSpace: 2800000, ltir: 3200000, contracts: 48, color: "#CC0000" },
      { name: "Chicago Blackhawks", abbreviation: "CHI", logo: nhlLogo("CHI"), capHit: 64200000, capSpace: 23800000, projectedCapSpace: 25000000, ltir: 0, contracts: 39, color: "#CF0A2C" },
      { name: "Colorado Avalanche", abbreviation: "COL", logo: nhlLogo("COL"), capHit: 85000000, capSpace: 3000000, projectedCapSpace: 4100000, ltir: 7000000, contracts: 49, color: "#6F263D" },
      { name: "Columbus Blue Jackets", abbreviation: "CBJ", logo: nhlLogo("CBJ"), capHit: 73400000, capSpace: 14600000, projectedCapSpace: 15200000, ltir: 5500000, contracts: 42, color: "#002654" },
      { name: "Dallas Stars", abbreviation: "DAL", logo: nhlLogo("DAL"), capHit: 86500000, capSpace: 1500000, projectedCapSpace: 1800000, ltir: 0, contracts: 47, color: "#006847" },
      { name: "Detroit Red Wings", abbreviation: "DET", logo: nhlLogo("DET"), capHit: 81300000, capSpace: 6700000, projectedCapSpace: 7400000, ltir: 0, contracts: 44, color: "#CE1126" },
      { name: "Edmonton Oilers", abbreviation: "EDM", logo: nhlLogo("EDM"), capHit: 88000000, capSpace: 0, projectedCapSpace: 850000, ltir: 2300000, contracts: 46, color: "#FF4C00" },
      { name: "Florida Panthers", abbreviation: "FLA", logo: nhlLogo("FLA"), capHit: 87200000, capSpace: 800000, projectedCapSpace: 1100000, ltir: 0, contracts: 48, color: "#041E42" },
      { name: "Los Angeles Kings", abbreviation: "LAK", logo: nhlLogo("LAK"), capHit: 84500000, capSpace: 3500000, projectedCapSpace: 4000000, ltir: 0, contracts: 46, color: "#111111" },
      { name: "Minnesota Wild", abbreviation: "MIN", logo: nhlLogo("MIN"), capHit: 83200000, capSpace: 4800000, projectedCapSpace: 5200000, ltir: 4200000, contracts: 45, color: "#154734" },
      { name: "Montreal Canadiens", abbreviation: "MTL", logo: nhlLogo("MTL"), capHit: 71800000, capSpace: 16200000, projectedCapSpace: 17000000, ltir: 0, contracts: 43, color: "#AF1E2D" },
      { name: "Nashville Predators", abbreviation: "NSH", logo: nhlLogo("NSH"), capHit: 84800000, capSpace: 3200000, projectedCapSpace: 3800000, ltir: 0, contracts: 46, color: "#FFB81C" },
      { name: "New Jersey Devils", abbreviation: "NJD", logo: nhlLogo("NJD"), capHit: 82500000, capSpace: 5500000, projectedCapSpace: 6200000, ltir: 0, contracts: 44, color: "#CE1126" },
      { name: "New York Islanders", abbreviation: "NYI", logo: nhlLogo("NYI"), capHit: 85500000, capSpace: 2500000, projectedCapSpace: 3000000, ltir: 0, contracts: 47, color: "#00539B" },
      { name: "New York Rangers", abbreviation: "NYR", logo: nhlLogo("NYR"), capHit: 86800000, capSpace: 1200000, projectedCapSpace: 1500000, ltir: 0, contracts: 47, color: "#0038A8" },
      { name: "Ottawa Senators", abbreviation: "OTT", logo: nhlLogo("OTT"), capHit: 80100000, capSpace: 7900000, projectedCapSpace: 8500000, ltir: 0, contracts: 44, color: "#C52032" },
      { name: "Philadelphia Flyers", abbreviation: "PHI", logo: nhlLogo("PHI"), capHit: 76500000, capSpace: 11500000, projectedCapSpace: 12000000, ltir: 0, contracts: 43, color: "#F74902" },
      { name: "Pittsburgh Penguins", abbreviation: "PIT", logo: nhlLogo("PIT"), capHit: 85400000, capSpace: 2600000, projectedCapSpace: 3100000, ltir: 0, contracts: 46, color: "#FCB514" },
      { name: "San Jose Sharks", abbreviation: "SJS", logo: nhlLogo("SJS"), capHit: 63500000, capSpace: 24500000, projectedCapSpace: 26000000, ltir: 0, contracts: 38, color: "#006D75" },
      { name: "Seattle Kraken", abbreviation: "SEA", logo: nhlLogo("SEA"), capHit: 79800000, capSpace: 8200000, projectedCapSpace: 8800000, ltir: 0, contracts: 45, color: "#99D9D9" },
      { name: "St. Louis Blues", abbreviation: "STL", logo: nhlLogo("STL"), capHit: 82800000, capSpace: 5200000, projectedCapSpace: 5800000, ltir: 0, contracts: 44, color: "#002F87" },
      { name: "Tampa Bay Lightning", abbreviation: "TBL", logo: nhlLogo("TBL"), capHit: 87800000, capSpace: 200000, projectedCapSpace: 500000, ltir: 3800000, contracts: 48, color: "#002868" },
      { name: "Toronto Maple Leafs", abbreviation: "TOR", logo: nhlLogo("TOR"), capHit: 87500000, capSpace: 500000, projectedCapSpace: 1200000, ltir: 4500000, contracts: 48, color: "#00205B" },
      { name: "Vancouver Canucks", abbreviation: "VAN", logo: nhlLogo("VAN"), capHit: 84000000, capSpace: 4000000, projectedCapSpace: 4500000, ltir: 0, contracts: 45, color: "#00205B" },
      { name: "Vegas Golden Knights", abbreviation: "VGK", logo: nhlLogo("VGK"), capHit: 87000000, capSpace: 1000000, projectedCapSpace: 1400000, ltir: 5200000, contracts: 47, color: "#B4975A" },
      { name: "Washington Capitals", abbreviation: "WSH", logo: nhlLogo("WSH"), capHit: 83500000, capSpace: 4500000, projectedCapSpace: 5000000, ltir: 0, contracts: 45, color: "#C8102E" },
      { name: "Winnipeg Jets", abbreviation: "WPG", logo: nhlLogo("WPG"), capHit: 81000000, capSpace: 7000000, projectedCapSpace: 7500000, ltir: 0, contracts: 44, color: "#041E42" },
    ];

    const createdTeams = [];
    for (const t of seedTeams) {
      createdTeams.push(await storage.createTeam(t));
    }

    const teamByAbbr = (abbr: string) => createdTeams.find(t => t.abbreviation === abbr)!.id;

    const seedPlayers = [
      { name: "Auston Matthews", teamId: teamByAbbr("TOR"), position: "C", age: 26, capHit: 13250000, capPercentage: "15.1", contractLength: 4, expiryYear: 2028, draftYear: 2016, draftRound: 1, draftOverall: 1, status: "Signed" },
      { name: "Connor McDavid", teamId: teamByAbbr("EDM"), position: "C", age: 27, capHit: 12500000, capPercentage: "14.2", contractLength: 8, expiryYear: 2026, draftYear: 2015, draftRound: 1, draftOverall: 1, status: "Signed" },
      { name: "Nathan MacKinnon", teamId: teamByAbbr("COL"), position: "C", age: 28, capHit: 12600000, capPercentage: "14.3", contractLength: 8, expiryYear: 2031, draftYear: 2013, draftRound: 1, draftOverall: 1, status: "Signed" },
      { name: "David Pastrnak", teamId: teamByAbbr("BOS"), position: "RW", age: 27, capHit: 11250000, capPercentage: "12.8", contractLength: 8, expiryYear: 2031, draftYear: 2014, draftRound: 1, draftOverall: 25, status: "Signed" },
      { name: "William Nylander", teamId: teamByAbbr("TOR"), position: "RW", age: 27, capHit: 11500000, capPercentage: "13.1", contractLength: 8, expiryYear: 2032, draftYear: 2014, draftRound: 1, draftOverall: 8, status: "Signed" },
    ];

    for (const p of seedPlayers) {
      await storage.createPlayer(p);
    }

    const seedTransactions = [
      { type: "Extension", player: "William Nylander", team: "TOR", details: "8 years, $92M ($11.5M AAV)", date: "2024-01-08" },
      { type: "Trade", player: "Elias Lindholm", team: "VAN -> BOS", details: "Acquired for 1st round pick, roster player", date: "2024-01-31" },
      { type: "Signing", player: "Corey Perry", team: "EDM", details: "1 year, $775k", date: "2024-01-22" },
      { type: "Waivers", player: "Ilya Samsonov", team: "TOR", details: "Cleared waivers, assigned to Marlies", date: "2024-01-01" },
    ];

    for (const tx of seedTransactions) {
      await storage.createTransaction(tx);
    }

    res.json({ message: "Data seeded successfully", seeded: true });
  });

  return httpServer;
}
