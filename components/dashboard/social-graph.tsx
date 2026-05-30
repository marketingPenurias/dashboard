"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

type GraphRow = {
  user_id: string;
  user_name: string;
  referral_count: number;
  user_tier: string;
};

const tierColor: Record<string, string> = {
  alpha: "#f59e0b",
  influencer: "#8b5cf6",
  standard: "#3d2060",
};

const EMPTY_NODES = [
  { id: "empty", name: "Sin datos", tier: "standard", val: 1 },
];

export function SocialGraph({ rows }: { rows: GraphRow[] }) {
  const graphData = useMemo(() => {
    if (rows.length === 0) return { nodes: EMPTY_NODES, links: [] };

    const nodes = rows.map((r) => ({
      id: r.user_id,
      name: r.user_name ?? r.user_id,
      tier: r.user_tier,
      val: Math.max(1, r.referral_count),
    }));

    const alphaIds = new Set(rows.filter((r) => r.user_tier !== "standard").map((r) => r.user_id));
    const standards = rows.filter((r) => r.user_tier === "standard");
    const links = standards.flatMap((r) => {
      const nearest = [...alphaIds][0];
      return nearest ? [{ source: nearest, target: r.user_id }] : [];
    });

    return { nodes, links };
  }, [rows]);

  return (
    <ForceGraph2D
      graphData={graphData}
      backgroundColor="transparent"
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      nodeColor={(node: any) => tierColor[node.tier ?? "standard"]}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      nodeVal={(node: any) => node.val ?? 1}
      linkColor={() => "rgba(139, 92, 246, 0.3)"}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      nodeLabel={(node: any) => node.name ?? ""}
      width={480}
      height={360}
    />
  );
}
