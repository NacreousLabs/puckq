/**
 * NHL API client
 * Wraps the public NHL web API at https://api-web.nhle.com/v1/
 * Salary data is not provided by the NHL API; cap/contract data is managed
 * locally in the database.
 */

const BASE = "https://api-web.nhle.com/v1";
const STATS_BASE = "https://api.nhle.com/stats/rest/en";

async function nhlfetch<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`NHL API error ${res.status} for ${url}`);
  }
  return res.json() as Promise<T>;
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface NhlStandingEntry {
  teamAbbrev: { default: string };
  teamName: { default: string };
  teamLogo: string;
  conferenceAbbrev: string;
  divisionAbbrev: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  otLosses: number;
  points: number;
  pointPctg: number;
  goalFor: number;
  goalAgainst: number;
  homeWins: number;
  homeLosses: number;
  homeOtLosses: number;
  roadWins: number;
  roadLosses: number;
  roadOtLosses: number;
  streakCode: string;
  streakCount: number;
  wildCardSequence: number;
}

export interface NhlStandingsResponse {
  standings: NhlStandingEntry[];
}

export interface NhlRosterPlayer {
  id: number;
  headshot: string;
  firstName: { default: string };
  lastName: { default: string };
  sweaterNumber: number;
  positionCode: string;
  shootsCatches: string;
  heightInInches: number;
  weightInPounds: number;
  birthDate: string;
  birthCity: { default: string };
  birthStateProvince?: { default: string };
  birthCountry: string;
}

export interface NhlRosterResponse {
  forwards: NhlRosterPlayer[];
  defensemen: NhlRosterPlayer[];
  goalies: NhlRosterPlayer[];
}

export interface NhlGameTeam {
  id: number;
  abbrev: string;
  logo: string;
  score?: number;
}

export interface NhlGame {
  id: number;
  season: number;
  gameType: number;
  venue: { default: string };
  startTimeUTC: string;
  gameState: "FUT" | "PRE" | "LIVE" | "CRIT" | "FINAL" | "OFF";
  gameScheduleState: string;
  homeTeam: NhlGameTeam;
  awayTeam: NhlGameTeam;
  periodDescriptor?: { number: number; periodType: string };
  clock?: { timeRemaining: string; inIntermission: boolean };
}

export interface NhlScheduleDay {
  date: string;
  numberOfGames: number;
  games: NhlGame[];
}

export interface NhlScheduleResponse {
  gameWeek: NhlScheduleDay[];
  previousSeg?: unknown;
  nextSeg?: unknown;
}

export interface NhlScoreResponse {
  prevDate: string;
  currentDate: string;
  nextDate: string;
  games: NhlGame[];
}

export interface NhlTeamStat {
  teamId: number;
  teamFullName: string;
  teamAbbrevs: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  ties: number;
  otWins: number;
  otLosses: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalsForPerGame: number;
  goalsAgainstPerGame: number;
  powerPlayPct: number;
  penaltyKillPct: number;
}

// ── API functions ─────────────────────────────────────────────────────────────

/**
 * Current NHL standings.
 */
export async function fetchStandings(): Promise<NhlStandingEntry[]> {
  const data = await nhlfetch<NhlStandingsResponse>(`${BASE}/standings/now`);
  return data.standings;
}

/**
 * Current roster for a team.
 * @param teamAbbrev  e.g. "TOR", "EDM", "BOS"
 */
export async function fetchRoster(teamAbbrev: string): Promise<NhlRosterResponse> {
  return nhlfetch<NhlRosterResponse>(`${BASE}/roster/${teamAbbrev}/current`);
}

/**
 * Schedule for a given date (defaults to today).
 * @param date  "YYYY-MM-DD" – omit for today
 */
export async function fetchSchedule(date?: string): Promise<NhlScheduleResponse> {
  const url = date ? `${BASE}/schedule/${date}` : `${BASE}/schedule/now`;
  return nhlfetch<NhlScheduleResponse>(url);
}

/**
 * Live scores for a given date (defaults to today).
 * @param date  "YYYY-MM-DD" – omit for today
 */
export async function fetchScores(date?: string): Promise<NhlScoreResponse> {
  const url = date ? `${BASE}/score/${date}` : `${BASE}/score/now`;
  return nhlfetch<NhlScoreResponse>(url);
}

/**
 * Full season schedule for a specific team.
 * @param teamAbbrev  e.g. "TOR"
 * @param season      e.g. "20242025" – omit for current season
 */
export async function fetchTeamSchedule(
  teamAbbrev: string,
  season = "20242025"
): Promise<NhlGame[]> {
  const data = await nhlfetch<{ games: NhlGame[] }>(
    `${BASE}/club-schedule-season/${teamAbbrev}/${season}`
  );
  return data.games ?? [];
}

/**
 * Current week's games for a specific team.
 * @param teamAbbrev  e.g. "TOR"
 */
export async function fetchTeamWeekSchedule(teamAbbrev: string): Promise<NhlGame[]> {
  const data = await nhlfetch<{ games: NhlGame[] }>(
    `${BASE}/club-schedule/${teamAbbrev}/week/now`
  );
  return data.games ?? [];
}

/**
 * Team-level stats for the current season from the stats API.
 */
export async function fetchTeamStats(): Promise<NhlTeamStat[]> {
  const data = await nhlfetch<{ data: NhlTeamStat[] }>(
    `${STATS_BASE}/team/summary?cayenneExp=seasonId=20242025%20and%20gameTypeId=2`
  );
  return data.data ?? [];
}
