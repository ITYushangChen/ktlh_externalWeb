"use client";

import { useMemo, useState } from "react";
import type { PathEdge, PathNode } from "@/types/delivery";
import { orderPathNodes, pathPolyline } from "@/lib/path-graph";

const PAD = 40;

function bounds(nodes: PathNode[]) {
  if (nodes.length === 0) return { minX: 0, maxX: 100, minY: 0, maxY: 100 };
  const xs = nodes.map((n) => n.x);
  const ys = nodes.map((n) => n.y);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

export function PathMap2D({
  nodes,
  edges,
}: {
  nodes: PathNode[];
  edges: PathEdge[];
}) {
  const ordered = useMemo(() => orderPathNodes(nodes, edges), [nodes, edges]);
  const [activeIndex, setActiveIndex] = useState(0);

  const { minX, maxX, minY, maxY } = bounds(nodes);
  const width = Math.max(maxX - minX, 80) + PAD * 2;
  const height = Math.max(maxY - minY, 80) + PAD * 2;

  const toSvg = (x: number, y: number) => ({
    sx: PAD + x - minX,
    sy: PAD + y - minY,
  });

  const poly = pathPolyline(ordered)
    .map((p) => {
      const { sx, sy } = toSvg(p.x, p.y);
      return `${sx},${sy}`;
    })
    .join(" ");

  if (nodes.length === 0) return null;

  const active = ordered[activeIndex];

  return (
    <div className="space-y-3">
      <div className="card overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto bg-slate-50"
          role="img"
          aria-label="场内路线平面图"
        >
          <rect x={0} y={0} width={width} height={height} fill="#f1f5f9" />
          {poly && (
            <polyline
              points={poly}
              fill="none"
              stroke="#2563eb"
              strokeWidth={4}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="8 4"
            />
          )}
          {ordered.map((node, i) => {
            const { sx, sy } = toSvg(node.x, node.y);
            const isActive = i === activeIndex;
            const isDest = node.is_destination;
            return (
              <g
                key={node.node_key}
                onClick={() => setActiveIndex(i)}
                className="cursor-pointer"
              >
                <circle
                  cx={sx}
                  cy={sy}
                  r={isActive ? 14 : 10}
                  fill={isDest ? "#16a34a" : isActive ? "#2563eb" : "#94a3b8"}
                  stroke="white"
                  strokeWidth={3}
                />
                <text
                  x={sx}
                  y={sy - 18}
                  textAnchor="middle"
                  fontSize={11}
                  fill="#0f172a"
                  fontWeight={isActive ? 700 : 500}
                >
                  {node.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {active && (
        <div className="card p-4 bg-blue-50 border-blue-200">
          <p className="text-xs text-blue-600 font-semibold mb-1">
            当前节点 {activeIndex + 1} / {ordered.length}
            {active.floor > 1 && ` · ${active.floor} 楼`}
          </p>
          <p className="font-semibold text-lg">{active.label}</p>
          {active.instruction && (
            <p className="text-sm text-slate-700 mt-2 leading-relaxed">
              {active.instruction}
            </p>
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
