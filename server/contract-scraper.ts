/**
 * NHL Contract Scraper – multi-source edition
 *
 * Sources (priority order when merging):
 *   1. NHL API  – official per-player landing endpoint; no HTML scraping needed
 *   2. PuckPedia – primary HTML source; 1 request per team page
 *   3. Spotrac  – secondary HTML source; 1 request per team page
 *
 * Politeness / rate-limiting:
 *   - RateLimiter enforces a per-domain minimum gap between requests
 *   - Random jitter (0-500 ms) prevents thundering-herd patterns
 *   - Exponential backoff on HTTP 429 / 503 (respects Retry-After header)
 *   - ScrapeCache stores results for 1 hour so repeated calls skip live fetches
 */

import * as cheerio from "cheerio";

// ── Rate limiter ──────────────────────────────────────────────────────────────

const DOMAIN_MIN_GAP: Record<string, number> = {
  "puckpedia.com":    2_000,
  "www.spotrac.com":  3_000,
  "api-web.nhle.com":   300, // official API – lighter gap is fine
};
const DEFAULT_GAP_MS = 2_000;
const MAX_RETRIES     = 3;
const JITTER_MAX_MS   =   500;

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

class RateLimiter {
  private lastSent = new Map<string, number>();

  async acquire(domain: string): Promise<void> {
    const minGap = DOMAIN_MIN_GAP[domain] ?? DEFAULT_GAP_MS;
    const last   = this.lastSent.get(domain) ?? 0;
    const jitter = Math.floor(Math.random() * JITTER_MAX_MS);
    const wait   = Math.max(0, last + minGap + jitter - Date.now());
    if (wait > 0) await sleep(wait);
    this.lastSent.set(domain, Date.now());
  }
}

const rateLimiter = new RateLimiter(); // process-wide singleton

// ── Cache ─────────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 60 * 60 * 1_000; // 1 hour

class ScrapeCache {
  private store = new Map<string, { data: ScrapeResult; ts: number }>();

  get(key: string): ScrapeResult | null {
    const e = this.store.get(key);
    if (!e || Date.now() - e.ts > CACHE_TTL_MS) return null;
    return e.data;
  }

  set(key: string, data: ScrapeResult): void {
    this.store.set(key, { data, ts: Date.now() });
  }

  ageSeconds(key: string): number | null {
    const e = this.store.get(key);
    if (!e || Date.now() - e.ts > CACHE_TTL_MS) return null;
    return Math.floor((Date.now() - e.ts) / 1_000);
  }
}

const cache = new ScrapeCache(); // process-wide singleton

// ── Fetch helpers ─────────────────────────────────────────────────────────────

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
  "Cache-Control": "no-cache",
};

async function fetchHtml(url: string): Promise<string> {
  const domain = new URL(url).hostname;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    await rateLimiter.acquire(domain);
    const res = await fetch(url, { headers: BROWSER_HEADERS });
    if (res.status === 429 || res.status === 503) {
      const retryAfter = parseInt(res.headers.get("retry-after") ?? "0", 10);
      const backoff = retryAfter > 0
        ? retryAfter * 1_000
        : Math.min(Math.pow(2, attempt + 1) * 5_000, 64_000);
      console.warn(`[scraper] ${domain} rate-limited (${res.status}), waiting ${backoff}ms`);
      if (attempt < MAX_RETRIES) { await sleep(backoff); continue; }
      throw new Error(`${domain} still rate-limited after ${MAX_RETRIES} retries`);
    }
    if (!res.ok) throw new Error(`HTTP ${res.status} – ${url}`);
    return res.text();
  }
  throw new Error(`fetchHtml: exhausted retries for ${url}`);
}

