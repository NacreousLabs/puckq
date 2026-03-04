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
    players: (id: number) => apiRequest<Player[]>(`/api/teams/${id}/players`),
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
