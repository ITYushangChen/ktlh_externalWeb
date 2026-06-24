const GEOCODING_API = "https://geocoding-api.open-meteo.com/v1/search";

export interface GeocodedTimezone {
  timezone: string;
  name: string;
  country: string;
  admin1?: string;
}

type GeocodingResponse = {
  results?: Array<{
    name: string;
    country: string;
    admin1?: string;
    timezone: string;
  }>;
};

function detectLanguages(location: string): string[] {
  const langs = new Set<string>();
  if (/[\u4e00-\u9fff]/.test(location)) langs.add("zh");
  if (/[\u0600-\u06FF]/.test(location)) langs.add("ar");
  if (/[\u3040-\u30ff]/.test(location)) langs.add("ja");
  if (/[\uac00-\ud7af]/.test(location)) langs.add("ko");
  if (/[\u0400-\u04FF]/.test(location)) langs.add("ru");
  if (/[\u0600-\u06FF]/.test(location)) langs.add("fa");
  langs.add("en");
  return [...langs];
}

function buildSearchQueries(location: string): string[] {
  const trimmed = location.trim();
  const queries = new Set<string>();
  if (trimmed) queries.add(trimmed);

  for (const part of trimmed.split(/[/,，|·\-–—]/)) {
    const p = part.trim();
    if (p.length >= 2) queries.add(p);
  }

  return [...queries];
}

function isValidIanaTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

async function geocodeOnce(name: string, language: string): Promise<GeocodedTimezone | null> {
  const url = new URL(GEOCODING_API);
  url.searchParams.set("name", name);
  url.searchParams.set("count", "1");
  url.searchParams.set("language", language);
  url.searchParams.set("format", "json");

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) return null;

  const data = (await res.json()) as GeocodingResponse;
  const hit = data.results?.[0];
  if (!hit?.timezone || !isValidIanaTimezone(hit.timezone)) return null;

  return {
    timezone: hit.timezone,
    name: hit.name,
    country: hit.country,
    admin1: hit.admin1,
  };
}

/** 通过 Open-Meteo 全球地理编码解析 IANA 时区 */
export async function resolveTimezoneFromGeocoding(
  location: string
): Promise<GeocodedTimezone | null> {
  const trimmed = location.trim();
  if (!trimmed) return null;

  if (/^[A-Za-z_+-]+\/[A-Za-z_+-]+$/.test(trimmed) && isValidIanaTimezone(trimmed)) {
    return { timezone: trimmed, name: trimmed, country: "" };
  }

  const queries = buildSearchQueries(trimmed);
  const languages = detectLanguages(trimmed);

  for (const query of queries) {
    for (const lang of languages) {
      const result = await geocodeOnce(query, lang);
      if (result) return result;
    }
  }

  return null;
}

export function formatLocalTime(timezone: string, now = new Date()): string {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
}

export function getTimezoneLabel(timezone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("zh-CN", {
      timeZone: timezone,
      timeZoneName: "shortOffset",
    }).formatToParts(new Date());
    const offset = parts.find((p) => p.type === "timeZoneName")?.value;
    return offset ?? timezone;
  } catch {
    return timezone;
  }
}

export function formatPlaceLabel(result: GeocodedTimezone): string {
  return [result.name, result.admin1, result.country].filter(Boolean).join(", ");
}