async function fetchJson<T>(url: string): Promise<T> {
  const domain = new URL(url).hostname;
  await rateLimiter.acquire(domain);
  const res = await fetch(url, {
    headers: { Accept: "application/json", "Cache-Control": "no-cache" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} – ${url}`);
  return res.json() as Promise<T>;
}

// ── Public types ──────────────────────────────────────────────────────────────

export interface ScrapedContract {
  playerName: string;
  position: string;
  capHit: number;
  aav: number;
  totalValue: number;
  contractLength: number;
  signingYear: number;
  expiryYear: number;
  expiryStatus: string;   // "UFA", "RFA", "ARFA", "10NTC", …
  noTradeClause: boolean;
  source: string;
}

export interface TeamCapSummary {
  teamAbbr: string;
  capHit: number;
  capSpace: number;
  projectedCapSpace: number;
  ltir: number;
  activeContracts: number;
}

export interface ScrapeResult {
  contracts: ScrapedContract[];
  summary: Partial<TeamCapSummary>;
}

// ── Shared parsing helpers ────────────────────────────────────────────────────

const POSITION_MAP: Record<string, string> = {
  C: "C", LW: "LW", RW: "RW", W: "LW", F: "LW", D: "D", G: "G",
};

function normalizePos(raw: string): string {
  return POSITION_MAP[raw.toUpperCase()] ?? (raw.slice(0, 2).toUpperCase() || "F");
}

function parseDollars(raw: string): number {
  const t = raw.trim();
  if (!t) return 0;
  const m = t.match(/(\d+(?:\.\d+)?)\s*[Mm]/);
  if (m) return Math.round(parseFloat(m[1]) * 1_000_000);
  const k = t.match(/(\d+(?:\.\d+)?)\s*[Kk]/);
  if (k) return Math.round(parseFloat(k[1]) * 1_000);
  const n = parseInt(t.replace(/[^0-9]/g, ""), 10);
  return isNaN(n) ? 0 : n;
}

function parseYear(t: string): number | null {
  const m = t.match(/\b(20\d{2})\b/);
  return m ? parseInt(m[1], 10) : null;
}

const SKIP_ROW = /^(total|dead[\s-]cap|ltir|buried|cap[\s-]space|retained|buyout)/i;

/**
 * Generic table parser shared by all HTML sources.
 * Inspects <thead> to detect column positions dynamically.
 */
function parseContractTable(
  $: cheerio.CheerioAPI,
  table: ReturnType<cheerio.CheerioAPI>,
  source: string,
): ScrapedContract[] {
  const col: Record<string, number> = {};

  table.find("thead tr").first().find("th, td").each((i, th) => {
    const label = $(th).text().toLowerCase().replace(/\s+/g, " ").trim();
    if (/\bplayer\b|\bname\b/.test(label))               col.player      = i;
    else if (/\bpos(ition)?\b/.test(label))              col.pos         = i;
    else if (/cap\s*hit/.test(label))                    col.capHit      = i;
    else if (/\baav\b|\bavg\b|\baverage/.test(label))    col.aav         = i;
    else if (/total.*value|\btotal\b/.test(label) && !/contract/.test(label)) col.total = i;
    else if (/length|\bterm\b|\byrs\b|\byears\b/.test(label)) col.length = i;
    else if (/expiry.*year|\bexpiry\b|\bexpires\b/.test(label)) col.expiryYear  = i;
    else if (/type|\bstatus\b|\bufa\b|\brfa\b/.test(label)) col.expiryType = i;
    else if (/signing.*year/.test(label))                col.signingYear = i;
    else if (/ntc|nmc|clause/.test(label))               col.ntc         = i;
  });

  const get = (key: string, fallback: number) => col[key] ?? fallback;
  const contracts: ScrapedContract[] = [];

  table.find("tbody tr").each((_, row) => {
    const cells = $(row).find("td");
    if (cells.length < 3) return;

    const nameCell   = cells.eq(get("player", 0));
    const playerName = (nameCell.find("a").first().text() || nameCell.text()).trim();
    if (!playerName || SKIP_ROW.test(playerName)) return;

    const position = normalizePos(cells.eq(get("pos", 1)).text().trim());
    const capHit   = parseDollars(cells.eq(get("capHit", 2)).text());
    if (capHit === 0) return;

    const aavRaw       = col.aav       !== undefined ? parseDollars(cells.eq(col.aav).text())       : 0;
    const totalValue   = col.total     !== undefined ? parseDollars(cells.eq(col.total).text())     : 0;
    const contractLength = col.length  !== undefined ? (parseInt(cells.eq(col.length).text(), 10) || 1) : 1;
    const expiryYear   = col.expiryYear !== undefined
      ? (parseYear(cells.eq(col.expiryYear).text()) ?? new Date().getFullYear() + contractLength)
      : new Date().getFullYear() + contractLength;
    const expiryStatus = (col.expiryType !== undefined
      ? cells.eq(col.expiryType).text().trim()
      : "UFA").slice(0, 10) || "UFA";
    const signingYear  = col.signingYear !== undefined
      ? (parseYear(cells.eq(col.signingYear).text()) ?? expiryYear - contractLength)
      : expiryYear - contractLength;

    const rowText      = $(row).text();
    const noTradeClause =
      (col.ntc !== undefined && /yes|✓|ntc|nmc/i.test(cells.eq(col.ntc).text())) ||
      /NTC|NMC|no[\s-]trade|no[\s-]movement/i.test(rowText);

    contracts.push({
      playerName, position, capHit,
      aav: aavRaw || capHit,
      totalValue, contractLength, signingYear,
      expiryYear, expiryStatus, noTradeClause, source,
    });
  });

  return contracts;
}

/** Pick the best matching table from a page (largest with cap/player headers). */
function findContractTable($: cheerio.CheerioAPI): ReturnType<cheerio.CheerioAPI> {
  let table = $("table").filter((_, tbl) => {
    const h = $(tbl).find("thead").text().toLowerCase();
    return h.includes("cap") || h.includes("player") || h.includes("salary");
  }).first();
  if (!table.length) {
    table = $("table").filter((_, tbl) => $(tbl).find("tbody tr").length > 5).first();
  }
  return table;
}

// ── Source: PuckPedia ─────────────────────────────────────────────────────────

const PUCKPEDIA_SLUGS: Record<string, string> = {
  ANA: "ana", ARI: "ari", BOS: "bos", BUF: "buf", CGY: "cgy",
  CAR: "car", CHI: "chi", COL: "col", CBJ: "cbj", DAL: "dal",
  DET: "det", EDM: "edm", FLA: "fla", LAK: "lak", MIN: "min",
  MTL: "mtl", NSH: "nsh", NJD: "njd", NYI: "nyi", NYR: "nyr",
  OTT: "ott", PHI: "phi", PIT: "pit", SJS: "sjs", SEA: "sea",
  STL: "stl", TBL: "tbl", TOR: "tor", UTA: "uta", VAN: "van",
  VGK: "vgk", WSH: "wsh", WPG: "wpg",
};

async function fetchPuckPedia(abbr: string): Promise<ScrapeResult> {
  const slug = PUCKPEDIA_SLUGS[abbr];
  if (!slug) throw new Error(`No PuckPedia slug for ${abbr}`);

  const html = await fetchHtml(`https://puckpedia.com/${slug}`);
  const $    = cheerio.load(html);
  const summary: Partial<TeamCapSummary> = { teamAbbr: abbr };

  $("body *").each((_, el) => {
    const t = $(el).text().replace(/\s+/g, " ").trim();
    if (t.length > 300 || $(el).children().length > 3) return;
    const h = t.match(/cap\s+hit[:\s]+(\$[\d,]+|[\d.]+[MKmk])/i);
    const s = t.match(/cap\s+space[:\s]+(\$[\d,]+|[\d.]+[MKmk])/i);
    const l = t.match(/LTIR[:\s]+(\$[\d,]+|[\d.]+[MKmk])/i);
    if (h && !summary.capHit)   summary.capHit   = parseDollars(h[1]);
    if (s && !summary.capSpace) summary.capSpace  = parseDollars(s[1]);
    if (l && !summary.ltir)     summary.ltir      = parseDollars(l[1]);
  });

  const table     = findContractTable($);
  const contracts = table.length ? parseContractTable($, table, "puckpedia") : [];
  summary.activeContracts = contracts.length;
  return { contracts, summary };
}

// ── Source: Spotrac ───────────────────────────────────────────────────────────

const SPOTRAC_SLUGS: Record<string, string> = {
  ANA: "anaheim-ducks",      ARI: "arizona-coyotes",     BOS: "boston-bruins",
  BUF: "buffalo-sabres",     CGY: "calgary-flames",      CAR: "carolina-hurricanes",
  CHI: "chicago-blackhawks", COL: "colorado-avalanche",  CBJ: "columbus-blue-jackets",
  DAL: "dallas-stars",       DET: "detroit-red-wings",   EDM: "edmonton-oilers",
  FLA: "florida-panthers",   LAK: "los-angeles-kings",   MIN: "minnesota-wild",
  MTL: "montreal-canadiens", NSH: "nashville-predators", NJD: "new-jersey-devils",
  NYI: "new-york-islanders", NYR: "new-york-rangers",    OTT: "ottawa-senators",
  PHI: "philadelphia-flyers",PIT: "pittsburgh-penguins", SJS: "san-jose-sharks",
  SEA: "seattle-kraken",     STL: "st-louis-blues",      TBL: "tampa-bay-lightning",
  TOR: "toronto-maple-leafs",UTA: "utah-hockey-club",    VAN: "vancouver-canucks",
  VGK: "vegas-golden-knights",WSH: "washington-capitals",WPG: "winnipeg-jets",
};

async function fetchSpotrac(abbr: string): Promise<ScrapeResult> {
  const slug = SPOTRAC_SLUGS[abbr];
  if (!slug) throw new Error(`No Spotrac slug for ${abbr}`);

  const html = await fetchHtml(`https://www.spotrac.com/nhl/${slug}/`);
  const $    = cheerio.load(html);
  const summary: Partial<TeamCapSummary> = { teamAbbr: abbr };

  $(".team-summary, .cap-summary, [class*='cap-total']").each((_, el) => {
    const t = $(el).text().replace(/\s+/g, " ");
    const h = t.match(/total\s+cap[:\s]+(\$[\d,]+|[\d.]+[MKmk])/i);
    const s = t.match(/cap\s+space[:\s]+(\$[\d,]+|[\d.]+[MKmk])/i);
    if (h && !summary.capHit)   summary.capHit   = parseDollars(h[1]);
    if (s && !summary.capSpace) summary.capSpace  = parseDollars(s[1]);
  });

  const table     = findContractTable($);
  const contracts = table.length ? parseContractTable($, table, "spotrac") : [];
  summary.activeContracts = contracts.length;
  return { contracts, summary };
}

// ── Source: NHL API (player landing) ─────────────────────────────────────────
//
// Uses the existing /roster/{team}/current endpoint (already in nhl-api.ts) to
// get player IDs, then calls /player/{id}/landing for contract details.
// Because this is the official API, the rate limit is much lighter.

interface NhlLandingResponse {
  playerId?: number;
  firstName?: { default: string };
  lastName?: { default: string };
  position?: string;
  currentTeamContract?: {
    capHit?: number; aav?: number; totalValue?: number;
    length?: number; startYear?: number; endYear?: number;
    expiryStatus?: string; clauses?: { clauseType?: string }[];
  };
  contracts?: {
    capHit?: number; aav?: number; totalValue?: number;
    length?: number; startYear?: number; endYear?: number;
    expiryStatus?: string;
  }[];
}

async function fetchNhlPlayerContract(nhlId: number): Promise<ScrapedContract | null> {
  try {
    const data = await fetchJson<NhlLandingResponse>(
      `https://api-web.nhle.com/v1/player/${nhlId}/landing`
    );
    const raw = data.currentTeamContract ??
      (Array.isArray(data.contracts) && data.contracts.length ? data.contracts[0] : undefined);
    if (!raw?.capHit) return null;

    const name       = `${data.firstName?.default ?? ""} ${data.lastName?.default ?? ""}`.trim();
    const expiryYear = raw.endYear ?? new Date().getFullYear() + 1;
    const signingYear = raw.startYear ?? expiryYear - (raw.length ?? 1);
    const ntc = (raw as { clauses?: { clauseType?: string }[] }).clauses
      ?.some((c) => /ntc|nmc|trade|movement/i.test(c.clauseType ?? "")) ?? false;

    return {
      playerName:     name,
      position:       normalizePos(data.position ?? "F"),
      capHit:         raw.capHit,
      aav:            raw.aav          ?? raw.capHit,
      totalValue:     raw.totalValue   ?? 0,
      contractLength: raw.length       ?? expiryYear - signingYear,
      signingYear,
      expiryYear,
      expiryStatus:   (raw.expiryStatus ?? "UFA").slice(0, 10),
      noTradeClause:  ntc,
      source: "nhl-api",
    };
  } catch {
    return null;
  }
}

async function fetchNhlApi(abbr: string): Promise<ScrapeResult> {
  const roster = await fetchJson<{
    forwards: { id: number }[];
    defensemen: { id: number }[];
    goalies: { id: number }[];
  }>(`https://api-web.nhle.com/v1/roster/${abbr}/current`);

  const ids = [...roster.forwards, ...roster.defensemen, ...roster.goalies].map((p) => p.id);
  const contracts: ScrapedContract[] = [];
  for (const id of ids) {
    const c = await fetchNhlPlayerContract(id);
    if (c) contracts.push(c);
  }
  return { contracts, summary: { teamAbbr: abbr, activeContracts: contracts.length } };
}

// ── Merge ─────────────────────────────────────────────────────────────────────

/**
 * Merge contract lists from multiple sources.
 * For each player name, prefer the first source that has a non-zero value
 * for each field, supplementing with later sources where data is missing.
 */
function mergeResults(sources: (ScrapeResult | null)[]): ScrapeResult {
  const live = sources.filter((s): s is ScrapeResult => s !== null);
  if (live.length === 0) throw new Error("All sources returned null");

  const byName = new Map<string, ScrapedContract>();

  for (const { contracts } of live) {
    for (const c of contracts) {
      const key = c.playerName.toLowerCase();
      const ex  = byName.get(key);
      if (!ex) { byName.set(key, { ...c }); continue; }
      if (!ex.capHit        && c.capHit)        ex.capHit        = c.capHit;
      if (!ex.aav           && c.aav)            ex.aav           = c.aav;
      if (!ex.totalValue    && c.totalValue)     ex.totalValue    = c.totalValue;
      if (!ex.contractLength && c.contractLength) ex.contractLength = c.contractLength;
      if (!ex.signingYear   && c.signingYear)    ex.signingYear   = c.signingYear;
      if (!ex.expiryYear    && c.expiryYear)     ex.expiryYear    = c.expiryYear;
      if (ex.expiryStatus === "UFA" && c.expiryStatus && c.expiryStatus !== "UFA")
        ex.expiryStatus = c.expiryStatus;
      if (!ex.noTradeClause && c.noTradeClause)  ex.noTradeClause = c.noTradeClause;
      if ((!ex.position || ex.position === "F") && c.position)  ex.position = c.position;
      if (!ex.source.includes(c.source)) ex.source += `+${c.source}`;
    }
  }

  // Best cap summary = first non-undefined value from each source
  const merged: Partial<TeamCapSummary> = {};
  for (const { summary: s } of live) {
    if (s.capHit           !== undefined && merged.capHit           === undefined) merged.capHit           = s.capHit;
    if (s.capSpace         !== undefined && merged.capSpace         === undefined) merged.capSpace         = s.capSpace;
    if (s.projectedCapSpace !== undefined && merged.projectedCapSpace === undefined) merged.projectedCapSpace = s.projectedCapSpace;
    if (s.ltir             !== undefined && merged.ltir             === undefined) merged.ltir             = s.ltir;
    if (s.teamAbbr         !== undefined && merged.teamAbbr         === undefined) merged.teamAbbr         = s.teamAbbr;
  }
  merged.activeContracts = byName.size;

  return { contracts: Array.from(byName.values()), summary: merged };
}

// ── Cached fetchers ───────────────────────────────────────────────────────────

async function cachedFetch(
  key: string,
  fn: () => Promise<ScrapeResult>,
  label: string,
): Promise<ScrapeResult | null> {
  const hit = cache.get(key);
  if (hit) {
    console.log(`[scraper] cache hit: ${key} (age ${cache.ageSeconds(key)}s)`);
    return hit;
  }
  try {
    console.log(`[scraper] fetching ${label}`);
    const result = await fn();
    cache.set(key, result);
    return result;
  } catch (err) {
    console.warn(`[scraper] ${label} failed: ${(err as Error).message}`);
    return null;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export function isKnownTeam(abbr: string): boolean {
  return abbr.toUpperCase() in PUCKPEDIA_SLUGS;
}

/**
 * Scrape one team from PuckPedia only (fast, single HTTP request).
 * Cache-aware: returns cached data if available within the last hour.
 */
export async function scrapeTeamContracts(abbr: string): Promise<ScrapeResult> {
  const upper = abbr.toUpperCase();
  const result = await cachedFetch(
    `puckpedia:${upper}`,
    () => fetchPuckPedia(upper),
    `PuckPedia/${upper}`,
  );
  if (!result) throw new Error(`PuckPedia fetch failed for ${upper}`);
  return result;
}

/**
 * Scrape one team from all three sources and merge the results.
 * Sources: NHL API → PuckPedia → Spotrac (all supplementing each other).
 * Each source is cached independently; cache hits skip the live request.
 */
export async function scrapeTeamContractsMerged(abbr: string): Promise<ScrapeResult> {
  const upper = abbr.toUpperCase();
  const [nhl, pp, st] = await Promise.allSettled([
    cachedFetch(`nhl-api:${upper}`,   () => fetchNhlApi(upper),    `NHL API/${upper}`),
    cachedFetch(`puckpedia:${upper}`, () => fetchPuckPedia(upper),  `PuckPedia/${upper}`),
    cachedFetch(`spotrac:${upper}`,   () => fetchSpotrac(upper),    `Spotrac/${upper}`),
  ]);

  return mergeResults([
    nhl.status === "fulfilled" ? nhl.value : null,
    pp.status  === "fulfilled" ? pp.value  : null,
    st.status  === "fulfilled" ? st.value  : null,
  ]);
}

/**
 * Scrape all teams from PuckPedia, sequentially, respecting rate limits.
 */
export async function scrapeAllTeamContracts(
  onProgress?: (abbr: string, done: number, total: number) => void,
): Promise<Map<string, ScrapeResult>> {
  return runForAllTeams(scrapeTeamContracts, onProgress);
}

/**
 * Scrape all teams from all sources, sequentially, respecting rate limits.
 * Much slower than scrapeAllTeamContracts but produces richer data.
 */
export async function scrapeAllTeamContractsMerged(
  onProgress?: (abbr: string, done: number, total: number) => void,
): Promise<Map<string, ScrapeResult>> {
  return runForAllTeams(scrapeTeamContractsMerged, onProgress);
}

async function runForAllTeams(
  fn: (abbr: string) => Promise<ScrapeResult>,
  onProgress?: (abbr: string, done: number, total: number) => void,
): Promise<Map<string, ScrapeResult>> {
  const results = new Map<string, ScrapeResult>();
  const abbrs   = Object.keys(PUCKPEDIA_SLUGS);
  for (let i = 0; i < abbrs.length; i++) {
    const abbr = abbrs[i];
    try {
      const data = await fn(abbr);
      results.set(abbr, data);
      console.log(`[scraper] ${abbr}: ${data.contracts.length} contracts [${data.contracts[0]?.source ?? "–"}]`);
    } catch (err) {
      console.error(`[scraper] ${abbr} failed: ${(err as Error).message}`);
      results.set(abbr, { contracts: [], summary: { teamAbbr: abbr } });
    }
    onProgress?.(abbr, i + 1, abbrs.length);
  }
  return results;
}
