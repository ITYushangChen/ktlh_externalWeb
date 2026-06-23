/** 根据所在地文本推断 IANA 时区（模糊匹配） */

type TimezoneRule = { keywords: string[]; timezone: string };

const TIMEZONE_RULES: TimezoneRule[] = [
  { keywords: ["新疆", "乌鲁木齐", "喀什", "伊犁", "克拉玛依"], timezone: "Asia/Urumqi" },
  { keywords: ["香港", "hong kong", "hk"], timezone: "Asia/Hong_Kong" },
  { keywords: ["澳门", "macau", "macao"], timezone: "Asia/Macau" },
  { keywords: ["台湾", "台北", "高雄", "台中", "taiwan", "taipei"], timezone: "Asia/Taipei" },

  { keywords: ["日本", "东京", "大阪", "japan", "tokyo", "osaka"], timezone: "Asia/Tokyo" },
  { keywords: ["韩国", "首尔", "korea", "seoul"], timezone: "Asia/Seoul" },
  { keywords: ["新加坡", "singapore"], timezone: "Asia/Singapore" },
  { keywords: ["马来西亚", "吉隆坡", "malaysia", "kuala lumpur"], timezone: "Asia/Kuala_Lumpur" },
  { keywords: ["泰国", "曼谷", "thailand", "bangkok"], timezone: "Asia/Bangkok" },
  { keywords: ["越南", "河内", "胡志明", "vietnam"], timezone: "Asia/Ho_Chi_Minh" },
  { keywords: ["印度", "孟买", "新德里", "india", "mumbai", "delhi"], timezone: "Asia/Kolkata" },
  { keywords: ["印尼", "雅加达", "indonesia", "jakarta"], timezone: "Asia/Jakarta" },
  { keywords: ["菲律宾", "马尼拉", "philippines", "manila"], timezone: "Asia/Manila" },
  { keywords: ["阿联酋", "迪拜", "dubai", "uae"], timezone: "Asia/Dubai" },

  { keywords: ["英国", "伦敦", "uk", "london", "england"], timezone: "Europe/London" },
  { keywords: ["法国", "巴黎", "france", "paris"], timezone: "Europe/Paris" },
  { keywords: ["德国", "柏林", "germany", "berlin"], timezone: "Europe/Berlin" },
  { keywords: ["俄罗斯", "莫斯科", "moscow", "russia"], timezone: "Europe/Moscow" },

  { keywords: ["美国", "纽约", "usa", "new york", "美东"], timezone: "America/New_York" },
  { keywords: ["洛杉矶", "旧金山", "西雅图", "美西", "los angeles", "san francisco"], timezone: "America/Los_Angeles" },
  { keywords: ["芝加哥", "chicago", "美中"], timezone: "America/Chicago" },
  { keywords: ["加拿大", "多伦多", "温哥华", "canada", "toronto", "vancouver"], timezone: "America/Toronto" },

  { keywords: ["澳大利亚", "悉尼", "墨尔本", "australia", "sydney", "melbourne"], timezone: "Australia/Sydney" },
  { keywords: ["新西兰", "奥克兰", "new zealand", "auckland"], timezone: "Pacific/Auckland" },
  { keywords: ["巴西", "圣保罗", "brazil", "sao paulo"], timezone: "America/Sao_Paulo" },
];

/** 中国大陆省份/城市关键词，默认东八区 */
const CHINA_KEYWORDS = [
  "北京", "上海", "天津", "重庆", "广东", "深圳", "广州", "东莞", "佛山", "惠州", "中山", "珠海",
  "浙江", "杭州", "宁波", "温州", "江苏", "南京", "苏州", "无锡", "常州", "南通", "山东", "济南",
  "青岛", "烟台", "福建", "福州", "厦门", "泉州", "四川", "成都", "湖北", "武汉", "湖南", "长沙",
  "河南", "郑州", "河北", "石家庄", "唐山", "辽宁", "沈阳", "大连", "吉林", "长春", "黑龙江", "哈尔滨",
  "陕西", "西安", "甘肃", "兰州", "青海", "西宁", "云南", "昆明", "贵州", "贵阳", "广西", "南宁", "桂林",
  "海南", "海口", "三亚", "江西", "南昌", "安徽", "合肥", "山西", "太原", "内蒙古", "呼和浩特", "包头",
  "宁夏", "银川", "西藏", "拉萨", "中国", "国内", "华北", "华东", "华南", "西南", "东北", "西北",
];

export function resolveTimezone(location: string): string | null {
  const text = location.trim().toLowerCase();
  if (!text) return null;

  for (const rule of TIMEZONE_RULES) {
    for (const kw of rule.keywords) {
      if (text.includes(kw.toLowerCase())) {
        return rule.timezone;
      }
    }
  }

  for (const kw of CHINA_KEYWORDS) {
    if (location.includes(kw)) {
      return "Asia/Shanghai";
    }
  }

  // 含中文但无具体匹配，默认中国时区
  if (/[\u4e00-\u9fff]/.test(location)) {
    return "Asia/Shanghai";
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
