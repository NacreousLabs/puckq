/**
 * NHL Contract Scraper
 *
 * Scrapes player contract and salary cap data from PuckPedia (puckpedia.com),
 * the primary public source for NHL cap/contract information.
 *
 * Design notes:
 *  - Uses Node's built-in fetch + cheerio for HTML parsing (no headless browser needed;
 *    PuckPedia renders its roster tables server-side).
 *  - Adaptive column detection: reads the <thead> to find column positions instead of
 *    relying on fixed indices, so minor layout changes don't break the parser.
 *  - All requests are rate-limited (REQUEST_DELAY_MS between pages) to be polite.
 *  - Dollar amounts accept several formats: "$13,250,000", "13.25M", "875K".
 */

import * as cheerio from "cheerio";

// ── Constants ─────────────────────────────────────────────────────────────────

const PUCKPEDIA_BASE = "https://puckpedia.com";
const REQUEST_DELAY_MS = 1_500; // ms between requests
const NHL_CAP_CEILING = 88_000_000; // 2024-25 salary cap

/** Map NHL abbreviations (upper-case) → PuckPedia team path segment (lower-case). */
const TEAM_SLUGS: Record<string, string> = {
  ANA: "ana", ARI: "ari", BOS: "bos", BUF: "buf", CGY: "cgy",
  CAR: "car", CHI: "chi", COL: "col", CBJ: "cbj", DAL: "dal",
  DET: "det", EDM: "edm", FLA: "fla", LAK: "lak", MIN: "min",
  MTL: "mtl", NSH: "nsh", NJD: "njd", NYI: "nyi", NYR: "nyr",
  OTT: "ott", PHI: "phi", PIT: "pit", SJS: "sjs", SEA: "sea",
  STL: "stl", TBL: "tbl", TOR: "tor", UTA: "uta", VAN: "van",
  VGK: "vgk", WSH: "wsh", WPG: "wpg",
};

