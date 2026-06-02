"use client";

import { useMemo, useState, Suspense } from "react";
import dynamic from "next/dynamic";
import type { PathEdge, PathNode } from "@/types/delivery";
import { orderPathNodes } from "@/lib/path-graph";

const Scene = dynamic(
  () => import("./PathScene3D").then((m) => m.PathScene3D),
  { ssr: false, loading: () => <div className="h-64 bg-slate-100 animate-pulse rounded-xl" /> }
);

export function PathMap3D({
  nodes,
  edges,
}: {
  nodes: PathNode[];
  edges: PathEdge[];
}) {
  const ordered = useMemo(() => orderPathNodes(nodes, edges), [nodes, edges]);
  const [activeIndex, setActiveIndex] = useState(0);

  if (nodes.length === 0) return null;

  const active = ordered[activeIndex];

  return (
    <div className="space-y-3">
      <div className="card overflow-hidden h-72">
        <Suspense fallback={<div className="h-full bg-slate-100" />}>
          <Scene nodes={ordered} activeIndex={activeIndex} />
        </Suspense>
      </div>
      {active && (
        <div className="card p-4">
          <p className="font-semibold">{active.label}</p>
          {active.instruction && (
            <p className="text-sm text-slate-600 mt-1">{active.instruction}</p>
          )}
        </div>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          className="btn btn-secondary flex-1"
          disabled={activeIndex === 0}
          onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
        >
          上一步
        </button>
        <button
          type="button"
          className="btn btn-primary flex-1"
          disabled={activeIndex >= ordered.length - 1}
          onClick={() =>
            setActiveIndex((i) => Math.min(ordered.length - 1, i + 1))
          }
        >
          下一步
        </button>
      </div>
    </div>
  );
}
