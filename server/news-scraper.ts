/**
 * NHL News & Transaction Scraper
 *
 * Sources:
 *   1. NHL API    – official /transactions endpoint; JSON, no HTML scraping
 *   2. DailyFaceoff – dailyfaceoff.com/transactions/; HTML scraping
 *   3. TSN         – tsn.ca/nhl/transactions; HTML scraping
 *   4. Sportsnet   – sportsnet.ca/hockey/nhl/; HTML scraping (news headlines)
 *
 * Results map to the existing `transactions` table schema:
 *   { type, player, team, details, date }
 *
 * Rate limiting / politeness:
 *   Same RateLimiter singleton from contract-scraper is NOT reused here to
 *   keep the modules self-contained. Each module carries its own limiter
 *   with per-domain gaps appropriate to each source's sensitivity.
 */

import * as cheerio from "cheerio";

// ── Rate limiter (local copy – same logic as contract-scraper) ────────────────

const DOMAIN_GAP: Record<string, number> = {
  "api-web.nhle.com":      300,
  "www.dailyfaceoff.com": 2_500,
  "www.tsn.ca":           2_500,
  "www.sportsnet.ca":     2_500,
};
const DEFAULT_GAP = 2_500;
const MAX_RETRIES  = 3;

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

class RateLimiter {
  private lastSent = new Map<string, number>();
  async acquire(domain: string): Promise<void> {
    const gap    = DOMAIN_GAP[domain] ?? DEFAULT_GAP;
    const jitter = Math.floor(Math.random() * 400);
    const last   = this.lastSent.get(domain) ?? 0;
    const wait   = Math.max(0, last + gap + jitter - Date.now());
    if (wait > 0) await sleep(wait);
    this.lastSent.set(domain, Date.now());
  }
}
const limiter = new RateLimiter();

// ── Cache (news expires faster – 15 min) ─────────────────────────────────────

const NEWS_TTL = 15 * 60 * 1_000;

class NewsCache {
  private store = new Map<string, { items: ScrapedTransaction[]; ts: number }>();
  get(key: string): ScrapedTransaction[] | null {
    const e = this.store.get(key);
    return e && Date.now() - e.ts < NEWS_TTL ? e.items : null;
  }
  set(key: string, items: ScrapedTransaction[]): void {
    this.store.set(key, { items, ts: Date.now() });
  }
}
const newsCache = new NewsCache();

// ── Fetch helpers ─────────────────────────────────────────────────────────────

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
  "Cache-Control": "no-cache",
};

async function fetchHtml(url: string): Promise<string> {
  const domain = new URL(url).hostname;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    await limiter.acquire(domain);
    const res = await fetch(url, { headers: BROWSER_HEADERS });
    if (res.status === 429 || res.status === 503) {
      const retry = parseInt(res.headers.get("retry-after") ?? "0", 10);
      const back  = retry > 0 ? retry * 1_000 : Math.min(Math.pow(2, attempt + 1) * 5_000, 64_000);
      console.warn(`[news-scraper] ${domain} rate-limited, waiting ${back}ms`);
      if (attempt < MAX_RETRIES) { await sleep(back); continue; }
      throw new Error(`${domain} rate-limited after ${MAX_RETRIES} retries`);
    }
    if (!res.ok) throw new Error(`HTTP ${res.status} – ${url}`);
    return res.text();
  }
  throw new Error(`fetchHtml: exhausted retries for ${url}`);
}

