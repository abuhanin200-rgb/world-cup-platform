export type GulfCup27NewsItem = {
  id: string;
  title: string;
  url: string;
  source: string;
  sourceUrl: string;
  publishedAt: number;
};

const GOOGLE_NEWS_BASE = "https://news.google.com/rss/search";
const FEED_QUERIES = [
  '"خليجي 27"',
  '"كأس الخليج 27"',
  '"خليجي الديار العربية 27"',
] as const;

const RELEVANCE_TERMS = [
  "خليجي 27",
  "خليجي27",
  "كأس الخليج 27",
  "كأس الخليج27",
  "الخليج 27",
  "الخليج27",
  "خليجي الديار العربية 27",
] as const;

function decodeXml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .trim();
}

function tagValue(xml: string, tag: string) {
  const match = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? decodeXml(match[1]) : "";
}

function sourceValue(xml: string) {
  const match = xml.match(/<source(?:\s+url="([^"]*)")?[^>]*>([\s\S]*?)<\/source>/i);
  return {
    name: match ? decodeXml(match[2]) : "مصدر إخباري",
    url: match?.[1] ? decodeXml(match[1]) : "",
  };
}

function safeHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function normalizeText(value: string) {
  return value.replace(/[\u064B-\u065F\u0670]/g, "").replace(/ـ/g, "").replace(/\s+/g, " ").trim();
}

function isRelevant(title: string) {
  const normalized = normalizeText(title);
  return RELEVANCE_TERMS.some((term) => normalized.includes(normalizeText(term)));
}

function stripSourceFromTitle(title: string, source: string) {
  const suffix = ` - ${source}`;
  return source && title.endsWith(suffix) ? title.slice(0, -suffix.length).trim() : title;
}

function stableId(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `g27_${(hash >>> 0).toString(36)}`;
}

function parseFeed(xml: string): GulfCup27NewsItem[] {
  const items = xml.match(/<item>[\s\S]*?<\/item>/gi) ?? [];
  return items.flatMap((item) => {
    const source = sourceValue(item);
    const rawTitle = tagValue(item, "title");
    const title = stripSourceFromTitle(rawTitle, source.name);
    const url = safeHttpUrl(tagValue(item, "link"));
    const published = Date.parse(tagValue(item, "pubDate"));

    if (!title || !url || !isRelevant(title)) return [];

    return [{
      id: stableId(`${title}|${source.name}`),
      title,
      url,
      source: source.name || "مصدر إخباري",
      sourceUrl: safeHttpUrl(source.url),
      publishedAt: Number.isFinite(published) ? published : 0,
    }];
  });
}

function canonicalTitle(value: string) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/["'“”‘’.,،:;؛!?؟()\[\]{}\-–—]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function fetchGulfCup27News(): Promise<GulfCup27NewsItem[]> {
  const feeds = await Promise.allSettled(FEED_QUERIES.map(async (query) => {
    const params = new URLSearchParams({ q: query, hl: "ar", gl: "SA", ceid: "SA:ar" });
    const response = await fetch(`${GOOGLE_NEWS_BASE}?${params.toString()}`, {
      headers: { "User-Agent": "Altahaddi/1.0 (+https://world-cup-platform.vercel.app)" },
      next: { revalidate: 600 },
    });
    if (!response.ok) throw new Error(`Google News RSS ${response.status}`);
    return parseFeed(await response.text());
  }));

  const merged = feeds.flatMap((result) => result.status === "fulfilled" ? result.value : []);
  const seen = new Set<string>();

  return merged
    .sort((a, b) => b.publishedAt - a.publishedAt)
    .filter((item) => {
      const key = canonicalTitle(item.title);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
