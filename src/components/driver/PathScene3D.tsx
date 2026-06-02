"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Text, Line } from "@react-three/drei";
import type { PathNode } from "@/types/delivery";

function normalize(nodes: PathNode[]) {
  if (nodes.length === 0) return { points: [] as [number, number, number][], scale: 1 };
  const xs = nodes.map((n) => n.x);
  const ys = nodes.map((n) => n.y);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), 1);
  const scale = 8 / span;

  const points = nodes.map(
    (n) =>
      [(n.x - cx) * scale, (n.z ?? 0) * 0.5 + n.floor * 0.3, -(n.y - cy) * scale] as [
        number,
        number,
        number,
      ]
  );
  return { points, scale };
}

export function PathScene3D({
  nodes,
  activeIndex,
}: {
  nodes: PathNode[];
  activeIndex: number;
}) {
  const { points } = normalize(nodes);

  return (
    <Canvas camera={{ position: [6, 6, 6], fov: 45 }}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={1} />
      <OrbitControls enablePan enableZoom />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#e2e8f0" />
      </mesh>
      {points.length > 1 && (
        <Line points={points} color="#2563eb" lineWidth={3} dashed dashSize={0.3} gapSize={0.15} />
      )}
      {points.map((p, i) => (
        <group key={nodes[i].node_key} position={p}>
          <mesh>
            <sphereGeometry args={[i === activeIndex ? 0.35 : 0.22, 24, 24]} />
            <meshStandardMaterial
              color={
                nodes[i].is_destination
                  ? "#16a34a"
                  : i === activeIndex
                    ? "#2563eb"
                    : "#94a3b8"
              }
            />
          </mesh>
          <Text position={[0, 0.6, 0]} fontSize={0.35} color="#0f172a" anchorX="center">
            {nodes[i].label}
          </Text>
        </group>
      ))}
    </Canvas>
  );
}