async function fetchJson<T>(url: string): Promise<T> {
  const domain = new URL(url).hostname;
  await limiter.acquire(domain);
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} – ${url}`);
  return res.json() as Promise<T>;
}

// ── Public type ───────────────────────────────────────────────────────────────

export interface ScrapedTransaction {
  type: string;    // "Trade", "Signing", "Extension", "Waivers", "Recall", "IR", "News"
  player: string;  // player name or comma-separated list
  team: string;    // team abbreviation(s) – e.g. "TOR" or "TOR -> EDM"
  details: string; // human-readable description
  date: string;    // "YYYY-MM-DD"
  source: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Classify a transaction headline into a type. */
function classifyType(text: string): string {
  const t = text.toLowerCase();
  if (/\btrad(e|ed)\b/.test(t))                       return "Trade";
  if (/\bextension|extended\b/.test(t))               return "Extension";
  if (/\bsign(ed?|ing)\b/.test(t))                    return "Signing";
  if (/\bwaiv(er|ers|ed)\b/.test(t))                  return "Waivers";
  if (/\brecall(ed)?\b/.test(t))                      return "Recall";
  if (/\binjur(y|ied|ies)|\bir\b|placed on/.test(t)) return "IR";
  if (/\breleas(e|ed)\b|\bbuyout\b/.test(t))          return "Buyout";
  if (/\bretir(e|ed|ement)\b/.test(t))                return "Retirement";
  return "News";
}

/** Convert various date strings to YYYY-MM-DD. Falls back to today. */
function normalizeDate(raw: string): string {
  if (!raw) return new Date().toISOString().slice(0, 10);
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw.trim())) return raw.trim();
  // Try native Date parse
  const d = new Date(raw);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return new Date().toISOString().slice(0, 10);
}

// ── Source 1: NHL API transactions ───────────────────────────────────────────

interface NhlTransaction {
  id?: string;
  transactionDate?: string;
  typeCodes?: string[];
  toTeamAbbrev?: { default?: string };
  fromTeamAbbrev?: { default?: string };
  firstName?: { default?: string };
  lastName?: { default?: string };
  team?: { abbrev?: string };
  description?: string;
}

interface NhlTransactionsResponse {
  transactions?: NhlTransaction[];
}

/** Map NHL API type codes to our type labels. */
function mapNhlType(codes: string[] = []): string {
  const c = codes.join(" ").toUpperCase();
  if (c.includes("TRADE"))                           return "Trade";
  if (c.includes("SIGN") && c.includes("EXT"))      return "Extension";
  if (c.includes("SIGN"))                            return "Signing";
  if (c.includes("WAIV"))                            return "Waivers";
  if (c.includes("RECALL") || c.includes("CLMD"))   return "Recall";
  if (c.includes("IR") || c.includes("INJURED"))    return "IR";
  if (c.includes("BUYOUT") || c.includes("RELEAS")) return "Buyout";
  if (c.includes("RETIR"))                          return "Retirement";
  return "News";
}

async function fetchNhlApiTransactions(season = "20242025"): Promise<ScrapedTransaction[]> {
  const cacheKey = `nhl-api-tx:${season}`;
  const hit = newsCache.get(cacheKey);
  if (hit) return hit;

  try {
    const data = await fetchJson<NhlTransactionsResponse>(
      `https://api-web.nhle.com/v1/transactions/${season}`
    );
    const raw = data.transactions ?? [];

    const items: ScrapedTransaction[] = raw.map((tx) => {
      const player  = [tx.firstName?.default, tx.lastName?.default].filter(Boolean).join(" ") || "Unknown";
      const toTeam  = tx.toTeamAbbrev?.default   ?? tx.team?.abbrev ?? "NHL";
      const fromTeam = tx.fromTeamAbbrev?.default ?? "";
      const team    = fromTeam ? `${fromTeam} -> ${toTeam}` : toTeam;
      return {
        type:    mapNhlType(tx.typeCodes),
        player,
        team,
        details: tx.description ?? tx.typeCodes?.join(", ") ?? "",
        date:    normalizeDate(tx.transactionDate ?? ""),
        source:  "nhl-api",
      };
    });

    newsCache.set(cacheKey, items);
    return items;
  } catch (err) {
    console.warn("[news-scraper] NHL API transactions failed:", (err as Error).message);
    return [];
  }
}

// ── Source 2: DailyFaceoff ────────────────────────────────────────────────────

