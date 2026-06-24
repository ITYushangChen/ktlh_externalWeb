const GEOCODING_API = "https://geocoding-api.open-meteo.com/v1/search";

export interface GeocodedTimezone {
  timezone: string;
  name: string;
  country: string;
  admin1?: string;
}

type GeocodingHit = {
  name: string;
  country: string;
  country_code?: string;
  admin1?: string;
  timezone?: string;
  feature_code?: string;
};

type GeocodingResponse = {
  results?: GeocodingHit[];
};

/** ISO 3166-1 alpha-2 → 主要 IANA 时区（多国取首都/人口最多区域） */
const TIMEZONE_BY_COUNTRY_CODE: Record<string, string> = {
  AD: "Europe/Andorra", AE: "Asia/Dubai", AF: "Asia/Kabul", AG: "America/Antigua",
  AL: "Europe/Tirane", AM: "Asia/Yerevan", AO: "Africa/Luanda", AR: "America/Argentina/Buenos_Aires",
  AT: "Europe/Vienna", AU: "Australia/Sydney", AZ: "Asia/Baku", BA: "Europe/Sarajevo",
  BD: "Asia/Dhaka", BE: "Europe/Brussels", BF: "Africa/Ouagadougou", BG: "Europe/Sofia",
  BH: "Asia/Bahrain", BI: "Africa/Bujumbura", BJ: "Africa/Porto-Novo", BN: "Asia/Brunei",
  BO: "America/La_Paz", BR: "America/Sao_Paulo", BS: "America/Nassau", BT: "Asia/Thimphu",
  BW: "Africa/Gaborone", BY: "Europe/Minsk", BZ: "America/Belize", CA: "America/Toronto",
  CD: "Africa/Kinshasa", CF: "Africa/Bangui", CG: "Africa/Brazzaville", CH: "Europe/Zurich",
  CI: "Africa/Abidjan", CL: "America/Santiago", CM: "Africa/Douala", CN: "Asia/Shanghai",
  CO: "America/Bogota", CR: "America/Costa_Rica", CU: "America/Havana", CV: "Atlantic/Cape_Verde",
  CY: "Asia/Nicosia", CZ: "Europe/Prague", DE: "Europe/Berlin", DJ: "Africa/Djibouti",
  DK: "Europe/Copenhagen", DO: "America/Santo_Domingo", DZ: "Africa/Algiers",
  EC: "America/Guayaquil", EE: "Europe/Tallinn", EG: "Africa/Cairo", ER: "Africa/Asmara",
  ES: "Europe/Madrid", ET: "Africa/Addis_Ababa", FI: "Europe/Helsinki", FJ: "Pacific/Fiji",
  FR: "Europe/Paris", GA: "Africa/Libreville", GB: "Europe/London", GE: "Asia/Tbilisi",
  GH: "Africa/Accra", GR: "Europe/Athens", GT: "America/Guatemala", HK: "Asia/Hong_Kong",
  HN: "America/Tegucigalpa", HR: "Europe/Zagreb", HT: "America/Port-au-Prince",
  HU: "Europe/Budapest", ID: "Asia/Jakarta", IE: "Europe/Dublin", IL: "Asia/Jerusalem",
  IN: "Asia/Kolkata", IQ: "Asia/Baghdad", IR: "Asia/Tehran", IS: "Atlantic/Reykjavik",
  IT: "Europe/Rome", JM: "America/Jamaica", JO: "Asia/Amman", JP: "Asia/Tokyo",
  KE: "Africa/Nairobi", KG: "Asia/Bishkek", KH: "Asia/Phnom_Penh", KR: "Asia/Seoul",
  KW: "Asia/Kuwait", KZ: "Asia/Almaty", LA: "Asia/Vientiane", LB: "Asia/Beirut",
  LK: "Asia/Colombo", LT: "Europe/Vilnius", LU: "Europe/Luxembourg", LV: "Europe/Riga",
  LY: "Africa/Tripoli", MA: "Africa/Casablanca", MC: "Europe/Monaco", MD: "Europe/Chisinau",
  ME: "Europe/Podgorica", MG: "Indian/Antananarivo", MK: "Europe/Skopje", MM: "Asia/Yangon",
  MN: "Asia/Ulaanbaatar", MO: "Asia/Macau", MT: "Europe/Malta", MU: "Indian/Mauritius",
  MV: "Indian/Maldives", MW: "Africa/Blantyre", MX: "America/Mexico_City", MY: "Asia/Kuala_Lumpur",
  MZ: "Africa/Maputo", NA: "Africa/Windhoek", NG: "Africa/Lagos", NI: "America/Managua",
  NL: "Europe/Amsterdam", NO: "Europe/Oslo", NP: "Asia/Kathmandu", NZ: "Pacific/Auckland",
  OM: "Asia/Muscat", PA: "America/Panama", PE: "America/Lima", PH: "Asia/Manila",
  PK: "Asia/Karachi", PL: "Europe/Warsaw", PR: "America/Puerto_Rico", PT: "Europe/Lisbon",
  PY: "America/Asuncion", QA: "Asia/Qatar", RO: "Europe/Bucharest", RS: "Europe/Belgrade",
  RU: "Europe/Moscow", RW: "Africa/Kigali", SA: "Asia/Riyadh", SD: "Africa/Khartoum",
  SE: "Europe/Stockholm", SG: "Asia/Singapore", SI: "Europe/Ljubljana", SK: "Europe/Bratislava",
  SN: "Africa/Dakar", SV: "America/El_Salvador", SY: "Asia/Damascus", TH: "Asia/Bangkok",
  TJ: "Asia/Dushanbe", TM: "Asia/Ashgabat", TN: "Africa/Tunis", TR: "Europe/Istanbul",
  TW: "Asia/Taipei", TZ: "Africa/Dar_es_Salaam", UA: "Europe/Kyiv", UG: "Africa/Kampala",
  US: "America/New_York", UY: "America/Montevideo", UZ: "Asia/Tashkent", VE: "America/Caracas",
  VN: "Asia/Ho_Chi_Minh", YE: "Asia/Aden", ZA: "Africa/Johannesburg", ZM: "Africa/Lusaka",
  ZW: "Africa/Harare",
};

