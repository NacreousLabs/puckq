import { queryClient } from "./queryClient";
import type { Team, Player, Transaction, InsertTeam, InsertPlayer, InsertTransaction } from "@shared/schema";

async function apiRequest<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(body.message || "Request failed");
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  teams: {
    list: () => apiRequest<Team[]>("/api/teams"),
    get: (id: number) => apiRequest<Team>(`/api/teams/${id}`),
    roster: (id: number) => apiRequest<Player[]>(`/api/teams/${id}/players`),
    teamTransactions: (id: number) => apiRequest<Transaction[]>(`/api/teams/${id}/transactions`),
    create: (data: InsertTeam) => apiRequest<Team>("/api/teams", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: Partial<InsertTeam>) => apiRequest<Team>(`/api/teams/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: number) => apiRequest<void>(`/api/teams/${id}`, { method: "DELETE" }),
  },
  players: {
    list: () => apiRequest<Player[]>("/api/players"),
    get: (id: number) => apiRequest<Player>(`/api/players/${id}`),
    create: (data: InsertPlayer) => apiRequest<Player>("/api/players", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: Partial<InsertPlayer>) => apiRequest<Player>(`/api/players/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: number) => apiRequest<void>(`/api/players/${id}`, { method: "DELETE" }),
  },
  transactions: {
    list: () => apiRequest<Transaction[]>("/api/transactions"),
    create: (data: InsertTransaction) => apiRequest<Transaction>("/api/transactions", { method: "POST", body: JSON.stringify(data) }),
    delete: (id: number) => apiRequest<void>(`/api/transactions/${id}`, { method: "DELETE" }),
  },
  seed: () => apiRequest<{ message: string; seeded: boolean }>("/api/seed", { method: "POST" }),
  nhl: {
    syncRoster: (abbr: string) =>
      apiRequest<{ synced: number; total: number; team: string }>(`/api/nhl/sync/roster/${abbr}`, { method: "POST" }),
    syncAllRosters: () =>
      apiRequest<{ results: { team: string; synced: number; total: number }[]; totalSynced: number }>("/api/nhl/sync/all-rosters", { method: "POST" }),
  },
  scrape: {
    teamContracts: (abbr: string) =>
      apiRequest<{ team: string; contractsScraped: number; contractsUpdated: number; summary: Record<string, unknown> }>(`/api/scrape/team-contracts/${abbr}`, { method: "POST" }),
    teamContractsMerged: (abbr: string) =>
      apiRequest<{ team: string; contractsScraped: number; contractsUpdated: number; summary: Record<string, unknown> }>(`/api/scrape/team-contracts-merged/${abbr}`, { method: "POST" }),
    allContracts: () =>
      apiRequest<{ results: { team: string; contractsScraped: number }[]; totalScraped: number }>("/api/scrape/all-contracts", { method: "POST" }),
    news: (source = "all", season?: string) =>
      apiRequest<{ scraped: number; stored: number; source: string }>("/api/scrape/news", { method: "POST", body: JSON.stringify({ source, season }) }),
  },
};

export function invalidateAll() {
  queryClient.invalidateQueries({ queryKey: ["teams"] });
  queryClient.invalidateQueries({ queryKey: ["players"] });
  queryClient.invalidateQueries({ queryKey: ["transactions"] });
}

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
};