async function fetchDailyFaceoff(): Promise<ScrapedTransaction[]> {
  const cacheKey = "dailyfaceoff:transactions";
  const hit = newsCache.get(cacheKey);
  if (hit) return hit;

  try {
    const html = await fetchHtml("https://www.dailyfaceoff.com/transactions/");
    const $    = cheerio.load(html);
    const items: ScrapedTransaction[] = [];

    // DailyFaceoff transaction list: each entry is typically a <div> or <li>
    // with a date header and transaction text.
    let currentDate = new Date().toISOString().slice(0, 10);

    $(".transactions-list .transaction, .transaction-item, article.transaction, " +
      "[class*='transaction']:not([class*='transactions-list'])").each((_, el) => {
      // Some layouts embed the date in a sibling heading
      const prevHeader = $(el).prevAll("h2, h3, h4, [class*='date']").first().text().trim();
      if (prevHeader) currentDate = normalizeDate(prevHeader);

      const dateEl = $(el).find("[class*='date'], time").first();
      if (dateEl.length) currentDate = normalizeDate(dateEl.attr("datetime") || dateEl.text());

      const text = $(el).text().replace(/\s+/g, " ").trim();
      if (!text || text.length < 10) return;

      items.push({
        type:    classifyType(text),
        player:  extractPlayerName(text),
        team:    extractTeam(text),
        details: text.slice(0, 250),
        date:    currentDate,
        source:  "dailyfaceoff",
      });
    });

    // Fallback: generic list items if specific selectors matched nothing
    if (items.length === 0) {
      $("li, .item").each((_, el) => {
        const text = $(el).text().replace(/\s+/g, " ").trim();
        if (text.length < 20 || text.length > 500) return;
        if (!/sign|trade|recall|waiv|injur/i.test(text)) return;
        items.push({
          type:    classifyType(text),
          player:  extractPlayerName(text),
          team:    extractTeam(text),
          details: text.slice(0, 250),
          date:    currentDate,
          source:  "dailyfaceoff",
        });
      });
    }

    newsCache.set(cacheKey, items);
    return items;
  } catch (err) {
    console.warn("[news-scraper] DailyFaceoff failed:", (err as Error).message);
    return [];
  }
}

// ── Source 3: TSN ─────────────────────────────────────────────────────────────

async function fetchTsn(): Promise<ScrapedTransaction[]> {
  const cacheKey = "tsn:nhl-transactions";
  const hit = newsCache.get(cacheKey);
  if (hit) return hit;

  try {
    const html = await fetchHtml("https://www.tsn.ca/nhl/transactions");
    const $    = cheerio.load(html);
    const items: ScrapedTransaction[] = [];
    let currentDate = new Date().toISOString().slice(0, 10);

    // TSN typically lists transactions grouped by date
    $(".transactions__date, .transaction-date, h2.date, [class*='transactionDate']").each((_, dateEl) => {
      const dateText = $(dateEl).text().trim();
      if (dateText) currentDate = normalizeDate(dateText);

      // Transactions following this date header
      $(dateEl).nextUntil(
        ".transactions__date, .transaction-date, h2.date, [class*='transactionDate']",
        ".transaction, li, .item, p"
      ).each((_, txEl) => {
        const text = $(txEl).text().replace(/\s+/g, " ").trim();
        if (!text || text.length < 15) return;
        items.push({
          type:    classifyType(text),
          player:  extractPlayerName(text),
          team:    extractTeam(text),
          details: text.slice(0, 250),
          date:    currentDate,
          source:  "tsn",
        });
      });
    });

    // Simpler fallback: any element that looks like a transaction sentence
    if (items.length === 0) {
      $("p, li, td").each((_, el) => {
        const text = $(el).text().replace(/\s+/g, " ").trim();
        if (text.length < 20 || text.length > 400) return;
        if (!/sign|trade|recall|waiv|injur|extension/i.test(text)) return;
        items.push({
          type:    classifyType(text),
          player:  extractPlayerName(text),
          team:    extractTeam(text),
          details: text.slice(0, 250),
          date:    currentDate,
          source:  "tsn",
        });
      });
    }

    newsCache.set(cacheKey, items);
    return items;
  } catch (err) {
    console.warn("[news-scraper] TSN failed:", (err as Error).message);
    return [];
  }
}

// ── Source 4: Sportsnet ───────────────────────────────────────────────────────

async function fetchSportsnet(): Promise<ScrapedTransaction[]> {
  const cacheKey = "sportsnet:nhl-news";
  const hit = newsCache.get(cacheKey);
  if (hit) return hit;

  try {
    const html = await fetchHtml("https://www.sportsnet.ca/hockey/nhl/");
    const $    = cheerio.load(html);
    const items: ScrapedTransaction[] = [];
    const today = new Date().toISOString().slice(0, 10);

    // Sportsnet news: articles / headlines
    $("article, .article-card, .story-item, [class*='article']").each((_, el) => {
      const headline = $(el).find("h2, h3, h4, a").first().text().replace(/\s+/g, " ").trim();
      if (!headline || headline.length < 10) return;
      if (!/sign|trade|recall|waiv|injur|extension|contract|deal/i.test(headline)) return;

      const timeEl = $(el).find("time").first();
      const date   = normalizeDate(timeEl.attr("datetime") || timeEl.text() || today);

      items.push({
        type:    classifyType(headline),
        player:  extractPlayerName(headline),
        team:    extractTeam(headline),
        details: headline.slice(0, 250),
        date,
        source:  "sportsnet",
      });
    });

    newsCache.set(cacheKey, items);
    return items;
  } catch (err) {
    console.warn("[news-scraper] Sportsnet failed:", (err as Error).message);
    return [];
  }
}