/** Normalise position codes to the app's 2-letter standard. */
const POSITION_MAP: Record<string, string> = {
  C: "C", LW: "LW", RW: "RW", W: "LW", F: "LW",
  D: "D", G: "G",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

/**
 * Parse a dollar amount from various string formats:
 *   "$13,250,000"  → 13_250_000
 *   "13.25M"       → 13_250_000
 *   "875K"         → 875_000
 *   "0" / ""       → 0
 */
function parseDollars(raw: string): number {
  const text = raw.trim();
  if (!text) return 0;
  const mMatch = text.match(/(\d+(?:\.\d+)?)\s*[Mm]/);
  if (mMatch) return Math.round(parseFloat(mMatch[1]) * 1_000_000);
  const kMatch = text.match(/(\d+(?:\.\d+)?)\s*[Kk]/);
  if (kMatch) return Math.round(parseFloat(kMatch[1]) * 1_000);
  const n = parseInt(text.replace(/[^0-9]/g, ""), 10);
  return isNaN(n) ? 0 : n;
}

/** Extract the first 4-digit year ≥ 2000 from a string. */
function parseYear(text: string): number | null {
  const m = text.match(/\b(20\d{2})\b/);
  return m ? parseInt(m[1], 10) : null;
}

/** Fetch raw HTML with browser-like headers. */
async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
      "Cache-Control": "no-cache",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} – ${url}`);
  return res.text();
}

// ── Public types ──────────────────────────────────────────────────────────────

export interface ScrapedContract {
  playerName: string;
  position: string;     // C, LW, RW, D, G
  capHit: number;       // annual salary-cap charge in dollars
  aav: number;          // average annual value (differs for ELCs with bonuses)
  totalValue: number;   // full contract value in dollars
  contractLength: number; // total years on contract
  signingYear: number;  // year contract was signed
  expiryYear: number;   // year contract expires
  expiryStatus: string; // "UFA", "RFA", "ARFA", "10NTC", "NMC", …
  noTradeClause: boolean;
}

export interface TeamCapSummary {
  teamAbbr: string;
  capHit: number;          // current active cap hit
  capSpace: number;        // remaining cap space
  projectedCapSpace: number;
  ltir: number;            // Long-term injured reserve relief
  activeContracts: number;
}

export interface ScrapeResult {
  contracts: ScrapedContract[];
  summary: Partial<TeamCapSummary>;
}

// ── HTML parser ───────────────────────────────────────────────────────────────

/**
 * Parse a PuckPedia team page into contracts + summary.
 *
 * Strategy:
 *  1. Find the table whose <thead> mentions "cap" or "player".
 *  2. Read the header row to map column names → indices.
 *  3. Iterate <tbody> rows to extract contract fields.
 */
function parseTeamPage(html: string, teamAbbr: string): ScrapeResult {
  const $ = cheerio.load(html);
  const contracts: ScrapedContract[] = [];
  const summary: Partial<TeamCapSummary> = { teamAbbr };

  // ── 1. Try to extract the cap summary numbers ────────────────────────────
  // PuckPedia shows a "Cap Summary" section at the top of each team page.
  // We scan for dollar amounts following known labels.
  $("body").find("*").each((_, el) => {
    const text = $(el).text().replace(/\s+/g, " ").trim();
    if (text.length > 200) return; // skip large containers

    const capHitMatch = text.match(/cap\s+hit[:\s]+(\$[\d,]+|[\d.]+[MKmk])/i);
    if (capHitMatch && !summary.capHit) summary.capHit = parseDollars(capHitMatch[1]);

    const capSpaceMatch = text.match(/cap\s+space[:\s]+(\$[\d,]+|[\d.]+[MKmk])/i);
    if (capSpaceMatch && !summary.capSpace) summary.capSpace = parseDollars(capSpaceMatch[1]);

    const ltirMatch = text.match(/LTIR[:\s]+(\$[\d,]+|[\d.]+[MKmk])/i);
    if (ltirMatch && !summary.ltir) summary.ltir = parseDollars(ltirMatch[1]);
  });

  // Derive cap space from cap ceiling if not scraped directly
  if (summary.capHit && !summary.capSpace) {
    summary.capSpace = Math.max(0, NHL_CAP_CEILING - summary.capHit);
  }

  // ── 2. Find the main contracts table ────────────────────────────────────
  let contractTable = $("table").filter((_, tbl) => {
    const header = $(tbl).find("thead").text().toLowerCase();
    return header.includes("cap") || header.includes("player") || header.includes("salary");
  }).first();

  // Fallback: any table with more than 5 rows
  if (!contractTable.length) {
    contractTable = $("table").filter((_, tbl) => $(tbl).find("tbody tr").length > 5).first();
  }

  if (!contractTable.length) {
    console.warn(`[scraper] No contracts table found for ${teamAbbr}`);
    return { contracts, summary };
  }

  // ── 3. Map column headers → indices ─────────────────────────────────────
  const colIndex: Record<string, number> = {};
  contractTable.find("thead tr").first().find("th, td").each((i, th) => {
    const label = $(th).text().toLowerCase().replace(/\s+/g, " ").trim();
    if (/\bplayer\b|\bname\b/.test(label)) colIndex.player = i;
    else if (/\bpos(ition)?\b/.test(label)) colIndex.pos = i;
    else if (/cap\s+hit/.test(label)) colIndex.capHit = i;
    else if (/\baav\b|\bavg\b|\baverage/.test(label)) colIndex.aav = i;
    else if (/total\s+value|\btotal\b/.test(label) && !/contract/.test(label)) colIndex.total = i;
    else if (/length|\bterm\b|\byrs\b|\byears\b/.test(label)) colIndex.length = i;
    else if (/expiry\s+year|\bexpiry\b|\bexpires\b/.test(label)) colIndex.expiryYear = i;
    else if (/type|\bstatus\b|ufa|rfa/.test(label)) colIndex.expiryType = i;
    else if (/signing\s+year/.test(label)) colIndex.signingYear = i;
    else if (/ntc|nmc|clause/.test(label)) colIndex.ntc = i;
  });

  // Defaults if headers weren't found
  const col = (key: string, fallback: number) => colIndex[key] ?? fallback;

  // ── 4. Parse body rows ───────────────────────────────────────────────────
  contractTable.find("tbody tr").each((_, row) => {
    const cells = $(row).find("td");
    if (cells.length < 3) return;

    // Player name (prefer link text inside first meaningful cell)
    const nameCell = cells.eq(col("player", 0));
    const playerName = (nameCell.find("a").first().text() || nameCell.text()).trim();
    if (!playerName) return;

    // Skip aggregate rows ("Total", "Dead cap", "LTIR", …)
    if (/^(total|dead\s+cap|ltir|buried|cap\s+space)/i.test(playerName)) return;

    const rawPos = cells.eq(col("pos", 1)).text().trim().toUpperCase();
    const position = POSITION_MAP[rawPos] ?? (rawPos.slice(0, 2) || "F");

    const capHit = parseDollars(cells.eq(col("capHit", 2)).text());
    if (capHit === 0) return; // skip rows without a cap number

    const aavRaw = colIndex.aav !== undefined
      ? parseDollars(cells.eq(colIndex.aav).text())
      : 0;
    const aav = aavRaw || capHit; // default AAV = cap hit if not separately listed

    const totalValue = colIndex.total !== undefined
      ? parseDollars(cells.eq(colIndex.total).text())
      : 0;

    const contractLength = colIndex.length !== undefined
      ? (parseInt(cells.eq(colIndex.length).text().trim(), 10) || 1)
      : 1;

    const expiryYear = colIndex.expiryYear !== undefined
      ? (parseYear(cells.eq(colIndex.expiryYear).text()) ?? new Date().getFullYear() + contractLength)
      : new Date().getFullYear() + contractLength;

    const rawExpiryType = colIndex.expiryType !== undefined
      ? cells.eq(colIndex.expiryType).text().trim()
      : "";
    const expiryStatus = rawExpiryType.slice(0, 10) || "UFA";

    const signingYear = colIndex.signingYear !== undefined
      ? (parseYear(cells.eq(colIndex.signingYear).text()) ?? expiryYear - contractLength)
      : expiryYear - contractLength;

    // Detect NTC/NMC: either a dedicated column or keywords in the row text
    const rowText = $(row).text();
    const noTradeClause =
      (colIndex.ntc !== undefined && /yes|✓|ntc|nmc/i.test(cells.eq(colIndex.ntc).text())) ||
      /NTC|NMC|no[\s-]trade|no[\s-]movement/i.test(rowText);

    contracts.push({
      playerName,
      position,
      capHit,
      aav,
      totalValue,
      contractLength,
      signingYear,
      expiryYear,
      expiryStatus,
      noTradeClause,
    });
  });

  summary.activeContracts = contracts.length;

  return { contracts, summary };
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Return true if we have a PuckPedia slug for this abbreviation. */
export function isKnownTeam(abbr: string): boolean {
  return abbr.toUpperCase() in TEAM_SLUGS;
}

/**
 * Scrape contract data for a single team.
 * @param abbr – NHL team abbreviation, e.g. "TOR", "EDM"
 */
export async function scrapeTeamContracts(abbr: string): Promise<ScrapeResult> {
  const upper = abbr.toUpperCase();
  const slug = TEAM_SLUGS[upper];
  if (!slug) throw new Error(`No PuckPedia mapping for team abbreviation: ${abbr}`);

  const url = `${PUCKPEDIA_BASE}/${slug}`;
  console.log(`[scraper] Fetching ${url}`);
  const html = await fetchHtml(url);
  return parseTeamPage(html, upper);
}

/**
 * Scrape contracts for every team, with polite rate-limiting.
 * Calls onProgress after each team completes.
 */
export async function scrapeAllTeamContracts(
  onProgress?: (abbr: string, done: number, total: number) => void
): Promise<Map<string, ScrapeResult>> {
  const results = new Map<string, ScrapeResult>();
  const abbrs = Object.keys(TEAM_SLUGS);

  for (let i = 0; i < abbrs.length; i++) {
    const abbr = abbrs[i];
    try {
      const data = await scrapeTeamContracts(abbr);
      results.set(abbr, data);
      console.log(`[scraper] ${abbr}: ${data.contracts.length} contracts scraped`);
    } catch (err) {
      console.error(`[scraper] Failed to scrape ${abbr}:`, err);
      results.set(abbr, { contracts: [], summary: { teamAbbr: abbr } });
    }
    onProgress?.(abbr, i + 1, abbrs.length);
    if (i < abbrs.length - 1) await sleep(REQUEST_DELAY_MS);
  }

  return results;
}
