"use client";

import type { DeliveryFormInput } from "@/types/delivery";

type PathState = DeliveryFormInput["path"];

const PRESET: PathState = {
  nodes: [
    { node_key: "gate", label: "厂区大门", x: 20, y: 200, floor: 1, instruction: "向保安出示送货码" },
    { node_key: "park", label: "卸货区", x: 120, y: 200, floor: 1, instruction: "靠右停靠，熄火拉手刹" },
    { node_key: "dock", label: "仓库月台", x: 220, y: 120, floor: 1, is_destination: true, instruction: "联系主联系人卸货" },
  ],
  edges: [
    { from_key: "gate", to_key: "park" },
    { from_key: "park", to_key: "dock" },
  ],
};

export function PathEditor({
  value,
  onChange,
}: {
  value: PathState;
  onChange: (v: PathState) => void;
}) {
  const addNode = () => {
    const key = `n${value.nodes.length + 1}`;
    onChange({
      ...value,
      nodes: [
        ...value.nodes,
        {
          node_key: key,
          label: `节点 ${value.nodes.length + 1}`,
          x: 50 + value.nodes.length * 60,
          y: 150,
          floor: 1,
        },
      ],
    });
  };

  const updateNode = (index: number, patch: Partial<PathState["nodes"][0]>) => {
    const nodes = [...value.nodes];
    nodes[index] = { ...nodes[index], ...patch };
    onChange({ ...value, nodes });
  };

  const removeNode = (index: number) => {
    const key = value.nodes[index].node_key;
    onChange({
      nodes: value.nodes.filter((_, i) => i !== index),
      edges: value.edges.filter((e) => e.from_key !== key && e.to_key !== key),
    });
  };

  const autoChainEdges = () => {
    const edges = value.nodes.slice(0, -1).map((n, i) => ({
      from_key: n.node_key,
      to_key: value.nodes[i + 1].node_key,
    }));
    onChange({ ...value, edges });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-secondary text-sm" onClick={addNode}>
          + 添加节点
        </button>
        <button
          type="button"
          className="btn btn-secondary text-sm"
          onClick={autoChainEdges}
          disabled={value.nodes.length < 2}
        >
          自动连线（顺序）
        </button>
        <button
          type="button"
          className="btn btn-secondary text-sm"
          onClick={() => onChange(PRESET)}
        >
          载入示例路线
        </button>
      </div>

      {value.nodes.map((node, i) => (
        <div key={node.node_key} className="card p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-sm text-slate-500">
              节点 {i + 1} · {node.node_key}
            </span>
            <button
              type="button"
              className="text-red-600 text-sm"
              onClick={() => removeNode(i)}
            >
              删除
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">显示名称</label>
              <input
                className="input"
                value={node.label}
                onChange={(e) => updateNode(i, { label: e.target.value })}
              />
            </div>
            <div>
              <label className="label">X</label>
              <input
                className="input"
                type="number"
                value={node.x}
                onChange={(e) => updateNode(i, { x: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="label">Y</label>
              <input
                className="input"
                type="number"
                value={node.y}
                onChange={(e) => updateNode(i, { y: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="label">楼层</label>
              <input
                className="input"
                type="number"
                value={node.floor ?? 1}
                onChange={(e) => updateNode(i, { floor: Number(e.target.value) })}
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={node.is_destination ?? false}
                  onChange={(e) =>
                    updateNode(i, { is_destination: e.target.checked })
                  }
                />
                终点
              </label>
            </div>
            <div className="col-span-2">
              <label className="label">到达说明</label>
              <input
                className="input"
                value={node.instruction ?? ""}
                onChange={(e) => updateNode(i, { instruction: e.target.value })}
                placeholder="例如：左转进入 B 栋卸货口"
              />
            </div>
          </div>
        </div>
      ))}

      <p className="text-xs text-slate-500">
        坐标为平面图上的像素位置，可在纸上画出厂区轮廓后按比例填写。司机端会按连线顺序引导。
      </p>
    </div>
  );
}
