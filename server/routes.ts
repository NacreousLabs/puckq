import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTeamSchema, insertPlayerSchema, insertTransactionSchema } from "@shared/schema";
import { ZodError } from "zod";

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

  // ── Seed (convenience endpoint to populate initial data) ─
  app.post("/api/seed", async (_req, res) => {
    const existingTeams = await storage.getTeams();
    if (existingTeams.length > 0) {
      return res.json({ message: "Data already seeded", seeded: false });
    }

    const seedTeams = [
      { name: "Toronto Maple Leafs", abbreviation: "TOR", logo: "🍁", capHit: 87500000, capSpace: 1000000, projectedCapSpace: 1200000, ltir: 4500000, contracts: 48, color: "#00205B" },
      { name: "Edmonton Oilers", abbreviation: "EDM", logo: "🛢️", capHit: 88000000, capSpace: 500000, projectedCapSpace: 850000, ltir: 2300000, contracts: 46, color: "#FF4C00" },
      { name: "Colorado Avalanche", abbreviation: "COL", logo: "🏔️", capHit: 85000000, capSpace: 3500000, projectedCapSpace: 4100000, ltir: 7000000, contracts: 49, color: "#6F263D" },
      { name: "Boston Bruins", abbreviation: "BOS", logo: "🐻", capHit: 86200000, capSpace: 2300000, projectedCapSpace: 2300000, ltir: 0, contracts: 45, color: "#FFB81C" },
    ];

    const createdTeams = [];
    for (const t of seedTeams) {
      createdTeams.push(await storage.createTeam(t));
    }

    const seedPlayers = [
      { name: "Auston Matthews", teamId: createdTeams[0].id, position: "C", age: 26, capHit: 13250000, capPercentage: "15.1", contractLength: 4, expiryYear: 2028, draftYear: 2016, draftRound: 1, draftOverall: 1, status: "Signed" },
      { name: "Connor McDavid", teamId: createdTeams[1].id, position: "C", age: 27, capHit: 12500000, capPercentage: "14.2", contractLength: 8, expiryYear: 2026, draftYear: 2015, draftRound: 1, draftOverall: 1, status: "Signed" },
      { name: "Nathan MacKinnon", teamId: createdTeams[2].id, position: "C", age: 28, capHit: 12600000, capPercentage: "14.3", contractLength: 8, expiryYear: 2031, draftYear: 2013, draftRound: 1, draftOverall: 1, status: "Signed" },
      { name: "David Pastrnak", teamId: createdTeams[3].id, position: "RW", age: 27, capHit: 11250000, capPercentage: "12.8", contractLength: 8, expiryYear: 2031, draftYear: 2014, draftRound: 1, draftOverall: 25, status: "Signed" },
      { name: "William Nylander", teamId: createdTeams[0].id, position: "RW", age: 27, capHit: 11500000, capPercentage: "13.1", contractLength: 8, expiryYear: 2032, draftYear: 2014, draftRound: 1, draftOverall: 8, status: "Signed" },
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