const TIMEZONE_BY_COUNTRY_NAME: Record<string, string> = {
  indonesia: "Asia/Jakarta",
  "saudi arabia": "Asia/Riyadh",
  china: "Asia/Shanghai",
  "united states": "America/New_York",
  "united kingdom": "Europe/London",
  germany: "Europe/Berlin",
  france: "Europe/Paris",
  japan: "Asia/Tokyo",
  "south korea": "Asia/Seoul",
  korea: "Asia/Seoul",
  india: "Asia/Kolkata",
  brazil: "America/Sao_Paulo",
  australia: "Australia/Sydney",
  canada: "America/Toronto",
  mexico: "America/Mexico_City",
  russia: "Europe/Moscow",
  turkey: "Europe/Istanbul",
  thailand: "Asia/Bangkok",
  vietnam: "Asia/Ho_Chi_Minh",
  malaysia: "Asia/Kuala_Lumpur",
  singapore: "Asia/Singapore",
  philippines: "Asia/Manila",
  "united arab emirates": "Asia/Dubai",
  uae: "Asia/Dubai",
  egypt: "Africa/Cairo",
  "south africa": "Africa/Johannesburg",
  nigeria: "Africa/Lagos",
  argentina: "America/Argentina/Buenos_Aires",
  chile: "America/Santiago",
  colombia: "America/Bogota",
  peru: "America/Lima",
  netherlands: "Europe/Amsterdam",
  belgium: "Europe/Brussels",
  switzerland: "Europe/Zurich",
  austria: "Europe/Vienna",
  poland: "Europe/Warsaw",
  italy: "Europe/Rome",
  spain: "Europe/Madrid",
  portugal: "Europe/Lisbon",
  sweden: "Europe/Stockholm",
  norway: "Europe/Oslo",
  denmark: "Europe/Copenhagen",
  finland: "Europe/Helsinki",
  ireland: "Europe/Dublin",
  "new zealand": "Pacific/Auckland",
  israel: "Asia/Jerusalem",
  pakistan: "Asia/Karachi",
  bangladesh: "Asia/Dhaka",
  iran: "Asia/Tehran",
  iraq: "Asia/Baghdad",
  ukraine: "Europe/Kyiv",
  "czech republic": "Europe/Prague",
  czechia: "Europe/Prague",
  romania: "Europe/Bucharest",
  hungary: "Europe/Budapest",
  greece: "Europe/Athens",
  印度尼西亚: "Asia/Jakarta",
  印尼: "Asia/Jakarta",
  沙特阿拉伯: "Asia/Riyadh",
  沙特: "Asia/Riyadh",
  中国: "Asia/Shanghai",
  美国: "America/New_York",
  英国: "Europe/London",
  日本: "Asia/Tokyo",
  韩国: "Asia/Seoul",
  印度: "Asia/Kolkata",
  德国: "Europe/Berlin",
  法国: "Europe/Paris",
  泰国: "Asia/Bangkok",
  越南: "Asia/Ho_Chi_Minh",
  马来西亚: "Asia/Kuala_Lumpur",
  新加坡: "Asia/Singapore",
  菲律宾: "Asia/Manila",
  阿联酋: "Asia/Dubai",
  迪拜: "Asia/Dubai",
  澳大利亚: "Australia/Sydney",
  加拿大: "America/Toronto",
  巴西: "America/Sao_Paulo",
  俄罗斯: "Europe/Moscow",
  土耳其: "Europe/Istanbul",
  埃及: "Africa/Cairo",
  南非: "Africa/Johannesburg",
};