// ── NLP-lite helpers ──────────────────────────────────────────────────────────

// Known NHL team abbreviations for quick matching in headlines
const TEAM_ABBREVS = [
  "ANA","ARI","BOS","BUF","CGY","CAR","CHI","COL","CBJ","DAL",
  "DET","EDM","FLA","LAK","MIN","MTL","NSH","NJD","NYI","NYR",
  "OTT","PHI","PIT","SJS","SEA","STL","TBL","TOR","UTA","VAN",
  "VGK","WSH","WPG",
];

// Common full-name → abbreviation for news headlines
const TEAM_NAME_MAP: Record<string, string> = {
  "maple leafs": "TOR", "leafs": "TOR", "oilers": "EDM",
  "canadiens": "MTL",   "habs": "MTL",  "bruins": "BOS",
  "rangers": "NYR",     "islanders": "NYI", "devils": "NJD",
  "flyers": "PHI",      "penguins": "PIT",  "capitals": "WSH",
  "hurricanes": "CAR",  "lightning": "TBL", "panthers": "FLA",
  "jets": "WPG",        "senators": "OTT",  "flames": "CGY",
  "canucks": "VAN",     "kraken": "SEA",    "golden knights": "VGK",
  "sharks": "SJS",      "ducks": "ANA",     "kings": "LAK",
  "wild": "MIN",        "blues": "STL",     "blackhawks": "CHI",
  "stars": "DAL",       "avalanche": "COL", "blue jackets": "CBJ",
  "sabres": "BUF",      "red wings": "DET", "predators": "NSH",
  "coyotes": "ARI",     "utah": "UTA",
};

/** Extract the first recognisable player name from a sentence (Title Case word pair). */
function extractPlayerName(text: string): string {
  // Look for a Title Case pair like "Auston Matthews" or "Connor McDavid"
  const m = text.match(/\b([A-Z][a-z'-]+\s+(?:Mc|Mac|De|O')?[A-Z][a-z'-]+)\b/);
  return m ? m[1] : "Unknown";
}

/** Extract a team abbreviation from text. */
function extractTeam(text: string): string {
  // Explicit abbreviation e.g. "the TOR Maple Leafs"
  for (const abbr of TEAM_ABBREVS) {
    if (new RegExp(`\\b${abbr}\\b`).test(text)) return abbr;
  }
  // Full team name match
  const lower = text.toLowerCase();
  for (const [name, abbr] of Object.entries(TEAM_NAME_MAP)) {
    if (lower.includes(name)) return abbr;
  }
  return "NHL";
}

// ── Public API ────────────────────────────────────────────────────────────────

export type NewsSource = "nhl-api" | "dailyfaceoff" | "tsn" | "sportsnet" | "all";

/**
 * Fetch NHL transaction/news items from the given source.
 * @param source – one of the named sources or "all" to aggregate
 * @param season – NHL season string (e.g. "20242025"), used by the NHL API source
 */
export async function scrapeNhlNews(
  source: NewsSource = "all",
  season = "20242025",
): Promise<ScrapedTransaction[]> {
  switch (source) {
    case "nhl-api":      return fetchNhlApiTransactions(season);
    case "dailyfaceoff": return fetchDailyFaceoff();
    case "tsn":          return fetchTsn();
    case "sportsnet":    return fetchSportsnet();
    case "all": {
      const [api, df, tsn, sn] = await Promise.allSettled([
        fetchNhlApiTransactions(season),
        fetchDailyFaceoff(),
        fetchTsn(),
        fetchSportsnet(),
      ]);
      const all: ScrapedTransaction[] = [];
      for (const r of [api, df, tsn, sn]) {
        if (r.status === "fulfilled") all.push(...r.value);
      }
      // Deduplicate by (player + date + type)
      const seen: string[] = [];
      return all.filter((tx) => {
        const key = `${tx.player}|${tx.date}|${tx.type}`;
        if (seen.includes(key)) return false;
        seen.push(key);
        return true;
      });
    }
  }
}
