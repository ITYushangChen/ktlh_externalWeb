"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LeadCrawlJob, LeadCrawlQueueItem } from "@/types/lead-crawler";

const DEFAULT_KEYWORDS = `pressure vessel manufacturer
air conditioner manufacturer
refrigeration equipment OEM
heat pump manufacturer`;

const JOB_STATUS_LABELS: Record<LeadCrawlJob["status"], string> = {
  pending: "等待中",
  searching: "搜索中",
  processing: "分析中",
  completed: "已完成",
  failed: "失败",
};

const QUEUE_STATUS_LABELS: Record<LeadCrawlQueueItem["status"], string> = {
  pending: "待处理",
  processing: "处理中",
  imported: "已导入",
  skipped: "已跳过",
  failed: "失败",
};

interface LeadCrawlerPanelProps {
  onImported?: () => void;
}

export function LeadCrawlerPanel({ onImported }: LeadCrawlerPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [keywordsText, setKeywordsText] = useState(DEFAULT_KEYWORDS);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<LeadCrawlJob | null>(null);
  const [recent, setRecent] = useState<LeadCrawlQueueItem[]>([]);
  const abortRef = useRef(false);

  const refreshJob = useCallback(async (jobId: string) => {
    const res = await fetch(`/api/business-develop/crawler/jobs/${jobId}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    setJob(json.job);
    setRecent(json.recent ?? []);
    return json.job as LeadCrawlJob;
  }, []);

  const runTicks = useCallback(
    async (jobId: string) => {
      abortRef.current = false;
      setRunning(true);
      setError(null);

      try {
        let done = false;
        while (!done && !abortRef.current) {
          const tickRes = await fetch(`/api/business-develop/crawler/jobs/${jobId}/tick`, {
            method: "POST",
          });
          const tickJson = await tickRes.json();
          if (!tickRes.ok) throw new Error(tickJson.error);

          await refreshJob(jobId);

          if (tickJson.imported > 0) {
            onImported?.();
          }

          done = tickJson.done;
          if (!done) {
            await new Promise((r) => setTimeout(r, 800));
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "爬虫运行失败");
      } finally {
        setRunning(false);
      }
    },
    [onImported, refreshJob]
  );

  const startCrawl = async () => {
    const keywords = keywordsText
      .split("\n")
      .map((k) => k.trim())
      .filter(Boolean);

    if (keywords.length === 0) {
      setError("请至少输入一个关键词");
      return;
    }

    setRunning(true);
    setError(null);
    setJob(null);
    setRecent([]);
    abortRef.current = false;

    try {
      const res = await fetch("/api/business-develop/crawler/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      await refreshJob(json.jobId);
      await runTicks(json.jobId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "启动失败");
      setRunning(false);
    }
  };

  const stopCrawl = () => {
    abortRef.current = true;
    setRunning(false);
  };

  useEffect(() => {
    return () => {
      abortRef.current = true;
    };
  }, []);

  const progress =
    job && job.total_urls > 0
      ? Math.round((job.processed_urls / job.total_urls) * 100)
      : 0;

  return (
    <section className="card p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-lg text-slate-900">AI 潜客爬虫</h2>
          <p className="text-sm text-slate-500 mt-1">
            搜索 Google 关键词，AI 识别制冷/空调设备制造商，自动导入看板（官网联系方式标记为「官方」）
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "收起" : "展开设置"}
        </button>
      </div>

      {expanded && (
        <div className="space-y-3">
          <div>
            <label className="label">搜索关键词（每行一个）</label>
            <textarea
              className="input min-h-[120px] font-mono text-sm"
              value={keywordsText}
              onChange={(e) => setKeywordsText(e.target.value)}
              disabled={running}
              placeholder="pressure vessel manufacturer"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-primary"
              onClick={startCrawl}
              disabled={running}
            >
              {running ? "运行中…" : "开始搜索并分析"}
            </button>
            {running && (
              <button type="button" className="btn btn-secondary" onClick={stopCrawl}>
                停止
              </button>
            )}
          </div>
          <p className="text-xs text-slate-400">
            需配置 GOOGLE_CSE_API_KEY、GOOGLE_CSE_CX、DEEPSEEK_API_KEY。每个关键词约抓取 8 条结果，逐页 AI 分析后导入。
          </p>
        </div>
      )}

      {job && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span>
              状态：<strong>{JOB_STATUS_LABELS[job.status]}</strong>
            </span>
            <span>
              进度：{job.processed_urls}/{job.total_urls}（{progress}%）
            </span>
            <span className="text-emerald-700">导入 {job.imported_count}</span>
            <span className="text-slate-500">跳过 {job.skipped_count}</span>
          </div>
          {job.total_urls > 0 && (
            <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-full bg-sky-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
          {job.error_message && (
            <p className="text-sm text-red-700">{job.error_message}</p>
          )}
        </div>
      )}

      {recent.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200">
                <th className="py-2 pr-3 font-medium">状态</th>
                <th className="py-2 pr-3 font-medium">关键词</th>
                <th className="py-2 pr-3 font-medium">网页</th>
                <th className="py-2 font-medium">说明</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((item) => (
                <tr key={item.id} className="border-b border-slate-100">
                  <td className="py-2 pr-3 whitespace-nowrap">
                    <span
                      className={
                        item.status === "imported"
                          ? "text-emerald-700"
                          : item.status === "failed"
                            ? "text-red-700"
                            : "text-slate-600"
                      }
                    >
                      {QUEUE_STATUS_LABELS[item.status]}
                    </span>
                  </td>
                  <td className="py-2 pr-3 whitespace-nowrap text-slate-600">
                    {item.keyword}
                  </td>
                  <td className="py-2 pr-3 max-w-[200px] truncate">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-700 hover:underline"
                      title={item.title || item.url}
                    >
                      {item.title || item.url}
                    </a>
                  </td>
                  <td className="py-2 text-slate-500 max-w-[280px] truncate" title={item.ai_reason || item.error_message}>
                    {item.ai_reason || item.error_message || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-800 text-sm">
          {error}
        </div>
      )}
    </section>
  );
}