function detectLanguages(location: string): string[] {
  const langs = new Set<string>();
  if (/[\u4e00-\u9fff]/.test(location)) langs.add("zh");
  if (/[\u0600-\u06FF]/.test(location)) langs.add("ar");
  if (/[\u3040-\u30ff]/.test(location)) langs.add("ja");
  if (/[\uac00-\ud7af]/.test(location)) langs.add("ko");
  if (/[\u0400-\u04FF]/.test(location)) langs.add("ru");
  langs.add("en");
  return [...langs];
}

function isValidIanaTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function timezoneFromCountryCode(code?: string): string | null {
  if (!code) return null;
  const tz = TIMEZONE_BY_COUNTRY_CODE[code.toUpperCase()];
  return tz && isValidIanaTimezone(tz) ? tz : null;
}

function timezoneFromCountryName(name?: string): string | null {
  if (!name) return null;
  const key = name.trim().toLowerCase();
  const tz = TIMEZONE_BY_COUNTRY_NAME[key];
  return tz && isValidIanaTimezone(tz) ? tz : null;
}

function timezoneFromLocationText(text: string): string | null {
  const lower = text.trim().toLowerCase();
  if (TIMEZONE_BY_COUNTRY_NAME[lower]) return TIMEZONE_BY_COUNTRY_NAME[lower];
  for (const [name, tz] of Object.entries(TIMEZONE_BY_COUNTRY_NAME)) {
    if (lower.includes(name)) return tz;
  }
  return null;
}

function hitToResult(hit: GeocodingHit): GeocodedTimezone | null {
  const timezone =
    hit.timezone ??
    timezoneFromCountryCode(hit.country_code) ??
    timezoneFromCountryName(hit.country);

  if (!timezone || !isValidIanaTimezone(timezone)) return null;

  return {
    timezone,
    name: hit.name,
    country: hit.country,
    admin1: hit.admin1,
  };
}

/** 从地址文本提取多种搜索词（城市、国家、组合） */
function buildSearchQueries(location: string): string[] {
  const trimmed = location.trim();
  const queries = new Set<string>();
  if (trimmed) queries.add(trimmed);

  for (const part of trimmed.split(/[/,，|·\-–—]/)) {
    const p = part.trim();
    if (p.length >= 2) queries.add(p);
  }

  const tokens = trimmed
    .split(/[\s,，]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !/^\d{3,6}$/.test(t));

  for (const token of tokens) queries.add(token);

  for (let i = 0; i < tokens.length - 1; i++) {
    queries.add(`${tokens[i]} ${tokens[i + 1]}`);
  }

  if (tokens.length >= 2) {
    const last = tokens[tokens.length - 1];
    for (let i = 0; i < tokens.length - 1; i++) {
      queries.add(`${tokens[i]} ${last}`);
    }
  }

  return [...queries].sort((a, b) => b.length - a.length);
}

async function geocodeSearch(name: string, language: string): Promise<GeocodedTimezone | null> {
  const url = new URL(GEOCODING_API);
  url.searchParams.set("name", name);
  url.searchParams.set("count", "5");
  url.searchParams.set("language", language);
  url.searchParams.set("format", "json");

  const res = await fetch(url.toString(), {
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;

  const data = (await res.json()) as GeocodingResponse;
  if (!data.results?.length) return null;

  for (const hit of data.results) {
    const result = hitToResult(hit);
    if (result) return result;
  }

  return null;
}

/** 通过 Open-Meteo 全球地理编码 + 国家级回退解析 IANA 时区 */
export async function resolveTimezoneFromGeocoding(
  location: string
): Promise<GeocodedTimezone | null> {
  const trimmed = location.trim();
  if (!trimmed) return null;

  if (/^[A-Za-z_+-]+\/[A-Za-z_+-]+$/.test(trimmed) && isValidIanaTimezone(trimmed)) {
    return { timezone: trimmed, name: trimmed, country: "" };
  }

  const directTz = timezoneFromLocationText(trimmed);
  if (directTz) {
    return { timezone: directTz, name: trimmed, country: "" };
  }

  const queries = buildSearchQueries(trimmed);
  const languages = detectLanguages(trimmed);

  for (const query of queries) {
    for (const lang of languages) {
      const result = await geocodeSearch(query, lang);
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
