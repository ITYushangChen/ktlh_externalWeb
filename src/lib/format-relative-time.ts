export function formatRelativeTime(iso: string, nowMs = Date.now()): string {
  const diff = nowMs - new Date(iso).getTime();
  if (Number.isNaN(diff) || diff < 0) return "刚刚";

  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months} 个月前`;

  const years = Math.floor(months / 12);
  return `${years} 年前`;
}

export function getLastContactedAt(logs: Array<{ contacted_at: string }>): string | null {
  if (!logs.length) return null;
  return logs.reduce((latest, log) =>
    log.contacted_at > latest ? log.contacted_at : latest
  , logs[0].contacted_at);
}
