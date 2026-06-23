"use client";

import { useEffect, useMemo, useState } from "react";
import { formatLocalTime, getTimezoneLabel, resolveTimezone } from "@/lib/location-timezone";

export function LocalTimeBadge({ location }: { location: string }) {
  const timezone = useMemo(() => resolveTimezone(location), [location]);
  const [time, setTime] = useState(() =>
    timezone ? formatLocalTime(timezone) : null
  );

  useEffect(() => {
    if (!timezone) {
      setTime(null);
      return;
    }

    const tick = () => setTime(formatLocalTime(timezone));
    tick();

    const now = new Date();
    const msToNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
    let intervalId: ReturnType<typeof setInterval>;

    const timeoutId = setTimeout(() => {
      tick();
      intervalId = setInterval(tick, 60_000);
    }, msToNextMinute);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, [timezone]);

  if (!timezone || !time) return null;

  const offset = getTimezoneLabel(timezone);

  return (
    <span
      className="text-[11px] font-mono text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded shrink-0 leading-tight text-center"
      title={`${location} · ${offset}`}
    >
      {time}
    </span>
  );
}
