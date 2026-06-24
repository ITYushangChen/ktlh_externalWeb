"use client";

import { useEffect, useState } from "react";
import {
  formatLocalTime,
  formatPlaceLabel,
  getTimezoneLabel,
  type GeocodedTimezone,
} from "@/lib/location-timezone";

const clientCache = new Map<string, GeocodedTimezone | null>();

async function fetchTimezone(location: string): Promise<GeocodedTimezone | null> {
  const key = location.trim().toLowerCase();
  if (clientCache.has(key)) return clientCache.get(key)!;

  const res = await fetch(`/api/business-develop/timezone?q=${encodeURIComponent(location.trim())}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "时区解析失败");

  const result = (json.result as GeocodedTimezone | null) ?? null;
  clientCache.set(key, result);
  return result;
}

export function LocalTimeBadge({ location }: { location: string }) {
  const [geocoded, setGeocoded] = useState<GeocodedTimezone | null | undefined>(undefined);
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setGeocoded(undefined);
    setTime(null);

    fetchTimezone(location)
      .then((result) => {
        if (!cancelled) setGeocoded(result);
      })
      .catch(() => {
        if (!cancelled) setGeocoded(null);
      });

    return () => {
      cancelled = true;
    };
  }, [location]);

  useEffect(() => {
    if (!geocoded?.timezone) {
      setTime(null);
      return;
    }

    const timezone = geocoded.timezone;
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
  }, [geocoded]);

  if (geocoded === undefined) {
    return (
      <span className="text-[11px] font-mono text-slate-400 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded shrink-0">
        …
      </span>
    );
  }

  if (!geocoded || !time) {
    return (
      <span
        className="text-[11px] text-slate-400 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded shrink-0"
        title={`未能解析时区：${location}`}
      >
        --
      </span>
    );
  }

  const offset = getTimezoneLabel(geocoded.timezone);
  const place = formatPlaceLabel(geocoded);

  return (
    <span
      className="text-[11px] font-mono text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded shrink-0 leading-tight text-center"
      title={[location, place, offset].filter(Boolean).join(" · ")}
    >
      {time}
    </span>
  );
}
